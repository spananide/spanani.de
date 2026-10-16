CREATE TABLE users (
  username TEXT PRIMARY KEY,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  profile TEXT NOT NULL DEFAULT '{}',
  ai_day TEXT NOT NULL DEFAULT '',
  ai_count INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL
);

-- Only the SHA-256 of a session token is stored, so a database leak leaks no usable sessions.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(username);

-- One row per user and school week (Monday, YYYY-MM-DD): that week's entries and days off.
CREATE TABLE weeks (
  username TEXT NOT NULL,
  week TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (username, week)
);
