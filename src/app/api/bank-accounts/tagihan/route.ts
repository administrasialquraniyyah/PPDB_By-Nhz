import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

interface BillItem {
  kodeProduk: string;
  tanggalMulai: string;
  jangkaWaktu: number;
  setiapTanggal: number;
  periode: string;
  amount: number;
}

// Master data jadwal produk & tanggal mulai
const SPP_SCHEDULE: { kode: string; tgl: string }[] = [
  { kode: '155', tgl: '2026-01-01' },
  { kode: '156', tgl: '2027-07-01' },
  { kode: '157', tgl: '2027-08-01' },
  { kode: '158', tgl: '2027-09-01' },
  { kode: '159', tgl: '2027-10-01' },
  { kode: '160', tgl: '2027-11-01' },
  { kode: '161', tgl: '2026-12-01' },
  { kode: '162', tgl: '2028-01-01' },
  { kode: '163', tgl: '2028-02-01' },
  { kode: '164', tgl: '2028-03-01' },
  { kode: '165', tgl: '2028-04-01' },
  { kode: '166', tgl: '2028-05-01' },
];

function getBillsForStudent(jenjang: string, jk: string): {
  kodeGroup1: string;
  kodeGroup2: string;
  keterangan: string;
  items: BillItem[];
} {
  const normJenjang = (jenjang || 'SMP').toUpperCase();
  const isFemale = (jk || '').toUpperCase().startsWith('P');

  if (normJenjang.includes('SMA')) {
    const items: BillItem[] = [
      ...SPP_SCHEDULE.map((s) => ({
        kodeProduk: s.kode,
        tanggalMulai: s.tgl,
        jangkaWaktu: 1,
        setiapTanggal: 1,
        periode: 'Bulanan',
        amount: 1650000,
      })),
      { kodeProduk: '167', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 3600000 },
      { kodeProduk: '168', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 1000000 },
      { kodeProduk: '169', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 2100000 },
      { kodeProduk: '170', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 2100000 },
      { kodeProduk: '171', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 6000000 },
    ];
    return { kodeGroup1: 'SMA', kodeGroup2: '10', keterangan: '', items };
  }

  if (normJenjang.includes('SD')) {
    const ket = isFemale ? 'PEREMPUAN' : 'LAKI-LAKI';
    const perlengkapan = isFemale ? 1450000 : 1300000;
    const items: BillItem[] = [
      ...SPP_SCHEDULE.map((s) => ({
        kodeProduk: s.kode,
        tanggalMulai: s.tgl,
        jangkaWaktu: 1,
        setiapTanggal: 1,
        periode: 'Bulanan',
        amount: 550000,
      })),
      { kodeProduk: '167', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: perlengkapan },
      { kodeProduk: '168', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 100000 },
      { kodeProduk: '169', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 1600000 },
      { kodeProduk: '170', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 2300000 },
      { kodeProduk: '171', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 5500000 },
    ];
    return { kodeGroup1: 'SD', kodeGroup2: '1', keterangan: ket, items };
  }

  if (normJenjang.includes('TK') || normJenjang.includes('STK') || normJenjang.includes('PAUD')) {
    const items: BillItem[] = [
      ...SPP_SCHEDULE.map((s) => ({
        kodeProduk: s.kode,
        tanggalMulai: s.tgl,
        jangkaWaktu: 1,
        setiapTanggal: 1,
        periode: 'Bulanan',
        amount: 400000,
      })),
      { kodeProduk: '167', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 1050000 },
      { kodeProduk: '169', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 700000 },
      { kodeProduk: '170', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 1000000 },
      { kodeProduk: '171', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 1500000 },
    ];
    return { kodeGroup1: 'TK', kodeGroup2: 'A', keterangan: '', items };
  }

  // Default: SMP (Kelas 7)
  const items: BillItem[] = [
    ...SPP_SCHEDULE.map((s) => ({
      kodeProduk: s.kode,
      tanggalMulai: s.tgl,
      jangkaWaktu: 1,
      setiapTanggal: 1,
      periode: 'Bulanan',
      amount: 1600000,
    })),
    { kodeProduk: '167', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 3300000 },
    { kodeProduk: '168', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 900000 },
    { kodeProduk: '169', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 1950000 },
    { kodeProduk: '170', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 2100000 },
    { kodeProduk: '171', tanggalMulai: '2026-01-01', jangkaWaktu: 1, setiapTanggal: 1, periode: 'Bulanan', amount: 6000000 },
  ];
  return { kodeGroup1: 'SMP', kodeGroup2: '7', keterangan: '', items };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentIds, academicYearId } = body;

    const where: any = {};

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    if (Array.isArray(studentIds) && studentIds.length > 0) {
      where.id = { in: studentIds };
    } else {
      where.bankAccount = {
        OR: [
          { idNasabah: { not: null } },
          { accountNumber: { not: null } },
          { student: { idKartu: { not: null } } },
        ],
      };
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { namaLengkap: 'asc' },
      include: {
        academicYear: true,
        bankAccount: true,
      },
    });

    if (students.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada siswa terpilih yang telah memiliki nomor rekening bank aktif.' },
        { status: 400 }
      );
    }

    const headerRow1 = [
      'Kode Kantor',
      'ID Nasabah',
      'Kode Produk',
      'No Alternatif',
      'Setoran Minimal',
      'Saldo Minimal',
      'Keterangan',
      'Kode Group 1',
      'Kode Group 2',
      'Kode Group 3',
      'Kode Group 4',
      'Simpanan Program (Diisi jika kode produk adalah simpanan program)',
      '',
      '',
      '',
      '',
    ];

    const headerRow2 = [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Tanggal Mulai',
      'Jangka Waktu',
      'Setiap Tanggal',
      'Harian/Mingguan/Bulanan',
      'Setoran per Periode',
    ];

    const dataRows: any[][] = [];

    for (const s of students) {
      const idNasabah = s.bankAccount?.idNasabah || s.bankAccount?.accountNumber || s.idKartu || s.noInduk || s.nisn || s.noPendaftaran || '';
      if (!idNasabah) continue;

      const group4 = s.academicYear?.name || '2027/2028';
      const config = getBillsForStudent(s.jenjang, s.jenisKelamin || '');

      for (const item of config.items) {
        dataRows.push([
          '001',
          idNasabah,
          item.kodeProduk,
          '',
          0,
          0,
          config.keterangan,
          config.kodeGroup1,
          config.kodeGroup2,
          'Yayasan',
          group4,
          item.tanggalMulai,
          item.jangkaWaktu,
          item.setiapTanggal,
          item.periode,
          item.amount,
        ]);
      }
    }

    const worksheetData = [headerRow1, headerRow2, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Apply header merges (A1:A2, B1:B2, ..., L1:P1)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
      { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
      { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } },
      { s: { r: 0, c: 5 }, e: { r: 1, c: 5 } },
      { s: { r: 0, c: 6 }, e: { r: 1, c: 6 } },
      { s: { r: 0, c: 7 }, e: { r: 1, c: 7 } },
      { s: { r: 0, c: 8 }, e: { r: 1, c: 8 } },
      { s: { r: 0, c: 9 }, e: { r: 1, c: 9 } },
      { s: { r: 0, c: 10 }, e: { r: 1, c: 10 } },
      { s: { r: 0, c: 11 }, e: { r: 0, c: 15 } },
    ];

    ws['!cols'] = [
      { wch: 12 }, // Kode Kantor
      { wch: 16 }, // ID Nasabah
      { wch: 12 }, // Kode Produk
      { wch: 14 }, // No Alternatif
      { wch: 15 }, // Setoran Minimal
      { wch: 14 }, // Saldo Minimal
      { wch: 16 }, // Keterangan
      { wch: 14 }, // Kode Group 1
      { wch: 14 }, // Kode Group 2
      { wch: 14 }, // Kode Group 3
      { wch: 14 }, // Kode Group 4
      { wch: 16 }, // Tanggal Mulai
      { wch: 14 }, // Jangka Waktu
      { wch: 14 }, // Setiap Tanggal
      { wch: 24 }, // Harian/Mingguan/Bulanan
      { wch: 18 }, // Setoran per Periode
    ];

    // Format Column L (Tanggal Mulai, col index 11) as Excel Date (yyyy-mm-dd)
    for (let r = 2; r < worksheetData.length; r++) {
      const cellRef = XLSX.utils.encode_cell({ r, c: 11 });
      const cell = ws[cellRef];
      if (cell && typeof cell.v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cell.v)) {
        const [y, m, d] = cell.v.split('-').map(Number);
        const utcDate = Date.UTC(y, m - 1, d);
        const excelEpoch = Date.UTC(1899, 11, 30);
        const serial = Math.round((utcDate - excelEpoch) / (24 * 60 * 60 * 1000));
        cell.t = 'n';
        cell.v = serial;
        cell.z = 'yyyy-mm-dd';
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Worksheet');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellDates: true });
    const filename = `Format_Tagihan_BSI_${Date.now()}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating bills export:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
