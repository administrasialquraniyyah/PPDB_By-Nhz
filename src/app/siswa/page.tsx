'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  CheckCircle2,
  CreditCard,
  UserCheck,
  Award,
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Phone,
  MapPin,
  School,
  User,
} from 'lucide-react';
import Link from 'next/link';

export default function SiswaPage() {
  const { selectedYearId, selectedYearName, refreshYears } = useApp();

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [jenjang, setJenjang] = useState('');
  const [gelombang, setGelombang] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('');
  const [statusRekening, setStatusRekening] = useState('');
  const [statusDaftarUlang, setStatusDaftarUlang] = useState('');
  const [hasRekomendasi, setHasRekomendasi] = useState('');

  // Modals
  const [detailStudent, setDetailStudent] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStudents = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('academicYearId', selectedYearId);
      params.append('status', 'ACTIVE');
      if (search) params.append('search', search);
      if (jenjang) params.append('jenjang', jenjang);
      if (gelombang) params.append('gelombang', gelombang);
      if (jenisKelamin) params.append('jenisKelamin', jenisKelamin);
      if (statusRekening) params.append('statusRekening', statusRekening);
      if (statusDaftarUlang) params.append('statusDaftarUlang', statusDaftarUlang);
      if (hasRekomendasi) params.append('hasRekomendasi', hasRekomendasi);

      const res = await fetch(`/api/students?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setStudents(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [
    selectedYearId,
    search,
    jenjang,
    gelombang,
    jenisKelamin,
    statusRekening,
    statusDaftarUlang,
    hasRekomendasi,
  ]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingStudent),
      });
      const json = await res.json();
      if (json.success) {
        setEditingStudent(null);
        await fetchStudents();
        await refreshYears();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmStudent) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/students/${deleteConfirmStudent.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setDeleteConfirmStudent(null);
        await fetchStudents();
        await refreshYears();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setJenjang('');
    setGelombang('');
    setJenisKelamin('');
    setStatusRekening('');
    setStatusDaftarUlang('');
    setHasRekomendasi('');
  };

  const hasActiveFilters =
    search || jenjang || gelombang || jenisKelamin || statusRekening || statusDaftarUlang || hasRekomendasi;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Data Siswa PPDB
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {students.length} Siswa Aktif
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Database siswa terpadu untuk tahun ajaran {selectedYearName}. Lengkap dengan formulir, rekening, & daftar ulang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/import"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Import / Tambah Siswa</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIS, NIK, NISN, atau no HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 flex items-center gap-1 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 text-xs">
          <select
            value={jenjang}
            onChange={(e) => setJenjang(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Semua Jenjang</option>
            <option value="TK">TK IT</option>
            <option value="SD">SD IT</option>
            <option value="SMP">SMP IT</option>
            <option value="SMA">SMA IT</option>
          </select>

          <select
            value={gelombang}
            onChange={(e) => setGelombang(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Semua Gelombang</option>
            <option value="Gelombang 1">Gelombang 1</option>
            <option value="Gelombang 2">Gelombang 2</option>
          </select>

          <select
            value={jenisKelamin}
            onChange={(e) => setJenisKelamin(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Semua Gender</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </select>

          <select
            value={statusRekening}
            onChange={(e) => setStatusRekening(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Status Rekening</option>
            <option value="Sudah dibuat">Sudah Dibuat</option>
            <option value="Belum dibuat">Belum Dibuat</option>
          </select>

          <select
            value={statusDaftarUlang}
            onChange={(e) => setStatusDaftarUlang(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Daftar Ulang</option>
            <option value="Sudah">Sudah DU</option>
            <option value="Belum">Belum DU</option>
            <option value="Batal Masuk">Batal Masuk</option>
          </select>

          <select
            value={hasRekomendasi}
            onChange={(e) => setHasRekomendasi(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Rekomendasi</option>
            <option value="true">Ada Rekomendasi</option>
            <option value="false">Tanpa Rekomendasi</option>
          </select>
        </div>
      </div>

      {/* Main Table / Responsive Card List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Memuat data siswa...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">Tidak ada siswa yang sesuai filter</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-3 font-semibold">No</th>
                  <th className="py-3 px-3 font-semibold">Nama Siswa & NIS</th>
                  <th className="py-3 px-3 font-semibold">Jenjang</th>
                  <th className="py-3 px-3 font-semibold">Formulir</th>
                  <th className="py-3 px-3 font-semibold">Rekening Bank</th>
                  <th className="py-3 px-3 font-semibold">Daftar Ulang</th>
                  <th className="py-3 px-3 font-semibold">Rekomendasi</th>
                  <th className="py-3 px-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {students.map((s, idx) => {
                  const fp = s.formPayment;
                  const bank = s.bankAccount;
                  const du = s.reRegistration;
                  const rec = s.recommendation;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 leading-tight">{s.namaLengkap}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {s.noInduk ? `NIS: ${s.noInduk}` : s.nik ? `NIK: ${s.nik}` : '-'}
                          {s.jenisKelamin && ` • ${s.jenisKelamin}`}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                          {s.jenjang}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{s.gelombang}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">
                          {formatCurrency(fp?.nominalAktual || 300000)}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            fp?.status === 'Lunas'
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-amber-700 bg-amber-50'
                          }`}
                        >
                          {fp?.status || 'Lunas'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {bank?.status === 'Sudah dibuat' ? (
                          <div>
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                              Sudah
                            </span>
                            <div className="font-mono text-[10px] text-slate-600 mt-0.5">
                              {bank.accountNumber || 'Nomor terdaftar'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            Belum Dibuat
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {du?.status === 'Sudah' ? (
                          <div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Sudah
                            </span>
                            <div className="font-semibold text-slate-800 mt-0.5 text-[11px]">
                              {formatCurrency(du.amount)}
                            </div>
                          </div>
                        ) : du?.status === 'Batal Masuk' ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                            Batal Masuk
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            Belum DU
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {rec ? (
                          <div>
                            <span className="font-semibold text-indigo-700 text-[11px]">
                              {rec.recommenderName}
                            </span>
                            <div className="text-[10px] text-slate-400">{rec.recommenderCategory}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailStudent(s)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Detail Lengkap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingStudent({ ...s })}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Data"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmStudent(s)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Siswa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {detailStudent && (
        <Modal
          isOpen={true}
          onClose={() => setDetailStudent(null)}
          title={`Detail Siswa: ${detailStudent.namaLengkap}`}
          description={`Tahun Pelajaran ${selectedYearName} • Jenjang ${detailStudent.jenjang}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Identity section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-2">
              <div className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-1 mb-2">
                Identitas Pribadi Siswa
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <span className="text-slate-400">Nama Lengkap:</span>
                  <div className="font-bold text-slate-900">{detailStudent.namaLengkap}</div>
                </div>
                <div>
                  <span className="text-slate-400">Nomor Induk (NIS):</span>
                  <div className="font-mono text-slate-800">{detailStudent.noInduk || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">NIK Siswa:</span>
                  <div className="font-mono text-slate-800">{detailStudent.nik || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">NISN:</span>
                  <div className="font-mono text-slate-800">{detailStudent.nisn || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Jenis Kelamin:</span>
                  <div className="text-slate-800">
                    {detailStudent.jenisKelamin === 'L' ? 'Laki-laki' : detailStudent.jenisKelamin === 'P' ? 'Perempuan' : '-'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Tempat, Tanggal Lahir:</span>
                  <div className="text-slate-800">
                    {detailStudent.tempatLahir || ''}{' '}
                    {detailStudent.tanggalLahir ? `(${detailStudent.tanggalLahir})` : ''}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">No HP / WhatsApp:</span>
                  <div className="font-mono text-slate-800">{detailStudent.noHp || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>
                  <div className="text-slate-800">{detailStudent.email || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Asal Sekolah:</span>
                  <div className="text-slate-800">{detailStudent.asalSekolah || '-'}</div>
                </div>
              </div>
              <div className="pt-1">
                <span className="text-slate-400">Alamat Lengkap:</span>
                <div className="text-slate-800 mt-0.5">{detailStudent.alamat || '-'}</div>
              </div>
            </div>

            {/* Parent section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-2">
              <div className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-1 mb-2">
                Data Orang Tua / Wali
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400">Nama Ayah:</span>
                  <div className="font-semibold text-slate-800">{detailStudent.namaAyah || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Nama Ibu:</span>
                  <div className="font-semibold text-slate-800">{detailStudent.namaIbu || '-'}</div>
                </div>
              </div>
            </div>

            {/* Modules Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Formulir */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" /> Formulir
                </div>
                <div className="font-bold text-slate-900 mt-1">
                  {formatCurrency(detailStudent.formPayment?.nominalAktual || 300000)}
                </div>
                <span className="text-[10px] text-emerald-700">
                  Status: {detailStudent.formPayment?.status || 'Lunas'}
                </span>
              </div>

              {/* Rekening */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-purple-600" /> Rekening Bank
                </div>
                <div className="font-bold text-slate-900 mt-1 truncate">
                  {detailStudent.bankAccount?.accountNumber || 'Belum ada no rek'}
                </div>
                <span className="text-[10px] text-purple-700">
                  {detailStudent.bankAccount?.status || 'Belum dibuat'}
                </span>
              </div>

              {/* Daftar Ulang */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Daftar Ulang
                </div>
                <div className="font-bold text-slate-900 mt-1">
                  {formatCurrency(detailStudent.reRegistration?.amount || 0)}
                </div>
                <span className="text-[10px] text-blue-700">
                  Status: {detailStudent.reRegistration?.status || 'Belum'}
                </span>
              </div>

              {/* Rekomendasi */}
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-600" /> Rekomendasi
                </div>
                <div className="font-bold text-slate-900 mt-1 truncate">
                  {detailStudent.recommendation?.recommenderName || 'Tidak ada'}
                </div>
                <span className="text-[10px] text-indigo-700">
                  {detailStudent.recommendation ? formatCurrency(detailStudent.recommendation.appreciationAmount) : '-'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editingStudent && (
        <Modal
          isOpen={true}
          onClose={() => setEditingStudent(null)}
          title={`Edit Siswa: ${editingStudent.namaLengkap}`}
          maxWidth="xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Lengkap Siswa</label>
              <input
                type="text"
                value={editingStudent.namaLengkap || ''}
                onChange={(e) =>
                  setEditingStudent({ ...editingStudent, namaLengkap: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Jenjang</label>
                <select
                  value={editingStudent.jenjang || 'SMP'}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, jenjang: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="TK">TK IT</option>
                  <option value="SD">SD IT</option>
                  <option value="SMP">SMP IT</option>
                  <option value="SMA">SMA IT</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Gelombang</label>
                <input
                  type="text"
                  value={editingStudent.gelombang || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, gelombang: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Jenis Kelamin</label>
                <select
                  value={editingStudent.jenisKelamin || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, jenisKelamin: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-</option>
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nomor Induk (NIS)</label>
                <input
                  type="text"
                  value={editingStudent.noInduk || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, noInduk: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">NIK</label>
                <input
                  type="text"
                  value={editingStudent.nik || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, nik: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">NISN</label>
                <input
                  type="text"
                  value={editingStudent.nisn || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, nisn: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  value={editingStudent.tempatLahir || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, tempatLahir: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tanggal Lahir</label>
                <input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={editingStudent.tanggalLahir || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, tanggalLahir: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">No HP / WhatsApp</label>
                <input
                  type="text"
                  value={editingStudent.noHp || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, noHp: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingStudent.email || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Ayah</label>
                <input
                  type="text"
                  value={editingStudent.namaAyah || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, namaAyah: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Ibu</label>
                <input
                  type="text"
                  value={editingStudent.namaIbu || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, namaIbu: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Alamat Lengkap</label>
              <textarea
                value={editingStudent.alamat || ''}
                onChange={(e) =>
                  setEditingStudent({ ...editingStudent, alamat: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition disabled:opacity-50"
              >
                {actionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmStudent && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmStudent(null)}
          title="Konfirmasi Hapus Siswa"
          maxWidth="sm"
        >
          <div className="text-center py-2 space-y-3">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus siswa{' '}
              <strong className="text-slate-900">{deleteConfirmStudent.namaLengkap}</strong>?
              Seluruh catatan formulir, rekening, & daftar ulang siswa ini juga akan terhapus.
            </p>
          </div>
          <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
            <button
              onClick={() => setDeleteConfirmStudent(null)}
              className="px-3 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              Hapus Siswa
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
