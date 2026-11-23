import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth/mammoth.browser.js';
import { normalizeWhitespace } from '@shared/text.js';

/**
 * Text extraction in the browser.
 *
 * Same rules as server/services/extract.js (format detection, signature check,
 * PDF page loop, DOCX warnings, TXT encoding fallback) but the parsing happens
 * on the visitor's device instead of a server. pdfjs-dist and mammoth are the
 * browser builds of the libraries the server uses, so extracted text matches.
 */

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_BYTES = 10 * 1024 * 1024;

export function detectFormat(originalName, mime = '') {
  const ext = String(originalName || '').split('.').pop().toLowerCase();
  if (['pdf', 'docx', 'txt'].includes(ext)) return ext;
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'text/plain') return 'txt';
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  return '';
}

/** Sniff real file signature so a renamed file cannot bypass validation. */
export function validateSignature(bytes, format) {
  if (!bytes || bytes.length < 4) return false;
  if (format === 'pdf') {
    return String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
  }
  if (format === 'docx') return bytes[0] === 0x50 && bytes[1] === 0x4b; // ZIP "PK"
  return true;
}

async function extractPdf(bytes) {
  const loadingTask = pdfjs.getDocument({
    data: bytes,
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
  const pageCount = pdf.numPages;
  await pdf.destroy();
  return { text: parts.join('\n\n'), pageCount };
}

async function extractDocx(bytes) {
  const { value, messages } = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
  const warnings = (messages || []).filter((m) => m.type === 'warning').map((m) => m.message);
  return { text: value, pageCount: null, warnings };
}

function extractTxt(bytes) {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes);
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.slice(3));
  }
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const replacementRatio = (utf8.match(/\uFFFD/g) || []).length / Math.max(1, utf8.length);
  if (replacementRatio > 0.02) return new TextDecoder('latin1').decode(bytes);
  return utf8;
}

export async function extractText(bytes, format) {
  let result;
  if (format === 'pdf') result = await extractPdf(bytes);
  else if (format === 'docx') result = await extractDocx(bytes);
  else if (format === 'txt') result = { text: extractTxt(bytes), pageCount: null };
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

export function readFileBytes(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_BYTES) {
      reject(Object.assign(new Error('Ukuran file melebihi batas 10 MB.'), { status: 413 }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(new Error('File tidak dapat dibaca dari perangkat ini.'));
    reader.readAsArrayBuffer(file);
  });
}
