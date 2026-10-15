import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');
    const status = searchParams.get('status'); // 'Sudah dibuat' | 'Belum dibuat'
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

    const accounts = await prisma.bankAccount.findMany({
      where,
      orderBy: { student: { namaLengkap: 'asc' } },
      include: {
        student: {
          select: {
            id: true,
            namaLengkap: true,
            jenjang: true,
            gelombang: true,
            noInduk: true,
            nisn: true,
            nik: true,
            noHp: true,
            username: true,
            password: true,
            idKartu: true,
            academicYear: true,
          },
        },
      },
    });

    const countSudah = accounts.filter((a) => a.status === 'Sudah dibuat').length;
    const countBelum = accounts.length - countSudah;

    return NextResponse.json({
      success: true,
      summary: {
        total: accounts.length,
        countSudah,
        countBelum,
      },
      data: accounts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, accountNumber, bankName, createdDate, notes, student } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID rekening wajib disertakan' }, { status: 400 });
    }

    const updated = await prisma.bankAccount.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(accountNumber !== undefined ? { accountNumber: accountNumber ? String(accountNumber).trim() : null } : {}),
        ...(bankName !== undefined ? { bankName } : {}),
        ...(createdDate !== undefined ? { createdDate: createdDate ? new Date(createdDate) : null } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        student: true,
      },
    });

    // Update student credentials if provided
    if (student && updated.studentId) {
      await prisma.student.update({
        where: { id: updated.studentId },
        data: {
          ...(student.username !== undefined ? { username: student.username || null } : {}),
          ...(student.password !== undefined ? { password: student.password || null } : {}),
          ...(student.idKartu !== undefined ? { idKartu: student.idKartu || null } : {}),
        },
      });
    }

    return NextResponse.json({ success: true, data: updated, message: 'Data rekening berhasil diperbarui' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
