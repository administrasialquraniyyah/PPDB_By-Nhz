'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { FileSpreadsheet, Download, CheckCircle2, RefreshCw } from 'lucide-react';

export default function BackupButton({ className = '' }: { className?: string }) {
  const { selectedYearId } = useApp();
  const [downloading, setDownloading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDownloadBackup = async () => {
    if (downloading) return;
    setDownloading(true);
    setSuccess(false);

    try {
      const url = selectedYearId ? `/api/backup?academicYearId=${selectedYearId}` : '/api/backup';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengunduh backup');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = downloadUrl;
      a.download = `Backup_PPDB_AlQuraniyyah_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error('Backup error:', err);
      alert('Terjadi kesalahan saat mengunduh backup data Excel.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleDownloadBackup}
        disabled={downloading}
        title="Download file Excel cadangan lokal lengkap"
        className={`px-3 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-60 ${className}`}
      >
        {downloading ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden sm:inline">Menyiapkan...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
            <span className="hidden sm:inline">Tersimpan!</span>
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
            <span className="hidden md:inline">Backup Excel</span>
            <span className="md:hidden">Backup</span>
          </>
        )}
      </button>

      {success && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-slate-900 text-white text-[11px] py-1.5 px-3 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap animate-fade-in flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Excel terunduh & salinan otomatis tersimpan di folder lokal!</span>
        </div>
      )}
    </div>
  );
}
