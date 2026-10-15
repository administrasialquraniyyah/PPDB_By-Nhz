'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import { formatDate } from '@/lib/formatters';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  Edit2,
  Calendar,
  Receipt,
  CheckSquare,
  Square,
  Eye,
  Copy,
  Check,
  Printer,
  Sparkles,
  User,
  ShieldCheck,
  Phone,
} from 'lucide-react';

export default function RekeningPage() {
  const { selectedYearId, selectedYearName } = useApp();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, countSudah: 0, countBelum: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState('');

  // Export Modal & Validation
  const [showExportModal, setShowExportModal] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [exportJenjang, setExportJenjang] = useState('');
  const [startCardId, setStartCardId] = useState('1480001301');

  // Checkbox Selection for Tagihan
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showTagihanModal, setShowTagihanModal] = useState(false);
  const [tagihanMode, setTagihanMode] = useState<'selected' | 'all'>('selected');
  const [downloadingTagihan, setDownloadingTagihan] = useState(false);

  // Preview Card Modal (Siap Screenshot untuk Wali Santri)
  const [selectedCardAccount, setSelectedCardAccount] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Mass Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Single Edit Modal
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAccounts = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('academicYearId', selectedYearId);
      if (statusFilter) params.append('status', statusFilter);
      if (jenjangFilter) params.append('jenjang', jenjangFilter);

      const res = await fetch(`/api/bank-accounts?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setAccounts(json.data || []);
        setSummary(json.summary || { total: 0, countSudah: 0, countBelum: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [selectedYearId, statusFilter, jenjangFilter]);

  const filteredAccounts = accounts.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.student?.namaLengkap?.toLowerCase().includes(q) ||
      a.accountNumber?.toLowerCase().includes(q) ||
      a.idNasabah?.toLowerCase().includes(q) ||
      a.student?.noHp?.toLowerCase().includes(q) ||
      a.student?.noHpAyah?.toLowerCase().includes(q) ||
      a.student?.noHpIbu?.toLowerCase().includes(q) ||
      a.student?.username?.toLowerCase().includes(q) ||
      a.student?.idKartu?.toLowerCase().includes(q)
    );
  });

  const getDraftTagihan = (jenjang: string, jk?: string) => {
    const j = (jenjang || 'SMP').toUpperCase();
    const isP = (jk || '').toUpperCase().startsWith('P');
    if (j.includes('SMA')) {
      return {
        kelas: 'Kelas 10 SMA IT',
        items: [
          { nama: 'SPP Bulan Juli', nominal: 1650000 },
          { nama: 'Perlengkapan Santri', nominal: 3600000 },
          { nama: 'Kegiatan Tahunan', nominal: 1000000 },
          { nama: 'Peralatan Santri', nominal: 2100000 },
          { nama: 'Buku Paket Pembelajaran', nominal: 2100000 },
          { nama: 'Uang Pembangunan / Gedung', nominal: 6000000 },
        ],
        total: 16450000,
      };
    }
    if (j.includes('SD')) {
      const perlengkapan = isP ? 1450000 : 1300000;
      const total = 550000 + perlengkapan + 100000 + 1600000 + 2300000 + 5500000;
      return {
        kelas: 'Kelas 1 SD IT',
        items: [
          { nama: 'SPP Bulan Juli', nominal: 550000 },
          { nama: `Perlengkapan Santri (${isP ? 'Putri' : 'Putra'})`, nominal: perlengkapan },
          { nama: 'Kegiatan Tahunan', nominal: 100000 },
          { nama: 'Peralatan Santri', nominal: 1600000 },
          { nama: 'Buku Paket Pembelajaran', nominal: 2300000 },
          { nama: 'Uang Pembangunan / Gedung', nominal: 5500000 },
        ],
        total,
      };
    }
    if (j.includes('TK') || j.includes('PAUD')) {
      return {
        kelas: 'Kelas TK A IT',
        items: [
          { nama: 'SPP Bulan Juli', nominal: 400000 },
          { nama: 'Perlengkapan Santri', nominal: 1050000 },
          { nama: 'Peralatan Santri', nominal: 700000 },
          { nama: 'Buku Paket Pembelajaran', nominal: 1000000 },
          { nama: 'Uang Pembangunan / Gedung', nominal: 1500000 },
        ],
        total: 4650000,
      };
    }
    // Default SMP
    return {
      kelas: 'Kelas 7 SMP IT',
      items: [
        { nama: 'SPP Bulan Juli', nominal: 1600000 },
        { nama: 'Perlengkapan Santri', nominal: 3300000 },
        { nama: 'Kegiatan Tahunan', nominal: 900000 },
        { nama: 'Peralatan Santri', nominal: 1950000 },
        { nama: 'Buku Paket Pembelajaran', nominal: 2100000 },
        { nama: 'Uang Pembangunan / Gedung', nominal: 6000000 },
      ],
      total: 15850000,
    };
  };

  const handleCopyWhatsApp = (account: any) => {
    const s = account.student;
    const tagihan = getDraftTagihan(s?.jenjang, s?.jenisKelamin);
    const validNoInduk = s?.noInduk && !/^(p|l|perempuan|laki-laki)$/i.test(s.noInduk) ? s.noInduk : '';
    const idSiswa = s?.nisn && validNoInduk ? `${s.nisn} (NIS: ${validNoInduk})` : s?.nisn || validNoInduk || '-';
    const text = `*KARTU INFORMASI SANTRI & DRAFT TAGIHAN AWAL*
*PONDOK PESANTREN AL-QUR'ANIYYAH*
Tahun Ajaran: ${selectedYearName}
─────────────────────────────
👤 *DATA SANTRI*
• *Nama Santri:* ${s?.namaLengkap || '-'}
• *Jenjang / Kelas:* ${s?.jenjang || '-'} (${tagihan.kelas})
• *NISN / NIS:* ${idSiswa}
• *NIK:* ${s?.nik || '-'}
• *Orang Tua:* ${s?.namaAyah || s?.namaIbu || '-'}
• *No. HP/WA:* ${s?.noHp || s?.noHpAyah || s?.noHpIbu || '-'}

🏦 *DATA REKENING BANK & APLIKASI*
• *Bank:* ${account.bankName || 'Bank Syariah Indonesia (BSI)'}
• *Nomor Rekening:* ${account.accountNumber || '-'}
• *ID Nasabah BSI:* ${account.idNasabah || '-'}
• *ID Kartu CBS:* ${s?.idKartu || '-'}
• *Username Aplikasi:* ${s?.username || '-'}
• *Password Aplikasi:* ${s?.password || '-'}

📋 *DRAFT ESTIMASI TAGIHAN AWAL*
${tagihan.items.map((it) => `• ${it.nama}: Rp ${it.nominal.toLocaleString('id-ID')}`).join('\n')}
─────────────────────────────
💰 *TOTAL ESTIMASI:* Rp ${tagihan.total.toLocaleString('id-ID')}

📌 *Catatan:*
Pembayaran tagihan dapat disalurkan melalui Nomor Rekening / Virtual Account BSI di atas. Simpan bukti transfer untuk verifikasi.
Terima kasih.`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleOpenExportModal = async () => {
    setShowExportModal(true);
    setValidating(true);
    try {
      const params = new URLSearchParams();
      params.append('academicYearId', selectedYearId);
      params.append('statusRekening', 'Belum dibuat');
      params.append('mode', 'validate');
      if (exportJenjang) params.append('jenjang', exportJenjang);

      const res = await fetch(`/api/bank-accounts/export?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setValidationData(json);
      }

      // Load saved default ID kartu setting if available
      try {
        const sRes = await fetch('/api/settings');
        const sJson = await sRes.json();
        if (sJson.data?.default_id_kartu) {
          setStartCardId(sJson.data.default_id_kartu);
        }
      } catch (e) {}
    } catch (err) {
      console.error(err);
    } finally {
      setValidating(false);
    }
  };

  const handleDownloadExport = () => {
    const params = new URLSearchParams();
    params.append('academicYearId', selectedYearId);
    params.append('statusRekening', 'Belum dibuat');
    params.append('mode', 'download');
    if (exportJenjang) params.append('jenjang', exportJenjang);
    if (startCardId) params.append('startCardId', startCardId.trim());

    window.open(`/api/bank-accounts/export?${params.toString()}`, '_blank');
    setShowExportModal(false);
  };

  const eligibleAccounts = filteredAccounts.filter(
    (a) => a.status === 'Sudah dibuat' && (a.accountNumber || a.idNasabah)
  );

  const isAllEligibleSelected =
    eligibleAccounts.length > 0 &&
    eligibleAccounts.every((a) => selectedStudentIds.includes(a.studentId || a.student?.id));

  const handleToggleSelectAll = () => {
    if (isAllEligibleSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(eligibleAccounts.map((a) => a.studentId || a.student?.id));
    }
  };

  const handleToggleSelect = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleDownloadTagihan = async () => {
    setDownloadingTagihan(true);
    try {
      const targetIds =
        tagihanMode === 'selected'
          ? selectedStudentIds
          : eligibleAccounts.map((a) => a.studentId || a.student?.id);

      if (targetIds.length === 0) {
        alert('Pilih minimal satu santri yang sudah memiliki rekening.');
        setDownloadingTagihan(false);
        return;
      }

      const res = await fetch('/api/bank-accounts/tagihan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          studentIds: targetIds,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal membuat file tagihan');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Format_Tagihan_BSI_${selectedYearName.replace('/', '-')}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowTagihanModal(false);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat mengunduh tagihan');
    } finally {
      setDownloadingTagihan(false);
    }
  };

  const handleMassImportRekening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);

    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('academicYearId', selectedYearId);

      const res = await fetch('/api/bank-accounts/import-numbers', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        setImportResult(json);
        await fetchAccounts();
        setImportFile(null);
      } else {
        alert(json.error || 'Gagal mengimpor nomor rekening');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat import');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/bank-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAccount),
      });
      const json = await res.json();
      if (json.success) {
        setEditingAccount(null);
        await fetchAccounts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Status Pembuatan Rekening Bank
            </h1>
            <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {summary.countSudah} / {summary.total} Selesai
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pengelolaan pembukaan rekening bank siswa (BSI / EduPay) untuk tahun ajaran {selectedYearName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setImportResult(null);
              setShowImportModal(true);
            }}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4 text-purple-600" />
            <span>Import No. Rekening Massal</span>
          </button>

          <button
            onClick={() => setShowTagihanModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <Receipt className="w-4 h-4" />
            <span>Buatkan Tagihan</span>
            {selectedStudentIds.length > 0 && (
              <span className="bg-emerald-900 text-emerald-100 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                {selectedStudentIds.length}
              </span>
            )}
          </button>

          <button
            onClick={handleOpenExportModal}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Template Pembuatan Rekening (CBS)</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Siswa Aktif</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{summary.total} Santri</div>
          <span className="text-[10px] text-slate-400">Tahun {selectedYearName}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Rekening Sudah Jadi</span>
          <div className="text-xl font-bold text-purple-700 mt-1">{summary.countSudah} Rekening</div>
          <span className="text-[10px] text-purple-600 font-medium">
            {summary.total > 0 ? Math.round((summary.countSudah / summary.total) * 100) : 0}% selesai
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Belum Dibuatkan</span>
          <div className="text-xl font-bold text-amber-600 mt-1">{summary.countBelum} Santri</div>
          <span className="text-[10px] text-amber-600 font-medium">Perlu diexport ke bank</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa, nomor rekening, atau no. telepon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={jenjangFilter}
            onChange={(e) => setJenjangFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
          >
            <option value="">Semua Jenjang</option>
            <option value="TK">TK IT</option>
            <option value="SD">SD IT</option>
            <option value="SMP">SMP IT</option>
            <option value="SMA">SMA IT</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
          >
            <option value="">Semua Status Rekening</option>
            <option value="Belum dibuat">Belum Dibuat</option>
            <option value="Sudah dibuat">Sudah Dibuat</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
            <span className="text-xs font-medium">Memuat data rekening...</span>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-sm">Tidak ada data rekening</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1320px]">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80 whitespace-nowrap uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="py-3.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllEligibleSelected}
                      onChange={handleToggleSelectAll}
                      disabled={eligibleAccounts.length === 0}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      title={isAllEligibleSelected ? 'Batalkan pilihan semua' : 'Pilih semua yang ber-rekening'}
                    />
                  </th>
                  <th className="py-3.5 px-3 w-12 text-center">No</th>
                  <th className="py-3.5 px-4 min-w-[210px]">Nama Siswa</th>
                  <th className="py-3.5 px-3 w-20 text-center">Jenjang</th>
                  <th className="py-3.5 px-3 min-w-[150px]">Nomor Telepon</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Akun Aplikasi & Kartu</th>
                  <th className="py-3.5 px-3 min-w-[140px] text-center">Status Rekening</th>
                  <th className="py-3.5 px-4 min-w-[170px]">Nomor Rekening</th>
                  <th className="py-3.5 px-3 min-w-[140px]">ID Nasabah</th>
                  <th className="py-3.5 px-3 min-w-[90px] text-center">Bank</th>
                  <th className="py-3.5 px-3 min-w-[130px]">Tanggal Pembuatan</th>
                  <th className="py-3.5 px-4 min-w-[140px] text-right pr-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredAccounts.map((a, idx) => {
                  const sId = a.studentId || a.student?.id;
                  const isEligible = a.status === 'Sudah dibuat' && (!!a.accountNumber || !!a.idNasabah);
                  const isChecked = selectedStudentIds.includes(sId);
                  const bankShort = a.bankName && a.bankName.includes('BSI') ? 'BSI' : (a.bankName || 'BSI');
                  const phone = a.student?.noHp || a.student?.noHpAyah || a.student?.noHpIbu;
                  return (
                  <tr key={a.id} className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-purple-50/40' : ''}`}>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {isEligible ? (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(sId)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      ) : (
                        <span className="text-slate-300 font-mono text-xs select-none" title="Belum memiliki nomor rekening / ID Nasabah">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px] whitespace-nowrap">{idx + 1}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-sm">{a.student?.namaLengkap}</div>
                      {a.notes && <div className="text-[10px] text-slate-400 mt-0.5">{a.notes}</div>}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md font-bold text-xs bg-slate-100 text-slate-700 border border-slate-200/60">
                        {a.student?.jenjang || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-xs text-slate-800">{phone}</span>
                          {a.student?.noHpAyah && !a.student?.noHp && (
                            <span className="text-[10px] text-slate-400 font-sans">(Ayah)</span>
                          )}
                          {a.student?.noHpIbu && !a.student?.noHp && !a.student?.noHpAyah && (
                            <span className="text-[10px] text-slate-400 font-sans">(Ibu)</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 select-none">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {a.student?.username || a.student?.password || a.student?.idKartu ? (
                        <div className="space-y-0.5 font-mono text-[11px]">
                          {a.student?.username && (
                            <div className="text-slate-800 font-medium">
                              <span className="text-slate-400 font-sans text-[10px]">User:</span> {a.student.username}
                            </div>
                          )}
                          {a.student?.password && (
                            <div className="text-slate-600 text-[10px]">
                              <span className="text-slate-400 font-sans text-[9px]">Pass:</span> {a.student.password}
                            </div>
                          )}
                          {a.student?.idKartu && (
                            <div className="text-purple-700 font-bold text-[10px]">
                              <span className="text-purple-400 font-sans text-[9px]">Kartu:</span> {a.student.idKartu}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Belum diset</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          a.status === 'Sudah dibuat'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'Sudah dibuat' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-purple-900 text-sm tracking-wide">
                      {a.accountNumber || '-'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {a.idNasabah ? (
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 text-xs">
                          {a.idNasabah}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-mono text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60" title={a.bankName || 'Bank Syariah Indonesia (BSI)'}>
                        {bankShort}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {a.createdDate ? formatDate(a.createdDate) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right pr-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedCardAccount(a)}
                          title="Preview Card Santri & Draft Tagihan (Siap Screenshot)"
                          className="p-1.5 text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg font-semibold transition border border-slate-200/60 shadow-sm"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingAccount({ ...a, student: { ...a.student } })}
                          className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 rounded-lg font-semibold transition border border-slate-200/60 shadow-sm flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EXPORT VALIDATION MODAL */}
      {showExportModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowExportModal(false)}
          title="Export Pembuatan Rekening (Format CBS / EduPay)"
          description="Sistem akan mencocokkan field database ke format resmi template bank."
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block font-medium text-slate-700 mb-1">
                Filter Jenjang yang Akan Diexport:
              </label>
              <select
                value={exportJenjang}
                onChange={async (e) => {
                  const val = e.target.value;
                  setExportJenjang(val);
                  setValidating(true);
                  const p = new URLSearchParams();
                  p.append('academicYearId', selectedYearId);
                  p.append('statusRekening', 'Belum dibuat');
                  p.append('mode', 'validate');
                  if (val) p.append('jenjang', val);
                  const res = await fetch(`/api/bank-accounts/export?${p.toString()}`);
                  const j = await res.json();
                  if (j.success) setValidationData(j);
                  setValidating(false);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-xs font-semibold"
              >
                <option value="">Semua Jenjang (TK, SD, SMP, SMA)</option>
                <option value="TK">Hanya TK IT</option>
                <option value="SD">Hanya SD IT</option>
                <option value="SMP">Hanya SMP IT</option>
                <option value="SMA">Hanya SMA IT</option>
              </select>
            </div>

            {validating ? (
              <div className="py-6 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-purple-600 mb-1" />
                <span>Memvalidasi kelengkapan data siswa...</span>
              </div>
            ) : validationData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                    <span className="text-slate-500 font-medium">Siswa Siap Export:</span>
                    <div className="text-xl font-bold text-purple-900 mt-0.5">
                      {validationData.summary.total} Santri
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <span className="text-slate-500 font-medium">Data Lengkap:</span>
                    <div className="text-xl font-bold text-emerald-800 mt-0.5">
                      {validationData.summary.completeCount} Santri
                    </div>
                  </div>
                </div>

                {validationData.summary.incompleteCount > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>{validationData.summary.incompleteCount} Siswa belum lengkap datanya:</span>
                    </div>
                    <p className="text-[11px] text-amber-700 mb-2">
                      Beberapa siswa belum memiliki NISN, tempat lahir, atau no HP. Tetap dapat diexport atau diperiksa terlebih dahulu.
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                      {validationData.items
                        .filter((it: any) => !it.isComplete)
                        .slice(0, 10)
                        .map((it: any) => (
                          <div key={it.id} className="flex justify-between bg-white p-1.5 rounded border border-amber-100">
                            <span className="font-sans font-semibold text-slate-800">{it.nama}</span>
                            <span className="text-rose-600 font-sans">Kurang: {it.missingFields.join(', ')}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Input Acuan Nomor ID Kartu Awal */}
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
              <label className="block font-bold text-slate-800 text-xs">
                💳 Acuan Nomor ID Kartu Awal:
              </label>
              <input
                type="text"
                value={startCardId}
                onChange={(e) => setStartCardId(e.target.value)}
                placeholder="Contoh: 1480001301"
                className="w-full px-3 py-2 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono font-bold text-sm text-purple-900 bg-white"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Nomor kartu awal ini akan diisikan ke kolom <strong>ID kartu</strong> dan diurutkan otomatis (+1 per siswa berikutnya) pada template CBS.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDownloadExport}
                disabled={validating || !validationData || validationData.summary.total === 0}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Excel Resmi</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MASS IMPORT REKENING MODAL */}
      {showImportModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowImportModal(false)}
          title="Import Nomor Rekening Bank Massal"
          description="Upload file hasil dari Bank (contoh: Rekening.xlsx). Sistem akan mencocokkan nama siswa dan mengupdate nomor rekening secara otomatis."
          maxWidth="md"
        >
          <form onSubmit={handleMassImportRekening} className="space-y-3 text-xs">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setImportFile(e.target.files[0]);
                }}
                className="hidden"
                id="file-rek"
              />
              <label htmlFor="file-rek" className="cursor-pointer block">
                <Upload className="w-8 h-8 text-purple-600 mx-auto mb-1" />
                <div className="font-semibold text-slate-800">
                  {importFile ? importFile.name : 'Pilih file Rekening.xlsx'}
                </div>
                <span className="text-[10px] text-slate-400">File Excel hasil pembukaan rekening bank</span>
              </label>
            </div>

            {importResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                <div className="font-bold">{importResult.message}</div>
                {importResult.notFoundCount > 0 && (
                  <p className="text-[11px] text-amber-700">
                    {importResult.notFoundCount} nama tidak ditemukan di database tahun ini.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={!importFile || importing}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} />
                {importing ? 'Memproses...' : 'Proses Update Nomor Rekening'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* SINGLE EDIT MODAL */}
      {editingAccount && (
        <Modal
          isOpen={true}
          onClose={() => setEditingAccount(null)}
          title={`Edit Rekening: ${editingAccount.student?.namaLengkap}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Status Pembuatan Rekening</label>
              <select
                value={editingAccount.status}
                onChange={(e) => setEditingAccount({ ...editingAccount, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-semibold"
              >
                <option value="Belum dibuat">Belum Dibuat</option>
                <option value="Sudah dibuat">Sudah Dibuat</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nomor Rekening Siswa
                  <span className="text-slate-400 font-normal text-[10px] ml-1">(Informasi)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 000000538"
                  value={editingAccount.accountNumber || ''}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, accountNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono font-bold text-sm text-purple-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ID Nasabah BSI
                  <span className="text-emerald-700 font-bold text-[10px] ml-1">(Untuk Tagihan)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 1480026000"
                  value={editingAccount.idNasabah || ''}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, idNasabah: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-sm text-emerald-900 bg-emerald-50/40"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 -mt-1">
              💡 <strong>ID Nasabah</strong> ini yang akan otomatis masuk ke file Excel Export Buatkan Tagihan sebagai acuan tagihan BSI.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Bank</label>
                <input
                  type="text"
                  value={editingAccount.bankName || 'Bank Syariah Indonesia (BSI)'}
                  onChange={(e) => setEditingAccount({ ...editingAccount, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tanggal Pembuatan</label>
                <input
                  type="date"
                  value={
                    editingAccount.createdDate
                      ? new Date(editingAccount.createdDate).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, createdDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
            </div>

            {/* Akun Aplikasi & ID Kartu Siswa */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 text-[11px]">Akun Aplikasi Santri & ID Kartu</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Username Aplikasi</label>
                  <input
                    type="text"
                    value={editingAccount.student?.username || ''}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        student: { ...editingAccount.student, username: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    placeholder="Username / Email"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Password Aplikasi</label>
                  <input
                    type="text"
                    value={editingAccount.student?.password || ''}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        student: { ...editingAccount.student, password: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    placeholder="Password"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-0.5">ID Kartu Bank / CBS</label>
                <input
                  type="text"
                  value={editingAccount.student?.idKartu || ''}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      student: { ...editingAccount.student, idKartu: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-purple-900"
                  placeholder="Contoh: 1480001301"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Catatan</label>
              <textarea
                value={editingAccount.notes || ''}
                onChange={(e) => setEditingAccount({ ...editingAccount, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {actionLoading ? 'Menyimpan...' : 'Simpan Rekening'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* PREVIEW CARD SANTRI & DRAFT TAGIHAN AWAL (SIAP SCREENSHOT) */}
      {selectedCardAccount && (() => {
        const student = selectedCardAccount.student;
        const tagihan = getDraftTagihan(student?.jenjang, student?.jenisKelamin);
        return (
          <Modal
            isOpen={true}
            onClose={() => setSelectedCardAccount(null)}
            title="Preview Card Santri & Draft Tagihan Awal"
            description="Tampilan ringkas informasi santri, akun BSI/Aplikasi, dan draft rincian tagihan awal tahun ajaran. Siap di-screenshot atau dikirimkan ke wali santri."
            maxWidth="2xl"
          >
            <div className="space-y-4 text-xs">
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #santri-card-print, #santri-card-print * {
                    visibility: visible;
                  }
                  #santri-card-print {
                    position: fixed;
                    left: 0;
                    top: 0;
                    width: 100%;
                    margin: 0;
                    padding: 24px;
                    box-shadow: none !important;
                    border: 1px solid #10b981 !important;
                  }
                }
              `}</style>

              {/* Quick Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Gunakan tombol di samping untuk kirim ke WhatsApp atau cetak / simpan:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyWhatsApp(selectedCardAccount)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition text-xs"
                  >
                    {copySuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Teks WhatsApp</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1.5 border border-slate-300 transition text-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak / PDF</span>
                  </button>
                </div>
              </div>

              {/* The Visual Card Container - Designed for Clean Screenshots */}
              <div
                id="santri-card-print"
                className="bg-white border-2 border-emerald-600/30 rounded-2xl shadow-md p-5 space-y-4 relative overflow-hidden"
              >
                {/* Decorative Top Accent Bar */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600" />

                {/* Card Header with Pesantren Branding */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xl shadow-inner">
                      🕌
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight leading-tight">
                        PONDOK PESANTREN AL-QUR'ANIYYAH
                      </h3>
                      <p className="text-[11px] text-emerald-700 font-bold tracking-wide uppercase">
                        Kartu Informasi Santri & Draft Tagihan Awal
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-200">
                      T.A {selectedYearName}
                    </span>
                    <div className="text-[10px] font-bold text-slate-500 mt-1">
                      Unit: {student?.jenjang || '-'}
                    </div>
                  </div>
                </div>

                {/* Section 1: Identitas Santri */}
                <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 space-y-2">
                  <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Identitas Santri & Wali</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Nama Lengkap Santri:</span>
                      <span className="font-bold text-slate-900 text-sm">{student?.namaLengkap || '-'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Jenjang & Kelas:</span>
                      <span className="font-bold text-purple-900">
                        {student?.jenjang || '-'} ({tagihan.kelas})
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">NISN / No. Induk (NIS):</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {(() => {
                          const validNoInduk =
                            student?.noInduk && !/^(p|l|perempuan|laki-laki)$/i.test(student.noInduk)
                              ? student.noInduk
                              : '';
                          if (student?.nisn && validNoInduk) {
                            return `${student.nisn} (NIS: ${validNoInduk})`;
                          }
                          return student?.nisn || validNoInduk || '-';
                        })()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">NIK Santri:</span>
                      <span className="font-mono text-slate-800">{student?.nik || '-'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Nama Orang Tua / Wali:</span>
                      <span className="font-semibold text-slate-800">
                        {student?.namaAyah || student?.namaIbu || '-'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">No. HP / WhatsApp:</span>
                      <span className="font-mono font-semibold text-emerald-800">
                        {student?.noHp || student?.noHpAyah || student?.noHpIbu || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Rekening Bank BSI & Akun Aplikasi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Rekening BSI Card */}
                  <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/90 rounded-xl p-3 border border-emerald-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Rekening Bank Syariah Indonesia</span>
                      </span>
                      <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                        BSI
                      </span>
                    </div>

                    <div className="pt-1">
                      <span className="text-[10px] text-emerald-700 block">Nomor Rekening Santri:</span>
                      <span className="font-mono font-extrabold text-slate-900 text-base tracking-wide">
                        {selectedCardAccount.accountNumber || '-'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60">
                      <div>
                        <span className="text-[9px] text-emerald-800 font-medium block">ID Nasabah Tagihan:</span>
                        <span className="font-mono font-bold text-emerald-950 text-xs">
                          {selectedCardAccount.idNasabah || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-800 font-medium block">ID Kartu CBS:</span>
                        <span className="font-mono font-bold text-emerald-950 text-xs">
                          {student?.idKartu || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Akun Aplikasi Santri */}
                  <div className="bg-gradient-to-br from-purple-50/90 to-indigo-50/90 rounded-xl p-3 border border-purple-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                        <span>Akun Aplikasi / Portal Wali</span>
                      </span>
                      <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                        Portal
                      </span>
                    </div>

                    <div className="pt-1">
                      <span className="text-[10px] text-purple-700 block">Username Login:</span>
                      <span className="font-mono font-bold text-purple-950 text-xs select-all">
                        {student?.username || '-'}
                      </span>
                    </div>

                    <div className="pt-0.5 border-t border-purple-200/60">
                      <span className="text-[10px] text-purple-700 block">Password Login:</span>
                      <span className="font-mono font-bold text-purple-950 text-xs select-all">
                        {student?.password || '-'}
                      </span>
                    </div>

                    <p className="text-[9px] text-purple-700 italic pt-0.5">
                      Gunakan akun ini untuk login pada aplikasi wali santri PPDB / EduPay.
                    </p>
                  </div>
                </div>

                {/* Section 3: Draft Rincian Tagihan Awal */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100/90 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Draft Rincian Tagihan Awal Tahun Ajaran</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Standar Pembayaran Awal {student?.jenjang || ''}
                    </span>
                  </div>

                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-1.5 px-3 w-8 text-center font-semibold">No</th>
                        <th className="py-1.5 px-3 text-left font-semibold">Komponen Pembayaran</th>
                        <th className="py-1.5 px-3 text-right font-semibold">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tagihan.items.map((it, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {i + 1}
                          </td>
                          <td className="py-1.5 px-3 font-medium text-slate-800">{it.nama}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900">
                            Rp {it.nominal.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-50/70 font-bold border-t-2 border-emerald-200">
                        <td colSpan={2} className="py-2.5 px-3 text-emerald-950 font-bold text-xs uppercase">
                          Total Estimasi Tagihan Awal
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-900 text-sm">
                          Rp {tagihan.total.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer Notes for Parents */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[10px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-700 flex items-center gap-1">
                    <span>📌 Petunjuk Pembayaran:</span>
                  </div>
                  <p className="leading-relaxed">
                    1. Pembayaran tagihan dapat dilakukan melalui transfer ke Nomor Rekening / Virtual Account BSI di atas.
                  </p>
                  <p className="leading-relaxed">
                    2. Harap simpan bukti transaksi pembayaran dan lakukan konfirmasi ke pihak bendahara pesantren.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedCardAccount(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* BUATKAN TAGIHAN MODAL */}
      {showTagihanModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowTagihanModal(false)}
          title="Buatkan Tagihan (Format BSI Simpanan Program)"
          description="Generate file Excel tagihan BSI otomatis dengan 17 Kode Produk (SPP Juli-Juni & Uang Masuk/Tahunan) sesuai jenjang dan jenis kelamin santri."
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Ketentuan Format Tagihan BSI</span>
              </div>
              <p className="text-emerald-700 leading-relaxed">
                File Excel yang dihasilkan akan memuat baris tagihan per siswa dengan <strong>ID Nasabah = Nomor Rekening BSI</strong>, mencakup:
              </p>
              <ul className="list-disc list-inside text-emerald-800 font-medium space-y-0.5 pl-1">
                <li>12 Bulan Iuran SPP (Kode Produk 155 - 166)</li>
                <li>Iuran Perlengkapan, Peralatan, Buku Paket, Kegiatan Tahunan, Pembangunan (Kode Produk 167 - 171)</li>
                <li>Besaran otomatis disesuaikan per jenjang (SMP, SMA, TK, dan SD Putra/Putri)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block font-bold text-slate-800">Pilih Siswa yang Dibuatkan Tagihan:</label>
              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    tagihanMode === 'selected'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="tagihanMode"
                    value="selected"
                    checked={tagihanMode === 'selected'}
                    onChange={() => setTagihanMode('selected')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-bold text-slate-800">
                      Hanya Siswa yang Dicentang di Tabel ({selectedStudentIds.length} Santri)
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Cocok jika ingin membuat tagihan untuk santri tertentu saja.
                    </p>
                    {selectedStudentIds.length === 0 && tagihanMode === 'selected' && (
                      <p className="text-[11px] text-amber-600 font-semibold mt-1">
                        ⚠️ Belum ada santri yang dicentang. Silakan centang di tabel atau pilih opsi semua siswa di bawah.
                      </p>
                    )}
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    tagihanMode === 'all'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="tagihanMode"
                    value="all"
                    checked={tagihanMode === 'all'}
                    onChange={() => setTagihanMode('all')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-bold text-slate-800">
                      Semua Siswa yang Sudah Ber-Rekening ({eligibleAccounts.length} Santri)
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Otomatis mencakup seluruh santri tahun {selectedYearName} yang nomor rekeningnya sudah ada.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTagihanModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDownloadTagihan}
                disabled={
                  downloadingTagihan ||
                  (tagihanMode === 'selected' && selectedStudentIds.length === 0) ||
                  (tagihanMode === 'all' && eligibleAccounts.length === 0)
                }
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {downloadingTagihan ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Membuat Excel Tagihan...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Excel Tagihan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
