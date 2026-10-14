# SISTEM DATABASE PPDB & KEUANGAN TERPADU
## Pondok Pesantren Al-Qur'aniyyah — VERSION 1.0 (Production-Ready)

Aplikasi web terpadu untuk mengelola **Database PPDB, Data Siswa Historis, Pembelian Formulir Otomatis, Rekomendasi & Apresiasi, Status & Export Pembuatan Rekening Bank (BSI), Administrasi Daftar Ulang, serta Keuangan & Laporan Kas Yayasan**.

---

## 🌟 FITUR UTAMA & KESESUAIAN SPESIFIKASI

### 1. Database Terintegrasi Supabase (Bukan Sekadar Excel Converter)
- **Database Utama**: Supabase PostgreSQL Cloud (Schema terisolasi: `ppdb`).
- **Data Persisten**: Tidak menggunakan LocalStorage sebagai database. Semua data siswa, pembayaran, rekening, dan kas tersimpan secara online dan permanen di Supabase.
- **Multi-Tahun Ajaran (Historis)**: Data tahun ajaran lama (contoh: 2025/2026) tidak akan tertimpa oleh data tahun ajaran baru (contoh: 2026/2027). Pengguna dapat berpindah tahun ajaran secara instan.

### 2. Import Data PPDB & Auto Pembelian Formulir (Rule 5 & 6)
- **Mendukung FORMAT IMPORT Resmi**:
  - File format `Santri Baru Full Data.xlsx`
  - File format `DATA SANTRI` / `DATA GELOMBANG 1 & 2`
- **Preview & Validasi**: Membaca kolom, menampilkan preview sebelum impor, dan mendeteksi data yang berpotensi duplikat berdasarkan NIK atau Nama + Jenjang.
- **Draft Siswa**: Opsi menyimpan hasil impor sebagai **Draft** untuk verifikasi terlebih dahulu, atau langsung menjadi **Siswa Aktif**.
- **OTOMATIS TERCATAT MEMBELI FORMULIR**: Setiap siswa yang diimpor langsung memiliki record pembelian formulir dengan tarif default sesuai jenjang:
  - **TK IT**: Rp 150.000
  - **SD IT**: Rp 300.000
  - **SMP IT**: Rp 300.000
  - **SMA IT**: Rp 300.000
- **Tarif Fleksibel**: Pengguna dapat mengubah nominal aktual, memberikan diskon/keringanan, atau mengganti status pembayaran per siswa kapan saja.

### 3. Modul Rekomendasi & Perhitungan Apresiasi
- Terhubung langsung ke data siswa.
- Kategori perekomendasi: **Guru / Internal Pesantren**, **Wali Santri**, **Alumni**, dan **Lainnya**.
- Nominal apresiasi (bisyaroh) dapat diedit bebas (default Rp 500.000 untuk Guru, Rp 250.000 untuk Wali Santri).
- **Perhitungan Otomatis**: Menghitung akumulasi jumlah siswa per perekomendasi, total hak bisyaroh, serta status pembayaran (Sudah Dibayar / Belum Dibayar).
- Tombol **Export Excel** dan **Print Laporan** ber-kop surat resmi pesantren.

### 4. Status Pembuatan Rekening & FORMAT EXPORT Bank (CBS / EduPay)
- Status pembuatan rekening: **Belum dibuat** / **Sudah dibuat**.
- Menyimpan nomor rekening (11 digit BSI), tanggal pembuatan, dan catatan.
- **Export Pembuatan Rekening (FORMAT EXPORT Resmi)**:
  - Kolom mengikuti format resmi CBS Bank Syariah Indonesia / EduPay:
    `["NISN", "NIS", "Nama Lengkap", "Tempat Lahir", "Tanggal Lahir (dd/mm/yyyy)", "Jenis Kelamin", "Agama", "Golongan Darah", "Alamat", "Kota", "Nomor Telp", "Email", "Tahun Masuk", "ID kartu", "Nama Lengkap Wali 1", "Nomor Telp Wali 1", "Nama Lengkap Wali 2", "Nomor Telp Wali 2", "Aktifkan Akun CBS?", "Nama Ibu"]`
  - Validasi otomatis data siswa yang belum lengkap sebelum proses unduh file.
- **Import No. Rekening Massal**: Pengguna dapat mengunggah file hasil dari bank (seperti `Rekening.xlsx`) untuk memperbarui nomor rekening siswa secara otomatis berdasarkan pencocokan nama.

### 5. Status & Administrasi Daftar Ulang
- Status daftar ulang: **Sudah Daftar Ulang**, **Belum Daftar Ulang**, dan **Batal Masuk**.
- **Nominal Daftar Ulang Diinput Manual oleh User** (tidak diasumsikan oleh sistem).
- Tanggal daftar ulang, metode pembayaran (Cash, Transfer, Rekening/VA, Mini Bank, Lainnya), dan catatan kwitansi.

### 6. Keuangan PPDB & Arus Kas Terpadu
- **Pemasukan**:
  - Pemasukan formulir (nominal aktual yang lunas)
  - Pemasukan daftar ulang (nominal aktual)
- **Pengeluaran**:
  - Apresiasi rekomendasi yang sudah dicairkan
  - Pengeluaran yayasan (pencairan pimpinan/yayasan)
  - Pengeluaran operasional PPDB (spanduk, konsumsi, insentif penguji, atk)
- **Rekapitulasi Kas Real-Time**: Otomatis menghitung Total Pemasukan, Total Diskon, Total Pengeluaran, dan **Saldo Kas Bersih**.

### 7. Dashboard Eksekutif (Siap Rapat Yayasan)
- Dapat difilter per tahun ajaran.
- Statistik pendaftar total & per jenjang (TK, SD, SMP, SMA).
- Distribusi jenis kelamin & gelombang pendaftaran.
- Ringkasan rekomendasi, rekening bank, daftar ulang, dan saldo keuangan.

### 8. Laporan PPDB, Export Excel & Print
- Laporan multi-filter (Tahun ajaran, Jenjang, Gelombang, Gender, Status Rekening, Status DU, Rekomendasi).
- Fitur **Export Excel** untuk setiap modul.
- Fitur **Print / Simpan PDF** lengkap dengan kop resmi Yayasan Pendidikan Islam Pondok Pesantren Al-Qur'aniyyah dan kolom tanda tangan pimpinan.

### 9. Indikator Koneksi Database Supabase
- Indikator real-time: `🟢 Supabase Connected (xx ms)` / `🔴 Disconnected`.
- Fitur **Test Database Connection** interaktif untuk menguji latensi dan status koneksi ke cloud database.

### 10. Mobile First (Nyaman Digunakan di HP)
- Navigasi bawah (bottom navigation bar) ramah jempol untuk pengoperasian satu tangan di smartphone.
- Tampilan tabel responsif dengan scroll horizontal halus dan card layout.
- Tombol aksi nyaman disentuh tanpa horizontal overflow yang mengganggu.

---

## 🛠️ TEKNOLOGI

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons
- **Backend**: Next.js Serverless API Routes
- **Database**: Supabase PostgreSQL (Cloud Database)
- **ORM**: Prisma Client v5.22
- **Excel Engine**: SheetJS (xlsx)
- **Deployment Ready**: Vercel (`vercel.json` included)

---

## 🚀 CARA MENJALANKAN SECARA LOKAL

1. Pastikan dependensi sudah terpasang:
   ```bash
   npm install
   ```
2. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
3. Buka browser di [http://localhost:3000](http://localhost:3000).

Untuk menjalankan build produksi:
```bash
npm run build
npm start
```

---

## ☁️ CARA DEPLOY KE VERCEL

1. Push folder proyek ke repositori GitHub / GitLab.
2. Buat proyek baru di [Vercel](https://vercel.com).
3. Tambahkan **Environment Variables** di Vercel Dashboard:
   - `DATABASE_URL`: `"postgresql://postgres.fnfcjpyaqzpncbnlktdq:Janganlupa461@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?schema=ppdb"`
   - `DIRECT_URL`: `"postgresql://postgres.fnfcjpyaqzpncbnlktdq:Janganlupa461@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?schema=ppdb"`
   - `NEXT_PUBLIC_SUPABASE_URL`: `"https://fnfcjpyaqzpncbnlktdq.supabase.co"`
4. Klik **Deploy**. Aplikasi akan online dan terhubung langsung ke database Supabase yang sama!
