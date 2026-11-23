import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { BrandMark } from '../components/AppShell.jsx';
import { Button } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-6">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <BrandMark size="lg" />
        </div>
        <div className="mx-auto mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-white text-ink-400 shadow-card">
          <FileQuestion className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-ink-900">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          Tautan yang Anda buka mungkin sudah dihapus atau tidak pernah ada.
        </p>
        <div className="mt-6 flex justify-center gap-2.5">
          <Button to="/app/dashboard" variant="primary">Ke dashboard</Button>
          <Button to="/" variant="outline">Beranda</Button>
        </div>
      </div>
    </div>
  );
}
