import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Trash2, ShieldCheck, Cpu, Info, LogOut, Globe2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Alert, Button, Card, Field, PageHeader, Select, Spinner, Toggle, Modal, useToast, cn,
} from '../components/ui.jsx';

export default function Settings() {
  const { setSettings: setAuthSettings, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then((res) => setSettings(res.settings))
      .catch((err) => toast(err.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch) => setSettings((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/settings', settings);
      setSettings(res.settings);
      setAuthSettings(res.settings);
      toast('Pengaturan disimpan.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const purgeDocuments = async () => {
    setPurging(true);
    try {
      const res = await api.del('/settings/documents');
      toast(`${res.deleted} dokumen beserta analisisnya dihapus permanen.`, 'success');
      setConfirmPurge(false);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setPurging(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (!settings) {
    return (
      <div className="grid h-[50vh] place-items-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Preferensi"
        title="Settings"
        subtitle="Atur cara kirAI bekerja pada dokumen Anda dan kelola data yang tersimpan."
        actions={<Button variant="primary" icon={Save} loading={saving} onClick={save}>Simpan perubahan</Button>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
              <Cpu className="h-4 w-4 text-accent-600" /> Mesin deteksi
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
              Pilih mesin yang dipakai untuk setiap analisis baru. Pengaturan ini tidak mengubah hasil yang sudah tersimpan.
            </p>

            <div className="mt-4">
              <Field
                label="Mesin default"
                htmlFor="engine"
                hint="Mode otomatis memakai API eksternal hanya jika administrator telah mengonfigurasinya."
              >
                <Select id="engine" value={settings.defaultEngine} onChange={(event) => update({ defaultEngine: event.target.value })}>
                  <option value="auto">Otomatis (rekomendasi)</option>
                  <option value="local">Hanya mesin lokal</option>
                </Select>
              </Field>
            </div>

            <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50/60 p-4">
              <p className="text-[12px] font-semibold text-ink-800">kirAI Heuristic Engine v1</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">
                Mesin lokal yang menganalisis pola stilistik nyata: frasa formulaik, keseragaman panjang kalimat,
                kekayaan kosakata, kepadatan nominalisasi, dan penanda gaya personal. Deterministik — teks yang sama
                selalu menghasilkan skor yang sama, dan setiap skor dapat ditelusuri ke sinyalnya.
              </p>
            </div>
          </Card>

          <Card className="px-6 py-3">
            <h2 className="pt-3 text-[15px] font-semibold text-ink-900">Editor &amp; tampilan</h2>
            <div className="mt-1 divide-y divide-ink-100">
              <Toggle
                label="Simpan draf otomatis"
                description="Simpan perubahan editor secara otomatis 1,8 detik setelah Anda berhenti menulis."
                checked={settings.autosaveEditor}
                onChange={(value) => update({ autosaveEditor: value })}
              />
              <Toggle
                label="Tampilkan highlight secara default"
                description="Buka halaman hasil dengan penandaan warna aktif. Anda tetap bisa menyembunyikannya sementara."
                checked={settings.persistHighlights}
                onChange={(value) => update({ persistHighlights: value })}
              />
              <Toggle
                label="Notifikasi dalam aplikasi"
                description="Tampilkan pemberitahuan ketika unggahan, analisis, atau penyimpanan selesai."
                checked={settings.inappAlerts}
                onChange={(value) => update({ inappAlerts: value })}
              />
              <Toggle
                label="Tabel versi ringkas"
                description="Kurangi tinggi baris pada tabel riwayat dan dokumen."
                checked={settings.compactTables}
                onChange={(value) => update({ compactTables: value })}
              />
            </div>
            <div className="flex justify-end border-t border-ink-100 py-4">
              <Button variant="primary" icon={Save} loading={saving} onClick={save}>Simpan perubahan</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
              <ShieldCheck className="h-4 w-4 text-[#2F9E64]" /> Privasi &amp; data
            </h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">
              Dokumen disimpan terikat ke akun Anda dan tidak dibagikan ke pengguna lain. Menghapus dokumen juga
              menghapus seluruh hasil analisis dan draf revisi terkait.
            </p>
            <Button variant="danger" size="sm" icon={Trash2} className="mt-4" onClick={() => setConfirmPurge(true)}>
              Hapus semua dokumen saya
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
              <Globe2 className="h-4 w-4 text-accent-600" /> Bahasa &amp; format
            </h2>
            <div className="mt-3 space-y-2 text-[12px]">
              {[
                ['Antarmuka', 'Bahasa Indonesia'],
                ['Format didukung', 'PDF, DOCX, TXT'],
                ['Ukuran maksimum', '10 MB per dokumen'],
                ['Deteksi bahasa', 'Indonesia & Inggris'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-ink-500">{label}</span>
                  <span className="text-right font-medium text-ink-900">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-[#F0DDB4] bg-[#FFF8E9] p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#8A6415]">
              <Info className="h-4 w-4" /> Batasan deteksi
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-[#7A5A12]">
              Skor adalah estimasi probabilitas berdasarkan pola permukaan teks dan tidak membuktikan asal-usul tulisan.
              Teks yang sangat pendek, sangat teknis, atau ditulis dalam bahasa campuran dapat menurunkan akurasi.
            </p>
          </Card>

          <Card className="flex items-center justify-between p-5">
            <div>
              <p className="text-[13px] font-semibold text-ink-900">Sesi aktif</p>
              <p className="mt-0.5 text-[11.5px] text-ink-500">Keluar dari akun di perangkat ini.</p>
            </div>
            <Button variant="outline" size="sm" icon={LogOut} onClick={handleLogout}>Keluar</Button>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmPurge}
        onClose={() => setConfirmPurge(false)}
        danger
        title="Hapus semua dokumen?"
        description="Seluruh dokumen, analisis, laporan, dan draf revisi di akun Anda akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmPurge(false)}>Batal</Button>
            <Button variant="danger" loading={purging} onClick={purgeDocuments}>Ya, hapus semua</Button>
          </>
        }
      />
    </>
  );
}
