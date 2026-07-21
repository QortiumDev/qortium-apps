import { useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useFaviconUrl } from '../hooks/useFaviconUrl';
import { useHasTransparentBg } from '../hooks/useHasTransparentBg';
import { Box, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { favoritesAtom } from '../state/atoms';
import { openNewTab } from '../api/qortal';
import { useFollowedNames } from '../hooks/useFollowedNames';
import { useHomeBookmark } from '../hooks/useHomeBookmark';
import { avatarColor, resourceKey, serviceLabel, formatDate } from '../utils/format';
import { RatingControl } from './layout/RatingControl';
import type { QdnResource } from '../types';

interface Props {
  resource: QdnResource;
  onOpenDetail: (resource: QdnResource) => void;
}

export function AppCard({ resource, onOpenDetail }: Props) {
  const c = useColors();
  const isFun = false;
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
  const {
    supported: bookmarkSupported,
    isBookmarked,
    busy: bookmarkBusy,
    error: bookmarkError,
    toggle: toggleBookmark,
  } = useHomeBookmark(resource);

  const [opening, setOpening] = useState(false);
  const lastPublished = resource.updated ?? resource.created;

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
    if (opening) return;
    setOpening(true);
    try {
      await openNewTab(resource.service, resource.name, resource.identifier);
    } finally {
      setOpening(false);
    }
  }, [resource, opening]);

  return (
    <Box
      className="app-card"
      onClick={handleOpen}
      sx={{
        bgcolor: c.surface,
        border: `${isFun ? '3px' : tokens.shape.borderWidth} solid ${isFun ? c.outline : c.borderLight}`,
        borderRadius: isFun ? c.radiusMd : `${tokens.shape.radius}px`,
        boxShadow: isFun ? c.shadowCard : 'none',
        px: 1.5,
        py: 1.25,
        cursor: opening ? 'wait' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
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
        '&:hover .detail-btn': {
          color: c.accent,
          opacity: 1,
        },
      }}
    >
      {/* Header: avatar + app name ... account name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
          {opening ? (
            <CircularProgress size={16} sx={{ color: avatarBgTransparent ? c.textSecondary : '#fff' }} />
          ) : faviconUrl && !faviconFailed ? (
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

        <Box
          component="button"
          type="button"
          aria-label={`Open ${resource.title || resource.identifier}`}
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation();
            handleOpen(event);
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
              fontSize: '0.85rem',
              color: c.textPrimary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.3,
            }}
          >
            {resource.title || resource.identifier}
          </Typography>
        </Box>

        <Typography
          sx={{
            flexShrink: 0,
            maxWidth: '40%',
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

      {/* Actions row */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        flexWrap: 'wrap',
      }}>
        {/* Service badge */}
        <Box
          sx={{
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

        <Box sx={{ flex: 1 }} />

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

        {/* Home Bookmarks */}
        {bookmarkSupported && (
          <Tooltip title={isBookmarked ? 'Remove from Home bookmarks' : 'Save to Home bookmarks'} placement="top">
            <span>
              <IconButton
                size="small"
                onClick={toggleBookmark}
                disabled={bookmarkBusy}
                sx={{
                  p: 0.5,
                  borderRadius: `${tokens.shape.radius / 2}px`,
                  color: isBookmarked ? c.accent : c.textSecondary,
                  '&:hover': { color: c.accent, bgcolor: 'transparent' },
                  transition: '0.15s ease',
                }}
              >
                {isBookmarked
                  ? <BookmarkIcon sx={{ fontSize: '0.9rem' }} />
                  : <BookmarkBorderIcon sx={{ fontSize: '0.9rem' }} />
                }
              </IconButton>
            </span>
          </Tooltip>
        )}

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

        {/* Detail view */}
        <Tooltip title="View details" placement="top">
          <IconButton
            size="small"
            className="detail-btn"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenDetail(resource);
            }}
            sx={{
              p: 0.5,
              borderRadius: `${tokens.shape.radius / 2}px`,
              color: c.textSecondary,
              opacity: 0.7,
              '&:hover': { bgcolor: 'transparent' },
              transition: '0.15s ease',
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: '0.9rem' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Home Bookmarks error */}
      {bookmarkError && (
        <Typography sx={{ fontSize: '0.62rem', color: c.error, lineHeight: 1.3 }}>
          {bookmarkError}
        </Typography>
      )}

      {/* Description */}
      {resource.description && (
        <Typography
          sx={{
            fontSize: '0.72rem',
            color: c.textSecondary,
            opacity: 0.85,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 3,
            overflow: 'hidden',
            lineHeight: 1.45,
            whiteSpace: 'normal',
          }}
        >
          {resource.description}
        </Typography>
      )}

      {/* Last published */}
      {lastPublished !== undefined && (
        <Typography
          sx={{
            fontSize: '0.62rem',
            color: c.textSecondary,
            opacity: 0.6,
            whiteSpace: 'nowrap',
            textAlign: 'end',
          }}
        >
          {formatDate(lastPublished)}
        </Typography>
      )}
    </Box>
  );
}
