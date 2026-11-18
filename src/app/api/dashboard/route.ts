import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await verifySession(['ADMIN', 'PANITIA', 'UNIT']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');

    // 1. Get or resolve academic year
    let targetYearId = academicYearId;
    let currentYear: any = null;

    if (targetYearId) {
      currentYear = await prisma.academicYear.findUnique({ where: { id: targetYearId } });
    }
    if (!currentYear) {
      currentYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
      if (!currentYear) {
        currentYear = await prisma.academicYear.findFirst({ orderBy: { name: 'desc' } });
      }
      targetYearId = currentYear?.id;
    }

    if (!targetYearId) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Belum ada tahun ajaran. Silakan tambahkan tahun ajaran terlebih dahulu.',
      });
    }

    // 2. Fetch students in this academic year (filtered if role is UNIT)
    const studentWhere: any = {
      academicYearId: targetYearId,
      status: 'ACTIVE',
    };
    if (user?.role === 'UNIT' && user?.jenjangScope) {
      studentWhere.jenjang = user.jenjangScope;
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        formPayment: true,
        recommendation: true,
        bankAccount: true,
        reRegistration: true,
      },
    });

    const draftCount = await prisma.student.count({
      where: {
        academicYearId: targetYearId,
        status: 'DRAFT',
      },
    });

    // 3. Stats by Jenjang (from Students)
    const jenjangCounts = {
      TK: 0,
      SD: 0,
      SMP: 0,
      SMA: 0,
    };

    // 4. Stats by Gender
    const genderCounts = {
      L: 0,
      P: 0,
      unknown: 0,
    };

    // 5. Stats by Gelombang & Matrix Jenjang x Gelombang
    const gelombangCounts: Record<string, number> = {};
    const gelombangSet = new Set<string>();
    const jenjangGelombangMatrix: Record<
      string,
      {
        TK: { total: number; L: number; P: number };
        SD: { total: number; L: number; P: number };
        SMP: { total: number; L: number; P: number };
        SMA: { total: number; L: number; P: number };
        total: number;
        L: number;
        P: number;
      }
    > = {};

    const totalsByJenjang: Record<string, { total: number; L: number; P: number }> = {
      TK: { total: 0, L: 0, P: 0 },
      SD: { total: 0, L: 0, P: 0 },
      SMP: { total: 0, L: 0, P: 0 },
      SMA: { total: 0, L: 0, P: 0 },
    };

    // 6. Stats by Rekomendasi
    const rekomendasiStats = {
      total: 0,
      guru: 0,
      wali: 0,
      alumni: 0,
      lainnya: 0,
      totalApresiasi: 0,
      apresiasiLunas: 0,
      apresiasiBelum: 0,
    };

    // 7. Stats by Rekening
    const rekeningStats = {
      sudah: 0,
      belum: 0,
    };

    // 8. Stats by Daftar Ulang
    const daftarUlangStats = {
      sudah: 0,
      belum: 0,
      batal: 0,
      totalNominalDU: 0,
    };

    students.forEach((s) => {
      // Jenjang
      const jRaw = (s.jenjang || '').toUpperCase().trim();
      let j: 'TK' | 'SD' | 'SMP' | 'SMA' = 'SMP';
      if (jRaw === 'TK' || jRaw === 'STK' || jRaw.includes('TK')) j = 'TK';
      else if (jRaw === 'SD' || jRaw.includes('SD')) j = 'SD';
      else if (jRaw === 'SMP' || jRaw.includes('SMP')) j = 'SMP';
      else if (jRaw === 'SMA' || jRaw.includes('SMA')) j = 'SMA';

      jenjangCounts[j]++;

      // Gender
      const jkRaw = (s.jenisKelamin || '').toUpperCase().trim();
      let jk: 'L' | 'P' | 'unknown' = 'unknown';
      if (jkRaw === 'L' || jkRaw.startsWith('L') || jkRaw.includes('LAKI')) {
        jk = 'L';
        genderCounts.L++;
      } else if (jkRaw === 'P' || jkRaw.startsWith('P') || jkRaw.includes('PEREMPUAN')) {
        jk = 'P';
        genderCounts.P++;
      } else {
        genderCounts.unknown++;
      }

      // Gelombang
      const gel = (s.gelombang || 'Gelombang 1').trim();
      gelombangCounts[gel] = (gelombangCounts[gel] || 0) + 1;
      gelombangSet.add(gel);

      if (!jenjangGelombangMatrix[gel]) {
        jenjangGelombangMatrix[gel] = {
          TK: { total: 0, L: 0, P: 0 },
          SD: { total: 0, L: 0, P: 0 },
          SMP: { total: 0, L: 0, P: 0 },
          SMA: { total: 0, L: 0, P: 0 },
          total: 0,
          L: 0,
          P: 0,
        };
      }

      jenjangGelombangMatrix[gel][j].total++;
      jenjangGelombangMatrix[gel].total++;
      totalsByJenjang[j].total++;

      if (jk === 'L') {
        jenjangGelombangMatrix[gel][j].L++;
        jenjangGelombangMatrix[gel].L++;
        totalsByJenjang[j].L++;
      } else if (jk === 'P') {
        jenjangGelombangMatrix[gel][j].P++;
        jenjangGelombangMatrix[gel].P++;
        totalsByJenjang[j].P++;
      }

      // Rekomendasi
      if (s.recommendation) {
        rekomendasiStats.total++;
        const cat = s.recommendation.recommenderCategory;
        if (cat === 'Guru/Internal') rekomendasiStats.guru++;
        else if (cat === 'Wali Santri') rekomendasiStats.wali++;
        else if (cat === 'Alumni') rekomendasiStats.alumni++;
        else rekomendasiStats.lainnya++;

        rekomendasiStats.totalApresiasi += s.recommendation.appreciationAmount;
        if (s.recommendation.paymentStatus === 'Lunas') {
          rekomendasiStats.apresiasiLunas += s.recommendation.appreciationAmount;
        } else {
          rekomendasiStats.apresiasiBelum += s.recommendation.appreciationAmount;
        }
      }

      // Rekening
      if (s.bankAccount && s.bankAccount.status === 'Sudah dibuat') {
        rekeningStats.sudah++;
      } else {
        rekeningStats.belum++;
      }

      // Daftar Ulang
      if (s.reRegistration) {
        if (s.reRegistration.status === 'Sudah') {
          daftarUlangStats.sudah++;
          daftarUlangStats.totalNominalDU += s.reRegistration.amount;
        } else if (s.reRegistration.status === 'Batal Masuk') {
          daftarUlangStats.batal++;
        } else {
          daftarUlangStats.belum++;
        }
      } else {
        daftarUlangStats.belum++;
      }
    });

    // 9. Financial aggregates from form payments across ALL Applicants + Standalone Students
    const applicantWhere: any = {
      academicYearId: targetYearId,
      ...(user?.role === 'UNIT' && user?.jenjangScope ? { jenjang: user.jenjangScope } : {}),
    };

    const allApplicantsInYear = await prisma.applicant.findMany({
      where: applicantWhere,
      select: {
        id: true,
        studentId: true,
        nominalFormulir: true,
        statusBayarFormulir: true,
        jenjang: true,
      },
    });

    const promotedStudentIds = new Set(
      allApplicantsInYear.map((a) => a.studentId).filter(Boolean)
    );

    let totalFormTarget = 0;
    let totalFormActual = 0;
    let totalFormDiskon = 0;

    allApplicantsInYear.forEach((a) => {
      const fee = a.nominalFormulir || 300000;
      totalFormTarget += fee;
      if (
        a.statusBayarFormulir === 'LUNAS_TRANSFER' ||
        a.statusBayarFormulir === 'LUNAS_CASH' ||
        a.statusBayarFormulir === 'Lunas'
      ) {
        totalFormActual += fee;
      }
    });

    students.forEach((s) => {
      if (!promotedStudentIds.has(s.id) && s.formPayment) {
        totalFormTarget += s.formPayment.nominalDefault;
        totalFormDiskon += s.formPayment.diskon;
        if (s.formPayment.status === 'Lunas') {
          totalFormActual += s.formPayment.nominalAktual;
        }
      }
    });

    // 10. Expenses
    const expenses = await prisma.expense.findMany({
      where: { academicYearId: targetYearId },
    });

    let totalExpenseYayasan = 0;
    let totalExpenseOperasional = 0;
    let totalExpenseOther = 0;

    expenses.forEach((e) => {
      if (e.category === 'Pengeluaran Yayasan') totalExpenseYayasan += e.amount;
      else if (e.category === 'Operasional PPDB' || e.category === 'Konsumsi/Penguji') totalExpenseOperasional += e.amount;
      else totalExpenseOther += e.amount;
    });

    const totalManualExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalPengeluaran = totalManualExpenses + rekomendasiStats.apresiasiLunas;
    const totalPemasukan = totalFormActual + daftarUlangStats.totalNominalDU;
    const saldo = totalPemasukan - totalPengeluaran;

    // Recent 5 students
    const recentStudents = students.slice(-5).reverse().map((s) => ({
      id: s.id,
      namaLengkap: s.namaLengkap,
      jenjang: s.jenjang,
      gelombang: s.gelombang,
      createdAt: s.createdAt,
      statusDaftarUlang: s.reRegistration?.status || 'Belum',
      statusRekening: s.bankAccount?.status || 'Belum dibuat',
    }));

    // Sort gelombang list naturally (e.g. Gelombang 1, Gelombang 2)
    const sortedGelombangList = Array.from(gelombangSet).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    return NextResponse.json({
      success: true,
      data: {
        academicYear: currentYear,
        pendaftar: {
          total: students.length, // Siswa resmi aktif
          totalApplicants: allApplicantsInYear.length, // Total calon pendaftar di modul PPDB
          draftCount,
          byJenjang: jenjangCounts,
          byGender: genderCounts,
          byGelombang: gelombangCounts,
          byJenjangAndGelombang: {
            gelombangList: sortedGelombangList,
            jenjangList: ['TK', 'SD', 'SMP', 'SMA'],
            matrix: jenjangGelombangMatrix,
            totalsByJenjang,
            grandTotal: students.length,
            totalL: genderCounts.L,
            totalP: genderCounts.P,
          },
        },
        rekomendasi: rekomendasiStats,
        rekening: rekeningStats,
        daftarUlang: daftarUlangStats,
        keuangan: {
          totalPemasukan,
          pemasukanFormulir: totalFormActual,
          pemasukanDaftarUlang: daftarUlangStats.totalNominalDU,
          totalFormTarget,
          totalFormDiskon,
          totalPengeluaran,
          totalApresiasiPaid: rekomendasiStats.apresiasiLunas,
          totalExpenseYayasan,
          totalExpenseOperasional,
          saldo,
        },
        recentStudents,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
