import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { name: 'desc' },
      include: {
        _count: {
          select: {
            students: true,
            expenses: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: years });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, isActive } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Nama tahun ajaran wajib diisi (contoh: 2026/2027)' }, { status: 400 });
    }

    const cleanName = name.trim();

    // If setting active, deactivate all other years first
    if (isActive) {
      await prisma.academicYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const year = await prisma.academicYear.upsert({
      where: { name: cleanName },
      update: { ...(isActive !== undefined ? { isActive } : {}) },
      create: {
        name: cleanName,
        isActive: !!isActive,
      },
    });

    return NextResponse.json({ success: true, data: year });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
