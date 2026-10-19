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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <form
        method="post"
        action="/api/login"
        onSubmit={submit}
        className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white text-sm font-bold">R</div>
          <h1 className="font-semibold text-gray-900 dark:text-white">Reddit Poster</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Enter the team password to open the shared workspace.</p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          name="password"
          placeholder="Password"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium text-white transition-colors"
        >
          {busy ? 'Checking…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
