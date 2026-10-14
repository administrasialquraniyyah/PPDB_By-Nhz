'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  academicYear?: string;
}

export default function PrintHeader({ title, subtitle, academicYear }: PrintHeaderProps) {
  const { selectedYearName } = useApp();
  const yearText = academicYear || selectedYearName;

  return (
    <div className="print-only mb-6 pb-4 border-b-2 border-slate-900">
      <div className="flex items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 shrink-0 flex items-center justify-center">
          <img
            src="/assets/logo/logo-emblem.png"
            alt="Logo Pesantren"
            width={64}
            height={64}
            style={{ width: '64px', height: '64px' }}
            className="w-16 h-16 object-contain"
          />
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-700 font-bold">
            YAYASAN PENDIDIKAN ISLAM
          </div>
          <div className="text-xl font-black tracking-wide text-slate-900 mt-0.5">
            PONDOK PESANTREN AL-QUR’ANIYYAH
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5 max-w-xl mx-auto">
            Komp. Perumahan Jurangmangu Barat, Kec. Pondok Aren, Kota Tangerang Selatan, Banten
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-300 text-center">
        <h1 className="text-base font-bold text-slate-900 uppercase">{title}</h1>
        {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
        <div className="text-xs font-semibold text-emerald-800 mt-1">
          Tahun Pelajaran: {yearText}
        </div>
      </div>
    </div>
  );
}
