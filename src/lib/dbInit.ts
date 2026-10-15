import prisma from './prisma';

let isSchemaMigrated = false;

/**
 * Ensures that any newly added database columns exist in the database,
 * preventing serverless crashes when Prisma Client models are updated ahead of DB migrations.
 */
export async function ensureDbSchema() {
  if (isSchemaMigrated) return;

  try {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."bank_accounts" ADD COLUMN IF NOT EXISTS id_nasabah TEXT;`);
    } catch (e) {}
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "ppdb"."bank_accounts" ADD COLUMN IF NOT EXISTS id_nasabah TEXT;`);
    } catch (e) {}
    isSchemaMigrated = true;
  } catch (error: any) {
    console.error('Error during auto-migration ensureDbSchema:', error?.message);
  }
}
