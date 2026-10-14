'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import PrintHeader from '@/components/PrintHeader';
import { formatCurrency, formatDate } from '@/lib/formatters';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  RefreshCw,
  Users,
  CheckCircle2,
  Calendar,
  GraduationCap,
  Award,
  CreditCard,
  UserCheck,
  Wallet,
} from 'lucide-react';

export default function LaporanPage() {
  const { selectedYearId, selectedYearName } = useApp();

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [jenjang, setJenjang] = useState('');
  const [gelombang, setGelombang] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('');
  const [statusRekening, setStatusRekening] = useState('');
  const [statusDaftarUlang, setStatusDaftarUlang] = useState('');
  const [hasRekomendasi, setHasRekomendasi] = useState('');

  const fetchLaporanData = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('academicYearId', selectedYearId);
      params.append('status', 'ACTIVE');
      if (jenjang) params.append('jenjang', jenjang);
      if (gelombang) params.append('gelombang', gelombang);
      if (jenisKelamin) params.append('jenisKelamin', jenisKelamin);
      if (statusRekening) params.append('statusRekening', statusRekening);
      if (statusDaftarUlang) params.append('statusDaftarUlang', statusDaftarUlang);
      if (hasRekomendasi) params.append('hasRekomendasi', hasRekomendasi);

      const res = await fetch(`/api/students?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setStudents(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaporanData();
  }, [
    selectedYearId,
    jenjang,
    gelombang,
    jenisKelamin,
    statusRekening,
    statusDaftarUlang,
    hasRekomendasi,
  ]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const headers = [
      'No',
      'Nama Santri Baru',
      'NIS / No Induk',
      'NIK',
      'NISN',
      'Jenjang',
      'Gelombang',
      'Jenis Kelamin',
      'Tempat Lahir',
      'Tanggal Lahir',
      'No HP / WhatsApp',
      'Alamat Siswa',
      'Asal Sekolah',
      'Nama Ayah',
      'Nama Ibu',
      'Tarif Formulir (Rp)',
      'Status Formulir',
      'Status Rekening',
      'Nomor Rekening',
      'Status Daftar Ulang',
      'Nominal Daftar Ulang (Rp)',
      'Metode DU',
      'Pemberi Rekomendasi',
      'Kategori Rekomendasi',
    ];

    const rows = students.map((s, idx) => [
      idx + 1,
      s.namaLengkap,
      s.noInduk || '',
      s.nik || '',
      s.nisn || '',
      s.jenjang,
      s.gelombang,
      s.jenisKelamin || '',
      s.tempatLahir || '',
      s.tanggalLahir || '',
      s.noHp || '',
      s.alamat || '',
      s.asalSekolah || '',
      s.namaAyah || '',
      s.namaIbu || '',
      s.formPayment?.nominalAktual || 0,
      s.formPayment?.status || 'Lunas',
      s.bankAccount?.status || 'Belum dibuat',
      s.bankAccount?.accountNumber || '',
      s.reRegistration?.status || 'Belum',
      s.reRegistration?.amount || 0,
      s.reRegistration?.paymentMethod || '',
      s.recommendation?.recommenderName || '',
      s.recommendation?.recommenderCategory || '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap_PPDB');
    XLSX.writeFile(wb, `Laporan_PPDB_Lengkap_${selectedYearName.replace('/', '-')}.xlsx`);
  };

  // Aggregates of the filtered data
  const totalFormulir = students.reduce((acc, s) => acc + (s.formPayment?.nominalAktual || 0), 0);
  const totalDU = students.reduce((acc, s) => acc + (s.reRegistration?.amount || 0), 0);
  const countDU = students.filter((s) => s.reRegistration?.status === 'Sudah').length;
  const countRek = students.filter((s) => s.bankAccount?.status === 'Sudah dibuat').length;

  return (
    <div className="space-y-5 print-container">
      <PrintHeader
        title="Laporan & Rekapitulasi Data PPDB"
        subtitle={`Filter: ${jenjang || 'Semua Jenjang'} • ${gelombang || 'Semua Gelombang'} • Total ${students.length} Santri`}
      />

      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Laporan PPDB Terpadu
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {selectedYearName}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekapitulasi resmi PPDB dengan filter custom, export Excel, dan cetak print ber-kop surat yayasan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={students.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={students.length === 0}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm no-print space-y-2">
        <div className="text-xs font-bold text-slate-700">Filter Laporan:</div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
          <select
            value={jenjang}
            onChange={(e) => setJenjang(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
          >
            <option value="">Semua Jenjang</option>
            <option value="TK">TK IT</option>
            <option value="SD">SD IT</option>
            <option value="SMP">SMP IT</option>
            <option value="SMA">SMA IT</option>
          </select>

          <select
            value={gelombang}
            onChange={(e) => setGelombang(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
          >
            <option value="">Semua Gelombang</option>
            <option value="Gelombang 1">Gelombang 1</option>
            <option value="Gelombang 2">Gelombang 2</option>
          </select>

          <select
            value={jenisKelamin}
            onChange={(e) => setJenisKelamin(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
          >
            <option value="">Semua Gender</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </select>

          <select
            value={statusRekening}
            onChange={(e) => setStatusRekening(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
          >
            <option value="">Status Rekening</option>
            <option value="Sudah dibuat">Sudah Dibuat</option>
            <option value="Belum dibuat">Belum Dibuat</option>
          </select>

          <select
            value={statusDaftarUlang}
            onChange={(e) => setStatusDaftarUlang(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
          >
            <option value="">Status DU</option>
            <option value="Sudah">Sudah DU</option>
            <option value="Belum">Belum DU</option>
            <option value="Batal Masuk">Batal Masuk</option>
          </select>

          <select
            value={hasRekomendasi}
            onChange={(e) => setHasRekomendasi(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
          >
            <option value="">Rekomendasi</option>
            <option value="true">Ada Rekomendasi</option>
            <option value="false">Tanpa Rekomendasi</option>
          </select>
        </div>
      </div>

      {/* Report Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">Santri Sesuai Filter</span>
          <div className="font-extrabold text-lg text-slate-900 mt-0.5">{students.length} Orang</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">Rekening Siap</span>
          <div className="font-extrabold text-lg text-purple-700 mt-0.5">
            {countRek} / {students.length}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">Sudah Daftar Ulang</span>
          <div className="font-extrabold text-lg text-emerald-700 mt-0.5">
            {countDU} / {students.length}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">Total Penerimaan DU</span>
          <div className="font-extrabold text-lg text-emerald-800 mt-0.5">
            {formatCurrency(totalDU)}
          </div>
        </div>
      </div>

      {/* Main Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
            <span className="text-xs">Menyiapkan laporan...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">Tidak ada data untuk filter ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-2.5 font-bold">No</th>
                  <th className="py-2.5 px-2.5 font-bold">Nama Santri</th>
                  <th className="py-2.5 px-2.5 font-bold">Jenjang</th>
                  <th className="py-2.5 px-2.5 font-bold">NIS</th>
                  <th className="py-2.5 px-2.5 font-bold">L/P</th>
                  <th className="py-2.5 px-2.5 font-bold">Formulir</th>
                  <th className="py-2.5 px-2.5 font-bold">Rekening Bank</th>
                  <th className="py-2.5 px-2.5 font-bold">Daftar Ulang</th>
                  <th className="py-2.5 px-2.5 font-bold">Rekomendasi</th>
                  <th className="py-2.5 px-2.5 font-bold">No WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {students.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2 px-2.5 font-semibold text-slate-900">{s.namaLengkap}</td>
                    <td className="py-2 px-2.5 font-bold text-slate-700">{s.jenjang}</td>
                    <td className="py-2 px-2.5 font-mono text-slate-600">{s.noInduk || '-'}</td>
                    <td className="py-2 px-2.5 text-slate-700">{s.jenisKelamin || '-'}</td>
                    <td className="py-2 px-2.5 font-mono">
                      {formatCurrency(s.formPayment?.nominalAktual || 0)}
                    </td>
                    <td className="py-2 px-2.5 font-mono">
                      {s.bankAccount?.status === 'Sudah dibuat' ? (
                        <span className="text-purple-700 font-semibold">
                          {s.bankAccount.accountNumber || 'Sudah'}
                        </span>
                      ) : (
                        <span className="text-slate-400">Belum</span>
                      )}
                    </td>
                    <td className="py-2 px-2.5">
                      {s.reRegistration?.status === 'Sudah' ? (
                        <div className="font-semibold text-emerald-700">
                          Sudah ({formatCurrency(s.reRegistration.amount)})
                        </div>
                      ) : s.reRegistration?.status === 'Batal Masuk' ? (
                        <span className="text-rose-600">Batal</span>
                      ) : (
                        <span className="text-amber-600">Belum</span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-slate-700">
                      {s.recommendation?.recommenderName || '-'}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-slate-600">{s.noHp || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Print Signatures */}
        <div className="print-only mt-10 pt-4 grid grid-cols-2 text-center text-xs">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold mt-1">Pimpinan Pondok Pesantren</p>
            <div className="h-16" />
            <p className="font-bold underline">Ust. Ahmad / Pimpinan</p>
          </div>
          <div>
            <p>Tangerang Selatan, {formatDate(new Date())}</p>
            <p className="font-bold mt-1">Ketua Panitia PPDB</p>
            <div className="h-16" />
            <p className="font-bold underline">Panitia PPDB Al-Qur&apos;aniyyah</p>
          </div>
        </div>
      </div>
    </div>
  );
}
