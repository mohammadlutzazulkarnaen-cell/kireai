import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck, ScanText } from 'lucide-react';
import { BrandMark } from './AppShell.jsx';

const POINTS = [
  { icon: ScanText, title: 'Highlight per kalimat', text: 'Lihat persis bagian yang terindikasi, bukan sekadar skor dokumen.' },
  { icon: ShieldCheck, title: 'Dokumen tetap privat', text: 'Setiap dokumen terikat ke akun Anda dan dapat dihapus kapan saja.' },
  { icon: CheckCircle2, title: 'Estimasi transparan', text: 'Setiap skor disertai alasan dan saran evaluasi, bukan angka tanpa dasar.' },
];

export default function AuthShell({ children, title, subtitle, footer }) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-ink-900 p-10 text-white lg:flex xl:p-14">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-accent-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" aria-hidden="true">
              <path d="M7 4v16M7 13l7-7M7 13l7 7" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="18" cy="6.5" r="1.8" fill="#B3A5FF" />
            </svg>
          </span>
          <span className="flex flex-col">
            <span className="text-xl font-bold leading-none tracking-tight">
              kir<span className="text-accent-300">AI</span>
            </span>
            <span className="mt-1.5 text-[10px] font-medium leading-none tracking-[0.01em] text-ink-400">
              by Mohammad Lutza Zulkarnaen
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">AI content detector</p>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.2] tracking-tight">
            Ketahui bagian mana tulisan Anda terasa seperti keluaran AI.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-300">
            kirAI memeriksa pola stilistik dokumen Anda dan menandai kalimat yang perlu ditinjau ulang — tanpa mengubah teks Anda.
          </p>

          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, title: pointTitle, text }) => (
              <li key={pointTitle} className="flex gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/8 ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-accent-200" />
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-white">{pointTitle}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] leading-relaxed text-ink-500">
          kirAI memberikan estimasi probabilitas, bukan bukti pasti penggunaan AI.
        </p>
      </div>

      <div className="flex w-full flex-col lg:w-[54%]">
        <div className="flex items-center justify-between px-6 py-5 lg:px-10">
          <Link to="/" className="lg:hidden">
            <BrandMark />
          </Link>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke beranda
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 lg:px-10">
          <div className="w-full max-w-[400px] animate-fade-up">
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{subtitle}</p>
            <div className="mt-7">{children}</div>
            {footer ? <div className="mt-6 text-center text-[13px] text-ink-500">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
