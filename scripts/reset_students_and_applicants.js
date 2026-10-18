const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING SAFE BACKUP & RESET ---');

  // 1. Fetch all data for backup
  const backupData = {
    timestamp: new Date().toISOString(),
    students: await prisma.student.findMany(),
    applicants: await prisma.applicant.findMany(),
    applicantInterviews: await prisma.applicantInterview.findMany(),
    formPayments: await prisma.formPayment.findMany(),
    bankAccounts: await prisma.bankAccount.findMany(),
    reRegistrations: await prisma.reRegistration.findMany(),
    recommendations: await prisma.recommendation.findMany(),
  };

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `backup_before_reset_${dateStr}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`✓ Backup saved to: ${backupFilePath}`);

  // 2. Perform deletion in proper relational order
  console.log('Deleting child records and relations...');
  
  // Unlink applicants from students first to avoid FK constraint errors
  await prisma.applicant.updateMany({
    data: { studentId: null },
  });

  // Delete applicant interviews
  const deletedInterviews = await prisma.applicantInterview.deleteMany();
  console.log(`✓ Deleted ${deletedInterviews.count} applicant interviews`);

  // Delete applicants
  const deletedApplicants = await prisma.applicant.deleteMany();
  console.log(`✓ Deleted ${deletedApplicants.count} applicants`);

  // Delete student child tables
  const deletedPayments = await prisma.formPayment.deleteMany();
  console.log(`✓ Deleted ${deletedPayments.count} form payments`);

  const deletedBanks = await prisma.bankAccount.deleteMany();
  console.log(`✓ Deleted ${deletedBanks.count} bank accounts`);

  const deletedReReg = await prisma.reRegistration.deleteMany();
  console.log(`✓ Deleted ${deletedReReg.count} re-registrations`);

  const deletedRecs = await prisma.recommendation.deleteMany();
  console.log(`✓ Deleted ${deletedRecs.count} recommendations`);

  // Delete students
  const deletedStudents = await prisma.student.deleteMany();
  console.log(`✓ Deleted ${deletedStudents.count} students`);

  // Clean local-dev-store file if exists
  const localStoreFile = path.join(process.cwd(), '.local-dev-store', 'interview_data.json');
  if (fs.existsSync(localStoreFile)) {
    fs.writeFileSync(localStoreFile, JSON.stringify({ sessions: [], schedules: {} }, null, 2), 'utf-8');
    console.log('✓ Reset local-dev-store interview data');
  }

  // 3. Verify counts
  const finalStudents = await prisma.student.count();
  const finalApplicants = await prisma.applicant.count();
  console.log(`\nVerification:`);
  console.log(`Remaining Students: ${finalStudents}`);
  console.log(`Remaining Applicants: ${finalApplicants}`);

  if (finalStudents === 0 && finalApplicants === 0) {
    console.log('--- ALL DATA CLEARED SUCCESSFULLY. SYSTEM IS READY FOR FRESH DATA INPUT. ---');
  } else {
    console.warn('Warning: Some records may still exist.');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Reset error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
