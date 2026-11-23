import { config } from '../../config.js';
import { clamp } from '../text.js';

/**
 * Optional integration point for an external detector API.
 *
 * Expected contract (POST { url } with JSON body `{ text }` and header
 * `Authorization: Bearer <DETECTOR_API_KEY>`):
 *
 *   200 { "aiProbability": 0.72,                 // 0..1 or 0..100
 *         "sentences": [{ "index": 3, "aiProbability": 0.9, "reason": "..." }] }   // optional
 *
 * If the endpoint is unreachable or returns an unusable payload the caller falls
 * back to the local heuristic engine, and the fallback is recorded in the result
 * so the UI can state which engine produced the numbers.
 */
export function remoteDetectorConfigured() {
  return Boolean(config.remoteDetector.url && config.remoteDetector.apiKey);
}

export async function detectRemote(text, localResult) {
  if (!remoteDetectorConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.remoteDetector.timeoutMs);
  try {
    const response = await fetch(config.remoteDetector.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.remoteDetector.apiKey}`,
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, reason: `http_${response.status}` };
    }
    const payload = await response.json();
    let prob = Number(payload.aiProbability);
    if (!Number.isFinite(prob)) return { ok: false, reason: 'invalid_payload' };
    if (prob <= 1) prob *= 100;
    prob = clamp(prob, 0, 100);

    const sentenceScores = new Map();
    if (Array.isArray(payload.sentences)) {
      payload.sentences.forEach((s, i) => {
        let p = Number(s.aiProbability);
        if (!Number.isFinite(p)) return;
        if (p <= 1) p *= 100;
        const key = Number.isInteger(s.index) ? s.index : i;
        sentenceScores.set(key, { score: clamp(p, 0, 100), reason: s.reason || '' });
      });
    }

    // Re-map external scores onto the sentence structure we already built.
    let flatIndex = 0;
    const paragraphs = localResult.paragraphs.map((p) => {
      const sentences = p.sentences.map((s) => {
        const ext = sentenceScores.get(flatIndex);
        flatIndex += 1;
        if (!ext) return s;
        const level = ext.score >= 68 ? 'high' : ext.score >= 40 ? 'medium' : 'low';
        return {
          ...s,
          aiScore: Math.round(ext.score),
          level,
          reasons: ext.reason ? [ext.reason] : s.reasons,
          suggestion:
            level === 'high'
              ? 'Tulis ulang bagian ini dengan kalimat Anda sendiri.'
              : level === 'medium'
                ? 'Periksa ulang bagian ini dan pastikan sesuai gaya penulisan Anda.'
                : 'Tidak ada tindakan khusus yang diperlukan.',
        };
      });
      const aiScore = Math.round(
        sentences.reduce((a, s) => a + s.aiScore * Math.max(1, s.text.length), 0) /
          Math.max(1, sentences.reduce((a, s) => a + Math.max(1, s.text.length), 0)),
      );
      return {
        ...p,
        sentences,
        aiScore,
        level: aiScore >= 68 ? 'high' : aiScore >= 40 ? 'medium' : 'low',
      };
    });

    const all = paragraphs.flatMap((p) => p.sentences);
    const aiScore = Math.round(prob);
    return {
      ok: true,
      result: {
        ...localResult,
        engine: {
          id: 'kireai-remote-v1',
          name: payload.engineName || 'External Detector API',
          mode: 'remote',
          version: '1.0.0',
          note: 'Skor berasal dari API detektor eksternal yang dikonfigurasi administrator; detail per kalimat dipetakan ke struktur dokumen lokal.',
        },
        scores: { ai: aiScore, human: 100 - aiScore },
        distribution: {
          high: all.filter((s) => s.level === 'high').length,
          medium: all.filter((s) => s.level === 'medium').length,
          low: all.filter((s) => s.level === 'low').length,
        },
        paragraphs,
        verdict: {
          level: aiScore >= 68 ? 'high' : aiScore >= 40 ? 'medium' : 'low',
          title: 'Hasil model eksternal',
          summary: `Model detektor eksternal memperkirakan ${aiScore}% teks berindikasi AI. Bagian berwarna menunjukkan kalimat yang paling berkontribusi pada estimasi ini.`,
        },
      },
    };
  } catch (error) {
    return { ok: false, reason: error.name === 'AbortError' ? 'timeout' : 'network_error' };
  } finally {
    clearTimeout(timer);
  }
}
