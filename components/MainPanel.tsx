'use client';

import { Model } from '@/lib/types';
import SubredditCard from './SubredditCard';
import toast from 'react-hot-toast';

interface MainPanelProps {
  model: Model | null;
  onMarkPosted: (subredditId: string) => void;
  onRemoveSubreddit: (modelId: string, subredditId: string) => void;
  onOpenSettings: () => void;
}

export default function MainPanel({ model, onMarkPosted, onRemoveSubreddit, onOpenSettings }: MainPanelProps) {
  if (!model) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No model selected</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select or add a model from the sidebar to get started.
          </p>
        </div>
      </div>
    );
  }

  const sortedSubreddits = [...model.subreddits].sort((a, b) => {
    if (!a.lastPosted && !b.lastPosted) return 0;
    if (!a.lastPosted) return -1;
    if (!b.lastPosted) return 1;
    return new Date(a.lastPosted).getTime() - new Date(b.lastPosted).getTime();
  });

  const handlePost = (subredditId: string) => {
    onMarkPosted(subredditId);
  };

  const handleDeleteSubreddit = (subredditId: string) => {
    const sub = model.subreddits.find((s) => s.id === subredditId);
    onRemoveSubreddit(model.id, subredditId);
    toast.success(`Removed r/${sub?.name}`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Model header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: model.color }} />
          <div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">{model.name}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {model.subreddits.length} subreddit{model.subreddits.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>

      {/* Subreddits grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {sortedSubreddits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No subreddits yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              Open Settings to bulk-add subreddits to this model.
            </p>
            <button
              onClick={onOpenSettings}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white transition-colors"
            >
              Add Subreddits
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sortedSubreddits.map((sub) => (
              <SubredditCard
                key={sub.id}
                subreddit={sub}
                titleTemplate={model.titleTemplate.replace('{{name}}', model.name)}
                modelColor={model.color}
                onPost={handlePost}
                onDelete={handleDeleteSubreddit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
