import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseExcelBuffer } from '@/lib/excelParser';
import { triggerAutoBackup } from '@/lib/backupService';

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

      // Check existing applicants for deduplication
      const existingApplicants = await prisma.applicant.findMany({
        where: academicYearId ? { academicYearId } : {},
        select: { id: true, noPendaftaran: true, nik: true, namaLengkap: true, jenjang: true },
      });

      const processedRows = parsed.rows.map((r) => {
        const isDuplicate = existingApplicants.some((ex) => {
          if (r.noPendaftaran && ex.noPendaftaran && r.noPendaftaran === ex.noPendaftaran) return true;
          if (r.nik && ex.nik && r.nik === ex.nik) return true;
          return (
            r.namaLengkap.toLowerCase().trim() === ex.namaLengkap.toLowerCase().trim() &&
            r.jenjang.toUpperCase() === ex.jenjang.toUpperCase()
          );
        });
        return { ...r, isDuplicate };
      });

      const duplicateCount = processedRows.filter((r) => r.isDuplicate).length;

      // If preview mode, return preview statistics
      if (mode === 'preview') {
        return NextResponse.json({
          success: true,
          preview: {
            sheets: parsed.sheets,
            selectedSheet: parsed.selectedSheet,
            totalRows: parsed.totalRows,
            validRows: parsed.validRows,
            invalidRows: parsed.invalidRows,
            duplicateCount,
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

  // Pre-load existing applicants for anti-duplication
  const existingApplicants = await prisma.applicant.findMany({
    where: { academicYearId },
    select: { id: true, noPendaftaran: true, nik: true, namaLengkap: true, jenjang: true },
  });

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

    // Strict deduplication check
    const isDup = existingApplicants.some((ex) => {
      if (r.noPendaftaran && ex.noPendaftaran && r.noPendaftaran === ex.noPendaftaran) return true;
      if (r.nik && ex.nik && r.nik === ex.nik) return true;
      return (
        cleanName.toLowerCase() === ex.namaLengkap.toLowerCase().trim() &&
        jenjang === ex.jenjang.toUpperCase()
      );
    });

    if (isDup) {
      skippedList.push({ nama: cleanName, reason: 'Duplikat (Sudah ada di database pendaftar)' });
      continue;
    }

    const nominalFormulir = feeMap[jenjang] || 300000;
    const noPendaftaran = r.noPendaftaran || `ALQ-${new Date().getFullYear()}-${String(existingApplicants.length + createdList.length + 1).padStart(6, '0')}`;

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

        // Status awal baku
        statusPendaftaran: 'TERDAFTAR',
        sudahBeliFormulir: true,
        nominalFormulir,
        statusBayarFormulir: 'BELUM_BAYAR',
      },
    });

    createdList.push(newApplicant);
    existingApplicants.push({
      id: newApplicant.id,
      noPendaftaran: newApplicant.noPendaftaran,
      nik: newApplicant.nik,
      namaLengkap: newApplicant.namaLengkap,
      jenjang: newApplicant.jenjang,
    });
  }

  // Trigger backup silently
  triggerAutoBackup(2000);

  return NextResponse.json({
    success: true,
    message: `Berhasil mengimpor ${createdList.length} calon santri ke Data Pendaftar. (${skippedList.length} dilewati karena duplikat)`,
    summary: {
      totalInput: rows.length,
      imported: createdList.length,
      skipped: skippedList.length,
      skippedDetails: skippedList,
    },
  });
}
