CREATE TABLE members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  admin INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE tokens (
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  created INTEGER NOT NULL,
  seen INTEGER NOT NULL
);
CREATE INDEX tokens_member ON tokens(member_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE links (
  code_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  expires INTEGER NOT NULL
);

CREATE TABLE devices (
  endpoint TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  prefs TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX devices_member ON devices(member_id);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  by TEXT NOT NULL,
  done_by TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX items_updated ON items(updated);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  by TEXT NOT NULL,
  expires TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX notes_updated ON notes(updated);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  rule TEXT NOT NULL,
  people TEXT NOT NULL,
  turn INTEGER NOT NULL DEFAULT 0,
  due TEXT NOT NULL,
  time TEXT NOT NULL DEFAULT '',
  last_done TEXT NOT NULL DEFAULT '',
  last_by TEXT NOT NULL DEFAULT '',
  prev TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX tasks_updated ON tasks(updated);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL DEFAULT '',
  people TEXT NOT NULL,
  remind INTEGER,
  yearly INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  by TEXT NOT NULL,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX events_updated ON events(updated);

CREATE TABLE sent (
  key TEXT PRIMARY KEY,
  at INTEGER NOT NULL
);
