import { AppData, Model, Post, RedditAccount, StandardSub, Subreddit } from './types';

export type ModelSettings = Pick<Model, 'id' | 'name' | 'color' | 'titleTemplate' | 'bodyTemplate'>;
export type SubPatch = Partial<Pick<Subreddit, 'verified' | 'notes'>>;
export type PostPatch = Partial<Pick<Post, 'url' | 'accountId' | 'stats'>>;
export type NewSub = { id: string; name: string; verified?: boolean };

/** A single change to the shared workspace. Sent to /api/ops and applied locally for instant UI. */
export type Op =
  | { type: 'upsertModel'; model: ModelSettings }
  | { type: 'deleteModel'; modelId: string }
  | { type: 'addSubreddits'; modelId: string; subreddits: NewSub[] }
  | { type: 'updateSubreddit'; modelId: string; subredditId: string; patch: SubPatch }
  | { type: 'removeSubreddit'; modelId: string; subredditId: string }
  | { type: 'upsertAccount'; modelId: string; account: RedditAccount }
  | { type: 'deleteAccount'; modelId: string; accountId: string }
  | { type: 'logPost'; post: Post }
  | { type: 'updatePost'; postId: string; patch: PostPatch }
  | { type: 'deletePost'; postId: string }
  | { type: 'addStandard'; subreddits: StandardSub[] }
  | { type: 'updateStandard'; id: string; verified: boolean }
  | { type: 'removeStandard'; id: string }
  | { type: 'import'; models: Model[] };

const mapModel = (data: AppData, id: string, fn: (m: Model) => Model): AppData => ({
  ...data,
  models: data.models.map((m) => (m.id === id ? fn(m) : m)),
});

/** Optimistic local version of an op (the server stays the source of truth and is re-fetched). */
export function applyLocal(data: AppData, op: Op): AppData {
  switch (op.type) {
    case 'upsertModel': {
      const exists = data.models.some((m) => m.id === op.model.id);
      return exists
        ? mapModel(data, op.model.id, (m) => ({ ...m, ...op.model }))
        : { ...data, models: [...data.models, { ...op.model, subreddits: [], accounts: [] }] };
    }
    case 'deleteModel':
      return {
        ...data,
        models: data.models.filter((m) => m.id !== op.modelId),
        posts: data.posts.filter((p) => p.modelId !== op.modelId),
      };
    case 'addSubreddits':
      return mapModel(data, op.modelId, (m) => ({
        ...m,
        subreddits: [...m.subreddits, ...op.subreddits.map((s) => ({ ...s, lastPosted: null }))],
      }));
    case 'updateSubreddit':
      return mapModel(data, op.modelId, (m) => ({
        ...m,
        subreddits: m.subreddits.map((s) => (s.id === op.subredditId ? { ...s, ...op.patch } : s)),
      }));
    case 'removeSubreddit':
      return mapModel(data, op.modelId, (m) => ({ ...m, subreddits: m.subreddits.filter((s) => s.id !== op.subredditId) }));
    case 'upsertAccount':
      return mapModel(data, op.modelId, (m) => ({
        ...m,
        accounts: m.accounts.some((a) => a.id === op.account.id)
          ? m.accounts.map((a) => (a.id === op.account.id ? op.account : a))
          : [...m.accounts, op.account],
      }));
    case 'deleteAccount':
      return mapModel(data, op.modelId, (m) => ({ ...m, accounts: m.accounts.filter((a) => a.id !== op.accountId) }));
    case 'logPost': {
      const posts = [op.post, ...data.posts];
      return {
        ...data,
        posts,
        models: data.models.map((m) =>
          m.id !== op.post.modelId
            ? m
            : {
                ...m,
                subreddits: m.subreddits.map((s) =>
                  s.id === op.post.subredditId ? { ...s, lastPosted: op.post.postedAt } : s
                ),
              }
        ),
      };
    }
    case 'updatePost':
      return { ...data, posts: data.posts.map((p) => (p.id === op.postId ? { ...p, ...op.patch } : p)) };
    case 'deletePost':
      return { ...data, posts: data.posts.filter((p) => p.id !== op.postId) }; // lastPosted fixed on re-fetch
    case 'addStandard': {
      const have = new Set(data.standard.map((s) => s.name.toLowerCase()));
      return { ...data, standard: [...data.standard, ...op.subreddits.filter((s) => !have.has(s.name.toLowerCase()))] };
    }
    case 'updateStandard':
      return { ...data, standard: data.standard.map((s) => (s.id === op.id ? { ...s, verified: op.verified } : s)) };
    case 'removeStandard':
      return { ...data, standard: data.standard.filter((s) => s.id !== op.id) };
    case 'import':
      return data; // server merges; we re-fetch
  }
}

/** Clean up pasted subreddit lists: one per line or comma separated, with or without r/ or a URL. */
export function parseSubredditList(input: string): string[] {
  const names = input
    .split(/[\n,]+/)
    .map((l) =>
      l
        .trim()
        .replace(/^https?:\/\/(www\.|old\.)?reddit\.com/i, '')
        .replace(/^\/?r\//i, '')
        .replace(/\/.*$/, '')
        .trim()
    )
    .filter((l) => /^[A-Za-z0-9_]{2,50}$/.test(l));
  const seen = new Set<string>();
  return names.filter((n) => (seen.has(n.toLowerCase()) ? false : (seen.add(n.toLowerCase()), true)));
}
