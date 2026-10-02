import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDocuments } from '../context/DocumentContext';

/** Upload icon. */
const UploadIcon = () => (
  <svg
    className="mx-auto h-11 w-11 text-indigo-600"
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
  idle: 'Upload documents',
  uploading: 'Uploading to your workspace',
  processing: 'AI processing in progress',
  success: 'Processing complete',
  error: 'Could not process upload',
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
    <section className="surface p-4 sm:p-5" aria-labelledby="upload-title">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700" aria-hidden="true">
          <UploadIcon />
        </span>
        <div>
          <h2 id="upload-title" className="text-sm font-bold text-slate-900">Add documents</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">JPG, PNG, or PDF · up to 15 MB per file · 10 files per upload</p>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border border-dashed px-4 py-7 text-center transition-colors duration-200 sm:px-8 sm:py-9 ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-50'
            : busy
              ? 'cursor-wait border-slate-300 bg-slate-50'
              : 'border-slate-300 bg-slate-50/70 hover:border-indigo-400 hover:bg-indigo-50/50'
        }`}
      >
        <input {...getInputProps()} />

        {/* Idle */}
        {uploadState.status === 'idle' && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
              <UploadIcon />
            </div>

            <p className="mt-3 text-base font-bold text-slate-900">
              {isDragActive ? 'Drop your files to upload' : STATUS_COPY.idle}
            </p>

            <p className="mx-auto mt-1.5 max-w-lg text-sm leading-5 text-slate-600">
              Drag and drop files here, or browse your device.
            </p>

            <span className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700">
              Browse files
            </span>
          </>
        )}

        {/* Uploading */}
        {uploadState.status === 'uploading' && (
          <div className="motion-fade mx-auto max-w-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
              <UploadIcon />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-900">
              {STATUS_COPY.uploading}
            </p>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadState.progress}>
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-300"
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
          <div className="motion-fade mx-auto max-w-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
              <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" role="status" aria-label="Documents are being processed" />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-900">
              {STATUS_COPY.processing}
            </p>

            <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-slate-600">
              Your files are uploaded. Text extraction and organization continue in the background.
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {uploadState.fileName}
            </p>
          </div>
        )}

        {/* Success */}
        {uploadState.status === 'success' && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
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

            <p className="mt-3 text-sm font-semibold text-emerald-800">
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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50">
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

            <p className="mt-3 text-sm font-semibold text-rose-800">
              {STATUS_COPY.error}
            </p>

            <p className="mt-2 text-xs text-rose-500">
              {uploadState.error}
            </p>
          </>
        )}
      </div>

      {rejected && (
        <p role="alert" className="motion-fade mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
          {rejected}
        </p>
      )}
    </section>
  );
}