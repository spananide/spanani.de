CREATE TABLE subs (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  days INTEGER NOT NULL,
  time TEXT NOT NULL,
  types TEXT NOT NULL,
  last TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL
);
CREATE INDEX subs_time ON subs(time);
