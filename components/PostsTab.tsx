'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Model, Post, PostStats } from '@/lib/types';
import { Op } from '@/lib/ops';
import { checkPost } from '@/lib/reddit';
import { Button, Dialog, Empty, Input, Label, Select, Tag, ago, cx, useNow } from './ui';

export function ResultTag({ post }: { post: Post }) {
  const s = post.stats;
  if (!s) return <span className="text-[12.5px] text-faint">{post.url ? 'Not checked' : 'No link'}</span>;
  if (s.state === 'removed') return <Tag tone="bad">Removed</Tag>;
  if (s.state === 'deleted') return <Tag>Deleted</Tag>;
  if (s.state === 'unknown') return <span className="text-[12.5px] text-faint">Unknown</span>;
  return (
    <span className="inline-flex items-center gap-2 text-[13px]">
      <Tag tone="ok">Live</Tag>
      <span className="num">{s.score ?? '–'}</span>
      <span className="text-faint num">{s.comments ?? 0} comments</span>
    </span>
  );
}

interface Props {
  model: Model;
  posts: Post[];
  dispatch: (op: Op) => void;
}

const STALE_MS = 60 * 60 * 1000; // re-check posts last checked over an hour ago
const RECENT_MS = 14 * 86_400_000;

export default function PostsTab({ model, posts, dispatch }: Props) {
  const [accountFilter, setAccountFilter] = useState('all');
  const [linking, setLinking] = useState<Post | null>(null);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());

  const accountName = (id: string | null) => model.accounts.find((a) => a.id === id)?.username;
  const shown = posts.filter((p) => accountFilter === 'all' || (accountFilter === 'none' ? !p.accountId : p.accountId === accountFilter));

  const runCheck = async (list: Post[]) => {
    const targets = list.filter((p) => p.url);
    if (!targets.length) return;
    setCheckingIds(new Set(targets.map((p) => p.id)));
    let ok = 0;
    for (const p of targets) {
      const stats = await checkPost(p.url!);
      if (stats) {
        ok++;
        dispatch({ type: 'updatePost', postId: p.id, patch: { stats } });
      }
      setCheckingIds((s) => {
        const n = new Set(s);
        n.delete(p.id);
        return n;
      });
    }
    if (targets.length > 1 || !ok) {
      toast(ok === targets.length ? `Checked ${ok} post${ok === 1 ? '' : 's'}` : `Checked ${ok} of ${targets.length}. Reddit didn’t respond for the rest`);
    }
  };

  const now = useNow();
  const due = shown.filter(
    (p) => p.url && now - Date.parse(p.postedAt) < RECENT_MS && (!p.stats || (!p.stats.manual && now - Date.parse(p.stats.checkedAt) > STALE_MS))
  );
  const missingLinks = shown.filter((p) => !p.url).length;

  if (!posts.length) {
    return <Empty title="No posts logged yet">Use Post on a subreddit and it shows up here, with which account posted it and how it did.</Empty>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} className="!w-52 !h-8 !text-[13px]" aria-label="Filter by account">
          <option value="all">All accounts</option>
          {model.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              u/{a.username}
            </option>
          ))}
          <option value="none">No account</option>
        </Select>
        {missingLinks > 0 && <span className="text-[12.5px] text-muted num">{missingLinks} without a link</span>}
        <div className="flex-1" />
        <Button size="sm" disabled={!due.length || checkingIds.size > 0} onClick={() => runCheck(due)}>
          {checkingIds.size > 0 ? 'Checking…' : due.length ? `Check ${due.length} recent` : 'All up to date'}
        </Button>
      </div>

      <div className="rounded-lg border border-line bg-panel overflow-hidden">
        <div className="hidden md:grid grid-cols-[110px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] gap-4 px-4 h-9 items-center border-b border-line text-[12px] text-faint">
          <span>Posted</span>
          <span>Subreddit</span>
          <span>Account</span>
          <span>Result</span>
          <span className="w-[150px]" />
        </div>
        <ul>
          {shown.map((p) => (
            <li
              key={p.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[110px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] gap-x-4 gap-y-1 px-4 py-2.5 items-center border-b border-line last:border-b-0"
            >
              <span className="text-[13px] text-muted num" title={format(new Date(p.postedAt), 'd MMM yyyy, HH:mm')}>
                {format(new Date(p.postedAt), 'd MMM, HH:mm')}
              </span>
              <span className="md:hidden row-span-3 flex items-start justify-end">{postActions(p)}</span>
              <span className="font-medium truncate">
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline">
                    r/{p.subreddit}
                  </a>
                ) : (
                  `r/${p.subreddit}`
                )}
              </span>
              <span className="text-[13px] text-muted truncate">{accountName(p.accountId) ? `u/${accountName(p.accountId)}` : '–'}</span>
              <span className={cx(checkingIds.has(p.id) && 'opacity-50')}>
                <ResultTag post={p} />
                {p.stats && <span className="ml-2 text-[11.5px] text-faint">{p.stats.manual ? 'entered by hand' : `checked ${ago(p.stats.checkedAt)}`}</span>}
              </span>
              <span className="hidden md:flex">{postActions(p)}</span>
            </li>
          ))}
        </ul>
      </div>

      {linking && <LinkDialog post={linking} model={model} dispatch={dispatch} onClose={() => setLinking(null)} onCheck={(p) => runCheck([p])} />}
    </div>
  );

  function postActions(p: Post) {
    return (
      <span className="flex items-center justify-end gap-1 w-[150px]">
        {p.url && (
          <Button size="sm" variant="quiet" disabled={checkingIds.has(p.id)} onClick={() => runCheck([p])}>
            {checkingIds.has(p.id) ? 'Checking…' : 'Check'}
          </Button>
        )}
        <Button size="sm" variant={p.url ? 'quiet' : 'outline'} onClick={() => setLinking(p)}>
          {p.url ? 'Edit' : 'Add link'}
        </Button>
      </span>
    );
  }
}

function LinkDialog({ post, model, dispatch, onClose, onCheck }: { post: Post; model: Model; dispatch: (op: Op) => void; onClose: () => void; onCheck: (p: Post) => void }) {
  const [url, setUrl] = useState(post.url ?? '');
  const [accountId, setAccountId] = useState(post.accountId ?? '');
  const [manual, setManual] = useState(!!post.stats?.manual);
  const [state, setState] = useState<PostStats['state']>(post.stats?.state ?? 'live');
  const [score, setScore] = useState(post.stats?.score?.toString() ?? '');
  const [comments, setComments] = useState(post.stats?.comments?.toString() ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const urlOk = url.trim() === '' || /^https?:\/\//i.test(url.trim());

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlOk) return;
    const cleanUrl = url.trim();
    const num = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? null : Math.round(Number(v)));
    const patch: Parameters<typeof dispatch>[0] & { type: 'updatePost' } = {
      type: 'updatePost',
      postId: post.id,
      patch: {
        url: cleanUrl,
        accountId: accountId || null,
        ...(manual ? { stats: { state, score: num(score), comments: num(comments), checkedAt: new Date().toISOString(), manual: true } } : {}),
      },
    };
    dispatch(patch);
    if (!manual && cleanUrl && cleanUrl !== post.url) onCheck({ ...post, url: cleanUrl });
    onClose();
  };

  return (
    <Dialog title={`r/${post.subreddit}, ${format(new Date(post.postedAt), 'd MMM HH:mm')}`} onClose={onClose} accent={model.color}>
      <form onSubmit={save} className="space-y-4">
        <label className="block">
          <Label>Post link</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.reddit.com/r/…/comments/…" />
          {!urlOk && <span className="mt-1 block text-[12.5px] text-bad">Paste the full link starting with https://</span>}
        </label>
        <label className="block">
          <Label>Posted from</Label>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">No account</option>
            {model.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                u/{a.username}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer text-[13.5px]">
          <input type="checkbox" className="size-4 accent-[var(--model)]" checked={manual} onChange={(e) => setManual(e.target.checked)} />
          Enter the result by hand
        </label>
        {manual && (
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <Label>Status</Label>
              <Select value={state} onChange={(e) => setState(e.target.value as PostStats['state'])}>
                <option value="live">Live</option>
                <option value="removed">Removed</option>
                <option value="deleted">Deleted</option>
              </Select>
            </label>
            <label className="block">
              <Label>Upvotes</Label>
              <Input inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value)} />
            </label>
            <label className="block">
              <Label>Comments</Label>
              <Input inputMode="numeric" value={comments} onChange={(e) => setComments(e.target.value)} />
            </label>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {confirmDelete ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                dispatch({ type: 'deletePost', postId: post.id });
                toast.success('Post deleted from the log');
                onClose();
              }}
            >
              Confirm delete
            </Button>
          ) : (
            <Button type="button" variant="quiet" className="!text-bad" onClick={() => setConfirmDelete(true)}>
              Delete from log
            </Button>
          )}
          <div className="flex-1" />
          <Button type="submit" variant="primary" disabled={!urlOk}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
