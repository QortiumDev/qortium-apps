import type { QdnResource } from '../types';

export async function getUserAccount(): Promise<{ address: string; name: string | null }> {
  const res = await qdnRequest({ action: 'GET_SELECTED_ACCOUNT' }) as { address: string; name: string | null };
  return { address: res.address, name: res.name || null };
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
    }) as QdnResource[];
    return res ?? [];
  } catch { return []; }
}

export async function openNewTab(service: string, name: string, identifier: string | undefined): Promise<void> {
  const id = identifier || 'default';
  await qdnRequest({
    action: 'OPEN_NEW_TAB',
    address: `qdn://${service}/${name}/${id}`,
  });
}

export type VoteResult = 'voted' | 'already-voted' | 'error' | 'no-name';

export async function ensureAccountUnlocked(): Promise<boolean> {
  const result = await qdnRequest({ action: 'UNLOCK_SELECTED_ACCOUNT' }) as { isUnlocked?: boolean } | null;
  return result?.isUnlocked === true;
}

// Each upvote = a METADATA resource published under the user's name with identifier=voteId.
// Immediately queryable — no block confirmation needed, unlike CREATE_POLL.
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

export async function castVote(voteId: string): Promise<VoteResult> {
  let account: { address: string; name: string | null };
  try {
    account = await getUserAccount();
  } catch { return 'error'; }

  if (!account.name) return 'no-name';

  try {
    const existing = await qdnRequest({
      action: 'LIST_QDN_RESOURCES',
      service: 'METADATA',
      name: account.name,
      identifier: voteId,
      limit: 1,
    }) as unknown[];
    if (Array.isArray(existing) && existing.length > 0) return 'already-voted';
  } catch { /* not found = hasn't voted yet */ }

  try {
    if (!await ensureAccountUnlocked()) return 'error';
    await qdnRequest({
      action: 'PUBLISH_QDN_RESOURCE',
      service: 'METADATA',
      name: account.name,
      identifier: voteId,
      filename: 'vote.json',
      data64: btoa(JSON.stringify({ v: 1 })),
    });
    return 'voted';
  } catch (e: unknown) {
    const msg = String(e).toLowerCase();
    if (msg.includes('already') || msg.includes('duplicate')) return 'already-voted';
    return 'error';
  }
}
