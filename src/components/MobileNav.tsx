'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { navigationItems } from './Sidebar';
import DbStatusBadge from './DbStatusBadge';
import BackupButton from './BackupButton';
import { createClient } from '@/lib/supabaseBrowser';
import {
  LayoutDashboard,
  Users,
  Wallet,
  FileSpreadsheet,
  X,
  FileUp,
  LogOut,
  Shield,
  CreditCard,
  UserCheck,
} from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobileNavOpen, setIsMobileNavOpen } = useApp();
  const [userRole, setUserRole] = useState<'ADMIN' | 'PANITIA' | 'UNIT' | 'PEWAWANCARA' | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.user) {
          setUserRole(d.user.role);
          setUserEmail(d.user.email);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    if (!confirm('Apakah Anda yakin ingin keluar dari sistem?')) return;
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsMobileNavOpen(false);
      router.refresh();
      router.push('/login');
    } catch (e) {
      console.error('Logout error:', e);
      router.push('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  // Bottom quick links based on role
  const quickLinks = userRole === 'ADMIN'
    ? [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Siswa', href: '/siswa', icon: Users },
        { name: 'Rekening', href: '/rekening', icon: CreditCard },
        { name: 'Daftar Ulang', href: '/daftar-ulang', icon: UserCheck },
        { name: 'Keuangan', href: '/keuangan', icon: Wallet },
      ]
    : [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Pendaftar', href: '/pendaftar', icon: Users },
        { name: 'Wawancara', href: '/wawancara', icon: LayoutDashboard },
        { name: 'Siswa', href: '/siswa', icon: Users },
        { name: 'Import', href: '/import', icon: FileUp },
      ];

  if (pathname === '/login') return null;

  return (
    <>
      {/* Bottom Sticky Tab Bar for Mobile Hand-Held Use */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-1.5 px-2 flex items-center justify-around lg:hidden no-print shadow-lg">
        {quickLinks.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
                isActive ? 'text-emerald-700 font-bold scale-105' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Drawer Overlay */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileNavOpen(false)}
          />

          {/* Drawer Menu */}
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl p-4 flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                    <img
                      src="/assets/logo/logo-emblem.png"
                      alt="Logo Al-Qur'aniyyah"
                      width={36}
                      height={36}
                      style={{ width: '36px', height: '36px' }}
                      className="w-9 h-9 object-contain filter drop-shadow-sm"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-800 leading-none block">
                      PPDB AL-QUR’ANIYYAH
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">Database Terpadu</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Account Info Strip on Mobile */}
              {userEmail && (
                <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {userEmail}
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                      <Shield className="w-3 h-3 text-emerald-600" />
                      <span>{userRole === 'PEWAWANCARA' ? 'Pewawancara' : userRole === 'UNIT' ? 'Admin Unit' : 'Super Admin'}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                    title="Keluar dari Sistem"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Quick Actions (Backup & DB Status) inside Drawer */}
              <div className="my-2.5 p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100/80 flex items-center justify-between gap-2">
                <DbStatusBadge />
                <BackupButton className="text-xs py-1.5 px-2.5" />
              </div>

              {/* Navigation Items List */}
              <div className="py-2 space-y-1">
                {navigationItems
                  .filter((item) => {
                    if (!userRole) return true;
                    return item.roles.includes(userRole);
                  })
                  .map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileNavOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-center mt-2">
              <p className="font-semibold text-slate-700 text-xs">Pon-Pes Al-Qur’aniyyah</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Versi 1.0 — Production</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
