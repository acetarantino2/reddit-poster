import 'server-only';
import { Redis } from '@upstash/redis';
import { AppData, Model, Post, PostStats, RedditAccount, StandardSub } from './types';
import type { Op } from './ops';

/**
 * Shared storage for the whole team.
 *
 * Layout (Redis hashes, so simultaneous edits by different people don't overwrite each other):
 *   rp:models              modelId -> JSON { id, name, color, titleTemplate, bodyTemplate, createdAt }
 *   rp:subs:{modelId}      subId   -> JSON { name, addedAt, verified?, notes? }
 *   rp:accounts:{modelId}  accId   -> JSON RedditAccount + addedAt
 *   rp:posts               postId  -> JSON Post
 *   rp:standard            id      -> JSON { name, verified?, addedAt }
 *   rp:posted              subId   -> ISO time (older "last posted" stamps from before the post log)
 */

const MODELS = 'rp:models';
const POSTED = 'rp:posted';
const POSTS = 'rp:posts';
const STANDARD = 'rp:standard';
const subsKey = (modelId: string) => `rp:subs:${modelId}`;
const accountsKey = (modelId: string) => `rp:accounts:${modelId}`;

type StoredModel = Pick<Model, 'id' | 'name' | 'color' | 'titleTemplate' | 'bodyTemplate'> & { createdAt?: string };
type StoredSub = { name: string; addedAt: string; verified?: boolean; notes?: string };
type StoredAccount = RedditAccount & { addedAt?: string };
type StoredStandard = { name: string; addedAt: string; verified?: boolean };

/** Minimal hash interface so an in-memory store can stand in for local dev. */
interface HashStore {
  hgetall(key: string): Promise<Record<string, unknown> | null>;
  hget(key: string, field: string): Promise<unknown>;
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
  async hget(key: string, field: string) {
    return this.data.get(key)?.get(field) ?? null;
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
const entries = <T>(raw: Record<string, unknown> | null) =>
  Object.entries(raw ?? {}).map(([id, v]) => ({ id, ...parse<T>(v) }));
const byAdded = (a: { addedAt?: string }, b: { addedAt?: string }) => (a.addedAt ?? '').localeCompare(b.addedAt ?? '');
const stamp = (i = 0) => new Date(Date.now() + i).toISOString();

export async function loadAll(): Promise<AppData> {
  const db = getStore();
  const [modelsRaw, postedRaw, postsRaw, standardRaw] = await Promise.all([
    db.hgetall(MODELS),
    db.hgetall(POSTED),
    db.hgetall(POSTS),
    db.hgetall(STANDARD),
  ]);

  const posts = Object.values(postsRaw ?? {})
    .map((v) => parse<Post>(v))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));

  // last posted per subreddit = newest of the post log and any older stamp
  const latest: Record<string, string> = {};
  for (const [id, v] of Object.entries(postedRaw ?? {})) latest[id] = String(v);
  for (const p of posts) if (!latest[p.subredditId] || p.postedAt > latest[p.subredditId]) latest[p.subredditId] = p.postedAt;

  const stored = Object.values(modelsRaw ?? {})
    .map((v) => parse<StoredModel>(v))
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));

  const models: Model[] = await Promise.all(
    stored.map(async (m) => {
      const [subsRaw, accountsRaw] = await Promise.all([db.hgetall(subsKey(m.id)), db.hgetall(accountsKey(m.id))]);
      const subreddits = entries<StoredSub>(subsRaw)
        .sort(byAdded)
        .map((s) => ({
          id: s.id,
          name: s.name,
          lastPosted: latest[s.id] ?? null,
          ...(s.verified ? { verified: true } : {}),
          ...(s.notes ? { notes: s.notes } : {}),
        }));
      const accounts = Object.values(accountsRaw ?? {})
        .map((v) => parse<StoredAccount>(v))
        .sort(byAdded)
        .map((a) => {
          const copy: RedditAccount & { addedAt?: string } = { ...a };
          delete copy.addedAt;
          return copy as RedditAccount;
        });
      return {
        id: m.id,
        name: m.name,
        color: m.color,
        titleTemplate: m.titleTemplate,
        bodyTemplate: m.bodyTemplate,
        subreddits,
        accounts,
      };
    })
  );

  const standard: StandardSub[] = entries<StoredStandard>(standardRaw)
    .sort(byAdded)
    .map((s) => ({ id: s.id, name: s.name, ...(s.verified ? { verified: true } : {}) }));

  return { models, posts, standard };
}

// ---- Validation -----------------------------------------------------------

export type { Op };

const isStr = (v: unknown, max = 2000): v is string => typeof v === 'string' && v.length <= max;
const optStr = (v: unknown, max = 2000) => v === undefined || isStr(v, max);
const optBool = (v: unknown) => v === undefined || typeof v === 'boolean';
const isId = (v: unknown) => isStr(v, 64) && (v as string).length > 0;
const isDate = (v: unknown) => isStr(v, 40) && !isNaN(Date.parse(v as string));
const isSubName = (v: unknown) => isStr(v, 50) && /^[A-Za-z0-9_]+$/.test(v as string);
const ROLES = ['main', 'persona', 'verified'];
const STATUSES = ['active', 'shadowbanned', 'suspended', 'retired'];
const STATES = ['live', 'removed', 'deleted', 'unknown'];

function validAccount(a: unknown): a is RedditAccount {
  const o = a as Record<string, unknown>;
  return !!o && isId(o.id) && isStr(o.username, 40) && ROLES.includes(o.role as string) &&
    STATUSES.includes(o.status as string) && optStr(o.persona, 100) && optStr(o.notes, 2000);
}
function validStats(s: unknown): s is PostStats {
  const o = s as Record<string, unknown>;
  const num = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v));
  return !!o && num(o.score) && num(o.comments) && STATES.includes(o.state as string) && isDate(o.checkedAt) && optBool(o.manual);
}
function validUrl(u: unknown) {
  return u === undefined || u === '' || (isStr(u, 500) && /^https?:\/\//i.test(u as string));
}
function validPost(p: unknown): p is Post {
  const o = p as Record<string, unknown>;
  return !!o && isId(o.id) && isId(o.modelId) && isId(o.subredditId) && isSubName(o.subreddit) &&
    (o.accountId === null || isId(o.accountId)) && isDate(o.postedAt) && validUrl(o.url) &&
    (o.stats === undefined || validStats(o.stats));
}
const validNewSubs = (list: unknown, max = 1000) =>
  Array.isArray(list) && list.length <= max &&
  list.every((s) => s && isId(s.id) && isSubName(s.name) && optBool(s.verified));

export function validateOp(op: unknown): op is Op {
  if (!op || typeof op !== 'object') return false;
  const o = op as Record<string, unknown>;
  switch (o.type) {
    case 'upsertModel': {
      const m = o.model as Record<string, unknown>;
      return !!m && isId(m.id) && isStr(m.name, 200) && isStr(m.color, 32) && isStr(m.titleTemplate) && isStr(m.bodyTemplate, 10000);
    }
    case 'deleteModel':
      return isId(o.modelId);
    case 'addSubreddits':
      return isId(o.modelId) && validNewSubs(o.subreddits);
    case 'updateSubreddit': {
      const p = o.patch as Record<string, unknown>;
      return isId(o.modelId) && isId(o.subredditId) && !!p && optBool(p.verified) && optStr(p.notes, 2000);
    }
    case 'removeSubreddit':
      return isId(o.modelId) && isId(o.subredditId);
    case 'upsertAccount':
      return isId(o.modelId) && validAccount(o.account);
    case 'deleteAccount':
      return isId(o.modelId) && isId(o.accountId);
    case 'logPost':
      return validPost(o.post);
    case 'updatePost': {
      const p = o.patch as Record<string, unknown>;
      return isId(o.postId) && !!p && validUrl(p.url) &&
        (p.accountId === undefined || p.accountId === null || isId(p.accountId)) &&
        (p.stats === undefined || validStats(p.stats));
    }
    case 'deletePost':
      return isId(o.postId);
    case 'addStandard':
      return validNewSubs(o.subreddits);
    case 'updateStandard':
      return isId(o.id) && typeof o.verified === 'boolean';
    case 'removeStandard':
      return isId(o.id);
    case 'import':
      return Array.isArray(o.models) && o.models.length <= 500;
    default:
      return false;
  }
}

// ---- Operations -----------------------------------------------------------

export async function applyOp(op: Op): Promise<void> {
  const db = getStore();
  const now = new Date().toISOString();

  switch (op.type) {
    case 'upsertModel': {
      const prevRaw = await db.hget(MODELS, op.model.id);
      const prev = prevRaw ? parse<StoredModel>(prevRaw) : null;
      const { id, name, color, titleTemplate, bodyTemplate } = op.model;
      const value: StoredModel = { id, name, color, titleTemplate, bodyTemplate, createdAt: prev?.createdAt ?? now };
      await db.hset(MODELS, { [id]: JSON.stringify(value) });
      return;
    }
    case 'deleteModel': {
      const [subs, posts] = await Promise.all([db.hgetall(subsKey(op.modelId)), db.hgetall(POSTS)]);
      const subIds = Object.keys(subs ?? {});
      if (subIds.length) await db.hdel(POSTED, ...subIds);
      const postIds = Object.values(posts ?? {})
        .map((v) => parse<Post>(v))
        .filter((p) => p.modelId === op.modelId)
        .map((p) => p.id);
      if (postIds.length) await db.hdel(POSTS, ...postIds);
      await Promise.all([db.del(subsKey(op.modelId)), db.del(accountsKey(op.modelId))]);
      await db.hdel(MODELS, op.modelId);
      return;
    }
    case 'addSubreddits': {
      if (!op.subreddits.length) return;
      const values: Record<string, string> = {};
      op.subreddits.forEach((s, i) => {
        const v: StoredSub = { name: s.name, addedAt: stamp(i), ...(s.verified ? { verified: true } : {}) };
        values[s.id] = JSON.stringify(v);
      });
      await db.hset(subsKey(op.modelId), values);
      return;
    }
    case 'updateSubreddit': {
      const raw = await db.hget(subsKey(op.modelId), op.subredditId);
      if (!raw) return;
      const next: StoredSub = { ...parse<StoredSub>(raw), ...op.patch };
      if (!next.verified) delete next.verified;
      if (!next.notes) delete next.notes;
      await db.hset(subsKey(op.modelId), { [op.subredditId]: JSON.stringify(next) });
      return;
    }
    case 'removeSubreddit': {
      await db.hdel(subsKey(op.modelId), op.subredditId);
      await db.hdel(POSTED, op.subredditId);
      return;
    }
    case 'upsertAccount': {
      const raw = await db.hget(accountsKey(op.modelId), op.account.id);
      const addedAt = raw ? parse<StoredAccount>(raw).addedAt ?? now : now;
      const { id, username, role, status, persona, notes } = op.account;
      const v: StoredAccount = {
        id, username: username.replace(/^\/?u\//i, '').trim(), role, status, addedAt,
        ...(persona ? { persona } : {}), ...(notes ? { notes } : {}),
      };
      await db.hset(accountsKey(op.modelId), { [id]: JSON.stringify(v) });
      return;
    }
    case 'deleteAccount': {
      await db.hdel(accountsKey(op.modelId), op.accountId);
      return;
    }
    case 'logPost': {
      const { id, modelId, subredditId, subreddit, accountId, postedAt, url, stats } = op.post;
      const p: Post = { id, modelId, subredditId, subreddit, accountId, postedAt, ...(url ? { url } : {}), ...(stats ? { stats } : {}) };
      await db.hset(POSTS, { [id]: JSON.stringify(p) });
      return;
    }
    case 'updatePost': {
      const raw = await db.hget(POSTS, op.postId);
      if (!raw) return;
      const next: Post = { ...parse<Post>(raw) };
      if (op.patch.url !== undefined) {
        if (op.patch.url) next.url = op.patch.url;
        else delete next.url;
      }
      if (op.patch.accountId !== undefined) next.accountId = op.patch.accountId;
      if (op.patch.stats !== undefined) next.stats = op.patch.stats;
      await db.hset(POSTS, { [op.postId]: JSON.stringify(next) });
      return;
    }
    case 'deletePost': {
      await db.hdel(POSTS, op.postId);
      return;
    }
    case 'addStandard': {
      const current = entries<StoredStandard>(await db.hgetall(STANDARD));
      const have = new Set(current.map((s) => s.name.toLowerCase()));
      const values: Record<string, string> = {};
      op.subreddits.forEach((s, i) => {
        if (have.has(s.name.toLowerCase())) return;
        have.add(s.name.toLowerCase());
        values[s.id] = JSON.stringify({ name: s.name, addedAt: stamp(i), ...(s.verified ? { verified: true } : {}) });
      });
      if (Object.keys(values).length) await db.hset(STANDARD, values);
      return;
    }
    case 'updateStandard': {
      const raw = await db.hget(STANDARD, op.id);
      if (!raw) return;
      const next: StoredStandard = { ...parse<StoredStandard>(raw) };
      if (op.verified) next.verified = true;
      else delete next.verified;
      await db.hset(STANDARD, { [op.id]: JSON.stringify(next) });
      return;
    }
    case 'removeStandard': {
      await db.hdel(STANDARD, op.id);
      return;
    }
    case 'import': {
      // Merge a browser's old saved data into the shared store.
      // Existing models (same id) keep their settings; subreddits are merged by name;
      // the most recent "last posted" time wins.
      const current = await loadAll();
      const byId = new Map(current.models.map((m) => [m.id, m]));
      const posted: Record<string, string> = {};

      for (const raw of op.models) {
        if (!raw || !isId(raw.id) || !isStr(raw.name, 200)) continue;
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
          if (!s || !isId(s.id) || !isSubName(s.name)) return;
          const match = existingByName.get(s.name.toLowerCase());
          const targetId = match ? match.id : s.id;
          if (!match) {
            newSubs[s.id] = JSON.stringify({ name: s.name, addedAt: stamp(i) } satisfies StoredSub);
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
