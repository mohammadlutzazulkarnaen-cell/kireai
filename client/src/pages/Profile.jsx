import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, KeyRound, Mail, Building2, GraduationCap, FileText, ScanText, Gauge, LogOut } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { AVATAR_COLORS, formatDate, initials } from '../lib/format.js';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Spinner, StatCard, useToast, cn } from '../components/ui.jsx';

const ROLES = ['Mahasiswa', 'Dosen', 'Peneliti', 'Editor', 'Umum'];
const COLORS = [
  { key: 'violet', label: 'Violet', swatch: 'bg-accent-500' },
  { key: 'navy', label: 'Navy', swatch: 'bg-ink-800' },
  { key: 'emerald', label: 'Emerald', swatch: 'bg-[#2F9E64]' },
  { key: 'amber', label: 'Amber', swatch: 'bg-[#E5A117]' },
  { key: 'rose', label: 'Rose', swatch: 'bg-[#E0483D]' },
];

export default function Profile() {
  const { user, setUser, refresh, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', institution: '', role: 'Mahasiswa', avatarColor: 'violet' });
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        institution: user.institution || '',
        role: user.role || 'Mahasiswa',
        avatarColor: user.avatarColor || 'violet',
      });
    }
  }, [user]);

  useEffect(() => {
    api.get('/dashboard').then((res) => setStats(res.stats)).catch(() => {});
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      toast('Nama minimal 2 karakter.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', form);
      setUser(res.user);
      await refresh();
      toast('Profil berhasil diperbarui.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    if (password.newPassword.length < 8) {
      setPasswordError('Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (password.newPassword !== password.confirm) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    setPasswordSaving(true);
    try {
      await api.post('/auth/password', {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      setPassword({ currentPassword: '', newPassword: '', confirm: '' });
      toast('Kata sandi berhasil diubah.', 'success');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (!user) return <div className="grid h-[50vh] place-items-center"><Spinner /></div>;

  return (
    <>
      <PageHeader
        eyebrow="Akun"
        title="Profile"
        subtitle="Kelola identitas dan keamanan akun kirAI Anda."
        actions={<Button variant="outline" icon={LogOut} onClick={handleLogout}>Keluar</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Dokumen" value={stats?.documents ?? '—'} icon={FileText} tone="accent" />
        <StatCard label="Analisis" value={stats?.analyses ?? '—'} icon={ScanText} />
        <StatCard label="Rata-rata indikasi AI" value={stats?.averageAiScore ?? '—'} suffix={stats?.averageAiScore === null ? '' : '%'} icon={Gauge} tone="medium" />
        <StatCard label="Bagian terindikasi" value={stats?.flaggedSections ?? '—'} icon={FileText} tone="high" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <span className={cn('grid h-16 w-16 place-items-center rounded-2xl text-xl font-bold', AVATAR_COLORS[form.avatarColor] || AVATAR_COLORS.violet)}>
              {initials(form.name || user.name)}
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-ink-900">{user.name}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-500">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </p>
              <p className="mt-1 text-[11px] text-ink-400">Bergabung {formatDate(user.createdAt, false)}</p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama lengkap" htmlFor="name">
                <Input id="name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </Field>
              <Field label="Email" htmlFor="email" hint="Email tidak dapat diubah">
                <Input id="email" value={user.email} disabled className="bg-ink-50 text-ink-400" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Institusi" htmlFor="institution">
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <Input
                    id="institution"
                    className="pl-9"
                    value={form.institution}
                    placeholder="Universitas / instansi"
                    onChange={(event) => setForm((prev) => ({ ...prev, institution: event.target.value }))}
                  />
                </div>
              </Field>
              <Field label="Peran" htmlFor="role">
                <div className="relative">
                  <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <Select
                    id="role"
                    className="pl-9"
                    value={form.role}
                    onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </Select>
                </div>
              </Field>
            </div>

            <div>
              <p className="field-label">Warna avatar</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.key}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, avatarColor: color.key }))}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-medium transition-all',
                      form.avatarColor === color.key
                        ? 'border-accent-400 bg-accent-50 text-accent-700 ring-2 ring-accent-100'
                        : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300',
                    )}
                  >
                    <span className={cn('h-3.5 w-3.5 rounded-full', color.swatch)} />
                    {color.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" variant="primary" icon={Save} loading={saving}>Simpan profil</Button>
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
              <KeyRound className="h-4 w-4 text-ink-400" /> Ubah kata sandi
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-500">
              Gunakan kata sandi unik minimal 8 karakter. Anda akan tetap masuk di perangkat ini.
            </p>

            <form onSubmit={changePassword} className="mt-4 space-y-3.5">
              {passwordError ? <Alert tone="danger">{passwordError}</Alert> : null}
              <Field label="Kata sandi saat ini" htmlFor="current">
                <Input
                  id="current"
                  type="password"
                  autoComplete="current-password"
                  value={password.currentPassword}
                  onChange={(event) => setPassword((prev) => ({ ...prev, currentPassword: event.target.value }))}
                />
              </Field>
              <Field label="Kata sandi baru" htmlFor="new">
                <Input
                  id="new"
                  type="password"
                  autoComplete="new-password"
                  value={password.newPassword}
                  onChange={(event) => setPassword((prev) => ({ ...prev, newPassword: event.target.value }))}
                />
              </Field>
              <Field label="Konfirmasi kata sandi baru" htmlFor="confirm-new">
                <Input
                  id="confirm-new"
                  type="password"
                  autoComplete="new-password"
                  value={password.confirm}
                  onChange={(event) => setPassword((prev) => ({ ...prev, confirm: event.target.value }))}
                />
              </Field>
              <Button type="submit" variant="outline" className="w-full" loading={passwordSaving}>
                Perbarui kata sandi
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="text-[15px] font-semibold text-ink-900">Privasi akun</h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">
              Dokumen dan hasil analisis Anda hanya dapat diakses oleh akun ini. Ingin menghapus seluruh data dokumen?
              Gunakan opsi di halaman Pengaturan.
            </p>
            <Button to="/app/settings" variant="ghost" size="sm" className="mt-3 px-0 text-accent-700 hover:bg-transparent hover:underline">
              Buka pengaturan
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
