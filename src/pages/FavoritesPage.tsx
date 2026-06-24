import { useState, useMemo, useCallback, type MouseEvent } from 'react';
import { useAtom } from 'jotai';
import { Box, Typography, IconButton, Tooltip, InputBase, Button } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { favoritesAtom } from '../state/atoms';
import { openNewTab } from '../api/qortal';
import { AppDetailDialog } from '../components/AppDetailDialog';
import { avatarColor, serviceLabel } from '../utils/format';
import type { Favorite, QdnResource } from '../types';

const UNCATEGORIZED = '__none__';

function FavRow({ fav, onOpen, onRemove, onOpenDetail, onCategoryChange }: {
  fav: Favorite;
  onOpen: (fav: Favorite) => void;
  onRemove: (key: string) => void;
  onOpenDetail: (fav: Favorite) => void;
  onCategoryChange: (key: string, category: string) => void;
}) {
  const c = useColors();
  const color  = avatarColor(fav.name + fav.identifier);
  const letter = (fav.identifier?.[0] ?? fav.name?.[0] ?? '?').toUpperCase();

  const [editing, setEditing]   = useState(false);
  const [catVal, setCatVal]     = useState(fav.category);
  const [opening, setOpening]   = useState(false);

  const handleSave = () => {
    onCategoryChange(fav.key, catVal);
    setEditing(false);
  };

  const handleOpen = async () => {
    setOpening(true);
    try { await onOpen(fav); } finally { setOpening(false); }
  };

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1.5,
        borderBottom: `1px solid ${c.borderLight}`,
        '&:last-child': { borderBottom: 'none' },
        '&:hover': { bgcolor: c.borderLight },
        transition: '0.12s ease',
        cursor: 'pointer',
      }}
      onClick={() => !editing && onOpenDetail(fav)}
    >
      {/* Avatar */}
      <Box
        sx={{
          width: 34, height: 34,
          borderRadius: `${tokens.shape.radius / 2}px`,
          bgcolor: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Typography sx={{ color: '#fff', fontWeight: tokens.typography.weightBlack, fontSize: '0.95rem', lineHeight: 1, userSelect: 'none' }}>
          {letter}
        </Typography>
      </Box>

      {/* Name + category */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: tokens.typography.weightBold, fontSize: '0.85rem', color: c.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {fav.label || fav.identifier}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ fontSize: '0.68rem', color: c.textSecondary }}>
            by {fav.name}
          </Typography>
          {!editing && fav.category && (
            <Box
              sx={{
                fontSize: '0.58rem', fontWeight: tokens.typography.weightBold,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: c.accent,
                border: `1px solid ${c.accent}`,
                borderRadius: '50px', px: 0.75, py: 0.1,
                lineHeight: 1.6,
              }}
            >
              {fav.category}
            </Box>
          )}
        </Box>
      </Box>

      {/* Service badge */}
      <Box
        sx={{
          fontSize: '0.58rem', fontWeight: tokens.typography.weightBold,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: c.textSecondary,
          border: `1px solid ${c.borderLight}`,
          borderRadius: '3px', px: 0.75, py: 0.25, lineHeight: 1.6,
          flexShrink: 0,
        }}
      >
        {serviceLabel(fav.service)}
      </Box>

      {/* Category inline edit */}
      {editing && (
        <Box
          onClick={(e: MouseEvent) => e.stopPropagation()}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <Box
            sx={{
              display: 'flex', alignItems: 'center',
              border: `${tokens.shape.borderWidth} solid ${c.accent}`,
              borderRadius: `${tokens.shape.radius}px`,
              px: 1, height: 30,
            }}
          >
            <InputBase
              autoFocus
              value={catVal}
              onChange={e => setCatVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
              placeholder="Category…"
              sx={{ fontSize: '0.78rem', color: c.textPrimary, width: 110 }}
            />
          </Box>
          <IconButton size="small" onClick={handleSave} sx={{ color: c.success, p: 0.5 }}>
            <CheckIcon sx={{ fontSize: '0.9rem' }} />
          </IconButton>
        </Box>
      )}

      {/* Actions */}
      {!editing && (
        <Box onClick={(e: MouseEvent) => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Tooltip title="Edit category" placement="top">
            <IconButton
              size="small"
              onClick={() => { setEditing(true); setCatVal(fav.category); }}
              sx={{ p: 0.5, borderRadius: `${tokens.shape.radius / 2}px`, color: c.textSecondary, '&:hover': { color: c.accent, bgcolor: 'transparent' } }}
            >
              <EditIcon sx={{ fontSize: '0.85rem' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open in new tab" placement="top">
            <IconButton
              size="small"
              onClick={handleOpen}
              disabled={opening}
              sx={{ p: 0.5, borderRadius: `${tokens.shape.radius / 2}px`, color: c.textSecondary, '&:hover': { color: c.accent, bgcolor: 'transparent' } }}
            >
              <OpenInNewIcon sx={{ fontSize: '0.85rem' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove from favorites" placement="top">
            <IconButton
              size="small"
              onClick={() => onRemove(fav.key)}
              sx={{ p: 0.5, borderRadius: `${tokens.shape.radius / 2}px`, color: c.textSecondary, '&:hover': { color: c.error, bgcolor: 'transparent' } }}
            >
              <DeleteOutlineIcon sx={{ fontSize: '0.85rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}

export function FavoritesPage() {
  const c = useColors();
  const [favorites, setFavorites] = useAtom(favoritesAtom);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detail, setDetail] = useState<QdnResource | null>(null);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const f of favorites) {
      if (f.category) cats.add(f.category);
    }
    return Array.from(cats).sort();
  }, [favorites]);

  const hasUncategorized = favorites.some(f => !f.category);

  const visible = useMemo(() => {
    if (!activeCategory) return favorites;
    if (activeCategory === UNCATEGORIZED) return favorites.filter(f => !f.category);
    return favorites.filter(f => f.category === activeCategory);
  }, [favorites, activeCategory]);

  const handleRemove = useCallback((key: string) => {
    setFavorites(prev => prev.filter(f => f.key !== key));
  }, [setFavorites]);

  const handleOpen = useCallback(async (fav: Favorite) => {
    await openNewTab(fav.service, fav.name, fav.identifier);
  }, []);

  const handleOpenDetail = useCallback((fav: Favorite) => {
    setDetail({
      service: fav.service,
      name: fav.name,
      identifier: fav.identifier,
      title: fav.label || fav.identifier,
    });
  }, []);

  const handleCategoryChange = useCallback((key: string, category: string) => {
    setFavorites(prev => prev.map(f => f.key === key ? { ...f, category } : f));
  }, [setFavorites]);

  const chipSx = (active: boolean) => ({
    fontSize: '0.7rem',
    fontWeight: tokens.typography.weightBold,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: active ? c.accentText : c.textSecondary,
    bgcolor: active ? c.accent : 'transparent',
    border: `1px solid ${active ? c.accent : c.borderLight}`,
    borderRadius: '50px',
    px: 1.5, py: 0.5,
    cursor: 'pointer',
    userSelect: 'none' as const,
    transition: '0.12s ease',
    '&:hover': { borderColor: c.accent, color: active ? c.accentText : c.accent },
  });

  return (
    <Box
      sx={{
        pt: `${tokens.spacing.topBarHeight + 28}px`,
        pb: 6,
        px: { xs: 2, md: 4 },
        maxWidth: 720,
        mx: 'auto',
      }}
    >
      <Typography
        sx={{
          fontSize: '0.62rem', fontWeight: tokens.typography.weightBold,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: c.textSecondary, mb: 2,
        }}
      >
        Favorites
      </Typography>

      {favorites.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <FavoriteIcon sx={{ fontSize: '2.5rem', color: c.borderLight }} />
          <Typography sx={{ fontSize: '0.85rem', color: c.textSecondary }}>
            No favorites yet
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: c.textSecondary, maxWidth: 280, lineHeight: 1.6 }}>
            Tap the heart icon on any app in Browse to save it here.
          </Typography>
        </Box>
      ) : (
        <>
          {/* Category filter */}
          {(categories.length > 0 || hasUncategorized) && (
            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box onClick={() => setActiveCategory(null)} sx={chipSx(!activeCategory)}>
                All ({favorites.length})
              </Box>
              {categories.map(cat => (
                <Box key={cat} onClick={() => setActiveCategory(cat)} sx={chipSx(activeCategory === cat)}>
                  {cat} ({favorites.filter(f => f.category === cat).length})
                </Box>
              ))}
              {hasUncategorized && (
                <Box onClick={() => setActiveCategory(UNCATEGORIZED)} sx={chipSx(activeCategory === UNCATEGORIZED)}>
                  Uncategorized ({favorites.filter(f => !f.category).length})
                </Box>
              )}
            </Box>
          )}

          {visible.length === 0 ? (
            <Typography sx={{ fontSize: '0.82rem', color: c.textSecondary, py: 4, textAlign: 'center' }}>
              No apps in this category.
            </Typography>
          ) : (
            <Box
              sx={{
                bgcolor: c.surface,
                border: `${tokens.shape.borderWidth} solid ${c.borderLight}`,
                borderRadius: `${tokens.shape.radius}px`,
                overflow: 'hidden',
              }}
            >
              {visible.map(fav => (
                <FavRow
                  key={fav.key}
                  fav={fav}
                  onOpen={handleOpen}
                  onRemove={handleRemove}
                  onOpenDetail={handleOpenDetail}
                  onCategoryChange={handleCategoryChange}
                />
              ))}
            </Box>
          )}

          {favorites.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                size="small"
                onClick={() => setFavorites([])}
                sx={{ fontSize: '0.72rem', color: c.textSecondary, textTransform: 'none', '&:hover': { color: c.error, bgcolor: 'transparent' } }}
              >
                Clear all favorites
              </Button>
            </Box>
          )}
        </>
      )}

      <AppDetailDialog resource={detail} onClose={() => setDetail(null)} />
    </Box>
  );
}
