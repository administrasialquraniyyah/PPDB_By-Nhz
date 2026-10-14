'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/formatters';
import {
  Settings,
  Database,
  Calendar,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ShieldCheck,
  Server,
  Zap,
} from 'lucide-react';

export default function PengaturanPage() {
  const { academicYears, selectedYearId, setSelectedYearId, refreshYears, dbStatus, checkDbConnection } = useApp();

  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({
    fee_tk: '150000',
    fee_sd: '300000',
    fee_smp: '300000',
    fee_sma: '300000',
    apresiasi_guru: '500000',
    apresiasi_wali: '250000',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingDb, setTestingDb] = useState(false);

  // New academic year form
  const [newYear, setNewYear] = useState('');
  const [addingYear, setAddingYear] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success && json.data) {
        setSettingsMap(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsMap),
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYear.trim()) return;
    setAddingYear(true);

    try {
      const res = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newYear.trim(), isActive: true }),
      });
      const json = await res.json();
      if (json.success) {
        setNewYear('');
        await refreshYears();
        setSelectedYearId(json.data.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingYear(false);
    }
  };

  const isConnected = dbStatus.status === 'connected';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Pengaturan Master & Sistem
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Konfigurasi tarif default formulir, nominal apresiasi rekomendasi, tahun ajaran, dan status database.
        </p>
      </div>

      {/* 1. Database Health Check Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">Kontrol Koneksi Database Supabase</h2>
              <p className="text-xs text-slate-500">
                Pemeriksaan koneksi persisten ke cloud database PostgreSQL.
              </p>
            </div>
          </div>

          <button
            onClick={async () => {
              setTestingDb(true);
              await checkDbConnection();
              setTestingDb(false);
            }}
            disabled={testingDb}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
            {testingDb ? 'Menguji...' : 'Test Database Connection'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 font-medium">Status Koneksi:</span>
            <div className="font-bold text-sm mt-0.5 flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className={isConnected ? 'text-emerald-700' : 'text-rose-700'}>
                {isConnected ? 'Terhubung (Online)' : 'Terputus (Offline)'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 font-medium">Waktu Respon Latensi:</span>
            <div className="font-mono font-bold text-sm text-slate-800 mt-0.5">
              {dbStatus.latencyMs > 0 ? `${dbStatus.latencyMs} ms` : '-'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 font-medium">Engine & Schema:</span>
            <div className="font-mono font-bold text-sm text-slate-800 mt-0.5">
              PostgreSQL / ppdb
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 font-medium">Penyimpanan Utama:</span>
            <div className="font-bold text-sm text-emerald-700 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Persisten Supabase
            </div>
          </div>
        </div>
      </div>

      {/* 2. Fee Defaults Configuration */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="pb-3 mb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-slate-900">Tarif Default Formulir & Apresiasi</h2>
            <p className="text-xs text-slate-500">
              Ubah tarif tanpa menyentuh kode program. Nominal aktual per siswa tetap dapat disesuaikan.
            </p>
          </div>
          {saveSuccess && (
            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tersimpan!
            </span>
          )}
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="font-bold text-slate-800 text-xs">A. Tarif Default Pembelian Formulir</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-medium text-slate-600 mb-1">STK / TK IT (Rp)</label>
              <input
                type="number"
                value={settingsMap.fee_tk || '150000'}
                onChange={(e) => setSettingsMap({ ...settingsMap, fee_tk: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">SD IT (Rp)</label>
              <input
                type="number"
                value={settingsMap.fee_sd || '300000'}
                onChange={(e) => setSettingsMap({ ...settingsMap, fee_sd: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">SMP IT (Rp)</label>
              <input
                type="number"
                value={settingsMap.fee_smp || '300000'}
                onChange={(e) => setSettingsMap({ ...settingsMap, fee_smp: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">SMA IT (Rp)</label>
              <input
                type="number"
                value={settingsMap.fee_sma || '300000'}
                onChange={(e) => setSettingsMap({ ...settingsMap, fee_sma: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-800"
                required
              />
            </div>
          </div>

          <div className="font-bold text-slate-800 text-xs pt-2">B. Nominal Default Apresiasi Rekomendasi</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-600 mb-1">
                Guru / Internal / Komponen Pesantren (Rp)
              </label>
              <input
                type="number"
                value={settingsMap.apresiasi_guru || '500000'}
                onChange={(e) => setSettingsMap({ ...settingsMap, apresiasi_guru: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-indigo-700"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">
                Wali Santri / Eksternal (Rp)
              </label>
              <input
                type="number"
                value={settingsMap.apresiasi_wali || '250000'}
                onChange={(e) => setSettingsMap({ ...settingsMap, apresiasi_wali: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-indigo-700"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan Tarif'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Kelola Tahun Ajaran Historis */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h2 className="font-bold text-sm text-slate-900">Kelola Tahun Ajaran Historis</h2>
          <p className="text-xs text-slate-500">
            Setiap tahun ajaran menyimpan database PPDB tersendiri tanpa menimpa data tahun sebelumnya.
          </p>
        </div>

        {/* Add Year Form */}
        <form onSubmit={handleAddYear} className="flex gap-2 max-w-md">
          <input
            type="text"
            placeholder="Tambah tahun baru (contoh: 2027/2028)"
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
          <button
            type="submit"
            disabled={addingYear}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{addingYear ? 'Menambahkan...' : 'Tambah Tahun'}</span>
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {academicYears.map((y) => (
            <div
              key={y.id}
              className={`p-4 rounded-xl border transition ${
                y.id === selectedYearId
                  ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/30'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-base text-slate-900">{y.name}</div>
                {y.isActive && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Aktif
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Total Siswa: <strong>{y._count?.students || 0} Santri</strong>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedYearId(y.id)}
                  className={`text-xs font-semibold ${
                    y.id === selectedYearId
                      ? 'text-emerald-700 cursor-default'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  {y.id === selectedYearId ? '✓ Sedang Dipilih' : 'Pilih Tahun Ini'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
