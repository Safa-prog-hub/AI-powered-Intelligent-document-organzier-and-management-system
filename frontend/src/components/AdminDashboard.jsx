import { useEffect, useState } from 'react';
import {
  fetchAdminStats,
  fetchAdminActivity,
  fetchAdminUsers,
} from '../api/client';

const CATEGORY_COLORS = {
  'ID Proof': 'bg-indigo-50 text-indigo-700',
  Finance: 'bg-emerald-100 text-emerald-700',
  Insurance: 'bg-sky-100 text-sky-700',
  Education: 'bg-amber-100 text-amber-700',
  Others: 'bg-slate-100 text-slate-600',
};

const ACTION_STYLES = {
  upload: 'bg-indigo-50 text-indigo-700',
  rename: 'bg-indigo-100 text-indigo-700',
  preview: 'bg-sky-100 text-sky-700',
  download: 'bg-emerald-100 text-emerald-700',
  delete: 'bg-rose-100 text-rose-700',
};

function formatAction(action) {
  return action ? action.charAt(0).toUpperCase() + action.slice(1) : 'Unknown';
}

function formatDate(date) {
  if (!date) return '—';

  return new Date(date).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function StatCard({ title, value, icon, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-xl text-indigo-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadAdminData() {
      try {
        setLoading(true);
        setError('');

        const [statsData, activityData, usersData] = await Promise.all([
          fetchAdminStats(),
          fetchAdminActivity(20),
          fetchAdminUsers(),
        ]);

        if (!mounted) return;

        setStats(statsData);
        setActivity(activityData || []);
        setUsers(usersData || []);
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);

        if (mounted) {
          setError(
            err.message || 'Could not load admin dashboard data.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAdminData();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="surface p-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" role="status" aria-label="Loading admin dashboard" />
            <p className="mt-4 text-sm font-medium text-slate-600">
              Loading admin dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="surface border-rose-200 p-6" role="alert">
            <h2 className="text-lg font-bold text-rose-700">
              Unable to load admin dashboard
            </h2>

            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const overview = stats?.stats || {};

  const categories = stats?.categories || [];

  const completed = overview.completedDocuments || 0;
  const processing = overview.processingDocuments || 0;
  const failed = overview.failedDocuments || 0;

  const totalProcessing =
    completed + processing + failed;

  return (
    <div className="motion-enter min-h-screen bg-slate-50">
      <div id="workspace-top" className="mx-auto max-w-[1600px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                <span aria-hidden="true">◆</span>
                Admin Dashboard
              </div>

              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                ROSP Administration
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Monitor users, documents, processing activity, and system usage.
              </p>
            </div>

          </div>
        </div>

        {/* Overview */}
        <section id="admin-overview" className="scroll-mt-24">
          <SectionHeader
            title="Overview"
            description="A quick summary of the document organizer."
          />

          <div className="motion-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Users"
              value={overview.totalUsers || 0}
              icon="👥"
              description="Registered accounts"
            />

            <StatCard
              title="Total Documents"
              value={overview.totalDocuments || 0}
              icon="📄"
              description="Documents stored"
            />

            <StatCard
              title="Completed"
              value={completed}
              icon="✓"
              description="Successfully processed"
            />

            <StatCard
              title="Failed"
              value={failed}
              icon="!"
              description="Processing failures"
            />
          </div>
        </section>

        {/* Statistics */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Categories */}
          <section className="surface p-4 sm:p-5">
            <SectionHeader
              title="Documents by Category"
              description="Distribution of stored documents."
            />

            {categories.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                No category data available.
              </div>
            ) : (
              <div className="motion-stagger space-y-4">
                {categories.map((item) => {
                  const percentage =
                    overview.totalDocuments > 0
                      ? Math.round(
                          (item.count / overview.totalDocuments) * 100
                        )
                      : 0;

                  const color =
                    CATEGORY_COLORS[item.category] ||
                    CATEGORY_COLORS.Others;

                  return (
                    <div key={item.category}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}
                        >
                          {item.category}
                        </span>

                        <span className="text-sm font-semibold text-slate-700">
                          {item.count}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all"
                          style={{
                            width: `${Math.max(percentage, item.count > 0 ? 3 : 0)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Processing */}
          <section className="surface p-4 sm:p-5">
            <SectionHeader
              title="Processing Status"
              description="Current document processing state."
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Completed
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {completed}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Processing
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-700">
                  {processing}
                </p>
              </div>

              <div className="rounded-xl bg-rose-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                  Failed
                </p>
                <p className="mt-2 text-2xl font-bold text-rose-700">
                  {failed}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">
                  Processing overview
                </span>

                <span className="font-semibold text-slate-700">
                  {totalProcessing} documents
                </span>
              </div>

              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                {totalProcessing > 0 && (
                  <>
                    <div
                      className="bg-emerald-500"
                      style={{
                        width: `${(completed / totalProcessing) * 100}%`,
                      }}
                    />

                    <div
                      className="bg-amber-400"
                      style={{
                        width: `${(processing / totalProcessing) * 100}%`,
                      }}
                    />

                    <div
                      className="bg-rose-400"
                      style={{
                        width: `${(failed / totalProcessing) * 100}%`,
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Activity */}
        <section id="admin-activity" className="surface scroll-mt-24 overflow-hidden">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <SectionHeader
              title="Recent Activity"
              description="Latest actions performed in ROSP."
            />
          </div>

          {activity.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No activity recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      User
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Document
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Time
                    </th>
                  </tr>
                </thead>

                <tbody className="motion-stagger">
                  {activity.map((item) => (
                    <tr
                      key={item._id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            {item.userId?.username || 'Unknown user'}
                          </p>

                          <p className="text-xs text-slate-400">
                            {item.userId?.email || '—'}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            ACTION_STYLES[item.action] ||
                            'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {formatAction(item.action)}
                        </span>
                      </td>

                      <td className="max-w-[260px] px-5 py-4">
                        <p
                          className="truncate text-sm font-medium text-slate-700"
                          title={item.documentName || ''}
                        >
                          {item.documentName || '—'}
                        </p>

                        {item.details && (
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {item.details}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatDate(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Users */}
        <section id="admin-users" className="surface scroll-mt-24 overflow-hidden">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <SectionHeader
              title="Users"
              description="Registered ROSP accounts."
            />
          </div>

          {users.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Username
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Email
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Role
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Joined
                    </th>
                  </tr>
                </thead>

                <tbody className="motion-stagger">
                  {users.map((item) => (
                    <tr
                      key={item._id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {item.username}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {item.email}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.role === 'admin'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatDate(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}