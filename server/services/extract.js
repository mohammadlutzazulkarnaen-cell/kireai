import path from 'node:path';
import mammoth from 'mammoth';
import { normalizeWhitespace } from './text.js';

/**
 * Document text extraction module.
 * Kept separate from the detection module: extraction only turns bytes into
 * plain text, it never scores anything.
 */

export function detectFormat(originalName, mime = '') {
  const ext = path.extname(originalName || '').toLowerCase().replace('.', '');
  if (['pdf', 'docx', 'txt'].includes(ext)) return ext;
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'text/plain') return 'txt';
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  return '';
}

/** Sniff real file signature so a renamed file cannot bypass validation. */
export function validateSignature(buffer, format) {
  if (!buffer || buffer.length < 4) return false;
  if (format === 'pdf') return buffer.slice(0, 5).toString('latin1') === '%PDF-';
  if (format === 'docx') return buffer[0] === 0x50 && buffer[1] === 0x4b; // ZIP "PK"
  return true; // txt: accept any decodable text
}

async function extractPdf(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const parts = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let line = '';
    const lines = [];
    for (const item of content.items) {
      if (typeof item.str !== 'string') continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line.trim());
        line = '';
      } else if (!/\s$/.test(item.str)) {
        line += ' ';
      }
    }
    if (line.trim()) lines.push(line.trim());
    parts.push(lines.filter((l) => l.length > 0).join('\n'));
    page.cleanup();
  }
  await pdf.destroy();
  return { text: parts.join('\n\n'), pageCount: pdf.numPages };
}

async function extractDocx(buffer) {
  const { value, messages } = await mammoth.extractRawText({ buffer });
  const warnings = (messages || []).filter((m) => m.type === 'warning').map((m) => m.message);
  return { text: value, pageCount: null, warnings };
}

function extractTxt(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buffer);
  }
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(buffer.slice(3));
  }
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const replacementRatio = (utf8.match(/\uFFFD/g) || []).length / Math.max(1, utf8.length);
  if (replacementRatio > 0.02) return new TextDecoder('latin1').decode(buffer);
  return utf8;
}

export async function extractText(buffer, format) {
  let result;
  if (format === 'pdf') result = await extractPdf(buffer);
  else if (format === 'docx') result = await extractDocx(buffer);
  else if (format === 'txt') result = { text: extractTxt(buffer), pageCount: null };
  else throw Object.assign(new Error('Format dokumen tidak didukung.'), { status: 400 });

  const text = normalizeWhitespace(result.text);
  if (!text || text.replace(/\s/g, '').length < 20) {
    throw Object.assign(
      new Error(
        'Tidak ada teks yang dapat diekstrak dari dokumen ini. Jika PDF merupakan hasil pindai (gambar), jalankan OCR terlebih dahulu.',
      ),
      { status: 422 },
    );
  }
  return {
    text,
    pageCount: result.pageCount ?? null,
    warnings: result.warnings || [],
  };
}
