import express from 'express';
import bcrypt from 'bcryptjs';
import { db, ensureSettings, nowIso, publicUser } from '../db.js';
import { clearSessionCookie, requireAuth, setSessionCookie, signSession } from '../middleware/auth.js';

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

function validateRegistration({ name, email, password }) {
  if (!name || name.trim().length < 2) return 'Nama minimal 2 karakter.';
  if (!email || !EMAIL_RE.test(email)) return 'Format email tidak valid.';
  if (!password || password.length < 8) return 'Kata sandi minimal 8 karakter.';
  return null;
}

router.post('/register', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  const error = validateRegistration({ name, email, password });
  if (error) return res.status(400).json({ error });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email sudah terdaftar. Silakan masuk.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, institution, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, email, hash, String(req.body?.institution || '').trim(), String(req.body?.role || 'Mahasiswa').trim(), nowIso());

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid));
  ensureSettings(user.id);
  setSessionCookie(res, signSession(user));
  return res.status(201).json({ user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email atau kata sandi salah.' });
  }
  ensureSettings(user.id);
  setSessionCookie(res, signSession(user));
  return res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const settings = ensureSettings(req.user.id);
  res.json({
    user: req.user,
    settings: {
      defaultEngine: settings.default_engine,
      autosaveEditor: Boolean(settings.autosave_editor),
      persistHighlights: Boolean(settings.persist_highlights),
      inappAlerts: Boolean(settings.inapp_alerts),
      compactTables: Boolean(settings.compact_tables),
    },
  });
});

router.patch('/profile', requireAuth, (req, res) => {
  const name = String(req.body?.name ?? req.user.name).trim();
  const institution = String(req.body?.institution ?? req.user.institution).trim();
  const role = String(req.body?.role ?? req.user.role).trim();
  const avatarColor = String(req.body?.avatarColor ?? req.user.avatarColor).trim();
  if (name.length < 2) return res.status(400).json({ error: 'Nama minimal 2 karakter.' });

  db.prepare('UPDATE users SET name = ?, institution = ?, role = ?, avatar_color = ? WHERE id = ?').run(
    name,
    institution,
    role,
    avatarColor,
    req.user.id,
  );
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

router.post('/password', requireAuth, (req, res) => {
  const current = String(req.body?.currentPassword || '');
  const next = String(req.body?.newPassword || '');
  if (next.length < 8) return res.status(400).json({ error: 'Kata sandi baru minimal 8 karakter.' });

  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current, row.password_hash)) {
    return res.status(400).json({ error: 'Kata sandi saat ini tidak cocok.' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 10), req.user.id);
  res.json({ ok: true });
});

export default router;
