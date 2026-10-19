'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { AccountRole, AccountStatus, Model, Post, RedditAccount } from '@/lib/types';
import { Op } from '@/lib/ops';
import { userUrl } from '@/lib/reddit';
import { Button, Dialog, Empty, Input, Label, Select, Tag, ago, cx } from './ui';

export const ROLE_LABEL: Record<AccountRole, string> = { main: 'Main', persona: 'Persona', verified: 'Verified' };
const ROLE_HELP: Record<AccountRole, string> = {
  main: 'The model’s own Reddit account',
  persona: 'Extra account using a different person’s photos',
  verified: 'High-quality account for verified-only subs',
};
export const STATUS_LABEL: Record<AccountStatus, string> = {
  active: 'Active',
  shadowbanned: 'Shadowbanned',
  suspended: 'Suspended',
  retired: 'Retired',
};
const STATUS_TONE: Record<AccountStatus, 'ok' | 'warn' | 'bad' | 'plain'> = {
  active: 'ok',
  shadowbanned: 'warn',
  suspended: 'bad',
  retired: 'plain',
};
const ROLE_ORDER: AccountRole[] = ['main', 'verified', 'persona'];

interface Props {
  model: Model;
  posts: Post[];
  dispatch: (op: Op) => void;
}

export default function AccountsTab({ model, posts, dispatch }: Props) {
  const [editing, setEditing] = useState<RedditAccount | 'new' | null>(null);

  const accounts = [...model.accounts].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

  const statsFor = (id: string) => {
    const mine = posts.filter((p) => p.accountId === id);
    const checked = mine.filter((p) => p.stats && p.stats.state !== 'unknown');
    const removed = checked.filter((p) => p.stats?.state === 'removed').length;
    const scores = checked.map((p) => p.stats?.score).filter((n): n is number => typeof n === 'number');
    return {
      count: mine.length,
      last: mine[0]?.postedAt ?? null,
      removedPct: checked.length ? Math.round((removed / checked.length) * 100) : null,
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    };
  };

  if (!accounts.length) {
    return (
      <>
        <Empty title={`No accounts for ${model.name} yet`} action={<Button variant="primary" onClick={() => setEditing('new')}>Add account</Button>}>
          Add the main account, persona accounts and the verified account so posts are logged against the right one.
        </Empty>
        {editing && <AccountDialog model={model} account={null} dispatch={dispatch} onClose={() => setEditing(null)} />}
      </>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setEditing('new')}>
          Add account
        </Button>
      </div>
      <div className="rounded-lg border border-line bg-panel overflow-hidden">
        <div className="hidden md:grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_repeat(3,minmax(0,.7fr))_auto] gap-4 px-4 h-9 items-center border-b border-line text-[12px] text-faint">
          <span>Account</span>
          <span>Status</span>
          <span className="text-right">Posts</span>
          <span className="text-right">Avg score</span>
          <span className="text-right">Removed</span>
          <span className="w-7" />
        </div>
        <ul>
          {accounts.map((a) => {
            const s = statsFor(a.id);
            return (
              <li
                key={a.id}
                className={cx(
                  'grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_repeat(3,minmax(0,.7fr))_auto] gap-x-4 gap-y-1 px-4 py-3 items-center border-b border-line last:border-b-0',
                  a.status === 'retired' && 'opacity-60'
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <a href={userUrl(a.username)} target="_blank" rel="noreferrer" className="font-medium truncate hover:underline">
                      u/{a.username}
                    </a>
                    <Tag tone={a.role === 'verified' ? 'model' : 'plain'}>{ROLE_LABEL[a.role]}</Tag>
                  </div>
                  <p className="text-[12.5px] text-muted truncate">
                    {[a.persona, s.last ? `last post ${ago(s.last)}` : 'no posts yet', a.notes].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="hidden md:block">
                  <Select
                    aria-label={`Status of u/${a.username}`}
                    value={a.status}
                    onChange={(e) => {
                      dispatch({ type: 'upsertAccount', modelId: model.id, account: { ...a, status: e.target.value as AccountStatus } });
                      toast.success(`u/${a.username} marked ${STATUS_LABEL[e.target.value as AccountStatus].toLowerCase()}`);
                    }}
                    className={cx('!h-8 !w-40 !text-[13px]', a.status !== 'active' && (a.status === 'retired' ? '' : a.status === 'shadowbanned' ? '!text-warn' : '!text-bad'))}
                  >
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
                <span className="hidden md:block num text-right">{s.count}</span>
                <span className="hidden md:block num text-right">{s.avg ?? '–'}</span>
                <span className={cx('hidden md:block num text-right', s.removedPct !== null && s.removedPct > 25 && 'text-bad')}>
                  {s.removedPct === null ? '–' : `${s.removedPct}%`}
                </span>
                <div className="flex items-center gap-2 justify-end">
                  <span className="md:hidden"><Tag tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Tag></span>
                  <button onClick={() => setEditing(a)} className="p-1.5 rounded text-faint hover:text-ink hover:bg-raised" aria-label={`Edit u/${a.username}`}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="12.5" cy="8" r="1.3" /></svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {editing && (
        <AccountDialog model={model} account={editing === 'new' ? null : editing} dispatch={dispatch} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function AccountDialog({ model, account, dispatch, onClose }: { model: Model; account: RedditAccount | null; dispatch: (op: Op) => void; onClose: () => void }) {
  const [username, setUsername] = useState(account?.username ?? '');
  const [role, setRole] = useState<AccountRole>(account?.role ?? (model.accounts.some((a) => a.role === 'main') ? 'persona' : 'main'));
  const [persona, setPersona] = useState(account?.persona ?? '');
  const [status, setStatus] = useState<AccountStatus>(account?.status ?? 'active');
  const [notes, setNotes] = useState(account?.notes ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const clean = username.trim().replace(/^\/?u\//i, '').replace(/^https?:\/\/(www\.)?reddit\.com\/(u|user)\//i, '').replace(/\/.*$/, '');
  const valid = /^[A-Za-z0-9_-]{3,20}$/.test(clean);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    dispatch({
      type: 'upsertAccount',
      modelId: model.id,
      account: {
        id: account?.id ?? uuidv4(),
        username: clean,
        role,
        status,
        ...(role === 'persona' && persona.trim() ? { persona: persona.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
    });
    toast.success(account ? 'Account saved' : `Added u/${clean}`);
    onClose();
  };

  return (
    <Dialog title={account ? `u/${account.username}` : 'Add account'} onClose={onClose} accent={model.color}>
      <form onSubmit={save} className="space-y-4">
        <label className="block">
          <Label>Reddit username</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="u/username" />
          {username && !valid && <span className="mt-1 block text-[12.5px] text-bad">Usernames are 3–20 letters, numbers, - or _</span>}
        </label>

        <fieldset>
          <Label>Type</Label>
          <div className="grid gap-1.5">
            {(['main', 'persona', 'verified'] as AccountRole[]).map((r) => (
              <label key={r} className={cx('flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer', role === r ? 'border-model bg-model/8' : 'border-line hover:bg-raised/60')}>
                <input type="radio" name="role" className="size-4 accent-[var(--model)]" checked={role === r} onChange={() => setRole(r)} />
                <span>
                  <span className="block text-[13.5px] font-medium">{ROLE_LABEL[r]}</span>
                  <span className="block text-[12.5px] text-muted">{ROLE_HELP[r]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {role === 'persona' && (
          <label className="block">
            <Label hint="whose photos this account uses">Persona</Label>
            <Input value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="e.g. Amy set" />
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as AccountStatus)}>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="karma, age, email…" />
          </label>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {account &&
            (confirmDelete ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  dispatch({ type: 'deleteAccount', modelId: model.id, accountId: account.id });
                  toast.success(`Removed u/${account.username}`);
                  onClose();
                }}
              >
                Confirm remove
              </Button>
            ) : (
              <Button type="button" variant="quiet" className="!text-bad" onClick={() => setConfirmDelete(true)}>
                Remove account
              </Button>
            ))}
          <div className="flex-1" />
          <Button type="button" variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!valid}>
            {account ? 'Save' : 'Add account'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
