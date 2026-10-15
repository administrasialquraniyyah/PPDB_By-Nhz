'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import { formatDate } from '@/lib/formatters';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  Edit2,
  Calendar,
} from 'lucide-react';

export default function RekeningPage() {
  const { selectedYearId, selectedYearName } = useApp();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, countSudah: 0, countBelum: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState('');

  // Export Modal & Validation
  const [showExportModal, setShowExportModal] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [exportJenjang, setExportJenjang] = useState('');
  const [startCardId, setStartCardId] = useState('1480001301');

  // Mass Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Single Edit Modal
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAccounts = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('academicYearId', selectedYearId);
      if (statusFilter) params.append('status', statusFilter);
      if (jenjangFilter) params.append('jenjang', jenjangFilter);

      const res = await fetch(`/api/bank-accounts?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setAccounts(json.data || []);
        setSummary(json.summary || { total: 0, countSudah: 0, countBelum: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [selectedYearId, statusFilter, jenjangFilter]);

  const filteredAccounts = accounts.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.student?.namaLengkap?.toLowerCase().includes(q) ||
      a.accountNumber?.toLowerCase().includes(q) ||
      a.student?.noInduk?.toLowerCase().includes(q) ||
      a.student?.username?.toLowerCase().includes(q) ||
      a.student?.idKartu?.toLowerCase().includes(q)
    );
  });

  const handleOpenExportModal = async () => {
    setShowExportModal(true);
    setValidating(true);
    try {
      const params = new URLSearchParams();
      params.append('academicYearId', selectedYearId);
      params.append('statusRekening', 'Belum dibuat');
      params.append('mode', 'validate');
      if (exportJenjang) params.append('jenjang', exportJenjang);

      const res = await fetch(`/api/bank-accounts/export?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setValidationData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setValidating(false);
    }
  };

  const handleDownloadExport = () => {
    const params = new URLSearchParams();
    params.append('academicYearId', selectedYearId);
    params.append('statusRekening', 'Belum dibuat');
    params.append('mode', 'download');
    if (exportJenjang) params.append('jenjang', exportJenjang);
    if (startCardId) params.append('startCardId', startCardId.trim());

    window.open(`/api/bank-accounts/export?${params.toString()}`, '_blank');
    setShowExportModal(false);
  };

  const handleMassImportRekening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);

    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('academicYearId', selectedYearId);

      const res = await fetch('/api/bank-accounts/import-numbers', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        setImportResult(json);
        await fetchAccounts();
        setImportFile(null);
      } else {
        alert(json.error || 'Gagal mengimpor nomor rekening');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat import');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/bank-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAccount),
      });
      const json = await res.json();
      if (json.success) {
        setEditingAccount(null);
        await fetchAccounts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Status Pembuatan Rekening Bank
            </h1>
            <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {summary.countSudah} / {summary.total} Selesai
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pengelolaan pembukaan rekening bank siswa (BSI / EduPay) untuk tahun ajaran {selectedYearName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setImportResult(null);
              setShowImportModal(true);
            }}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4 text-purple-600" />
            <span>Import No. Rekening Massal</span>
          </button>

          <button
            onClick={handleOpenExportModal}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Template Pembuatan Rekening (CBS)</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Siswa Aktif</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{summary.total} Santri</div>
          <span className="text-[10px] text-slate-400">Tahun {selectedYearName}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Rekening Sudah Jadi</span>
          <div className="text-xl font-bold text-purple-700 mt-1">{summary.countSudah} Rekening</div>
          <span className="text-[10px] text-purple-600 font-medium">
            {summary.total > 0 ? Math.round((summary.countSudah / summary.total) * 100) : 0}% selesai
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Belum Dibuatkan</span>
          <div className="text-xl font-bold text-amber-600 mt-1">{summary.countBelum} Santri</div>
          <span className="text-[10px] text-amber-600 font-medium">Perlu diexport ke bank</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa, nomor rekening, atau NIS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
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
            <option value="">Semua Status Rekening</option>
            <option value="Belum dibuat">Belum Dibuat</option>
            <option value="Sudah dibuat">Sudah Dibuat</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
            <span className="text-xs font-medium">Memuat data rekening...</span>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">Tidak ada data rekening</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-3 font-semibold">No</th>
                  <th className="py-3 px-3 font-semibold">Nama Siswa</th>
                  <th className="py-3 px-3 font-semibold">Jenjang</th>
                  <th className="py-3 px-3 font-semibold">NIS / NIK</th>
                  <th className="py-3 px-3 font-semibold">Akun Aplikasi & Kartu</th>
                  <th className="py-3 px-3 font-semibold">Status Rekening</th>
                  <th className="py-3 px-3 font-semibold">Nomor Rekening</th>
                  <th className="py-3 px-3 font-semibold">Bank</th>
                  <th className="py-3 px-3 font-semibold">Tanggal Pembuatan</th>
                  <th className="py-3 px-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredAccounts.map((a, idx) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{a.student?.namaLengkap}</div>
                      {a.notes && <div className="text-[10px] text-slate-400">{a.notes}</div>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                        {a.student?.jenjang}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {a.student?.noInduk || a.student?.nik || '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      {a.student?.username || a.student?.password || a.student?.idKartu ? (
                        <div className="space-y-0.5 font-mono text-[11px]">
                          {a.student?.username && (
                            <div className="text-slate-800 font-medium truncate max-w-[150px]" title={a.student.username}>
                              <span className="text-slate-400 font-sans text-[10px]">User:</span> {a.student.username}
                            </div>
                          )}
                          {a.student?.password && (
                            <div className="text-slate-600 text-[10px]">
                              <span className="text-slate-400 font-sans text-[9px]">Pass:</span> {a.student.password}
                            </div>
                          )}
                          {a.student?.idKartu && (
                            <div className="text-purple-700 font-bold text-[10px]">
                              <span className="text-purple-400 font-sans text-[9px]">Kartu:</span> {a.student.idKartu}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Belum diset</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.status === 'Sudah dibuat'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-purple-900 text-sm">
                      {a.accountNumber || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{a.bankName || 'BSI'}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {a.createdDate ? formatDate(a.createdDate) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setEditingAccount({ ...a, student: { ...a.student } })}
                        className="px-2.5 py-1 text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 rounded-lg font-semibold transition"
                      >
                        Edit Rekening
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EXPORT VALIDATION MODAL */}
      {showExportModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowExportModal(false)}
          title="Export Pembuatan Rekening (Format CBS / EduPay)"
          description="Sistem akan mencocokkan field database ke format resmi template bank."
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block font-medium text-slate-700 mb-1">
                Filter Jenjang yang Akan Diexport:
              </label>
              <select
                value={exportJenjang}
                onChange={async (e) => {
                  const val = e.target.value;
                  setExportJenjang(val);
                  setValidating(true);
                  const p = new URLSearchParams();
                  p.append('academicYearId', selectedYearId);
                  p.append('statusRekening', 'Belum dibuat');
                  p.append('mode', 'validate');
                  if (val) p.append('jenjang', val);
                  const res = await fetch(`/api/bank-accounts/export?${p.toString()}`);
                  const j = await res.json();
                  if (j.success) setValidationData(j);
                  setValidating(false);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-xs font-semibold"
              >
                <option value="">Semua Jenjang (TK, SD, SMP, SMA)</option>
                <option value="TK">Hanya TK IT</option>
                <option value="SD">Hanya SD IT</option>
                <option value="SMP">Hanya SMP IT</option>
                <option value="SMA">Hanya SMA IT</option>
              </select>
            </div>

            {validating ? (
              <div className="py-6 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-purple-600 mb-1" />
                <span>Memvalidasi kelengkapan data siswa...</span>
              </div>
            ) : validationData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                    <span className="text-slate-500 font-medium">Siswa Siap Export:</span>
                    <div className="text-xl font-bold text-purple-900 mt-0.5">
                      {validationData.summary.total} Santri
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <span className="text-slate-500 font-medium">Data Lengkap:</span>
                    <div className="text-xl font-bold text-emerald-800 mt-0.5">
                      {validationData.summary.completeCount} Santri
                    </div>
                  </div>
                </div>

                {validationData.summary.incompleteCount > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>{validationData.summary.incompleteCount} Siswa belum lengkap datanya:</span>
                    </div>
                    <p className="text-[11px] text-amber-700 mb-2">
                      Beberapa siswa belum memiliki NISN, tempat lahir, atau no HP. Tetap dapat diexport atau diperiksa terlebih dahulu.
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                      {validationData.items
                        .filter((it: any) => !it.isComplete)
                        .slice(0, 10)
                        .map((it: any) => (
                          <div key={it.id} className="flex justify-between bg-white p-1.5 rounded border border-amber-100">
                            <span className="font-sans font-semibold text-slate-800">{it.nama}</span>
                            <span className="text-rose-600 font-sans">Kurang: {it.missingFields.join(', ')}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Input Acuan Nomor ID Kartu Awal */}
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
              <label className="block font-bold text-slate-800 text-xs">
                💳 Acuan Nomor ID Kartu Awal:
              </label>
              <input
                type="text"
                value={startCardId}
                onChange={(e) => setStartCardId(e.target.value)}
                placeholder="Contoh: 1480001301"
                className="w-full px-3 py-2 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono font-bold text-sm text-purple-900 bg-white"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Nomor kartu awal ini akan diisikan ke kolom <strong>ID kartu</strong> dan diurutkan otomatis (+1 per siswa berikutnya) pada template CBS.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDownloadExport}
                disabled={validating || !validationData || validationData.summary.total === 0}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Excel Resmi</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MASS IMPORT REKENING MODAL */}
      {showImportModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowImportModal(false)}
          title="Import Nomor Rekening Bank Massal"
          description="Upload file hasil dari Bank (contoh: Rekening.xlsx). Sistem akan mencocokkan nama siswa dan mengupdate nomor rekening secara otomatis."
          maxWidth="md"
        >
          <form onSubmit={handleMassImportRekening} className="space-y-3 text-xs">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setImportFile(e.target.files[0]);
                }}
                className="hidden"
                id="file-rek"
              />
              <label htmlFor="file-rek" className="cursor-pointer block">
                <Upload className="w-8 h-8 text-purple-600 mx-auto mb-1" />
                <div className="font-semibold text-slate-800">
                  {importFile ? importFile.name : 'Pilih file Rekening.xlsx'}
                </div>
                <span className="text-[10px] text-slate-400">File Excel hasil pembukaan rekening bank</span>
              </label>
            </div>

            {importResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                <div className="font-bold">{importResult.message}</div>
                {importResult.notFoundCount > 0 && (
                  <p className="text-[11px] text-amber-700">
                    {importResult.notFoundCount} nama tidak ditemukan di database tahun ini.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={!importFile || importing}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} />
                {importing ? 'Memproses...' : 'Proses Update Nomor Rekening'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* SINGLE EDIT MODAL */}
      {editingAccount && (
        <Modal
          isOpen={true}
          onClose={() => setEditingAccount(null)}
          title={`Edit Rekening: ${editingAccount.student?.namaLengkap}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Status Pembuatan Rekening</label>
              <select
                value={editingAccount.status}
                onChange={(e) => setEditingAccount({ ...editingAccount, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-semibold"
              >
                <option value="Belum dibuat">Belum Dibuat</option>
                <option value="Sudah dibuat">Sudah Dibuat</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Nomor Rekening Siswa</label>
              <input
                type="text"
                placeholder="Contoh: 00110100220"
                value={editingAccount.accountNumber || ''}
                onChange={(e) =>
                  setEditingAccount({ ...editingAccount, accountNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono font-bold text-sm text-purple-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Bank</label>
                <input
                  type="text"
                  value={editingAccount.bankName || 'Bank Syariah Indonesia (BSI)'}
                  onChange={(e) => setEditingAccount({ ...editingAccount, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tanggal Pembuatan</label>
                <input
                  type="date"
                  value={
                    editingAccount.createdDate
                      ? new Date(editingAccount.createdDate).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, createdDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
            </div>

            {/* Akun Aplikasi & ID Kartu Siswa */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 text-[11px]">Akun Aplikasi Santri & ID Kartu</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Username Aplikasi</label>
                  <input
                    type="text"
                    value={editingAccount.student?.username || ''}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        student: { ...editingAccount.student, username: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    placeholder="Username / Email"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Password Aplikasi</label>
                  <input
                    type="text"
                    value={editingAccount.student?.password || ''}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        student: { ...editingAccount.student, password: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    placeholder="Password"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-0.5">ID Kartu Bank / CBS</label>
                <input
                  type="text"
                  value={editingAccount.student?.idKartu || ''}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      student: { ...editingAccount.student, idKartu: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-purple-900"
                  placeholder="Contoh: 1480001301"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Catatan</label>
              <textarea
                value={editingAccount.notes || ''}
                onChange={(e) => setEditingAccount({ ...editingAccount, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {actionLoading ? 'Menyimpan...' : 'Simpan Rekening'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
