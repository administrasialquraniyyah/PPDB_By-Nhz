import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { triggerAutoBackup } from '@/lib/backupService';
import { ensureDbSchema } from '@/lib/dbInit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await ensureDbSchema();
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');
    const search = searchParams.get('search')?.trim();
    const jenjang = searchParams.get('jenjang');
    const gelombang = searchParams.get('gelombang');
    const jenisKelamin = searchParams.get('jenisKelamin');
    const status = searchParams.get('status') || undefined; // 'ACTIVE' | 'DRAFT' | undefined (all)
    const statusRekening = searchParams.get('statusRekening'); // 'Sudah dibuat' | 'Belum dibuat'
    const statusDaftarUlang = searchParams.get('statusDaftarUlang'); // 'Sudah' | 'Belum'
    const hasRekomendasi = searchParams.get('hasRekomendasi'); // 'true' | 'false'

    const where: any = {};

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    if (status) {
      where.status = status;
    }

    if (jenjang) {
      where.jenjang = jenjang;
    }

    if (gelombang) {
      where.gelombang = gelombang;
    }

    if (jenisKelamin) {
      where.jenisKelamin = jenisKelamin;
    }

    if (search) {
      where.OR = [
        { namaLengkap: { contains: search, mode: 'insensitive' } },
        { noInduk: { contains: search, mode: 'insensitive' } },
        { nik: { contains: search, mode: 'insensitive' } },
        { nisn: { contains: search, mode: 'insensitive' } },
        { noHp: { contains: search, mode: 'insensitive' } },
        { namaAyah: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (statusRekening) {
      where.bankAccount = {
        status: statusRekening,
      };
    }

    if (statusDaftarUlang) {
      where.reRegistration = {
        status: statusDaftarUlang,
      };
    }

    if (hasRekomendasi === 'true') {
      where.recommendation = { isNot: null };
    } else if (hasRekomendasi === 'false') {
      where.recommendation = { is: null };
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { namaLengkap: 'asc' }],
      include: {
        academicYear: true,
        formPayment: true,
        recommendation: true,
        bankAccount: true,
        reRegistration: true,
      },
    });

    return NextResponse.json({
      success: true,
      total: students.length,
      data: students,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      academicYearId,
      namaLengkap,
      jenjang = 'SMP',
      gelombang = 'Gelombang 1',
      noInduk,
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
      namaIbu,
      status = 'ACTIVE',
    } = body;

    if (!namaLengkap || !academicYearId) {
      return NextResponse.json(
        { success: false, error: 'Nama lengkap dan Tahun Ajaran wajib diisi' },
        { status: 400 }
      );
    }

    // Determine default fee
    const settings = await prisma.appSetting.findMany();
    const feeKey = `fee_${jenjang.toLowerCase()}`;
    const settingObj = settings.find((s) => s.key === feeKey);
    const defaultFee = settingObj ? Number(settingObj.value) || 300000 : 300000;

    const student = await prisma.student.create({
      data: {
        academicYearId,
        namaLengkap: namaLengkap.trim(),
        jenjang,
        gelombang,
        noInduk,
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
        namaIbu,
        status,
        formPayment: {
          create: {
            nominalDefault: defaultFee,
            nominalAktual: defaultFee,
            diskon: 0,
            status: 'Lunas',
            metodePembayaran: 'Transfer',
            keterangan: 'Input manual siswa',
          },
        },
        bankAccount: {
          create: {
            status: 'Belum dibuat',
          },
        },
        reRegistration: {
          create: {
            status: 'Belum',
            amount: 0,
          },
        },
      },
      include: {
        formPayment: true,
        bankAccount: true,
        reRegistration: true,
        recommendation: true,
      },
    });

    // Trigger background auto-backup to local Excel
    triggerAutoBackup();

    return NextResponse.json({ success: true, data: student });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
