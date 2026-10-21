import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.appSetting.findMany();
    const map: Record<string, string> = {
      fee_tk: '150000',
      fee_sd: '300000',
      fee_smp: '300000',
      fee_sma: '300000',
      apresiasi_guru: '500000',
      apresiasi_wali: '250000',
      default_id_kartu: '1480026000',
    };

    settings.forEach((s) => {
      map[s.key] = s.value;
    });

    return NextResponse.json({ success: true, data: map, list: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json(); // e.g. { fee_tk: "150000", fee_sd: "300000", ... }

    const updates = Object.entries(body).map(([key, value]) => {
      return prisma.appSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    });

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true, message: 'Pengaturan berhasil diperbarui' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
