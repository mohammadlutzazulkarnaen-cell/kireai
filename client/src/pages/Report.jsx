import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Printer, FileText, AlertTriangle } from 'lucide-react';
import { api, downloadReport } from '../lib/api.js';
import { LevelPill, Badge, Button, Card, PageHeader, Spinner, Alert } from '../components/ui.jsx';
import { DistributionBar } from '../components/charts.jsx';
import { LEVELS, formatDate, levelOf } from '../lib/format.js';

export default function Report() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/analyses/${id}`)
      .then((res) => {
        if (!active) return;
        if (!res.result) setError('Laporan hanya tersedia untuk analisis yang sudah selesai.');
        else setData(res);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return (
      <>
        <PageHeader title="Laporan analisis" />
        <Card className="p-6">
          <Alert tone="danger">{error}</Alert>
          <Button className="mt-5" variant="outline" to={`/app/analysis/${id}`}>Kembali</Button>
        </Card>
      </>
    );
  }

  if (!data) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-6 w-6" />
          <p className="text-sm text-ink-500">Menyiapkan laporan…</p>
        </div>
      </div>
    );
  }

  const { analysis, document: doc, result } = data;
  const flagged = result.distribution.high + result.distribution.medium;

  return (
    <>
      <div className="no-print mb-5">
        <Link to={`/app/analysis/${id}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-500 hover:text-ink-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke hasil
        </Link>
      </div>

      <div className="no-print">
        <PageHeader
          eyebrow="Laporan"
          title="Laporan hasil pemeriksaan"
          subtitle="Ringkasan lengkap yang bisa dicetak atau diunduh sebagai PDF."
          actions={
            <>
              <Button variant="outline" icon={Printer} onClick={() => window.print()}>Cetak</Button>
              <Button variant="accent" icon={Download} onClick={() => downloadReport(id, `kirAI-report-${doc.name}.pdf`)}>
                Unduh PDF
              </Button>
            </>
          }
        />
      </div>

      <Card className="print-area mx-auto max-w-[860px] p-8 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-200 pb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-600">kirAI · AI Content Detector</p>
            <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-ink-900">Laporan Analisis Dokumen</h1>
            <p className="mt-1 text-[12px] text-ink-500">ID analisis #{analysis.id} · {formatDate(analysis.completedAt)}</p>
          </div>
          <div className="text-right text-[11.5px] leading-relaxed text-ink-500">
            <p className="font-semibold text-ink-800">{data.analysis.engineName}</p>
            <p>{result.engine.mode === 'remote' ? 'API eksternal' : 'Mesin lokal (deterministik)'}</p>
            <p>v{result.engine.version}</p>
          </div>
        </div>

        <div className="grid gap-4 border-b border-ink-200 py-6 sm:grid-cols-2">
          {[
            ['Nama dokumen', doc.name],
            ['Format', `${doc.format.toUpperCase()}${doc.pageCount ? ` · ${doc.pageCount} halaman` : ''}`],
            ['Tanggal pemeriksaan', formatDate(analysis.completedAt)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</p>
              <p className="mt-1 break-words text-[13px] font-medium text-ink-900">{value}</p>
            </div>
          ))}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Tingkat keyakinan</p>
            <p className="mt-1 text-[13px] font-medium capitalize text-ink-900">{result.confidence}</p>
          </div>
        </div>

        <div className="grid gap-3 py-6 sm:grid-cols-3">
          {[
            ['AI Probability', `${result.scores.ai}%`, levelOf(result.scores.ai)],
            ['Human-like Text', `${result.scores.human}%`, 'low'],
            ['Kalimat terindikasi', `${flagged} dari ${result.stats.sentences}`, levelOf(result.scores.ai)],
          ].map(([label, value, level]) => (
            <div key={label} className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</p>
              <p className="mt-1.5 text-[22px] font-semibold" style={{ color: label === 'Human-like Text' ? LEVELS.low.hex : LEVELS[level].hex }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        <section className="border-t border-ink-200 py-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-700">Distribusi kalimat</h2>
          <div className="mt-3">
            <DistributionBar distribution={result.distribution} className="h-2.5" />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[11.5px] text-ink-600">
            {Object.values(LEVELS).map((level) => (
              <span key={level.key} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: level.hex }} />
                {level.label}: {result.distribution[level.key]}
              </span>
            ))}
          </div>
        </section>

        <section className="border-t border-ink-200 py-6 print-block">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-700">Kesimpulan</h2>
          <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50/50 p-4">
            <div className="flex items-center gap-2">
              <Badge tone={result.verdict.level}>{result.verdict.level === 'high' ? 'Indikasi tinggi' : result.verdict.level === 'medium' ? 'Indikasi sedang' : 'Indikasi rendah'}</Badge>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-700">{result.verdict.summary}</p>
          </div>
          {result.topSignals?.length ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold text-ink-600">Sinyal utama</p>
              <ul className="mt-1.5 space-y-1 text-[11.5px] leading-relaxed text-ink-600">
                {result.topSignals.map((signal) => (
                  <li key={signal.label}>• {signal.label} ({signal.count} kalimat)</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="border-t border-ink-200 py-6 print-block">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-700">Metodologi</h2>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-600">
            {result.engine.note} Setiap kalimat diberi skor dari kombinasi sinyal: frasa formulaik khas model bahasa,
            keseragaman panjang kalimat, kekayaan kosakata, kepadatan nominalisasi, serta penanda gaya personal
            (kontraksi, kata ganti orang pertama, ungkapan informal). Skor dokumen adalah rata-rata berbobot panjang kalimat,
            sehingga bagian yang lebih panjang memberi kontribusi lebih besar.
          </p>
          <div className="mt-3 grid gap-2 text-[11px] text-ink-500 sm:grid-cols-2">
            <span>Total kata: <strong className="text-ink-800">{result.stats.words.toLocaleString('id-ID')}</strong></span>
            <span>Paragraf: <strong className="text-ink-800">{result.stats.paragraphs}</strong></span>
            <span>Kalimat: <strong className="text-ink-800">{result.stats.sentences}</strong></span>
            <span>Rata-rata kata/kalimat: <strong className="text-ink-800">{result.stats.avgSentenceLength}</strong></span>
            <span>Rasio kata unik: <strong className="text-ink-800">{Math.round(result.stats.uniqueWordRatio * 100)}%</strong></span>
            <span>Waktu baca: <strong className="text-ink-800">{result.stats.readingMinutes} menit</strong></span>
          </div>
        </section>

        <section className="border-t border-ink-200 py-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-700">Rincian per bagian</h2>
          <div className="mt-4 space-y-5">
            {result.paragraphs.map((paragraph, index) => (
              <div key={paragraph.id} className="print-block border-l-2 pl-3.5" style={{ borderColor: LEVELS[paragraph.level].hex }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11.5px] font-semibold text-ink-800">
                    Bagian {index + 1} · {paragraph.wordCount} kata
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-medium text-ink-500">{paragraph.aiScore}% indikasi AI</span>
                    <LevelPill level={paragraph.level} />
                  </div>
                </div>
                <div className="mt-1.5 space-y-1.5">
                  {paragraph.sentences.map((sentence) => (
                    <div key={sentence.id} className="flex gap-2">
                      <span
                        className="mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase"
                        style={{ backgroundColor: `${LEVELS[sentence.level].hex}18`, color: LEVELS[sentence.level].hex }}
                      >
                        {sentence.aiScore}%
                      </span>
                      <div>
                        <p className="text-[11.5px] leading-relaxed text-ink-700">{sentence.text}</p>
                        {sentence.level !== 'low' ? (
                          <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">{sentence.reasons[0]}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-start gap-2.5 rounded-xl border border-[#F0DDB4] bg-[#FFF8E9] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B07C10]" />
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#8A6415]">Catatan penting</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-[#7A5A12]">{result.disclaimer}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-ink-200 pt-4 text-[10px] text-ink-400">
          <span className="inline-flex items-center gap-1.5"><FileText className="h-3 w-3" /> kirAI — laporan estimasi konten AI</span>
          <span>Dibuat {formatDate(new Date().toISOString())}</span>
        </div>
      </Card>
    </>
  );
}
