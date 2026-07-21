import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { homeBookmarksAtom } from '../state/atoms';
import {
  applyBookmarkMutation,
  buildAddTreeLinkMutation,
  buildRemoveTreeItemMutation,
  describeBookmarkError,
  detectBookmarkCapability,
  findBookmarkInSnapshot,
  getBookmarkSnapshot,
  hasBookmarkPermission,
  isHomeDataStaleError,
  reconcileMutationForRetry,
  resourceDisplayUrl,
} from '../api/bookmarkManager';
import type { QdnResource } from '../types';
import type { BookmarkManagerSnapshot } from '../types/bookmarkManager';

const ERROR_CLEAR_DELAY_MS = 5000;

let capabilityPromise: Promise<boolean> | null = null;
let permissionPromise: Promise<boolean> | null = null;
let snapshotFetchPromise: Promise<BookmarkManagerSnapshot> | null = null;
let mutationChain: Promise<unknown> = Promise.resolve();

// Dedupes concurrent BOOKMARKS_GET calls from multiple mounted hook
// instances (e.g. many AppCards on a Browse page) into one bridge request.
function fetchSnapshotOnce(): Promise<BookmarkManagerSnapshot> {
  if (!snapshotFetchPromise) {
    snapshotFetchPromise = getBookmarkSnapshot().finally(() => { snapshotFetchPromise = null; });
  }
  return snapshotFetchPromise;
}

export function useHomeBookmark(resource: QdnResource) {
  const [state, setState] = useAtom(homeBookmarksAtom);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const displayUrl = resourceDisplayUrl(resource.service, resource.name, resource.identifier);

  // Capability detection (SHOW_ACTIONS) - resolved once across all instances.
  useEffect(() => {
    if (state.supported !== null) return;
    if (!capabilityPromise) capabilityPromise = detectBookmarkCapability();
    let cancelled = false;
    capabilityPromise.then((supported) => {
      if (!cancelled) setState((prev) => (prev.supported === null ? { ...prev, supported } : prev));
    });
    return () => { cancelled = true; };
  }, [state.supported, setState]);

  // Permission pre-check, then a silent snapshot prefetch once granted
  // (safe - BOOKMARKS_HAS_PERMISSION never prompts, and a granted permission
  // means BOOKMARKS_GET won't prompt either).
  useEffect(() => {
    if (state.supported !== true || state.permission !== null) return;
    if (!permissionPromise) permissionPromise = hasBookmarkPermission();
    let cancelled = false;
    permissionPromise.then((granted) => {
      if (cancelled) return;
      setState((prev) => (prev.permission === null ? { ...prev, permission: granted } : prev));
      if (granted) {
        fetchSnapshotOnce()
          .then((snapshot) => { if (!cancelled) setState((prev) => ({ ...prev, snapshot })); })
          .catch(() => {});
      }
    });
    return () => { cancelled = true; };
  }, [state.supported, state.permission, setState]);

  // Refresh when Home's own UI or another app view changes bookmarks.
  useEffect(() => {
    function onChanged() {
      if (stateRef.current.permission !== true) return;
      fetchSnapshotOnce()
        .then((snapshot) => setState((prev) => ({ ...prev, snapshot })))
        .catch(() => {});
    }
    window.addEventListener('qortiumBookmarkManagerChanged', onChanged);
    return () => window.removeEventListener('qortiumBookmarkManagerChanged', onChanged);
  }, [setState]);

  useEffect(() => () => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
  }, []);

  const showError = useCallback((message: string) => {
    setError(message);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), ERROR_CLEAR_DELAY_MS);
  }, []);

  const isBookmarked = !!(state.snapshot && findBookmarkInSnapshot(state.snapshot.bookmarks, displayUrl));

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setError(null);

    const title = resource.title || resource.identifier;

    mutationChain = mutationChain.then(async () => {
      const hadPermissionBefore = stateRef.current.permission === true;
      try {
        const snapshot = stateRef.current.snapshot ?? await fetchSnapshotOnce();
        setState((prev) => ({ ...prev, permission: true, snapshot }));

        const existing = findBookmarkInSnapshot(snapshot.bookmarks, displayUrl);
        const mutation = existing
          ? buildRemoveTreeItemMutation(existing.id)
          : buildAddTreeLinkMutation(displayUrl, title);

        let result;
        try {
          result = await applyBookmarkMutation(snapshot.revision, mutation);
        } catch (err) {
          if (!isHomeDataStaleError(err)) throw err;
          const fresh = await fetchSnapshotOnce();
          const retryMutation = reconcileMutationForRetry(mutation, fresh, displayUrl);
          if (retryMutation === null) {
            setState((prev) => ({ ...prev, permission: true, snapshot: fresh }));
            return;
          }
          result = await applyBookmarkMutation(fresh.revision, retryMutation);
        }

        setState((prev) => ({ ...prev, permission: true, snapshot: result.snapshot }));
      } catch (err) {
        showError(describeBookmarkError(hadPermissionBefore, err));
      } finally {
        setBusy(false);
      }
    });
  }, [busy, resource, displayUrl, setState, showError]);

  return {
    supported: state.supported === true,
    isBookmarked,
    busy,
    error,
    toggle,
  };
}
