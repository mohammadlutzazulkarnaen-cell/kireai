import express from 'express';
import { db, ensureSettings, nowIso } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

function serialize(row) {
  return {
    defaultEngine: row.default_engine,
    autosaveEditor: Boolean(row.autosave_editor),
    persistHighlights: Boolean(row.persist_highlights),
    inappAlerts: Boolean(row.inapp_alerts),
    compactTables: Boolean(row.compact_tables),
    updatedAt: row.updated_at,
  };
}

router.get('/', (req, res) => {
  res.json({ settings: serialize(ensureSettings(req.user.id)) });
});

router.patch('/', (req, res) => {
  const current = ensureSettings(req.user.id);
  const body = req.body || {};
  const next = {
    default_engine: ['auto', 'local'].includes(body.defaultEngine) ? body.defaultEngine : current.default_engine,
    autosave_editor: body.autosaveEditor === undefined ? current.autosave_editor : body.autosaveEditor ? 1 : 0,
    persist_highlights:
      body.persistHighlights === undefined ? current.persist_highlights : body.persistHighlights ? 1 : 0,
    inapp_alerts: body.inappAlerts === undefined ? current.inapp_alerts : body.inappAlerts ? 1 : 0,
    compact_tables: body.compactTables === undefined ? current.compact_tables : body.compactTables ? 1 : 0,
  };

  db.prepare(
    `UPDATE settings SET default_engine = ?, autosave_editor = ?, persist_highlights = ?, inapp_alerts = ?, compact_tables = ?, updated_at = ? WHERE user_id = ?`,
  ).run(
    next.default_engine,
    next.autosave_editor,
    next.persist_highlights,
    next.inapp_alerts,
    next.compact_tables,
    nowIso(),
    req.user.id,
  );

  res.json({ settings: serialize(ensureSettings(req.user.id)) });
});

/** Erase every document + analysis of the signed-in user (GDPR-style reset). */
router.delete('/documents', (req, res) => {
  const info = db.prepare('DELETE FROM documents WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true, deleted: Number(info.changes || 0) });
});

export default router;
