import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Info, X, Loader2 } from 'lucide-react';
import { LEVELS } from '../lib/format.js';

export function cn(...values) {
  return values.filter(Boolean).join(' ');
}

const VARIANTS = {
  primary:
    'bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950 shadow-sm disabled:bg-ink-300',
  accent:
    'bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-800 shadow-sm shadow-accent-600/20 disabled:bg-accent-300',
  outline:
    'border border-ink-200 bg-white text-ink-800 hover:border-ink-300 hover:bg-ink-50 disabled:text-ink-400',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  subtle: 'bg-ink-100 text-ink-800 hover:bg-ink-200',
  danger: 'bg-[#E0483D] text-white hover:bg-[#C43B31] shadow-sm disabled:bg-[#F0B5AF]',
};

const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-xl',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  href,
  loading = false,
  icon: Icon,
  className,
  type = 'button',
  ...props
}) {
  const classes = cn(
    'inline-flex select-none items-center justify-center font-medium transition-all duration-150',
    'focus-visible:ring-2 focus-visible:ring-accent-400/70 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    className,
  );

  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={classes} disabled={loading || props.disabled} {...props}>
      {content}
    </button>
  );
}

export function Card({ children, className, ...props }) {
  return (
    <div className={cn('surface', className)} {...props}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'neutral', className }) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-600 ring-ink-200/70',
    accent: 'bg-accent-50 text-accent-700 ring-accent-200',
    high: LEVELS.high.chip,
    medium: LEVELS.medium.chip,
    low: LEVELS.low.chip,
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        tones[tone] || tones.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LevelPill({ level, score, className }) {
  const meta = LEVELS[level] || LEVELS.low;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        meta.chip,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {score !== undefined ? `${meta.short} · ${score}%` : meta.short}
    </span>
  );
}

export function Field({ label, htmlFor, hint, error, children, className }) {
  return (
    <div className={className}>
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className="mt-1.5 text-xs font-medium text-[#C43B31]">{error}</p> : null}
      {!error && hint ? <p className="mt-1.5 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input className={cn('input-base', className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn('input-base resize-y leading-relaxed', className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn('input-base appearance-none pr-9', className)} {...props}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 py-3.5">
      <span>
        <span className="block text-sm font-medium text-ink-800">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-accent-600' : 'bg-ink-200',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}

export function Alert({ tone = 'info', title, children, className, action }) {
  const tones = {
    info: { wrap: 'bg-accent-50/70 border-accent-200/70 text-accent-900', icon: Info, iconColor: 'text-accent-600' },
    warning: { wrap: 'bg-[#FFF8E9] border-[#F0DDB4] text-[#7A5A12]', icon: AlertTriangle, iconColor: 'text-[#B07C10]' },
    danger: { wrap: 'bg-[#FDECEA] border-[#F5C6C1] text-[#8E271F]', icon: AlertTriangle, iconColor: 'text-[#C43B31]' },
    success: { wrap: 'bg-[#E9F7EF] border-[#C3E7D3] text-[#1F7A4C]', icon: CheckCircle2, iconColor: 'text-[#2F9E64]' },
  };
  const config = tones[tone] || tones.info;
  const Icon = config.icon;
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] leading-relaxed', config.wrap, className)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', config.iconColor)} />
      <div className="flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? 'mt-0.5' : ''}>{children}</div>
      </div>
      {action}
    </div>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-ink-400', className)} />;
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-600">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold text-ink-900 sm:text-[28px]">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, suffix, icon: Icon, hint, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-600',
    accent: 'bg-accent-50 text-accent-600',
    high: 'bg-[#FDECEA] text-[#C43B31]',
    low: 'bg-[#E9F7EF] text-[#2F9E64]',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-500">{label}</p>
        {Icon ? (
          <span className={cn('grid h-9 w-9 place-items-center rounded-xl', tones[tone])}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none tracking-tight text-ink-900">
        {value}
        {suffix ? <span className="ml-1 text-base font-medium text-ink-400">{suffix}</span> : null}
      </p>
      {hint ? <p className="mt-2 text-xs text-ink-500">{hint}</p> : null}
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 py-14 text-center', className)}>
      {Icon ? (
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-ink-100 text-ink-500">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({ value = 0, tone = 'accent', className }) {
  const tones = { accent: 'bg-accent-500', high: 'bg-[#E0483D]', medium: 'bg-[#E5A117]', low: 'bg-[#2F9E64]' };
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-ink-100', className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', tones[tone] || tones.accent)}
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer, danger = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md animate-fade-up rounded-2xl border border-ink-200 bg-white p-6 shadow-lift">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className={cn('text-lg font-semibold', danger ? 'text-[#B4302A]' : 'text-ink-900')}>{title}</h3>
            {description ? <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <div className="mt-6 flex justify-end gap-2.5">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------- Toasts ------------------------------- */
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, tone = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2">
        {toasts.map((toast) => {
          const tone = {
            success: 'border-[#C3E7D3] bg-white text-[#1F7A4C]',
            error: 'border-[#F5C6C1] bg-white text-[#B4302A]',
            info: 'border-ink-200 bg-white text-ink-700',
          }[toast.tone] || 'border-ink-200 bg-white text-ink-700';
          return (
            <div
              key={toast.id}
              className={cn('pointer-events-auto animate-fade-up rounded-xl border px-4 py-3 text-sm shadow-lift', tone)}
            >
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext) || (() => {});
}
