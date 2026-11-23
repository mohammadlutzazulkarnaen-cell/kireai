import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, FileText, Gauge, Layers, Plus, Sparkles, TrendingUp, Clock, AlertCircle, ScanText,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LEVELS, formatDate, formatRelative, levelOf, statusLabel, statusTone } from '../lib/format.js';
import { Badge, Button, Card, EmptyState, LevelPill, PageHeader, Spinner, StatCard, ProgressBar } from '../components/ui.jsx';
import { DistributionBar, TrendBars } from '../components/charts.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/dashboard')
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Ringkasan aktivitas analisis dokumen Anda." />
        <Card className="p-6">
          <p className="text-sm text-[#C43B31]">{error}</p>
          <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>Muat ulang</Button>
        </Card>
      </>
    );
  }

  if (!data) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-6 w-6" />
          <p className="text-sm text-ink-500">Memuat ringkasan…</p>
        </div>
      </div>
    );
  }

  const { stats, recent, trend } = data;
  const hasAnalyses = stats.analyses > 0;
  const totalBuckets = stats.buckets.high + stats.buckets.medium + stats.buckets.low;

  return (
    <>
      <PageHeader
        eyebrow="Ringkasan"
        title={`Selamat datang, ${user?.name?.split(' ')[0] || 'pengguna'}`}
        subtitle="Pantau hasil pemeriksaan dokumen, lihat tren indikasi AI, dan lanjutkan analisis yang tertunda."
        actions={
          <>
            <Button to="/app/history" variant="outline" icon={Clock}>Riwayat</Button>
            <Button to="/app/new" variant="accent" icon={Plus}>Analisis baru</Button>
          </>
        }
      />

      {stats.active > 0 ? (
        <Card className="mb-5 flex items-center gap-3 border-accent-200 bg-accent-50/60 px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-accent-600 ring-1 ring-accent-200">
            <Clock className="h-4 w-4" />
          </span>
          <p className="flex-1 text-[13px] text-accent-900">
            {stats.active} pemeriksaan sedang diproses. Anda bisa membuka halaman pemrosesan untuk memantau progres.
          </p>
          <Link to="/app/history" className="text-[12.5px] font-semibold text-accent-700 hover:underline">
            Lihat status
          </Link>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Dokumen terunggah" value={stats.documents} icon={FileText} tone="accent" hint={`${stats.analyzedWords.toLocaleString('id-ID')} kata dianalisis`} />
        <StatCard label="Total analisis" value={stats.analyses} icon={ScanText} hint={stats.completed ? `${stats.completed} selesai` : 'Belum ada yang selesai'} />
        <StatCard
          label="Rata-rata indikasi AI"
          value={stats.averageAiScore === null ? '—' : stats.averageAiScore}
          suffix={stats.averageAiScore === null ? '' : '%'}
          icon={Gauge}
          tone={stats.averageAiScore >= 68 ? 'high' : stats.averageAiScore >= 40 ? 'medium' : 'low'}
          hint={stats.averageAiScore === null ? 'Menunggu analisis pertama' : `Dari ${stats.completed} analisis selesai`}
        />
        <StatCard label="Bagian terindikasi" value={stats.flaggedSections} icon={Layers} tone="high" hint="Total kalimat berindikasi tinggi/sedang" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
                <TrendingUp className="h-4 w-4 text-accent-600" />
                Tren indikasi AI
              </h2>
              <p className="mt-1 text-xs text-ink-500">Delapan analisis terakhir Anda.</p>
            </div>
            <Badge tone="neutral">{trend.length} titik data</Badge>
          </div>
          <div className="mt-5">
            <TrendBars data={trend} height={116} />
          </div>
          {trend.length ? (
            <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-[11.5px] text-ink-500">
              <span>{formatDate(trend[0].created_at, false)}</span>
              <span>{formatDate(trend[trend.length - 1].created_at, false)}</span>
            </div>
          ) : null}
        </Card>

        <Card className="p-5">
          <h2 className="text-[15px] font-semibold text-ink-900">Distribusi hasil</h2>
          <p className="mt-1 text-xs text-ink-500">Klasifikasi seluruh analisis yang selesai.</p>

          {totalBuckets ? (
            <>
              <div className="mt-6">
                <DistributionBar distribution={stats.buckets} className="h-3" />
              </div>
              <ul className="mt-5 space-y-3">
                {Object.values(LEVELS).map((level) => {
                  const count = stats.buckets[level.key] || 0;
                  const percent = totalBuckets ? Math.round((count / totalBuckets) * 100) : 0;
                  return (
                    <li key={level.key} className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-sm ${level.dot}`} />
                      <span className="flex-1 text-[12.5px] text-ink-600">{level.label}</span>
                      <span className="text-[12.5px] font-semibold text-ink-900">{count}</span>
                      <span className="w-9 text-right text-[11px] text-ink-400">{percent}%</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="mt-6 rounded-xl bg-ink-50 px-4 py-6 text-center text-xs leading-relaxed text-ink-500">
              Distribusi akan muncul setelah analisis pertama selesai.
            </p>
          )}

          <div className="mt-6 rounded-xl border border-ink-200 bg-ink-50/70 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Status pemeriksaan</p>
            <div className="mt-2 flex items-center justify-between text-[12.5px]">
              <span className="text-ink-600">Selesai</span>
              <span className="font-semibold text-ink-900">{stats.completed}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[12.5px]">
              <span className="text-ink-600">Diproses / antrean</span>
              <span className="font-semibold text-ink-900">{stats.active}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[12.5px]">
              <span className="text-ink-600">Gagal</span>
              <span className="font-semibold text-ink-900">{stats.failed}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink-900">Riwayat pemeriksaan terbaru</h2>
            <p className="mt-0.5 text-xs text-ink-500">Buka kembali hasil analisis atau unduh laporannya.</p>
          </div>
          <Button to="/app/history" variant="ghost" size="sm" icon={ArrowUpRight} className="flex-row-reverse">
            Semua riwayat
          </Button>
        </div>

        {recent.length ? (
          <div className="divide-y divide-ink-100">
            {recent.map((analysis) => (
              <Link
                key={analysis.id}
                to={analysis.status === 'completed' ? `/app/analysis/${analysis.id}` : `/app/analysis/${analysis.id}/processing`}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-ink-50/70"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-500 ring-1 ring-ink-200/70">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink-900">{analysis.documentName}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-500">
                    {formatRelative(analysis.createdAt)} · {analysis.wordCount || 0} kata · {analysis.paragraphCount || 0} paragraf
                  </p>
                </div>
                <div className="hidden sm:block">
                  <Badge tone={statusTone(analysis.status)}>{statusLabel(analysis.status)}</Badge>
                </div>
                <div className="w-[92px] text-right">
                  {analysis.status === 'completed' ? (
                    <LevelPill level={levelOf(analysis.aiScore)} score={analysis.aiScore} />
                  ) : analysis.status === 'failed' ? (
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#C43B31]">
                      <AlertCircle className="h-3.5 w-3.5" /> Gagal
                    </span>
                  ) : (
                    <div className="ml-auto w-16">
                      <ProgressBar value={analysis.progress || 5} className="h-1.5" />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-6">
            <EmptyState
              icon={Sparkles}
              title="Belum ada pemeriksaan"
              description="Unggah dokumen pertama Anda — PDF, DOCX, atau TXT — lalu jalankan analisis untuk melihat highlight per kalimat."
              action={<Button to="/app/new" variant="accent" icon={Plus}>Mulai analisis</Button>}
              className="border-0 bg-transparent py-8"
            />
          </div>
        )}
      </Card>

      {!hasAnalyses ? (
        <Card className="mt-5 border-accent-200 bg-gradient-to-br from-accent-50 to-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-[16px] font-semibold text-ink-900">Bagaimana kirAI menghitung skor?</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
                Skor dihitung dari pola stilistik nyata pada teks Anda: frasa formulaik, keseragaman panjang kalimat,
                kekayaan kosakata, dan penanda gaya personal. Tidak ada angka acak — teks yang sama selalu menghasilkan skor yang sama.
              </p>
            </div>
            <Button to="/app/new" variant="primary" icon={ArrowUpRight} className="flex-row-reverse shrink-0">
              Unggah dokumen
            </Button>
          </div>
        </Card>
      ) : null}
    </>
  );
}
