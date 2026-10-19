import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { user, errorResponse } = await verifySession(['ADMIN', 'PANITIA', 'UNIT', 'PEWAWANCARA']);
    if (errorResponse) return errorResponse;

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memverifikasi akun' },
      { status: 500 }
    );
  }
}
