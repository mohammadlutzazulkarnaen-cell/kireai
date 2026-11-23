import { LEVELS, levelOf } from '../lib/format.js';
import { cn } from './ui.jsx';

export function ScoreGauge({ value = 0, size = 168, stroke = 14, label = 'Indikasi AI', hint }) {
  const level = levelOf(value);
  const color = LEVELS[level].hex;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EDEFF6" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-semibold leading-none tracking-tight text-ink-900">
          {value}
          <span className="text-lg font-medium text-ink-400">%</span>
        </span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">{label}</span>
        {hint ? <span className="mt-1 text-[11px] text-ink-400">{hint}</span> : null}
      </div>
    </div>
  );
}

export function TrendBars({ data = [], height = 96 }) {
  if (!data.length) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-ink-400">
        Belum ada data analisis untuk ditampilkan.
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((item, index) => {
        const meta = LEVELS[levelOf(item.ai_score)];
        const value = item.ai_score ?? 0;
        return (
          <div key={item.id ?? index} className="group flex flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10px] font-semibold text-ink-400 opacity-0 transition-opacity group-hover:opacity-100">
              {value}%
            </span>
            <div
              className="w-full max-w-[42px] rounded-t-md transition-all duration-500"
              style={{ height: `${Math.max(6, (value / 100) * (height - 30))}px`, backgroundColor: meta.hex, opacity: 0.85 }}
              title={`${item.document_name || 'Dokumen'} — ${value}%`}
            />
          </div>
        );
      })}
    </div>
  );
}

export function DistributionBar({ distribution, className }) {
  const total = Math.max(1, (distribution?.high || 0) + (distribution?.medium || 0) + (distribution?.low || 0));
  const segments = [
    { key: 'high', count: distribution?.high || 0 },
    { key: 'medium', count: distribution?.medium || 0 },
    { key: 'low', count: distribution?.low || 0 },
  ];
  return (
    <div className={cn('flex h-2.5 w-full overflow-hidden rounded-full bg-ink-100', className)}>
      {segments.map((segment) =>
        segment.count > 0 ? (
          <div
            key={segment.key}
            className="h-full transition-all duration-500"
            style={{ width: `${(segment.count / total) * 100}%`, backgroundColor: LEVELS[segment.key].hex }}
            title={`${LEVELS[segment.key].label}: ${segment.count} kalimat`}
          />
        ) : null,
      )}
    </div>
  );
}

export function Sparkline({ data = [], color = '#6D5EF8', width = 120, height = 36 }) {
  if (data.length < 2) return <div className="h-9" />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / Math.max(1, max - min)) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
