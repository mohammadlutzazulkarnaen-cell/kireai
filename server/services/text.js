/**
 * Text utilities shared by the extraction and detection layers.
 * Keeps paragraph/sentence splitting deterministic so that the offsets stored
 * in an analysis result always map back onto the analyzed text.
 */

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'e.g', 'i.e',
  'no', 'vol', 'fig', 'al', 'dll', 'dsb', 'dst', 'hlm', 'thn', 'tgl', 'sdr', 'dr',
]);

const CLOSERS = new Set(['"', "'", '”', '’', ')', ']', '»']);

export function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Split into paragraphs. Prefers blank-line separation; falls back to single
 * newlines when the source has no blank lines (common in PDF/DOCX extraction).
 */
export function splitParagraphs(rawText) {
  const text = normalizeWhitespace(rawText);
  if (!text) return [];
  let blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length < 2) {
    blocks = text.split(/\n+/).map((b) => b.trim()).filter(Boolean);
  }
  return blocks.map((block) => block.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim());
}

function isAbbreviation(chunk) {
  const match = chunk.match(/([A-Za-z.]+)$/);
  if (!match) return false;
  const cleaned = match[1].replace(/\.+$/, '').toLowerCase();
  if (ABBREVIATIONS.has(cleaned)) return true;
  // single letter initial, e.g. "J. Smith"
  if (/^[a-z]$/.test(cleaned)) return true;
  return false;
}

/**
 * Split a paragraph into sentences, preserving original substrings (trimmed).
 * Handles EN/ID abbreviations and quoted endings.
 */
export function splitSentences(paragraph) {
  const text = String(paragraph || '').trim();
  if (!text) return [];
  const out = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const isTerminator = ch === '.' || ch === '!' || ch === '?' || ch === '…';
    if (!isTerminator) continue;

    // consume runs like "?!", "..." and trailing closers
    let end = i + 1;
    while (end < text.length && /[.!?…"'”’)\]]/.test(text[end])) end += 1;

    const nextChar = text[end];
    if (nextChar && !/\s/.test(nextChar)) {
      i = end - 1;
      continue;
    }
    if (ch === '.' && isAbbreviation(text.slice(start, end))) {
      i = end - 1;
      continue;
    }

    const candidate = text.slice(start, end).trim();
    if (candidate) out.push(candidate);
    start = end;
    // skip whitespace
    while (start < text.length && /\s/.test(text[start])) start += 1;
    i = start - 1;
  }
  const tail = text.slice(start).trim();
  if (tail) {
    // merge orphan closers into the previous sentence
    if (out.length && tail.length <= 3 && /^["'”’)\]]+$/.test(tail)) {
      out[out.length - 1] += tail;
    } else {
      out.push(tail);
    }
  }
  return out.filter((s) => s.length > 0);
}

export function words(text) {
  return String(text || '').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) || [];
}

export function countWords(text) {
  return words(text).length;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function round(value, digits = 1) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Build paragraphs + sentences with stable ids for the UI. */
export function segmentText(rawText) {
  const paragraphs = splitParagraphs(rawText);
  return paragraphs.map((pText, pIndex) => {
    const sentences = splitSentences(pText).map((s, sIndex) => ({
      id: `p${pIndex}s${sIndex}`,
      index: sIndex,
      text: s,
    }));
    return { id: `p${pIndex}`, index: pIndex, text: pText, sentences };
  });
}

export function readingTimeMinutes(wordCount) {
  return Math.max(1, Math.round(wordCount / 220));
}
