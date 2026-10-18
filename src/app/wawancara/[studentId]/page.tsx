'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Copy,
  Check,
  Save,
  CheckCircle,
  AlertTriangle,
  User,
  Phone,
  School,
  HeartPulse,
  BookOpen,
  Award,
  Clock,
  ExternalLink,
  MapPin,
  ClipboardList,
  Lock,
  History,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import JitsiMeetFrame, { JAAS_APP_ID, JAAS_DOMAIN } from '@/components/JitsiMeetFrame';

interface Student {
  id: string;
  namaLengkap: string;
  noPendaftaran: string | null;
  noInduk: string | null;
  jenjang: string;
  gelombang: string;
  jenisKelamin: string | null;
  noHp: string | null;
  asalSekolah: string | null;
  namaAyah: string | null;
  namaIbu: string | null;
  alamat: string | null;
  academicYear?: {
    name: string;
  };
}

export default function WawancaraDetailPage() {
  const params = useParams();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Layout expansion state
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);

  // Mobile active tab view ('video' | 'questions')
  const [mobileTab, setMobileTab] = useState<'video' | 'questions'>('video');

  // Timer states
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Form Assessment States (7 Rubrik Baku)
  const [interviewerName, setInterviewerName] = useState('');
  const [kesiapanMondok, setKesiapanMondok] = useState('Sangat Siap & Mandiri');
  const [kesiapanNotes, setKesiapanNotes] = useState('');
  const [motivasiType, setMotivasiType] = useState('Kemauan Santri Sendiri');
  const [motivasiNotes, setMotivasiNotes] = useState('');
  const [catatanKesehatan, setCatatanKesehatan] = useState('');
  const [komitmenOrtu, setKomitmenOrtu] = useState('');
  const [adabDanQuran, setAdabDanQuran] = useState('');
  const [catatanPenguji, setCatatanPenguji] = useState('');
  const [hasilRekomendasi, setHasilRekomendasi] = useState<
    'DITERIMA' | 'DITERIMA_BERSYARAT' | 'CADANGAN' | 'PERLU_TINDAK_LANJUT'
  >('DITERIMA');
  const [catatanTindakLanjut, setCatatanTindakLanjut] = useState('');
  const [statusSesi, setStatusSesi] = useState<'SEDANG_BERLANGSUNG' | 'SELESAI'>('SEDANG_BERLANGSUNG');

  // Persistence & Multi-session states
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Stopwatch effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Load student profile & interview session from backend
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Load candidate profile: check applicant first, then student
        let candidateData: any = null;
        try {
          const resApplicant = await fetch(`/api/applicants/${studentId}`);
          const jsonApplicant = await resApplicant.json();
          if (jsonApplicant.success && jsonApplicant.data) {
            candidateData = jsonApplicant.data;
          }
        } catch (e) {}

        if (!candidateData) {
          try {
            const resStudent = await fetch(`/api/students/${studentId}`);
            const jsonStudent = await resStudent.json();
            if (jsonStudent.success && jsonStudent.data) {
              candidateData = jsonStudent.data;
            }
          } catch (e) {}
        }

        if (candidateData) {
          setStudent(candidateData);
        }

        // Load interview data (session & schedule)
        const resInterview = await fetch(`/api/interviews/${studentId}`);
        const jsonInterview = await resInterview.json();
        if (jsonInterview.success && jsonInterview.data) {
          const { currentSession, history, schedule } = jsonInterview.data;
          if (currentSession) {
            setInterviewerName(currentSession.interviewerName || '');
            setTimerSeconds(currentSession.durationSeconds || 0);
            setStatusSesi(currentSession.statusSesi || 'SEDANG_BERLANGSUNG');
            setKesiapanMondok(currentSession.kesiapanMondok || 'Sangat Siap & Mandiri');
            setKesiapanNotes(currentSession.kesiapanNotes || '');
            setMotivasiType(currentSession.motivasiType || 'Kemauan Santri Sendiri');
            setMotivasiNotes(currentSession.motivasiNotes || '');
            setCatatanKesehatan(currentSession.catatanKesehatan || '');
            setKomitmenOrtu(currentSession.komitmenOrtu || '');
            setAdabDanQuran(currentSession.adabDanQuran || '');
            setCatatanPenguji(currentSession.catatanPenguji || '');
            setHasilRekomendasi(currentSession.hasilRekomendasi || 'DITERIMA');
            setCatatanTindakLanjut(currentSession.catatanTindakLanjut || '');
          } else if (schedule?.interviewerName) {
            setInterviewerName(schedule.interviewerName);
          }
          if (history && Array.isArray(history)) {
            setSessionHistory(history);
          }
        }
      } catch (e) {
        console.error('Failed to load interview data:', e);
      } finally {
        setLoading(false);
      }
    }
    if (studentId) {
      loadData();
    }
  }, [studentId]);

  // Sanitized room name deterministic
  const sanitizedRoomName = student?.id
    ? `alquraniyyah-ppdb-${student.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`
    : 'alquraniyyah-ppdb-sesi';

  // Official 8x8 JaaS Room URL
  const fullJitsiUrl = `https://${JAAS_DOMAIN}/${JAAS_APP_ID}/${sanitizedRoomName}`;

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullJitsiUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCallStateChange = (isActive: boolean) => {
    if (isActive) {
      setIsTimerRunning(true);
    }
  };

  const handleSaveSession = async (isDraft: boolean, forceNewSession?: boolean) => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const payload = {
        isDraft,
        statusSesi: isDraft ? statusSesi : 'SELESAI',
        interviewerName,
        durationSeconds: timerSeconds,
        kesiapanMondok,
        kesiapanNotes,
        motivasiType,
        motivasiNotes,
        catatanKesehatan,
        komitmenOrtu,
        adabDanQuran,
        catatanPenguji,
        hasilRekomendasi,
        catatanTindakLanjut,
        isNewSession: forceNewSession || false,
      };

      const res = await fetch(`/api/interviews/${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        if (!isDraft) {
          setStatusSesi('SELESAI');
          setIsTimerRunning(false);
        }
        setSaveStatus({
          type: 'success',
          message: json.message || (isDraft ? 'Draf berhasil disimpan' : 'Hasil wawancara berhasil diselesaikan'),
        });

        // Refresh interview history
        const resReload = await fetch(`/api/interviews/${studentId}`);
        const jsonReload = await resReload.json();
        if (jsonReload.success && jsonReload.data?.history) {
          setSessionHistory(jsonReload.data.history);
        }
      } else {
        setSaveStatus({
          type: 'error',
          message: json.error || 'Gagal menyimpan hasil wawancara',
        });
      }
    } catch (e: any) {
      console.error('Save error:', e);
      setSaveStatus({
        type: 'error',
        message: 'Terjadi kesalahan koneksi saat menyimpan',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSaveStatus(null);
      }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold">Menyiapkan ruang wawancara santri...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md mx-auto mt-10">
        <AlertTriangle className="w-9 h-9 text-amber-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-900">Data Santri Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">ID Calon santri tidak terdaftar di sistem PPDB.</p>
        <Link
          href="/wawancara"
          className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition"
        >
          Kembali ke Antrean
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 w-full">
      {/* ===================== TOP HEADER WORKSPACE BAR ===================== */}
      <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/wawancara"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0"
            title="Kembali ke Antrean"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {student.namaLengkap}
              </h1>
              <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                {student.noPendaftaran || 'PPDB-BARU'}
              </span>
              <span className="text-xs text-slate-500 shrink-0 hidden sm:inline">
                • {student.jenjang} ({student.gelombang})
              </span>
            </div>
          </div>
        </div>

        {/* Stopwatch Timer & Sesi Status */}
        <div className="flex items-center gap-2 shrink-0">
          {saveStatus && (
            <div
              className={`hidden md:flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                saveStatus.type === 'success'
                  ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                  : 'text-rose-800 bg-rose-50 border-rose-200'
              }`}
            >
              {saveStatus.type === 'success' ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-rose-600" />
              )}
              {saveStatus.message}
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-900 text-amber-300 font-mono text-xs px-2.5 py-1 rounded-xl shadow-xs">
            <Clock className="w-3 h-3 text-amber-400" />
            <span className="font-bold">{formatTimer(timerSeconds)}</span>
          </div>

          <span
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
              statusSesi === 'SELESAI'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            {statusSesi === 'SELESAI' ? 'Selesai' : 'Live Sesi'}
          </span>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-slate-200/80 p-1 rounded-xl gap-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMobileTab('video')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            mobileTab === 'video' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          Layar Video (Terkunci)
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('questions')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            mobileTab === 'questions' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          Pertanyaan Wawancara (Scroll)
        </button>
      </div>

      {/* ===================== WORKSPACE: LOCKED VIDEO (LEFT) + SCROLLABLE QUESTIONS (RIGHT) ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start lg:h-[calc(100vh-125px)]">
        {/* ======================= LEFT: LOCKED VIDEO & CANDIDATE PROFILE (55%) ======================= */}
        {/* Video ini tertanam LANGSUNG di halaman yang sama, TERKUNCI dan TIDAK PERNAH mundur ke belakang saat mengetik! */}
        <div
          className={`lg:col-span-6 xl:col-span-7 flex flex-col gap-2 lg:h-full lg:sticky lg:top-0 ${
            mobileTab === 'video' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {/* Direct 8x8 JaaS Video Frame (Locked in Place) */}
          <div className="shrink-0 w-full">
            <JitsiMeetFrame
              roomName={sanitizedRoomName}
              displayName={interviewerName || 'Penguji Al-Qur’aniyyah'}
              isExpanded={isVideoExpanded}
              onToggleExpand={() => setIsVideoExpanded(!isVideoExpanded)}
              onCallStateChange={handleCallStateChange}
            />
          </div>

          {/* Quick Room Link & Copy */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] text-slate-500 font-semibold shrink-0">Tautan Santri:</span>
              <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[200px] sm:max-w-[280px]">
                {fullJitsiUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition shrink-0"
                title="Salin Tautan Room untuk Santri / Wali"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <a
              href={fullJitsiUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1 shrink-0 ml-auto"
            >
              <ExternalLink className="w-3 h-3" />
              Buka Tab Cadangan (8x8)
            </a>
          </div>

          {/* Compact Candidate Summary Card */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-2 gap-2 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <School className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-400 text-[10px] block">Asal Sekolah:</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate block">
                  {student.asalSekolah || '-'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-400 text-[10px] block">No. Kontak / WA:</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate block">
                  {student.noHp || '-'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-400 text-[10px] block">Wali Santri:</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate block">
                  {student.namaAyah || student.namaIbu || '-'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-400 text-[10px] block">Alamat Santri:</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate block">
                  {student.alamat || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================= RIGHT: SCROLLABLE QUESTIONS PANEL (45%) ======================= */}
        {/* Panel pertanyaan di-scroll mandiri. Saat mengetik catatan di sini, video di sebelah kiri TETAP TERLIHAT! */}
        <div
          className={`lg:col-span-6 xl:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:h-full overflow-hidden ${
            mobileTab === 'questions' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {/* Header Panel Pertanyaan (Sticky Top) */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-700 text-white">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Daftar Pertanyaan Wawancara
                </h2>
                <p className="text-[10px] text-slate-400">Scroll ke bawah untuk mengisi setiap rubrik</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
              7 Rubrik Terbuka
            </span>
          </div>

          {/* Scrollable Questions Body (Independent Smooth Scroll) */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
            {/* Status Banner Feedback */}
            {saveStatus && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all ${
                  saveStatus.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {saveStatus.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{saveStatus.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSaveStatus(null)}
                  className="text-slate-400 hover:text-slate-700 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Identitas Penguji */}
            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
              <label className="block text-xs font-bold text-emerald-950 mb-1">
                Nama Penguji (Ustadz / Ustadzah):
              </label>
              <input
                type="text"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                placeholder="Contoh: Ust. Ahmad Fauzi / Usth. Maryam"
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Multi-Session History Accordion */}
            {sessionHistory.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Riwayat Sesi Sebelumnya ({sessionHistory.length})</span>
                  </div>
                  {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showHistory && (
                  <div className="p-3 pt-0 space-y-2 border-t border-slate-200 bg-white">
                    {sessionHistory.map((sess, idx) => (
                      <div
                        key={sess.id || idx}
                        className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">Sesi #{sess.sessionNumber || idx + 1}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {new Date(sess.updatedAt).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          Penguji: <span className="font-semibold text-slate-800">{sess.interviewerName || '-'}</span> | Status: <span className="font-semibold">{sess.statusSesi}</span>
                        </div>
                        <div className="text-slate-600">
                          Hasil: <span className="font-bold text-emerald-700">{sess.hasilRekomendasi}</span>
                          {sess.catatanPenguji && (
                            <span className="italic block text-slate-500 mt-0.5">&quot;{sess.catatanPenguji}&quot;</span>
                          )}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveSession(true, true)}
                      className="w-full mt-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition text-center"
                    >
                      + Mulai Rekam Sesi Wawancara Lanjutan
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Pertanyaan 1: Kesiapan Mondok */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 text-xs">
                  Pertanyaan 1: Kesiapan Mondok & Kemandirian
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Rubrik 1
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                👉 <i>&quot;Apakah calon santri siap tinggal di asrama terpisah dari orang tua dan mampu mengurus kebutuhan pribadi secara mandiri?&quot;</i>
              </p>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {['Sangat Siap', 'Cukup Siap', 'Ragu-ragu'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setKesiapanMondok(opt)}
                    className={`py-1.5 px-2 text-center rounded-lg border text-xs font-bold transition ${
                      kesiapanMondok === opt
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                value={kesiapanNotes}
                onChange={(e) => setKesiapanNotes(e.target.value)}
                placeholder="Catatan kemandirian: tinggal terpisah, kedisiplinan, merapikan barang..."
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Pertanyaan 2: Motivasi Masuk Pesantren */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 text-xs">
                  Pertanyaan 2: Motivasi Masuk Pesantren
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Rubrik 2
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                👉 <i>&quot;Apa alasan utama calon santri ingin mondok? Apakah murni keinginan sendiri atau dorongan orang tua?&quot;</i>
              </p>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {['Santri Sendiri', 'Dorongan Ortu', 'Keduanya'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setMotivasiType(opt)}
                    className={`py-1.5 px-2 text-center rounded-lg border text-xs font-bold transition ${
                      motivasiType === opt
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                value={motivasiNotes}
                onChange={(e) => setMotivasiNotes(e.target.value)}
                placeholder="Catatan tujuan santri: cita-cita tahfidz Qur'an, belajar agama, adab..."
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Pertanyaan 3: Informasi Riwayat Kesehatan Khusus */}
            <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                  Pertanyaan 3: Riwayat Penyakit & Kesehatan Khusus
                </label>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                  Rahasia
                </span>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                👉 <i>&quot;Apakah santri memiliki riwayat asma, alergi makanan/cuaca berat, kejang, atau pengobatan rutin khusus?&quot;</i>
              </p>
              <textarea
                rows={2}
                value={catatanKesehatan}
                onChange={(e) => setCatatanKesehatan(e.target.value)}
                placeholder="Tuliskan riwayat asma, alergi berat, kejang/epilepsi, terapi rutin keluarga..."
                className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Pertanyaan 4: Komitmen & Persetujuan Wali Santri */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 text-xs">
                  Pertanyaan 4: Komitmen & Persetujuan Wali Santri
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Rubrik 4
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                👉 <i>&quot;Bagaimana komitmen orang tua terhadap tata tertib pesantren, aturan dilarang membawa HP/gadget, jadwal sambang, dan pembiayaan?&quot;</i>
              </p>
              <textarea
                rows={2}
                value={komitmenOrtu}
                onChange={(e) => setKomitmenOrtu(e.target.value)}
                placeholder="Respon orang tua terkait tata tertib asrama, larangan gadget, jadwal jenguk, pembiayaan..."
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Pertanyaan 5: Adab & Membaca Al-Qur'an */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                  Pertanyaan 5: Adab & Kemampuan Membaca Al-Qur&apos;an
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Rubrik 5
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                👉 <i>&quot;Ujikan santri membaca beberapa ayat: bagaimana kelancaran makharijul huruf, tajwid dasar, serta adab tutur katanya?&quot;</i>
              </p>
              <textarea
                rows={2}
                value={adabDanQuran}
                onChange={(e) => setAdabDanQuran(e.target.value)}
                placeholder="Catatan kelancaran tilawah, pemahaman tajwid dasar, makhraj huruf, adab sopan santun..."
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Pertanyaan 6: Catatan Tambahan Penguji */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 text-xs">
                  Pertanyaan 6: Catatan Tambahan / Potensi Khusus
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Rubrik 6
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                👉 <i>&quot;Observasi bakat, minat santri, potensi hafalan, kepemimpinan, atau catatan penting lainnya.&quot;</i>
              </p>
              <textarea
                rows={2}
                value={catatanPenguji}
                onChange={(e) => setCatatanPenguji(e.target.value)}
                placeholder="Observasi umum, potensi santri, minat bakat, atau rekomendasi pembinaan..."
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Pertanyaan 7: Kesimpulan & Rekomendasi Hasil */}
            <div className="bg-slate-100/90 p-4 rounded-xl border border-slate-300 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-700" />
                  Pertanyaan 7: Rekomendasi Hasil Wawancara
                </label>
                <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Keputusan Akhir
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'DITERIMA', label: 'Diterima', color: 'bg-emerald-700 text-white' },
                  { key: 'DITERIMA_BERSYARAT', label: 'Diterima Bersyarat', color: 'bg-teal-700 text-white' },
                  { key: 'CADANGAN', label: 'Cadangan', color: 'bg-amber-600 text-white' },
                  { key: 'PERLU_TINDAK_LANJUT', label: 'Tindak Lanjut', color: 'bg-rose-600 text-white' },
                ].map((rec) => (
                  <button
                    key={rec.key}
                    type="button"
                    onClick={() => setHasilRekomendasi(rec.key as any)}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition ${
                      hasilRekomendasi === rec.key
                        ? `${rec.color} shadow-xs`
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {rec.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={catatanTindakLanjut}
                onChange={(e) => setCatatanTindakLanjut(e.target.value)}
                placeholder="Catatan syarat / tindak lanjut (misal: perlu pembinaan tahsin intensif 1 bulan)..."
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Sticky Form Action Footer Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveSession(true)}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-60 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-98"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan Draf
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveSession(false)}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-98"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Selesaikan Tes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
