import type { PostStats } from './types';

/** Pull the post id out of any normal Reddit post link. Returns null for share links (/s/...) etc. */
export function postIdFromUrl(url: string): string | null {
  const m =
    url.match(/reddit\.com\/(?:r\/[^/]+\/)?comments\/([a-z0-9]{4,12})/i) ||
    url.match(/redd\.it\/([a-z0-9]{4,12})/i);
  return m ? m[1].toLowerCase() : null;
}

export const submitUrl = (sub: string) => `https://www.reddit.com/r/${sub}/submit`;
export const userUrl = (username: string) => `https://www.reddit.com/user/${username}`;

/** Turn Reddit's public post JSON into our stats. */
export function statsFromListing(json: unknown): PostStats | null {
  const listing = Array.isArray(json) ? json[0] : json;
  const d = (listing as { data?: { children?: { data?: Record<string, unknown> }[] } })?.data?.children?.[0]?.data;
  if (!d) return null;
  const cat = d.removed_by_category as string | null | undefined;
  const author = d.author as string | undefined;
  let state: PostStats['state'] = 'live';
  if (cat === 'deleted' || cat === 'author' || author === '[deleted]') state = 'deleted';
  else if (cat || d.selftext === '[removed]' || d.removed === true) state = 'removed';
  return {
    score: typeof d.score === 'number' ? d.score : null,
    comments: typeof d.num_comments === 'number' ? d.num_comments : null,
    state,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Check a post. Tries straight from this browser first (works on most networks), then via our
 * server, which can also follow share links. Returns null if Reddit couldn't be reached.
 */
export async function checkPost(url: string): Promise<PostStats | null> {
  const id = postIdFromUrl(url);
  if (id) {
    try {
      const res = await fetch(`https://www.reddit.com/comments/${id}.json?raw_json=1&limit=1`, {
        credentials: 'omit',
        cache: 'no-store',
      });
      if (res.ok) {
        const stats = statsFromListing(await res.json());
        if (stats) return stats;
      }
    } catch {
      /* blocked or offline — fall through to the server */
    }
  }
  try {
    const res = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { stats?: PostStats };
    return body.stats ?? null;
  } catch {
    return null;
  }
}
