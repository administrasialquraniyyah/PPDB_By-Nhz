import * as XLSX from 'xlsx';

export interface ParsedStudentRow {
  rowNumber: number;
  namaLengkap: string;
  jenjang: string;
  tahunAjaran?: string;
  noPendaftaran?: string;
  noInduk?: string;
  nik?: string;
  nisn?: string;
  jenisKelamin?: string;
  ttl?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  email?: string;
  noHp?: string;
  alamat?: string;
  kota?: string;
  agama?: string;
  golonganDarah?: string;
  asalSekolah?: string;
  alamatSekolah?: string;
  namaAyah?: string;
  noHpAyah?: string;
  pekerjaanAyah?: string;
  namaIbu?: string;
  noHpIbu?: string;
  pekerjaanIbu?: string;
  namaWali?: string;
  noHpWali?: string;
  username?: string;
  password?: string;
  idKartu?: string;
  gelombang?: string;
  notes?: string;
  
  // Data formulir awal dari file jika ada
  biayaFormulir?: number;
  ketPembFormulir?: string;
  
  // Data daftar ulang awal dari file jika ada
  statusDaftarUlang?: string;
  nominalDaftarUlang?: number;
  metodeDaftarUlang?: string;

  // Data rekomendasi awal dari file jika ada
  rekomendasi?: string;
  
  raw: Record<string, any>;
  hasError: boolean;
  errors: string[];
}

export function cleanPhone(val: any): string {
  if (val === null || val === undefined) return '';
  let s = String(val).trim();
  if (s.startsWith("'")) s = s.substring(1).trim();
  // Strip spaces, dashes, dots, but keep digits
  let digits = s.replace(/[^0-9]/g, '');
  if (!digits) return '';
  // Convert 628xxx to 08xxx
  if (digits.startsWith('628')) {
    digits = '0' + digits.substring(2);
  } else if (digits.startsWith('8') && digits.length >= 9 && digits.length <= 13) {
    // Missing leading zero from Excel number formatting
    digits = '0' + digits;
  }
  return digits;
}

export function normalizeDobString(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  if (!s || s === '-') return '';

  // Check if DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${day}/${month}/${year}`;
  }

  // Check if YYYY-MM-DD
  const ymdMatch = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  // Check if Excel serial date number
  const num = Number(s);
  if (!isNaN(num) && num > 20000 && num < 60000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return s;
}

export function parseExcelBuffer(buffer: Buffer): {
  sheets: string[];
  selectedSheet: string;
  rows: ParsedStudentRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  headerRowIndex: number;
} {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets = workbook.SheetNames;
  
  // Prioritize sheets named 'DATA SANTRI', 'Sheet1', or the first non-empty sheet
  let selectedSheet = sheets[0];
  if (sheets.includes('DATA SANTRI')) {
    selectedSheet = 'DATA SANTRI';
  } else if (sheets.includes('Sheet1')) {
    selectedSheet = 'Sheet1';
  }

  const worksheet = workbook.Sheets[selectedSheet];
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  // Locate the header row by searching for "NAMA" or "Nama" or "Nama Lengkap"
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rawData.length, 15); i++) {
    const row = rawData[i];
    if (Array.isArray(row)) {
      const hasName = row.some((cell) => {
        const str = String(cell || '').trim().toUpperCase();
        return str === 'NAMA' || str === 'NAMA LENGKAP' || str === 'NAMA SANTRI' || str === 'NAMA SISWA';
      });
      if (hasName) {
        headerRowIndex = i;
        break;
      }
    }
  }

  // Fallback: If row 0 doesn't have NAMA but has columns, or check if row 0 is headers
  if (headerRowIndex === -1 && rawData.length > 0) {
    // Check if row 0 has strings like "NO", "JENJANG", "NIK"
    const row0 = rawData[0];
    if (row0 && row0.some((c) => /JENJANG|TAHUN|NIK|NISN|NO/i.test(String(c)))) {
      headerRowIndex = 0;
    } else {
      headerRowIndex = 0;
    }
  }

  const headers: string[] = (rawData[headerRowIndex] || []).map((h) => String(h || '').trim());
  const headerMap: Record<string, number> = {};

  headers.forEach((h, idx) => {
    const norm = h.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (norm) headerMap[norm] = idx;
  });

  // Helper to find column index from aliases (exact match first, then partial match)
  const findCol = (aliases: string[]): number => {
    // 1. Exact normalized match
    for (const a of aliases) {
      const norm = a.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (headerMap[norm] !== undefined) return headerMap[norm];
    }
    // 2. Partial substring matching fallback
    for (let idx = 0; idx < headers.length; idx++) {
      const norm = headers[idx].toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!norm) continue;
      for (const a of aliases) {
        const aNorm = a.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (aNorm && (norm === aNorm || norm.includes(aNorm) || (aNorm.length >= 4 && aNorm.includes(norm)))) {
          return idx;
        }
      }
    }
    return -1;
  };

  const colNoPendaftaran = findCol(['NOPENDAFTARAN', 'NOMORPENDAFTARAN', 'NOREGISTRASI', 'NOREG', 'KODEPPDB', 'REGISTRASI']);
  const colNama = findCol(['NAMA', 'NAMALENGKAP', 'NAMASISWA', 'NAMASANTRI', 'NAMA_LENGKAP', 'SANTRI']);
  const colJenjang = findCol(['JENJANG', 'PROGRAM', 'TINGKAT', 'UNIT']);
  const colTahun = findCol(['TP', 'TAHUN', 'TAHUNAJARAN', 'TAHUNPELAJARAN']);
  const colNoInduk = findCol(['NOINDUK', 'NIS', 'INDUK', 'NOMORINDUK', 'NISN_LOKAL']);
  const colNik = findCol(['NIK', 'NOKTP', 'NOMORKTP']);
  const colNisn = findCol(['NISN']);
  const colJk = findCol(['LP', 'JENISKELAMIN', 'JK', 'SEX', 'GENDER']);
  const colTempat = findCol(['TEMPATLAHIR', 'TEMPAT', 'TMPTLAHIR']);
  const colTanggalLahir = findCol(['TANGGALLAHIR', 'TGLLAHIR', 'TANGGAL', 'DOB', 'TANGGALLAHIRDDMMYYYY']);
  const colTtl = findCol(['TTL', 'TEMPATLAHIRTANGGALLAHIR', 'TEMPATDANTANGGALLAHIR']);
  const colEmail = findCol(['EMAIL', 'SUREL', 'MAIL']);
  const colNoHp = findCol([
    'NOHP', 'NOTELP', 'NOTLP', 'NOTELEPON', 'TELEPON', 'TELPON', 'HP', 'TELP',
    'WA', 'NOWA', 'WHATSAPP', 'NOWHATSAPP', 'HANDPHONE', 'NOHANDPHONE',
    'HPWA', 'NOHPWA', 'NOWAHP', 'NOTELPWA', 'NOMORHP', 'NOMORTELEPON',
    'NOMORTELP', 'KONTAK', 'NOKONTAK', 'NOHPSISWA', 'NOTELEPONSISWA', 'HPSISWA',
    'NOHPORTU', 'HPORTU', 'NOTELEPONORTU', 'TELEPONORTU', 'KONTAKSISWA', 'KONTAKORTU'
  ]);
  const colAlamat = findCol(['ALAMAT', 'DOMISILI', 'ALAMATSISWA', 'ALAMATTINGGAL']);
  const colKota = findCol(['KOTA', 'KABUPATEN', 'KOTAKABUPATEN', 'KAB', 'KOTATINGGAL']);
  const colAgama = findCol(['AGAMA', 'RELIGION']);
  const colGolDarah = findCol(['GOLONGANDARAH', 'GOLDARAH', 'GOLDAR', 'GOL_DARAH']);
  const colAsalSekolah = findCol(['ASALSEKOLAH', 'SEKOLAHASAL', 'SEKOLAH']);
  const colAlamatSekolah = findCol(['ALAMATASALSEKOLAH', 'ALAMATSEKOLAH']);
  const colAyah = findCol(['AYAH', 'NAMAAYAH', 'ORTU', 'ORANGTUA', 'NAMA_AYAH']);
  const colNoHpAyah = findCol(['NOHPAYAH', 'NOTELPAYAH', 'HPAYAH', 'TELPAYAH', 'WAAYAH', 'NOWAAYAH', 'TELEPONAYAH']);
  const colPekerjaanAyah = findCol(['PEKERJAANAYAH', 'PEKERJAANORTU', 'PEKERJAAN', 'PROFESIAYAH', 'JOBAYAH']);
  const colIbu = findCol(['IBU', 'NAMAIBU', 'NAMA_IBU']);
  const colNoHpIbu = findCol(['NOHPIBU', 'NOTELPIBU', 'HPIBU', 'TELPIBU', 'WAIBU', 'NOWAIBU', 'TELEPONIBU']);
  const colPekerjaanIbu = findCol(['PEKERJAANIBU', 'PROFESIIBU', 'JOBIBU']);
  const colNamaWali = findCol(['NAMAWALI', 'WALI', 'NAMA_WALI']);
  const colNoHpWali = findCol(['NOHPWALI', 'NOTELPWALI', 'HPWALI', 'TELPWALI', 'WAWALI', 'TELEPONWALI']);
  const colUsername = findCol(['USERNAME', 'USER', 'AKUN']);
  const colPassword = findCol(['PASSWORD', 'PASS', 'KATASANDI']);
  const colIdKartu = findCol(['IDKARTU', 'NOMORKARTU', 'NOKARTU', 'IDKARTUCBS', 'KARTU']);
  const colGelombang = findCol(['GELOMBANG', 'GEL']);
  const colBiayaForm = findCol(['BIAYAFORM', 'BIAYAFORMULIR', 'FORMULIR', 'BIAYA']);
  const colKetPemb = findCol(['KETPEMB', 'METODEFORMULIR', 'PEMBAYARANFORMULIR']);
  const colDaftarUlang = findCol(['DAFTARULANG', 'STATUSDAFTARULANG', 'KETDAFTARULANG']);
  const colJumlahDU = findCol(['JUMLAH', 'NOMINALDAFTARULANG', 'BIAYADAFTARULANG']);
  const colTujuanTransfer = findCol(['TUJUANTRANSFER', 'METODEDAFTARULANG', 'BANK']);
  const colRekomendasi = findCol(['REKOMENDASI', 'PEREKOMENDASI', 'PEMBERIREKOMENDASI']);

  const parsedRows: ParsedStudentRow[] = [];

  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row.length) continue;

    // Check if row has some data
    const hasData = row.some((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (!hasData) continue;

    // In some tables like Santri Baru Full Data, column 3 (index 3) is Nama if header was empty
    let nama = colNama !== -1 ? String(row[colNama] || '').trim() : '';
    if (!nama && row[3] && typeof row[3] === 'string' && isNaN(Number(row[3]))) {
      nama = String(row[3]).trim();
    }
    if (!nama && row[1] && typeof row[1] === 'string' && isNaN(Number(row[1]))) {
      nama = String(row[1]).trim();
    }

    // Skip footer or total rows
    if (/TOTAL|JUMLAH|REKAPITULASI|PENGELUARAN/i.test(nama)) continue;

    const errors: string[] = [];
    if (!nama) {
      errors.push('Nama siswa kosong');
    }

    let rawJenjang = colJenjang !== -1 ? String(row[colJenjang] || '').trim() : '';
    // Normalize jenjang: TK / SD / SMP / SMA
    let jenjang = 'SMP';
    const upJ = rawJenjang.toUpperCase();
    if (upJ.includes('TK') || upJ.includes('STK') || upJ.includes('PAUD')) jenjang = 'TK';
    else if (upJ.includes('SD')) jenjang = 'SD';
    else if (upJ.includes('SMP') || upJ.includes('MTS')) jenjang = 'SMP';
    else if (upJ.includes('SMA') || upJ.includes('SMK') || upJ.includes('MA')) jenjang = 'SMA';
    else if (rawJenjang) jenjang = rawJenjang;

    let tahunAjaran = colTahun !== -1 ? String(row[colTahun] || '').trim() : '';
    if (tahunAjaran && !tahunAjaran.includes('/') && tahunAjaran.length === 4) {
      const nextY = parseInt(tahunAjaran) + 1;
      tahunAjaran = `${tahunAjaran}/${nextY}`;
    }

    const cleanClean = (val: any) => {
      if (val === null || val === undefined) return '';
      let s = String(val).trim();
      if (s.startsWith("'")) s = s.substring(1);
      return s === '-' ? '' : s;
    };

    let rawJk = colJk !== -1 ? String(row[colJk] || '').trim().toUpperCase() : '';
    let jk = '';
    if (rawJk.startsWith('L') || rawJk === 'LAKI-LAKI') jk = 'L';
    else if (rawJk.startsWith('P') || rawJk === 'PEREMPUAN') jk = 'P';

    // Parse TTL: Check separate columns first, fallback to combined
    const ttlRaw = colTtl !== -1 ? String(row[colTtl] || '').trim() : '';
    let tempatLahir = colTempat !== -1 ? cleanClean(row[colTempat]) : '';
    let tanggalLahir = colTanggalLahir !== -1 ? normalizeDobString(row[colTanggalLahir]) : '';

    if (!tempatLahir || !tanggalLahir) {
      if (ttlRaw.includes(',')) {
        const parts = ttlRaw.split(',');
        if (!tempatLahir) tempatLahir = parts[0]?.trim() || '';
        if (!tanggalLahir) tanggalLahir = normalizeDobString(parts.slice(1).join(',').trim());
      } else if (!tempatLahir && ttlRaw) {
        tempatLahir = ttlRaw;
      }
    }

    // Parse biaya formulir
    let biayaForm = 0;
    if (colBiayaForm !== -1 && row[colBiayaForm]) {
      const n = Number(String(row[colBiayaForm]).replace(/[^0-9]/g, ''));
      if (!isNaN(n)) biayaForm = n;
    }

    // Parse daftar ulang
    let nominalDU = 0;
    if (colJumlahDU !== -1 && row[colJumlahDU]) {
      const n = Number(String(row[colJumlahDU]).replace(/[^0-9]/g, ''));
      if (!isNaN(n)) nominalDU = n;
    }

    // Phone parsing with multi-field fallback and smart row scan
    let noHp = colNoHp !== -1 ? cleanPhone(row[colNoHp]) : '';
    const noHpAyah = colNoHpAyah !== -1 ? cleanPhone(row[colNoHpAyah]) : '';
    const noHpIbu = colNoHpIbu !== -1 ? cleanPhone(row[colNoHpIbu]) : '';
    const noHpWali = colNoHpWali !== -1 ? cleanPhone(row[colNoHpWali]) : '';

    if (!noHp) {
      if (noHpAyah) noHp = noHpAyah;
      else if (noHpIbu) noHp = noHpIbu;
      else if (noHpWali) noHp = noHpWali;
      else {
        // Inspect row cells for a phone pattern
        for (let c = 0; c < row.length; c++) {
          if (c === colNik || c === colNisn || c === colTanggalLahir || c === colBiayaForm || c === colJumlahDU) continue;
          const candidate = cleanPhone(row[c]);
          if ((candidate.startsWith('08') || candidate.startsWith('628')) && candidate.length >= 10 && candidate.length <= 14) {
            noHp = candidate;
            break;
          }
        }
      }
    }

    const rowObj: ParsedStudentRow = {
      rowNumber: i + 1,
      namaLengkap: cleanClean(nama),
      jenjang,
      tahunAjaran: cleanClean(tahunAjaran),
      noPendaftaran: colNoPendaftaran !== -1 ? cleanClean(row[colNoPendaftaran]) : '',
      noInduk: colNoInduk !== -1 ? cleanClean(row[colNoInduk]) : '',
      nik: colNik !== -1 ? cleanClean(row[colNik]) : '',
      nisn: colNisn !== -1 ? cleanClean(row[colNisn]) : '',
      jenisKelamin: jk,
      ttl: cleanClean(ttlRaw),
      tempatLahir: cleanClean(tempatLahir),
      tanggalLahir: cleanClean(tanggalLahir),
      email: colEmail !== -1 ? cleanClean(row[colEmail]) : '',
      noHp,
      alamat: colAlamat !== -1 ? cleanClean(row[colAlamat]) : '',
      kota: colKota !== -1 ? cleanClean(row[colKota]) : '',
      agama: colAgama !== -1 ? cleanClean(row[colAgama]) : 'Islam',
      golonganDarah: colGolDarah !== -1 ? cleanClean(row[colGolDarah]) : '',
      asalSekolah: colAsalSekolah !== -1 ? cleanClean(row[colAsalSekolah]) : '',
      alamatSekolah: colAlamatSekolah !== -1 ? cleanClean(row[colAlamatSekolah]) : '',
      namaAyah: colAyah !== -1 ? cleanClean(row[colAyah]) : '',
      noHpAyah,
      pekerjaanAyah: colPekerjaanAyah !== -1 ? cleanClean(row[colPekerjaanAyah]) : '',
      namaIbu: colIbu !== -1 ? cleanClean(row[colIbu]) : '',
      noHpIbu,
      pekerjaanIbu: colPekerjaanIbu !== -1 ? cleanClean(row[colPekerjaanIbu]) : '',
      namaWali: colNamaWali !== -1 ? cleanClean(row[colNamaWali]) : '',
      noHpWali,
      username: colUsername !== -1 ? cleanClean(row[colUsername]) : '',
      password: colPassword !== -1 ? cleanClean(row[colPassword]) : '',
      idKartu: colIdKartu !== -1 ? cleanClean(row[colIdKartu]) : '',
      gelombang: colGelombang !== -1 ? cleanClean(row[colGelombang]) || 'Gelombang 1' : 'Gelombang 1',
      biayaFormulir: biayaForm,
      ketPembFormulir: colKetPemb !== -1 ? cleanClean(row[colKetPemb]) : 'Transfer',
      statusDaftarUlang: colDaftarUlang !== -1 ? cleanClean(row[colDaftarUlang]) : 'Belum',
      nominalDaftarUlang: nominalDU,
      metodeDaftarUlang: colTujuanTransfer !== -1 ? cleanClean(row[colTujuanTransfer]) : '',
      rekomendasi: colRekomendasi !== -1 ? cleanClean(row[colRekomendasi]) : '',
      raw: row,
      hasError: errors.length > 0,
      errors,
    };

    if (rowObj.namaLengkap) {
      parsedRows.push(rowObj);
    }
  }

  const validRows = parsedRows.filter((r) => !r.hasError).length;
  const invalidRows = parsedRows.length - validRows;

  return {
    sheets,
    selectedSheet,
    rows: parsedRows,
    totalRows: parsedRows.length,
    validRows,
    invalidRows,
    headerRowIndex,
  };
}
