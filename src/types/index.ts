export enum EnumTheme {
  DARK = 'dark',
  LIGHT = 'light',
}

export interface QdnResource {
  service: string;
  name: string;
  identifier: string;
  size?: number;
  status?: string;
  title?: string;
  description?: string;
  tags?: string[];
  created?: number;
  updated?: number;
}

export interface Favorite {
  key: string;
  service: string;
  name: string;
  identifier: string;
  label: string;
  category: string;
  addedAt: number;
}

export type ServiceFilter = 'ALL' | 'APP' | 'WEBSITE';
export type SortMode = 'latest' | 'az' | 'voted';
