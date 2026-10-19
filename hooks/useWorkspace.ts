'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AppData } from '@/lib/types';
import { Op, applyLocal } from '@/lib/ops';

const POLL_MS = 10_000;

export type SyncState = 'loading' | 'synced' | 'saving' | 'offline';

/**
 * Shared workspace state, backed by the server database.
 * - Changes show instantly (optimistic), then are saved in order.
 * - Pulls fresh data every few seconds and whenever the tab regains focus,
 *   so what a teammate does shows up without refreshing.
 */
export function useWorkspace() {
  const [data, setData] = useState<AppData>({ models: [] });
  const [state, setState] = useState<SyncState>('loading');
  const queue = useRef<Op[]>([]);
  const flushing = useRef(false);
  const fetchSeq = useRef(0);
  const lastLocalChange = useRef(0);

  const handleUnauthorized = () => {
    window.location.reload(); // server will show the login screen
  };

  const refresh = useCallback(async () => {
    const seq = ++fetchSeq.current;
    const startedAt = Date.now();
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (res.status === 401) return handleUnauthorized();
      if (!res.ok) throw new Error(String(res.status));
      const fresh = (await res.json()) as AppData;
      // Ignore stale responses, or ones that started before an unsaved local change.
      if (seq !== fetchSeq.current || queue.current.length || startedAt < lastLocalChange.current) return;
      setData(fresh);
      setState('synced');
    } catch {
      if (seq === fetchSeq.current) setState((s) => (s === 'saving' ? s : 'offline'));
    }
  }, []);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    setState('saving');
    while (queue.current.length) {
      const op = queue.current[0];
      try {
        const res = await fetch('/api/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op),
        });
        if (res.status === 401) return handleUnauthorized();
        if (res.status >= 400 && res.status < 500) {
          queue.current.shift(); // bad op — drop it
          toast.error('Couldn’t save that change');
          continue;
        }
        if (!res.ok) throw new Error(String(res.status));
        queue.current.shift();
      } catch {
        // network/server problem — keep the op and retry shortly
        setState('offline');
        flushing.current = false;
        setTimeout(flush, 3000);
        return;
      }
    }
    flushing.current = false;
    lastLocalChange.current = 0;
    await refresh();
  }, [refresh]);

  const dispatch = useCallback(
    (op: Op) => {
      lastLocalChange.current = Date.now();
      setData((d) => applyLocal(d, op));
      queue.current.push(op);
      flush();
    },
    [flush]
  );

  useEffect(() => {
    refresh();
    const tick = () => {
      if (document.visibilityState === 'visible' && !queue.current.length) refresh();
    };
    const id = setInterval(tick, POLL_MS);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    const warn = (e: BeforeUnloadEvent) => {
      if (queue.current.length) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('beforeunload', warn);
    };
  }, [refresh]);

  return { data, state, dispatch, refresh };
}
