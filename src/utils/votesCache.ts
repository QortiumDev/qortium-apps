const cache = new Map<string, number>();

export function getCachedVotes(key: string): number | undefined {
  return cache.get(key);
}

export function setCachedVotes(key: string, count: number): void {
  cache.set(key, count);
}
