'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import DbStatusBadge from './DbStatusBadge';
import YearSelector from './YearSelector';
import BackupButton from './BackupButton';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  const { setIsMobileNavOpen } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 py-2 sm:px-6">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
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

        {/* Right: Academic Year Selector, Backup Button & Database Health Indicator */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <YearSelector />
          <BackupButton />
          <DbStatusBadge />
        </div>
      </div>
    </header>
  );
}
