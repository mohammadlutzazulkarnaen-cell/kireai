import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import { Alert, Button, Field, Input, Select } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = ['Mahasiswa', 'Dosen', 'Peneliti', 'Editor', 'Umum'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', institution: '', role: 'Mahasiswa', password: '', confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validation = {
    name: form.name.trim().length < 2 ? 'Nama minimal 2 karakter.' : '',
    email: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(form.email) ? '' : 'Format email tidak valid.',
    password: form.password.length < 8 ? 'Kata sandi minimal 8 karakter.' : '',
    confirm: form.confirm !== form.password ? 'Konfirmasi kata sandi tidak cocok.' : '',
  };
  const hasError = Object.values(validation).some(Boolean);

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const blur = (key) => () => setTouched((prev) => ({ ...prev, [key]: true }));

  const onSubmit = async (event) => {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (hasError) return;
    setLoading(true);
    setError('');
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        institution: form.institution.trim(),
        role: form.role,
      });
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Buat akun kirAI"
      subtitle="Gratis. Dokumen Anda tersimpan privat dan bisa dihapus kapan saja."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link to="/login" className="font-semibold text-accent-600 hover:text-accent-700">
            Masuk
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="danger" title="Pendaftaran gagal">{error}</Alert> : null}

        <Field label="Nama lengkap" htmlFor="name" error={touched.name ? validation.name : ''}>
          <Input id="name" value={form.name} onChange={update('name')} onBlur={blur('name')} placeholder="Nama Anda" autoComplete="name" />
        </Field>

        <Field label="Email" htmlFor="email" error={touched.email ? validation.email : ''}>
          <Input id="email" type="email" value={form.email} onChange={update('email')} onBlur={blur('email')} placeholder="nama@kampus.ac.id" autoComplete="email" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Institusi" htmlFor="institution" hint="Opsional">
            <Input id="institution" value={form.institution} onChange={update('institution')} placeholder="Universitas" />
          </Field>
          <Field label="Peran" htmlFor="role">
            <Select id="role" value={form.role} onChange={update('role')}>
              {ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Kata sandi" htmlFor="password" error={touched.password ? validation.password : ''} hint="Minimal 8 karakter">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={update('password')}
              onBlur={blur('password')}
              placeholder="••••••••"
              autoComplete="new-password"
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

        <Field label="Konfirmasi kata sandi" htmlFor="confirm" error={touched.confirm ? validation.confirm : ''}>
          <Input
            id="confirm"
            type={showPassword ? 'text' : 'password'}
            value={form.confirm}
            onChange={update('confirm')}
            onBlur={blur('confirm')}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </Field>

        <Button type="submit" variant="accent" size="lg" className="w-full" loading={loading} icon={UserPlus}>
          {loading ? 'Membuat akun…' : 'Buat akun'}
        </Button>
      </form>
    </AuthShell>
  );
}
