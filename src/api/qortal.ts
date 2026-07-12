import type { QdnResource } from '../types';

export async function getUserAccount(): Promise<{ address: string; name: string | null }> {
  const res = await qdnRequest({ action: 'GET_SELECTED_ACCOUNT' }) as { address: string; name: string | null };
  return { address: res.address, name: res.name || null };
}

// The node returns metadata nested under a `metadata` field; flatten it so
// callers can access title/description/tags/category directly on the resource.
function normalizeResource(raw: Record<string, unknown>): QdnResource {
  const m = raw.metadata as Record<string, unknown> | undefined;
  return {
    service:     raw.service     as string,
    name:        raw.name        as string,
    identifier:  raw.identifier  as string,
    size:        (raw.size        ?? m?.size)        as number   | undefined,
    status:      raw.status                          as string   | undefined,
    title:       (raw.title       ?? m?.title)       as string   | undefined,
    description: (raw.description ?? m?.description) as string   | undefined,
    category:    (raw.category    ?? m?.category)    as string   | undefined,
    tags:        (raw.tags        ?? m?.tags)        as string[] | undefined,
    created:     (raw.created     ?? m?.created)     as number   | undefined,
    updated:     (raw.updated     ?? m?.updated)     as number   | undefined,
  };
}

export async function searchResources(opts: {
  service?: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<QdnResource[]> {
  try {
    const res = await qdnRequest({
      action: 'SEARCH_QDN_RESOURCES',
      mode: 'LATEST',
      includeMetadata: true,
      limit: opts.limit ?? 50,
      offset: opts.offset ?? 0,
      reverse: true,
      ...(opts.service ? { service: opts.service } : {}),
      ...(opts.query   ? { query: opts.query }     : {}),
    }) as Record<string, unknown>[];
    return Array.isArray(res) ? res.map(normalizeResource) : [];
  } catch { return []; }
}

export async function openNewTab(service: string, name: string, identifier: string | undefined): Promise<void> {
  const id = identifier || 'default';
  await qdnRequest({
    action: 'OPEN_NEW_TAB',
    address: `qdn://${service}/${name}/${id}`,
  });
}

export async function getFollowedNames(): Promise<string[]> {
  try {
    const res = await qdnRequest({ action: 'GET_LIST', listName: 'followedNames' }) as string[];
    return Array.isArray(res) ? res : [];
  } catch { return []; }
}

export async function followName(name: string): Promise<void> {
  await qdnRequest({ action: 'ADD_TO_LIST', listName: 'followedNames', items: [name] });
}

export async function unfollowName(name: string): Promise<void> {
  await qdnRequest({ action: 'REMOVE_FROM_LIST', listName: 'followedNames', items: [name] });
}
