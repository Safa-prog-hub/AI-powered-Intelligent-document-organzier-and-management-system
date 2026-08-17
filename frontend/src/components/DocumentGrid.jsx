import { useMemo } from 'react';
import DocumentCard from './DocumentCard.jsx';

const CATEGORY_ORDER = ['ID Proof', 'Finance', 'Insurance', 'Education', 'Others'];
const CATEGORY_COLORS = {
  'ID Proof': 'bg-violet-100 text-violet-700',
  Finance: 'bg-emerald-100 text-emerald-700',
  Insurance: 'bg-sky-100 text-sky-700',
  Education: 'bg-amber-100 text-amber-700',
  Others: 'bg-slate-200 text-slate-600',
};

/**
 * DocumentGrid — renders the organized document library (Phase 7).
 *
 * Documents are grouped visually by `metadata.documentCategory` (the
 * semantic grouping surfaced by the AI pipeline) and each card displays the
 * auto-generated filename, extracted ID number and a category badge.
 *
 * @param {{ documents: Array<object>, loading: boolean, error: string|null }} props
 */
export default function DocumentGrid({ documents, loading, error }) {
  const groups = useMemo(() => {
    const buckets = new Map(CATEGORY_ORDER.map((cat) => [cat, []]));
    for (const doc of documents || []) {
      const cat = doc.metadata?.documentCategory || 'Others';
      if (!buckets.has(cat)) buckets.set(cat, []);
      buckets.get(cat).push(doc);
    }
    // Keep only categories that have documents, preserving display order.
    return CATEGORY_ORDER.filter((cat) => buckets.get(cat).length).map((cat) => ({
      category: cat,
      items: buckets.get(cat),
    }));
  }, [documents]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-44 animate-pulse bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600">
        Could not load documents: {error}
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm font-medium text-slate-500">No documents yet</p>
        <p className="mt-1 text-xs text-slate-400">
          Drop your first file into the upload zone — the AI will classify, extract and group it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map(({ category, items }) => (
        <section key={category}>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              {category}
            </h2>
            <span className={`badge ${CATEGORY_COLORS[category] || CATEGORY_COLORS.Others}`}>
              {items.length}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((doc) => (
              <DocumentCard key={doc._id} document={doc} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
