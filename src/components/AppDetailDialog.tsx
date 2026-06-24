import { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import {
  Box, Dialog, Typography, IconButton, Button,
  InputBase, Tooltip, CircularProgress, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import LinkIcon from '@mui/icons-material/Link';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { favoritesAtom } from '../state/atoms';
import { fetchVoteCount } from '../api/rest';
import { openNewTab, castVote, type VoteResult } from '../api/qortal';
import { appLink } from '../apps';
import { avatarColor, voteId as makeVoteId, resourceKey, serviceLabel, formatBytes, formatDate } from '../utils/format';
import { getCachedVotes, setCachedVotes } from '../utils/votesCache';
import type { QdnResource } from '../types';

interface Props {
  resource: QdnResource | null;
  onClose: () => void;
}

type VoteStatus = 'idle' | 'loading' | VoteResult;

export function AppDetailDialog({ resource, onClose }: Props) {
  const c = useColors();
  const [favorites, setFavorites] = useAtom(favoritesAtom);

  const key       = resource ? resourceKey(resource.service, resource.name, resource.identifier) : '';
  const pName     = resource ? makeVoteId(resource.service, resource.name, resource.identifier) : '';
  const color     = resource ? avatarColor(resource.name + resource.identifier) : c.accent;
  const letter    = resource ? (resource.identifier?.[0] ?? resource.name?.[0] ?? '?').toUpperCase() : '';

  const fav = favorites.find(f => f.key === key);

  const cached = resource ? getCachedVotes(pName) : undefined;
  const [votes, setVotes]       = useState<number | null>(cached !== undefined ? cached : null);
  const [voteStatus, setVoteStatus] = useState<VoteStatus>('idle');
  const [opening, setOpening]   = useState(false);
  const [category, setCategory] = useState(fav?.category ?? '');
  const [catEdited, setCatEdited] = useState(false);

  useEffect(() => {
    if (!resource) return;
    setVoteStatus('idle');
    setOpening(false);
    setCatEdited(false);

    const c2 = getCachedVotes(pName);
    if (c2 !== undefined) {
      setVotes(c2);
      return;
    }
    setVotes(null);
    let cancelled = false;
    fetchVoteCount(pName).then(count => {
      if (cancelled) return;
      setCachedVotes(pName, count);
      setVotes(count);
    });
    return () => { cancelled = true; };
  }, [resource, pName]);

  useEffect(() => {
    if (fav) {
      setCategory(fav.category);
    } else {
      setCategory('');
    }
    setCatEdited(false);
  }, [fav, key]);

  const handleVote = useCallback(async () => {
    if (!resource || voteStatus === 'loading') return;
    setVoteStatus('loading');
    const result = await castVote(pName);
    setVoteStatus(result);
    if (result === 'voted') {
      const newCount = (votes ?? 0) + 1;
      setVotes(newCount);
      setCachedVotes(pName, newCount);
    }
  }, [resource, pName, votes, voteStatus]);

  const handleToggleFav = useCallback(() => {
    if (!resource) return;
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
      }];
    });
  }, [resource, key, setFavorites]);

  const handleSaveCategory = useCallback(() => {
    if (!resource) return;
    setFavorites(prev => {
      const exists = prev.find(f => f.key === key);
      if (exists) {
        return prev.map(f => f.key === key ? { ...f, category } : f);
      }
      return [...prev, {
        key,
        service: resource.service,
        name: resource.name,
        identifier: resource.identifier,
        label: resource.identifier,
        category,
        addedAt: Date.now(),
      }];
    });
    setCatEdited(false);
  }, [resource, key, category, setFavorites]);

  const handleOpen = useCallback(async () => {
    if (!resource) return;
    setOpening(true);
    try {
      await openNewTab(resource.service, resource.name, resource.identifier);
    } finally {
      setOpening(false);
    }
  }, [resource]);

  const handleOpenPublisher = useCallback(async () => {
    if (!resource) return;
    await qdnRequest({
      action: 'OPEN_NEW_TAB',
      address: appLink('chain', `?_route=${encodeURIComponent(`/address/${resource.name}`)}`),
    });
  }, [resource]);

  const voteLabel: Record<VoteStatus, string> = {
    idle: 'Upvote',
    loading: 'Voting…',
    voted: 'Voted!',
    'already-voted': 'Already voted',
    'no-name': 'Name required',
    error: 'Try again',
  };

  if (!resource) return null;

  return (
    <Dialog
      open={!!resource}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: c.surface,
          border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
          borderRadius: 0,
          boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
          m: 2,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center',
          px: 3, py: 2,
          borderBottom: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 44, height: 44,
            borderRadius: `${tokens.shape.radius / 2}px`,
            bgcolor: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: '#fff', fontWeight: tokens.typography.weightBlack, fontSize: '1.2rem', lineHeight: 1, userSelect: 'none' }}>
            {letter}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: tokens.typography.weightBold, fontSize: '0.95rem', color: c.textPrimary, lineHeight: 1.3 }}>
            {resource.title || resource.identifier}
          </Typography>
          {resource.title && resource.title !== resource.identifier && (
            <Typography sx={{ fontSize: '0.72rem', color: c.textSecondary, lineHeight: 1.4 }}>
              {resource.identifier}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            fontSize: '0.6rem', fontWeight: tokens.typography.weightBold,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: c.textSecondary,
            border: `1px solid ${c.borderLight}`,
            borderRadius: '3px', px: 0.75, py: 0.25, lineHeight: 1.6,
            flexShrink: 0,
          }}
        >
          {serviceLabel(resource.service)}
        </Box>

        <IconButton
          onClick={onClose}
          size="small"
          sx={{ borderRadius: `${tokens.shape.radius}px`, color: c.textSecondary, '&:hover': { color: c.textPrimary, bgcolor: c.borderLight } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

        {/* Publisher row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontSize: '0.62rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.textSecondary, mb: 0.25 }}>
              Publisher
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: c.textPrimary, fontWeight: tokens.typography.weightMedium }}>
              {resource.name}
            </Typography>
          </Box>
          <Tooltip title="View in Chain Explorer" placement="top">
            <IconButton
              size="small"
              onClick={handleOpenPublisher}
              sx={{ borderRadius: `${tokens.shape.radius}px`, color: c.textSecondary, '&:hover': { color: c.accent, bgcolor: c.borderLight } }}
            >
              <LinkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Description */}
        {resource.description && (
          <Box>
            <Typography sx={{ fontSize: '0.62rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.textSecondary, mb: 0.5 }}>
              Description
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: c.textPrimary, lineHeight: 1.5 }}>
              {resource.description}
            </Typography>
          </Box>
        )}

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {resource.tags.map(tag => (
              <Box
                key={tag}
                sx={{
                  fontSize: '0.65rem', fontWeight: tokens.typography.weightBold,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: c.textSecondary,
                  border: `1px solid ${c.borderLight}`,
                  borderRadius: '50px', px: 1, py: 0.25,
                }}
              >
                {tag}
              </Box>
            ))}
          </Box>
        )}

        {/* Meta: size + dates */}
        <Box sx={{ display: 'flex', gap: 3 }}>
          {resource.size !== undefined && (
            <Box>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.textSecondary, mb: 0.25 }}>
                Size
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: c.textPrimary, fontFamily: 'monospace' }}>
                {formatBytes(resource.size)}
              </Typography>
            </Box>
          )}
          {resource.created !== undefined && (
            <Box>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.textSecondary, mb: 0.25 }}>
                Published
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: c.textPrimary }}>
                {formatDate(resource.created)}
              </Typography>
            </Box>
          )}
          {resource.updated !== undefined && resource.updated !== resource.created && (
            <Box>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.textSecondary, mb: 0.25 }}>
                Updated
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: c.textPrimary }}>
                {formatDate(resource.updated)}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: c.borderLight }} />

        {/* Vote section */}
        <Box>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.textSecondary, mb: 1 }}>
            Community Rating
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <ThumbUpAltIcon sx={{ fontSize: '1.1rem', color: c.accent }} />
              {votes === null
                ? <CircularProgress size={14} sx={{ color: c.textSecondary }} />
                : (
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: tokens.typography.weightBlack, color: c.textPrimary }}>
                    {votes.toLocaleString()}
                  </Typography>
                )
              }
              <Typography sx={{ fontSize: '0.75rem', color: c.textSecondary }}>
                upvotes
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="small"
              disableElevation
              startIcon={
                voteStatus === 'loading'
                  ? <CircularProgress size={12} sx={{ color: c.accentText }} />
                  : voteStatus === 'voted'
                  ? <ThumbUpAltIcon fontSize="small" />
                  : <ThumbUpOffAltIcon fontSize="small" />
              }
              onClick={handleVote}
              disabled={voteStatus === 'loading' || voteStatus === 'voted' || voteStatus === 'already-voted' || voteStatus === 'no-name'}
              sx={{
                bgcolor: voteStatus === 'voted' ? c.success : c.accent,
                color: c.accentText,
                borderRadius: '50px',
                '&:hover': { bgcolor: voteStatus === 'voted' ? c.success : c.accentHover },
                '&.Mui-disabled': { opacity: 0.45, color: c.accentText, bgcolor: voteStatus === 'voted' ? c.success : c.accent },
              }}
            >
              {voteLabel[voteStatus]}
            </Button>

            {voteStatus === 'error' && (
              <Typography sx={{ fontSize: '0.72rem', color: c.error }}>
                Failed — try again
              </Typography>
            )}
            {voteStatus === 'no-name' && (
              <Typography sx={{ fontSize: '0.72rem', color: c.textSecondary }}>
                Register a name to vote
              </Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ borderColor: c.borderLight }} />

        {/* Favorites section */}
        <Box>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: tokens.typography.weightBold, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.textSecondary, mb: 1 }}>
            Favorites
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant={fav ? 'contained' : 'outlined'}
                size="small"
                disableElevation
                startIcon={fav ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                onClick={handleToggleFav}
                sx={fav
                  ? {
                    bgcolor: c.error, color: '#fff', borderRadius: '50px',
                    '&:hover': { bgcolor: '#b32929' },
                  }
                  : {
                    borderColor: c.accent, color: c.accent, borderRadius: '50px',
                    '&:hover': { bgcolor: c.borderLight, borderColor: c.accent },
                  }
                }
              >
                {fav ? 'Saved' : 'Save to Favorites'}
              </Button>

              {fav && (
                <Typography sx={{ fontSize: '0.72rem', color: c.textSecondary }}>
                  Added {formatDate(fav.addedAt)}
                </Typography>
              )}
            </Box>

            {fav && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex', alignItems: 'center',
                    border: `${tokens.shape.borderWidth} solid ${catEdited ? c.accent : c.borderLight}`,
                    borderRadius: `${tokens.shape.radius}px`,
                    px: 1.5, height: 34,
                    '&:focus-within': { borderColor: c.accent },
                    transition: '0.15s ease',
                  }}
                >
                  <InputBase
                    fullWidth
                    placeholder="Category (e.g. DeFi, Tools, Social…)"
                    value={category}
                    onChange={e => { setCategory(e.target.value); setCatEdited(true); }}
                    onKeyDown={e => e.key === 'Enter' && handleSaveCategory()}
                    sx={{ fontSize: '0.82rem', color: c.textPrimary, '& input::placeholder': { color: c.textSecondary, opacity: 1 } }}
                  />
                </Box>
                {catEdited && (
                  <Button
                    size="small"
                    variant="contained"
                    disableElevation
                    onClick={handleSaveCategory}
                    sx={{ bgcolor: c.accent, color: c.accentText, borderRadius: '50px', '&:hover': { bgcolor: c.accentHover }, whiteSpace: 'nowrap' }}
                  >
                    Save
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Footer CTA */}
      <Box sx={{ px: 3, pb: 3 }}>
        <Button
          fullWidth
          variant="contained"
          disableElevation
          size="large"
          startIcon={opening ? <CircularProgress size={16} sx={{ color: c.accentText }} /> : <OpenInNewIcon />}
          onClick={handleOpen}
          disabled={opening}
          sx={{
            bgcolor: c.accent, color: c.accentText,
            borderRadius: 0,
            py: 1.5,
            '&:hover': { bgcolor: c.accentHover },
            '&.Mui-disabled': { opacity: 0.4, color: c.accentText, bgcolor: c.accent },
          }}
        >
          {opening ? 'Opening…' : `Open ${serviceLabel(resource.service)}`}
        </Button>
      </Box>
    </Dialog>
  );
}
