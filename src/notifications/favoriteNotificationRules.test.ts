import { describe, expect, it } from 'vitest';
import {
  MAX_FAVORITE_NOTIFICATION_RULES,
  buildFavoriteNotificationRules,
  favoritesSignature,
  findStaleNotificationIds,
  sanitizeFavoriteNotificationId,
} from './favoriteNotificationRules';
import type { Favorite } from '../types';

function makeFavorite(overrides: Partial<Favorite> = {}): Favorite {
  return {
    key: 'APP|SomeApp|default',
    service: 'APP',
    name: 'SomeApp',
    identifier: 'default',
    label: 'Some App',
    category: '',
    addedAt: 0,
    ...overrides,
  };
}

describe('sanitizeFavoriteNotificationId', () => {
  it('lowercases and replaces disallowed characters', () => {
    expect(sanitizeFavoriteNotificationId('Some App!', 'de fault')).toBe('fav-some-app--de-fault');
  });

  it('truncates to 64 characters', () => {
    const longName = 'a'.repeat(100);
    const id = sanitizeFavoriteNotificationId(longName, 'default');
    expect(id.length).toBe(64);
  });
});

describe('buildFavoriteNotificationRules', () => {
  it('builds one RESOURCE_PUBLISHED rule per favorite', () => {
    const favorites = [
      makeFavorite({ name: 'Chain', identifier: 'default', label: 'Chain Explorer', service: 'APP' }),
    ];
    const rules = buildFavoriteNotificationRules(favorites);
    expect(rules).toEqual([{
      notificationId: 'fav-chain-default',
      event: 'RESOURCE_PUBLISHED',
      filters: { service: 'APP', names: ['Chain'], identifier: 'default' },
      title: 'Chain Explorer',
      link: 'qdn://APP/Chain/default',
    }]);
  });

  it('falls back to the resource name when a favorite has no label', () => {
    const favorites = [makeFavorite({ label: '', name: 'Bare' })];
    expect(buildFavoriteNotificationRules(favorites)[0].title).toBe('Bare');
  });

  it('caps rules at 20 favorites', () => {
    const favorites = Array.from({ length: 25 }, (_, i) =>
      makeFavorite({ name: `App${i}`, key: `APP|App${i}|default` }));
    expect(buildFavoriteNotificationRules(favorites)).toHaveLength(MAX_FAVORITE_NOTIFICATION_RULES);
  });
});

describe('findStaleNotificationIds', () => {
  it('returns ids present in existing but not in desired', () => {
    expect(findStaleNotificationIds(['a', 'b', 'c'], ['b', 'c'])).toEqual(['a']);
  });

  it('returns an empty array when nothing is stale', () => {
    expect(findStaleNotificationIds(['a'], ['a', 'b'])).toEqual([]);
  });
});

describe('favoritesSignature', () => {
  it('is stable across reordering', () => {
    const a = makeFavorite({ name: 'A', key: 'APP|A|default' });
    const b = makeFavorite({ name: 'B', key: 'APP|B|default' });
    expect(favoritesSignature([a, b])).toBe(favoritesSignature([b, a]));
  });

  it('changes when membership changes', () => {
    const a = makeFavorite({ name: 'A', key: 'APP|A|default' });
    const b = makeFavorite({ name: 'B', key: 'APP|B|default' });
    expect(favoritesSignature([a])).not.toBe(favoritesSignature([a, b]));
  });
});
