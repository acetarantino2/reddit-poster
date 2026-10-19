import { AppData, Model } from './types';

/** A single change to the shared workspace. Sent to /api/ops and applied locally for instant UI. */
export type Op =
  | { type: 'upsertModel'; model: Omit<Model, 'subreddits'> }
  | { type: 'deleteModel'; modelId: string }
  | { type: 'addSubreddits'; modelId: string; subreddits: { id: string; name: string }[] }
  | { type: 'removeSubreddit'; modelId: string; subredditId: string }
  | { type: 'markPosted'; subredditId: string; at: string }
  | { type: 'import'; models: Model[] };

/** Optimistic local version of an op (the server is the source of truth and is re-fetched after). */
export function applyLocal(data: AppData, op: Op): AppData {
  switch (op.type) {
    case 'upsertModel': {
      const exists = data.models.some((m) => m.id === op.model.id);
      return {
        models: exists
          ? data.models.map((m) => (m.id === op.model.id ? { ...m, ...op.model } : m))
          : [...data.models, { ...op.model, subreddits: [] }],
      };
    }
    case 'deleteModel':
      return { models: data.models.filter((m) => m.id !== op.modelId) };
    case 'addSubreddits':
      return {
        models: data.models.map((m) =>
          m.id === op.modelId
            ? { ...m, subreddits: [...m.subreddits, ...op.subreddits.map((s) => ({ ...s, lastPosted: null }))] }
            : m
        ),
      };
    case 'removeSubreddit':
      return {
        models: data.models.map((m) =>
          m.id === op.modelId ? { ...m, subreddits: m.subreddits.filter((s) => s.id !== op.subredditId) } : m
        ),
      };
    case 'markPosted':
      return {
        models: data.models.map((m) => ({
          ...m,
          subreddits: m.subreddits.map((s) => (s.id === op.subredditId ? { ...s, lastPosted: op.at } : s)),
        })),
      };
    case 'import':
      return data; // server merges; we re-fetch
  }
}
