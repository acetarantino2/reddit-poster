'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { Model, Post, RedditAccount, Subreddit } from '@/lib/types';
import { Op } from '@/lib/ops';
import { checkPost, submitUrl } from '@/lib/reddit';
import { Button, Dialog, Input, Label, Tag, ago, cx } from './ui';
import { ROLE_LABEL } from './AccountsTab';

interface Props {
  model: Model;
  subreddit: Subreddit;
  posts: Post[];
  dispatch: (op: Op) => void;
  onClose: () => void;
  onViewPosts: () => void;
}

/** Pick the most sensible account: verified for verified subs, otherwise the one that's waited longest in this sub. */
function suggestAccount(accounts: RedditAccount[], sub: Subreddit, posts: Post[]): string | null {
  const usable = accounts.filter((a) => a.status === 'active');
  if (!usable.length) return null;
  if (sub.verified) return (usable.find((a) => a.role === 'verified') ?? usable[0]).id;
  const pool = usable.filter((a) => a.role !== 'verified');
  const candidates = pool.length ? pool : usable;
  const lastUse = (id: string) => posts.find((p) => p.accountId === id && p.subredditId === sub.id)?.postedAt ?? '';
  return [...candidates].sort((a, b) => lastUse(a.id).localeCompare(lastUse(b.id)))[0].id;
}

export default function PostDialog({ model, subreddit, posts, dispatch, onClose, onViewPosts }: Props) {
  const [accountId, setAccountId] = useState<string | null>(() => suggestAccount(model.accounts, subreddit, posts));
  const [logged, setLogged] = useState<Post | null>(null);
  const [link, setLink] = useState('');
  const [checking, setChecking] = useState(false);

  const account = model.accounts.find((a) => a.id === accountId) ?? null;
  const sorted = [...model.accounts].sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active'));

  const open = () => {
    window.open(submitUrl(subreddit.name), '_blank', 'noopener');
    const post: Post = {
      id: uuidv4(),
      modelId: model.id,
      subredditId: subreddit.id,
      subreddit: subreddit.name,
      accountId,
      postedAt: new Date().toISOString(),
    };
    dispatch({ type: 'logPost', post });
    setLogged(post);
  };

  const undo = () => {
    if (logged) dispatch({ type: 'deletePost', postId: logged.id });
    toast('Post removed from the log');
    onClose();
  };

  const saveLink = async () => {
    if (!logged || !/^https?:\/\//i.test(link.trim())) return;
    const url = link.trim();
    dispatch({ type: 'updatePost', postId: logged.id, patch: { url } });
    setChecking(true);
    const stats = await checkPost(url);
    setChecking(false);
    if (stats) {
      dispatch({ type: 'updatePost', postId: logged.id, patch: { stats } });
      toast.success(stats.state === 'live' ? 'Link saved, post is live' : `Link saved, post shows as ${stats.state}`);
    } else {
      toast('Link saved. Couldn’t reach Reddit to check it yet');
    }
    onClose();
  };

  return (
    <Dialog title={`Post to r/${subreddit.name}`} onClose={onClose} accent={model.color} width="max-w-lg">
      {!logged ? (
        <div className="space-y-4">
          {subreddit.notes && <p className="rounded-md bg-raised px-3 py-2 text-[13px]">{subreddit.notes}</p>}

          <div>
            <Label hint={subreddit.verified ? 'this sub needs a verified account' : undefined}>Post from</Label>
            {model.accounts.length === 0 ? (
              <p className="text-[13px] text-muted">No Reddit accounts added for {model.name} yet. Add them in the Accounts tab to track which account posted where.</p>
            ) : (
              <div className="rounded-lg border border-line divide-y divide-line overflow-hidden" role="radiogroup">
                {sorted.map((a) => {
                  const last = posts.find((p) => p.accountId === a.id && p.subredditId === subreddit.id);
                  return (
                    <label key={a.id} className={cx('flex items-center gap-3 px-3 py-2.5 cursor-pointer', accountId === a.id ? 'bg-model/10' : 'hover:bg-raised/60')}>
                      <input type="radio" name="account" className="size-4 accent-[var(--model)]" checked={accountId === a.id} onChange={() => setAccountId(a.id)} />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="font-medium truncate">u/{a.username}</span>
                          <Tag tone={a.role === 'verified' ? 'model' : 'plain'}>{ROLE_LABEL[a.role]}</Tag>
                          {a.status !== 'active' && <Tag tone="bad">{a.status}</Tag>}
                        </span>
                        <span className="block text-[12.5px] text-muted truncate">
                          {a.persona ? `${a.persona}, ` : ''}
                          {last ? `posted here ${ago(last.postedAt)}` : 'never posted here'}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {subreddit.verified && account && account.role !== 'verified' && (
              <p className="mt-2 text-[12.5px] text-warn">This subreddit is marked verified-only. u/{account.username} isn’t the verified account.</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <p className="flex-1 text-[12.5px] text-muted">
              {account ? <>Make sure you’re logged in to Reddit as <span className="text-ink">u/{account.username}</span>.</> : 'Opens the Reddit submit page and logs the post.'}
            </p>
            <Button variant="primary" onClick={open} data-autofocus>
              Open submit page
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[13.5px]">
            Logged{account ? <> as <span className="font-medium">u/{account.username}</span></> : ''}. Once it’s up, paste the post link so the app can track how it does.
          </p>
          <label className="block">
            <Label>Post link</Label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://www.reddit.com/r/…/comments/…"
              onKeyDown={(e) => e.key === 'Enter' && saveLink()}
              autoFocus
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="quiet" onClick={undo}>
              Didn’t post, undo
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => { onClose(); }}>
              Add link later
            </Button>
            <Button variant="primary" onClick={saveLink} disabled={!/^https?:\/\//i.test(link.trim()) || checking}>
              {checking ? 'Checking…' : 'Save link'}
            </Button>
          </div>
          <button onClick={onViewPosts} className="text-[12.5px] text-muted hover:text-ink underline underline-offset-2">
            See all posts for {model.name}
          </button>
        </div>
      )}
    </Dialog>
  );
}
