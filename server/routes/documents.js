import express from 'express';
import multer from 'multer';
import { db, documentSummary, nowIso } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';
import { detectFormat, extractText, validateSignature } from '../services/extract.js';
import { countWords } from '../services/text.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
});

router.use(requireAuth);

const LIST_SQL = `
  SELECT d.*,
    (SELECT COUNT(*) FROM analyses a WHERE a.document_id = d.id) AS analysis_count,
    (SELECT a.ai_score FROM analyses a WHERE a.document_id = d.id AND a.status = 'completed' ORDER BY a.created_at DESC LIMIT 1) AS latest_ai_score,
    (SELECT a.id FROM analyses a WHERE a.document_id = d.id ORDER BY a.created_at DESC LIMIT 1) AS latest_analysis_id,
    (SELECT a.status FROM analyses a WHERE a.document_id = d.id ORDER BY a.created_at DESC LIMIT 1) AS latest_status,
    (SELECT a.created_at FROM analyses a WHERE a.document_id = d.id ORDER BY a.created_at DESC LIMIT 1) AS latest_created_at
  FROM documents d
  WHERE d.user_id = ?
  ORDER BY d.created_at DESC
`;

function withLatest(row) {
  return {
    ...documentSummary(row),
    analysisCount: row.analysis_count || 0,
    latestAiScore: row.latest_ai_score,
    latestAnalysisId: row.latest_analysis_id,
    latestStatus: row.latest_status,
    latestAnalyzedAt: row.latest_created_at,
  };
}

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });

    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const format = detectFormat(originalName, req.file.mimetype);
    if (!format) {
      return res.status(415).json({ error: 'Format tidak didukung. Gunakan PDF, DOCX, atau TXT.' });
    }
    if (!validateSignature(req.file.buffer, format)) {
      return res.status(422).json({
        error: `Isi file tidak cocok dengan format .${format}. Pastikan file tidak diganti namanya secara manual.`,
      });
    }

    const { text, pageCount, warnings } = await extractText(req.file.buffer, format);
    const wordCount = countWords(text);

    const info = db
      .prepare(
        `INSERT INTO documents (user_id, name, format, mime, size_bytes, text, word_count, char_count, page_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        req.user.id,
        originalName,
        format,
        req.file.mimetype || '',
        req.file.size,
        text,
        wordCount,
        text.length,
        pageCount,
        nowIso(),
      );

    const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(Number(info.lastInsertRowid));
    res.status(201).json({
      document: documentSummary(row),
      preview: text.slice(0, 600),
      warnings,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', (req, res) => {
  const rows = db.prepare(LIST_SQL).all(req.user.id);
  res.json({ documents: rows.map(withLatest) });
});

router.get('/:id', (req, res) => {
  const row = db
    .prepare(`SELECT d.*, (SELECT COUNT(*) FROM analyses a WHERE a.document_id = d.id) AS analysis_count FROM documents d WHERE d.id = ? AND d.user_id = ?`)
    .get(Number(req.params.id), req.user.id);
  if (!row) return res.status(404).json({ error: 'Dokumen tidak ditemukan.' });

  const analyses = db
    .prepare(
      `SELECT a.id, a.status, a.ai_score, a.human_score, a.word_count, a.flagged_count, a.created_at, a.completed_at, a.source, a.engine_name
       FROM analyses a WHERE a.document_id = ? AND a.user_id = ? ORDER BY a.created_at DESC`,
    )
    .all(row.id, req.user.id);

  res.json({
    document: {
      ...documentSummary(row),
      analysisCount: row.analysis_count,
      text: row.text,
    },
    analyses: analyses.map((a) => ({
      id: a.id,
      status: a.status,
      aiScore: a.ai_score,
      humanScore: a.human_score,
      wordCount: a.word_count,
      flaggedCount: a.flagged_count,
      engineName: a.engine_name,
      source: a.source,
      createdAt: a.created_at,
      completedAt: a.completed_at,
    })),
  });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM documents WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
  if (!row) return res.status(404).json({ error: 'Dokumen tidak ditemukan.' });
  db.prepare('DELETE FROM documents WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

export default router;
