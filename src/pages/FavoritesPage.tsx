import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import { Box, Typography, Button } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { favoritesAtom } from '../state/atoms';
import { AppCard } from '../components/AppCard';
import { AppDetailDialog } from '../components/AppDetailDialog';
import { fetchResourceTimestamps } from '../api/rest';
import type { QdnResource } from '../types';

const UNCATEGORIZED = '__none__';

export function FavoritesPage() {
  const c = useColors();
  const [favorites, setFavorites] = useAtom(favoritesAtom);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detail, setDetail] = useState<QdnResource | null>(null);

  // Backfill timestamps for favorites saved before this feature existed
  useEffect(() => {
    const missing = favorites.filter(f => f.updated == null && f.created == null);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(async fav => {
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

  const chipSx = (active: boolean) => ({
    fontSize: '0.72rem',
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
        maxWidth: 900,
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
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 1.5,
              }}
            >
              {resources.map(r => (
                <AppCard
                  key={`${r.service}|${r.name}|${r.identifier}`}
                  resource={r}
                  onOpenDetail={handleOpenDetail}
                />
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
