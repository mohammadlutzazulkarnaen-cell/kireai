import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Check, Eye, EyeOff, GitCompareArrows, PenLine, RotateCcw, Save, Sparkles, Undo2, AlertTriangle, Loader2,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LEVELS, formatDate, levelMeta, splitDraft, wordDiff } from '../lib/format.js';
import { Alert, Button, Card, LevelPill, Modal, PageHeader, Spinner, useToast, cn } from '../components/ui.jsx';

function buildFromResult(result) {
  return result.paragraphs.map((paragraph) =>
    paragraph.sentences.map((sentence) => ({ key: sentence.id, text: sentence.text, analysis: sentence })),
  );
}

function buildFromDraft(text, originalMap) {
  return splitDraft(text).map((paragraph, pIndex) =>
    paragraph.map((sentence, sIndex) => ({
      key: `d${pIndex}-${sIndex}`,
      text: sentence,
      analysis: originalMap.get(sentence) || null,
    })),
  );
}

export default function Editor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useAuth();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [initialText, setInitialText] = useState('');
  const [selected, setSelected] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showHighlights, setShowHighlights] = useState(true);
  const [compare, setCompare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const originalMapRef = useRef(new Map());
  const saveTimer = useRef(null);

  useEffect(() => {
    let active = true;
    api.get(`/analyses/${id}`)
      .then((res) => {
        if (!active) return;
        if (!res.result) {
          setLoadError('Editor hanya tersedia untuk analisis yang sudah selesai.');
          return;
        }
        const map = new Map();
        res.result.paragraphs.forEach((p) => p.sentences.forEach((s) => map.set(s.text, s)));
        originalMapRef.current = map;

        const source = res.draft || res.text;
        const initialBlocks = res.draft ? buildFromDraft(res.draft, map) : buildFromResult(res.result);
        setData(res);
        setBlocks(initialBlocks);
        setInitialText(source);
        setSavedAt(res.draftUpdatedAt || null);
        setShowHighlights(settings?.persistHighlights !== false);

        const target = searchParams.get('sentence');
        if (target) {
          let found = null;
          initialBlocks.forEach((paragraph, bIndex) =>
            paragraph.forEach((sentence, sIndex) => {
              if (sentence.key === target || sentence.analysis?.id === target) found = { bIndex, sIndex };
            }),
          );
          if (found) {
            setSelected(found);
            setEditValue(initialBlocks[found.bIndex][found.sIndex].text);
          }
        }
      })
      .catch((err) => {
        if (active) setLoadError(err.message);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const draftText = useMemo(
    () => blocks.map((paragraph) => paragraph.map((sentence) => sentence.text).join(' ')).join('\n\n'),
    [blocks],
  );
  const dirty = draftText.trim() !== initialText.trim();
  const editedCount = useMemo(
    () => blocks.flat().filter((sentence) => !sentence.analysis || sentence.analysis.text !== sentence.text).length,
    [blocks],
  );
  const wordCount = useMemo(() => draftText.split(/\s+/).filter(Boolean).length, [draftText]);

  const save = useCallback(
    async (silent = false) => {
      if (!dirty) return;
      setSaving(true);
      try {
        const res = await api.patch(`/analyses/${id}/draft`, { text: draftText });
        setInitialText(draftText);
        setSavedAt(res.updatedAt);
        if (!silent) toast('Revisi berhasil disimpan.', 'success');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setSaving(false);
      }
    },
    [dirty, draftText, id, toast],
  );

  useEffect(() => {
    if (!settings?.autosaveEditor || !dirty) return undefined;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(true), 1800);
    return () => clearTimeout(saveTimer.current);
  }, [draftText, dirty, settings?.autosaveEditor, save]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const selectSentence = (bIndex, sIndex, sentence) => {
    setSelected({ bIndex, sIndex });
    setEditValue(sentence.text);
  };

  const applyEdit = () => {
    if (!selected) return;
    const value = editValue.trim();
    if (!value) {
      toast('Kalimat tidak boleh kosong.', 'error');
      return;
    }
    setBlocks((prev) =>
      prev.map((paragraph, bIndex) =>
        bIndex === selected.bIndex
          ? paragraph.map((sentence, sIndex) =>
              sIndex === selected.sIndex
                ? { ...sentence, text: value, analysis: originalMapRef.current.get(value) || null }
                : sentence,
            )
          : paragraph,
      ),
    );
    toast('Perubahan diterapkan ke draf. Simpan untuk menyimpan permanen.', 'info');
  };

  const applyAndNext = () => {
    applyEdit();
    const current = blocks[selected.bIndex];
    if (current && selected.sIndex < current.length - 1) {
      const next = current[selected.sIndex + 1];
      setSelected({ bIndex: selected.bIndex, sIndex: selected.sIndex + 1 });
      setEditValue(next.text);
    }
  };

  const resetToOriginal = () => {
    setBlocks(buildFromResult(data.result));
    setInitialText(data.text);
    setSelected(null);
    setConfirmReset(false);
    toast('Draf dikembalikan ke teks hasil analisis.', 'info');
  };

  const analyzeRevision = async () => {
    if (dirty) await save(true);
    setReanalyzing(true);
    try {
      const res = await api.post('/analyses', { documentId: data.analysis.documentId, text: draftText });
      navigate(`/app/analysis/${res.id}/processing`);
    } catch (err) {
      toast(err.message, 'error');
      setReanalyzing(false);
    }
  };

  if (loadError) {
    return (
      <>
        <PageHeader title="Editor dokumen" />
        <Card className="p-6">
          <Alert tone="danger" title="Editor tidak dapat dibuka">{loadError}</Alert>
          <Button className="mt-5" variant="outline" to={`/app/analysis/${id}`}>Kembali ke hasil</Button>
        </Card>
      </>
    );
  }

  if (!data) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-6 w-6" />
          <p className="text-sm text-ink-500">Membuka editor…</p>
        </div>
      </div>
    );
  }

  const selectedSentence = selected ? blocks[selected.bIndex]?.[selected.sIndex] : null;
  const diff = compare ? wordDiff(data.text, draftText) : null;

  return (
    <>
      <div className="mb-5">
        <Link to={`/app/analysis/${id}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-500 transition-colors hover:text-ink-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke hasil analisis
        </Link>
      </div>

      <PageHeader
        eyebrow="Editor dokumen"
        title={data.document.name}
        subtitle="Klik kalimat bertanda untuk menulis ulang bagian tersebut. kirAI tidak pernah mengubah teks Anda secara otomatis."
        actions={
          <>
            <Button variant="outline" icon={GitCompareArrows} onClick={() => setCompare((value) => !value)}>
              {compare ? 'Tutup perbandingan' : 'Bandingkan'}
            </Button>
            <Button variant="outline" icon={Save} loading={saving} onClick={() => save()} disabled={!dirty}>
              Simpan draf
            </Button>
            <Button variant="accent" icon={Sparkles} loading={reanalyzing} onClick={analyzeRevision}>
              Analisis ulang draf
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-[11.5px] text-ink-500">
        <span className="flex items-center gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : dirty ? <PenLine className="h-3.5 w-3.5 text-accent-600" /> : <Check className="h-3.5 w-3.5 text-[#2F9E64]" />}
          {saving ? 'Menyimpan…' : dirty ? 'Ada perubahan yang belum disimpan' : 'Semua perubahan tersimpan'}
        </span>
        <span className="h-3 w-px bg-ink-200" />
        <span>{wordCount.toLocaleString('id-ID')} kata</span>
        <span className="h-3 w-px bg-ink-200" />
        <span>{editedCount} kalimat diubah</span>
        {savedAt ? (
          <>
            <span className="h-3 w-px bg-ink-200" />
            <span>Tersimpan {formatDate(savedAt)}</span>
          </>
        ) : null}
        <span className="ml-auto hidden sm:inline">Ctrl/Cmd + S untuk menyimpan</span>
      </div>

      {editedCount > 0 ? (
        <Alert tone="info" className="mb-4">
          {editedCount} kalimat sudah Anda ubah dan belum dianalisis ulang. Hasil perubahan akan tampil setelah Anda menekan
          <span className="font-semibold"> Analisis ulang draf</span>.
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 text-accent-600" />
                <h2 className="text-[14px] font-semibold text-ink-900">Draf revisi</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
                >
                  <RotationIcon /> Muat ulang asli
                </button>
                <button
                  type="button"
                  onClick={() => setShowHighlights((value) => !value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium transition-colors',
                    showHighlights ? 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50' : 'border-accent-200 bg-accent-50 text-accent-700',
                  )}
                >
                  {showHighlights ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showHighlights ? 'Hapus highlight' : 'Tampilkan highlight'}
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">
              {blocks.map((paragraph, bIndex) => (
                <p key={bIndex} className="mb-4 text-[15px] leading-[1.95] text-ink-800 last:mb-0">
                  {paragraph.map((sentence, sIndex) => {
                    const isSelected = selected?.bIndex === bIndex && selected?.sIndex === sIndex;
                    const levelInfo = sentence.analysis ? LEVELS[sentence.analysis.level] : null;
                    const changed = !sentence.analysis || sentence.analysis.text !== sentence.text;
                    return (
                      <span key={sentence.key}>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => selectSentence(bIndex, sIndex, sentence)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              selectSentence(bIndex, sIndex, sentence);
                            }
                          }}
                          className={cn(
                            'mark-sentence',
                            showHighlights && levelInfo && !changed ? levelInfo.mark : 'hover:bg-ink-100',
                            changed && 'bg-accent-50/70 underline decoration-accent-400 decoration-dotted underline-offset-4',
                            isSelected && 'is-active',
                          )}
                          style={isSelected ? { color: '#4A35C6' } : undefined}
                          title={sentence.analysis ? `${sentence.analysis.aiScore}% indikasi AI` : 'Belum dianalisis'}
                        >
                          {sentence.text}
                        </span>
                        {sIndex < paragraph.length - 1 ? ' ' : ''}
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>
          </Card>

          {compare ? (
            <Card className="animate-fade-up overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <GitCompareArrows className="h-4 w-4 text-accent-600" />
                  <h2 className="text-[14px] font-semibold text-ink-900">Perbandingan sebelum &amp; sesudah</h2>
                </div>
                <p className="text-[11px] text-ink-400">
                  Teks asli dianalisis · {wordCount - data.result.stats.words >= 0 ? '+' : ''}
                  {wordCount - data.result.stats.words} kata dari hasil analisis
                </p>
              </div>

              <div className="grid gap-0 md:grid-cols-2">
                <div className="border-b border-ink-100 p-5 md:border-b-0 md:border-r">
                  <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Sebelum (dianalisis)</p>
                  <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-ink-50/70 p-3.5 text-[12.5px] leading-relaxed text-ink-600">
                    {data.text}
                  </div>
                </div>
                <div className="p-5">
                  <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-accent-600">Sesudah (draf Anda)</p>
                  <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-accent-100 bg-accent-50/40 p-3.5 text-[12.5px] leading-relaxed text-ink-700">
                    {draftText}
                  </div>
                </div>
              </div>

              <div className="border-t border-ink-100 p-5">
                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Diff kata</p>
                <div className="max-h-56 overflow-y-auto whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-700">
                  {diff?.parts.map((part, index) => (
                    <span
                      key={index}
                      className={cn(
                        part.type === 'added' && 'rounded bg-[#DDF3E6] text-[#1F7A4C]',
                        part.type === 'removed' && 'rounded bg-[#FBDDD9] text-[#B4302A] line-through',
                      )}
                    >
                      {part.text}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          {selectedSentence ? (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-ink-900">Tulis ulang bagian</h2>
                {selectedSentence.analysis ? (
                  <LevelPill level={selectedSentence.analysis.level} score={selectedSentence.analysis.aiScore} />
                ) : (
                  <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10.5px] font-semibold text-accent-700">Belum dianalisis</span>
                )}
              </div>

              <textarea
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                rows={6}
                className="input-base mt-3 resize-y text-[13px] leading-relaxed"
              />
              <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-400">
                <span>{editValue.split(/\s+/).filter(Boolean).length} kata</span>
                <span>{editValue.length} karakter</span>
              </div>

              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="primary" icon={Check} onClick={applyEdit} className="flex-1">
                  Terapkan
                </Button>
                <Button size="sm" variant="outline" icon={Undo2} onClick={() => setEditValue(selectedSentence.text)}>
                  Reset
                </Button>
              </div>
              <button
                type="button"
                onClick={applyAndNext}
                className="mt-2 w-full rounded-lg border border-ink-200 px-3 py-1.5 text-[11.5px] font-medium text-ink-600 transition-colors hover:bg-ink-50"
              >
                Terapkan &amp; lanjut kalimat berikutnya
              </button>

              {selectedSentence.analysis ? (
                <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">Alasan penilaian</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {selectedSentence.analysis.reasons.map((reason, index) => (
                        <li key={index} className="flex gap-2 text-[11.5px] leading-relaxed text-ink-600">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: levelMeta(selectedSentence.analysis.level).hex }} />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg bg-accent-50/70 p-2.5">
                    <p className="text-[10.5px] font-semibold text-accent-700">Saran</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-accent-900">{selectedSentence.analysis.suggestion}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 border-t border-ink-100 pt-3 text-[11px] leading-relaxed text-ink-500">
                  Kalimat ini sudah Anda ubah sehingga belum memiliki skor. Jalankan “Analisis ulang draf” untuk melihat
                  indikasi AI terbaru.
                </p>
              )}
            </Card>
          ) : (
            <Card className="p-5">
              <h2 className="text-[14px] font-semibold text-ink-900">Mulai merevisi</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
                Klik kalimat yang ditandai pada dokumen di sebelah kiri. Anda akan dapat membaca alasan penilaiannya dan
                menulis ulang bagian tersebut.
              </p>
              <ul className="mt-4 space-y-2.5 text-[11.5px] leading-relaxed text-ink-600">
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-500" />Tulisan Anda tidak pernah diubah otomatis.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-accent-500" />Draf disimpan di server dan hanya terlihat oleh akun Anda.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-accent-500" />Analisis ulang membuat pemeriksaan baru; hasil lama tetap tersimpan.</li>
              </ul>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="text-[13px] font-semibold text-ink-900">Ringkasan draf</h2>
            <div className="mt-3 space-y-2 text-[12px]">
              {[
                ['Kata', wordCount.toLocaleString('id-ID')],
                ['Kalimat diubah', editedCount],
                ['Kalimat belum dianalisis', blocks.flat().filter((s) => !s.analysis).length],
                ['Status', dirty ? 'Belum disimpan' : 'Tersimpan'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-ink-500">{label}</span>
                  <span className="font-medium text-ink-900">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-ink-100 pt-3">
              <p className="flex items-start gap-2 text-[10.5px] leading-relaxed text-ink-400">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                Skor hanya berlaku untuk teks yang dianalisis. Teks hasil editan belum dinilai sampai Anda menjalankan analisis ulang.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Muat ulang teks asli?"
        description="Draf revisi Anda akan diganti dengan teks yang dianalisis. Simpan draf terlebih dahulu jika ingin menyimpannya."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>Batal</Button>
            <Button variant="danger" onClick={resetToOriginal}>Ya, muat ulang</Button>
          </>
        }
      />
    </>
  );
}

function RotationIcon() {
  return <RotateCcw className="h-3.5 w-3.5" />;
}
