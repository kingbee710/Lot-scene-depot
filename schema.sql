-- Lot Scene Depot Community Board — Cloudflare D1 schema
-- Run this once in the D1 database (see DEPLOY.md). No fake data is seeded
-- except the single owner profile, as requested.

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  why TEXT,
  contact TEXT,              -- private: never returned by public endpoints
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | removed | rejected
  role TEXT NOT NULL DEFAULT 'member',     -- member | owner
  token TEXT,                -- member posting token, given to the member privately by the owner
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  handle TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,    -- Events | Ideas | Stories | Funny/Rants | Networking
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | removed | rejected
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  handle TEXT NOT NULL,
  display_name TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | removed | rejected
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

-- The only seeded row: the owner profile. It starts with no member token;
-- the owner administers the board with the ADMIN_TOKEN environment variable,
-- not with a member token, and never with a hard-coded secret.
INSERT OR IGNORE INTO members (id, handle, display_name, why, status, role)
VALUES ('owner-wookzzz', 'wookzzz', 'WooKzZz', 'Owner of Lot Scene Depot', 'approved', 'owner');
