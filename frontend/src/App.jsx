import { useState } from 'react';
import { DocumentProvider, useDocuments } from './context/DocumentContext';
import AuthScreen from './components/AuthScreen.jsx';
import Navbar from './components/Navbar.jsx';
import UploadZone from './components/UploadZone.jsx';
import DocumentGrid from './components/DocumentGrid.jsx';
import ExpiryAlerts from './components/ExpiryAlerts.jsx';
import { requestNotificationPermission, showNotification } from './services/notifications.js';
/** Restore a previous session from localStorage (if any). */
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('doc_organizer_user') || 'null');
  } catch {
    return null;
  }
}

/**
 * Dashboard — three primary zones (Phase 7):
 *   1. Upload Matrix        → UploadZone (drag & drop + AI processing states)
 *   2. Organized Library    → DocumentGrid (semantic category groupings)
 *   3. Notifications/Search → ExpiryAlerts sidebar + SmartSearch in navbar
 */
function Dashboard() {
  const { documents, loading, loadError } = useDocuments();

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* Main column — upload matrix + document library */}
          <main className="space-y-6">
            <UploadZone />
            <DocumentGrid documents={documents} loading={loading} error={loadError} />
          </main>

          {/* Sidebar — expiry detection & reminders */}
          <aside>
            <ExpiryAlerts />
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(getStoredUser);

  if (!user) {
    return (
      <AuthScreen
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
      <Navbar
        user={user}
        onLogout={() => {
          localStorage.removeItem('doc_organizer_token');
          localStorage.removeItem('doc_organizer_user');
          setUser(null);
        }}
      />
      <Dashboard />
    </DocumentProvider>
  );
}
