import { useState, useEffect } from 'react';

const cache = new Map<string, boolean>();

export function useHasTransparentBg(src: string | null): boolean {
  const [transparent, setTransparent] = useState<boolean>(
    () => (src ? (cache.get(src) ?? false) : false)
  );

  useEffect(() => {
    if (!src) { setTransparent(false); return; }
    if (cache.has(src)) { setTransparent(cache.get(src)!); return; }

    let cancelled = false;

    const done = (val: boolean) => {
      cache.set(src, val);
      if (!cancelled) setTransparent(val);
    };

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      try {
        const w = Math.min(img.naturalWidth || 32, 64);
        const h = Math.min(img.naturalHeight || 32, 64);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { done(false); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const corners: [number, number][] = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
        const has = corners.some(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3] < 128);
        done(has);
      } catch {
        done(false);
      }
    };
    img.onerror = () => done(false);
    img.src = src;

    return () => { cancelled = true; };
  }, [src]);

  return transparent;
}
