/* ==========================================================================
   hal-pengaturan.js — Pengaturan (identitas, tema, data induk, skala & predikat,
   kolom tambahan, pengguna, tarik data aplikasi lain, migrasi Excel lama,
   dokumen resmi, keamanan, log) + wizard Sinkron & Migrasi
   ========================================================================== */
'use strict';
const TAB_SET = [
  ['umum', 'Identitas & cetak', 'file'], ['tema', 'Tema warna', 'star'], ['induk', 'Data induk', 'db'], ['skala', 'Skala & predikat', 'award'],
  ['kolom', 'Kolom tambahan', 'list'], ['pengguna', 'Pengguna', 'users'], ['sinkron', 'Tarik dari aplikasi lain', 'link'], ['migrasi', 'Migrasi Excel lama', 'archive'],
  ['dokumen', 'Dokumen resmi (QR)', 'qr'], ['keamanan', 'Keamanan & sistem', 'shield'], ['log', 'Log aktivitas', 'history']
];
Hal.pengaturan = {
  judul: 'Pengaturan',
  render(el, ctx, p) {
    const tab = p[0] && TAB_SET.some((t) => t[0] === p[0]) ? p[0] : 'umum';
    el.innerHTML = '<div class="grid" style="grid-template-columns:220px minmax(0,1fr);align-items:start"><div class="card" style="position:sticky;top:76px"><nav class="nav" style="padding:8px">' + TAB_SET.map((t) => '<a href="#/pengaturan/' + t[0] + '" class="' + (t[0] === tab ? 'aktif' : '') + '">' + ic(t[2]) + '<span>' + esc(t[1]) + '</span></a>').join('') + '</nav></div><div id="set-isi"></div></div>';
    const box = $('#set-isi', el);
    ({ umum: SetUmum, tema: SetTema, induk: SetInduk, skala: SetSkala, kolom: SetKolom, pengguna: SetPengguna, sinkron: SetSinkron, migrasi: SetMigrasi, dokumen: SetDokumen, keamanan: SetKeamanan, log: SetLog })[tab](box, ctx);
  }
};
const kartu = (judul, isi, aksi, desc) => '<div class="card mb-16"><div class="card-h"><div><h3>' + esc(judul) + '</h3>' + (desc ? '<div class="muted" style="font-size:12.5px;margin-top:2px">' + desc + '</div>' : '') + '</div><span class="spacer"></span>' + (aksi || '') + '</div><div class="card-b">' + isi + '</div></div>';

/* ---------------------------------------------------------------- identitas & cetak */
function SetUmum(box, ctx) {
  box.innerHTML = skelTabel(6);
  pakai(ctx, 'pengaturan.get', {}, (d) => {
    const s = d.pengaturan;
    const fld = (k, label, hint, tipe) => '<div class="field"><label>' + label + '</label><input class="input" name="' + k + '" value="' + esc(s[k] || '') + '" ' + (tipe ? 'type="' + tipe + '"' : '') + '>' + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
    box.innerHTML = '<form id="su">' + kartu('Identitas institusi', '<div class="fgrid">' + fld('INSTITUSI_NAMA', 'Nama institusi', 'Tampil di kop KHS, transkrip, dan file lapor.') + fld('INSTITUSI_SINGKAT', 'Nama singkat') + '<div class="field full"><label>Alamat</label><input class="input" name="INSTITUSI_ALAMAT" value="' + esc(s.INSTITUSI_ALAMAT || '') + '"></div>' + fld('INSTITUSI_KOTA', 'Kota (untuk tanda tangan)') + fld('LOGO_URL', 'URL logo (PNG/JPG publik)', 'Contoh: https://…/logo.png. Kosongkan bila tanpa logo.') + '</div><div class="row mt-12" id="su-logo">' + (s.LOGO_URL ? '<img src="' + esc(s.LOGO_URL) + '" style="height:56px;border:1px solid var(--line);border-radius:8px;padding:4px;background:#fff">' : '') + '</div>') +
      kartu('Penanda tangan KHS & transkrip', '<div class="fgrid c3">' + fld('PENANDATANGAN_NAMA', 'Nama lengkap & gelar') + fld('PENANDATANGAN_JABATAN', 'Jabatan') + fld('PENANDATANGAN_NIDN', 'NIDN') + '</div>') +
      kartu('Akademik', '<div class="fgrid"><div class="field"><label>Periode aktif</label><select class="input" name="PERIODE_AKTIF">' + opsi(App.M.periode.map((p) => ({ v: p.id, t: labelPeriode(p.id) })), s.PERIODE_AKTIF) + '</select><div class="hint">Periode bawaan untuk semua pengguna (bisa diganti sementara di kanan atas).</div></div><div class="field"><label>KHS memuat nilai sementara</label><select class="input" name="KHS_TAMPIL_SEMENTARA">' + opsi([{ v: '1', t: 'Ya — nilai siap lapor ikut tampil (ditandai *)' }, { v: '0', t: 'Tidak — hanya yang sudah dilapor' }], String(s.KHS_TAMPIL_SEMENTARA || '0')) + '</select></div>' + fld('URL_FRONTEND', 'Alamat aplikasi ini (untuk QR verifikasi)', 'Biasanya: ' + esc(location.origin + location.pathname.replace(/index\.html$/, ''))) + '</div>') +
      '<div class="row"><button class="btn btn-primary" id="su-simpan">' + ic('save') + 'Simpan pengaturan</button></div></form>';
    $('[name=LOGO_URL]', box).oninput = debounce((e) => { $('#su-logo', box).innerHTML = e.target.value ? '<img src="' + esc(e.target.value) + '" style="height:56px;border:1px solid var(--line);border-radius:8px;padding:4px;background:#fff" onerror="this.replaceWith(document.createTextNode(\'Gambar tidak bisa dimuat\'))">' : ''; }, 400);
    $('#su', box).onsubmit = (e) => { e.preventDefault(); tombolProses($('#su-simpan', box), async () => { const r = await api('pengaturan.simpan', { pengaturan: bacaForm($('#su', box)) }); toast(r.message, r.success ? 'ok' : 'err'); if (r.success) { await App.segarkanMaster(); } }); };
  });
}

/* ---------------------------------------------------------------- tema */
function SetTema(box) {
  const kini = (Sesi.get() || {}).me ? Sesi.get().me.tema || 'hijau' : 'hijau';
  box.innerHTML = kartu('Warna tema (berlaku untuk akun Anda)', '<div class="grid g2">' + TEMA.map((t) => '<div class="theme-card ' + (kini === t.id ? 'on' : '') + '" data-t="' + t.id + '"><div class="swatch" style="background:' + t.warna + '">' + (kini === t.id ? ic('check') : '') + '</div><div><b>' + esc(t.nama) + '</b><div class="muted mono" style="font-size:12px">' + t.warna + '</div></div></div>').join('') + '</div>' +
    '<div class="row mt-16"><label class="lbl">Warna bebas</label><input type="color" id="tm-c" value="' + esc(warnaTema(kini)) + '" style="width:52px;height:36px;border:1px solid var(--line);border-radius:8px;padding:2px;background:#fff"><button class="btn btn-sm" id="tm-pakai">Pakai warna ini</button></div>' +
    '<div class="mt-16 row-wrap"><button class="btn btn-primary">Contoh tombol</button><span class="pill brand">Contoh label</span><a href="#/pengaturan/tema">Contoh tautan</a></div><p class="muted mt-12" style="font-size:12.5px">Warna status (abu, merah, kuning, hijau, oranye) tetap sama agar mudah dibaca semua pengguna.</p>');
  const pakaiTema = async (t) => {
    terapkanTema(t);
    const s = Sesi.get(); if (s) { s.me.tema = t; Sesi.set(s); }
    const r = await api('auth.tema', { tema: t }); if (r.success) toast('Tema disimpan.'); SetTema(box);
  };
  box.onclick = (e) => { const c = e.target.closest('[data-t]'); if (c) pakaiTema(c.dataset.t); };
  $('#tm-c', box).oninput = (e) => terapkanTema(e.target.value);
  $('#tm-pakai', box).onclick = () => pakaiTema($('#tm-c', box).value);
}

/* ---------------------------------------------------------------- data induk */
function SetInduk(box) {
  const M = App.M;
  const tblHtml = (head, rows) => '<div class="tbl-wrap"><table class="tbl tbl-compact"><thead><tr>' + head.map((h) => '<th>' + esc(h) + '</th>').join('') + '<th></th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
  const aktifPill = (v) => String(v) === '0' ? '<span class="pill">Nonaktif</span>' : '<span class="pill st-Aktif">Aktif</span>';
  box.innerHTML =
    kartu('Program studi', tblHtml(['Kode', 'Nama', 'Nama resmi (di dokumen)', 'Jenjang', 'Kode PDDIKTI', 'Status'], M.prodi.map((p) => '<tr><td class="mono"><b>' + esc(p.kode) + '</b></td><td>' + esc(p.nama) + '</td><td>' + esc(p.nama_resmi) + '</td><td>' + esc(p.jenjang) + '</td><td class="mono">' + esc(p.kode_pddikti || '') + '</td><td>' + aktifPill(p.aktif) + '</td><td class="aksi"><button class="btn btn-xs" data-ed="Prodi" data-id="' + esc(p.kode) + '">' + ic('edit', 'ic-sm') + '</button></td></tr>')), '<button class="btn btn-sm" data-baru="Prodi">' + ic('plus', 'ic-sm') + 'Tambah</button>') +
    kartu('Program kelas', tblHtml(['Kode', 'Nama', 'Kelas lapor bawaan', 'Smt terakhir', 'Status'], M.program.map((p) => '<tr><td class="mono"><b>' + esc(p.kode) + '</b></td><td>' + esc(p.nama) + '</td><td>' + kelasTag(p.kelas_default) + '</td><td>' + esc(p.smt_terakhir || '–') + '</td><td>' + aktifPill(p.aktif) + '</td><td class="aksi"><button class="btn btn-xs" data-ed="Program" data-id="' + esc(p.kode) + '">' + ic('edit', 'ic-sm') + '</button></td></tr>')), '', 'Ma\'had Aly: smt 1–4 kelas khusus, smt 5 memilih Reguler/Hybrid.') +
    kartu('Periode akademik', tblHtml(['ID', 'Label', 'Tahun akademik'], M.periode.map((p) => '<tr><td class="mono">' + esc(p.id) + '</td><td>' + esc(labelPeriode(p.id)) + (String(p.id) === App.periodeAktif ? ' <span class="pill brand">aktif</span>' : '') + '</td><td>' + esc(p.tahun_akademik) + '</td><td></td></tr>')), '<button class="btn btn-sm" id="pr-baru">' + ic('plus', 'ic-sm') + 'Tambah periode berikutnya</button>') +
    kartu('Dosen', '<div class="row mb-12"><div class="search" style="width:260px">' + ic('search') + '<input class="input" id="ds-q" placeholder="Cari dosen…"></div><span class="muted" id="ds-n"></span></div><div id="ds-tbl"></div>', '<button class="btn btn-sm" id="ds-tarik">' + ic('link') + 'Tarik dari aplikasi lain</button><button class="btn btn-sm" data-baru="Dosen">' + ic('plus', 'ic-sm') + 'Tambah</button>', 'NIDN/NUPTK dipakai di file lapor Neo Feeder.');
  const t = Tabel($('#ds-tbl', box), { id: (r) => r.id, urut: 'nama', perHalaman: 25, kolom: [
    { k: 'nama', label: 'Nama' }, { k: 'nidn', label: 'NIDN', cls: 'mono' }, { k: 'nuptk', label: 'NUPTK', cls: 'mono' }, { k: 'sumber', label: 'Sumber', html: (r) => '<span class="sub">' + esc(r.sumber || 'Manual') + '</span>' }, { k: 'aktif', label: 'Status', html: (r) => aktifPill(r.aktif) }
  ], cari: (r) => r.nama + ' ' + r.nidn, klik: (r) => formInduk('Dosen', r), kosong: 'Belum ada dosen' });
  t.set(M.dosen); $('#ds-n', box).textContent = M.dosen.length + ' dosen';
  $('#ds-q', box).oninput = debounce((e) => t.cari(e.target.value), 150);
  $('#ds-tarik', box).onclick = () => Sinkron.buka('DOSEN');
  $('#pr-baru', box).onclick = async () => {
    const maks = M.periode.map((p) => String(p.id)).sort().pop(), y = Number(maks.slice(0, 4)), j = maks.slice(-1);
    const id = j === '1' ? y + '2' : (y + 1) + '1';
    if (!(await konfirmasi('Tambah periode', 'Tambahkan periode <b>' + labelPeriode(id) + '</b> (' + id + ')?', 'Tambah'))) return;
    const r = await api('master.simpan', { tabel: 'Periode', row: { id: id, aktif: 0 } }); toast(r.success ? 'Periode ditambahkan.' : r.message, r.success ? 'ok' : 'err'); if (r.success) { await App.segarkanMaster(); SetInduk(box); }
  };
  box.onclick = (e) => {
    const b = e.target.closest('[data-baru],[data-ed]'); if (!b) return;
    const tabel = b.dataset.baru || b.dataset.ed;
    const row = b.dataset.ed ? (tabel === 'Prodi' ? M.prodi.find((x) => x.kode === b.dataset.id) : M.program.find((x) => x.kode === b.dataset.id)) : null;
    formInduk(tabel, row);
  };
  function formInduk(tabel, r) {
    const baru = !r; r = r || { aktif: 1 };
    const F = {
      Prodi: [['kode', 'Kode (mis. HES)', 'text', !baru], ['nama', 'Nama'], ['nama_resmi', 'Nama resmi (mis. S1 Hukum Ekonomi Syariah)'], ['jenjang', 'Jenjang'], ['kode_pddikti', 'Kode prodi PDDIKTI']],
      Program: [['kode', 'Kode', 'text', true], ['nama', 'Nama'], ['kelas_default', 'Kelas lapor bawaan (A/B)'], ['smt_terakhir', 'Semester terakhir (khusus Ma\'had Aly)', 'number']],
      Dosen: [['nama', 'Nama & gelar'], ['nidn', 'NIDN'], ['nuptk', 'NUPTK']]
    }[tabel];
    modal({ judul: (baru ? 'Tambah ' : 'Ubah ') + tabel.toLowerCase(), isi: '<div class="fgrid">' + F.map((x) => '<div class="field ' + (x[0] === 'nama' || x[0] === 'nama_resmi' ? 'full' : '') + '"><label>' + esc(x[1]) + '</label><input class="input" name="' + x[0] + '" type="' + (x[2] || 'text') + '" value="' + esc(r[x[0]] || '') + '" ' + (x[3] ? 'readonly' : '') + '></div>').join('') + '<div class="field full"><label class="check"><input type="checkbox" name="aktif" ' + (String(r.aktif) !== '0' ? 'checked' : '') + '>Aktif</label></div></div>',
      tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan', kelas: 'btn-primary', aksi: async (close, m) => {
        const row = bacaForm(m); row.aktif = row.aktif ? 1 : 0; if (r.id) row.id = r.id;
        if (tabel === 'Prodi' || tabel === 'Program') row.kode = String(row.kode || '').toUpperCase().trim();
        const res = await api('master.simpan', { tabel: tabel, row: row });
        if (!res.success) { toast(res.message, 'err'); return false; }
        await App.segarkanMaster(); toast('Tersimpan.'); SetInduk(box); return true;
      } }] });
  }
}

/* ---------------------------------------------------------------- skala & predikat */
function SetSkala(box) {
  const M = App.M;
  const pred = (j) => M.predikat.filter((p) => p.jenis === j).sort((a, b) => Number(b.batas) - Number(a.batas));
  box.innerHTML = kartu('Skala nilai (huruf & indeks)', '<div class="tbl-wrap"><table class="tbl tbl-compact"><thead><tr><th>Batas bawah (≥)</th><th>Huruf</th><th>Indeks</th><th></th></tr></thead><tbody>' + M.skala.map((s) => '<tr><td class="num" style="text-align:left">' + fmt2(s.batas) + '</td><td><b>' + esc(s.huruf) + '</b></td><td>' + fmt2(s.indeks) + '</td><td class="aksi"><button class="btn btn-xs" data-sk="' + esc(s.huruf) + '">' + ic('edit', 'ic-sm') + '</button><button class="btn btn-xs btn-ghost" data-skh="' + esc(s.huruf) + '">' + ic('trash', 'ic-sm') + '</button></td></tr>').join('') + '</tbody></table></div><div class="alert info mt-12">' + ic('info') + '<div>Contoh: 59,99 → D · 60 → C · 65 → C+ · 90 → A. Nilai 0/kosong dianggap belum ada nilai (tidak ada huruf E).</div></div>', '<button class="btn btn-sm" data-sk="">' + ic('plus', 'ic-sm') + 'Tambah</button>') +
    ['IP', 'MAHAD', 'LULUS'].map((j) => kartu({ IP: 'Predikat IP semester', MAHAD: "Predikat rata-rata Ma'had Aly (skala 0–100)", LULUS: 'Predikat kelulusan (IPK)' }[j], '<div class="tbl-wrap"><table class="tbl tbl-compact"><thead><tr><th>Batas (≥)</th><th>Predikat</th><th>Bahasa Arab</th><th></th></tr></thead><tbody>' + pred(j).map((p) => '<tr><td>' + fmt2(p.batas) + '</td><td><b>' + esc(p.label) + '</b></td><td class="ar">' + esc(p.label_ar) + '</td><td class="aksi"><button class="btn btn-xs" data-pd="' + esc(j + '|' + p.batas) + '">' + ic('edit', 'ic-sm') + '</button><button class="btn btn-xs btn-ghost" data-pdh="' + esc(j + '|' + p.batas) + '">' + ic('trash', 'ic-sm') + '</button></td></tr>').join('') + '</tbody></table></div>', '<button class="btn btn-sm" data-pd="' + j + '|">' + ic('plus', 'ic-sm') + 'Tambah</button>')).join('');
  const simpan = async (tabel, row) => { const r = await api('master.simpan', { tabel: tabel, row: row }); if (!r.success) { toast(r.message, 'err'); return false; } await App.segarkanMaster(); toast('Tersimpan.'); SetSkala(box); return true; };
  box.onclick = async (e) => {
    const sk = e.target.closest('[data-sk]'), skh = e.target.closest('[data-skh]'), pd = e.target.closest('[data-pd]'), pdh = e.target.closest('[data-pdh]');
    if (sk) { const s = M.skala.find((x) => x.huruf === sk.dataset.sk) || {}; modal({ judul: 'Skala nilai', isi: '<div class="fgrid c3"><div class="field"><label>Batas bawah</label><input class="input" name="batas" type="number" step="0.01" value="' + esc(s.batas || '') + '"></div><div class="field"><label>Huruf</label><input class="input" name="huruf" value="' + esc(s.huruf || '') + '"></div><div class="field"><label>Indeks</label><input class="input" name="indeks" type="number" step="0.01" value="' + esc(s.indeks || '') + '"></div></div>', tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan', kelas: 'btn-primary', aksi: (c, m) => { const row = bacaForm(m); if (s.huruf) row._lama = s.huruf; return simpan('Skala', row); } }] }); }
    if (skh && await konfirmasi('Hapus skala', 'Hapus huruf <b>' + esc(skh.dataset.skh) + '</b>? Nilai yang sudah dilapor tidak berubah.', 'Hapus', true)) simpan('Skala', { _hapus: skh.dataset.skh });
    if (pd) { const [j, b] = pd.dataset.pd.split('|'); const p = b ? M.predikat.find((x) => x.jenis === j && String(x.batas) === b) : {}; modal({ judul: 'Predikat ' + j, isi: '<div class="fgrid c3"><div class="field"><label>Batas (≥)</label><input class="input" name="batas" type="number" step="0.01" value="' + esc(p.batas === undefined ? '' : p.batas) + '"></div><div class="field"><label>Predikat</label><input class="input" name="label" value="' + esc(p.label || '') + '"></div><div class="field"><label>Bahasa Arab</label><input class="input ar" name="label_ar" dir="rtl" value="' + esc(p.label_ar || '') + '"></div></div>', tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan', kelas: 'btn-primary', aksi: (c, m) => { const row = Object.assign({ jenis: j }, bacaForm(m)); if (b) row._lama = j + '|' + b; return simpan('Predikat', row); } }] }); }
    if (pdh && await konfirmasi('Hapus predikat', 'Hapus baris predikat ini?', 'Hapus', true)) simpan('Predikat', { _hapus: pdh.dataset.pdh });
  };
}

/* ---------------------------------------------------------------- kolom tambahan */
function SetKolom(box) {
  const rows = (App.M.kolom || []);
  box.innerHTML = kartu('Kolom tambahan mahasiswa', rows.length ? '<div class="tbl-wrap"><table class="tbl tbl-compact"><thead><tr><th>Urut</th><th>Nama kolom</th><th>Tipe</th><th>Di KHS</th><th>Di transkrip</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map((k) => '<tr><td>' + esc(k.urutan || '') + '</td><td><b>' + esc(k.nama) + '</b></td><td>' + esc(k.tipe || 'teks') + '</td><td>' + (String(k.di_khs) === '1' ? ic('check', 'ic-sm') : '') + '</td><td>' + (String(k.di_transkrip) === '1' ? ic('check', 'ic-sm') : '') + '</td><td>' + (String(k.aktif) === '0' ? '<span class="pill">Nonaktif</span>' : '<span class="pill st-Aktif">Aktif</span>') + '</td><td class="aksi"><button class="btn btn-xs" data-k="' + esc(k.id) + '">' + ic('edit', 'ic-sm') + '</button></td></tr>').join('') + '</tbody></table></div>' : kosong('Belum ada kolom tambahan', 'Contoh: Nomor PIN Ijazah, Nomor Seri Ijazah, IPK Ma\'had.', 'list'), '<button class="btn btn-sm btn-primary" data-k="">' + ic('plus', 'ic-sm') + 'Tambah kolom</button>', 'Isian bebas per mahasiswa (diisi di detail mahasiswa / data kelulusan) dan bisa ditampilkan di KHS/transkrip.');
  box.onclick = (e) => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const k = rows.find((x) => x.id === b.dataset.k) || { tipe: 'teks', aktif: 1, di_transkrip: 1 };
    modal({ judul: k.id ? 'Ubah kolom' : 'Tambah kolom', isi: '<div class="fgrid"><div class="field full"><label class="req">Nama kolom</label><input class="input" name="nama" value="' + esc(k.nama || '') + '"></div><div class="field"><label>Tipe</label><select class="input" name="tipe">' + opsi(['teks', 'tanggal', 'angka'], k.tipe) + '</select></div><div class="field"><label>Urutan</label><input class="input" type="number" name="urutan" value="' + esc(k.urutan || rows.length + 1) + '"></div><div class="field full row-wrap"><label class="check"><input type="checkbox" name="di_khs" ' + (String(k.di_khs) === '1' ? 'checked' : '') + '>Tampil di KHS</label><label class="check"><input type="checkbox" name="di_transkrip" ' + (String(k.di_transkrip) === '1' ? 'checked' : '') + '>Tampil di transkrip</label><label class="check"><input type="checkbox" name="aktif" ' + (String(k.aktif) !== '0' ? 'checked' : '') + '>Aktif</label></div></div>',
      tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan', kelas: 'btn-primary', aksi: async (c, m) => {
        const row = bacaForm(m); ['di_khs', 'di_transkrip', 'aktif'].forEach((x) => { row[x] = row[x] ? 1 : 0; }); if (k.id) row.id = k.id;
        if (!row.nama.trim()) { toast('Isi nama kolom.', 'warn'); return false; }
        const r = await api('master.simpan', { tabel: 'Kolom_Tambahan', row: row }); if (!r.success) { toast(r.message, 'err'); return false; }
        await App.segarkanMaster(); SetKolom(box); return true;
      } }] });
  };
}

/* ---------------------------------------------------------------- pengguna */
function SetPengguna(box, ctx) {
  box.innerHTML = skelTabel(5);
  const tampilSandi = (judul, sandi) => modal({ judul: judul, isi: '<div class="alert warn mb-12">' + ic('key') + '<div>Sandi sementara ini <b>hanya tampil sekali</b>. Berikan langsung kepada pemilik akun; ia wajib menggantinya saat login.</div></div><div class="row"><input class="input mono" readonly value="' + esc(sandi) + '" style="font-size:18px;letter-spacing:.06em"><button class="btn" id="cp">' + ic('copy') + 'Salin</button></div>', onBuka: (el) => { $('#cp', el).onclick = () => salin(sandi); } });
  const muat = () => pakai(ctx, 'pengaturan.get', {}, (d) => {
    const aktif = d.pengguna.filter((u) => u.aktif).length;
    box.innerHTML = kartu('Pengguna (' + aktif + ' / ' + d.kuota + ' aktif)', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Username</th><th>Jabatan</th><th>Login terakhir</th><th>Status</th><th></th></tr></thead><tbody>' + d.pengguna.map((u) => '<tr><td><div class="row"><div class="avatar" style="width:30px;height:30px;font-size:11.5px">' + esc(String(u.nama || u.username).split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()) + '</div><b style="font-weight:600">' + esc(u.nama) + '</b>' + (u.username === App.me.username ? ' <span class="pill brand no-dot">Anda</span>' : '') + '</div></td><td class="mono">' + esc(u.username) + '</td><td>' + esc(u.jabatan || '') + '</td><td class="sub">' + esc(fmtWaktu(u.terakhir_login) || 'belum pernah') + '</td><td>' + (u.aktif ? (u.terkunci ? '<span class="pill danger">Terkunci</span>' : u.wajib_ganti ? '<span class="pill warn">Sandi sementara</span>' : '<span class="pill st-Aktif">Aktif</span>') : '<span class="pill">Nonaktif</span>') + '</td><td class="aksi"><button class="btn btn-xs" data-ed="' + esc(u.username) + '">' + ic('edit', 'ic-sm') + '</button><button class="btn btn-xs" data-rs="' + esc(u.username) + '">' + ic('key', 'ic-sm') + 'Reset sandi</button></td></tr>').join('') + '</tbody></table></div><p class="muted mt-12" style="font-size:12.5px">Semua pengguna memiliki akses admin penuh. Maksimal ' + d.kuota + ' akun aktif; nonaktifkan akun lama sebelum menambah yang baru.</p>', '<button class="btn btn-sm btn-primary" id="pg-baru" ' + (aktif >= d.kuota ? 'disabled title="Kuota penuh"' : '') + '>' + ic('userplus', 'ic-sm') + 'Tambah pengguna</button>');
    const form = (u) => modal({ judul: u ? 'Ubah pengguna' : 'Tambah pengguna', isi: '<div class="fgrid"><div class="field"><label class="req">Username</label><input class="input mono" name="username" value="' + esc(u ? u.username : '') + '" ' + (u ? 'readonly' : '') + ' placeholder="huruf kecil, mis. fajar"></div><div class="field"><label class="req">Nama</label><input class="input" name="nama" value="' + esc(u ? u.nama : '') + '"></div><div class="field"><label>Jabatan</label><input class="input" name="jabatan" value="' + esc(u ? u.jabatan : '') + '"></div>' + (u ? '<div class="field"><label>Status</label><select class="input" name="aktif">' + opsi([{ v: '1', t: 'Aktif' }, { v: '0', t: 'Nonaktif (sesi langsung berakhir)' }], u.aktif ? '1' : '0') + '</select></div>' : '') + '</div>',
      tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan', kelas: 'btn-primary', aksi: async (c, m) => {
        const f = bacaForm(m); const r = await api('pengguna.simpan', f);
        if (!r.success) { toast(r.message, 'err'); return false; }
        if (r.data && r.data.sandiSementara) tampilSandi('Akun ' + f.username + ' dibuat', r.data.sandiSementara); else toast(r.message);
        muat(); return true;
      } }] });
    $('#pg-baru', box).onclick = () => form(null);
    box.onclick = async (e) => {
      const ed = e.target.closest('[data-ed]'), rs = e.target.closest('[data-rs]');
      if (ed) form(d.pengguna.find((u) => u.username === ed.dataset.ed));
      if (rs && await konfirmasi('Reset sandi', 'Buat sandi sementara baru untuk <b>' + esc(rs.dataset.rs) + '</b>? Sesi akun itu akan berakhir.', 'Reset')) { const r = await api('pengguna.reset', { username: rs.dataset.rs }); if (r.success) { tampilSandi('Sandi baru ' + rs.dataset.rs, r.data.sandiSementara); muat(); } else toast(r.message, 'err'); }
    };
  });
  muat();
}

/* ---------------------------------------------------------------- tarik dari aplikasi lain */
const Sinkron = {
  buka(jenis, simpanan) {
    const J = jenis === 'DOSEN' ? 'DOSEN' : 'MAHASISWA';
    let src = null, cfg = { url: simpanan ? simpanan.url : '', sheet: simpanan ? simpanan.sheet : '', map: simpanan ? simpanan.map : null, opsi: simpanan ? simpanan.opsi || {} : {} };
    const md = modal({ judul: 'Tarik data ' + (J === 'DOSEN' ? 'dosen' : 'mahasiswa') + ' dari aplikasi lain', lebar: 'sangat-lebar', desc: 'Tempel link Google Spreadsheet aplikasi lain (mis. SIAKAD/PMB). Spreadsheet sumber hanya dibaca, tidak pernah diubah.',
      isi: '<div class="stepper" id="sk-step"><div class="step on"><b>1</b>Sumber</div><div class="step"><b>2</b>Pemetaan kolom</div><div class="step"><b>3</b>Pindai & jalankan</div></div><div id="sk-isi"></div>', tombol: [{ teks: 'Tutup', aksi: () => true }] });
    const el = md.el, isi = $('#sk-isi', el);
    const langkah = (n) => $$('#sk-step .step', el).forEach((s, i) => { s.className = 'step' + (i < n - 1 ? ' done' : i === n - 1 ? ' on' : ''); });
    const step1 = () => {
      langkah(1);
      isi.innerHTML = '<div class="field"><label>Link Google Spreadsheet aplikasi sumber</label><div class="row"><input class="input" id="sk-url" placeholder="https://docs.google.com/spreadsheets/d/…/edit" value="' + esc(cfg.url) + '"><button class="btn btn-primary" id="sk-baca">' + ic('search') + 'Baca</button></div><div class="hint">Akun Google pemilik aplikasi NILAI (yang men-deploy Apps Script) harus punya akses minimal <b>Viewer</b> ke spreadsheet tersebut.</div></div><div id="sk-err" class="mt-12"></div>';
      $('#sk-baca', el).onclick = (e) => tombolProses(e.currentTarget, async () => {
        cfg.url = $('#sk-url', el).value.trim();
        const r = await api('sinkron.baca', { url: cfg.url });
        if (!r.success) { $('#sk-err', el).innerHTML = '<div class="alert danger">' + ic('xc') + '<div>' + esc(r.message) + '</div></div>'; return; }
        src = r.data; step2();
      });
    };
    const step2 = () => {
      langkah(2);
      const fields = src.field[J];
      if (!cfg.sheet || !src.sheets.find((s) => s.nama === cfg.sheet)) cfg.sheet = (src.sheets.slice().sort((a, b) => Object.keys(b.tebakan[J]).length - Object.keys(a.tebakan[J]).length)[0] || {}).nama;
      const sh = () => src.sheets.find((s) => s.nama === cfg.sheet);
      const gambar = () => {
        const s = sh(), peta = cfg.map && cfg.mapSheet === cfg.sheet ? cfg.map : (cfg.map && simpanan && simpanan.sheet === cfg.sheet ? cfg.map : s.tebakan[J]);
        isi.innerHTML = '<div class="row mb-12"><div><b>' + esc(src.judul) + '</b><div class="muted" style="font-size:12.5px">' + src.sheets.length + ' sheet</div></div><span class="spacer"></span><div class="field"><label>Sheet</label><select class="input" id="sk-sheet">' + opsi(src.sheets.map((x) => ({ v: x.nama, t: x.nama + ' (' + x.jumlah + ' baris)' })), cfg.sheet) + '</select></div></div>' +
          '<div class="tbl-wrap"><table class="tbl tbl-compact"><thead><tr><th>Data di aplikasi NILAI</th><th>Kolom di spreadsheet sumber</th></tr></thead><tbody>' + fields.map((f) => '<tr><td>' + esc(f.label) + (f.wajib ? ' <span style="color:var(--danger)">*</span>' : '') + '</td><td><select class="input input-sm" data-f="' + f.f + '">' + opsi(s.header, peta[f.f] || '', null, '— tidak ada —') + '</select></td></tr>').join('') + '</tbody></table></div>' +
          '<div class="row-wrap mt-12" style="gap:18px"><label class="check"><input type="checkbox" id="sk-timpa" ' + (cfg.opsi.timpa ? 'checked' : '') + '>Timpa data identitas yang sudah ada' + (J === 'MAHASISWA' ? ' (nama, TTL, NIK, prodi, angkatan, program awal)' : ' (nama)') + '</label>' + (J === 'MAHASISWA' ? '<label class="check"><input type="checkbox" id="sk-status" ' + (cfg.opsi.status ? 'checked' : '') + '>Ikutkan perubahan status (Cuti/Mundur/DO) dari sumber</label>' : '') + '</div>' +
          '<div class="alert info mt-12">' + ic('info') + '<div>Keputusan di aplikasi ini (kelas A/B, angkatan yang diikuti, status) <b>tidak ditimpa</b> kecuali opsi di atas dicentang. Aman dijalankan berulang (data yang sama dilewati).</div></div><div class="row mt-16"><button class="btn" id="sk-kembali">' + ic('back') + 'Kembali</button><span class="spacer"></span><button class="btn btn-primary" id="sk-pindai">' + ic('search') + 'Pindai (uji coba)</button></div>';
        $('#sk-sheet', el).onchange = (e) => { cfg.sheet = e.target.value; cfg.map = null; gambar(); };
        $('#sk-kembali', el).onclick = step1;
        $('#sk-pindai', el).onclick = (e) => tombolProses(e.currentTarget, async () => {
          cfg.map = {}; $$('[data-f]', el).forEach((s) => { if (s.value) cfg.map[s.dataset.f] = s.value; }); cfg.mapSheet = cfg.sheet;
          cfg.opsi = { timpa: $('#sk-timpa', el).checked, status: !!($('#sk-status', el) || {}).checked };
          const kurang = fields.filter((f) => f.wajib && !cfg.map[f.f]); if (kurang.length) return toast('Petakan kolom wajib: ' + kurang.map((f) => f.label).join(', '), 'warn');
          const r = await api('sinkron.pindai', { jenis: J, url: cfg.url, sheet: cfg.sheet, map: cfg.map, opsi: cfg.opsi });
          if (!r.success) return toast(r.message, 'err');
          step3(r.data);
        });
      };
      gambar();
    };
    const step3 = (h) => {
      langkah(3);
      const kol = J === 'DOSEN' ? ['nama', 'nidn', 'nuptk'] : ['nim', 'nama', 'prodi', 'angkatan_asal', 'program_awal', 'tempat_lahir', 'tgl_lahir', 'status'];
      isi.innerHTML = '<div class="grid g3 mb-12"><div class="card kpi k-SD"><div class="kpi-ic">' + ic('plus') + '</div><div><div class="kpi-v">' + h.ditambah + '</div><div class="kpi-l">akan ditambah</div></div></div><div class="card kpi k-SL"><div class="kpi-ic">' + ic('edit') + '</div><div><div class="kpi-v">' + h.diperbarui + '</div><div class="kpi-l">akan diperbarui/dilengkapi</div></div></div><div class="card kpi"><div class="kpi-ic">' + ic('minus') + '</div><div><div class="kpi-v">' + h.dilewati + '</div><div class="kpi-l">dilewati (sama/tidak valid)</div></div></div></div>' +
        (h.peringatan && h.peringatan.length ? '<div class="alert warn mb-12">' + ic('warn') + '<div>' + h.peringatan.slice(0, 10).map(esc).join('<br>') + (h.peringatan.length > 10 ? '<br>… dan ' + (h.peringatan.length - 10) + ' lainnya' : '') + '</div></div>' : '') +
        '<h4 class="mb-8">Contoh data terbaca</h4><div class="tbl-wrap"><table class="tbl tbl-compact"><thead><tr>' + kol.map((k) => '<th>' + esc(k) + '</th>').join('') + '</tr></thead><tbody>' + (h.contoh || []).map((r) => '<tr>' + kol.map((k) => '<td>' + esc(k === 'program_awal' ? PROGRAM_LABEL[r[k]] || r[k] : r[k]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
        '<div class="row mt-16"><button class="btn" id="sk-kembali">' + ic('back') + 'Ubah pemetaan</button><span class="spacer"></span><button class="btn btn-primary" id="sk-jalan">' + ic('download') + 'Jalankan tarik data</button></div>';
      $('#sk-kembali', el).onclick = step2;
      $('#sk-jalan', el).onclick = (e) => tombolProses(e.currentTarget, async () => {
        const r = await api('sinkron.jalankan', { jenis: J, url: cfg.url, sheet: cfg.sheet, map: cfg.map, opsi: cfg.opsi });
        if (!r.success) return toast(r.message, 'err');
        toast(r.message, 'ok', 5000); md.close();
        if (J === 'DOSEN') await App.segarkanMaster();
        App.render();
      });
    };
    step1();
    if (simpanan && simpanan.url) $('#sk-baca', el).click();
  },
  async tarikUlang(J, btn) {
    return tombolProses(btn, async () => {
      const p = await api('sinkron.pindai', { jenis: J, pakaiSimpanan: true });
      if (!p.success) return toast(p.message, 'err');
      if (!p.data.ditambah && !p.data.diperbarui) return toast('Tidak ada data baru dari sumber.', 'info');
      if (!(await konfirmasi('Tarik data ' + J.toLowerCase(), '<b>' + p.data.ditambah + '</b> baru dan <b>' + p.data.diperbarui + '</b> diperbarui dari "' + esc(p.data.sumber.judul) + '". Lanjutkan?', 'Tarik'))) return;
      const r = await api('sinkron.jalankan', { jenis: J, pakaiSimpanan: true });
      toast(r.message, r.success ? 'ok' : 'err'); if (r.success && J === 'DOSEN') await App.segarkanMaster();
      return r;
    });
  }
};
function SetSinkron(box, ctx) {
  box.innerHTML = skelTabel(5);
  const muat = () => pakai(ctx, 'batch.list', {}, (d) => {
    const s = d.sinkron || {};
    const kartuSumber = (J, judul, ikon) => { const c = s[J]; return '<div class="card"><div class="card-b"><div class="row mb-12"><div class="kpi-ic">' + ic(ikon) + '</div><div><h3>' + judul + '</h3><div class="muted" style="font-size:12.5px">' + (c ? 'Sumber: sheet <b>' + esc(c.sheet) + '</b> · terakhir ' + esc(fmtWaktu(c.terakhir)) + ' oleh ' + esc(c.oleh) : 'Belum ada sumber') + '</div></div></div>' + (c ? '<div class="muted mb-12" style="font-size:12.5px;word-break:break-all">' + ic('link', 'ic-sm') + ' ' + esc(c.url) + '<br>Hasil terakhir: ' + esc(c.ringkas || '–') + '</div>' : '<p class="muted">Tempel link spreadsheet aplikasi lain untuk mengambil data ' + judul.toLowerCase() + ' secara otomatis.</p>') + '<div class="row"><button class="btn" data-atur="' + J + '">' + ic('settings') + (c ? 'Ubah sumber' : 'Atur sumber') + '</button>' + (c ? '<button class="btn btn-primary" data-tarik="' + J + '">' + ic('refresh') + 'Tarik sekarang</button>' : '') + '</div></div></div>'; };
    box.innerHTML = '<div class="alert brand mb-16">' + ic('link') + '<div><b>Data mahasiswa & dosen diambil dari aplikasi lain.</b> Cukup tempel link Google Spreadsheet-nya sekali; selanjutnya klik "Tarik sekarang" kapan saja (aman diulang — hanya data baru/berubah yang masuk).</div></div><div class="grid g2">' + kartuSumber('MAHASISWA', 'Data mahasiswa', 'users') + kartuSumber('DOSEN', 'Data dosen', 'user') + '</div>' +
      kartu('Riwayat tarik data & migrasi', riwayatBatch(d.batch, true));
    box.onclick = async (e) => {
      const a = e.target.closest('[data-atur]'), t = e.target.closest('[data-tarik]'), bt = e.target.closest('[data-batal]');
      if (a) Sinkron.buka(a.dataset.atur, s[a.dataset.atur]);
      if (t) { await Sinkron.tarikUlang(t.dataset.tarik, t); muat(); }
      if (bt) batalBatch(bt.dataset.batal, muat);
    };
  });
  muat();
}
function riwayatBatch(rows, semua) {
  const r = (rows || []).filter((b) => semua || /^MIG-/.test(b.id));
  return r.length ? '<div class="tbl-wrap" style="max-height:340px"><table class="tbl tbl-compact"><thead><tr><th>Waktu</th><th>Jenis</th><th>Sumber</th><th class="num">Berhasil</th><th class="num">Dilewati</th><th>Oleh</th><th></th></tr></thead><tbody>' + r.map((b) => '<tr' + (b.dibatalkan ? ' class="r-off"' : '') + '><td class="nowrap">' + esc(fmtWaktu(b.at)) + '</td><td><span class="pill no-dot ' + (/^MIG/.test(b.jenis) ? 'info' : 'brand') + '">' + esc(b.jenis) + '</span></td><td>' + esc(b.sumber) + '<div class="sub mono">' + esc(b.id) + '</div></td><td class="num">' + fmtInt(b.berhasil) + '</td><td class="num">' + fmtInt(b.dilewati) + '</td><td>' + esc(b.oleh) + '</td><td class="aksi">' + (b.dibatalkan ? '<span class="sub">dibatalkan ' + esc(fmtWaktu(String(b.dibatalkan).slice(0, 19))) + '</span>' : /^(MIG|KUR|MKR|KURDEL|PDK|PETADEL|LULUS|UNM|KURTHN|KLSDEL)-/.test(b.id) ? '<button class="btn btn-xs" data-batal="' + esc(b.id) + '">' + ic('repeat', 'ic-sm') + 'Batalkan</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : kosong('Belum ada riwayat', '', 'history');
}
async function batalBatch(id, after) {
  if (!/^MIG-/.test(id)) return batalBatchUmum(id, after);          // v1.1: KUR/MKR/KURDEL/PDK
  const ok = await konfirmasiKetik({ judul: 'Batalkan migrasi', kata: 'BATAL', bahaya: true, tombolTeks: 'Batalkan batch', pesan: 'Semua nilai riil, nilai lapor, kelas, dan peta klaim dari batch <b>' + esc(id) + '</b> akan dihapus. Data induk (MK riil, dosen) yang dibuat tetap ada.' });
  if (!ok) return;
  const r = await api('migrasi.batal', { batch: id }); toast(r.message, r.success ? 'ok' : 'err', 6000); if (after) after();
}

/* ---------------------------------------------------------------- v1.1: pembatalan batch impor kurikulum / MK riil / hapus kurikulum / kelas PDDIKTI */
const JENIS_BATCH_V11 = { KUR: 'Impor kurikulum', MKR: 'Impor MK riil', KURDEL: 'Hapus kurikulum', PDK: 'Kelas PDDIKTI', PETADEL: 'Hapus peta klaim', LULUS: 'Tandai lulus', UNM: 'Unggah nilai per mahasiswa', KURTHN: 'Isi tahun kurikulum', KLSDEL: 'Hapus kelas' };
async function batalBatchUmum(id, after) {
  const c = await api('batch.cekBatal', { batch: id });
  if (!c.success) { toast(c.message, 'err'); return; }
  const d = c.data, R = d.ringkas, jenis = id.split('-')[0];
  const kotak = (n, t) => '<div><b>' + fmtInt(n) + '</b><span>' + esc(t) + '</span></div>';
  const isiRingkas = jenis === 'PDK'
    ? kotak(R.kelas, 'kelas dihapus') + kotak(R.peserta, 'peserta dihapus') + kotak(R.peta, 'aturan peta dikembalikan') + kotak(R.bernilai, 'peserta sudah bernilai')
    : jenis === 'PETADEL' ? kotak(R.dikembalikan, 'aturan peta dikembalikan') + kotak(R.dipertahankan, 'dilewati (sudah ada aturan baru)')
    : jenis === 'LULUS' ? kotak(R.mhs, 'mahasiswa kembali ke status sebelumnya') + kotak(R.dipertahankan, 'dipertahankan (sudah final / berubah)')
    : jenis === 'KLSDEL' ? kotak(R.kelas, 'kelas dikembalikan') + kotak(R.peserta, 'baris peserta dikembalikan') + kotak(R.nilai, 'nilai dikembalikan')
    : jenis === 'KURTHN' ? kotak(R.mk, 'MK kembali tanpa tahun kurikulum') + kotak(R.dipertahankan, 'MK dipertahankan (sudah dipakai / diubah)')
    : jenis === 'UNM' ? kotak(R.nilai, 'nilai dihapus') + kotak(R.dipulihkan, 'nilai dikembalikan ke semula') + kotak(R.lapor, 'tanda dilapor dicabut') + kotak(R.kelas, 'kelas PDDIKTI dihapus') + kotak(R.peta, 'aturan peta dikembalikan')
    : kotak(R.dihapus, 'MK dihapus') + kotak(R.dipulihkan, 'MK dikembalikan ke data lama') + kotak(R.dikembalikan, 'MK yang dihapus dipulihkan') + kotak(R.dipertahankan, 'MK dipertahankan (sudah dipakai)');
  const tetap = (d.tetap || []).length ? '<div class="mt-12"><div class="lbl mb-4">' + (jenis === 'LULUS' || jenis === 'PETADEL' || jenis === 'UNM' ? 'Tidak ikut dikembalikan' : 'Dipertahankan karena sudah dipakai') + '</div><div class="tbl-wrap" style="max-height:200px"><table class="tbl tbl-compact"><tbody>' + d.tetap.map((x) => '<tr><td class="mono nowrap">' + esc(x.kode) + '</td><td>' + esc(x.nama) + '</td><td class="sub">' + esc(x.alasan) + '</td></tr>').join('') + '</tbody></table></div></div>' : '';
  if (!d.bisa) {
    modal({ judul: 'Tidak bisa dibatalkan', isi: '<div class="alert warn mb-12">' + ic('warn') + '<div>' + esc(d.pesan || 'Batch ini tidak bisa dibatalkan.') + '</div></div><div class="ringkas-batal">' + isiRingkas + '</div>' + tetap });
    return;
  }
  const ok = await new Promise((resolve) => {
    let jadi = false;
    modal({ judul: 'Batalkan ' + (JENIS_BATCH_V11[jenis] || 'batch'), desc: esc(d.sumber || '') + ' · <span class="mono">' + esc(id) + '</span>',
      isi: '<div class="ringkas-batal">' + isiRingkas + '</div>' + tetap + '<div class="field mt-16"><label>Ketik <b>BATAL</b> untuk melanjutkan</label><input class="input" id="bb-in" autocomplete="off"></div>',
      tombol: [{ teks: 'Tutup', aksi: () => true }, { teks: 'Batalkan batch', kelas: 'btn-danger', aksi: (close, m) => { if ($('#bb-in', m).value.trim() !== 'BATAL') { toast('Ketik BATAL untuk konfirmasi.', 'warn'); return false; } jadi = true; return true; } }],
      onTutup: () => resolve(jadi) });
  });
  if (!ok) return;
  const r = await api('batch.batal', { batch: id, konfirmasi: 'BATAL' });
  toast(r.message, r.success ? 'ok' : 'err', 7000);
  if (r.success && (jenis === 'KUR' || jenis === 'MKR' || jenis === 'KURDEL' || jenis === 'PDK' || jenis === 'UNM' || jenis === 'KURTHN')) await App.segarkanMaster();
  if (after) after();
}
/** Modal riwayat batch tertentu (dipakai halaman Kurikulum & Rekap angkatan). */
function modalRiwayatBatch(judul, re, catatan, after) {
  const md = modal({ judul: judul, lebar: 'lebar', desc: catatan || '', isi: skelTabel(4), tombol: [{ teks: 'Tutup', aksi: () => true }] });
  const box = $('.modal-b', md.el);
  const muat = async () => {
    const r = await api('batch.list', { _fresh: true });
    if (!r.success) { box.innerHTML = '<div class="alert danger">' + ic('xc') + '<div>' + esc(r.message) + '</div></div>'; return; }
    box.innerHTML = riwayatBatch((r.data.batch || []).filter((b) => re.test(b.id)), true);
  };
  box.addEventListener('click', (e) => { const b = e.target.closest('[data-batal]'); if (b) batalBatch(b.dataset.batal, () => { Store.basi(); muat(); if (after) after(); }); });
  muat();
}

/* ---------------------------------------------------------------- migrasi Excel lama */
function SetMigrasi(box, ctx) {
  let P = null, H = null, petaMk = {}, petaMhs = {}, file = '', prodi = '', angk = '', step = 1, mhsProdi = [];
  box.innerHTML = '<div class="card"><div class="card-h"><div><h3>Migrasi Excel lama (per prodi × angkatan)</h3><div class="muted" style="font-size:12.5px;margin-top:2px">File PDDIKTI lama (sheet MK-Semester, DataMahasiswa, MK-1 … MK-n). Hasilnya: nilai riil + peta klaim + nilai lapor berstatus SUDAH DILAPOR.</div></div></div><div class="card-b"><div class="stepper" id="mg-step">' + ['Unggah file', 'Cocokkan MK', 'Cocokkan mahasiswa', 'Uji coba', 'Jalankan'].map((s, i) => '<div class="step"><b>' + (i + 1) + '</b>' + s + '</div>').join('') + '</div><div id="mg-isi"></div></div></div><div id="mg-riw" class="mt-16"></div>';
  const isi = $('#mg-isi', box);
  const langkah = (n) => { step = n; $$('#mg-step .step', box).forEach((s, i) => { s.className = 'step' + (i < n - 1 ? ' done' : i === n - 1 ? ' on' : ''); }); };
  const payload = () => ({ file: file, prodi: prodi, angkatan: angk, mahasiswa: P.mahasiswa, mk: P.mk, peta: { mk: petaMk, mhs: petaMhs } });
  const pratinjau = async () => { const r = await api('migrasi.pratinjau', payload()); if (!r.success) { toast(r.message, 'err'); return null; } H = r.data; return H; };
  const muatRiwayat = () => pakai(ctx, 'batch.list', {}, (d) => { $('#mg-riw', box).innerHTML = kartu('Riwayat migrasi', riwayatBatch(d.batch, false)); $('#mg-riw', box).onclick = (e) => { const b = e.target.closest('[data-batal]'); if (b) batalBatch(b.dataset.batal, () => { Store.basi(); muatRiwayat(); }); }; });
  const s1 = () => {
    langkah(1);
    isi.innerHTML = '<div class="drop" id="mg-drop">' + ic('upload') + '<div><b>Pilih file Excel lama (.xlsx)</b></div><div style="font-size:12.5px">Contoh: "PDDIKTI - 2020 - ANGT 2 - HUKUM.xlsx". File dibaca di browser Anda, tidak diunggah ke server.</div><input type="file" id="mg-file" accept=".xlsx,.xlsm,.xls" hidden></div><div id="mg-ring" class="mt-12"></div>';
    pasangDrop($('#mg-drop', box), $('#mg-file', box), async (f) => {
      const wb = await Excel.baca(f);
      P = window.MigrasiParse.parse(wb, f.name); file = f.name; petaMk = {}; petaMhs = {};
      const tebakProdi = App.prodi().slice().sort((a, b) => String(b.nama).length - String(a.nama).length).find((p) => normNama(P.prodiTeks).indexOf(normNama(p.nama)) > -1 || normNama(P.prodiTeks).split(' ').includes(normNama(p.kode)));   // nama terpanjang dulu: "Hukum Ekonomi Syariah" sebelum "Ekonomi Syariah"
      prodi = (tebakProdi || App.prodi()[0] || {}).kode; angk = String(P.angkatan || '');
      $('#mg-ring', box).innerHTML = '<div class="grid g4 mb-12">' + [['book', P.ringkas.mk, 'MK di file'], ['users', P.ringkas.mahasiswa, 'Mahasiswa'], ['clip', fmtInt(P.ringkas.nilai), 'Nilai terisi'], ['layers', P.ringkas.sksTerisi, 'SKS terbanyak']].map((x) => '<div class="card kpi"><div class="kpi-ic">' + ic(x[0]) + '</div><div><div class="kpi-v">' + x[1] + '</div><div class="kpi-l">' + x[2] + '</div></div></div>').join('') + '</div>' +
        (P.peringatan.length ? '<div class="alert warn mb-12">' + ic('warn') + '<div>' + P.peringatan.map(esc).join('<br>') + '</div></div>' : '') +
        '<div class="row"><div class="field"><label>Prodi</label><select class="input" id="mg-prodi">' + opsi(App.prodi().map((p) => ({ v: p.kode, t: p.kode + ' — ' + p.nama })), prodi) + '</select><div class="hint">Terbaca: ' + esc(P.prodiTeks || '–') + '</div></div><div class="field"><label>Angkatan</label><select class="input" id="mg-angk">' + opsi(App.angkatanList(), angk) + '</select></div><span class="spacer"></span><button class="btn btn-primary" id="mg-lanjut" style="align-self:flex-end">Lanjut ' + ic('next') + '</button></div>';
      $('#mg-lanjut', box).onclick = (e) => tombolProses(e.currentTarget, async () => { prodi = $('#mg-prodi', box).value; angk = $('#mg-angk', box).value; if (await pratinjau()) s2(); });
    });
  };
  const s2 = () => {
    langkah(2);
    const kur = App.M.kurikulum.filter((k) => k.prodi === prodi && String(k.aktif) !== '0').sort((a, b) => String(b.tahun_kurikulum).localeCompare(String(a.tahun_kurikulum)) || Number(a.smt_sebaran) - Number(b.smt_sebaran));
    const caraPill = { kode: '<span class="pill s-SD">kode</span>', nama: '<span class="pill info">nama</span>', manual: '<span class="pill brand">manual</span>', TAMBAHAN: '<span class="pill warn">di luar kurikulum</span>', LEWATI: '<span class="pill">dilewati</span>' };
    isi.innerHTML = '<div class="row mb-8"><span class="muted">' + H.ringkas.mkKode + ' cocok lewat kode · ' + H.ringkas.mkManual + ' lewat nama/manual · ' + H.ringkas.mkTambahan + ' di luar kurikulum · ' + H.ringkas.mkLewati + ' dilewati</span></div><div class="tbl-wrap" style="max-height:52vh"><table class="tbl tbl-compact"><thead><tr><th>Smt</th><th>Kode di file</th><th>MK di file</th><th class="num">SKS</th><th class="num">Nilai</th><th>Dipetakan ke MK PDDIKTI</th><th>Cara</th></tr></thead><tbody>' +
      H.mk.map((m) => '<tr class="' + (m.peringatan.length ? 'r-ragu' : '') + '"><td class="center">' + m.smt + '</td><td class="mono">' + esc(m.kode || '–') + '</td><td>' + esc(m.nama) + (m.peringatan.length ? '<div class="sub" style="color:#92400E">' + m.peringatan.map(esc).join(' · ') + '</div>' : '') + '</td><td class="num">' + m.sks + '</td><td class="num">' + m.jumlahNilai + '</td><td><select class="input input-sm" data-mk="' + esc(m.key) + '" style="max-width:340px"><option value="">(otomatis)</option><option value="TAMBAHAN" ' + (petaMk[m.key] === 'TAMBAHAN' ? 'selected' : '') + '>➕ MK di luar kurikulum (tetap dihitung IPK)</option><option value="LEWATI" ' + (petaMk[m.key] === 'LEWATI' ? 'selected' : '') + '>⛔ Lewati (tidak dimigrasi)</option>' + kur.map((k) => '<option value="' + esc(k.id) + '" ' + (petaMk[m.key] === k.id ? 'selected' : '') + '>' + esc(k.tahun_kurikulum + ' · ' + k.kode_mk + ' · ' + k.nama_mk + ' (' + k.sks + ')') + '</option>').join('') + '</select>' + (m.cocok && !petaMk[m.key] ? '<div class="sub">→ ' + esc(m.cocok.kode + ' ' + m.cocok.nama) + '</div>' : '') + '</td><td>' + (caraPill[m.cara] || esc(m.cara)) + '</td></tr>').join('') + '</tbody></table></div><div class="row mt-16"><button class="btn" id="mg-b">' + ic('back') + 'Kembali</button><span class="spacer"></span><button class="btn btn-primary" id="mg-n">Lanjut ' + ic('next') + '</button></div>';
    $('#mg-b', box).onclick = s1;
    $('#mg-n', box).onclick = (e) => tombolProses(e.currentTarget, async () => { petaMk = {}; $$('[data-mk]', box).forEach((s) => { if (s.value) petaMk[s.dataset.mk] = s.value; }); if (await pratinjau()) s3(); });
  };
  const s3 = async () => {
    langkah(3);
    const ml = await Store.get('mhs.list', {}, 60000); mhsProdi = (ml.data || []).filter((m) => m.prodi === prodi).sort((a, b) => a.nama.localeCompare(b.nama));
    const caraPill = { nim: '<span class="pill s-SD">NIM</span>', nama: '<span class="pill info">nama</span>', manual: '<span class="pill brand">manual</span>', ganda: '<span class="pill warn">nama ganda</span>', LEWATI: '<span class="pill">dilewati</span>' };
    isi.innerHTML = '<div class="row mb-8"><span class="muted">' + H.ringkas.mhsCocok + ' dari ' + H.ringkas.mhs + ' cocok · ' + H.ringkas.mhsTidak + ' perlu dipilih manual</span><span class="spacer"></span><button class="btn btn-sm" id="mg-sk">' + ic('link') + 'Tarik data mahasiswa dulu</button></div><div class="tbl-wrap" style="max-height:52vh"><table class="tbl tbl-compact"><thead><tr><th>#</th><th>Nama di file</th><th>NIM di file</th><th>Mahasiswa di aplikasi</th><th>Cara</th></tr></thead><tbody>' +
      H.mhs.map((s) => '<tr class="' + (s.cocok ? (s.cara === 'nim' ? 'r-nim' : 'r-nama') : 'r-ragu') + '"><td>' + (s.idx + 1) + '</td><td>' + esc(s.nama) + '</td><td class="mono">' + esc(s.nimFile) + '</td><td><select class="input input-sm" data-mh="' + s.idx + '" style="max-width:360px"><option value="">' + (s.cocok ? esc('(otomatis) ' + s.cocok.nim + ' · ' + s.cocok.nama + ' · ' + s.cocok.angkatan) : '— pilih mahasiswa —') + '</option><option value="LEWATI" ' + (petaMhs[s.idx] === 'LEWATI' ? 'selected' : '') + '>⛔ Lewati</option>' + mhsProdi.map((m) => '<option value="' + esc(m.nim) + '" ' + (petaMhs[s.idx] === m.nim ? 'selected' : '') + '>' + esc(m.nim + ' · ' + m.nama + ' · ' + m.angkatan_asal) + '</option>').join('') + '</select></td><td>' + (caraPill[s.cara] || '<span class="pill danger">' + esc(s.cara) + '</span>') + '</td></tr>').join('') + '</tbody></table></div><div class="row mt-16"><button class="btn" id="mg-b">' + ic('back') + 'Kembali</button><span class="spacer"></span><button class="btn btn-primary" id="mg-n">Uji coba ' + ic('next') + '</button></div>';
    $('#mg-sk', box).onclick = () => Sinkron.buka('MAHASISWA');
    $('#mg-b', box).onclick = s2;
    $('#mg-n', box).onclick = (e) => tombolProses(e.currentTarget, async () => { petaMhs = {}; $$('[data-mh]', box).forEach((s) => { if (s.value) petaMhs[s.dataset.mh] = s.value; }); if (await pratinjau()) s4(); });
  };
  const s4 = () => {
    langkah(4);
    const R = H.ringkas;
    isi.innerHTML = '<div class="alert info mb-12">' + ic('info') + '<div><b>Uji coba (dry-run)</b> — belum ada yang disimpan. Periksa ringkasan di bawah.</div></div><div class="grid g4 mb-12">' + [['clip', fmtInt(R.nilai), 'Nilai akan dimigrasi'], ['book', R.mk - R.mkLewati, 'MK (' + R.mkTambahan + ' di luar kurikulum)'], ['users', R.mhsCocok + ' / ' + R.mhs, 'Mahasiswa cocok'], ['layers', R.sksMaks, 'SKS terbanyak per mahasiswa']].map((x) => '<div class="card kpi"><div class="kpi-ic">' + ic(x[0]) + '</div><div><div class="kpi-v">' + x[1] + '</div><div class="kpi-l">' + x[2] + '</div></div></div>').join('') + '</div>' +
      (R.mhsTidak ? '<div class="alert warn mb-12">' + ic('warn') + '<div>' + R.mhsTidak + ' mahasiswa di file belum cocok — nilainya akan dilewati.</div></div>' : '') +
      '<h4 class="mb-8">Total SKS per mahasiswa (bandingkan dengan Excel)</h4><div class="tbl-wrap" style="max-height:36vh"><table class="tbl tbl-compact"><thead><tr><th>Nama</th><th class="num">SKS</th></tr></thead><tbody>' + R.sksPerMhs.map((x) => '<tr><td>' + esc(x.nama) + '</td><td class="num">' + x.sks + '</td></tr>').join('') + '</tbody></table></div><div class="row mt-16"><button class="btn" id="mg-b">' + ic('back') + 'Kembali</button><span class="spacer"></span><button class="btn btn-primary" id="mg-n">' + ic('db') + 'Jalankan migrasi</button></div>';
    $('#mg-b', box).onclick = s3;
    $('#mg-n', box).onclick = (e) => tombolProses(e.currentTarget, async () => {
      if (!(await konfirmasi('Jalankan migrasi', 'Migrasikan <b>' + fmtInt(R.nilai) + ' nilai</b> ' + esc(prodi + ' ' + angk) + ' sebagai SUDAH DILAPOR? Bisa dibatalkan per batch.', 'Jalankan'))) return;
      const r = await api('migrasi.jalankan', payload());
      if (!r.success) return toast(r.message, 'err');
      langkah(5);
      isi.innerHTML = '<div class="alert ok">' + ic('checkc') + '<div><b>' + esc(r.message) + '</b><br>' + r.data.kelas + ' kelas riil · ' + r.data.mkRiilBaru + ' MK riil baru · ' + r.data.dosenBaru + ' dosen baru · ' + r.data.peta + ' aturan peta klaim · ' + r.data.dilewati + ' nilai dilewati (sudah ada)</div></div><div class="row mt-16"><button class="btn" id="mg-lagi">' + ic('upload') + 'Migrasi file lain</button><a class="btn btn-primary" href="#/dasbor">' + ic('dasbor') + 'Lihat dasbor</a></div>';
      $('#mg-lagi', box).onclick = s1; muatRiwayat();
    });
  };
  s1(); muatRiwayat();
}

/* ---------------------------------------------------------------- dokumen resmi (Doc Engine) */
function SetDokumen(box, ctx) {
  box.innerHTML = skelTabel(6);
  const STATUS_DOK = { DRAF: '', MENUNGGU_TTD: 'warn', SIAP_TERBIT: 'info', TERBIT: 's-SD', DITARIK: 'danger' };
  const muat = () => Promise.all([Store.ambil('doc.templateList', {}), Store.ambil('doc.pejabatList', {}), Store.ambil('doc.list', {}), Store.ambil('doc.antrean', {})]).then(([t, p, d, a]) => {
    if (!ctx.alive) return;
    if (!t.success) { box.innerHTML = '<div class="alert danger">' + esc(t.message) + '</div>'; return; }
    const T = t.data.template, PJ = p.data || [], DK = d.data || [], AN = a.data || {};
    box.innerHTML = '<div class="alert info mb-16">' + ic('qr') + '<div>Dokumen resmi dibuat dari template Google Docs/Sheets/Slides ber-placeholder <span class="mono">{{…}}</span>, disetujui pejabat (PIN), lalu terbit sebagai PDF ber-QR yang bisa dicek di halaman <b>verifikasi.html</b>.</div></div>' +
      kartu('Template', T.length ? '<div class="tbl-wrap"><table class="tbl tbl-compact"><thead><tr><th>Kode</th><th>Nama</th><th>Jenis</th><th>Engine</th><th>Isian</th><th>Slot TTD</th><th>Versi</th><th>Status</th><th></th></tr></thead><tbody>' + T.map((x) => '<tr><td class="mono">' + esc(x.kode) + '</td><td><b style="font-weight:600">' + esc(x.nama) + '</b></td><td>' + esc(x.jenis) + '</td><td>' + esc(x.engine) + '</td><td>' + (x.bidang || []).length + '</td><td>' + (x.slotTtd || []).length + '</td><td>v' + esc(x.versi) + '</td><td>' + (x.aktif ? '<span class="pill st-Aktif">Aktif</span>' : '<span class="pill">Nonaktif</span>') + '</td><td class="aksi"><a class="btn btn-xs" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + ic('ext', 'ic-sm') + 'Buka</a><button class="btn btn-xs" data-pindai="' + esc(x.id) + '">' + ic('refresh', 'ic-sm') + 'Pindai ulang</button><button class="btn btn-xs" data-atur="' + esc(x.id) + '">' + ic('settings', 'ic-sm') + '</button></td></tr>').join('') + '</tbody></table></div>' : kosong('Belum ada template', 'Klik "Buat template contoh" untuk KHS & Transkrip siap pakai.', 'file'),
        '<button class="btn btn-sm" id="dt-contoh">' + ic('spark', 'ic-sm') + 'Buat template contoh</button><button class="btn btn-sm btn-primary" id="dt-baru">' + ic('plus', 'ic-sm') + 'Tambah dari link</button>') +
      kartu('Pejabat penanda tangan', PJ.length ? '<div class="tbl-wrap"><table class="tbl tbl-compact"><thead><tr><th>Nama</th><th>Jabatan</th><th>NIP/NIDN</th><th>PIN</th><th>Spesimen</th><th></th></tr></thead><tbody>' + PJ.map((x) => '<tr><td><b style="font-weight:600">' + esc(x.nama) + '</b>' + (x.gelar ? ', ' + esc(x.gelar) : '') + '</td><td>' + esc(x.jabatan) + '</td><td class="mono">' + esc(x.nip) + '</td><td>' + (x.punyaPin ? '<span class="pill s-SD">diatur</span>' : '<span class="pill warn">belum</span>') + '</td><td>' + (x.punyaSpesimen ? ic('check', 'ic-sm') : '<span class="soft">–</span>') + '</td><td class="aksi"><button class="btn btn-xs" data-pj="' + esc(x.id) + '">' + ic('edit', 'ic-sm') + '</button><button class="btn btn-xs" data-pin="' + esc(x.id) + '">' + ic('key', 'ic-sm') + 'PIN</button></td></tr>').join('') + '</tbody></table></div>' : kosong('Belum ada pejabat', 'Tambahkan Ketua / Puket I beserta PIN 6 angka.', 'user'), '<button class="btn btn-sm" data-pj="">' + ic('plus', 'ic-sm') + 'Tambah pejabat</button>') +
      kartu('Dokumen diterbitkan', (AN.MENUNGGU ? '<div class="alert info mb-12">' + ic('hour') + '<div>' + AN.MENUNGGU + ' dokumen massal sedang diproses otomatis (±25 per menit).' + (AN.GAGAL ? ' ' + AN.GAGAL + ' gagal setelah 3 percobaan.' : '') + '</div></div>' : '') + (DK.length ? '<div class="tbl-wrap" style="max-height:440px"><table class="tbl tbl-compact"><thead><tr><th>Judul</th><th>Nomor</th><th>Status</th><th>Penanda tangan</th><th>Terbit</th><th></th></tr></thead><tbody>' + DK.map((x) => '<tr><td>' + esc(x.judul) + '<div class="sub">' + esc(x.template) + ' · ' + esc(fmtWaktu(x.dibuat)) + ' · ' + esc(x.oleh) + '</div>' + (x.catatan ? '<div class="sub" style="color:#92400E">' + esc(x.catatan) + '</div>' : '') + '</td><td class="mono">' + esc(x.nomor || '–') + '</td><td><span class="pill ' + (STATUS_DOK[x.status] || '') + '">' + esc(x.status.replace('_', ' ')) + '</span></td><td>' + x.ttd.map((s) => '<span class="chip" title="' + esc(s.metode || '') + '">' + esc(s.label) + ': ' + esc(s.nama || '?') + ' ' + (s.status === 'SETUJU' ? ic('check', 'ic-sm') : ic('hour', 'ic-sm')) + '</span>').join(' ') + '</td><td class="nowrap">' + esc(fmtWaktu(x.terbit)) + '</td><td class="aksi">' + (x.status === 'TERBIT' ? x.berkas.map((f) => '<button class="btn btn-xs" data-unduh="' + esc(x.id) + '" data-f="' + esc(f) + '">' + ic('download', 'ic-sm') + f.toUpperCase() + '</button>').join('') + '<button class="btn btn-xs" data-salin="' + esc(x.kode) + '" title="Salin tautan verifikasi">' + ic('link', 'ic-sm') + '</button><button class="btn btn-xs btn-ghost" data-tarik="' + esc(x.id) + '">' + ic('xc', 'ic-sm') + 'Tarik</button>' : x.status === 'MENUNGGU_TTD' ? '<button class="btn btn-xs btn-primary" data-setuju="' + esc(x.id) + '">' + ic('pen', 'ic-sm') + 'Setujui</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : kosong('Belum ada dokumen', 'Terbitkan dari menu Kelulusan (tombol "Dokumen resmi") atau gunakan terbit massal.', 'filecheck')), '<button class="btn btn-sm" id="dk-massal">' + ic('layers', 'ic-sm') + 'Terbit massal</button>');
    $('#dt-contoh', box).onclick = (e) => tombolProses(e.currentTarget, async () => { const r = await api('doc.templateContoh', {}); toast(r.message, r.success ? 'ok' : 'err', 6000); if (r.success) muat(); });
    $('#dt-baru', box).onclick = () => formTemplate({});
    $('#dk-massal', box).onclick = () => massal(T, PJ);
    box.onclick = async (e) => {
      const b = e.target.closest('button[data-pindai],button[data-atur],button[data-pj],button[data-pin],button[data-unduh],button[data-tarik],button[data-setuju],button[data-salin]'); if (!b) return;
      if (b.dataset.pindai) { const x = T.find((y) => y.id === b.dataset.pindai); tombolProses(b, async () => { const r = await api('doc.templatePindai', { id: x.id, kode: x.kode, nama: x.nama, jenis: x.jenis }); toast(r.message, r.success ? 'ok' : 'err'); if (r.success) { if (r.data.skema.hilang && r.data.skema.hilang.length) toast('Kolom tidak ada lagi di template: ' + r.data.skema.hilang.join(', '), 'warn', 7000); muat(); } }); }
      if (b.dataset.atur) aturTemplate(T.find((y) => y.id === b.dataset.atur), PJ);
      if (b.dataset.pj !== undefined) formPejabat(PJ.find((y) => y.id === b.dataset.pj) || {});
      if (b.dataset.pin) aturPin(PJ.find((y) => y.id === b.dataset.pin));
      if (b.dataset.unduh) tombolProses(b, async () => { const r = await api('doc.unduh', { id: b.dataset.unduh, format: b.dataset.f }); if (r.success) unduhBlob(base64KeBlob(r.data.base64, r.data.mime), r.data.nama); else toast(r.message, 'err'); });
      if (b.dataset.salin) salin(String(App.M.pengaturan.URL_FRONTEND || location.origin + location.pathname.replace(/index\.html$/, '')).replace(/\/?$/, '/') + 'verifikasi.html?k=' + b.dataset.salin);
      if (b.dataset.tarik) modal({ judul: 'Tarik dokumen', isi: '<div class="field"><label class="req">Alasan penarikan</label><textarea class="input" id="tk-a"></textarea><div class="hint">Halaman verifikasi akan menampilkan status DITARIK.</div></div>', tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Tarik dokumen', kelas: 'btn-danger', aksi: async (c, m) => { const r = await api('doc.tarik', { id: b.dataset.tarik, alasan: $('#tk-a', m).value }); toast(r.message, r.success ? 'ok' : 'err'); if (r.success) muat(); return r.success; } }] });
      if (b.dataset.setuju) { const x = DK.find((y) => y.id === b.dataset.setuju), slot = x.ttd.find((s) => s.status !== 'SETUJU'); modal({ judul: 'Persetujuan — ' + slot.label, desc: esc(x.judul), isi: '<div class="field mb-12"><label>PIN ' + esc(slot.nama) + '</label><input class="input" type="password" inputmode="numeric" maxlength="6" id="st-pin"></div><label class="check"><input type="checkbox" id="st-by">Setujui tanpa PIN (dicatat dengan alasan)</label><textarea class="input mt-8" id="st-al" placeholder="Alasan"></textarea>', tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Setujui', kelas: 'btn-primary', aksi: async (c, m) => { const r = await api('doc.setujui', { id: x.id, slot: slot.slot, pin: $('#st-pin', m).value, bypass: $('#st-by', m).checked, alasan: $('#st-al', m).value }); toast(r.message, r.success ? 'ok' : 'err'); if (r.success) muat(); return r.success; } }] }); }
    };
    function formTemplate() {
      modal({ judul: 'Tambah template dari link', desc: 'Template disalin ke folder aplikasi (file asli tidak diubah), lalu placeholder {{…}} dipindai otomatis.', isi: '<div class="fgrid"><div class="field"><label class="req">Kode</label><input class="input mono" name="kode" placeholder="mis. TR-RESMI"></div><div class="field"><label>Jenis data</label><select class="input" name="jenis">' + opsi(Object.keys(t.data.jenis).map((k) => ({ v: k, t: t.data.jenis[k].label })), 'TRANSKRIP') + '</select></div><div class="field full"><label class="req">Nama</label><input class="input" name="nama"></div><div class="field full"><label class="req">Link Google Docs / Sheets / Slides</label><input class="input" name="url" placeholder="https://docs.google.com/document/d/…/edit"></div></div><div class="muted mt-12" style="font-size:12.5px">Placeholder data otomatis untuk jenis ini: <span class="mono" id="ft-k"></span></div>',
        onBuka: (m) => { const isiK = () => { $('#ft-k', m).textContent = (t.data.kunciData[$('[name=jenis]', m).value] || []).map((k) => '{{' + k + '}}').join(' '); }; $('[name=jenis]', m).onchange = isiK; isiK(); },
        tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Pindai & simpan', kelas: 'btn-primary', aksi: async (c, m) => { const r = await api('doc.templatePindai', bacaForm(m)); toast(r.message, r.success ? 'ok' : 'err', 6000); if (r.success) muat(); return r.success; } }] });
    }
    function aturTemplate(x, PJ) {
      let slot = JSON.parse(JSON.stringify(x.slotTtd || []));
      const md = modal({ judul: 'Atur template — ' + x.nama, lebar: 'lebar', isi: '<div class="fgrid mb-16"><div class="field"><label>Nama</label><input class="input" id="at-nama" value="' + esc(x.nama) + '"></div><div class="field"><label>Format nomor</label><input class="input mono" id="at-no" value="' + esc(x.formatNomor || '') + '"><div class="hint">{URUT} {KODE} {BULAN} {TAHUN} — dipakai bila template berisi {{NOMOR}}</div></div><div class="field"><label>Keluaran</label><div class="row-wrap">' + ['pdf', 'docx', 'xlsx', 'png'].map((f) => '<label class="check"><input type="checkbox" data-out="' + f + '" ' + ((x.keluaran || []).includes(f) ? 'checked' : '') + '>' + f.toUpperCase() + '</label>').join('') + '</div></div><div class="field"><label>Lain-lain</label><div class="row-wrap"><label class="check"><input type="checkbox" id="at-qr" ' + (x.qrPer ? 'checked' : '') + '>QR per penanda tangan</label><label class="check"><input type="checkbox" id="at-aktif" ' + (x.aktif ? 'checked' : '') + '>Aktif</label></div></div></div><h4 class="mb-8">Slot tanda tangan</h4><div id="at-slot"></div>',
        tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan', kelas: 'btn-primary', aksi: async (c, m) => {
          $$('[data-sl]', m).forEach((i) => { const s = slot[Number(i.dataset.sl)]; s[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; });
          const r = await api('doc.templateSimpan', { id: x.id, nama: $('#at-nama', m).value, formatNomor: $('#at-no', m).value, keluaran: $$('[data-out]', m).filter((i) => i.checked).map((i) => i.dataset.out), qrPer: $('#at-qr', m).checked, aktif: $('#at-aktif', m).checked, slotTtd: slot });
          toast(r.message, r.success ? 'ok' : 'err'); if (r.success) muat(); return r.success;
        } }] });
      $('#at-slot', md.el).innerHTML = slot.length ? slot.map((s, i) => '<div class="card mb-8"><div class="card-b fgrid c3"><div class="field"><label>Slot ' + s.slot + ' — label</label><input class="input" data-sl="' + i + '" data-k="label" value="' + esc(s.label) + '"></div><div class="field"><label>Cara</label><select class="input" data-sl="' + i + '" data-k="cara">' + opsi([{ v: 'pilih', t: 'Dipilih saat membuat' }, { v: 'tetap', t: 'Pejabat tetap' }], s.cara) + '</select></div><div class="field"><label>Pejabat bawaan</label><select class="input" data-sl="' + i + '" data-k="pejabatId">' + opsi(PJ.map((p) => ({ v: p.id, t: p.nama })), s.pejabatId, null, '—') + '</select></div><div class="field"><label>Tanda</label><select class="input" data-sl="' + i + '" data-k="tanda">' + opsi([{ v: 'spesimen', t: 'Spesimen TTD' }, { v: 'qr', t: 'QR' }, { v: 'qr+spesimen', t: 'QR + spesimen' }, { v: 'kosong', t: 'Kosong (TTD basah)' }], s.tanda) + '</select></div><div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" data-sl="' + i + '" data-k="wajibSetuju" ' + (s.wajibSetuju !== false ? 'checked' : '') + '>Wajib persetujuan PIN</label></div></div></div>').join('') : '<div class="muted">Template tidak memuat {{TTD_n}} / {{NAMA_PEJABAT_n}}.</div>';
    }
    function formPejabat(x) {
      modal({ judul: x.id ? 'Ubah pejabat' : 'Tambah pejabat', isi: '<div class="fgrid"><div class="field"><label class="req">Nama</label><input class="input" name="nama" value="' + esc(x.nama || '') + '"></div><div class="field"><label>Gelar</label><input class="input" name="gelar" value="' + esc(x.gelar || '') + '"></div><div class="field"><label class="req">Jabatan</label><input class="input" name="jabatan" value="' + esc(x.jabatan || '') + '"></div><div class="field"><label>NIP / NIDN</label><input class="input mono" name="nip" value="' + esc(x.nip || '') + '"></div><div class="field full"><label>Spesimen tanda tangan (PNG/JPG, maks 1 MB, latar transparan disarankan)</label><input type="file" accept="image/png,image/jpeg" id="pj-sp" class="input" style="padding-top:6px"></div>' + (x.id ? '<div class="field full"><label class="check"><input type="checkbox" name="aktif" ' + (x.aktif !== false ? 'checked' : '') + '>Aktif</label></div>' : '') + '</div>',
        tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan', kelas: 'btn-primary', aksi: async (c, m) => {
          const f = bacaForm(m); if (x.id) f.id = x.id; f.aktif = f.aktif !== false;
          const file = $('#pj-sp', m).files[0];
          if (file) { if (file.size > 1048576) { toast('Spesimen maksimal 1 MB.', 'warn'); return false; } f.spesimen = await new Promise((res) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.readAsDataURL(file); }); }
          const r = await api('doc.pejabatSimpan', { pejabat: f }); toast(r.message, r.success ? 'ok' : 'err'); if (r.success) muat(); return r.success;
        } }] });
    }
    function aturPin(x) {
      modal({ judul: 'PIN — ' + x.nama, desc: 'PIN 6 angka dipakai pejabat untuk menyetujui dokumen. Disimpan sebagai hash.', isi: (x.punyaPin ? '<div class="field mb-12"><label>PIN lama</label><input class="input" type="password" inputmode="numeric" maxlength="6" name="pinLama"></div>' : '') + '<div class="field mb-12"><label>PIN baru (6 angka)</label><input class="input" type="password" inputmode="numeric" maxlength="6" name="pinBaru"></div>' + (x.punyaPin ? '<label class="check"><input type="checkbox" name="reset">Lupa PIN lama — atur ulang (wajib alasan)</label><textarea class="input mt-8" name="alasan" placeholder="Alasan atur ulang"></textarea>' : ''),
        tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan PIN', kelas: 'btn-primary', aksi: async (c, m) => { const f = bacaForm(m); f.id = x.id; const r = await api('doc.pejabatPin', f); toast(r.message, r.success ? 'ok' : 'err'); if (r.success) muat(); return r.success; } }] });
    }
    function massal(T, PJ) {
      const tpl = T.filter((x) => x.aktif && (x.jenis === 'KHS' || x.jenis === 'TRANSKRIP'));
      if (!tpl.length) return toast('Belum ada template KHS/Transkrip aktif.', 'warn');
      const md = modal({ judul: 'Terbit dokumen massal', lebar: 'lebar', desc: 'Dokumen dibuat sekarang lalu dirender bertahap di latar (±25 per menit).',
        isi: '<div class="fgrid"><div class="field full"><label>Template</label><select class="input" id="ms-t">' + opsi(tpl.map((x) => ({ v: x.id, t: x.nama + ' (' + x.jenis + ')' }))) + '</select></div><div class="field"><label>Prodi</label><select class="input" id="ms-p">' + opsi(App.prodi().map((x) => x.kode)) + '</select></div><div class="field"><label>Angkatan</label><select class="input" id="ms-a">' + opsi(App.angkatanList()) + '</select></div><div class="field" id="ms-per-f"><label>Periode (KHS)</label><select class="input" id="ms-per">' + opsi(App.M.periode.map((p) => ({ v: p.id, t: labelPeriode(p.id) })), App.periode) + '</select></div><div class="field"><label>Status mahasiswa</label><select class="input" id="ms-s">' + opsi(['Aktif', 'Lulus'], 'Aktif') + '</select></div></div><div id="ms-ttd" class="mt-12"></div>',
        tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Masukkan ke antrean', kelas: 'btn-primary', aksi: async (c, m) => {
          const x = tpl.find((y) => y.id === $('#ms-t', m).value), ml = await Store.get('mhs.list', {}, 60000);
          const nims = (ml.data || []).filter((s) => s.prodi === $('#ms-p', m).value && String(s.ikut_angkatan) === $('#ms-a', m).value && s.status === $('#ms-s', m).value).map((s) => s.nim);
          if (!nims.length) { toast('Tidak ada mahasiswa yang cocok.', 'warn'); return false; }
          const pejabat = {}, pin = {}; $$('[data-pj]', m).forEach((s) => { if (s.value) pejabat[s.dataset.pj] = s.value; }); $$('[data-pin]', m).forEach((s) => { if (s.value) pin[s.dataset.pin] = s.value; });
          const r = await api('doc.massal', { templateId: x.id, refs: nims.map((n) => x.jenis === 'KHS' ? { nim: n, periode: $('#ms-per', m).value } : { nim: n }), pejabat: pejabat, pin: pin, bypass: $('#ms-by', m).checked, alasan: $('#ms-al', m).value });
          toast(r.message + (r.data && r.data.gagal.length ? ' Gagal: ' + r.data.gagal.slice(0, 3).join('; ') : ''), r.success ? 'ok' : 'err', 7000); if (r.success) muat(); return r.success;
        } }] });
      const ttd = () => { const x = tpl.find((y) => y.id === $('#ms-t', md.el).value); $('#ms-per-f', md.el).classList.toggle('hidden', x.jenis !== 'KHS'); $('#ms-ttd', md.el).innerHTML = '<h4 class="mb-8">Penanda tangan</h4>' + (x.slotTtd || []).map((s) => '<div class="row mb-8"><span style="width:150px">' + esc(s.label) + '</span><select class="input" data-pj="' + s.slot + '">' + opsi(PJ.map((p) => ({ v: p.id, t: p.nama })), s.pejabatId, null, '— pilih —') + '</select>' + (s.wajibSetuju !== false ? '<input class="input" type="password" maxlength="6" inputmode="numeric" placeholder="PIN" data-pin="' + s.slot + '" style="width:120px">' : '') + '</div>').join('') + '<label class="check"><input type="checkbox" id="ms-by">Tanpa PIN (dengan alasan)</label><textarea class="input mt-8" id="ms-al" placeholder="Alasan"></textarea>'; };
      $('#ms-t', md.el).onchange = ttd; ttd();
    }
  });
  muat();
}

/* ---------------------------------------------------------------- keamanan & sistem */
function SetKeamanan(box, ctx) {
  box.innerHTML = skelTabel(5);
  pakai(ctx, 'pengaturan.get', {}, (d) => {
    box.innerHTML = kartu('Akun Anda', '<div class="row-wrap"><button class="btn" id="ke-sandi">' + ic('key') + 'Ganti kata sandi</button><button class="btn" id="ke-semua">' + ic('shield') + 'Keluar dari semua perangkat</button></div><p class="muted mt-12" style="font-size:12.5px">Sesi login berlaku 8 jam dan tersimpan hanya di tab browser ini. 5× salah sandi → akun terkunci 15 menit.</p>') +
      kartu('Verifikasi Pusat (opsional)', '<p class="muted" style="font-size:13px">Bila institusi memakai satu situs Verifikasi Pusat untuk semua aplikasi, isi data berikut. Nilai rahasia disimpan di Script Properties dan tidak pernah ditampilkan utuh.</p>' + d.rahasia.map((r) => '<div class="field mb-12"><label>' + esc(r.label) + ' ' + (r.ada ? '<span class="pill s-SD">terisi</span>' : '<span class="pill">kosong</span>') + '</label><div class="row"><input class="input mono" type="' + (/KUNCI/.test(r.kunci) ? 'password' : 'text') + '" autocomplete="off" data-r="' + r.kunci + '" placeholder="' + esc(r.samar || 'belum diisi') + '"><button class="btn" data-rs="' + r.kunci + '">Simpan</button>' + (r.ada ? '<button class="btn btn-ghost" data-rh="' + r.kunci + '">Hapus</button>' : '') + '</div></div>').join('')) +
      kartu('Sistem', '<div class="kv"><span class="muted">Versi backend</span><b>' + esc(d.versi) + '</b></div><div class="kv"><span class="muted">Versi frontend</span><b>' + APP_VER + '</b></div><div class="kv"><span class="muted">Database</span><b>' + esc(d.db) + '</b></div><div class="kv"><span class="muted">Pemicu terjadwal</span><span>' + (d.trigger.length ? d.trigger.map((x) => '<span class="chip">' + esc(x) + '</span>').join(' ') : '<span class="pill warn">tidak ada</span>') + '</span></div><div class="kv"><span class="muted">Pemanasan cache terakhir</span><span>' + esc(d.warm ? fmtWaktu(d.warm.at) + ' (' + d.warm.scope + ')' : '–') + '</span></div><div class="row mt-12"><button class="btn btn-sm" id="ke-perf">' + ic('chart', 'ic-sm') + 'Ringkasan kecepatan (console)</button><button class="btn btn-sm" id="ke-cache">' + ic('refresh', 'ic-sm') + 'Bersihkan cache tab ini</button><button class="btn btn-sm btn-primary" id="ke-segar" title="Pakai setelah mengubah/menghapus data langsung di Google Sheets">' + ic('db', 'ic-sm') + 'Muat ulang dari spreadsheet</button></div><p class="muted mt-8" style="font-size:12.5px">Mengubah atau menghapus data <b>langsung di Google Sheets</b> tidak otomatis terlihat (aplikasi memakai cache server ±6 jam agar cepat). Tekan <b>Muat ulang dari spreadsheet</b> setelahnya. Sebaiknya ubah data lewat aplikasi agar aturan &amp; riwayat tetap terjaga.</p>');
    // v1.2 — kartu sinkron otomatis spreadsheet (disisipkan sebelum kartu Sistem)
    const kSis = $$('.card', box).pop();
    if (kSis) kSis.insertAdjacentHTML('beforebegin', kartu('Sinkron otomatis spreadsheet', '<div id="ke-sinkron">' + skelTabel(2) + '</div>', '', 'Perubahan atau penghapusan data langsung di Google Sheets ikut tampil di aplikasi.'));
    const gambarSinkron = async () => {
      const w = $('#ke-sinkron', box); if (!w) return;
      const r = await api('sheet.status', {});
      if (!r.success) { w.innerHTML = '<div class="alert warn">' + ic('warn') + '<div>' + esc(r.message) + '</div></div>'; return; }
      const d2 = r.data, t = d2.terakhir || {};
      const st = !d2.aktif ? '<span class="pill no-dot">Mati</span>' : d2.terpasang ? '<span class="pill st-Aktif">Aktif</span>' : '<span class="pill s-SL">Menunggu dipasang</span>';
      w.innerHTML = '<div class="kv"><span class="muted">Status</span><b>' + st + '</b></div>' +
        '<div class="kv"><span class="muted">Perubahan terakhir di spreadsheet</span><b>' + (t.t ? esc(new Date(Number(t.t)).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })) + (t.sheet ? ' · ' + esc(t.sheet) : '') : '<span class="soft">belum ada</span>') + '</b></div>' +
        '<p class="muted mt-8" style="font-size:12.5px">' + (d2.aktif ? 'Saat data diubah atau dihapus langsung di Google Sheets, cache server ikut diperbarui dan tab aplikasi yang terbuka menyegarkan diri dalam ±30 detik. ' : 'Sinkron otomatis dimatikan — tekan <b>Refresh</b> di kanan atas setelah mengubah spreadsheet. ') + (d2.aktif && !d2.terpasang ? 'Pemicu dipasang otomatis paling lambat 5 menit setelah kode diperbarui, atau tekan <b>Pasang sekarang</b>.' : '') + '</p>' +
        '<div class="row-wrap mt-8">' + (d2.aktif ? (d2.terpasang ? '' : '<button class="btn btn-sm btn-primary" data-sk="1">' + ic('link', 'ic-sm') + 'Pasang sekarang</button>') + '<button class="btn btn-sm btn-ghost" data-sk="0">' + ic('x', 'ic-sm') + 'Matikan</button>' : '<button class="btn btn-sm btn-primary" data-sk="1">' + ic('refresh', 'ic-sm') + 'Nyalakan</button>') + '</div>';
    };
    gambarSinkron();
    $('#ke-sinkron', box).addEventListener('click', async (e) => {
      const b = e.target.closest('[data-sk]'); if (!b) return;
      const r = await tombolProses(b, () => api('sheet.otomatis', { aktif: b.dataset.sk === '1' }));
      toast(r.message, r.success ? 'ok' : 'err', 7000); gambarSinkron();
    });
    $('#ke-sandi', box).onclick = () => App.gantiSandi(false);
    $('#ke-semua', box).onclick = () => App.menuAkun();
    $('#ke-perf', box).onclick = () => { Perf.summary(); toast('Lihat Console (F12).', 'info'); };
    $('#ke-cache', box).onclick = () => { Store.reset(); toast('Cache tab dibersihkan.'); };
    $('#ke-segar', box).onclick = async () => {                       // v1.1: setelah edit langsung di Sheets
      if (!await konfirmasi('Muat ulang dari spreadsheet', 'Aplikasi akan membaca ulang seluruh data dari Google Sheets. Data tidak diubah. Halaman pertama setelah ini bisa sedikit lebih lambat.', 'Muat ulang')) return;
      const r = await api('sistem.segarkan', {});
      if (!r.success) return toast(r.message, 'err');
      Store.reset(); await App.segarkanMaster(); toast(r.message, 'ok');
    };
    box.onclick = async (e) => {
      const s = e.target.closest('[data-rs]'), h = e.target.closest('[data-rh]');
      if (s) { const i = $('[data-r="' + s.dataset.rs + '"]', box); if (!i.value.trim()) return toast('Isi nilainya dulu.', 'warn'); const r = await api('rahasia.simpan', { kunci: s.dataset.rs, nilai: i.value.trim() }); i.value = ''; toast(r.message, r.success ? 'ok' : 'err'); if (r.success) SetKeamanan(box, ctx); }
      if (h && await konfirmasi('Hapus', 'Hapus nilai ' + esc(h.dataset.rh) + '?', 'Hapus', true)) { const r = await api('rahasia.simpan', { kunci: h.dataset.rh, nilai: '__HAPUS__' }); toast(r.message, r.success ? 'ok' : 'err'); SetKeamanan(box, ctx); }
    };
  });
}

/* ---------------------------------------------------------------- log */
function SetLog(box, ctx) {
  box.innerHTML = '<div class="card"><div class="toolbar"><div class="search" style="width:280px">' + ic('search') + '<input class="input" id="lg-q" placeholder="Cari aksi, objek, pengguna…"></div><span class="spacer"></span><button class="btn btn-sm" id="lg-segar">' + ic('refresh', 'ic-sm') + 'Segarkan</button></div><div id="lg-t">' + skelTabel(10) + '</div></div>';
  const t = Tabel($('#lg-t', box), { id: (r) => r.id, perHalaman: 50, tinggi: true, kolom: [
    { k: 'waktu', label: 'Waktu', cls: 'nowrap', html: (r) => esc(fmtWaktu(r.waktu)) }, { k: 'pengguna', label: 'Pengguna', cls: 'mono' }, { k: 'aksi', label: 'Aksi', html: (r) => '<b style="font-weight:600">' + esc(r.aksi) + '</b>' }, { k: 'objek', label: 'Objek', cls: 'sub' }, { k: 'ringkasan', label: 'Ringkasan', html: (r) => '<span class="sub" style="word-break:break-word">' + esc(r.ringkasan) + '</span>' }
  ], cari: (r) => r.pengguna + ' ' + r.aksi + ' ' + r.objek + ' ' + r.ringkasan, kosong: 'Belum ada aktivitas' });
  const muat = () => pakai(ctx, 'log.list', {}, (d) => t.set(d), { maxAge: 15000 });
  $('#lg-q', box).oninput = debounce((e) => t.cari(e.target.value), 150);
  $('#lg-segar', box).onclick = () => { Store.basi(); muat(); };
  muat();
}
