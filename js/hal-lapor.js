/* ==========================================================================
   hal-lapor.js — Lapor PDDIKTI (unduh Neo Feeder + tandai) · Ma'had Aly · Kelulusan
                  Cetak KHS & Transkrip (A4) · Terbitkan dokumen resmi (Doc Engine)
   ========================================================================== */
'use strict';
const prodiResmi = (kode) => { const p = (App.M.prodi || []).find((x) => x.kode === kode); return p ? (p.nama_resmi || p.nama) : kode; };
const namaFile = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_');

/* ============================================================== LAPOR PDDIKTI */
Hal.lapor = {
  prefetch() { prefetch('lapor.kelas', { periode: App.periode }); },
  render(el, ctx) {
    const f = Object.assign({ prodi: '', st: '', q: '' }, App.ingat('lapor') || {});
    const edit = {};
    el.innerHTML = '<div class="page-head"><div><h2>Lapor PDDIKTI · ' + esc(labelPeriode(App.periode)) + '</h2><div class="desc">Kelas lapor = MK PDDIKTI × kelas A/B, disusun otomatis dari Peta Klaim. Unduh file siap impor Neo Feeder, lalu tandai sudah dilapor.</div></div></div>' +
      '<div id="lp-kpi">' + skelKpi(4).replace('g6', 'g4') + '</div><div class="card mt-16"><div class="toolbar"><div class="search" style="width:240px">' + ic('search') + '<input class="input" id="lp-q" placeholder="Cari kode / MK / nama kelas…" value="' + esc(f.q) + '"></div><select class="input" id="lp-prodi">' + opsi(App.prodi().map((x) => x.kode), f.prodi, null, 'Semua prodi') + '</select><select class="input" id="lp-st">' + opsi([{ v: 'SL', t: 'Siap lapor' }, { v: 'MN', t: 'Masih menunggu nilai' }, { v: 'SD', t: 'Sudah dilapor' }], f.st, null, 'Semua status') + '</select><span class="spacer"></span><button class="btn btn-sm" id="lp-simpan" disabled>' + ic('save') + 'Simpan nama kelas & dosen</button><button class="btn btn-sm" id="lp-unduh">' + ic('download') + 'Unduh terpilih</button><button class="btn btn-sm btn-primary" id="lp-tandai">' + ic('lock') + 'Tandai sudah dilapor</button></div><div id="lp-tbl">' + skelTabel(10) + '</div></div>' +
      '<div class="alert info mt-12">' + ic('info') + '<div>Hanya nilai berstatus <b>Siap lapor</b> yang masuk file. Setelah ditandai <b>Sudah dilapor</b>, nilai, kelas, dan dosen dibekukan dan tidak bisa diubah dari halaman mana pun.</div></div>';
    let L = null;
    const dosenOps = App.M.dosen.filter((d) => String(d.aktif) !== '0').map((d) => ({ v: d.id, t: d.nama }));
    const t = Tabel($('#lp-tbl', el), { id: (r) => r.key, pilih: true, perHalaman: 50, tinggi: true, urut: 'kode', kolom: [
      { k: 'kode', label: 'Kode', cls: 'mono nowrap' },
      { k: 'nama', label: 'MK PDDIKTI', html: (r) => '<b style="font-weight:600">' + esc(r.nama) + '</b><div class="sub">' + esc(r.prodi) + ' ' + esc(r.angkatan) + ' · smt ' + r.smt + ' · ' + r.sks + ' SKS</div>' },
      { k: 'kelas', label: 'Kelas', html: (r) => kelasTag(r.kelas) },
      { k: 'nama_kelas', label: 'Nama kelas', sort: false, html: (r) => r.status === 'SD' ? esc(r.nama_kelas) : '<input class="input input-sm" style="width:110px" data-nk="' + esc(r.key) + '" value="' + esc((edit[r.key] || {}).nama_kelas !== undefined ? edit[r.key].nama_kelas : r.nama_kelas) + '">' },
      { k: 'dosen', label: 'Dosen', sort: false, html: (r) => r.status === 'SD' ? esc(r.dosen) : '<select class="input input-sm" style="width:190px" data-ds="' + esc(r.key) + '">' + opsi(dosenOps, (edit[r.key] || {}).dosen_id !== undefined ? edit[r.key].dosen_id : r.dosen_id, null, '— pilih —') + '</select>' },
      { k: 'n', label: 'Mhs', cls: 'num' },
      { k: 'SL', label: 'Siap', cls: 'num', html: (r) => r.SL ? '<b style="color:#92400E">' + r.SL + '</b>' : '0' },
      { k: 'MN', label: 'Tunggu', cls: 'num', html: (r) => r.MN ? '<b style="color:#B91C1C">' + r.MN + '</b>' : '0' },
      { k: 'SD', label: 'Lapor', cls: 'num', html: (r) => (r.SD || 0) + (r.SX ? '<span style="color:var(--s-SX)" title="ada selisih"> ⚠' + r.SX + '</span>' : '') },
      { k: 'status', label: 'Status', html: (r) => pillStatus(r.status, r.status === 'SD' ? 'Sudah dilapor' : r.status === 'MN' ? 'Menunggu nilai' : 'Siap lapor') }
    ], cari: (r) => r.kode + ' ' + r.nama + ' ' + r.nama_kelas, klik: (r) => pratinjau(r), kosong: 'Tidak ada kelas lapor di periode ini', kosongDesc: 'Pastikan Peta Klaim sudah menentukan periode lapor = ' + labelPeriode(App.periode) + '.' });
    const saring = () => {
      f.prodi = $('#lp-prodi', el).value; f.st = $('#lp-st', el).value; f.q = $('#lp-q', el).value; App.ingat('lapor', f);
      t.st.q = f.q; t.saring((r) => (!f.prodi || r.prodi === f.prodi) && (!f.st || r.status === f.st));
    };
    const tampil = (d) => {
      L = d;
      const k = d.kelas, siap = k.filter((x) => x.status === 'SL').length, mn = k.filter((x) => x.MN > 0).length, sd = k.filter((x) => x.status === 'SD').length;
      $('#lp-kpi', el).innerHTML = '<div class="grid g4">' + [['', 'lapor', k.length, 'Kelas lapor'], ['k-SL', 'send', siap + ' <span class="muted" style="font-size:14px">(' + fmtInt(k.reduce((s, x) => s + x.SL, 0)) + ' nilai)</span>', 'Siap diunduh & dilapor'], ['k-MN', 'hour', mn, 'Kelas masih ada yang menunggu nilai'], ['k-SD', 'lock', sd, 'Sudah dilapor (terkunci)']].map((x) => '<div class="card kpi ' + x[0] + '"><div class="kpi-ic">' + ic(x[1]) + '</div><div><div class="kpi-v">' + x[2] + '</div><div class="kpi-l">' + x[3] + '</div></div></div>').join('') + '</div>';
      t.st.rows = k; saring();
    };
    $('#lp-tbl', el).addEventListener('input', (e) => { const k = e.target.dataset.nk; if (k) { edit[k] = Object.assign(edit[k] || {}, { nama_kelas: e.target.value }); $('#lp-simpan', el).disabled = false; } });
    $('#lp-tbl', el).addEventListener('change', (e) => { const k = e.target.dataset.ds; if (k) { edit[k] = Object.assign(edit[k] || {}, { dosen_id: e.target.value }); $('#lp-simpan', el).disabled = false; } });
    $('#lp-q', el).oninput = debounce(saring, 150); $('#lp-prodi', el).onchange = saring; $('#lp-st', el).onchange = saring;
    const infoDari = (r) => ({ nama_kelas: (edit[r.key] || {}).nama_kelas !== undefined ? edit[r.key].nama_kelas : r.nama_kelas, dosen_id: (edit[r.key] || {}).dosen_id !== undefined ? edit[r.key].dosen_id : r.dosen_id });
    const simpanEdit = async () => {
      const rows = Object.keys(edit).map((k) => Object.assign({ key: k }, infoDari(L.kelas.find((x) => x.key === k))));
      if (!rows.length) return true;
      const r = await api('lapor.simpanKelas', { rows: rows });
      if (!r.success) { toast(r.message, 'err'); return false; }
      Object.keys(edit).forEach((k) => { const x = L.kelas.find((y) => y.key === k); Object.assign(x, edit[k]); if (edit[k].dosen_id !== undefined) { const ds = App.dosen(edit[k].dosen_id); x.dosen = ds.nama || ''; x.nidn = ds.nidn || ''; x.nuptk = ds.nuptk || ''; } delete edit[k]; });
      $('#lp-simpan', el).disabled = true; return true;
    };
    $('#lp-simpan', el).onclick = (e) => tombolProses(e.currentTarget, async () => { if (await simpanEdit()) toast('Nama kelas & dosen tersimpan.'); });
    $('#lp-unduh', el).onclick = (e) => {
      const pilih = t.dipilih(); if (!pilih.length) return toast('Centang kelas yang akan diunduh.', 'warn');
      tombolProses(e.currentTarget, async () => { await simpanEdit(); await unduhKelas(pilih.map((r) => Object.assign({}, r, infoDari(r))), false); });
    };
    $('#lp-tandai', el).onclick = async () => {
      const pilih = t.dipilih().filter((r) => r.SL > 0);
      if (!pilih.length) return toast('Centang kelas berstatus siap lapor.', 'warn');
      const tanpaDosen = pilih.filter((r) => !infoDari(r).dosen_id);
      const nNilai = pilih.reduce((s, r) => s + r.SL, 0);
      const ok = await konfirmasiKetik({ judul: 'Tandai sudah dilapor', kata: 'LAPOR', bahaya: true, tombolTeks: 'Tandai & kunci',
        pesan: '<b>' + nNilai + ' nilai</b> dari <b>' + pilih.length + ' kelas</b> akan dibekukan sebagai SUDAH DILAPOR beserta nama kelas & dosennya. Tindakan ini tidak bisa dibatalkan.' + (tanpaDosen.length ? '<br><br>⚠ ' + tanpaDosen.length + ' kelas belum ada dosennya.' : '') + (pilih.some((r) => r.MN) ? '<br>⚠ Mahasiswa yang masih menunggu nilai tidak ikut ditandai.' : '') });
      if (!ok) return;
      await simpanEdit();
      const info = {}; pilih.forEach((r) => { info[r.key] = infoDari(r); });
      const r = await api('lapor.tandai', { periode: App.periode, keys: pilih.map((x) => x.key), info: info, konfirmasi: 'LAPOR' });
      toast(r.message, r.success ? 'ok' : 'err', 6000);
      if (r.success) { t.bersihPilih(); const rr = await Store.ambil('lapor.kelas', { periode: App.periode }, { langsung: true }); if (rr.success && ctx.alive) tampil(rr.data); }
    };
    const pratinjau = async (r) => {
      const md = modal({ judul: r.kode + ' · ' + r.nama + ' — kelas ' + r.kelas, desc: esc(r.prodi + ' ' + r.angkatan + ' · ' + infoDari(r).nama_kelas + ' · ' + (App.dosen(infoDari(r).dosen_id).nama || 'dosen belum dipilih')), lebar: 'lebar', isi: skelTabel(8),
        tombol: [{ teks: 'Tutup', aksi: () => true }, { teks: 'Unduh .xlsx', ikon: 'download', kelas: 'btn-primary', aksi: async () => { await simpanEdit(); await unduhKelas([Object.assign({}, r, infoDari(r))], r.status === 'SD'); return false; } }] });
      const d = await api('lapor.detail', { periode: App.periode, prodi: r.prodi, keys: [r.key] });
      if (!d.success) { $('.modal-b', md.el).innerHTML = '<div class="alert danger">' + esc(d.message) + '</div>'; return; }
      const ps = d.data[r.key] || [];
      $('.modal-b', md.el).innerHTML = '<div class="tbl-wrap" style="max-height:58vh"><table class="tbl tbl-compact"><thead><tr><th>No</th><th>NIM</th><th>Nama mahasiswa</th><th class="num">Nilai angka</th><th>Huruf</th><th class="num">Indeks</th><th>Status</th></tr></thead><tbody>' + ps.map((p, i) => '<tr><td class="center">' + (i + 1) + '</td><td class="mono">' + esc(p.nim) + '</td><td>' + esc(p.nama) + '</td><td class="num">' + fmt2(p.nilai) + '</td><td><b>' + esc(p.huruf) + '</b></td><td class="num">' + fmt2(p.indeks) + '</td><td>' + pillStatus(p.status) + '</td></tr>').join('') + '</tbody></table></div>';
    };
    pakai(ctx, 'lapor.kelas', { periode: App.periode }, tampil);
  }
};

/** Buat file .xlsx format "DAFTAR NILAI MAHASISWA" (Neo Feeder) per kelas; >1 kelas → ZIP. */
async function unduhKelas(kelas, sertakanLapor) {
  if (!kelas.length) return;
  const [ExcelJS] = await Promise.all([muat('exceljs'), kelas.length > 1 ? muat('jszip') : null]);
  const byProdi = {}; kelas.forEach((k) => { (byProdi[k.prodi] = byProdi[k.prodi] || []).push(k.key); });
  const detail = {};
  for (const pr of Object.keys(byProdi)) { const r = await api('lapor.detail', { periode: App.periode, prodi: pr, keys: byProdi[pr] }); if (!r.success) { toast(r.message, 'err'); return; } Object.assign(detail, r.data); }
  const inst = App.M.pengaturan.INSTITUSI_NAMA || 'Sekolah Tinggi Ilmu Syariah (STIS) Al Wafa';
  const files = [], peringatan = [];
  for (const k of kelas) {
    const ps = (detail[k.key] || []).filter((p) => p.status === 'SL' || (sertakanLapor && (p.status === 'SD' || p.status === 'SX'))).sort((a, b) => String(a.nim).localeCompare(String(b.nim)));
    const mn = (detail[k.key] || []).filter((p) => p.status === 'MN').length;
    if (mn) peringatan.push(k.kode + ' kelas ' + k.kelas + ': ' + mn + ' mahasiswa menunggu nilai (tidak masuk file)');
    if (!ps.length) { peringatan.push(k.kode + ' kelas ' + k.kelas + ': tidak ada nilai siap lapor'); continue; }
    const ds = App.dosen(k.dosen_id);
    const wb = new ExcelJS.Workbook(); wb.creator = 'NILAI – AL WAFA';
    const ws = wb.addWorksheet('Daftar Nilai', { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    ws.columns = [{ width: 13 }, { width: 18 }, { width: 40 }, { width: 13 }, { width: 12 }, { width: 10 }];
    ws.mergeCells('A1:F1'); ws.getCell('A1').value = 'DAFTAR NILAI MAHASISWA';
    ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1F3864' } }; ws.getCell('A1').alignment = { horizontal: 'center' };
    ws.mergeCells('A2:F2'); ws.getCell('A2').value = inst; ws.getCell('A2').font = { bold: true, size: 11 }; ws.getCell('A2').alignment = { horizontal: 'center' };
    const info = [['Mata Kuliah', k.nama + ' (' + k.kode + ')'], ['Kelas', k.nama_kelas || ''], ['SKS', Number(k.sks)], ['Dosen', ds.nama || k.dosen || ''], ['NIDN', String(ds.nidn || k.nidn || '')], ['NUPTK', String(ds.nuptk || k.nuptk || '')], ['Program Studi', prodiResmi(k.prodi)], ['Periode', labelPeriode(App.periode)]];
    info.forEach((x, i) => {
      const r = 4 + i; ws.getCell('A' + r).value = x[0]; ws.getCell('A' + r).font = { bold: true };
      ws.getCell('B' + r).value = x[1]; ws.mergeCells('B' + r + ':F' + r);
      if (x[0] === 'SKS') { ws.getCell('B' + r).numFmt = '0.0'; ws.getCell('B' + r).alignment = { horizontal: 'left' }; }
      if (x[0] === 'NIDN' || x[0] === 'NUPTK') ws.getCell('B' + r).numFmt = '@';
    });
    const head = ['No', 'NIM', 'Nama Mahasiswa', 'Nilai Angka', 'Nilai Huruf', 'Indeks'];
    const hr = ws.getRow(13); hr.values = head; hr.height = 20;
    hr.eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B6B45' } }; c.alignment = { horizontal: 'center', vertical: 'middle' }; c.border = garis(); });
    ps.forEach((p, i) => {
      const r = ws.getRow(14 + i);
      r.values = [i + 1, String(p.nim), p.nama, Number(p.nilai), p.huruf, Number(p.indeks)];
      r.getCell(2).numFmt = '@'; r.getCell(4).numFmt = '0.00'; r.getCell(6).numFmt = '0.00';
      r.getCell(1).alignment = { horizontal: 'center' }; r.getCell(5).alignment = { horizontal: 'center' };
      r.eachCell({ includeEmpty: true }, (c) => { c.border = garis(); });
    });
    const buf = await wb.xlsx.writeBuffer();
    files.push({ nama: namaFile(k.kode + '_' + (k.nama_kelas || k.prodi + k.smt + k.kelas) + '_' + App.periode) + '.xlsx', buf: buf });
  }
  function garis() { const s = { style: 'thin', color: { argb: 'FF9CA3AF' } }; return { top: s, left: s, bottom: s, right: s }; }
  if (!files.length) { toast(peringatan.join(' · ') || 'Tidak ada file dibuat.', 'warn', 7000); return; }
  if (files.length === 1) unduhBlob(new Blob([files[0].buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), files[0].nama);
  else {
    const zip = new window.JSZip(); files.forEach((f) => zip.file(f.nama, f.buf));
    unduhBlob(await zip.generateAsync({ type: 'blob' }), 'Lapor_PDDIKTI_' + App.periode + '_' + files.length + '_kelas.zip');
  }
  toast(files.length + ' file dibuat.' + (peringatan.length ? ' ' + peringatan.join(' · ') : ''), peringatan.length ? 'warn' : 'ok', peringatan.length ? 8000 : 3200);
}

/* ============================================================== MA'HAD ALY */
Hal.mahad = {
  render(el, ctx) {
    const f = Object.assign({ angk: String(Number(String(App.periodeAktif).slice(0, 4)) - 2), prodi: '' }, App.ingat('mahad') || {});
    el.innerHTML = '<div class="page-head"><div><h2>Rekap Ma\'had Aly · semester 1–4</h2><div class="desc">Rata-rata nilai riil MK Ma\'had Aly smt 1–4 untuk keperluan wisuda (jumlah nilai ÷ jumlah MK bernilai).</div></div><span class="spacer"></span><button class="btn" id="ma-tempat">' + ic('repeat') + 'Penempatan smt 5</button><button class="btn" id="ma-unduh">' + ic('download') + 'Unduh Excel</button><button class="btn btn-primary" id="ma-cetak">' + ic('printer') + 'Cetak A4</button></div>' +
      '<div class="card"><div class="toolbar"><select class="input" id="ma-angk">' + opsi(App.angkatanList(), f.angk, (a) => 'Angkatan ' + a) + '</select><select class="input" id="ma-prodi">' + opsi(App.prodi().map((x) => x.kode), f.prodi, null, 'Semua prodi') + '</select><div class="search" style="width:220px">' + ic('search') + '<input class="input" id="ma-q" placeholder="Cari nama / NIM…"></div><span class="spacer"></span><label class="check"><input type="checkbox" id="ma-belum">Hanya yang belum lengkap</label></div><div id="ma-kpi" style="padding:14px 14px 0"></div><div id="ma-tbl">' + skelTabel(8) + '</div></div><div class="card mt-16"><div class="card-h"><h3>Skala predikat</h3><span class="spacer"></span><a class="btn btn-sm btn-ghost" href="#/pengaturan/skala">' + ic('edit', 'ic-sm') + 'Ubah</a></div><div class="card-b" id="ma-skala"></div></div>';
    let R = null;
    const t = Tabel($('#ma-tbl', el), { id: (r) => r.nim, urut: 'nim', semua: true, tinggi: true, kolom: [
      { k: 'nim', label: 'NIM', cls: 'mono' },
      { k: 'nama', label: 'Nama', html: (r) => '<b style="font-weight:600">' + esc(r.nama) + '</b>' + (r.status !== 'Aktif' ? ' ' + pillMhs(r.status) : '') + (r.kosong.length ? '<div class="sub" style="color:#92400E">' + ic('warn', 'ic-sm') + ' belum bernilai: ' + esc(r.kosong.join(', ')) + '</div>' : '') },
      { k: 'n', label: 'MK bernilai', cls: 'center', html: (r) => '<span class="pill ' + (r.n === r.total && r.total ? 's-SD' : 's-SL') + '">' + r.n + ' / ' + r.total + '</span>' },
      { k: 'rata', label: 'Rata-rata', cls: 'num', html: (r) => '<b style="font-size:15px">' + fmt2(r.rata) + '</b>' },
      { k: 'predikat', label: 'Predikat', html: (r) => esc(r.predikat) },
      { k: 'ar', label: 'التقدير', html: (r) => '<span class="ar">' + esc(r.ar) + '</span>' },
      { k: 'program_kini', label: 'Program kini', html: (r) => esc(PROGRAM_LABEL[r.program_kini]) }
    ], cari: (r) => r.nim + ' ' + r.nama, klik: (r) => App.pergi('/mahasiswa/' + encodeURIComponent(r.nim)), kosong: "Tidak ada mahasiswa Ma'had Aly", kosongDesc: 'Pilih angkatan lain, atau pastikan program awal mahasiswa = Ma\'had Aly.' });
    const muat = () => {
      f.angk = $('#ma-angk', el).value; f.prodi = $('#ma-prodi', el).value; App.ingat('mahad', f);
      pakai(ctx, 'mahad.rekap', { angkatan: f.angk, prodi: f.prodi }, (d) => {
        R = d; const s = d.ringkas;
        $('#ma-kpi', el).innerHTML = '<div class="grid g4">' + [['users', s.total, 'Mahasiswa'], ['checkc', s.lengkap, 'Lengkap ' + d.mk.length + ' MK'], ['warn', s.belum, 'Belum lengkap'], ['award', fmt2(s.rata), 'Rata-rata angkatan']].map((x, i) => '<div class="card kpi ' + (i === 2 && x[1] ? 'k-SL' : '') + '"><div class="kpi-ic">' + ic(x[0]) + '</div><div><div class="kpi-v">' + (x[1] === '' ? '–' : x[1]) + '</div><div class="kpi-l">' + x[2] + '</div></div></div>').join('') + '</div>';
        $('#ma-skala', el).innerHTML = '<div class="row-wrap">' + d.skala.map((p) => '<span class="chip">≥ ' + fmt2(p.batas).replace(',00', '') + ' · <b>' + esc(p.label) + '</b> <span class="ar">' + esc(p.label_ar) + '</span></span>').join('') + '</div><div class="muted mt-8" style="font-size:12.5px">MK yang dihitung: ' + d.mk.map((m) => esc(m.nama) + ' (smt ' + m.smt + ')').join(', ') + '</div>';
        t.st.rows = d.rows; saring();
      });
    };
    const saring = () => { t.st.q = $('#ma-q', el).value; t.saring($('#ma-belum', el).checked ? (r) => r.n < r.total : null); };
    $('#ma-angk', el).onchange = muat; $('#ma-prodi', el).onchange = muat; $('#ma-q', el).oninput = debounce(saring, 150); $('#ma-belum', el).onchange = saring;
    $('#ma-tempat', el).onclick = () => penempatanMahad(f.angk);
    $('#ma-unduh', el).onclick = () => R && Excel.tulisSederhana("Rekap_Mahad_Aly_" + f.angk + '.xlsx', ['No', 'NIM', 'Nama', 'Prodi', 'MK bernilai', 'Jumlah MK', 'Rata-rata', 'Predikat', 'التقدير', 'MK belum bernilai'], R.rows.map((r, i) => [i + 1, r.nim, r.nama, r.prodi, r.n, r.total, r.rata === null ? '' : r.rata, r.predikat, r.ar, r.kosong.join('; ')]), 'Rekap');
    $('#ma-cetak', el).onclick = async () => {
      if (!R) return;
      const id = await identitas();
      const per = 30, hal = [];
      for (let i = 0; i < Math.max(1, R.rows.length); i += per) hal.push(R.rows.slice(i, i + per));
      Cetak.tampil("Rekap Ma'had Aly " + f.angk, hal.map((rows, h) => '<div class="a4' + (h < hal.length - 1 ? ' a4-break' : '') + '">' + Cetak.kop(id) + '<div class="judul">REKAP NILAI RATA-RATA MA\'HAD ALY</div><div style="text-align:center;margin-top:-6px;margin-bottom:10px">Semester 1–4 · Angkatan ' + esc(f.angk) + (f.prodi ? ' · ' + esc(prodiResmi(f.prodi)) : '') + '</div>' +
        '<table class="mk"><thead><tr><th style="width:28px">No</th><th style="width:100px">NIM</th><th>Nama</th><th style="width:52px">Jml MK</th><th style="width:66px">Rata-rata</th><th style="width:96px">Predikat</th><th style="width:80px">التقدير</th></tr></thead><tbody>' +
        rows.map((r, i) => '<tr><td class="c">' + (h * per + i + 1) + '</td><td class="c">' + esc(r.nim) + '</td><td>' + esc(r.nama) + '</td><td class="c">' + r.n + '/' + r.total + '</td><td class="c">' + fmt2(r.rata) + '</td><td class="c">' + esc(r.predikat) + '</td><td class="c ar">' + esc(r.ar) + '</td></tr>').join('') + '</tbody></table>' + (h === hal.length - 1 ? Cetak.ttd(id, new Date().toISOString().slice(0, 10)) : '') + '</div>').join(''));
    };
    muat();
  }
};

/* ============================================================== KELULUSAN */
Hal.lulus = {
  render(el, ctx, p, q) {
    const f = Object.assign({ prodi: (App.prodi()[0] || {}).kode, angk: String(Number(String(App.periodeAktif).slice(0, 4)) - 4) }, App.ingat('lulus') || {}, q.prodi ? { prodi: q.prodi } : {}, q.angkatan ? { angk: q.angkatan } : {});
    el.innerHTML = '<div class="page-head"><div><h2>Kelulusan, KHS & transkrip</h2><div class="desc">Lengkapi data ijazah, cek kelengkapan (semua MK, Seminar & Skripsi dilapor), lalu finalisasi IPK.</div></div><span class="spacer"></span><button class="btn" id="ll-khs">' + ic('printer') + 'Cetak KHS massal</button></div>' +
      '<div class="card"><div class="toolbar"><select class="input" id="ll-prodi">' + opsi(App.prodi().map((x) => ({ v: x.kode, t: x.kode + ' — ' + x.nama })), f.prodi) + '</select><select class="input" id="ll-angk">' + opsi(App.angkatanList(), f.angk, (a) => 'Angkatan ' + a) + '</select><div class="search" style="width:220px">' + ic('search') + '<input class="input" id="ll-q" placeholder="Cari nama / NIM…"></div><div class="seg" id="ll-seg"><button data-v="" class="on">Semua</button><button data-v="siap">Siap finalisasi</button><button data-v="belum">Belum lengkap</button><button data-v="final">Final</button></div></div><div id="ll-kpi" style="padding:14px 14px 0"></div><div id="ll-tbl">' + skelTabel(8) + '</div></div>';
    let seg = '';
    const cekIkon = (c) => '<span class="row gap-4">' + c.map((x) => '<span title="' + esc(x.label + ': ' + x.info) + '" style="color:' + (x.ok ? 'var(--ok)' : 'var(--warn)') + '">' + ic(x.ok ? 'checkc' : 'warn', 'ic-sm') + '</span>').join('') + '</span>';
    const t = Tabel($('#ll-tbl', el), { id: (r) => r.nim, urut: 'nim', semua: true, tinggi: true, kolom: [
      { k: 'nim', label: 'NIM', cls: 'mono' },
      { k: 'nama', label: 'Nama', html: (r) => '<b style="font-weight:600">' + esc(r.nama) + '</b>' + (r.judul ? '<div class="sub" style="max-width:420px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(r.judul) + '</div>' : '') },
      { k: 'kelas', label: 'Kelas', html: (r) => kelasTag(r.kelas) },
      { k: 'sks', label: 'SKS', cls: 'num', html: (r) => r.sks + '<span class="sub">/' + r.sksKur + '</span>' },
      { k: 'ipk', label: 'IPK', cls: 'num', html: (r) => '<b>' + fmt2(r.ipk) + '</b>' },
      { k: 'predikat', label: 'Predikat' },
      { k: 'cek', label: 'Cek MK · Seminar · Skripsi · SKS', sort: false, html: (r) => cekIkon(r.cek) },
      { k: 'final', label: 'Status', val: (r) => r.final ? 2 : r.siap ? 1 : 0, html: (r) => r.final ? '<span class="pill brand">' + ic('lock', 'ic-sm') + ' Final</span>' : r.siap ? '<span class="pill s-SD">Siap finalisasi</span>' : '<span class="pill s-SL">Belum lengkap</span>' }
    ], cari: (r) => r.nim + ' ' + r.nama + ' ' + r.judul, klik: (r) => dataKelulusan(r.nim, muat), kosong: 'Tidak ada mahasiswa', kosongDesc: 'Pilih prodi & angkatan lain.' });
    const saring = () => { t.st.q = $('#ll-q', el).value; t.saring(seg === 'siap' ? (r) => r.siap && !r.final : seg === 'belum' ? (r) => !r.siap && !r.final : seg === 'final' ? (r) => r.final : null); };
    function muat() {
      f.prodi = $('#ll-prodi', el).value; f.angk = $('#ll-angk', el).value; App.ingat('lulus', f);
      pakai(ctx, 'lulus.list', { prodi: f.prodi, angkatan: f.angk }, (d) => {
        const s = d.ringkas;
        $('#ll-kpi', el).innerHTML = '<div class="grid g4">' + [['users', s.calon, 'Calon lulusan', ''], ['checkc', s.siap, 'Siap finalisasi', 'k-SD'], ['warn', s.belum, 'Belum lengkap', 'k-SL'], ['award', s.final, 'IPK final terkunci', '']].map((x) => '<div class="card kpi ' + x[3] + '"><div class="kpi-ic">' + ic(x[0]) + '</div><div><div class="kpi-v">' + x[1] + '</div><div class="kpi-l">' + x[2] + '</div></div></div>').join('') + '</div>';
        t.st.rows = d.rows; saring();
      });
    }
    $('#ll-prodi', el).onchange = muat; $('#ll-angk', el).onchange = muat; $('#ll-q', el).oninput = debounce(saring, 150);
    $('#ll-seg', el).onclick = (e) => { const b = e.target.closest('button'); if (!b) return; seg = b.dataset.v; $$('#ll-seg button', el).forEach((x) => x.classList.toggle('on', x === b)); saring(); };
    $('#ll-khs', el).onclick = () => {
      const ops = []; for (let s = 1; s <= 14; s++) { const pid = periodeDari($('#ll-angk', el).value, s); if (App.M.periode.some((p) => String(p.id) === pid)) ops.push({ v: pid, t: 'Smt ' + s + ' · ' + labelPeriode(pid) }); }
      modal({ judul: 'Cetak KHS massal', desc: esc($('#ll-prodi', el).value + ' angkatan ' + $('#ll-angk', el).value) + ' · mahasiswa Aktif & Lulus', isi: '<div class="field"><label>Periode</label><select class="input" id="km-p">' + opsi(ops, App.periode) + '</select></div>',
        tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Tampilkan', kelas: 'btn-primary', ikon: 'printer', aksi: async (close, m) => { await cetakKhs({ prodi: $('#ll-prodi', el).value, angkatan: $('#ll-angk', el).value, periode: $('#km-p', m).value }); return true; } }] });
    };
    muat();
    if (q.nim) dataKelulusan(q.nim, muat);
  }
};

async function dataKelulusan(nim, onUbah) {
  const md = modal({ judul: 'Data kelulusan', lebar: 'lebar', isi: skelKpi(3).replace('g6', 'g3') + '<div class="mt-16">' + skelTabel(5) + '</div>', tombol: [{ teks: 'Tutup', aksi: () => true }] });
  const r = await api('lulus.get', { nim: nim });
  if (!r.success) { $('.modal-b', md.el).innerHTML = '<div class="alert danger">' + esc(r.message) + '</div>'; return; }
  const d = r.data, l = d.lulus || {}, fin = l.status === 'final';
  const kolom = (App.M.kolom || []).filter((k) => String(k.aktif) !== '0' && String(k.di_transkrip) === '1');
  $('.modal-h h3', md.el).textContent = 'Data kelulusan — ' + d.mhs.nama;
  $('.modal-h h3', md.el).insertAdjacentHTML('afterend', '<div class="desc">' + esc(d.mhs.nim + ' · ' + d.mhs.prodi + ' angkatan ' + d.mhs.ikut_angkatan) + '</div>');
  $('.modal-b', md.el).innerHTML = '<div class="grid g3 mb-16"><div class="card kpi"><div class="kpi-ic">' + ic('award') + '</div><div><div class="kpi-v">' + fmt2(d.ipk) + '</div><div class="kpi-l">IPK ' + (fin ? 'final' : 'saat ini') + '</div></div></div><div class="card kpi"><div class="kpi-ic">' + ic('layers') + '</div><div><div class="kpi-v">' + d.sks + '</div><div class="kpi-l">Total SKS</div></div></div><div class="card kpi"><div class="kpi-ic">' + ic('star') + '</div><div><div class="kpi-v" style="font-size:17px;padding-top:4px">' + esc(d.predikat || '–') + '</div><div class="kpi-l">Predikat</div></div></div></div>' +
    '<div class="grid g2"><div><h4 class="mb-8">Cek kelengkapan</h4><div class="check-list">' + d.cek.map((c) => '<div class="check-item ' + (c.ok ? 'ok' : 'no') + '">' + ic(c.ok ? 'checkc' : 'warn') + '<div><b>' + esc(c.label) + '</b><div class="muted" style="font-size:12.5px">' + esc(c.info) + '</div></div></div>').join('') + '</div></div>' +
    '<div><h4 class="mb-8">Data ijazah ' + (fin ? '<span class="pill brand">' + ic('lock', 'ic-sm') + ' terkunci</span>' : '') + '</h4><div class="fgrid" id="dk-form"><div class="field full"><label class="req">Judul skripsi final</label><textarea class="input" name="judul" ' + (fin ? 'readonly' : '') + ' style="min-height:70px">' + esc(l.judul || '') + '</textarea></div><div class="field"><label class="req">Tanggal yudisium</label><input class="input" type="date" name="tgl_yudisium" value="' + esc(l.tgl_yudisium || '') + '" ' + (fin ? 'readonly' : '') + '></div><div class="field"><label>Nomor ijazah</label><input class="input" name="no_ijazah" value="' + esc(l.no_ijazah || '') + '" ' + (fin ? 'readonly' : '') + '></div><div class="field"><label>Nomor transkrip</label><input class="input" name="no_transkrip" value="' + esc(l.no_transkrip || '') + '" ' + (fin ? 'readonly' : '') + '></div>' +
    kolom.map((k) => '<div class="field"><label>' + esc(k.nama) + '</label><input class="input" data-kol="' + esc(k.id) + '" value="' + esc(d.kolom[k.id] || '') + '"></div>').join('') + '</div></div></div>';
  const f = $('.modal-f', md.el); f.innerHTML = '';
  const tombol = (teks, ikon, kelas, fn, kiri) => { const b = document.createElement('button'); b.className = 'btn ' + (kelas || ''); b.innerHTML = ic(ikon) + esc(teks); if (kiri) b.style.marginRight = 'auto'; b.onclick = () => tombolProses(b, fn); f.appendChild(b); return b; };
  tombol('Transkrip', 'file', '', () => cetakTranskrip(nim), true);
  tombol('KHS', 'printer', '', async () => { const det = await api('mhs.detail', { nim: nim }); if (det.success) pilihCetakKhs(det.data.mhs, det.data.lapor); });
  tombol('Dokumen resmi (QR)', 'qr', '', () => terbitkanResmi('TRANSKRIP', { nim: nim }, d.mhs.nama));
  const simpanKolom = async () => { const v = {}; $$('[data-kol]', md.el).forEach((i) => { v[i.dataset.kol] = i.value; }); if (Object.keys(v).length) await api('mhs.kolom', { nim: nim, nilai: v }); };
  if (!fin) {
    tombol('Simpan draf', 'save', '', async () => {
      const v = bacaForm($('#dk-form', md.el)); v.nim = nim;
      const rr = await api('lulus.simpan', v); toast(rr.message, rr.success ? 'ok' : 'err'); if (rr.success) { await simpanKolom(); if (onUbah) onUbah(); }
    });
    const bf = tombol('Finalisasi IPK', 'lock', 'btn-primary', async () => {
      const v = bacaForm($('#dk-form', md.el));
      if (!v.judul.trim() || !v.tgl_yudisium) return toast('Isi judul skripsi & tanggal yudisium, lalu simpan draf.', 'warn');
      const s = await api('lulus.simpan', Object.assign({ nim: nim }, v)); if (!s.success) return toast(s.message, 'err');
      await simpanKolom();
      const ok = await konfirmasiKetik({ judul: 'Finalisasi IPK — ' + d.mhs.nama, kata: nim, bahaya: true, tombolTeks: 'Finalisasi', pesan: 'IPK final, total SKS, predikat, dan data ijazah akan <b>dikunci permanen</b>, dan status mahasiswa menjadi <b>Lulus</b>.' });
      if (!ok) return;
      const rr = await api('lulus.finalisasi', { nim: nim, konfirmasi: ok });
      toast(rr.message, rr.success ? 'ok' : 'err', 7000);
      if (rr.success) { md.close(); if (onUbah) onUbah(); }
    });
    if (!d.siap) { bf.disabled = true; bf.title = 'Belum memenuhi syarat kelengkapan'; }
  }
  const tt = document.createElement('button'); tt.className = 'btn'; tt.textContent = 'Tutup'; tt.onclick = () => md.close(); f.appendChild(tt);
}

/* ============================================================== CETAK KHS & TRANSKRIP */
let _identitas = null;
async function identitas() {
  if (_identitas) return _identitas;
  const p = App.M.pengaturan;
  _identitas = { institusi: p.INSTITUSI_NAMA, singkat: p.INSTITUSI_SINGKAT, alamat: p.INSTITUSI_ALAMAT, kota: p.INSTITUSI_KOTA, logo: p.LOGO_URL, ttdNama: p.PENANDATANGAN_NAMA, ttdJabatan: p.PENANDATANGAN_JABATAN, ttdNidn: p.PENANDATANGAN_NIDN, skala: App.M.skala };
  setTimeout(() => { _identitas = null; }, 60000);
  return _identitas;
}
function pilihCetakKhs(m, lapor) {
  const per = Array.from(new Set((lapor || []).map((x) => String(x.periode)).concat([String(App.periode)]))).sort();
  modal({ judul: 'Cetak KHS — ' + m.nama, isi: '<div class="field"><label>Periode</label><select class="input" id="pk-per">' + opsi(per.map((p) => ({ v: p, t: 'Smt ' + smtDari(m.angkatan_asal, p) + ' · ' + labelPeriode(p) })), App.periode) + '</select><div class="hint">' + (String(App.M.pengaturan.KHS_TAMPIL_SEMENTARA) === '1' ? 'Nilai siap lapor yang belum dilapor ikut tampil dengan tanda "sementara".' : 'Hanya nilai yang sudah dilapor.') + '</div></div>',
    tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Tampilkan', kelas: 'btn-primary', ikon: 'printer', aksi: async (close, el) => { await cetakKhs({ nim: m.nim, periode: $('#pk-per', el).value }); return true; } }] });
}
async function cetakKhs(q) {
  const r = await api('cetak.khs', q);
  if (!r.success) return toast(r.message, 'err');
  if (!r.data.docs.length) return toast('Tidak ada nilai pada periode ' + labelPeriode(q.periode) + '.', 'warn');
  const id = r.data.identitas, tgl = r.data.tanggal;
  const skalaTeks = (id.skala || []).slice().sort((a, b) => Number(b.batas) - Number(a.batas)).map((s) => esc(s.huruf) + ' (' + fmt2(s.indeks) + ') ≥ ' + fmt2(s.batas).replace(',00', '')).join(' · ');
  Cetak.tampil('KHS ' + labelPeriode(q.periode), r.data.docs.map((d, i) => {
    const m = d.mhs;
    return '<div class="a4' + (i < r.data.docs.length - 1 ? ' a4-break' : '') + '">' + (d.sementara ? '<div class="stempel-sementara">MEMUAT NILAI SEMENTARA</div>' : '') + Cetak.kop(id) + '<div class="judul">KARTU HASIL STUDI (KHS)</div>' +
      '<table class="ident"><tr><td>Nama</td><td>:</td><td><b>' + esc(m.nama) + '</b></td><td>Program Studi</td><td>:</td><td>' + esc(m.prodi) + '</td></tr><tr><td>NIM</td><td>:</td><td>' + esc(m.nim) + '</td><td>Semester</td><td>:</td><td>' + d.smt + ' (' + esc(d.label) + ')</td></tr><tr><td>Tempat, tgl lahir</td><td>:</td><td>' + esc([m.tempat_lahir, fmtTgl(m.tgl_lahir)].filter(Boolean).join(', ')) + '</td><td>Tahun masuk</td><td>:</td><td>' + esc(m.angkatan) + '</td></tr>' + (d.lulus && d.lulus.tgl_yudisium ? '<tr><td>Tanggal lulus</td><td>:</td><td>' + esc(fmtTgl(d.lulus.tgl_yudisium)) + '</td><td></td><td></td><td></td></tr>' : '') + d.kolom.map((k) => '<tr><td>' + esc(k.label) + '</td><td>:</td><td colspan="4">' + esc(k.nilai) + '</td></tr>').join('') + '</table>' +
      '<table class="mk" style="margin-top:10px"><thead><tr><th style="width:28px">No</th><th style="width:96px">Kode</th><th>Mata Kuliah</th><th style="width:42px">SKS</th><th style="width:48px">Nilai</th><th style="width:52px">Bobot</th><th style="width:62px">SKS × Bobot</th></tr></thead><tbody>' +
      d.rows.map((x, j) => '<tr><td class="c">' + (j + 1) + '</td><td class="c">' + esc(x.kode) + '</td><td>' + esc(x.nama) + (x.sementara ? ' *' : '') + '</td><td class="c">' + x.sks + '</td><td class="c">' + esc(x.huruf) + '</td><td class="c">' + fmt2(x.indeks) + '</td><td class="c">' + fmt2(x.sks * x.indeks) + '</td></tr>').join('') +
      '<tr><td colspan="3" style="text-align:right"><b>Jumlah</b></td><td class="c"><b>' + d.sks + '</b></td><td></td><td></td><td class="c"><b>' + fmt2(d.mutu) + '</b></td></tr></tbody></table>' +
      '<table class="ident" style="margin-top:8px;width:auto"><tr><td>Indeks Prestasi Semester (IPS)</td><td>:</td><td><b>' + fmt2(d.ips) + '</b></td></tr><tr><td>Indeks Prestasi Kumulatif (IPK)</td><td>:</td><td><b>' + fmt2(d.ipk) + '</b> <span style="font-size:9.5pt">(' + d.sksKumulatif + ' SKS)</span></td></tr></table>' +
      Cetak.ttd(id, tgl) + '<div class="catatan"><b>Keterangan skala nilai:</b> ' + skalaTeks + (d.sementara ? '<br>* nilai sementara (belum dilapor ke PDDIKTI)' : '') + '</div></div>';
  }).join(''));
}
async function cetakTranskrip(nim) {
  const r = await api('cetak.transkrip', { nim: nim });
  if (!r.success) return toast(r.message, 'err');
  const id = r.data.identitas, d = r.data.doc, m = d.mhs, l = d.lulus || {};
  if (!d.rows.length) return toast('Belum ada nilai yang dilapor.', 'warn');
  const setengah = Math.ceil(d.rows.length / 2), kiri = d.rows.slice(0, setengah), kanan = d.rows.slice(setengah);
  const tbl = (rows, mulai) => '<table class="mk kecil"><thead><tr><th style="width:20px">No</th><th style="width:70px">Kode</th><th>Mata Kuliah</th><th style="width:26px">SKS</th><th style="width:28px">HM</th><th style="width:32px">AM</th><th style="width:34px">M</th></tr></thead><tbody>' + rows.map((x, i) => '<tr><td class="c">' + (mulai + i + 1) + '</td><td class="c k">' + esc(x.kode) + '</td><td>' + esc(x.nama) + '</td><td class="c">' + x.sks + '</td><td class="c">' + esc(x.huruf) + '</td><td class="c">' + fmt2(x.indeks) + '</td><td class="c">' + fmt2(x.mutu) + '</td></tr>').join('') + '</tbody></table>';
  Cetak.tampil('Transkrip ' + m.nama, '<div class="a4">' + (d.final ? '' : '<div class="stempel-sementara">BELUM FINAL</div>') + Cetak.kop(id) + '<div class="judul">TRANSKRIP AKADEMIK</div>' + (l.no_transkrip ? '<div style="text-align:center;margin:-6px 0 8px">Nomor: ' + esc(l.no_transkrip) + '</div>' : '') +
    '<table class="ident"><tr><td>Nama</td><td>:</td><td><b>' + esc(m.nama) + '</b></td><td>Program Studi</td><td>:</td><td>' + esc(m.prodi) + '</td></tr><tr><td>NIM</td><td>:</td><td>' + esc(m.nim) + '</td><td>Tahun masuk</td><td>:</td><td>' + esc(m.angkatan) + '</td></tr><tr><td>Tempat, tgl lahir</td><td>:</td><td>' + esc([m.tempat_lahir, fmtTgl(m.tgl_lahir)].filter(Boolean).join(', ')) + '</td><td>Tanggal yudisium</td><td>:</td><td>' + esc(fmtTgl(l.tgl_yudisium) || '–') + '</td></tr>' + (l.no_ijazah ? '<tr><td>Nomor ijazah</td><td>:</td><td colspan="4">' + esc(l.no_ijazah) + '</td></tr>' : '') + d.kolom.map((k) => '<tr><td>' + esc(k.label) + '</td><td>:</td><td colspan="4">' + esc(k.nilai) + '</td></tr>').join('') + '</table>' +
    '<div class="dua" style="margin-top:8px">' + tbl(kiri, 0) + tbl(kanan, setengah) + '</div>' +
    '<table class="ident" style="margin-top:8px"><tr><td>Total SKS</td><td>:</td><td><b>' + d.sks + '</b></td><td>Total mutu</td><td>:</td><td>' + fmt2(d.mutu) + '</td></tr><tr><td>IPK</td><td>:</td><td><b>' + fmt2(d.ipk) + '</b></td><td>Predikat</td><td>:</td><td><b>' + esc(d.predikat) + '</b></td></tr><tr><td>Judul skripsi</td><td>:</td><td colspan="4"><i>' + esc(l.judul || '–') + '</i></td></tr></table>' +
    Cetak.ttd(id, l.tgl_yudisium || r.data.tanggal) + '<div class="catatan">HM = huruf mutu · AM = angka mutu · M = SKS × AM</div></div>');
}

/* ============================================================== DOKUMEN RESMI (Doc Engine) */
async function terbitkanResmi(jenis, ref, judul) {
  const [tl, pl] = await Promise.all([Store.get('doc.templateList', {}, 60000), Store.get('doc.pejabatList', {}, 60000)]);
  if (!tl.success) return toast(tl.message, 'err');
  const tpl = tl.data.template.filter((t) => t.aktif && t.jenis === jenis);
  if (!tpl.length) return modal({ judul: 'Belum ada template ' + jenis, isi: '<p>Buat template dokumen resmi terlebih dahulu di <b>Pengaturan → Dokumen resmi</b> (ada tombol "Buat template contoh").</p>', tombol: [{ teks: 'Tutup', aksi: () => true }, { teks: 'Buka Pengaturan', kelas: 'btn-primary', aksi: () => { App.pergi('/pengaturan/dokumen'); return true; } }] });
  const pj = (pl.data || []).filter((p) => p.aktif);
  const md = modal({ judul: 'Terbitkan dokumen resmi', desc: esc(judul) + ' · ber-QR verifikasi', lebar: 'lebar',
    isi: '<div class="field mb-12"><label>Template</label><select class="input" id="tr-tpl">' + opsi(tpl.map((t) => ({ v: t.id, t: t.nama + ' (' + t.kode + ', v' + t.versi + ')' }))) + '</select></div><div id="tr-isi"></div>',
    tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Pratinjau PDF', ikon: 'eye', aksi: async (close, el) => { const d = kumpul(el); const r = await api('doc.pratinjau', d); if (!r.success) { toast(r.message, 'err'); return false; } window.open(URL.createObjectURL(base64KeBlob(r.data.base64, 'application/pdf')), '_blank'); return false; } },
      { teks: 'Terbitkan', kelas: 'btn-primary', ikon: 'stamp', aksi: async (close, el) => {
        const d = kumpul(el);
        if (d.bypass && String(d.alasan || '').trim().length < 5) { toast('Isi alasan terbit tanpa PIN.', 'warn'); return false; }
        const r = await api('doc.buat', d);
        toast(r.message, r.success ? 'ok' : 'err', 7000);
        if (r.success && r.data.status !== 'MENUNGGU_TTD') { const u = await api('doc.unduh', { id: r.data.id }); if (u.success) unduhBlob(base64KeBlob(u.data.base64, u.data.mime), u.data.nama); }
        return r.success;
      } }] });
  const el = md.el;
  const gambar = () => {
    const t = tpl.find((x) => x.id === $('#tr-tpl', el).value);
    const bidang = (t.bidang || []).filter((b) => b.tipe !== 'daftar');
    $('#tr-isi', el).innerHTML = (bidang.length ? '<h4 class="mb-8">Isian</h4><div class="fgrid mb-16">' + bidang.map((b) => '<div class="field ' + (b.tipe === 'area' || b.tipe === 'naskah' ? 'full' : '') + '"><label class="' + (b.wajib ? 'req' : '') + '">' + esc(b.label) + '</label>' + (b.tipe === 'area' || b.tipe === 'naskah' ? '<textarea class="input" data-b="' + esc(b.kunci) + '"></textarea>' : '<input class="input" data-b="' + esc(b.kunci) + '" type="' + (b.tipe === 'tanggal' ? 'date' : b.tipe === 'angka' ? 'number' : 'text') + '">') + '</div>').join('') + '</div>' : '') +
      '<h4 class="mb-8">Penanda tangan</h4>' + ((t.slotTtd || []).length ? (t.slotTtd || []).map((s) => '<div class="row mb-8"><span class="badge soft">' + s.slot + '</span><span style="width:150px">' + esc(s.label) + '</span><select class="input" data-pj="' + s.slot + '" ' + (s.cara === 'tetap' ? 'disabled' : '') + '>' + opsi(pj.map((p) => ({ v: p.id, t: p.nama + ' — ' + p.jabatan + (p.punyaPin ? '' : ' (belum ada PIN)') })), s.pejabatId, null, '— pilih pejabat —') + '</select>' + (s.wajibSetuju !== false ? '<input class="input" type="password" inputmode="numeric" maxlength="6" placeholder="PIN 6 angka" data-pin="' + s.slot + '" style="width:140px">' : '<span class="muted">tanpa persetujuan</span>') + '</div>').join('') : '<div class="muted">Template ini tidak punya slot tanda tangan.</div>') +
      '<label class="check mt-12"><input type="checkbox" id="tr-bypass">Terbitkan tanpa PIN pejabat (dicatat dengan alasan)</label><textarea class="input mt-8 hidden" id="tr-alasan" placeholder="Alasan, mis. pejabat berhalangan & sudah menyetujui via surat"></textarea>';
    $('#tr-bypass', el).onchange = (e) => $('#tr-alasan', el).classList.toggle('hidden', !e.target.checked);
  };
  const kumpul = (m) => {
    const isian = {}, pejabat = {}, pin = {};
    $$('[data-b]', m).forEach((i) => { isian[i.dataset.b] = i.value; });
    $$('[data-pj]', m).forEach((s) => { if (s.value) pejabat[s.dataset.pj] = s.value; });
    $$('[data-pin]', m).forEach((s) => { if (s.value) pin[s.dataset.pin] = s.value; });
    return { templateId: $('#tr-tpl', m).value, ref: ref, isian: isian, pejabat: pejabat, pin: pin, bypass: $('#tr-bypass', m).checked, alasan: $('#tr-alasan', m).value };
  };
  $('#tr-tpl', el).onchange = gambar; gambar();
}
