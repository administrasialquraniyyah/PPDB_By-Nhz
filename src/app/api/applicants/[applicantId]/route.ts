import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteContext {
  params: {
    applicantId: string;
  };
}

// GET /api/applicants/[applicantId] - Detail pendaftar with interviews and student record
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { applicantId } = params;

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      include: {
        academicYear: true,
        student: {
          include: {
            bankAccount: true,
            reRegistration: true,
            formPayment: true,
          },
        },
        interviews: {
          orderBy: { sessionNumber: 'desc' },
        },
      },
    });

    if (!applicant) {
      return NextResponse.json(
        { success: false, error: 'Data pendaftar tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: applicant,
    });
  } catch (error: any) {
    console.error('Error fetching applicant detail:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat detail pendaftar' },
      { status: 500 }
    );
  }
}

// PUT /api/applicants/[applicantId] - Edit pendaftar
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { applicantId } = params;
    const body = await request.json();

    const existing = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data pendaftar tidak ditemukan' },
        { status: 404 }
      );
    }

    const updated = await prisma.applicant.update({
      where: { id: applicantId },
      data: {
        namaLengkap: body.namaLengkap !== undefined ? body.namaLengkap.trim() : existing.namaLengkap,
        jenjang: body.jenjang !== undefined ? body.jenjang : existing.jenjang,
        gelombang: body.gelombang !== undefined ? body.gelombang : existing.gelombang,
        nik: body.nik !== undefined ? body.nik?.trim() : existing.nik,
        nisn: body.nisn !== undefined ? body.nisn?.trim() : existing.nisn,
        jenisKelamin: body.jenisKelamin !== undefined ? body.jenisKelamin : existing.jenisKelamin,
        tempatLahir: body.tempatLahir !== undefined ? body.tempatLahir?.trim() : existing.tempatLahir,
        tanggalLahir: body.tanggalLahir !== undefined ? body.tanggalLahir?.trim() : existing.tanggalLahir,
        email: body.email !== undefined ? body.email?.trim() : existing.email,
        noHp: body.noHp !== undefined ? body.noHp?.trim() : existing.noHp,
        alamat: body.alamat !== undefined ? body.alamat?.trim() : existing.alamat,
        asalSekolah: body.asalSekolah !== undefined ? body.asalSekolah?.trim() : existing.asalSekolah,
        namaAyah: body.namaAyah !== undefined ? body.namaAyah?.trim() : existing.namaAyah,
        noHpAyah: body.noHpAyah !== undefined ? body.noHpAyah?.trim() : existing.noHpAyah,
        namaIbu: body.namaIbu !== undefined ? body.namaIbu?.trim() : existing.namaIbu,
        noHpIbu: body.noHpIbu !== undefined ? body.noHpIbu?.trim() : existing.noHpIbu,
        namaWali: body.namaWali !== undefined ? body.namaWali?.trim() : existing.namaWali,
        noHpWali: body.noHpWali !== undefined ? body.noHpWali?.trim() : existing.noHpWali,
        statusPendaftaran: body.statusPendaftaran !== undefined ? body.statusPendaftaran : existing.statusPendaftaran,
        statusBayarFormulir: body.statusBayarFormulir !== undefined ? body.statusBayarFormulir : existing.statusBayarFormulir,
        nominalFormulir: body.nominalFormulir !== undefined ? Number(body.nominalFormulir) : existing.nominalFormulir,
        metodePembayaran: body.metodePembayaran !== undefined ? body.metodePembayaran : existing.metodePembayaran,
        noTransaksiFormulir: body.noTransaksiFormulir !== undefined ? body.noTransaksiFormulir : existing.noTransaksiFormulir,
        tanggalBayarFormulir: body.tanggalBayarFormulir ? new Date(body.tanggalBayarFormulir) : existing.tanggalBayarFormulir,
        nomorReferensiTransfer: body.nomorReferensiTransfer !== undefined ? body.nomorReferensiTransfer : existing.nomorReferensiTransfer,
        catatanPembayaran: body.catatanPembayaran !== undefined ? body.catatanPembayaran : existing.catatanPembayaran,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Data pendaftar berhasil diperbarui',
    });
  } catch (error: any) {
    console.error('Error updating applicant:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui data pendaftar' },
      { status: 500 }
    );
  }
}
