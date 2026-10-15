import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { triggerAutoBackup } from '@/lib/backupService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        academicYear: true,
        formPayment: true,
        recommendation: true,
        bankAccount: true,
        reRegistration: true,
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: student });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const {
      namaLengkap,
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
      alamatSekolah,
      namaAyah,
      noHpAyah,
      namaIbu,
      noHpIbu,
      username,
      password,
      idKartu,
      notes,
      status,
      // Related nested updates if provided
      formPayment,
      bankAccount,
      reRegistration,
      recommendation,
    } = body;

    const student = await prisma.student.update({
      where: { id: params.id },
      data: {
        ...(namaLengkap !== undefined ? { namaLengkap: namaLengkap.trim() } : {}),
        ...(jenjang !== undefined ? { jenjang } : {}),
        ...(gelombang !== undefined ? { gelombang } : {}),
        ...(noInduk !== undefined ? { noInduk } : {}),
        ...(nik !== undefined ? { nik } : {}),
        ...(nisn !== undefined ? { nisn } : {}),
        ...(jenisKelamin !== undefined ? { jenisKelamin } : {}),
        ...(tempatLahir !== undefined ? { tempatLahir } : {}),
        ...(tanggalLahir !== undefined ? { tanggalLahir } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(noHp !== undefined ? { noHp } : {}),
        ...(alamat !== undefined ? { alamat } : {}),
        ...(asalSekolah !== undefined ? { asalSekolah } : {}),
        ...(alamatSekolah !== undefined ? { alamatSekolah } : {}),
        ...(namaAyah !== undefined ? { namaAyah } : {}),
        ...(noHpAyah !== undefined ? { noHpAyah } : {}),
        ...(namaIbu !== undefined ? { namaIbu } : {}),
        ...(noHpIbu !== undefined ? { noHpIbu } : {}),
        ...(username !== undefined ? { username } : {}),
        ...(password !== undefined ? { password } : {}),
        ...(idKartu !== undefined ? { idKartu } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(status !== undefined ? { status } : {}),

        // Update Form Payment if provided
        ...(formPayment
          ? {
              formPayment: {
                upsert: {
                  create: {
                    nominalDefault: Number(formPayment.nominalDefault) || 300000,
                    nominalAktual: Number(formPayment.nominalAktual) || 300000,
                    diskon: Number(formPayment.diskon) || 0,
                    status: formPayment.status || 'Lunas',
                    metodePembayaran: formPayment.metodePembayaran || 'Transfer',
                    keterangan: formPayment.keterangan || null,
                  },
                  update: {
                    ...(formPayment.nominalDefault !== undefined ? { nominalDefault: Number(formPayment.nominalDefault) } : {}),
                    ...(formPayment.nominalAktual !== undefined ? { nominalAktual: Number(formPayment.nominalAktual) } : {}),
                    ...(formPayment.diskon !== undefined ? { diskon: Number(formPayment.diskon) } : {}),
                    ...(formPayment.status !== undefined ? { status: formPayment.status } : {}),
                    ...(formPayment.metodePembayaran !== undefined ? { metodePembayaran: formPayment.metodePembayaran } : {}),
                    ...(formPayment.keterangan !== undefined ? { keterangan: formPayment.keterangan } : {}),
                  },
                },
              },
            }
          : {}),

        // Update Bank Account if provided
        ...(bankAccount
          ? {
              bankAccount: {
                upsert: {
                  create: {
                    status: bankAccount.status || 'Belum dibuat',
                    accountNumber: bankAccount.accountNumber || null,
                    notes: bankAccount.notes || null,
                  },
                  update: {
                    ...(bankAccount.status !== undefined ? { status: bankAccount.status } : {}),
                    ...(bankAccount.accountNumber !== undefined ? { accountNumber: bankAccount.accountNumber } : {}),
                    ...(bankAccount.notes !== undefined ? { notes: bankAccount.notes } : {}),
                  },
                },
              },
            }
          : {}),

        // Update Re-registration if provided
        ...(reRegistration
          ? {
              reRegistration: {
                upsert: {
                  create: {
                    status: reRegistration.status || 'Belum',
                    amount: Number(reRegistration.amount) || 0,
                    paymentMethod: reRegistration.paymentMethod || 'Transfer',
                    notes: reRegistration.notes || null,
                  },
                  update: {
                    ...(reRegistration.status !== undefined ? { status: reRegistration.status } : {}),
                    ...(reRegistration.amount !== undefined ? { amount: Number(reRegistration.amount) } : {}),
                    ...(reRegistration.paymentMethod !== undefined ? { paymentMethod: reRegistration.paymentMethod } : {}),
                    ...(reRegistration.notes !== undefined ? { notes: reRegistration.notes } : {}),
                  },
                },
              },
            }
          : {}),
      },
      include: {
        formPayment: true,
        bankAccount: true,
        reRegistration: true,
        recommendation: true,
      },
    });

    triggerAutoBackup();

    return NextResponse.json({ success: true, data: student, message: 'Data siswa berhasil diperbarui' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const student = await prisma.student.delete({
      where: { id: params.id },
    });

    triggerAutoBackup();

    return NextResponse.json({ success: true, message: `Data siswa "${student.namaLengkap}" berhasil dihapus` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
