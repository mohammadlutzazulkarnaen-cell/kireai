import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Play, Calendar, Layers, ChevronDown, Trash2 } from 'lucide-react';
import { api, downloadReport } from '../lib/api.js';
import { formatBytes, formatDate, levelOf, statusLabel, statusTone } from '../lib/format.js';
import {
  Alert, Badge, Button, Card, EmptyState, LevelPill, Modal, PageHeader, Spinner, useToast,
} from '../components/ui.jsx';

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [starting, setStarting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/documents/${id}`)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const paragraphs = useMemo(() => {
    if (!data?.document?.text) return [];
    return data.document.text.split(/\n\s*\n/).filter(Boolean);
  }, [data]);

  const analyze = async () => {
    setStarting(true);
    try {
      const res = await api.post('/analyses', { documentId: Number(id) });
      navigate(`/app/analysis/${res.id}/processing`);
    } catch (err) {
      toast(err.message, 'error');
      setStarting(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.del(`/documents/${id}`);
      toast('Dokumen dihapus.', 'success');
      navigate('/app/documents', { replace: true });
    } catch (err) {
      toast(err.message, 'error');
      setDeleting(false);
    }
  };

  if (error) {
    return (
      <>
        <PageHeader title="Detail dokumen" actions={<Button variant="ghost" to="/app/documents" icon={ArrowLeft}>Dokumen</Button>} />
        <Card className="p-6">
          <Alert tone="danger">{error}</Alert>
        </Card>
      </>
    );
  }

  if (!data) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-6 w-6" />
          <p className="text-sm text-ink-500">Memuat dokumen…</p>
        </div>
      </div>
    );
  }

  const { document: doc, analyses } = data;

  return (
    <>
      <div className="mb-5">
        <Link to="/app/documents" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-500 hover:text-ink-900">
          <ArrowLeft className="h-3.5 w-3.5" /> My Documents
        </Link>
      </div>

      <PageHeader
        eyebrow={`${doc.format.toUpperCase()} · ${formatBytes(doc.sizeBytes)}`}
        title={doc.name}
        subtitle={`Diunggah ${formatDate(doc.createdAt)} · ${doc.wordCount.toLocaleString('id-ID')} kata · ${doc.analysisCount} analisis`}
        actions={
          <>
            <Button variant="outline" icon={Trash2} onClick={() => setConfirmDelete(true)}>Hapus</Button>
            <Button variant="accent" icon={Play} loading={starting} onClick={analyze}>Analisis dokumen</Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
              <FileText className="h-4 w-4 text-ink-400" /> Teks terekstrak
            </h2>
            <span className="text-[11px] text-ink-400">{doc.charCount.toLocaleString('id-ID')} karakter</span>
          </div>
          <div className={`space-y-3 overflow-y-auto px-5 py-5 text-[13.5px] leading-[1.9] text-ink-700 transition-all ${expanded ? 'max-h-[70vh]' : 'max-h-64'}`}>
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          {paragraphs.join(' ').length > 500 ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="flex w-full items-center justify-center gap-1.5 border-t border-ink-100 py-2.5 text-[11.5px] font-medium text-ink-500 hover:bg-ink-50"
            >
              {expanded ? 'Ringkas teks' : 'Tampilkan seluruh teks'}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          ) : null}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-ink-900">Informasi dokumen</h2>
            <dl className="mt-3 space-y-2.5 text-[12px]">
              {[
                ['Format', doc.format.toUpperCase()],
                ['Ukuran', formatBytes(doc.sizeBytes)],
                ['Kata', doc.wordCount.toLocaleString('id-ID')],
                ['Halaman', doc.pageCount || '—'],
                ['Diunggah', formatDate(doc.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-ink-500">{label}</dt>
                  <dd className="text-right font-medium text-ink-900">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
                <Layers className="h-4 w-4 text-ink-400" /> Riwayat analisis
              </h2>
              <span className="text-[11px] text-ink-400">{analyses.length}</span>
            </div>

            {analyses.length ? (
              <div className="divide-y divide-ink-100">
                {analyses.map((analysis) => (
                  <div key={analysis.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-900">
                          <Calendar className="h-3 w-3 text-ink-400" />
                          {formatDate(analysis.createdAt)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-500">
                          {analysis.source === 'revision' ? 'Teks revisi' : 'Dokumen asli'} · {analysis.wordCount} kata
                        </p>
                      </div>
                      {analysis.status === 'completed' ? (
                        <LevelPill level={levelOf(analysis.aiScore)} score={Math.round(analysis.aiScore)} />
                      ) : (
                        <Badge tone={statusTone(analysis.status)}>{statusLabel(analysis.status)}</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      {analysis.status === 'completed' ? (
                        <>
                          <Button to={`/app/analysis/${analysis.id}`} size="sm" variant="outline">Buka hasil</Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Download}
                            onClick={() => downloadReport(analysis.id, `kirAI-report-${doc.name}.pdf`)}
                          >
                            PDF
                          </Button>
                        </>
                      ) : (
                        <Button to={`/app/analysis/${analysis.id}/processing`} size="sm" variant="outline">Lihat progres</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyState
                  icon={Layers}
                  title="Belum dianalisis"
                  description="Jalankan analisis untuk melihat indikasi konten AI pada dokumen ini."
                  action={<Button size="sm" variant="accent" icon={Play} onClick={analyze} loading={starting}>Analisis sekarang</Button>}
                  className="border-0 py-6"
                />
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        danger
        title="Hapus dokumen?"
        description={`“${doc.name}” dan seluruh analisisnya akan dihapus permanen.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Batal</Button>
            <Button variant="danger" loading={deleting} onClick={remove}>Hapus</Button>
          </>
        }
      />
    </>
  );
}
