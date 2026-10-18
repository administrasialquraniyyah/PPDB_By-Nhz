import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteContext {
  params: {
    applicantId: string;
  };
}

// POST /api/applicants/[applicantId]/cancel - Batalkan pendaftaran calon santri
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { applicantId } = params;
    const body = await request.json();
    const { alasanPembatalan, batalBy } = body;

    if (!alasanPembatalan || typeof alasanPembatalan !== 'string' || !alasanPembatalan.trim()) {
      return NextResponse.json(
        { success: false, error: 'Alasan pembatalan pendaftaran wajib diisi' },
        { status: 400 }
      );
    }

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      include: { student: true },
    });

    if (!applicant) {
      return NextResponse.json(
        { success: false, error: 'Data pendaftar tidak ditemukan' },
        { status: 404 }
      );
    }

    // Aturan bisnis: Jika pendaftar sudah dipromosikan ke Data Siswa, jangan hapus siswa diam-diam,
    // melainkan tandai status pendaftaran dibatalkan dan beri catatan.
    const now = new Date();

    const updated = await prisma.applicant.update({
      where: { id: applicantId },
      data: {
        statusPendaftaran: 'DIBATALKAN',
        alasanPembatalan: alasanPembatalan.trim(),
        batalAt: now,
        batalBy: (batalBy || 'Petugas PPDB').trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pendaftaran calon santri berhasil dibatalkan. Riwayat data tetap aman.',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error canceling applicant registration:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal membatalkan pendaftaran' },
      { status: 500 }
    );
  }
}

// PUT /api/applicants/[applicantId]/cancel - Re-aktivasi pendaftaran yang sebelumnya dibatalkan
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { applicantId } = params;

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant) {
      return NextResponse.json(
        { success: false, error: 'Data pendaftar tidak ditemukan' },
        { status: 404 }
      );
    }

    const updated = await prisma.applicant.update({
      where: { id: applicantId },
      data: {
        statusPendaftaran: 'TERDAFTAR',
        alasanPembatalan: null,
        batalAt: null,
        batalBy: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Status pendaftaran berhasil diaktifkan kembali.',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error reactivating applicant:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengaktifkan kembali pendaftar' },
      { status: 500 }
    );
  }
}
