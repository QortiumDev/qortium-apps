import { useState, useEffect, useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  Box, Dialog, Typography, IconButton, Button,
  InputBase, Tooltip, CircularProgress, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LinkIcon from '@mui/icons-material/Link';
import { useFaviconUrl } from '../hooks/useFaviconUrl';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { favoritesAtom, uiStyleAtom } from '../state/atoms';
import { fetchNameInfo, fetchPrimaryName, fetchResourceMeta, type NameInfo, type ResourceMeta } from '../api/rest';
import { openNewTab } from '../api/qortal';
import { appLink } from '../apps';
import { avatarColor, resourceKey, serviceLabel, formatBytes, formatDate, truncateAddress, formatCategory } from '../utils/format';
import { RatingControl } from './layout/RatingControl';
import type { QdnResource } from '../types';

interface Props {
  resource: QdnResource | null;
  onClose: () => void;
}

export function AppDetailDialog({ resource, onClose }: Props) {
  const c = useColors();
  const isFun = useAtomValue(uiStyleAtom) === 'fun';
  const [favorites, setFavorites] = useAtom(favoritesAtom);

  const key       = resource ? resourceKey(resource.service, resource.name, resource.identifier) : '';
  const color     = resource ? avatarColor(resource.name + resource.identifier) : c.accent;
  const letter    = resource ? (resource.identifier?.[0] ?? resource.name?.[0] ?? '?').toUpperCase() : '';
  const faviconUrl = useFaviconUrl(resource?.service ?? '', resource?.name ?? '', resource?.identifier ?? '');
  const thumbSrc = resource?.name
    ? `/arbitrary/THUMBNAIL/${resource.name}/avatar`
    : null;

  const fav = favorites.find(f => f.key === key);

  const [opening, setOpening]   = useState(false);
  const [catInput, setCatInput] = useState(fav?.category ?? '');
  const [catEdited, setCatEdited] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [nameInfo, setNameInfo] = useState<NameInfo | null>(null);
  const [ownerPrimaryName, setOwnerPrimaryName] = useState<string | null>(null);
  const [freshMeta, setFreshMeta] = useState<ResourceMeta | null>(null);

  useEffect(() => {
    if (!resource) return;
    setOpening(false);
    setCatEdited(false);
    setFaviconFailed(false);
    setThumbFailed(false);
    setNameInfo(null);
    setOwnerPrimaryName(null);
    setFreshMeta(null);

    let cancelled = false;

    fetchNameInfo(resource.name).then(info => {
      if (cancelled) return;
      setNameInfo(info);
      if (info?.owner) {
        fetchPrimaryName(info.owner).then(pName => {
          if (!cancelled) setOwnerPrimaryName(pName);
        }).catch(() => {});
      }
    });

    fetchResourceMeta(resource.service, resource.name, resource.identifier).then(meta => {
      if (cancelled) return;
      setFreshMeta(meta);
    });

    return () => { cancelled = true; };
  }, [resource]);

  useEffect(() => {
    if (fav) {
      setCatInput(fav.category);
    } else {
      setCatInput('');
    }
    setCatEdited(false);
  }, [fav, key]);

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
        return prev.map(f => f.key === key ? { ...f, category: catInput } : f);
      }
      return [...prev, {
        key,
        service: resource.service,
        name: resource.name,
        identifier: resource.identifier,
        label: resource.identifier,
        category: catInput,
        addedAt: Date.now(),
      }];
    });
    setCatEdited(false);
  }, [resource, key, catInput, setFavorites]);

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

  if (!resource) return null;

  const title            = resource.title       ?? freshMeta?.title;
  const description      = resource.description ?? freshMeta?.description;
  const resourceCategory = resource.category    ?? freshMeta?.category;
  const tags             = resource.tags        ?? freshMeta?.tags;
  const size             = resource.size        ?? freshMeta?.size;
  const created          = resource.created     ?? freshMeta?.created;
  const updated          = resource.updated     ?? freshMeta?.updated;
  const sectionLabelSx = {
    fontSize: '0.62rem',
    fontWeight: tokens.typography.weightBold,
    fontFamily: isFun ? c.headingFontFamily : c.fontFamily,
    letterSpacing: isFun ? 0 : '0.12em',
    textTransform: isFun ? 'none' as const : 'uppercase' as const,
    color: c.textSecondary,
  };

  return (
    <Dialog
      open={!!resource}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: 'app-detail-dialog',
        sx: {
          bgcolor: c.surface,
          border: `${isFun ? '3px' : tokens.shape.borderWidth} solid ${isFun ? c.outline : c.borderLight}`,
          borderRadius: isFun ? c.radiusMd : 0,
          boxShadow: isFun ? c.shadowModal : '0 8px 40px rgba(0,0,0,0.35)',
          m: 2,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' },
          px: { xs: 1.5, sm: 3 }, py: 2,
          borderBottom: `${isFun ? '3px' : tokens.shape.borderWidth} solid ${isFun ? c.outline : c.borderLight}`,
          gap: { xs: 1, sm: 2 },
        }}
      >
        <Box
          sx={{
            width: 44, height: 44,
            borderRadius: isFun ? c.radiusSm : `${tokens.shape.radius / 2}px`,
            bgcolor: color,
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
            <Typography sx={{ color: '#fff', fontWeight: tokens.typography.weightBlack, fontSize: '1.2rem', lineHeight: 1, userSelect: 'none' }}>
              {letter}
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontFamily: isFun ? c.headingFontFamily : c.fontFamily, fontWeight: tokens.typography.weightBold, fontSize: '0.95rem', color: c.textPrimary, lineHeight: 1.3, overflowWrap: 'anywhere' }}>
            {title || resource.identifier}
          </Typography>
          {title && title !== resource.identifier && (
            <Typography sx={{ fontSize: '0.72rem', color: c.textSecondary, lineHeight: 1.4 }}>
              {resource.identifier}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            fontSize: '0.6rem', fontWeight: tokens.typography.weightBold,
            fontFamily: isFun ? c.headingFontFamily : c.fontFamily,
            letterSpacing: isFun ? 0 : '0.1em', textTransform: isFun ? 'none' : 'uppercase',
            color: c.textSecondary,
            border: `${isFun ? '2px' : '1px'} solid ${isFun ? c.outline : c.borderLight}`,
            borderRadius: isFun ? c.radiusPill : '3px', px: 0.75, py: 0.25, lineHeight: 1.6,
            flexShrink: 0,
            display: { xs: 'none', sm: 'block' },
          }}
        >
          {serviceLabel(resource.service)}
        </Box>

        <IconButton
          onClick={onClose}
          size="small"
          sx={{ border: isFun ? `2px solid ${c.outline}` : 'none', borderRadius: isFun ? c.radiusSm : `${tokens.shape.radius}px`, boxShadow: isFun ? c.shadowControl : 'none', bgcolor: isFun ? c.controlBg : 'transparent', color: c.textSecondary, '&:hover': { color: c.textPrimary, bgcolor: isFun ? c.controlHover : c.borderLight } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ p: { xs: 1.5, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

        {/* Publisher row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ ...sectionLabelSx, mb: 0.25 }}>
              Publisher
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: c.textPrimary, fontWeight: tokens.typography.weightMedium }}>
              {resource.name}
            </Typography>
            {nameInfo?.owner && (
              <Tooltip title={nameInfo.owner} placement="bottom-start">
                <Typography sx={{ fontSize: '0.72rem', color: c.textSecondary, fontFamily: ownerPrimaryName ? 'inherit' : 'monospace', mt: 0.25, cursor: 'default' }}>
                  {ownerPrimaryName ?? truncateAddress(nameInfo.owner)}
                </Typography>
              </Tooltip>
            )}
            {nameInfo?.registered !== undefined && (
              <Typography sx={{ fontSize: '0.72rem', color: c.textSecondary, mt: 0.2 }}>
                Registered {formatDate(nameInfo.registered)}
              </Typography>
            )}
          </Box>
          <Tooltip title="View in Chain Explorer" placement="top">
            <IconButton
              size="small"
              onClick={handleOpenPublisher}
              sx={{ borderRadius: `${tokens.shape.radius}px`, color: c.textSecondary, '&:hover': { color: c.accent, bgcolor: c.borderLight }, mt: 0.5 }}
            >
              <LinkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Description */}
        {description && (
          <Box>
            <Typography sx={{ ...sectionLabelSx, mb: 0.5 }}>
              Description
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: c.textPrimary, lineHeight: 1.5 }}>
              {description}
            </Typography>
          </Box>
        )}

        {/* Category + Tags */}
        {(resourceCategory || (tags && tags.length > 0)) && (
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
            {resourceCategory && (
              <Box
                sx={{
                  fontSize: '0.65rem', fontWeight: tokens.typography.weightBold,
                  fontFamily: isFun ? c.headingFontFamily : c.fontFamily,
                  letterSpacing: isFun ? 0 : '0.08em', textTransform: isFun ? 'none' : 'uppercase',
                  color: c.accent,
                  border: `1px solid ${c.accent}`,
                  borderRadius: isFun ? c.radiusPill : '50px', px: 1, py: 0.25,
                }}
              >
                {formatCategory(resourceCategory)}
              </Box>
            )}
            {tags?.map(tag => (
              <Box
                key={tag}
                sx={{
                  fontSize: '0.65rem', fontWeight: tokens.typography.weightBold,
                  fontFamily: isFun ? c.headingFontFamily : c.fontFamily,
                  letterSpacing: isFun ? 0 : '0.08em', textTransform: isFun ? 'none' : 'uppercase',
                  color: c.textSecondary,
                  border: `${isFun ? '2px' : '1px'} solid ${isFun ? c.outline : c.borderLight}`,
                  borderRadius: isFun ? c.radiusPill : '50px', px: 1, py: 0.25,
                }}
              >
                {tag}
              </Box>
            ))}
          </Box>
        )}

        {/* Meta: size + dates */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {size !== undefined && (
            <Box>
              <Typography sx={{ ...sectionLabelSx, mb: 0.25 }}>
                Size
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: c.textPrimary, fontFamily: 'monospace' }}>
                {formatBytes(size)}
              </Typography>
            </Box>
          )}
          {created !== undefined && (
            <Box>
              <Typography sx={{ ...sectionLabelSx, mb: 0.25 }}>
                Published
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: c.textPrimary }}>
                {formatDate(created)}
              </Typography>
            </Box>
          )}
          {updated !== undefined && updated !== created && (
            <Box>
              <Typography sx={{ ...sectionLabelSx, mb: 0.25 }}>
                Updated
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: c.textPrimary }}>
                {formatDate(updated)}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: c.borderLight }} />

        {/* Rating section */}
        <Box>
          <Typography sx={{ ...sectionLabelSx, mb: 1 }}>
            Community Rating
          </Typography>
          <RatingControl qdnName={resource.name} service={resource.service} identifier={resource.identifier} />
        </Box>

        <Divider sx={{ borderColor: c.borderLight }} />

        {/* Favorites section */}
        <Box>
          <Typography sx={{ ...sectionLabelSx, mb: 1 }}>
            Favorites
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant={fav ? 'contained' : 'outlined'}
                size="small"
                disableElevation
                startIcon={fav ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                onClick={handleToggleFav}
                sx={fav
                  ? {
                    bgcolor: c.error, color: '#fff', borderRadius: isFun ? c.radiusPill : '50px',
                    '&:hover': { bgcolor: c.error },
                  }
                  : {
                    borderColor: c.accent, color: c.accent, borderRadius: isFun ? c.radiusPill : '50px',
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex', alignItems: 'center',
                    border: `${isFun ? '2px' : tokens.shape.borderWidth} solid ${catEdited ? c.accent : isFun ? c.outline : c.borderLight}`,
                    borderRadius: isFun ? c.radiusSm : `${tokens.shape.radius}px`,
                    boxShadow: isFun ? c.shadowControl : 'none',
                    px: 1.5, minHeight: 34,
                    minWidth: { xs: '100%', sm: 0 },
                    '&:focus-within': {
                      borderColor: isFun ? c.outline : c.accent,
                      outline: isFun ? `3px solid ${c.focusOutline}` : 'none',
                      outlineOffset: isFun ? 3 : 0,
                    },
                    transition: c.transitionControl,
                  }}
                >
                  <InputBase
                    fullWidth
                    placeholder="Category (e.g. DeFi, Tools, Social…)"
                    value={catInput}
                    onChange={e => { setCatInput(e.target.value); setCatEdited(true); }}
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
                    sx={{ bgcolor: c.accent, color: c.accentText, borderRadius: isFun ? c.radiusPill : '50px', '&:hover': { bgcolor: c.accentHover }, whiteSpace: 'nowrap' }}
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
      <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 3 }}>
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
            borderRadius: isFun ? c.radiusSm : 0,
            py: 1.5,
            '&:hover': { bgcolor: c.accentHover },
            '&.Mui-disabled': { opacity: 0.4, color: c.accentText, bgcolor: c.accent },
          }}
        >
          {opening ? 'Opening…' : `Open ${title || serviceLabel(resource.service)}`}
        </Button>
      </Box>
    </Dialog>
  );
}
