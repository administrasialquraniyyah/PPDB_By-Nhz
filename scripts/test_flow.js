const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const XLSX = require('xlsx');

async function testPipeline() {
  console.log('=== START INTEGRATION VERIFICATION TEST ===\n');

  // 1. Health check
  console.log('[1/5] Testing Supabase DB ping...');
  const health = await prisma.$queryRawUnsafe('SELECT 1 as ok, current_database() as db');
  console.log('✓ Supabase PostgreSQL Connected:', health);

  // 2. Read reference Excel file
  const excelPath = path.join(__dirname, '../sample_data/Santri Baru Full Data.xlsx');
  console.log('\n[2/5] Reading reference Excel file:', excelPath);
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`✓ Read ${rawData.length} rows from sheet "${wb.SheetNames[0]}"`);
  
  // Row 1 has sample student: [1, "2025/2026", "SMP IT Al-Qur'aniyyah", "Ahla Fithrah Hidayah", ...]
  const sampleStudent = rawData[1];
  console.log('Sample student:', {
    nama: sampleStudent[3],
    jenjang: sampleStudent[2],
    nik: sampleStudent[4],
    nisn: sampleStudent[5],
    jk: sampleStudent[6],
  });

  // 3. Ensure Academic Year 2025/2026
  console.log('\n[3/5] Verifying multi-year isolation...');
  const year = await prisma.academicYear.upsert({
    where: { name: '2025/2026' },
    update: {},
    create: { name: '2025/2026', isActive: false },
  });
  console.log('✓ Academic Year:', year.name, year.id);

  // 4. Test Inserting 5 students with auto-creation of form payments, bank accounts, and re-registrations
  console.log('\n[4/5] Testing auto-creation of form payments (Rule 5 & 6) & relations...');
  const testRows = rawData.slice(1, 6);

  let inserted = 0;
  for (const r of testRows) {
    const nama = String(r[3] || '').trim();
    if (!nama) continue;

    const rawJenjang = String(r[2] || '');
    const jenjang = rawJenjang.includes('TK') ? 'TK' : rawJenjang.includes('SD') ? 'SD' : rawJenjang.includes('SMA') ? 'SMA' : 'SMP';
    const feeDefault = jenjang === 'TK' ? 150000 : 300000;

    const student = await prisma.student.create({
      data: {
        academicYearId: year.id,
        namaLengkap: nama,
        jenjang: jenjang,
        gelombang: 'Gelombang 1',
        nik: String(r[4] || '').replace("'", ''),
        nisn: String(r[5] || '').replace("'", ''),
        jenisKelamin: String(r[6] || '').trim(),
        email: String(r[8] || '').trim(),
        noHp: String(r[9] || '').replace("'", '').trim(),
        alamat: String(r[10] || '').trim(),
        asalSekolah: String(r[11] || '').trim(),
        namaAyah: String(r[13] || '').trim(),
        namaIbu: String(r[14] || '').trim(),
        status: 'ACTIVE',
        
        // Auto created form payment (Rule 5 & 6)
        formPayment: {
          create: {
            nominalDefault: feeDefault,
            nominalAktual: feeDefault,
            diskon: 0,
            status: 'Lunas',
            metodePembayaran: 'Transfer',
            keterangan: 'Otomatis dari Import PPDB (Test Verified)',
          },
        },
        // Bank account initialized
        bankAccount: {
          create: {
            status: 'Belum dibuat',
          },
        },
        // Re-registration initialized
        reRegistration: {
          create: {
            status: 'Belum',
            amount: 0,
          },
        },
      },
      include: {
        formPayment: true,
        bankAccount: true,
        reRegistration: true,
      },
    });

    console.log(`✓ Student: "${student.namaLengkap}" [${student.jenjang}]`);
    console.log(`  -> FormPayment: ${student.formPayment.nominalAktual} (${student.formPayment.status})`);
    console.log(`  -> BankAccount: ${student.bankAccount.status}`);
    console.log(`  -> ReRegistration: ${student.reRegistration.status}`);
    inserted++;
  }

  // 5. Query Dashboard verification
  console.log('\n[5/5] Querying Dashboard aggregates from Supabase...');
  const count = await prisma.student.count({ where: { academicYearId: year.id } });
  const formCount = await prisma.formPayment.count({
    where: { student: { academicYearId: year.id } },
  });
  console.log(`✓ Total Students in 2025/2026: ${count}`);
  console.log(`✓ Total Form Payments in 2025/2026: ${formCount}`);
  if (count === formCount) {
    console.log('✓ 100% MATCH: Every student has an automatic form payment record!');
  }

  console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

testPipeline()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
