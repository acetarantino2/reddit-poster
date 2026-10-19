export interface Subreddit {
  id: string;
  name: string;
  /** Last time anyone posted here for this model (from the post log, or older data). */
  lastPosted: string | null;
  /** Sub only accepts verified accounts — the verified account is picked automatically. */
  verified?: boolean;
  notes?: string;
}

export type AccountRole = 'main' | 'persona' | 'verified';
export type AccountStatus = 'active' | 'shadowbanned' | 'suspended' | 'retired';

export interface RedditAccount {
  id: string;
  username: string; // without u/
  role: AccountRole;
  /** For persona accounts: who's in the photos, so the team knows which content to use. */
  persona?: string;
  status: AccountStatus;
  notes?: string;
}

export interface Model {
  id: string;
  name: string;
  color: string;
  titleTemplate: string;
  bodyTemplate: string;
  subreddits: Subreddit[];
  accounts: RedditAccount[];
}

export interface PostStats {
  score: number | null;
  comments: number | null;
  /** 'live' | 'removed' (by mods/admins) | 'deleted' (by the account) */
  state: 'live' | 'removed' | 'deleted' | 'unknown';
  checkedAt: string;
  /** Typed in by hand rather than fetched from Reddit */
  manual?: boolean;
}

export interface Post {
  id: string;
  modelId: string;
  subredditId: string;
  subreddit: string; // name, kept even if the sub is later removed
  accountId: string | null;
  postedAt: string;
  url?: string;
  stats?: PostStats;
}

export interface StandardSub {
  id: string;
  name: string;
  verified?: boolean;
}

export interface AppData {
  models: Model[];
  posts: Post[];
  standard: StandardSub[];
}

export const EMPTY_DATA: AppData = { models: [], posts: [], standard: [] };
