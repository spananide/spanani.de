CREATE TABLE subs (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created INTEGER NOT NULL
);

CREATE TABLE sent (
  kind TEXT NOT NULL,
  reset INTEGER NOT NULL,
  PRIMARY KEY (kind, reset)
);
