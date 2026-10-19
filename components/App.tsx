'use client';

import { useCallback, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useWorkspace } from '@/hooks/useWorkspace';
import Sidebar, { View } from '@/components/Sidebar';
import AddModelModal from '@/components/AddModelModal';
import ImportBanner from '@/components/ImportBanner';
import ModelView from '@/components/ModelView';
import StandardView from '@/components/StandardView';
import Overview from '@/components/Overview';

// The current page lives in the URL hash so back/forward and refresh work.
function readHash(): View {
  if (typeof window === 'undefined') return { kind: 'overview' };
  const h = window.location.hash;
  if (h.startsWith('#/m/')) return { kind: 'model', id: decodeURIComponent(h.slice(4)) };
  if (h === '#/standard') return { kind: 'standard' };
  return { kind: 'overview' };
}
const toHash = (v: View) => (v.kind === 'model' ? `#/m/${encodeURIComponent(v.id)}` : v.kind === 'standard' ? '#/standard' : '#/');

export default function App() {
  const { data, state, dispatch, refresh } = useWorkspace();
  const [view, setView] = useState<View>({ kind: 'overview' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const sync = () => setView(readHash());
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const navigate = useCallback((v: View) => {
    window.location.hash = toHash(v);
    setView(v);
    document.getElementById('main')?.scrollTo(0, 0);
  }, []);

  const model = view.kind === 'model' ? data.models.find((m) => m.id === view.id) ?? null : null;

  if (state === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-muted border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      <Toaster
        position="bottom-center"
        toastOptions={{
          className: '!bg-ink !text-panel !text-[13.5px] !rounded-lg !shadow-xl',
          duration: 3000,
        }}
      />

      <Sidebar
        models={data.models}
        standardCount={data.standard.length}
        view={view}
        onNavigate={navigate}
        onAddModel={() => setShowAddModal(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        syncState={state}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* mobile header */}
        <div className="lg:hidden h-12 shrink-0 flex items-center gap-2 px-3 border-b border-line bg-panel">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-md text-muted hover:text-ink" aria-label="Open menu">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 5h12M3 9h12M3 13h12" /></svg>
          </button>
          <span className="font-semibold truncate">{model?.name ?? (view.kind === 'standard' ? 'Standard subreddits' : 'Reddit Poster')}</span>
        </div>

        <ImportBanner
          onImport={async (models) => {
            dispatch({ type: 'import', models });
            setTimeout(refresh, 1500);
          }}
        />

        <main id="main" className="flex-1 overflow-y-auto">
          {view.kind === 'model' && model && (
            <ModelView key={model.id} model={model} posts={data.posts} standard={data.standard} dispatch={dispatch} onDeleted={() => navigate({ kind: 'overview' })} />
          )}
          {view.kind === 'model' && !model && (
            <div className="p-10 text-muted">This model was deleted or doesn’t exist.</div>
          )}
          {view.kind === 'standard' && <StandardView data={data} dispatch={dispatch} />}
          {view.kind === 'overview' && (
            <Overview data={data} onOpen={(id) => navigate({ kind: 'model', id })} onAddModel={() => setShowAddModal(true)} />
          )}
        </main>
      </div>

      {showAddModal && (
        <AddModelModal
          standard={data.standard}
          onClose={() => setShowAddModal(false)}
          onCreate={(settings, subs) => {
            dispatch({ type: 'upsertModel', model: settings });
            if (subs.length) dispatch({ type: 'addSubreddits', modelId: settings.id, subreddits: subs });
            navigate({ kind: 'model', id: settings.id });
          }}
        />
      )}
    </div>
  );
}
