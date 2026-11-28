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
  prefetch() { prefetch('kelas.list', { periode: App.periode }); prefetch('mhs.list', {}); },
  judul: (p) => p[1] === 'rekap' ? 'Rekap nilai per angkatan' : p[1] ? 'Input nilai' : 'Perkuliahan & Nilai',   // p = rute lengkap ['perkuliahan', …]
  render(el, ctx, p, q) {
    if (p[0] === 'rekap') return HalRekap(el, ctx, q || {});          // v1.1
    if (p[0]) return HalNilai(el, ctx, p[0]);
    if (q && q.tampil === 'tabel') return HalKelasTabel(el, ctx);     // tampilan tabel (v1.0)
    return HalKelasKartu(el, ctx, q || {});                           // v1.2: kotak Angkatan → Prodi → Kelas
  }
};

/* ==========================================================================
   v1.2 — PERKULIAHAN & NILAI TAMPILAN KOTAK: ① Angkatan → ② Program Studi → ③ Kelas
   #/perkuliahan · ?angkatan=2024 · ?angkatan=2024&prodi=HES · ?arsip=1 (angkatan lampau)
   ========================================================================== */
const ROMAWI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
function HalKelasKartu(el, ctx, q) {
  const angk = q.angkatan || '', prodi = q.prodi || '', arsip = q.arsip === '1' && !angk;
  const qs = [angk ? 'angkatan=' + encodeURIComponent(angk) : '', prodi ? 'prodi=' + encodeURIComponent(prodi) : '', arsip ? 'arsip=1' : ''].filter(Boolean).join('&');
  App.ingat('kls_rute', '/perkuliahan' + (qs ? '?' + qs : ''));
  const langkah = angk && prodi ? 3 : angk ? 2 : 1;
  const per = String(App.periode), jenis = per.slice(-1) === '1' ? 'Ganjil' : 'Genap', th = Number(per.slice(0, 4));
  const smt = (a) => smtDari(a, per), tingkat = (s) => ROMAWI[Math.ceil(s / 2)] || String(Math.ceil(s / 2));
  const prodiNama = (k) => (App.prodi().find((x) => x.kode === k) || {}).nama || k;
  const keAngk = (a) => '#/perkuliahan?angkatan=' + encodeURIComponent(a);
  const crumb = ['<a href="#/perkuliahan">Perkuliahan</a>'].concat(arsip ? ['<span>Arsip angkatan lampau</span>'] : [])
    .concat(angk ? [prodi ? '<a href="' + keAngk(angk) + '">Angkatan ' + esc(angk) + '</a>' : '<span>Angkatan ' + esc(angk) + '</span>'] : []).concat(prodi ? ['<span>' + esc(prodi) + '</span>'] : []);
  const stepper = [['Angkatan', '#/perkuliahan'], ['Program Studi', angk ? keAngk(angk) : ''], ['Kelas', '']].map((x, i) => {
    const n = i + 1, st = n < langkah ? 'done' : n === langkah ? 'on' : '', isi = '<b>' + (n < langkah ? ic('check', 'ic-sm') : n) + '</b><span>' + x[0] + '</span>';
    return (i ? '<i></i>' : '') + (n < langkah && x[1] ? '<a class="st ' + st + '" href="' + x[1] + '">' + isi + '</a>' : '<span class="st ' + st + '">' + isi + '</span>');
  }).join('');
  el.innerHTML = '<div id="kk"><div class="page-head"><div style="flex:1;min-width:260px"><div class="kk-crumb">' + crumb.join('<span class="sep">›</span>') + '</div><h2>Perkuliahan &amp; Nilai</h2><div class="desc">Pilih angkatan, lalu program studi, lalu kelas untuk mengisi nilai.</div></div>' +
    '<div class="stepper">' + stepper + '</div><button class="btn" id="kk-tabel" title="Semua kelas periode ini dalam satu tabel">' + ic('list') + 'Tampilan tabel</button></div>' +
    '<div class="card kk-periode"><div style="min-width:0"><div class="kk-label">Periode yang sedang dikerjakan</div><div class="row" style="gap:10px;flex-wrap:wrap"><span class="kk-ta">T.A. ' + th + '/' + (th + 1) + '</span><span class="pill no-dot kk-jenis">' + jenis.toUpperCase() + '</span>' +
    (per === String(App.periodeAktif) ? '<span class="pill st-Aktif">periode aktif</span>' : '<span class="pill no-dot">bukan periode aktif</span>') + '</div><div class="muted mt-4">Kelas dan nilai di halaman ini milik periode ' + esc(labelPeriode(per)) + '. Ganti periode lewat pilihan di kanan atas.</div></div><span class="spacer"></span><div class="kk-ring" id="kk-ring"></div><button class="btn btn-sm" id="kk-per">' + ic('cal', 'ic-sm') + 'Ubah periode</button></div>' +
    '<div class="card kk-aksi"><div class="kk-ikon">' + ic('layers') + '</div><div style="flex:1;min-width:240px"><b>Buat &amp; kelola kelas</b><div class="muted">Kelas otomatis disusun dari MK riil yang semester ajarnya cocok. Untuk mahasiswa yang sudah lulus tanpa MK riil, pakai <b>Kelas PDDIKTI</b> — atau <b>Unggah nilai</b> dari file nilai per mahasiswa.</div></div>' +
    '<div class="row-wrap"><button class="btn" id="k-rekap" title="Mata kuliah apa saja yang sudah/belum bernilai di satu angkatan">' + ic('layers') + 'Rekap angkatan</button><button class="btn" id="k-pddikti" title="Kelas langsung dari MK kurikulum PDDIKTI, tanpa MK riil">' + ic('lapor') + 'Kelas PDDIKTI</button><button class="btn" id="k-unggah" title="File nilai per mahasiswa (transkrip/KHS, satu sheet = satu mahasiswa) → nilai masuk ke semua mata kuliah yang sesuai">' + ic('upload') + 'Unggah nilai (Excel)</button><button class="btn" id="k-tambah">' + ic('plus') + 'Tambah kelas</button><button class="btn btn-primary" id="k-gen">' + ic('spark') + 'Buat kelas otomatis</button></div></div>' +
    '<div class="row kk-sec"><h3 id="kk-judul"></h3><span class="pill no-dot" id="kk-jml"></span><span class="spacer"></span><span id="kk-alat" class="row" style="gap:8px"></span></div><div class="kk-grid" id="kk-isi">' + '<div class="k-card skel" style="height:300px"></div>'.repeat(4) + '</div></div>';
  const root = $('#kk', el);                                         // pendengar dipasang di elemen halaman (bukan #konten yang dipakai ulang)
  let K = null, M = null;
  const kelasDari = (a, p) => (K || []).filter((k) => String(k.ikut_angkatan) === String(a) && (!p || k.prodi === p));
  const mhsDari = (a, p) => (M || []).filter((m) => String(m.ikut_angkatan) === String(a) && (!p || m.prodi === p));
  const jumlah = (ks) => ({ pes: ks.reduce((s, k) => s + Number(k.peserta || 0), 0), isi: ks.reduce((s, k) => s + Number(k.terisi || 0), 0) });
  const pillIsi = (isi, pes) => !pes ? '<span class="pill no-dot">–</span>' : isi >= pes ? '<span class="pill s-SD">Lengkap</span>' : !isi ? '<span class="pill s-MN">Belum diisi</span>' : '<span class="pill s-SL">' + Math.floor(isi / pes * 100) + '%</span>';
  const bar = (isi, pes) => pes ? '<div class="progress"><i style="width:' + Math.round(isi / pes * 100) + '%;' + (isi >= pes ? '' : 'background:var(--s-SL)') + '"></i></div>' : '';
  const r = (label, nilai) => '<div class="r"><span>' + label + '</span><b>' + nilai + '</b></div>';
  const kartuAngkatan = (a) => {
    const ks = kelasDari(a), s = smt(a), j = jumlah(ks), ms = mhsDari(a), akt = ms.filter((m) => m.status === 'Aktif').length;
    return '<div class="k-card" data-angk="' + esc(a) + '"><div class="row"><span class="k-tag">Semester ' + s + ' (' + jenis + ')</span><span class="spacer"></span>' + (ks.length ? '<span class="pill st-Aktif">Aktif</span>' : '<span class="pill no-dot" title="Belum ada kelas di periode ini">Kosong</span>') + '</div>' +
      '<div class="k-tahun">' + esc(a) + '</div><div class="k-sub">Tahun masuk ' + esc(a) + ' · Tingkat ' + tingkat(s) + '</div>' +
      '<div class="k-box">' + r('Kelas', ks.length + ' kelas · ' + unikk(ks.map((k) => k.prodi)).length + ' prodi') + r('Mahasiswa aktif', fmtInt(akt)) + r('Nilai terisi', fmtInt(j.isi) + ' / ' + fmtInt(j.pes) + ' ' + pillIsi(j.isi, j.pes)) + bar(j.isi, j.pes) + '</div>' +
      '<a class="btn btn-primary btn-blok" href="' + keAngk(a) + '">Kelola kelas ' + ic('next', 'ic-sm') + '</a></div>';
  };
  const kartuArsip = (a) => {
    const s = smt(a), ms = mhsDari(a), lulus = ms.filter((m) => m.status === 'Lulus').length, belum = ms.filter((m) => ['Aktif', 'Cuti', 'Non-aktif'].includes(m.status)).length, ks = kelasDari(a);
    return '<div class="k-card" data-angk="' + esc(a) + '"><div class="row"><span class="k-tag abu">Lewat 8 semester</span><span class="spacer"></span><span class="pill no-dot">smt ' + s + '</span></div>' +
      '<div class="k-tahun">' + esc(a) + '</div><div class="k-sub">Tahun masuk ' + esc(a) + ' · ' + fmtInt(ms.length) + ' mahasiswa</div>' +
      '<div class="k-box">' + r('Lulus', fmtInt(lulus)) + r('Belum ditandai lulus', belum ? '<span style="color:var(--warn)">' + fmtInt(belum) + '</span>' : '0') + r('Kelas periode ini', ks.length) + '</div>' +
      '<div class="row-wrap" style="gap:4px">' + (belum && typeof tandaiLulus === 'function' ? '<button class="btn btn-sm btn-ghost" data-lulus="' + esc(a) + '">' + ic('lulus', 'ic-sm') + 'Tandai lulus…</button>' : '') +
      '<button class="btn btn-sm btn-ghost" data-unm="' + esc(a) + '" title="Unggah file nilai per mahasiswa (transkrip/KHS)">' + ic('upload', 'ic-sm') + 'Unggah nilai…</button></div>' +
      '<div class="row k-dua"><button class="btn btn-blok" data-rekap="' + esc(a) + '">' + ic('layers', 'ic-sm') + 'Rekap nilai</button><button class="btn btn-primary btn-blok" data-pdk="' + esc(a) + '">' + ic('lapor', 'ic-sm') + 'Kelas PDDIKTI</button></div>' +
      '<a class="kk-link" href="' + keAngk(a) + '">Lihat kelas per prodi ' + ic('next', 'ic-sm') + '</a></div>';
  };
  const kartuProdi = (p) => {
    const ks = kelasDari(angk, p.kode), j = jumlah(ks), ms = mhsDari(angk, p.kode), akt = ms.filter((m) => m.status === 'Aktif').length, lulus = ms.filter((m) => m.status === 'Lulus').length;
    const prog = unikk(ks.map((k) => progLabel(k.program)));
    return '<div class="k-card" data-prodi="' + esc(p.kode) + '"><div class="row"><span class="k-tag">' + esc(p.kode) + '</span><span class="spacer"></span>' + (ks.length ? '<span class="pill st-Aktif">' + ks.length + ' kelas</span>' : '<span class="pill no-dot">Belum ada kelas</span>') + '</div>' +
      '<div class="k-prodi">' + esc(p.nama) + '</div><div class="k-sub">' + esc(prog.join(' · ') || 'Angkatan ' + angk + ' · semester ' + smt(angk)) + '</div>' +
      '<div class="k-box">' + r('Kelas', ks.length + ' kelas') + r('Mahasiswa aktif', fmtInt(akt) + (lulus ? ' <span class="sub">· ' + fmtInt(lulus) + ' lulus</span>' : '')) + r('Nilai terisi', fmtInt(j.isi) + ' / ' + fmtInt(j.pes) + ' ' + pillIsi(j.isi, j.pes)) + bar(j.isi, j.pes) + '</div>' +
      '<a class="btn btn-primary btn-blok" href="' + keAngk(angk) + '&prodi=' + encodeURIComponent(p.kode) + '">Lihat kelas ' + ic('next', 'ic-sm') + '</a></div>';
  };
  const yatimK = (k) => k.mk === '(MK dihapus)';                                      // v1.4: MK riil kelas ini sudah dihapus
  const kartuKelas = (k) => {
    if (yatimK(k)) return '<div class="k-card k-kelas k-yatim" data-id="' + esc(k.id) + '"><div class="row" style="gap:6px"><span class="k-tag abu">' + esc(/^pd-/.test(k.mk_riil_id) ? 'PDDIKTI' : progLabel(k.program)) + '</span><span class="spacer"></span><span class="pill danger">MK dihapus</span></div>' +
      '<div class="k-mk">(MK dihapus)</div><div class="k-sub">MK riil kelas ini sudah dihapus, kelasnya tertinggal</div>' +
      '<div class="k-box">' + r('Peserta', fmtInt(k.peserta)) + r('Nilai terisi', fmtInt(k.terisi) + ' / ' + fmtInt(k.peserta)) + r('Periode', esc(labelPeriode(k.periode))) + '</div>' +
      '<div class="row k-dua"><a class="btn btn-blok" href="#/perkuliahan/' + encodeURIComponent(k.id) + '">Buka</a><button class="btn btn-danger btn-blok" data-hapus-kelas="' + esc(k.id) + '">' + ic('trash', 'ic-sm') + 'Hapus kelas</button></div></div>';
    const pd = /^pd-/.test(k.mk_riil_id), st = !k.peserta ? '<span class="pill no-dot">Tanpa peserta</span>' : pillIsi(k.terisi, k.peserta);
    return '<div class="k-card k-kelas" data-id="' + esc(k.id) + '"><div class="row" style="gap:6px"><span class="k-tag">' + esc(pd ? 'PDDIKTI' : progLabel(k.program)) + '</span>' + (k.rombel && k.rombel !== 'A' ? '<span class="pill no-dot">Rombel ' + esc(k.rombel) + '</span>' : '') + '<span class="spacer"></span>' + st + '</div>' +
      '<div class="k-mk" title="' + esc(k.mk) + '">' + esc(k.mk) + '</div><div class="k-sub">' + esc(k.sks) + ' SKS · semester ' + k.smt + (pd ? ' · tanpa MK riil' : k.batch ? ' · hasil migrasi' : '') + '</div>' +
      '<div class="k-box">' + r('Dosen', k.dosen ? '<span class="ellip" title="' + esc(k.dosen) + '">' + esc(k.dosen) + '</span>' : '<span class="soft" style="font-weight:500">belum diisi</span>') + r('Peserta', fmtInt(k.peserta)) + r('Nilai terisi', fmtInt(k.terisi) + ' / ' + fmtInt(k.peserta)) + bar(k.terisi, k.peserta) + '</div>' +
      '<a class="btn btn-primary btn-blok" href="#/perkuliahan/' + encodeURIComponent(k.id) + '">Isi nilai ' + ic('next', 'ic-sm') + '</a></div>';
  };
  const kotakAksi = (ikon, judul, desc, tombol) => '<div class="k-card putus">' + '<div class="kk-ikon bulat">' + ic(ikon) + '</div><b>' + judul + '</b><div class="muted">' + desc + '</div>' + tombol + '</div>';
  let saringProg = '', cari = '';
  const gambar = () => {
    if (!K || !M) return;
    const box = $('#kk-isi', el), semua = jumlah(K.filter((k) => !angk || String(k.ikut_angkatan) === angk));
    $('#kk-ring', el).innerHTML = '<div><b>' + fmtInt((angk ? kelasDari(angk, prodi) : K).length) + '</b><span>kelas</span></div><div><b>' + (semua.pes ? Math.floor(semua.isi / semua.pes * 100) : 0) + '%</b><span>nilai terisi</span></div>';
    const angkList = App.angkatanList().filter((a) => smt(a) >= 1);
    const aktifList = angkList.filter((a) => smt(a) <= 8 || kelasDari(a).length);
    const arsipList = angkList.filter((a) => !aktifList.includes(a));
    $('#kk-alat', el).innerHTML = '';
    if (langkah === 1 && !arsip) {
      $('#kk-judul', el).textContent = 'Daftar angkatan aktif'; $('#kk-jml', el).textContent = aktifList.length + ' angkatan';
      $('#kk-alat', el).innerHTML = '<span class="muted" style="font-size:12.5px">Semester dihitung otomatis untuk ' + esc(labelPeriode(per)) + '.</span>';
      box.innerHTML = aktifList.map(kartuAngkatan).join('') +
        kotakAksi('plus', 'Buat kelas semester ini', 'Susun kelas dari MK riil yang semester ajarnya cocok dengan tiap angkatan.', '<button class="btn" data-aksi="gen">' + ic('spark', 'ic-sm') + 'Buat kelas otomatis</button>') +
        kotakAksi('archive', 'Arsip angkatan lampau', fmtInt(arsipList.length) + ' angkatan (' + (arsipList.length ? esc(arsipList[arsipList.length - 1] + '–' + arsipList[0]) : '–') + ') sudah lewat 8 semester. Lihat rekap nilai, tandai lulus, atau buat Kelas PDDIKTI.', '<a class="btn" href="#/perkuliahan?arsip=1">Buka arsip ' + ic('next', 'ic-sm') + '</a>');
      return;
    }
    if (arsip) {
      $('#kk-judul', el).textContent = 'Arsip angkatan lampau'; $('#kk-jml', el).textContent = arsipList.length + ' angkatan';
      $('#kk-alat', el).innerHTML = '<a class="btn btn-sm" href="#/perkuliahan">' + ic('back', 'ic-sm') + 'Angkatan aktif</a>';
      box.innerHTML = arsipList.length ? arsipList.map(kartuArsip).join('') : '<div class="k-penuh">' + kosong('Belum ada angkatan lampau', 'Semua angkatan masih dalam masa 8 semester untuk periode ini.', 'archive') + '</div>';
      return;
    }
    if (langkah === 2) {
      $('#kk-judul', el).textContent = 'Program studi · Angkatan ' + angk + ' (semester ' + smt(angk) + ')'; $('#kk-jml', el).textContent = App.prodi().length + ' prodi';
      $('#kk-alat', el).innerHTML = '<a class="btn btn-sm" href="#/perkuliahan">' + ic('back', 'ic-sm') + 'Pilih angkatan lain</a>';
      box.innerHTML = App.prodi().map(kartuProdi).join('');
      return;
    }
    // langkah 3 — kelas
    const ks = kelasDari(angk, prodi).sort((a, b) => String(a.mk).localeCompare(String(b.mk)));
    const progs = unikk(ks.map((k) => /^pd-/.test(k.mk_riil_id) ? 'PDDIKTI' : k.program));
    $('#kk-judul', el).textContent = 'Kelas ' + prodi + ' · Angkatan ' + angk + ' (semester ' + smt(angk) + ')';
    $('#kk-jml', el).textContent = ks.length + ' kelas';
    $('#kk-alat', el).innerHTML = (progs.length > 1 ? '<div class="seg" id="kk-prog"><button data-v=""' + (!saringProg ? ' class="on"' : '') + '>Semua</button>' + progs.map((x) => '<button data-v="' + esc(x) + '"' + (saringProg === x ? ' class="on"' : '') + '>' + esc(x === 'PDDIKTI' ? 'PDDIKTI' : progLabel(x)) + '</button>').join('') + '</div>' : '') +
      '<div class="search" style="width:200px">' + ic('search') + '<input class="input" id="kk-q" placeholder="Cari MK / dosen…" value="' + esc(cari) + '"></div><button class="btn btn-sm" data-aksi="rekap1">' + ic('layers', 'ic-sm') + 'Rekap nilai</button><button class="btn btn-sm" data-aksi="unm1" title="Unggah file nilai per mahasiswa">' + ic('upload', 'ic-sm') + 'Unggah nilai</button><button class="btn btn-sm" data-aksi="tambah1">' + ic('plus', 'ic-sm') + 'Tambah kelas</button>';
    gambarKelas(ks);
    const qi = $('#kk-q', el); if (qi) qi.oninput = debounce(() => { cari = qi.value; gambarKelas(ks); }, 150);
  };
  const gambarKelas = (ks) => {
    const qn = normNama(cari);
    const rs = ks.filter((k) => (!saringProg || (saringProg === 'PDDIKTI' ? /^pd-/.test(k.mk_riil_id) : k.program === saringProg && !/^pd-/.test(k.mk_riil_id))) && (!qn || normNama(k.mk + ' ' + (k.dosen || '')).includes(qn)));
    const yt = ks.filter(yatimK);                                                     // v1.4
    $('#kk-isi', el).innerHTML = (yt.length ? '<div class="k-lebar"><div class="alert warn">' + ic('warn') + '<div><b>' + yt.length + ' kelas MK riilnya sudah dihapus</b> (tampil "(MK dihapus)"). Menghapus MK riil tidak ikut menghapus kelasnya, jadi kelas &amp; ' + fmtInt(yt.reduce((t, k) => t + (k.peserta || 0), 0)) + ' baris pesertanya masih tersimpan. Hapus bila memang tidak dipakai — bisa dibatalkan.<div class="mt-8"><button class="btn btn-sm btn-danger" data-hapus-yatim="1">' + ic('trash', 'ic-sm') + 'Hapus ' + yt.length + ' kelas ini…</button></div></div></div></div>' : '') +
      (rs.length ? rs.map(kartuKelas).join('') : '<div class="k-penuh">' + kosong(ks.length ? 'Tidak ada kelas yang cocok' : 'Belum ada kelas ' + prodi + ' angkatan ' + angk, ks.length ? 'Ubah saringan atau kata kunci.' : 'Di periode ' + esc(labelPeriode(per)) + ' belum ada kelas untuk ' + esc(prodiNama(prodi)) + ' angkatan ' + esc(angk) + '.', 'clip') +
      (ks.length ? '' : '<div class="row" style="justify-content:center;gap:8px;margin-top:-8px"><button class="btn" data-aksi="tambah1">' + ic('plus', 'ic-sm') + 'Tambah kelas</button><button class="btn" data-aksi="pdk1">' + ic('lapor', 'ic-sm') + 'Kelas PDDIKTI</button><button class="btn" data-aksi="unm1">' + ic('upload', 'ic-sm') + 'Unggah nilai</button><button class="btn btn-primary" data-aksi="gen">' + ic('spark', 'ic-sm') + 'Buat kelas otomatis</button></div>') + '</div>');
  };
  pakai(ctx, 'kelas.list', { periode: per }, (d) => { K = d; gambar(); });
  pakai(ctx, 'mhs.list', {}, (d) => { M = d; gambar(); });
  const prodiPilih = () => prodi || (App.prodi()[0] || {}).kode;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-aksi],[data-rekap],[data-pdk],[data-lulus],[data-unm],[data-hapus-kelas],[data-hapus-yatim],#kk-prog button');
    if (!b) return;
    if (b.closest('#kk-prog')) { saringProg = b.dataset.v; $$('#kk-prog button', el).forEach((x) => x.classList.toggle('on', x === b)); gambarKelas(kelasDari(angk, prodi).sort((a, c) => String(a.mk).localeCompare(String(c.mk)))); return; }
    if (b.dataset.rekap) return App.pergi('/perkuliahan/rekap?prodi=' + encodeURIComponent(prodiPilih()) + '&angkatan=' + encodeURIComponent(b.dataset.rekap));
    if (b.dataset.pdk) return kelasPddikti({ prodi: prodiPilih(), angk: b.dataset.pdk, status: ['Lulus'] });
    if (b.dataset.lulus) return tandaiLulus({ angk: b.dataset.lulus, setelah: () => App.render() });
    if (b.dataset.unm) return unggahNilaiMhs({ angk: b.dataset.unm, setelah: () => App.render() });   // v1.3
    if (b.dataset.hapusKelas) return hapusKelas([b.dataset.hapusKelas], () => App.render());          // v1.4
    if (b.dataset.hapusYatim) return hapusKelas(kelasDari(angk, prodi).filter(yatimK).map((k) => k.id), () => App.render());
    const a = b.dataset.aksi;
    if (a === 'gen') buatKelasOtomatis(prodiPilih());
    if (a === 'tambah1') tambahKelas(prodiPilih(), angk);
    if (a === 'rekap1') App.pergi('/perkuliahan/rekap?prodi=' + encodeURIComponent(prodi) + '&angkatan=' + encodeURIComponent(angk));
    if (a === 'pdk1') kelasPddikti({ prodi: prodi, angk: angk });
    if (a === 'unm1') unggahNilaiMhs({ angk: angk, prodi: prodi, setelah: () => App.render() });
  });
  root.addEventListener('mouseover', (e) => { const c = e.target.closest('.k-kelas'); if (c && !c._pf) { c._pf = 1; prefetch('nilai.get', { kelas_id: c.dataset.id }); } });
  $('#kk-tabel', el).onclick = () => { App.ingat('kls', { prodi: prodi, angk: angk, q: '' }); App.pergi('/perkuliahan?tampil=tabel'); };
  $('#kk-per', el).onclick = () => { const s = $('#sel-periode'); if (s) { s.focus(); try { s.showPicker(); } catch (x) { /* peramban lama */ } } };
  $('#k-gen', el).onclick = () => buatKelasOtomatis(prodiPilih());
  $('#k-tambah', el).onclick = () => tambahKelas(prodiPilih(), angk);
  $('#k-rekap', el).onclick = () => App.pergi('/perkuliahan/rekap' + (angk ? '?prodi=' + encodeURIComponent(prodiPilih()) + '&angkatan=' + encodeURIComponent(angk) : ''));
  $('#k-pddikti', el).onclick = () => kelasPddikti({ prodi: prodiPilih(), angk: angk });
  $('#k-unggah', el).onclick = () => unggahNilaiMhs({ angk: angk, prodi: prodi, setelah: () => App.render() });   // v1.3
}
const unikk = (a) => Array.from(new Set(a.filter((x) => x !== '' && x !== undefined && x !== null)));

/** Tampilan tabel semua kelas satu periode (tampilan v1.0, tetap tersedia). */
function HalKelasTabel(el, ctx) {
  App.ingat('kls_rute', '/perkuliahan?tampil=tabel');
  const f = Object.assign({ prodi: '', angk: '', q: '' }, App.ingat('kls') || {});
  el.innerHTML = '<div class="page-head"><div style="flex:1;min-width:260px"><h2>Kelas kuliah · ' + esc(labelPeriode(App.periode)) + '</h2><div class="desc">Nilai riil diisi per kelas (ketik, tempel dari Excel, atau unggah file). Ganti periode di kanan atas.</div></div><span class="spacer"></span><button class="btn" id="k-rekap" title="Mata kuliah apa saja yang sudah/belum bernilai di satu angkatan">' + ic('layers') + 'Rekap angkatan</button><button class="btn" id="k-pddikti" title="Kelas langsung dari MK kurikulum PDDIKTI, tanpa MK riil (mis. untuk mahasiswa yang sudah lulus)">' + ic('lapor') + 'Kelas PDDIKTI</button><button class="btn" id="k-tambah">' + ic('plus') + 'Tambah kelas</button><button class="btn btn-primary" id="k-gen">' + ic('spark') + 'Buat kelas otomatis</button><button class="btn" id="k-kartu" title="Kembali ke tampilan kotak">' + ic('dasbor') + 'Tampilan kotak</button></div>' +
    '<div id="k-kpi"></div><div class="card mt-16"><div class="toolbar"><div class="search" style="width:260px">' + ic('search') + '<input class="input" id="k-q" placeholder="Cari MK / dosen…" value="' + esc(f.q) + '"></div><select class="input" id="k-prodi">' + opsi(App.prodi().map((x) => x.kode), f.prodi, null, 'Semua prodi') + '</select><select class="input" id="k-angk">' + opsi(App.angkatanList(), f.angk, (a) => 'Angkatan ' + a, 'Semua angkatan') + '</select><span class="spacer"></span><span class="muted" id="k-info"></span></div><div id="k-tbl">' + skelTabel(8) + '</div></div>';
  const t = Tabel($('#k-tbl', el), { id: (r) => r.id, urut: 'prodi', perHalaman: 50, tinggi: true, kolom: [
    { k: 'mk', label: 'Mata kuliah riil', html: (r) => '<b style="font-weight:600">' + esc(r.mk) + '</b><div class="sub">' + esc(r.sks) + ' SKS' + (r.rombel && r.rombel !== 'A' ? ' · rombel ' + esc(r.rombel) : '') + (r.batch && !/^pd-/.test(r.mk_riil_id) ? ' · <span title="hasil migrasi">migrasi</span>' : '') + (/^pd-/.test(r.mk_riil_id) ? ' · <span class="pill no-dot brand" title="Kelas langsung dari MK kurikulum PDDIKTI (tanpa MK riil)">PDDIKTI</span>' : '') + '</div>' },
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
  $('#k-rekap', el).onclick = () => App.pergi('/perkuliahan/rekap' + (f.prodi || f.angk ? '?prodi=' + encodeURIComponent(f.prodi || '') + '&angkatan=' + encodeURIComponent(f.angk || '') : ''));
  $('#k-pddikti', el).onclick = () => kelasPddikti({ prodi: f.prodi || (App.prodi()[0] || {}).kode, angk: f.angk });
  $('#k-kartu', el).onclick = () => App.pergi('/perkuliahan' + (f.angk ? '?angkatan=' + encodeURIComponent(f.angk) + (f.prodi ? '&prodi=' + encodeURIComponent(f.prodi) : '') : ''));
}

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
  const isiMk = () => { const pr = $('#tk-prodi', md.el).value; $('#tk-mk', md.el).innerHTML = opsi(App.M.mkriil.filter((m) => m.prodi === pr && String(m.aktif) !== '0' && !/^pd-/.test(m.id)).sort((a, b) => Number(a.smt_ajar) - Number(b.smt_ajar)).map((m) => ({ v: m.id, t: 'Smt ' + (m.smt_ajar || '?') + ' · ' + m.nama_mk + ' (' + progLabel(m.program) + ')' })), '', null, '— pilih —'); };
  $('#tk-prodi', md.el).onchange = isiMk; isiMk();
}

/* ---------------------------------------------------------------- input nilai (grid spreadsheet) */
function HalNilai(el, ctx, kelasId) {
  el.innerHTML = '<div class="row mb-16"><a href="#' + esc(App.ingat('kls_rute') || '/perkuliahan') + '" class="btn btn-sm btn-ghost">' + ic('back') + 'Kembali ke daftar kelas</a></div><div id="nv">' + skelKpi(3) + '<div class="card mt-16">' + skelTabel(10) + '</div></div>';
  let D = null; const ubah = {};
  const jumlahUbah = () => Object.keys(ubah).length;
  App.jagaKeluar = () => !jumlahUbah() || confirm('Ada ' + jumlahUbah() + ' nilai belum disimpan. Tinggalkan halaman ini?');
  App.kotor = () => jumlahUbah() > 0;                                // v1.2: jangan muat ulang otomatis saat ada nilai belum disimpan
  window.onbeforeunload = () => (jumlahUbah() ? 'Nilai belum disimpan' : undefined);
  const muat = () => pakai(ctx, 'nilai.get', { kelas_id: kelasId }, (d) => { D = d; gambar(); }, { gagal: (r) => { $('#nv', el).innerHTML = '<div class="alert danger">' + ic('xc') + '<div>' + esc(r.message) + '</div></div>'; } });
  const gambar = () => {
    const k = D.kelas, rows = D.rows;
    const terisi = rows.filter((r) => r.akhir > 0).length, kunci = rows.filter((r) => r.terkunci).length;
    $('#nv', el).innerHTML = '<div class="card"><div class="card-b"><div class="row" style="align-items:flex-start;gap:16px;flex-wrap:wrap"><div style="flex:1;min-width:260px"><div class="muted" style="font-size:12.5px">' + esc(k.prodi) + ' · angkatan ' + esc(k.ikut_angkatan) + ' · semester ' + k.smt + ' · ' + esc(labelPeriode(k.periode)) + '</div><h2 style="font-size:20px;margin-top:2px">' + esc(k.mk) + '</h2><div class="row-wrap mt-8"><span class="pill no-dot">' + esc(k.sks) + ' SKS</span><span class="pill no-dot">' + esc(progLabel(k.program)) + '</span><span class="pill no-dot">Rombel ' + esc(k.rombel) + '</span>' +
      (D.klaim.length ? '<span class="pill brand no-dot" title="Diklaim untuk MK PDDIKTI">' + ic('route', 'ic-sm') + ' ' + esc(D.klaim.join(' · ')) + '</span>' : '<a class="pill warn no-dot" href="#/klaim?prodi=' + esc(k.prodi) + '&angkatan=' + esc(k.ikut_angkatan) + '">' + ic('warn', 'ic-sm') + ' Belum diklaim ke MK PDDIKTI</a>') + '</div></div>' +
      '<div class="field" style="width:280px"><label>Dosen pengampu</label><select class="input" id="nv-dosen">' + opsi(App.M.dosen.filter((x) => String(x.aktif) !== '0' || x.id === k.dosen_id).map((x) => ({ v: x.id, t: x.nama })), k.dosen_id, null, '— pilih dosen —') + '</select></div></div>' +
      '<div class="row-wrap mt-12" style="gap:18px"><span><b>' + rows.length + '</b> <span class="muted">peserta</span></span><span><b>' + terisi + '</b> <span class="muted">bernilai</span></span><span><b>' + kunci + '</b> <span class="muted">sudah dilapor (terkunci)</span></span><span id="nv-rata" class="muted"></span></div></div></div>' +
      '<div class="card mt-16"><div class="toolbar"><button class="btn btn-sm" id="nv-tempel">' + ic('paste') + 'Tempel dari Excel</button><button class="btn btn-sm" id="nv-unggah">' + ic('upload') + 'Unggah Excel</button><input type="file" id="nv-file" accept=".xlsx,.xls,.csv" hidden><button class="btn btn-sm" id="nv-templat" title="Daftar nilai kelas ini dalam format impor nilai Neo Feeder (kode & nama MK PDDIKTI, semester, nama kelas, prodi)">' + ic('download') + 'Unduh daftar</button><button class="btn btn-sm" id="nv-peserta">' + ic('users') + 'Peserta</button><button class="btn btn-sm btn-ghost" id="nv-hapus" style="color:var(--danger)" title="Hapus kelas ini beserta daftar pesertanya (bisa dibatalkan)">' + ic('trash') + 'Hapus kelas</button><span class="spacer"></span><span class="muted" style="font-size:12.5px"><span class="kbd">↑</span><span class="kbd">↓</span>/<span class="kbd">Enter</span> pindah baris · tempel kolom nilai langsung ke sel</span></div>' +
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
    $('#nv-templat', el).onclick = (e) => tombolProses(e.currentTarget, () => unduhDaftarFeeder(k, kelasId));   // v1.3: format impor nilai Neo Feeder
    $('#nv-peserta', el).onclick = () => kelolaPeserta();
    $('#nv-hapus', el).onclick = () => hapusKelas([kelasId], () => App.pergi(App.ingat('kls_rute') || '/perkuliahan'));   // v1.4
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
    el.innerHTML = '<div class="page-head"><div><h2>Peta klaim</h2><div class="desc">Tentukan nilai MK riil mana yang dipakai untuk tiap MK PDDIKTI, dan kapan dilaporkan.</div></div><span class="spacer"></span><button class="btn" id="pk-riw" title="Aturan yang terhapus bisa dikembalikan">' + ic('history') + 'Riwayat hapus</button><button class="btn btn-ghost" id="pk-hapus" title="Hapus semua aturan peta angkatan ini (yang sudah dilapor tetap terkunci)">' + ic('trash') + 'Hapus peta…</button><button class="btn" id="pk-salin">' + ic('copy') + 'Salin dari angkatan lain</button></div>' +
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
            '<td class="nowrap">' + (pk && pk.periode ? esc(labelPeriode(pk.periode)) + '<div class="sub">smt ' + smtDari(f.angk, pk.periode) + '</div>' : '<span class="soft">–</span>') + '</td><td>' + statbar(rk) + '<div class="sub mt-4 nowrap">' + (rk.SD || 0) + ' lapor · ' + (rk.SL || 0) + ' siap · ' + (rk.MN || 0) + ' tunggu</div></td><td class="aksi nowrap">' + (kunci ? ic('lock', 'ic-sm lock') : '<button class="btn btn-xs" data-ubah>' + ic('edit', 'ic-sm') + 'Atur</button>' + (pk && (pk.sumber.length || pk.periode) ? '<button class="btn btn-xs btn-ghost btn-icon" data-hapus title="Hapus aturan ini">' + ic('trash', 'ic-sm') + '</button>' : '')) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      $('#pk-un', el).innerHTML = K.unclaimed.length ? '<ul class="list-plain">' + K.unclaimed.map((u) => '<li><span style="flex:1"><b style="font-weight:600">' + esc(u.nama) + '</b> <span class="muted">· smt ' + esc(u.smt) + ' · ' + esc(progLabel(u.program)) + ' · ' + esc(u.sks) + ' sks</span></span><span class="pill info">' + u.jumlah + ' mhs bernilai</span></li>').join('') + '</ul>' : '<div class="muted">' + ic('checkc', 'ic-sm') + ' Semua nilai riil sudah diklaim.</div>';
    };
    $('#pk-isi', el).addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-mk]'); if (!tr || !K) return;
      if (e.target.closest('[data-hapus]')) return hapusPeta([tr.dataset.mk]);          // v1.2
      aturMk(K.kur.find((k) => k.id === tr.dataset.mk));
    });
    /** v1.2 — hapus satu / semua aturan peta (aturan yang sudah dilapor tetap terkunci; bisa dibatalkan). */
    const hapusPeta = async (ids) => {
      const c = await api('klaim.hapusCek', { prodi: f.prodi, angkatan: f.angk, mk_ids: ids || [] });
      if (!c.success) return toast(c.message, 'err');
      const d = c.data;
      const daftarTetap = d.tetap.length ? '<div class="mt-12"><div class="lbl mb-4">' + d.tetap.length + ' aturan terkunci (tidak dihapus)</div><div class="tbl-wrap" style="max-height:200px"><table class="tbl tbl-compact"><tbody>' + d.tetap.map((x) => '<tr><td class="mono nowrap">' + esc(x.kode) + '</td><td>' + esc(x.nama) + '</td><td class="sub">' + esc(x.alasan) + '</td></tr>').join('') + '</tbody></table></div></div>' : '';
      if (!d.bisa) { modal({ judul: 'Tidak ada aturan yang bisa dihapus', isi: '<div class="alert warn">' + ic('lock') + '<div>' + (d.total ? 'Aturan terpilih sudah punya nilai yang dilapor ke PDDIKTI sehingga terkunci.' : 'Belum ada aturan peta untuk ' + esc(f.prodi + ' angkatan ' + f.angk) + '.') + '</div></div>' + daftarTetap }); return; }
      let ok = false;
      if (ids && ids.length === 1) {
        const k = K.kur.find((x) => x.id === ids[0]) || {};
        ok = await konfirmasi('Hapus aturan peta', 'Hapus aturan peta <b>' + esc(k.kode + ' · ' + k.nama) + '</b> untuk ' + esc(f.prodi + ' angkatan ' + f.angk) + '? MK ini akan kembali berstatus <i>belum dipetakan</i>. Bisa dikembalikan lewat <b>Riwayat hapus</b>.', 'Hapus', true);
      } else {
        ok = await new Promise((resolve) => {
          let jadi = false;
          modal({ judul: 'Hapus peta klaim ' + f.prodi + ' angkatan ' + f.angk, isi: '<div class="ringkas-batal"><div><b>' + d.bisa + '</b><span>aturan akan dihapus</span></div><div><b>' + d.tetap.length + '</b><span>terkunci (sudah dilapor)</span></div><div><b>' + d.total + '</b><span>aturan di angkatan ini</span></div></div>' + daftarTetap +
            '<div class="alert info mt-12">' + ic('info') + '<div>Nilai riil dan nilai yang sudah dilapor <b>tidak</b> ikut terhapus — hanya aturan pemetaannya. Penghapusan tercatat di <b>Riwayat hapus</b> dan bisa dibatalkan.</div></div><div class="field mt-12"><label>Ketik <b>HAPUS</b> untuk melanjutkan</label><input class="input" id="hp-in" autocomplete="off"></div>',
            tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Hapus ' + d.bisa + ' aturan', kelas: 'btn-danger', aksi: (close, m) => { if ($('#hp-in', m).value.trim() !== 'HAPUS') { toast('Ketik HAPUS untuk konfirmasi.', 'warn'); return false; } jadi = true; return true; } }],
            onTutup: () => resolve(jadi) });
        });
      }
      if (!ok) return;
      const r = await api('klaim.hapus', { prodi: f.prodi, angkatan: f.angk, mk_ids: ids || [], konfirmasi: 'HAPUS' });
      toast(r.message + (r.success ? ' Bisa dikembalikan lewat "Riwayat hapus".' : ''), r.success ? 'ok' : 'err', 6000);
      if (r.success) muat();
    };
    $('#pk-hapus', el).onclick = () => hapusPeta(null);
    $('#pk-riw', el).onclick = () => modalRiwayatBatch('Riwayat hapus peta klaim', /^PETADEL-/, 'Aturan peta yang terhapus bisa dikembalikan, kecuali MK yang sudah punya aturan baru.', () => muat());
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

/* ==========================================================================
   v1.1 — REKAP NILAI PER ANGKATAN  (#/perkuliahan/rekap?prodi=..&angkatan=..)
   Menjawab: "angkatan ini, mata kuliah apa saja yang sudah ada nilainya?"
   ========================================================================== */
function HalRekap(el, ctx, q) {
  const ing = App.ingat('rekap') || {}, mxIng = (App.ingat('dasbor') || {}).mx || {};
  const f = { prodi: q.prodi || ing.prodi || mxIng.prodi || (App.prodi()[0] || {}).kode, angk: q.angkatan || ing.angk || mxIng.angk || App.angkatanList()[0], saring: q.saring || ing.saring || 'semua', q: '' };
  const pilih = new Set();
  el.innerHTML = '<div class="page-head"><div style="flex:1;min-width:260px"><h2>Rekap nilai per angkatan</h2><div class="desc">MK kurikulum PDDIKTI yang sudah & belum bernilai di satu angkatan, beserta kelas pengisinya di semua periode.</div></div>' +
    '<button class="btn" id="rk-kembali">' + ic('back') + 'Kelas kuliah</button><button class="btn" id="rk-riw">' + ic('history') + 'Riwayat kelas PDDIKTI</button><button class="btn" id="rk-unggah" title="Unggah file nilai per mahasiswa (transkrip/KHS)">' + ic('upload') + 'Unggah nilai</button><button class="btn" id="rk-xls">' + ic('download') + 'Unduh Excel</button></div>' +
    '<div id="rk-kpi">' + skelKpi(4) + '</div>' +
    '<div class="card mt-16"><div class="toolbar"><select class="input" id="rk-prodi" title="Prodi">' + opsi(App.prodi().map((x) => ({ v: x.kode, t: x.kode })), f.prodi) + '</select><select class="input" id="rk-angk">' + opsi(App.angkatanList(), f.angk, (a) => 'Angkatan ' + a) + '</select>' +
    '<div class="seg" id="rk-seg">' + [['semua', 'Semua'], ['lengkap', 'Sudah lengkap'], ['sebagian', 'Sebagian'], ['belum', 'Belum ada nilai']].map((x) => '<button data-v="' + x[0] + '"' + (f.saring === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>').join('') + '</div>' +
    '<div class="search" style="width:190px">' + ic('search') + '<input class="input" id="rk-q" placeholder="Cari MK…"></div><span class="spacer"></span><span class="muted" id="rk-pil"></span><button class="btn btn-sm btn-primary" id="rk-buat" disabled>' + ic('plus') + 'Buat kelas PDDIKTI</button></div>' +
    '<div class="row" style="padding:10px 14px 0">' + legendaStatus() + '</div><div id="rk-isi">' + skelTabel(10) + '</div></div>';
  let mx = null, kelas = null, rows = [];
  const kelasMk = (k) => {                                     // kelas angkatan ini yang menjadi sumber nilai MK kurikulum k
    const p = mx.peta[k.id]; if (!p || !kelas) return [];
    return kelas.filter((x) => p.sumber.includes(x.mk_riil_id)).sort((a, b) => a.periode.localeCompare(b.periode));
  };
  const susun = () => {
    rows = mx.kur.map((k) => {
      const c = { SD: 0, SX: 0, SL: 0, MN: 0, BP: 0, TB: 0 };
      mx.mhs.forEach((m) => { const x = (mx.cells[m.nim] || {})[k.id] || ['BP']; c[x[0]]++; });
      const n = mx.mhs.length - c.TB, bernilai = c.SD + c.SX + c.SL, belum = c.MN + c.BP;
      const kat = !n || !belum ? 'lengkap' : !bernilai ? 'belum' : 'sebagian';
      return { k: k, c: c, n: n, bernilai: bernilai, belum: belum, kat: kat, kelas: kelasMk(k), peta: mx.peta[k.id] };
    });
  };
  const gambar = () => {
    if (!mx || !kelas) return;
    const box = $('#rk-isi', el);
    if (!mx.kur.length) { box.innerHTML = kosong('Kurikulum belum ada', 'Isi kurikulum prodi ini di menu Kurikulum.', 'book'); $('#rk-kpi', el).innerHTML = ''; return; }
    if (!mx.mhs.length) { box.innerHTML = kosong('Belum ada mahasiswa', 'Tidak ada mahasiswa ' + esc(f.prodi) + ' yang ikut angkatan ' + esc(f.angk) + '.', 'users'); $('#rk-kpi', el).innerHTML = ''; return; }
    susun();
    const lengkap = rows.filter((r) => r.kat === 'lengkap'), belum = rows.filter((r) => r.kat === 'belum'), sebagian = rows.filter((r) => r.kat === 'sebagian');
    const sks = (rs) => rs.reduce((s, r) => s + Number(r.k.sks || 0), 0), st = {};
    mx.mhs.forEach((m) => { st[m.status] = (st[m.status] || 0) + 1; });
    $('#rk-kpi', el).innerHTML = '<div class="grid g4">' + [
      ['users', mx.mhs.length, 'Mahasiswa ' + f.prodi + ' ' + f.angk, Object.keys(st).map((s) => st[s] + ' ' + s).join(' · ')],
      ['book', rows.length + ' MK', 'Kurikulum berlaku', sks(rows) + ' SKS'],
      ['checkc', lengkap.length + ' MK', 'Sudah lengkap bernilai', sks(lengkap) + ' SKS' + (sebagian.length ? ' · ' + sebagian.length + ' MK sebagian' : '')],
      ['clip', belum.length + ' MK', 'Belum ada nilai sama sekali', sks(belum) + ' SKS']
    ].map((x) => '<div class="card kpi"><div class="kpi-ic">' + ic(x[0]) + '</div><div><div class="kpi-v">' + esc(x[1]) + '</div><div class="kpi-l">' + esc(x[2]) + '</div><div class="sub" style="font-size:12px;color:var(--soft);margin-top:2px">' + esc(x[3]) + '</div></div></div>').join('') + '</div>';
    const qn = normNama(f.q);
    const tampil = rows.filter((r) => (f.saring === 'semua' || r.kat === f.saring) && (!qn || normNama(r.k.kode + ' ' + r.k.nama).includes(qn)));
    if (!tampil.length) { box.innerHTML = kosong('Tidak ada mata kuliah', f.saring === 'belum' ? 'Semua MK sudah punya nilai untuk angkatan ini.' : 'Ubah saringan.', 'filter'); hitungPilih(); return; }
    const smt = Array.from(new Set(tampil.map((r) => r.k.smt))).sort((a, b) => a - b);
    const chip = (x) => '<a class="chip" href="#/perkuliahan/' + encodeURIComponent(x.id) + '" title="' + esc(x.mk + ' · ' + labelPeriode(x.periode) + (x.dosen ? ' · ' + x.dosen : '')) + '">' + (x.pddikti ? '<b>PDDIKTI</b>' : esc(x.mk.length > 26 ? x.mk.slice(0, 25) + '…' : x.mk)) + ' · smt ' + x.smt + ' · ' + x.terisi + '/' + x.peserta + '</a>';
    box.innerHTML = '<div class="tbl-wrap tall"><table class="tbl tbl-compact"><thead><tr><th style="width:28px"><input type="checkbox" id="rk-semua" title="Pilih semua MK yang belum lengkap"></th><th>Kode</th><th style="min-width:190px">Mata kuliah</th><th class="num">SKS</th><th style="width:190px">Sudah bernilai</th><th class="num">Dilapor</th><th class="num">Belum</th><th>Kelas pengisi (klik untuk isi nilai)</th><th>Periode lapor</th></tr></thead><tbody>' +
      smt.map((s) => {
        const rs = tampil.filter((r) => r.k.smt === s);
        return '<tr class="grp"><td colspan="9"><b>Semester ' + esc(s || '?') + '</b> <span class="muted">· ' + rs.length + ' MK · ' + sks(rs) + ' SKS · ' + rs.filter((r) => r.kat === 'lengkap').length + ' lengkap</span></td></tr>' +
          rs.map((r) => {
            const per = r.peta && r.peta.periode ? labelPeriode(r.peta.periode) : '';
            return '<tr class="klik" data-mk="' + esc(r.k.id) + '"><td>' + (r.belum ? '<input type="checkbox" data-pil="' + esc(r.k.id) + '"' + (pilih.has(r.k.id) ? ' checked' : '') + '>' : ic('checkc', 'ic-sm') ) + '</td><td class="mono nowrap">' + esc(r.k.kode) + '</td><td>' + esc(r.k.nama) + (r.k.jenis ? ' <span class="pill no-dot brand">' + esc(r.k.jenis) + '</span>' : '') + '</td><td class="num">' + r.k.sks + '</td>' +
              '<td><div class="row" style="gap:8px">' + statbar(r.c) + '<span class="sub nowrap">' + r.bernilai + '/' + r.n + '</span></div></td><td class="num">' + (r.c.SD + r.c.SX) + '</td><td class="num">' + (r.belum ? '<b style="color:var(--s-MN)">' + r.belum + '</b>' : '0') + '</td>' +
              '<td><div class="row-wrap" style="gap:4px">' + (r.kelas.length ? r.kelas.map(chip).join('') : (r.peta && r.peta.sumber.length ? '<span class="soft">sumber dipetakan, belum ada kelas di sistem</span>' : '<span class="soft">belum dipetakan</span>')) + '</div></td><td class="nowrap">' + (per ? esc(per) : '<span class="soft">–</span>') + '</td></tr>';
          }).join('');
      }).join('') + '</tbody></table></div>';
    const semua = $('#rk-semua', box);
    semua.onchange = () => { $$('[data-pil]', box).forEach((c) => { c.checked = semua.checked; if (semua.checked) pilih.add(c.dataset.pil); else pilih.delete(c.dataset.pil); }); hitungPilih(); };
    hitungPilih();
  };
  const hitungPilih = () => {
    $('#rk-pil', el).textContent = pilih.size ? pilih.size + ' MK dipilih' : '';
    $('#rk-buat', el).disabled = !pilih.size;
  };
  const muat = () => {
    App.ingat('rekap', { prodi: f.prodi, angk: f.angk, saring: f.saring });
    mx = null; kelas = null; pilih.clear(); $('#rk-isi', el).innerHTML = skelTabel(10);
    const d = { prodi: f.prodi, angkatan: f.angk };
    pakai(ctx, 'dasbor.matriks', d, (x) => { mx = x; gambar(); });
    pakai(ctx, 'kelas.angkatan', d, (x) => { kelas = x; gambar(); });
  };
  const detail = (r) => {
    const daftar = mx.mhs.map((m) => ({ m: m, x: (mx.cells[m.nim] || {})[r.k.id] || ['BP'] })).sort((a, b) => URUT_STATUS.indexOf(a.x[0]) - URUT_STATUS.indexOf(b.x[0]) || a.m.nama.localeCompare(b.m.nama));
    const md = modal({ judul: r.k.kode + ' · ' + r.k.nama, lebar: 'lebar', desc: f.prodi + ' angkatan ' + f.angk + ' · ' + r.k.sks + ' SKS · semester ' + r.k.smt + ' · ' + r.bernilai + ' dari ' + r.n + ' mahasiswa sudah bernilai',
      isi: (r.kelas.length ? '<div class="row-wrap mb-12" style="gap:6px"><span class="muted">Kelas:</span>' + r.kelas.map((x) => '<a class="chip" href="#/perkuliahan/' + encodeURIComponent(x.id) + '">' + esc(x.pddikti ? 'PDDIKTI' : x.mk) + ' · ' + esc(labelPeriode(x.periode)) + ' · ' + x.terisi + '/' + x.peserta + '</a>').join('') + '</div>' : '') +
        '<div class="tbl-wrap" style="max-height:56vh"><table class="tbl tbl-compact"><thead><tr><th>NIM</th><th>Nama</th><th>Status mhs</th><th>Status nilai</th><th class="num">Nilai</th><th>Huruf</th><th>Periode</th></tr></thead><tbody>' +
        daftar.map((d) => '<tr><td class="mono">' + esc(d.m.nim) + '</td><td><a href="#/mahasiswa/' + encodeURIComponent(d.m.nim) + '">' + esc(d.m.nama) + '</a></td><td>' + pillMhs(d.m.status) + '</td><td>' + pillStatus(d.x[0]) + '</td><td class="num">' + fmt2(d.x[1]) + '</td><td>' + esc(d.x[0] === 'SD' || d.x[0] === 'SX' ? d.x[3] : d.x[0] === 'SL' ? skala(d.x[1]).huruf : '') + '</td><td>' + esc(labelPeriode(d.x[2] || '')) + '</td></tr>').join('') + '</tbody></table></div>',
      tombol: [{ teks: 'Tutup', aksi: () => true }].concat(r.belum ? [{ teks: 'Buat kelas PDDIKTI untuk ' + r.belum + ' mahasiswa', kelas: 'btn-primary', ikon: 'plus', aksi: () => { setTimeout(() => kelasPddikti({ prodi: f.prodi, angk: f.angk, mkIds: [r.k.id], status: ['Lulus', 'Aktif', 'Cuti', 'Non-aktif'], setelah: muat }), 0); return true; } }] : []) });
    md.el.addEventListener('click', (e) => { if (e.target.closest('a[href^="#/"]')) md.close(); });
  };
  const unduh = async () => {
    if (!mx || !kelas) return;
    susun();
    await Excel.tulisSederhana('Rekap-nilai-' + f.prodi + '-' + f.angk + '.xlsx', ['Smt', 'Kode MK', 'Mata Kuliah', 'SKS', 'Jumlah Mhs', 'Sudah Bernilai', 'Sudah Dilapor', 'Siap Lapor', 'Belum Bernilai', 'Keterangan', 'Periode Lapor', 'Kelas Pengisi'],
      rows.map((r) => [r.k.smt, r.k.kode, r.k.nama, r.k.sks, r.n, r.bernilai, r.c.SD + r.c.SX, r.c.SL, r.belum, { lengkap: 'Lengkap', sebagian: 'Sebagian', belum: 'Belum ada nilai' }[r.kat], r.peta && r.peta.periode ? labelPeriode(r.peta.periode) : '', r.kelas.map((x) => (x.pddikti ? 'PDDIKTI' : x.mk) + ' (' + labelPeriode(x.periode) + ', ' + x.terisi + '/' + x.peserta + ')').join('; ')]), 'Rekap ' + f.angk);
  };
  $('#rk-prodi', el).onchange = (e) => { f.prodi = e.target.value; muat(); };
  $('#rk-angk', el).onchange = (e) => { f.angk = e.target.value; muat(); };
  $('#rk-seg', el).onclick = (e) => { const b = e.target.closest('button'); if (!b) return; f.saring = b.dataset.v; $$('#rk-seg button', el).forEach((x) => x.classList.toggle('on', x === b)); App.ingat('rekap', { prodi: f.prodi, angk: f.angk, saring: f.saring }); gambar(); };
  $('#rk-q', el).oninput = debounce((e) => { f.q = e.target.value; gambar(); }, 150);
  $('#rk-kembali', el).onclick = () => App.pergi('/perkuliahan');
  $('#rk-xls', el).onclick = (e) => tombolProses(e.currentTarget, unduh);
  $('#rk-riw', el).onclick = () => modalRiwayatBatch('Riwayat kelas PDDIKTI', /^PDK-/, 'Kelas PDDIKTI bisa dibatalkan selama belum ada nilai yang diisi.', muat);
  $('#rk-unggah', el).onclick = () => unggahNilaiMhs({ angk: f.angk, prodi: f.prodi, setelah: () => { Store.basi(); muat(); } });   // v1.3
  $('#rk-buat', el).onclick = () => kelasPddikti({ prodi: f.prodi, angk: f.angk, mkIds: Array.from(pilih), setelah: muat });
  $('#rk-isi', el).addEventListener('click', (e) => {
    const c = e.target.closest('[data-pil]');
    if (c) { if (c.checked) pilih.add(c.dataset.pil); else pilih.delete(c.dataset.pil); hitungPilih(); return; }
    if (e.target.closest('a, input')) return;
    const tr = e.target.closest('tr[data-mk]'); if (!tr || !mx) return;
    const r = rows.find((x) => x.k.id === tr.dataset.mk); if (r) detail(r);
  });
  muat();
}

/* ==========================================================================
   v1.1 — KELAS PDDIKTI LANGSUNG (tanpa MK riil)
   o = { prodi, angk, mkIds[], status[], setelah() }
   ========================================================================== */
function kelasPddikti(o) {
  o = o || {};
  const ST = ['Lulus', 'Aktif', 'Cuti', 'Non-aktif'], stAwal = o.status || ['Lulus'];
  const pilih = new Set(o.mkIds || []);
  let data = null;
  const periode = (App.M.periode || []).slice().sort((a, b) => Number(b.id) - Number(a.id));
  const md = modal({
    judul: 'Kelas PDDIKTI (tanpa MK riil)', lebar: 'lebar',
    desc: 'Kelas dibuat langsung dari mata kuliah kurikulum PDDIKTI — cocok untuk mahasiswa yang sudah lulus. Setelah dibuat, isi nilainya seperti kelas biasa, lalu laporkan di menu <b>Lapor PDDIKTI</b>.',
    isi: '<div class="fgrid c3 mb-12"><div class="field"><label>Prodi</label><select class="input" id="kp-prodi">' + opsi(App.prodi().map((x) => x.kode), o.prodi) + '</select></div>' +
      '<div class="field"><label>Angkatan (ikut)</label><select class="input" id="kp-angk">' + opsi(App.angkatanList(), o.angk || App.angkatanList().slice(-1)[0]) + '</select></div>' +
      '<div class="field"><label>Periode lapor</label><select class="input" id="kp-per"><option value="">Sesuai semester sebaran (disarankan)</option>' + periode.map((p) => '<option value="' + esc(p.id) + '">' + esc(labelPeriode(p.id)) + '</option>').join('') + '</select><div class="hint">MK yang sudah punya periode di Peta Klaim tetap memakai periode itu (ditandai *).</div></div>' +
      '<div class="field full"><label>Peserta: mahasiswa berstatus</label><div class="row-wrap" id="kp-st" style="min-height:30px">' + ST.map((s) => '<label class="check"><input type="checkbox" value="' + s + '"' + (stAwal.includes(s) ? ' checked' : '') + '>' + s + '</label>').join('') +
      '<span class="spacer"></span><label class="check"><input type="checkbox" id="kp-belum" checked>Hanya yang belum punya nilai MK tersebut</label></div></div>' +
      '<div class="field"><label>Dosen (opsional)</label><select class="input" id="kp-dosen">' + opsi(App.M.dosen.filter((d) => String(d.aktif) !== '0').map((d) => ({ v: d.id, t: d.nama })), '', null, '— isi nanti —') + '</select></div>' +
      '<div class="field" style="grid-column:span 2;justify-content:flex-end"><div class="row"><label class="check"><input type="checkbox" id="kp-sembunyi" checked>Sembunyikan MK tanpa calon peserta</label><span class="spacer"></span><button class="btn btn-sm" id="kp-lihat">' + ic('refresh') + 'Muat ulang daftar MK</button></div></div></div>' +
      '<div id="kp-isi">' + skelTabel(6) + '</div>',
    tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Buat kelas', kelas: 'btn-primary', ikon: 'plus', aksi: async (close, m) => {
      const ids = Array.from(pilih).filter((id) => { const r = data && data.rows.find((x) => x.mk_id === id); return r && r.tambah > 0; });
      if (!ids.length) { toast('Pilih minimal satu mata kuliah yang punya calon peserta.', 'warn'); return false; }
      const nPes = ids.reduce((s, id) => s + data.rows.find((x) => x.mk_id === id).tambah, 0);
      const ok = await konfirmasi('Buat kelas PDDIKTI', 'Buat/isi kelas untuk <b>' + ids.length + ' mata kuliah</b> dengan total <b>' + nPes + ' peserta</b> (' + esc(param().prodi + ' ' + param().angkatan) + ')? Bisa dibatalkan dari Riwayat kelas PDDIKTI selama belum ada nilai.', 'Buat kelas');
      if (!ok) return false;
      const r = await api('kelas.pddikti', Object.assign(param(), { mk_ids: ids, dosen_id: $('#kp-dosen', m).value }));
      if (!r.success) { toast(r.message, 'err'); return false; }
      toast(r.message + ' Periode: ' + r.data.periode.map(labelPeriode).join(', ') + '.', 'ok', 7000);
      if (o.setelah) o.setelah(); else App.pergi('/perkuliahan/rekap?prodi=' + encodeURIComponent(param().prodi) + '&angkatan=' + encodeURIComponent(param().angkatan));
      return true;
    } }]
  });
  const el = md.el;
  const param = () => ({ prodi: $('#kp-prodi', el).value, angkatan: $('#kp-angk', el).value, status: $$('#kp-st input[value]:checked', el).map((c) => c.value), hanyaBelum: $('#kp-belum', el).checked, periode: $('#kp-per', el).value });
  const gambar = () => {
    const box = $('#kp-isi', el);
    if (!data) return;
    const semb = $('#kp-sembunyi', el).checked;
    const awal = new Set(o.mkIds || []);
    const rs = data.rows.filter((r) => !semb || r.tambah > 0 || pilih.has(r.mk_id)).sort((a, b) => (awal.has(b.mk_id) - awal.has(a.mk_id)) || (a.smt - b.smt));
    const nCalon = data.rows.filter((r) => r.tambah > 0).length;
    if (!rs.length) { box.innerHTML = kosong('Tidak ada mata kuliah yang perlu kelas', 'Semua mahasiswa dengan status terpilih sudah punya nilai (atau sudah menjadi peserta kelas PDDIKTI). Hilangkan centang "Hanya yang belum punya nilai" bila ingin melihat semua.', 'checkc'); hitung(); return; }
    box.innerHTML = '<div class="row mb-8"><label class="check"><input type="checkbox" id="kp-semua">Pilih semua yang punya calon</label><span class="spacer"></span><span class="muted" id="kp-ring"></span></div>' +
      '<div class="tbl-wrap" style="max-height:44vh"><table class="tbl tbl-compact"><thead><tr><th></th><th>Smt</th><th>Kode</th><th style="min-width:170px">Mata kuliah</th><th class="num">SKS</th><th>Bernilai</th><th class="num">Calon</th><th>Periode lapor</th><th></th></tr></thead><tbody>' +
      rs.map((r) => '<tr class="' + (r.tambah ? '' : 'r-off') + '"><td>' + (r.tambah ? '<input type="checkbox" data-mk="' + esc(r.mk_id) + '"' + (pilih.has(r.mk_id) ? ' checked' : '') + '>' : '') + '</td><td class="center">' + esc(r.smt) + '</td><td class="mono nowrap">' + esc(r.kode) + '</td><td>' + esc(r.nama) + '</td><td class="num">' + r.sks + '</td>' +
        '<td class="nowrap">' + (r.cnt.SD + r.cnt.SX + r.cnt.SL) + '/' + r.n + '</td><td class="num"><b>' + r.tambah + '</b></td><td class="nowrap">' + esc(labelPeriode(r.periode)) + (r.catatan.some((c) => /peta klaim/.test(c)) ? '<b title="mengikuti Peta Klaim">*</b>' : '') + ' <span class="sub">smt ' + r.smtLapor + '</span></td>' +
        '<td title="' + esc(r.catatan.join(' · ')) + '"><div class="row-wrap" style="gap:4px">' + ketPddikti(r) + '</div></td></tr>').join('') + '</tbody></table></div>';
    $('#kp-semua', box).onchange = (e) => { $$('[data-mk]', box).forEach((c) => { c.checked = e.target.checked; if (c.checked) pilih.add(c.dataset.mk); else pilih.delete(c.dataset.mk); }); hitung(); };
    $('#kp-semua', box).checked = nCalon > 0 && data.rows.filter((r) => r.tambah > 0).every((r) => pilih.has(r.mk_id));
    hitung();
  };
  const ketPddikti = (r) => {
    const t = [];
    if (r.tambah) t.push(r.kelas_id ? '<span class="pill no-dot" title="Peserta ditambahkan ke kelas PDDIKTI yang sudah ada">kelas lama</span>' : '<span class="pill no-dot brand">kelas baru</span>');
    if (r.sumberRiil) t.push('<span class="pill no-dot" title="MK riil tetap sumber utama; MK PDDIKTI menjadi sumber cadangan">cadangan</span>');
    if (r.smtLapor < 1 || r.smtLapor > 16) t.push('<span class="pill s-SX">di luar smt 1–16</span>');
    return t.join(' ');
  };
  const hitung = () => {
    const ring = $('#kp-ring', el); if (!ring || !data) return;
    const ids = data.rows.filter((r) => pilih.has(r.mk_id) && r.tambah > 0);
    ring.textContent = ids.length + ' MK dipilih · ' + ids.reduce((s, r) => s + r.tambah, 0) + ' peserta · ' + data.mhs + ' mahasiswa di angkatan ini';
  };
  const muat = async () => {
    const p = param();
    if (!p.status.length) { $('#kp-isi', el).innerHTML = kosong('Pilih status mahasiswa', '', 'users'); data = null; return; }
    $('#kp-isi', el).innerHTML = skelTabel(6);
    const r = await api('kelas.pddiktiCek', p);
    if (!r.success) { $('#kp-isi', el).innerHTML = '<div class="alert danger">' + ic('xc') + '<div>' + esc(r.message) + '</div></div>'; data = null; return; }
    data = r.data; gambar();
  };
  $('#kp-isi', el).addEventListener('change', (e) => { const c = e.target.closest('[data-mk]'); if (!c) return; if (c.checked) pilih.add(c.dataset.mk); else pilih.delete(c.dataset.mk); hitung(); });
  ['#kp-prodi', '#kp-angk'].forEach((s) => { $(s, el).onchange = () => { pilih.clear(); muat(); }; });
  $('#kp-per', el).onchange = muat; $('#kp-belum', el).onchange = muat; $('#kp-st', el).addEventListener('change', (e) => { if (e.target.hasAttribute('value')) muat(); });
  $('#kp-sembunyi', el).onchange = gambar;
  $('#kp-lihat', el).onclick = (e) => tombolProses(e.currentTarget, muat);
  muat();
}

/* ==========================================================================
   v1.3 — UNGGAH NILAI PER MAHASISWA
   File transkrip/KHS (mis. salinan halaman nilai Neo Feeder): satu sheet = satu mahasiswa,
   identitas NIM & Nama di atas, tabel Kode MK · Nama MK · Periode · Nilai di bawahnya.
   Juga membaca format daftar (satu baris = satu nilai, kolom NIM) seperti format impor Neo Feeder.
   ========================================================================== */
const UNM_LABEL = { nim: /^(nim|npm|no induk|nomor induk|nomor induk mahasiswa)$/, nama: /^(nama|nama mahasiswa|nama lengkap)$/, prodi: /^(program studi|prodi|jurusan)$/ };
const UNM_LABEL_LAIN = /^(status|status keluar|angkatan|semester|ipk|ips|sks|tahun masuk|kelas|jenjang|tempat tanggal lahir|ttl)$/;
const unmSel = (v) => (v === null || v === undefined || v instanceof Date) ? '' : String(v).trim();
const unmAngka = (v) => { const n = parseAngka(v); return n === null || isNaN(n) ? null : n; };
/** "2019/2020 Ganjil" → 20191 · "Genap 2020/2021" → 20202 · "20191" → 20191 · angka 1–16 → semester ke-n. */
function unmPeriode(v) {
  const s = unmSel(v); if (!s) return { p: '' };
  if (/^\d{4}[12]$/.test(s)) return { p: s };
  if (/^\d{4}3$/.test(s)) return { p: s.slice(0, 4) + '2', pendek: true };
  if (/^\d{1,2}$/.test(s) && Number(s) >= 1 && Number(s) <= 16) return { p: '', smt: Number(s) };
  const t = normNama(s), th = s.match(/(\d{4})\s*[/\-–]\s*\d{2,4}/) || s.match(/(\d{4})/);
  if (!th) return { p: '' };
  if (/ganjil|gasal/.test(t)) return { p: th[1] + '1' };
  if (/genap/.test(t)) return { p: th[1] + '2' };
  if (/pendek|antara/.test(t)) return { p: th[1] + '2', pendek: true };
  return { p: '' };
}
/** Identitas di atas tabel: label "NIM", lalu ":" dan nilainya di kanan ATAU di bawah (bentuk bertumpuk seperti salinan halaman web). */
function unmIdentitas(a) {
  const out = {}, labelDari = (s) => { for (const f in UNM_LABEL) if (UNM_LABEL[f].test(s)) return f; return UNM_LABEL_LAIN.test(s) ? '_' : ''; };
  for (let i = 0; i < Math.min(a.length, 40); i++) {
    const row = a[i] || [];
    for (let c = 0; c < Math.min(row.length, 15); c++) {
      const raw = unmSel(row[c]); if (!raw || raw.length > 60) continue;
      const m1 = raw.match(/^([^:]{2,30}?)\s*:\s*(.*)$/), f = labelDari(normNama(m1 ? m1[1] : raw));
      if (!f || f === '_' || out[f]) continue;
      let v = m1 ? m1[2].trim() : '';
      if (!v) for (let j = c + 1; j < Math.min(row.length, c + 6); j++) { const t = unmSel(row[j]); if (!t || t === ':') continue; if (labelDari(normNama(t))) break; v = t.replace(/^:\s*/, ''); break; }
      if (!v) for (let j = i + 1; j < Math.min(a.length, i + 4); j++) { const t = unmSel((a[j] || [])[c]); if (!t || t === ':') continue; if (labelDari(normNama(t))) break; v = t.replace(/^:\s*/, ''); break; }
      if (v && v !== '-') out[f] = v;
    }
  }
  return out;
}
/** Tabel nilai: baris judul berisi "Kode MK" & "Nama MK" (judul dua baris seperti "Nilai / Angka" ikut digabung). */
function unmTabel(a) {
  let hi = -1;
  for (let i = 0; i < Math.min(a.length, 80); i++) { const r = (a[i] || []).map((x) => normNama(unmSel(x))); if (r.some((x) => /^kode( mk| mata kuliah| matakuliah)?$/.test(x)) && r.some((x) => /^nama( mk| mata kuliah| matakuliah)$|^mata kuliah$/.test(x))) { hi = i; break; } }
  if (hi < 0) return null;
  const h0 = a[hi] || [], h1 = a[hi + 1] || [];
  const sub = h1.some((x) => /^(angka|huruf|indeks|sks|bobot|nilai)$/.test(normNama(unmSel(x)))) && !h1.some((x) => /\d/.test(unmSel(x)) && /[a-z]/i.test(unmSel(x)));
  const H = []; for (let c = 0; c < Math.max(h0.length, sub ? h1.length : 0); c++) H.push(normNama(unmSel(h0[c]) + ' ' + (sub ? unmSel(h1[c]) : '')));
  const col = (...res) => { for (const re of res) { const i = H.findIndex((x) => re.test(x)); if (i > -1) return i; } return -1; };
  const C = { nim: col(/^nim$|^npm$/), namaMhs: col(/^nama mahasiswa$|^nama lengkap$|^nama mhs$/, /^nama$/), kode: col(/^kode( mk| mata kuliah| matakuliah)$/, /^kode$/), nama: col(/^nama( mk| mata kuliah| matakuliah)$/, /^mata kuliah$/),
    periode: col(/^periode/, /^tahun akademik/, /^semester$/), smt: col(/^semester ke/, /^smt/), sks: col(/^bobot/, /^sks( mk)?$/),
    angka: col(/nilai angka/, /^angka$/, /^nilai$/), huruf: col(/huruf/), indeks: H.findIndex((x) => /indeks/.test(x) && !/sks/.test(x)) };
  const sel = (r, c) => c > -1 ? r[c] : '';
  const rows = [];
  for (let i = hi + (sub ? 2 : 1); i < a.length; i++) {
    const r = a[i] || [], kode = unmSel(sel(r, C.kode));
    if (!/\d/.test(kode) || !/[a-z]/i.test(kode)) continue;              // lompati judul bagian ("Nilai Kelas Perkuliahan"), total, baris kosong
    const pr = unmPeriode(sel(r, C.periode)), sk = unmSel(sel(r, C.smt));
    rows.push({ baris: i + 1, kode: kode, nama: unmSel(sel(r, C.nama)), periode: pr.p, periodeTeks: unmSel(sel(r, C.periode)), pendek: !!pr.pendek, smt: /^\d{1,2}$/.test(sk) ? Number(sk) : (pr.smt || ''),
      sks: unmAngka(sel(r, C.sks)), angka: unmAngka(sel(r, C.angka)), huruf: unmSel(sel(r, C.huruf)), indeks: unmAngka(sel(r, C.indeks)), nim: unmSel(sel(r, C.nim)), namaMhs: unmSel(sel(r, C.namaMhs)) });
  }
  return { C: C, rows: rows };
}
async function unmBacaFile(file) {
  const wb = await Excel.baca(file), siswa = [], lewat = [];
  const bersih = (x) => ({ baris: x.baris, kode: x.kode, nama: x.nama, periode: x.periode, periodeTeks: x.periodeTeks, pendek: x.pendek, smt: x.smt, sks: x.sks, angka: x.angka, huruf: x.huruf, indeks: x.indeks });
  for (const nm of wb.SheetNames) {
    const a = await Excel.baris(wb, nm), t = unmTabel(a);
    if (!t || !t.rows.length) { lewat.push({ file: file.name, sheet: nm, alasan: t ? 'tabel nilai kosong' : 'tidak ada tabel berjudul Kode MK & Nama MK' }); continue; }
    if (t.C.nim > -1 || t.C.namaMhs > -1) {                              // format daftar → kelompokkan per NIM (v1.4.1: atau per nama bila tanpa kolom NIM)
      const g = {}; let prev = null;
      t.rows.forEach((x) => {
        if (!x.nim && !x.namaMhs && prev && x.baris === prev.baris + 1) { x.nim = prev.nim; x.namaMhs = prev.namaMhs; }   // v1.4.1: sel nama/NIM kosong (digabung) = mahasiswa baris di atasnya
        prev = x;
        if ((!x.nim && !x.namaMhs) || /^0+$/.test(x.nim)) return;
        const k = x.nim || '?' + normNama(x.namaMhs); (g[k] = g[k] || { file: file.name, sheet: nm, nim: x.nim, nama: x.namaMhs, prodi: '', rows: [] }).rows.push(bersih(x));
      });
      if (!Object.keys(g).length) lewat.push({ file: file.name, sheet: nm, alasan: 'kolom NIM / Nama mahasiswa kosong' });
      Object.keys(g).forEach((k) => siswa.push(g[k]));
      continue;
    }
    const id = unmIdentitas(a);
    if (!id.nim && !id.nama) { lewat.push({ file: file.name, sheet: nm, alasan: 'identitas NIM / Nama tidak ditemukan di atas tabel' }); continue; }
    siswa.push({ file: file.name, sheet: nm, nim: id.nim || '', nama: id.nama || '', prodi: id.prodi || '', rows: t.rows.map(bersih) });
  }
  return { siswa: siswa, lewat: lewat };
}
const UNM_ST = {
  simpan: ['s-SL', 'disimpan'], timpa: ['s-SX', 'diganti'], tandai: ['s-SD', 'ditandai dilapor'], ada: ['info', 'peta dilengkapi'], sama: ['no-dot', 'sudah ada'], kunci: ['s-SD', 'terkunci'],
  pindah: ['s-SL', 'dipindah'], beda: ['warn', 'berbeda'], mk: ['danger', 'MK tidak cocok'], nilai: ['danger', 'nilai kosong'], periode: ['danger', 'periode?'], ganda: ['no-dot', 'ganda'], tb: ['no-dot', 'tidak berlaku']
};
/** Modal unggah nilai per mahasiswa. o = { angk, prodi, setelah } */
function unggahNilaiMhs(o) {
  o = o || {};
  const st = { siswa: [], lewat: [], files: [], hasil: null, opsi: { timpa: false, lapor: false }, perlu: false, buka: new Set(), mhs: null, nomor: 0 };
  const kur = {}; (App.M.kurikulum || []).forEach((k) => { kur[k.id] = k; });
  const md = modal({
    judul: 'Unggah nilai per mahasiswa' + (o.angk ? ' · angkatan ' + o.angk : ''), lebar: 'sangat-lebar', tanpaFokus: true,
    desc: 'Untuk file transkrip/KHS: <b>satu sheet = satu mahasiswa</b> (NIM &amp; Nama di atas, tabel Kode MK, Nama MK, Periode, dan Nilai di bawahnya). Nilai otomatis masuk ke mata kuliah yang sesuai, sesuai NIM mahasiswanya.',
    isi: '<div id="un-isi"></div>',
    tombol: [
      { teks: 'Riwayat unggahan', ikon: 'history', kiri: true, aksi: () => { modalRiwayatBatch('Riwayat unggah nilai per mahasiswa', /^UNM-/, 'Unggahan bisa dibatalkan selama nilainya belum dilapor lewat halaman Lapor PDDIKTI. Nilai yang ditandai "sudah dilapor" saat unggah ikut dicabut.', () => { if (o.setelah) o.setelah(); }); return false; } },
      { teks: 'Batal', aksi: () => true },
      { teks: 'Simpan nilai', kelas: 'btn-primary', ikon: 'save', aksi: (close) => simpan(close) }]
  });
  const el = md.el, box = $('#un-isi', el), btnSimpan = $$('.modal-f .btn', el).slice(-1)[0];
  const aturTombol = () => {
    const R = st.hasil && st.hasil.ringkas, n = R ? R.ditulis : 0;
    btnSimpan.disabled = !n; btnSimpan.innerHTML = ic('save') + (n ? 'Simpan ' + fmtInt(n) + ' nilai' : 'Simpan nilai');
    btnSimpan.title = n ? '' : 'Belum ada nilai yang bisa disimpan';
  };
  aturTombol();
  const tahap1 = () => {
    st.hasil = null; aturTombol();
    box.innerHTML = '<div class="drop" id="un-drop">' + ic('upload') + '<div><b>Pilih atau seret file Excel nilai mahasiswa ke sini</b></div><div class="mt-4">Boleh beberapa file sekaligus (.xlsx / .xls / .csv) · satu file boleh berisi banyak sheet</div><input type="file" id="un-file" multiple accept=".xlsx,.xls,.csv" hidden></div>' +
      '<div class="un-contoh mt-16"><div class="lbl mb-4">Bentuk file yang dibaca (contoh satu sheet)</div><div class="un-lembar"><div class="un-id"><span>NIM</span><b class="mono">19.20.1.01</b><span>Nama</span><b>Nama Mahasiswa</b><span>Program Studi</span><b>S1 Ekonomi Syariah</b></div>' +
      '<table class="tbl tbl-compact"><thead><tr><th>No</th><th>Kode MK</th><th>Nama MK</th><th>Periode</th><th class="num">SKS</th><th class="num">Nilai Angka</th><th>Huruf</th><th class="num">Indeks</th></tr></thead><tbody><tr><td>1</td><td class="mono">ESY1418</td><td>Pengantar Akuntansi</td><td>2019/2020 Ganjil</td><td class="num">4</td><td class="num">98</td><td>A</td><td class="num">4</td></tr><tr><td>2</td><td class="mono">WAF1408ESY</td><td>Bahasa Arab I</td><td>2019/2020 Ganjil</td><td class="num">4</td><td class="num">86</td><td>B+</td><td class="num">3,66</td></tr></tbody></table></div>' +
      '<div class="hint mt-8">Mahasiswa dicocokkan lewat <b>NIM</b> (cadangan: nama). Mata kuliah dicocokkan ke kurikulum angkatannya lewat <b>Kode MK</b> (spasi diabaikan; cadangan: nama MK). Nilai yang sudah dilapor tidak pernah diubah. Format daftar impor Neo Feeder (kolom NIM, Kode Mata Kuliah, Semester, Nilai Angka) juga bisa dibaca, begitu pula daftar berkolom <b>Nama mahasiswa</b> tanpa NIM (nama cukup ditulis di baris pertama tiap mahasiswa).</div></div>';
    const drop = $('#un-drop', box), inp = $('#un-file', box);
    drop.onclick = () => inp.click();
    inp.onchange = () => { const f = Array.from(inp.files || []); inp.value = ''; if (f.length) baca(f); };
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); const f = Array.from(e.dataTransfer.files || []).filter((x) => /\.(xlsx|xls|csv)$/i.test(x.name)); if (f.length) baca(f); else toast('Pilih file Excel (.xlsx/.xls/.csv).', 'warn'); });
  };
  async function baca(files) {
    box.innerHTML = '<div class="un-muat">' + ic('sheet') + '<b>Membaca ' + files.length + ' file…</b></div>';
    st.siswa = []; st.lewat = []; st.files = files.map((f) => f.name); st.buka.clear();
    try {
      for (const f of files) { const h = await unmBacaFile(f); st.siswa.push(...h.siswa); st.lewat.push(...h.lewat); }
    } catch (e) { toast('File tidak bisa dibaca: ' + e.message, 'err', 7000); tahap1(); return; }
    if (!st.siswa.length) {
      tahap1();
      box.insertAdjacentHTML('afterbegin', '<div class="alert danger mb-12">' + ic('xc') + '<div><b>Tidak ada data nilai mahasiswa yang terbaca.</b> ' + esc(st.lewat.slice(0, 4).map((x) => x.sheet + ': ' + x.alasan).join(' · ')) + '</div></div>');
      return;
    }
    await cek();
  }
  const muatan = () => ({ angkatan: o.angk || '', opsi: st.opsi, siswa: st.siswa.map((s) => ({ file: s.file, sheet: s.sheet, nim: s.nim, nama: s.nama, prodi: s.prodi, pilih: s.pilih || '', rows: s.rows })) });
  async function cek() {
    const no = ++st.nomor;
    if (!st.hasil) box.innerHTML = '<div class="un-muat">' + ic('sheet') + '<b>Mencocokkan ' + fmtInt(st.siswa.length) + ' mahasiswa dengan data &amp; kurikulum…</b></div>';
    else box.classList.add('memuat');
    const r = await api('unggahNilai.cek', muatan());
    box.classList.remove('memuat');
    if (no !== st.nomor) return;                                             // ada cek yang lebih baru
    if (!r.success) { box.innerHTML = '<div class="alert danger">' + ic('xc') + '<div>' + esc(r.message) + '</div></div>'; st.hasil = null; aturTombol(); return; }
    st.hasil = r.data; aturTombol(); tahap2();
  }
  const kotak = (n, t, cls) => '<div' + (cls ? ' class="' + cls + '"' : '') + '><b>' + fmtInt(n) + '</b><span>' + esc(t) + '</span></div>';
  const pill = (s) => { const x = UNM_ST[s] || ['no-dot', s]; return '<span class="pill ' + x[0] + '">' + esc(x[1]) + '</span>'; };
  const ketBaris = (x) => x.j === 'isi' ? 'Diisi ke peserta kelas ' + x.kl : x.j === 'tambah' ? 'Ditambahkan ke kelas ' + x.kl : x.j === 'baru' ? 'Kelas baru: ' + x.kl : x.j === 'tandai' ? 'Nilai sama sudah ada → ditandai sudah dilapor' : x.j === 'pindah' ? (x.k || 'Dipindah ke kelas ' + x.kl) : (x.k || '');
  const perluCek = (h) => !h.cocok || h.peringatan.length || h.rows.some((x) => ['beda', 'mk', 'nilai', 'periode'].includes(x.s));
  function tahap2() {
    const H = st.hasil, R = H.ringkas, lewatBaris = R.sama + R.beda + R.kunci + R.mk + R.nilai + R.periode + R.ganda + R.tb;
    const daftar = H.siswa.filter((h) => !st.perlu || perluCek(h));
    const alerts = [], kurKosong = (R.kurikulum || []).filter((x) => x.kosong);
    unikk((R.kurikulum || []).map((x) => x.prodi)).forEach((pr) => {                      // v1.3.1: kurikulum belum berlaku
      const x = R.kurikulum.find((y) => y.prodi === pr && y.kosong) || R.kurikulum.find((y) => y.prodi === pr);
      const tombol = x.tanpaTahun ? '<div class="mt-8"><button class="btn btn-sm" data-isi-tahun="' + esc(pr) + '" data-saran="' + esc(x.angkatan) + '">' + ic('edit', 'ic-sm') + 'Isi tahun kurikulum ' + esc(pr) + '…</button></div>' : '';
      if (x.kosong && x.tanpaTahun) alerts.push(['danger', 'xc', '<b>Kurikulum ' + esc(pr) + ' belum punya Tahun kurikulum</b> (' + fmtInt(x.tanpaTahun) + ' MK). Karena itu kurikulum ' + esc(pr) + ' belum berlaku untuk angkatan mana pun, sehingga semua kode MK di file terbaca "MK tidak cocok". Isi tahunnya sekali saja — pratinjau diperbarui otomatis.' + tombol]);
      else if (x.kosong) alerts.push(['danger', 'xc', '<b>Kurikulum ' + esc(pr) + ' belum ada.</b> Impor dulu lewat menu <b>Kurikulum → Impor Sebaran MK</b>, lalu pilih file ini lagi.']);
      else alerts.push(['info', 'info', fmtInt(x.tanpaTahun) + ' MK kurikulum ' + esc(pr) + ' tidak punya tahun kurikulum sehingga diabaikan.' + tombol]);
    });
    if (R.mhsTidak) alerts.push(['warn', 'warn', '<b>' + R.mhsTidak + ' sheet belum cocok dengan mahasiswa mana pun.</b> Pilih mahasiswanya di kolom "Mahasiswa di sistem", atau biarkan (sheet itu dilewati).']);
    if (R.pindah) alerts.push(['info', 'info', '<b>' + R.pindah + ' nilai akan dipindah</b> ke kelas teman seangkatannya. Mata kuliahnya tercatat di dua periode (mis. Ganjil &amp; Genap), jadi nilai terbaiknya disimpan di kelas periode paling awal. Nilai yang sudah dilapor tidak diubah, hanya kelasnya.' + (R.kelasKosong ? ' ' + R.kelasKosong + ' kelas PDDIKTI yang jadi kosong akan dihapus otomatis.' : '') + ' Bisa dibatalkan dari Riwayat unggahan.']);   // v1.4.1
    if (R.beda) alerts.push(['warn', 'warn', '<b>' + R.beda + ' nilai berbeda</b> dengan nilai yang sudah ada (belum dilapor). Centang <b>Timpa nilai yang berbeda</b> bila nilai di file yang benar.']);
    if (R.mk && !kurKosong.length) alerts.push(['info', 'info', '<b>' + R.mk + ' baris</b> kode MK-nya tidak ada di kurikulum angkatan tersebut — dilewati. Periksa kode di file atau kurikulum (menu Kurikulum).']);
    if (R.kunci) alerts.push(['info', 'lock', R.kunci + ' nilai sudah dilapor (terkunci) — tidak diubah.']);
    if (st.lewat.length) alerts.push(['info', 'info', st.lewat.length + ' sheet dilewati: ' + esc(st.lewat.slice(0, 5).map((x) => x.sheet + ' (' + x.alasan + ')').join(', ')) + (st.lewat.length > 5 ? ', …' : '')]);
    box.innerHTML = '<div class="row-wrap mb-12" style="gap:6px">' + st.files.slice(0, 6).map((f) => '<span class="pill no-dot">' + ic('sheet', 'ic-sm') + ' ' + esc(f) + '</span>').join('') + (st.files.length > 6 ? '<span class="pill no-dot">+' + (st.files.length - 6) + ' file</span>' : '') +
      '<span class="muted" style="font-size:12.5px">' + fmtInt(H.siswa.length) + ' sheet mahasiswa terbaca</span><span class="spacer"></span><button class="btn btn-sm btn-ghost" id="un-ganti">' + ic('upload', 'ic-sm') + 'Ganti file</button></div>' +
      (R.ditulis ? '' : '<div class="alert warn mb-8">' + ic('warn') + '<div><b>Belum ada nilai yang bisa disimpan</b>, jadi tombol Simpan belum aktif. Perbaiki penyebab di bawah — pratinjau diperbarui otomatis.</div></div>') +
      '<div class="ringkas-batal">' + kotak(R.ditulis, 'nilai akan disimpan', 'un-utama') + kotak(R.mhsCocok, 'dari ' + R.mhs + ' mahasiswa cocok') + kotak(R.kelasBaru, 'kelas PDDIKTI baru') + kotak(R.kelasLama, 'kelas lama diisi') + kotak(lewatBaris, 'baris dilewati') + '</div>' +
      '<div class="un-opsi mt-12"><label class="check"><input type="checkbox" id="un-timpa"' + (st.opsi.timpa ? ' checked' : '') + '>Timpa nilai yang berbeda <span class="muted">(hanya yang belum dilapor)</span></label>' +
      '<label class="check"><input type="checkbox" id="un-lapor"' + (st.opsi.lapor ? ' checked' : '') + '>Nilai ini sudah ada di PDDIKTI (Neo Feeder) → tandai <b>SUDAH DILAPOR</b> <span class="muted">(huruf &amp; indeks dari file, langsung terkunci)</span></label></div>' +
      alerts.map((a) => '<div class="alert ' + a[0] + ' mt-8">' + ic(a[1]) + '<div>' + a[2] + '</div></div>').join('') +
      '<div class="row mt-12 mb-8"><b>Per mahasiswa</b><span class="muted" style="font-size:12.5px">klik baris untuk melihat tiap mata kuliah</span><span class="spacer"></span><label class="check"><input type="checkbox" id="un-perlu"' + (st.perlu ? ' checked' : '') + '>Hanya yang perlu dicek</label></div>' +
      '<div class="tbl-wrap" style="max-height:46vh"><table class="tbl tbl-compact" id="un-tbl"><thead><tr><th style="width:28px"></th><th>Di file (sheet)</th><th>Mahasiswa di sistem</th><th class="num">Disimpan</th><th class="num">Dilewati</th><th>Catatan</th></tr></thead><tbody>' +
      (daftar.length ? daftar.map(barisMhs).join('') : '<tr><td colspan="6">' + kosong('Semua beres', 'Tidak ada yang perlu dicek.', 'checkc') + '</td></tr>') + '</tbody></table></div>';
    $('#un-ganti', box).onclick = tahap1;
    $('#un-timpa', box).onchange = (e) => { st.opsi.timpa = e.target.checked; cek(); };
    $('#un-lapor', box).onchange = (e) => { st.opsi.lapor = e.target.checked; cek(); };
    $('#un-perlu', box).onchange = (e) => { st.perlu = e.target.checked; tahap2(); };
    $$('[data-isi-tahun]', box).forEach((b) => { b.onclick = () => isiTahunKurikulum(b.dataset.isiTahun, b.dataset.saran, () => cek()); });   // v1.3.1
    const tb = $('#un-tbl', box);
    tb.addEventListener('click', (e) => {
      if (e.target.closest('select')) return;
      const tr = e.target.closest('tr[data-i]'); if (!tr) return;
      const i = Number(tr.dataset.i), d = tr.nextElementSibling;
      if (st.buka.has(i)) { st.buka.delete(i); d.hidden = true; tr.classList.remove('buka'); }
      else { st.buka.add(i); if (!d.dataset.isi) { d.firstChild.innerHTML = detailMhs(H.siswa.find((h) => h.i === i)); d.dataset.isi = 1; } d.hidden = false; tr.classList.add('buka'); }
    });
    tb.addEventListener('change', (e) => { const s = e.target.closest('select[data-pilih]'); if (!s) return; st.siswa[Number(s.dataset.pilih)].pilih = s.value; cek(); });
    if (st.mhs === null && H.siswa.some((h) => !h.cocok)) { st.mhs = []; Store.ambil('mhs.list', {}).then((r) => { if (r.success) { st.mhs = r.data; $$('select[data-pilih]', box).forEach((s) => { s.innerHTML = opsiMhs(Number(s.dataset.pilih)); }); } }); }
  }
  const opsiMhs = (i) => {
    const h = st.hasil.siswa.find((x) => x.i === i) || { kand: [] }, pil = st.siswa[i].pilih || '';
    const kand = (h.kand || []).map((m) => m.nim), daftar = (st.mhs || []).filter((m) => !o.angk || String(m.ikut_angkatan) === String(o.angk) || kand.includes(m.nim)).sort((a, b) => (kand.includes(b.nim) - kand.includes(a.nim)) || String(a.nama).localeCompare(String(b.nama)));
    return '<option value="">— lewati sheet ini —</option>' + daftar.map((m) => '<option value="' + esc(m.nim) + '"' + (pil === m.nim ? ' selected' : '') + '>' + esc(m.nim + ' · ' + m.nama + ' (' + m.prodi + ' ' + m.ikut_angkatan + ')') + '</option>').join('');
  };
  function barisMhs(h) {
    const s = st.siswa[h.i], m = h.cocok;
    const cara = { nim: '', nama: '<span class="pill info" title="Dicocokkan lewat nama">via nama</span>', manual: '<span class="pill brand no-dot">dipilih</span>' }[h.cara] || '';
    const kolomMhs = m ? '<b style="font-weight:600">' + esc(m.nama) + '</b> ' + cara + '<div class="sub"><span class="mono">' + esc(m.nim) + '</span> · ' + esc(m.prodi) + ' ' + esc(m.angkatan) + ' · ' + esc(m.status) + '</div>' +
      (h.cara === 'manual' ? '<select class="input input-sm mt-4" data-pilih="' + h.i + '">' + opsiMhs(h.i) + '</select>' : '')
      : '<div class="row gap-4"><span class="pill warn">' + (h.cara === 'ganda' ? 'nama ganda' : 'tidak ditemukan') + '</span></div><select class="input input-sm mt-4" data-pilih="' + h.i + '" style="max-width:320px">' + opsiMhs(h.i) + '</select>';
    const cat = h.peringatan.map((p) => '<div class="sub" style="color:var(--warn)">' + ic('warn', 'ic-sm') + ' ' + esc(p) + '</div>').join('');
    return '<tr data-i="' + h.i + '" class="un-mhs' + (st.buka.has(h.i) ? ' buka' : '') + (m ? '' : ' r-ragu') + '"><td class="center muted">' + ic('next', 'ic-sm un-panah') + '</td><td><div class="mono">' + esc(s.nim || '–') + '</div><div class="sub">' + esc(s.nama || '–') + ' · <span title="' + esc(s.file) + '">' + esc(s.sheet) + '</span></div></td><td>' + kolomMhs + '</td>' +
      '<td class="num"><b>' + fmtInt(h.n.simpan) + '</b></td><td class="num">' + fmtInt(h.n.lewat) + '</td><td>' + (cat || '<span class="soft">–</span>') + '</td></tr>' +
      '<tr class="un-det"' + (st.buka.has(h.i) ? ' data-isi="1"' : ' hidden') + '><td colspan="6">' + (st.buka.has(h.i) ? detailMhs(h) : '') + '</td></tr>';
  }
  function detailMhs(h) {
    const s = st.siswa[h.i];
    if (!h.cocok) return '<div class="muted" style="padding:6px 4px">' + fmtInt(s.rows.length) + ' baris nilai — pilih mahasiswanya dulu untuk melihat pencocokan MK.</div>';
    return '<table class="tbl tbl-compact un-dalam"><thead><tr><th>Kode di file</th><th>Mata kuliah di file</th><th>Periode</th><th class="num">Nilai</th><th>MK kurikulum</th><th>Hasil</th></tr></thead><tbody>' +
      h.rows.map((x, j) => {
        const f = s.rows[j] || {}, k = kur[x.mk];
        return '<tr class="' + (UNM_SIMPAN_FE[x.s] ? '' : 'r-off') + '"><td class="mono nowrap">' + esc(f.kode) + '</td><td>' + esc(f.nama) + '</td><td class="nowrap">' + esc(x.p ? labelPeriode(x.p) : (f.periodeTeks || '–')) + (f.pendek ? ' <span class="pill no-dot" title="Semester pendek dicatat ke periode genap">pendek</span>' : '') + '</td>' +
          '<td class="num nowrap">' + esc(f.angka === null || f.angka === undefined ? '–' : String(f.angka).replace('.', ',')) + (f.huruf ? ' <span class="sub">' + esc(f.huruf) + '</span>' : '') + (x.a !== undefined && x.a !== null ? '<div class="sub" style="display:block">sudah ada: ' + esc(String(x.a).replace('.', ',')) + '</div>' : '') + '</td>' +
          '<td>' + (k ? '<span class="mono">' + esc(k.kode_mk) + '</span> ' + esc(k.nama_mk) + (x.c === 'nama' ? ' <span class="pill info" title="Cocok lewat nama MK">nama</span>' : '') : '<span class="soft">–</span>') + '</td>' +
          '<td>' + pill(x.s) + ' <span class="sub">' + esc(ketBaris(x)) + '</span></td></tr>';
      }).join('') + '</tbody></table>';
  }
  async function simpan(close) {
    const R = st.hasil && st.hasil.ringkas;
    if (!R || !R.ditulis) { toast('Belum ada nilai yang bisa disimpan.', 'warn'); return false; }
    const ket = fmtInt(R.ditulis) + ' nilai untuk ' + fmtInt(st.hasil.siswa.filter((h) => h.cocok && h.n.simpan).length) + ' mahasiswa' + (R.kelasBaru ? ', ' + R.kelasBaru + ' kelas PDDIKTI baru dibuat' : '');
    const ok = st.opsi.lapor
      ? await konfirmasiKetik({ judul: 'Simpan & tandai SUDAH DILAPOR', kata: 'LAPOR', tombolTeks: 'Simpan & tandai', pesan: 'Simpan <b>' + ket + '</b> dan tandai semuanya <b>SUDAH DILAPOR</b> (terkunci)? Pilih ini hanya bila nilai di file memang sudah ada di Neo Feeder/PDDIKTI. Bisa dibatalkan dari Riwayat unggahan.' })
      : await konfirmasi('Simpan nilai', 'Simpan <b>' + ket + '</b>? Unggahan bisa dibatalkan dari <b>Riwayat unggahan</b> selama nilainya belum dilapor.', 'Simpan');
    if (!ok) return false;
    const r = await api('unggahNilai.simpan', muatan());
    if (!r.success) { toast(r.message, 'err', 7000); return false; }
    close();
    if (r.data.cermin) await App.segarkanMaster();
    hasilUnggah(r);
    if (o.setelah) o.setelah();
    return false;
  }
  function hasilUnggah(r) {
    const d = r.data, ko = d.kohort[0] || {};
    modal({ judul: 'Nilai tersimpan', desc: '<span class="mono">' + esc(d.batch) + '</span>',
      isi: '<div class="alert ok mb-12">' + ic('checkc') + '<div>' + esc(r.message) + '</div></div><div class="ringkas-batal">' + kotak(d.nilai, 'nilai baru') + kotak(d.timpa, 'nilai diganti') + kotak(d.mhs, 'mahasiswa') + kotak(d.kelasBaru, 'kelas PDDIKTI baru') + kotak(d.kelasLama, 'kelas lama diisi') + (d.pindah ? kotak(d.pindah, 'nilai dipindah kelas') : '') + '</div>' +
        '<div class="hint mt-12">Kelas mengikuti periode di file (' + esc(d.periode.map(labelPeriode).join(', ')) + '). Semua kelas &amp; nilainya bisa dilihat sekaligus di <b>Rekap nilai angkatan</b>.' + (d.lapor ? ' Nilai sudah ditandai SUDAH DILAPOR.' : ' Status nilai: <b>Siap lapor</b>.') + '</div>',
      tombol: [{ teks: 'Tutup', aksi: () => true }].concat(ko.prodi ? [{ teks: 'Buka rekap ' + ko.prodi + ' ' + ko.angkatan, kelas: 'btn-primary', ikon: 'layers', aksi: () => { App.pergi('/perkuliahan/rekap?prodi=' + encodeURIComponent(ko.prodi) + '&angkatan=' + encodeURIComponent(ko.angkatan) + '&saring=semua'); return true; } }] : []) });
  }
  tahap1();
  return md;
}
const UNM_SIMPAN_FE = { simpan: 1, timpa: 1, tandai: 1, ada: 1, pindah: 1 };

/* ==========================================================================
   v1.3 — "UNDUH DAFTAR" FORMAT IMPOR NILAI NEO FEEDER
   Kolom: NIM · Nama Mahasiswa · Kode Mata Kuliah · Nama Mata Kuliah · Semester · Nama Kelas ·
   Nilai Huruf · Nilai Indeks · Nilai Angka · Kode Prodi · Nama Prodi (judul merah/kuning/hijau).
   Kode & nama MK PDDIKTI (lewat Peta Klaim), semester, nama kelas, kode & nama prodi dipetakan di
   server saat diunduh — nama MK riil & kelas di sistem tidak diubah.
   ========================================================================== */
async function unduhDaftarFeeder(k, kelasId) {
  const [r, ExcelJS] = await Promise.all([api('nilai.feeder', { kelas_id: kelasId }), muat('exceljs')]);
  if (!r.success) { toast(r.message, 'err'); return; }
  const d = r.data;
  if (!d.rows.length) { toast('Kelas ini belum punya peserta.', 'warn'); return; }
  const MERAH = 'FFFF0000', KUNING = 'FFFFFF00', HIJAU = 'FF00FF00', tipis = { style: 'thin', color: { argb: 'FFBFBFBF' } }, garis = { top: tipis, left: tipis, bottom: tipis, right: tipis };
  const kol = [['NIM', MERAH, 13, 'NIM mahasiswa'], ['Nama Mahasiswa', KUNING, 32, 'Nama lengkap mahasiswa'], ['Kode Mata Kuliah', MERAH, 20, 'Kode mata kuliah sesuai kurikulum di PDDIKTI'],
    ['Nama Mata Kuliah', KUNING, 34, 'Nama mata kuliah sesuai kurikulum di PDDIKTI'], ['Semester', MERAH, 13, 'Kode semester: tahun + 1 (ganjil) / 2 (genap), mis. 20252 = Genap 2025/2026'],
    ['Nama Kelas', MERAH, 13, 'Nama kelas kuliah di PDDIKTI'], ['Nilai Huruf', HIJAU, 12, 'Nilai huruf (A, B+, B, …)'], ['Nilai Indeks', HIJAU, 13, 'Nilai indeks / bobot (0–4)'],
    ['Nilai Angka', HIJAU, 13, 'Nilai angka (0–100)'], ['Kode Prodi', MERAH, 12, 'Kode program studi di PDDIKTI'], ['Nama Prodi', KUNING, 28, 'Nama program studi']];
  const wb = new ExcelJS.Workbook(); wb.creator = 'NILAI – AL WAFA';
  const ws = wb.addWorksheet('Sheet1', { views: [{ state: 'frozen', ySplit: 1 }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = kol.map((c) => ({ width: c[2] }));
  const hr = ws.getRow(1); hr.values = kol.map((c) => c[0]); hr.height = 18;
  kol.forEach((c, i) => {
    const cell = hr.getCell(i + 1);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c[1] } };
    cell.font = { bold: true, color: { argb: c[1] === KUNING ? 'FF000000' : 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' }; cell.border = garis; cell.note = c[3];
  });
  d.rows.forEach((x, i) => {
    const row = ws.getRow(i + 2), nimAngka = /^[1-9]\d{0,14}$/.test(x.nim);
    row.values = [nimAngka ? Number(x.nim) : x.nim, x.nama, x.kode, x.mk, x.semester, x.nama_kelas, x.huruf || '', x.indeks === '' || x.indeks === null ? null : Number(x.indeks),
      x.angka === '' || x.angka === null ? null : Number(x.angka), d.kode_prodi, d.nama_prodi];
    [3, 5, 6, 10].forEach((c) => { row.getCell(c).numFmt = '@'; });
    if (!nimAngka) row.getCell(1).numFmt = '@';
  });
  const buf = await wb.xlsx.writeBuffer(), c0 = d.klaim[0];
  const nama = namaFile('Daftar_Nilai_' + (c0 ? c0.kode + '_' + (d.rows[0].nama_kelas || '') + '_' + d.rows[0].semester : (d.mk_riil || k.mk) + '_' + k.ikut_angkatan));
  unduhBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nama + '.xlsx');
  const info = d.peringatan.slice();
  if (d.klaim.length > 1) info.push('MK ini diklaim untuk ' + d.klaim.length + ' MK PDDIKTI (' + d.klaim.map((c) => c.kode).join(', ') + ') — tiap mahasiswa muncul ' + d.klaim.length + ' baris.');
  toast(info.length ? 'Daftar diunduh. ' + info.join(' ') : 'Daftar nilai (format impor Neo Feeder) diunduh.', info.length ? 'warn' : 'ok', info.length ? 9000 : 3200);
}

/* ==========================================================================
   v1.3.1 — ISI TAHUN KURIKULUM YANG KOSONG
   MK kurikulum tanpa tahun tidak pernah berlaku untuk angkatan mana pun. Modal ini mengisi tahunnya sekaligus
   (bisa dibatalkan lewat Kurikulum → Riwayat impor). setelah(tahun) dipanggil sesudah berhasil.
   ========================================================================== */
function isiTahunKurikulum(prodi, saran, setelah) {
  const n = (App.M.kurikulum || []).filter((k) => k.prodi === prodi && !String(k.tahun_kurikulum ?? '').trim()).length;
  const ada = unikk((App.M.kurikulum || []).filter((k) => k.prodi === prodi && String(k.tahun_kurikulum ?? '').trim()).map((k) => String(k.tahun_kurikulum).trim())).sort();
  modal({ judul: 'Isi tahun kurikulum ' + prodi,
    desc: (n ? fmtInt(n) + ' MK' : 'MK') + ' kurikulum <b>' + esc(prodi) + '</b> yang belum punya tahun akan diberi tahun ini sekaligus.',
    isi: '<div class="field"><label class="req">Tahun kurikulum</label><input class="input" id="it-tahun" inputmode="numeric" maxlength="4" value="' + esc(/^\d{4}$/.test(String(saran || '')) ? saran : '') + '" placeholder="mis. 2019" style="width:140px"></div>' +
      '<div class="hint mt-8">Kurikulum yang berlaku untuk suatu angkatan = tahun kurikulum terbaru yang ≤ tahun angkatan. Bila ' + esc(prodi) + ' hanya punya satu kurikulum, tahun berapa pun tetap berlaku untuk semua angkatan — biasanya diisi tahun mulai kurikulum itu dipakai (mis. 2019).' +
      (ada.length ? ' Tahun yang sudah ada: <b>' + esc(ada.join(', ')) + '</b>.' : '') + ' Bisa dibatalkan lewat <b>Kurikulum → Riwayat impor</b>.</div>',
    tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Isi tahun', kelas: 'btn-primary', ikon: 'check', aksi: async (close, m) => {
      const t = $('#it-tahun', m).value.trim();
      if (!/^\d{4}$/.test(t)) { toast('Isi tahun 4 angka, mis. 2019.', 'warn'); return false; }
      const r = await api('kurikulum.isiTahun', { prodi: prodi, tahun: t });
      if (!r.success) { toast(r.message, 'err', 7000); return false; }
      await App.segarkanMaster(); toast(r.message, 'ok', 6000); close();
      if (setelah) setelah(t);
      return false;
    } }] });
}

/* ==========================================================================
   v1.4 — HAPUS KELAS (mis. kelas yang MK riilnya sudah dihapus → "(MK dihapus)")
   Pratinjau dulu (kelas.hapusCek): kelas dengan nilai SUDAH DILAPOR tidak bisa dihapus; kelas yang sudah
   punya nilai (belum dilapor) hanya ikut dihapus bila dicentang. Ketik HAPUS. Bisa dibatalkan (batch KLSDEL-).
   ========================================================================== */
async function hapusKelas(ids, setelah) {
  ids = (ids || []).filter(Boolean);
  if (!ids.length) return;
  const c = await api('kelas.hapusCek', { ids: ids });
  if (!c.success) { toast(c.message, 'err'); return; }
  const D = c.data.daftar, R = c.data.ringkas;
  if (!D.length) { toast('Kelas tidak ditemukan — mungkin sudah dihapus. Tekan Refresh.', 'warn'); if (setelah) setelah(); return; }
  const st = (x) => !x.bisa ? '<span class="pill s-SD">' + x.dilapor + ' sudah dilapor · tidak bisa</span>' : x.terisi ? '<span class="pill warn">' + x.terisi + ' nilai terisi</span>' : '<span class="pill no-dot">belum ada nilai</span>';
  const md = modal({ judul: 'Hapus ' + (D.length > 1 ? D.length + ' kelas' : 'kelas'), lebar: 'lebar',
    desc: 'Kelas dan daftar pesertanya dihapus dari Perkuliahan &amp; Nilai. Data mahasiswa, MK, dan Peta Klaim tidak tersentuh. Bisa dibatalkan lewat <b>Riwayat hapus kelas</b>.',
    isi: '<div class="tbl-wrap" style="max-height:44vh"><table class="tbl tbl-compact"><thead><tr><th>Mata kuliah</th><th>Periode</th><th>Program</th><th class="num">Peserta</th><th>Nilai</th></tr></thead><tbody>' +
      D.map((x) => '<tr class="' + (x.bisa ? '' : 'r-off') + '"><td>' + (x.yatim ? '<span class="danger-t">(MK dihapus)</span>' : esc(x.mk)) + '<div class="sub">' + esc(x.prodi + ' · angkatan ' + x.angkatan) + '</div></td><td class="nowrap">' + esc(labelPeriode(x.periode)) + '</td><td>' + esc(x.pddikti ? 'PDDIKTI' : progLabel(x.program)) + (x.rombel && x.rombel !== 'A' ? ' · ' + esc(x.rombel) : '') + '</td><td class="num">' + fmtInt(x.peserta) + '</td><td>' + st(x) + '</td></tr>').join('') + '</tbody></table></div>' +
      (R.bernilai ? '<label class="check mt-12"><input type="checkbox" id="hk-nilai">Hapus juga ' + R.bernilai + ' kelas yang sudah punya nilai (' + fmtInt(R.terisi) + ' nilai belum dilapor)</label>' : '') +
      (R.terkunci ? '<div class="alert info mt-12">' + ic('lock') + '<div>' + R.terkunci + ' kelas punya nilai yang sudah dilapor — dilewati (nilai yang sudah dilapor tidak boleh berubah).</div></div>' : '') +
      '<div class="field mt-12"><label>Ketik <b>HAPUS</b> untuk konfirmasi</label><input class="input" id="hk-ketik" autocomplete="off" style="max-width:200px"></div>',
    tombol: [
      { teks: 'Riwayat hapus kelas', ikon: 'history', kiri: true, aksi: () => { modalRiwayatBatch('Riwayat hapus kelas', /^KLSDEL-/, 'Kelas yang dihapus bisa dikembalikan utuh beserta peserta & nilainya.', () => { if (setelah) setelah(); }); return false; } },
      { teks: 'Batal', aksi: () => true },
      { teks: 'Hapus', kelas: 'btn-danger', ikon: 'trash', aksi: async (close, m) => {
        if ($('#hk-ketik', m).value.trim() !== 'HAPUS') { toast('Ketik HAPUS untuk konfirmasi.', 'warn'); return false; }
        const ikut = !!($('#hk-nilai', m) || {}).checked;
        const n = D.filter((x) => x.bisa && (!x.terisi || ikut)).length;
        if (!n) { toast(R.bernilai ? 'Kelas itu sudah punya nilai — centang "Hapus juga…" bila memang ingin dihapus.' : 'Tidak ada kelas yang bisa dihapus.', 'warn', 6000); return false; }
        const r = await api('kelas.hapus', { ids: D.map((x) => x.id), sertakanNilai: ikut, konfirmasi: 'HAPUS' });
        if (!r.success) { toast(r.message, 'err', 7000); return false; }
        toast(r.message, 'ok', 6000); close();
        if (setelah) setelah();
        return false;
      } }] });
  return md;
}
