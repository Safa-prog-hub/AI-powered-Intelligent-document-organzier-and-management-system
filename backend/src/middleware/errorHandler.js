/**
 * errorHandler.js — Global error-handling middleware (Phase 2)
 *
 * Normalises every failure path — Multer limit errors, Axios network
 * timeouts, AI-service HTTP errors, Mongoose validation errors — into a
 * consistent JSON envelope so the server never crashes on an unhandled
 * rejection and clients always receive a structured `{ error }` payload.
 */

const multer = require('multer');

/** 404 handler for unknown routes. */
function notFound(_req, res) {
  res.status(404).json({ error: 'Route not found' });
}

/**
 * Centralised error middleware. Signature must keep all 4 params so Express
 * recognises it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  // ── Multer-specific failures ────────────────────────────────────────────
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          error: 'File too large. Maximum allowed size is 15MB.',
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Unexpected field — only a single file under the "file" field is accepted.',
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ error: 'Only one file may be uploaded per request.' });
      default:
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
  }

  // ── Custom errors raised by our own middleware (file filter, etc.) ──────
  if (err.code === 'UNSUPPORTED_FILE_TYPE') {
    return res.status(err.status || 415).json({ error: err.message });
  }

  // ── Axios network failures when talking to the Python microservice ──────
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
    console.error('[gateway] AI service network error:', err.message);
    return res.status(504).json({
      error: 'The AI processing service is unavailable or timed out. Please try again.',
    });
  }
  if (err.isAxiosError && err.response) {
    // Forward the AI service's own error detail (e.g. "document too blurry").
    const detail = err.response.data?.detail || err.response.data?.error || 'AI processing failed';
    const status = err.response.status || 502;
    return res.status(status).json({ error: detail });
  }

  // ── Mongoose validation / cast errors ───────────────────────────────────
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join('; ') });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid identifier: ${err.value}` });
  }

  // ── Explicit status set by controllers ──────────────────────────────────
  if (err.status && err.status >= 400 && err.status < 600) {
    return res.status(err.status).json({ error: err.message || 'Request failed' });
  }

  // ── Fallback: never leak stack traces to clients ────────────────────────
  console.error('[gateway] Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { notFound, errorHandler };
