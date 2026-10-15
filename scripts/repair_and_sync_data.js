const path = require('path');
const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper to normalize strings for matching
function normalizeName(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function main() {
  console.log('====================================================');
  console.log('PPDB AL-QUR\'ANIYYAH - DATA REPAIR & MIGRATION SCRIPT');
  console.log('====================================================\n');

  // STEP 1: RESET TEST DATA
  console.log('[1/6] Membersihkan (reset) data uji coba lama di database...');
  const delPayments = await prisma.formPayment.deleteMany({});
  const delBank = await prisma.bankAccount.deleteMany({});
  const delReReg = await prisma.reRegistration.deleteMany({});
  const delRec = await prisma.recommendation.deleteMany({});
  const delExp = await prisma.expense.deleteMany({});
  const delStudents = await prisma.student.deleteMany({});
  console.log(`✓ Data lama berhasil dibersihkan: ${delStudents.count} siswa di-reset.`);

  // STEP 2: SETUP TAHUN AJARAN
  console.log('\n[2/6] Merapikan Tahun Ajaran...');
  // Hapus tahun 2027/2028 uji coba jika ada
  await prisma.academicYear.deleteMany({
    where: { name: '2027/2028' }
  });

  // Pastikan 2026/2027 aktif
  const ay2026 = await prisma.academicYear.upsert({
    where: { name: '2026/2027' },
    update: { isActive: true },
    create: { name: '2026/2027', isActive: true },
  });

  // Pastikan 2025/2026 tidak aktif (historis)
  const ay2025 = await prisma.academicYear.upsert({
    where: { name: '2025/2026' },
    update: { isActive: false },
    create: { name: '2025/2026', isActive: false },
  });

  console.log(`✓ Tahun Ajaran 2026/2027 Aktif: ID = ${ay2026.id}`);
  console.log(`✓ Tahun Ajaran 2025/2026 Historis: ID = ${ay2025.id}`);

  // STEP 3: DEFAULT SETTINGS
  console.log('\n[3/6] Memeriksa & memperbarui App Settings...');
  const defaultSettings = [
    { key: 'fee_tk', value: '150000', description: 'Tarif Formulir TK/STK' },
    { key: 'fee_sd', value: '300000', description: 'Tarif Formulir SD' },
    { key: 'fee_smp', value: '300000', description: 'Tarif Formulir SMP' },
    { key: 'fee_sma', value: '300000', description: 'Tarif Formulir SMA' },
    { key: 'apresiasi_guru', value: '500000', description: 'Nominal Apresiasi Rekomendasi Guru/Internal' },
    { key: 'apresiasi_wali', value: '250000', description: 'Nominal Apresiasi Rekomendasi Wali Santri' },
  ];

  for (const s of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }
  console.log('✓ Pengaturan tarif formulir & apresiasi tersimpan.');

  // STEP 4: IMPORT DATA SANTRI DARI EXCEL KE 2026/2027
  console.log('\n[4/6] Mengimpor data santri dari "sample_data/Santri Baru Full Data.xlsx" ke TA 2026/2027...');
  const santriPath = path.join(__dirname, '..', 'sample_data', 'Santri Baru Full Data.xlsx');
  const wbSantri = xlsx.readFile(santriPath);
  const rows = xlsx.utils.sheet_to_json(wbSantri.Sheets['Sheet1'], { header: 1 });

  let importedCount = 0;
  const createdStudents = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r.length) continue;

    const nama = String(r[3] || '').trim();
    if (!nama) continue;

    const rawJenjang = String(r[2] || '').toUpperCase();
    let jenjang = 'SMP';
    if (rawJenjang.includes('TK') || rawJenjang.includes('STK')) jenjang = 'TK';
    else if (rawJenjang.includes('SD')) jenjang = 'SD';
    else if (rawJenjang.includes('SMA') || rawJenjang.includes('SMK')) jenjang = 'SMA';
    else if (rawJenjang.includes('SMP') || rawJenjang.includes('MTS')) jenjang = 'SMP';

    const fee = jenjang === 'TK' ? 150000 : 300000;

    // Bersihkan karakter petik tunggal ' dari teks excel
    const clean = (val) => {
      if (val === null || val === undefined) return null;
      let s = String(val).trim();
      if (s.startsWith("'")) s = s.substring(1);
      return s === '-' || s === '' ? null : s;
    };

    const ttl = clean(r[7]);
    let tempatLahir = null;
    let tanggalLahir = null;
    if (ttl && ttl.includes(',')) {
      const parts = ttl.split(',');
      tempatLahir = clean(parts[0]);
      tanggalLahir = clean(parts.slice(1).join(','));
    } else {
      tempatLahir = ttl;
    }

    const padNum = String(importedCount + 1).padStart(4, '0');
    const noPendaftaran = `PPDB-2026-${padNum}`;

    const student = await prisma.student.create({
      data: {
        academicYearId: ay2026.id,
        status: 'ACTIVE',
        noPendaftaran: noPendaftaran,
        namaLengkap: nama,
        jenjang: jenjang,
        gelombang: 'Gelombang 1',
        nik: clean(r[4]),
        nisn: clean(r[5]),
        jenisKelamin: clean(r[6]),
        tempatLahir: tempatLahir,
        tanggalLahir: tanggalLahir,
        email: clean(r[8]),
        noHp: clean(r[9]),
        alamat: clean(r[10]),
        asalSekolah: clean(r[11]),
        alamatSekolah: clean(r[12]),
        namaAyah: clean(r[13]),
        namaIbu: clean(r[14]),
        username: clean(r[15]),
        password: clean(r[16]),

        // Otomatis tercatat pembelian formulir (Rule 5 & 6)
        formPayment: {
          create: {
            nominalDefault: fee,
            nominalAktual: fee,
            diskon: 0,
            status: 'Lunas',
            metodePembayaran: 'Transfer',
            keterangan: 'Pembelian Formulir PPDB 2026/2027 (Import Resmi)',
          },
        },

        // Inisialisasi Rekening Bank
        bankAccount: {
          create: {
            status: 'Belum dibuat',
            bankName: 'Bank Syariah Indonesia (BSI)',
            notes: 'Menunggu pencocokan / penerbitan rekening bank',
          },
        },

        // Inisialisasi Administrasi Daftar Ulang
        reRegistration: {
          create: {
            status: 'Belum',
            amount: 0,
            paymentMethod: 'Transfer',
            notes: 'Status awal pendaftar baru',
          },
        },
      },
    });

    createdStudents.push(student);
    importedCount++;
  }

  console.log(`✓ Berhasil mengimpor ${importedCount} data santri ke TA 2026/2027!`);

  // STEP 5: SINKRONISASI NOMOR REKENING DARI Rekening.xlsx
  console.log('\n[5/6] Mensinkronkan nomor rekening bank dari "sample_data/Rekening.xlsx"...');
  const rekPath = path.join(__dirname, '..', 'sample_data', 'Rekening.xlsx');
  const wbRek = xlsx.readFile(rekPath);
  const rowsRek = xlsx.utils.sheet_to_json(wbRek.Sheets['Sheet1'], { header: 1 });

  // Map nama ternormalisasi ke student record
  const studentMap = new Map();
  for (const s of createdStudents) {
    studentMap.set(normalizeName(s.namaLengkap), s);
  }

  let matchedRekCount = 0;
  const unmatchedRek = [];

  for (const r of rowsRek) {
    const rawNama = String(r[0] || '').trim();
    const noRek = String(r[2] || '').trim();
    if (!rawNama || !noRek) continue;

    const norm = normalizeName(rawNama);
    let targetStudent = studentMap.get(norm);

    // Manual aliases
    const manualAliases = {
      'ahmadnabilalmer': 'akhmadnabilalmeer',
      'muhammadbaniprimaputra': 'muhamadbaniprimaputra',
      'syabilhaddadzunnurdin': 'syabilhaddaddzunnuroin',
    };
    if (!targetStudent && manualAliases[norm]) {
      targetStudent = studentMap.get(manualAliases[norm]);
    }

    // Fuzzy check jika nama berbeda sedikit (misal Almer vs Almeer)
    if (!targetStudent) {
      for (const [key, s] of studentMap.entries()) {
        if (key.includes(norm) || norm.includes(key)) {
          targetStudent = s;
          break;
        }
      }
    }

    if (targetStudent) {
      await prisma.bankAccount.update({
        where: { studentId: targetStudent.id },
        data: {
          status: 'Sudah dibuat',
          bankName: 'Bank Syariah Indonesia (BSI)',
          accountNumber: noRek,
          createdDate: new Date(),
          notes: 'Nomor rekening hasil sinkronisasi data resmi bank',
        },
      });
      matchedRekCount++;
    } else {
      unmatchedRek.push({ nama: rawNama, noRek });
    }
  }

  console.log(`✓ Berhasil memperbarui nomor rekening untuk ${matchedRekCount} santri!`);
  if (unmatchedRek.length > 0) {
    console.log(`  (Ada ${unmatchedRek.length} data rekening tanpa santri yang cocok):`, unmatchedRek.map(u => u.nama).join(', '));
  }

  // STEP 6: VERIFIKASI AKHIR
  console.log('\n[6/6] Verifikasi hasil perbaikan database...');
  const totalStudents = await prisma.student.count({ where: { academicYearId: ay2026.id } });
  const totalForms = await prisma.formPayment.count({ where: { student: { academicYearId: ay2026.id } } });
  const totalRekSudah = await prisma.bankAccount.count({
    where: { student: { academicYearId: ay2026.id }, status: 'Sudah dibuat' }
  });
  const totalRekBelum = await prisma.bankAccount.count({
    where: { student: { academicYearId: ay2026.id }, status: 'Belum dibuat' }
  });

  console.log('\n================ HASIL RINGKASAN DATA ================');
  console.log(`Tahun Ajaran Aktif        : 2026/2027`);
  console.log(`Total Santri Terdaftar    : ${totalStudents} siswa`);
  console.log(`Pembelian Formulir Lunas  : ${totalForms} transaksi`);
  console.log(`Rekening BSI Sudah Dibuat : ${totalRekSudah} siswa`);
  console.log(`Rekening BSI Belum Dibuat : ${totalRekBelum} siswa`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('Error saat perbaikan data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
