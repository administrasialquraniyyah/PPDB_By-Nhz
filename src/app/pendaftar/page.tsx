'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  ClipboardList,
  Search,
  Filter,
  RefreshCw,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Phone,
  School,
  FileSpreadsheet,
  Plus,
  Play,
  RotateCcw,
  Eye,
  Edit2,
  Calendar,
  XCircle,
  ExternalLink,
  Video,
} from 'lucide-react';

interface Applicant {
  id: string;
  academicYearId: string;
  noPendaftaran: string | null;
  namaLengkap: string;
  jenjang: string;
  gelombang: string;
  nik: string | null;
  nisn: string | null;
  jenisKelamin: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  email: string | null;
  noHp: string | null;
  alamat: string | null;
  asalSekolah: string | null;
  namaAyah: string | null;
  noHpAyah: string | null;
  namaIbu: string | null;
  noHpIbu: string | null;
  namaWali: string | null;
  noHpWali: string | null;
  statusPendaftaran: 'TERDAFTAR' | 'MENUNGGU_TES' | 'MENGIKUTI_TES' | 'LULUS' | 'TIDAK_LULUS' | 'DIBATALKAN';
  alasanPembatalan: string | null;
  batalAt: string | null;
  batalBy: string | null;
  sudahBeliFormulir: boolean;
  nominalFormulir: number;
  statusBayarFormulir: 'BELUM_BAYAR' | 'LUNAS_CASH' | 'LUNAS_TRANSFER';
  metodePembayaran: string | null;
  tanggalBayarFormulir?: string | null;
  nomorReferensiTransfer?: string | null;
  catatanPembayaran?: string | null;
  studentId: string | null;
  student?: {
    id: string;
    noInduk: string | null;
    status: string;
  } | null;
  interviews?: any[];
  createdAt: string;
}

export default function DataPendaftarPage() {
  const { selectedYearId, selectedYearName } = useApp();

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [jenjangFilter, setJenjangFilter] = useState('ALL');
  const [gelombangFilter, setGelombangFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');

  // Modals state
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Cancel Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBy, setCancelBy] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'BELUM_BAYAR' | 'LUNAS_CASH' | 'LUNAS_TRANSFER'>('BELUM_BAYAR');
  const [paymentAmount, setPaymentAmount] = useState(300000);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Action status notification
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchApplicants = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('academicYearId', selectedYearId);
      if (jenjangFilter !== 'ALL') params.append('jenjang', jenjangFilter);
      if (gelombangFilter !== 'ALL') params.append('gelombang', gelombangFilter);
      if (genderFilter !== 'ALL') params.append('jenisKelamin', genderFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/applicants?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setApplicants(json.data);
      }
    } catch (e) {
      console.error('Error fetching applicants:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [selectedYearId, jenjangFilter, gelombangFilter, genderFilter, search]);

  // Open Detail Modal
  const handleOpenDetail = (app: Applicant) => {
    setSelectedApplicant(app);
    setIsDetailModalOpen(true);
  };

  // Open Cancel Modal
  const handleOpenCancelModal = (app: Applicant) => {
    setSelectedApplicant(app);
    setCancelReason('');
    setCancelBy('Petugas PPDB');
    setIsCancelModalOpen(true);
  };

  // Submit Cancel Registration
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant) return;
    if (!cancelReason.trim()) {
      alert('Alasan pembatalan pendaftaran wajib diisi.');
      return;
    }

    setCancelLoading(true);
    try {
      const res = await fetch(`/api/applicants/${selectedApplicant.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alasanPembatalan: cancelReason.trim(),
          batalBy: cancelBy.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionNotice({
          type: 'success',
          message: `Pendaftaran ${selectedApplicant.namaLengkap} berhasil dibatalkan.`,
        });
        setIsCancelModalOpen(false);
        await fetchApplicants();
      } else {
        alert(json.error || 'Gagal membatalkan pendaftaran');
      }
    } catch (err: any) {
      console.error(err);
      alert('Terjadi kesalahan koneksi');
    } finally {
      setCancelLoading(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Reactivate Cancelled Applicant
  const handleReactivate = async (app: Applicant) => {
    if (!confirm(`Aktifkan kembali pendaftaran untuk ${app.namaLengkap}?`)) return;

    try {
      const res = await fetch(`/api/applicants/${app.id}/cancel`, {
        method: 'PUT',
      });
      const json = await res.json();
      if (json.success) {
        setActionNotice({
          type: 'success',
          message: `Status pendaftaran ${app.namaLengkap} berhasil diaktifkan kembali.`,
        });
        await fetchApplicants();
      } else {
        alert(json.error || 'Gagal mengaktifkan pendaftar');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi');
    } finally {
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Open Payment Update Modal
  const handleOpenPaymentModal = (app: Applicant) => {
    setSelectedApplicant(app);
    setPaymentStatus(app.statusBayarFormulir || 'BELUM_BAYAR');
    setPaymentAmount(app.nominalFormulir || (app.jenjang?.toUpperCase() === 'TK' ? 150000 : 300000));
    setPaymentDate(app.tanggalBayarFormulir ? new Date(app.tanggalBayarFormulir).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setPaymentRef(app.nomorReferensiTransfer || '');
    setPaymentNotes(app.catatanPembayaran || '');
    setIsPaymentModalOpen(true);
  };

  // Submit Payment Update
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant) return;
    setPaymentLoading(true);

    try {
      const res = await fetch(`/api/applicants/${selectedApplicant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusBayarFormulir: paymentStatus,
          nominalFormulir: paymentAmount,
          metodePembayaran: paymentStatus === 'LUNAS_CASH' ? 'Cash' : paymentStatus === 'LUNAS_TRANSFER' ? 'Transfer' : null,
          tanggalBayarFormulir: paymentStatus !== 'BELUM_BAYAR' ? paymentDate : null,
          nomorReferensiTransfer: paymentRef.trim(),
          catatanPembayaran: paymentNotes.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionNotice({
          type: 'success',
          message: `Status pembayaran formulir ${selectedApplicant.namaLengkap} berhasil diperbarui!`,
        });
        setIsPaymentModalOpen(false);
        await fetchApplicants();
      } else {
        alert(json.error || 'Gagal menyimpan status pembayaran');
      }
    } catch (err: any) {
      console.error(err);
      alert('Terjadi kesalahan koneksi');
    } finally {
      setPaymentLoading(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Promote Applicant to Student
  const handlePromoteToStudent = async (app: Applicant) => {
    if (!confirm(`Proses ${app.namaLengkap} menjadi Data Siswa resmi?`)) return;

    try {
      const res = await fetch(`/api/applicants/${app.id}/promote`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setActionNotice({
          type: 'success',
          message: json.message || `Berhasil memasukkan ${app.namaLengkap} ke Data Siswa!`,
        });
        await fetchApplicants();
      } else {
        alert(json.error || 'Gagal memproses ke Data Siswa');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat memproses data');
    } finally {
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Metric counts
  const countTotalAktif = applicants.filter((a) => !a.studentId && a.statusPendaftaran !== 'DIBATALKAN').length;
  const countTerdaftar = applicants.filter((a) => !a.studentId && a.statusPendaftaran === 'TERDAFTAR').length;
  const countTes = applicants.filter((a) => !a.studentId && (a.statusPendaftaran === 'MENUNGGU_TES' || a.statusPendaftaran === 'MENGIKUTI_TES')).length;
  const countLulus = applicants.filter((a) => !a.studentId && a.statusPendaftaran === 'LULUS').length;
  const countBatal = applicants.filter((a) => a.statusPendaftaran === 'DIBATALKAN').length;
  const countSudahSiswa = applicants.filter((a) => Boolean(a.studentId)).length;

  // Filter displayed applicants (hides promoted students by default)
  const displayedApplicants = applicants.filter((app) => {
    if (statusFilter === 'SUDAH_SISWA') {
      return Boolean(app.studentId);
    }
    // By default, hide applicants who have already become official students!
    if (app.studentId) {
      return false;
    }
    if (statusFilter !== 'ALL' && app.statusPendaftaran !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 w-full">
      {/* Top Banner Alert Notice */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-700 px-1">
            ✕
          </button>
        </div>
      )}

      {/* Header & Metrics Strip */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Data Pendaftar PPDB
              </h1>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                T.P. {selectedYearName || '2026/2027'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pusat data calon santri terdaftar, status alur seleksi, pembatalan pendaftaran, dan promosi kelulusan.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/import"
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import Data PPDB</span>
          </Link>
          <button
            onClick={fetchApplicants}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pendaftar Aktif</span>
          <div className="font-extrabold text-base sm:text-lg text-slate-900 mt-0.5">{countTotalAktif} Santri</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-blue-200/60 bg-blue-50/20 shadow-xs">
          <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">Terdaftar Baru</span>
          <div className="font-extrabold text-base sm:text-lg text-blue-800 mt-0.5">{countTerdaftar} Santri</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-amber-200/60 bg-amber-50/20 shadow-xs">
          <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">Antrean / Sesi Tes</span>
          <div className="font-extrabold text-base sm:text-lg text-amber-800 mt-0.5">{countTes} Santri</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-emerald-200/60 bg-emerald-50/20 shadow-xs">
          <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Dinyatakan Lulus</span>
          <div className="font-extrabold text-base sm:text-lg text-emerald-800 mt-0.5">{countLulus} Santri</div>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'SUDAH_SISWA' ? 'ALL' : 'SUDAH_SISWA')}
          className={`p-3 rounded-xl border shadow-xs cursor-pointer transition ${
            statusFilter === 'SUDAH_SISWA'
              ? 'bg-teal-700 border-teal-800 text-white shadow-md ring-2 ring-teal-500'
              : 'bg-teal-50/40 border-teal-200 hover:bg-teal-50 text-slate-900'
          }`}
          title="Klik untuk melihat pendaftar yang sudah resmi masuk ke Data Siswa"
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${statusFilter === 'SUDAH_SISWA' ? 'text-teal-100' : 'text-teal-700'}`}>
            Resmi Jadi Siswa
          </span>
          <div className={`font-extrabold text-base sm:text-lg mt-0.5 ${statusFilter === 'SUDAH_SISWA' ? 'text-white' : 'text-teal-900'}`}>
            {countSudahSiswa} Santri
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 bg-slate-50/50 shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Dibatalkan</span>
          <div className="font-extrabold text-base sm:text-lg text-slate-700 mt-0.5">{countBatal} Santri</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama calon santri, No. Pendaftaran, No. HP, atau asal sekolah..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Pendaftar Aktif</option>
            <option value="TERDAFTAR">Terdaftar Baru</option>
            <option value="MENUNGGU_TES">Menunggu Tes</option>
            <option value="MENGIKUTI_TES">Mengikuti Tes</option>
            <option value="LULUS">Lulus (Siap Masuk Siswa)</option>
            <option value="TIDAK_LULUS">Tidak Lulus</option>
            <option value="DIBATALKAN">Dibatalkan / Mundur</option>
            <option value="SUDAH_SISWA">Sudah Masuk Data Siswa ({countSudahSiswa})</option>
          </select>

          <select
            value={jenjangFilter}
            onChange={(e) => setJenjangFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Jenjang</option>
            <option value="TK">TK IT</option>
            <option value="SD">SD IT</option>
            <option value="SMP">SMP IT</option>
            <option value="SMA">SMA IT</option>
          </select>

          <select
            value={gelombangFilter}
            onChange={(e) => setGelombangFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Gelombang</option>
            <option value="Gelombang 1">Gelombang 1</option>
            <option value="Gelombang 2">Gelombang 2</option>
          </select>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Gender</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </select>
        </div>
      </div>

      {/* Main Full-Width Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-4 min-w-[200px]">Calon Santri Pendaftar</th>
                <th className="py-2.5 px-3 w-28">Jenjang</th>
                <th className="py-2.5 px-4 min-w-[170px]">Kontak & Asal</th>
                <th className="py-2.5 px-4 min-w-[160px]">Status Formulir</th>
                <th className="py-2.5 px-3 w-36">Status Pendaftaran</th>
                <th className="py-2.5 px-4 min-w-[190px] text-center">Aksi Pengelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Memuat data pendaftar...
                  </td>
                </tr>
              ) : displayedApplicants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Belum ada calon santri pendaftar untuk filter ini.
                  </td>
                </tr>
              ) : (
                displayedApplicants.map((app, idx) => {
                  const isCancelled = app.statusPendaftaran === 'DIBATALKAN';
                  const isPassed = app.statusPendaftaran === 'LULUS';
                  const hasStudent = Boolean(app.studentId);

                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCancelled ? 'bg-slate-50/60 opacity-80' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm leading-snug">{app.namaLengkap}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 font-mono">
                          <span className="bg-slate-100 px-1 rounded text-[10px] text-slate-700">
                            {app.noPendaftaran || '-'}
                          </span>
                          <span>•</span>
                          <span className="font-sans">{app.jenisKelamin === 'L' ? 'L' : 'P'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 font-bold rounded text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                          {app.jenjang}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{app.gelombang}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{app.noHp || '-'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[160px] mt-0.5">
                          {app.asalSekolah || 'Asal Sekolah -'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="text-emerald-700 font-bold">Sudah Membeli</span>
                            <span className="text-slate-400">•</span>
                            <span className="font-mono text-slate-700 font-semibold">
                              {formatCurrency(app.nominalFormulir)}
                            </span>
                          </div>
                          <div>
                            {app.statusBayarFormulir === 'LUNAS_CASH' && (
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(app)}
                                className="text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded transition cursor-pointer flex items-center gap-1"
                                title="Klik untuk ubah status pembayaran"
                              >
                                <span>Lunas (Cash)</span>
                                <Edit2 className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            )}
                            {app.statusBayarFormulir === 'LUNAS_TRANSFER' && (
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(app)}
                                className="text-[10px] font-bold text-blue-800 bg-blue-100 hover:bg-blue-200 px-1.5 py-0.5 rounded transition cursor-pointer flex items-center gap-1"
                                title="Klik untuk ubah status pembayaran"
                              >
                                <span>Lunas (Transfer)</span>
                                <Edit2 className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            )}
                            {app.statusBayarFormulir === 'BELUM_BAYAR' && (
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(app)}
                                className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded transition cursor-pointer flex items-center gap-1"
                                title="Klik untuk catat pembayaran formulir"
                              >
                                <span>Belum Dibayar</span>
                                <Edit2 className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {app.statusPendaftaran === 'TERDAFTAR' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Terdaftar
                          </span>
                        )}
                        {app.statusPendaftaran === 'MENUNGGU_TES' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Menunggu Tes
                          </span>
                        )}
                        {app.statusPendaftaran === 'MENGIKUTI_TES' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                            Sedang Tes
                          </span>
                        )}
                        {app.statusPendaftaran === 'LULUS' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Lulus
                          </span>
                        )}
                        {app.statusPendaftaran === 'TIDAK_LULUS' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Tidak Lulus
                          </span>
                        )}
                        {app.statusPendaftaran === 'DIBATALKAN' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700 border border-slate-300">
                            Dibatalkan
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Detail Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(app)}
                            className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                            title="Lihat Detail Pendaftar"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Ruang Wawancara Link */}
                          {!isCancelled && (
                            <Link
                              href={`/wawancara/${app.id}`}
                              className="p-1 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 rounded-lg transition"
                              title="Buka Ruang Wawancara"
                            >
                              <Video className="w-3.5 h-3.5" />
                            </Link>
                          )}

                          {/* Cancellation Button / Reactivation Button */}
                          {!isCancelled ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCancelModal(app)}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                              title="Batalkan Pendaftaran"
                            >
                              Batalkan
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReactivate(app)}
                              className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                              title="Aktifkan Kembali Pendaftar"
                            >
                              Aktifkan
                            </button>
                          )}

                          {/* Promotion / Student link */}
                          {isPassed && !hasStudent && (
                            <button
                              type="button"
                              onClick={() => handlePromoteToStudent(app)}
                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition"
                              title="Masukkan ke Data Siswa"
                            >
                              Proses ke Siswa
                            </button>
                          )}
                          {hasStudent && (
                            <Link
                              href="/siswa"
                              className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition"
                              title="Buka di Menu Data Siswa"
                            >
                              Data Siswa ✓
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Update Pembayaran Formulir */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Status Pembayaran Formulir: ${selectedApplicant?.namaLengkap || ''}`}
      >
        <form onSubmit={handleSavePayment} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Status Pembayaran Formulir:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentStatus('BELUM_BAYAR')}
                className={`p-2.5 rounded-xl border text-center font-bold transition ${
                  paymentStatus === 'BELUM_BAYAR'
                    ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Belum Bayar
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('LUNAS_CASH')}
                className={`p-2.5 rounded-xl border text-center font-bold transition ${
                  paymentStatus === 'LUNAS_CASH'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Lunas (Cash)
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('LUNAS_TRANSFER')}
                className={`p-2.5 rounded-xl border text-center font-bold transition ${
                  paymentStatus === 'LUNAS_TRANSFER'
                    ? 'bg-blue-100 border-blue-400 text-blue-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Lunas (Transfer)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Nominal Formulir (Rp):</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-emerald-800 text-xs"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">Tanggal Pembayaran:</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
          </div>

          {paymentStatus === 'LUNAS_TRANSFER' && (
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Nomor Referensi Transfer / Bank Pengirim:
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Contoh: TRF-BSI-948293 / Bank Mandiri an. Ahmad"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs font-mono"
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-800 mb-1">Catatan Kasir / Pembayaran:</label>
            <textarea
              rows={2}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Catatan kwitansi, nama penyetor, dll."
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={paymentLoading}
              className="px-4 py-1.5 font-bold bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 disabled:opacity-60 transition flex items-center gap-1.5"
            >
              {paymentLoading ? 'Menyimpan...' : 'Simpan Pembayaran'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Batalkan Pendaftaran */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={`Batalkan Pendaftaran: ${selectedApplicant?.namaLengkap || ''}`}
      >
        <form onSubmit={handleConfirmCancel} className="space-y-3.5 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Konfirmasi Pengunduran Diri / Pembatalan</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Pembatalan pendaftaran menandai status calon santri menjadi <b>Dibatalkan</b>. Data pendaftar dan riwayat
              keuangan <b>tidak akan dihapus</b> dari sistem. Uang formulir yang telah dibayar tetap tercatat sesuai transaksi kas.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Alasan Pembatalan / Pengunduran Diri <span className="text-rose-600">*</span>:
            </label>
            <textarea
              required
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Contoh: Mengundurkan diri karena pindah domisili / diterima di sekolah negeri / alasan keluarga..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Petugas Pencatat:</label>
            <input
              type="text"
              value={cancelBy}
              onChange={(e) => setCancelBy(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={cancelLoading}
              className="px-4 py-1.5 font-bold bg-rose-700 text-white rounded-xl hover:bg-rose-800 disabled:opacity-60 transition flex items-center gap-1.5"
            >
              {cancelLoading ? 'Memproses...' : 'Ya, Batalkan Pendaftaran'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detail Pendaftar */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Detail Calon Santri: ${selectedApplicant?.namaLengkap || ''}`}
      >
        {selectedApplicant && (
          <div className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
            {/* Header Profil */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900 block text-sm">{selectedApplicant.namaLengkap}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {selectedApplicant.noPendaftaran || '-'} • {selectedApplicant.jenjang} ({selectedApplicant.gelombang})
                </span>
              </div>
              <span className="font-bold text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {selectedApplicant.statusPendaftaran}
              </span>
            </div>

            {/* Jika Dibatalkan */}
            {selectedApplicant.statusPendaftaran === 'DIBATALKAN' && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs space-y-1">
                <span className="font-bold block">Status: Pendaftaran Dibatalkan</span>
                <div>Alasan: &quot;{selectedApplicant.alasanPembatalan || '-'}&quot;</div>
                <div className="text-[10px] text-rose-700">
                  Tanggal: {selectedApplicant.batalAt ? formatDate(selectedApplicant.batalAt) : '-'} | Dicatat oleh:{' '}
                  {selectedApplicant.batalBy || '-'}
                </div>
              </div>
            )}

            {/* Identitas Diri */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Biodata Calon Santri
              </span>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">NIK:</span>
                  <span className="font-medium text-slate-800">{selectedApplicant.nik || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">NISN:</span>
                  <span className="font-medium text-slate-800">{selectedApplicant.nisn || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Tempat, Tanggal Lahir:</span>
                  <span className="font-medium text-slate-800">
                    {selectedApplicant.tempatLahir || '-'}, {selectedApplicant.tanggalLahir || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Jenis Kelamin:</span>
                  <span className="font-medium text-slate-800">
                    {selectedApplicant.jenisKelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">No. HP / WhatsApp:</span>
                  <span className="font-medium text-slate-800">{selectedApplicant.noHp || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Asal Sekolah:</span>
                  <span className="font-medium text-slate-800">{selectedApplicant.asalSekolah || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[10px] block">Alamat Tinggal:</span>
                  <span className="font-medium text-slate-800">{selectedApplicant.alamat || '-'}</span>
                </div>
              </div>
            </div>

            {/* Orang Tua */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Orang Tua / Wali
              </span>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">Nama Ayah:</span>
                  <span className="font-medium text-slate-800">{selectedApplicant.namaAyah || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Nama Ibu:</span>
                  <span className="font-medium text-slate-800">{selectedApplicant.namaIbu || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">No. HP Orang Tua:</span>
                  <span className="font-medium text-slate-800">
                    {selectedApplicant.noHpAyah || selectedApplicant.noHpIbu || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Wali Santri:</span>
                  <span className="font-medium text-slate-800">{selectedApplicant.namaWali || '-'}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
