/**
 * Backend tests — Node's built-in test runner (`npm test`).
 * Covers the pure-logic modules that don't require a live MongoDB.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

// ── auth middleware ────────────────────────────────────────────────────────
test('auth middleware rejects missing / malformed bearer tokens with 401', async () => {
  const { authenticate, signToken } = require('../src/middleware/auth');

  const call = (headers) =>
    new Promise((resolve) => {
      const req = { headers };
      const res = {
        status(code) {
          this.code = code;
          return this;
        },
        json(payload) {
          resolve({ code: this.code, payload });
        },
      };
      authenticate(req, res, () => resolve({ ok: true }));
    });

  const noHeader = await call({});
  assert.equal(noHeader.code, 401);

  const badScheme = await call({ authorization: 'Basic abc123' });
  assert.equal(badScheme.code, 401);

  const garbage = await call({ authorization: 'Bearer not.a.jwt' });
  assert.equal(garbage.code, 401);
  assert.match(garbage.payload.error, /malformed token/i);

  // Valid token passes through and exposes req.userId.
  const token = signToken('64b000000000000000000001');
  const pass = await new Promise((resolve) => {
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status() { return this; }, json() { return this; } };
    authenticate(req, res, () => resolve(req.userId));
  });
  assert.equal(pass, '64b000000000000000000001');
});

// ── multer configuration ───────────────────────────────────────────────────
test('multer file filter accepts allow-listed MIME types and rejects others', async () => {
  const { upload, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } = require('../src/middleware/multerConfig');
  const fileFilter = upload.fileFilter;

  assert.deepEqual(ALLOWED_MIME_TYPES, ['image/jpeg', 'image/png', 'application/pdf']);
  assert.equal(MAX_FILE_SIZE, 15 * 1024 * 1024);

  const accepted = await new Promise((resolve) =>
    fileFilter({}, { mimetype: 'image/jpeg' }, (err, ok) => resolve({ err, ok }))
  );
  assert.equal(accepted.ok, true);

  const rejected = await new Promise((resolve) =>
    fileFilter({}, { mimetype: 'text/html' }, (err, ok) => resolve({ err, ok }))
  );
  assert.equal(rejected.ok, false);
  assert.equal(rejected.err.code, 'UNSUPPORTED_FILE_TYPE');
  assert.equal(rejected.err.status, 415);
});

// ── error handler mapping ──────────────────────────────────────────────────
test('error handler maps Multer LIMIT_FILE_SIZE to 413 and axios timeouts to 504', async () => {
  const { errorHandler } = require('../src/middleware/errorHandler');
  const multer = require('multer');

  const run = (err) =>
    new Promise((resolve) => {
      const res = {
        status(code) {
          this.code = code;
          return this;
        },
        json(payload) {
          resolve({ code: this.code, payload });
        },
      };
      errorHandler(err, {}, res, () => {});
    });

  const sizeError = new multer.MulterError('LIMIT_FILE_SIZE');
  const sizeRes = await run(sizeError);
  assert.equal(sizeRes.code, 413);
  assert.match(sizeRes.payload.error, /15MB/);

  const timeoutErr = new Error('timeout of 120000ms exceeded');
  timeoutErr.code = 'ECONNABORTED';
  const timeoutRes = await run(timeoutErr);
  assert.equal(timeoutRes.code, 504);
});

// ── no-database startup mode ─────────────────────────────────────────────────
test('connectDB skips MongoDB when environment requests a no-database smoke test', async () => {
  const original = process.env.SKIP_DB_CONNECT;
  process.env.SKIP_DB_CONNECT = 'true';

  try {
    const { connectDB } = require('../src/db/db');
    const result = await connectDB();
    assert.equal(result, null);
  } finally {
    if (original === undefined) {
      delete process.env.SKIP_DB_CONNECT;
    } else {
      process.env.SKIP_DB_CONNECT = original;
    }
  }
});
