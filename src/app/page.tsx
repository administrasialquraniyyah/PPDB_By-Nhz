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
  Layers,
  Table as TableIcon,
  ChevronRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { selectedYearId, setSelectedYearId, selectedYearName } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeGelombangTab, setActiveGelombangTab] = useState<string>('ALL');
  const [userRole, setUserRole] = useState<'ADMIN' | 'PANITIA' | 'UNIT' | 'PEWAWANCARA' | null>(null);
  const [jenjangScope, setJenjangScope] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.user) {
          setUserRole(d.user.role);
          setJenjangScope(d.user.jenjangScope);
        }
      })
      .catch(() => {});
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const url = selectedYearId ? `/api/dashboard?academicYearId=${selectedYearId}` : '/api/dashboard';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        if (!selectedYearId && json.data.academicYear?.id) {
          setSelectedYearId(json.data.academicYear.id);
        }
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

  const jenjangGelData = data?.pendaftar?.byJenjangAndGelombang || {
    gelombangList: Object.keys(pendaftar.byGelombang || {}),
    jenjangList: ['TK', 'SD', 'SMP', 'SMA'],
    matrix: {},
    totalsByJenjang: {
      TK: { total: pendaftar.byJenjang.TK || 0, L: 0, P: 0 },
      SD: { total: pendaftar.byJenjang.SD || 0, L: 0, P: 0 },
      SMP: { total: pendaftar.byJenjang.SMP || 0, L: 0, P: 0 },
      SMA: { total: pendaftar.byJenjang.SMA || 0, L: 0, P: 0 },
    },
    grandTotal: pendaftar.total || 0,
    totalL: pendaftar.byGender.L || 0,
    totalP: pendaftar.byGender.P || 0,
  };

  const gelombangList: string[] = jenjangGelData.gelombangList && jenjangGelData.gelombangList.length > 0
    ? jenjangGelData.gelombangList
    : Object.keys(pendaftar.byGelombang || {});

  const currentTabMatrix = activeGelombangTab === 'ALL'
    ? null
    : jenjangGelData.matrix?.[activeGelombangTab];

  const currentWaveTotal = activeGelombangTab === 'ALL'
    ? pendaftar.total
    : (currentTabMatrix?.total || pendaftar.byGelombang?.[activeGelombangTab] || 0);

  const currentWaveL = activeGelombangTab === 'ALL'
    ? pendaftar.byGender.L
    : (currentTabMatrix?.L || 0);

  const currentWaveP = activeGelombangTab === 'ALL'
    ? pendaftar.byGender.P
    : (currentTabMatrix?.P || 0);

  const getJenjangCount = (jKey: string) => {
    if (activeGelombangTab === 'ALL') {
      return jenjangGelData.totalsByJenjang?.[jKey]?.total ?? (pendaftar.byJenjang as any)?.[jKey] ?? 0;
    }
    return currentTabMatrix?.[jKey]?.total ?? 0;
  };

  const getJenjangGender = (jKey: string) => {
    if (activeGelombangTab === 'ALL') {
      return {
        L: jenjangGelData.totalsByJenjang?.[jKey]?.L ?? 0,
        P: jenjangGelData.totalsByJenjang?.[jKey]?.P ?? 0,
      };
    }
    return {
      L: currentTabMatrix?.[jKey]?.L ?? 0,
      P: currentTabMatrix?.[jKey]?.P ?? 0,
    };
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
    <div className="space-y-5 sm:space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              {userRole === 'UNIT' && jenjangScope
                ? `Dashboard PPDB Unit ${jenjangScope}`
                : 'Dashboard PPDB & Keuangan'}
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {selectedYearName}
            </span>
            {userRole === 'UNIT' && jenjangScope && (
              <span className="bg-teal-100 text-teal-800 border border-teal-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                Akses Khusus Unit {jenjangScope}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {userRole === 'UNIT' && jenjangScope
              ? `Ringkasan data pendaftar, gelombang, dan rekomendasi khusus santri Unit ${jenjangScope}.`
              : 'Ringkasan data pendaftar, rekomendasi, rekening bank, daftar ulang, dan arus kas yayasan.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {userRole === 'ADMIN' && pendaftar.draftCount > 0 && (
            <Link
              href="/draft"
              className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition"
            >
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{pendaftar.draftCount} Draft Butuh Verifikasi</span>
            </Link>
          )}

          <Link
            href="/import"
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <FileUp className="w-4 h-4 shrink-0" />
            <span>Import Data Baru</span>
          </Link>
        </div>
      </div>

      {/* 1. Main Stats Cards (Mobile Responsive) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Pendaftar */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                Total Pendaftar
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xl sm:text-3xl font-extrabold text-slate-900">
                {pendaftar.total}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Santri Baru</span>
            </div>
          </div>
          <div className="mt-3 text-[10px] sm:text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 pt-2">
            <span>L: <strong className="text-slate-700">{pendaftar.byGender.L}</strong></span>
            <span>P: <strong className="text-slate-700">{pendaftar.byGender.P}</strong></span>
          </div>
        </div>

        {/* Daftar Ulang */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                Daftar Ulang
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xl sm:text-3xl font-extrabold text-emerald-700">
                {daftarUlang.sudah}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                / {pendaftar.total} ({pendaftar.total > 0 ? Math.round((daftarUlang.sudah / pendaftar.total) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="mt-3 text-[10px] sm:text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 pt-2">
            <span className="text-amber-600 font-medium">Belum: {daftarUlang.belum}</span>
            {daftarUlang.batal > 0 && <span className="text-rose-500 font-medium">Batal: {daftarUlang.batal}</span>}
          </div>
        </div>

        {/* Pembuatan Rekening */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                Rekening (BSI)
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xl sm:text-3xl font-extrabold text-purple-700">
                {rekening.sudah}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Sudah Jadi</span>
            </div>
          </div>
          <div className="mt-3 text-[10px] sm:text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 pt-2">
            <span className="text-amber-600">Belum: {rekening.belum}</span>
            {userRole === 'ADMIN' ? (
              <Link href="/rekening" className="text-purple-600 hover:underline font-semibold">
                Export →
              </Link>
            ) : (
              <span className="text-slate-400">Unit Terkait</span>
            )}
          </div>
        </div>

        {/* Saldo Bersih */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-3.5 sm:p-5 rounded-2xl border border-slate-700 shadow-xs text-white relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider truncate">
                Saldo PPDB
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-white/10 text-emerald-400 shrink-0">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-base sm:text-2xl font-black text-emerald-400 tracking-tight truncate">
                {formatCurrency(keuangan.saldo)}
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-300 mt-1 truncate">
                Masuk: {formatCurrency(keuangan.totalPemasukan)}
              </div>
            </div>
          </div>
          <div className="mt-3 text-[10px] sm:text-[11px] text-slate-400 border-t border-white/10 pt-2 flex justify-between items-center">
            <span className="truncate">Keluar: {formatCurrency(keuangan.totalPengeluaran)}</span>
            {userRole === 'ADMIN' ? (
              <Link href="/keuangan" className="text-emerald-400 hover:underline font-medium shrink-0 ml-1">
                Rincian →
              </Link>
            ) : (
              <span className="text-slate-400 text-[10px]">Data Unit</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Komposisi Jenjang per Gelombang (Parameter Cross-Breakdown) & Rekomendasi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Matriks & Breakdown Jenjang x Gelombang (Spans 2 columns on desktop) */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                  Komposisi Jenjang per Gelombang
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  Rincian jumlah siswa dan rasio gender per jenjang dengan filter gelombang.
                </p>
              </div>
            </div>

            {/* Gelombang Tabs Switcher */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 max-w-full">
              <button
                onClick={() => setActiveGelombangTab('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeGelombangTab === 'ALL'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Semua ({pendaftar.total})
              </button>
              {gelombangList.map((gel) => {
                const count = jenjangGelData.matrix?.[gel]?.total ?? pendaftar.byGelombang?.[gel] ?? 0;
                return (
                  <button
                    key={gel}
                    onClick={() => setActiveGelombangTab(gel)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      activeGelombangTab === gel
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {gel} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Summary Pill for Selected Tab */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Tampilan Saat Ini: </span>
              <strong className="text-slate-900">
                {activeGelombangTab === 'ALL' ? 'Total Seluruh Gelombang' : activeGelombangTab}
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{currentWaveTotal} Santri</span>
              <span className="text-[11px] text-slate-400">
                (L: <strong className="text-blue-600">{currentWaveL}</strong> • P: <strong className="text-rose-600">{currentWaveP}</strong>)
              </span>
            </div>
          </div>

          {/* Jenjang Progress Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'STK / TK IT', key: 'TK', color: 'bg-amber-500', barBg: 'bg-amber-100' },
              { label: 'SD IT', key: 'SD', color: 'bg-blue-500', barBg: 'bg-blue-100' },
              { label: 'SMP IT', key: 'SMP', color: 'bg-emerald-500', barBg: 'bg-emerald-100' },
              { label: 'SMA IT', key: 'SMA', color: 'bg-indigo-500', barBg: 'bg-indigo-100' },
            ].map((j) => {
              const count = getJenjangCount(j.key);
              const { L, P } = getJenjangGender(j.key);
              const pct = currentWaveTotal > 0 ? Math.round((count / currentWaveTotal) * 100) : 0;
              return (
                <div key={j.key} className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="flex justify-between items-baseline text-xs font-semibold mb-1">
                    <span className="text-slate-800">{j.label}</span>
                    <span className="text-slate-900 font-bold">
                      {count} santri <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden my-2">
                    <div
                      className={`${j.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>Laki-laki: <strong className="text-blue-700">{L}</strong></span>
                    <span>Perempuan: <strong className="text-rose-700">{P}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cross Matrix Table (Tabel Silang Jenjang x Gelombang) */}
          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
              <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tabel Silang Parameter (Jenjang × Gelombang)</span>
            </div>
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-left text-xs border-collapse border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Jenjang</th>
                    {gelombangList.map((g) => (
                      <th key={g} className="py-2.5 px-3 text-center whitespace-nowrap">
                        {g}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center bg-emerald-50/50 text-emerald-900 font-extrabold">
                      Total
                    </th>
                    <th className="py-2.5 px-3 text-center">Rasio (L / P)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {[
                    { label: 'STK / TK IT', key: 'TK' },
                    { label: 'SD IT', key: 'SD' },
                    { label: 'SMP IT', key: 'SMP' },
                    { label: 'SMA IT', key: 'SMA' },
                  ].map((j) => {
                    const totalJenjang = jenjangGelData.totalsByJenjang?.[j.key]?.total ?? 0;
                    const lCount = jenjangGelData.totalsByJenjang?.[j.key]?.L ?? 0;
                    const pCount = jenjangGelData.totalsByJenjang?.[j.key]?.P ?? 0;

                    return (
                      <tr key={j.key} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-800">{j.label}</td>
                        {gelombangList.map((g) => {
                          const count = jenjangGelData.matrix?.[g]?.[j.key]?.total ?? 0;
                          return (
                            <td key={g} className="py-2 px-3 text-center font-semibold text-slate-700">
                              {count > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                                  {count}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center font-bold text-emerald-800 bg-emerald-50/30">
                          {totalJenjang}
                        </td>
                        <td className="py-2 px-3 text-center text-[11px] text-slate-600">
                          <span className="text-blue-600 font-bold">{lCount} L</span>
                          {' • '}
                          <span className="text-rose-600 font-bold">{pCount} P</span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total Row */}
                  <tr className="bg-slate-100/80 font-bold text-slate-900 border-t-2 border-slate-200">
                    <td className="py-2.5 px-3 uppercase text-[11px] tracking-wider">TOTAL</td>
                    {gelombangList.map((g) => {
                      const totalG = jenjangGelData.matrix?.[g]?.total ?? pendaftar.byGelombang?.[g] ?? 0;
                      return (
                        <td key={g} className="py-2.5 px-3 text-center text-teal-800">
                          {totalG}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-center text-emerald-800 bg-emerald-100 font-black text-sm">
                      {pendaftar.total}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[11px] text-slate-700">
                      <span className="text-blue-700 font-extrabold">{pendaftar.byGender.L} L</span>
                      {' • '}
                      <span className="text-rose-700 font-extrabold">{pendaftar.byGender.P} P</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Rekomendasi & Apresiasi Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">Rekomendasi</h2>
                  <p className="text-[11px] text-slate-400">Komitmen & Apresiasi</p>
                </div>
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

          <div className="pt-4 border-t border-slate-100 mt-4">
            <Link
              href="/rekomendasi"
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold text-center block transition"
            >
              Kelola Pembayaran Rekomendasi →
            </Link>
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
          {userRole === 'ADMIN' ? (
            <Link
              href="/keuangan"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 self-start sm:self-auto"
            >
              Buka Modul Keuangan →
            </Link>
          ) : (
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
              Ringkasan Unit {jenjangScope}
            </span>
          )}
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
