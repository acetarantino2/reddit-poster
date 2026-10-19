import { isAuthenticated } from '@/lib/auth';
import { postIdFromUrl, statsFromListing } from '@/lib/reddit';

export const dynamic = 'force-dynamic';

const UA = 'web:reddit-poster-team-console:1.0 (post status checker)';

/** Server-side fallback for checking a post's score / removed status. */
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  let url = '';
  try {
    url = String((await request.json())?.url ?? '');
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!/^https?:\/\/([a-z0-9-]+\.)?(reddit\.com|redd\.it)\//i.test(url)) {
    return Response.json({ error: 'not_reddit' }, { status: 400 });
  }

  try {
    let id = postIdFromUrl(url);
    if (!id) {
      // share links like reddit.com/r/x/s/abc123 redirect to the real post
      const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA } });
      id = postIdFromUrl(res.url);
    }
    if (!id) return Response.json({ error: 'not_a_post' }, { status: 422 });

    const res = await fetch(`https://www.reddit.com/comments/${id}.json?raw_json=1&limit=1`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return Response.json({ error: 'reddit_unavailable', status: res.status }, { status: 502 });
    const stats = statsFromListing(await res.json());
    if (!stats) return Response.json({ error: 'not_a_post' }, { status: 422 });
    return Response.json({ stats });
  } catch {
    return Response.json({ error: 'reddit_unavailable' }, { status: 502 });
  }
}
