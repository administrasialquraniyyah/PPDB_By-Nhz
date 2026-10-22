import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseExcelBuffer } from '@/lib/excelParser';
import { triggerAutoBackup } from '@/lib/backupService';
import { verifySession } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

async function getFormFee(jenjang: string): Promise<number> {
  try {
    const key = `FORM_FEE_${jenjang.toUpperCase()}`;
    const setting = await prisma.appSetting.findUnique({ where: { key } });
    if (setting && setting.value) {
      const val = parseFloat(setting.value);
      if (!isNaN(val)) return val;
    }
  } catch (e) {}
  return jenjang.toUpperCase() === 'TK' ? 150000 : 300000;
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await verifySession(['ADMIN', 'PANITIA', 'UNIT']);
    if (errorResponse) return errorResponse;

    const contentType = request.headers.get('content-type') || '';

    // Multipart Form Data (File Upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const academicYearId = (formData.get('academicYearId') as string) || '';
      const mode = (formData.get('mode') as string) || 'preview'; // 'preview' | 'commit'

      if (!file) {
        return NextResponse.json({ success: false, error: 'File Excel tidak ditemukan' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const parsed = parseExcelBuffer(buffer);

      if (parsed.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Tidak ada data calon santri yang valid di file Excel ini.' },
          { status: 400 }
        );
      }

      // Check existing applicants AND students for complete anti-duplication
      const [existingApplicants, existingStudents] = await Promise.all([
        prisma.applicant.findMany({
          where: academicYearId ? { academicYearId } : {},
          select: { id: true, noPendaftaran: true, nik: true, nisn: true, namaLengkap: true, jenjang: true },
        }),
        prisma.student.findMany({
          where: academicYearId ? { academicYearId } : {},
          select: { id: true, noPendaftaran: true, nik: true, nisn: true, namaLengkap: true, jenjang: true },
        }),
      ]);

      const allExisting = [...existingApplicants, ...existingStudents];

      const processedRows = parsed.rows.map((r) => {
        const rNoPend = (r.noPendaftaran || '').toLowerCase().trim();
        const rNik = (r.nik || '').toString().trim();
        const rNisn = (r.nisn || '').toString().trim();
        const rName = (r.namaLengkap || '').toLowerCase().trim();
        const rJenjang = (r.jenjang || 'SMP').toUpperCase().trim();

        const isDuplicate = allExisting.some((ex) => {
          // 1. Cek No. Registrasi / Pendaftaran (e.g. ALQ-2026-000012)
          const exNoPend = (ex.noPendaftaran || '').toLowerCase().trim();
          if (rNoPend && exNoPend && rNoPend === exNoPend) return true;

          // 2. Cek NIK
          const exNik = (ex.nik || '').toString().trim();
          if (rNik && exNik && rNik === exNik) return true;

          // 3. Cek NISN
          const exNisn = (ex.nisn || '').toString().trim();
          if (rNisn && exNisn && rNisn === exNisn) return true;

          // 4. Cek Nama Lengkap + Jenjang
          const exName = (ex.namaLengkap || '').toLowerCase().trim();
          const exJenjang = (ex.jenjang || 'SMP').toUpperCase().trim();
          if (rName && exName && rName === exName && rJenjang === exJenjang) return true;

          return false;
        });

        return { ...r, isDuplicate };
      });

      const duplicateCount = processedRows.filter((r) => r.isDuplicate).length;
      const newRowsCount = processedRows.filter((r) => !r.isDuplicate && !r.hasError).length;

      // If preview mode, return preview statistics
      if (mode === 'preview') {
        return NextResponse.json({
          success: true,
          preview: {
            sheets: parsed.sheets,
            selectedSheet: parsed.selectedSheet,
            totalRows: parsed.totalRows,
            validRows: parsed.validRows,
            newRowsCount,
            duplicateCount,
            invalidRows: parsed.invalidRows,
            rows: processedRows,
          },
        });
      }

      // Commit Mode
      return await commitApplicants({
        rows: processedRows,
        academicYearId,
      });
    }

    // JSON Payload
    const body = await request.json();
    const { rows, academicYearId } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada baris data untuk diimpor' }, { status: 400 });
    }

    return await commitApplicants({
      rows,
      academicYearId,
    });
  } catch (error: any) {
    console.error('Error importing applicants:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memproses import data pendaftar' },
      { status: 500 }
    );
  }
}

async function commitApplicants({
  rows,
  academicYearId,
}: {
  rows: any[];
  academicYearId: string;
}) {
  if (!academicYearId) {
    return NextResponse.json({ success: false, error: 'Tahun ajaran wajib dipilih' }, { status: 400 });
  }

  // Pre-load existing applicants AND students for anti-duplication
  const [existingApplicants, existingStudents] = await Promise.all([
    prisma.applicant.findMany({
      where: { academicYearId },
      select: { id: true, noPendaftaran: true, nik: true, nisn: true, namaLengkap: true, jenjang: true },
    }),
    prisma.student.findMany({
      where: { academicYearId },
      select: { id: true, noPendaftaran: true, nik: true, nisn: true, namaLengkap: true, jenjang: true },
    }),
  ]);

  const allExisting: any[] = [...existingApplicants, ...existingStudents];
  const createdList: any[] = [];
  const skippedList: any[] = [];

  // Cache form fee per jenjang
  const feeMap: Record<string, number> = {};
  for (const j of ['TK', 'SD', 'SMP', 'SMA']) {
    feeMap[j] = await getFormFee(j);
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const jenjang = (r.jenjang || 'SMP').toUpperCase();
    const cleanName = (r.namaLengkap || '').trim();
    if (!cleanName) continue;

    const rNoPend = (r.noPendaftaran || '').toLowerCase().trim();
    const rNik = (r.nik || '').toString().trim();
    const rNisn = (r.nisn || '').toString().trim();
    const rName = cleanName.toLowerCase();
    const rJenjang = jenjang;

    // Strict deduplication check
    const isDup = r.isDuplicate || allExisting.some((ex) => {
      const exNoPend = (ex.noPendaftaran || '').toLowerCase().trim();
      if (rNoPend && exNoPend && rNoPend === exNoPend) return true;

      const exNik = (ex.nik || '').toString().trim();
      if (rNik && exNik && rNik === exNik) return true;

      const exNisn = (ex.nisn || '').toString().trim();
      if (rNisn && exNisn && rNisn === exNisn) return true;

      const exName = (ex.namaLengkap || '').toLowerCase().trim();
      const exJenjang = (ex.jenjang || 'SMP').toUpperCase().trim();
      if (rName === exName && rJenjang === exJenjang) return true;

      return false;
    });

    if (isDup) {
      skippedList.push({ nama: cleanName, reason: 'Duplikat (Sudah ada di database)' });
      continue;
    }

    const nominalFormulir = feeMap[jenjang] || 300000;
    const noPendaftaran = r.noPendaftaran ? String(r.noPendaftaran).trim() : `ALQ-${new Date().getFullYear()}-${String(allExisting.length + createdList.length + 1).padStart(6, '0')}`;

    const newApplicant = await prisma.applicant.create({
      data: {
        academicYearId,
        noPendaftaran,
        namaLengkap: cleanName,
        jenjang,
        gelombang: r.gelombang || 'Gelombang 1',
        nik: r.nik ? String(r.nik).trim() : null,
        nisn: r.nisn ? String(r.nisn).trim() : null,
        jenisKelamin: r.jenisKelamin === 'L' || r.jenisKelamin === 'P' ? r.jenisKelamin : null,
        tempatLahir: r.tempatLahir ? String(r.tempatLahir).trim() : null,
        tanggalLahir: r.tanggalLahir ? String(r.tanggalLahir).trim() : null,
        email: r.email ? String(r.email).trim() : null,
        noHp: r.noHp ? String(r.noHp).trim() : null,
        alamat: r.alamat ? String(r.alamat).trim() : null,
        asalSekolah: r.asalSekolah ? String(r.asalSekolah).trim() : null,
        alamatSekolah: r.alamatSekolah ? String(r.alamatSekolah).trim() : null,
        namaAyah: r.namaAyah ? String(r.namaAyah).trim() : null,
        noHpAyah: r.noHpAyah ? String(r.noHpAyah).trim() : null,
        pekerjaanAyah: r.pekerjaanAyah ? String(r.pekerjaanAyah).trim() : null,
        namaIbu: r.namaIbu ? String(r.namaIbu).trim() : null,
        noHpIbu: r.noHpIbu ? String(r.noHpIbu).trim() : null,
        pekerjaanIbu: r.pekerjaanIbu ? String(r.pekerjaanIbu).trim() : null,
        namaWali: r.namaWali ? String(r.namaWali).trim() : null,
        noHpWali: r.noHpWali ? String(r.noHpWali).trim() : null,

        // Status awal baku pendaftar: otomatis LUNAS formulir (Transfer) sesuai aturan bisnis impor PPDB
        statusPendaftaran: 'TERDAFTAR',
        sudahBeliFormulir: true,
        nominalFormulir,
        statusBayarFormulir: 'LUNAS_TRANSFER',
        metodePembayaran: 'Transfer',
        tanggalBayarFormulir: new Date(),
        catatanPembayaran: 'Otomatis Lunas dari Import PPDB',
      },
    });

    createdList.push(newApplicant);
    allExisting.push({
      id: newApplicant.id,
      noPendaftaran: newApplicant.noPendaftaran,
      nik: newApplicant.nik,
      nisn: newApplicant.nisn,
      namaLengkap: newApplicant.namaLengkap,
      jenjang: newApplicant.jenjang,
    });
  }

  // Trigger backup silently
  triggerAutoBackup(2000);

  return NextResponse.json({
    success: true,
    message: `Berhasil mengimpor ${createdList.length} calon santri baru ke Data Pendaftar. (${skippedList.length} calon santri lainnya otomatis dilewati karena sudah ada sebelumnya).`,
    summary: {
      totalInput: rows.length,
      imported: createdList.length,
      skipped: skippedList.length,
      skippedDetails: skippedList,
    },
  });
}
