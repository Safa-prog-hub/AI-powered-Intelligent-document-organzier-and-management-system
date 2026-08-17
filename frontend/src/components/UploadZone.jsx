import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDocuments } from '../context/DocumentContext';

/** Small inline icons (warning, check, upload) — no icon library needed. */
const UploadIcon = () => (
  <svg className="mx-auto h-10 w-10 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>
);

const STATUS_COPY = {
  idle: 'Drag & drop a document here, or click to browse',
  uploading: 'Uploading to server…',
  processing: 'Processing AI extraction (OCR + semantic grouping)…',
  success: 'Document processed and added to your library',
  error: 'Upload failed',
};

/**
 * UploadZone — drag-and-drop ingestion with a 4-state UI machine (Phase 7):
 * 'idle' → 'uploading' (progress bar) → 'processing' (AI skeleton) → 'success'/'error'.
 */
export default function UploadZone() {
  const { upload, uploadState } = useDocuments();
  const [rejected, setRejected] = useState(null);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      setRejected(null);
      const file = acceptedFiles[0];
      if (!file) return;
      try {
        await upload(file);
      } catch {
        // state machine already recorded the error
      }
    },
    [upload]
  );

  const onDropRejected = useCallback((fileRejections) => {
    const reason = fileRejections[0]?.errors?.[0]?.message || 'File rejected';
    setRejected(reason);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 15 * 1024 * 1024, // mirror the backend 15MB limit
    disabled: uploadState.status === 'uploading' || uploadState.status === 'processing',
  });

  const busy = uploadState.status === 'uploading' || uploadState.status === 'processing';

  return (
    <div className="card p-6">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? 'border-brand-600 bg-brand-50'
            : busy
              ? 'border-slate-300 bg-slate-50'
              : 'border-slate-300 hover:border-brand-500 hover:bg-brand-50/50'
        }`}
      >
        <input {...getInputProps()} />

        {/* State machine rendering */}
        {uploadState.status === 'idle' && (
          <>
            <UploadIcon />
            <p className="mt-3 text-sm font-medium text-slate-600">{STATUS_COPY.idle}</p>
            <p className="mt-1 text-xs text-slate-400">
              JPG, PNG or PDF — max 15MB. AI extracts text, entities & semantic tags automatically.
            </p>
          </>
        )}

        {uploadState.status === 'uploading' && (
          <div className="mx-auto max-w-sm">
            <UploadIcon />
            <p className="mt-3 text-sm font-medium text-brand-600">{STATUS_COPY.uploading}</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">{uploadState.progress}% — {uploadState.fileName}</p>
          </div>
        )}

        {uploadState.status === 'processing' && (
          <div className="mx-auto max-w-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            <p className="mt-3 text-sm font-medium text-brand-600">{STATUS_COPY.processing}</p>
            <p className="mt-1 text-xs text-slate-400">
              Tesseract OCR → entity extraction → semantic embedding
            </p>
          </div>
        )}

        {uploadState.status === 'success' && (
          <>
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-emerald-700">{STATUS_COPY.success}</p>
            <p className="mt-1 text-xs text-slate-400">{uploadState.fileName}</p>
          </>
        )}

        {uploadState.status === 'error' && (
          <>
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
              <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-rose-700">{STATUS_COPY.error}</p>
            <p className="mt-1 text-xs text-rose-500">{uploadState.error}</p>
          </>
        )}
      </div>

      {rejected && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
          {rejected}
        </p>
      )}
    </div>
  );
}
