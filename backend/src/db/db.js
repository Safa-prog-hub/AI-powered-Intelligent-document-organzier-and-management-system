/**
 * db.js — MongoDB connection utility (Phase 1)
 *
 * Establishes a resilient Mongoose connection featuring:
 *   • Exponential backoff retry logic (with jitter) so transient
 *     Mongo outages / container start-up races self-heal.
 *   • Robust connection event listeners: 'connected', 'error', 'disconnected'.
 *   • Graceful shutdown on SIGINT/SIGTERM so in-flight writes flush.
 */

const mongoose = require('mongoose');

const DEFAULT_URI = 'mongodb://localhost:27017/doc_organizer';

// Retry policy constants
const MAX_RETRIES = 10;
const BASE_DELAY_MS = 1000; // 1s → 2s → 4s → 8s → ... capped at 30s
const MAX_DELAY_MS = 30000;
const JITTER_MS = 250;

/**
 * Compute the backoff delay for a given attempt (1-based), with jitter to
 * avoid thundering-herd reconnection storms when several instances restart.
 *
 * @param {number} attempt - The 1-based attempt number that just failed.
 * @returns {number} delay in milliseconds before the next attempt.
 */
function computeBackoffDelay(attempt) {
  const exponential = BASE_DELAY_MS * 2 ** (attempt - 1);
  const capped = Math.min(exponential, MAX_DELAY_MS);
  const jitter = Math.floor(Math.random() * JITTER_MS);
  return capped + jitter;
}

/**
 * Attempt to connect with exponential backoff retry.
 *
 * @param {string} uri - MongoDB connection string.
 * @param {object} [options] - Extra Mongoose connection options.
 * @param {number} [retries=MAX_RETRIES] - Maximum number of attempts.
 * @returns {Promise<mongoose.Connection>}
 * @throws {Error} after the final retry is exhausted.
 */
async function connectWithRetry(uri = DEFAULT_URI, options = {}, retries = MAX_RETRIES) {
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        // Interpret a single host (e.g. mongo-db) as a replica-set-free topology
        autoIndex: process.env.NODE_ENV !== 'production',
        ...options,
      });
      return mongoose.connection;
    } catch (err) {
      attempt += 1;
      if (attempt >= retries) {
        throw new Error(
          `[db] Could not connect to MongoDB after ${retries} attempts: ${err.message}`
        );
      }
      const delay = computeBackoffDelay(attempt);
      console.warn(
        `[db] Connection attempt ${attempt}/${retries} failed (${err.message}). ` +
          `Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Register lifecycle event listeners on the shared Mongoose connection so
 * operational state transitions are observable in logs and can drive
 * health-check behaviour.
 */
function registerConnectionListeners() {
  const { connection } = mongoose;

  connection.on('connected', () => {
    console.info(`[db] Connected to MongoDB at ${connection.host}:${connection.port}/${connection.name}`);
  });

  connection.on('error', (err) => {
    console.error(`[db] MongoDB connection error: ${err.message}`);
  });

  connection.on('disconnected', () => {
    console.warn('[db] Disconnected from MongoDB — reconnecting via driver / retry logic...');
  });

  // Graceful shutdown: close the pool before the process exits.
  const shutdown = async (signal) => {
    console.info(`[db] ${signal} received — closing MongoDB connection...`);
    try {
      await connection.close();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

/**
 * Connect to MongoDB with full retry + listener wiring.
 *
 * @param {string} [uri] - Override the connection string.
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB(uri) {
  registerConnectionListeners();
  const target = uri || process.env.MONGODB_URI || DEFAULT_URI;
  return connectWithRetry(target);
}

module.exports = { connectDB, connectWithRetry, registerConnectionListeners };
