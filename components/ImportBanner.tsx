'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppData, Model } from '@/lib/types';

// Where the old version of the app saved everything (per browser).
const LEGACY_KEY = 'reddit-poster-data';
const DONE_KEY = 'reddit-poster-imported';

interface ImportBannerProps {
  onImport: (models: Model[]) => Promise<void> | void;
}

/** Offers to move data saved in this browser (old version) into the shared workspace. */
export default function ImportBanner({ onImport }: ImportBannerProps) {
  const [legacy, setLegacy] = useState<Model[] | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(DONE_KEY)) return;
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AppData;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage once on mount
      if (parsed?.models?.length) setLegacy(parsed.models);
    } catch {
      /* storage unavailable — nothing to import */
    }
  }, []);

  if (!legacy) return null;

  const subCount = legacy.reduce((n, m) => n + (m.subreddits?.length ?? 0), 0);

  const markDone = () => {
    try {
      localStorage.setItem(DONE_KEY, new Date().toISOString());
    } catch {}
    setLegacy(null);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-900 text-sm">
      <p className="flex-1 text-indigo-900 dark:text-indigo-200">
        This browser has <strong>{legacy.length} model{legacy.length !== 1 ? 's' : ''}</strong> and{' '}
        <strong>{subCount} subreddit{subCount !== 1 ? 's' : ''}</strong> saved from the old version. Add them to the
        shared workspace so everyone can see them?
      </p>
      <div className="flex gap-2">
        <button
          onClick={markDone}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        >
          Dismiss
        </button>
        <button
          onClick={async () => {
            await onImport(legacy);
            markDone();
            toast.success('Imported into the shared workspace');
          }}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors"
        >
          Import
        </button>
      </div>
    </div>
  );
}
