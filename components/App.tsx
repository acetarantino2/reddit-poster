'use client';

import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Model } from '@/lib/types';
import { useWorkspace } from '@/hooks/useWorkspace';
import Topbar from '@/components/Topbar';
import Sidebar from '@/components/Sidebar';
import MainPanel from '@/components/MainPanel';
import AddModelModal from '@/components/AddModelModal';
import ModelDrawer from '@/components/ModelDrawer';
import ImportBanner from '@/components/ImportBanner';

export default function App() {
  const { data, state, dispatch, refresh } = useWorkspace();
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectedModel = data.models.find((m) => m.id === selectedModelId) ?? null;

  const handleAddModel = (model: Model) => {
    const { id, name, color, titleTemplate, bodyTemplate } = model;
    dispatch({ type: 'upsertModel', model: { id, name, color, titleTemplate, bodyTemplate } });
    setSelectedModelId(model.id);
  };

  const handleDeleteModel = (id: string) => {
    dispatch({ type: 'deleteModel', modelId: id });
    setSelectedModelId((prev) => (prev === id ? null : prev));
  };

  if (state === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: '!bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-white !border !border-gray-200 dark:!border-gray-700 !shadow-lg !rounded-xl !text-sm',
          duration: 2500,
        }}
      />

      <Topbar onMenuToggle={() => setSidebarOpen((v) => !v)} sidebarOpen={sidebarOpen} syncState={state} />

      <ImportBanner
        onImport={async (models) => {
          dispatch({ type: 'import', models });
          setTimeout(refresh, 1500);
        }}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          models={data.models}
          selectedId={selectedModelId}
          onSelect={setSelectedModelId}
          onAddModel={() => setShowAddModal(true)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MainPanel
            model={selectedModel}
            onMarkPosted={(subredditId) =>
              dispatch({ type: 'markPosted', subredditId, at: new Date().toISOString() })
            }
            onRemoveSubreddit={(modelId, subredditId) =>
              dispatch({ type: 'removeSubreddit', modelId, subredditId })
            }
            onOpenSettings={() => setShowDrawer(true)}
          />
        </main>
      </div>

      {showAddModal && <AddModelModal onAdd={handleAddModel} onClose={() => setShowAddModal(false)} />}

      {showDrawer && selectedModel && (
        <ModelDrawer
          model={selectedModel}
          onSaveSettings={(model) => dispatch({ type: 'upsertModel', model })}
          onAddSubreddits={(modelId, subreddits) => dispatch({ type: 'addSubreddits', modelId, subreddits })}
          onDelete={handleDeleteModel}
          onClose={() => setShowDrawer(false)}
        />
      )}
    </div>
  );
}
