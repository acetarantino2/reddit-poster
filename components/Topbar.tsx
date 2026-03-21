'use client';

import ThemeToggle from './ThemeToggle';

interface TopbarProps {
  onMenuToggle: () => void;
  sidebarOpen: boolean;
}

export default function Topbar({ onMenuToggle, sidebarOpen }: TopbarProps) {
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
      <ThemeToggle />
    </header>
  );
}
