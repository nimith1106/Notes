const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'notestudio.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id            TEXT PRIMARY KEY,
    sem           TEXT NOT NULL,
    subject_name  TEXT NOT NULL,
    subject_code  TEXT DEFAULT '',
    type          TEXT NOT NULL DEFAULT 'Notes',
    title         TEXT NOT NULL,
    file_name     TEXT NOT NULL,
    original_name TEXT NOT NULL,
    size          INTEGER NOT NULL DEFAULT 0,
    added_at      INTEGER NOT NULL,
    favorite      INTEGER NOT NULL DEFAULT 0,
    viewed_at     INTEGER
  )
`);

module.exports = db;
