import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Box, Typography, Button, IconButton, Tooltip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { favoritesAtom, uiStyleAtom } from '../state/atoms';
import { AppCard } from '../components/AppCard';
import { AppDetailDialog } from '../components/AppDetailDialog';
import { fetchResourceTimestamps } from '../api/rest';
import type { QdnResource } from '../types';

const UNCATEGORIZED = '__none__';

export function FavoritesPage() {
  const c = useColors();
  const isFun = useAtomValue(uiStyleAtom) === 'fun';
  const [favorites, setFavorites] = useAtom(favoritesAtom);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detail, setDetail] = useState<QdnResource | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  // Refresh timestamps for all favorites on mount so they reflect the current QDN state
  useEffect(() => {
    if (favorites.length === 0) return;
    let cancelled = false;
    Promise.all(
      favorites.map(async fav => {
        const ts = await fetchResourceTimestamps(fav.service, fav.name, fav.identifier);
        return { key: fav.key, updated: ts?.updated, created: ts?.created };
      })
    ).then(results => {
      if (cancelled) return;
      setFavorites(prev => prev.map(f => {
        const r = results.find(x => x.key === f.key);
        if (!r || (r.updated == null && r.created == null)) return f;
        return { ...f, updated: r.updated, created: r.created };
      }));
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const f of favorites) if (f.category) cats.add(f.category);
    return Array.from(cats).sort();
  }, [favorites]);

  const hasUncategorized = favorites.some(f => !f.category);

  const visible = useMemo(() => {
    if (!activeCategory) return favorites;
    if (activeCategory === UNCATEGORIZED) return favorites.filter(f => !f.category);
    return favorites.filter(f => f.category === activeCategory);
  }, [favorites, activeCategory]);

  const resources = useMemo<QdnResource[]>(() =>
    visible.map(f => ({
      service: f.service,
      name: f.name,
      identifier: f.identifier,
      title: f.label || f.identifier,
      updated: f.updated,
      created: f.created,
    })),
    [visible]
  );

  const handleOpenDetail = useCallback((resource: QdnResource) => {
    setDetail(resource);
  }, []);

  const handleReorder = useCallback((fromVis: number, toVis: number) => {
    if (fromVis === toVis) return;
    setFavorites(prev => {
      const globalIndices = visible.map(v => prev.findIndex(f => f.key === v.key));
      const movedGlobal = globalIndices[fromVis];
      const newGlobalIndices = [...globalIndices];
      newGlobalIndices.splice(fromVis, 1);
      newGlobalIndices.splice(toVis, 0, movedGlobal);
      const result = [...prev];
      for (let i = 0; i < globalIndices.length; i++) {
        result[globalIndices[i]] = prev[newGlobalIndices[i]];
      }
      return result;
    });
  }, [visible, setFavorites]);

  const handleMoveUp = useCallback((visIdx: number) => {
    if (visIdx > 0) handleReorder(visIdx, visIdx - 1);
  }, [handleReorder]);

  const handleMoveDown = useCallback((visIdx: number) => {
    if (visIdx < visible.length - 1) handleReorder(visIdx, visIdx + 1);
  }, [handleReorder, visible.length]);

  const chipSx = (active: boolean) => ({
    fontSize: '0.72rem',
    fontWeight: tokens.typography.weightBold,
    fontFamily: isFun ? c.headingFontFamily : c.fontFamily,
    letterSpacing: isFun ? 0 : '0.08em',
    textTransform: isFun ? 'none' as const : 'uppercase' as const,
    color: active ? c.accentText : c.textSecondary,
    bgcolor: active ? c.accent : 'transparent',
    border: `${isFun ? '2px' : '1px'} solid ${active ? c.accent : isFun ? c.outline : c.borderLight}`,
    borderRadius: isFun ? c.radiusPill : '50px',
    boxShadow: isFun ? c.shadowControl : 'none',
    appearance: 'none',
    font: 'inherit',
    margin: 0,
    px: 1.5, py: 0.5,
    cursor: 'pointer',
    userSelect: 'none' as const,
    transition: c.transitionControl,
    '&:hover': {
      borderColor: isFun ? c.outline : c.accent,
      color: active ? c.accentText : c.accent,
      bgcolor: active ? c.accent : isFun ? c.controlHover : 'transparent',
      transform: isFun ? 'translate(-1px, -1px)' : 'none',
    },
  });

  return (
    <Box
      sx={{
        pt: `calc(var(--apps-top-bar-height, ${tokens.spacing.topBarHeight}px) + 28px)`,
        pb: 6,
        px: { xs: 2, md: 4 },
        maxWidth: 900,
        mx: 'auto',
      }}
    >
      <Typography
        sx={{
          fontSize: '0.62rem', fontWeight: tokens.typography.weightBold,
          fontFamily: isFun ? c.headingFontFamily : c.fontFamily,
          letterSpacing: isFun ? 0 : '0.14em', textTransform: isFun ? 'none' : 'uppercase',
          color: c.textSecondary, mb: 2,
        }}
      >
        Favorites
      </Typography>

      {favorites.length === 0 ? (
        <Box sx={{
          textAlign: 'center', py: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
          ...(isFun && {
            bgcolor: c.surface,
            border: `3px solid ${c.outline}`,
            borderRadius: c.radiusMd,
            boxShadow: c.shadowCard,
            px: 2,
          }),
        }}>
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
              <Box component="button" type="button" onClick={() => setActiveCategory(null)} sx={chipSx(!activeCategory)}>
                All ({favorites.length})
              </Box>
              {categories.map(cat => (
                <Box component="button" type="button" key={cat} onClick={() => setActiveCategory(cat)} sx={chipSx(activeCategory === cat)}>
                  {cat} ({favorites.filter(f => f.category === cat).length})
                </Box>
              ))}
              {hasUncategorized && (
                <Box component="button" type="button" onClick={() => setActiveCategory(UNCATEGORIZED)} sx={chipSx(activeCategory === UNCATEGORIZED)}>
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
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 1.5,
              }}
            >
              {resources.map((r, i) => (
                <Box
                  key={`${r.service}|${r.name}|${r.identifier}`}
                  draggable
                  onDragStart={(e: React.DragEvent) => { e.dataTransfer.effectAllowed = 'move'; setDragIdx(i); }}
                  onDragOver={(e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overIdx !== i) setOverIdx(i); }}
                  onDrop={(e: React.DragEvent) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) handleReorder(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                  sx={{
                    position: 'relative',
                    cursor: dragIdx === null ? 'grab' : 'grabbing',
                    opacity: dragIdx === i ? 0.45 : 1,
                    outline: overIdx === i && dragIdx !== null && dragIdx !== i ? `2px solid ${c.accent}` : '2px solid transparent',
                    borderRadius: isFun ? c.radiusMd : `${tokens.shape.radius}px`,
                    transition: 'opacity 0.15s',
                    '& .move-controls': { opacity: 0, transition: 'opacity 0.12s' },
                    '&:hover .move-controls, &:focus-within .move-controls': { opacity: 1 },
                  }}
                >
                  <AppCard resource={r} onOpenDetail={handleOpenDetail} />
                  <Box
                    className="move-controls"
                    sx={{ position: 'absolute', top: 6, insetInlineStart: 6, display: 'flex', flexDirection: 'column', gap: 0.25, zIndex: 2 }}
                  >
                    <Tooltip title="Move up" placement="right">
                      <span>
                        <IconButton
                          size="small"
                          onClick={e => { e.stopPropagation(); handleMoveUp(i); }}
                          disabled={i === 0}
                          sx={{ p: 0.25, width: isFun ? 28 : 20, height: isFun ? 28 : 20, bgcolor: `${c.surface}dd`, border: `${isFun ? '2px' : '1px'} solid ${isFun ? c.outline : c.borderLight}`, borderRadius: isFun ? c.radiusSm : '3px', boxShadow: isFun ? c.shadowControl : 'none', color: c.textSecondary, '&:hover': { color: c.accent, bgcolor: c.surface }, '&.Mui-disabled': { opacity: 0.25, boxShadow: 'none' } }}
                        >
                          <ArrowUpwardIcon sx={{ fontSize: '0.65rem' }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Move down" placement="right">
                      <span>
                        <IconButton
                          size="small"
                          onClick={e => { e.stopPropagation(); handleMoveDown(i); }}
                          disabled={i === visible.length - 1}
                          sx={{ p: 0.25, width: isFun ? 28 : 20, height: isFun ? 28 : 20, bgcolor: `${c.surface}dd`, border: `${isFun ? '2px' : '1px'} solid ${isFun ? c.outline : c.borderLight}`, borderRadius: isFun ? c.radiusSm : '3px', boxShadow: isFun ? c.shadowControl : 'none', color: c.textSecondary, '&:hover': { color: c.accent, bgcolor: c.surface }, '&.Mui-disabled': { opacity: 0.25, boxShadow: 'none' } }}
                        >
                          <ArrowDownwardIcon sx={{ fontSize: '0.65rem' }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              size="small"
              onClick={() => setFavorites([])}
              sx={{ fontSize: '0.72rem', color: c.textSecondary, textTransform: 'none', '&:hover': { color: c.error, bgcolor: 'transparent' } }}
            >
              Clear all favorites
            </Button>
          </Box>
        </>
      )}

      <AppDetailDialog resource={detail} onClose={() => setDetail(null)} />
    </Box>
  );
}
