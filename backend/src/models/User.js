/**
 * User.js — Mongoose model for application users (Phase 1)
 *
 * The User is the root entity of the system: every Document is owned by a
 * User. The schema carries authentication material (`passwordHash`, never
 * the plaintext password), profile fields, and a nested `preferences`
 * object driving UI themes and notification behaviour on the dashboard.
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Nested preferences document — UI theme + notification settings.
 * Disabled `_id` generation keeps the embedded document lean.
 */
const preferencesSchema = new Schema(
  {
    /** UI theme applied by the dashboard. */
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light',
    },
    /** Notification toggles surfaced in the Expiry Alerts dashboard. */
    notifications: {
      expiryReminders: { type: Boolean, default: true },
      emailDigest: { type: Boolean, default: false },
      pushEnabled: { type: Boolean, default: true },
    },
    /** Preferred language for extracted metadata labels. */
    language: { type: String, default: 'en', maxlength: 8 },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [32, 'Username must be at most 32 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // unique constraint + implicit single-field index
      index: true, // explicit single-field index for O(log n) lookups
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },
    /** bcrypt hash — `select: false` prevents accidental leakage in queries. */
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },
  },
  {
    // Automatic `createdAt` / `updatedAt` timestamps
    timestamps: true,
    versionKey: false,
  }
);

/**
 * Serialization helper: strip the password hash whenever a user object is
 * converted to JSON (defence-in-depth on top of `select: false`).
 */
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
