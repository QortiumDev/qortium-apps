import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { EnumTheme, type Favorite } from '../types';
import { normalizeUiStyle, type UiStyle } from '../displaySettings';

const _p = new URLSearchParams(window.location.search);
const _theme = _p.get('theme') === 'light' ? EnumTheme.LIGHT : EnumTheme.DARK;
const _accent = _p.get('accent') ?? 'green';
const _textSize = _p.get('textSize') ?? 'medium';
const _lang = _p.get('lang') ?? 'en';
const _uiStyle = normalizeUiStyle(_p.get('uiStyle'));

export const parseUiStyle = normalizeUiStyle;
export type { UiStyle } from '../displaySettings';

document.documentElement.dataset.theme = _theme;
document.documentElement.dataset.accent = _accent;
document.documentElement.dataset.textSize = _textSize;
document.documentElement.dataset.ui = _uiStyle;
document.documentElement.lang = _lang;
document.documentElement.dir = _lang === 'ar' || _lang === 'he' ? 'rtl' : 'ltr';
document.documentElement.style.colorScheme = _theme;

export const themeAtom  = atom<EnumTheme>(_theme);
export const accentAtom = atom<string>(_accent);
export const uiStyleAtom = atom<UiStyle>(_uiStyle);

export const favoritesAtom = atomWithStorage<Favorite[]>('brs-favorites', []);

export const notificationsEnabledAtom = atomWithStorage<boolean>('brs-notifications-enabled', false);

export const followedNamesAtom = atom<Set<string>>(new Set<string>());
