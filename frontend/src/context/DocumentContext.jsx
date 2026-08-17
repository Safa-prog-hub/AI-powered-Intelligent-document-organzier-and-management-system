import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  deleteDocument as apiDelete,
  fetchDocuments,
  fetchExpiring,
  uploadDocument as apiUpload,
} from '../api/client';

const DocumentContext = createContext(null);

/**
 * Global document state (Phase 7):
 *  - documents   : the visible library (full list, or Smart Search results)
 *  - expiring    : documents expiring within 30 days
 *  - searchQuery : debounced Smart Search input (also sent to backend)
 *  - uploadState : { status: 'idle'|'uploading'|'processing'|'success'|'error',
 *                    progress, fileName, error }
 *
 * Optimistic update: a successful upload inserts the AI-enriched document at
 * the top of the library without a refetch.
 */
export function DocumentProvider({ children }) {
  const [documents, setDocuments] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [uploadState, setUploadState] = useState({
    status: 'idle',
    progress: 0,
    fileName: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [docs, exp] = await Promise.all([fetchDocuments(), fetchExpiring()]);
      setDocuments(docs);
      setExpiring(exp);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Smart Search — replaces the visible library with MongoDB text-index
   * results; an empty query restores the full list.
   */
  const applySearch = useCallback(
    async (query) => {
      const trimmed = (query || '').trim();
      setSearchQuery(trimmed);
      if (!trimmed) {
        await refresh();
        return;
      }
      setSearching(true);
      try {
        const docs = await fetchDocuments({ search: trimmed });
        setDocuments(docs);
        setLoadError(null);
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setSearching(false);
      }
    },
    [refresh]
  );

  const upload = useCallback(
    async (file) => {
      setUploadState({ status: 'uploading', progress: 0, fileName: file.name, error: null });
      try {
        // Progress callback drives the "Uploading to Server" bar...
        const doc = await apiUpload(file, (pct) => {
          setUploadState((s) => (s.status === 'uploading' ? { ...s, progress: pct } : s));
        });
        // ...the backend is still awaiting the Python AI microservice here,
        // so flip to the "Processing AI Extraction" skeleton.
        setUploadState({ status: 'processing', progress: 100, fileName: file.name, error: null });
        setDocuments((docs) => [doc, ...docs]);
        setUploadState({ status: 'success', progress: 100, fileName: file.name, error: null });
        return doc;
      } catch (err) {
        setUploadState({ status: 'error', progress: 0, fileName: file.name, error: err.message });
        throw err;
      }
    },
    []
  );

  const remove = useCallback(
    async (id) => {
      await apiDelete(id);
      setDocuments((docs) => docs.filter((d) => d._id !== id));
      setExpiring((docs) => docs.filter((d) => d._id !== id));
    },
    []
  );

  const value = useMemo(
    () => ({
      documents,
      expiring,
      searchQuery,
      searching,
      applySearch,
      loading,
      loadError,
      uploadState,
      upload,
      remove,
      refresh,
    }),
    [documents, expiring, searchQuery, searching, applySearch, loading, loadError, uploadState, upload, remove, refresh]
  );

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}

export function useDocuments() {
  const ctx = useContext(DocumentContext);
  if (!ctx) throw new Error('useDocuments must be used inside <DocumentProvider>');
  return ctx;
}
