'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Model } from '@/lib/types';
import { PRESET_COLORS } from '@/lib/constants';
import toast from 'react-hot-toast';

interface ModelDrawerProps {
  model: Model;
  onSaveSettings: (model: Omit<Model, 'subreddits'>) => void;
  onAddSubreddits: (modelId: string, subreddits: { id: string; name: string }[]) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function ModelDrawer({ model, onSaveSettings, onAddSubreddits, onDelete, onClose }: ModelDrawerProps) {
  const [name, setName] = useState(model.name);
  const [color, setColor] = useState(model.color);
  const [titleTemplate, setTitleTemplate] = useState(model.titleTemplate);
  const [bodyTemplate, setBodyTemplate] = useState(model.bodyTemplate);
  const [bulkInput, setBulkInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Pick up changes a teammate saved, but only when the settings themselves changed
  // (not on every sync), so typing isn't interrupted.
  useEffect(() => {
    setName(model.name);
    setColor(model.color);
    setTitleTemplate(model.titleTemplate);
    setBodyTemplate(model.bodyTemplate);
  }, [model.id, model.name, model.color, model.titleTemplate, model.bodyTemplate]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSaveSettings({ id: model.id, name: name.trim(), color, titleTemplate, bodyTemplate });
    toast.success('Model updated');
  };

  const handleBulkAdd = () => {
    const lines = bulkInput
      .split('\n')
      .map((l) => l.trim().replace(/^r\//i, '').toLowerCase())
      .filter((l) => l.length > 0);

    const existingNames = new Set(model.subreddits.map((s) => s.name.toLowerCase()));
    const newOnes = [...new Set(lines)].filter((l) => !existingNames.has(l));

    if (newOnes.length === 0) {
      toast('No new subreddits to add', { icon: 'ℹ️' });
      return;
    }

    onAddSubreddits(model.id, newOnes.map((name) => ({ id: uuidv4(), name })));
    setBulkInput('');
    toast.success(`Added ${newOnes.length} subreddit${newOnes.length > 1 ? 's' : ''}`);
  };

  const handleDelete = () => {
    onDelete(model.id);
    onClose();
    toast.success(`Deleted model "${model.name}"`);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Model Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                    color === c ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-gray-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Title Template */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Title Template
              <span className="ml-1 font-normal text-gray-400">(use {'{{name}}'})</span>
            </label>
            <input
              type="text"
              value={titleTemplate}
              onChange={(e) => setTitleTemplate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Body Template */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Body Template</label>
            <textarea
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white transition-colors"
          >
            Save Changes
          </button>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-800" />

          {/* Bulk Add */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Bulk Add Subreddits
            </label>
            <p className="text-xs text-gray-400 mb-2">One per line, with or without r/</p>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              rows={6}
              placeholder={'gonewild\nr/amateur\nNSFW_GIF'}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
            />
            <button
              onClick={handleBulkAdd}
              disabled={!bulkInput.trim()}
              className="w-full mt-2 py-2 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Subreddits
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-800" />

          {/* Danger Zone */}
          <div>
            <p className="text-xs font-medium text-red-500 mb-2">Danger Zone</p>
            {showDeleteConfirm ? (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 space-y-2">
                <p className="text-xs text-red-700 dark:text-red-400">
                  Delete &quot;{model.name}&quot; and all its subreddits? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-medium text-white transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 px-4 rounded-lg border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                Delete Model
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
