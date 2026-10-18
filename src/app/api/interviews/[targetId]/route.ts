import { NextRequest, NextResponse } from 'next/server';
import { InterviewRepository } from '@/lib/interviewStorage';

interface RouteContext {
  params: {
    targetId: string;
  };
}

// GET /api/interviews/[targetId] - Retrieve interview session data, history, and schedule
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { targetId } = params;
    if (!targetId) {
      return NextResponse.json(
        { success: false, error: 'targetId diperlukan' },
        { status: 400 }
      );
    }

    const data = await InterviewRepository.getByTargetId(targetId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching interview data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengambil data wawancara' },
      { status: 500 }
    );
  }
}

// POST /api/interviews/[targetId] - Save draft or finalize interview session
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { targetId } = params;
    if (!targetId) {
      return NextResponse.json(
        { success: false, error: 'targetId diperlukan' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const savedSession = await InterviewRepository.saveSession(targetId, body);

    return NextResponse.json({
      success: true,
      message: savedSession.isDraft
        ? 'Draft hasil wawancara berhasil disimpan'
        : 'Hasil wawancara berhasil diselesaikan dan disimpan',
      data: savedSession,
    });
  } catch (error: any) {
    console.error('Error saving interview session:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan hasil wawancara' },
      { status: 400 }
    );
  }
}

// PUT /api/interviews/[targetId] - Update or create interview schedule
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { targetId } = params;
    if (!targetId) {
      return NextResponse.json(
        { success: false, error: 'targetId diperlukan' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const savedSchedule = await InterviewRepository.saveSchedule(targetId, body);

    return NextResponse.json({
      success: true,
      message: 'Jadwal wawancara berhasil diperbarui',
      data: savedSchedule,
    });
  } catch (error: any) {
    console.error('Error updating interview schedule:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui jadwal wawancara' },
      { status: 400 }
    );
  }
}
