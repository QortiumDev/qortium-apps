import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { EnumTheme, type Favorite } from '../types';

const _p = new URLSearchParams(window.location.search);
const _textSize = _p.get('textSize');
const _lang = _p.get('lang') ?? 'en';

if (_textSize) document.documentElement.dataset.textSize = _textSize;
document.documentElement.lang = _lang;
document.documentElement.dir = _lang === 'ar' || _lang === 'he' ? 'rtl' : 'ltr';

export const themeAtom  = atom<EnumTheme>(_p.get('theme') === 'light' ? EnumTheme.LIGHT : EnumTheme.DARK);
export const accentAtom = atom<string>(_p.get('accent') ?? 'green');

export const favoritesAtom = atomWithStorage<Favorite[]>('brs-favorites', []);

export const accountAtom = atom<{ address: string; name: string | null } | null>(null);
