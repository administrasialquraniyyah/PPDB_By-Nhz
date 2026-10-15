import prisma from './prisma';

let isSchemaMigrated = false;

/**
 * Ensures that any newly added database columns exist in the database,
 * preventing serverless crashes when Prisma Client models are updated ahead of DB migrations.
 */
export async function ensureDbSchema() {
  if (isSchemaMigrated) return;

  try {
    // 1. Add id_nasabah column to bank_accounts if not exists
    await prisma.$executeRawUnsafe(`
      ALTER TABLE ppdb.bank_accounts ADD COLUMN IF NOT EXISTS id_nasabah TEXT;
    `);
    isSchemaMigrated = true;
  } catch (error: any) {
    console.error('Error during auto-migration ensureDbSchema:', error?.message);
  }
}
