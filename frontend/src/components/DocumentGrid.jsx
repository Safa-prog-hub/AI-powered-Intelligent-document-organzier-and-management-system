import { useMemo } from 'react';
import DocumentCard from './DocumentCard.jsx';

const CATEGORY_ORDER = [
  'ID Proof',
  'Finance',
  'Insurance',
  'Education',
  'Others',
];

const CATEGORY_COLORS = {
  'ID Proof': 'bg-violet-100 text-violet-700',
  Finance: 'bg-emerald-100 text-emerald-700',
  Insurance: 'bg-sky-100 text-sky-700',
  Education: 'bg-amber-100 text-amber-700',
  Others: 'bg-slate-200 text-slate-600',
};

/**
 * DocumentGrid — renders the organized document library.
 *
 * Responsive layout:
 * - Mobile: 1 card per row
 * - Tablet: 2 cards per row
 * - Desktop: 2 cards per row
 * - Extra-wide desktop: 3 cards per row
 *
 * Keeping 2 columns on normal desktop gives each document card
 * enough horizontal space to display its extracted information
 * without making the card feel cramped.
 *
 * @param {{
 *   documents: Array<object>,
 *   loading: boolean,
 *   error: string|null
 * }} props
 */
export default function DocumentGrid({ documents, loading, error }) {
  const groups = useMemo(() => {
    const buckets = new Map(
      CATEGORY_ORDER.map((category) => [category, []])
    );

    for (const doc of documents || []) {
      const category =
        doc.metadata?.documentCategory || 'Others';

      if (!buckets.has(category)) {
        buckets.set(category, []);
      }

      buckets.get(category).push(doc);
    }

    // Keep only categories that contain documents,
    // while preserving the preferred category order.
    return CATEGORY_ORDER
      .filter((category) => buckets.get(category).length)
      .map((category) => ({
        category,
        items: buckets.get(category),
      }));
  }, [documents]);

  /*
   * Loading state
   */
  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="card h-44 animate-pulse bg-slate-100"
          />
        ))}
      </div>
    );
  }

  /*
   * Error state
   */
  if (error) {
    return (
      <div className="card border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600">
        Could not load documents: {error}
      </div>
    );
  }

  /*
   * Empty state
   */
  if (!documents || documents.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm font-medium text-slate-500">
          No documents yet
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Drop your first file into the upload zone — the AI will
          classify, extract and group it.
        </p>
      </div>
    );
  }

  /*
   * Document groups
   */
  return (
    <div className="space-y-8">
      {groups.map(({ category, items }) => (
        <section key={category}>
          {/* Category heading */}
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              {category}
            </h2>

            <span
              className={`badge ${
                CATEGORY_COLORS[category] ||
                CATEGORY_COLORS.Others
              }`}
            >
              {items.length}
            </span>
          </div>

          {/*
           * Responsive document layout:
           *
           * Mobile  → 1 column
           * Tablet  → 2 columns
           * Desktop → 2 columns
           * XL      → 3 columns
           *
           * The normal desktop layout intentionally stays at
           * two columns so document metadata has enough room.
           */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((doc) => (
              <DocumentCard
                key={doc._id}
                document={doc}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}