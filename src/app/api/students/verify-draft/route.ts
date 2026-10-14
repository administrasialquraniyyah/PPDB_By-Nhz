import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentIds, action = 'activate' } = body; // action: 'activate' | 'delete'

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Pilih minimal satu siswa' }, { status: 400 });
    }

    if (action === 'delete') {
      const res = await prisma.student.deleteMany({
        where: {
          id: { in: studentIds },
          status: 'DRAFT',
        },
      });
      return NextResponse.json({
        success: true,
        count: res.count,
        message: `${res.count} data draft berhasil dihapus.`,
      });
    }

    // Default: activate
    const res = await prisma.student.updateMany({
      where: {
        id: { in: studentIds },
        status: 'DRAFT',
      },
      data: {
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      count: res.count,
      message: `${res.count} data siswa berhasil diverifikasi dan diaktifkan.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
