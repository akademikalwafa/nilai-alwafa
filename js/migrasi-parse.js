/**
 * migrasi-parse.js — Membaca workbook Excel PDDIKTI lama (1 file = 1 prodi × 1 angkatan, ±92 sheet)
 * menjadi struktur ringkas untuk endpoint migrasi.pratinjau / migrasi.jalankan.
 *
 * Aturan file lama yang dipakai (hasil analisis file 2020 & 2022 HES):
 *  • DataMahasiswa: nama di kolom B mulai baris 7; NIM bisa di kolom C atau D (atau kosong).
 *  • MK-Semester : blok per semester diawali sel B = "SEMESTER", D = "1 (Satu)", baris berikut D = "2020/2021".
 *                  Baris MK: C kode, D nama (+ hyperlink ke sheet MK), E SKS, F dosen, sampai "Jumlah SKS".
 *  • Sheet MK    : baris 18–64 = DataMahasiswa baris 7–53; nilai akhir di kolom N (hasil rumus "Jumlah").
 * Bisa dipakai di browser (window.MigrasiParse) maupun Node (module.exports) untuk pengujian.
 */
(function (root) {
  'use strict';
  const POLA_NIM = /^(\d{2}\.\d{2}\.\d\.\d{2,3}|\d{6,12})$/;
  function sel(ws, a) { const c = ws && ws[a]; return c ? c.v : undefined; }
  function teks(ws, a) { const v = sel(ws, a); return v === undefined || v === null ? '' : String(v).trim(); }
  function angka(v) { if (v === undefined || v === null || v === '') return null; const n = Number(String(v).replace(',', '.')); return isNaN(n) ? null : n; }

  function parse(wb, namaFile) {
    const S = wb.Sheets, peringatan = [];
    const ms = S['MK-Semester'], dm = S['DataMahasiswa'];
    if (!ms || !dm) throw new Error('Bukan format Excel PDDIKTI lama (sheet MK-Semester / DataMahasiswa tidak ditemukan).');

    // 1) Mahasiswa (indeks 0 = baris 7 = baris 18 di sheet MK)
    const mahasiswa = [];
    for (let r = 7; r <= 53; r++) {
      const nama = teks(dm, 'B' + r);
      if (!nama || nama === '0' || /MENGUNDURKAN/i.test(nama)) continue;
      let nim = '';
      ['C', 'D', 'E'].some(function (k) { const v = teks(dm, k + r); if (POLA_NIM.test(v)) { nim = v; return true; } return false; });
      mahasiswa.push({ idx: r - 7, nama: nama.replace(/\s+/g, ' '), nim: nim });
    }
    if (!mahasiswa.some(function (m) { return m.nim; })) peringatan.push('Kolom NIM di DataMahasiswa kosong — mahasiswa dicocokkan berdasarkan nama.');

    // 2) Blok semester di MK-Semester
    const mk = [], ref = ms['!ref'] ? ms['!ref'].split(':')[1] : 'Z200';
    const maxRow = Math.min(Number((ref.match(/\d+/) || ['200'])[0]), 400);
    let blok = 0;
    for (let r = 1; r <= maxRow; r++) {
      if (teks(ms, 'B' + r).toUpperCase() !== 'SEMESTER') continue;
      blok++;
      const smt = parseInt(teks(ms, 'D' + r), 10) || blok;
      const ta = teks(ms, 'D' + (r + 1));
      for (let i = 1; i <= 11; i++) {
        const rr = r + 3 + i;
        if (/jumlah\s*sks/i.test(teks(ms, 'B' + rr))) break;
        const nama = teks(ms, 'D' + rr);
        if (!nama || nama === '0' || /!A1$/.test(nama) || /^\d+\s*\(/.test(nama)) continue;
        const c = ms['D' + rr];
        let sheet = c && c.l && (c.l.location || c.l.Target) ? String(c.l.location || c.l.Target).replace(/^#/, '').replace(/'/g, '').replace(/!.*$/, '') : '';
        if (!sheet || !S[sheet]) sheet = blok === 1 ? 'MK-' + i : 'MK' + blok + '-' + i;
        const ws = S[sheet];
        if (!ws) { peringatan.push('Sheet ' + sheet + ' untuk "' + nama + '" tidak ditemukan — dilewati.'); continue; }
        const namaSheet = teks(ws, 'D11');
        if (namaSheet && namaSheet.toLowerCase() !== nama.toLowerCase()) peringatan.push(sheet + ': nama di sheet "' + namaSheet + '" berbeda dengan MK-Semester "' + nama + '".');
        const nilai = [];
        for (let k = 18; k <= 64; k++) {
          const nm = teks(ws, 'B' + k);
          if (!nm || nm === '0') continue;
          const v = angka(sel(ws, 'N' + k));
          if (v !== null && v > 0) nilai.push({ idx: k - 18, nilai: Math.round(v * 100) / 100 });
        }
        mk.push({ key: sheet, smt: smt, ta: ta, kode: teks(ms, 'C' + rr).replace(/\s+/g, ' '), nama: nama, sks: angka(sel(ms, 'E' + rr)) || 0, dosen: teks(ms, 'F' + rr), nilai: nilai });
      }
    }
    if (!mk.length) throw new Error('Tidak ada mata kuliah yang terbaca dari MK-Semester.');

    // 3) Tebakan prodi & angkatan
    const judulProdi = (teks(dm, 'A2') || teks(ms, 'C2')).replace(/^PROGRAM STUDI\s*/i, '').trim();
    const taPertama = (mk[0].ta.match(/(\d{4})/) || [])[1] || ((String(namaFile || '').match(/(20\d{2})/) || [])[1]) || '';
    const totalSks = mk.reduce(function (s, m) { return s + (m.nilai.length ? Number(m.sks) : 0); }, 0);
    return { file: namaFile || '', prodiTeks: judulProdi, angkatan: taPertama, mahasiswa: mahasiswa, mk: mk, peringatan: peringatan,
      ringkas: { mk: mk.length, nilai: mk.reduce(function (s, m) { return s + m.nilai.length; }, 0), mahasiswa: mahasiswa.length, sksTerisi: totalSks } };
  }
  const api = { parse: parse };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MigrasiParse = api;
})(typeof window !== 'undefined' ? window : this);
