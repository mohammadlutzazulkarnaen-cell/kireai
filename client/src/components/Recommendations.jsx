import { useState } from 'react';
import {
  AlignLeft, ChevronDown, Fingerprint, Info, PenLine, Scissors, TrendingDown, Wand2,
} from 'lucide-react';
import { LEVELS } from '../lib/format.js';
import { Badge, Button, Card, cn } from './ui.jsx';

const ICONS = {
  phrase: Wand2,
  uniformity: Scissors,
  lexical: AlignLeft,
  personal: Fingerprint,
};

/** Prioritised, signal-driven rewrite plan for the analysed document. */
export default function Recommendations({ recommendations, analysisId, onSelect }) {
  const [expanded, setExpanded] = useState(() => new Set());

  if (!recommendations?.items?.length) {
    return (
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
          <TrendingDown className="h-4 w-4 text-accent-600" /> Rencana perbaikan teks
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
          Tidak ada kalimat berindikasi tinggi atau sedang, jadi belum ada perbaikan yang perlu diprioritaskan.
        </p>
      </Card>
    );
  }

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink-100 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
              <TrendingDown className="h-4 w-4 text-accent-600" /> Rencana perbaikan teks
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
              Disusun dari sinyal yang benar-benar menaikkan skor, diurutkan dari dampak terbesar.
            </p>
          </div>
          <Badge tone="accent">{recommendations.items.length} langkah</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg bg-ink-50 px-2.5 py-1 text-[11.5px] font-medium text-ink-600">
            {recommendations.summary.flagged} dari {recommendations.summary.total} kalimat bertanda
          </span>
          <span className="rounded-lg bg-[#E9F7EF] px-2.5 py-1 text-[11.5px] font-medium text-[#1F7A4C]">
            potensi penurunan hingga {recommendations.summary.points} poin
          </span>
        </div>
      </div>

      <div className="divide-y divide-ink-100">
        {recommendations.items.map((item) => {
          const Icon = ICONS[item.category] || Wand2;
          const isOpen = expanded.has(item.id);
          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-ink-50/70"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-50 text-accent-600 ring-1 ring-accent-100">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-ink-900">{item.title}</span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-500">
                    {item.affected} kalimat · rata-rata {item.averageScore}% indikasi
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-[#E9F7EF] px-2 py-0.5 text-[11px] font-semibold text-[#1F7A4C]">
                  −{item.points} poin
                </span>
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-400 transition-transform', isOpen && 'rotate-180')} />
              </button>

              {isOpen ? (
                <div className="animate-fade-up border-t border-ink-100 bg-ink-50/40 px-5 py-4">
                  <p className="text-[12px] leading-relaxed text-ink-600">{item.why}</p>
                  <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-ink-800">{item.action}</p>
                  <ul className="mt-2.5 space-y-1.5">
                    {item.steps.map((step) => (
                      <li key={step} className="flex gap-2 text-[12px] leading-relaxed text-ink-600">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
                        {step}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 grid gap-2 rounded-xl border border-ink-200 bg-white p-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Pola yang perlu dihindari</p>
                      <p className="mt-1 text-[11.5px] italic leading-relaxed text-ink-500">“{item.example.before}”</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#1F7A4C]">Pola pengganti</p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-700">“{item.example.after}”</p>
                    </div>
                  </div>

                  <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Kalimat prioritas</p>
                  <ul className="mt-2 space-y-2">
                    {item.sentences.map((sentence) => (
                      <li key={sentence.id}>
                        <button
                          type="button"
                          onClick={() => onSelect?.(sentence)}
                          className="w-full rounded-lg border border-ink-200 bg-white p-3 text-left transition-colors hover:border-accent-300 hover:bg-accent-50/40"
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="line-clamp-2 text-[12px] leading-relaxed text-ink-700">“{sentence.text}”</span>
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold"
                              style={{ backgroundColor: `${LEVELS[sentence.level].hex}18`, color: LEVELS[sentence.level].hex }}
                            >
                              {sentence.aiScore}%
                            </span>
                          </span>
                          {sentence.tips?.length ? (
                            <span className="mt-1.5 block text-[11px] leading-relaxed text-ink-500">→ {sentence.tips[0]}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {item.hiddenCount ? (
                    <p className="mt-2 text-[11px] text-ink-400">
                      +{item.hiddenCount} kalimat lain di kelompok ini — buka dokumen bertanda untuk melihat semuanya.
                    </p>
                  ) : null}

                  <Button to={`/app/analysis/${analysisId}/editor`} variant="outline" size="sm" icon={PenLine} className="mt-3">
                    Perbaiki di editor
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="flex gap-2 border-t border-ink-100 bg-ink-50/60 px-5 py-3 text-[10.5px] leading-relaxed text-ink-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {recommendations.summary.note}
      </p>
    </Card>
  );
}
