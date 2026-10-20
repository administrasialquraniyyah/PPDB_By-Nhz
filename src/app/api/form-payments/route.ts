import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { triggerAutoBackup } from '@/lib/backupService';
import { verifySession } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await verifySession(['ADMIN', 'PANITIA', 'UNIT']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');
    const jenjang = searchParams.get('jenjang');
    const status = searchParams.get('status'); // 'Lunas' | 'Belum' | 'Diskon Penuh'
    const metode = searchParams.get('metode'); // 'Transfer' | 'Cash'
    const search = searchParams.get('search')?.toLowerCase().trim();

    // Lock jenjang for Unit SD
    const effectiveJenjang = (user?.role === 'UNIT' && user?.jenjangScope)
      ? user.jenjangScope
      : jenjang;

    // 1. Fetch all applicants in this academic year
    const applicantWhere: any = {};
    if (academicYearId) {
      applicantWhere.academicYearId = academicYearId;
    }
    if (effectiveJenjang) {
      applicantWhere.jenjang = effectiveJenjang;
    }

    const applicants = await prisma.applicant.findMany({
      where: applicantWhere,
      include: {
        student: {
          include: {
            formPayment: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const promotedStudentIds = new Set(
      applicants.map((a) => a.studentId).filter(Boolean)
    );

    // 2. Map applicants to unified form payment records
    const unifiedList: any[] = [];

    for (const app of applicants) {
      const hasStudentFp = app.student?.formPayment;

      if (hasStudentFp) {
        const fp = app.student!.formPayment!;
        unifiedList.push({
          id: fp.id,
          applicantId: app.id,
          studentId: app.studentId,
          source: 'STUDENT',
          isPromoted: true,
          nominalDefault: fp.nominalDefault,
          nominalAktual: fp.nominalAktual,
          diskon: fp.diskon,
          status: fp.status,
          metodePembayaran: fp.metodePembayaran || 'Transfer',
          tanggal: fp.tanggal,
          keterangan: fp.keterangan || `Dipromosikan dari Data Pendaftar (${app.noPendaftaran || '-'})`,
          student: {
            id: app.student!.id,
            namaLengkap: app.student!.namaLengkap,
            jenjang: app.student!.jenjang,
            gelombang: app.student!.gelombang,
            noHp: app.student!.noHp,
            status: app.student!.status,
            noPendaftaran: app.noPendaftaran,
            isPromoted: true,
          },
        });
      } else {
        const isPaid =
          app.statusBayarFormulir === 'LUNAS_TRANSFER' ||
          app.statusBayarFormulir === 'LUNAS_CASH' ||
          app.statusBayarFormulir === 'Lunas';

        const metodePay =
          app.metodePembayaran ||
          (app.statusBayarFormulir === 'LUNAS_CASH'
            ? 'Cash'
            : isPaid
            ? 'Transfer'
            : null);

        const fee = app.nominalFormulir || 300000;

        unifiedList.push({
          id: `app_${app.id}`,
          applicantId: app.id,
          studentId: app.studentId || null,
          source: 'APPLICANT',
          isPromoted: false,
          nominalDefault: fee,
          nominalAktual: isPaid ? fee : 0,
          diskon: 0,
          status: isPaid ? 'Lunas' : 'Belum',
          metodePembayaran: metodePay,
          tanggal: app.tanggalBayarFormulir || app.createdAt,
          keterangan:
            app.catatanPembayaran ||
            `Pendaftar PPDB (${app.noPendaftaran || '-'})`,
          student: {
            id: app.id,
            namaLengkap: app.namaLengkap,
            jenjang: app.jenjang,
            gelombang: app.gelombang || 'Gelombang 1',
            noHp: app.noHp,
            status: app.statusPendaftaran,
            noPendaftaran: app.noPendaftaran,
            isPromoted: false,
          },
        });
      }
    }

    // 3. Find any standalone students (not tied to applicant)
    const studentWhere: any = {
      ...(academicYearId ? { academicYearId } : {}),
      ...(effectiveJenjang ? { jenjang: effectiveJenjang } : {}),
      status: 'ACTIVE',
      id: { notIn: Array.from(promotedStudentIds) as string[] },
    };

    const standaloneStudents = await prisma.student.findMany({
      where: studentWhere,
      include: {
        formPayment: true,
      },
    });

    for (const st of standaloneStudents) {
      if (st.formPayment) {
        const fp = st.formPayment;
        unifiedList.push({
          id: fp.id,
          applicantId: null,
          studentId: st.id,
          source: 'STUDENT',
          isPromoted: true,
          nominalDefault: fp.nominalDefault,
          nominalAktual: fp.nominalAktual,
          diskon: fp.diskon,
          status: fp.status,
          metodePembayaran: fp.metodePembayaran || 'Transfer',
          tanggal: fp.tanggal,
          keterangan: fp.keterangan || 'Data Siswa Mandiri',
          student: {
            id: st.id,
            namaLengkap: st.namaLengkap,
            jenjang: st.jenjang,
            gelombang: st.gelombang,
            noHp: st.noHp,
            status: st.status,
            noPendaftaran: st.noPendaftaran,
            isPromoted: true,
          },
        });
      }
    }

    // Sort by name alphabetically
    unifiedList.sort((a, b) =>
      (a.student.namaLengkap || '').localeCompare(b.student.namaLengkap || '')
    );

    // Apply Filters (status, metode, search)
    let filtered = unifiedList;

    if (status) {
      filtered = filtered.filter((item) => item.status === status);
    }

    if (metode) {
      filtered = filtered.filter(
        (item) => item.metodePembayaran?.toLowerCase() === metode.toLowerCase()
      );
    }

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.student.namaLengkap?.toLowerCase().includes(search) ||
          item.student.noPendaftaran?.toLowerCase().includes(search) ||
          item.student.jenjang?.toLowerCase().includes(search)
      );
    }

    // Summary calculations across filtered items
    let totalTarget = 0;
    let totalAktual = 0;
    let totalDiskon = 0;
    let countLunas = 0;
    let countBelum = 0;
    let totalCash = 0;
    let countCash = 0;
    let totalTransfer = 0;
    let countTransfer = 0;

    filtered.forEach((fp) => {
      totalTarget += fp.nominalDefault;
      totalDiskon += fp.diskon;
      if (fp.status === 'Lunas') {
        totalAktual += fp.nominalAktual;
        countLunas++;
        if (fp.metodePembayaran?.toLowerCase() === 'cash') {
          totalCash += fp.nominalAktual;
          countCash++;
        } else {
          totalTransfer += fp.nominalAktual;
          countTransfer++;
        }
      } else {
        countBelum++;
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalRecords: filtered.length,
        totalTarget,
        totalAktual,
        totalDiskon,
        countLunas,
        countBelum,
        totalCash,
        countCash,
        totalTransfer,
        countTransfer,
      },
      data: filtered,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { user, errorResponse } = await verifySession(['ADMIN', 'PANITIA', 'UNIT']);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const {
      id,
      applicantId,
      studentId,
      nominalDefault,
      nominalAktual,
      diskon,
      status,
      metodePembayaran,
      keterangan,
      tanggal,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID formulir wajib disertakan' },
        { status: 400 }
      );
    }

    let updated: any = null;

    if (String(id).startsWith('app_') || applicantId) {
      const realAppId = applicantId || String(id).replace('app_', '');
      const existingApp = await prisma.applicant.findUnique({
        where: { id: realAppId },
      });
      if (!existingApp) {
        return NextResponse.json(
          { success: false, error: 'Data pendaftar tidak ditemukan' },
          { status: 404 }
        );
      }

      const statusBayar =
        status === 'Lunas'
          ? metodePembayaran?.toLowerCase() === 'cash'
            ? 'LUNAS_CASH'
            : 'LUNAS_TRANSFER'
          : 'BELUM_BAYAR';

      updated = await prisma.applicant.update({
        where: { id: realAppId },
        data: {
          nominalFormulir:
            nominalAktual !== undefined
              ? Number(nominalAktual)
              : existingApp.nominalFormulir,
          statusBayarFormulir: statusBayar,
          metodePembayaran: metodePembayaran || existingApp.metodePembayaran,
          catatanPembayaran:
            keterangan !== undefined ? keterangan : existingApp.catatanPembayaran,
          tanggalBayarFormulir: tanggal
            ? new Date(tanggal)
            : status === 'Lunas'
            ? new Date()
            : null,
        },
      });

      // If applicant is also linked to student, sync to student's formPayment
      if (existingApp.studentId) {
        await prisma.formPayment.updateMany({
          where: { studentId: existingApp.studentId },
          data: {
            nominalDefault:
              nominalDefault !== undefined ? Number(nominalDefault) : undefined,
            nominalAktual:
              nominalAktual !== undefined ? Number(nominalAktual) : undefined,
            diskon: diskon !== undefined ? Number(diskon) : undefined,
            status: status !== undefined ? status : undefined,
            metodePembayaran:
              metodePembayaran !== undefined ? metodePembayaran : undefined,
            keterangan: keterangan !== undefined ? keterangan : undefined,
            tanggal: tanggal ? new Date(tanggal) : undefined,
          },
        });
      }
    } else {
      // Standard formPayment table record
      updated = await prisma.formPayment.update({
        where: { id },
        data: {
          ...(nominalDefault !== undefined ? { nominalDefault: Number(nominalDefault) } : {}),
          ...(nominalAktual !== undefined ? { nominalAktual: Number(nominalAktual) } : {}),
          ...(diskon !== undefined ? { diskon: Number(diskon) } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(metodePembayaran !== undefined ? { metodePembayaran } : {}),
          ...(keterangan !== undefined ? { keterangan } : {}),
          ...(tanggal !== undefined ? { tanggal: new Date(tanggal) } : {}),
        },
        include: {
          student: true,
        },
      });

      // Sync back to applicant if this student has an applicant relation
      if (updated.studentId) {
        const linkedApp = await prisma.applicant.findFirst({
          where: { studentId: updated.studentId },
        });
        if (linkedApp) {
          const statusBayar =
            updated.status === 'Lunas'
              ? updated.metodePembayaran?.toLowerCase() === 'cash'
                ? 'LUNAS_CASH'
                : 'LUNAS_TRANSFER'
              : 'BELUM_BAYAR';
          await prisma.applicant.update({
            where: { id: linkedApp.id },
            data: {
              nominalFormulir: updated.nominalAktual,
              statusBayarFormulir: statusBayar,
              metodePembayaran: updated.metodePembayaran,
              catatanPembayaran: updated.keterangan,
              tanggalBayarFormulir: updated.tanggal,
            },
          });
        }
      }
    }

    triggerAutoBackup();

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Data formulir berhasil diperbarui',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
