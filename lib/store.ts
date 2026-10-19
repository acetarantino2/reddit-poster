import 'server-only';
import { Redis } from '@upstash/redis';
import { AppData, Model } from './types';
import type { Op } from './ops';

/**
 * Shared storage for the whole team.
 *
 * Layout (Redis hashes, so concurrent edits by different people don't overwrite each other):
 *   rp:models          modelId  -> JSON { id, name, color, titleTemplate, bodyTemplate, createdAt }
 *   rp:subs:{modelId}  subId    -> JSON { name, addedAt }
 *   rp:posted          subId    -> ISO timestamp of last post
 */

const MODELS = 'rp:models';
const POSTED = 'rp:posted';
const subsKey = (modelId: string) => `rp:subs:${modelId}`;

type StoredModel = Omit<Model, 'subreddits'> & { createdAt?: string };
type StoredSub = { name: string; addedAt: string };

/** Minimal hash interface so we can swap in an in-memory store for local dev. */
interface HashStore {
  hgetall(key: string): Promise<Record<string, unknown> | null>;
  hset(key: string, values: Record<string, string>): Promise<unknown>;
  hdel(key: string, ...fields: string[]): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

class MemoryStore implements HashStore {
  private data = new Map<string, Map<string, string>>();
  async hgetall(key: string) {
    const h = this.data.get(key);
    return h && h.size ? Object.fromEntries(h) : null;
  }
  async hset(key: string, values: Record<string, string>) {
    const h = this.data.get(key) ?? new Map<string, string>();
    for (const [k, v] of Object.entries(values)) h.set(k, v);
    this.data.set(key, h);
  }
  async hdel(key: string, ...fields: string[]) {
    const h = this.data.get(key);
    fields.forEach((f) => h?.delete(f));
  }
  async del(key: string) {
    this.data.delete(key);
  }
}

const globalForStore = globalThis as unknown as { __rpStore?: HashStore };

export function storeStatus(): 'ok' | 'missing' {
  if (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) return 'ok';
  return process.env.NODE_ENV === 'production' ? 'missing' : 'ok';
}

function getStore(): HashStore {
  if (globalForStore.__rpStore) return globalForStore.__rpStore;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  let store: HashStore;
  if (url && token) {
    store = new Redis({ url, token }) as unknown as HashStore;
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn('[reddit-poster] No database configured — using in-memory store (dev only).');
    store = new MemoryStore();
  } else {
    throw new Error('Database not configured');
  }
  globalForStore.__rpStore = store;
  return store;
}

// Upstash auto-parses JSON values; the memory store returns strings. Handle both.
function parse<T>(v: unknown): T {
  return (typeof v === 'string' ? JSON.parse(v) : v) as T;
}

export async function loadAll(): Promise<AppData> {
  const db = getStore();
  const [modelsRaw, postedRaw] = await Promise.all([db.hgetall(MODELS), db.hgetall(POSTED)]);
  const posted = (postedRaw ?? {}) as Record<string, string>;
  const stored = Object.values(modelsRaw ?? {})
    .map((v) => parse<StoredModel>(v))
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));

  const models: Model[] = await Promise.all(
    stored.map(async (m) => {
      const subsRaw = (await db.hgetall(subsKey(m.id))) ?? {};
      const subreddits = Object.entries(subsRaw)
        .map(([id, v]) => ({ id, ...parse<StoredSub>(v) }))
        .sort((a, b) => a.addedAt.localeCompare(b.addedAt))
        .map((s) => ({ id: s.id, name: s.name, lastPosted: posted[s.id] ? String(posted[s.id]) : null }));
      return {
        id: m.id,
        name: m.name,
        color: m.color,
        titleTemplate: m.titleTemplate,
        bodyTemplate: m.bodyTemplate,
        subreddits,
      };
    })
  );

  return { models };
}

// ---- Operations -----------------------------------------------------------

export type { Op };

const isStr = (v: unknown, max = 2000): v is string => typeof v === 'string' && v.length <= max;

export function validateOp(op: unknown): op is Op {
  if (!op || typeof op !== 'object') return false;
  const o = op as Record<string, unknown>;
  switch (o.type) {
    case 'upsertModel': {
      const m = o.model as Record<string, unknown>;
      return !!m && isStr(m.id, 64) && isStr(m.name, 200) && isStr(m.color, 32) && isStr(m.titleTemplate) && isStr(m.bodyTemplate, 10000);
    }
    case 'deleteModel':
      return isStr(o.modelId, 64);
    case 'addSubreddits':
      return isStr(o.modelId, 64) && Array.isArray(o.subreddits) && o.subreddits.length <= 1000 &&
        o.subreddits.every((s) => s && isStr(s.id, 64) && isStr(s.name, 100));
    case 'removeSubreddit':
      return isStr(o.modelId, 64) && isStr(o.subredditId, 64);
    case 'markPosted':
      return isStr(o.subredditId, 64) && isStr(o.at, 40) && !isNaN(Date.parse(o.at as string));
    case 'import':
      return Array.isArray(o.models) && o.models.length <= 500;
    default:
      return false;
  }
}

export async function applyOp(op: Op): Promise<void> {
  const db = getStore();
  const now = new Date().toISOString();

  switch (op.type) {
    case 'upsertModel': {
      const existing = await db.hgetall(MODELS);
      const prev = existing?.[op.model.id] ? parse<StoredModel>(existing[op.model.id]) : null;
      const { id, name, color, titleTemplate, bodyTemplate } = op.model;
      const value: StoredModel = { id, name, color, titleTemplate, bodyTemplate, createdAt: prev?.createdAt ?? now };
      await db.hset(MODELS, { [id]: JSON.stringify(value) });
      return;
    }
    case 'deleteModel': {
      const subs = await db.hgetall(subsKey(op.modelId));
      const subIds = Object.keys(subs ?? {});
      if (subIds.length) await db.hdel(POSTED, ...subIds);
      await db.del(subsKey(op.modelId));
      await db.hdel(MODELS, op.modelId);
      return;
    }
    case 'addSubreddits': {
      if (!op.subreddits.length) return;
      const values: Record<string, string> = {};
      op.subreddits.forEach((s, i) => {
        // keep insertion order stable within a batch
        const addedAt = new Date(Date.now() + i).toISOString();
        values[s.id] = JSON.stringify({ name: s.name, addedAt } satisfies StoredSub);
      });
      await db.hset(subsKey(op.modelId), values);
      return;
    }
    case 'removeSubreddit': {
      await db.hdel(subsKey(op.modelId), op.subredditId);
      await db.hdel(POSTED, op.subredditId);
      return;
    }
    case 'markPosted': {
      await db.hset(POSTED, { [op.subredditId]: op.at });
      return;
    }
    case 'import': {
      // Merge a browser's old localStorage data into the shared store.
      // Existing models (same id) keep their settings; subreddits are merged by name;
      // the most recent "last posted" time wins.
      const current = await loadAll();
      const byId = new Map(current.models.map((m) => [m.id, m]));
      const posted: Record<string, string> = {};

      for (const raw of op.models) {
        if (!raw || !isStr(raw.id, 64) || !isStr(raw.name, 200)) continue;
        const existing = byId.get(raw.id);
        if (!existing) {
          const value: StoredModel = {
            id: raw.id,
            name: raw.name,
            color: isStr(raw.color, 32) ? raw.color : '#3b82f6',
            titleTemplate: isStr(raw.titleTemplate) ? raw.titleTemplate : '',
            bodyTemplate: isStr(raw.bodyTemplate, 10000) ? raw.bodyTemplate : '',
            createdAt: now,
          };
          await db.hset(MODELS, { [raw.id]: JSON.stringify(value) });
        }
        const existingByName = new Map((existing?.subreddits ?? []).map((s) => [s.name.toLowerCase(), s]));
        const newSubs: Record<string, string> = {};
        (Array.isArray(raw.subreddits) ? raw.subreddits : []).forEach((s, i) => {
          if (!s || !isStr(s.id, 64) || !isStr(s.name, 100)) return;
          const match = existingByName.get(s.name.toLowerCase());
          const targetId = match ? match.id : s.id;
          if (!match) {
            newSubs[s.id] = JSON.stringify({ name: s.name, addedAt: new Date(Date.now() + i).toISOString() });
            existingByName.set(s.name.toLowerCase(), { id: s.id, name: s.name, lastPosted: null });
          }
          if (s.lastPosted && !isNaN(Date.parse(s.lastPosted))) {
            const prev = match?.lastPosted ?? posted[targetId];
            if (!prev || Date.parse(s.lastPosted) > Date.parse(prev)) posted[targetId] = s.lastPosted;
          }
        });
        if (Object.keys(newSubs).length) await db.hset(subsKey(raw.id), newSubs);
      }
      if (Object.keys(posted).length) await db.hset(POSTED, posted);
      return;
    }
  }
}
