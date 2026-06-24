export function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatAge(ts: number | undefined | null): string {
  if (!ts) return '—';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  if (s < 86400 * 365) return `${Math.floor(s / (86400 * 30))}mo ago`;
  return `${Math.floor(s / (86400 * 365))}y ago`;
}

export function formatDate(ts: number | undefined | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const AVATAR_COLORS = [
  '#21824a', '#2a79f3', '#de8b23', '#7b44da',
  '#d53e3e', '#17a398', '#1298d8', '#d43f86',
  '#4D6478', '#d6a828', '#21824a', '#7b44da',
];

export function avatarColor(name: string): string {
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) + h + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function voteId(service: string, name: string, identifier: string): string {
  const key = `${service}|${name}|${identifier}`;
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  }
  return `brs-v1-${(h >>> 0).toString(16).padStart(8, '0')}`;
}

export function resourceKey(service: string, name: string, identifier: string): string {
  return `${service}|${name}|${identifier}`;
}

export function serviceLabel(service: string): string {
  if (service === 'APP') return 'App';
  if (service === 'WEBSITE') return 'Website';
  return service;
}
