/**
 * app.js — Express application assembly (Phase 2)
 *
 * The stateless API gateway: JSON body parsing, CORS, request logging,
 * health probe, mounted route modules, and the global error pipeline.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Global middleware ─────────────────────────────────────────────────────
app.use(cors()); // dev-friendly; tighten origin list in production
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health probe (used by Docker healthchecks & uptime monitors) ─────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'doc-organizer-gateway', uptime: process.uptime() });
});

// ── Route modules ─────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// ── Error pipeline (must be registered last) ──────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
