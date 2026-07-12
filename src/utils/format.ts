export function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

export function resourceKey(service: string, name: string, identifier: string): string {
  return `${service}|${name}|${identifier}`;
}

export function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export function formatCategory(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

export function serviceLabel(service: string): string {
  if (service === 'APP') return 'App';
  if (service === 'WEBSITE') return 'Website';
  return service;
}
