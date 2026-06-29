import { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { Box, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { favoritesAtom } from '../state/atoms';
import { fetchVoteCount } from '../api/rest';
import { openNewTab } from '../api/qortal';
import { avatarColor, voteId as makeVoteId, resourceKey, serviceLabel, formatAge, formatDate } from '../utils/format';
import { getCachedVotes, setCachedVotes } from '../utils/votesCache';
import type { QdnResource } from '../types';

interface Props {
  resource: QdnResource;
  onOpenDetail: (resource: QdnResource) => void;
  onVoteOptimistic?: (key: string, delta: number) => void;
}

export function AppCard({ resource, onOpenDetail }: Props) {
  const c = useColors();
  const [favorites, setFavorites] = useAtom(favoritesAtom);

  const key = resourceKey(resource.service, resource.name, resource.identifier);
  const pName = makeVoteId(resource.service, resource.name, resource.identifier);
  const color = avatarColor(resource.name + resource.identifier);
  const letter = (resource.identifier?.[0] ?? resource.name?.[0] ?? '?').toUpperCase();

  const isFav = favorites.some(f => f.key === key);

  const cached = getCachedVotes(pName);
  const [votes, setVotes] = useState<number | null>(cached !== undefined ? cached : null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (cached !== undefined) {
      setVotes(cached);
      return;
    }
    let cancelled = false;
    fetchVoteCount(pName).then(count => {
      if (cancelled) return;
      setCachedVotes(pName, count);
      setVotes(count);
    });
    return () => { cancelled = true; };
  }, [pName, cached]);

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
      onClick={() => onOpenDetail(resource)}
      sx={{
        bgcolor: c.surface,
        border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
        borderRadius: `${tokens.shape.radius}px`,
        p: 2,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        transition: '0.15s ease',
        '&:hover': {
          bgcolor: c.borderLight,
          borderColor: c.accent,
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        },
        '&:hover .open-btn': {
          color: c.accent,
          opacity: 1,
        },
      }}
    >
      {/* Top row: avatar + name + service badge + favorite */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        {/* Colored letter avatar */}
        <Box
          sx={{
            width: 40, height: 40,
            borderRadius: `${tokens.shape.radius / 2}px`,
            bgcolor: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: '#fff', fontWeight: tokens.typography.weightBlack, fontSize: '1.1rem', lineHeight: 1, userSelect: 'none' }}>
            {letter}
          </Typography>
        </Box>

        {/* Name + publisher */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: tokens.typography.weightBold,
              fontSize: '0.88rem',
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
              fontSize: '0.72rem',
              color: c.textSecondary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.4,
            }}
          >
            by {resource.name}
          </Typography>
        </Box>

        {/* Service badge + favorite */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Box
            sx={{
              fontSize: '0.58rem',
              fontWeight: tokens.typography.weightBold,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: c.textSecondary,
              border: `1px solid ${c.borderLight}`,
              borderRadius: '3px',
              px: 0.75,
              py: 0.25,
              lineHeight: 1.6,
            }}
          >
            {serviceLabel(resource.service)}
          </Box>

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
                ? <FavoriteIcon sx={{ fontSize: '0.95rem' }} />
                : <FavoriteBorderIcon sx={{ fontSize: '0.95rem' }} />
              }
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Bottom row: votes + publish date + open button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Vote count */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ThumbUpAltIcon sx={{ fontSize: '0.8rem', color: c.textSecondary }} />
          {votes === null
            ? <CircularProgress size={10} sx={{ color: c.textSecondary }} />
            : (
              <Typography sx={{ fontSize: '0.75rem', fontWeight: tokens.typography.weightBold, color: c.textSecondary }}>
                {votes > 0 ? votes.toLocaleString() : '—'}
              </Typography>
            )
          }
        </Box>

        {/* Publish date */}
        <Tooltip title={formatDate(resource.updated ?? resource.created)} placement="top">
          <Typography sx={{ fontSize: '0.68rem', color: c.textSecondary, cursor: 'default' }}>
            {formatAge(resource.updated ?? resource.created)}
          </Typography>
        </Tooltip>

        {/* Open button */}
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
              ? <CircularProgress size={14} sx={{ color: c.textSecondary }} />
              : <OpenInNewIcon sx={{ fontSize: '0.95rem' }} />
            }
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
