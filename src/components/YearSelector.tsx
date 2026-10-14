'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Calendar, Plus, Check } from 'lucide-react';

export default function YearSelector() {
  const { academicYears, selectedYearId, setSelectedYearId, refreshYears } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearName.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newYearName.trim(), isActive: true }),
      });
      const json = await res.json();
      if (json.success) {
        await refreshYears();
        setSelectedYearId(json.data.id);
        setShowAddModal(false);
        setNewYearName('');
      } else {
        setError(json.error || 'Gagal menambahkan tahun ajaran');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-xl px-2.5 py-1.5 shadow-sm text-xs">
        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <select
          value={selectedYearId}
          onChange={(e) => setSelectedYearId(e.target.value)}
          aria-label="Pilih Tahun Ajaran"
          className="bg-transparent font-semibold text-slate-800 border-none outline-none cursor-pointer pr-1 focus:ring-0 text-xs"
        >
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name} {y.isActive ? '(Aktif)' : ''}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-700 transition"
          title="Tambah Tahun Ajaran Baru"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Add Year Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="font-semibold text-slate-900 text-base mb-1">Tambah Tahun Ajaran</h3>
            <p className="text-xs text-slate-500 mb-4">
              Data pendaftar baru tidak akan menimpa data tahun sebelumnya.
            </p>

            <form onSubmit={handleAddYear} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Format Tahun Ajaran
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 2027/2028"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  required
                />
                {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan & Aktifkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
