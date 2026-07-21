import { describe, expect, it } from 'vitest';
import {
  buildAddTreeLinkMutation,
  buildRemoveTreeItemMutation,
  describeBookmarkError,
  findBookmarkInSnapshot,
  isHomeDataStaleError,
  reconcileMutationForRetry,
  resourceDisplayUrl,
  treeItemExists,
} from './bookmarkManager';
import type { BookmarkManagerFolder, BookmarkManagerLink, BookmarkManagerSnapshot, BookmarkManagerTreeItem } from '../types/bookmarkManager';

function makeLink(overrides: Partial<BookmarkManagerLink> = {}): BookmarkManagerLink {
  return {
    createdAt: 0,
    displayUrl: 'qdn://APP/SomeApp/default',
    id: 'link-1',
    title: 'Some App',
    type: 'bookmark',
    ...overrides,
  };
}

function makeFolder(children: BookmarkManagerTreeItem[], overrides: Partial<BookmarkManagerFolder> = {}): BookmarkManagerFolder {
  return {
    children,
    createdAt: 0,
    id: 'folder-1',
    title: 'Folder',
    type: 'folder',
    ...overrides,
  };
}

function makeSnapshot(bookmarks: BookmarkManagerTreeItem[], revision = 1): BookmarkManagerSnapshot {
  return { bookmarks, revision, schemaVersion: 1 };
}

describe('resourceDisplayUrl', () => {
  it('builds a qdn:// address from service, name, and identifier', () => {
    expect(resourceDisplayUrl('APP', 'SomeApp', 'main')).toBe('qdn://APP/SomeApp/main');
  });

  it('defaults a missing identifier to "default"', () => {
    expect(resourceDisplayUrl('APP', 'SomeApp', undefined)).toBe('qdn://APP/SomeApp/default');
  });

  it('defaults an empty identifier to "default"', () => {
    expect(resourceDisplayUrl('APP', 'SomeApp', '')).toBe('qdn://APP/SomeApp/default');
  });
});

describe('findBookmarkInSnapshot', () => {
  it('finds a top-level match', () => {
    const link = makeLink();
    expect(findBookmarkInSnapshot([link], link.displayUrl)).toBe(link);
  });

  it('finds a match nested inside a folder', () => {
    const link = makeLink({ id: 'nested' });
    const items = [makeFolder([link])];
    expect(findBookmarkInSnapshot(items, link.displayUrl)).toBe(link);
  });

  it('returns undefined when there is no match', () => {
    expect(findBookmarkInSnapshot([makeLink()], 'qdn://APP/Other/default')).toBeUndefined();
  });

  it('ignores a folder whose id equals the target displayUrl', () => {
    const items = [makeFolder([], { id: 'qdn://APP/SomeApp/default' })];
    expect(findBookmarkInSnapshot(items, 'qdn://APP/SomeApp/default')).toBeUndefined();
  });

  it('returns undefined for an empty tree', () => {
    expect(findBookmarkInSnapshot([], 'qdn://APP/SomeApp/default')).toBeUndefined();
  });
});

describe('treeItemExists', () => {
  it('finds a top-level id', () => {
    expect(treeItemExists([makeLink({ id: 'a' })], 'a')).toBe(true);
  });

  it('finds a nested id', () => {
    expect(treeItemExists([makeFolder([makeLink({ id: 'nested' })])], 'nested')).toBe(true);
  });

  it('returns false for a missing id', () => {
    expect(treeItemExists([makeLink({ id: 'a' })], 'missing')).toBe(false);
  });

  it('returns false for an empty tree', () => {
    expect(treeItemExists([], 'a')).toBe(false);
  });
});

describe('buildAddTreeLinkMutation', () => {
  it('builds an addTreeLink mutation against the bookmarks root', () => {
    expect(buildAddTreeLinkMutation('qdn://APP/SomeApp/default', 'Some App')).toEqual({
      type: 'addTreeLink',
      rootId: 'bookmarks',
      link: { displayUrl: 'qdn://APP/SomeApp/default', title: 'Some App' },
    });
  });
});

describe('buildRemoveTreeItemMutation', () => {
  it('builds a removeTreeItem mutation against the bookmarks root', () => {
    expect(buildRemoveTreeItemMutation('link-1')).toEqual({
      type: 'removeTreeItem',
      rootId: 'bookmarks',
      itemId: 'link-1',
    });
  });
});

describe('isHomeDataStaleError', () => {
  it('is true for an error with code HOME_DATA_STALE', () => {
    expect(isHomeDataStaleError(Object.assign(new Error('stale'), { code: 'HOME_DATA_STALE' }))).toBe(true);
  });

  it('is false for a plain error with no code', () => {
    expect(isHomeDataStaleError(new Error('denied'))).toBe(false);
  });

  it('is false for null, undefined, or a string', () => {
    expect(isHomeDataStaleError(null)).toBe(false);
    expect(isHomeDataStaleError(undefined)).toBe(false);
    expect(isHomeDataStaleError('HOME_DATA_STALE')).toBe(false);
  });
});

describe('reconcileMutationForRetry', () => {
  it('returns null for addTreeLink when the fresh snapshot already has the bookmark', () => {
    const displayUrl = 'qdn://APP/SomeApp/default';
    const mutation = buildAddTreeLinkMutation(displayUrl, 'Some App');
    const fresh = makeSnapshot([makeLink({ displayUrl })], 2);
    expect(reconcileMutationForRetry(mutation, fresh, displayUrl)).toBeNull();
  });

  it('returns the mutation for addTreeLink when the fresh snapshot is still missing the bookmark', () => {
    const displayUrl = 'qdn://APP/SomeApp/default';
    const mutation = buildAddTreeLinkMutation(displayUrl, 'Some App');
    const fresh = makeSnapshot([], 2);
    expect(reconcileMutationForRetry(mutation, fresh, displayUrl)).toBe(mutation);
  });

  it('returns null for removeTreeItem when the fresh snapshot no longer has the item', () => {
    const mutation = buildRemoveTreeItemMutation('link-1');
    const fresh = makeSnapshot([], 2);
    expect(reconcileMutationForRetry(mutation, fresh, 'qdn://APP/SomeApp/default')).toBeNull();
  });

  it('returns the mutation for removeTreeItem when the fresh snapshot still has the item', () => {
    const mutation = buildRemoveTreeItemMutation('link-1');
    const fresh = makeSnapshot([makeLink({ id: 'link-1' })], 2);
    expect(reconcileMutationForRetry(mutation, fresh, 'qdn://APP/SomeApp/default')).toBe(mutation);
  });
});

describe('describeBookmarkError', () => {
  it('describes a stale-revision error', () => {
    const err = Object.assign(new Error('stale'), { code: 'HOME_DATA_STALE' });
    expect(describeBookmarkError(true, err)).toBe('Home bookmarks changed elsewhere. Please try again.');
  });

  it('describes a generic failure without prior permission as a permission message', () => {
    expect(describeBookmarkError(false, new Error('denied'))).toBe('Home bookmark permission was not granted.');
  });

  it('describes a generic failure with prior permission as a retry message', () => {
    expect(describeBookmarkError(true, new Error('boom'))).toBe('Could not update Home bookmarks. Please try again.');
  });
});
