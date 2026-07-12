import { useState, useEffect, useCallback, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { Box, Typography, InputBase, CircularProgress, Button, IconButton, Skeleton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useColors } from '../theme/ColorTokensContext';
import { tokens } from '../theme/tokens';
import { AppCard } from '../components/AppCard';
import { AppDetailDialog } from '../components/AppDetailDialog';
import { searchResources } from '../api/qortal';
import { resourceKey } from '../utils/format';
import type { QdnResource, ServiceFilter, SortMode } from '../types';
import { uiStyleAtom } from '../state/atoms';

const LIMIT = 25;

const SERVICE_OPTS: { value: ServiceFilter; label: string }[] = [
  { value: 'ALL',     label: 'All'      },
  { value: 'APP',     label: 'Apps'     },
  { value: 'WEBSITE', label: 'Websites' },
];

const SORT_OPTS: { value: SortMode; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'az',     label: 'A – Z'  },
  { value: 'top',    label: 'Top'    },
];

function CardSkeleton() {
  const c = useColors();
  const isFun = useAtomValue(uiStyleAtom) === 'fun';
  return (
    <Box
      sx={{
        bgcolor: c.surface,
        border: `${isFun ? '3px' : tokens.shape.borderWidth} solid ${isFun ? c.outline : c.borderLight}`,
        borderRadius: isFun ? c.radiusMd : `${tokens.shape.radius}px`,
        boxShadow: isFun ? c.shadowCard : 'none',
        px: 1.5, py: 1,
        display: 'flex', alignItems: 'center', gap: 1,
      }}
    >
      <Skeleton variant="rectangular" width={32} height={32} sx={{ borderRadius: `${tokens.shape.radius / 2}px`, bgcolor: c.borderLight, flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Skeleton variant="text" width="55%" sx={{ bgcolor: c.borderLight }} />
        <Skeleton variant="text" width="38%" sx={{ bgcolor: c.borderLight }} />
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
        <Skeleton variant="circular" width={22} height={22} sx={{ bgcolor: c.borderLight }} />
        <Skeleton variant="circular" width={22} height={22} sx={{ bgcolor: c.borderLight }} />
        <Skeleton variant="circular" width={22} height={22} sx={{ bgcolor: c.borderLight }} />
      </Box>
    </Box>
  );
}

export function BrowsePage() {
  const c = useColors();
  const isFun = useAtomValue(uiStyleAtom) === 'fun';

  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<ServiceFilter>('ALL');
  const [sort, setSort]         = useState<SortMode>('latest');
  const [resources, setResources] = useState<QdnResource[]>([]);
  const [loading, setLoading]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]   = useState(true);
  const [offset, setOffset]     = useState(0);
  const [detail, setDetail]     = useState<QdnResource | null>(null);
  const [ratingMap, setRatingMap] = useState<Record<string, number>>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doLoad = useCallback(async (
    q: string,
    svc: ServiceFilter,
    off: number,
    reset: boolean,
  ) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      let results: QdnResource[] = [];

      if (svc === 'ALL') {
        const [apps, webs] = await Promise.all([
          searchResources({ service: 'APP',     query: q || undefined, limit: LIMIT, offset: off }),
          searchResources({ service: 'WEBSITE', query: q || undefined, limit: LIMIT, offset: off }),
        ]);
        const seen = new Set<string>();
        for (const r of [...apps, ...webs]) {
          const k = resourceKey(r.service, r.name, r.identifier);
          if (!seen.has(k)) { seen.add(k); results.push(r); }
        }
        results.sort((a, b) => (b.updated ?? b.created ?? 0) - (a.updated ?? a.created ?? 0));
        setHasMore(apps.length === LIMIT || webs.length === LIMIT);
      } else {
        results = await searchResources({ service: svc, query: q || undefined, limit: LIMIT, offset: off });
        setHasMore(results.length === LIMIT);
      }

      setResources(prev => {
        if (reset) return results;
        const existing = new Set(prev.map(r => resourceKey(r.service, r.name, r.identifier)));
        return [...prev, ...results.filter(r => !existing.has(resourceKey(r.service, r.name, r.identifier)))];
      });
      setOffset(off + LIMIT);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    doLoad(search, filter, 0, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setOffset(0);
      setHasMore(true);
      doLoad(val, filter, 0, true);
    }, 400);
  };

  const handleClearSearch = () => {
    setSearch('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setOffset(0);
    setHasMore(true);
    doLoad('', filter, 0, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      doLoad(search, filter, offset, false);
    }
  };

  useEffect(() => {
    if (sort !== 'top' || resources.length === 0) return;
    let cancelled = false;
    Promise.all(
      resources.map(async r => {
        const key = resourceKey(r.service, r.name, r.identifier);
        try {
          const summary = await qdnRequest({
            action: 'FETCH_NODE_API',
            path: `/resource-ratings/summary?service=${encodeURIComponent(r.service)}&name=${encodeURIComponent(r.name)}&identifier=${encodeURIComponent(r.identifier ?? 'default')}`,
          }) as { weightedAverageRating?: number | null } | null;
          return [key, summary?.weightedAverageRating ?? 0] as const;
        } catch {
          return [key, 0] as const;
        }
      })
    ).then(entries => {
      if (cancelled) return;
      setRatingMap(prev => {
        const next = { ...prev };
        for (const [key, rating] of entries) next[key] = rating;
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [sort, resources]);

  const sorted = [...resources].sort((a, b) => {
    if (sort === 'az') {
      return (a.identifier || a.name).localeCompare(b.identifier || b.name);
    }
    if (sort === 'top') {
      const ka = resourceKey(a.service, a.name, a.identifier);
      const kb = resourceKey(b.service, b.name, b.identifier);
      return (ratingMap[kb] ?? 0) - (ratingMap[ka] ?? 0);
    }
    return 0; // 'latest' is already sorted by server
  });

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
        width: '100%',
        maxWidth: 900,
        mx: 'auto',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      {/* Page label */}
      <Typography
        sx={{
          fontSize: '0.62rem', fontWeight: tokens.typography.weightBold,
          fontFamily: isFun ? c.headingFontFamily : c.fontFamily,
          letterSpacing: isFun ? 0 : '0.14em', textTransform: isFun ? 'none' : 'uppercase',
          color: c.textSecondary, mb: 2,
        }}
      >
        Discover
      </Typography>

      {/* Search input */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          border: `${isFun ? '2px' : tokens.shape.borderWidth} solid ${isFun ? c.outline : c.borderLight}`,
          borderRadius: isFun ? c.radiusSm : `${tokens.shape.radius}px`,
          boxShadow: isFun ? c.shadowControl : 'none',
          px: 1.5, minHeight: 44, mb: 2,
          '&:focus-within': {
            borderColor: isFun ? c.outline : c.accent,
            outline: isFun ? `3px solid ${c.focusOutline}` : 'none',
            outlineOffset: isFun ? 3 : 0,
          },
          transition: c.transitionControl,
          bgcolor: c.surface,
        }}
      >
        {loading
          ? <CircularProgress size={16} sx={{ color: c.textSecondary, flexShrink: 0 }} />
          : <SearchIcon sx={{ fontSize: '1rem', color: c.textSecondary, flexShrink: 0 }} />
        }
        <InputBase
          fullWidth
          placeholder="Search apps and websites…"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && debounceRef.current) {
              clearTimeout(debounceRef.current);
              setOffset(0);
              doLoad(search, filter, 0, true);
            }
          }}
          sx={{
            fontSize: '0.9rem',
            color: c.textPrimary,
            '& input::placeholder': { color: c.textSecondary, opacity: 1 },
          }}
        />
        {search && (
          <IconButton
            aria-label="Clear search"
            size="small"
            onClick={handleClearSearch}
            sx={{
              cursor: 'pointer', flexShrink: 0,
              borderRadius: isFun ? c.radiusSm : `${tokens.shape.radius}px`,
              color: c.textSecondary, display: 'flex', alignItems: 'center',
              '&:hover': { color: c.textPrimary },
            }}
          >
            <ClearIcon sx={{ fontSize: '0.9rem' }} />
          </IconButton>
        )}
      </Box>

      {/* Filters + Sort row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {SERVICE_OPTS.map(({ value, label }) => (
          <Box component="button" type="button" key={value} onClick={() => setFilter(value)} sx={chipSx(filter === value)}>
            {label}
          </Box>
        ))}

        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {SORT_OPTS.map(({ value, label }) => (
            <Box
              component="button"
              type="button"
              key={value}
              onClick={() => setSort(value)}
              sx={{
                ...chipSx(sort === value),
                px: 1.25,
              }}
            >
              {label}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Grid */}
      {loading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))',
            gap: 1,
          }}
        >
          {Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}
        </Box>
      ) : sorted.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
            ...(isFun && {
              bgcolor: c.surface,
              border: `3px solid ${c.outline}`,
              borderRadius: c.radiusMd,
              boxShadow: c.shadowCard,
              px: 2,
            }),
          }}
        >
          <SearchIcon sx={{ fontSize: '2.5rem', color: c.borderLight }} />
          <Typography sx={{ fontSize: '0.85rem', color: c.textSecondary }}>
            {search ? `No results for "${search}"` : 'No apps found'}
          </Typography>
          {search && (
            <Button
              size="small"
              onClick={handleClearSearch}
              sx={{ color: c.accent, textTransform: 'none', fontWeight: 400 }}
            >
              Clear search
            </Button>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))',
            gap: 1,
          }}
        >
          {sorted.map(r => (
            <AppCard
              key={resourceKey(r.service, r.name, r.identifier)}
              resource={r}
              onOpenDetail={setDetail}
            />
          ))}
        </Box>
      )}

      {/* Load more */}
      {!loading && hasMore && sorted.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handleLoadMore}
            disabled={loadingMore}
            startIcon={loadingMore ? <CircularProgress size={14} sx={{ color: c.accent }} /> : undefined}
            sx={{
              borderColor: c.borderLight, color: c.textSecondary,
              borderRadius: isFun ? c.radiusPill : '50px', px: 3,
              '&:hover': { borderColor: c.accent, color: c.accent, bgcolor: 'transparent' },
              '&.Mui-disabled': { opacity: 0.4 },
            }}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </Box>
      )}

      {/* Result count */}
      {!loading && sorted.length > 0 && (
        <Typography
          sx={{
            textAlign: 'center', mt: 2,
            fontSize: '0.68rem', color: c.textSecondary,
            letterSpacing: '0.06em',
          }}
        >
          {sorted.length} result{sorted.length !== 1 ? 's' : ''}
          {!hasMore ? ' · all loaded' : ''}
        </Typography>
      )}

      {/* Detail dialog */}
      <AppDetailDialog resource={detail} onClose={() => setDetail(null)} />
    </Box>
  );
}
