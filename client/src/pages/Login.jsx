import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import { Alert, Button, Field, Input } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/app/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const validation = {
    email: !form.email ? 'Email wajib diisi.' : /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(form.email) ? '' : 'Format email tidak valid.',
    password: form.password.length < 1 ? 'Kata sandi wajib diisi.' : '',
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (validation.email || validation.password) return;
    setLoading(true);
    setError('');
    try {
      await login(form.email.trim(), form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Masuk ke kirAI"
      subtitle="Lanjutkan pemeriksaan dokumen dan lihat kembali hasil analisis Anda."
      footer={
        <>
          Belum punya akun?{' '}
          <Link to="/register" className="font-semibold text-accent-600 hover:text-accent-700">
            Daftar gratis
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="danger" title="Tidak dapat masuk">{error}</Alert> : null}

        <Field label="Email" htmlFor="email" error={touched.email ? validation.email : ''}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@kampus.ac.id"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            aria-invalid={Boolean(touched.email && validation.email)}
          />
        </Field>

        <Field label="Kata sandi" htmlFor="password" error={touched.password ? validation.password : ''}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Button type="submit" variant="accent" size="lg" className="w-full" loading={loading} icon={LogIn}>
          {loading ? 'Memeriksa…' : 'Masuk'}
        </Button>

        <p className="pt-1 text-center text-[11.5px] leading-relaxed text-ink-400">
          Dengan masuk, Anda memahami bahwa hasil analisis merupakan estimasi probabilitas, bukan bukti pasti.
        </p>
      </form>
    </AuthShell>
  );
}
