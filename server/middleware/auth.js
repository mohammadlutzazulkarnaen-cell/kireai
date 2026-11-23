import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db, publicUser } from '../db.js';

export function signSession(user) {
  return jwt.sign({ sub: String(user.id) }, config.jwtSecret, {
    expiresIn: `${config.jwtTtlDays}d`,
  });
}

export function setSessionCookie(res, token) {
  res.cookie(config.jwtCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: config.jwtTtlDays * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.jwtCookie, { path: '/' });
}

export function requireAuth(req, res, next) {
  req.user = null;
  const token = req.cookies?.[config.jwtCookie];
  if (!token) return res.status(401).json({ error: 'Anda harus masuk terlebih dahulu.' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(payload.sub));
    if (!row) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Sesi tidak valid. Silakan masuk kembali.' });
    }
    req.user = publicUser(row);
    return next();
  } catch {
    clearSessionCookie(res);
    return res.status(401).json({ error: 'Sesi berakhir. Silakan masuk kembali.' });
  }
}

export function optionalAuth(req, _res, next) {
  const token = req.cookies?.[config.jwtCookie];
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const row = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(payload.sub));
      if (row) req.user = publicUser(row);
    } catch {
      /* ignore invalid session for public endpoints */
    }
  }
  next();
}
