import { useState, useEffect } from 'react';

const resolved = new Map<string, string | null>();

export function useFaviconUrl(service: string, name: string, identifier: string): string | null {
  const id = identifier || 'default';
  const key = `${service}\x00${name}\x00${id}`;
  const [url, setUrl] = useState<string | null>(() => resolved.get(key) ?? null);

  useEffect(() => {
    if (!service || !name) return;

    if (resolved.has(key)) {
      setUrl(resolved.get(key) ?? null);
      return;
    }

    let cancelled = false;
    qdnRequest({
      action: 'GET_QDN_RESOURCE_URL',
      service,
      name,
      identifier: id,
      path: 'favicon.ico',
    })
      .then((result) => {
        if (cancelled) return;
        const resolvedUrl = typeof result === 'string' && result ? result : null;
        resolved.set(key, resolvedUrl);
        setUrl(resolvedUrl);
      })
      .catch(() => {
        if (cancelled) return;
        resolved.set(key, null);
        setUrl(null);
      });

    return () => { cancelled = true; };
  }, [key, service, name, id]);

  return url;
}
