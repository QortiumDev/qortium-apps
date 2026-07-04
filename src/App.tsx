import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme } from './theme/theme';
import { getColorTokens } from './theme/tokens';
import { ColorTokensContext } from './theme/ColorTokensContext';
import { themeAtom, accentAtom, uiStyleAtom } from './state/atoms';
import { EnumTheme } from './types';
import { AppRoutes } from './routes/Routes';

export function App() {
  const [theme]  = useAtom(themeAtom);
  const [accent] = useAtom(accentAtom);
  const [uiStyle] = useAtom(uiStyleAtom);
  const mode = theme === EnumTheme.DARK ? 'dark' : 'light';
  const colors = useMemo(() => getColorTokens(mode, uiStyle, accent), [mode, uiStyle, accent]);
  const muiTheme = useMemo(
    () => createAppTheme({ mode, uiStyle, colors }),
    [mode, uiStyle, colors],
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <ColorTokensContext.Provider value={colors}>
        <AppRoutes />
      </ColorTokensContext.Provider>
    </ThemeProvider>
  );
}
