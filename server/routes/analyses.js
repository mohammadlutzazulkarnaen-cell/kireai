import express from 'express';
import { db, analysisSummary, documentSummary, nowIso } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { queueAnalysis } from '../services/analyze.js';
import { buildReportPdf } from '../services/report.js';
import { buildRecommendations } from '../services/detect/recommendations.js';
import { countWords } from '../services/text.js';

const router = express.Router();
router.use(requireAuth);

const LIST_SQL = `
  SELECT a.*, d.name AS document_name, d.format AS document_format
  FROM analyses a JOIN documents d ON d.id = a.document_id
  WHERE a.user_id = ?
  ORDER BY a.created_at DESC
`;

/** Start an analysis for a document, optionally on a user-supplied draft text. */
router.post('/', (req, res) => {
  const documentId = Number(req.body?.documentId);
  const suppliedText = typeof req.body?.text === 'string' ? req.body.text : null;
  if (!Number.isInteger(documentId)) return res.status(400).json({ error: 'Dokumen tidak valid.' });

  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(documentId, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan.' });

  const text = suppliedText !== null ? suppliedText : doc.text;
  if (!text || countWords(text) < 5) {
    return res.status(422).json({ error: 'Teks terlalu pendek untuk dianalisis (minimal 5 kata).' });
  }

  const info = db
    .prepare(
      `INSERT INTO analyses (user_id, document_id, status, stage, progress, source, text, created_at)
       VALUES (?, ?, 'queued', 'Menunggu antrean', 0, ?, ?, ?)`,
    )
    .run(req.user.id, doc.id, suppliedText !== null ? 'revision' : 'original', text, nowIso());

  const id = Number(info.lastInsertRowid);
  queueAnalysis(id);
  res.status(201).json({ id, documentId: doc.id, source: suppliedText !== null ? 'revision' : 'original' });
});

router.get('/', (req, res) => {
  const q = String(req.query.q || '').trim();
  const level = String(req.query.level || 'all');
  let rows = db.prepare(LIST_SQL).all(req.user.id);

  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (r) => r.document_name.toLowerCase().includes(needle) || String(r.engine_name || '').toLowerCase().includes(needle),
    );
  }
  if (level === 'high') rows = rows.filter((r) => r.ai_score >= 68);
  else if (level === 'medium') rows = rows.filter((r) => r.ai_score >= 40 && r.ai_score < 68);
  else if (level === 'low') rows = rows.filter((r) => r.ai_score !== null && r.ai_score < 40);
  else if (level === 'failed') rows = rows.filter((r) => r.status === 'failed');

  res.json({ analyses: rows.map(analysisSummary) });
});

router.get('/:id/status', (req, res) => {
  const row = db
    .prepare('SELECT id, status, stage, progress, error FROM analyses WHERE id = ? AND user_id = ?')
    .get(Number(req.params.id), req.user.id);
  if (!row) return res.status(404).json({ error: 'Analisis tidak ditemukan.' });
  res.json({ id: row.id, status: row.status, stage: row.stage, progress: row.progress, error: row.error });
});

router.get('/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT a.*, d.name AS document_name, d.format AS document_format, d.size_bytes, d.page_count, d.mime
       FROM analyses a JOIN documents d ON d.id = a.document_id
       WHERE a.id = ? AND a.user_id = ?`,
    )
    .get(Number(req.params.id), req.user.id);
  if (!row) return res.status(404).json({ error: 'Analisis tidak ditemukan.' });

  const result = row.result_json ? JSON.parse(row.result_json) : null;
  // Analyses stored before this feature shipped get their plan on read; the
  // builder is deterministic, so the same document always yields the same plan.
  if (result && !result.recommendations) result.recommendations = buildRecommendations(result);

  res.json({
    analysis: analysisSummary(row),
    // Built explicitly: the joined row exposes the document columns under
    // document_* aliases, so documentSummary(row) would read undefined fields.
    document: {
      id: row.document_id,
      name: row.document_name,
      format: row.document_format,
      mime: row.mime,
      sizeBytes: row.size_bytes,
      pageCount: row.page_count,
      wordCount: row.word_count,
      createdAt: row.created_at,
    },
    result,
    text: row.text,
    draft: row.draft_text || null,
    draftUpdatedAt: row.draft_updated_at,
  });
});

router.patch('/:id/draft', (req, res) => {
  const row = db.prepare('SELECT id FROM analyses WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
  if (!row) return res.status(404).json({ error: 'Analisis tidak ditemukan.' });
  const text = String(req.body?.text ?? '');
  if (countWords(text) < 5) return res.status(422).json({ error: 'Draf revisi terlalu pendek.' });

  db.prepare('UPDATE analyses SET draft_text = ?, draft_updated_at = ? WHERE id = ?').run(text, nowIso(), row.id);
  res.json({ ok: true, wordCount: countWords(text), updatedAt: nowIso() });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM analyses WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
  if (!row) return res.status(404).json({ error: 'Analisis tidak ditemukan.' });
  db.prepare('DELETE FROM analyses WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

router.get('/:id/report.pdf', async (req, res, next) => {
  try {
    const row = db
      .prepare(
        `SELECT a.*, d.name AS document_name, d.format AS document_format, d.page_count, d.size_bytes
         FROM analyses a JOIN documents d ON d.id = a.document_id
         WHERE a.id = ? AND a.user_id = ?`,
      )
      .get(Number(req.params.id), req.user.id);
    if (!row) return res.status(404).json({ error: 'Analisis tidak ditemukan.' });
    if (row.status !== 'completed' || !row.result_json) {
      return res.status(409).json({ error: 'Laporan hanya tersedia untuk analisis yang sudah selesai.' });
    }

    const buffer = await buildReportPdf({
      analysis: row,
      document: { name: row.document_name, format: row.document_format, pageCount: row.page_count },
      user: req.user,
      result: JSON.parse(row.result_json),
    });

    const safeName = row.document_name.replace(/[^\w\d\-_. ]+/g, '_').replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="kirAI-report-${safeName}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

export default router;
