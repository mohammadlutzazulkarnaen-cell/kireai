import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT, 'server', 'data');
export const CLIENT_DIST = path.join(ROOT, 'client', 'dist');

fs.mkdirSync(DATA_DIR, { recursive: true });

/**
 * JWT secret: read from env, otherwise generate once and persist locally so
 * sessions survive a server restart without a hardcoded secret in the repo.
 */
function resolveJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16) {
    return process.env.JWT_SECRET;
  }
  const secretFile = path.join(DATA_DIR, '.jwt-secret');
  if (fs.existsSync(secretFile)) return fs.readFileSync(secretFile, 'utf8').trim();
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(secretFile, secret, { mode: 0o600 });
  return secret;
}

const envPort = Number(process.env.PORT);

export const config = {
  port: Number.isInteger(envPort) && envPort > 0 ? envPort : 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: resolveJwtSecret(),
  jwtCookie: 'kireai_session',
  jwtTtlDays: 7,
  dbFile: path.join(DATA_DIR, 'kireai.db'),
  maxUploadBytes: 10 * 1024 * 1024,
  allowedFormats: ['pdf', 'docx', 'txt'],
  /**
   * Optional remote detector. When DETECTOR_API_URL + DETECTOR_API_KEY are set,
   * kirAI forwards the text to that endpoint first and only falls back to the
   * local heuristic engine if the call fails. See server/services/detect/remote.js
   * for the expected contract.
   */
  remoteDetector: {
    url: process.env.DETECTOR_API_URL || '',
    apiKey: process.env.DETECTOR_API_KEY || '',
    timeoutMs: Number(process.env.DETECTOR_TIMEOUT_MS || 20000),
  },
};
