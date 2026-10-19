'use client';

import { useEffect, useState } from 'react';

export default function LoginScreen() {
  const [error, setError] = useState('');
  // Set when a no-JavaScript submit bounced back with ?error=1
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read URL once on mount
    if (new URLSearchParams(window.location.search).has('error')) setError('Wrong password');
  }, []);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Read straight from the form so autofilled / pre-typed values are never missed.
    const password = String(new FormData(e.currentTarget).get('password') ?? '');
    if (!password) {
      setError('Enter the password');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.replace('/');
        return;
      }
      setError(res.status === 401 ? 'Wrong password' : 'Something went wrong — try again');
    } catch {
      setError('Can’t reach the server — check your connection');
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        method="post"
        action="/api/login"
        onSubmit={submit}
        className="w-full max-w-sm bg-panel border border-line rounded-xl p-7 space-y-5"
      >
        <div>
          <h1 className="display text-[34px]">Reddit Poster</h1>
          <p className="mt-2 text-muted">Enter the team password to open the shared workspace.</p>
        </div>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          name="password"
          placeholder="Password"
          className="w-full h-10 px-3 rounded-md border border-line-strong bg-panel text-ink placeholder:text-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/15"
        />
        {error && <p className="text-[13px] text-bad">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full h-10 rounded-md bg-ink text-panel font-medium hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
