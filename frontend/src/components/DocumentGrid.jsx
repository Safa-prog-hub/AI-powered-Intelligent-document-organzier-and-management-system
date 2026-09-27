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
  Others: 'bg-slate-100 text-slate-600',
};

/**
 * DocumentGrid — renders the organized document library.
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
            className="h-44 animate-pulse rounded-2xl border border-slate-100 bg-white shadow-sm"
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
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
          <svg
            className="h-5 w-5 text-rose-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m0 3.75h.007M12 3.75a8.25 8.25 0 1 0 0 16.5 8.25 8.25 0 0 0 0-16.5Z"
            />
          </svg>
        </div>

        <p className="mt-3 font-medium">
          Could not load documents
        </p>

        <p className="mt-1 text-xs text-rose-500">
          {error}
        </p>
      </div>
    );
  }

  /*
   * Empty state
   */
  if (!documents || documents.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
          <svg
            className="h-6 w-6 text-violet-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.7}
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
          </svg>
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-700">
          No documents yet
        </p>

        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
          Drop your first file into the upload zone and
          the AI will classify, extract and organize it
          automatically.
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
          <div className="mb-4 flex items-center gap-3">
            <div className="h-5 w-1 rounded-full bg-violet-600" />

            <h2 className="text-sm font-bold tracking-wide text-slate-700">
              {category}
            </h2>

            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                CATEGORY_COLORS[category] ||
                CATEGORY_COLORS.Others
              }`}
            >
              {items.length}
            </span>

            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Document cards */}
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