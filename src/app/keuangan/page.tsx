'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import PrintHeader from '@/components/PrintHeader';
import { formatCurrency, formatDate } from '@/lib/formatters';
import * as XLSX from 'xlsx';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit2,
  Trash2,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Building,
  Award,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export default function KeuanganPage() {
  const { selectedYearId, selectedYearName } = useApp();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalPemasukan: 0,
    totalIncomeForm: 0,
    totalIncomeDU: 0,
    totalDiskonForm: 0,
    totalPengeluaran: 0,
    totalApresiasiPaid: 0,
    totalExpenseYayasan: 0,
    totalExpenseOperasional: 0,
    totalExpenseLainnya: 0,
    saldo: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Add / Edit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Operasional PPDB',
    description: '',
    amount: 0,
    reference: '',
    notes: '',
  });

  const fetchKeuangan = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('academicYearId', selectedYearId);
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setExpenses(json.data || []);
        setSummary(json.summary || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeuangan();
  }, [selectedYearId, categoryFilter]);

  const filteredExpenses = expenses.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.description?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.reference?.toLowerCase().includes(q)
    );
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const isEditing = !!editingExpense;
      const url = '/api/expenses';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = isEditing
        ? { id: editingExpense.id, ...formData }
        : { academicYearId: selectedYearId, ...formData };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setEditingExpense(null);
        await fetchKeuangan();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pencatatan pengeluaran ini?')) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        await fetchKeuangan();
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
      'Tanggal',
      'Kategori Pengeluaran',
      'Keterangan',
      'Nominal (Rp)',
      'No Referensi / Kwitansi',
      'Catatan',
    ];

    const rows = filteredExpenses.map((e, idx) => [
      idx + 1,
      formatDate(e.date),
      e.category,
      e.description,
      e.amount,
      e.reference || '',
      e.notes || '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pengeluaran');
    XLSX.writeFile(wb, `Laporan_Keuangan_PPDB_${selectedYearName.replace('/', '-')}.xlsx`);
  };

  return (
    <div className="space-y-5 print-container">
      <PrintHeader
        title="Laporan Keuangan & Kas PPDB"
        subtitle="Pemasukan Formulir, Daftar Ulang, Apresiasi Rekomendasi, & Pengeluaran Yayasan"
      />

      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Keuangan PPDB & Arus Kas
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {selectedYearName}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan seluruh transaksi penerimaan formulir, daftar ulang, serta pengeluaran PPDB & yayasan.
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
                date: new Date().toISOString().split('T')[0],
                category: 'Operasional PPDB',
                description: '',
                amount: 0,
                reference: '',
                notes: '',
              });
              setEditingExpense(null);
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Pemasukan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Total Pemasukan</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-emerald-700 mt-1">
            {formatCurrency(summary.totalPemasukan)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex justify-between border-t border-slate-100 pt-1">
            <span>Formulir: {formatCurrency(summary.totalIncomeForm)}</span>
            <span>DU: {formatCurrency(summary.totalIncomeDU)}</span>
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Total Pengeluaran</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-rose-600 mt-1">
            {formatCurrency(summary.totalPengeluaran)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex justify-between border-t border-slate-100 pt-1">
            <span>Apresiasi: {formatCurrency(summary.totalApresiasiPaid)}</span>
            <span>Yayasan: {formatCurrency(summary.totalExpenseYayasan)}</span>
          </div>
        </div>

        {/* Total Diskon */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Total Diskon</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-amber-600 mt-1">
            {formatCurrency(summary.totalDiskonForm)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Potongan biaya formulir pendaftar
          </span>
        </div>

        {/* Saldo Kas Bersih */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-xl border border-slate-700 shadow-md text-white">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold uppercase">
            <span>Saldo Kas PPDB</span>
            <div className="p-1.5 rounded-lg bg-white/10 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(summary.saldo)}
          </div>
          <span className="text-[10px] text-slate-300 mt-1 block">
            Saldo riil yang tersedia di kas
          </span>
        </div>
      </div>

      {/* Income Breakdown Box */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <h2 className="font-bold text-sm text-slate-900 mb-3">Rincian Arus Kas Terpadu ({selectedYearName})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1">
            <div className="font-semibold text-emerald-900 flex items-center justify-between">
              <span>Pemasukan Formulir</span>
              <span>{formatCurrency(summary.totalIncomeForm)}</span>
            </div>
            <p className="text-[11px] text-emerald-700">Tercatat otomatis dari data pendaftar yang lunas.</p>
          </div>

          <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl space-y-1">
            <div className="font-semibold text-teal-900 flex items-center justify-between">
              <span>Pemasukan Daftar Ulang</span>
              <span>{formatCurrency(summary.totalIncomeDU)}</span>
            </div>
            <p className="text-[11px] text-teal-700">Tercatat dari nominal manual daftar ulang yang lunas.</p>
          </div>

          <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl space-y-1">
            <div className="font-semibold text-rose-900 flex items-center justify-between">
              <span>Apresiasi Rekomendasi (Paid)</span>
              <span>{formatCurrency(summary.totalApresiasiPaid)}</span>
            </div>
            <p className="text-[11px] text-rose-700">Bisyaroh rekomendasi guru & wali santri yang sudah cair.</p>
          </div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3 no-print">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari keterangan pengeluaran, referensi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
        >
          <option value="">Semua Kategori Pengeluaran</option>
          <option value="Pengeluaran Yayasan">Pengeluaran Yayasan</option>
          <option value="Operasional PPDB">Operasional PPDB</option>
          <option value="Konsumsi/Penguji">Konsumsi & Penguji</option>
          <option value="Apresiasi Rekomendasi">Apresiasi Rekomendasi</option>
          <option value="Lainnya">Pengeluaran Lainnya</option>
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900">
            Daftar Pengeluaran PPDB & Yayasan ({filteredExpenses.length} Transaksi)
          </h2>
          <span className="text-xs text-slate-400 no-print">Urut dari tanggal terbaru</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Memuat data pengeluaran...</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">Belum ada pengeluaran tercatat</p>
            <p className="text-xs text-slate-400 mt-1">Klik tombol &quot;Tambah Pengeluaran&quot; untuk mencatat.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-3 font-semibold">No</th>
                  <th className="py-3 px-3 font-semibold">Tanggal</th>
                  <th className="py-3 px-3 font-semibold">Kategori</th>
                  <th className="py-3 px-3 font-semibold">Keterangan Pengeluaran</th>
                  <th className="py-3 px-3 font-semibold">Nominal</th>
                  <th className="py-3 px-3 font-semibold">Referensi</th>
                  <th className="py-3 px-3 font-semibold text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredExpenses.map((e, idx) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(e.date)}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{e.description}</div>
                      {e.notes && <div className="text-[10px] text-slate-400 italic">{e.notes}</div>}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-rose-600 text-sm">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{e.reference || '-'}</td>
                    <td className="py-2.5 px-3 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingExpense(e);
                            setFormData({
                              date: new Date(e.date).toISOString().split('T')[0],
                              category: e.category,
                              description: e.description,
                              amount: e.amount,
                              reference: e.reference || '',
                              notes: e.notes || '',
                            });
                            setShowAddModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
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
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {showAddModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowAddModal(false)}
          title={editingExpense ? 'Edit Catatan Pengeluaran' : 'Tambah Catatan Pengeluaran'}
          description={`Tahun Pelajaran: ${selectedYearName}`}
          maxWidth="md"
        >
          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Operasional PPDB">Operasional PPDB</option>
                  <option value="Pengeluaran Yayasan">Pengeluaran Yayasan</option>
                  <option value="Konsumsi/Penguji">Konsumsi & Penguji</option>
                  <option value="Apresiasi Rekomendasi">Apresiasi Rekomendasi</option>
                  <option value="Spanduk/Banner/Promosi">Spanduk / Banner / Promosi</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Keterangan Pengeluaran</label>
              <input
                type="text"
                placeholder="Contoh: Banner Qurban, Pencairan ke Yayasan, dll."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-sm text-rose-600"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">No Referensi / Kwitansi</label>
                <input
                  type="text"
                  placeholder="KWT-001"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Catatan Tambahan</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Penerima atau rincian tambahan..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {actionLoading ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
