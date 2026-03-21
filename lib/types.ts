export interface Subreddit {
  id: string;
  name: string;
  lastPosted: string | null;
}

export interface Model {
  id: string;
  name: string;
  color: string;
  titleTemplate: string;
  bodyTemplate: string;
  subreddits: Subreddit[];
}

export interface AppData {
  models: Model[];
}
