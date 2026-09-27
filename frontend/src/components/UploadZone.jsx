import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDocuments } from '../context/DocumentContext';

/** Upload icon. */
const UploadIcon = () => (
  <svg
    className="mx-auto h-11 w-11 text-violet-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
    />
  </svg>
);

const STATUS_COPY = {
  idle: 'Drag & drop documents here, or click to browse',
  uploading: 'Uploading documents to server…',
  processing: 'Documents uploaded — AI processing in background…',
  success: 'Documents processed and added to your library',
  error: 'Upload failed',
};

/**
 * UploadZone — drag-and-drop document ingestion.
 *
 * Supports up to 10 files per upload.
 */
export default function UploadZone() {
  const { upload, uploadState } = useDocuments();
  const [rejected, setRejected] = useState(null);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      setRejected(null);

      if (!acceptedFiles.length) return;

      try {
        await upload(acceptedFiles);
      } catch {
        // Upload state already contains the error.
      }
    },
    [upload]
  );

  const onDropRejected = useCallback((fileRejections) => {
    const reason =
      fileRejections[0]?.errors?.[0]?.message ||
      'File rejected';

    setRejected(reason);
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 10,
    maxSize: 15 * 1024 * 1024,
    disabled:
      uploadState.status === 'uploading' ||
      uploadState.status === 'processing',
  });

  const busy =
    uploadState.status === 'uploading' ||
    uploadState.status === 'processing';

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">

      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 sm:p-10 ${
          isDragActive
            ? 'border-violet-600 bg-violet-50 shadow-inner'
            : busy
              ? 'border-slate-300 bg-slate-50'
              : 'border-violet-200 bg-violet-50/30 hover:border-violet-500 hover:bg-violet-50'
        }`}
      >
        <input {...getInputProps()} />

        {/* Idle */}
        {uploadState.status === 'idle' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
              <UploadIcon />
            </div>

            <p className="mt-4 text-base font-semibold text-slate-700">
              {STATUS_COPY.idle}
            </p>

            <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-400">
              JPG, PNG or PDF · max 15MB each · up to 10 files.
              <br className="hidden sm:block" />
              AI extracts text, entities and semantic tags automatically.
            </p>

            <span className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700">
              Browse files
            </span>
          </>
        )}

        {/* Uploading */}
        {uploadState.status === 'uploading' && (
          <div className="mx-auto max-w-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
              <UploadIcon />
            </div>

            <p className="mt-4 text-sm font-semibold text-violet-700">
              {STATUS_COPY.uploading}
            </p>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-violet-600 transition-all duration-300"
                style={{
                  width: `${uploadState.progress}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">
              {uploadState.progress}% — {uploadState.fileName}
            </p>
          </div>
        )}

        {/* Background processing */}
        {uploadState.status === 'processing' && (
          <div className="mx-auto max-w-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
            </div>

            <p className="mt-4 text-sm font-semibold text-violet-700">
              {STATUS_COPY.processing}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Your documents are already uploaded. You can
              continue using the application while OCR and
              AI processing finish.
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {uploadState.fileName}
            </p>
          </div>
        )}

        {/* Success */}
        {uploadState.status === 'success' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <svg
                className="h-7 w-7 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>

            <p className="mt-4 text-sm font-semibold text-emerald-700">
              {STATUS_COPY.success}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {uploadState.fileName}
            </p>
          </>
        )}

        {/* Error */}
        {uploadState.status === 'error' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100">
              <svg
                className="h-7 w-7 text-rose-600"
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

            <p className="mt-4 text-sm font-semibold text-rose-700">
              {STATUS_COPY.error}
            </p>

            <p className="mt-2 text-xs text-rose-500">
              {uploadState.error}
            </p>
          </>
        )}
      </div>

      {rejected && (
        <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
          {rejected}
        </p>
      )}
    </div>
  );
}