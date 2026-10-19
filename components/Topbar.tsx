'use client';

import ThemeToggle from './ThemeToggle';
import type { SyncState } from '@/hooks/useWorkspace';

interface TopbarProps {
  onMenuToggle: () => void;
  sidebarOpen: boolean;
  syncState: SyncState;
}

const SYNC_LABEL: Record<SyncState, { text: string; dot: string }> = {
  loading: { text: 'Loading…', dot: 'bg-gray-400' },
  synced: { text: 'Synced', dot: 'bg-green-500' },
  saving: { text: 'Saving…', dot: 'bg-amber-400 animate-pulse' },
  offline: { text: 'Offline — retrying', dot: 'bg-red-500' },
};

export default function Topbar({ onMenuToggle, sidebarOpen, syncState }: TopbarProps) {
  const sync = SYNC_LABEL[syncState];

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.reload();
  };

  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-between px-4 z-30 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white text-sm font-bold">R</div>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">Reddit Poster</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mr-1" title="Changes are shared with everyone on the team">
          <span className={`w-2 h-2 rounded-full ${sync.dot}`} />
          {sync.text}
        </span>
        <ThemeToggle />
        <button
          onClick={logout}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
