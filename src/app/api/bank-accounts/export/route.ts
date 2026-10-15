import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { normalizeDobString } from '@/lib/excelParser';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');
    const jenjang = searchParams.get('jenjang');
    const statusRekening = searchParams.get('statusRekening') || 'Belum dibuat'; // default export yang belum dibuat
    const mode = searchParams.get('mode') || 'download'; // 'validate' | 'download'
    const startCardIdParam = searchParams.get('startCardId')?.trim();

    const where: any = {
      status: 'ACTIVE',
    };

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }
    if (jenjang) {
      where.jenjang = jenjang;
    }
    if (statusRekening) {
      where.bankAccount = {
        status: statusRekening,
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

    // Validation check for incomplete mandatory fields
    const analyzed = students.map((s) => {
      const missing: string[] = [];
      if (!s.namaLengkap) missing.push('Nama Lengkap');
      if (!s.noInduk && !s.nisn) missing.push('NIS/NISN');
      if (!s.tempatLahir) missing.push('Tempat Lahir');
      if (!s.tanggalLahir) missing.push('Tanggal Lahir');
      if (!s.alamat) missing.push('Alamat');
      if (!s.noHp && !s.noHpAyah && !s.noHpIbu) missing.push('Nomor Telp');

      return {
        id: s.id,
        nama: s.namaLengkap,
        jenjang: s.jenjang,
        isComplete: missing.length === 0,
        missingFields: missing,
      };
    });

    const completeCount = analyzed.filter((a) => a.isComplete).length;
    const incompleteCount = analyzed.length - completeCount;

    if (mode === 'validate') {
      return NextResponse.json({
        success: true,
        summary: {
          total: students.length,
          completeCount,
          incompleteCount,
        },
        items: analyzed,
      });
    }

    // Official CBS / Bank BSI / EduPay format headers:
    const headers = [
      'NISN',
      'NIS',
      'Nama Lengkap',
      'Tempat Lahir',
      'Tanggal Lahir (dd/mm/yyyy)',
      'Jenis Kelamin',
      'Agama',
      'Golongan Darah',
      'Alamat',
      'Kota',
      'Nomor Telp',
      'Email',
      'Tahun Masuk',
      'ID kartu',
      'Nama Lengkap Wali 1',
      'Nomor Telp Wali 1',
      'Nama Lengkap Wali 2',
      'Nomor Telp Wali 2',
      'Aktifkan Akun CBS?',
      'Nama Ibu',
    ];

    let cardCounter: bigint | null = null;
    let cardPrefix = '';
    let cardDigits = 0;

    if (startCardIdParam) {
      const match = startCardIdParam.match(/^(\D*)(\d+)$/);
      if (match) {
        cardPrefix = match[1] || '';
        cardDigits = match[2].length;
        cardCounter = BigInt(match[2]);
      }
    }

    const rows: any[][] = [];

    for (const s of students) {
      const formattedDob = normalizeDobString(s.tanggalLahir);

      let cardId = s.idKartu || '';
      if (cardCounter !== null) {
        const numStr = cardCounter.toString().padStart(cardDigits, '0');
        cardId = `${cardPrefix}${numStr}`;
        cardCounter = cardCounter + BigInt(1);

        // Persist to database so subsequent exports keep this ID
        if (s.idKartu !== cardId) {
          try {
            await prisma.student.update({
              where: { id: s.id },
              data: { idKartu: cardId },
            });
          } catch (e) {
            console.error('Failed to update student idKartu:', e);
          }
        }
      }

      // Format Jenis Kelamin: huruf besar inisial (Laki -> L, Perempuan -> P)
      let jkInitial = 'L';
      if (s.jenisKelamin) {
        const rawJk = s.jenisKelamin.trim().toUpperCase();
        if (rawJk.startsWith('P') || rawJk === 'PEREMPUAN') {
          jkInitial = 'P';
        } else {
          jkInitial = 'L';
        }
      }

      // Format Agama: tulisan islam huruf kecil semua ("islam")
      const agamaFormatted = (s.agama || 'islam').trim().toLowerCase();
      const tahunMasuk = s.academicYear?.name ? s.academicYear.name.split('/')[0] : '2026';

      rows.push([
        s.nisn || s.noInduk || '',
        s.noInduk || s.nisn || '',
        s.namaLengkap,
        s.tempatLahir || '',
        formattedDob,
        jkInitial,
        agamaFormatted,
        s.golonganDarah || 'o',
        s.alamat || '',
        s.kota || 'Tangerang Selatan',
        s.noHp || s.noHpAyah || s.noHpIbu || '',
        s.email || '',
        tahunMasuk,
        cardId,
        s.namaAyah || s.namaWali || 'Wali Siswa',
        s.noHpAyah || s.noHp || '',
        s.namaIbu || '',
        s.noHpIbu || '',
        'YA',
        s.namaIbu || '',
      ]);
    }

    const worksheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Worksheet');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `Format_Pembuatan_Rekening_${jenjang || 'Semua'}_${Date.now()}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
