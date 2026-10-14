const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial PPDB settings & academic years...');

  // 1. Academic Years
  const ay2026 = await prisma.academicYear.upsert({
    where: { name: '2026/2027' },
    update: { isActive: true },
    create: {
      name: '2026/2027',
      isActive: true,
    },
  });

  const ay2025 = await prisma.academicYear.upsert({
    where: { name: '2025/2026' },
    update: {},
    create: {
      name: '2025/2026',
      isActive: false,
    },
  });

  console.log('Academic Years created:', ay2026.name, ay2025.name);

  // 2. Default App Settings
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

  console.log('App settings seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
