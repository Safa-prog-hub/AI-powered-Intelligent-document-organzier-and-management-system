import { useState } from 'react';
import { loginUser, registerUser } from '../api/client';

/**
 * AuthScreen — sign-in / registration gate.
 *
 * Issues JWTs through the gateway's /api/auth endpoints and stores the
 * authenticated user through the parent component.
 */
export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.value,
    }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const payload =
        mode === 'login'
          ? {
              email: form.email,
              password: form.password,
            }
          : {
              username: form.username,
              email: form.email,
              password: form.password,
            };

      const user =
        mode === 'login'
          ? await loginUser(payload)
          : await registerUser(payload);

      onAuthenticated(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4 py-8">

      {/* Decorative background shapes */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="relative w-full max-w-md">

        {/* Brand */}
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200">
            <svg
              className="h-9 w-9"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
              />
            </svg>
          </div>

          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">
            Intelligent Document Organizer
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Upload documents and let ROSP extract, classify and organize them
            automatically.
          </p>
        </div>

        {/* Auth card */}
        <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-xl shadow-violet-100/60 sm:p-7">

          {/* Login / Register switch */}
          <div className="mb-6 rounded-xl bg-violet-50 p-1">
            <div className="grid grid-cols-2 gap-1">
              {['login', 'register'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={`rounded-lg py-2 text-sm font-bold capitalize transition ${
                    mode === m
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'text-slate-500 hover:text-violet-600'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">

            {/* Username */}
            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">
                  Username
                </label>

                <input
                  value={form.username}
                  onChange={set('username')}
                  placeholder="Enter your username"
                  required
                  minLength={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">
                Email
              </label>

              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="Enter your email"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">
                Password
              </label>

              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3">
                <p className="text-xs font-semibold leading-5 text-rose-600">
                  {error}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-5 text-center">
          <p className="text-[11px] text-slate-400">
            Demo system • Credentials are protected with bcrypt + JWT
          </p>
        </div>
      </div>
    </div>
  );
}