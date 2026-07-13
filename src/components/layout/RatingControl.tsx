import { useEffect, useState } from 'react';
import { Box, IconButton, Popover, Tooltip, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useColors } from '../../theme/ColorTokensContext';
import { tokens } from '../../theme/tokens';

function requestQdn(options: { action: string; [key: string]: unknown }): Promise<unknown> {
  if (typeof qdnRequest !== 'function') {
    return Promise.reject(new Error('qdnRequest unavailable'));
  }
  return qdnRequest(options);
}

type RatingSummary = {
  ratingCount: number;
  weightedAverageRating: number | null;
};

const STAR_VALUES = Array.from({ length: 10 }, (_, i) => i + 1);

function isBridgeMessage(e: MessageEvent<unknown>, action: string): boolean {
  return (
    (e.source === window.parent || e.source === window) &&
    typeof e.data === 'object' && e.data !== null &&
    (e.data as { action?: unknown }).action === action
  );
}

export function RatingControl({ qdnName, service = 'APP', identifier = 'default' }: { qdnName: string; service?: string; identifier?: string }) {
  const c = useColors();
  const [uiStyle, setUiStyle] = useState(document.documentElement.dataset.ui ?? 'classic');
  const isClassic = uiStyle === 'classic';
  const isFun = uiStyle === 'fun';
  const [summary, setSummary] = useState<RatingSummary>({ ratingCount: 0, weightedAverageRating: null });
  const [myRating, setMyRating] = useState<number | null>(null);
  const [canRate, setCanRate] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [hovered, setHovered] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function applySummary(s: { ratingCount?: number; weightedAverageRating?: number | null } | null | undefined) {
      if (!s) return;
      setSummary({
        ratingCount: typeof s.ratingCount === 'number' ? s.ratingCount : 0,
        weightedAverageRating: s.weightedAverageRating ?? null,
      });
    }

    function fetchRating() {
      requestQdn({ action: 'GET_RESOURCE_RATING', service, name: qdnName, identifier })
        .then((res) => {
          if (cancelled) return;
          const data = res as {
            summary?: { ratingCount?: number; weightedAverageRating?: number | null } | null;
            rating?: { rating?: number } | null;
          } | null;
          applySummary(data?.summary);
          const r = data?.rating?.rating;
          setMyRating(typeof r === 'number' && r >= 1 && r <= 10 ? r : null);
        })
        .catch(() => {
          // GET_RESOURCE_RATING requires a selected account; fall back to the
          // public summary endpoint so ratings always render when visible.
          if (cancelled) return;
          requestQdn({
            action: 'FETCH_NODE_API',
            path: `/resource-ratings/summary?service=${encodeURIComponent(service)}&name=${encodeURIComponent(qdnName)}&identifier=${encodeURIComponent(identifier)}`,
          })
            .then((res) => {
              if (cancelled) return;
              applySummary(res as { ratingCount?: number; weightedAverageRating?: number | null } | null);
            })
            .catch(() => {});
        });
    }

    fetchRating();

    requestQdn({ action: 'SHOW_ACTIONS' })
      .then((actions) => {
        if (!cancelled && Array.isArray(actions)) setCanRate(actions.includes('RATE_RESOURCE'));
      })
      .catch(() => {});

    function onMessage(e: MessageEvent<unknown>) {
      if (isBridgeMessage(e, 'SELECTED_ACCOUNT_CHANGED')) {
        fetchRating();
      } else if (isBridgeMessage(e, 'UI_STYLE_CHANGED')) {
        setUiStyle((e.data as { uiStyle?: unknown }).uiStyle as string ?? 'classic');
      }
    }
    window.addEventListener('message', onMessage);
    return () => {
      cancelled = true;
      window.removeEventListener('message', onMessage);
    };
  }, [qdnName, service, identifier]);

  async function submitRating(value: number) {
    if (busy) return;
    setBusy(true);
    const previous = myRating;
    setMyRating(value === 0 ? null : value);
    try {
      const account = await requestQdn({ action: 'UNLOCK_SELECTED_ACCOUNT' });
      if (!(account as { isUnlocked?: boolean } | null)?.isUnlocked) throw new Error('Account is locked.');
      await requestQdn({ action: 'RATE_RESOURCE', service, name: qdnName, identifier, rating: value });
    } catch {
      setMyRating(previous);
    }
    setBusy(false);
  }

  const average = summary.ratingCount > 0 ? summary.weightedAverageRating : null;
  const hasMyRating = myRating !== null;

  return (
    <>
      <Tooltip title="Rate this app" placement="bottom">
        <IconButton
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            border: isFun ? `2px solid ${c.outline}` : 'none',
            borderRadius: isFun
              ? c.radiusSm
              : `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
            boxShadow: isFun ? c.shadowControl : 'none',
            minHeight: isFun ? 44 : undefined,
            minWidth: isFun ? 44 : undefined,
            color: hasMyRating ? c.accent : c.textSecondary,
            gap: 0.5,
            px: average !== null ? 1 : undefined,
            bgcolor: isFun ? c.controlBg : 'transparent',
            '&:hover': {
              color: c.accent,
              bgcolor: isClassic || isFun ? c.controlHover : c.borderLight,
              boxShadow: isFun ? c.shadowPrimaryButtonHover : 'none',
              transform: isFun ? 'translate(-1px, -2px) rotate(-0.2deg)' : 'none',
            },
            '&:active': {
              boxShadow: isFun ? c.shadowControlActive : 'none',
              transform: isFun ? 'translate(2px, 2px) scale(0.98)' : 'none',
            },
            transition: c.transitionControl,
          }}
          aria-label="rate this app"
        >
          {hasMyRating ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
          {average !== null && (
            <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: tokens.typography.weightBold, lineHeight: 1 }}>
              {average.toFixed(1)}
            </Typography>
          )}
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: c.surface,
              border: `${isFun ? '3px' : isClassic ? tokens.shape.classicBorderWidth : tokens.shape.borderWidth} solid ${isClassic || isFun ? c.border : c.borderLight}`,
              borderRadius: isFun
                ? c.radiusMd
                : `${isClassic ? tokens.shape.radiusMd : tokens.shape.radius}px`,
              boxShadow: isFun ? c.shadowPop : undefined,
              p: 1.5,
              minWidth: 240,
              maxWidth: 'calc(100vw - 24px)',
            },
          },
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', color: c.textSecondary, mb: 1 }}>
          {average !== null
            ? `Community rating: ${average.toFixed(1)} / 10 (${summary.ratingCount} rating${summary.ratingCount === 1 ? '' : 's'})`
            : 'No ratings yet'}
        </Typography>

        {canRate ? (
          <>
            <Typography sx={{ fontSize: '0.7rem', color: c.textSecondary, mb: 0.5 }}>
              {hasMyRating ? `Your rating: ${myRating} / 10` : 'Rate this app:'}
            </Typography>
            <Box sx={{ display: 'flex' }} onMouseLeave={() => setHovered(0)}>
              {STAR_VALUES.map((value) => {
                const filled = hovered > 0 ? value <= hovered : hasMyRating && value <= (myRating ?? 0);
                return (
                  <IconButton
                    key={value}
                    size="small"
                    disabled={busy}
                    onClick={() => void submitRating(value)}
                    onMouseEnter={() => setHovered(value)}
                    sx={{ p: 0.25, color: filled ? c.accent : c.textSecondary }}
                    aria-label={`rate ${value} out of 10`}
                  >
                    {filled ? <StarIcon sx={{ fontSize: 18 }} /> : <StarBorderIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                );
              })}
            </Box>
            {hasMyRating && (
              <Typography
                component="button"
                type="button"
                disabled={busy}
                onClick={() => void submitRating(0)}
                sx={{
                  display: 'block',
                  fontSize: '0.7rem',
                  color: c.textSecondary,
                  mt: 1,
                  p: 0,
                  border: 'none',
                  background: 'none',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { color: c.accent },
                }}
              >
                Remove my rating
              </Typography>
            )}
          </>
        ) : (
          <Typography sx={{ fontSize: '0.7rem', color: c.textSecondary }}>
            Rating requires a local node on an updated Qortium Home.
          </Typography>
        )}
      </Popover>
    </>
  );
}
