import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logs: any[] = [];
  try {
    // 1. Check current schema search path
    const pathRes: any = await prisma.$queryRawUnsafe('SHOW search_path;');
    logs.push({ step: 'search_path', result: pathRes });

    // 2. Check current schema
    const schemaRes: any = await prisma.$queryRawUnsafe('SELECT current_schema();');
    logs.push({ step: 'current_schema', result: schemaRes });

    // 3. Find bank_accounts table in all schemas
    const findTables: any = await prisma.$queryRawUnsafe(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'bank_accounts';
    `);
    logs.push({ step: 'findTables', result: findTables });

    // 4. Try ALTER on each found schema or ppdb
    for (const t of findTables) {
      try {
        const alterRes = await prisma.$executeRawUnsafe(`
          ALTER TABLE "${t.table_schema}"."bank_accounts" ADD COLUMN IF NOT EXISTS id_nasabah TEXT;
        `);
        logs.push({ step: `alter_${t.table_schema}`, success: true, alterRes });
      } catch (err: any) {
        logs.push({ step: `alter_${t.table_schema}`, success: false, error: err.message });
      }
    }

    // 5. Check columns of bank_accounts
    const cols: any = await prisma.$queryRawUnsafe(`
      SELECT table_schema, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bank_accounts';
    `);
    logs.push({ step: 'columns', result: cols });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, logs }, { status: 500 });
  }
}
