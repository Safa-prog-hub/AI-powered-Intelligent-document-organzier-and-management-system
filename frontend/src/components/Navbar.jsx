import SmartSearch from './SmartSearch.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export default function Navbar({ user, onMenuClick, theme, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[68px] max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button type="button" onClick={onMenuClick} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:hidden" aria-label="Open navigation" title="Open navigation">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="hidden min-w-[148px] sm:block">
          <p className="text-sm font-semibold text-slate-900">Workspace</p>
          <p className="mt-0.5 text-xs text-slate-500">Documents and activity</p>
        </div>
        <div className="min-w-0 flex-1 sm:ml-auto sm:max-w-xl">
          <SmartSearch />
        </div>
        <div className="hidden max-w-[180px] shrink-0 items-center gap-2.5 lg:flex">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700" aria-hidden="true">
            {(user.username || 'U').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-800">{user.username}</p>
            <p className="truncate text-[11px] text-slate-500">{user.email}</p>
          </div>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}