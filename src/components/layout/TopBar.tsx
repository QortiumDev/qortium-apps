import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import PersonRemoveAlt1Icon from '@mui/icons-material/PersonRemoveAlt1';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate, useLocation } from 'react-router-dom';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';
import { themeAtom } from '../../state/atoms';
import { EnumTheme } from '../../types';
import { RatingControl } from './RatingControl';

const APP_QDN_NAME = 'Apps';

const NAV = [
  { path: '/',       label: 'Favorites', activeIcon: <FavoriteIcon fontSize="small" />,    idleIcon: <FavoriteBorderIcon fontSize="small" /> },
  { path: '/browse', label: 'Browse',    activeIcon: <GridViewIcon fontSize="small" />,    idleIcon: <GridViewIcon fontSize="small" /> },
];

export function TopBar() {
  const c = useColors();
  const [theme, setTheme] = useAtom(themeAtom);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isFollowed, setIsFollowed] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    qdnRequest({ action: 'GET_LIST', listName: 'followedNames' })
      .then((list) => { setIsFollowed(Array.isArray(list) && (list as string[]).includes(APP_QDN_NAME)); })
      .catch(() => {});
  }, []);

  async function handleToggleFollow() {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowed) {
        await qdnRequest({ action: 'REMOVE_FROM_LIST', listName: 'followedNames', items: [APP_QDN_NAME] });
        setIsFollowed(false);
      } else {
        await qdnRequest({ action: 'ADD_TO_LIST', listName: 'followedNames', items: [APP_QDN_NAME] });
        setIsFollowed(true);
      }
    } catch {}
    setFollowBusy(false);
  }

  function handleOpenHelp() {
    void qdnRequest({ action: 'OPEN_NEW_TAB', address: `qdn://APP/Help/Help?new=${APP_QDN_NAME}` });
  }

  const iconBtnSx = (active: boolean) => ({
    borderRadius: `${tokens.shape.radius}px`,
    color: active ? c.accent : c.textSecondary,
    '&:hover': { color: c.accent, bgcolor: c.borderLight },
    transition: '0.15s ease',
  });

  return (
    <Box
      component="header"
      sx={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: tokens.spacing.topBarHeight,
        bgcolor: c.surface,
        borderBottom: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
        display: 'flex', alignItems: 'center',
        px: 2, gap: 0.5, zIndex: 100,
      }}
    >
      <Typography
        sx={{
          fontWeight: tokens.typography.weightBlack,
          fontSize: '1rem',
          letterSpacing: '-0.01em',
          color: c.textPrimary,
          mr: 1.5,
          flexShrink: 0,
        }}
      >
        Apps
      </Typography>

      {NAV.map(({ path, label, activeIcon, idleIcon }) => {
        const active = pathname === path;
        return (
          <Tooltip key={path} title={label} placement="bottom">
            <IconButton
              size="small"
              onClick={() => navigate(path)}
              sx={iconBtnSx(active)}
            >
              {active ? activeIcon : idleIcon}
            </IconButton>
          </Tooltip>
        );
      })}

      <Box sx={{ flex: 1 }} />

      <RatingControl qdnName={APP_QDN_NAME} />

      <Tooltip title={isFollowed ? 'Stop following this app' : 'Follow this app'} placement="bottom">
        <IconButton
          size="small"
          onClick={() => void handleToggleFollow()}
          disabled={followBusy}
          sx={iconBtnSx(isFollowed)}
        >
          {isFollowed ? <PersonRemoveAlt1Icon fontSize="small" /> : <PersonAddAlt1Icon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Help & Feedback" placement="bottom">
        <IconButton
          size="small"
          onClick={handleOpenHelp}
          sx={iconBtnSx(false)}
        >
          <HelpOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title={theme === EnumTheme.DARK ? 'Light mode' : 'Dark mode'} placement="bottom">
        <IconButton
          size="small"
          onClick={() => setTheme(t => t === EnumTheme.DARK ? EnumTheme.LIGHT : EnumTheme.DARK)}
          sx={iconBtnSx(false)}
        >
          {theme === EnumTheme.DARK ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
