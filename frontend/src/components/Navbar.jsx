import SmartSearch from './SmartSearch.jsx';

export default function Navbar({ user, onLogout }) {
  return (
    <header className="sticky top-0 z-20 border-b border-violet-200 bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">

        {/* Logo + Brand */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3.75h7.5l4.5 4.5v12H6.75a1.5 1.5 0 0 1-1.5-1.5v-13.5a1.5 1.5 0 0 1 1.5-1.5Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.25 3.75v4.5h4.5"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6M9 15.5h4"
              />
            </svg>
          </div>

          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">
              </h1>

              
            </div>

            <p className="hidden text-[14px] text-violet-100 sm:block">
              Intelligent Document Organizer
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="min-w-0 flex-1">
          <SmartSearch />
        </div>

        {/* User */}
        <div className="flex shrink-0 items-center gap-3">
          {user && (
            <div className="hidden items-center gap-2.5 lg:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-violet-700 shadow-sm">
                {(user.username || 'U').charAt(0).toUpperCase()}
              </div>

              <div className="max-w-[150px] leading-tight">
                <p className="truncate text-xs font-semibold text-white">
                  {user.username}
                </p>

                <p className="truncate text-[10px] text-violet-200">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          {/* Mobile avatar */}
          {user && (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-violet-700 shadow-sm lg:hidden">
              {(user.username || 'U').charAt(0).toUpperCase()}
            </div>
          )}

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}