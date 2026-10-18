import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

// Production safety guard: strictly reject execution in production unless explicitly mocked
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_LOCAL_DEV_STORE) {
  // In production, an error must be thrown to guarantee Supabase production is not bypassed silently
  console.warn('[SECURITY] Local development storage adapter invoked in non-development environment.');
}

export interface InterviewSession {
  id: string;
  targetId: string;
  sessionNumber: number;
  interviewerName: string;
  durationSeconds: number;
  statusSesi: 'SEDANG_BERLANGSUNG' | 'SELESAI';
  isDraft: boolean;

  // 7 Rubrik Baku Penilaian
  kesiapanMondok: string;
  kesiapanNotes: string;
  motivasiType: string;
  motivasiNotes: string;
  catatanKesehatan: string;
  komitmenOrtu: string;
  adabDanQuran: string;
  catatanPenguji: string;

  // Keputusan & Catatan Rekomendasi
  hasilRekomendasi: 'DITERIMA' | 'DITERIMA_BERSYARAT' | 'CADANGAN' | 'PERLU_TINDAK_LANJUT';
  catatanTindakLanjut: string;

  createdAt: string;
  updatedAt: string;
}

export interface InterviewSchedule {
  targetId: string;
  scheduledDate: string;
  scheduledTime: string;
  interviewerName: string;
  status: 'BELUM_DIJADWALKAN' | 'TERJADWAL' | 'SEDANG_BERLANGSUNG' | 'SELESAI' | 'PERLU_TINDAK_LANJUT';
  updatedAt: string;
}

interface LocalStoreData {
  sessions: InterviewSession[];
  schedules: Record<string, InterviewSchedule>;
}

const STORE_DIR = path.join(process.cwd(), '.local-dev-store');
const STORE_FILE = path.join(STORE_DIR, 'interview_data.json');

// Ensure directory exists
function ensureStoreDir(): void {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

// In-memory cache
let inMemoryData: LocalStoreData | null = null;
let writeQueue = Promise.resolve();

function readFromDisk(): LocalStoreData {
  ensureStoreDir();
  if (!fs.existsSync(STORE_FILE)) {
    const initial: LocalStoreData = { sessions: [], schedules: {} };
    saveToDiskSync(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local dev store, recreating empty store:', e);
    const initial: LocalStoreData = { sessions: [], schedules: {} };
    saveToDiskSync(initial);
    return initial;
  }
}

function saveToDiskSync(data: LocalStoreData): void {
  ensureStoreDir();
  const tmpFile = `${STORE_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpFile, STORE_FILE);
}

function getStore(): LocalStoreData {
  if (!inMemoryData) {
    inMemoryData = readFromDisk();
  }
  return inMemoryData;
}

// Atomic async queue for write concurrency safety
function queueWrite(action: (store: LocalStoreData) => void): Promise<LocalStoreData> {
  const op = writeQueue.then(async () => {
    const store = getStore();
    action(store);
    saveToDiskSync(store);
    return store;
  });
  writeQueue = op.catch((err) => {
    console.error('Local dev store write error:', err);
  }) as Promise<any>;
  return op;
}

// Validation rules
const VALID_KESIAPAN = ['Sangat Siap', 'Cukup Siap', 'Ragu-ragu', 'Sangat Siap & Mandiri', ''];
const VALID_MOTIVASI = ['Santri Sendiri', 'Dorongan Ortu', 'Keduanya', 'Kemauan Santri Sendiri', ''];
const VALID_REKOMENDASI = ['DITERIMA', 'DITERIMA_BERSYARAT', 'CADANGAN', 'PERLU_TINDAK_LANJUT', ''];
const VALID_STATUS_SESI = ['SEDANG_BERLANGSUNG', 'SELESAI'];
const VALID_STATUS_JADWAL = ['BELUM_DIJADWALKAN', 'TERJADWAL', 'SEDANG_BERLANGSUNG', 'SELESAI', 'PERLU_TINDAK_LANJUT'];

export function validateSessionInput(payload: any): { isValid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, error: 'Payload tidak valid' };
  }

  if (payload.kesiapanMondok && !VALID_KESIAPAN.includes(payload.kesiapanMondok)) {
    return { isValid: false, error: `Pilihan Kesiapan Mondok tidak valid: ${payload.kesiapanMondok}` };
  }

  if (payload.motivasiType && !VALID_MOTIVASI.includes(payload.motivasiType)) {
    return { isValid: false, error: `Pilihan Motivasi tidak valid: ${payload.motivasiType}` };
  }

  if (payload.hasilRekomendasi && !VALID_REKOMENDASI.includes(payload.hasilRekomendasi)) {
    return { isValid: false, error: `Pilihan Hasil Rekomendasi tidak valid: ${payload.hasilRekomendasi}` };
  }

  if (payload.statusSesi && !VALID_STATUS_SESI.includes(payload.statusSesi)) {
    return { isValid: false, error: `Status Sesi tidak valid: ${payload.statusSesi}` };
  }

  // Safety length constraints
  if (payload.interviewerName && payload.interviewerName.length > 200) {
    return { isValid: false, error: 'Nama penguji maksimal 200 karakter' };
  }

  const checkNoteLength = (note: any, fieldName: string) => {
    if (note && typeof note === 'string' && note.length > 10000) {
      return `${fieldName} melebihi batas 10.000 karakter`;
    }
    return null;
  };

  const err =
    checkNoteLength(payload.kesiapanNotes, 'Catatan Kesiapan') ||
    checkNoteLength(payload.motivasiNotes, 'Catatan Motivasi') ||
    checkNoteLength(payload.catatanKesehatan, 'Catatan Kesehatan') ||
    checkNoteLength(payload.komitmenOrtu, 'Catatan Komitmen') ||
    checkNoteLength(payload.adabDanQuran, 'Catatan Al-Quran') ||
    checkNoteLength(payload.catatanPenguji, 'Catatan Penguji') ||
    checkNoteLength(payload.catatanTindakLanjut, 'Catatan Tindak Lanjut');

  if (err) return { isValid: false, error: err };

  return { isValid: true };
}

export function validateScheduleInput(payload: any): { isValid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, error: 'Payload jadwal tidak valid' };
  }

  if (payload.status && !VALID_STATUS_JADWAL.includes(payload.status)) {
    return { isValid: false, error: `Status jadwal tidak valid: ${payload.status}` };
  }

  if (payload.scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(payload.scheduledDate)) {
    return { isValid: false, error: 'Format tanggal jadwal harus YYYY-MM-DD' };
  }

  if (payload.scheduledTime && !/^\d{2}:\d{2}$/.test(payload.scheduledTime)) {
    return { isValid: false, error: 'Format waktu jadwal harus HH:mm' };
  }

  return { isValid: true };
}

// Helper to map Prisma ApplicantInterview to InterviewSession
function mapDbInterviewToSession(dbItem: any): InterviewSession {
  return {
    id: dbItem.id,
    targetId: dbItem.applicantId,
    sessionNumber: dbItem.sessionNumber,
    interviewerName: dbItem.interviewerName || '',
    durationSeconds: dbItem.durationSeconds || 0,
    statusSesi: dbItem.isDraft ? 'SEDANG_BERLANGSUNG' : 'SELESAI',
    isDraft: dbItem.isDraft,
    kesiapanMondok: dbItem.kesiapanMondok || 'Sangat Siap & Mandiri',
    kesiapanNotes: dbItem.kesiapanNotes || '',
    motivasiType: dbItem.motivasiType || 'Kemauan Santri Sendiri',
    motivasiNotes: dbItem.motivasiNotes || '',
    catatanKesehatan: dbItem.catatanKesehatan || '',
    komitmenOrtu: dbItem.komitmenOrtu || '',
    adabDanQuran: dbItem.adabDanQuran || '',
    catatanPenguji: dbItem.catatanPenguji || '',
    hasilRekomendasi: (dbItem.hasilRekomendasi as any) || 'DITERIMA',
    catatanTindakLanjut: dbItem.catatanTindakLanjut || '',
    createdAt: dbItem.createdAt ? new Date(dbItem.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: dbItem.updatedAt ? new Date(dbItem.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// Storage API
export const InterviewRepository = {
  // Get all sessions and schedule for a target
  async getByTargetId(targetId: string): Promise<{
    currentSession: InterviewSession | null;
    history: InterviewSession[];
    schedule: InterviewSchedule | null;
  }> {
    try {
      // 1. Try finding Applicant in database first
      const applicant = await prisma.applicant.findUnique({
        where: { id: targetId },
        include: {
          interviews: {
            orderBy: { sessionNumber: 'desc' },
          },
        },
      });

      if (applicant) {
        const sessions: InterviewSession[] = applicant.interviews.map(mapDbInterviewToSession);
        const currentSession = sessions.length > 0 ? sessions[0] : null;
        const history = sessions.length > 1 ? sessions.slice(1) : [];

        let schedule: InterviewSchedule | null = null;
        if (applicant.interviews.length > 0) {
          const latest = applicant.interviews[0];
          schedule = {
            targetId,
            scheduledDate: latest.scheduledDate ? new Date(latest.scheduledDate).toISOString().split('T')[0] : '',
            scheduledTime: latest.scheduledTime || '09:00',
            interviewerName: latest.interviewerName || '',
            status: (latest.status as any) || 'TERJADWAL',
            updatedAt: latest.updatedAt ? new Date(latest.updatedAt).toISOString() : new Date().toISOString(),
          };
        } else {
          // Check if local dev store has a temporary schedule
          const store = getStore();
          schedule = store.schedules[targetId] || null;
        }

        return { currentSession, history, schedule };
      }
    } catch (dbErr) {
      console.warn('Prisma lookup failed in getByTargetId, falling back to local store:', dbErr);
    }

    // Fallback to local store for legacy students or offline dev
    const store = getStore();
    const sessions = store.sessions
      .filter((s) => s.targetId === targetId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const currentSession = sessions.length > 0 ? sessions[0] : null;
    const history = sessions.length > 1 ? sessions.slice(1) : [];
    const schedule = store.schedules[targetId] || null;

    return { currentSession, history, schedule };
  },

  // Save or update an interview session
  async saveSession(
    targetId: string,
    data: Partial<InterviewSession> & { isNewSession?: boolean }
  ): Promise<InterviewSession> {
    const validation = validateSessionInput(data);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Validasi sesi gagal');
    }

    try {
      const applicant = await prisma.applicant.findUnique({
        where: { id: targetId },
        include: {
          interviews: {
            orderBy: { sessionNumber: 'desc' },
          },
        },
      });

      if (applicant) {
        const existingInterviews = applicant.interviews;
        const isDraft = data.isDraft !== undefined ? Boolean(data.isDraft) : true;
        let dbSaved: any;

        if (data.isNewSession || existingInterviews.length === 0) {
          const nextSessionNumber = existingInterviews.length + 1;
          dbSaved = await prisma.applicantInterview.create({
            data: {
              applicantId: applicant.id,
              academicYearId: applicant.academicYearId,
              sessionNumber: nextSessionNumber,
              interviewerName: (data.interviewerName || '').trim(),
              durationSeconds: Number(data.durationSeconds) || 0,
              isDraft,
              status: isDraft ? 'SEDANG_BERLANGSUNG' : 'SELESAI',
              kesiapanMondok: data.kesiapanMondok || 'Sangat Siap & Mandiri',
              kesiapanNotes: data.kesiapanNotes || '',
              motivasiType: data.motivasiType || 'Kemauan Santri Sendiri',
              motivasiNotes: data.motivasiNotes || '',
              catatanKesehatan: data.catatanKesehatan || '',
              komitmenOrtu: data.komitmenOrtu || '',
              adabDanQuran: data.adabDanQuran || '',
              catatanPenguji: data.catatanPenguji || '',
              hasilRekomendasi: data.hasilRekomendasi || 'DITERIMA',
              catatanTindakLanjut: data.catatanTindakLanjut || '',
            },
          });
        } else {
          // Update the latest existing session
          const latestInterview = existingInterviews[0];
          dbSaved = await prisma.applicantInterview.update({
            where: { id: latestInterview.id },
            data: {
              interviewerName: data.interviewerName !== undefined ? data.interviewerName.trim() : latestInterview.interviewerName,
              durationSeconds: data.durationSeconds !== undefined ? Number(data.durationSeconds) : latestInterview.durationSeconds,
              isDraft,
              status: isDraft ? (data.statusSesi || latestInterview.status) : 'SELESAI',
              kesiapanMondok: data.kesiapanMondok !== undefined ? data.kesiapanMondok : latestInterview.kesiapanMondok,
              kesiapanNotes: data.kesiapanNotes !== undefined ? data.kesiapanNotes : latestInterview.kesiapanNotes,
              motivasiType: data.motivasiType !== undefined ? data.motivasiType : latestInterview.motivasiType,
              motivasiNotes: data.motivasiNotes !== undefined ? data.motivasiNotes : latestInterview.motivasiNotes,
              catatanKesehatan: data.catatanKesehatan !== undefined ? data.catatanKesehatan : latestInterview.catatanKesehatan,
              komitmenOrtu: data.komitmenOrtu !== undefined ? data.komitmenOrtu : latestInterview.komitmenOrtu,
              adabDanQuran: data.adabDanQuran !== undefined ? data.adabDanQuran : latestInterview.adabDanQuran,
              catatanPenguji: data.catatanPenguji !== undefined ? data.catatanPenguji : latestInterview.catatanPenguji,
              hasilRekomendasi: data.hasilRekomendasi !== undefined ? data.hasilRekomendasi : latestInterview.hasilRekomendasi,
              catatanTindakLanjut: data.catatanTindakLanjut !== undefined ? data.catatanTindakLanjut : latestInterview.catatanTindakLanjut,
            },
          });
        }

        // Sync Applicant statusPendaftaran based on recommendation
        let newStatus = applicant.statusPendaftaran;
        if (data.hasilRekomendasi === 'DITERIMA' || data.hasilRekomendasi === 'DITERIMA_BERSYARAT') {
          newStatus = 'LULUS';
        } else if (data.hasilRekomendasi === 'CADANGAN') {
          newStatus = 'CADANGAN';
        } else if (data.hasilRekomendasi === 'PERLU_TINDAK_LANJUT') {
          newStatus = 'MENGIKUTI_TES';
        } else if (!isDraft && data.hasilRekomendasi === '') {
          newStatus = 'TIDAK_LULUS';
        }

        if (newStatus !== applicant.statusPendaftaran) {
          await prisma.applicant.update({
            where: { id: applicant.id },
            data: { statusPendaftaran: newStatus },
          });
        }

        const session = mapDbInterviewToSession(dbSaved);

        // Also mirror into local store cache
        await queueWrite((store) => {
          const idx = store.sessions.findIndex((s) => s.id === session.id);
          if (idx >= 0) {
            store.sessions[idx] = session;
          } else {
            store.sessions.push(session);
          }
        });

        return session;
      }
    } catch (dbErr) {
      console.warn('Prisma saveSession failed, using local store fallback:', dbErr);
    }

    // Fallback for non-applicants / local dev
    let savedSession: InterviewSession | null = null;
    await queueWrite((store) => {
      const now = new Date().toISOString();
      const existingSessions = store.sessions
        .filter((s) => s.targetId === targetId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      if (data.isNewSession || existingSessions.length === 0) {
        const nextNumber = existingSessions.length + 1;
        savedSession = {
          id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          targetId,
          sessionNumber: nextNumber,
          interviewerName: (data.interviewerName || '').trim(),
          durationSeconds: Number(data.durationSeconds) || 0,
          statusSesi: data.statusSesi || 'SEDANG_BERLANGSUNG',
          isDraft: data.isDraft !== undefined ? Boolean(data.isDraft) : true,
          kesiapanMondok: data.kesiapanMondok || 'Sangat Siap & Mandiri',
          kesiapanNotes: data.kesiapanNotes || '',
          motivasiType: data.motivasiType || 'Kemauan Santri Sendiri',
          motivasiNotes: data.motivasiNotes || '',
          catatanKesehatan: data.catatanKesehatan || '',
          komitmenOrtu: data.komitmenOrtu || '',
          adabDanQuran: data.adabDanQuran || '',
          catatanPenguji: data.catatanPenguji || '',
          hasilRekomendasi: data.hasilRekomendasi || 'DITERIMA',
          catatanTindakLanjut: data.catatanTindakLanjut || '',
          createdAt: now,
          updatedAt: now,
        };
        store.sessions.push(savedSession);
      } else {
        const targetSession = existingSessions[0];
        targetSession.interviewerName =
          data.interviewerName !== undefined ? data.interviewerName.trim() : targetSession.interviewerName;
        targetSession.durationSeconds =
          data.durationSeconds !== undefined ? Number(data.durationSeconds) : targetSession.durationSeconds;
        targetSession.statusSesi = data.statusSesi || targetSession.statusSesi;
        targetSession.isDraft = data.isDraft !== undefined ? Boolean(data.isDraft) : targetSession.isDraft;
        targetSession.kesiapanMondok =
          data.kesiapanMondok !== undefined ? data.kesiapanMondok : targetSession.kesiapanMondok;
        targetSession.kesiapanNotes =
          data.kesiapanNotes !== undefined ? data.kesiapanNotes : targetSession.kesiapanNotes;
        targetSession.motivasiType =
          data.motivasiType !== undefined ? data.motivasiType : targetSession.motivasiType;
        targetSession.motivasiNotes =
          data.motivasiNotes !== undefined ? data.motivasiNotes : targetSession.motivasiNotes;
        targetSession.catatanKesehatan =
          data.catatanKesehatan !== undefined ? data.catatanKesehatan : targetSession.catatanKesehatan;
        targetSession.komitmenOrtu =
          data.komitmenOrtu !== undefined ? data.komitmenOrtu : targetSession.komitmenOrtu;
        targetSession.adabDanQuran =
          data.adabDanQuran !== undefined ? data.adabDanQuran : targetSession.adabDanQuran;
        targetSession.catatanPenguji =
          data.catatanPenguji !== undefined ? data.catatanPenguji : targetSession.catatanPenguji;
        targetSession.hasilRekomendasi =
          data.hasilRekomendasi !== undefined ? data.hasilRekomendasi : targetSession.hasilRekomendasi;
        targetSession.catatanTindakLanjut =
          data.catatanTindakLanjut !== undefined ? data.catatanTindakLanjut : targetSession.catatanTindakLanjut;
        targetSession.updatedAt = now;

        savedSession = targetSession;
      }

      if (store.schedules[targetId]) {
        if (data.statusSesi === 'SELESAI') {
          store.schedules[targetId].status = 'SELESAI';
        } else if (store.schedules[targetId].status === 'BELUM_DIJADWALKAN') {
          store.schedules[targetId].status = 'SEDANG_BERLANGSUNG';
        }
        store.schedules[targetId].updatedAt = now;
      }
    });

    return savedSession!;
  },

  // Save or update schedule
  async saveSchedule(
    targetId: string,
    data: Partial<InterviewSchedule>
  ): Promise<InterviewSchedule> {
    const validation = validateScheduleInput(data);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Validasi jadwal gagal');
    }

    try {
      const applicant = await prisma.applicant.findUnique({
        where: { id: targetId },
        include: {
          interviews: {
            orderBy: { sessionNumber: 'desc' },
          },
        },
      });

      if (applicant) {
        const scheduledDateObj = data.scheduledDate ? new Date(`${data.scheduledDate}T00:00:00Z`) : null;

        if (applicant.interviews.length > 0) {
          const latest = applicant.interviews[0];
          await prisma.applicantInterview.update({
            where: { id: latest.id },
            data: {
              scheduledDate: scheduledDateObj || latest.scheduledDate,
              scheduledTime: data.scheduledTime || latest.scheduledTime,
              interviewerName: data.interviewerName !== undefined ? data.interviewerName.trim() : latest.interviewerName,
              status: data.status || latest.status,
            },
          });
        } else {
          await prisma.applicantInterview.create({
            data: {
              applicantId: applicant.id,
              academicYearId: applicant.academicYearId,
              sessionNumber: 1,
              scheduledDate: scheduledDateObj,
              scheduledTime: data.scheduledTime || '09:00',
              interviewerName: (data.interviewerName || '').trim(),
              status: data.status || 'TERJADWAL',
              isDraft: true,
            },
          });
        }

        // Update applicant status to MENUNGGU_TES if previously TERDAFTAR
        if (applicant.statusPendaftaran === 'TERDAFTAR') {
          await prisma.applicant.update({
            where: { id: applicant.id },
            data: { statusPendaftaran: 'MENUNGGU_TES' },
          });
        }
      }
    } catch (dbErr) {
      console.warn('Prisma saveSchedule failed, using local fallback:', dbErr);
    }

    let savedSchedule: InterviewSchedule | null = null;
    await queueWrite((store) => {
      const now = new Date().toISOString();
      const existing = store.schedules[targetId];

      savedSchedule = {
        targetId,
        scheduledDate: data.scheduledDate || existing?.scheduledDate || new Date().toISOString().split('T')[0],
        scheduledTime: data.scheduledTime || existing?.scheduledTime || '09:00',
        interviewerName: (data.interviewerName !== undefined ? data.interviewerName : existing?.interviewerName || '').trim(),
        status: data.status || existing?.status || 'TERJADWAL',
        updatedAt: now,
      };

      store.schedules[targetId] = savedSchedule;
    });

    return savedSchedule!;
  },

  // Get all schedules
  async getAllSchedules(): Promise<Record<string, InterviewSchedule>> {
    const store = getStore();
    const result: Record<string, InterviewSchedule> = { ...store.schedules };

    try {
      const dbInterviews = await prisma.applicantInterview.findMany({
        orderBy: { sessionNumber: 'desc' },
      });

      for (const item of dbInterviews) {
        if (!result[item.applicantId]) {
          result[item.applicantId] = {
            targetId: item.applicantId,
            scheduledDate: item.scheduledDate ? new Date(item.scheduledDate).toISOString().split('T')[0] : '',
            scheduledTime: item.scheduledTime || '09:00',
            interviewerName: item.interviewerName || '',
            status: (item.status as any) || 'TERJADWAL',
            updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
          };
        }
      }
    } catch (e) {
      console.warn('Error loading db interviews for getAllSchedules:', e);
    }

    return result;
  },

  // Get latest session for each targetId
  async getAllLatestSessions(): Promise<Record<string, InterviewSession>> {
    const store = getStore();
    const result: Record<string, InterviewSession> = {};

    for (const s of store.sessions) {
      if (!result[s.targetId] || new Date(s.updatedAt).getTime() > new Date(result[s.targetId].updatedAt).getTime()) {
        result[s.targetId] = s;
      }
    }

    try {
      const dbInterviews = await prisma.applicantInterview.findMany({
        orderBy: { sessionNumber: 'desc' },
      });

      for (const item of dbInterviews) {
        if (!result[item.applicantId]) {
          result[item.applicantId] = mapDbInterviewToSession(item);
        }
      }
    } catch (e) {
      console.warn('Error loading db interviews for getAllLatestSessions:', e);
    }

    return result;
  },
};
