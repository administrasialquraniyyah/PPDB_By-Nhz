'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseBrowser';
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
  Video,
  UserPlus,
  LogOut,
  Shield,
  Building2,
} from 'lucide-react';

export const navigationItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['ADMIN', 'PANITIA', 'UNIT'] },
  { name: 'Import Data PPDB', href: '/import', icon: FileUp, roles: ['ADMIN', 'PANITIA', 'UNIT'] },
  { name: 'Data Siswa Pendaftar', href: '/pendaftar', icon: UserPlus, roles: ['ADMIN', 'PANITIA', 'UNIT', 'PEWAWANCARA'] },
  { name: 'Pembelian Formulir', href: '/formulir', icon: Receipt, roles: ['ADMIN'] },
  { name: 'Tes Wawancara', href: '/wawancara', icon: Video, roles: ['ADMIN', 'PANITIA', 'UNIT', 'PEWAWANCARA'] },
  { name: 'Data Siswa', href: '/siswa', icon: Users, roles: ['ADMIN', 'PANITIA', 'UNIT'] },
  { name: 'Daftar Ulang', href: '/daftar-ulang', icon: UserCheck, roles: ['ADMIN'] },
  { name: 'Status Rekening', href: '/rekening', icon: CreditCard, roles: ['ADMIN'] },
  { name: 'Rekomendasi', href: '/rekomendasi', icon: Award, roles: ['ADMIN'] },
  { name: 'Keuangan PPDB', href: '/keuangan', icon: Wallet, roles: ['ADMIN'] },
  { name: 'Laporan & Print', href: '/laporan', icon: FileSpreadsheet, roles: ['ADMIN'] },
  { name: 'Draft Siswa', href: '/draft', icon: Clock, roles: ['ADMIN'] },
  { name: 'Pengaturan Master', href: '/pengaturan', icon: Settings, roles: ['ADMIN'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<'ADMIN' | 'PANITIA' | 'UNIT' | 'PEWAWANCARA' | null>(null);
  const [userRoleLabel, setUserRoleLabel] = useState<string>('Memuat...');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [jenjangScope, setJenjangScope] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        if (json.success && json.user) {
          setUserRole(json.user.role);
          setUserRoleLabel(json.user.roleLabel || json.user.role);
          setUserEmail(json.user.email);
          setJenjangScope(json.user.jenjangScope);
        } else {
          // Fallback reading from client supabase session
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            setUserEmail(user.email);
            const emailLower = user.email.toLowerCase();
            if (emailLower.includes('unit.sd') || emailLower.startsWith('sd@')) {
              setUserRole('UNIT');
              setJenjangScope('SD');
              setUserRoleLabel('Unit SD');
            } else if (emailLower.includes('panitia')) {
              setUserRole('PANITIA');
              setUserRoleLabel('Panitia PPDB');
            } else if (emailLower.includes('penguji') || emailLower.includes('pewawancara')) {
              setUserRole('PEWAWANCARA');
              setUserRoleLabel('Pewawancara');
            } else {
              setUserRole('ADMIN');
              setUserRoleLabel('Super Admin');
            }
          }
        }
      } catch (e) {
        setUserRole('ADMIN');
        setUserRoleLabel('Super Admin');
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
      router.refresh();
      router.push('/login');
    } catch (e) {
      router.push('/login');
    }
  };

  const visibleItems = navigationItems.filter((item) => {
    if (!userRole) return true; // Show while loading or default
    return item.roles.includes(userRole);
  });

  if (pathname === '/login') return null;

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-57px)] p-4 hidden lg:flex lg:flex-col justify-between shrink-0">
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
          <span>Menu Navigasi</span>
          {userRole && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              userRole === 'ADMIN'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : userRole === 'UNIT'
                ? 'bg-teal-50 text-teal-800 border-teal-300'
                : userRole === 'PANITIA'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-purple-50 text-purple-800 border-purple-200'
            }`}>
              {userRoleLabel}
            </span>
          )}
        </div>
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.name}</span>
                {item.name === 'Data Siswa' && jenjangScope && (
                  <span className="ml-auto text-[9px] font-extrabold bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded">
                    {jenjangScope}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-100 space-y-2">
        <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
            userRole === 'UNIT' ? 'bg-teal-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            {userRole === 'UNIT' ? <Building2 className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-slate-800 truncate">
              {userRoleLabel}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {userEmail || 'Akun Terautentikasi'}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Keluar Sistem</span>
        </button>
      </div>
    </aside>
  );
}
