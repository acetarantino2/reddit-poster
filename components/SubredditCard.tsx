'use client';

import { formatDistanceToNow } from 'date-fns';
import { Subreddit } from '@/lib/types';
import toast from 'react-hot-toast';

interface SubredditCardProps {
  subreddit: Subreddit;
  titleTemplate: string;
  modelColor: string;
  onPost: (id: string) => void;
  onDelete: (id: string) => void;
}

function getPostStatus(lastPosted: string | null): 'never' | 'overdue' | 'recent' {
  if (!lastPosted) return 'never';
  const diff = Date.now() - new Date(lastPosted).getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return days >= 7 ? 'overdue' : 'recent';
}

export default function SubredditCard({ subreddit, titleTemplate, modelColor, onPost, onDelete }: SubredditCardProps) {
  const status = getPostStatus(subreddit.lastPosted);

  const handlePost = () => {
    window.open(`https://www.reddit.com/r/${subreddit.name}`, '_blank');
    onPost(subreddit.id);
    toast.success(`Opened r/${subreddit.name}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(titleTemplate);
    toast.success('Title copied to clipboard!');
  };

  return (
    <div className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all duration-150">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {status !== 'recent' && (
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                status === 'never' ? 'bg-amber-400' : 'bg-red-400'
              }`}
              title={status === 'never' ? 'Never posted' : 'Overdue (7+ days)'}
            />
          )}
          {status === 'recent' && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 bg-green-400"
              title="Posted recently"
            />
          )}
          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
            r/{subreddit.name}
          </span>
        </div>
        <button
          onClick={() => onDelete(subreddit.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all flex-shrink-0"
          aria-label="Remove subreddit"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Last posted */}
      <div className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={`text-xs ${status === 'never' ? 'text-amber-500' : status === 'overdue' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {subreddit.lastPosted
            ? `${formatDistanceToNow(new Date(subreddit.lastPosted))} ago`
            : 'Never posted'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <button
          onClick={handlePost}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: modelColor }}
        >
          Post
        </button>
        <button
          onClick={handleCopy}
          className="py-1.5 px-3 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Copy title template"
        >
          Copy Title
        </button>
      </div>
    </div>
  );
}
