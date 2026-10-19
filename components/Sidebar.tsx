'use client';

import { Model } from '@/lib/types';
import type { SyncState } from '@/hooks/useWorkspace';
import ThemeToggle from './ThemeToggle';
import { cx, isReady } from './ui';

export type View = { kind: 'overview' } | { kind: 'standard' } | { kind: 'model'; id: string };

interface SidebarProps {
  models: Model[];
  standardCount: number;
  view: View;
  onNavigate: (v: View) => void;
  onAddModel: () => void;
  isOpen: boolean;
  onClose: () => void;
  syncState: SyncState;
}

const SYNC: Record<SyncState, { text: string; dot: string }> = {
  loading: { text: 'Loading', dot: 'bg-faint' },
  synced: { text: 'Synced with team', dot: 'bg-ok' },
  saving: { text: 'Saving', dot: 'bg-warn animate-pulse' },
  offline: { text: 'Offline, retrying', dot: 'bg-bad' },
};

function NavItem({ active, onClick, children, right }: { active: boolean; onClick: () => void; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'w-full flex items-center gap-2.5 rounded-md px-2.5 h-8 text-[13.5px] text-left transition-colors',
        active ? 'bg-raised text-ink font-medium' : 'text-muted hover:text-ink hover:bg-raised/60'
      )}
    >
      <span className="flex-1 truncate">{children}</span>
      {right}
    </button>
  );
}

export default function Sidebar({ models, standardCount, view, onNavigate, onAddModel, isOpen, onClose, syncState }: SidebarProps) {
  const go = (v: View) => {
    onNavigate(v);
    onClose();
  };
  const sync = SYNC[syncState];

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.reload();
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={cx(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 shrink-0 flex flex-col bg-panel border-r border-line transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-14 flex items-center gap-2.5 px-4 shrink-0">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
            <rect width="22" height="22" rx="5" fill="var(--ink)" />
            <path d="M6 15.5V6.5h5a3 3 0 010 6H6m5 0l4 3" fill="none" stroke="var(--panel)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-semibold tracking-tight">Reddit Poster</span>
        </div>

        <nav className="px-2 space-y-0.5">
          <NavItem active={view.kind === 'overview'} onClick={() => go({ kind: 'overview' })}>
            Overview
          </NavItem>
          <NavItem
            active={view.kind === 'standard'}
            onClick={() => go({ kind: 'standard' })}
            right={<span className="num text-[12px] text-faint">{standardCount}</span>}
          >
            Standard subreddits
          </NavItem>
        </nav>

        <div className="mt-5 mb-1 px-4 flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-faint">Models</span>
          <button onClick={onAddModel} className="p-1 -mr-1 rounded text-muted hover:text-ink hover:bg-raised" aria-label="Add model" title="Add model">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7 2v10M2 7h10" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {models.length === 0 && (
            <button onClick={onAddModel} className="w-full text-left px-2.5 py-2 text-[13px] text-muted hover:text-ink">
              Add your first model
            </button>
          )}
          {models.map((m) => {
            const ready = m.subreddits.filter((s) => isReady(s.lastPosted)).length;
            const active = view.kind === 'model' && view.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => go({ kind: 'model', id: m.id })}
                className={cx(
                  'relative w-full flex items-center gap-2.5 rounded-md pl-3.5 pr-2.5 h-9 text-left transition-colors',
                  active ? 'bg-raised' : 'hover:bg-raised/60'
                )}
              >
                <span className="absolute left-1 top-2 bottom-2 w-[3px] rounded-full" style={{ backgroundColor: m.color }} />
                <span className={cx('flex-1 truncate text-[13.5px]', active ? 'font-medium text-ink' : 'text-ink/85')}>{m.name}</span>
                {ready > 0 && (
                  <span className="num text-[12px] text-muted" title={`${ready} subreddits ready to post`}>
                    {ready} ready
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="border-t border-line px-3 py-2.5 flex items-center gap-1">
          <span className="flex-1 flex items-center gap-2 px-1 text-[12.5px] text-muted" title="Changes are shared with everyone on the team">
            <span className={cx('w-1.5 h-1.5 rounded-full', sync.dot)} />
            {sync.text}
          </span>
          <ThemeToggle />
          <button onClick={logout} className="px-2 h-7 rounded-md text-[12.5px] text-muted hover:text-ink hover:bg-raised">
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
