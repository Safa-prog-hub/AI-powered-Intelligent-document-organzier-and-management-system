import { useEffect, useState } from 'react';
import { useDocuments } from '../context/DocumentContext';
import useDebounce from '../hooks/useDebounce';

/**
 * SmartSearch — real-time full-text search.
 */
export default function SmartSearch() {
  const { applySearch, searching, documents } = useDocuments();
  const [input, setInput] = useState('');
  const debouncedQuery = useDebounce(input, 300);
  const activeSearch = debouncedQuery.trim().length > 0;

  useEffect(() => {
    applySearch(debouncedQuery);
  }, [debouncedQuery, applySearch]);

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
        <svg
          className="h-4 w-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
          />
        </svg>
      </div>

      <input
        id="document-search"
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search documents, names, categories..."
        aria-label="Search documents"
        className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-24 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />

      <div className="absolute inset-y-0 right-2 flex items-center gap-1.5">
        {searching && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600" role="status" aria-label="Searching" />
        )}

        {activeSearch && !searching && (
          <span className="motion-fade hidden px-1.5 text-[11px] font-medium tabular-nums text-slate-500 sm:block" aria-live="polite">
            {documents.length} {documents.length === 1 ? 'result' : 'results'}
          </span>
        )}
        {input && (
          <button type="button" onClick={() => setInput('')} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Clear search" title="Clear search">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}