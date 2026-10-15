'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import {
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';

export default function DraftPage() {
  const { selectedYearId, selectedYearName, refreshYears } = useApp();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit modal state
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<any>(null);

  const fetchDrafts = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/students?academicYearId=${selectedYearId}&status=DRAFT&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) {
        setDrafts(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [selectedYearId, search]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(drafts.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/students/verify-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedIds, action: 'activate' }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedIds([]);
        await fetchDrafts();
        await refreshYears();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Hapus ${selectedIds.length} data draft yang dipilih?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/students/verify-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedIds, action: 'delete' }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedIds([]);
        await fetchDrafts();
        await refreshYears();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

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
        await fetchDrafts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!deleteConfirmStudent) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/students/${deleteConfirmStudent.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setDeleteConfirmStudent(null);
        await fetchDrafts();
        await refreshYears();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Draft Data Siswa
            </h1>
            <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {drafts.length} Menunggu Verifikasi
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Data hasil import disimpan di sini terlebih dahulu sebelum diaktifkan menjadi data siswa aktif ({selectedYearName}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/import"
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Import File Lagi
          </Link>
          <Link
            href="/siswa"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            Data Siswa Aktif →
          </Link>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, NIS, NIK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-medium">
              Terpilih: <strong>{selectedIds.length}</strong>
            </span>
            <button
              onClick={handleBulkActivate}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Verifikasi & Aktifkan</span>
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          </div>
        )}
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Memuat data draft...</span>
          </div>
        ) : drafts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700 text-sm">Tidak ada draft yang tertunda</p>
            <p className="text-xs text-slate-400 mt-1">
              Semua data siswa sudah diverifikasi atau belum ada file yang diimpor.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-3 text-center w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === drafts.length && drafts.length > 0}
                      onChange={handleSelectAll}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="py-3 px-3 font-semibold">Nama Siswa</th>
                  <th className="py-3 px-3 font-semibold">Jenjang</th>
                  <th className="py-3 px-3 font-semibold">Gelombang</th>
                  <th className="py-3 px-3 font-semibold">No HP</th>
                  <th className="py-3 px-3 font-semibold">Orang Tua</th>
                  <th className="py-3 px-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {drafts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => handleToggleSelect(s.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{s.namaLengkap}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {s.noInduk || s.nik || '-'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                        {s.jenjang}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{s.gelombang}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{s.noHp || s.noHpAyah || s.noHpIbu || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-700">{s.namaAyah || s.namaIbu || '-'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={async () => {
                            setActionLoading(true);
                            await fetch('/api/students/verify-draft', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ studentIds: [s.id], action: 'activate' }),
                            });
                            await fetchDrafts();
                            await refreshYears();
                            setActionLoading(false);
                          }}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                          title="Aktifkan Siswa Ini"
                        >
                          Verifikasi
                        </button>
                        <button
                          onClick={() => setEditingStudent({ ...s })}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Data"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmStudent(s)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Draft"
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

      {/* Edit Modal */}
      {editingStudent && (
        <Modal
          isOpen={true}
          onClose={() => setEditingStudent(null)}
          title={`Edit Draft: ${editingStudent.namaLengkap}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={editingStudent.namaLengkap || ''}
                onChange={(e) =>
                  setEditingStudent({ ...editingStudent, namaLengkap: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">No HP</label>
                <input
                  type="text"
                  value={editingStudent.noHp || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, noHp: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Alamat</label>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmStudent && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmStudent(null)}
          title="Konfirmasi Hapus Draft"
          maxWidth="sm"
        >
          <div className="text-center py-2 space-y-3">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus draft siswa{' '}
              <strong className="text-slate-900">{deleteConfirmStudent.namaLengkap}</strong>?
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
              onClick={handleDeleteSingle}
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              Hapus Draft
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
