import { describe, expect, it } from 'vitest';
import {
  ACCENT_MAP,
  funDarkColors,
  funLightColors,
  getBaseTokens,
  getColorTokens,
  type AccentName,
  type AppThemeMode,
} from './tokens';

const ACCENTS: AccentName[] = [
  'green', 'blue', 'orange', 'purple', 'red', 'teal', 'cyan', 'pink', 'yellow',
];
const MODES: AppThemeMode[] = ['light', 'dark'];

describe('Fun color tokens', () => {
  it('selects distinct canonical light and dark bases', () => {
    expect(getBaseTokens('light', 'fun')).toBe(funLightColors);
    expect(getBaseTokens('dark', 'fun')).toBe(funDarkColors);
    expect(funLightColors.pageBg).toBe('#eaf4ff');
    expect(funLightColors.surface).toBe('#fffef8');
    expect(funDarkColors.pageBg).toBe('#07100f');
    expect(funDarkColors.surface).toBe('#172420');
    expect(funDarkColors.outline).toBe('#9bb7ad');
  });

  it.each(MODES)('supports every Home accent in %s mode without falling through', (mode) => {
    for (const accent of ACCENTS) {
      const colors = getColorTokens(mode, 'fun', accent);
      expect(colors.accent).toBe(ACCENT_MAP.fun[mode][accent].accent);
      expect(colors.fontFamily).toContain('Comic Neue');
      expect(colors.headingFontFamily).toContain('Fredoka');
      expect(colors.outline).toBe(mode === 'dark' ? '#9bb7ad' : '#07100c');
      if (accent !== 'green') expect(colors.controlSelected).toContain('rgba');
    }
  });
});
