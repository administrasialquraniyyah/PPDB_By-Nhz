import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');
    const jenjang = searchParams.get('jenjang');
    const status = searchParams.get('status'); // 'Lunas' | 'Belum' | 'Diskon Penuh'

    const where: any = {
      student: {
        status: 'ACTIVE',
      },
    };

    if (academicYearId) {
      where.student.academicYearId = academicYearId;
    }
    if (jenjang) {
      where.student.jenjang = jenjang;
    }
    if (status) {
      where.status = status;
    }

    const formPayments = await prisma.formPayment.findMany({
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
            status: true,
          },
        },
      },
    });

    // Summary calculations
    let totalTarget = 0;
    let totalAktual = 0;
    let totalDiskon = 0;
    let countLunas = 0;
    let countBelum = 0;

    formPayments.forEach((fp) => {
      totalTarget += fp.nominalDefault;
      totalDiskon += fp.diskon;
      if (fp.status === 'Lunas') {
        totalAktual += fp.nominalAktual;
        countLunas++;
      } else {
        countBelum++;
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalRecords: formPayments.length,
        totalTarget,
        totalAktual,
        totalDiskon,
        countLunas,
        countBelum,
      },
      data: formPayments,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, nominalDefault, nominalAktual, diskon, status, metodePembayaran, keterangan, tanggal } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID formulir wajib disertakan' }, { status: 400 });
    }

    const updated = await prisma.formPayment.update({
      where: { id },
      data: {
        ...(nominalDefault !== undefined ? { nominalDefault: Number(nominalDefault) } : {}),
        ...(nominalAktual !== undefined ? { nominalAktual: Number(nominalAktual) } : {}),
        ...(diskon !== undefined ? { diskon: Number(diskon) } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(metodePembayaran !== undefined ? { metodePembayaran } : {}),
        ...(keterangan !== undefined ? { keterangan } : {}),
        ...(tanggal !== undefined ? { tanggal: new Date(tanggal) } : {}),
      },
      include: {
        student: true,
      },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Data formulir berhasil diperbarui' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
