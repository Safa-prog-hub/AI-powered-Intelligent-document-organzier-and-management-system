import { useEffect, useState } from 'react';
import { useDocuments } from '../context/DocumentContext';
import useDebounce from '../hooks/useDebounce';

/**
 * SmartSearch — real-time full-text search (Phase 7).
 *
 * Every keystroke updates local input state; a 300ms debounce suppresses
 * intermediate requests; the settled value triggers a server-side MongoDB
 * text-index query via `applySearch`, which replaces the library contents.
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
    <div className="relative w-full max-w-xl">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
        </svg>
      </div>
      <input
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Smart Search — text, tags, IDs, categories…"
        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-16 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      <div className="absolute inset-y-0 right-3 flex items-center gap-2">
        {searching && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        )}
        {activeSearch && !searching && documents.length > 0 && (
          <span className="hidden text-xs font-medium text-slate-400 sm:block">
            {documents.length} found
          </span>
        )}
      </div>
    </div>
  );
}
