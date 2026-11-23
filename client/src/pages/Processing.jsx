import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Loader2, ScanText, AlertTriangle, ArrowLeft, RotateCw } from 'lucide-react';
import { api } from '../lib/api.js';
import { LOCAL_MODE } from '../lib/runtime.js';
import { Alert, Button, Card, PageHeader, ProgressBar, Spinner } from '../components/ui.jsx';
import { cn } from '../components/ui.jsx';

const STAGES = [
  { at: 8, label: 'Menyiapkan teks dokumen', detail: 'Memuat hasil ekstraksi dan memecah paragraf.' },
  { at: 35, label: 'Mengekstrak fitur stilistik', detail: 'Frasa formulaik, ritme kalimat, kosakata, gaya personal.' },
  { at: 82, label: 'Menghitung skor per kalimat', detail: 'Membobotkan sinyal menjadi estimasi per bagian.' },
  { at: 100, label: 'Menyimpan hasil analisis', detail: 'Menyiapkan halaman hasil dan laporan.' },
];

export default function Processing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState({ status: 'queued', stage: 'Menunggu antrean', progress: 0, error: null });
  const [loadError, setLoadError] = useState('');
  const redirectTimer = useRef(null);

  useEffect(() => {
    // Local flag per effect run: React 18 StrictMode mounts this twice in dev,
    // so a shared ref would leave the second poller permanently cancelled.
    let cancelled = false;
    let timer;

    const poll = async () => {
      try {
        const data = await api.get(`/analyses/${id}/status`);
        if (cancelled) return;
        setStatus(data);
        if (data.status === 'completed') {
          redirectTimer.current = setTimeout(() => navigate(`/app/analysis/${id}`, { replace: true }), 550);
          return;
        }
        if (data.status === 'failed') return;
        timer = setTimeout(poll, 700);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [id, navigate]);

  const failed = status.status === 'failed' || Boolean(loadError);
  const activeIndex = STAGES.findIndex((stage) => status.progress < stage.at);

  return (
    <>
      <PageHeader
        eyebrow="Pemrosesan"
        title="Menganalisis dokumen Anda"
        subtitle={
          LOCAL_MODE
            ? 'Proses berjalan di perangkat Anda. Anda boleh menunggu di halaman ini — hasil akan terbuka otomatis.'
            : 'Proses berjalan di server. Anda boleh menunggu di halaman ini — hasil akan terbuka otomatis.'
        }
        actions={<Button variant="ghost" to="/app/dashboard" icon={ArrowLeft}>Dashboard</Button>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          {failed ? (
            <div className="py-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FDECEA] text-[#C43B31]">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold text-ink-900">Analisis tidak dapat diselesaikan</h2>
                  <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-600">
                    {status.error || loadError || 'Terjadi kesalahan saat memproses dokumen.'}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Button to="/app/new" variant="accent" icon={RotateCw}>Coba dokumen lain</Button>
                <Button to="/app/history" variant="outline">Lihat riwayat</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-accent-50 text-accent-600">
                  <span className="absolute inset-0 animate-pulse-ring rounded-2xl" />
                  <ScanText className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-ink-900">{status.stage || STAGES[0].label}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-500">
                    {STAGES[Math.min(activeIndex === -1 ? STAGES.length - 1 : activeIndex, STAGES.length - 1)].detail}
                  </p>
                </div>
                <span className="text-xl font-semibold tabular-nums text-ink-900">{status.progress}%</span>
              </div>

              <div className="mt-5">
                <ProgressBar value={status.progress} />
              </div>

              <ol className="mt-7 space-y-4">
                {STAGES.map((stage, index) => {
                  const done = status.progress >= stage.at;
                  const current = !done && (activeIndex === index || (activeIndex === -1 && index === STAGES.length - 1));
                  return (
                    <li key={stage.label} className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors',
                          done
                            ? 'border-[#2F9E64] bg-[#2F9E64] text-white'
                            : current
                              ? 'border-accent-400 bg-accent-50 text-accent-600'
                              : 'border-ink-200 bg-white text-ink-300',
                        )}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : current ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                      </span>
                      <div>
                        <p className={cn('text-[13px] font-medium', done || current ? 'text-ink-900' : 'text-ink-400')}>{stage.label}</p>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">{stage.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-ink-900">Apa yang sedang dihitung?</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">
              Setiap kalimat diberi skor dari kombinasi sinyal. Skor dokumen adalah rata-rata berbobot panjang kalimat —
              bukan angka acak.
            </p>
            <div className="mt-4 space-y-2.5">
              {[
                'Frasa formulaik & konektor mekanis',
                'Keseragaman panjang kalimat',
                'Rasio kata unik & pengulangan',
                'Kepadatan nominalisasi',
                'Kontraksi & kata ganti orang pertama',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[12px] text-ink-600">
                  <span className="h-1 w-1 rounded-full bg-accent-500" />
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-ink-900">Boleh ditinggal?</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">
              {LOCAL_MODE
                ? 'Ya. Analisis berjalan di perangkat Anda; hasilnya tersimpan di browser ini dan bisa dibuka lagi kapan saja dari riwayat pemeriksaan.'
                : 'Ya. Analisis berjalan di server; Anda dapat menutup halaman dan membuka hasilnya nanti dari riwayat pemeriksaan. Status akan tetap tersimpan.'}
            </p>
            <Button to="/app/history" variant="outline" size="sm" className="mt-4">Buka riwayat</Button>
          </Card>

          {!failed && status.status !== 'completed' ? (
            <div className="flex items-center gap-2 px-1 text-[11.5px] text-ink-400">
              <Spinner className="h-3.5 w-3.5" />{' '}
              {LOCAL_MODE ? 'Menunggu analisis selesai…' : 'Menunggu server menyelesaikan analisis…'}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
