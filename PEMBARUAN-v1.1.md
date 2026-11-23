# PEMBARUAN NILAI – AL WAFA v1.0 → v1.1

Pembaruan ini **hanya menambah** fitur. Tidak ada sheet, kolom, atau data lama yang diubah; alur lama
(kelas otomatis, input nilai, peta klaim, lapor, kelulusan, cetak) tetap sama. Satu sheet baru, `Batch_Isi`,
dibuat otomatis saat pertama kali dipakai.

## Yang baru

1. **Rekap nilai per angkatan** — *Perkuliahan & Nilai → Rekap angkatan* (juga tombol **Rekap lengkap** di Dasbor → Matriks).
   Per MK kurikulum PDDIKTI: berapa mahasiswa sudah bernilai, sudah dilapor, belum; kelas pengisinya di semua periode
   (klik untuk mengisi nilai); saringan *Sudah lengkap / Sebagian / Belum ada nilai*; **Unduh Excel**.
2. **Kelas PDDIKTI (tanpa MK riil)** — *Perkuliahan & Nilai → Kelas PDDIKTI*, atau dari Rekap (centang MK → *Buat kelas PDDIKTI*).
   Untuk mahasiswa yang sudah lulus: pilih prodi, angkatan, status peserta (default **Lulus**), periode lapor
   (default **semester sebaran** MK). Peta Klaim terisi otomatis; bila MK sudah punya peta dengan MK riil, MK riil tetap
   diutamakan dan MK PDDIKTI hanya menjadi sumber cadangan. Isi nilai seperti kelas biasa → laporkan di *Lapor PDDIKTI*
   pada periode tersebut. Bisa dibatalkan dari **Riwayat kelas PDDIKTI** selama belum ada nilai.
3. **Pembatalan unggah kurikulum** — *Kurikulum → Riwayat impor → Batalkan*. Impor Sebaran MK dan impor MK riil kini
   tercatat (KUR-… / MKR-…). Saat dibatalkan, MK yang ditambah dihapus dan MK yang ditimpa dikembalikan ke data lama;
   MK yang sudah dipakai (dipetakan / sudah dilapor / dipakai kelas) **dipertahankan**.
   Untuk kurikulum yang diunggah **sebelum v1.1** (belum tercatat), pakai **Hapus kurikulum {prodi} {tahun}**
   di kanan atas halaman Kurikulum — hanya MK yang belum dipakai yang dihapus, dan penghapusan ini pun bisa dibatalkan.

Perbaikan kecil: judul halaman Perkuliahan tidak lagi tertulis "Input nilai"; kode MK ganda di satu file Sebaran MK
tidak lagi membuat impor gagal.

## Cara memasang (±10 menit)

### A. Backend — editor Apps Script
1. Buka proyek Apps Script NILAI – AL WAFA.
2. Klik berkas **Kode.gs** → `Ctrl+A` → tempel isi `backend/Kode.gs` dari paket ini → **Simpan** (`Ctrl+S`).
3. Klik **＋ → Skrip**, beri nama **Tambahan** → hapus isi bawaan → tempel isi `backend/Tambahan.gs` → **Simpan**.
4. **Terapkan → Kelola deployment → ✏ Edit → Versi: Versi baru → Terapkan.**
   Jangan pilih "Deployment baru" — URL `/exec` harus tetap sama.
5. Tidak perlu menjalankan `setupAppEnvironment` lagi.

### B. Frontend — folder repo GitHub Pages
1. Ganti **6 berkas** ini dengan versi dari paket:
   `index.html`, `css/style.css`, `js/core.js`, `js/hal-utama.js`, `js/hal-nilai.js`, `js/hal-pengaturan.js`.
2. **JANGAN** mengganti `js/config.js` (berisi URL `/exec` Anda).
3. Di terminal, dari folder repo:
   ```
   git add .
   git commit -m "Pembaruan v1.1"
   git push
   ```
4. Tunggu 1–2 menit, buka aplikasi, tekan `Ctrl+Shift+R`.

### C. Cek
*Pengaturan → Keamanan & sistem*: kartu **Sistem** menunjukkan **Versi backend 1.1.0** dan **Versi frontend 1.1.0**. Lalu buka *Perkuliahan & Nilai* —
ada tombol **Rekap angkatan** dan **Kelas PDDIKTI**.

## Rollback
Kelola deployment → pilih versi sebelumnya → Terapkan; kembalikan 6 berkas frontend lama → push.
Data yang dibuat v1.1 (kelas PDDIKTI, riwayat batch) tetap aman di spreadsheet.
