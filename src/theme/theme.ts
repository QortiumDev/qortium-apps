import { createTheme } from '@mui/material/styles';
import {
  getColorTokens,
  lightColors,
  darkColors,
  tokens,
  type AppThemeMode,
  type ColorTokens,
  type UiStyle,
} from './tokens';

export function createAppTheme({
  mode,
  uiStyle,
  colors,
}: {
  mode: AppThemeMode;
  uiStyle: UiStyle;
  colors: ColorTokens;
}) {
  const isClassic = uiStyle === 'classic';
  const isFun = uiStyle === 'fun';
  const usesNaturalCase = isClassic || isFun;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.accent,
        dark: colors.accentStrong,
        contrastText: colors.accentContrast,
      },
      error: { main: colors.danger },
      success: { main: colors.success },
      background: {
        default: colors.pageBg,
        paper: colors.surface,
      },
      text: {
        primary: colors.text,
        secondary: colors.textSecondary,
      },
      divider: usesNaturalCase ? colors.border : colors.borderLight,
    },
    typography: {
      fontFamily: colors.fontFamily,
      h1: { fontFamily: colors.headingFontFamily, fontSize: '2.5rem', fontWeight: tokens.typography.weightBlack },
      h2: { fontFamily: colors.headingFontFamily, fontSize: '2rem', fontWeight: tokens.typography.weightBold },
      h3: { fontFamily: colors.headingFontFamily, fontSize: '1.5rem', fontWeight: tokens.typography.weightBold },
      h4: { fontFamily: colors.headingFontFamily, fontSize: '1.25rem', fontWeight: tokens.typography.weightBold },
      h5: { fontFamily: colors.headingFontFamily, fontSize: '1rem', fontWeight: tokens.typography.weightMedium },
      h6: { fontFamily: colors.headingFontFamily, fontSize: '0.875rem', fontWeight: tokens.typography.weightMedium },
      body1: { fontSize: '1rem', fontWeight: tokens.typography.weightRegular, lineHeight: 1.45 },
      body2: { fontSize: '0.875rem', fontWeight: tokens.typography.weightRegular, lineHeight: 1.35 },
      caption: {
        fontSize: '0.75rem',
        letterSpacing: usesNaturalCase ? 0 : '0.08em',
        textTransform: usesNaturalCase ? 'none' : 'uppercase',
      },
      button: {
        fontFamily: isFun ? colors.headingFontFamily : colors.fontFamily,
        textTransform: usesNaturalCase ? 'none' : 'uppercase',
        fontWeight: tokens.typography.weightBold,
        letterSpacing: usesNaturalCase ? 0 : '0.08em',
      },
    },
    spacing: 8,
    shape: { borderRadius: isClassic ? tokens.shape.radiusMd : isFun ? 10 : tokens.shape.radius },
    breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: colors.pageBg,
            backgroundImage: isFun
              ? `radial-gradient(circle at 50% 0, ${colors.accentSoft}, transparent 36%), linear-gradient(rgb(7 16 12 / 3%) 1px, transparent 1px), linear-gradient(90deg, rgb(7 16 12 / 3%) 1px, transparent 1px)`
              : 'none',
            backgroundSize: isFun ? 'auto, 28px 28px, 28px 28px' : 'auto',
            color: colors.text,
            fontFamily: colors.fontFamily,
          },
          '#root': {
            minHeight: '100vh',
            backgroundColor: isFun ? 'transparent' : colors.pageBg,
          },
        },
      },
      MuiDialog: { styleOverrides: { paper: { backgroundImage: 'none' } } },
      MuiPopover: { styleOverrides: { paper: { backgroundImage: 'none' } } },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: colors.surface,
            borderColor: usesNaturalCase ? colors.border : colors.borderLight,
            borderRadius: isFun ? colors.radiusMd : undefined,
            boxShadow: isClassic || isFun ? colors.shadowCard : 'none',
          },
        },
      },
      MuiTooltip: { defaultProps: { placement: 'bottom' as const } },
      MuiButton: {
        styleOverrides: {
          root: {
            border: isFun ? `2px solid ${colors.outline}` : undefined,
            borderRadius: isFun ? colors.radiusSm : undefined,
            boxShadow: isFun ? colors.shadowControl : undefined,
            fontFamily: isFun ? colors.headingFontFamily : colors.fontFamily,
            textTransform: usesNaturalCase ? 'none' : 'uppercase',
            letterSpacing: usesNaturalCase ? 0 : '0.08em',
            fontWeight: tokens.typography.weightBold,
            transition: isFun ? colors.transitionControl : undefined,
            ...(isFun && {
              '&:hover:not(.Mui-disabled)': {
                boxShadow: colors.shadowPrimaryButtonHover,
                transform: 'translate(-1px, -2px) rotate(-0.2deg)',
              },
              '&:active:not(.Mui-disabled)': {
                boxShadow: colors.shadowControlActive,
                transform: 'translate(2px, 2px) scale(0.98)',
              },
              '&:focus-visible': {
                outline: `3px solid ${colors.focusOutline}`,
                outlineOffset: 3,
              },
            }),
          },
        },
      },
    },
  });
}

export const lightTheme = createAppTheme({
  mode: 'light',
  uiStyle: 'modern',
  colors: getColorTokens('light', 'modern', 'green'),
});

export const darkTheme = createAppTheme({
  mode: 'dark',
  uiStyle: 'modern',
  colors: getColorTokens('dark', 'modern', 'green'),
});

export { lightColors, darkColors };
