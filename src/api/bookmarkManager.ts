import type {
  BookmarkManagerMutation,
  BookmarkManagerMutationResult,
  BookmarkManagerSnapshot,
  BookmarkManagerTreeItem,
} from '../types/bookmarkManager';

export async function detectBookmarkCapability(): Promise<boolean> {
  try {
    const actions = await qdnRequest({ action: 'SHOW_ACTIONS' });
    return Array.isArray(actions) && actions.includes('BOOKMARKS_APPLY');
  } catch { return false; }
}

export async function hasBookmarkPermission(): Promise<boolean> {
  try {
    const res = await qdnRequest({ action: 'BOOKMARKS_HAS_PERMISSION' }) as { granted?: boolean };
    return !!res?.granted;
  } catch { return false; }
}

export async function getBookmarkSnapshot(): Promise<BookmarkManagerSnapshot> {
  return await qdnRequest({ action: 'BOOKMARKS_GET' }) as BookmarkManagerSnapshot;
}

export async function applyBookmarkMutation(
  expectedRevision: number,
  mutation: BookmarkManagerMutation,
): Promise<BookmarkManagerMutationResult> {
  return await qdnRequest({ action: 'BOOKMARKS_APPLY', expectedRevision, mutation }) as BookmarkManagerMutationResult;
}

// Mirrors api/qortal.ts openNewTab()'s `qdn://${service}/${name}/${id}` format.
export function resourceDisplayUrl(service: string, name: string, identifier: string | undefined): string {
  return `qdn://${service}/${name}/${identifier || 'default'}`;
}

export function findBookmarkInSnapshot(
  items: BookmarkManagerTreeItem[],
  displayUrl: string,
): (BookmarkManagerTreeItem & { type: 'bookmark' }) | undefined {
  for (const item of items) {
    if (item.type === 'bookmark' && item.displayUrl === displayUrl) return item;
    if (item.type === 'folder') {
      const found = findBookmarkInSnapshot(item.children, displayUrl);
      if (found) return found;
    }
  }
  return undefined;
}

export function treeItemExists(items: BookmarkManagerTreeItem[], itemId: string): boolean {
  for (const item of items) {
    if (item.id === itemId) return true;
    if (item.type === 'folder' && treeItemExists(item.children, itemId)) return true;
  }
  return false;
}

export function buildAddTreeLinkMutation(displayUrl: string, title: string): BookmarkManagerMutation {
  return { type: 'addTreeLink', rootId: 'bookmarks', link: { displayUrl, title } };
}

export function buildRemoveTreeItemMutation(itemId: string): BookmarkManagerMutation {
  return { type: 'removeTreeItem', rootId: 'bookmarks', itemId };
}

export function isHomeDataStaleError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'HOME_DATA_STALE';
}

// After a stale refetch, decide whether the original intent is still
// applicable against the fresh snapshot, or was already satisfied by a
// concurrent change from another view.
export function reconcileMutationForRetry(
  mutation: BookmarkManagerMutation,
  freshSnapshot: BookmarkManagerSnapshot,
  displayUrl: string,
): BookmarkManagerMutation | null {
  if (mutation.type === 'addTreeLink') {
    return findBookmarkInSnapshot(freshSnapshot.bookmarks, displayUrl) ? null : mutation;
  }
  return treeItemExists(freshSnapshot.bookmarks, mutation.itemId) ? mutation : null;
}

export function describeBookmarkError(hadPermission: boolean, error: unknown): string {
  if (isHomeDataStaleError(error)) return 'Home bookmarks changed elsewhere. Please try again.';
  if (!hadPermission) return 'Home bookmark permission was not granted.';
  return 'Could not update Home bookmarks. Please try again.';
}
