'use client';

import { useState, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { Model, AppData } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import Topbar from '@/components/Topbar';
import Sidebar from '@/components/Sidebar';
import MainPanel from '@/components/MainPanel';
import AddModelModal from '@/components/AddModelModal';
import ModelDrawer from '@/components/ModelDrawer';

const INITIAL_DATA: AppData = { models: [] };

export default function Home() {
  const [data, setData, isHydrated] = useLocalStorage<AppData>('reddit-poster-data', INITIAL_DATA);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectedModel = data.models.find((m) => m.id === selectedModelId) ?? null;

  const handleAddModel = useCallback(
    (model: Model) => {
      setData((prev) => ({ ...prev, models: [...prev.models, model] }));
      setSelectedModelId(model.id);
    },
    [setData]
  );

  const handleUpdateModel = useCallback(
    (updated: Model) => {
      setData((prev) => ({
        ...prev,
        models: prev.models.map((m) => (m.id === updated.id ? updated : m)),
      }));
    },
    [setData]
  );

  const handleDeleteModel = useCallback(
    (id: string) => {
      setData((prev) => ({ ...prev, models: prev.models.filter((m) => m.id !== id) }));
      setSelectedModelId((prev) => (prev === id ? null : prev));
    },
    [setData]
  );

  if (!isHydrated) {
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

      <Topbar onMenuToggle={() => setSidebarOpen((v) => !v)} sidebarOpen={sidebarOpen} />

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
            onUpdateModel={handleUpdateModel}
            onOpenSettings={() => setShowDrawer(true)}
          />
        </main>
      </div>

      {showAddModal && (
        <AddModelModal
          onAdd={handleAddModel}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showDrawer && selectedModel && (
        <ModelDrawer
          model={selectedModel}
          onUpdate={handleUpdateModel}
          onDelete={handleDeleteModel}
          onClose={() => setShowDrawer(false)}
        />
      )}
    </div>
  );
}
