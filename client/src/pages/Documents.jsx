import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Trash2, FileText, FileType2, File, FolderOpen, ArrowUpRight, RefreshCcw, Play, Upload,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatBytes, formatDate, levelOf, statusLabel, statusTone } from '../lib/format.js';
import {
  Alert, Badge, Button, Card, EmptyState, Input, LevelPill, Modal, PageHeader, Spinner, useToast,
} from '../components/ui.jsx';

function DocIcon({ format, className = 'h-4 w-4' }) {
  if (format === 'pdf') return <FileText className={className} />;
  if (format === 'docx') return <FileType2 className={className} />;
  return <File className={className} />;
}

export default function Documents() {
  const navigate = useNavigate();
  const toast = useToast();
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [starting, setStarting] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.documents);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!documents) return [];
    if (!query.trim()) return documents;
    return documents.filter((doc) => doc.name.toLowerCase().includes(query.toLowerCase()));
  }, [documents, query]);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.del(`/documents/${toDelete.id}`);
      setDocuments((prev) => prev.filter((doc) => doc.id !== toDelete.id));
      toast('Dokumen dan seluruh analisisnya dihapus.', 'success');
      setToDelete(null);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const startAnalysis = async (docId) => {
    setStarting(docId);
    try {
      const res = await api.post('/analyses', { documentId: docId });
      navigate(`/app/analysis/${res.id}/processing`);
    } catch (err) {
      toast(err.message, 'error');
      setStarting(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Perpustakaan"
        title="My Documents"
        subtitle="Dokumen yang Anda unggah beserta riwayat analisisnya."
        actions={
          <>
            <Button variant="outline" icon={RefreshCcw} onClick={load}>Muat ulang</Button>
            <Button variant="accent" to="/app/new" icon={Upload}>Unggah dokumen</Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-ink-100 p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari dokumen…" className="pl-9" />
          </div>
          <span className="hidden text-[11.5px] text-ink-400 sm:block">
            {documents ? `${documents.length} dokumen` : ''}
          </span>
        </div>

        {error ? <div className="p-5"><Alert tone="danger">{error}</Alert></div> : null}

        {!documents ? (
          <div className="grid place-items-center py-20"><Spinner className="h-6 w-6" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={FolderOpen}
              title={documents.length ? 'Dokumen tidak ditemukan' : 'Belum ada dokumen'}
              description={
                documents.length
                  ? 'Coba kata kunci lain.'
                  : 'Unggah PDF, DOCX, atau TXT untuk mulai menganalisis indikasi konten AI.'
              }
              action={documents.length ? null : <Button to="/app/new" variant="accent" icon={Upload}>Unggah dokumen</Button>}
            />
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {filtered.map((doc) => (
              <div key={doc.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-ink-50/50 sm:flex-row sm:items-center">
                <Link to={`/app/documents/${doc.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-600 ring-1 ring-ink-200/70">
                    <DocIcon format={doc.format} className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-ink-900">{doc.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-500">
                      {doc.format.toUpperCase()} · {formatBytes(doc.sizeBytes)} · {doc.wordCount.toLocaleString('id-ID')} kata
                      {doc.pageCount ? ` · ${doc.pageCount} halaman` : ''}
                    </p>
                  </div>
                </Link>

                <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase tracking-wide text-ink-400">Analisis</p>
                    <p className="text-[12.5px] font-semibold text-ink-900">{doc.analysisCount}</p>
                  </div>
                  <div className="text-left sm:w-[92px] sm:text-right">
                    <p className="text-[10px] uppercase tracking-wide text-ink-400">Skor terakhir</p>
                    {doc.latestAiScore !== null && doc.latestAiScore !== undefined ? (
                      <LevelPill level={levelOf(doc.latestAiScore)} score={Math.round(doc.latestAiScore)} className="mt-0.5" />
                    ) : doc.latestStatus ? (
                      <Badge tone={statusTone(doc.latestStatus)} className="mt-0.5">{statusLabel(doc.latestStatus)}</Badge>
                    ) : (
                      <p className="text-[12px] text-ink-400">Belum</p>
                    )}
                  </div>
                  <div className="hidden text-right lg:block">
                    <p className="text-[10px] uppercase tracking-wide text-ink-400">Diunggah</p>
                    <p className="text-[11.5px] text-ink-600">{formatDate(doc.createdAt, false)}</p>
                  </div>

                  <div className="ml-auto flex items-center gap-1">
                    <Link
                      to={`/app/documents/${doc.id}`}
                      className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-800"
                      title="Detail dokumen"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => startAnalysis(doc.id)}
                      disabled={starting === doc.id}
                      className="rounded-lg p-2 text-ink-400 hover:bg-accent-50 hover:text-accent-700 disabled:opacity-50"
                      title="Analisis dokumen"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setToDelete(doc)}
                      className="rounded-lg p-2 text-ink-400 hover:bg-[#FDECEA] hover:text-[#C43B31]"
                      title="Hapus dokumen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        danger
        title="Hapus dokumen ini?"
        description={
          toDelete
            ? `“${toDelete.name}” beserta ${toDelete.analysisCount} analisisnya akan dihapus permanen dari akun Anda.`
            : ''
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)}>Batal</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Hapus dokumen</Button>
          </>
        }
      />
    </>
  );
}
