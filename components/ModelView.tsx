'use client';

import { useMemo, useState } from 'react';
import { Model, Post, StandardSub, Subreddit } from '@/lib/types';
import { Op } from '@/lib/ops';
import { Button, Tabs, isReady, modelVars, useNow } from './ui';
import SubredditsTab from './SubredditsTab';
import AccountsTab from './AccountsTab';
import PostsTab from './PostsTab';
import PostDialog from './PostDialog';
import ModelSettingsDialog from './ModelSettingsDialog';

type Tab = 'subs' | 'accounts' | 'posts';

interface ModelViewProps {
  model: Model;
  posts: Post[];
  standard: StandardSub[];
  dispatch: (op: Op) => void;
  onDeleted: () => void;
}

const WEEK = 7 * 86_400_000;

export default function ModelView({ model, posts, standard, dispatch, onDeleted }: ModelViewProps) {
  const [tab, setTab] = useState<Tab>('subs');
  const [posting, setPosting] = useState<Subreddit | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const modelPosts = useMemo(() => posts.filter((p) => p.modelId === model.id), [posts, model.id]);
  const ready = model.subreddits.filter((s) => isReady(s.lastPosted)).length;
  const now = useNow();
  const thisWeek = modelPosts.filter((p) => now - Date.parse(p.postedAt) < WEEK);
  const checked = thisWeek.filter((p) => p.stats && p.stats.state !== 'unknown');
  const removed = checked.filter((p) => p.stats?.state === 'removed').length;
  const activeAccounts = model.accounts.filter((a) => a.status === 'active').length;

  const stats: { value: string; label: string; tone?: string }[] = [
    { value: String(ready), label: ready === 1 ? 'sub ready to post' : 'subs ready to post' },
    { value: String(thisWeek.length), label: 'posts this week' },
    {
      value: checked.length ? `${Math.round((removed / checked.length) * 100)}%` : '–',
      label: 'removed this week',
      tone: checked.length && removed / checked.length > 0.25 ? 'text-bad' : undefined,
    },
    { value: `${activeAccounts}/${model.accounts.length}`, label: 'accounts active' },
  ];

  return (
    <div style={modelVars(model.color)} className="min-h-full">
      <header className="relative bg-panel border-b border-line">
        <div className="absolute inset-x-0 top-0 h-1 bg-model" />
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-8">
          <div className="flex items-start justify-between gap-4">
            <h1 className="display text-[40px] sm:text-[52px] text-ink break-words min-w-0">{model.name}</h1>
            <Button variant="quiet" size="sm" onClick={() => setShowSettings(true)} className="mt-2 shrink-0">
              Settings
            </Button>
          </div>

          <dl className="mt-5 grid grid-cols-2 sm:flex sm:gap-10 gap-y-3">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className={`num text-[20px] font-semibold leading-none ${s.tone ?? ''}`}>{s.value}</dd>
                <dd className="mt-1 text-[12.5px] text-muted">{s.label}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-7">
            <Tabs<Tab>
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'subs', label: 'Subreddits', count: model.subreddits.length },
                { id: 'accounts', label: 'Accounts', count: model.accounts.length },
                { id: 'posts', label: 'Posts', count: modelPosts.length },
              ]}
            />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6">
        {tab === 'subs' && (
          <SubredditsTab model={model} posts={modelPosts} standard={standard} dispatch={dispatch} onPost={setPosting} />
        )}
        {tab === 'accounts' && <AccountsTab model={model} posts={modelPosts} dispatch={dispatch} />}
        {tab === 'posts' && <PostsTab model={model} posts={modelPosts} dispatch={dispatch} />}
      </div>

      {posting && (
        <PostDialog
          model={model}
          subreddit={posting}
          posts={modelPosts}
          dispatch={dispatch}
          onClose={() => setPosting(null)}
          onViewPosts={() => {
            setPosting(null);
            setTab('posts');
          }}
        />
      )}
      {showSettings && (
        <ModelSettingsDialog
          model={model}
          dispatch={dispatch}
          onClose={() => setShowSettings(false)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}
