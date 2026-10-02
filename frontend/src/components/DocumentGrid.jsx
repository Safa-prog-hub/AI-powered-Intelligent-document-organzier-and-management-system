import { useMemo, useState } from 'react';
import { useDocuments } from '../context/DocumentContext';
import DocumentCard from './DocumentCard.jsx';

const CATEGORY_COLORS = {
  'ID Proof': 'bg-indigo-50 text-indigo-700',
  Finance: 'bg-emerald-50 text-emerald-700',
  Insurance: 'bg-sky-50 text-sky-700',
  Education: 'bg-amber-50 text-amber-700',
  Others: 'bg-slate-100 text-slate-600',
};

export default function DocumentGrid({ documents, loading, error, searchQuery = '' }) {
  const { refresh } = useDocuments();
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = useMemo(
    () => [...new Set((documents || []).map((doc) => doc.metadata?.documentCategory || 'Others'))].sort(),
    [documents]
  );
  const visibleDocuments = useMemo(
    () => (documents || []).filter((doc) => categoryFilter === 'all' || (doc.metadata?.documentCategory || 'Others') === categoryFilter),
    [documents, categoryFilter]
  );
  const groups = useMemo(() => {
    const buckets = new Map();
    for (const doc of visibleDocuments) {
      const category = doc.metadata?.documentCategory || 'Others';
      if (!buckets.has(category)) buckets.set(category, []);
      buckets.get(category).push(doc);
    }
    return [...buckets.entries()].map(([category, items]) => ({ category, items }));
  }, [visibleDocuments]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">Document library</h2>
            {!loading && !error && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600">
                {visibleDocuments.length} {visibleDocuments.length === 1 ? 'file' : 'files'}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {searchQuery ? `Results for “${searchQuery}”` : 'Your uploaded and organized documents'}
          </p>
        </div>
        <label className="flex min-h-10 items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm sm:self-auto">
          <span className="text-xs font-semibold text-slate-500">Category</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="max-w-[180px] bg-transparent py-1 font-semibold text-slate-800 outline-none focus:text-indigo-700" aria-label="Filter documents by category">
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" aria-label="Loading documents">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
        </div>
      ) : error ? (
        <div className="motion-enter surface p-7 text-center sm:p-9" role="alert">
          <span className="metric-icon mx-auto bg-rose-50 text-rose-700" aria-hidden="true">!</span>
          <h3 className="mt-4 text-base font-bold text-slate-900">Could not load documents</h3>
          <p className="mx-auto mt-1 max-w-lg text-sm leading-5 text-slate-600">{error}</p>
          <button type="button" onClick={refresh} className="mt-5 min-h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Try again</button>
        </div>
      ) : visibleDocuments.length === 0 ? (
        <div className="motion-enter surface px-5 py-12 text-center sm:px-8">
          <span className="metric-icon mx-auto bg-slate-100 text-slate-600" aria-hidden="true">▤</span>
          <h3 className="mt-4 text-base font-bold text-slate-900">
            {documents?.length ? 'No documents in this category' : searchQuery ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">
            {documents?.length ? 'Choose another category or show all categories.' : searchQuery ? 'Try another search term or clear your search.' : 'Upload your first document to start organizing your files.'}
          </p>
          {documents?.length ? (
            <button type="button" onClick={() => setCategoryFilter('all')} className="mt-4 min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Show all categories</button>
          ) : !searchQuery ? (
            <a href="#upload" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700">Upload a document</a>
          ) : null}
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map(({ category, items }) => (
            <section key={category} aria-label={`${category} documents`}>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-sm font-bold text-slate-800">{category}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${CATEGORY_COLORS[category] || CATEGORY_COLORS.Others}`}>{items.length}</span>
                <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              </div>
              <div className="motion-stagger grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {items.map((doc) => <DocumentCard key={doc._id} document={doc} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
