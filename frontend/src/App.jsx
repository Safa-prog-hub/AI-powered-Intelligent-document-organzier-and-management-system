import { useEffect, useState } from 'react';
import { DocumentProvider, useDocuments } from './context/DocumentContext';
import AuthScreen from './components/AuthScreen.jsx';
import Navbar from './components/Navbar.jsx';
import UploadZone from './components/UploadZone.jsx';
import DocumentGrid from './components/DocumentGrid.jsx';
import ExpiryAlerts from './components/ExpiryAlerts.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import { requestNotificationPermission, showNotification } from './services/notifications.js';
/** Restore a previous session from localStorage (if any). */
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('doc_organizer_user') || 'null');
  } catch {
    return null;
  }
}

function getStoredTheme() {
  const theme = localStorage.getItem('doc_organizer_theme') === 'dark' ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', theme === 'dark');
  return theme;
}

/**
 * Dashboard — three primary zones (Phase 7):
 *   1. Upload Matrix        → UploadZone (drag & drop + AI processing states)
 *   2. Organized Library    → DocumentGrid (semantic category groupings)
 *   3. Notifications/Search → ExpiryAlerts sidebar + SmartSearch in navbar
 */
function Dashboard() {
  const { documents, expiring, loading, loadError, searchQuery } = useDocuments();
  const processedCount = documents.filter((doc) => doc.processingStatus === 'completed').length;

  return (
    <div id="workspace-top" className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_304px] 2xl:gap-8">
        <main className="motion-enter min-w-0 space-y-6">
          <section aria-labelledby="workspace-title">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Document workspace</p>
            <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h1 id="workspace-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Your documents
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
                  Upload, find, and manage your files in one organized workspace.
                </p>
              </div>
              <a href="#upload" className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:self-auto">
                <span aria-hidden="true">↑</span>
                Upload documents
              </a>
            </div>
          </section>

          <section aria-label="Document overview" className="motion-stagger grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="surface flex items-center gap-4 p-4 sm:p-5">
              <span className="metric-icon bg-indigo-50 text-indigo-700" aria-hidden="true">▤</span>
              <div>
                <p className="text-xs font-medium text-slate-500">Documents shown</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{documents.length}</p>
              </div>
            </div>
            <div className="surface flex items-center gap-4 p-4 sm:p-5">
              <span className="metric-icon bg-emerald-50 text-emerald-700" aria-hidden="true">✓</span>
              <div>
                <p className="text-xs font-medium text-slate-500">Processed</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{processedCount}</p>
              </div>
            </div>
            <div className="surface flex items-center gap-4 p-4 sm:p-5">
              <span className="metric-icon bg-amber-50 text-amber-700" aria-hidden="true">!</span>
              <div>
                <p className="text-xs font-medium text-slate-500">Expiring soon</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{expiring.length}</p>
              </div>
            </div>
          </section>

          <section id="upload" aria-label="Upload documents" className="scroll-mt-24">
            <UploadZone />
          </section>

          <section id="documents" aria-label="Document library" className="scroll-mt-24">
            <DocumentGrid documents={documents} loading={loading} error={loadError} searchQuery={searchQuery} />
          </section>
        </main>

        <aside id="expiry-alerts" className="motion-enter scroll-mt-24 xl:sticky xl:top-24">
          <ExpiryAlerts />
        </aside>
      </div>
    </div>
  );
}

function WorkspaceSidebar({ user, onLogout, onNavigate, isOpen, onClose }) {
  const [activeTarget, setActiveTarget] = useState(user.role === 'admin' ? 'admin-overview' : 'workspace-top');
  const isAdmin = user.role === 'admin';
  const items = isAdmin
    ? [
        { label: 'Overview', target: 'admin-overview', icon: '▦' },
        { label: 'Recent activity', target: 'admin-activity', icon: '◷' },
        { label: 'Users', target: 'admin-users', icon: '♙' },
      ]
    : [
        { label: 'Dashboard', target: 'workspace-top', icon: '⌂' },
        { label: 'Documents', target: 'documents', icon: '▤' },
        { label: 'Smart search', target: 'search', icon: '⌕' },
        { label: 'Expiry alerts', target: 'expiry-alerts', icon: '◷' },
      ];

  return (
    <>
      {isOpen && <button type="button" aria-label="Close navigation" onClick={onClose} className="motion-fade fixed inset-0 z-30 bg-slate-950/35 md:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform duration-200 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white" aria-hidden="true">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h7l4.25 4.5v12H7a1.5 1.5 0 0 1-1.5-1.5V5.25A1.5 1.5 0 0 1 7 3.75Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 4v5h4M9 13h6M9 16.5h6" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-5 text-slate-900">AI Document</p>
            <p className="text-xs font-medium text-slate-500">Organizer</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:hidden" aria-label="Close navigation" title="Close navigation">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <p className="mb-2 mt-9 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Workspace</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {items.map((item, index) => (
            <button
              key={item.target}
              type="button"
              onClick={() => { setActiveTarget(item.target); onNavigate(item.target); }}
              className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${activeTarget === item.target ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="w-5 text-center text-lg leading-none" aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
          {!isAdmin && (
            <button type="button" onClick={() => { setActiveTarget('upload'); onNavigate('upload'); }} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <span className="w-5 text-center text-lg leading-none" aria-hidden="true">↑</span>
              Upload documents
            </button>
          )}
        </nav>

        <div className="mt-auto border-t border-slate-200 pt-4">
          <div className="flex min-w-0 items-center gap-3 px-2 pb-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700" aria-hidden="true">
              {(user.username || 'U').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{user.username || 'Account'}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <button type="button" onClick={onLogout} className="sidebar-signout flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500">
            <span className="w-5 text-center" aria-hidden="true">↪</span>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function Workspace({ user, onLogout, theme, onToggleTheme }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigate = (target) => {
    setNavigationOpen(false);
    if (target === 'search') {
      document.getElementById('document-search')?.focus();
      return;
    }
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkspaceSidebar user={user} onLogout={onLogout} onNavigate={navigate} isOpen={navigationOpen} onClose={() => setNavigationOpen(false)} />
      <div className="min-h-screen md:pl-[264px]">
        <Navbar user={user} onMenuClick={() => setNavigationOpen(true)} theme={theme} onToggleTheme={onToggleTheme} />
        {user.role === 'admin' ? <AdminDashboard /> : <Dashboard />}
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(getStoredTheme);
  const [user, setUser] = useState(() =>
    new URLSearchParams(window.location.search).has('resetToken') ? null : getStoredUser()
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('doc_organizer_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');

  if (!user) {
    return (
      <AuthScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        onAuthenticated={async (u) => {
          localStorage.setItem('doc_organizer_user', JSON.stringify(u));
          setUser(u);
          await requestNotificationPermission();
          showNotification('ROSP Test Notification', {
            body: 'System notifications are working successfully! 🔔',
          });
        }}
      />
    );
  }

  return (
    <DocumentProvider>
      <Workspace
        user={user}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={() => {
          localStorage.removeItem('doc_organizer_token');
          localStorage.removeItem('doc_organizer_user');
          setUser(null);
        }}
      />
    </DocumentProvider>
  );
}
