import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Download, Trash2, ExternalLink, FileText, FileType2, File, RefreshCcw, Clock, History as HistoryIcon,
} from 'lucide-react';
import { api, downloadReport } from '../lib/api.js';
import {
  formatBytes, formatDate, formatRelative, levelOf, statusLabel, statusTone,
} from '../lib/format.js';
import {
  Alert, Badge, Button, Card, EmptyState, Input, LevelPill, Modal, PageHeader, ProgressBar, Spinner, useToast, cn,
} from '../components/ui.jsx';

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'high', label: 'Tinggi' },
  { key: 'medium', label: 'Sedang' },
  { key: 'low', label: 'Rendah' },
  { key: 'failed', label: 'Gagal' },
];

function DocIcon({ format }) {
  if (format === 'pdf') return <FileText className="h-4 w-4" />;
  if (format === 'docx') return <FileType2 className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

export default function HistoryPage() {
  const toast = useToast();
  const [analyses, setAnalyses] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/analyses');
      setAnalyses(res.analyses);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!analyses) return [];
    return analyses.filter((item) => {
      if (query && !item.documentName.toLowerCase().includes(query.toLowerCase())) return false;
      if (level === 'failed') return item.status === 'failed';
      if (level === 'high') return item.status === 'completed' && item.aiScore >= 68;
      if (level === 'medium') return item.status === 'completed' && item.aiScore >= 40 && item.aiScore < 68;
      if (level === 'low') return item.status === 'completed' && item.aiScore < 40;
      return true;
    });
  }, [analyses, query, level]);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.del(`/analyses/${toDelete.id}`);
      setAnalyses((prev) => prev.filter((item) => item.id !== toDelete.id));
      toast('Riwayat pemeriksaan dihapus.', 'success');
      setToDelete(null);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Riwayat"
        title="Analysis History"
        subtitle="Seluruh dokumen yang pernah Anda periksa, beserta hasil dan laporannya."
        actions={
          <>
            <Button variant="outline" icon={RefreshCcw} onClick={load}>Muat ulang</Button>
            <Button variant="accent" to="/app/new">Analisis baru</Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama dokumen…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setLevel(item.key)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
                  level === item.key ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200/70',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="p-5">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}

        {!analyses ? (
          <div className="grid place-items-center py-20">
            <Spinner className="h-6 w-6" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={HistoryIcon}
              title={analyses.length ? 'Tidak ada hasil yang cocok' : 'Belum ada riwayat pemeriksaan'}
              description={
                analyses.length
                  ? 'Coba ubah kata kunci atau filter tingkat indikasi.'
                  : 'Unggah dokumen pertama Anda untuk mulai membangun riwayat pemeriksaan.'
              }
              action={analyses.length ? null : <Button to="/app/new" variant="accent">Mulai analisis</Button>}
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/70 text-[10.5px] uppercase tracking-[0.08em] text-ink-500">
                    <th className="px-4 py-2.5 font-semibold">Dokumen</th>
                    <th className="px-3 py-2.5 font-semibold">Tanggal</th>
                    <th className="px-3 py-2.5 font-semibold">Skor AI</th>
                    <th className="px-3 py-2.5 font-semibold">Manusia</th>
                    <th className="px-3 py-2.5 font-semibold">Kata</th>
                    <th className="px-3 py-2.5 font-semibold">Bagian</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {filtered.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-ink-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-500 ring-1 ring-ink-200/70">
                            <DocIcon format={item.documentFormat} />
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[240px] truncate font-medium text-ink-900">{item.documentName}</p>
                            <p className="text-[10.5px] uppercase tracking-wide text-ink-400">
                              {item.documentFormat} · {item.source === 'revision' ? 'revisi' : 'asli'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-ink-500">
                        <span title={formatDate(item.createdAt)}>{formatRelative(item.createdAt)}</span>
                      </td>
                      <td className="px-3 py-3">
                        {item.status === 'completed' ? (
                          <LevelPill level={levelOf(item.aiScore)} score={Math.round(item.aiScore)} />
                        ) : item.status === 'failed' ? (
                          <span className="text-ink-400">—</span>
                        ) : (
                          <div className="w-16"><ProgressBar value={item.progress || 5} className="h-1.5" /></div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-ink-600">
                        {item.humanScore !== null && item.humanScore !== undefined ? `${Math.round(item.humanScore)}%` : '—'}
                      </td>
                      <td className="px-3 py-3 text-ink-600">{item.wordCount || 0}</td>
                      <td className="px-3 py-3 text-ink-600">{item.flaggedCount || 0}</td>
                      <td className="px-3 py-3">
                        <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {item.status === 'completed' ? (
                            <>
                              <Link
                                to={`/app/analysis/${item.id}`}
                                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-800"
                                title="Buka hasil"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => downloadReport(item.id, `kirAI-report-${item.documentName}.pdf`)}
                                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-800"
                                title="Unduh laporan"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </>
                          ) : item.status === 'failed' ? (
                            <Link to="/app/new" className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-800" title="Coba lagi">
                              <RefreshCcw className="h-4 w-4" />
                            </Link>
                          ) : (
                            <Link
                              to={`/app/analysis/${item.id}/processing`}
                              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-800"
                              title="Lihat progres"
                            >
                              <Clock className="h-4 w-4" />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => setToDelete(item)}
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-[#FDECEA] hover:text-[#C43B31]"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-ink-100 md:hidden">
              {filtered.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-500 ring-1 ring-ink-200/70">
                      <DocIcon format={item.documentFormat} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink-900">{item.documentName}</p>
                      <p className="mt-0.5 text-[11px] text-ink-500">
                        {formatDate(item.createdAt)} · {item.wordCount || 0} kata
                      </p>
                    </div>
                    {item.status === 'completed' ? (
                      <LevelPill level={levelOf(item.aiScore)} score={Math.round(item.aiScore)} />
                    ) : (
                      <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {item.status === 'completed' ? (
                      <>
                        <Button to={`/app/analysis/${item.id}`} size="sm" variant="outline" className="flex-1">Buka</Button>
                        <Button size="sm" variant="ghost" icon={Download} onClick={() => downloadReport(item.id, `kirAI-report-${item.documentName}.pdf`)}>
                          PDF
                        </Button>
                      </>
                    ) : (
                      <Button to={`/app/analysis/${item.id}/processing`} size="sm" variant="outline" className="flex-1">Lihat progres</Button>
                    )}
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setToDelete(item)}>Hapus</Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {analyses?.length ? (
          <div className="flex items-center justify-between border-t border-ink-100 px-4 py-2.5 text-[11px] text-ink-400">
            <span>Menampilkan {filtered.length} dari {analyses.length} pemeriksaan</span>
            <span>Skor merupakan estimasi probabilitas</span>
          </div>
        ) : null}
      </Card>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        danger
        title="Hapus riwayat pemeriksaan?"
        description={
          toDelete
            ? `Hasil analisis untuk “${toDelete.documentName}” akan dihapus permanen. Dokumen asli tetap tersimpan di My Documents.`
            : ''
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)}>Batal</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Hapus permanen</Button>
          </>
        }
      />
    </>
  );
}
