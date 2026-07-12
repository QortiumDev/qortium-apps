import { describe, expect, it } from 'vitest';
import { normalizeUiStyle, UI_STYLE_VALUES } from './displaySettings';

describe('normalizeUiStyle', () => {
  it('accepts every supported style with case and whitespace normalization', () => {
    expect(UI_STYLE_VALUES).toEqual(['classic', 'modern', 'fun']);
    expect(normalizeUiStyle(' CLASSIC ')).toBe('classic');
    expect(normalizeUiStyle('Modern')).toBe('modern');
    expect(normalizeUiStyle(' FUN ')).toBe('fun');
  });

  it('falls back to Classic for missing, invalid, and retired values', () => {
    expect(normalizeUiStyle(undefined)).toBe('classic');
    expect(normalizeUiStyle(null)).toBe('classic');
    expect(normalizeUiStyle('banana')).toBe('classic');
    expect(normalizeUiStyle('chibi')).toBe('classic');
  });
});
