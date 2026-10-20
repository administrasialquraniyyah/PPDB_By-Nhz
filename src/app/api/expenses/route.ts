import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { triggerAutoBackup } from '@/lib/backupService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');
    const category = searchParams.get('category');

    const where: any = {};
    if (academicYearId) where.academicYearId = academicYearId;
    if (category) where.category = category;

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { academicYear: true },
    });

    // Calculate income from Form Payments across ALL applicants & students
    // 1. Paid applicants in this academic year
    const applicantWhere: any = {
      ...(academicYearId ? { academicYearId } : {}),
      statusBayarFormulir: { in: ['LUNAS_TRANSFER', 'LUNAS_CASH', 'Lunas'] },
    };

    const paidApplicants = await prisma.applicant.findMany({
      where: applicantWhere,
      select: {
        id: true,
        studentId: true,
        nominalFormulir: true,
        statusBayarFormulir: true,
        metodePembayaran: true,
      },
    });

    const promotedStudentIds = new Set(
      paidApplicants.map((a) => a.studentId).filter(Boolean)
    );

    const studentWhere: any = {
      status: 'ACTIVE',
      ...(academicYearId ? { academicYearId } : {}),
    };

    // 2. Standalone students who have formPayment not tied to applicant
    const standaloneFormPayments = await prisma.formPayment.findMany({
      where: {
        student: {
          ...studentWhere,
          id: { notIn: Array.from(promotedStudentIds) as string[] },
        },
        status: 'Lunas',
      },
      select: { nominalAktual: true, diskon: true, metodePembayaran: true },
    });

    const reRegistrations = await prisma.reRegistration.findMany({
      where: {
        student: studentWhere,
        status: 'Sudah',
      },
      select: { amount: true, paymentMethod: true },
    });

    const recommendations = await prisma.recommendation.findMany({
      where: {
        student: studentWhere,
        paymentStatus: 'Lunas',
      },
      select: { appreciationAmount: true },
    });

    let totalIncomeFormCash = 0;
    let totalIncomeFormTransfer = 0;
    let totalIncomeForm = 0;

    paidApplicants.forEach((a) => {
      const amount = a.nominalFormulir || 300000;
      totalIncomeForm += amount;
      if (a.metodePembayaran?.toLowerCase() === 'cash' || a.statusBayarFormulir === 'LUNAS_CASH') {
        totalIncomeFormCash += amount;
      } else {
        totalIncomeFormTransfer += amount;
      }
    });

    standaloneFormPayments.forEach((f) => {
      totalIncomeForm += f.nominalAktual;
      if (f.metodePembayaran?.toLowerCase() === 'cash') {
        totalIncomeFormCash += f.nominalAktual;
      } else {
        totalIncomeFormTransfer += f.nominalAktual;
      }
    });

    const totalDiskonForm = standaloneFormPayments.reduce((acc, f) => acc + f.diskon, 0);
    const totalIncomeDU = reRegistrations.reduce((acc, r) => acc + r.amount, 0);
    const totalPemasukan = totalIncomeForm + totalIncomeDU;

    const totalApresiasiPaid = recommendations.reduce((acc, r) => acc + r.appreciationAmount, 0);

    let totalExpenseOperasional = 0;
    let totalExpenseYayasan = 0;
    let totalExpenseLainnya = 0;

    expenses.forEach((e) => {
      if (e.category === 'Pengeluaran Yayasan') {
        totalExpenseYayasan += e.amount;
      } else if (e.category === 'Apresiasi Rekomendasi') {
        totalExpenseLainnya += e.amount;
      } else {
        totalExpenseOperasional += e.amount;
      }
    });

    const totalManualExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalPengeluaran = totalManualExpenses + totalApresiasiPaid;
    const saldo = totalPemasukan - totalPengeluaran;

    return NextResponse.json({
      success: true,
      summary: {
        totalPemasukan,
        totalIncomeForm,
        totalIncomeFormCash,
        totalIncomeFormTransfer,
        totalIncomeDU,
        totalDiskonForm,
        totalPengeluaran,
        totalApresiasiPaid,
        totalExpenseYayasan,
        totalExpenseOperasional,
        totalExpenseLainnya,
        saldo,
      },
      data: expenses,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { academicYearId, date, category, description, amount, reference, notes } = body;

    if (!academicYearId || !category || !description || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Tahun ajaran, kategori, keterangan, dan nominal wajib diisi' },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        academicYearId,
        date: date ? new Date(date) : new Date(),
        category,
        description: description.trim(),
        amount: Number(amount) || 0,
        reference: reference ? String(reference).trim() : null,
        notes: notes ? String(notes).trim() : null,
      },
      include: {
        academicYear: true,
      },
    });

    triggerAutoBackup();

    return NextResponse.json({ success: true, data: expense, message: 'Pengeluaran berhasil dicatat' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, date, category, description, amount, reference, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID pengeluaran wajib disertakan' }, { status: 400 });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(reference !== undefined ? { reference: reference ? String(reference).trim() : null } : {}),
        ...(notes !== undefined ? { notes: notes ? String(notes).trim() : null } : {}),
      },
      include: {
        academicYear: true,
      },
    });

    triggerAutoBackup();

    return NextResponse.json({ success: true, data: updated, message: 'Pengeluaran berhasil diperbarui' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID pengeluaran wajib disertakan' }, { status: 400 });
    }

    await prisma.expense.delete({
      where: { id },
    });

    triggerAutoBackup();

    return NextResponse.json({ success: true, message: 'Data pengeluaran berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
