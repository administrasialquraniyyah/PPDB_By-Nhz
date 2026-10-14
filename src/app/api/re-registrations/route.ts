import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');
    const status = searchParams.get('status'); // 'Sudah' | 'Belum' | 'Batal Masuk'
    const jenjang = searchParams.get('jenjang');

    const where: any = {
      student: {
        status: 'ACTIVE',
      },
    };

    if (academicYearId) {
      where.student.academicYearId = academicYearId;
    }
    if (status) {
      where.status = status;
    }
    if (jenjang) {
      where.student.jenjang = jenjang;
    }

    const records = await prisma.reRegistration.findMany({
      where,
      orderBy: { student: { namaLengkap: 'asc' } },
      include: {
        student: {
          select: {
            id: true,
            namaLengkap: true,
            jenjang: true,
            gelombang: true,
            noHp: true,
            noInduk: true,
            academicYear: true,
          },
        },
      },
    });

    let totalAmount = 0;
    let countSudah = 0;
    let countBelum = 0;
    let countBatal = 0;

    records.forEach((r) => {
      if (r.status === 'Sudah') {
        totalAmount += r.amount;
        countSudah++;
      } else if (r.status === 'Batal Masuk') {
        countBatal++;
      } else {
        countBelum++;
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        total: records.length,
        totalAmount,
        countSudah,
        countBelum,
        countBatal,
      },
      data: records,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, amount, paymentMethod, paymentDate, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID daftar ulang wajib disertakan' }, { status: 400 });
    }

    const updated = await prisma.reRegistration.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(paymentMethod !== undefined ? { paymentMethod } : {}),
        ...(paymentDate !== undefined ? { paymentDate: paymentDate ? new Date(paymentDate) : null } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        student: true,
      },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Data daftar ulang berhasil diperbarui' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
