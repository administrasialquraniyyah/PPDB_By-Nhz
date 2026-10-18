import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteContext {
  params: {
    applicantId: string;
  };
}

// POST /api/applicants/[applicantId]/promote - Promosikan pendaftar yang Lulus ke Data Siswa
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { applicantId } = params;

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      include: {
        student: true,
        interviews: { orderBy: { sessionNumber: 'desc' }, take: 1 },
      },
    });

    if (!applicant) {
      return NextResponse.json(
        { success: false, error: 'Data pendaftar tidak ditemukan' },
        { status: 404 }
      );
    }

    if (applicant.statusPendaftaran === 'DIBATALKAN') {
      return NextResponse.json(
        { success: false, error: 'Calon santri yang mengundurkan diri/dibatalkan tidak dapat dimasukkan ke Data Siswa.' },
        { status: 400 }
      );
    }

    // Anti-duplikasi: Jika sudah ada data siswa terkait, jangan buat siswa ganda
    if (applicant.studentId && applicant.student) {
      return NextResponse.json({
        success: true,
        message: 'Calon santri sudah terdaftar di Data Siswa sebelumnya.',
        data: applicant.student,
        isExisting: true,
      });
    }

    // Verifikasi kelulusan: Status harus LULUS atau hasil rekomendasi wawancara DITERIMA / DITERIMA_BERSYARAT
    const latestInterview = applicant.interviews.length > 0 ? applicant.interviews[0] : null;
    const isPassingRecommendation =
      latestInterview?.hasilRekomendasi === 'DITERIMA' ||
      latestInterview?.hasilRekomendasi === 'DITERIMA_BERSYARAT';

    if (applicant.statusPendaftaran !== 'LULUS' && !isPassingRecommendation) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Calon santri belum dinyatakan Lulus tes wawancara. Hanya pendaftar dengan status Lulus yang dapat diproses ke Data Siswa.',
        },
        { status: 400 }
      );
    }

    // Eksekusi transaksi atomik pembuatan siswa
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat data siswa di tabel students tanpa meminta input ulang
      const student = await tx.student.create({
        data: {
          academicYearId: applicant.academicYearId,
          status: 'ACTIVE',
          noPendaftaran: applicant.noPendaftaran,
          noInduk: null, // NIS diterbitkan resmi oleh administrasi, tidak dibuat otomatis
          namaLengkap: applicant.namaLengkap,
          jenjang: applicant.jenjang,
          gelombang: applicant.gelombang || 'Gelombang 1',
          nik: applicant.nik,
          nisn: applicant.nisn,
          jenisKelamin: applicant.jenisKelamin,
          tempatLahir: applicant.tempatLahir,
          tanggalLahir: applicant.tanggalLahir,
          email: applicant.email,
          noHp: applicant.noHp,
          alamat: applicant.alamat,
          kota: applicant.kota,
          agama: applicant.agama || 'Islam',
          asalSekolah: applicant.asalSekolah,
          alamatSekolah: applicant.alamatSekolah,
          namaAyah: applicant.namaAyah,
          noHpAyah: applicant.noHpAyah,
          pekerjaanAyah: applicant.pekerjaanAyah,
          namaIbu: applicant.namaIbu,
          noHpIbu: applicant.noHpIbu,
          pekerjaanIbu: applicant.pekerjaanIbu,
          namaWali: applicant.namaWali,
          noHpWali: applicant.noHpWali,
        },
      });

      // 2. Hubungkan pendaftar dengan id siswa baru dan pastikan status = LULUS
      const updatedApplicant = await tx.applicant.update({
        where: { id: applicant.id },
        data: {
          studentId: student.id,
          statusPendaftaran: 'LULUS',
        },
      });

      // 3. Buat catatan formPayment yang sesuai dengan status bayar pendaftar
      // Jika status formulir pendaftar sudah lunas (Cash/Transfer), catat lunas. Jika belum, catat Belum.
      const isPaid = applicant.statusBayarFormulir === 'LUNAS_CASH' || applicant.statusBayarFormulir === 'LUNAS_TRANSFER';
      await tx.formPayment.create({
        data: {
          studentId: student.id,
          nominalDefault: applicant.nominalFormulir,
          nominalAktual: applicant.nominalFormulir,
          status: isPaid ? 'Lunas' : 'Belum',
          metodePembayaran: applicant.metodePembayaran || (isPaid ? 'Transfer' : null),
          tanggal: applicant.tanggalBayarFormulir || (isPaid ? new Date() : null),
          keterangan: `Dipromosikan dari Data Pendaftar (${applicant.noPendaftaran || '-'})`,
        },
      });

      // 4. Inisialisasi BankAccount dan ReRegistration kosong (Belum dibuat / Belum bayar DU)
      await tx.bankAccount.create({
        data: {
          studentId: student.id,
          status: 'Belum dibuat',
        },
      });

      await tx.reRegistration.create({
        data: {
          studentId: student.id,
          status: 'Belum',
          amount: 0,
        },
      });

      return { student, applicant: updatedApplicant };
    });

    return NextResponse.json({
      success: true,
      message: `Calon santri ${result.student.namaLengkap} berhasil dipromosikan menjadi Data Siswa!`,
      data: result.student,
    });
  } catch (error: any) {
    console.error('Error promoting applicant to student:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memproses pendaftar menjadi siswa' },
      { status: 500 }
    );
  }
}
