import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { triggerAutoBackup } from '@/lib/backupService';
import { verifySession } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await verifySession(['ADMIN', 'PANITIA', 'UNIT']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');
    const category = searchParams.get('category');
    const paymentStatus = searchParams.get('paymentStatus');
    const jenjang = searchParams.get('jenjang');

    const where: any = {
      student: {
        status: 'ACTIVE',
      },
    };

    if (academicYearId) {
      where.student.academicYearId = academicYearId;
    }
    if (category) {
      where.recommenderCategory = category;
    }
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    // Scoped Jenjang for UNIT
    const effectiveJenjang = (user?.role === 'UNIT' && user?.jenjangScope)
      ? user.jenjangScope
      : jenjang;

    if (effectiveJenjang) {
      where.student.jenjang = effectiveJenjang;
    }

    const recommendations = await prisma.recommendation.findMany({
      where,
      orderBy: [{ recommenderName: 'asc' }, { student: { namaLengkap: 'asc' } }],
      include: {
        student: {
          select: {
            id: true,
            namaLengkap: true,
            jenjang: true,
            gelombang: true,
            academicYear: true,
          },
        },
      },
    });

    // Grouping by recommender to calculate aggregated totals
    const groupMap: Record<
      string,
      {
        recommenderName: string;
        category: string;
        studentCount: number;
        totalAmount: number;
        paidAmount: number;
        unpaidAmount: number;
        students: any[];
      }
    > = {};

    let grandTotalAmount = 0;
    let grandTotalPaid = 0;
    let grandTotalUnpaid = 0;

    recommendations.forEach((rec) => {
      const key = `${rec.recommenderName.trim()}___${rec.recommenderCategory}`;
      if (!groupMap[key]) {
        groupMap[key] = {
          recommenderName: rec.recommenderName.trim(),
          category: rec.recommenderCategory,
          studentCount: 0,
          totalAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          students: [],
        };
      }

      groupMap[key].studentCount++;
      groupMap[key].totalAmount += rec.appreciationAmount;
      grandTotalAmount += rec.appreciationAmount;

      if (rec.paymentStatus === 'Lunas') {
        groupMap[key].paidAmount += rec.appreciationAmount;
        grandTotalPaid += rec.appreciationAmount;
      } else {
        groupMap[key].unpaidAmount += rec.appreciationAmount;
        grandTotalUnpaid += rec.appreciationAmount;
      }

      groupMap[key].students.push({
        id: rec.id,
        studentId: rec.studentId,
        studentName: rec.student.namaLengkap,
        jenjang: rec.student.jenjang,
        amount: rec.appreciationAmount,
        status: rec.paymentStatus,
        paymentDate: rec.paymentDate,
        notes: rec.notes,
      });
    });

    const groupedList = Object.values(groupMap).sort((a, b) => b.totalAmount - a.totalAmount);

    return NextResponse.json({
      success: true,
      summary: {
        totalStudents: recommendations.length,
        totalRecommenders: groupedList.length,
        grandTotalAmount,
        grandTotalPaid,
        grandTotalUnpaid,
      },
      grouped: groupedList,
      data: recommendations,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await verifySession(['ADMIN', 'PANITIA', 'UNIT']);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { studentId, recommenderName, recommenderCategory = 'Guru/Internal', appreciationAmount, paymentStatus = 'Belum', notes } = body;

    if (!studentId || !recommenderName) {
      return NextResponse.json({ success: false, error: 'Siswa dan Nama Perekomendasi wajib diisi' }, { status: 400 });
    }

    // If UNIT, check that student belongs to their unit
    if (user?.role === 'UNIT' && user?.jenjangScope) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { jenjang: true },
      });
      if (!student || student.jenjang !== user.jenjangScope) {
        return NextResponse.json(
          { success: false, error: `Akses ditolak: Anda hanya dapat menambahkan rekomendasi untuk siswa Unit ${user.jenjangScope}` },
          { status: 403 }
        );
      }
    }

    const rec = await prisma.recommendation.upsert({
      where: { studentId },
      create: {
        studentId,
        recommenderName: recommenderName.trim(),
        recommenderCategory,
        appreciationAmount: Number(appreciationAmount) || (recommenderCategory === 'Wali Santri' ? 250000 : 500000),
        paymentStatus,
        notes,
      },
      update: {
        recommenderName: recommenderName.trim(),
        recommenderCategory,
        appreciationAmount: Number(appreciationAmount),
        paymentStatus,
        notes,
      },
      include: {
        student: true,
      },
    });

    triggerAutoBackup();

    return NextResponse.json({ success: true, data: rec, message: 'Data rekomendasi berhasil disimpan' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, errorResponse } = await verifySession(['ADMIN', 'PANITIA', 'UNIT']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID rekomendasi wajib disertakan' }, { status: 400 });
    }

    if (user?.role === 'UNIT' && user?.jenjangScope) {
      const existing = await prisma.recommendation.findUnique({
        where: { id },
        include: { student: { select: { jenjang: true } } },
      });
      if (!existing || existing.student.jenjang !== user.jenjangScope) {
        return NextResponse.json(
          { success: false, error: `Akses ditolak: Anda hanya dapat menghapus rekomendasi siswa Unit ${user.jenjangScope}` },
          { status: 403 }
        );
      }
    }

    await prisma.recommendation.delete({
      where: { id },
    });

    triggerAutoBackup();

    return NextResponse.json({ success: true, message: 'Rekomendasi berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
