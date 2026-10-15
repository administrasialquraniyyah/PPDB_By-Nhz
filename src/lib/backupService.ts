import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import prisma from './prisma';
import { formatCurrency, formatDate } from './formatters';

export interface BackupResult {
  filePath: string;
  archivePath?: string;
  totalStudents: number;
  totalExpenses: number;
  timestamp: string;
  fileSizeBytes: number;
}

/**
 * Builds the comprehensive multi-sheet Excel workbook from database.
 */
export async function createFullBackupWorkbook(academicYearId?: string): Promise<{ workbook: XLSX.WorkBook; stats: any }> {
  const whereStudents: any = {};
  const whereExpenses: any = {};

  if (academicYearId) {
    whereStudents.academicYearId = academicYearId;
    whereExpenses.academicYearId = academicYearId;
  }

  const [students, expenses, academicYears] = await Promise.all([
    prisma.student.findMany({
      where: whereStudents,
      orderBy: [{ academicYear: { name: 'desc' } }, { jenjang: 'asc' }, { namaLengkap: 'asc' }],
      include: {
        academicYear: true,
        formPayment: true,
        recommendation: true,
        bankAccount: true,
        reRegistration: true,
      },
    }),
    prisma.expense.findMany({
      where: whereExpenses,
      orderBy: [{ date: 'desc' }],
      include: {
        academicYear: true,
      },
    }),
    prisma.academicYear.findMany({
      orderBy: { name: 'desc' },
    }),
  ]);

  const wb = XLSX.utils.book_new();

  // ----------------------------------------------------
  // 1. SHEET 1: RINGKASAN & STATISTIK
  // ----------------------------------------------------
  const totalFormulir = students.reduce((acc, s) => acc + (s.formPayment?.nominalAktual || 0), 0);
  const totalDU = students.reduce((acc, s) => acc + (s.reRegistration?.amount || 0), 0);
  const totalPemasukan = totalFormulir + totalDU;
  const totalApresiasi = students.reduce(
    (acc, s) => acc + (s.recommendation?.paymentStatus === 'Lunas' ? (s.recommendation?.appreciationAmount || 0) : 0),
    0
  );
  const totalPengeluaran = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const saldoKas = totalPemasukan - totalPengeluaran - totalApresiasi;

  const jenjangCounts = ['TK', 'SD', 'SMP', 'SMA'].map((j) => {
    const list = students.filter((s) => s.jenjang?.toUpperCase() === j);
    const formLunas = list.filter((s) => s.formPayment?.status === 'Lunas').length;
    const duSudah = list.filter((s) => s.reRegistration?.status === 'Sudah').length;
    const rekAda = list.filter((s) => s.bankAccount?.status === 'Sudah dibuat').length;
    return [j, list.length, formLunas, duSudah, rekAda];
  });

  const now = new Date();
  const summaryRows = [
    ['=== BACKUP MASTER DATABASE PPDB & KEUANGAN PON-PES AL-QUR\'ANIYYAH ==='],
    ['Waktu Backup', formatDate(now) + ' ' + now.toLocaleTimeString('id-ID')],
    ['Cakupan Data', academicYearId ? 'Tahun Ajaran Terpilih' : 'Semua Tahun Ajaran (Menyeluruh)'],
    ['Total Santri Terdaftar', students.length],
    ['Total Data Pengeluaran', expenses.length],
    [],
    ['--- REKAPITULASI SANTRI PER JENJANG ---'],
    ['Jenjang', 'Total Santri', 'Formulir Lunas', 'Sudah Daftar Ulang', 'Buku Rekening Jadi'],
    ...jenjangCounts,
    [],
    ['--- REKAPITULASI KEUANGAN GLOBAL ---'],
    ['Kategori Keuangan', 'Nominal (Rp)', 'Keterangan'],
    ['Total Penerimaan Formulir', totalFormulir, 'Uang masuk dari pembelian formulir PPDB'],
    ['Total Penerimaan Daftar Ulang', totalDU, 'Uang masuk dari daftar ulang santri baru'],
    ['TOTAL PEMASUKAN PPDB', totalPemasukan, 'Total uang masuk formulir + daftar ulang'],
    ['Total Apresiasi Rekomendasi Cair', totalApresiasi, 'Biaya apresiasi rekomendasi yang sudah dicairkan'],
    ['Total Pengeluaran Kas Operasional', totalPengeluaran, 'Pengeluaran kas PPDB & yayasan yang dicatat'],
    ['SALDO BERSIH KAS PPDB', saldoKas, 'Pemasukan dikurangi seluruh pengeluaran & apresiasi'],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 35 }, { wch: 22 }, { wch: 45 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan & Total');

  // ----------------------------------------------------
  // 2. SHEET 2: DATA SANTRI LENGKAP
  // ----------------------------------------------------
  const studentHeaders = [
    'No',
    'Tahun Ajaran',
    'Status Santri',
    'No Pendaftaran',
    'NIS / No Induk',
    'Nama Lengkap',
    'Jenjang',
    'Gelombang',
    'NIK',
    'NISN',
    'Jenis Kelamin',
    'Tempat Lahir',
    'Tanggal Lahir',
    'No HP / WhatsApp',
    'Email',
    'Alamat Lengkap',
    'Kota',
    'Asal Sekolah',
    'Nama Ayah',
    'No HP Ayah',
    'Pekerjaan Ayah',
    'Nama Ibu',
    'No HP Ibu',
    'Pekerjaan Ibu',
    'Nama Wali',
    'ID Kartu CBS',
    'Status Formulir',
    'Nominal Formulir (Rp)',
    'Status Rekening',
    'Nomor Rekening Bank',
    'Status Daftar Ulang',
    'Nominal DU (Rp)',
    'Perekomendasi',
    'Tanggal Input',
  ];

  const studentRows = students.map((s, idx) => [
    idx + 1,
    s.academicYear?.name || '-',
    s.status,
    s.noPendaftaran || '',
    s.noInduk || '',
    s.namaLengkap,
    s.jenjang,
    s.gelombang,
    s.nik ? String(s.nik) : '',
    s.nisn ? String(s.nisn) : '',
    s.jenisKelamin || '',
    s.tempatLahir || '',
    s.tanggalLahir || '',
    s.noHp ? String(s.noHp) : '',
    s.email || '',
    s.alamat || '',
    s.kota || '',
    s.asalSekolah || '',
    s.namaAyah || '',
    s.noHpAyah ? String(s.noHpAyah) : '',
    s.pekerjaanAyah || '',
    s.namaIbu || '',
    s.noHpIbu ? String(s.noHpIbu) : '',
    s.pekerjaanIbu || '',
    s.namaWali || '',
    s.idKartu ? String(s.idKartu) : '',
    s.formPayment?.status || 'Lunas',
    s.formPayment?.nominalAktual || 0,
    s.bankAccount?.status || 'Belum dibuat',
    s.bankAccount?.accountNumber ? String(s.bankAccount.accountNumber) : '',
    s.reRegistration?.status || 'Belum',
    s.reRegistration?.amount || 0,
    s.recommendation?.recommenderName || '',
    s.createdAt ? formatDate(s.createdAt) : '',
  ]);

  const wsStudents = XLSX.utils.aoa_to_sheet([studentHeaders, ...studentRows]);
  wsStudents['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // Tahun Ajaran
    { wch: 10 }, // Status
    { wch: 16 }, // No Pendaftaran
    { wch: 14 }, // NIS
    { wch: 28 }, // Nama
    { wch: 8 },  // Jenjang
    { wch: 13 }, // Gelombang
    { wch: 18 }, // NIK
    { wch: 14 }, // NISN
    { wch: 8 },  // JK
    { wch: 15 }, // Tempat Lahir
    { wch: 14 }, // Tgl Lahir
    { wch: 16 }, // No HP
    { wch: 20 }, // Email
    { wch: 30 }, // Alamat
    { wch: 14 }, // Kota
    { wch: 22 }, // Asal Sekolah
    { wch: 20 }, // Ayah
    { wch: 16 }, // HP Ayah
    { wch: 16 }, // Pek Ayah
    { wch: 20 }, // Ibu
    { wch: 16 }, // HP Ibu
    { wch: 16 }, // Pek Ibu
    { wch: 18 }, // Wali
    { wch: 15 }, // ID Kartu
    { wch: 14 }, // Status Formulir
    { wch: 18 }, // Nominal Formulir
    { wch: 15 }, // Status Rek
    { wch: 18 }, // No Rekening
    { wch: 16 }, // Status DU
    { wch: 16 }, // Nominal DU
    { wch: 20 }, // Rekomendasi
    { wch: 14 }, // Tanggal
  ];
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Data Santri Lengkap');

  // ----------------------------------------------------
  // 3. SHEET 3: PEMBELIAN FORMULIR
  // ----------------------------------------------------
  const formHeaders = [
    'No',
    'Tahun Ajaran',
    'Nama Santri',
    'Jenjang',
    'NIS / No Induk',
    'Tarif Default (Rp)',
    'Tarif Aktual Dibayar (Rp)',
    'Diskon / Potongan (Rp)',
    'Status Pembayaran',
    'Metode Pembayaran',
    'Tanggal Pembayaran',
    'Keterangan',
  ];

  const formRows = students.map((s, idx) => [
    idx + 1,
    s.academicYear?.name || '-',
    s.namaLengkap,
    s.jenjang,
    s.noInduk || '',
    s.formPayment?.nominalDefault || 0,
    s.formPayment?.nominalAktual || 0,
    s.formPayment?.diskon || 0,
    s.formPayment?.status || 'Lunas',
    s.formPayment?.metodePembayaran || 'Transfer',
    s.formPayment?.tanggal ? formatDate(s.formPayment.tanggal) : '',
    s.formPayment?.keterangan || '',
  ]);

  const wsForm = XLSX.utils.aoa_to_sheet([formHeaders, ...formRows]);
  wsForm['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 28 },
    { wch: 8 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsForm, 'Pembelian Formulir');

  // ----------------------------------------------------
  // 4. SHEET 4: REKOMENDASI SANTRI
  // ----------------------------------------------------
  const recHeaders = [
    'No',
    'Tahun Ajaran',
    'Nama Santri Baru',
    'Jenjang',
    'Nama Perekomendasi',
    'Kategori Perekomendasi',
    'Nominal Apresiasi (Rp)',
    'Status Pencairan',
    'Tanggal Pencairan',
    'Catatan / Referensi',
  ];

  const recList = students.filter((s) => s.recommendation);
  const recRows = recList.map((s, idx) => [
    idx + 1,
    s.academicYear?.name || '-',
    s.namaLengkap,
    s.jenjang,
    s.recommendation?.recommenderName || '',
    s.recommendation?.recommenderCategory || 'Guru/Internal',
    s.recommendation?.appreciationAmount || 0,
    s.recommendation?.paymentStatus || 'Belum',
    s.recommendation?.paymentDate ? formatDate(s.recommendation.paymentDate) : '',
    s.recommendation?.notes || '',
  ]);

  const wsRec = XLSX.utils.aoa_to_sheet([recHeaders, ...recRows]);
  wsRec['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 28 },
    { wch: 8 },
    { wch: 24 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRec, 'Rekomendasi Santri');

  // ----------------------------------------------------
  // 5. SHEET 5: REKENING BANK & CBS
  // ----------------------------------------------------
  const bankHeaders = [
    'No',
    'Tahun Ajaran',
    'Nama Santri',
    'Jenjang',
    'NIS / No Induk',
    'Status Rekening',
    'Nama Bank',
    'Nomor Rekening',
    'ID Kartu Bank (CBS)',
    'Tanggal Pembuatan',
    'Catatan',
  ];

  const bankRows = students.map((s, idx) => [
    idx + 1,
    s.academicYear?.name || '-',
    s.namaLengkap,
    s.jenjang,
    s.noInduk || '',
    s.bankAccount?.status || 'Belum dibuat',
    s.bankAccount?.bankName || 'Bank Syariah Indonesia (BSI)',
    s.bankAccount?.accountNumber ? String(s.bankAccount.accountNumber) : '',
    s.idKartu ? String(s.idKartu) : '',
    s.bankAccount?.createdDate ? formatDate(s.bankAccount.createdDate) : '',
    s.bankAccount?.notes || '',
  ]);

  const wsBank = XLSX.utils.aoa_to_sheet([bankHeaders, ...bankRows]);
  wsBank['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 28 },
    { wch: 8 },
    { wch: 14 },
    { wch: 16 },
    { wch: 25 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBank, 'Rekening Bank & CBS');

  // ----------------------------------------------------
  // 6. SHEET 6: DAFTAR ULANG
  // ----------------------------------------------------
  const duHeaders = [
    'No',
    'Tahun Ajaran',
    'Nama Santri',
    'Jenjang',
    'NIS / No Induk',
    'Status Daftar Ulang',
    'Nominal Bayar DU (Rp)',
    'Metode Pembayaran',
    'Tanggal Pembayaran',
    'Catatan Pembayaran',
  ];

  const duRows = students.map((s, idx) => [
    idx + 1,
    s.academicYear?.name || '-',
    s.namaLengkap,
    s.jenjang,
    s.noInduk || '',
    s.reRegistration?.status || 'Belum',
    s.reRegistration?.amount || 0,
    s.reRegistration?.paymentMethod || '',
    s.reRegistration?.paymentDate ? formatDate(s.reRegistration.paymentDate) : '',
    s.reRegistration?.notes || '',
  ]);

  const wsDU = XLSX.utils.aoa_to_sheet([duHeaders, ...duRows]);
  wsDU['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 28 },
    { wch: 8 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDU, 'Daftar Ulang');

  // ----------------------------------------------------
  // 7. SHEET 7: PENGELUARAN KAS PPDB
  // ----------------------------------------------------
  const expHeaders = [
    'No',
    'Tahun Ajaran',
    'Tanggal',
    'Kategori Pengeluaran',
    'Rincian / Deskripsi',
    'Nominal (Rp)',
    'Nomor Referensi / Bukti',
    'Catatan',
  ];

  const expRows = expenses.map((e, idx) => [
    idx + 1,
    e.academicYear?.name || '-',
    e.date ? formatDate(e.date) : '',
    e.category,
    e.description,
    e.amount,
    e.reference || '',
    e.notes || '',
  ]);

  const wsExp = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
  wsExp['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 14 },
    { wch: 24 },
    { wch: 35 },
    { wch: 18 },
    { wch: 20 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsExp, 'Pengeluaran Kas PPDB');

  return {
    workbook: wb,
    stats: {
      totalStudents: students.length,
      totalExpenses: expenses.length,
      totalPemasukan,
      totalPengeluaran,
      saldoKas,
    },
  };
}

/**
 * Saves a local Excel backup file to disk at `d:\System PPDB\backups\PPDB_Backup_Terbaru.xlsx`
 * and creates an archived daily backup copy.
 */
export async function saveLocalExcelBackup(academicYearId?: string): Promise<BackupResult> {
  const { workbook, stats } = await createFullBackupWorkbook(academicYearId);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  let latestFilePath = '';
  let archiveFilePath = '';

  try {
    const backupDir = path.join(process.cwd(), 'backups');
  const archiveDir = path.join(backupDir, 'arsip');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  // 1. Primary latest file: PPDB_Backup_Terbaru.xlsx
  const latestFilePath = path.join(backupDir, 'PPDB_Backup_Terbaru.xlsx');
  fs.writeFileSync(latestFilePath, buffer);

  // 2. Archived daily file: PPDB_Backup_YYYY-MM-DD.xlsx
  const dateStr = new Date().toISOString().split('T')[0];
  const archiveFilePath = path.join(archiveDir, `PPDB_Backup_${dateStr}.xlsx`);
  fs.writeFileSync(archiveFilePath, buffer);

  // 3. Write metadata file for UI indicator
  const nowIso = new Date().toISOString();
  const meta = {
    lastBackupAt: nowIso,
    totalStudents: stats.totalStudents,
    totalExpenses: stats.totalExpenses,
    fileSizeBytes: buffer.length,
    latestFilePath,
    archiveFilePath,
  };
  fs.writeFileSync(path.join(backupDir, 'backup_info.json'), JSON.stringify(meta, null, 2));
  } catch (err: any) {
    console.warn('[BackupService] Local disk write skipped (read-only filesystem on Vercel):', err?.message);
  }

  return {
    filePath: latestFilePath,
    archivePath: archiveFilePath,
    totalStudents: stats.totalStudents,
    totalExpenses: stats.totalExpenses,
    timestamp: nowIso,
    fileSizeBytes: buffer.length,
  };
}

/**
 * Reads the latest backup status from disk.
 */
export function getLocalBackupStatus() {
  try {
    const metaPath = path.join(process.cwd(), 'backups', 'backup_info.json');
    if (fs.existsSync(metaPath)) {
      const raw = fs.readFileSync(metaPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading backup info:', err);
  }
  return null;
}

// Debounce auto-backup so fast rapid updates don't overwhelm disk IO
let autoBackupTimeout: NodeJS.Timeout | null = null;

export function triggerAutoBackup(delayMs = 1500) {
  if (autoBackupTimeout) {
    clearTimeout(autoBackupTimeout);
  }
  autoBackupTimeout = setTimeout(async () => {
    try {
      await saveLocalExcelBackup();
      console.log('✅ [AutoBackup] Backup Excel lokal berhasil disimpan otomatis.');
    } catch (err) {
      console.error('❌ [AutoBackup] Gagal menyimpan backup otomatis:', err);
    }
  }, delayMs);
}
