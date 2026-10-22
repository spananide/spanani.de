CREATE TABLE readings (
  at INTEGER PRIMARY KEY,
  five REAL,
  five_reset INTEGER,
  week REAL,
  week_reset INTEGER,
  spend REAL,
  spend_reset INTEGER,
  spend_usd REAL,
  spend_limit REAL,
  spend_period TEXT
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT,
  project TEXT,
  model TEXT,
  version TEXT,
  effort TEXT,
  cost REAL,
  duration_ms INTEGER,
  api_ms INTEGER,
  added INTEGER,
  removed INTEGER,
  ctx_pct REAL,
  ctx_size INTEGER,
  started INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

CREATE INDEX sessions_updated ON sessions (updated);
