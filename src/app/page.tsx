'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/formatters';
import Link from 'next/link';
import {
  Users,
  GraduationCap,
  Award,
  CreditCard,
  UserCheck,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  FileUp,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardPage() {
  const { selectedYearId, selectedYearName } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?academicYearId=${selectedYearId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedYearId]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Memuat statistik PPDB {selectedYearName}...</p>
      </div>
    );
  }

  const pendaftar = data?.pendaftar || {
    total: 0,
    draftCount: 0,
    byJenjang: { TK: 0, SD: 0, SMP: 0, SMA: 0 },
    byGender: { L: 0, P: 0 },
    byGelombang: {},
  };

  const rekomendasi = data?.rekomendasi || {
    total: 0,
    guru: 0,
    wali: 0,
    alumni: 0,
    totalApresiasi: 0,
    apresiasiLunas: 0,
    apresiasiBelum: 0,
  };

  const rekening = data?.rekening || { sudah: 0, belum: 0 };
  const daftarUlang = data?.daftarUlang || { sudah: 0, belum: 0, batal: 0, totalNominalDU: 0 };
  const keuangan = data?.keuangan || {
    totalPemasukan: 0,
    pemasukanFormulir: 0,
    pemasukanDaftarUlang: 0,
    totalPengeluaran: 0,
    totalApresiasiPaid: 0,
    totalExpenseYayasan: 0,
    saldo: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard PPDB & Keuangan
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {selectedYearName}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ringkasan data pendaftar, rekomendasi, rekening bank, daftar ulang, dan arus kas yayasan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendaftar.draftCount > 0 && (
            <Link
              href="/draft"
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition"
            >
              <Clock className="w-4 h-4 text-amber-600" />
              <span>{pendaftar.draftCount} Draft Butuh Verifikasi</span>
            </Link>
          )}

          <Link
            href="/import"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <FileUp className="w-4 h-4" />
            <span>Import Data Baru</span>
          </Link>
        </div>
      </div>

      {/* 1. Main Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Pendaftar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Pendaftar
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {pendaftar.total}
            </span>
            <span className="text-xs text-slate-400 font-medium">Santri Baru</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Laki-laki: {pendaftar.byGender.L}</span>
            <span>Perempuan: {pendaftar.byGender.P}</span>
          </div>
        </div>

        {/* Daftar Ulang */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Daftar Ulang
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {daftarUlang.sudah}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              / {pendaftar.total} ({pendaftar.total > 0 ? Math.round((daftarUlang.sudah / pendaftar.total) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="text-amber-600 font-medium">Belum: {daftarUlang.belum}</span>
            {daftarUlang.batal > 0 && <span className="text-rose-500 font-medium">Batal: {daftarUlang.batal}</span>}
          </div>
        </div>

        {/* Pembuatan Rekening */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Rekening Bank (BSI)
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-700">
              {rekening.sudah}
            </span>
            <span className="text-xs text-slate-400 font-medium">Sudah Jadi</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="text-amber-600">Belum: {rekening.belum}</span>
            <Link href="/rekening" className="text-purple-600 hover:underline font-medium">
              Export CBS →
            </Link>
          </div>
        </div>

        {/* Saldo Bersih */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-700 shadow-md text-white relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Saldo PPDB
            </span>
            <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
              {formatCurrency(keuangan.saldo)}
            </div>
            <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between">
              <span>Masuk: {formatCurrency(keuangan.totalPemasukan)}</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 border-t border-white/10 pt-2 flex justify-between">
            <span>Keluar: {formatCurrency(keuangan.totalPengeluaran)}</span>
            <Link href="/keuangan" className="text-emerald-400 hover:underline font-medium">
              Rincian →
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Pendaftar Breakdown per Jenjang & Gelombang */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Breakdown Jenjang */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 text-sm">Pendaftar per Jenjang</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">{pendaftar.total} Santri</span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'STK / TK IT', key: 'TK', color: 'bg-amber-500', count: pendaftar.byJenjang.TK },
              { label: 'SD IT', key: 'SD', color: 'bg-blue-500', count: pendaftar.byJenjang.SD },
              { label: 'SMP IT', key: 'SMP', color: 'bg-emerald-500', count: pendaftar.byJenjang.SMP },
              { label: 'SMA IT', key: 'SMA', color: 'bg-indigo-500', count: pendaftar.byJenjang.SMA },
            ].map((j) => {
              const pct = pendaftar.total > 0 ? Math.round((j.count / pendaftar.total) * 100) : 0;
              return (
                <div key={j.key}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">{j.label}</span>
                    <span className="text-slate-900">
                      {j.count} santri ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${j.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown Gelombang */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-slate-900 text-sm">Pendaftar per Gelombang</h2>
            </div>
          </div>

          <div className="space-y-3">
            {Object.keys(pendaftar.byGelombang).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Belum ada data gelombang.</p>
            ) : (
              Object.entries(pendaftar.byGelombang).map(([gel, count]: [string, any]) => {
                const pct = pendaftar.total > 0 ? Math.round((count / pendaftar.total) * 100) : 0;
                return (
                  <div key={gel}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700">{gel}</span>
                      <span className="text-slate-900">
                        {count} santri ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Rekomendasi & Apresiasi Quick Box */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-slate-900 text-sm">Rekomendasi</h2>
            </div>
            <Link href="/rekomendasi" className="text-xs text-indigo-600 hover:underline font-semibold">
              Detail →
            </Link>
          </div>

          <div className="bg-indigo-50/60 rounded-xl p-3 mb-3 border border-indigo-100/70">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-indigo-900 font-semibold">Total Rekomendasi:</span>
              <span className="text-lg font-black text-indigo-700">{rekomendasi.total} Siswa</span>
            </div>
            <div className="text-[11px] text-indigo-600 mt-1 flex justify-between">
              <span>Guru/Internal: {rekomendasi.guru}</span>
              <span>Wali Santri: {rekomendasi.wali}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Total Komitmen Apresiasi:</span>
              <span className="font-bold text-slate-800">{formatCurrency(rekomendasi.totalApresiasi)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Sudah Dibayar (Lunas):</span>
              <span className="font-bold text-emerald-600">{formatCurrency(rekomendasi.apresiasiLunas)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Belum Dibayar:</span>
              <span className="font-bold text-amber-600">{formatCurrency(rekomendasi.apresiasiBelum)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Financial Breakdown (Yayasan Meeting Ready) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Rekapitulasi Keuangan PPDB</h2>
            <p className="text-xs text-slate-500">
              Data aktual dari pembelian formulir, daftar ulang, apresiasi rekomendasi, & pengeluaran yayasan.
            </p>
          </div>
          <Link
            href="/keuangan"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 self-start sm:self-auto"
          >
            Buka Modul Keuangan →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-xs text-slate-500 font-medium">Pemasukan Formulir</span>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {formatCurrency(keuangan.pemasukanFormulir)}
            </div>
            <span className="text-[10px] text-slate-400">
              Potongan Diskon: {formatCurrency(keuangan.totalFormDiskon)}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-xs text-slate-500 font-medium">Pemasukan Daftar Ulang</span>
            <div className="text-lg font-bold text-emerald-700 mt-1">
              {formatCurrency(keuangan.pemasukanDaftarUlang)}
            </div>
            <span className="text-[10px] text-slate-400">
              Dari {daftarUlang.sudah} santri yang sudah DU
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-xs text-slate-500 font-medium">Apresiasi Rekomendasi</span>
            <div className="text-lg font-bold text-rose-600 mt-1">
              {formatCurrency(keuangan.totalApresiasiPaid)}
            </div>
            <span className="text-[10px] text-slate-400">
              Sisa belum dibayar: {formatCurrency(rekomendasi.apresiasiBelum)}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-xs text-slate-500 font-medium">Pengeluaran Yayasan/Operasional</span>
            <div className="text-lg font-bold text-rose-700 mt-1">
              {formatCurrency(keuangan.totalExpenseYayasan + keuangan.totalExpenseOperasional)}
            </div>
            <span className="text-[10px] text-slate-400">
              Yayasan: {formatCurrency(keuangan.totalExpenseYayasan)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Recent Student Registrations */}
      {data?.recentStudents && data.recentStudents.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 text-sm">Pendaftar Terakhir Masuk</h2>
            <Link href="/siswa" className="text-xs font-semibold text-emerald-600 hover:underline">
              Lihat Semua Siswa →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {data.recentStudents.map((s: any) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-800">{s.namaLengkap}</div>
                  <div className="text-slate-400 text-[11px]">
                    {s.jenjang} • {s.gelombang}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      s.statusDaftarUlang === 'Sudah'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    DU: {s.statusDaftarUlang}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium hidden sm:inline ${
                      s.statusRekening === 'Sudah dibuat'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Rek: {s.statusRekening === 'Sudah dibuat' ? 'Sudah' : 'Belum'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
