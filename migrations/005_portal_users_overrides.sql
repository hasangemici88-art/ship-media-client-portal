-- Migration 005: D1 override layer for forgot/reset password.
--
-- PORTAL_USERS_JSON env var stays the IDENTITY source (who exists, what
-- role they have, the bootstrap password hash). This table layers on top:
--   - When a user resets their password, the new bcrypt hash is written
--     here. Auth prefers this row over the JSON bootstrap.
--   - The reset_token_hash + reset_expires_ms fields back the forgot-
--     password flow.
--   - `role` is intentionally NOT here. Roles only flow from JSON; that
--     prevents drift between the identity list and reset overrides.

CREATE TABLE IF NOT EXISTS portal_users (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Ship Media Digital',
  reset_token_hash TEXT,
  reset_expires_ms INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_portal_users_reset ON portal_users(reset_token_hash);
