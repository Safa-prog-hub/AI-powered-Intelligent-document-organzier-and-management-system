import { useState } from 'react';
import { loginUser, registerUser, requestPasswordReset, resetPassword } from '../api/client';
import ThemeToggle from './ThemeToggle.jsx';

const PASSWORD_CHARSETS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%&*?',
];

function secureRandomIndex(max) {
  const range = 0x100000000;
  const limit = Math.floor(range / max) * max;
  const value = new Uint32Array(1);

  do {
    window.crypto.getRandomValues(value);
  } while (value[0] >= limit);

  return value[0] % max;
}

function createStrongPassword(length = 18) {
  const characters = PASSWORD_CHARSETS.map(
    (charset) => charset[secureRandomIndex(charset.length)]
  );
  const allCharacters = PASSWORD_CHARSETS.join('');

  while (characters.length < length) {
    characters.push(allCharacters[secureRandomIndex(allCharacters.length)]);
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join('');
}

/**
 * AuthScreen — sign-in / registration gate.
 *
 * Issues JWTs through the gateway's /api/auth endpoints and stores the
 * authenticated user through the parent component.
 */
export default function AuthScreen({ onAuthenticated, theme, onToggleTheme }) {
  const resetToken = new URLSearchParams(window.location.search).get('resetToken');
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.value,
    }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    try {
      if (mode === 'forgot') {
        const result = await requestPasswordReset(form.email);
        setNotice(result.message);
        return;
      }

      if (mode === 'reset') {
        const result = await resetPassword(resetToken, form.password);
        window.history.replaceState({}, '', window.location.pathname);
        setMode('login');
        setForm((current) => ({ ...current, password: '' }));
        setNotice(result.message);
        return;
      }

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <main className="motion-enter grid w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="hidden flex-col justify-between border-r border-slate-200 bg-slate-50 p-10 lg:flex xl:p-12">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white" aria-hidden="true">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h7l4.25 4.5v12H7a1.5 1.5 0 0 1-1.5-1.5V5.25A1.5 1.5 0 0 1 7 3.75Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 4v5h4M9 13h6M9 16.5h6" />
              </svg>
            </span>
            <span className="text-sm font-bold text-slate-900">AI Document Organizer</span>
          </div>
          <div className="max-w-md py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Secure document workspace</p>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-900">Your files, organized and ready when you need them.</h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">Sign in to manage your documents, extracted information, and expiry reminders.</p>
          </div>
          <p className="text-xs text-slate-500">Private access to your document library</p>
        </section>

        <section className="p-6 sm:p-9 lg:p-10" aria-labelledby="auth-title">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white" aria-hidden="true">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h7l4.25 4.5v12H7a1.5 1.5 0 0 1-1.5-1.5V5.25A1.5 1.5 0 0 1 7 3.75Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 4v5h4M9 13h6M9 16.5h6" />
              </svg>
            </span>
            <span className="text-sm font-bold text-slate-900">AI Document Organizer</span>
          </div>

          {(mode === 'login' || mode === 'register') ? (
            <div className="mb-7 grid grid-cols-2 rounded-lg bg-slate-100 p-1" aria-label="Account access mode">
              {['login', 'register'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError(null);
                    setNotice(null);
                  }}
                  aria-pressed={mode === m}
                  className={`min-h-10 rounded-md px-3 text-sm font-semibold capitalize transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === m ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setNotice(null);
                if (mode === 'reset') window.history.replaceState({}, '', window.location.pathname);
              }}
              className="mb-6 inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <span aria-hidden="true">←</span> Back to sign in
            </button>
          )}

          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
              {mode === 'register' ? 'Get started' : mode === 'forgot' ? 'Account recovery' : mode === 'reset' ? 'Choose a new password' : 'Welcome back'}
            </p>
            <h2 id="auth-title" className="mt-2 text-2xl font-bold text-slate-900">
              {mode === 'login' ? 'Sign in to your account' : mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Set a new password'}
            </h2>
            <p className="mt-2 text-sm leading-5 text-slate-600">
              {mode === 'forgot' ? 'Enter your account email and we’ll send a reset link if it matches an account.' : mode === 'reset' ? 'Choose a password with at least 8 characters.' : 'Access your documents and keep everything organized.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-username" className="mb-1.5 block text-sm font-semibold text-slate-700">Username</label>
                <input id="auth-username" value={form.username} onChange={set('username')} placeholder="Enter your username" required minLength={3} autoComplete="username" className="form-input" />
              </div>
            )}

            {mode !== 'reset' && (
              <div>
                <label htmlFor="auth-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
                <input id="auth-email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required autoComplete="email" className="form-input" />
              </div>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label htmlFor="auth-password" className="text-sm font-semibold text-slate-700">Password</label>
                  {(mode === 'register' || mode === 'reset') && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((current) => ({ ...current, password: createStrongPassword() }));
                        setShowPassword(true);
                        setError(null);
                        setNotice('Strong password suggested. Save it somewhere secure before continuing.');
                      }}
                      className="min-h-9 text-right text-xs font-semibold text-indigo-700 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      Suggest strong password
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input id="auth-password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="form-input pr-16" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-2 my-auto min-h-8 rounded-md px-2 text-xs font-semibold text-slate-600 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            {notice && <div role="status" className="motion-fade rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm leading-5 text-emerald-800">{notice}</div>}
            {error && <div role="alert" className="motion-fade rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-700">{error}</div>}

            <button type="submit" disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Reset password'}
            </button>
          </form>

          {mode === 'login' && (
            <button type="button" onClick={() => { setMode('forgot'); setError(null); setNotice(null); }} className="mt-5 min-h-10 w-full text-center text-sm font-semibold text-indigo-700 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              Forgot password?
            </button>
          )}
          <p className="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">Your account credentials are securely protected.</p>
        </section>
      </main>
    </div>
  );
}