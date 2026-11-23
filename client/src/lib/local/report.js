import { jsPDF } from 'jspdf';

/**
 * PDF report for the browser-only build.
 *
 * Mirrors the layout of server/services/report.js (header, score boxes,
 * distribution, verdict, signals, methodology, per-section detail, disclaimer)
 * but draws it with jsPDF, which runs in the browser. Every number printed here
 * comes from the stored analysis result — nothing is recomputed or invented.
 */

function sanitize(value) {
  return String(value ?? '')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00a0/g, ' ')
    .replace(/\t/g, '  ')
    .replace(/[^\x0A\x20-\xFF]/g, '');
}

const NAVY = '#101527';
const NAVY_SOFT = '#2B3350';
const MUTED = '#5F6885';
const BORDER = '#DDE1EC';
const ACCENT = '#6D5EF8';
const RISK = { high: '#E0483D', medium: '#E5A117', low: '#2F9E64' };
const LEVEL_LABEL = { high: 'TINGGI', medium: 'SEDANG', low: 'RENDAH' };

const MARGIN = 46;
const BOTTOM = 58;

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function buildReportPdf({ analysis, document: doc, user, result }) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;

  pdf.setProperties({
    title: `Laporan kirAI - ${sanitize(doc.name)}`,
    author: 'kirAI',
    subject: 'Laporan estimasi konten AI',
  });

  let y = 0;

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - BOTTOM) {
      pdf.addPage();
      y = MARGIN;
    }
  };

  const sectionTitle = (text, num) => {
    ensureSpace(46);
    y += 14;
    if (num) {
      pdf.setFillColor(ACCENT);
      pdf.roundedRect(MARGIN, y - 10, 18, 18, 5, 5, 'F');
      pdf.setTextColor('#FFFFFF').setFont('helvetica', 'bold').setFontSize(9);
      pdf.text(String(num), MARGIN + 6, y + 2.5);
      pdf.setTextColor(NAVY).setFont('helvetica', 'bold').setFontSize(12.5);
      pdf.text(sanitize(text), MARGIN + 26, y + 2);
    } else {
      pdf.setTextColor(NAVY).setFont('helvetica', 'bold').setFontSize(12.5);
      pdf.text(sanitize(text), MARGIN, y);
    }
    y += 14;
  };

  // ---------------- Header ----------------
  pdf.setFillColor(NAVY).rect(0, 0, pageWidth, 104, 'F');
  pdf.setFillColor(ACCENT).rect(0, 104, pageWidth, 3, 'F');
  pdf.setTextColor('#FFFFFF').setFont('helvetica', 'bold').setFontSize(22).text('kirAI', MARGIN, 44);
  pdf.setTextColor('#B3A5FF').setFont('helvetica', 'normal').setFontSize(8.5)
    .text('AI CONTENT DETECTOR & DOCUMENT ANALYZER', MARGIN, 60);
  pdf.setTextColor('#C3C9DA').setFontSize(8);
  pdf.text(`Dibuat: ${sanitize(formatDate(new Date().toISOString()))}`, pageWidth - MARGIN - 220, 34, { align: 'left' });
  pdf.text(`Pengguna: ${sanitize(user.name)}`, pageWidth - MARGIN - 220, 48);
  pdf.text(`ID analisis: #${analysis.id}`, pageWidth - MARGIN - 220, 62);
  pdf.setTextColor('#FFFFFF').setFont('helvetica', 'bold').setFontSize(13)
    .text('Laporan Analisis Dokumen', pageWidth - MARGIN, 88, { align: 'right' });

  y = 126;

  // ---------------- Document meta ----------------
  const metaRows = [
    ['Nama dokumen', doc.name],
    ['Format dokumen', `${String(doc.format || '').toUpperCase()}${doc.pageCount ? ` - ${doc.pageCount} halaman` : ''}`],
    ['Tanggal pemeriksaan', formatDate(analysis.completed_at || analysis.created_at)],
    ['Mesin analisis', `${analysis.engine_name || 'kirAI Heuristic Engine v1'} (${analysis.engine_mode === 'remote' ? 'API eksternal' : 'lokal'})`],
    ['Tingkat keyakinan', String(result?.confidence || '-')],
    ['Jumlah kata', String(result?.stats?.words ?? analysis.word_count ?? 0)],
  ];
  const colW = (contentWidth - 16) / 2;
  const metaY = y;
  metaRows.forEach(([label, value], i) => {
    const x = MARGIN + (i % 2) * (colW + 16);
    const rowY = metaY + Math.floor(i / 2) * 34;
    pdf.setTextColor(MUTED).setFont('helvetica', 'normal').setFontSize(7.5)
      .text(sanitize(label.toUpperCase()), x, rowY);
    const lines = pdf.splitTextToSize(sanitize(value), colW);
    pdf.setTextColor(NAVY).setFont('helvetica', 'bold').setFontSize(9.5)
      .text(lines[0] || '-', x, rowY + 12);
  });
  y = metaY + Math.ceil(metaRows.length / 2) * 34 + 4;

  // ---------------- Score boxes ----------------
  sectionTitle('Ringkasan Skor', 1);
  const boxes = [
    ['AI PROBABILITY', `${analysis.ai_score ?? result.scores.ai}%`, RISK.high],
    ['HUMAN-LIKE TEXT', `${analysis.human_score ?? result.scores.human}%`, RISK.low],
    ['KALIMAT TERINDIKASI', `${(analysis.high_count || 0) + (analysis.medium_count || 0)} dari ${result.stats.sentences}`, ACCENT],
  ];
  const boxGap = 12;
  const boxW = (contentWidth - boxGap * 2) / 3;
  const boxY = y;
  boxes.forEach(([label, value, color], i) => {
    const x = MARGIN + i * (boxW + boxGap);
    pdf.setFillColor('#F6F7FB').setDrawColor(BORDER).setLineWidth(0.7);
    pdf.roundedRect(x, boxY, boxW, 66, 8, 8, 'FD');
    pdf.setFillColor(color).rect(x, boxY, boxW, 3, 'F');
    pdf.setTextColor(MUTED).setFont('helvetica', 'normal').setFontSize(7).text(label, x + 12, boxY + 20);
    pdf.setTextColor(NAVY).setFont('helvetica', 'bold').setFontSize(18)
      .text(pdf.splitTextToSize(sanitize(value), boxW - 24)[0], x + 12, boxY + 46);
  });
  y = boxY + 82;

  // ---------------- Distribution ----------------
  const dist = result.distribution || { high: 0, medium: 0, low: 0 };
  const totalSentences = Math.max(1, dist.high + dist.medium + dist.low);
  sectionTitle('Distribusi Kalimat', 2);
  const barY = y - 6;
  const barH = 12;
  pdf.setFillColor('#EDEFF6').roundedRect(MARGIN, barY, contentWidth, barH, 6, 6, 'F');
  let barX = MARGIN;
  [['high', dist.high, RISK.high], ['medium', dist.medium, RISK.medium], ['low', dist.low, RISK.low]].forEach(([, count, color]) => {
    const w = (count / totalSentences) * contentWidth;
    if (w > 0.5) pdf.setFillColor(color).rect(barX, barY, w, barH, 'F');
    barX += w;
  });
  y = barY + 30;
  pdf.setFont('helvetica', 'normal').setFontSize(8.5);
  let lx = MARGIN;
  [
    [`Indikasi tinggi: ${dist.high} kalimat`, RISK.high],
    [`Indikasi sedang: ${dist.medium} kalimat`, RISK.medium],
    [`Indikasi rendah: ${dist.low} kalimat`, RISK.low],
  ].forEach(([label, color]) => {
    pdf.setFillColor(color).circle(lx + 3, y - 3, 3, 'F');
    pdf.setTextColor(NAVY_SOFT).text(sanitize(label), lx + 11, y);
    lx += 180;
  });
  y += 22;

  // ---------------- Verdict ----------------
  sectionTitle('Kesimpulan Pemeriksaan', 3);
  const verdict = result.verdict || {};
  const verdictColor = RISK[verdict.level] || ACCENT;
  const summaryLines = pdf.splitTextToSize(sanitize(verdict.summary || ''), contentWidth - 28);
  const boxHeight = 30 + summaryLines.length * 12 + 12;
  ensureSpace(boxHeight + 10);
  const top = y - 4;
  pdf.setFillColor('#F9F9FD').setDrawColor(BORDER).setLineWidth(0.7);
  pdf.roundedRect(MARGIN, top, contentWidth, boxHeight, 8, 8, 'FD');
  pdf.setFillColor(verdictColor).rect(MARGIN, top, 3.5, boxHeight, 'F');
  pdf.setTextColor(verdictColor).setFont('helvetica', 'bold').setFontSize(10.5)
    .text(sanitize((verdict.title || 'Ringkasan').toUpperCase()), MARGIN + 14, top + 20);
  pdf.setTextColor(NAVY_SOFT).setFont('helvetica', 'normal').setFontSize(9.5);
  summaryLines.forEach((line, i) => pdf.text(line, MARGIN + 14, top + 38 + i * 12));
  y = top + boxHeight + 14;

  if (Array.isArray(result.topSignals) && result.topSignals.length) {
    sectionTitle('Sinyal Utama Yang Terdeteksi');
    result.topSignals.slice(0, 5).forEach((signal) => {
      ensureSpace(20);
      pdf.setFillColor(ACCENT).circle(MARGIN + 3, y - 3, 2, 'F');
      pdf.setTextColor(NAVY_SOFT).setFont('helvetica', 'normal').setFontSize(9);
      const lines = pdf.splitTextToSize(sanitize(`${signal.label} (${signal.count} kalimat)`), contentWidth - 12);
      pdf.text(lines, MARGIN + 12, y);
      y += lines.length * 11 + 4;
    });
    y += 4;
  }

  // ---------------- Method ----------------
  sectionTitle('Metodologi', 4);
  const methodText = sanitize(
    `${result.engine?.note || ''} Setiap kalimat diberi skor berdasarkan kombinasi sinyal: frasa formulaik khas model bahasa, ` +
      `keseragaman panjang kalimat (burstiness), kekayaan kosakata, kepadatan nominalisasi, dan penanda gaya personal ` +
      `(kontraksi, kata ganti orang pertama, ungkapan informal). Skor dokumen adalah rata-rata berbobot panjang kalimat.`,
  );
  pdf.setTextColor(NAVY_SOFT).setFont('helvetica', 'normal').setFontSize(9);
  pdf.splitTextToSize(methodText, contentWidth).forEach((line) => {
    ensureSpace(14);
    pdf.text(line, MARGIN, y);
    y += 12;
  });
  y += 6;

  // ---------------- Per-section detail ----------------
  sectionTitle('Rincian Hasil Per Bagian', 5);
  const paragraphs = result.paragraphs || [];
  const MAX_PARAGRAPHS = 60;
  paragraphs.slice(0, MAX_PARAGRAPHS).forEach((paragraph, index) => {
    ensureSpace(64);
    const headerY = y - 8;
    const color = RISK[paragraph.level] || MUTED;
    pdf.setFillColor('#F3F4FA').roundedRect(MARGIN, headerY, contentWidth, 22, 5, 5, 'F');
    pdf.setFillColor(color).rect(MARGIN, headerY, 3, 22, 'F');
    pdf.setTextColor(NAVY).setFont('helvetica', 'bold').setFontSize(9)
      .text(sanitize(`Bagian ${index + 1} - ${paragraph.aiScore}% indikasi AI`), MARGIN + 12, headerY + 14);
    pdf.setTextColor(color).setFont('helvetica', 'bold').setFontSize(7.5)
      .text(LEVEL_LABEL[paragraph.level] || '', pageWidth - MARGIN, headerY + 14, { align: 'right' });
    y = headerY + 34;

    paragraph.sentences.forEach((sentence) => {
      const textLines = pdf.splitTextToSize(sanitize(sentence.text), contentWidth - 96);
      const textHeight = textLines.length * 11;
      ensureSpace(textHeight + 14);
      const rowY = y;
      pdf.setFillColor(RISK[sentence.level] || MUTED).rect(MARGIN, rowY - 8, 2, Math.max(8, textHeight - 1), 'F');
      pdf.setTextColor('#8F97B0').setFont('helvetica', 'bold').setFontSize(6.5)
        .text(`${LEVEL_LABEL[sentence.level]} ${sentence.aiScore}%`, MARGIN + 10, rowY);
      pdf.setTextColor(NAVY_SOFT).setFont('helvetica', 'normal').setFontSize(8.8);
      textLines.forEach((line, i) => pdf.text(line, MARGIN + 88, rowY + i * 11));
      y = rowY + textHeight - 2;
      if (sentence.level !== 'low' && sentence.reasons?.length) {
        const reasonLines = pdf.splitTextToSize(sanitize(`Dasar penilaian: ${sentence.reasons.join(' ')}`), contentWidth - 96);
        pdf.setTextColor(MUTED).setFont('helvetica', 'italic').setFontSize(7.4);
        reasonLines.forEach((line) => {
          ensureSpace(12);
          pdf.text(line, MARGIN + 88, y);
          y += 9;
        });
      }
      y += 5;
    });
    y += 4;
  });

  if (paragraphs.length > MAX_PARAGRAPHS) {
    ensureSpace(24);
    pdf.setTextColor(MUTED).setFont('helvetica', 'italic').setFontSize(8);
    pdf.text(
      `Rincian dibatasi pada ${MAX_PARAGRAPHS} bagian pertama dari ${paragraphs.length} bagian. Buka aplikasi untuk melihat seluruh dokumen.`,
      MARGIN,
      y,
      { maxWidth: contentWidth },
    );
    y += 16;
  }

  // ---------------- Disclaimer ----------------
  ensureSpace(80);
  y += 10;
  const noteText = sanitize(
    result.disclaimer ||
      'Hasil ini adalah estimasi probabilitas berdasarkan pola permukaan teks, bukan bukti pasti penggunaan AI.',
  );
  const noteLines = pdf.splitTextToSize(noteText, contentWidth - 24);
  const noteH = 30 + noteLines.length * 10;
  pdf.setFillColor('#FFF7E8').setDrawColor('#F0DDB4').setLineWidth(0.7);
  pdf.roundedRect(MARGIN, y, contentWidth, noteH, 6, 6, 'FD');
  pdf.setTextColor('#8A6415').setFont('helvetica', 'bold').setFontSize(8)
    .text('CATATAN PENTING', MARGIN + 12, y + 16);
  pdf.setTextColor('#7A5A12').setFont('helvetica', 'normal').setFontSize(8);
  noteLines.forEach((line, i) => pdf.text(line, MARGIN + 12, y + 30 + i * 10));

  // ---------------- Footer with page numbers ----------------
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    pdf.setPage(i);
    const bottom = pageHeight - 34;
    pdf.setDrawColor(BORDER).setLineWidth(0.7)
      .line(MARGIN, bottom - 8, pageWidth - MARGIN, bottom - 8);
    pdf.setTextColor('#8F97B0').setFont('helvetica', 'normal').setFontSize(7.5);
    pdf.text('kirAI - laporan estimasi konten AI. Bukan bukti definitif.', MARGIN, bottom + 2);
    pdf.text(`Halaman ${i} / ${pages}`, pageWidth - MARGIN, bottom + 2, { align: 'right' });
  }

  return pdf;
}

export function reportFilename(documentName) {
  const safe = String(documentName || 'dokumen')
    .replace(/[^\w\d\-_. ]+/g, '_')
    .replace(/\s+/g, '_');
  return `kirAI-report-${safe}.pdf`;
}
