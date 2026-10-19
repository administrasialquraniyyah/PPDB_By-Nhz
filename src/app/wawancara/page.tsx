'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Video,
  Search,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Play,
  CalendarPlus,
  RefreshCw,
  Phone,
  Eye,
  Info,
  Printer,
  Archive,
  Users,
  Award,
  ChevronRight,
} from 'lucide-react';
import Modal from '@/components/Modal';

interface Student {
  id: string;
  sourceType?: 'APPLICANT' | 'STUDENT';
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
  statusPendaftaran?: string;
  studentId?: string | null;
}

interface LocalSchedule {
  scheduledDate: string;
  scheduledTime: string;
  meetUrl: string;
  interviewerName: string;
  status: 'BELUM_DIJADWALKAN' | 'TERJADWAL' | 'SEDANG_BERLANGSUNG' | 'SELESAI' | 'PERLU_TINDAK_LANJUT';
}

export default function WawancaraListPage() {
  const { selectedYearId, selectedYearName } = useApp();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewTab, setViewTab] = useState<'ACTIVE_QUEUE' | 'PASSED_ARCHIVE'>('ACTIVE_QUEUE');
  const [jenjangScope, setJenjangScope] = useState<string | null>(null);

  // Storage preview state
  const [schedules, setSchedules] = useState<Record<string, LocalSchedule>>({});
  const [latestSessions, setLatestSessions] = useState<Record<string, any>>({});
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  // Form state modal jadwal
  const [modalDate, setModalDate] = useState('');
  const [modalTime, setModalTime] = useState('09:00');
  const [modalMeetUrl, setModalMeetUrl] = useState('');
  const [modalInterviewer, setModalInterviewer] = useState('');
  const [modalStatus, setModalStatus] = useState<LocalSchedule['status']>('TERJADWAL');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.user && d.user.role === 'UNIT' && d.user.jenjangScope) {
          setJenjangScope(d.user.jenjangScope);
          setJenjangFilter(d.user.jenjangScope);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchSchedules();
  }, [selectedYearId]);

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/interviews');
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.schedules) {
          setSchedules(json.data.schedules);
          setLatestSessions(json.data.latestSessions || {});
        } else {
          setSchedules(json.data);
        }
      }
    } catch (e) {
      console.error('Error fetching schedules from backend:', e);
    }
  };

  const handleOpenResultModal = async (st: Student, session?: any) => {
    setSelectedStudent(st);
    if (session) {
      setSelectedSession(session);
      setIsResultModalOpen(true);
      return;
    }

    // If session is not yet loaded in memory (e.g. promoted student), fetch on-demand
    setIsLoadingSession(true);
    try {
      const res = await fetch(`/api/interviews/${st.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        const found = json.data.currentSession || (json.data.history && json.data.history[0]) || null;
        setSelectedSession(found);
      } else {
        setSelectedSession(null);
      }
    } catch (err) {
      console.error('Failed to fetch interview session details:', err);
      setSelectedSession(null);
    } finally {
      setIsLoadingSession(false);
      setIsResultModalOpen(true);
    }
  };

  // Promote applicant directly from interview page
  const handlePromoteToStudent = async (st: Student) => {
    if (!confirm(`Proses ${st.namaLengkap} menjadi Data Siswa resmi di yayasan?`)) return;

    setPromotingId(st.id);
    try {
      const res = await fetch(`/api/applicants/${st.id}/promote`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setActionNotice({
          type: 'success',
          message: json.message || `Berhasil! ${st.namaLengkap} telah resmi terdaftar di Data Siswa.`,
        });
        await fetchStudents();
      } else {
        setActionNotice({
          type: 'error',
          message: json.error || 'Gagal memproses ke Data Siswa',
        });
      }
    } catch (err) {
      console.error('Promote error:', err);
      setActionNotice({
        type: 'error',
        message: 'Terjadi kesalahan koneksi saat memproses data siswa.',
      });
    } finally {
      setPromotingId(null);
      setTimeout(() => setActionNotice(null), 6000);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const applicantUrl = selectedYearId
        ? `/api/applicants?academicYearId=${selectedYearId}`
        : `/api/applicants`;
      const studentUrl = selectedYearId
        ? `/api/students?academicYearId=${selectedYearId}&status=ACTIVE`
        : `/api/students?status=ACTIVE`;

      const [resApp, resStd] = await Promise.all([
        fetch(applicantUrl).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch(studentUrl).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
      ]);

      const applicantsList: Student[] = (resApp.success && Array.isArray(resApp.data))
        ? resApp.data.map((a: any) => ({
            id: a.id,
            sourceType: 'APPLICANT' as const,
            namaLengkap: a.namaLengkap,
            noPendaftaran: a.noPendaftaran,
            noInduk: null,
            jenjang: a.jenjang,
            gelombang: a.gelombang || 'Gelombang 1',
            jenisKelamin: a.jenisKelamin,
            noHp: a.noHp,
            asalSekolah: a.asalSekolah,
            namaAyah: a.namaAyah,
            namaIbu: a.namaIbu,
            statusPendaftaran: a.statusPendaftaran,
            studentId: a.studentId,
          }))
        : [];

      const studentsList: Student[] = (resStd.success && Array.isArray(resStd.data))
        ? resStd.data.map((s: any) => ({
            id: s.id,
            sourceType: 'STUDENT' as const,
            namaLengkap: s.namaLengkap,
            noPendaftaran: s.noPendaftaran,
            noInduk: s.noInduk,
            jenjang: s.jenjang,
            gelombang: s.gelombang || 'Gelombang 1',
            jenisKelamin: s.jenisKelamin,
            noHp: s.noHp,
            asalSekolah: s.asalSekolah,
            namaAyah: s.namaAyah,
            namaIbu: s.namaIbu,
            statusPendaftaran: 'LULUS',
            studentId: s.id,
          }))
        : [];

      // Combine records with uniqueness guarantee by name & registration number
      const seen = new Set<string>();
      const combined: Student[] = [];

      for (const item of [...applicantsList, ...studentsList]) {
        const key = item.studentId ? `std-${item.studentId}` : `app-${item.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      }

      setStudents(combined);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenScheduleModal = (st: Student) => {
    setSelectedStudent(st);
    const existing = schedules[st.id] || {
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '09:00',
      meetUrl: '',
      interviewerName: '',
      status: 'TERJADWAL',
    };
    setModalDate(existing.scheduledDate || new Date().toISOString().split('T')[0]);
    setModalTime(existing.scheduledTime || '09:00');
    setModalMeetUrl(existing.meetUrl || '');
    setModalInterviewer(existing.interviewerName || '');
    setModalStatus(existing.status || 'TERJADWAL');
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedulePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setIsSavingSchedule(true);
    try {
      const res = await fetch(`/api/interviews/${selectedStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: modalDate,
          scheduledTime: modalTime,
          interviewerName: modalInterviewer.trim(),
          status: modalStatus,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setSchedules((prev) => ({
          ...prev,
          [selectedStudent.id]: json.data,
        }));
        setIsScheduleModalOpen(false);
        setActionNotice({
          type: 'success',
          message: `Jadwal wawancara untuk ${selectedStudent.namaLengkap} berhasil disimpan!`,
        });
        await fetchStudents();
      } else {
        setActionNotice({
          type: 'error',
          message: json.error || 'Gagal menyimpan jadwal wawancara',
        });
      }
    } catch (err) {
      console.error('Failed to save schedule:', err);
      setActionNotice({
        type: 'error',
        message: 'Gagal menghubungi server untuk menyimpan jadwal',
      });
    } finally {
      setIsSavingSchedule(false);
      setTimeout(() => setActionNotice(null), 6000);
    }
  };

  const handlePrintResult = () => {
    window.print();
  };

  // Helper: check if a student is officially passed / promoted
  const isStudentOfficial = (st: Student) => {
    return Boolean(st.studentId || st.sourceType === 'STUDENT' || st.statusPendaftaran === 'LULUS');
  };

  // Calculate metrics counts
  const countOfficialPassed = students.filter(isStudentOfficial).length;
  const countActiveQueue = students.filter((st) => !isStudentOfficial(st)).length;
  const countScheduled = Object.values(schedules).filter((s) => s.status === 'TERJADWAL').length;
  const countOngoing = Object.values(schedules).filter((s) => s.status === 'SEDANG_BERLANGSUNG').length;
  const countDone = Object.values(schedules).filter((s) => s.status === 'SELESAI').length;

  // Filter students based on active tab and search criteria
  const filteredStudents = students.filter((st) => {
    const isOfficial = isStudentOfficial(st);

    // Tab filtering:
    // ACTIVE_QUEUE -> only show applicants who have NOT officially passed/promoted
    // PASSED_ARCHIVE -> only show students who have officially passed/promoted
    if (viewTab === 'ACTIVE_QUEUE' && isOfficial) {
      return false;
    }
    if (viewTab === 'PASSED_ARCHIVE' && !isOfficial) {
      return false;
    }

    if (jenjangFilter !== 'ALL' && st.jenjang !== jenjangFilter) return false;

    const stSchedule = schedules[st.id];
    const session = latestSessions[st.id];
    const currentStatus = session
      ? session.isDraft
        ? 'SEDANG_BERLANGSUNG'
        : 'SELESAI'
      : stSchedule?.status || 'BELUM_DIJADWALKAN';

    if (statusFilter !== 'ALL' && currentStatus !== statusFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = st.namaLengkap.toLowerCase().includes(q);
      const matchNo = st.noPendaftaran?.toLowerCase().includes(q) || false;
      const matchHp = st.noHp?.includes(q) || false;
      const matchSchool = st.asalSekolah?.toLowerCase().includes(q) || false;
      return matchName || matchNo || matchHp || matchSchool;
    }
    return true;
  });

  return (
    <div className="space-y-4 w-full">
      {/* Top Banner Alert Notice */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-700 px-1 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Sleek Header & Compact Metrics Bar */}
      <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Tes Wawancara Calon Santri
              </h1>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                T.P. {selectedYearName || '2026/2027'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola antrean sesi, lembar evaluasi, dan arsip riwayat wawancara santri Al-Qur’aniyyah
            </p>
          </div>
        </div>

        {/* Compact Inline Metric Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200/60">
            <span className="text-slate-500 text-[11px]">Total:</span>
            <span className="font-bold text-slate-900">{students.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-900 rounded-xl border border-blue-200/60">
            <span className="text-blue-600 text-[11px]">Terjadwal:</span>
            <span className="font-bold">{countScheduled}</span>
          </div>
          {countOngoing > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-900 rounded-xl border border-amber-200/60 animate-pulse">
              <span className="text-amber-600 text-[11px]">Live:</span>
              <span className="font-bold">{countOngoing}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200/60">
            <span className="text-emerald-700 text-[11px]">Selesai:</span>
            <span className="font-bold">{countDone}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-900 rounded-xl border border-teal-200/60">
            <span className="text-teal-700 text-[11px]">Siswa Resmi:</span>
            <span className="font-bold">{countOfficialPassed}</span>
          </div>
          <button
            onClick={fetchStudents}
            disabled={loading}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition ml-1"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TAB NAVIGATION: Antrean Aktif vs Arsip Hasil Tes Resmi */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 pt-2 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewTab('ACTIVE_QUEUE')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition ${
              viewTab === 'ACTIVE_QUEUE'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Antrean Wawancara Aktif</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              viewTab === 'ACTIVE_QUEUE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {countActiveQueue}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('PASSED_ARCHIVE')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition ${
              viewTab === 'PASSED_ARCHIVE'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4 text-teal-600" />
            <span>Arsip & Catatan Hasil Tes Lulus (Siswa Resmi)</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              viewTab === 'PASSED_ARCHIVE' ? 'bg-teal-100 text-teal-900 font-extrabold' : 'bg-slate-100 text-slate-600'
            }`}>
              {countOfficialPassed}
            </span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 hidden sm:block">
          {viewTab === 'ACTIVE_QUEUE'
            ? 'Menampilkan calon santri yang belum lulus / sedang berproses'
            : 'Arsip riwayat tes untuk peninjauan jangka panjang'}
        </div>
      </div>

      {/* Integrated Compact Toolbar */}
      <div className="bg-white px-4 py-3 rounded-b-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama santri, No. Pendaftaran, No. HP, atau asal sekolah..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={jenjangFilter}
              onChange={(e) => setJenjangFilter(e.target.value)}
              disabled={Boolean(jenjangScope)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-85 disabled:bg-teal-50/50 disabled:font-bold disabled:text-teal-900"
            >
              {jenjangScope ? (
                <option value={jenjangScope}>Khusus Unit {jenjangScope}</option>
              ) : (
                <>
                  <option value="ALL">Semua Jenjang</option>
                  <option value="STK">STK / TK</option>
                  <option value="SD">SD</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                </>
              )}
            </select>

            {viewTab === 'ACTIVE_QUEUE' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Status Jadwal</option>
                <option value="BELUM_DIJADWALKAN">Belum Dijadwalkan</option>
                <option value="TERJADWAL">Terjadwal</option>
                <option value="SEDANG_BERLANGSUNG">Sedang Berlangsung</option>
                <option value="SELESAI">Selesai Dinilai</option>
                <option value="PERLU_TINDAK_LANJUT">Perlu Tindak Lanjut</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4 w-12 text-center">No</th>
                <th className="py-2.5 px-4 min-w-[200px]">Santri</th>
                <th className="py-2.5 px-4 w-28">Jenjang</th>
                <th className="py-2.5 px-4 min-w-[180px]">Kontak & Asal</th>
                <th className="py-2.5 px-4 min-w-[200px]">Jadwal & Penguji</th>
                <th className="py-2.5 px-4 w-36">Status</th>
                <th className="py-2.5 px-4 w-48 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Memuat data antrean calon santri...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    {viewTab === 'ACTIVE_QUEUE'
                      ? 'Tidak ada calon santri dalam antrean aktif.'
                      : 'Belum ada santri resmi yang tercatat di arsip hasil tes.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const sc = schedules[st.id];
                  const session = latestSessions[st.id];
                  const isOfficial = isStudentOfficial(st);
                  const currentStatus = session
                    ? session.isDraft
                      ? 'SEDANG_BERLANGSUNG'
                      : 'SELESAI'
                    : sc?.status || 'BELUM_DIJADWALKAN';

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 text-sm leading-snug">
                            {st.namaLengkap}
                          </span>
                          {isOfficial ? (
                            <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-teal-600" />
                              Siswa Resmi
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Pendaftar
                            </span>
                          )}
                          {st.statusPendaftaran === 'LULUS' && !isOfficial && (
                            <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
                              Lulus
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 font-mono">
                          <span className="bg-slate-100 px-1 rounded text-[10px] text-slate-700">
                            {st.noPendaftaran || st.noInduk || 'PPDB-BARU'}
                          </span>
                          <span>•</span>
                          <span className="font-sans">{st.jenisKelamin === 'L' ? 'L' : 'P'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 font-bold rounded text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                          {st.jenjang}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">{st.gelombang}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{st.noHp || '-'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[170px] mt-0.5">
                          {st.asalSekolah || 'Asal Sekolah -'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {sc?.scheduledDate || session ? (
                          <div>
                            {sc?.scheduledDate && (
                              <div className="font-medium text-slate-800 flex items-center gap-1 text-[11px]">
                                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{sc.scheduledDate} • {sc.scheduledTime} WIB</span>
                              </div>
                            )}
                            <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate max-w-[150px] font-medium">
                                {session?.interviewerName
                                  ? `Penguji: ${session.interviewerName}`
                                  : sc?.interviewerName || 'Penguji Belum Ditentukan'}
                              </span>
                            </div>
                            {sc?.meetUrl && !isOfficial && (
                              <a
                                href={sc.meetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-700 font-semibold hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Buka Meet
                              </a>
                            )}
                          </div>
                        ) : isOfficial ? (
                          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Tes Telah Selesai</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum diatur</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isOfficial ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                              <CheckCircle2 className="w-3 h-3" />
                              LULUS & SISWA RESMI
                            </span>
                            <div className="text-[10px] text-slate-500 font-medium">
                              Tercatat di Data Siswa
                            </div>
                          </div>
                        ) : session ? (
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                session.hasilRekomendasi === 'DITERIMA'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : session.hasilRekomendasi === 'DITERIMA_BERSYARAT'
                                  ? 'bg-teal-100 text-teal-800 border border-teal-300'
                                  : session.hasilRekomendasi === 'CADANGAN'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {session.hasilRekomendasi?.replace('_', ' ') || 'DINILAI'}
                            </span>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {session.isDraft ? 'Draf Disimpan' : 'Selesai Dinilai'}
                            </div>
                          </div>
                        ) : (
                          <>
                            {currentStatus === 'BELUM_DIJADWALKAN' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                Belum Ada Jadwal
                              </span>
                            )}
                            {currentStatus === 'TERJADWAL' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                                Terjadwal
                              </span>
                            )}
                            {currentStatus === 'SEDANG_BERLANGSUNG' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                                Sedang Tes
                              </span>
                            )}
                            {currentStatus === 'SELESAI' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Selesai
                              </span>
                            )}
                            {currentStatus === 'PERLU_TINDAK_LANJUT' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                Tindak Lanjut
                              </span>
                            )}
                          </>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* JIKA SUDAH RESMI MENJADI SISWA: HANYA TAMPILKAN LIHAT CATATAN & TAUTAN PROFIL SISWA */}
                          {isOfficial ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenResultModal(st, session)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition shadow-xs active:scale-95"
                                title="Lihat Rekam Jejak Catatan Hasil Tes Wawancara"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Lihat Catatan Hasil Tes</span>
                              </button>

                              <Link
                                href="/siswa"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition"
                                title="Buka Data Siswa Resmi di Database"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Siswa Resmi ✓</span>
                              </Link>
                            </>
                          ) : (
                            <>
                              {/* AKSI UNTUK CALON SANTRI PENDAFTAR AKTIF */}
                              {st.statusPendaftaran === 'LULUS' && (
                                <button
                                  type="button"
                                  disabled={promotingId === st.id}
                                  onClick={() => handlePromoteToStudent(st)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg shadow-xs transition active:scale-95"
                                  title="Luluskan & Daftarkan ke Data Siswa Resmi"
                                >
                                  {promotingId === st.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-200" />
                                  )}
                                  <span>Proses ke Siswa</span>
                                </button>
                              )}

                              {session && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenResultModal(st, session)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition shadow-xs"
                                  title="Lihat Catatan Wawancara"
                                >
                                  <Eye className="w-3 h-3 text-emerald-700" />
                                  Catatan
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenScheduleModal(st)}
                                className="px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                title="Atur Jadwal & Google Meet"
                              >
                                Atur Jadwal
                              </button>

                              <Link
                                href={`/wawancara/${st.id}`}
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold shadow-xs transition active:scale-95 ${
                                  session
                                    ? 'bg-slate-800 hover:bg-slate-900 text-white'
                                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                }`}
                              >
                                <Play className="w-3 h-3 fill-current" />
                                {session ? 'Edit / Buka' : 'Mulai Tes'}
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Atur Jadwal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title={`Atur Jadwal Wawancara: ${selectedStudent?.namaLengkap || ''}`}
      >
        <form onSubmit={handleSaveSchedulePreview} className="space-y-3.5 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="font-semibold text-slate-800">{selectedStudent?.namaLengkap}</span>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
              {selectedStudent?.jenjang} ({selectedStudent?.gelombang})
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={modalDate}
                onChange={(e) => setModalDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jam (WIB)</label>
              <input
                type="time"
                required
                value={modalTime}
                onChange={(e) => setModalTime(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tautan / Link Google Meet</label>
            <input
              type="url"
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
              value={modalMeetUrl}
              onChange={(e) => setModalMeetUrl(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Penguji (Ustadz / Ustadzah)</label>
            <input
              type="text"
              placeholder="Contoh: Ust. H. Ahmad Fauzi"
              value={modalInterviewer}
              onChange={(e) => setModalInterviewer(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={modalStatus}
              onChange={(e) => setModalStatus(e.target.value as any)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TERJADWAL">Terjadwal</option>
              <option value="BELUM_DIJADWALKAN">Belum Dijadwalkan</option>
              <option value="SEDANG_BERLANGSUNG">Sedang Berlangsung</option>
              <option value="SELESAI">Selesai</option>
              <option value="PERLU_TINDAK_LANJUT">Perlu Tindak Lanjut</option>
            </select>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingSchedule}
              className="px-4 py-1.5 font-bold bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 disabled:opacity-60 transition flex items-center gap-1.5"
            >
              {isSavingSchedule ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Jadwal'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Rincian Catatan Hasil Wawancara (Arsip Jangka Panjang Multi-Tahun) */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        title={`Catatan & Rekam Jejak Wawancara: ${selectedStudent?.namaLengkap || ''}`}
        maxWidth="2xl"
      >
        {isLoadingSession ? (
          <div className="py-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs">Mengambil rekam jejak catatan wawancara santri...</p>
          </div>
        ) : selectedSession ? (
          <div className="space-y-3.5 text-xs">
            {/* Header info */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900 block text-sm">{selectedStudent?.namaLengkap}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {selectedStudent?.noPendaftaran || selectedStudent?.noInduk || '-'} • {selectedStudent?.jenjang} ({selectedStudent?.gelombang})
                </span>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Asal: {selectedStudent?.asalSekolah || '-'} • No HP: {selectedStudent?.noHp || '-'}
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    selectedSession.hasilRekomendasi === 'DITERIMA' || selectedStudent?.statusPendaftaran === 'LULUS'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : selectedSession.hasilRekomendasi === 'DITERIMA_BERSYARAT'
                      ? 'bg-teal-100 text-teal-800 border border-teal-300'
                      : selectedSession.hasilRekomendasi === 'CADANGAN'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {selectedSession.hasilRekomendasi?.replace('_', ' ') || 'DITERIMA (LULUS)'}
                </span>
                <span className="text-[11px] text-slate-600 block mt-1 font-medium">
                  Penguji: <b className="text-slate-900">{selectedSession.interviewerName || 'Ustadz Penguji PPDB'}</b>
                </span>
              </div>
            </div>

            {/* 7 Rubrik & Catatan List */}
            <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  1. Kesiapan Mondok & Kemandirian
                </span>
                <span className="font-bold text-slate-800 block text-xs mt-1">
                  {selectedSession.kesiapanMondok || 'Sangat Siap & Mandiri'}
                </span>
                {selectedSession.kesiapanNotes && (
                  <p className="text-[11px] text-slate-600 mt-1 italic">&quot;{selectedSession.kesiapanNotes}&quot;</p>
                )}
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  2. Motivasi Masuk Pesantren
                </span>
                <span className="font-bold text-slate-800 block text-xs mt-1">
                  {selectedSession.motivasiType || 'Kemauan Santri Sendiri'}
                </span>
                {selectedSession.motivasiNotes && (
                  <p className="text-[11px] text-slate-600 mt-1 italic">&quot;{selectedSession.motivasiNotes}&quot;</p>
                )}
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  3. Catatan Kesehatan & Riwayat Penyakit
                </span>
                <span className="text-slate-800 block text-xs mt-1 font-medium">
                  {selectedSession.catatanKesehatan || 'Tidak ada riwayat alergi / keluhan khusus (Sehat)'}
                </span>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  4. Komitmen & Dukungan Orang Tua
                </span>
                <span className="text-slate-800 block text-xs mt-1 font-medium">
                  {selectedSession.komitmenOrtu || 'Orang tua berkomitmen penuh mendukung pendidikan santri di pesantren'}
                </span>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  5. Adab & Bacaan Al-Qur&apos;an
                </span>
                <span className="text-slate-800 block text-xs mt-1 font-medium">
                  {selectedSession.adabDanQuran || 'Adab sopan, bacaan Al-Qur’an lancar sesuai kaidah tajwid dasar'}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  6. Observasi / Catatan Khusus Penguji
                </span>
                <span className="text-slate-800 block text-xs mt-1 font-semibold">
                  {selectedSession.catatanPenguji || 'Santri berpotensi baik dan layak diterima di Pondok Pesantren Al-Qur’aniyyah'}
                </span>
              </div>

              {selectedSession.catatanTindakLanjut && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    7. Catatan Syarat / Tindak Lanjut
                  </span>
                  <span className="text-slate-800 block text-xs mt-1 font-semibold">
                    {selectedSession.catatanTindakLanjut}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePrintResult}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                title="Cetak Berkas Rekam Jejak Wawancara untuk Arsip Fisik"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Cetak Lembar Wawancara</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsResultModalOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium"
                >
                  Tutup
                </button>
                {selectedStudent && (
                  <Link
                    href={`/wawancara/${selectedStudent.id}`}
                    className="px-4 py-1.5 font-bold bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Buka Lembar Kerja Penuh
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 space-y-3">
            <Info className="w-8 h-8 mx-auto text-amber-500" />
            <div>
              <p className="font-semibold text-slate-800">Catatan Wawancara Belum Diinput</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Santri ini sudah berstatus Siswa Resmi, namun lembar hasil tes digital belum diarsipkan secara terpisah.
              </p>
            </div>
            {selectedStudent && (
              <Link
                href={`/wawancara/${selectedStudent.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 font-bold bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition text-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Input / Buka Lembar Wawancara Santri
              </Link>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
