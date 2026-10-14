'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Database, RefreshCw, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function DbStatusBadge() {
  const { dbStatus, checkDbConnection } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    await checkDbConnection();
    setTesting(false);
  };

  const isConnected = dbStatus.status === 'connected';
  const isChecking = dbStatus.status === 'checking' || testing;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-sm ${
          isConnected
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            : isChecking
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
        }`}
        title="Klik untuk cek status koneksi database Supabase"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected
              ? 'bg-emerald-500 animate-pulse'
              : isChecking
              ? 'bg-amber-500 animate-spin'
              : 'bg-rose-500'
          }`}
        />
        <span className="hidden sm:inline">
          {isConnected ? 'Supabase Connected' : isChecking ? 'Checking...' : 'Disconnected'}
        </span>
        <span className="sm:hidden">{isConnected ? 'Online' : 'Offline'}</span>
        {isConnected && dbStatus.latencyMs > 0 && (
          <span className="text-[10px] text-emerald-600 font-mono hidden md:inline">
            ({dbStatus.latencyMs}ms)
          </span>
        )}
      </button>

      {/* Modal Detail & Test Connection */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl ${
                    isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Kontrol Koneksi Database</h3>
                  <p className="text-xs text-slate-500">Supabase Cloud PostgreSQL</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div
                className={`p-4 rounded-xl flex items-start gap-3 border ${
                  isConnected
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                }`}
              >
                {isConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-medium text-sm">
                    {isConnected ? 'Database Terhubung & Aktif' : 'Koneksi Database Terputus'}
                  </div>
                  <p className="text-xs mt-0.5 opacity-80">
                    {isConnected
                      ? 'Semua data disimpan secara permanen di server cloud Supabase (Schema: ppdb).'
                      : dbStatus.error || 'Aplikasi tidak dapat menghubungi server Supabase.'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-200/60 font-mono text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Database Engine:</span>
                  <span className="font-semibold text-slate-800">PostgreSQL (Supabase)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Schema:</span>
                  <span className="font-semibold text-slate-800">ppdb</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Response Latency:</span>
                  <span className="font-semibold text-slate-800">
                    {dbStatus.latencyMs > 0 ? `${dbStatus.latencyMs} ms` : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Terakhir Diperiksa:</span>
                  <span className="text-slate-700">
                    {dbStatus.timestamp ? new Date(dbStatus.timestamp).toLocaleTimeString('id-ID') : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleTest}
                disabled={isChecking}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Menguji Koneksi...' : 'Test Database Connection'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-medium transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
