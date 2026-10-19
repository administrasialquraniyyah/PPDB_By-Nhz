'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseBrowser';
import { Lock, Mail, AlertCircle, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Silakan masukkan email dan kata sandi');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(
          error.message === 'Invalid login credentials'
            ? 'Email atau kata sandi tidak sesuai. Silakan periksa kembali.'
            : error.message
        );
        return;
      }

      if (data?.session) {
        // Force refresh to reload middleware and context
        router.refresh();
        router.push(redirectPath);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mencoba masuk');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Alamat Email Resmi
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contoh: admin@alquraniyyah.sch.id"
            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Kata Sandi (Password)
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg disabled:opacity-60 transition flex items-center justify-center gap-2 mt-2"
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Memverifikasi Akun...
          </>
        ) : (
          <>
            Masuk ke Sistem
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Branding */}
        <div className="p-8 text-center bg-gradient-to-b from-teal-50/70 to-white border-b border-slate-100">
          <div className="w-16 h-16 mx-auto mb-3 bg-teal-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-700/30 font-bold text-xl tracking-wider">
            PPDB
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Pondok Pesantren Al-Qur&apos;aniyyah
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sistem Informasi Penerimaan Santri Baru (PPDB Online)
          </p>
        </div>

        {/* Login Body with Suspense */}
        <div className="p-8 pt-6">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-slate-800">Masuk ke Portal</h2>
            <p className="text-xs text-slate-500">
              Silakan masukkan kredensial akun panitia atau penguji Anda.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="py-8 flex items-center justify-center text-xs text-slate-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                Memuat form login...
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              Hak akses sistem dipisahkan otomatis: <b>Super Admin</b>, <b>Panitia PPDB</b>, dan <b>Unit SD</b>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
