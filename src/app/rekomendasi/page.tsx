'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import PrintHeader from '@/components/PrintHeader';
import { formatCurrency, formatDate } from '@/lib/formatters';
import * as XLSX from 'xlsx';
import {
  Award,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  Clock,
  UserCheck,
  Building,
} from 'lucide-react';

export default function RekomendasiPage() {
  const { selectedYearId, selectedYearName } = useApp();

  const [groupedList, setGroupedList] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalStudents: 0,
    totalRecommenders: 0,
    grandTotalAmount: 0,
    grandTotalPaid: 0,
    grandTotalUnpaid: 0,
  });
  const [loading, setLoading] = useState(true);

  // Active tab: 'grouped' (Rekap Perekomendasi) or 'list' (Daftar Siswa)
  const [tab, setTab] = useState<'grouped' | 'list'>('grouped');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add / Edit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [activeStudents, setActiveStudents] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    studentId: '',
    recommenderName: '',
    recommenderCategory: 'Guru/Internal',
    appreciationAmount: 500000,
    paymentStatus: 'Belum',
    notes: '',
  });

  const fetchRecommendations = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('academicYearId', selectedYearId);
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter) params.append('paymentStatus', statusFilter);

      const res = await fetch(`/api/recommendations?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setGroupedList(json.grouped || []);
        setRecommendations(json.data || []);
        setSummary(json.summary || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveStudents = async () => {
    try {
      const res = await fetch(`/api/students?academicYearId=${selectedYearId}&status=ACTIVE`);
      const json = await res.json();
      if (json.success) {
        setActiveStudents(json.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    fetchActiveStudents();
  }, [selectedYearId, categoryFilter, statusFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setEditingItem(null);
        await fetchRecommendations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data rekomendasi ini?')) return;
    try {
      const res = await fetch(`/api/recommendations?id=${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        await fetchRecommendations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const headers = [
      'No',
      'Nama Siswa',
      'Jenjang',
      'Pemberi Rekomendasi',
      'Kategori',
      'Nominal Apresiasi (Rp)',
      'Status Apresiasi',
      'Catatan',
    ];

    const rows = recommendations.map((r, idx) => [
      idx + 1,
      r.student?.namaLengkap || '',
      r.student?.jenjang || '',
      r.recommenderName,
      r.recommenderCategory,
      r.appreciationAmount,
      r.paymentStatus,
      r.notes || '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekomendasi');
    XLSX.writeFile(wb, `Laporan_Rekomendasi_${selectedYearName.replace('/', '-')}.xlsx`);
  };

  return (
    <div className="space-y-5 print-container">
      <PrintHeader
        title="Laporan Data Rekomendasi & Apresiasi PPDB"
        subtitle="Yayasan Pendidikan Islam Pondok Pesantren Al-Qur'aniyyah"
      />

      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Modul Rekomendasi & Apresiasi
            </h1>
            <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {summary.totalStudents} Santri Direkomendasikan
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Data perekomendasi dari guru, karyawan internal, wali santri, atau alumni ({selectedYearName}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Laporan</span>
          </button>
          <button
            onClick={() => {
              setFormData({
                studentId: activeStudents[0]?.id || '',
                recommenderName: '',
                recommenderCategory: 'Guru/Internal',
                appreciationAmount: 500000,
                paymentStatus: 'Belum',
                notes: '',
              });
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rekomendasi</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Pemberi Rekomendasi</span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {summary.totalRecommenders} Orang
          </div>
          <span className="text-[10px] text-slate-400">{summary.totalStudents} siswa terdaftar</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Komitmen Apresiasi</span>
          <div className="text-xl font-bold text-indigo-700 mt-1">
            {formatCurrency(summary.grandTotalAmount)}
          </div>
          <span className="text-[10px] text-slate-400">Total hak bisyaroh</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Sudah Dibayar (Lunas)</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">
            {formatCurrency(summary.grandTotalPaid)}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Telah tersalurkan</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Belum Dibayar (Tertunda)</span>
          <div className="text-xl font-bold text-amber-600 mt-1">
            {formatCurrency(summary.grandTotalUnpaid)}
          </div>
          <span className="text-[10px] text-amber-600 font-medium">Perlu dicairkan</span>
        </div>
      </div>

      {/* View Switcher & Filters */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setTab('grouped')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none ${
              tab === 'grouped'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rekap per Pemberi Rekomendasi ({groupedList.length})
          </button>
          <button
            onClick={() => setTab('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none ${
              tab === 'list'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar Detail Siswa ({recommendations.length})
          </button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
          >
            <option value="">Semua Kategori</option>
            <option value="Guru/Internal">Guru / Internal</option>
            <option value="Wali Santri">Wali Santri</option>
            <option value="Alumni">Alumni</option>
            <option value="Lainnya">Lainnya</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
          >
            <option value="">Status Bayar</option>
            <option value="Lunas">Sudah Lunas</option>
            <option value="Belum">Belum Dibayar</option>
          </select>
        </div>
      </div>

      {/* Content 1: Rekap per Pemberi Rekomendasi */}
      {tab === 'grouped' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
              <span className="text-xs">Memuat rekap perekomendasi...</span>
            </div>
          ) : groupedList.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-sm">Belum ada data rekomendasi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-3 font-semibold">No</th>
                    <th className="py-3 px-3 font-semibold">Nama Pemberi Rekomendasi</th>
                    <th className="py-3 px-3 font-semibold">Kategori</th>
                    <th className="py-3 px-3 font-semibold">Jumlah Siswa</th>
                    <th className="py-3 px-3 font-semibold">Daftar Siswa</th>
                    <th className="py-3 px-3 font-semibold">Total Apresiasi</th>
                    <th className="py-3 px-3 font-semibold">Status Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {groupedList.map((g, idx) => {
                    const isAllPaid = g.unpaidAmount === 0 && g.totalAmount > 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-3 font-bold text-slate-900 text-sm">
                          {g.recommenderName}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {g.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {g.studentCount} Siswa
                        </td>
                        <td className="py-3 px-3">
                          <div className="max-w-xs text-[11px] text-slate-600 space-y-0.5">
                            {g.students.map((st: any) => (
                              <div key={st.id} className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="font-medium text-slate-800">{st.studentName}</span>
                                <span className="text-slate-400">({st.jenjang})</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold font-mono text-emerald-700 text-sm">
                          {formatCurrency(g.totalAmount)}
                        </td>
                        <td className="py-3 px-3">
                          {isAllPaid ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Semua Lunas
                            </span>
                          ) : g.paidAmount > 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Sebagian Dibayar
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              Belum Dibayar
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Content 2: Detail per Siswa */}
      {tab === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-3 font-semibold">No</th>
                  <th className="py-3 px-3 font-semibold">Nama Siswa</th>
                  <th className="py-3 px-3 font-semibold">Jenjang</th>
                  <th className="py-3 px-3 font-semibold">Pemberi Rekomendasi</th>
                  <th className="py-3 px-3 font-semibold">Kategori</th>
                  <th className="py-3 px-3 font-semibold">Nominal Apresiasi</th>
                  <th className="py-3 px-3 font-semibold">Status Bayar</th>
                  <th className="py-3 px-3 font-semibold text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {recommendations.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{r.student?.namaLengkap}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                        {r.student?.jenjang}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{r.recommenderName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{r.recommenderCategory}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                      {formatCurrency(r.appreciationAmount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.paymentStatus === 'Lunas'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setFormData({
                              studentId: r.studentId,
                              recommenderName: r.recommenderName,
                              recommenderCategory: r.recommenderCategory,
                              appreciationAmount: r.appreciationAmount,
                              paymentStatus: r.paymentStatus,
                              notes: r.notes || '',
                            });
                            setShowAddModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Rekomendasi */}
      {showAddModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowAddModal(false)}
          title="Tambah / Edit Data Rekomendasi"
          maxWidth="md"
        >
          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Pilih Siswa</label>
              <select
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                required
              >
                <option value="">-- Pilih Siswa --</option>
                {activeStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.namaLengkap} ({s.jenjang})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Pemberi Rekomendasi</label>
              <input
                type="text"
                placeholder="Contoh: Ust. Ahmad, H. Fulan, dll."
                value={formData.recommenderName}
                onChange={(e) => setFormData({ ...formData, recommenderName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Kategori Pemberi</label>
                <select
                  value={formData.recommenderCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    const defaultNominal = cat === 'Wali Santri' ? 250000 : 500000;
                    setFormData({
                      ...formData,
                      recommenderCategory: cat,
                      appreciationAmount: defaultNominal,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Guru/Internal">Guru / Internal</option>
                  <option value="Wali Santri">Wali Santri</option>
                  <option value="Alumni">Alumni</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nominal Apresiasi (Rp)</label>
                <input
                  type="number"
                  value={formData.appreciationAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, appreciationAmount: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-emerald-700"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Status Pembayaran Apresiasi</label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Belum">Belum Dibayar (Tertunda)</option>
                <option value="Lunas">Sudah Lunas (Dibayarkan)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Keterangan / Catatan</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Catatan tambahan..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {actionLoading ? 'Menyimpan...' : 'Simpan Rekomendasi'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
