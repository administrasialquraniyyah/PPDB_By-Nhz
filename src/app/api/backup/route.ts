import { NextResponse } from 'next/server';
import { createFullBackupWorkbook, saveLocalExcelBackup, getLocalBackupStatus } from '@/lib/backupService';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'status' | 'download'
    const academicYearId = searchParams.get('academicYearId') || undefined;

    // Return backup status / info
    if (mode === 'status') {
      const status = getLocalBackupStatus();
      return NextResponse.json({
        success: true,
        data: status,
      });
    }

    // Default: Generate and download the Excel file
    const { workbook } = await createFullBackupWorkbook(academicYearId);
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Also update local copy in the background
    saveLocalExcelBackup(academicYearId).catch((e) => console.error('Background save error:', e));

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Backup_PPDB_AlQuraniyyah_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Backup download error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { academicYearId } = body;

    const result = await saveLocalExcelBackup(academicYearId);

    return NextResponse.json({
      success: true,
      message: 'Backup database ke file Excel lokal berhasil disimpan!',
      data: result,
    });
  } catch (error: any) {
    console.error('Backup save error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
