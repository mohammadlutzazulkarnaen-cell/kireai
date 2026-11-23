import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, FileText, FileType2, File, X, CheckCircle2, ArrowRight, RefreshCcw, ShieldCheck, Info,
} from 'lucide-react';
import { api, uploadDocument } from '../lib/api.js';
import { formatBytes, formatDate } from '../lib/format.js';
import { Alert, Badge, Button, Card, PageHeader, ProgressBar, useToast, cn } from '../components/ui.jsx';

const ACCEPTED = ['.pdf', '.docx', '.txt'];
const MAX_BYTES = 10 * 1024 * 1024;

function formatOf(name) {
  return (name.split('.').pop() || '').toLowerCase();
}

function FileIcon({ format, className }) {
  if (format === 'pdf') return <FileText className={className} />;
  if (format === 'docx') return <FileType2 className={className} />;
  return <File className={className} />;
}

function validateFile(file) {
  if (!file) return 'Pilih file terlebih dahulu.';
  const format = formatOf(file.name);
  if (!['pdf', 'docx', 'txt'].includes(format)) {
    return `Format .${format || '?'} tidak didukung. Gunakan PDF, DOCX, atau TXT.`;
  }
  if (file.size === 0) return 'File kosong (0 byte).';
  if (file.size > MAX_BYTES) return `Ukuran file ${formatBytes(file.size)} melebihi batas 10 MB.`;
  return '';
}

const STEPS = ['Unggah dokumen', 'Analisis', 'Tinjau hasil'];

export default function NewAnalysis() {
  const navigate = useNavigate();
  const toast = useToast();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(null);
  const [preview, setPreview] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const reset = () => {
    setFile(null);
    setUploaded(null);
    setPreview('');
    setWarnings([]);
    setProgress(0);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (selected) => {
    setError('');
    setWarnings([]);
    setUploaded(null);
    const validationError = validateFile(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setFile(selected);
    setUploading(true);
    setProgress(0);
    try {
      const data = await uploadDocument(selected, setProgress);
      setUploaded(data.document);
      setPreview(data.preview || '');
      setWarnings(data.warnings || []);
      toast(`${selected.name} berhasil diunggah.`, 'success');
    } catch (err) {
      setError(err.message);
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const selected = event.dataTransfer.files?.[0];
    if (selected) handleFile(selected);
  };

  const startAnalysis = async () => {
    if (!uploaded) return;
    setAnalyzing(true);
    setError('');
    try {
      const data = await api.post('/analyses', { documentId: uploaded.id });
      navigate(`/app/analysis/${data.id}/processing`);
    } catch (err) {
      setError(err.message);
      setAnalyzing(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Pemeriksaan baru"
        title="Unggah dokumen untuk dianalisis"
        subtitle="kirAI mengekstrak teks dari file Anda, lalu menghitung indikasi AI per paragraf dan per kalimat."
        actions={<Button variant="ghost" to="/app/documents">Dokumen saya</Button>}
      />

      <ol className="mb-6 flex flex-wrap items-center gap-3 text-[12.5px]">
        {STEPS.map((step, index) => {
          const active = index === 0 || (index === 1 && uploaded) || (index === 2 && uploaded);
          return (
            <li key={step} className="flex items-center gap-2">
              <span
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold transition-colors',
                  active ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-400',
                )}
              >
                {index === 0 && uploaded ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className={active ? 'font-medium text-ink-800' : 'text-ink-400'}>{step}</span>
              {index < STEPS.length - 1 ? <span className="mx-1 h-px w-6 bg-ink-200 sm:w-10" /> : null}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !uploading && inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
              }}
              className={cn(
                'group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200',
                dragging
                  ? 'border-accent-500 bg-accent-50/80'
                  : 'border-ink-200 bg-ink-50/50 hover:border-accent-300 hover:bg-accent-50/40',
                uploading && 'pointer-events-none opacity-70',
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED.join(',')}
                className="hidden"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) handleFile(selected);
                }}
              />
              <span
                className={cn(
                  'grid h-14 w-14 place-items-center rounded-2xl bg-white text-accent-600 shadow-sm ring-1 ring-ink-200 transition-transform duration-200',
                  dragging ? 'scale-105' : 'group-hover:scale-105',
                )}
              >
                <UploadCloud className="h-6 w-6" />
              </span>
              <p className="mt-4 text-[15px] font-semibold text-ink-900">
                {dragging ? 'Lepaskan file di sini' : 'Tarik & lepas dokumen, atau klik untuk memilih'}
              </p>
              <p className="mt-1.5 text-[12.5px] text-ink-500">PDF, DOCX, atau TXT · maksimal 10 MB</p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {['PDF', 'DOCX', 'TXT'].map((format) => (
                  <Badge key={format} tone="neutral">{format}</Badge>
                ))}
              </div>
            </div>

            {error ? (
              <Alert tone="danger" title="Dokumen tidak dapat diproses" className="mt-4">{error}</Alert>
            ) : null}

            {file ? (
              <div className="mt-4 animate-fade-up rounded-xl border border-ink-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-600 ring-1 ring-ink-200">
                    <FileIcon format={formatOf(file.name)} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink-900">{file.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-500">
                      {formatOf(file.name).toUpperCase()} · {formatBytes(file.size)}
                      {uploaded ? ` · ${uploaded.wordCount} kata · ${uploaded.pageCount ? `${uploaded.pageCount} halaman` : 'teks siap'}` : ''}
                    </p>
                  </div>
                  {uploaded ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F7EF] px-2.5 py-1 text-[11px] font-semibold text-[#1F7A4C] ring-1 ring-inset ring-[#C3E7D3]">
                      <CheckCircle2 className="h-3 w-3" /> Siap
                    </span>
                  ) : null}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        reset();
                        setTimeout(() => inputRef.current?.click(), 40);
                      }}
                      className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                      title="Ganti dokumen"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        reset();
                      }}
                      className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-[#FDECEA] hover:text-[#C43B31]"
                      title="Hapus dokumen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {uploading ? (
                  <div className="mt-3">
                    <div className="mb-1.5 flex justify-between text-[11px] font-medium text-ink-500">
                      <span>Mengunggah & mengekstrak teks…</span>
                      <span>{progress}%</span>
                    </div>
                    <ProgressBar value={progress} />
                  </div>
                ) : null}

                {uploaded && warnings.length ? (
                  <Alert tone="warning" className="mt-3">
                    Sebagian elemen dokumen tidak dapat dibaca: {warnings.slice(0, 2).join('; ')}
                  </Alert>
                ) : null}

                {uploaded ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2.5">
                    <p className="text-[11.5px] text-ink-500">
                      Diunggah {formatDate(uploaded.createdAt)} · tersimpan privat di akun Anda
                    </p>
                    <Button size="sm" variant="accent" icon={ArrowRight} className="flex-row-reverse" onClick={startAnalysis} loading={analyzing}>
                      Analyze Document
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {uploaded && preview ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Pratinjau teks terekstrak</p>
                  <span className="text-[11px] text-ink-400">{uploaded.charCount.toLocaleString('id-ID')} karakter</span>
                </div>
                <p className="max-h-44 overflow-hidden rounded-xl border border-ink-200 bg-ink-50/60 p-3.5 text-[12.5px] leading-relaxed text-ink-600">
                  {preview}
                  <span className="text-ink-300">…</span>
                </p>
              </div>
            ) : null}
          </Card>

          <Card className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2F9E64]" />
            <p className="text-[12px] leading-relaxed text-ink-500">
              File diproses di server kirAI dan tidak dibagikan ke pihak lain. Teks tersimpan terikat ke akun Anda dan
              dapat dihapus permanen dari halaman <span className="font-medium text-ink-700">My Documents</span> kapan saja.
            </p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold text-ink-900">Yang akan dianalisis</h2>
            <ul className="mt-4 space-y-3.5">
              {[
                ['Frasa formulaik', 'Ungkapan klise yang sering muncul pada keluaran model bahasa.'],
                ['Ritme kalimat', 'Keseragaman panjang kalimat (burstiness) di seluruh dokumen.'],
                ['Kekayaan kosakata', 'Rasio kata unik dan pengulangan bigram.'],
                ['Gaya personal', 'Kontraksi, kata ganti orang pertama, dan ungkapan informal.'],
              ].map(([title, text]) => (
                <li key={title} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink-800">{title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-[#F0DDB4] bg-[#FFF8E9] p-5">
            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#7A5A12]">
              <Info className="h-4 w-4" /> Perlu diketahui
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-[#7A5A12]">
              PDF hasil pindai (gambar) tidak memiliki lapisan teks sehingga perlu OCR terlebih dahulu. Hasil analisis
              adalah estimasi probabilitas, bukan bukti pasti penggunaan AI.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
