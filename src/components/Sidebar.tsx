'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  FileUp,
  UserCheck,
  Users,
  Receipt,
  Award,
  CreditCard,
  Wallet,
  FileSpreadsheet,
  Settings,
  Video,
  ClipboardList,
} from 'lucide-react';

export const navigationItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Import Data PPDB', href: '/import', icon: FileUp },
  { name: 'Data Pendaftar', href: '/pendaftar', icon: ClipboardList },
  { name: 'Data Siswa', href: '/siswa', icon: Users },
  { name: 'Tes Wawancara', href: '/wawancara', icon: Video },
  { name: 'Pembelian Formulir', href: '/formulir', icon: Receipt },
  { name: 'Rekomendasi', href: '/rekomendasi', icon: Award },
  { name: 'Status Rekening', href: '/rekening', icon: CreditCard },
  { name: 'Daftar Ulang', href: '/daftar-ulang', icon: UserCheck },
  { name: 'Keuangan PPDB', href: '/keuangan', icon: Wallet },
  { name: 'Laporan & Print', href: '/laporan', icon: FileSpreadsheet },
  { name: 'Pengaturan Master', href: '/pengaturan', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed } = useApp();

  return (
    <aside
      className={`bg-white border-r border-slate-200/80 min-h-[calc(100vh-57px)] hidden lg:flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'w-20 p-2.5 items-center' : 'w-64 p-4'
      }`}
    >
      <div className="w-full">
        {!isSidebarCollapsed && (
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Menu Utama
          </div>
        )}
        <nav className="space-y-1 w-full">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/pendaftar' && pathname === '/draft');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isSidebarCollapsed ? item.name : undefined}
                className={`flex items-center rounded-xl text-sm font-medium transition-all ${
                  isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                />
                {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Branding Badge */}
      {!isSidebarCollapsed ? (
        <div className="mt-6 p-4 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50 rounded-2xl border border-emerald-100/70 text-xs text-center shadow-xs">
          <img
            src="/assets/logo/logo-emblem.png"
            alt="Logo Pesantren Al-Qur'aniyyah"
            width={56}
            height={56}
            style={{ width: '56px', height: '56px' }}
            className="w-14 h-14 object-contain mx-auto mb-2 filter drop-shadow-sm"
          />
          <div className="font-bold text-slate-900 text-xs">Pon-Pes Al-Qur’aniyyah</div>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
            Pondok Pesantren & Lembaga Pendidikan Islam Terpadu
          </p>
        </div>
      ) : (
        <div className="mt-auto py-3 text-center">
          <img
            src="/assets/logo/logo-emblem.png"
            alt="Logo"
            width={32}
            height={32}
            className="w-8 h-8 object-contain mx-auto filter drop-shadow-sm"
            title="Pon-Pes Al-Qur'aniyyah"
          />
        </div>
      )}
    </aside>
  );
}
