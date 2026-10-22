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

    // 1. Ambil nomor acuan default dari Pengaturan Master
    const settingObj = await prisma.appSetting.findUnique({
      where: { key: 'default_id_kartu' },
    });
    const masterStartCardId = (settingObj?.value || '1480026000').trim();
    const effectiveStartCardId = startCardIdParam || masterStartCardId;

    let cardCounter: bigint | null = null;
    let cardPrefix = '';
    let cardDigits = 0;

    const match = effectiveStartCardId.match(/^(\D*)(\d+)$/);
    if (match) {
      cardPrefix = match[1] || '';
      cardDigits = match[2].length;
      cardCounter = BigInt(match[2]);
    }

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
        idKartu: s.idKartu,
        isComplete: missing.length === 0,
        missingFields: missing,
      };
    });

    const completeCount = analyzed.filter((a) => a.isComplete).length;
    const incompleteCount = analyzed.length - completeCount;
    const studentsNeedingCard = students.filter((s) => !s.idKartu || !s.idKartu.trim());

    let rangePreview = 'Semua siswa sudah memiliki ID Kartu';
    let nextUpcomingId = masterStartCardId;

    if (studentsNeedingCard.length > 0 && cardCounter !== null) {
      const startNumStr = cardCounter.toString().padStart(cardDigits, '0');
      const startRangeId = `${cardPrefix}${startNumStr}`;
      const endCounter = cardCounter + BigInt(studentsNeedingCard.length - 1);
      const endNumStr = endCounter.toString().padStart(cardDigits, '0');
      const endRangeId = `${cardPrefix}${endNumStr}`;

      rangePreview =
        studentsNeedingCard.length === 1 ? startRangeId : `${startRangeId} s/d ${endRangeId}`;

      const afterCounter = cardCounter + BigInt(studentsNeedingCard.length);
      nextUpcomingId = `${cardPrefix}${afterCounter.toString().padStart(cardDigits, '0')}`;
    }

    if (mode === 'validate') {
      return NextResponse.json({
        success: true,
        summary: {
          total: students.length,
          completeCount,
          incompleteCount,
          nextCardId: masterStartCardId,
          studentsNeedingCard: studentsNeedingCard.length,
          rangePreview,
          nextUpcomingId,
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

    const rows: any[][] = [];
    let newlyAssignedCount = 0;

    for (const s of students) {
      const formattedDob = normalizeDobString(s.tanggalLahir);

      let cardId = s.idKartu ? s.idKartu.trim() : '';

      // Jika santri belum punya idKartu, berikan nomor berikutnya secara otomatis (+1)
      if (!cardId && cardCounter !== null) {
        const numStr = cardCounter.toString().padStart(cardDigits, '0');
        cardId = `${cardPrefix}${numStr}`;
        cardCounter = cardCounter + BigInt(1);
        newlyAssignedCount++;

        // Simpan langsung ke database santri agar nomor tersebut permanen untuk santri ini
        try {
          await prisma.student.update({
            where: { id: s.id },
            data: { idKartu: cardId },
          });
        } catch (e) {
          console.error('Failed to update student idKartu:', e);
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
        'Ya', // Format resmi CBS: "Ya" (Y kapital, a kecil)
        s.namaIbu || '',
      ]);
    }

    // Update nomor berikutnya ke Pengaturan Master (app_settings) jika ada nomor kartu baru yang di-generate
    if (newlyAssignedCount > 0 && cardCounter !== null) {
      const nextCardVal = `${cardPrefix}${cardCounter.toString().padStart(cardDigits, '0')}`;
      try {
        await prisma.appSetting.upsert({
          where: { key: 'default_id_kartu' },
          update: { value: nextCardVal },
          create: { key: 'default_id_kartu', value: nextCardVal },
        });
      } catch (e) {
        console.error('Failed to auto-increment master default_id_kartu:', e);
      }
    }

    const worksheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Format eksplisit untuk Excel: pastikan cell format Tanggal Lahir menggunakan TEXT (@)
    if (ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        // Kolom Tanggal Lahir (Index 4 / Kolom E): format Text (@)
        const dobCell = XLSX.utils.encode_cell({ r: R, c: 4 });
        if (ws[dobCell]) {
          ws[dobCell].t = 's';
          ws[dobCell].z = '@';
        }

        // Kolom Aktifkan Akun CBS? (Index 18 / Kolom S): format Text 'Ya'
        const cbsCell = XLSX.utils.encode_cell({ r: R, c: 18 });
        if (ws[cbsCell]) {
          ws[cbsCell].t = 's';
          ws[cbsCell].v = 'Ya';
        }

        // Kolom NISN (0), NIS (1), Nomor Telp (10), ID kartu (13), Telp Wali 1 (15), Telp Wali 2 (17)
        [0, 1, 10, 13, 15, 17].forEach((colIdx) => {
          const addr = XLSX.utils.encode_cell({ r: R, c: colIdx });
          if (ws[addr]) {
            ws[addr].t = 's';
            ws[addr].z = '@';
          }
        });
      }
    }

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
