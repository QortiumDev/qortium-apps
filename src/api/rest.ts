async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// Count how many accounts have published a vote resource for this voteId.
// Each vote = a METADATA resource with identifier=voteId, one per name.
export async function fetchVoteCount(id: string): Promise<number> {
  try {
    const res = await get<unknown[]>(
      `/arbitrary/resources/search?service=METADATA&identifier=${encodeURIComponent(id)}&mode=ALL&limit=1000&includestatus=false&includemetadata=false`
    );
    return Array.isArray(res) ? res.length : 0;
  } catch { return 0; }
}

export async function fetchPrimaryName(address: string): Promise<string | null> {
  try {
    const res = await get<{ name: string | null }>(`/names/primary/${address}`);
    return res.name ?? null;
  } catch { return null; }
}
