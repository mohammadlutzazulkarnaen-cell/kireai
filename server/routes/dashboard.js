import express from 'express';
import { db, analysisSummary } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const userId = req.user.id;
  const docs = db.prepare('SELECT COUNT(*) AS n FROM documents WHERE user_id = ?').get(userId).n;
  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status IN ('queued','processing') THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
         AVG(CASE WHEN status = 'completed' THEN ai_score END) AS avg_ai,
         SUM(CASE WHEN status = 'completed' THEN flagged_count ELSE 0 END) AS flagged,
         SUM(CASE WHEN status = 'completed' THEN word_count ELSE 0 END) AS words
       FROM analyses WHERE user_id = ?`,
    )
    .get(userId);

  const recent = db
    .prepare(
      `SELECT a.*, d.name AS document_name, d.format AS document_format
       FROM analyses a JOIN documents d ON d.id = a.document_id
       WHERE a.user_id = ? ORDER BY a.created_at DESC LIMIT 6`,
    )
    .all(userId);

  const trend = db
    .prepare(
      `SELECT a.id, a.ai_score, a.created_at, d.name AS document_name
       FROM analyses a JOIN documents d ON d.id = a.document_id
       WHERE a.user_id = ? AND a.status = 'completed'
       ORDER BY a.created_at DESC LIMIT 8`,
    )
    .all(userId)
    .reverse();

  const buckets = db
    .prepare(
      `SELECT
         SUM(CASE WHEN ai_score >= 68 THEN 1 ELSE 0 END) AS high,
         SUM(CASE WHEN ai_score >= 40 AND ai_score < 68 THEN 1 ELSE 0 END) AS medium,
         SUM(CASE WHEN ai_score < 40 THEN 1 ELSE 0 END) AS low
       FROM analyses WHERE user_id = ? AND status = 'completed'`,
    )
    .get(userId);

  res.json({
    stats: {
      documents: docs,
      analyses: totals.total || 0,
      completed: totals.completed || 0,
      active: totals.active || 0,
      failed: totals.failed || 0,
      averageAiScore: totals.avg_ai === null ? null : Math.round(totals.avg_ai),
      flaggedSections: totals.flagged || 0,
      analyzedWords: totals.words || 0,
      buckets: { high: buckets.high || 0, medium: buckets.medium || 0, low: buckets.low || 0 },
    },
    recent: recent.map(analysisSummary),
    trend,
  });
});

export default router;
