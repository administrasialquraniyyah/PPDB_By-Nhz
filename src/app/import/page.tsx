'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  FileUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Clock,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
  const { selectedYearId, selectedYearName, refreshYears } = useApp();
  const router = useRouter();

  const [importTarget, setImportTarget] = useState<'APPLICANTS' | 'STUDENTS'>('APPLICANTS');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [targetStatus, setTargetStatus] = useState<'DRAFT' | 'ACTIVE'>('DRAFT');
  const [error, setError] = useState<string>('');
  const [successResult, setSuccessResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setError('');
      setSuccessResult(null);
    }
  };

  const handleUploadPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setPreview(null);
    setSuccessResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('academicYearId', selectedYearId);
      formData.append('mode', 'preview');

      const endpoint = importTarget === 'APPLICANTS' ? '/api/applicants/import' : '/api/students/import';

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setPreview(json.preview);
      } else {
        setError(json.error || 'Gagal membaca file Excel');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses file');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview || !preview.rows || preview.rows.length === 0) return;

    setCommitting(true);
    setError('');

    try {
      const endpoint = importTarget === 'APPLICANTS' ? '/api/applicants/import' : '/api/students/import';

      const payload = importTarget === 'APPLICANTS'
        ? {
            rows: preview.rows,
            academicYearId: selectedYearId,
          }
        : {
            rows: preview.rows,
            academicYearId: selectedYearId,
            targetStatus: targetStatus,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessResult({
          ...json,
          targetType: importTarget,
        });
        await refreshYears();
        // Clear preview
        setPreview(null);
        setFile(null);
      } else {
        setError(json.error || 'Gagal menyimpan data ke database');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat commit data');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Import Data PPDB & Pendaftar
              </h1>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                T.P. {selectedYearName}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Upload file Excel pendaftaran calon santri dari website resmi PPDB Al-Qur’aniyyah.
            </p>
          </div>

          {/* Target Module Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                setImportTarget('APPLICANTS');
                setPreview(null);
                setError('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                importTarget === 'APPLICANTS'
                  ? 'bg-white text-emerald-800 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ke Data Pendaftar (Rekomendasi)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImportTarget('STUDENTS');
                setPreview(null);
                setError('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                importTarget === 'STUDENTS'
                  ? 'bg-white text-emerald-800 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ke Data Siswa Langsung</span>
            </button>
          </div>
        </div>

        <div className="mt-4 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/70 text-xs text-emerald-900 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Ketentuan Alur Bisnis PPDB:</span>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              {importTarget === 'APPLICANTS' ? (
                <>
                  Calon santri baru diimpor ke modul <strong>Data Pendaftar</strong> dengan status pembayaran formulir otomatis <strong>Lunas (Transfer)</strong> untuk mengikuti tes wawancara dan seleksi kelulusan. Hanya calon santri yang dinyatakan <strong>Lulus</strong> yang dapat diproses resmi menjadi Data Siswa PPDB.
                </>
              ) : (
                <>
                  Data akan langsung dimasukkan ke tabel <strong>Data Siswa (PPDB)</strong>. Gunakan opsi ini hanya untuk migrasi data lama yang sudah dinyatakan diterima/lulus sebelumnya.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-emerald-900 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold text-base">Import Berhasil Selesai!</h3>
              <p className="text-sm mt-0.5">{successResult.message}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            {successResult.targetType === 'APPLICANTS' ? (
              <button
                onClick={() => router.push('/pendaftar')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-emerald-700 transition flex items-center gap-1.5"
              >
                <span>Buka Data Pendaftar Sekarang</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : successResult.targetStatus === 'DRAFT' ? (
              <button
                onClick={() => router.push('/draft')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-emerald-700 transition"
              >
                Lihat & Verifikasi di Draft Siswa →
              </button>
            ) : (
              <button
                onClick={() => router.push('/siswa')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-emerald-700 transition"
              >
                Buka Data Siswa Aktif →
              </button>
            )}
            <button
              onClick={() => setSuccessResult(null)}
              className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
            >
              Import File Lain
            </button>
          </div>
        </div>
      )}

      {/* Upload Box */}
      {!successResult && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <form onSubmit={handleUploadPreview} className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center transition-colors">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  {file ? file.name : 'Pilih atau Tarik File Excel PPDB ke sini'}
                </div>
                <p className="text-xs text-slate-400">
                  Mendukung file .xlsx dan .xls format ekspor website resmi PPDB Al-Qur’aniyyah
                </p>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500">
                Tujuan Impor: <strong className="text-slate-800">{importTarget === 'APPLICANTS' ? 'Data Pendaftar (Calon Santri Baru)' : 'Data Siswa PPDB Langsung'}</strong> • T.P. <strong className="text-slate-800">{selectedYearName}</strong>
              </span>

              <button
                type="submit"
                disabled={!file || loading}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Menganalisis Kolom Excel...' : 'Baca & Tampilkan Preview'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Section */}
      {preview && (() => {
        const newRowsCount = preview.newRowsCount !== undefined
          ? preview.newRowsCount
          : Math.max(0, preview.validRows - (preview.duplicateCount || 0));
        const duplicateCount = preview.duplicateCount || 0;

        return (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Anti-Duplication Protection Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                <span>Proteksi Anti-Duplikasi Otomatis Aktif</span>
                <span className="bg-emerald-200/70 text-emerald-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  Aman Diimpor Berkali-kali
                </span>
              </div>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Sistem memeriksa nomor pendaftaran (contoh: <code>ALQ-2026-000012</code>), NIK, dan nama calon santri. <strong>{duplicateCount} data yang sudah pernah diimpor otomatis dilewati</strong> sehingga tidak akan pernah ada data ganda atau menimpa catatan tes/rekening yang sudah ada. Hanya <strong>{newRowsCount} calon santri baru</strong> yang akan dimasukkan ke database.
              </p>
            </div>
          </div>

          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 font-medium">Total di File Excel</span>
              <div className="font-extrabold text-lg text-slate-900">{preview.totalRows} Data</div>
              <span className="text-[10px] text-slate-400 truncate block">Sheet: {preview.selectedSheet}</span>
            </div>
            <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
              <span className="text-[11px] text-emerald-700 font-semibold">Santri Baru (Akan Diimpor)</span>
              <div className="font-extrabold text-xl text-emerald-700">{newRowsCount} Calon Santri</div>
              <span className="text-[10px] text-emerald-600">Siap diproses seleksi</span>
            </div>
            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 shadow-xs">
              <span className="text-[11px] text-amber-700 font-semibold">Sudah Terdaftar (Dilewati)</span>
              <div className="font-extrabold text-xl text-amber-700">{duplicateCount} Santri</div>
              <span className="text-[10px] text-amber-600">Otomatis tidak digandakan</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 font-medium">Status Verifikasi</span>
              <div className="font-bold text-sm text-slate-800 mt-1">
                {newRowsCount > 0 ? 'Siap Impor Data Baru' : 'Semua Sudah Terdaftar'}
              </div>
              <span className="text-[10px] text-slate-400">100% tervalidasi</span>
            </div>
          </div>

          {/* Destination Status Choice (Only for Students direct import) */}
          {importTarget === 'STUDENTS' && (
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-800">Pilih Status Data Siswa Hasil Impor:</div>
                <p className="text-[11px] text-slate-500">
                  Anda dapat memasukkan ke Draft terlebih dahulu untuk diperiksa, atau langsung ke Siswa Aktif.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="targetStatus"
                    value="DRAFT"
                    checked={targetStatus === 'DRAFT'}
                    onChange={() => setTargetStatus('DRAFT')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Masuk sebagai Draft (Rekomendasi)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="targetStatus"
                    value="ACTIVE"
                    checked={targetStatus === 'ACTIVE'}
                    onChange={() => setTargetStatus('ACTIVE')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Langsung Siswa Aktif</span>
                </label>
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-800">Preview Data ({preview.rows.length} Baris)</h2>
              <span className="text-xs text-slate-400">Pastikan kolom nama dan jenjang sudah sesuai</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">No</th>
                    <th className="py-2.5 px-3 font-semibold">Nama Calon Santri</th>
                    <th className="py-2.5 px-3 font-semibold">Jenjang</th>
                    <th className="py-2.5 px-3 font-semibold">Gelombang</th>
                    <th className="py-2.5 px-3 font-semibold">L/P</th>
                    <th className="py-2.5 px-3 font-semibold">No HP</th>
                    <th className="py-2.5 px-3 font-semibold">Orang Tua</th>
                    <th className="py-2.5 px-3 font-semibold">Status Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {preview.rows.slice(0, 50).map((r: any, idx: number) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50 ${r.isDuplicate ? 'bg-amber-50/50' : ''}`}
                    >
                      <td className="py-2 px-3 text-slate-400">{r.rowNumber || idx + 1}</td>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                        {r.namaLengkap}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                          {r.jenjang}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{r.gelombang || 'Gelombang 1'}</td>
                      <td className="py-2 px-3 text-slate-600">{r.jenisKelamin || '-'}</td>
                      <td className="py-2 px-3 text-slate-600">{r.noHp || '-'}</td>
                      <td className="py-2 px-3 font-sans text-slate-700">{r.namaAyah || r.namaIbu || '-'}</td>
                      <td className="py-2 px-3 font-sans">
                        {r.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200/60">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Sudah Terdaftar (Dilewati)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Santri Baru (Siap Masuk)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.rows.length > 50 && (
              <div className="p-2.5 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-100">
                Menampilkan 50 data pertama dari total {preview.rows.length} data.
              </div>
            )}

            {/* Commit Action Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                Batal / Ganti File
              </button>

              <button
                type="button"
                onClick={handleCommit}
                disabled={committing || newRowsCount === 0}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className={`w-4 h-4 ${committing ? 'animate-spin' : ''}`} />
                {committing
                  ? 'Menyimpan Data Baru ke Supabase...'
                  : newRowsCount === 0
                  ? `Semua Data (${duplicateCount}) Sudah Terdaftar (Tidak Ada Data Baru)`
                  : importTarget === 'APPLICANTS'
                  ? `Setujui & Impor ${newRowsCount} Calon Santri Baru (${duplicateCount} Otomatis Dilewati)`
                  : `Setujui & Impor ${newRowsCount} Data Siswa Baru (${duplicateCount} Otomatis Dilewati)`}
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
