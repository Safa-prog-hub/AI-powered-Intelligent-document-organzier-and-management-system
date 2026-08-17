import { useState } from 'react';
import { loginUser, registerUser } from '../api/client';

/**
 * AuthScreen — minimal sign-in / registration gate. Issues JWTs through the
 * gateway's /api/auth endpoints and stores the token in localStorage so the
 * rest of the dashboard can call protected endpoints.
 */
export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : { username: form.username, email: form.email, password: form.password };
      const user = mode === 'login' ? await loginUser(payload) : await registerUser(payload);
      onAuthenticated(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-brand-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Intelligent Document Organizer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload any document — the AI extracts, classifies and organizes it.
          </p>
        </div>

        <div className="card p-6">
          <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`rounded-md py-1.5 capitalize transition ${
                  mode === m ? 'bg-white text-brand-700 shadow' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <input
                value={form.username}
                onChange={set('username')}
                placeholder="Username"
                required
                minLength={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            )}
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="Email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="Password (min 8 characters)"
              required
              minLength={8}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white shadow transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Demo system — credentials are stored locally with bcrypt + JWT.
        </p>
      </div>
    </div>
  );
}
