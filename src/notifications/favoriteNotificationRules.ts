import type { Favorite } from '../types';

export const MAX_FAVORITE_NOTIFICATION_RULES = 20;

export interface FavoriteNotificationRule {
  notificationId: string;
  event: 'RESOURCE_PUBLISHED';
  filters: {
    service: string;
    names: string[];
    identifier: string;
  };
  title: string;
  link: string;
}

export function sanitizeFavoriteNotificationId(name: string, identifier: string): string {
  const raw = `fav-${name}-${identifier}`.toLowerCase();
  const sanitized = raw.replace(/[^a-z0-9._-]/g, '-');
  return sanitized.slice(0, 64);
}

export function buildFavoriteNotificationRules(favorites: Favorite[]): FavoriteNotificationRule[] {
  return favorites.slice(0, MAX_FAVORITE_NOTIFICATION_RULES).map((fav) => ({
    notificationId: sanitizeFavoriteNotificationId(fav.name, fav.identifier),
    event: 'RESOURCE_PUBLISHED' as const,
    filters: {
      service: fav.service,
      names: [fav.name],
      identifier: fav.identifier,
    },
    title: fav.label || fav.name,
    link: `qdn://${fav.service}/${fav.name}/${fav.identifier}`,
  }));
}

export function findStaleNotificationIds(existingIds: string[], desiredIds: string[]): string[] {
  const desired = new Set(desiredIds);
  return existingIds.filter((id) => !desired.has(id));
}

export function favoritesSignature(favorites: Favorite[]): string {
  return favorites
    .map((f) => `${f.service}|${f.name}|${f.identifier}`)
    .sort()
    .join(',');
}
