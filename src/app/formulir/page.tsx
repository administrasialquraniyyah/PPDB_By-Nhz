'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import { formatCurrency, formatDate } from '@/lib/formatters';
import * as XLSX from 'xlsx';
import {
  Receipt,
  Search,
  Filter,
  Edit2,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export default function FormulirPage() {
  const { selectedYearId, selectedYearName } = useApp();
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalRecords: 0,
    totalTarget: 0,
    totalAktual: 0,
    totalDiskon: 0,
    countLunas: 0,
    countBelum: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState('');

  const [editingItem, setEditingItem] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFormulir = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('academicYearId', selectedYearId);
      if (statusFilter) params.append('status', statusFilter);
      if (jenjangFilter) params.append('jenjang', jenjangFilter);

      const res = await fetch(`/api/form-payments?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setPayments(json.data || []);
        setSummary(json.summary || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormulir();
  }, [selectedYearId, statusFilter, jenjangFilter]);

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.student?.namaLengkap?.toLowerCase().includes(q) ||
      p.student?.jenjang?.toLowerCase().includes(q)
    );
  });

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/form-payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem),
      });
      const json = await res.json();
      if (json.success) {
        setEditingItem(null);
        await fetchFormulir();
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
      'Nominal Default',
      'Nominal Aktual',
      'Diskon/Keringanan',
      'Status Pembayaran',
      'Metode',
      'Keterangan',
    ];

    const rows = filteredPayments.map((p, idx) => [
      idx + 1,
      p.student?.namaLengkap || '',
      p.student?.jenjang || '',
      p.student?.gelombang || '',
      p.nominalDefault,
      p.nominalAktual,
      p.diskon,
      p.status,
      p.metodePembayaran || '',
      p.keterangan || '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Formulir');
    XLSX.writeFile(wb, `Laporan_Formulir_PPDB_${selectedYearName.replace('/', '-')}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Pembelian Formulir PPDB
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {summary.totalRecords} Pembeli
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Data pembelian formulir otomatis terdaftar dari hasil import PPDB ({selectedYearName}). Nominal aktual dapat disesuaikan jika ada diskon.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={payments.length === 0}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Target Tarif</span>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {formatCurrency(summary.totalTarget)}
          </div>
          <span className="text-[10px] text-slate-400">Berdasarkan tarif default</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Pemasukan Formulir</span>
          <div className="text-lg font-bold text-emerald-700 mt-1">
            {formatCurrency(summary.totalAktual)}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">
            {summary.countLunas} siswa lunas
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Diskon Diberikan</span>
          <div className="text-lg font-bold text-amber-600 mt-1">
            {formatCurrency(summary.totalDiskon)}
          </div>
          <span className="text-[10px] text-slate-400">Keringanan biaya</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Belum Lunas / Kurang</span>
          <div className="text-lg font-bold text-rose-600 mt-1">{summary.countBelum} Siswa</div>
          <span className="text-[10px] text-rose-500">Perlu tindak lanjut</span>
        </div>
      </div>

      {/* Filters */}
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
            <option value="">Semua Status</option>
            <option value="Lunas">Lunas</option>
            <option value="Belum">Belum Lunas</option>
            <option value="Diskon Penuh">Diskon Penuh (Gratis)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Memuat data formulir...</span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">Tidak ada data formulir</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-3 font-semibold">No</th>
                  <th className="py-3 px-3 font-semibold">Nama Siswa</th>
                  <th className="py-3 px-3 font-semibold">Jenjang</th>
                  <th className="py-3 px-3 font-semibold">Tarif Default</th>
                  <th className="py-3 px-3 font-semibold">Diskon</th>
                  <th className="py-3 px-3 font-semibold">Nominal Aktual</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold">Metode</th>
                  <th className="py-3 px-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredPayments.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{p.student?.namaLengkap}</div>
                      {p.keterangan && (
                        <div className="text-[10px] text-slate-400 italic">{p.keterangan}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                        {p.student?.jenjang}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {formatCurrency(p.nominalDefault)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-amber-600">
                      {p.diskon > 0 ? formatCurrency(p.diskon) : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                      {formatCurrency(p.nominalAktual)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'Lunas'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'Diskon Penuh'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{p.metodePembayaran || '-'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setEditingItem({ ...p })}
                        className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg font-semibold transition"
                      >
                        Edit Tarif
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
      {editingItem && (
        <Modal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          title={`Edit Formulir: ${editingItem.student?.namaLengkap}`}
          description={`Jenjang: ${editingItem.student?.jenjang}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tarif Default (Rp)</label>
                <input
                  type="number"
                  value={editingItem.nominalDefault}
                  onChange={(e) => {
                    const def = Number(e.target.value) || 0;
                    const dis = editingItem.diskon || 0;
                    setEditingItem({
                      ...editingItem,
                      nominalDefault: def,
                      nominalAktual: Math.max(0, def - dis),
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Diskon / Potongan (Rp)</label>
                <input
                  type="number"
                  value={editingItem.diskon}
                  onChange={(e) => {
                    const dis = Number(e.target.value) || 0;
                    const def = editingItem.nominalDefault || 0;
                    setEditingItem({
                      ...editingItem,
                      diskon: dis,
                      nominalAktual: Math.max(0, def - dis),
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-amber-700"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Nominal Aktual yang Dibayar (Rp)
              </label>
              <input
                type="number"
                value={editingItem.nominalAktual}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    nominalAktual: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-emerald-700 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Status Pembayaran</label>
                <select
                  value={editingItem.status}
                  onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Lunas">Lunas</option>
                  <option value="Belum">Belum Lunas</option>
                  <option value="Diskon Penuh">Diskon Penuh (Gratis)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Metode</label>
                <select
                  value={editingItem.metodePembayaran || 'Transfer'}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, metodePembayaran: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Transfer">Transfer Bank</option>
                  <option value="Cash">Cash (Tunai)</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Keterangan / Catatan</label>
              <textarea
                value={editingItem.keterangan || ''}
                onChange={(e) => setEditingItem({ ...editingItem, keterangan: e.target.value })}
                rows={2}
                placeholder="Contoh: Diskon saudara kandung, anak guru, dll."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {actionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
