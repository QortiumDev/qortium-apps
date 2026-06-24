import { useAtom } from 'jotai';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme } from './theme/theme';
import { lightColors, darkColors, applyAccent } from './theme/tokens';
import { ColorTokensContext } from './theme/ColorTokensContext';
import { themeAtom, accentAtom } from './state/atoms';
import { EnumTheme } from './types';
import { AppRoutes } from './routes/Routes';

export function App() {
  const [theme]  = useAtom(themeAtom);
  const [accent] = useAtom(accentAtom);
  const isDark   = theme === EnumTheme.DARK;

  return (
    <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <CssBaseline />
      <ColorTokensContext.Provider value={applyAccent(isDark ? darkColors : lightColors, accent)}>
        <AppRoutes />
      </ColorTokensContext.Provider>
    </ThemeProvider>
  );
}
