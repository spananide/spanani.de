-- Gruppen (z. B. eine Klasse): Mitglieder sehen eine gemeinsame Rangliste aus allen Einträgen.
-- Jeder Nutzer ist in höchstens einer Gruppe (users.grp, '' = keine).
CREATE TABLE groups (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created INTEGER NOT NULL
);
ALTER TABLE users ADD COLUMN grp TEXT NOT NULL DEFAULT '';
CREATE INDEX users_grp ON users(grp);
