import { NextRequest, NextResponse } from 'next/server';
import { InterviewRepository } from '@/lib/interviewStorage';

// GET /api/interviews - Get all interview schedules and latest sessions for the queue list
export async function GET(request: NextRequest) {
  try {
    const schedules = await InterviewRepository.getAllSchedules();
    const latestSessions = await InterviewRepository.getAllLatestSessions();
    return NextResponse.json({
      success: true,
      data: {
        schedules,
        latestSessions,
      },
    });
  } catch (error: any) {
    console.error('Error fetching interview schedules:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengambil jadwal wawancara' },
      { status: 500 }
    );
  }
}
