# PEMBARUAN NILAI – AL WAFA → v1.3

Paket ini **kumulatif**: berlaku untuk aplikasi v1.0, v1.1, maupun v1.2. Semua perubahan hanya **menambah** fitur.
Tidak ada sheet, kolom, atau data lama yang diubah, dan tidak ada nama di sistem yang diganti.

## Yang baru di v1.3

### 1. Unggah nilai per mahasiswa (file transkrip/KHS)

Untuk file Excel yang berisi **satu mahasiswa per sheet**:
- di bagian atas: NIM, Nama, dan Program Studi;
- di bawahnya: tabel Kode MK · Nama MK · Periode · Bobot (sks) · Nilai Angka · Huruf · Indeks.

Contohnya salinan halaman nilai dari Neo Feeder.

**Tempat tombolnya** — *Perkuliahan & Nilai* → **Kelola kelas** angkatan (mis. 2019) → **Unggah nilai (Excel)**.
Tombol yang sama juga ada di:
- kartu **Arsip angkatan lampau**;
- halaman kelas per prodi;
- **Rekap nilai angkatan**.

**Cara pakai**
1. Pilih satu atau beberapa file. Satu file boleh berisi banyak sheet.
2. Aplikasi membaca file di browser, lalu menampilkan **pratinjau**:
   - per mahasiswa: NIM & nama di file, dipasangkan dengan mahasiswa di sistem;
   - per mata kuliah: klik baris mahasiswa untuk melihat hasilnya.
3. Klik **Simpan**.

**Cara mencocokkan**
- **Mahasiswa:** lewat NIM, termasuk NIM tanpa titik. Cadangannya nama. Sheet yang tidak dikenal bisa dipasangkan
  manual, atau dibiarkan (sheet itu dilewati).
- **Mata kuliah:** lewat Kode MK ke kurikulum yang berlaku untuk angkatan mahasiswa itu. Spasi diabaikan, jadi
  `WAF1402ESY` = `WAF1402 ESY`. Cadangannya nama MK.
- **Periode:** "2019/2020 Ganjil" → 20191. Bila kolom periode kosong, dihitung dari kolom "Semester ke".

**Ke kelas mana nilainya masuk** (dicoba berurutan)
1. Baris peserta yang masih **kosong** milik mahasiswa itu di kelas yang sudah ada, misalnya Kelas PDDIKTI yang sudah
   Anda buat.
2. Kelas yang cocok di **periode yang sama** (kelas sumber Peta Klaim). Mahasiswa ditambahkan sebagai peserta.
3. Bila belum ada, dibuat otomatis **Kelas PDDIKTI** baru per MK × periode. Peta Klaim dilengkapi seperlunya.

**Pengaman**
- Nilai yang **sudah dilapor tidak pernah diubah**.
- Nilai yang sama tidak ditulis dua kali, jadi file yang sama aman diunggah ulang.
- MK yang muncul dua kali di file → dipakai nilai terbaik.
- Kode MK yang tidak ada di kurikulum → dilewati dan disebutkan di pratinjau.

**Opsi di pratinjau**
- *Timpa nilai yang berbeda* — hanya untuk nilai yang belum dilapor.
- *Nilai ini sudah ada di PDDIKTI → tandai SUDAH DILAPOR* — memakai huruf & indeks persis dari file (mis. 3,66) dan
  langsung terkunci. Perlu mengetik LAPOR.

**Membatalkan** — lewat **Riwayat unggahan**. Nilai, kelas PDDIKTI, peta, dan tanda dilapor dari unggahan itu dihapus;
baris yang tadinya kosong dikosongkan lagi. Pembatalan ditolak bila nilainya sudah dilapor lewat halaman Lapor PDDIKTI.

### 2. "Unduh daftar" di halaman nilai kelas → format impor nilai Neo Feeder

Kolomnya:

| Kolom | Warna judul |
|---|---|
| NIM | merah |
| Nama Mahasiswa | kuning |
| Kode Mata Kuliah | merah |
| Nama Mata Kuliah | kuning |
| Semester | merah |
| Nama Kelas | merah |
| Nilai Huruf | hijau |
| Nilai Indeks | hijau |
| Nilai Angka | hijau |
| Kode Prodi | merah |
| Nama Prodi | kuning |

Setiap judul juga diberi catatan (segitiga merah).

**Nama di sistem tidak diubah.** Semua dipetakan di belakang layar saat diunduh:
- **Kode & Nama Mata Kuliah** = MK kurikulum PDDIKTI yang mengklaim MK riil kelas itu di Peta Klaim.
- **Semester** = periode lapor di Peta Klaim (mis. 20252).
- **Nama Kelas** = nama yang disimpan di halaman Lapor. Bawaannya prodi + semester + kelas, mis. HES5A. Nilai yang
  sudah dilapor memakai nama kelas yang dilaporkan.
- **Kode Prodi & Nama Prodi** = dari *Pengaturan → Data induk → Program studi*. Isi **Kode PDDIKTI** tiap prodi
  (mis. HES = 74234) agar kolom Kode Prodi terisi.

Kelas yang MK-nya belum diklaim di Peta Klaim tetap bisa diunduh, dengan kolom Kode Mata Kuliah kosong dan peringatan.
File ini juga bisa diunggah balik lewat **Unggah Excel** di kelas yang sama.

## Sudah ada sejak v1.1–v1.2 (ikut terpasang bila Anda belum memasangnya)
- Rekap nilai per angkatan.
- Kelas PDDIKTI tanpa MK riil.
- Pembatalan impor kurikulum, dan Hapus kurikulum.
- Tombol Refresh dan sinkron otomatis spreadsheet.
- Tampilan kotak Perkuliahan & Nilai.
- Hapus peta klaim.
- Tandai lulus massal.

## Cara memasang (±10 menit)

### A. Backend — editor Apps Script
1. Klik berkas **Kode.gs** → `Ctrl+A` → tempel isi `backend/Kode.gs` dari paket ini → **Simpan**.
2. Berkas **Tambahan**:
   - Sudah ada: ganti isinya dengan `backend/Tambahan.gs`.
   - Belum ada (masih v1.0): klik **＋ → Skrip**, beri nama **Tambahan**, lalu tempel isinya.
   - Lalu **Simpan**.
3. **Terapkan → Kelola deployment → ✏ Edit → Versi: Versi baru → Terapkan.** URL `/exec` tetap sama.

### B. Frontend — folder repo GitHub Pages
1. Ganti 6 berkas ini:
   - `index.html`
   - `css/style.css`
   - `js/core.js`
   - `js/hal-utama.js`
   - `js/hal-nilai.js`
   - `js/hal-pengaturan.js`
2. **JANGAN** mengganti `js/config.js`.
3. Jalankan `git add .` → `git commit -m "Pembaruan v1.3"` → `git push`, tunggu 1–2 menit, lalu tekan `Ctrl+Shift+R`.

### C. Cek
- *Pengaturan → Keamanan & sistem*: versi backend & frontend **1.3.0**.
- *Pengaturan → Data induk → Program studi*: isi **Kode PDDIKTI** tiap prodi.
- Buka satu kelas → **Unduh daftar** → judul kolom berwarna merah/kuning/hijau seperti format impor Neo Feeder.
- *Perkuliahan & Nilai → Kelola kelas* angkatan 2019 → **Unggah nilai (Excel)** → pilih file → periksa pratinjau →
  **Simpan** → **Buka rekap**.

## Catatan
- Kelas hasil unggahan memakai **periode dari file** (mis. Ganjil 2019/2020), jadi tidak tampil di daftar kelas periode
  aktif. Lihat semuanya di **Rekap nilai angkatan**, atau ganti periode di kanan atas.
- Tanpa opsi "tandai SUDAH DILAPOR", nilai berstatus **Siap lapor** dan muncul di halaman Lapor PDDIKTI pada periodenya.
- Unggahan besar (mis. 100 mahasiswa × 60 MK) tetap satu kali simpan. Bila server menolak karena terlalu banyak, pecah
  filenya (maks. 400 sheet mahasiswa sekali unggah).
- **Rollback:** Kelola deployment → pilih versi sebelumnya; kembalikan 6 berkas frontend lama.
