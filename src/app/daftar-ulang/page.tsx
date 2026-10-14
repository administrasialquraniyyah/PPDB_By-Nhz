'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import { formatCurrency, formatDate } from '@/lib/formatters';
import * as XLSX from 'xlsx';
import {
  UserCheck,
  Search,
  Filter,
  Edit2,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  DollarSign,
} from 'lucide-react';

export default function DaftarUlangPage() {
  const { selectedYearId, selectedYearName } = useApp();

  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    totalAmount: 0,
    countSudah: 0,
    countBelum: 0,
    countBatal: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState('');

  // Edit Modal
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRecords = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('academicYearId', selectedYearId);
      if (statusFilter) params.append('status', statusFilter);
      if (jenjangFilter) params.append('jenjang', jenjangFilter);

      const res = await fetch(`/api/re-registrations?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRecords(json.data || []);
        setSummary(json.summary || { total: 0, totalAmount: 0, countSudah: 0, countBelum: 0, countBatal: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedYearId, statusFilter, jenjangFilter]);

  const filteredRecords = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.student?.namaLengkap?.toLowerCase().includes(q) ||
      r.student?.jenjang?.toLowerCase().includes(q) ||
      r.student?.noInduk?.toLowerCase().includes(q)
    );
  });

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/re-registrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRecord),
      });
      const json = await res.json();
      if (json.success) {
        setEditingRecord(null);
        await fetchRecords();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'No',
      'Nama Siswa',
      'Jenjang',
      'Gelombang',
      'Status Daftar Ulang',
      'Nominal Daftar Ulang (Rp)',
      'Metode Pembayaran',
      'Tanggal Pembayaran',
      'Keterangan',
    ];

    const rows = filteredRecords.map((r, idx) => [
      idx + 1,
      r.student?.namaLengkap || '',
      r.student?.jenjang || '',
      r.student?.gelombang || '',
      r.status,
      r.amount,
      r.paymentMethod || '',
      r.paymentDate ? formatDate(r.paymentDate) : '',
      r.notes || '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Ulang');
    XLSX.writeFile(wb, `Laporan_Daftar_Ulang_${selectedYearName.replace('/', '-')}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Status & Administrasi Daftar Ulang
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {summary.countSudah} / {summary.total} Santri
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan status, nominal manual, dan metode pembayaran daftar ulang siswa ({selectedYearName}).
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={records.length === 0}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Penerimaan DU</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {formatCurrency(summary.totalAmount)}
          </div>
          <span className="text-[10px] text-slate-400">Total kas daftar ulang</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Sudah Daftar Ulang</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{summary.countSudah} Santri</div>
          <span className="text-[10px] text-emerald-600 font-medium">
            {summary.total > 0 ? Math.round((summary.countSudah / summary.total) * 100) : 0}% telah selesai
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Belum Daftar Ulang</span>
          <div className="text-xl font-bold text-amber-600 mt-1">{summary.countBelum} Santri</div>
          <span className="text-[10px] text-amber-600 font-medium">Menunggu konfirmasi</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Batal Masuk</span>
          <div className="text-xl font-bold text-rose-600 mt-1">{summary.countBatal} Santri</div>
          <span className="text-[10px] text-rose-500">Mengundurkan diri</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={jenjangFilter}
            onChange={(e) => setJenjangFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
          >
            <option value="">Semua Jenjang</option>
            <option value="TK">TK IT</option>
            <option value="SD">SD IT</option>
            <option value="SMP">SMP IT</option>
            <option value="SMA">SMA IT</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
          >
            <option value="">Semua Status DU</option>
            <option value="Sudah">Sudah Daftar Ulang</option>
            <option value="Belum">Belum Daftar Ulang</option>
            <option value="Batal Masuk">Batal Masuk</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Memuat data daftar ulang...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">Tidak ada data daftar ulang</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-3 font-semibold">No</th>
                  <th className="py-3 px-3 font-semibold">Nama Siswa</th>
                  <th className="py-3 px-3 font-semibold">Jenjang</th>
                  <th className="py-3 px-3 font-semibold">Status Daftar Ulang</th>
                  <th className="py-3 px-3 font-semibold">Nominal Daftar Ulang</th>
                  <th className="py-3 px-3 font-semibold">Metode</th>
                  <th className="py-3 px-3 font-semibold">Tanggal Pembayaran</th>
                  <th className="py-3 px-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{r.student?.namaLengkap}</div>
                      {r.notes && <div className="text-[10px] text-slate-400">{r.notes}</div>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                        {r.student?.jenjang}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === 'Sudah'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'Batal Masuk'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.status === 'Sudah' ? 'Sudah DU' : r.status === 'Batal Masuk' ? 'Batal' : 'Belum DU'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 text-sm">
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{r.paymentMethod || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {r.paymentDate ? formatDate(r.paymentDate) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setEditingRecord({ ...r })}
                        className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg font-semibold transition"
                      >
                        Edit DU
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <Modal
          isOpen={true}
          onClose={() => setEditingRecord(null)}
          title={`Update Daftar Ulang: ${editingRecord.student?.namaLengkap}`}
          description={`Jenjang: ${editingRecord.student?.jenjang}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Status Daftar Ulang</label>
              <select
                value={editingRecord.status}
                onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
              >
                <option value="Belum">Belum Daftar Ulang</option>
                <option value="Sudah">Sudah Daftar Ulang</option>
                <option value="Batal Masuk">Batal Masuk (Mengundurkan Diri)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Nominal Daftar Ulang (Rp) — Diinput Manual
              </label>
              <input
                type="number"
                placeholder="Contoh: 5000000"
                value={editingRecord.amount}
                onChange={(e) =>
                  setEditingRecord({ ...editingRecord, amount: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-sm text-emerald-700"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Metode Pembayaran</label>
                <select
                  value={editingRecord.paymentMethod || 'Transfer'}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, paymentMethod: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Transfer">Transfer Bank</option>
                  <option value="Cash">Cash (Tunai)</option>
                  <option value="Rekening">Rekening / VA</option>
                  <option value="Mini Bank">Mini Bank</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tanggal Daftar Ulang</label>
                <input
                  type="date"
                  value={
                    editingRecord.paymentDate
                      ? new Date(editingRecord.paymentDate).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, paymentDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Keterangan / Catatan</label>
              <textarea
                value={editingRecord.notes || ''}
                onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                rows={2}
                placeholder="Catatan kwitansi, cicilan, dsb."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {actionLoading ? 'Menyimpan...' : 'Simpan Data Daftar Ulang'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
