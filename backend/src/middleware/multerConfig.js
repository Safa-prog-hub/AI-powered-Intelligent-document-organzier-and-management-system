/**
 * multerConfig.js — Secure file ingestion (Phase 2)
 *
 * Streams `multipart/form-data` uploads to a local disk cache via Multer's
 * DiskStorage. Strict validation:
 *   • MIME allow-list: image/jpeg, image/png, application/pdf
 *   • Hard 15MB file-size ceiling (memory-exhaustion protection)
 *   • Randomised filenames (timestamp + UUID) to prevent path traversal /
 *     name collisions; the original name is preserved in the DB document.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB in bytes

// Resolve the disk cache directory (configurable for object-storage shims).
const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');

// Ensure the cache directory exists before Multer writes into it.
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, safeName);
  },
});

/**
 * File filter — rejects anything outside the MIME allow-list.
 * Multer routes rejected files to `cb(error)` which surfaces in the global
 * error handler as a 415.
 */
function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }
  const err = new Error(
    `Unsupported file type "${file.mimetype}". Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
  );
  err.status = 415;
  err.code = 'UNSUPPORTED_FILE_TYPE';
  return cb(err, false);
}

/** Configured Multer instance: single file per request, field name `file`. */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // exactly one document per upload request
    fields: 5,
  },
});

module.exports = { upload, uploadDir, ALLOWED_MIME_TYPES, MAX_FILE_SIZE };
