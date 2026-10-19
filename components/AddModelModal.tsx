'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StandardSub } from '@/lib/types';
import { ModelSettings, NewSub } from '@/lib/ops';
import { PRESET_COLORS, DEFAULT_TITLE_TEMPLATE, DEFAULT_BODY_TEMPLATE } from '@/lib/constants';
import { Button, Dialog, Input, Label, modelVars } from './ui';
import ColorPicker from './ColorPicker';

interface AddModelModalProps {
  standard: StandardSub[];
  onCreate: (settings: ModelSettings, subs: NewSub[]) => void;
  onClose: () => void;
}

export default function AddModelModal({ standard, onCreate, onClose }: AddModelModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(() => PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
  const [useStandard, setUseStandard] = useState(standard.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const subs = useStandard ? standard.map((s) => ({ id: uuidv4(), name: s.name, ...(s.verified ? { verified: true } : {}) })) : [];
    onCreate(
      { id: uuidv4(), name: name.trim(), color, titleTemplate: DEFAULT_TITLE_TEMPLATE, bodyTemplate: DEFAULT_BODY_TEMPLATE },
      subs
    );
    onClose();
  };

  return (
    <Dialog title="Add model" onClose={onClose} accent={color}>
      <form onSubmit={handleSubmit} className="space-y-5" style={modelVars(color)}>
        <label className="block">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jess" required />
        </label>

        <div>
          <Label>Colour</Label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-line p-3 cursor-pointer has-[:disabled]:opacity-60 has-[:disabled]:cursor-default">
          <input
            type="checkbox"
            className="mt-0.5 accent-[var(--model)] size-4"
            checked={useStandard}
            disabled={standard.length === 0}
            onChange={(e) => setUseStandard(e.target.checked)}
          />
          <span>
            <span className="block text-[13.5px] font-medium">Start with the standard subreddits</span>
            <span className="block text-[12.5px] text-muted">
              {standard.length
                ? `Adds all ${standard.length} subreddits from your standard list.`
                : 'Your standard list is empty. Set it up under Standard subreddits.'}
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            Add model
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
