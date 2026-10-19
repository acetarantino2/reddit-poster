'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { AppData } from '@/lib/types';
import { Op, parseSubredditList } from '@/lib/ops';
import { Button, Dialog, Empty, Label, Tag, Textarea, cx } from './ui';

interface Props {
  data: AppData;
  dispatch: (op: Op) => void;
}

export default function StandardView({ data, dispatch }: Props) {
  const [text, setText] = useState('');
  const [pushing, setPushing] = useState(false);
  const { standard, models } = data;

  const have = new Set(standard.map((s) => s.name.toLowerCase()));
  const parsed = parseSubredditList(text);
  const fresh = parsed.filter((n) => !have.has(n.toLowerCase()));

  const missingFor = (m: AppData['models'][number]) => {
    const names = new Set(m.subreddits.map((s) => s.name.toLowerCase()));
    return standard.filter((s) => !names.has(s.name.toLowerCase()));
  };
  const behind = models.map((m) => ({ model: m, missing: missingFor(m) })).filter((x) => x.missing.length);

  const add = () => {
    if (!fresh.length) return;
    dispatch({ type: 'addStandard', subreddits: fresh.map((name) => ({ id: uuidv4(), name })) });
    toast.success(`Added ${fresh.length} to the standard list`);
    setText('');
  };

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8" style={{ '--model': 'var(--ink)', '--on-model': 'var(--panel)' } as React.CSSProperties}>
      <h1 className="display text-[40px]">Standard subreddits</h1>
      <p className="mt-2 max-w-xl text-muted">
        Every new model starts with this list. Changing it doesn’t touch existing models; push new subs to them below when you want.
      </p>

      <div className="mt-8 grid md:grid-cols-[minmax(0,1fr)_280px] gap-8 items-start">
        <section className="rounded-lg border border-line bg-panel overflow-hidden order-2 md:order-1">
          <div className="flex items-center justify-between px-4 h-10 border-b border-line">
            <span className="text-[13px] text-muted num">{standard.length} subreddits</span>
            {behind.length > 0 && (
              <Button size="sm" variant="quiet" onClick={() => setPushing(true)}>
                Add to existing models
              </Button>
            )}
          </div>
          {standard.length === 0 ? (
            <Empty title="The list is empty">Paste the subreddits you use for every model.</Empty>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {standard.map((s) => (
                <li key={s.id} className="group flex items-center gap-3 px-4 h-10 border-b border-line last:border-b-0 hover:bg-raised/50">
                  <a href={`https://www.reddit.com/r/${s.name}`} target="_blank" rel="noreferrer" className="flex-1 truncate hover:underline">
                    r/{s.name}
                  </a>
                  <button
                    onClick={() => dispatch({ type: 'updateStandard', id: s.id, verified: !s.verified })}
                    className={cx('text-[12px] rounded px-1.5 py-px', s.verified ? '' : 'text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-ink')}
                    title="Toggle verified-only"
                  >
                    {s.verified ? <Tag tone="model">Verified</Tag> : 'Mark verified'}
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'removeStandard', id: s.id })}
                    className="p-1 rounded text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-bad"
                    aria-label={`Remove r/${s.name} from the standard list`}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="order-1 md:order-2 md:sticky md:top-6">
          <label className="block">
            <Label hint="one per line">Add to the list</Label>
            <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'r/example\nanothersub'} className="font-mono text-[13px]" />
          </label>
          <p className="mt-2 text-[12.5px] text-muted num">
            {parsed.length ? `${fresh.length} new${parsed.length - fresh.length ? `, ${parsed.length - fresh.length} already on the list` : ''}` : ' '}
          </p>
          <Button variant="primary" className="mt-2 w-full" disabled={!fresh.length} onClick={add}>
            Add {fresh.length || ''} to standard list
          </Button>
        </section>
      </div>

      {pushing && (
        <Dialog title="Add standard subs to existing models" onClose={() => setPushing(false)}>
          <p className="text-[13.5px] text-muted mb-3">Only subs a model doesn’t have yet are added. Nothing is removed.</p>
          <ul className="rounded-lg border border-line divide-y divide-line">
            {behind.map(({ model, missing }) => (
              <li key={model.id} className="flex items-center gap-3 px-3 h-10">
                <span className="size-2 rounded-full" style={{ backgroundColor: model.color }} />
                <span className="flex-1 truncate">{model.name}</span>
                <span className="text-[12.5px] text-muted num">{missing.length} missing</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="quiet" onClick={() => setPushing(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                let total = 0;
                for (const { model, missing } of behind) {
                  total += missing.length;
                  dispatch({
                    type: 'addSubreddits',
                    modelId: model.id,
                    subreddits: missing.map((s) => ({ id: uuidv4(), name: s.name, ...(s.verified ? { verified: true } : {}) })),
                  });
                }
                toast.success(`Added ${total} subreddits across ${behind.length} model${behind.length === 1 ? '' : 's'}`);
                setPushing(false);
              }}
            >
              Add to {behind.length} model{behind.length === 1 ? '' : 's'}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
