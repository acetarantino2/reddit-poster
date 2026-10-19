'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Model } from '@/lib/types';
import { Op } from '@/lib/ops';
import { Button, Dialog, Input, Label } from './ui';
import ColorPicker from './ColorPicker';

interface Props {
  model: Model;
  dispatch: (op: Op) => void;
  onClose: () => void;
  onDeleted: () => void;
}

export default function ModelSettingsDialog({ model, dispatch, onClose, onDeleted }: Props) {
  const [name, setName] = useState(model.name);
  const [color, setColor] = useState(model.color);
  const [confirmText, setConfirmText] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { id, titleTemplate, bodyTemplate } = model;
    dispatch({ type: 'upsertModel', model: { id, name: name.trim(), color, titleTemplate, bodyTemplate } });
    toast.success('Model saved');
    onClose();
  };

  return (
    <Dialog title="Model settings" onClose={onClose} accent={color}>
      <form onSubmit={save} className="space-y-5">
        <label className="block">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div>
          <Label>Colour</Label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-line">
        <p className="text-[13.5px] font-medium">Delete {model.name}</p>
        <p className="mt-0.5 text-[12.5px] text-muted">
          Removes the model with its {model.subreddits.length} subreddits, {model.accounts.length} accounts and post history for everyone.
        </p>
        {confirmText === null ? (
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setConfirmText('')}>
            Delete model
          </Button>
        ) : (
          <div className="mt-3 flex gap-2">
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={`Type ${model.name} to confirm`} className="!h-8" autoFocus />
            <Button
              variant="danger"
              size="sm"
              className="!h-8"
              disabled={confirmText.trim().toLowerCase() !== model.name.trim().toLowerCase()}
              onClick={() => {
                dispatch({ type: 'deleteModel', modelId: model.id });
                toast.success(`Deleted ${model.name}`);
                onClose();
                onDeleted();
              }}
            >
              Delete
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
