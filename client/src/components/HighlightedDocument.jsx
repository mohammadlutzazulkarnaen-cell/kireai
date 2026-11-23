import { useState } from 'react';
import { LEVELS } from '../lib/format.js';
import { cn } from './ui.jsx';

/**
 * Renders the analyzed document with one mark per sentence.
 * Hover -> compact tooltip (score + first reason), click -> detail panel.
 */
export default function HighlightedDocument({
  paragraphs = [],
  activeSentenceId,
  onSelect,
  showHighlights = true,
  filter = 'all',
  className,
}) {
  const [hover, setHover] = useState(null);

  const handleEnter = (event, sentence) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 296;
    const x = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    const y = rect.bottom + 8 > window.innerHeight - 130 ? rect.top - 118 : rect.bottom + 8;
    setHover({ sentence, x, y });
  };

  const dimmed = (level) => filter !== 'all' && filter !== level;

  return (
    <div className={cn('relative', className)} onMouseLeave={() => setHover(null)}>
      {paragraphs.map((paragraph) => (
        <div key={paragraph.id} className="group mb-5 last:mb-0">
          <div className="mb-1.5 flex items-center gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Paragraf {paragraph.index + 1}
            </span>
            <span className="h-px flex-1 bg-ink-100" />
            <span className="text-[10px] font-medium text-ink-400">{paragraph.aiScore}% indikasi AI</span>
          </div>
          <p className="text-[15px] leading-[1.95] text-ink-800">
            {paragraph.sentences.map((sentence, index) => {
              const meta = LEVELS[sentence.level] || LEVELS.low;
              const isActive = activeSentenceId === sentence.id;
              return (
                <span key={sentence.id}>
                  <span
                    role="button"
                    tabIndex={0}
                    id={sentence.id}
                    data-level={sentence.level}
                    onClick={() => onSelect?.(sentence, paragraph)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect?.(sentence, paragraph);
                      }
                    }}
                    onMouseEnter={(event) => handleEnter(event, sentence)}
                    onFocus={(event) => handleEnter(event, sentence)}
                    aria-label={`${meta.label}, skor ${sentence.aiScore} persen`}
                    className={cn(
                      'mark-sentence transition-opacity duration-150',
                      showHighlights && !dimmed(sentence.level) ? meta.mark : 'hover:bg-ink-100',
                      showHighlights && dimmed(sentence.level) && 'opacity-55',
                      isActive && 'is-active',
                    )}
                    style={isActive ? { color: meta.hex } : undefined}
                  >
                    {sentence.text}
                  </span>
                  {index < paragraph.sentences.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </p>
        </div>
      ))}

      {hover ? (
        <div
          className="pointer-events-none fixed z-50 w-[296px] animate-fade-up rounded-xl border border-ink-200 bg-white p-3 shadow-lift"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Estimasi AI</span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{ backgroundColor: `${LEVELS[hover.sentence.level].hex}18`, color: LEVELS[hover.sentence.level].hex }}
            >
              {hover.sentence.aiScore}%
            </span>
          </div>
          <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-ink-600">{hover.sentence.reasons?.[0]}</p>
          <p className="mt-1.5 text-[10.5px] text-ink-400">Klik untuk melihat detail dan saran.</p>
        </div>
      ) : null}
    </div>
  );
}
