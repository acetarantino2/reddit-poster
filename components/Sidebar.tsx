'use client';

import { Model } from '@/lib/types';

interface SidebarProps {
  models: Model[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddModel: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ models, selectedId, onSelect, onAddModel, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-20
          w-64 flex flex-col
          bg-white dark:bg-gray-950
          border-r border-gray-200 dark:border-gray-800
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          pt-14 lg:pt-0
        `}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Models
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {models.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No models yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Add one below</p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {models.map((model) => (
                <li key={model.id}>
                  <button
                    onClick={() => { onSelect(model.id); onClose(); }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                      ${selectedId === model.id
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: model.color }}
                    />
                    <span className="flex-1 truncate text-sm font-medium">{model.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-600 flex-shrink-0">
                      {model.subreddits.length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onAddModel}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Model
          </button>
        </div>
      </aside>
    </>
  );
}
