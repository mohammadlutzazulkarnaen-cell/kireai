import { db, nowIso } from '../db.js';
import { runDetection } from './detect/index.js';
import { buildRecommendations } from './detect/recommendations.js';
import { countWords } from './text.js';

function tick() {
  return new Promise((resolve) => setImmediate(resolve));
}

function update(id, fields) {
  const keys = Object.keys(fields);
  const assignment = keys.map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE analyses SET ${assignment} WHERE id = ?`).run(...keys.map((k) => fields[k]), id);
}

/**
 * Analysis orchestration: status transitions, progress reporting and storage.
 * The heavy work happens in the detection module; this file only persists.
 */
export function queueAnalysis(analysisId) {
  setImmediate(() => {
    runAnalysis(analysisId).catch((error) => {
      update(analysisId, {
        status: 'failed',
        stage: 'Gagal',
        progress: 100,
        error: error.message || 'Analisis gagal diproses.',
        completed_at: nowIso(),
      });
    });
  });
}

export async function runAnalysis(analysisId) {
  const row = db.prepare('SELECT * FROM analyses WHERE id = ?').get(analysisId);
  if (!row) return;

  update(analysisId, { status: 'processing', stage: 'Menyiapkan teks dokumen', progress: 8 });
  await tick();

  const text = row.text || '';
  if (countWords(text) === 0) {
    update(analysisId, {
      status: 'failed',
      stage: 'Gagal',
      progress: 100,
      error: 'Dokumen tidak memiliki teks yang bisa dianalisis.',
      completed_at: nowIso(),
    });
    return;
  }

  update(analysisId, { stage: 'Mengekstrak fitur stilistik (frasa, ritme, kosakata)', progress: 35 });
  await tick();

  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(row.user_id);
  const preferred = settings?.default_engine || 'auto';
  const result = await runDetection(text, { engine: preferred });

  update(analysisId, { stage: 'Menghitung skor per kalimat dan paragraf', progress: 82 });
  await tick();

  const allSentences = result.paragraphs.flatMap((p) => p.sentences);
  update(analysisId, {
    status: 'completed',
    stage: 'Selesai',
    progress: 100,
    engine_id: result.engine.id,
    engine_name: result.engine.name,
    engine_mode: result.engine.mode,
    ai_score: result.scores.ai,
    human_score: result.scores.human,
    word_count: result.stats.words,
    sentence_count: result.stats.sentences,
    paragraph_count: result.stats.paragraphs,
    flagged_count: result.distribution.high + result.distribution.medium,
    high_count: result.distribution.high,
    medium_count: result.distribution.medium,
    low_count: result.distribution.low,
    confidence: result.confidence,
    result_json: JSON.stringify({
      ...result,
      sentenceCount: allSentences.length,
      recommendations: buildRecommendations(result),
    }),
    completed_at: nowIso(),
  });

  db.prepare('UPDATE documents SET word_count = ? WHERE id = ?').run(result.stats.words, row.document_id);
}
