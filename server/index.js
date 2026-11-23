import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config, CLIENT_DIST } from './config.js';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import analysisRoutes from './routes/analyses.js';
import settingsRoutes from './routes/settings.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

// Simple in-memory brute-force guard for the auth endpoints.
const attempts = new Map();
app.use('/api/auth', (req, res, next) => {
  if (req.method !== 'POST') return next();
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, reset: now + 10 * 60 * 1000 };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + 10 * 60 * 1000;
  }
  entry.count += 1;
  attempts.set(key, entry);
  if (entry.count > 40) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.' });
  }
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'kirAI', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

// Serve the built client when available (production / single-port mode).
if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
} else {
  app.get('/', (_req, res) =>
    res
      .status(200)
      .type('text/plain')
      .send('kirAI API aktif. Jalankan klien dengan "npm run dev:client" atau build dengan "npm run build".'),
  );
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Ukuran file melebihi batas 10 MB.' });
    }
    return res.status(400).json({ error: `Upload gagal: ${err.message}` });
  }
  const status = err.status || 500;
  if (status >= 500) console.error('[kirAI] error:', err);
  res.status(status).json({ error: err.message || 'Terjadi kesalahan pada server.' });
});

app.listen(config.port, () => {
  console.log(`kirAI API listening on http://127.0.0.1:${config.port}`);
});
