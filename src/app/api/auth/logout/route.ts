import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'Berhasil keluar (logout)',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal logout' },
      { status: 500 }
    );
  }
}
