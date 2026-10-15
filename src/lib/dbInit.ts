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

    // Clean up any accidentally mapped gender values stored in no_induk
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "public"."students" 
        SET jenis_kelamin = CASE 
          WHEN LOWER(no_induk) LIKE 'p%' THEN 'P' 
          WHEN LOWER(no_induk) LIKE 'l%' THEN 'L' 
          ELSE jenis_kelamin 
        END,
        no_induk = NULL
        WHERE LOWER(no_induk) IN ('perempuan', 'laki-laki', 'p', 'l');
      `);
    } catch (e) {}
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "ppdb"."students" 
        SET jenis_kelamin = CASE 
          WHEN LOWER(no_induk) LIKE 'p%' THEN 'P' 
          WHEN LOWER(no_induk) LIKE 'l%' THEN 'L' 
          ELSE jenis_kelamin 
        END,
        no_induk = NULL
        WHERE LOWER(no_induk) IN ('perempuan', 'laki-laki', 'p', 'l');
      `);
    } catch (e) {}

    isSchemaMigrated = true;
  } catch (error: any) {
    console.error('Error during auto-migration ensureDbSchema:', error?.message);
  }
}
