export interface BookmarkManagerLink {
  createdAt: number;
  displayUrl: string;
  id: string;
  title: string;
  type: 'bookmark';
}

export interface BookmarkManagerFolder {
  children: BookmarkManagerTreeItem[];
  createdAt: number;
  id: string;
  title: string;
  type: 'folder';
}

export type BookmarkManagerTreeItem = BookmarkManagerFolder | BookmarkManagerLink;

export interface BookmarkManagerSnapshot {
  bookmarks: BookmarkManagerTreeItem[];
  revision: number;
  schemaVersion: 1;
}

export type BookmarkManagerMutation =
  | { type: 'addTreeLink'; rootId: 'bookmarks'; link: { displayUrl: string; title: string } }
  | { type: 'removeTreeItem'; rootId: 'bookmarks'; itemId: string };

export interface BookmarkManagerMutationResult {
  changed: boolean;
  snapshot: BookmarkManagerSnapshot;
}
