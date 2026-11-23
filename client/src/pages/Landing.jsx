import { Link } from 'react-router-dom';
import {
  ArrowRight, ScanText, FileSearch, PenLine, FileDown, History, ShieldCheck, Sparkles,
  CheckCircle2, AlertTriangle, Gauge, Layers, Lock, Zap,
} from 'lucide-react';
import { BrandMark } from '../components/AppShell.jsx';
import { Button, cn } from '../components/ui.jsx';
import { LEVELS } from '../lib/format.js';

const NAV_LINKS = [
  { href: '#fitur', label: 'Fitur' },
  { href: '#cara-kerja', label: 'Cara kerja' },
  { href: '#privasi', label: 'Privasi' },
];

const SAMPLE = [
  { text: 'Di era digital saat ini, teknologi informasi memainkan peran penting dalam berbagai aspek kehidupan masyarakat.', level: 'high' },
  { text: 'Penting untuk dicatat bahwa pemanfaatan teknologi secara menyeluruh dapat memberikan dampak yang signifikan.', level: 'high' },
  { text: 'Tapi jujur, saya sendiri lebih suka mencatat pakai buku tulis — setidaknya sampai baterai laptop habis di tengah presentasi.', level: 'low' },
  { text: 'Selain itu, kolaborasi berbagai pihak menjadi fondasi utama dalam transformasi layanan publik.', level: 'medium' },
];

const FEATURES = [
  { icon: ScanText, title: 'Highlight per kalimat', text: 'Setiap kalimat diberi skor dan warna: merah, kuning, atau hijau. Bukan warna rata untuk seluruh dokumen.' },
  { icon: Gauge, title: 'Skor yang bisa dijelaskan', text: 'Klik bagian mana pun untuk melihat alasan penilaian, sinyal yang terdeteksi, dan saran evaluasi.' },
  { icon: FileSearch, title: 'Ekstraksi PDF, DOCX, TXT', text: 'Teks diekstrak langsung dari file Anda, lalu dianalisis per paragraf dan per kalimat.' },
  { icon: PenLine, title: 'Editor dengan persetujuan', text: 'Tulis ulang bagian yang ditandai, bandingkan versi sebelum-sesudah, dan simpan revisi Anda sendiri.' },
  { icon: FileDown, title: 'Laporan PDF', text: 'Unduh laporan lengkap berisi skor, rincian per bagian, dan kesimpulan pemeriksaan.' },
  { icon: History, title: 'Riwayat pemeriksaan', text: 'Semua analisis tersimpan rapi dan bisa dibuka kembali kapan pun Anda butuh.' },
];

const STEPS = [
  { title: 'Unggah dokumen', text: 'Tarik file PDF, DOCX, atau TXT ke area unggah. Maksimal 10 MB.' },
  { title: 'Jalankan analisis', text: 'kirAI mengekstrak teks dan menghitung sinyal stilistik per kalimat.' },
  { title: 'Tinjau highlight', text: 'Lihat bagian berwarna merah, kuning, dan hijau beserta alasannya.' },
  { title: 'Revisi & laporkan', text: 'Edit bagian yang perlu, lalu unduh laporan PDF hasil pemeriksaan.' },
];

function SamplePreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[28px] bg-gradient-to-br from-accent-200/50 via-white to-accent-100/40 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#FDECEA] text-[#C43B31]">
              <FileSearch className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[12.5px] font-semibold leading-tight text-ink-900">esai-kebijakan-digital.pdf</p>
              <p className="text-[10.5px] text-ink-400">1.248 kata · 12 paragraf</p>
            </div>
          </div>
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
            Contoh tampilan
          </span>
        </div>

        <div className="flex items-center gap-4 border-b border-ink-100 px-4 py-4">
          <div className="relative grid h-[86px] w-[86px] place-items-center">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#EDEFF6" strokeWidth="9" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke={LEVELS.high.hex} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * 0.29}
              />
            </svg>
            <span className="absolute text-[19px] font-semibold text-ink-900">71%</span>
          </div>
          <div className="flex-1 space-y-2.5">
            {[
              ['Indikasi AI', 71, LEVELS.high.hex],
              ['Karakter manusia', 29, LEVELS.low.hex],
            ].map(([label, value, color]) => (
              <div key={label}>
                <div className="flex justify-between text-[10.5px] font-medium text-ink-500">
                  <span>{label}</span>
                  <span className="text-ink-800">{value}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 px-4 py-4">
          {SAMPLE.map((item, index) => (
            <p key={index} className="text-[12px] leading-relaxed text-ink-700">
              <span className={cn('rounded px-0.5 py-px', LEVELS[item.level].mark)}>{item.text}</span>
            </p>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-ink-100 bg-ink-50/60 px-4 py-2.5">
          {Object.values(LEVELS).map((level) => (
            <span key={level.key} className="flex items-center gap-1.5 text-[10px] font-medium text-ink-500">
              <span className={cn('h-2 w-2 rounded-sm', level.dot)} />
              {level.label.replace('AI ', '')}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-5 -left-3 hidden rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 shadow-card sm:block">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Sinyal terdeteksi</p>
        <p className="mt-0.5 text-[11.5px] font-medium text-ink-800">Frasa formulaik · kalimat seragam</p>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-ink-200/60 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" aria-label="kirAI beranda">
            <BrandMark credit />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-[13.5px] font-medium text-ink-600 transition-colors hover:text-ink-900">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Masuk
            </Button>
            <Button to="/register" variant="primary" size="sm" icon={ArrowRight} className="flex-row-reverse">
              Mulai gratis
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-32 -top-24 h-[420px] w-[420px] rounded-full bg-accent-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-40 h-[360px] w-[360px] rounded-full bg-[#EAF3FF] blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 lg:grid-cols-[1.02fr_1fr] lg:pb-28 lg:pt-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-[11.5px] font-medium text-ink-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent-600" />
              Deteksi konten AI untuk karya akademik
            </span>
            <h1 className="mt-6 text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-900 text-balance sm:text-[46px] lg:text-[52px]">
              Tahu bagian mana tulisan Anda terasa seperti <span className="text-accent-600">AI</span>.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-600">
              kirAI menganalisis dokumen PDF, DOCX, dan TXT, lalu menandai kalimat dengan indikasi AI tinggi, sedang,
              dan rendah. Setiap tanda disertai alasan dan saran — sehingga Anda bisa memperbaiki, bukan sekadar menebak.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button to="/register" size="lg" variant="accent" icon={ArrowRight} className="flex-row-reverse">
                Mulai analisis pertama
              </Button>
              <Button to="/login" size="lg" variant="outline">
                Saya sudah punya akun
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-ink-500">
              {['PDF · DOCX · TXT', 'Maks. 10 MB', 'Highlight per kalimat'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#2F9E64]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <SamplePreview />
          </div>
        </div>
      </section>

      <section className="border-y border-ink-100 bg-ink-50/60">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:grid-cols-3">
          {[
            { icon: Lock, title: 'Privat secara desain', text: 'Dokumen hanya milik akun Anda.' },
            { icon: Zap, title: 'Hasil deterministik', text: 'Teks sama, skor sama — bisa diaudit.' },
            { icon: Layers, title: 'Per kalimat, bukan global', text: 'Lihat konteks, bukan satu angka.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-accent-600 ring-1 ring-ink-200">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-ink-900">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="fitur" className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-accent-600">Fitur</p>
          <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[34px]">
            Semua yang dibutuhkan untuk memeriksa dan memperbaiki tulisan.
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">
            Bukan sekadar skor akhir. kirAI membantu Anda memahami mengapa sebuah bagian dinilai demikian, lalu memperbaikinya dengan tangan Anda sendiri.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="group rounded-2xl border border-ink-200/80 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-200 hover:shadow-lift"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-50 text-ink-700 ring-1 ring-ink-200/70 transition-colors group-hover:bg-accent-50 group-hover:text-accent-600 group-hover:ring-accent-200">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-ink-900">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="cara-kerja" className="border-y border-ink-100 bg-ink-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-accent-300">Cara kerja</p>
              <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight sm:text-[34px]">
                Empat langkah, kurang dari satu menit.
              </h2>
            </div>
            <Button to="/register" variant="accent" icon={ArrowRight} className="flex-row-reverse self-start sm:self-auto">
              Coba sekarang
            </Button>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative border-t border-white/15 pt-5">
                <span className="text-[11px] font-semibold tracking-[0.14em] text-accent-300">0{index + 1}</span>
                <h3 className="mt-2 text-[15px] font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="privasi" className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-8 rounded-2xl border border-[#F0DDB4] bg-[#FFF8E9] p-6 sm:p-8 lg:grid-cols-[auto_1fr]">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#B07C10] ring-1 ring-[#F0DDB4]">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-[17px] font-semibold text-[#5C440C]">Hasil adalah estimasi, bukan bukti.</h2>
            <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-[#7A5A12]">
              Tidak ada detektor yang dapat memastikan sebuah tulisan dihasilkan AI. kirAI menghitung probabilitas
              berdasarkan pola permukaan teks — frasa formulaik, keseragaman panjang kalimat, kekayaan kosakata, dan
              penanda gaya personal. Gunakan hasil ini sebagai bahan pertimbangan, bukan dasar tunggal untuk menilai
              seseorang. Dokumen Anda disimpan terikat ke akun dan dapat dihapus kapan saja.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent-600 to-accent-800 px-6 py-12 text-center sm:px-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative text-[28px] font-semibold tracking-tight text-white sm:text-[34px]">
            Periksa dokumen Anda sekarang.
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-sm leading-relaxed text-accent-100">
            Buat akun, unggah dokumen pertama, dan lihat sendiri bagaimana kirAI menandai setiap kalimat.
          </p>
          <div className="relative mt-7 flex justify-center">
            <Button to="/register" size="lg" className="!bg-white !text-ink-900 shadow-card hover:!bg-accent-50" icon={ArrowRight}>
              Buat akun gratis
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark />
          </div>
          <p className="max-w-md text-[11.5px] leading-relaxed text-ink-400">
            kirAI — AI content detector & document analyzer. Skor merupakan estimasi probabilitas dan tidak dapat
            dijadikan bukti definitif penggunaan AI.
          </p>
          <div className="flex items-center gap-4 text-[12.5px] text-ink-500">
            <Link to="/login" className="hover:text-ink-900">Masuk</Link>
            <Link to="/register" className="hover:text-ink-900">Daftar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
