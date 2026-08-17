import SmartSearch from './SmartSearch.jsx';

/**
 * Navbar — top chrome with branding, the Smart Search bar and session
 * controls.
 */
export default function Navbar({ user, onLogout }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-slate-900">
              Intelligent Document Organizer
            </h1>
            <p className="text-[11px] text-slate-400">AI-powered OCR · extraction · semantic grouping</p>
          </div>
        </div>

        <div className="order-3 w-full sm:order-none sm:ml-4 sm:w-auto sm:flex-1">
          <SmartSearch />
        </div>

        <div className="ml-auto flex items-center gap-3">
          {user && (
            <span className="hidden text-xs font-medium text-slate-500 md:block">
              {user.username} · {user.email}
            </span>
          )}
          <button
            onClick={onLogout}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
