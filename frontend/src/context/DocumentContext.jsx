import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  deleteDocument as apiDelete,
  fetchDocuments,
  fetchExpiring,
  getDocument,
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

      const [docs, exp] = await Promise.all([
        fetchDocuments(),
        fetchExpiring(),
      ]);

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

  /**
   * Upload a document.
   *
   * The backend now returns quickly with processingStatus = "processing".
   * The AI service continues processing the document in the background.
   *
   * We poll the document every second until it becomes "completed"
   * or "failed", then update the UI with the fully processed document.
   */
  const upload = useCallback(
    async (file) => {
      setUploadState({
        status: 'uploading',
        progress: 0,
        fileName: file.name,
        error: null,
      });

      try {
        // Upload the file to the backend.
        const doc = await apiUpload(file, (pct) => {
          setUploadState((s) =>
            s.status === 'uploading'
              ? { ...s, progress: pct }
              : s
          );
        });

        // The backend accepted the file.
        // AI processing is now happening in the background.
        setUploadState({
          status: 'processing',
          progress: 100,
          fileName: file.name,
          error: null,
        });

        let processedDoc = doc;

        // Poll the backend once every second.
        // Maximum: 30 attempts = approximately 30 seconds.
        for (let attempt = 0; attempt < 30; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          processedDoc = await getDocument(doc._id);

          if (processedDoc.processingStatus === 'completed') {
            break;
          }

          if (processedDoc.processingStatus === 'failed') {
            throw new Error(
              processedDoc.processingError ||
                'Document processing failed.'
            );
          }
        }

        // If processing did not finish within 30 seconds,
        // show an error instead of displaying incomplete data.
        if (processedDoc.processingStatus !== 'completed') {
          throw new Error(
            'Document processing is taking too long. Please refresh.'
          );
        }

        // Add the fully processed document to the top of the library.
        // Remove any older copy of the same document first.
        setDocuments((docs) => [
          processedDoc,
          ...docs.filter((d) => d._id !== processedDoc._id),
        ]);

        setUploadState({
          status: 'success',
          progress: 100,
          fileName: file.name,
          error: null,
        });

        return processedDoc;
      } catch (err) {
        setUploadState({
          status: 'error',
          progress: 0,
          fileName: file.name,
          error: err.message,
        });

        throw err;
      }
    },
    []
  );

  const remove = useCallback(
    async (id) => {
      await apiDelete(id);

      setDocuments((docs) =>
        docs.filter((d) => d._id !== id)
      );

      setExpiring((docs) =>
        docs.filter((d) => d._id !== id)
      );
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
    [
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
    ]
  );

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const ctx = useContext(DocumentContext);

  if (!ctx) {
    throw new Error(
      'useDocuments must be used inside <DocumentProvider>'
    );
  }

  return ctx;
}