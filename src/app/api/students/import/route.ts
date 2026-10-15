import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseExcelBuffer } from '@/lib/excelParser';
import { triggerAutoBackup } from '@/lib/backupService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle File Upload (FormData)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const academicYearId = (formData.get('academicYearId') as string) || '';
      const mode = (formData.get('mode') as string) || 'preview'; // 'preview' | 'commit'
      const targetStatus = (formData.get('targetStatus') as string) || 'DRAFT'; // 'DRAFT' | 'ACTIVE'

      if (!file) {
        return NextResponse.json({ success: false, error: 'File Excel tidak ditemukan' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const parsed = parseExcelBuffer(buffer);

      if (parsed.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Tidak ada data siswa yang valid ditemukan di file Excel ini.',
          },
          { status: 400 }
        );
      }

      // If preview mode, check for potential duplicates against existing database
      if (mode === 'preview') {
        let existingStudents: { namaLengkap: string; nik: string | null; jenjang: string }[] = [];
        if (academicYearId) {
          existingStudents = await prisma.student.findMany({
            where: { academicYearId },
            select: { namaLengkap: true, nik: true, jenjang: true },
          });
        }

        const duplicateCheck = parsed.rows.map((r) => {
          const isDup = existingStudents.some((ex) => {
            if (r.nik && ex.nik && r.nik === ex.nik) return true;
            return (
              r.namaLengkap.toLowerCase().trim() === ex.namaLengkap.toLowerCase().trim() &&
              r.jenjang.toUpperCase() === ex.jenjang.toUpperCase()
            );
          });
          return {
            ...r,
            isDuplicate: isDup,
          };
        });

        const duplicateCount = duplicateCheck.filter((r) => r.isDuplicate).length;

        return NextResponse.json({
          success: true,
          preview: {
            sheets: parsed.sheets,
            selectedSheet: parsed.selectedSheet,
            totalRows: parsed.totalRows,
            validRows: parsed.validRows,
            invalidRows: parsed.invalidRows,
            duplicateCount,
            rows: duplicateCheck,
          },
        });
      }

      // COMMIT MODE FROM FILE
      return await commitStudents({
        rows: parsed.rows,
        academicYearId,
        targetStatus,
      });
    }

    // JSON Payload (when user confirms preview)
    const body = await request.json();
    const { rows, academicYearId, targetStatus = 'DRAFT' } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada data siswa untuk diimpor' }, { status: 400 });
    }

    return await commitStudents({
      rows,
      academicYearId,
      targetStatus,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memproses file' }, { status: 500 });
  }
}

async function commitStudents({
  rows,
  academicYearId,
  targetStatus,
}: {
  rows: any[];
  academicYearId: string;
  targetStatus: string;
}) {
  // Ensure valid academic year
  let yearId = academicYearId;
  if (!yearId) {
    // Check if rows have a year or use active
    const candidateYear = rows[0]?.tahunAjaran || '2026/2027';
    let ay = await prisma.academicYear.findFirst({
      where: { name: candidateYear },
    });
    if (!ay) {
      ay = await prisma.academicYear.findFirst({
        where: { isActive: true },
      });
    }
    if (!ay) {
      ay = await prisma.academicYear.create({
        data: { name: candidateYear, isActive: true },
      });
    }
    yearId = ay.id;
  }

  // Get Fee Settings
  const settings = await prisma.appSetting.findMany();
  const feeMap: Record<string, number> = {
    TK: 150000,
    SD: 300000,
    SMP: 300000,
    SMA: 300000,
  };
  settings.forEach((s) => {
    if (s.key === 'fee_tk') feeMap.TK = Number(s.value) || 150000;
    if (s.key === 'fee_sd') feeMap.SD = Number(s.value) || 300000;
    if (s.key === 'fee_smp') feeMap.SMP = Number(s.value) || 300000;
    if (s.key === 'fee_sma') feeMap.SMA = Number(s.value) || 300000;
  });

  let importedCount = 0;
  let skippedCount = 0;
  const errors: any[] = [];

  // Process rows in a batch
  for (const row of rows) {
    if (!row.namaLengkap) {
      skippedCount++;
      continue;
    }

    try {
      const defaultFee = feeMap[row.jenjang] || 300000;
      const actualFee = row.biayaFormulir && row.biayaFormulir > 0 ? row.biayaFormulir : defaultFee;
      const diskon = Math.max(0, defaultFee - actualFee);

      // Create student
      const student = await prisma.student.create({
        data: {
          academicYearId: yearId,
          status: targetStatus, // "DRAFT" or "ACTIVE"
          noPendaftaran: row.noPendaftaran || null,
          noInduk: row.noInduk || null,
          namaLengkap: row.namaLengkap,
          jenjang: row.jenjang || 'SMP',
          gelombang: row.gelombang || 'Gelombang 1',
          nik: row.nik || null,
          nisn: row.nisn || null,
          jenisKelamin: row.jenisKelamin || null,
          tempatLahir: row.tempatLahir || null,
          tanggalLahir: row.tanggalLahir || null,
          email: row.email || null,
          noHp: row.noHp || row.noHpAyah || row.noHpIbu || null,
          alamat: row.alamat || null,
          kota: row.kota || null,
          agama: row.agama || 'Islam',
          golonganDarah: row.golonganDarah || null,
          asalSekolah: row.asalSekolah || null,
          alamatSekolah: row.alamatSekolah || null,
          namaAyah: row.namaAyah || null,
          noHpAyah: row.noHpAyah || null,
          pekerjaanAyah: row.pekerjaanAyah || null,
          namaIbu: row.namaIbu || null,
          noHpIbu: row.noHpIbu || null,
          pekerjaanIbu: row.pekerjaanIbu || null,
          namaWali: row.namaWali || null,
          noHpWali: row.noHpWali || null,
          username: row.username || null,
          password: row.password ? String(row.password) : null,
          idKartu: row.idKartu || null,
          notes: row.notes || null,
          
          // Form Payment created automatically!
          formPayment: {
            create: {
              nominalDefault: defaultFee,
              nominalAktual: actualFee,
              diskon: diskon,
              status: actualFee > 0 ? 'Lunas' : 'Diskon Penuh',
              metodePembayaran: row.ketPembFormulir || 'Transfer',
              keterangan: 'Otomatis dari Import PPDB',
            },
          },

          // Bank Account initialized
          bankAccount: {
            create: {
              status: 'Belum dibuat',
              notes: 'Menunggu proses pembukaan rekening bank',
            },
          },

          // Re-registration initialized
          reRegistration: {
            create: {
              status: row.statusDaftarUlang && row.statusDaftarUlang !== 'Belum' ? row.statusDaftarUlang : 'Belum',
              amount: row.nominalDaftarUlang || 0,
              paymentMethod: row.metodeDaftarUlang || 'Transfer',
              notes: 'Status awal dari data PPDB',
            },
          },

          // Recommendation if present in file
          ...(row.rekomendasi
            ? {
                recommendation: {
                  create: {
                    recommenderName: row.rekomendasi,
                    recommenderCategory: 'Guru/Internal',
                    appreciationAmount: 500000,
                    paymentStatus: 'Belum',
                    notes: 'Dari data import PPDB',
                  },
                },
              }
            : {}),
        },
      });

      importedCount++;
    } catch (err: any) {
      console.error(`Error importing row ${row.rowNumber} (${row.namaLengkap}):`, err.message);
      errors.push({ row: row.rowNumber, name: row.namaLengkap, error: err.message });
      skippedCount++;
    }
  }

  if (importedCount > 0) {
    triggerAutoBackup();
  }

  return NextResponse.json({
    success: true,
    importedCount,
    skippedCount,
    errors,
    targetStatus,
    message: `Berhasil mengimpor ${importedCount} data siswa ke database Supabase (Status: ${targetStatus}).`,
  });
}
