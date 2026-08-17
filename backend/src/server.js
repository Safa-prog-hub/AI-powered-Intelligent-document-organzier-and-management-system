/**
 * server.js — Entrypoint (Phase 2)
 *
 * Boot sequence: load env → connect MongoDB (with backoff) → listen.
 * Keeps the process alive until SIGINT/SIGTERM triggers a graceful close.
 */

require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./db/db');

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  // 1. Establish the persistent MongoDB connection (retries internally).
  await connectDB();

  // 2. Start the HTTP gateway only after the DB is reachable, so the
  //    orchestrator never serves requests against a dead data layer.
  const server = app.listen(PORT, HOST, () => {
    console.info(`[gateway] API gateway listening on http://${HOST}:${PORT}`);
    console.info(`[gateway] AI service target: ${process.env.AI_SERVICE_URL || 'http://localhost:8000'}`);
  });

  // Surface unhandled rejections instead of silently dying.
  process.on('unhandledRejection', (reason) => {
    console.error('[gateway] Unhandled promise rejection:', reason);
  });

  return server;
}

main().catch((err) => {
  console.error('[gateway] Fatal boot error:', err.message);
  process.exit(1);
});
