/* ==========================================================================
   hal-nilai.js — Perkuliahan & Nilai (kelas, input nilai ketik/tempel/unggah) · Peta Klaim
   ========================================================================== */
'use strict';
const periodeDari = (angk, smt) => String(Number(angk) + Math.floor((Number(smt) - 1) / 2)) + (Number(smt) % 2 === 1 ? '1' : '2');
function skala(n) {
  if (n === null || n === undefined || n === '' || isNaN(n) || Number(n) <= 0) return { huruf: '', indeks: '' };
  const s = (App.M.skala || []).slice().sort((a, b) => Number(b.batas) - Number(a.batas));
  for (const x of s) if (Number(n) >= Number(x.batas)) return { huruf: x.huruf, indeks: Number(x.indeks) };
  const l = s[s.length - 1] || { huruf: 'D', indeks: 1 }; return { huruf: l.huruf, indeks: Number(l.indeks) };
}

/* ============================================================== PERKULIAHAN */
Hal.perkuliahan = {
  prefetch() { prefetch('kelas.list', { periode: App.periode }); },
  judul: (p) => p[0] ? 'Input nilai' : 'Perkuliahan & Nilai',
  render(el, ctx, p) {
    if (p[0]) return HalNilai(el, ctx, p[0]);
    const f = Object.assign({ prodi: '', angk: '', q: '' }, App.ingat('kls') || {});
    el.innerHTML = '<div class="page-head"><div><h2>Kelas kuliah · ' + esc(labelPeriode(App.periode)) + '</h2><div class="desc">Nilai riil diisi per kelas (ketik, tempel dari Excel, atau unggah file). Ganti periode di kanan atas.</div></div><span class="spacer"></span><button class="btn" id="k-tambah">' + ic('plus') + 'Tambah kelas</button><button class="btn btn-primary" id="k-gen">' + ic('spark') + 'Buat kelas otomatis</button></div>' +
      '<div id="k-kpi"></div><div class="card mt-16"><div class="toolbar"><div class="search" style="width:260px">' + ic('search') + '<input class="input" id="k-q" placeholder="Cari MK / dosen…" value="' + esc(f.q) + '"></div><select class="input" id="k-prodi">' + opsi(App.prodi().map((x) => x.kode), f.prodi, null, 'Semua prodi') + '</select><select class="input" id="k-angk">' + opsi(App.angkatanList(), f.angk, (a) => 'Angkatan ' + a, 'Semua angkatan') + '</select><span class="spacer"></span><span class="muted" id="k-info"></span></div><div id="k-tbl">' + skelTabel(8) + '</div></div>';
    const t = Tabel($('#k-tbl', el), { id: (r) => r.id, urut: 'prodi', perHalaman: 50, tinggi: true, kolom: [
      { k: 'mk', label: 'Mata kuliah riil', html: (r) => '<b style="font-weight:600">' + esc(r.mk) + '</b><div class="sub">' + esc(r.sks) + ' SKS' + (r.rombel && r.rombel !== 'A' ? ' · rombel ' + esc(r.rombel) : '') + (r.batch ? ' · <span title="hasil migrasi">migrasi</span>' : '') + '</div>' },
      { k: 'prodi', label: 'Prodi' },
      { k: 'ikut_angkatan', label: 'Angkatan', html: (r) => esc(r.ikut_angkatan) + ' <span class="sub">smt ' + r.smt + '</span>' },
      { k: 'program', label: 'Program', html: (r) => esc(progLabel(r.program)) },
      { k: 'dosen', label: 'Dosen', html: (r) => r.dosen ? esc(r.dosen) : '<span class="soft">belum diisi</span>' },
      { k: 'peserta', label: 'Peserta', cls: 'num' },
      { k: 'terisi', label: 'Terisi', val: (r) => r.peserta ? r.terisi / r.peserta : 0, html: (r) => '<div class="row" style="min-width:130px"><div class="progress" style="flex:1"><i style="width:' + (r.peserta ? Math.round(r.terisi / r.peserta * 100) : 0) + '%;' + (r.terisi >= r.peserta && r.peserta ? '' : 'background:var(--s-SL)') + '"></i></div><span class="sub">' + r.terisi + '/' + r.peserta + '</span></div>' }
    ], cari: (r) => r.mk + ' ' + r.dosen, klik: (r) => App.pergi('/perkuliahan/' + r.id), hover: (r) => prefetch('nilai.get', { kelas_id: r.id }), kosong: 'Belum ada kelas di periode ini', kosongDesc: 'Klik "Buat kelas otomatis" untuk menyusun kelas dari MK riil.' });
    const saring = () => {
      f.prodi = $('#k-prodi', el).value; f.angk = $('#k-angk', el).value; f.q = $('#k-q', el).value; App.ingat('kls', f);
      t.st.q = f.q; t.saring((r) => (!f.prodi || r.prodi === f.prodi) && (!f.angk || r.ikut_angkatan === f.angk));
      const rs = t.hasil(), pes = rs.reduce((s, r) => s + r.peserta, 0), isi = rs.reduce((s, r) => s + r.terisi, 0);
      $('#k-info', el).textContent = rs.length + ' kelas · ' + fmtInt(isi) + ' / ' + fmtInt(pes) + ' nilai terisi';
    };
    $('#k-q', el).oninput = debounce(saring, 150); $('#k-prodi', el).onchange = saring; $('#k-angk', el).onchange = saring;
    pakai(ctx, 'kelas.list', { periode: App.periode }, (d) => { t.st.rows = d; saring(); });
    $('#k-gen', el).onclick = () => buatKelasOtomatis(f.prodi || (App.prodi()[0] || {}).kode);
    $('#k-tambah', el).onclick = () => tambahKelas(f.prodi || (App.prodi()[0] || {}).kode, f.angk);
  }
};

function buatKelasOtomatis(prodi) {
  let usul = [];
  const angkSmt = App.angkatanList().map((a) => ({ a: a, s: smtDari(a, App.periode) })).filter((x) => x.s >= 1 && x.s <= 14);
  const md = modal({
    judul: 'Buat kelas otomatis · ' + labelPeriode(App.periode), lebar: 'lebar', desc: 'Disusun dari MK riil yang semester ajarnya cocok dengan semester angkatan. Peserta = mahasiswa Aktif sesuai program (Reguler/Hybrid/Ma\'had Aly).',
    isi: '<div class="row-wrap mb-12"><div class="field"><label>Prodi</label><select class="input" id="g-prodi" style="width:auto">' + opsi(App.prodi().map((x) => x.kode), prodi) + '</select></div><div class="field" style="flex:1"><label>Angkatan</label><div class="row-wrap" id="g-angk">' + angkSmt.map((x) => '<label class="check chip"><input type="checkbox" value="' + x.a + '" ' + (x.s <= 8 ? 'checked' : '') + '>' + x.a + ' <span class="muted">(smt ' + x.s + ')</span></label>').join('') + '</div></div><button class="btn" id="g-lihat" style="align-self:flex-end">' + ic('eye') + 'Lihat usulan</button></div><div id="g-isi"></div>',
    tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Buat kelas terpilih', kelas: 'btn-primary', ikon: 'plus', aksi: async (close, m) => {
      const keys = $$('#g-isi input[data-k]:checked', m).map((c) => c.dataset.k);
      if (!keys.length) { toast('Pilih minimal satu kelas.', 'warn'); return false; }
      const r = await api('kelas.generate', { periode: App.periode, prodi: $('#g-prodi', m).value, angkatan: angkatan(), keys: keys });
      if (!r.success) { toast(r.message, 'err'); return false; }
      toast(r.message); App.render(); return true;
    } }]
  });
  const el = md.el;
  const angkatan = () => $$('#g-angk input:checked', el).map((c) => c.value);
  const lihat = async () => {
    if (!angkatan().length) { $('#g-isi', el).innerHTML = kosong('Pilih angkatan', '', 'users'); return; }
    $('#g-isi', el).innerHTML = skelTabel(5);
    const r = await api('kelas.generate', { periode: App.periode, prodi: $('#g-prodi', el).value, angkatan: angkatan(), preview: true });
    if (!r.success) { $('#g-isi', el).innerHTML = '<div class="alert danger">' + ic('xc') + '<div>' + esc(r.message) + '</div></div>'; return; }
    usul = r.data;
    $('#g-isi', el).innerHTML = usul.length ? '<div class="row mb-8"><label class="check"><input type="checkbox" id="g-semua" checked>Pilih semua yang belum ada</label><span class="spacer"></span><span class="muted">' + usul.filter((u) => !u.sudahAda).length + ' kelas baru · ' + usul.filter((u) => u.sudahAda).length + ' sudah ada</span></div><div class="tbl-wrap" style="max-height:48vh"><table class="tbl tbl-compact"><thead><tr><th></th><th>MK riil</th><th>Angkatan</th><th>Smt</th><th>Program</th><th class="num">SKS</th><th class="num">Peserta</th><th></th></tr></thead><tbody>' +
      usul.map((u) => '<tr class="' + (u.sudahAda ? 'r-off' : '') + '"><td>' + (u.sudahAda ? '' : '<input type="checkbox" data-k="' + esc(u.key) + '" checked>') + '</td><td>' + esc(u.mk) + '</td><td>' + esc(u.ikut_angkatan) + '</td><td>' + u.smt + '</td><td>' + esc(progLabel(u.program)) + '</td><td class="num">' + esc(u.sks) + '</td><td class="num">' + u.peserta + '</td><td>' + (u.sudahAda ? '<span class="pill">sudah ada</span>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
      : kosong('Tidak ada usulan', 'Belum ada MK riil dengan semester ajar yang cocok. Tambahkan di Kurikulum → MK riil.', 'book');
    const s = $('#g-semua', el); if (s) s.onchange = () => $$('#g-isi input[data-k]', el).forEach((c) => { c.checked = s.checked; });
  };
  $('#g-lihat', el).onclick = lihat; $('#g-prodi', el).onchange = lihat;
  lihat();
}
function tambahKelas(prodi, angk) {
  const md = modal({
    judul: 'Tambah kelas · ' + labelPeriode(App.periode), desc: 'Peserta terisi otomatis (mahasiswa Aktif angkatan & program yang dipilih), bisa diubah setelahnya.',
    isi: '<div class="fgrid"><div class="field"><label>Prodi</label><select class="input" name="prodi" id="tk-prodi">' + opsi(App.prodi().map((x) => x.kode), prodi) + '</select></div><div class="field"><label>Angkatan (ikut)</label><select class="input" name="ikut_angkatan">' + opsi(App.angkatanList(), angk || String(App.periodeAktif).slice(0, 4)) + '</select></div><div class="field full"><label class="req">MK riil</label><select class="input" name="mk_riil_id" id="tk-mk"></select></div><div class="field"><label>Program peserta</label><div class="row-wrap" style="min-height:36px">' + Object.keys(PROGRAM_LABEL).map((k) => '<label class="check"><input type="checkbox" data-prog="' + k + '" ' + (k !== 'MA' ? 'checked' : '') + '>' + PROGRAM_LABEL[k] + '</label>').join('') + '</div></div><div class="field"><label>Rombel</label><input class="input" name="rombel" value="A"></div><div class="field full"><label>Dosen</label><select class="input" name="dosen_id">' + opsi(App.M.dosen.filter((d) => String(d.aktif) !== '0').map((d) => ({ v: d.id, t: d.nama })), '', null, '— pilih dosen —') + '</select></div></div>',
    tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Buat kelas', kelas: 'btn-primary', aksi: async (close, m) => {
      const f = bacaForm(m); f.program = $$('[data-prog]', m).filter((c) => c.checked).map((c) => c.dataset.prog).join(','); f.periode = App.periode;
      if (!f.mk_riil_id) { toast('Pilih MK riil.', 'warn'); return false; }
      const r = await api('kelas.simpan', { kelas: f }); if (!r.success) { toast(r.message, 'err'); return false; }
      toast(r.message); App.pergi('/perkuliahan/' + r.data.id); return true;
    } }]
  });
  const isiMk = () => { const pr = $('#tk-prodi', md.el).value; $('#tk-mk', md.el).innerHTML = opsi(App.M.mkriil.filter((m) => m.prodi === pr && String(m.aktif) !== '0').sort((a, b) => Number(a.smt_ajar) - Number(b.smt_ajar)).map((m) => ({ v: m.id, t: 'Smt ' + (m.smt_ajar || '?') + ' · ' + m.nama_mk + ' (' + progLabel(m.program) + ')' })), '', null, '— pilih —'); };
  $('#tk-prodi', md.el).onchange = isiMk; isiMk();
}

/* ---------------------------------------------------------------- input nilai (grid spreadsheet) */
function HalNilai(el, ctx, kelasId) {
  el.innerHTML = '<div class="row mb-16"><a href="#/perkuliahan" class="btn btn-sm btn-ghost">' + ic('back') + 'Kembali ke daftar kelas</a></div><div id="nv">' + skelKpi(3) + '<div class="card mt-16">' + skelTabel(10) + '</div></div>';
  let D = null; const ubah = {};
  const jumlahUbah = () => Object.keys(ubah).length;
  App.jagaKeluar = () => !jumlahUbah() || confirm('Ada ' + jumlahUbah() + ' nilai belum disimpan. Tinggalkan halaman ini?');
  window.onbeforeunload = () => (jumlahUbah() ? 'Nilai belum disimpan' : undefined);
  const muat = () => pakai(ctx, 'nilai.get', { kelas_id: kelasId }, (d) => { D = d; gambar(); }, { gagal: (r) => { $('#nv', el).innerHTML = '<div class="alert danger">' + ic('xc') + '<div>' + esc(r.message) + '</div></div>'; } });
  const gambar = () => {
    const k = D.kelas, rows = D.rows;
    const terisi = rows.filter((r) => r.akhir > 0).length, kunci = rows.filter((r) => r.terkunci).length;
    $('#nv', el).innerHTML = '<div class="card"><div class="card-b"><div class="row" style="align-items:flex-start;gap:16px;flex-wrap:wrap"><div style="flex:1;min-width:260px"><div class="muted" style="font-size:12.5px">' + esc(k.prodi) + ' · angkatan ' + esc(k.ikut_angkatan) + ' · semester ' + k.smt + ' · ' + esc(labelPeriode(k.periode)) + '</div><h2 style="font-size:20px;margin-top:2px">' + esc(k.mk) + '</h2><div class="row-wrap mt-8"><span class="pill no-dot">' + esc(k.sks) + ' SKS</span><span class="pill no-dot">' + esc(progLabel(k.program)) + '</span><span class="pill no-dot">Rombel ' + esc(k.rombel) + '</span>' +
      (D.klaim.length ? '<span class="pill brand no-dot" title="Diklaim untuk MK PDDIKTI">' + ic('route', 'ic-sm') + ' ' + esc(D.klaim.join(' · ')) + '</span>' : '<a class="pill warn no-dot" href="#/klaim?prodi=' + esc(k.prodi) + '&angkatan=' + esc(k.ikut_angkatan) + '">' + ic('warn', 'ic-sm') + ' Belum diklaim ke MK PDDIKTI</a>') + '</div></div>' +
      '<div class="field" style="width:280px"><label>Dosen pengampu</label><select class="input" id="nv-dosen">' + opsi(App.M.dosen.filter((x) => String(x.aktif) !== '0' || x.id === k.dosen_id).map((x) => ({ v: x.id, t: x.nama })), k.dosen_id, null, '— pilih dosen —') + '</select></div></div>' +
      '<div class="row-wrap mt-12" style="gap:18px"><span><b>' + rows.length + '</b> <span class="muted">peserta</span></span><span><b>' + terisi + '</b> <span class="muted">bernilai</span></span><span><b>' + kunci + '</b> <span class="muted">sudah dilapor (terkunci)</span></span><span id="nv-rata" class="muted"></span></div></div></div>' +
      '<div class="card mt-16"><div class="toolbar"><button class="btn btn-sm" id="nv-tempel">' + ic('paste') + 'Tempel dari Excel</button><button class="btn btn-sm" id="nv-unggah">' + ic('upload') + 'Unggah Excel</button><input type="file" id="nv-file" accept=".xlsx,.xls,.csv" hidden><button class="btn btn-sm" id="nv-templat">' + ic('download') + 'Unduh daftar</button><button class="btn btn-sm" id="nv-peserta">' + ic('users') + 'Peserta</button><span class="spacer"></span><span class="muted" style="font-size:12.5px"><span class="kbd">↑</span><span class="kbd">↓</span>/<span class="kbd">Enter</span> pindah baris · tempel kolom nilai langsung ke sel</span></div>' +
      '<div class="tbl-wrap tall"><table class="sheet" id="nv-grid"><thead><tr><th style="width:44px">No</th><th style="width:130px">NIM</th><th>Nama mahasiswa</th><th style="width:110px">Status</th><th style="width:120px;text-align:right">Nilai akhir</th><th style="width:70px">Huruf</th><th style="width:70px;text-align:right">Indeks</th><th style="width:170px">Lapor PDDIKTI</th></tr></thead><tbody>' +
      rows.map((r, i) => {
        const v = ubah[r.nim] !== undefined ? ubah[r.nim] : r.akhir, sk = skala(parseAngka(v));
        return '<tr data-nim="' + esc(r.nim) + '" class="' + (ubah[r.nim] !== undefined ? 'dirty ' : '') + (r.terkunci ? 'locked ' : '') + (r.status && r.status !== 'Aktif' ? 'off' : '') + '"><td class="center muted">' + (i + 1) + '</td><td class="mono">' + esc(r.nim) + '</td><td>' + esc(r.nama) + '</td><td>' + (r.status && r.status !== 'Aktif' ? pillMhs(r.status) : '') + '</td><td class="cell"><input data-i="' + i + '" value="' + esc(v === null || v === undefined ? '' : String(v).replace('.', ',')) + '" inputmode="decimal" autocomplete="off"></td><td class="h"><b>' + esc(sk.huruf) + '</b></td><td class="num ix">' + fmt2(sk.indeks) + '</td><td>' + (r.terkunci ? '<span class="row gap-4">' + ic('lock', 'ic-sm lock') + '<span class="mono">' + fmt2(r.nilaiLapor) + '</span>' + (r.selisih ? ' <span class="pill s-SX">selisih</span>' : '') + '</span>' : '<span class="soft">–</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="sticky-bar"><span id="nv-status" class="muted"></span><span class="spacer"></span><button class="btn" id="nv-batal">Batalkan perubahan</button><button class="btn btn-primary" id="nv-simpan">' + ic('save') + 'Simpan nilai</button></div></div>';
    statusBar();
    const grid = $('#nv-grid', el), inputs = () => $$('input[data-i]', grid);
    grid.addEventListener('input', (e) => {
      const inp = e.target; if (!inp.dataset.i) return;
      const tr = inp.closest('tr'), nim = tr.dataset.nim, r = D.rows.find((x) => x.nim === nim);
      const n = parseAngka(inp.value);
      if ((n === null && (r.akhir === null || r.akhir === undefined)) || (n !== null && !isNaN(n) && r.akhir !== null && Math.abs(n - r.akhir) < 0.0001)) delete ubah[nim]; else ubah[nim] = inp.value.trim() === '' ? '' : n;
      const sk = skala(n); $('.h', tr).innerHTML = '<b>' + esc(sk.huruf) + '</b>'; $('.ix', tr).textContent = fmt2(sk.indeks);
      tr.classList.toggle('dirty', ubah[nim] !== undefined); tr.classList.toggle('bad', n !== null && (isNaN(n) || n < 0 || n > 100));
      statusBar();
    });
    grid.addEventListener('keydown', (e) => {
      const inp = e.target; if (!inp.dataset.i) return;
      const i = Number(inp.dataset.i), all = inputs();
      if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); if (all[i + 1]) { all[i + 1].focus(); all[i + 1].select(); } }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (all[i - 1]) { all[i - 1].focus(); all[i - 1].select(); } }
    });
    grid.addEventListener('paste', (e) => {
      const inp = e.target; if (!inp.dataset.i) return;
      const teks = (e.clipboardData || window.clipboardData).getData('text');
      const baris = teks.replace(/\r/g, '').split('\n').filter((x, j, a) => !(j === a.length - 1 && x === ''));
      if (baris.length <= 1 && !/\t/.test(teks)) return;               // tempel 1 nilai → perilaku biasa
      e.preventDefault();
      if (baris.some((b) => b.split('\t').length > 1)) { pratinjauTabel(parseTempel(teks), 'tempel'); return; }
      const all = inputs(); let i = Number(inp.dataset.i);
      baris.forEach((b) => { if (all[i]) { all[i].value = b.trim(); all[i].dispatchEvent(new Event('input', { bubbles: true })); } i++; });
      toast(baris.length + ' nilai ditempel mulai baris ' + (Number(inp.dataset.i) + 1) + '. Periksa lalu simpan.', 'info');
    });
    $('#nv-dosen', el).onchange = async (e) => { const r = await api('kelas.simpan', { kelas: { id: kelasId, dosen_id: e.target.value } }); toast(r.success ? 'Dosen diperbarui.' : r.message, r.success ? 'ok' : 'err'); };
    $('#nv-batal', el).onclick = () => { Object.keys(ubah).forEach((k) => delete ubah[k]); gambar(); };
    $('#nv-simpan', el).onclick = (e) => tombolProses(e.currentTarget, simpan);
    $('#nv-tempel', el).onclick = () => modalTempel();
    $('#nv-unggah', el).onclick = () => $('#nv-file', el).click();
    $('#nv-file', el).onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { pratinjauTabel(await bacaFileNilai(f), 'unggah'); } catch (err) { toast(err.message, 'err'); } };
    $('#nv-templat', el).onclick = () => Excel.tulisSederhana('Nilai_' + k.mk.replace(/[^\w]+/g, '_') + '_' + k.ikut_angkatan + '.xlsx', ['No', 'NIM', 'Nama', 'Nilai Akhir'], D.rows.map((r, i) => [i + 1, r.nim, r.nama, r.akhir === null ? '' : r.akhir]), 'Nilai');
    $('#nv-peserta', el).onclick = () => kelolaPeserta();
  };
  const statusBar = () => {
    const n = jumlahUbah(), bad = Object.keys(ubah).filter((k) => ubah[k] !== '' && (isNaN(ubah[k]) || ubah[k] < 0 || ubah[k] > 100)).length;
    const st = $('#nv-status', el); if (!st) return;
    st.innerHTML = n ? '<b style="color:var(--warn)">' + n + ' perubahan belum disimpan</b>' + (bad ? ' · <span style="color:var(--danger)">' + bad + ' nilai tidak valid (0–100)</span>' : '') : 'Semua perubahan tersimpan.';
    const vals = D.rows.map((r) => ubah[r.nim] !== undefined ? ubah[r.nim] : r.akhir).filter((v) => v !== '' && v !== null && !isNaN(v) && v > 0);
    const rt = $('#nv-rata', el); if (rt) rt.textContent = vals.length ? 'rata-rata ' + fmt2(vals.reduce((a, b) => a + Number(b), 0) / vals.length) : '';
  };
  async function simpan(cara) {
    const rows = Object.keys(ubah).map((nim) => ({ nim: nim, akhir: ubah[nim] }));
    if (!rows.length) { toast('Tidak ada perubahan.', 'info'); return; }
    const bad = rows.filter((r) => r.akhir !== '' && (isNaN(r.akhir) || r.akhir < 0 || r.akhir > 100));
    if (bad.length) { toast(bad.length + ' nilai di luar 0–100. Perbaiki dulu.', 'err'); return; }
    const r = await api('nilai.simpan', { kelas_id: kelasId, rows: rows, cara: cara || 'ketik' });
    if (!r.success) { toast(r.message, 'err'); return; }
    Object.keys(ubah).forEach((k) => delete ubah[k]);
    toast(r.message, r.data.selisih ? 'warn' : 'ok', r.data.selisih ? 7000 : 3200);
    const rr = await Store.ambil('nilai.get', { kelas_id: kelasId }, { langsung: true }); if (rr.success && ctx.alive) { D = rr.data; gambar(); }
  }
  /** Tempel blok berisi beberapa kolom → baris {nim, nama, nilai}. */
  function parseTempel(teks) {
    const rows = teks.replace(/\r/g, '').split('\n').filter((x) => x.trim()).map((b) => b.split('\t'));
    let start = 0, cN = -1, cM = -1, cV = -1;
    const h = rows[0].map(normNama);
    if (h.some((x) => /^nim$|^nama|nilai|angka|akhir/.test(x))) { start = 1; cN = h.findIndex((x) => /^nim$|^npm$/.test(x)); cM = h.findIndex((x) => /^nama/.test(x)); cV = h.findIndex((x) => /nilai angka|nilai akhir|^akhir|^angka|^jumlah|^nilai$/.test(x)); }
    const data = rows.slice(start), nimSet = new Set(D.rows.map((r) => r.nim));
    const lebar = Math.max(...data.map((r) => r.length));
    if (cN < 0) for (let c = 0; c < lebar; c++) if (data.filter((r) => nimSet.has(String(r[c] || '').trim())).length >= Math.max(1, data.length / 3)) { cN = c; break; }
    if (cM < 0) for (let c = 0; c < lebar; c++) if (c !== cN && data.filter((r) => /[a-z]{3,}/i.test(r[c] || '') && isNaN(parseAngka(r[c]))).length >= data.length / 2) { cM = c; break; }
    if (cV < 0) for (let c = lebar - 1; c >= 0; c--) if (c !== cN && c !== cM && data.filter((r) => { const n = parseAngka(r[c]); return n !== null && !isNaN(n); }).length >= data.length / 2) { cV = c; break; }
    if (cV < 0) throw new Error('Kolom nilai tidak terdeteksi.');
    return data.map((r) => ({ nim: cN > -1 ? String(r[cN] || '').trim() : '', nama: cM > -1 ? String(r[cM] || '').trim() : '', nilai: r[cV] }));
  }
  async function bacaFileNilai(file) {
    const wb = await Excel.baca(file);
    for (const nm of wb.SheetNames) {
      const a = await Excel.baris(wb, nm);
      const hi = Excel.cariHeader(a, [/^nim$|^npm$/, /^nama/, /nilai|angka|akhir|jumlah/], 60);
      if (hi < 0) continue;
      const h = a[hi].map(normNama), col = (res) => { for (const re of res) { const i = h.findIndex((x) => re.test(x)); if (i > -1) return i; } return -1; };
      const cN = col([/^nim$|^npm$/]), cM = col([/^nama/]), cV = col([/nilai angka/, /nilai akhir/, /^akhir$/, /^angka$/, /^jumlah$/, /^nilai$/, /nilai/]);
      if (cV < 0 || (cN < 0 && cM < 0)) continue;
      return a.slice(hi + 1).filter((r) => (cN > -1 && String(r[cN]).trim()) || (cM > -1 && String(r[cM]).trim())).map((r) => ({ nim: cN > -1 ? String(r[cN]).trim() : '', nama: cM > -1 ? String(r[cM]).trim() : '', nilai: r[cV] }));
    }
    throw new Error('Tidak menemukan tabel ber-judul NIM/Nama dan Nilai di file ini.');
  }
  function modalTempel() {
    modal({ judul: 'Tempel nilai dari Excel', lebar: 'lebar', desc: 'Salin blok dari Excel (kolom NIM dan/atau Nama + Nilai, boleh beserta judul kolom) lalu tempel di bawah. Urutan baris tidak berpengaruh.',
      isi: '<textarea class="input mono" id="tp-isi" style="min-height:260px" placeholder="NIM&#9;Nama&#9;Nilai&#10;24212001&#9;Ahmad&#9;87,5"></textarea>',
      tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Lanjut ke pratinjau', kelas: 'btn-primary', aksi: (close, m) => { try { const rows = parseTempel($('#tp-isi', m).value); close(); pratinjauTabel(rows, 'tempel'); } catch (e) { toast(e.message, 'err'); } return false; } }] });
  }
  function pratinjauTabel(masuk, cara) {
    const c = cocokkanPeserta(D.rows, masuk);
    const H = c.hasil;
    const label = { nim: 'Cocok via NIM', nama: 'Cocok via nama', ragu: 'Nama ganda — pilih', tidak: 'Tidak ditemukan — pilih' };
    const hit = (j) => H.filter((x) => x.jenis === j && !x.tolak).length;
    const md = modal({ judul: 'Pratinjau ' + (cara === 'unggah' ? 'unggahan' : 'tempelan') + ' · ' + H.length + ' baris', lebar: 'sangat-lebar',
      isi: '<div class="row-wrap mb-12"><span class="pill" style="background:#DCFCE7;color:#166534">' + hit('nim') + ' cocok NIM</span><span class="pill info">' + hit('nama') + ' cocok nama</span><span class="pill warn">' + (hit('ragu') + hit('tidak')) + ' perlu dipilih</span><span class="pill danger">' + H.filter((x) => x.tolak).length + ' ditolak (di luar 0–100)</span><span class="pill">' + H.filter((x) => x.p && x.p.status && x.p.status !== 'Aktif').length + ' cuti/mundur</span>' + (H.some((x) => x.ganda) ? '<span class="pill danger">ada NIM dobel di file</span>' : '') + '</div>' +
        '<div class="tbl-wrap" style="max-height:52vh"><table class="tbl tbl-compact"><thead><tr><th>NIM di file</th><th>Nama di file</th><th class="num">Nilai</th><th>Hasil</th><th>Peserta kelas</th></tr></thead><tbody>' +
        H.map((x, i) => {
          const kelas = x.tolak ? 'r-tolak' : x.jenis === 'nim' ? 'r-nim' : x.jenis === 'nama' ? 'r-nama' : 'r-ragu';
          const pilihan = (x.pilihan.length ? x.pilihan : D.rows);
          return '<tr class="' + (x.p && x.p.status !== 'Aktif' && x.p.status ? 'r-off' : kelas) + '"><td class="mono">' + esc(x.nimFile) + '</td><td>' + esc(x.namaFile) + '</td><td class="num">' + esc(x.nilaiFile) + '</td><td>' + (x.tolak ? '<b style="color:var(--danger)">Nilai di luar 0–100</b>' : esc(label[x.jenis])) + (x.ganda ? ' <span class="pill danger">dobel</span>' : '') + '</td><td>' +
            (x.jenis === 'nim' || x.jenis === 'nama' ? esc(x.p.nim + ' · ' + x.p.nama) + (x.p.status && x.p.status !== 'Aktif' ? ' ' + pillMhs(x.p.status) : '') : '<select class="input input-sm" data-i="' + i + '"><option value="">— lewati —</option>' + pilihan.map((p) => '<option value="' + esc(p.nim) + '">' + esc(p.nim + ' · ' + p.nama) + '</option>').join('') + '</select>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (c.tanpaNilai.length ? '<div class="alert warn mt-12">' + ic('warn') + '<div><b>' + c.tanpaNilai.length + ' peserta tidak ada di file</b> (nilainya tidak diubah): ' + c.tanpaNilai.slice(0, 15).map((p) => esc(p.nama)).join(', ') + (c.tanpaNilai.length > 15 ? ', …' : '') + '</div></div>' : ''),
      tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Terapkan ke tabel', aksi: (close, m) => { terapkan(m); return true; } }, { teks: 'Terapkan & simpan', kelas: 'btn-primary', ikon: 'save', aksi: async (close, m) => { terapkan(m); close(); await simpan(cara); return false; } }] });
    function terapkan(m) {
      $$('select[data-i]', m).forEach((s) => { const x = H[Number(s.dataset.i)]; x.p = s.value ? D.rows.find((p) => p.nim === s.value) : null; });
      let n = 0;
      H.forEach((x) => { if (!x.p || x.tolak || x.nilai === null) return; const r = x.p; if (r.akhir === null || r.akhir === undefined || Math.abs(r.akhir - x.nilai) > 0.0001) { ubah[r.nim] = x.nilai; n++; } });
      gambar(); toast(n + ' nilai diterapkan ke tabel' + (n ? '. Periksa lalu klik Simpan.' : ' (tidak ada perubahan).'), n ? 'info' : 'warn');
    }
    return md;
  }
  async function kelolaPeserta() {
    const md = modal({ judul: 'Peserta kelas', lebar: 'lebar', desc: 'Tambah mahasiswa (mis. mengulang/pindahan) atau keluarkan peserta yang belum bernilai.',
      isi: '<div class="row mb-12"><div class="search" style="flex:1">' + ic('search') + '<input class="input" id="ps-q" placeholder="Cari NIM / nama mahasiswa untuk ditambahkan…"></div></div><div id="ps-cari" class="mb-12"></div><div class="tbl-wrap" style="max-height:44vh"><table class="tbl tbl-compact"><thead><tr><th>NIM</th><th>Nama</th><th class="num">Nilai</th><th></th></tr></thead><tbody id="ps-list"></tbody></table></div>',
      tombol: [{ teks: 'Tutup', aksi: () => true }] });
    const isi = () => { $('#ps-list', md.el).innerHTML = D.rows.map((r) => '<tr><td class="mono">' + esc(r.nim) + '</td><td>' + esc(r.nama) + '</td><td class="num">' + fmt2(r.akhir) + '</td><td class="aksi">' + (r.akhir > 0 ? '<span class="muted" style="font-size:12px">bernilai</span>' : '<button class="btn btn-xs" data-hapus="' + esc(r.nim) + '">' + ic('minus', 'ic-sm') + 'Keluarkan</button>') + '</td></tr>').join(''); };
    isi();
    const ml = await Store.get('mhs.list', {}, 120000);
    const ada = new Set(D.rows.map((r) => r.nim));
    $('#ps-q', md.el).oninput = debounce((e) => {
      const q = normNama(e.target.value); if (q.length < 2) { $('#ps-cari', md.el).innerHTML = ''; return; }
      const hasil = (ml.data || []).filter((m) => !ada.has(m.nim) && normNama(m.nim + ' ' + m.nama).indexOf(q) > -1).slice(0, 8);
      $('#ps-cari', md.el).innerHTML = hasil.length ? '<ul class="list-plain card" style="padding:4px 12px">' + hasil.map((m) => '<li><span class="mono">' + esc(m.nim) + '</span><span style="flex:1">' + esc(m.nama) + ' <span class="muted">· ' + esc(m.prodi + ' ' + m.ikut_angkatan) + '</span></span>' + pillMhs(m.status) + '<button class="btn btn-xs btn-soft" data-tambah="' + esc(m.nim) + '">' + ic('plus', 'ic-sm') + 'Tambah</button></li>').join('') + '</ul>' : '<div class="muted">Tidak ditemukan.</div>';
    }, 150);
    md.el.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-tambah]'), h = e.target.closest('[data-hapus]');
      if (!t && !h) return;
      const r = await api('kelas.peserta', { kelas_id: kelasId, tambah: t ? [t.dataset.tambah] : [], hapus: h ? [h.dataset.hapus] : [] });
      toast(r.message, r.success ? 'ok' : 'err');
      if (r.success) { const rr = await Store.ambil('nilai.get', { kelas_id: kelasId }, { langsung: true }); if (rr.success) { D = rr.data; ada.clear(); D.rows.forEach((x) => ada.add(x.nim)); isi(); gambar(); $('#ps-cari', md.el).innerHTML = ''; $('#ps-q', md.el).value = ''; } }
    });
  }
  muat();
}

/* ============================================================== PETA KLAIM */
Hal.klaim = {
  render(el, ctx, p, q) {
    const f = Object.assign({ prodi: (App.prodi().find((x) => x.kode === 'HES') || App.prodi()[0] || {}).kode, angk: String(App.periodeAktif).slice(0, 4) }, App.ingat('klaim') || {}, q.prodi ? { prodi: q.prodi } : {}, q.angkatan ? { angk: q.angkatan } : {});
    el.innerHTML = '<div class="page-head"><div><h2>Peta klaim</h2><div class="desc">Tentukan nilai MK riil mana yang dipakai untuk tiap MK PDDIKTI, dan kapan dilaporkan.</div></div><span class="spacer"></span><button class="btn" id="pk-salin">' + ic('copy') + 'Salin dari angkatan lain</button></div>' +
      '<div class="card"><div class="toolbar"><select class="input" id="pk-prodi">' + opsi(App.prodi().map((x) => ({ v: x.kode, t: x.kode + ' — ' + x.nama })), f.prodi) + '</select><select class="input" id="pk-angk">' + opsi(App.angkatanList(), f.angk, (a) => 'Angkatan ' + a) + '</select><div class="search" style="width:220px">' + ic('search') + '<input class="input" id="pk-q" placeholder="Cari MK…"></div><select class="input" id="pk-f">' + opsi([{ v: 'bp', t: 'Belum dipetakan' }, { v: 'warn', t: 'Ada peringatan' }, { v: 'kunci', t: 'Terkunci (sudah dilapor)' }], '', null, 'Semua MK') + '</select><span class="spacer"></span><span class="muted" id="pk-info"></span></div><div id="pk-isi">' + skelTabel(10) + '</div></div>' +
      '<div class="grid g2 mt-16"><div class="card"><div class="card-h"><h3>Nilai riil belum diklaim</h3><span class="spacer"></span><span class="muted" style="font-size:12.5px">MK riil bernilai yang belum dipakai MK PDDIKTI mana pun</span></div><div class="card-b" id="pk-un"></div></div><div class="card"><div class="card-h"><h3>Cara kerja</h3></div><div class="card-b"><ul class="list-plain"><li>' + ic('route', 'ic-sm') + '<span><b>Sumber</b> berurutan: nilai pertama yang ada dipakai (sumber 2 cadangan bila sumber 1 kosong).</span></li><li>' + ic('cal', 'ic-sm') + '<span><b>Periode lapor</b> boleh berbeda dari semester ajar (dilapor semester depan) — wajib alasan.</span></li><li>' + ic('lock', 'ic-sm') + '<span>Setelah ada nilai yang dilapor, sumber & periode MK itu terkunci.</span></li></ul></div></div></div>';
    let K = null;
    const muat = () => {
      f.prodi = $('#pk-prodi', el).value; f.angk = $('#pk-angk', el).value; App.ingat('klaim', f);
      $('#pk-isi', el).innerHTML = skelTabel(10);
      pakai(ctx, 'klaim.get', { prodi: f.prodi, angkatan: f.angk }, (d) => { K = d; gambar(); });
    };
    const mr = () => { const m = {}; (K.mkriil || []).forEach((x) => { m[x.id] = x; }); return m; };
    const peringatan = (k, pk) => {
      const w = [], M = mr();
      if (pk && pk.periode && k.smt && smtDari(f.angk, pk.periode) !== k.smt) w.push('semester lapor ≠ sebaran');
      if (pk && pk.sumber && pk.sumber[0] && M[pk.sumber[0]] && Number(M[pk.sumber[0]].sks) !== Number(k.sks)) w.push('SKS berbeda');
      if (pk && pk.sumber) { const dipakai = {}; Object.keys(K.peta).forEach((id) => (K.peta[id].sumber || []).forEach((s) => { dipakai[s] = (dipakai[s] || 0) + 1; })); if (pk.sumber.some((s) => dipakai[s] > 1)) w.push('MK riil dipakai >1 MK'); }
      return w;
    };
    const gambar = () => {
      const M = mr(), kunciKe = (id) => K.ringkas[id] && (K.ringkas[id].SD + K.ringkas[id].SX) > 0;
      const qv = normNama($('#pk-q', el).value), fv = $('#pk-f', el).value;
      const rows = K.kur.filter((k) => {
        const pk = K.peta[k.id];
        if (qv && normNama(k.kode + ' ' + k.nama).indexOf(qv) < 0) return false;
        if (fv === 'bp') return !pk || !pk.sumber.length || !pk.periode;
        if (fv === 'warn') return peringatan(k, pk).length > 0;
        if (fv === 'kunci') return kunciKe(k.id);
        return true;
      });
      const bp = K.kur.filter((k) => { const pk = K.peta[k.id]; return !pk || !pk.sumber.length || !pk.periode; }).length;
      $('#pk-info', el).innerHTML = K.jumlahMhs + ' mahasiswa · ' + K.kur.length + ' MK · <b style="color:' + (bp ? 'var(--s-MN)' : 'var(--ok)') + '">' + bp + ' belum dipetakan</b>';
      $('#pk-isi', el).innerHTML = !K.kur.length ? kosong('Kurikulum belum ada', 'Isi kurikulum prodi ini (menu Kurikulum).', 'book') : '<div class="tbl-wrap tall"><table class="tbl tbl-compact"><thead><tr><th>Smt</th><th>Kode</th><th>MK PDDIKTI</th><th class="num">SKS</th><th>Sumber nilai (MK riil)</th><th>Periode lapor</th><th style="width:150px">Status</th><th></th></tr></thead><tbody>' +
        rows.map((k) => {
          const pk = K.peta[k.id], w = peringatan(k, pk), kunci = kunciKe(k.id), rk = K.ringkas[k.id] || {};
          return '<tr class="klik" data-mk="' + esc(k.id) + '"><td class="center">' + k.smt + '</td><td class="mono nowrap">' + esc(k.kode) + '</td><td>' + esc(k.nama) + (k.jenis ? ' <span class="pill no-dot brand">' + esc(k.jenis) + '</span>' : '') + (w.length ? '<div class="row-wrap mt-4">' + w.map((x) => '<span class="pill warn">' + esc(x) + '</span>').join('') + '</div>' : '') + (pk && pk.alasan ? '<div class="sub mt-4">' + ic('info', 'ic-sm') + ' ' + esc(pk.alasan) + '</div>' : '') + '</td><td class="num">' + k.sks + '</td>' +
            '<td>' + (pk && pk.sumber.length ? pk.sumber.map((s, i) => '<div class="chip mb-8" style="margin:1px 0"><b>' + (i + 1) + '</b>' + esc((M[s] || {}).nama_mk || '(MK riil dihapus)') + ' <span class="muted">' + esc((M[s] || {}).sks || '') + ' sks</span></div>').join('<br>') : '<span class="pill s-BP">belum dipetakan</span>') + '</td>' +
            '<td class="nowrap">' + (pk && pk.periode ? esc(labelPeriode(pk.periode)) + '<div class="sub">smt ' + smtDari(f.angk, pk.periode) + '</div>' : '<span class="soft">–</span>') + '</td><td>' + statbar(rk) + '<div class="sub mt-4 nowrap">' + (rk.SD || 0) + ' lapor · ' + (rk.SL || 0) + ' siap · ' + (rk.MN || 0) + ' tunggu</div></td><td class="aksi">' + (kunci ? ic('lock', 'ic-sm lock') : '<button class="btn btn-xs" data-ubah>' + ic('edit', 'ic-sm') + 'Atur</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      $('#pk-un', el).innerHTML = K.unclaimed.length ? '<ul class="list-plain">' + K.unclaimed.map((u) => '<li><span style="flex:1"><b style="font-weight:600">' + esc(u.nama) + '</b> <span class="muted">· smt ' + esc(u.smt) + ' · ' + esc(progLabel(u.program)) + ' · ' + esc(u.sks) + ' sks</span></span><span class="pill info">' + u.jumlah + ' mhs bernilai</span></li>').join('') + '</ul>' : '<div class="muted">' + ic('checkc', 'ic-sm') + ' Semua nilai riil sudah diklaim.</div>';
    };
    $('#pk-isi', el).addEventListener('click', (e) => { const tr = e.target.closest('tr[data-mk]'); if (!tr || !K) return; aturMk(K.kur.find((k) => k.id === tr.dataset.mk)); });
    const aturMk = (k) => {
      const pk = K.peta[k.id] || { sumber: [], periode: '', alasan: '' }, rk = K.ringkas[k.id] || {}, kunci = (rk.SD || 0) + (rk.SX || 0) > 0;
      let sumber = pk.sumber.slice();
      const riil = (K.mkriil || []).slice().sort((a, b) => Number(a.smt_ajar) - Number(b.smt_ajar) || String(a.nama_mk).localeCompare(b.nama_mk));
      const periodeOps = []; for (let s = 1; s <= 14; s++) periodeOps.push({ v: periodeDari(f.angk, s), t: 'Smt ' + s + ' · ' + labelPeriode(periodeDari(f.angk, s)) });
      const md = modal({ judul: k.kode + ' · ' + k.nama, desc: f.prodi + ' angkatan ' + f.angk + ' · ' + k.sks + ' SKS · sebaran semester ' + k.smt, lebar: 'lebar',
        isi: (kunci ? '<div class="alert warn mb-12">' + ic('lock') + '<div>Sudah ada ' + (rk.SD + (rk.SX || 0)) + ' nilai yang dilapor untuk MK ini — sumber & periode tidak bisa diubah. Alasan masih bisa diperbarui.</div></div>' : '') +
          '<div class="field mb-12"><label>Sumber nilai (berurutan prioritas)</label><div id="am-sumber"></div><button class="btn btn-sm mt-8" id="am-tambah" ' + (kunci ? 'disabled' : '') + '>' + ic('plus', 'ic-sm') + 'Tambah sumber cadangan</button></div>' +
          '<div class="fgrid"><div class="field"><label>Periode lapor</label><select class="input" id="am-periode" ' + (kunci ? 'disabled' : '') + '>' + opsi(periodeOps, pk.periode || periodeDari(f.angk, k.smt || 1), null, '— belum ditentukan —') + '</select></div><div class="field"><label>Peringatan</label><div id="am-warn" class="row-wrap" style="min-height:36px"></div></div><div class="field full"><label id="am-alasan-l">Alasan / catatan</label><textarea class="input" id="am-alasan" placeholder="mis. MK diajarkan smt 5, dilapor smt 6 sesuai kurikulum">' + esc(pk.alasan || '') + '</textarea></div></div>',
        tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan aturan', kelas: 'btn-primary', ikon: 'save', aksi: async (close, m) => {
          const row = { mk_id: k.id, sumber: sumber.filter(Boolean), periode: $('#am-periode', m).value, alasan: $('#am-alasan', m).value.trim() };
          const r = await api('klaim.simpan', { prodi: f.prodi, angkatan: f.angk, rows: [row] });
          if (!r.success) { toast(r.message, 'err'); return false; }
          if (r.data.ditolak.length) { toast(r.data.ditolak.map((x) => x.mk + ': ' + x.pesan).join(' · '), 'err', 7000); return false; }
          toast('Aturan klaim tersimpan.'); muat(); return true;
        } }] });
      const m = md.el;
      const gambarSumber = () => {
        $('#am-sumber', m).innerHTML = (sumber.length ? sumber : ['']).map((s, i) => '<div class="row mb-8"><span class="badge soft">' + (i + 1) + '</span><select class="input" data-s="' + i + '" ' + (kunci ? 'disabled' : '') + '>' + opsi(riil.map((x) => ({ v: x.id, t: 'Smt ' + (x.smt_ajar || '?') + ' · ' + x.nama_mk + ' · ' + x.sks + ' sks · ' + progLabel(x.program) })), s, null, '— pilih MK riil —') + '</select>' + (kunci ? '' : '<button class="btn btn-sm btn-icon" data-up="' + i + '" title="Naikkan">' + ic('arrowud', 'ic-sm') + '</button><button class="btn btn-sm btn-icon" data-del="' + i + '" title="Hapus">' + ic('trash', 'ic-sm') + '</button>') + '</div>').join('');
        cekW();
      };
      const cekW = () => { const w = peringatan(k, { sumber: sumber.filter(Boolean), periode: $('#am-periode', m).value }); $('#am-warn', m).innerHTML = w.length ? w.map((x) => '<span class="pill warn">' + esc(x) + '</span>').join('') : '<span class="pill s-SD">sesuai</span>'; $('#am-alasan-l', m).className = w.length ? 'req' : ''; };
      m.addEventListener('change', (e) => { if (e.target.dataset.s !== undefined) { sumber[Number(e.target.dataset.s)] = e.target.value; cekW(); } if (e.target.id === 'am-periode') cekW(); });
      m.addEventListener('click', (e) => {
        const up = e.target.closest('[data-up]'), del = e.target.closest('[data-del]');
        if (up) { const i = Number(up.dataset.up); if (i > 0) { const t = sumber[i - 1]; sumber[i - 1] = sumber[i]; sumber[i] = t; gambarSumber(); } }
        if (del) { sumber.splice(Number(del.dataset.del), 1); gambarSumber(); }
      });
      $('#am-tambah', m).onclick = () => { sumber.push(''); gambarSumber(); };
      if (!sumber.length) { const cocok = riil.find((x) => normNama(x.nama_mk) === normNama(k.nama)); if (cocok) sumber = [cocok.id]; }
      gambarSumber();
    };
    $('#pk-prodi', el).onchange = muat; $('#pk-angk', el).onchange = muat;
    $('#pk-q', el).oninput = debounce(() => K && gambar(), 150); $('#pk-f', el).onchange = () => K && gambar();
    $('#pk-salin', el).onclick = () => {
      if (!K) return;
      const lain = K.angkatanLain.length ? K.angkatanLain : App.angkatanList().filter((a) => a !== f.angk);
      modal({ judul: 'Salin peta klaim ke angkatan ' + f.angk, desc: 'Periode lapor digeser otomatis sesuai selisih tahun angkatan. MK yang sudah dilapor tidak disentuh.',
        isi: '<div class="field mb-12"><label>Salin dari angkatan</label><select class="input" id="sl-dari">' + opsi(lain, lain[0]) + '</select></div><label class="check mb-8"><input type="checkbox" id="sl-timpa">Timpa aturan yang sudah ada di angkatan ' + esc(f.angk) + '</label><br><label class="check"><input type="checkbox" id="sl-alasan" checked>Ikut salin alasan</label>',
        tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Salin', kelas: 'btn-primary', ikon: 'copy', aksi: async (close, m) => {
          const r = await api('klaim.salin', { prodi: f.prodi, dari: $('#sl-dari', m).value, ke: f.angk, timpa: $('#sl-timpa', m).checked, salinAlasan: $('#sl-alasan', m).checked });
          toast(r.message, r.success ? 'ok' : 'err'); if (r.success) muat(); return r.success;
        } }] });
    };
    muat();
  }
};
