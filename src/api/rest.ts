async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchPrimaryName(address: string): Promise<string | null> {
  try {
    const res = await get<{ name: string | null }>(`/names/primary/${address}`);
    return res.name ?? null;
  } catch { return null; }
}

export interface NameInfo {
  name: string;
  owner: string;
  registered?: number;
  isForSale?: boolean;
  salePrice?: string;
}

export async function fetchNameInfo(name: string): Promise<NameInfo | null> {
  try {
    return await get<NameInfo>(`/names/${encodeURIComponent(name)}`);
  } catch { return null; }
}

export interface ResourceMeta {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  size?: number;
  created?: number;
  updated?: number;
}

export async function fetchResourceMeta(
  service: string, name: string, identifier: string
): Promise<ResourceMeta | null> {
  try {
    const res = await get<(ResourceMeta & { metadata?: ResourceMeta })[]>(
      `/arbitrary/resources/search?service=${encodeURIComponent(service)}&name=${encodeURIComponent(name)}&identifier=${encodeURIComponent(identifier)}&mode=LATEST&limit=1&includestatus=false&includemetadata=true`
    );
    if (!Array.isArray(res) || res.length === 0) return null;
    const r = res[0];
    const m = r.metadata;
    return {
      title:       r.title       ?? m?.title,
      description: r.description ?? m?.description,
      category:    r.category    ?? m?.category,
      tags:        r.tags        ?? m?.tags,
      size:        r.size        ?? m?.size,
      created:     r.created     ?? m?.created,
      updated:     r.updated     ?? m?.updated,
    };
  } catch { return null; }
}
