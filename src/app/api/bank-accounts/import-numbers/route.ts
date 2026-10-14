import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const academicYearId = (formData.get('academicYearId') as string) || '';

    if (!file) {
      return NextResponse.json({ success: false, error: 'File Excel tidak ditemukan' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const rawData: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });

    if (rawData.length === 0) {
      return NextResponse.json({ success: false, error: 'File Excel kosong' }, { status: 400 });
    }

    // Load active students in this academic year
    const where: any = { status: 'ACTIVE' };
    if (academicYearId) where.academicYearId = academicYearId;

    const students = await prisma.student.findMany({
      where,
      include: { bankAccount: true },
    });

    let updatedCount = 0;
    const notFound: string[] = [];

    for (const row of rawData) {
      if (!row || !row.length) continue;
      // In Rekening.xlsx: Row 0 has [Nama, Nama, NoRekening]
      // Or in standard table: [Nama, NoRek]
      let nama = '';
      let noRek = '';

      for (const cell of row) {
        const str = String(cell || '').trim();
        // Check if looks like account number (series of digits > 8)
        if (/^\d{8,20}$/.test(str)) {
          noRek = str;
        } else if (str.length > 3 && !nama && isNaN(Number(str))) {
          nama = str;
        }
      }

      if (nama && noRek) {
        // Find matching student
        const matched = students.find(
          (s) => s.namaLengkap.toLowerCase().trim() === nama.toLowerCase().trim()
        );

        if (matched) {
          await prisma.bankAccount.upsert({
            where: { studentId: matched.id },
            update: {
              accountNumber: noRek,
              status: 'Sudah dibuat',
              createdDate: new Date(),
            },
            create: {
              studentId: matched.id,
              accountNumber: noRek,
              status: 'Sudah dibuat',
              createdDate: new Date(),
            },
          });
          updatedCount++;
        } else {
          notFound.push(nama);
        }
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      notFoundCount: notFound.length,
      notFoundSample: notFound.slice(0, 10),
      message: `Berhasil memperbarui ${updatedCount} nomor rekening siswa ke status "Sudah dibuat".`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
