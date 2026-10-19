'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import DbStatusBadge from './DbStatusBadge';
import YearSelector from './YearSelector';
import BackupButton from './BackupButton';
import { Menu, LogOut, UserCheck, Shield } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseBrowser';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const { setIsMobileNavOpen } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'ADMIN' | 'PEWAWANCARA' | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
          const emailLower = user.email.toLowerCase();
          if (emailLower.includes('penguji') || emailLower.includes('pewawancara')) {
            setUserRole('PEWAWANCARA');
          } else {
            setUserRole('ADMIN');
          }
        }
      } catch (e) {}
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
      router.refresh();
      router.push('/login');
    } catch (e) {
      console.error('Logout error:', e);
      router.push('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 py-2 sm:px-6">
      <div className="flex items-center justify-between gap-3 max-w-[1600px] mx-auto">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden transition"
            title="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-10 h-10 shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center">
              <img
                src="/assets/logo/logo-emblem.png"
                alt="Logo Pondok Pesantren Al-Qur'aniyyah"
                width={40}
                height={40}
                style={{ width: '40px', height: '40px' }}
                className="w-10 h-10 object-contain filter drop-shadow-sm"
              />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black tracking-tight text-slate-900 leading-none">
                PPDB AL-QUR’ANIYYAH
              </div>
              <div className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold leading-tight mt-0.5">
                Database & Keuangan Terpadu
              </div>
            </div>
          </Link>
        </div>

        {/* Right: Academic Year Selector, User Info & Logout Button */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <YearSelector />
          <BackupButton />
          <DbStatusBadge />

          {userEmail && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-800 truncate max-w-[140px] leading-tight">
                  {userEmail}
                </div>
                <div className="text-[10px] font-semibold text-teal-700 flex items-center justify-end gap-1">
                  <Shield className="w-3 h-3 text-teal-600" />
                  <span>{userRole === 'PEWAWANCARA' ? 'Pewawancara' : 'Admin PPDB'}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                title="Keluar dari Sistem"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
