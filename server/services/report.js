import PDFDocument from 'pdfkit';

/** PDF text is WinAnsi encoded, so normalise typography and drop unsupported glyphs. */
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

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function buildReportPdf({ analysis, document: doc, user, result }) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: 58, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: `Laporan kirAI - ${sanitize(doc.name)}`,
        Author: 'kirAI',
        Subject: 'Laporan estimasi konten AI',
      },
    });

    const chunks = [];
    pdf.on('data', (c) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    const pageWidth = pdf.page.width;
    const contentWidth = pageWidth - MARGIN * 2;

    const ensureSpace = (needed) => {
      if (pdf.y + needed > pdf.page.height - pdf.page.margins.bottom) pdf.addPage();
    };

    const sectionTitle = (text, num) => {
      ensureSpace(46);
      pdf.moveDown(0.6);
      if (num) {
        pdf.roundedRect(MARGIN, pdf.y + 1, 18, 18, 5).fill(ACCENT);
        pdf.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9).text(String(num), MARGIN, pdf.y + 5.5, { width: 18, align: 'center' });
        pdf.fillColor(NAVY).font('Helvetica-Bold').fontSize(12.5).text(sanitize(text), MARGIN + 26, pdf.y + 2, { width: contentWidth - 26 });
      } else {
        pdf.fillColor(NAVY).font('Helvetica-Bold').fontSize(12.5).text(sanitize(text), MARGIN, pdf.y, { width: contentWidth });
      }
      pdf.moveDown(0.5);
    };

    // ---------------- Header ----------------
    pdf.rect(0, 0, pageWidth, 104).fill(NAVY);
    pdf.rect(0, 104, pageWidth, 3).fill(ACCENT);
    pdf.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text('kirAI', MARGIN, 30, { continued: false });
    pdf.fillColor('#B3A5FF').font('Helvetica').fontSize(8.5).text('AI CONTENT DETECTOR & DOCUMENT ANALYZER', MARGIN, 58);
    pdf.fillColor('#C3C9DA').font('Helvetica').fontSize(8)
      .text(`Dibuat: ${sanitize(formatDate(new Date().toISOString()))}`, pageWidth - MARGIN - 220, 30, { width: 220, align: 'right' })
      .text(`Pengguna: ${sanitize(user.name)}`, pageWidth - MARGIN - 220, 44, { width: 220, align: 'right' })
      .text(`ID analisis: #${analysis.id}`, pageWidth - MARGIN - 220, 58, { width: 220, align: 'right' });
    pdf.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(13)
      .text('Laporan Analisis Dokumen', MARGIN, 78, { width: contentWidth, align: 'right' });

    pdf.y = 126;

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
    let metaY = pdf.y;
    metaRows.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = MARGIN + col * (colW + 16);
      const y = metaY + row * 34;
      pdf.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(label.toUpperCase(), x, y, { width: colW });
      pdf.fillColor(NAVY).font('Helvetica-Bold').fontSize(9.5).text(sanitize(value), x, y + 11, { width: colW, ellipsis: true, height: 16 });
    });
    pdf.y = metaY + Math.ceil(metaRows.length / 2) * 34 + 6;

    // ---------------- Score boxes ----------------
    sectionTitle('Ringkasan Skor', 1);
    const boxes = [
      ['AI PROBABILITY', `${analysis.ai_score ?? result.scores.ai}%`, RISK.high],
      ['HUMAN-LIKE TEXT', `${analysis.human_score ?? result.scores.human}%`, RISK.low],
      ['KALIMAT TERINDIKASI', `${(analysis.high_count || 0) + (analysis.medium_count || 0)} dari ${result.stats.sentences}`, ACCENT],
    ];
    const boxGap = 12;
    const boxW = (contentWidth - boxGap * 2) / 3;
    const boxY = pdf.y;
    boxes.forEach(([label, value, color], i) => {
      const x = MARGIN + i * (boxW + boxGap);
      pdf.roundedRect(x, boxY, boxW, 66, 8).fillAndStroke('#F6F7FB', BORDER);
      pdf.rect(x, boxY, boxW, 3).fill(color);
      pdf.fillColor(MUTED).font('Helvetica').fontSize(7).text(label, x + 12, boxY + 14, { width: boxW - 24 });
      pdf.fillColor(NAVY).font('Helvetica-Bold').fontSize(20).text(sanitize(value), x + 12, boxY + 27, { width: boxW - 24 });
    });
    pdf.y = boxY + 82;

    // ---------------- Distribution ----------------
    const dist = result.distribution || { high: 0, medium: 0, low: 0 };
    const totalSentences = Math.max(1, dist.high + dist.medium + dist.low);
    sectionTitle('Distribusi Kalimat', 2);
    let barX = MARGIN;
    const barY = pdf.y;
    const barH = 12;
    pdf.roundedRect(MARGIN, barY, contentWidth, barH, 6).fill('#EDEFF6');
    const segments = [
      ['high', dist.high, RISK.high],
      ['medium', dist.medium, RISK.medium],
      ['low', dist.low, RISK.low],
    ];
    segments.forEach(([, count, color]) => {
      const w = (count / totalSentences) * contentWidth;
      if (w > 0.5) pdf.rect(barX, barY, w, barH).fill(color);
      barX += w;
    });
    pdf.y = barY + 20;
    pdf.font('Helvetica').fontSize(8.5);
    const legend = [
      [`Indikasi tinggi: ${dist.high} kalimat`, RISK.high],
      [`Indikasi sedang: ${dist.medium} kalimat`, RISK.medium],
      [`Indikasi rendah: ${dist.low} kalimat`, RISK.low],
    ];
    let lx = MARGIN;
    legend.forEach(([label, color]) => {
      pdf.circle(lx + 3, pdf.y + 4, 3).fill(color);
      pdf.fillColor(NAVY_SOFT).text(sanitize(label), lx + 11, pdf.y + 0.5, { width: 170, lineBreak: false });
      lx += 180;
    });
    pdf.y += 22;

    // ---------------- Conclusion ----------------
    sectionTitle('Kesimpulan Pemeriksaan', 3);
    const verdict = result.verdict || {};
    const verdictColor = RISK[verdict.level] || ACCENT;
    const boxTop = pdf.y;
    const summaryText = sanitize(verdict.summary || '');
    const summaryHeight = pdf.heightOfString(summaryText, { width: contentWidth - 24, fontSize: 9.5 }) + 44;
    ensureSpace(summaryHeight + 10);
    const top = pdf.y;
    pdf.roundedRect(MARGIN, top, contentWidth, summaryHeight, 8).fillAndStroke('#F9F9FD', BORDER);
    pdf.rect(MARGIN, top, 3.5, summaryHeight).fill(verdictColor);
    pdf.fillColor(verdictColor).font('Helvetica-Bold').fontSize(10.5)
      .text(sanitize((verdict.title || 'Ringkasan').toUpperCase()), MARGIN + 14, top + 12, { width: contentWidth - 28 });
    pdf.fillColor(NAVY_SOFT).font('Helvetica').fontSize(9.5)
      .text(summaryText, MARGIN + 14, top + 28, { width: contentWidth - 28, align: 'left' });
    pdf.y = top + summaryHeight + 12;
    pdf.x = MARGIN;

    if (Array.isArray(result.topSignals) && result.topSignals.length) {
      sectionTitle('Sinyal Utama Yang Terdeteksi');
      result.topSignals.slice(0, 5).forEach((signal) => {
        ensureSpace(20);
        pdf.circle(MARGIN + 3, pdf.y + 5, 2).fill(ACCENT);
        pdf.fillColor(NAVY_SOFT).font('Helvetica').fontSize(9)
          .text(sanitize(`${signal.label} (${signal.count} kalimat)`), MARGIN + 12, pdf.y + 0.5, { width: contentWidth - 12 });
        pdf.moveDown(0.35);
      });
    }

    // ---------------- Method ----------------
    sectionTitle('Metodologi', 4);
    pdf.fillColor(NAVY_SOFT).font('Helvetica').fontSize(9).text(
      sanitize(
        `${result.engine?.note || ''} Setiap kalimat diberi skor berdasarkan kombinasi sinyal: frasa formulaik khas model bahasa, ` +
          `keseragaman panjang kalimat (burstiness), kekayaan kosakata, kepadatan nominalisasi, dan penanda gaya personal ` +
          `(kontraksi, kata ganti orang pertama, ungkapan informal). Skor dokumen adalah rata-rata berbobot panjang kalimat.`,
      ),
      MARGIN,
      pdf.y,
      { width: contentWidth, align: 'justify' },
    );
    pdf.moveDown(0.6);

    // ---------------- Detail per section ----------------
    sectionTitle('Rincian Hasil Per Bagian', 5);
    const paragraphs = result.paragraphs || [];
    const MAX_PARAGRAPHS = 60;
    paragraphs.slice(0, MAX_PARAGRAPHS).forEach((paragraph, index) => {
      ensureSpace(64);
      const headerY = pdf.y;
      const color = RISK[paragraph.level] || MUTED;
      pdf.roundedRect(MARGIN, headerY, contentWidth, 22, 5).fill('#F3F4FA');
      pdf.rect(MARGIN, headerY, 3, 22).fill(color);
      pdf.fillColor(NAVY).font('Helvetica-Bold').fontSize(9)
        .text(sanitize(`Bagian ${index + 1} - ${paragraph.aiScore}% indikasi AI`), MARGIN + 12, headerY + 6.5, { width: contentWidth - 130 });
      pdf.fillColor(color).font('Helvetica-Bold').fontSize(7.5)
        .text(LEVEL_LABEL[paragraph.level], pageWidth - MARGIN - 90, headerY + 7.5, { width: 78, align: 'right' });
      pdf.y = headerY + 28;

      paragraph.sentences.forEach((sentence) => {
        const text = sanitize(sentence.text);
        const tagColor = RISK[sentence.level];
        const textWidth = contentWidth - 16;
        const textHeight = pdf.heightOfString(text, { width: textWidth, fontSize: 8.8 });
        ensureSpace(textHeight + 14);
        const y = pdf.y;
        pdf.rect(MARGIN, y + 2, 2, Math.max(8, textHeight - 1)).fill(tagColor);
        pdf.fillColor('#8F97B0').font('Helvetica-Bold').fontSize(6.5)
          .text(`${LEVEL_LABEL[sentence.level]} ${sentence.aiScore}%`, MARGIN + 10, y + 1, { width: 76, lineBreak: false });
        pdf.fillColor(NAVY_SOFT).font('Helvetica').fontSize(8.8)
          .text(text, MARGIN + 88, y, { width: contentWidth - 96, align: 'justify' });
        if (sentence.level !== 'low' && sentence.reasons?.length) {
          pdf.fillColor(MUTED).font('Helvetica-Oblique').fontSize(7.4)
            .text(sanitize(`Dasar penilaian: ${sentence.reasons.join(' ')}`), MARGIN + 88, pdf.y + 1, { width: contentWidth - 96 });
        }
        pdf.y += 5;
      });
      pdf.moveDown(0.4);
    });

    if (paragraphs.length > MAX_PARAGRAPHS) {
      ensureSpace(24);
      pdf.fillColor(MUTED).font('Helvetica-Oblique').fontSize(8)
        .text(`Rincian dibatasi pada ${MAX_PARAGRAPHS} bagian pertama dari ${paragraphs.length} bagian. Buka aplikasi untuk melihat seluruh dokumen.`, MARGIN, pdf.y, { width: contentWidth });
    }

    // ---------------- Disclaimer ----------------
    ensureSpace(80);
    pdf.moveDown(0.8);
    const noteY = pdf.y;
    const noteText = sanitize(
      result.disclaimer ||
        'Hasil ini adalah estimasi probabilitas berdasarkan pola permukaan teks, bukan bukti pasti penggunaan AI.',
    );
    const noteH = pdf.heightOfString(noteText, { width: contentWidth - 24, fontSize: 8 }) + 28;
    pdf.roundedRect(MARGIN, noteY, contentWidth, noteH, 6).fillAndStroke('#FFF7E8', '#F0DDB4');
    pdf.fillColor('#8A6415').font('Helvetica-Bold').fontSize(8).text('CATATAN PENTING', MARGIN + 12, noteY + 9);
    pdf.fillColor('#7A5A12').font('Helvetica').fontSize(8)
      .text(noteText, MARGIN + 12, noteY + 21, { width: contentWidth - 24, align: 'justify' });

    // ---------------- Footer with page numbers ----------------
    const range = pdf.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      pdf.switchToPage(i);
      const bottom = pdf.page.height - 34;
      pdf.moveTo(MARGIN, bottom - 8).lineTo(pageWidth - MARGIN, bottom - 8).strokeColor(BORDER).lineWidth(0.7).stroke();
      pdf.fillColor('#8F97B0').font('Helvetica').fontSize(7.5)
        .text('kirAI - laporan estimasi konten AI. Bukan bukti definitif.', MARGIN, bottom - 2, { width: contentWidth - 90, lineBreak: false })
        .text(`Halaman ${i - range.start + 1} / ${range.count}`, pageWidth - MARGIN - 90, bottom - 2, { width: 90, align: 'right', lineBreak: false });
    }

    pdf.end();
  });
}
