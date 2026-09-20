/**
 * documentRoutes.js — Document lifecycle endpoints (Phase 2).
 *
 * POST /api/documents/upload cascades through:
 *   1. JWT authentication middleware
 *   2. Multer single-file ingestion (MIME filter + 15MB cap)
 *   3. Controller → Python AI dispatch → MongoDB persistence
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/multerConfig');
const {
  uploadDocument,
  listDocuments,
  listExpiring,
  getDocument,
  deleteDocument,
  renameDocument,
  viewDocumentFile,
} = require('../controllers/documentController');

const router = express.Router();

// All document routes require a valid bearer token.
router.use(authenticate);

// Single-file upload: field name must be `file` (multer.single('file')).
router.post('/upload', upload.array('file',10), uploadDocument);

// Smart search + listing: GET /api/documents?search=<text>&category=<cat>
router.get('/', listDocuments);

// Expiry alerts (30-day window) — must be registered before '/:id'.
router.get('/expiring', listExpiring);

router.patch('/:id/rename', renameDocument);
router.get('/:id/file', viewDocumentFile);
router.get('/:id', getDocument);
router.delete('/:id', deleteDocument);

module.exports = router;
