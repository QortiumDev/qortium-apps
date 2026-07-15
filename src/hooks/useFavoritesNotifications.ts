import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { favoritesAtom, notificationsEnabledAtom } from '../state/atoms';
import {
  buildFavoriteNotificationRules,
  favoritesSignature,
  findStaleNotificationIds,
  type FavoriteNotificationRule,
} from '../notifications/favoriteNotificationRules';

async function requestQdn(options: { action: string; [key: string]: unknown }): Promise<unknown> {
  if (typeof qdnRequest !== 'function') throw new Error('qdnRequest unavailable');
  return qdnRequest(options);
}

function isBridgeMessage(e: MessageEvent<unknown>, action: string): boolean {
  return (
    (e.source === window.parent || e.source === window) &&
    typeof e.data === 'object' && e.data !== null &&
    (e.data as { action?: unknown }).action === action
  );
}

async function syncFavoriteNotificationRules(rules: FavoriteNotificationRule[]) {
  const existing = await requestQdn({ action: 'NOTIFICATION_GET' });
  const existingIds = Array.isArray(existing)
    ? (existing as { notificationId?: unknown }[])
        .map((rule) => rule.notificationId)
        .filter((id): id is string => typeof id === 'string')
    : [];
  const desiredIds = rules.map((rule) => rule.notificationId);
  const staleIds = findStaleNotificationIds(existingIds, desiredIds);

  if (staleIds.length > 0) {
    await requestQdn({ action: 'NOTIFICATION_REMOVE', notificationIds: staleIds });
  }
  if (rules.length > 0) {
    await requestQdn({ action: 'NOTIFICATION_ADD', subscriptions: rules });
  }
}

export function useFavoritesNotifications() {
  const favorites = useAtomValue(favoritesAtom);
  const enabled = useAtomValue(notificationsEnabledAtom);
  const lastSyncedSignature = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (lastSyncedSignature.current !== null) {
        requestQdn({ action: 'NOTIFICATION_REMOVE' }).catch(() => {});
        lastSyncedSignature.current = null;
      }
      return;
    }

    const signature = favoritesSignature(favorites);
    if (signature === lastSyncedSignature.current) return;

    const rules = buildFavoriteNotificationRules(favorites);
    syncFavoriteNotificationRules(rules)
      .then(() => { lastSyncedSignature.current = signature; })
      .catch(() => {});
  }, [favorites, enabled]);

  useEffect(() => {
    function onMessage(e: MessageEvent<unknown>) {
      if (!enabled || !isBridgeMessage(e, 'SELECTED_ACCOUNT_CHANGED')) return;
      syncFavoriteNotificationRules(buildFavoriteNotificationRules(favorites)).catch(() => {});
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [favorites, enabled]);
}
