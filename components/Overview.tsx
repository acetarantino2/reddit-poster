'use client';

import { format } from 'date-fns';
import { AppData } from '@/lib/types';
import { Button, Empty, isReady, useNow } from './ui';
import { ResultTag } from './PostsTab';

interface Props {
  data: AppData;
  onOpen: (modelId: string) => void;
  onAddModel: () => void;
}

const WEEK = 7 * 86_400_000;

export default function Overview({ data, onOpen, onAddModel }: Props) {
  const now = useNow();
  const weekPosts = data.posts.filter((p) => now - Date.parse(p.postedAt) < WEEK);
  const totalReady = data.models.reduce((n, m) => n + m.subreddits.filter((s) => isReady(s.lastPosted)).length, 0);
  const byId = new Map(data.models.map((m) => [m.id, m]));

  const rows = data.models.map((m) => {
    const posts = weekPosts.filter((p) => p.modelId === m.id);
    const checked = posts.filter((p) => p.stats && p.stats.state !== 'unknown');
    const removed = checked.filter((p) => p.stats?.state === 'removed').length;
    return {
      m,
      ready: m.subreddits.filter((s) => isReady(s.lastPosted)).length,
      posts: posts.length,
      removedPct: checked.length ? Math.round((removed / checked.length) * 100) : null,
      flagged: m.accounts.filter((a) => a.status === 'shadowbanned' || a.status === 'suspended').length,
    };
  });

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8" style={{ '--model': 'var(--ink)', '--on-model': 'var(--panel)' } as React.CSSProperties}>
      <h1 className="display text-[40px]">Overview</h1>
      <p className="mt-2 text-muted num">
        {data.models.length
          ? `${totalReady} subreddits ready to post across ${data.models.length} model${data.models.length === 1 ? '' : 's'}. ${weekPosts.length} posts in the last 7 days.`
          : 'Add a model to get started.'}
      </p>

      {data.models.length === 0 ? (
        <Empty title="No models yet" action={<Button variant="primary" onClick={onAddModel}>Add model</Button>}>
          Each model gets their subreddits, Reddit accounts and post history.
        </Empty>
      ) : (
        <div className="mt-8 rounded-lg border border-line bg-panel overflow-hidden">
          <div className="hidden sm:grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] gap-4 px-4 h-9 items-center border-b border-line text-[12px] text-faint">
            <span>Model</span>
            <span className="text-right">Ready to post</span>
            <span className="text-right">Posts this week</span>
            <span className="text-right">Removed</span>
            <span className="text-right">Account issues</span>
          </div>
          <ul>
            {rows.map(({ m, ready, posts, removedPct, flagged }) => (
              <li key={m.id}>
                <button
                  onClick={() => onOpen(m.id)}
                  className="w-full grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] gap-4 px-4 h-12 items-center text-left border-b border-line hover:bg-raised/50"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-[3px] h-5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="font-medium truncate">{m.name}</span>
                    <span className="hidden md:inline text-[12.5px] text-faint num">{m.subreddits.length} subs, {m.accounts.length} accounts</span>
                  </span>
                  <span className="num text-right">
                    {ready}
                    <span className="sm:hidden text-muted"> ready</span>
                  </span>
                  <span className="hidden sm:block num text-right">{posts}</span>
                  <span className={`hidden sm:block num text-right ${removedPct !== null && removedPct > 25 ? 'text-bad' : ''}`}>
                    {removedPct === null ? '–' : `${removedPct}%`}
                  </span>
                  <span className={`hidden sm:block num text-right ${flagged ? 'text-warn' : 'text-faint'}`}>{flagged || '–'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.posts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[15px] font-semibold">Latest posts</h2>
          <ul className="mt-3 rounded-lg border border-line bg-panel overflow-hidden">
            {data.posts.slice(0, 10).map((p) => {
              const m = byId.get(p.modelId);
              const acc = m?.accounts.find((a) => a.id === p.accountId);
              return (
                <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[100px_minmax(0,1.3fr)_minmax(0,1fr)_220px] gap-x-4 px-4 py-2.5 items-center border-b border-line last:border-b-0">
                  <span className="hidden sm:block text-[13px] text-muted num">{format(new Date(p.postedAt), 'd MMM, HH:mm')}</span>
                  <span className="min-w-0 truncate">
                    <span className="inline-block size-2 rounded-full mr-2 align-middle" style={{ backgroundColor: m?.color }} />
                    <span className="font-medium">{m?.name}</span>
                    <span className="text-muted"> in r/{p.subreddit}</span>
                  </span>
                  <span className="hidden sm:block text-[13px] text-muted truncate">{acc ? `u/${acc.username}` : ''}</span>
                  <span className="flex justify-end"><ResultTag post={p} /></span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
