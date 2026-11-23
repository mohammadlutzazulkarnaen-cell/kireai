import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Download, Eye, EyeOff, PenLine, FileText, Gauge, Layers, MessageSquareQuote,
  Sparkles, AlertTriangle, CheckCircle2, Info, X, ArrowRight, Wand2,
} from 'lucide-react';
import { api, downloadReport } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LEVELS, formatDate, levelOf, levelMeta } from '../lib/format.js';
import HighlightedDocument from '../components/HighlightedDocument.jsx';
import Recommendations from '../components/Recommendations.jsx';
import { Alert, Badge, Button, Card, EmptyState, LevelPill, PageHeader, ProgressBar, Spinner, cn } from '../components/ui.jsx';
import { DistributionBar, ScoreGauge } from '../components/charts.jsx';

export default function Result() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useAuth();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [showHighlights, setShowHighlights] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let active = true;
    api.get(`/analyses/${id}`)
      .then((res) => {
        if (!active) return;
        if (res.analysis.status === 'completed' && res.result) {
          setData(res);
          setShowHighlights(settings?.persistHighlights !== false);
        } else if (res.analysis.status === 'failed') {
          setError(res.analysis.error || 'Analisis gagal diproses.');
        } else {
          navigate(`/app/analysis/${id}/processing`, { replace: true });
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [id, navigate, settings]);

  const result = data?.result;
  const filters = useMemo(() => {
    if (!result) return [];
    return [
      { key: 'all', label: 'Semua', count: result.stats.sentences },
      { key: 'high', label: 'Tinggi', count: result.distribution.high },
      { key: 'medium', label: 'Sedang', count: result.distribution.medium },
      { key: 'low', label: 'Rendah', count: result.distribution.low },
    ];
  }, [result]);

  // Tips per sentence come from the recommendation plan; the plan only carries
  // short copies, so the full sentence object is looked up for the detail panel.
  const sentenceTips = useMemo(() => {
    const map = new Map();
    for (const item of result?.recommendations?.items || []) {
      for (const sentence of item.sentences || []) map.set(sentence.id, sentence.tips || []);
    }
    return map;
  }, [result]);

  const sentencesById = useMemo(() => {
    const map = new Map();
    for (const paragraph of result?.paragraphs || []) {
      for (const sentence of paragraph.sentences || []) map.set(sentence.id, sentence);
    }
    return map;
  }, [result]);

  if (error) {
    return (
      <>
        <PageHeader title="Hasil analisis" actions={<Button variant="ghost" to="/app/history" icon={ArrowLeft}>Riwayat</Button>} />
        <Card className="p-6">
          <Alert tone="danger" title="Hasil tidak tersedia">{error}</Alert>
          <div className="mt-5 flex gap-2.5">
            <Button to="/app/new" variant="accent">Analisis dokumen baru</Button>
            <Button to="/app/history" variant="outline">Kembali ke riwayat</Button>
          </div>
        </Card>
      </>
    );
  }

  if (!data) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-6 w-6" />
          <p className="text-sm text-ink-500">Memuat hasil analisis…</p>
        </div>
      </div>
    );
  }

  const { analysis, document: doc } = data;
  const level = levelOf(result.scores.ai);
  const meta = levelMeta(level);
  const flagged = result.distribution.high + result.distribution.medium;

  return (
    <>
      <div className="mb-5">
        <Link to="/app/history" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-500 transition-colors hover:text-ink-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Riwayat pemeriksaan
        </Link>
      </div>

      <PageHeader
        eyebrow={`Hasil analisis · ${analysis.source === 'revision' ? 'revisi' : 'dokumen asli'}`}
        title={doc.name}
        subtitle={`${formatDate(analysis.completedAt)} · ${analysis.wordCount.toLocaleString('id-ID')} kata · ${analysis.paragraphCount} paragraf · ${analysis.engineName}`}
        actions={
          <>
            <Button variant="outline" icon={PenLine} to={`/app/analysis/${id}/editor`}>Edit dokumen</Button>
            <Button variant="outline" icon={Download} onClick={() => downloadReport(id, `kirAI-report-${doc.name}.pdf`)}>
              Unduh laporan
            </Button>
            <Button variant="accent" icon={ArrowRight} className="flex-row-reverse" to={`/app/analysis/${id}/report`}>
              Lihat laporan
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="order-2 space-y-4 lg:order-1">
          <Recommendations
            recommendations={result.recommendations}
            analysisId={id}
            onSelect={(sentence) => setSelected({ sentence: sentencesById.get(sentence.id) || sentence })}
          />

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-ink-900">Dokumen dengan penandaan</h2>
                <p className="mt-0.5 text-xs text-ink-500">
                  Klik kalimat untuk melihat alasan penilaian dan saran evaluasi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHighlights((value) => !value)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors',
                  showHighlights
                    ? 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
                    : 'border-accent-200 bg-accent-50 text-accent-700',
                )}
              >
                {showHighlights ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showHighlights ? 'Sembunyikan highlight' : 'Tampilkan highlight'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-ink-100 bg-ink-50/60 px-5 py-3">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Legenda</span>
              {Object.values(LEVELS).map((item) => (
                <span key={item.key} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
                  <span
                    className="h-3 w-3 rounded-[3px]"
                    style={{ backgroundColor: `${item.hex}33`, boxShadow: `inset 0 0 0 1px ${item.hex}66` }}
                  />
                  {item.label}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 border-b border-ink-100 px-5 py-3">
              {filters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
                    filter === item.key ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200/70',
                  )}
                >
                  {item.label}
                  <span className={cn('rounded-full px-1.5 text-[10.5px]', filter === item.key ? 'bg-white/15 text-white' : 'bg-white text-ink-500')}>
                    {item.count}
                  </span>
                </button>
              ))}
              <span className="ml-auto text-[11px] text-ink-400">
                {flagged} dari {result.stats.sentences} kalimat perlu ditinjau
              </span>
            </div>

            <div className="px-5 py-5 sm:px-6">
              {result.paragraphs.length ? (
                <HighlightedDocument
                  paragraphs={result.paragraphs}
                  activeSentenceId={selected?.sentence.id}
                  onSelect={(sentence, paragraph) => setSelected({ sentence, paragraph })}
                  showHighlights={showHighlights}
                  filter={filter}
                />
              ) : (
                <EmptyState icon={FileText} title="Tidak ada teks" description="Dokumen ini tidak memiliki paragraf yang bisa ditampilkan." />
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-ink-100 bg-white px-5 py-3 text-[11px] leading-relaxed text-ink-400">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Warna menunjukkan estimasi indikasi AI per kalimat, bukan penilaian atas kualitas atau kejujuran tulisan.
            </div>
          </Card>
        </div>

        <div className="order-1 space-y-4 lg:order-2">
          {selected ? (
            <Card className="animate-fade-up border-ink-300 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                  <MessageSquareQuote className="h-3.5 w-3.5" /> Detail bagian
                </div>
                <button type="button" onClick={() => setSelected(null)} className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="mt-3 rounded-lg border-l-[3px] bg-ink-50/70 p-3 text-[12.5px] leading-relaxed text-ink-700" style={{ borderColor: levelMeta(selected.sentence.level).hex }}>
                “{selected.sentence.text}”
              </p>

              <div className="mt-3 flex items-center justify-between">
                <LevelPill level={selected.sentence.level} />
                <span className="text-[20px] font-semibold text-ink-900">{selected.sentence.aiScore}%</span>
              </div>

              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Dasar penilaian</p>
                <ul className="mt-2 space-y-2">
                  {selected.sentence.reasons.map((reason, index) => (
                    <li key={index} className="flex gap-2 text-[12px] leading-relaxed text-ink-600">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: levelMeta(selected.sentence.level).hex }} />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 rounded-xl border border-accent-200 bg-accent-50/60 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
                  <Sparkles className="h-3.5 w-3.5" /> Saran evaluasi
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-accent-900">{selected.sentence.suggestion}</p>
              </div>

              {sentenceTips.get(selected.sentence.id)?.length ? (
                <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50/70 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                    <Wand2 className="h-3.5 w-3.5" /> Cara menurunkan indikasi
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {sentenceTips.get(selected.sentence.id).map((tip) => (
                      <li key={tip} className="flex gap-2 text-[11.5px] leading-relaxed text-ink-600">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Button
                to={`/app/analysis/${id}/editor?sentence=${selected.sentence.id}`}
                variant="primary"
                size="sm"
                icon={PenLine}
                className="mt-4 w-full"
              >
                Edit bagian ini
              </Button>
            </Card>
          ) : null}

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-ink-900">Estimasi indikasi AI</h2>
                <p className="mt-0.5 text-[11.5px] text-ink-500">Rata-rata berbobot panjang kalimat</p>
              </div>
              <Badge tone={level}>{meta.short}</Badge>
            </div>

            <div className="mt-4 flex flex-col items-center">
              <ScoreGauge value={result.scores.ai} size={172} />
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <div className="flex justify-between text-[11.5px] font-medium text-ink-500">
                  <span>Karakter tulisan manusia</span>
                  <span className="text-ink-900">{result.scores.human}%</span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar value={result.scores.human} tone="low" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11.5px] font-medium text-ink-500">
                  <span>Kalimat terindikasi</span>
                  <span className="text-ink-900">{flagged} / {result.stats.sentences}</span>
                </div>
                <div className="mt-1.5">
                  <DistributionBar distribution={result.distribution} />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-[11px] text-ink-500">
              <span>Tingkat keyakinan</span>
              <span className="font-semibold capitalize text-ink-800">{result.confidence}</span>
            </div>
            {result.confidence === 'rendah' ? (
              <p className="mt-2 text-[10.5px] leading-relaxed text-[#8A6415]">
                Teks cukup pendek (&lt;120 kata / &lt;5 kalimat). Skor pada dokumen pendek kurang stabil — gunakan sebagai indikasi awal saja.
              </p>
            ) : null}
            <p className="mt-3 text-[10.5px] leading-relaxed text-ink-400">
              Mesin: {result.engine.name} · mode {result.engine.mode === 'remote' ? 'API eksternal' : 'lokal'}
            </p>
          </Card>

          <Card className={cn('p-5', level === 'high' ? 'border-[#F5C6C1]' : level === 'medium' ? 'border-[#F0DDB4]' : 'border-[#C3E7D3]')}>
            <div className="flex items-center gap-2">
              {level === 'low' ? <CheckCircle2 className="h-4 w-4 text-[#2F9E64]" /> : <AlertTriangle className="h-4 w-4" style={{ color: meta.hex }} />}
              <h2 className="text-[14px] font-semibold text-ink-900">{result.verdict.title}</h2>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{result.verdict.summary}</p>
          </Card>

          <Card className="p-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Total kata', result.stats.words.toLocaleString('id-ID')],
                ['Paragraf', result.stats.paragraphs],
                ['Kalimat', result.stats.sentences],
                ['Bagian terindikasi', flagged],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-ink-50 px-3 py-2.5">
                  <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-400">{label}</p>
                  <p className="mt-0.5 text-[17px] font-semibold text-ink-900">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          {result.topSignals?.length ? (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
                <Gauge className="h-4 w-4 text-accent-600" /> Sinyal paling sering muncul
              </h2>
              <ul className="mt-3 space-y-2.5">
                {result.topSignals.map((signal) => (
                  <li key={signal.label} className="flex gap-2 text-[11.5px] leading-relaxed text-ink-600">
                    <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-300" />
                    <span className="flex-1">{signal.label}</span>
                    <span className="shrink-0 rounded-full bg-ink-100 px-1.5 text-[10.5px] font-semibold text-ink-500">{signal.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <div className="rounded-xl border border-[#F0DDB4] bg-[#FFF8E9] p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A6415]">
              <AlertTriangle className="h-3.5 w-3.5" /> Estimasi, bukan bukti
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#7A5A12]">{result.disclaimer}</p>
          </div>
        </div>
      </div>
    </>
  );
}
