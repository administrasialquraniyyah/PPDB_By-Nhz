import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/authGuard';

// Helper to get form fee based on jenjang from app_settings
async function getFormFeeForJenjang(jenjang: string): Promise<number> {
  try {
    const key = `FORM_FEE_${jenjang.toUpperCase()}`;
    const setting = await prisma.appSetting.findUnique({ where: { key } });
    if (setting && setting.value) {
      const val = parseFloat(setting.value);
      if (!isNaN(val)) return val;
    }
  } catch (e) {
    console.error('Error fetching form fee setting:', e);
  }
  return jenjang.toUpperCase() === 'TK' ? 150000 : 300000;
}

// GET /api/applicants - List all applicants with comprehensive filters
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await verifySession(['ADMIN', 'PANITIA', 'UNIT', 'PEWAWANCARA']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');
    const status = searchParams.get('status'); // 'ALL' | 'TERDAFTAR' | 'LULUS' | 'DIBATALKAN' | etc.
    const jenjang = searchParams.get('jenjang');
    const gelombang = searchParams.get('gelombang');
    const jenisKelamin = searchParams.get('jenisKelamin');
    const search = searchParams.get('search')?.trim();

    const where: any = {};

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    if (status && status !== 'ALL') {
      where.statusPendaftaran = status;
    }

    // Scoped Jenjang for UNIT (e.g. Unit SD)
    const effectiveJenjang = (user?.role === 'UNIT' && user?.jenjangScope)
      ? user.jenjangScope
      : jenjang;

    if (effectiveJenjang && effectiveJenjang !== 'ALL') {
      where.jenjang = effectiveJenjang;
    }

    if (gelombang && gelombang !== 'ALL') {
      where.gelombang = gelombang;
    }

    if (jenisKelamin && jenisKelamin !== 'ALL') {
      where.jenisKelamin = jenisKelamin;
    }

    if (search) {
      where.OR = [
        { namaLengkap: { contains: search, mode: 'insensitive' } },
        { noPendaftaran: { contains: search, mode: 'insensitive' } },
        { noHp: { contains: search, mode: 'insensitive' } },
        { asalSekolah: { contains: search, mode: 'insensitive' } },
        { nik: { contains: search, mode: 'insensitive' } },
        { nisn: { contains: search, mode: 'insensitive' } },
      ];
    }

    const applicants = await prisma.applicant.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        academicYear: { select: { id: true, name: true } },
        student: { select: { id: true, noInduk: true, status: true } },
        interviews: {
          orderBy: { sessionNumber: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: applicants,
      total: applicants.length,
    });
  } catch (error: any) {
    console.error('Error fetching applicants:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat data pendaftar' },
      { status: 500 }
    );
  }
}

// POST /api/applicants - Manually create a single applicant
export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await verifySession(['ADMIN', 'PANITIA', 'UNIT']);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const forcedJenjang = (user?.role === 'UNIT' && user?.jenjangScope)
      ? user.jenjangScope
      : body.jenjang;

    const {
      academicYearId,
      noPendaftaran,
      namaLengkap,
      jenjang = forcedJenjang,
      gelombang,
      nik,
      nisn,
      jenisKelamin,
      tempatLahir,
      tanggalLahir,
      email,
      noHp,
      alamat,
      asalSekolah,
      namaAyah,
      noHpAyah,
      namaIbu,
      noHpIbu,
      statusBayarFormulir,
      metodePembayaran,
    } = body;

    if (!academicYearId || !namaLengkap || !jenjang) {
      return NextResponse.json(
        { success: false, error: 'Tahun ajaran, nama lengkap, dan jenjang wajib diisi' },
        { status: 400 }
      );
    }

    // Deduplication check
    if (noPendaftaran) {
      const existing = await prisma.applicant.findUnique({
        where: { noPendaftaran },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `No. Pendaftaran ${noPendaftaran} sudah terdaftar!` },
          { status: 400 }
        );
      }
    }

    const fee = await getFormFeeForJenjang(jenjang);

    const applicant = await prisma.applicant.create({
      data: {
        academicYearId,
        noPendaftaran: noPendaftaran || `ALQ-${Date.now().toString().slice(-6)}`,
        namaLengkap: namaLengkap.trim(),
        jenjang,
        gelombang: gelombang || 'Gelombang 1',
        nik: nik?.trim() || null,
        nisn: nisn?.trim() || null,
        jenisKelamin: jenisKelamin || null,
        tempatLahir: tempatLahir?.trim() || null,
        tanggalLahir: tanggalLahir?.trim() || null,
        email: email?.trim() || null,
        noHp: noHp?.trim() || null,
        alamat: alamat?.trim() || null,
        asalSekolah: asalSekolah?.trim() || null,
        namaAyah: namaAyah?.trim() || null,
        noHpAyah: noHpAyah?.trim() || null,
        namaIbu: namaIbu?.trim() || null,
        noHpIbu: noHpIbu?.trim() || null,
        statusPendaftaran: 'TERDAFTAR',
        sudahBeliFormulir: true,
        nominalFormulir: fee,
        statusBayarFormulir: statusBayarFormulir || 'BELUM_BAYAR',
        metodePembayaran: metodePembayaran || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: applicant,
      message: 'Pendaftar berhasil ditambahkan',
    });
  } catch (error: any) {
    console.error('Error creating applicant:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menambahkan pendaftar' },
      { status: 500 }
    );
  }
}
