import { useState, useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFaviconUrl } from '../hooks/useFaviconUrl';
import { useHasTransparentBg } from '../hooks/useHasTransparentBg';
import { Box, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { favoritesAtom, uiStyleAtom } from '../state/atoms';
import { openNewTab } from '../api/qortal';
import { useFollowedNames } from '../hooks/useFollowedNames';
import { avatarColor, resourceKey, serviceLabel } from '../utils/format';
import { RatingControl } from './layout/RatingControl';
import type { QdnResource } from '../types';

interface Props {
  resource: QdnResource;
  onOpenDetail: (resource: QdnResource) => void;
}

export function AppCard({ resource, onOpenDetail }: Props) {
  const c = useColors();
  const isFun = useAtomValue(uiStyleAtom) === 'fun';
  const [favorites, setFavorites] = useAtom(favoritesAtom);

  const key = resourceKey(resource.service, resource.name, resource.identifier);
  const color = avatarColor(resource.name + resource.identifier);
  const letter = (resource.identifier?.[0] ?? resource.name?.[0] ?? '?').toUpperCase();
  const faviconUrl = useFaviconUrl(resource.service, resource.name, resource.identifier);
  const thumbSrc = resource.name
    ? `/arbitrary/THUMBNAIL/${resource.name}/avatar`
    : null;
  const [faviconFailed, setFaviconFailed] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  const showingFavicon = !!(faviconUrl && !faviconFailed);
  const showingThumb = !showingFavicon && !!(thumbSrc && !thumbFailed);
  const faviconTransparent = useHasTransparentBg(showingFavicon ? faviconUrl : null);
  const thumbTransparent = useHasTransparentBg(showingThumb ? thumbSrc : null);
  const avatarBgTransparent = showingFavicon ? faviconTransparent : (showingThumb ? thumbTransparent : false);

  const isFav = favorites.some(f => f.key === key);
  const { isFollowed, toggle: toggleFollow } = useFollowedNames(resource.name);

  const [opening, setOpening] = useState(false);

  const handleToggleFav = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      if (prev.some(f => f.key === key)) {
        return prev.filter(f => f.key !== key);
      }
      return [...prev, {
        key,
        service: resource.service,
        name: resource.name,
        identifier: resource.identifier,
        label: resource.identifier,
        category: '',
        addedAt: Date.now(),
        updated: resource.updated,
        created: resource.created,
      }];
    });
  }, [key, resource, setFavorites]);

  const handleOpen = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpening(true);
    try {
      await openNewTab(resource.service, resource.name, resource.identifier);
    } finally {
      setOpening(false);
    }
  }, [resource]);

  return (
    <Box
      className="app-card"
      onClick={() => onOpenDetail(resource)}
      sx={{
        bgcolor: c.surface,
        border: `${isFun ? '3px' : tokens.shape.borderWidth} solid ${isFun ? c.outline : c.borderLight}`,
        borderRadius: isFun ? c.radiusMd : `${tokens.shape.radius}px`,
        boxShadow: isFun ? c.shadowCard : 'none',
        px: 1.5,
        py: 1,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        gap: 1,
        transition: c.transitionControl,
        '&:hover': {
          bgcolor: isFun ? c.controlHover : c.borderLight,
          borderColor: c.accent,
          boxShadow: isFun ? c.shadowCardHover : '0 2px 12px rgba(0,0,0,0.12)',
          transform: isFun ? 'translate(-1px, -2px)' : 'none',
        },
        '&:focus-visible': {
          borderColor: isFun ? c.outline : c.accent,
          outline: `3px solid ${isFun ? c.focusOutline : c.accent}`,
          outlineOffset: 3,
        },
        '&:hover .open-btn': {
          color: c.accent,
          opacity: 1,
        },
        ...(isFun && {
          '& .MuiIconButton-root': {
            border: `2px solid ${c.outline}`,
            borderRadius: c.radiusSm,
            boxShadow: c.shadowControl,
            bgcolor: c.controlBg,
          },
          '& .MuiIconButton-root:hover': {
            bgcolor: c.controlHover,
            boxShadow: c.shadowControl,
          },
        }),
      }}
    >
      {/* Avatar */}
      <Box
        sx={{
          width: 32, height: 32,
          borderRadius: isFun ? c.radiusSm : `${tokens.shape.radius / 2}px`,
          bgcolor: avatarBgTransparent ? 'transparent' : color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {faviconUrl && !faviconFailed ? (
          <Box
            component="img"
            src={faviconUrl}
            alt=""
            onError={() => setFaviconFailed(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : thumbSrc && !thumbFailed ? (
          <Box
            component="img"
            src={thumbSrc}
            alt=""
            onError={() => setThumbFailed(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Typography sx={{ color: '#fff', fontWeight: tokens.typography.weightBlack, fontSize: '0.95rem', lineHeight: 1, userSelect: 'none' }}>
            {letter}
          </Typography>
        )}
      </Box>

      {/* Name + publisher */}
      <Box
        component="button"
        type="button"
        aria-label={`Open details for ${resource.title || resource.identifier}`}
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          onOpenDetail(resource);
        }}
        sx={{
          flex: 1,
          minWidth: 0,
          p: 0,
          border: 0,
          bgcolor: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          font: 'inherit',
          textAlign: 'start',
        }}
      >
        <Typography
          sx={{
            fontWeight: tokens.typography.weightBold,
            fontSize: '0.82rem',
            color: c.textPrimary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.3,
          }}
        >
          {resource.title || resource.identifier}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.68rem',
            color: c.textSecondary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.4,
          }}
        >
          {resource.name}
        </Typography>
      </Box>

      {/* Right side actions */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 0.5,
        flexShrink: 0,
        flexWrap: 'wrap',
        ml: { xs: 5, sm: 0 },
        width: { xs: 'calc(100% - 40px)', sm: 'auto' },
      }}>
        {/* Service badge - hidden on mobile */}
        <Box
          sx={{
            display: { xs: 'none', sm: 'block' },
            fontSize: '0.55rem',
            fontWeight: tokens.typography.weightBold,
            fontFamily: isFun ? c.headingFontFamily : c.fontFamily,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: c.textSecondary,
            border: `1px solid ${c.borderLight}`,
            borderRadius: isFun ? c.radiusPill : '3px',
            px: 0.75,
            py: 0.25,
            lineHeight: 1.6,
            mr: 0.25,
          }}
        >
          {serviceLabel(resource.service)}
        </Box>

        {/* Rating */}
        <Box onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <RatingControl qdnName={resource.name} service={resource.service} identifier={resource.identifier} />
        </Box>

        {/* Favorite */}
        <Tooltip title={isFav ? 'Remove from favorites' : 'Add to favorites'} placement="top">
          <IconButton
            size="small"
            onClick={handleToggleFav}
            sx={{
              p: 0.5,
              borderRadius: `${tokens.shape.radius / 2}px`,
              color: isFav ? c.error : c.textSecondary,
              '&:hover': { color: isFav ? c.error : c.accent, bgcolor: 'transparent' },
              transition: '0.15s ease',
            }}
          >
            {isFav
              ? <FavoriteIcon sx={{ fontSize: '0.9rem' }} />
              : <FavoriteBorderIcon sx={{ fontSize: '0.9rem' }} />
            }
          </IconButton>
        </Tooltip>

        {/* Follow */}
        <Tooltip title={isFollowed ? `Unfollow ${resource.name}` : `Follow ${resource.name}`} placement="top">
          <IconButton
            size="small"
            onClick={toggleFollow}
            sx={{
              p: 0.5,
              borderRadius: `${tokens.shape.radius / 2}px`,
              color: isFollowed ? c.accent : c.textSecondary,
              '&:hover': { color: c.accent, bgcolor: 'transparent' },
              transition: '0.15s ease',
            }}
          >
            {isFollowed
              ? <PersonRemoveIcon sx={{ fontSize: '0.9rem' }} />
              : <PersonAddIcon sx={{ fontSize: '0.9rem' }} />
            }
          </IconButton>
        </Tooltip>

        {/* Open */}
        <Tooltip title="Open in new tab" placement="top">
          <IconButton
            size="small"
            className="open-btn"
            onClick={handleOpen}
            disabled={opening}
            sx={{
              p: 0.5,
              borderRadius: `${tokens.shape.radius / 2}px`,
              color: c.textSecondary,
              opacity: 0.7,
              '&:hover': { bgcolor: 'transparent' },
              transition: '0.15s ease',
            }}
          >
            {opening
              ? <CircularProgress size={13} sx={{ color: c.textSecondary }} />
              : <OpenInNewIcon sx={{ fontSize: '0.9rem' }} />
            }
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
