import bcrypt from 'bcryptjs';
import { detectLocal } from '@shared/detect/heuristics.js';
import { DISCLAIMER } from '@shared/detect/lexicon.js';
import { buildRecommendations } from '@shared/detect/recommendations.js';
import { countWords } from '@shared/text.js';
import { ApiError } from '../errors.js';
import * as store from './db.js';
import { detectFormat, extractText, readFileBytes, validateSignature } from './extract.js';

/**
 * Browser backend for the static (GitHub Pages) build.
 *
 * It answers the same routes, with the same payloads, as the Express API in
 * server/routes/*, but the data lives in this browser (IndexedDB) and the
 * analysis runs on the device with the same detection engine the server uses.
 *
 * Privacy note: documents never leave the device in this mode, and an account
 * here protects against accidental mixing of data on a shared computer — it is
 * not a server-side security boundary, because there is no server.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const nowIso = () => new Date().toISOString();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function publicUser(row) {
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

function documentSummary(row) {
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

function serializeSettings(row) {
  return {
    defaultEngine: row.default_engine,
    autosaveEditor: Boolean(row.autosave_editor),
    persistHighlights: Boolean(row.persist_highlights),
    inappAlerts: Boolean(row.inapp_alerts),
    compactTables: Boolean(row.compact_tables),
    updatedAt: row.updated_at,
  };
}

function analysisSummary(row, doc) {
  if (!row) return null;
  return {
    id: row.id,
    documentId: row.document_id,
    documentName: doc?.name || '',
    documentFormat: doc?.format || '',
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

const byCreatedDesc = (a, b) => String(b.created_at).localeCompare(String(a.created_at));

async function ensureSettings(userId) {
  const existing = await store.get('settings', userId);
  if (existing) return existing;
  const row = {
    id: userId,
    default_engine: 'auto',
    autosave_editor: 1,
    persist_highlights: 1,
    inapp_alerts: 1,
    compact_tables: 0,
    updated_at: nowIso(),
  };
  await store.put('settings', row);
  return row;
}

async function requireUser() {
  const userId = store.readSession();
  if (!userId) throw new ApiError('Sesi berakhir. Silakan masuk kembali.', 401);
  const user = await store.get('users', userId);
  if (!user) {
    store.clearSession();
    throw new ApiError('Sesi berakhir. Silakan masuk kembali.', 401);
  }
  return user;
}

/* ------------------------------------------------------------------ auth */

async function register(body) {
  const name = String(body?.name || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');

  if (name.length < 2) throw new ApiError('Nama minimal 2 karakter.', 400);
  if (!EMAIL_RE.test(email)) throw new ApiError('Format email tidak valid.', 400);
  if (password.length < 8) throw new ApiError('Kata sandi minimal 8 karakter.', 400);

  const users = await store.all('users');
  if (users.some((u) => u.email === email)) {
    throw new ApiError('Email sudah terdaftar. Silakan masuk.', 409);
  }

  const user = {
    id: await store.nextId('users'),
    name,
    email,
    password_hash: bcrypt.hashSync(password, 10),
    institution: String(body?.institution || '').trim(),
    role: String(body?.role || 'Mahasiswa').trim(),
    avatar_color: 'violet',
    created_at: nowIso(),
  };
  await store.put('users', user);
  await ensureSettings(user.id);
  store.writeSession(user.id);
  return { user: publicUser(user) };
}

async function login(body) {
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!email || !password) throw new ApiError('Email dan kata sandi wajib diisi.', 400);

  const users = await store.all('users');
  const user = users.find((u) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new ApiError('Email atau kata sandi salah.', 401);
  }
  await ensureSettings(user.id);
  store.writeSession(user.id);
  return { user: publicUser(user) };
}

async function me() {
  const user = await requireUser();
  const settings = await ensureSettings(user.id);
  return { user: publicUser(user), settings: serializeSettings(settings) };
}

async function updateProfile(user, body) {
  const name = String(body?.name ?? user.name).trim();
  if (name.length < 2) throw new ApiError('Nama minimal 2 karakter.', 400);
  const next = {
    ...user,
    name,
    institution: String(body?.institution ?? user.institution).trim(),
    role: String(body?.role ?? user.role).trim(),
    avatar_color: String(body?.avatarColor ?? user.avatar_color).trim() || 'violet',
  };
  await store.put('users', next);
  return { user: publicUser(next) };
}

async function changePassword(user, body) {
  const current = String(body?.currentPassword || '');
  const next = String(body?.newPassword || '');
  if (next.length < 8) throw new ApiError('Kata sandi baru minimal 8 karakter.', 400);
  if (!bcrypt.compareSync(current, user.password_hash)) {
    throw new ApiError('Kata sandi saat ini tidak cocok.', 400);
  }
  await store.put('users', { ...user, password_hash: bcrypt.hashSync(next, 10) });
  return { ok: true };
}

/* ------------------------------------------------------------- documents */

export async function uploadDocument(file, onProgress) {
  const user = await requireUser();
  if (!file) throw new ApiError('Tidak ada file yang diunggah.', 400);
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError('Ukuran file melebihi batas 10 MB.', 413);

  const format = detectFormat(file.name, file.type);
  if (!format) throw new ApiError('Format tidak didukung. Gunakan PDF, DOCX, atau TXT.', 415);

  onProgress?.(10);
  const bytes = await readFileBytes(file);
  if (!validateSignature(bytes, format)) {
    throw new ApiError(
      `Isi file tidak cocok dengan format .${format}. Pastikan file tidak diganti namanya secara manual.`,
      422,
    );
  }
  onProgress?.(45);

  let extracted;
  try {
    extracted = await extractText(bytes, format);
  } catch (error) {
    throw new ApiError(error.message || 'Dokumen tidak dapat dibaca.', error.status || 500);
  }
  onProgress?.(88);

  const document = {
    id: await store.nextId('documents'),
    user_id: user.id,
    name: file.name,
    format,
    mime: file.type || '',
    size_bytes: file.size,
    text: extracted.text,
    word_count: countWords(extracted.text),
    char_count: extracted.text.length,
    page_count: extracted.pageCount,
    created_at: nowIso(),
  };
  await store.put('documents', document);
  onProgress?.(100);

  return {
    document: documentSummary(document),
    preview: extracted.text.slice(0, 600),
    warnings: extracted.warnings,
  };
}

async function listDocuments(user) {
  const [documents, analyses] = await Promise.all([store.all('documents'), store.all('analyses')]);
  const own = documents.filter((d) => d.user_id === user.id).sort(byCreatedDesc);
  const ownAnalyses = analyses.filter((a) => a.user_id === user.id);

  return own.map((doc) => {
    const related = ownAnalyses.filter((a) => a.document_id === doc.id).sort(byCreatedDesc);
    const latest = related[0];
    const latestCompleted = related.find((a) => a.status === 'completed');
    return {
      ...documentSummary(doc),
      analysisCount: related.length,
      latestAiScore: latestCompleted ? latestCompleted.ai_score : null,
      latestAnalysisId: latest ? latest.id : null,
      latestStatus: latest ? latest.status : null,
      latestAnalyzedAt: latest ? latest.created_at : null,
    };
  });
}

async function getDocument(user, documentId) {
  const doc = await store.get('documents', documentId);
  if (!doc || doc.user_id !== user.id) throw new ApiError('Dokumen tidak ditemukan.', 404);

  const analyses = (await store.all('analyses'))
    .filter((a) => a.document_id === doc.id && a.user_id === user.id)
    .sort(byCreatedDesc);

  return {
    document: { ...documentSummary(doc), analysisCount: analyses.length, text: doc.text },
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
  };
}

async function deleteDocument(user, documentId) {
  const doc = await store.get('documents', documentId);
  if (!doc || doc.user_id !== user.id) throw new ApiError('Dokumen tidak ditemukan.', 404);

  const analyses = (await store.all('analyses')).filter((a) => a.document_id === doc.id);
  for (const analysis of analyses) await store.remove('analyses', analysis.id);
  await store.remove('documents', doc.id);
  return { ok: true };
}

/* -------------------------------------------------------------- analyses */

async function patchAnalysis(id, fields) {
  const row = await store.get('analyses', id);
  if (!row) return null;
  const next = { ...row, ...fields };
  await store.put('analyses', next);
  return next;
}

async function runAnalysis(id) {
  try {
    const start = await patchAnalysis(id, { status: 'processing', stage: 'Menyiapkan teks dokumen', progress: 8 });
    if (!start) return;
    await sleep(180);

    const text = start.text || '';
    if (countWords(text) === 0) {
      await patchAnalysis(id, {
        status: 'failed',
        stage: 'Gagal',
        progress: 100,
        error: 'Dokumen tidak memiliki teks yang bisa dianalisis.',
        completed_at: nowIso(),
      });
      return;
    }

    await patchAnalysis(id, { stage: 'Mengekstrak fitur stilistik (frasa, ritme, kosakata)', progress: 35 });
    await sleep(180);

    // The real work: deterministic heuristic engine, same module the server uses.
    const result = detectLocal(text);

    await patchAnalysis(id, { stage: 'Menghitung skor per kalimat dan paragraf', progress: 82 });
    await sleep(180);

    const allSentences = result.paragraphs.flatMap((p) => p.sentences);
    await patchAnalysis(id, {
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
      result: {
        ...result,
        disclaimer: DISCLAIMER,
        sentenceCount: allSentences.length,
        recommendations: buildRecommendations(result),
      },
      completed_at: nowIso(),
    });

    const doc = await store.get('documents', start.document_id);
    if (doc) await store.put('documents', { ...doc, word_count: result.stats.words });
  } catch (error) {
    await patchAnalysis(id, {
      status: 'failed',
      stage: 'Gagal',
      progress: 100,
      error: error.message || 'Analisis gagal diproses.',
      completed_at: nowIso(),
    });
  }
}

async function createAnalysis(user, body) {
  const documentId = Number(body?.documentId);
  const suppliedText = typeof body?.text === 'string' ? body.text : null;
  if (!Number.isInteger(documentId)) throw new ApiError('Dokumen tidak valid.', 400);

  const doc = await store.get('documents', documentId);
  if (!doc || doc.user_id !== user.id) throw new ApiError('Dokumen tidak ditemukan.', 404);

  const text = suppliedText !== null ? suppliedText : doc.text;
  if (!text || countWords(text) < 5) {
    throw new ApiError('Teks terlalu pendek untuk dianalisis (minimal 5 kata).', 422);
  }

  const row = {
    id: await store.nextId('analyses'),
    user_id: user.id,
    document_id: doc.id,
    status: 'queued',
    stage: 'Menunggu antrean',
    progress: 0,
    source: suppliedText !== null ? 'revision' : 'original',
    text,
    engine_id: null,
    engine_name: null,
    engine_mode: null,
    ai_score: null,
    human_score: null,
    word_count: 0,
    sentence_count: 0,
    paragraph_count: 0,
    flagged_count: 0,
    high_count: 0,
    medium_count: 0,
    low_count: 0,
    confidence: null,
    result: null,
    draft_text: null,
    draft_updated_at: null,
    error: null,
    created_at: nowIso(),
    completed_at: null,
  };
  await store.put('analyses', row);

  setTimeout(() => { runAnalysis(row.id); }, 40);
  return { id: row.id, documentId: doc.id, source: row.source };
}

async function listAnalyses(user, query) {
  const q = String(query.get('q') || '').trim().toLowerCase();
  const level = String(query.get('level') || 'all');
  const [analyses, documents] = await Promise.all([store.all('analyses'), store.all('documents')]);
  const docsById = new Map(documents.map((d) => [d.id, d]));

  let rows = analyses.filter((a) => a.user_id === user.id).sort(byCreatedDesc);
  if (q) {
    rows = rows.filter((a) => {
      const doc = docsById.get(a.document_id);
      return (
        String(doc?.name || '').toLowerCase().includes(q) ||
        String(a.engine_name || '').toLowerCase().includes(q)
      );
    });
  }
  if (level === 'high') rows = rows.filter((a) => a.ai_score >= 68);
  else if (level === 'medium') rows = rows.filter((a) => a.ai_score >= 40 && a.ai_score < 68);
  else if (level === 'low') rows = rows.filter((a) => a.ai_score !== null && a.ai_score < 40);
  else if (level === 'failed') rows = rows.filter((a) => a.status === 'failed');

  return { analyses: rows.map((a) => analysisSummary(a, docsById.get(a.document_id))) };
}

async function getAnalysisStatus(user, id) {
  const row = await store.get('analyses', id);
  if (!row || row.user_id !== user.id) throw new ApiError('Analisis tidak ditemukan.', 404);
  return { id: row.id, status: row.status, stage: row.stage, progress: row.progress, error: row.error };
}

async function getAnalysis(user, id) {
  const row = await store.get('analyses', id);
  if (!row || row.user_id !== user.id) throw new ApiError('Analisis tidak ditemukan.', 404);
  const doc = await store.get('documents', row.document_id);

  let result = row.result;
  if (result && !result.recommendations) result = { ...result, recommendations: buildRecommendations(result) };

  return {
    analysis: analysisSummary(row, doc),
    document: {
      id: row.document_id,
      name: doc?.name || '',
      format: doc?.format || '',
      mime: doc?.mime || '',
      sizeBytes: doc?.size_bytes || 0,
      pageCount: doc?.page_count ?? null,
      wordCount: row.word_count,
      createdAt: row.created_at,
    },
    result,
    text: row.text,
    draft: row.draft_text || null,
    draftUpdatedAt: row.draft_updated_at || null,
  };
}

async function saveDraft(user, id, body) {
  const row = await store.get('analyses', id);
  if (!row || row.user_id !== user.id) throw new ApiError('Analisis tidak ditemukan.', 404);
  const text = String(body?.text ?? '');
  if (countWords(text) < 5) throw new ApiError('Draf revisi terlalu pendek.', 422);
  const updatedAt = nowIso();
  await store.put('analyses', { ...row, draft_text: text, draft_updated_at: updatedAt });
  return { ok: true, wordCount: countWords(text), updatedAt };
}

async function deleteAnalysis(user, id) {
  const row = await store.get('analyses', id);
  if (!row || row.user_id !== user.id) throw new ApiError('Analisis tidak ditemukan.', 404);
  await store.remove('analyses', id);
  return { ok: true };
}

/** Payload for the PDF report builder. */
export async function getReportData(id) {
  const user = await requireUser();
  const row = await store.get('analyses', Number(id));
  if (!row || row.user_id !== user.id) throw new ApiError('Analisis tidak ditemukan.', 404);
  if (row.status !== 'completed' || !row.result) {
    throw new ApiError('Laporan hanya tersedia untuk analisis yang sudah selesai.', 409);
  }
  const doc = await store.get('documents', row.document_id);
  return {
    analysis: row,
    document: {
      name: doc?.name || 'dokumen',
      format: doc?.format || '',
      pageCount: doc?.page_count ?? null,
    },
    user: publicUser(user),
    result: row.result,
  };
}

/* ------------------------------------------------------------- dashboard */

async function dashboard(user) {
  const [documents, analyses] = await Promise.all([store.all('documents'), store.all('analyses')]);
  const docs = documents.filter((d) => d.user_id === user.id);
  const own = analyses.filter((a) => a.user_id === user.id).sort(byCreatedDesc);
  const completed = own.filter((a) => a.status === 'completed');
  const docsById = new Map(documents.map((d) => [d.id, d]));

  const avgAi = completed.length
    ? Math.round(completed.reduce((total, a) => total + (a.ai_score || 0), 0) / completed.length)
    : null;

  const trend = completed
    .slice(0, 8)
    .reverse()
    .map((a) => ({
      id: a.id,
      ai_score: a.ai_score,
      created_at: a.created_at,
      document_name: docsById.get(a.document_id)?.name || '',
    }));

  return {
    stats: {
      documents: docs.length,
      analyses: own.length,
      completed: completed.length,
      active: own.filter((a) => a.status === 'queued' || a.status === 'processing').length,
      failed: own.filter((a) => a.status === 'failed').length,
      averageAiScore: avgAi,
      flaggedSections: completed.reduce((total, a) => total + (a.flagged_count || 0), 0),
      analyzedWords: completed.reduce((total, a) => total + (a.word_count || 0), 0),
      buckets: {
        high: completed.filter((a) => a.ai_score >= 68).length,
        medium: completed.filter((a) => a.ai_score >= 40 && a.ai_score < 68).length,
        low: completed.filter((a) => a.ai_score < 40).length,
      },
    },
    recent: own.slice(0, 6).map((a) => analysisSummary(a, docsById.get(a.document_id))),
    trend,
  };
}

/* -------------------------------------------------------------- settings */

async function getSettings(user) {
  return { settings: serializeSettings(await ensureSettings(user.id)) };
}

async function updateSettings(user, body) {
  const current = await ensureSettings(user.id);
  const next = {
    ...current,
    default_engine: ['auto', 'local'].includes(body?.defaultEngine) ? body.defaultEngine : current.default_engine,
    autosave_editor: body?.autosaveEditor === undefined ? current.autosave_editor : body.autosaveEditor ? 1 : 0,
    persist_highlights:
      body?.persistHighlights === undefined ? current.persist_highlights : body.persistHighlights ? 1 : 0,
    inapp_alerts: body?.inappAlerts === undefined ? current.inapp_alerts : body.inappAlerts ? 1 : 0,
    compact_tables: body?.compactTables === undefined ? current.compact_tables : body.compactTables ? 1 : 0,
    updated_at: nowIso(),
  };
  await store.put('settings', next);
  return { settings: serializeSettings(next) };
}

async function deleteAllDocuments(user) {
  const [documents, analyses] = await Promise.all([store.all('documents'), store.all('analyses')]);
  const own = documents.filter((d) => d.user_id === user.id);
  for (const doc of own) await store.remove('documents', doc.id);
  for (const analysis of analyses.filter((a) => a.user_id === user.id)) await store.remove('analyses', analysis.id);
  return { ok: true, deleted: own.length };
}

/* --------------------------------------------------------------- router */

const ROUTES = [];

function route(method, pattern, handler) {
  ROUTES.push({ method, parts: pattern.split('/').filter(Boolean), handler });
}

route('GET', '/auth/me', () => me());
route('POST', '/auth/login', (_user, _params, body) => login(body));
route('POST', '/auth/register', (_user, _params, body) => register(body));
route('POST', '/auth/logout', () => {
  store.clearSession();
  return { ok: true };
});
route('PATCH', '/auth/profile', (user, _params, body) => updateProfile(user, body));
route('POST', '/auth/password', (user, _params, body) => changePassword(user, body));

route('GET', '/documents', (user) => listDocuments(user).then((documents) => ({ documents })));
route('GET', '/documents/:id', (user, params) => getDocument(user, Number(params.id)));
route('DELETE', '/documents/:id', (user, params) => deleteDocument(user, Number(params.id)));

route('GET', '/analyses', (user, _params, _body, query) => listAnalyses(user, query));
route('POST', '/analyses', (user, _params, body) => createAnalysis(user, body));
route('GET', '/analyses/:id', (user, params) => getAnalysis(user, Number(params.id)));
route('DELETE', '/analyses/:id', (user, params) => deleteAnalysis(user, Number(params.id)));
route('GET', '/analyses/:id/status', (user, params) => getAnalysisStatus(user, Number(params.id)));
route('PATCH', '/analyses/:id/draft', (user, params, body) => saveDraft(user, Number(params.id), body));

route('GET', '/dashboard', (user) => dashboard(user));

route('GET', '/settings', (user) => getSettings(user));
route('PATCH', '/settings', (user, _params, body) => updateSettings(user, body));
route('DELETE', '/settings/documents', (user) => deleteAllDocuments(user));

function match(method, segments) {
  for (const entry of ROUTES) {
    if (entry.method !== method || entry.parts.length !== segments.length) continue;
    const params = {};
    const ok = entry.parts.every((part, index) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = segments[index];
        return true;
      }
      return part === segments[index];
    });
    if (ok) return { handler: entry.handler, params };
  }
  return null;
}

/** Entry point used by client/src/lib/api.js in the static build. */
export async function request(method, path, body) {
  const [rawPath, rawQuery = ''] = String(path).split('?');
  const segments = rawPath.split('/').filter(Boolean);
  const query = new URLSearchParams(rawQuery);

  const found = match(method, segments);
  if (!found) throw new ApiError('Permintaan tidak dikenal.', 404);

  const isPublic = ['/auth/login', '/auth/register', '/auth/logout'].includes(`/${segments.join('/')}`);
  const user = isPublic ? null : await requireUser();
  return found.handler(user, found.params, body, query);
}
