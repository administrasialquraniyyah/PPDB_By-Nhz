'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileUp,
  Clock,
  Users,
  Receipt,
  Award,
  CreditCard,
  UserCheck,
  Wallet,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';

export const navigationItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Import Data PPDB', href: '/import', icon: FileUp },
  { name: 'Draft Siswa', href: '/draft', icon: Clock },
  { name: 'Data Siswa', href: '/siswa', icon: Users },
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

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-57px)] p-4 hidden lg:block shrink-0">
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
        Menu Utama
      </div>
      <nav className="space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-emerald-700' : 'text-slate-400'
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 p-4 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50 rounded-2xl border border-emerald-100/70 text-xs text-center shadow-sm">
        <img
          src="/assets/logo/logo-emblem.png"
          alt="Logo Pesantren Al-Qur'aniyyah"
          width={64}
          height={64}
          style={{ width: '64px', height: '64px', maxWidth: '64px', maxHeight: '64px' }}
          className="w-16 h-16 object-contain mx-auto mb-2 filter drop-shadow-sm"
        />
        <div className="font-bold text-slate-900 text-xs">Pon-Pes Al-Qur’aniyyah</div>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
          Pondok Pesantren & Lembaga Pendidikan Islam Terpadu
        </p>
      </div>
    </aside>
  );
}
