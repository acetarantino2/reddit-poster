'use client';

import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { Model, Post, StandardSub, Subreddit } from '@/lib/types';
import { Op, parseSubredditList } from '@/lib/ops';
import { Button, Dialog, Empty, Input, Label, Tag, Textarea, ago, cx, isReady } from './ui';
import { ResultTag } from './PostsTab';

type Filter = 'all' | 'ready' | 'recent' | 'verified';

interface Props {
  model: Model;
  posts: Post[];
  standard: StandardSub[];
  dispatch: (op: Op) => void;
  onPost: (s: Subreddit) => void;
}

export default function SubredditsTab({ model, posts, standard, dispatch, onPost }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Subreddit | null>(null);

  const lastPostBySub = useMemo(() => {
    const map = new Map<string, Post>();
    for (const p of posts) if (!map.has(p.subredditId)) map.set(p.subredditId, p); // posts are newest first
    return map;
  }, [posts]);

  const accountName = (id: string | null) => model.accounts.find((a) => a.id === id)?.username;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^r\//, '');
    return [...model.subreddits]
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .filter((s) =>
        filter === 'ready' ? isReady(s.lastPosted) : filter === 'recent' ? !isReady(s.lastPosted) : filter === 'verified' ? s.verified : true
      )
      .sort((a, b) => {
        const ra = isReady(a.lastPosted), rb = isReady(b.lastPosted);
        if (ra !== rb) return ra ? -1 : 1;
        if (!a.lastPosted) return b.lastPosted ? -1 : a.name.localeCompare(b.name);
        if (!b.lastPosted) return 1;
        return a.lastPosted.localeCompare(b.lastPosted);
      });
  }, [model.subreddits, query, filter]);

  const readyCount = model.subreddits.filter((s) => isReady(s.lastPosted)).length;

  if (model.subreddits.length === 0 && !adding) {
    return (
      <>
        <Empty
          title="No subreddits yet"
          action={
            <div className="flex gap-2">
              {standard.length > 0 && (
                <Button
                  variant="primary"
                  onClick={() => {
                    dispatch({
                      type: 'addSubreddits',
                      modelId: model.id,
                      subreddits: standard.map((s) => ({ id: uuidv4(), name: s.name, ...(s.verified ? { verified: true } : {}) })),
                    });
                    toast.success(`Added ${standard.length} standard subreddits`);
                  }}
                >
                  Add standard list ({standard.length})
                </Button>
              )}
              <Button onClick={() => setAdding(true)}>Paste a list</Button>
            </div>
          }
        >
          Start from your standard list, or paste the subreddits this model posts to.
        </Empty>
      </>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search subreddits" className="!w-full sm:!w-56 !h-8" aria-label="Search subreddits" />
        <div className="flex rounded-md border border-line-strong p-0.5" role="group" aria-label="Filter">
          {(
            [
              ['all', 'All'],
              ['ready', `Ready ${readyCount}`],
              ['recent', 'Posted recently'],
              ['verified', 'Verified only'],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={cx('px-2.5 h-6 rounded text-[12.5px] num', filter === id ? 'bg-raised text-ink font-medium' : 'text-muted hover:text-ink')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setAdding(true)}>
          Add subreddits
        </Button>
      </div>

      <div className="rounded-lg border border-line bg-panel overflow-hidden">
        <div className="hidden md:grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-4 px-4 h-9 items-center border-b border-line text-[12px] text-faint">
          <span>Subreddit</span>
          <span>Last posted</span>
          <span>Last result</span>
          <span className="w-[108px]" />
        </div>
        {rows.length === 0 && <p className="px-4 py-8 text-center text-muted text-[13px]">No subreddits match.</p>}
        <ul>
          {rows.map((s) => {
            const ready = isReady(s.lastPosted);
            const last = lastPostBySub.get(s.id);
            return (
              <li
                key={s.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-4 py-2.5 items-center border-b border-line last:border-b-0 hover:bg-raised/50"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <span
                    className={cx('size-2 rounded-full shrink-0', ready ? 'bg-model' : 'border border-faint')}
                    title={ready ? 'Ready to post' : 'Posted recently'}
                  />
                  <a href={`https://www.reddit.com/r/${s.name}`} target="_blank" rel="noreferrer" className="truncate font-medium hover:underline">
                    r/{s.name}
                  </a>
                  {s.verified && <Tag tone="model">Verified</Tag>}
                  {s.notes && (
                    <span className="truncate text-[12.5px] text-muted" title={s.notes}>
                      {s.notes}
                    </span>
                  )}
                </div>
                <div className="hidden md:block text-[13px] text-muted truncate">
                  <span className={cx(ready && s.lastPosted && 'text-ink')}>{ago(s.lastPosted)}</span>
                  {last && accountName(last.accountId) && <span className="text-faint"> by u/{accountName(last.accountId)}</span>}
                </div>
                <div className="hidden md:block">{last ? <ResultTag post={last} /> : <span className="text-faint text-[13px]">–</span>}</div>
                <div className="row-span-2 md:row-span-1 flex items-center gap-1 justify-end">
                  <Button size="sm" variant={ready ? 'primary' : 'outline'} onClick={() => onPost(s)} className="w-[72px]">
                    Post
                  </Button>
                  <button onClick={() => setEditing(s)} className="p-1.5 rounded text-faint hover:text-ink hover:bg-raised" aria-label={`Edit r/${s.name}`}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="12.5" cy="8" r="1.3" /></svg>
                  </button>
                </div>
                <div className="md:hidden text-[12.5px] text-muted">{ago(s.lastPosted)}</div>
              </li>
            );
          })}
        </ul>
      </div>

      {adding && <AddSubsDialog model={model} standard={standard} dispatch={dispatch} onClose={() => setAdding(false)} />}
      {editing && <EditSubDialog model={model} sub={editing} dispatch={dispatch} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AddSubsDialog({ model, standard, dispatch, onClose }: { model: Model; standard: StandardSub[]; dispatch: (op: Op) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const have = new Set(model.subreddits.map((s) => s.name.toLowerCase()));
  const parsed = parseSubredditList(text);
  const fresh = parsed.filter((n) => !have.has(n.toLowerCase()));
  const missingStandard = standard.filter((s) => !have.has(s.name.toLowerCase()));

  const add = (subs: { name: string; verified?: boolean }[]) => {
    dispatch({ type: 'addSubreddits', modelId: model.id, subreddits: subs.map((s) => ({ id: uuidv4(), ...s })) });
    toast.success(`Added ${subs.length} subreddit${subs.length === 1 ? '' : 's'}`);
    onClose();
  };

  return (
    <Dialog title="Add subreddits" onClose={onClose} accent={model.color}>
      <label className="block">
        <Label hint="one per line or comma separated">Paste subreddits</Label>
        <Textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={'r/example\nanothersub\nhttps://reddit.com/r/third'} className="font-mono text-[13px]" />
      </label>
      <p className="mt-2 text-[12.5px] text-muted num">
        {parsed.length === 0 ? 'Nothing recognised yet.' : `${fresh.length} new${parsed.length - fresh.length ? `, ${parsed.length - fresh.length} already added` : ''}.`}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {missingStandard.length > 0 && (
          <Button variant="quiet" onClick={() => add(missingStandard.map((s) => ({ name: s.name, ...(s.verified ? { verified: true } : {}) })))}>
            Add {missingStandard.length} missing from standard list
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="primary" disabled={!fresh.length} onClick={() => add(fresh.map((name) => ({ name })))}>
          Add {fresh.length || ''} subreddit{fresh.length === 1 ? '' : 's'}
        </Button>
      </div>
    </Dialog>
  );
}

function EditSubDialog({ model, sub, dispatch, onClose }: { model: Model; sub: Subreddit; dispatch: (op: Op) => void; onClose: () => void }) {
  const [verified, setVerified] = useState(!!sub.verified);
  const [notes, setNotes] = useState(sub.notes ?? '');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const save = () => {
    dispatch({ type: 'updateSubreddit', modelId: model.id, subredditId: sub.id, patch: { verified, notes: notes.trim() } });
    onClose();
  };

  return (
    <Dialog title={`r/${sub.name}`} onClose={onClose} accent={model.color}>
      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--model)]" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
          <span>
            <span className="block text-[13.5px] font-medium">Verified accounts only</span>
            <span className="block text-[12.5px] text-muted">Posting here picks the model’s verified account.</span>
          </span>
        </label>
        <label className="block">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. needs OC flair, no links in title" />
        </label>
        <div className="flex items-center gap-2 pt-1">
          {confirmRemove ? (
            <Button
              variant="danger"
              onClick={() => {
                dispatch({ type: 'removeSubreddit', modelId: model.id, subredditId: sub.id });
                toast.success(`Removed r/${sub.name}`);
                onClose();
              }}
            >
              Confirm remove
            </Button>
          ) : (
            <Button variant="quiet" className="!text-bad" onClick={() => setConfirmRemove(true)}>
              Remove from {model.name}
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
