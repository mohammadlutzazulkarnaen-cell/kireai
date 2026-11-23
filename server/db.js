import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

export const db = new DatabaseSync(config.dbFile);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  institution   TEXT    DEFAULT '',
  role          TEXT    DEFAULT 'Mahasiswa',
  avatar_color  TEXT    DEFAULT 'violet',
  created_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT    NOT NULL,
  format        TEXT    NOT NULL,
  mime          TEXT    DEFAULT '',
  size_bytes    INTEGER NOT NULL DEFAULT 0,
  text          TEXT    NOT NULL DEFAULT '',
  word_count    INTEGER NOT NULL DEFAULT 0,
  char_count    INTEGER NOT NULL DEFAULT 0,
  page_count    INTEGER,
  created_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS analyses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id      INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  status           TEXT    NOT NULL DEFAULT 'queued',
  stage            TEXT    DEFAULT 'Menunggu antrean',
  progress         INTEGER NOT NULL DEFAULT 0,
  source           TEXT    NOT NULL DEFAULT 'original',
  text             TEXT    NOT NULL DEFAULT '',
  engine_id        TEXT,
  engine_name      TEXT,
  engine_mode      TEXT,
  ai_score         REAL,
  human_score      REAL,
  word_count       INTEGER DEFAULT 0,
  sentence_count   INTEGER DEFAULT 0,
  paragraph_count  INTEGER DEFAULT 0,
  flagged_count    INTEGER DEFAULT 0,
  high_count       INTEGER DEFAULT 0,
  medium_count     INTEGER DEFAULT 0,
  low_count        INTEGER DEFAULT 0,
  confidence       TEXT,
  result_json      TEXT,
  draft_text       TEXT,
  draft_updated_at TEXT,
  error            TEXT,
  created_at       TEXT    NOT NULL,
  completed_at     TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_engine TEXT    NOT NULL DEFAULT 'auto',
  autosave_editor INTEGER NOT NULL DEFAULT 1,
  persist_highlights INTEGER NOT NULL DEFAULT 1,
  inapp_alerts   INTEGER NOT NULL DEFAULT 1,
  compact_tables INTEGER NOT NULL DEFAULT 0,
  updated_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_document ON analyses(document_id, created_at DESC);
`);

export function nowIso() {
  return new Date().toISOString();
}

export function ensureSettings(userId) {
  const row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);
  if (row) return row;
  db.prepare('INSERT INTO settings (user_id, updated_at) VALUES (?, ?)').run(userId, nowIso());
  return db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    institution: row.institution || '',
    role: row.role || 'Mahasiswa',
    avatarColor: row.avatar_color || 'violet',
    createdAt: row.created_at,
  };
}

export function documentSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    format: row.format,
    mime: row.mime,
    sizeBytes: row.size_bytes,
    wordCount: row.word_count,
    charCount: row.char_count,
    pageCount: row.page_count,
    createdAt: row.created_at,
  };
}

export function analysisSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    documentId: row.document_id,
    documentName: row.document_name,
    documentFormat: row.document_format,
    status: row.status,
    stage: row.stage,
    progress: row.progress,
    source: row.source,
    engineName: row.engine_name,
    engineMode: row.engine_mode,
    aiScore: row.ai_score,
    humanScore: row.human_score,
    wordCount: row.word_count,
    sentenceCount: row.sentence_count,
    paragraphCount: row.paragraph_count,
    flaggedCount: row.flagged_count,
    highCount: row.high_count,
    mediumCount: row.medium_count,
    lowCount: row.low_count,
    confidence: row.confidence,
    hasDraft: Boolean(row.draft_text),
    error: row.error,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}
