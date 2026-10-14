import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  try {
    const res: any = await prisma.$queryRawUnsafe('SELECT 1 as result, current_database() as db;');
    const latency = Date.now() - start;
    return NextResponse.json({
      status: 'connected',
      database: res[0]?.db || 'postgres',
      schema: 'ppdb',
      latencyMs: latency,
      timestamp: new Date().toISOString(),
      message: 'Database Supabase terhubung dengan normal',
    });
  } catch (error: any) {
    const latency = Date.now() - start;
    return NextResponse.json(
      {
        status: 'disconnected',
        error: error.message || 'Koneksi database gagal',
        latencyMs: latency,
        timestamp: new Date().toISOString(),
        message: 'Tidak dapat terhubung ke Supabase',
      },
      { status: 503 }
    );
  }
}
