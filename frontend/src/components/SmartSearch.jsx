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
    <div className="relative w-full max-w-2xl">
      {/* Search icon */}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <svg
          className="h-4 w-4 text-violet-400"
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
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search documents, IDs, tags, categories..."
        className="w-full rounded-xl border border-white/20 bg-white/95 py-2.5 pl-11 pr-24 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-white focus:bg-white focus:ring-2 focus:ring-violet-200"
      />

      {/* Search status */}
      <div className="absolute inset-y-0 right-3 flex items-center gap-2">
        {searching && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
        )}

        {activeSearch && !searching && documents.length > 0 && (
          <span className="hidden rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 sm:block">
            {documents.length} found
          </span>
        )}
      </div>
    </div>
  );
}