import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
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

    // 2. Fetch all students in this academic year
    const students = await prisma.student.findMany({
      where: {
        academicYearId: targetYearId,
        status: 'ACTIVE',
      },
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

    // 3. Stats by Jenjang
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

    // 5. Stats by Gelombang
    const gelombangCounts: Record<string, number> = {};

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

    // 9. Financial aggregates
    let totalFormTarget = 0;
    let totalFormActual = 0;
    let totalFormDiskon = 0;

    students.forEach((s) => {
      // Jenjang
      const j = s.jenjang.toUpperCase();
      if (j === 'TK' || j === 'STK') jenjangCounts.TK++;
      else if (j === 'SD') jenjangCounts.SD++;
      else if (j === 'SMP') jenjangCounts.SMP++;
      else if (j === 'SMA') jenjangCounts.SMA++;
      else jenjangCounts.SMP++;

      // Gender
      if (s.jenisKelamin === 'L') genderCounts.L++;
      else if (s.jenisKelamin === 'P') genderCounts.P++;
      else genderCounts.unknown++;

      // Gelombang
      const gel = s.gelombang || 'Gelombang 1';
      gelombangCounts[gel] = (gelombangCounts[gel] || 0) + 1;

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

      // Formulir
      if (s.formPayment) {
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

    return NextResponse.json({
      success: true,
      data: {
        academicYear: currentYear,
        pendaftar: {
          total: students.length,
          draftCount,
          byJenjang: jenjangCounts,
          byGender: genderCounts,
          byGelombang: gelombangCounts,
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
