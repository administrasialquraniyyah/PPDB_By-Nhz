'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { navigationItems } from './Sidebar';
import {
  LayoutDashboard,
  Users,
  Wallet,
  FileSpreadsheet,
  X,
  FileUp,
} from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();
  const { isMobileNavOpen, setIsMobileNavOpen } = useApp();
  const [userRole, setUserRole] = useState<'ADMIN' | 'PANITIA' | 'UNIT' | 'PEWAWANCARA' | null>(null);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.user) {
          setUserRole(d.user.role);
        }
      })
      .catch(() => {});
  }, []);

  // Bottom quick links based on role
  const quickLinks = userRole === 'ADMIN'
    ? [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Import', href: '/import', icon: FileUp },
        { name: 'Siswa', href: '/siswa', icon: Users },
        { name: 'Keuangan', href: '/keuangan', icon: Wallet },
        { name: 'Laporan', href: '/laporan', icon: FileSpreadsheet },
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-1.5 px-3 flex items-center justify-around lg:hidden no-print shadow-lg">
        {quickLinks.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
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
          <div className="fixed inset-y-0 left-0 w-72 max-w-full bg-white shadow-2xl p-4 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                    <img
                      src="/assets/logo/logo-emblem.png"
                      alt="Logo Al-Qur'aniyyah"
                      width={38}
                      height={38}
                      style={{ width: '38px', height: '38px' }}
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
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-3 space-y-1">
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
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 font-semibold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-center">
              <img
                src="/assets/logo/logo-emblem.png"
                alt="Logo Pesantren"
                width={48}
                height={48}
                style={{ width: '48px', height: '48px', maxWidth: '48px', maxHeight: '48px' }}
                className="w-12 h-12 object-contain mx-auto mb-1.5 opacity-95"
              />
              <p className="font-semibold text-slate-700 text-xs">Pondok Pesantren Al-Qur’aniyyah</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Versi 1.0 — Production Ready</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
