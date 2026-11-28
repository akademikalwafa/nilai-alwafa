/* ==========================================================================
   hal-utama.js — Dasbor · Mahasiswa (+detail, status, kelas A/B, penempatan) · Kurikulum
   ========================================================================== */
'use strict';
const WARNA_STATUS = { SD: '#16A34A', SX: '#EA580C', SL: '#CA8A04', MN: '#DC2626', BP: '#CBD5E1', TB: '#E2E8F0' };
const URUT_STATUS = ['SD', 'SX', 'SL', 'MN', 'BP', 'TB'];
function statbar(cnt) {
  const tot = URUT_STATUS.reduce((s, k) => s + (cnt[k] || 0), 0) || 1;
  return '<div class="statbar" title="' + URUT_STATUS.filter((k) => cnt[k]).map((k) => STATUS_LABEL[k] + ': ' + cnt[k]).join(' · ') + '">' + URUT_STATUS.map((k) => cnt[k] ? '<i class="b-' + k + '" style="width:' + (cnt[k] / tot * 100) + '%"></i>' : '').join('') + '</div>';
}
function legendaStatus(tanpa) { return '<div class="legend">' + URUT_STATUS.filter((k) => !(tanpa || []).includes(k)).map((k) => '<span><i style="background:' + WARNA_STATUS[k] + '"></i>' + STATUS_LABEL[k] + '</span>').join('') + '</div>'; }
const _chart = {};
async function grafik(canvas, cfg) {
  const Chart = await muat('chart');
  if (!canvas.isConnected) return;
  if (_chart[canvas.id]) _chart[canvas.id].destroy();
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 12; Chart.defaults.color = '#667085';
  _chart[canvas.id] = new Chart(canvas, cfg);
}

/* ============================================================== DASBOR */
Hal.dasbor = {
  prefetch() { prefetch('dasbor.ringkasan', {}); },
  render(el, ctx) {
    const f = App.ingat('dasbor') || { prodi: '', mx: null };
    el.innerHTML = '<div class="page-head"><div><h2>Ringkasan pelaporan</h2><div class="desc" id="d-desc">Memuat…</div></div><span class="spacer"></span><button class="btn btn-sm" id="d-segar">' + ic('refresh') + 'Segarkan</button></div>' +
      '<div id="d-kpi">' + skelKpi(6) + '</div>' +
      '<div class="grid g-side mt-16"><div class="card"><div class="card-h"><h3>Progres pelaporan per angkatan</h3><span class="spacer"></span><select class="input input-sm" id="d-prodi" style="width:auto">' + opsi(App.prodi().map((p) => ({ v: p.kode, t: p.kode })), f.prodi, null, 'Semua prodi') + '</select></div><div class="card-b"><div class="chart-box"><canvas id="ch-progres"></canvas></div><div class="mt-8">' + legendaStatus(['TB']) + '</div></div></div>' +
      '<div class="card"><div class="card-h"><h3>Perlu perhatian</h3></div><div class="card-b" id="d-perhatian"><div class="skel skel-line"></div><div class="skel skel-line"></div><div class="skel skel-line"></div></div></div></div>' +
      '<div class="grid g2 mt-16"><div class="card"><div class="card-h"><h3>Rata-rata IPK per angkatan</h3></div><div class="card-b"><div class="chart-box"><canvas id="ch-ipk"></canvas></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>Sebaran nilai</h3><span class="muted" style="font-size:12.5px">' + esc(labelPeriode(App.periode)) + '</span><span class="spacer"></span><select class="input input-sm" id="d-sb" style="width:220px"><option value="">Semua kelas (gabungan)</option></select></div><div class="card-b"><div class="chart-box"><canvas id="ch-sebaran"></canvas></div></div></div></div>' +
      '<div class="card mt-16"><div class="card-h"><h3>Matriks status per angkatan</h3><span class="spacer"></span><select class="input input-sm" id="mx-prodi" style="width:auto"></select><select class="input input-sm" id="mx-angk" style="width:auto"></select><div class="seg" id="mx-mode"><button data-v="mk" class="on">Per MK</button><button data-v="mhs">Per mahasiswa</button></div><button class="btn btn-sm" id="mx-rekap" title="Rekap MK yang sudah/belum bernilai + kelas pengisinya">' + ic('layers') + 'Rekap lengkap</button></div><div class="card-b" id="mx-isi">' + kosong('Pilih prodi & angkatan', '', 'layers') + '</div></div>';
    let data = null, mode = 'mk';
    const tampil = (d) => {
      data = d;
      $('#d-desc', el).textContent = 'Periode aktif ' + d.label + ' · dihitung ' + fmtWaktu(d.dihitung);
      const k = d.kartu;
      $('#d-kpi', el).innerHTML = '<div class="grid g6">' + [
        ['', 'users', k.aktif, 'Mahasiswa aktif', '/mahasiswa'], ['k-cuti', 'hour', k.cuti, 'Sedang cuti', '/mahasiswa?status=Cuti'], ['k-SL', 'send', k.siap, 'Nilai siap lapor', '/lapor'],
        ['k-MN', 'clip', k.menunggu, 'Menunggu nilai', '/perkuliahan'], ['k-SX', 'warn', k.selisih, 'Ada selisih', ''], ['k-SD', 'award', k.lulus, 'Lulus', '/lulus']
      ].map((x) => '<div class="card kpi ' + x[0] + '" ' + (x[4] ? 'data-go="' + x[4] + '"' : '') + '><div class="kpi-ic">' + ic(x[1]) + '</div><div><div class="kpi-v">' + fmtInt(x[2]) + '</div><div class="kpi-l">' + esc(x[3]) + '</div></div></div>').join('') + '</div>';
      const p = d.perhatian;
      $('#d-perhatian', el).innerHTML = '<ul class="list-plain">' +
        (p.belumPeta.length ? p.belumPeta.slice(0, 6).map((b) => '<li><span class="dot" style="background:var(--s-BP)"></span><span style="flex:1"><b>' + esc(b.prodi) + ' ' + esc(b.angk) + '</b> — ' + b.jumlah + ' MK kurikulum belum dipetakan</span><a href="#/klaim?prodi=' + esc(b.prodi) + '&angkatan=' + esc(b.angk) + '" class="btn btn-xs">Petakan</a></li>').join('') : '<li>' + ic('checkc', 'ic-sm') + '<span>Semua MK kurikulum sudah dipetakan.</span></li>') +
        '<li><span class="dot" style="background:#6366F1"></span><span style="flex:1">' + p.unclaimed + ' MK riil bernilai belum diklaim</span></li>' +
        '<li><span class="dot" style="background:#0EA5E9"></span><span style="flex:1">' + p.pindah + ' mahasiswa aktif ikut angkatan lain (pindahan cuti)</span></li>' +
        (p.selisih.length ? '<li style="display:block"><div class="row"><span class="dot" style="background:var(--s-SX)"></span><b>' + p.selisih.length + ' nilai ADA SELISIH</b></div><div class="muted mt-4" style="font-size:12.5px">' + p.selisih.slice(0, 5).map((s) => '<a href="#/mahasiswa/' + encodeURIComponent(s.nim) + '">' + esc(s.nama) + '</a> (' + esc(s.mk) + ')').join(', ') + (p.selisih.length > 5 ? ' …' : '') + '</div></li>' : '') + '</ul>';
      gambarProgres(); gambarIpk(); isiMatriksPilihan();
    };
    const gambarProgres = () => {
      if (!data) return;
      const pr = $('#d-prodi', el).value, ko = data.kohort.filter((x) => !pr || x.prodi === pr);
      grafik($('#ch-progres', el), { type: 'bar', data: { labels: ko.map((x) => (pr ? '' : x.prodi + ' ') + x.angk), datasets: ['SD', 'SX', 'SL', 'MN', 'BP'].map((s) => ({ label: STATUS_LABEL[s], data: ko.map((x) => x.cnt[s] || 0), backgroundColor: WARNA_STATUS[s], borderRadius: 2, maxBarThickness: 34 })) },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index' } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, title: { display: true, text: 'jumlah nilai (mhs × MK)' } } } } });
    };
    const gambarIpk = () => {
      const angk = Array.from(new Set(data.kohort.map((x) => x.angk))).sort(), prodi = Array.from(new Set(data.kohort.map((x) => x.prodi)));
      const pal = ['#1B6B45', '#2563EB', '#D97706', '#9333EA', '#0891B2'];
      grafik($('#ch-ipk', el), { type: 'bar', data: { labels: angk, datasets: prodi.map((p, i) => ({ label: p, data: angk.map((a) => { const k = data.kohort.find((x) => x.prodi === p && x.angk === a); return k && k.ipk ? k.ipk : null; }), backgroundColor: i === 0 ? getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || pal[0] : pal[i % pal.length], borderRadius: 3, maxBarThickness: 26 })) },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } }, tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + fmt2(c.raw) } } }, scales: { y: { min: 0, max: 4, ticks: { callback: (v) => fmt1(v) } }, x: { grid: { display: false } } } } });
    };
    let sebaran = [];
    const gambarSebaran = () => {
      const id = $('#d-sb', el).value, H = ['A', 'B+', 'B', 'C+', 'C', 'D'];
      const pilih = id ? sebaran.filter((x) => x.id === id) : sebaran;
      const tot = H.map((h) => pilih.reduce((s, x) => s + (x.dist[h] || 0), 0));
      grafik($('#ch-sebaran', el), { type: 'bar', data: { labels: H, datasets: [{ label: 'Jumlah mahasiswa', data: tot, backgroundColor: ['#16A34A', '#22C55E', '#84CC16', '#EAB308', '#F59E0B', '#DC2626'], borderRadius: 4, maxBarThickness: 46 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } } });
    };
    const isiMatriksPilihan = () => {
      const kp = $('#mx-prodi', el), ka = $('#mx-angk', el);
      if (kp.options.length) return;
      const ko = data.kohort;
      const prodi = Array.from(new Set(ko.map((x) => x.prodi)));
      const awal = f.mx || (ko.length ? { prodi: ko[ko.length - 1].prodi, angk: ko[ko.length - 1].angk } : null);
      kp.innerHTML = opsi(prodi, awal && awal.prodi);
      const isiA = () => { ka.innerHTML = opsi(ko.filter((x) => x.prodi === kp.value).map((x) => x.angk).sort().reverse(), awal && awal.angk); };
      isiA();
      kp.onchange = () => { isiA(); muatMatriks(); };
      ka.onchange = muatMatriks;
      if (kp.value && ka.value) muatMatriks();
    };
    let mx = null;
    const muatMatriks = () => {
      const pr = $('#mx-prodi', el).value, an = $('#mx-angk', el).value;
      if (!pr || !an) return;
      App.ingat('dasbor', { prodi: $('#d-prodi', el).value, mx: { prodi: pr, angk: an } });
      $('#mx-isi', el).innerHTML = skelTabel(6);
      pakai(ctx, 'dasbor.matriks', { prodi: pr, angkatan: an }, (d) => { mx = d; gambarMatriks(); });
    };
    const gambarMatriks = () => {
      const box = $('#mx-isi', el), d = mx;
      if (!d.kur.length) { box.innerHTML = kosong('Kurikulum belum ada', 'Isi kurikulum prodi ini di menu Kurikulum.', 'book'); return; }
      if (mode === 'mk') {
        box.innerHTML = '<div class="row mb-12">' + legendaStatus() + '<span class="spacer"></span><span class="muted">' + d.mhs.length + ' mahasiswa · ' + d.kur.length + ' MK</span></div><div class="tbl-wrap tall"><table class="tbl tbl-compact"><thead><tr><th>Smt</th><th>Kode</th><th>Mata kuliah</th><th class="num">SKS</th><th>Periode lapor</th><th style="width:220px">Status</th><th class="num">SD</th><th class="num">SL</th><th class="num">MN</th><th class="num">BP</th></tr></thead><tbody>' +
          d.kur.map((k) => {
            const c = {}; let per = {};
            d.mhs.forEach((m) => { const x = (d.cells[m.nim] || {})[k.id] || ['BP']; c[x[0]] = (c[x[0]] || 0) + 1; if (x[2]) per[x[2]] = 1; });
            const pk = d.peta[k.id];
            return '<tr class="klik" data-mk="' + esc(k.id) + '"><td class="center">' + k.smt + '</td><td class="mono">' + esc(k.kode) + '</td><td>' + esc(k.nama) + (k.jenis ? ' <span class="pill no-dot brand">' + esc(k.jenis) + '</span>' : '') + '</td><td class="num">' + k.sks + '</td><td>' + (pk && pk.periode ? esc(labelPeriode(pk.periode)) : Object.keys(per).map(labelPeriode).join(', ') || '<span class="soft">–</span>') + '</td><td>' + statbar(c) + '</td><td class="num">' + (c.SD || 0) + (c.SX ? '<span style="color:var(--s-SX)"> +' + c.SX + '</span>' : '') + '</td><td class="num">' + (c.SL || 0) + '</td><td class="num">' + (c.MN || 0) + '</td><td class="num">' + (c.BP || 0) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      } else {
        box.innerHTML = '<div class="row mb-12">' + legendaStatus() + '<span class="spacer"></span><span class="muted">Arahkan kursor ke sel untuk detail · klik nama untuk profil</span></div><div class="tbl-wrap tall"><table class="mtx"><thead><tr><th></th>' + d.kur.map((k) => '<th class="v" title="' + esc(k.nama) + '">' + esc(k.kode) + '</th>').join('') + '<th>IPK</th></tr></thead><tbody>' +
          d.mhs.map((m) => '<tr><td class="nm"><a href="#/mahasiswa/' + encodeURIComponent(m.nim) + '">' + esc(m.nama) + '</a></td>' + d.kur.map((k) => { const x = (d.cells[m.nim] || {})[k.id] || ['BP']; return '<td class="c c-' + x[0] + '" title="' + esc(k.kode + ' ' + k.nama + ' — ' + STATUS_LABEL[x[0]] + (x[1] !== null && x[1] !== undefined ? ': ' + fmt2(x[1]) : '') + (x[2] ? ' · ' + labelPeriode(x[2]) : '')) + '"></td>'; }).join('') + '<td class="num" style="padding-left:6px">' + fmt2((d.ipk[m.nim] || [])[0]) + '</td></tr>').join('') + '</tbody></table></div>';
      }
    };
    $('#mx-isi', el).addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-mk]'); if (!tr || !mx) return;
      const k = mx.kur.find((x) => x.id === tr.dataset.mk);
      const rows = mx.mhs.map((m) => { const x = (mx.cells[m.nim] || {})[k.id] || ['BP']; return { m: m, x: x }; }).sort((a, b) => URUT_STATUS.indexOf(a.x[0]) - URUT_STATUS.indexOf(b.x[0]));
      modal({ judul: k.kode + ' · ' + k.nama, desc: mx.prodi + ' angkatan ' + mx.angk + ' · ' + k.sks + ' SKS · sebaran smt ' + k.smt, lebar: 'lebar',
        isi: '<div class="tbl-wrap" style="max-height:60vh"><table class="tbl tbl-compact"><thead><tr><th>NIM</th><th>Nama</th><th>Kelas</th><th>Status</th><th class="num">Nilai</th><th>Huruf</th><th>Periode</th></tr></thead><tbody>' +
          rows.map((r) => '<tr><td class="mono">' + esc(r.m.nim) + '</td><td><a href="#/mahasiswa/' + encodeURIComponent(r.m.nim) + '">' + esc(r.m.nama) + '</a>' + (r.m.status !== 'Aktif' ? ' ' + pillMhs(r.m.status) : '') + '</td><td>' + kelasTag(r.m.kelas) + '</td><td>' + pillStatus(r.x[0]) + '</td><td class="num">' + fmt2(r.x[1]) + '</td><td>' + esc(r.x[0] === 'SD' || r.x[0] === 'SX' ? r.x[3] : '') + '</td><td>' + esc(labelPeriode(r.x[2] || '')) + '</td></tr>').join('') + '</tbody></table></div>' });
    });
    $('#mx-rekap', el).onclick = () => { const pr = $('#mx-prodi', el).value, an = $('#mx-angk', el).value; App.pergi('/perkuliahan/rekap' + (pr && an ? '?prodi=' + encodeURIComponent(pr) + '&angkatan=' + encodeURIComponent(an) : '')); };
    $('#mx-mode', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.v; $$('#mx-mode button', el).forEach((x) => x.classList.toggle('on', x === b)); if (mx) gambarMatriks(); });
    $('#d-prodi', el).onchange = () => { App.ingat('dasbor', Object.assign(App.ingat('dasbor') || {}, { prodi: $('#d-prodi', el).value })); gambarProgres(); };
    $('#d-sb', el).onchange = gambarSebaran;
    $('#d-segar', el).onclick = (e) => tombolProses(e.currentTarget, async () => { const r = await api('dasbor.ringkasan', { _fresh: true }); if (r.success) { Store.put('dasbor.ringkasan', {}, r.data); tampil(r.data); toast('Dasbor diperbarui.'); } else toast(r.message, 'err'); });
    $('#d-kpi', el).addEventListener('click', (e) => { const c = e.target.closest('[data-go]'); if (c) App.pergi(c.dataset.go); });
    pakai(ctx, 'dasbor.ringkasan', {}, tampil, { maxAge: 60000 });
    pakai(ctx, 'dasbor.sebaran', { periode: App.periode }, (d) => {
      sebaran = d;
      $('#d-sb', el).innerHTML = '<option value="">Semua kelas (gabungan) · ' + d.length + ' kelas</option>' + d.map((x) => '<option value="' + esc(x.id) + '">' + esc(x.mk + ' · ' + x.prodi + ' ' + x.angkatan + ' · ' + progLabel(x.program)) + '</option>').join('');
      gambarSebaran();
    });
  }
};

/* ============================================================== MAHASISWA */
const STATUS_MHS = ['Aktif', 'Cuti', 'Mengundurkan Diri', 'DO', 'Non-aktif', 'Lulus'];
Hal.mahasiswa = {
  prefetch() { prefetch('mhs.list', {}); },
  judul: (p) => p[1] ? 'Detail mahasiswa' : 'Mahasiswa',   // p = rute lengkap ['mahasiswa', nim]
  render(el, ctx, p, q) {
    if (p[0]) return HalMhsDetail(el, ctx, decodeURIComponent(p[0]));
    const f = Object.assign({ q: '', prodi: '', angk: '', prog: '', status: 'Aktif', kelas: '' }, App.ingat('mhs') || {}, q.status ? { status: q.status } : {});
    el.innerHTML = '<div class="page-head"><div><h2>Data mahasiswa</h2><div class="desc">Mahasiswa tidak pernah dihapus — perubahan dicatat lewat status & riwayat agar data nilai tetap utuh.</div></div><span class="spacer"></span>' +
      '<button class="btn" id="m-lulus" title="Ubah status beberapa mahasiswa sekaligus menjadi Lulus (tanpa finalisasi IPK)">' + ic('lulus') + 'Tandai lulus</button><button class="btn" id="m-tarik">' + ic('link') + 'Tarik dari aplikasi lain</button><button class="btn" id="m-impor">' + ic('upload') + 'Impor Excel</button><button class="btn btn-primary" id="m-tambah">' + ic('userplus') + 'Tambah</button></div>' +
      '<div class="card"><div class="toolbar"><div class="search" style="width:260px">' + ic('search') + '<input class="input" id="m-q" placeholder="Cari NIM atau nama…" value="' + esc(f.q) + '"></div>' +
      '<select class="input" id="m-prodi">' + opsi(App.prodi().map((x) => ({ v: x.kode, t: x.kode })), f.prodi, null, 'Semua prodi') + '</select>' +
      '<select class="input" id="m-angk">' + opsi(App.angkatanList(), f.angk, (a) => 'Angkatan ' + a, 'Semua angkatan') + '</select>' +
      '<select class="input" id="m-prog">' + opsi(Object.keys(PROGRAM_LABEL).map((k) => ({ v: k, t: PROGRAM_LABEL[k] })), f.prog, null, 'Semua program') + '</select>' +
      '<select class="input" id="m-status">' + opsi(STATUS_MHS, f.status, null, 'Semua status') + '</select>' +
      '<select class="input" id="m-kelas">' + opsi([{ v: 'A', t: 'Kelas A' }, { v: 'B', t: 'Kelas B' }], f.kelas, null, 'Kelas A/B') + '</select>' +
      '<span class="spacer"></span><button class="btn btn-sm" id="m-kelasab">' + ic('layers') + 'Kelas A/B</button><button class="btn btn-sm" id="m-tempat">' + ic('repeat') + "Penempatan Ma'had</button><button class=\"btn btn-sm btn-icon\" id=\"m-unduh\" title=\"Unduh Excel\">" + ic('download') + '</button></div><div id="m-tbl">' + skelTabel(10) + '</div></div>';
    let semua = [];
    const t = Tabel($('#m-tbl', el), {
      id: (r) => r.nim, urut: 'nim', perHalaman: 50, tinggi: true,
      kolom: [
        { k: 'nim', label: 'NIM', cls: 'mono nowrap' },
        { k: 'nama', label: 'Nama', html: (r) => '<b style="font-weight:600">' + esc(r.nama) + '</b>' + (r.ikut_angkatan !== r.angkatan_asal ? '<div class="sub">asal angkatan ' + esc(r.angkatan_asal) + ' → ikut ' + esc(r.ikut_angkatan) + '</div>' : '') },
        { k: 'prodi', label: 'Prodi' },
        { k: 'ikut_angkatan', label: 'Angkatan', cls: 'center' },
        { k: 'program_kini', label: 'Program', html: (r) => esc(PROGRAM_LABEL[r.program_kini] || r.program_kini) + (r.program_awal === 'MA' && r.program_kini !== 'MA' ? ' <span class="pill no-dot info" title="Awalnya Ma\'had Aly">eks-MA</span>' : '') },
        { k: 'kelas_lapor', label: 'Kelas', html: (r) => kelasTag(r.kelas_lapor) + (String(r.kelas_terkunci) === '1' ? ' ' + ic('lock', 'ic-sm lock') : '') },
        { k: 'status', label: 'Status', html: (r) => pillMhs(r.status) }
      ],
      cari: (r) => r.nim + ' ' + r.nama,
      klik: (r) => App.pergi('/mahasiswa/' + encodeURIComponent(r.nim)),
      hover: (r) => prefetch('mhs.detail', { nim: r.nim }),
      kosong: 'Belum ada mahasiswa', kosongDesc: 'Tarik data dari aplikasi lain (link spreadsheet) atau impor Excel.'
    });
    const saring = () => {
      const v = { q: $('#m-q', el).value, prodi: $('#m-prodi', el).value, angk: $('#m-angk', el).value, prog: $('#m-prog', el).value, status: $('#m-status', el).value, kelas: $('#m-kelas', el).value };
      App.ingat('mhs', v);
      t.st.q = v.q;
      t.saring((r) => (!v.prodi || r.prodi === v.prodi) && (!v.angk || String(r.ikut_angkatan) === v.angk) && (!v.prog || r.program_kini === v.prog) && (!v.status || r.status === v.status) && (!v.kelas || r.kelas_lapor === v.kelas));
    };
    $('#m-q', el).oninput = debounce(saring, 150);
    ['#m-prodi', '#m-angk', '#m-prog', '#m-status', '#m-kelas'].forEach((s) => { $(s, el).onchange = saring; });
    pakai(ctx, 'mhs.list', {}, (d) => { semua = d; t.st.rows = d; saring(); });
    $('#m-tambah', el).onclick = () => formMahasiswa(null);
    $('#m-impor', el).onclick = () => imporMahasiswa();
    $('#m-tarik', el).onclick = () => Sinkron.buka('MAHASISWA');
    $('#m-lulus', el).onclick = () => tandaiLulus({ prodi: $('#m-prodi', el).value, angk: $('#m-angk', el).value });
    $('#m-kelasab', el).onclick = () => kelasAB($('#m-prodi', el).value, $('#m-angk', el).value);
    $('#m-tempat', el).onclick = () => penempatanMahad($('#m-angk', el).value);
    $('#m-unduh', el).onclick = () => Excel.tulisSederhana('Mahasiswa.xlsx', ['NIM', 'Nama', 'Prodi', 'Angkatan asal', 'Ikut angkatan', 'Program awal', 'Program kini', 'Kelas lapor', 'Status'], t.hasil().map((r) => [r.nim, r.nama, r.prodi, r.angkatan_asal, r.ikut_angkatan, PROGRAM_LABEL[r.program_awal] || r.program_awal, PROGRAM_LABEL[r.program_kini] || r.program_kini, r.kelas_lapor, r.status]), 'Mahasiswa');
  }
};

/* ==========================================================================
   v1.2 — TANDAI LULUS MASSAL (tanpa finalisasi IPK), mis. angkatan 2019 yang sudah lulus.
   o = { prodi, angk, setelah() }
   ========================================================================== */
function tandaiLulus(o) {
  o = o || {};
  const daftarAngk = App.angkatanList(), angkAwal = o.angk || daftarAngk[daftarAngk.length - 1];
  const per = (App.M.periode || []).slice().sort((a, b) => Number(b.id) - Number(a.id));
  const perDefault = (a) => { const p = periodeDari(a, 8); return per.some((x) => String(x.id) === p) ? p : (per[per.length - 1] || {}).id; };
  let semua = null, perDiubah = false;
  const pilih = new Set();
  const md = modal({
    judul: 'Tandai lulus', lebar: 'lebar',
    desc: 'Mengubah status mahasiswa menjadi <b>Lulus</b> tanpa finalisasi IPK — cocok untuk angkatan lama (mis. 2019) yang sudah lulus tetapi datanya belum lengkap di menu Kelulusan. Finalisasi IPK &amp; transkrip tetap bisa dilakukan nanti.',
    isi: '<div class="fgrid c3 mb-12"><div class="field"><label>Prodi</label><select class="input" id="tl-prodi">' + opsi(App.prodi().map((x) => ({ v: x.kode, t: x.kode + ' — ' + x.nama })), o.prodi || '', null, 'Semua prodi') + '</select></div>' +
      '<div class="field"><label>Angkatan (ikut)</label><select class="input" id="tl-angk">' + opsi(daftarAngk, angkAwal, (a) => 'Angkatan ' + a) + '</select></div>' +
      '<div class="field"><label class="req">Periode lulus</label><select class="input" id="tl-per">' + opsi(per.map((p) => ({ v: p.id, t: labelPeriode(p.id) })), perDefault(angkAwal)) + '</select><div class="hint">Bawaan: semester 8 angkatan ini.</div></div>' +
      '<div class="field"><label>Tanggal yudisium <span class="muted">(opsional)</span></label><input class="input" type="date" id="tl-tgl"></div>' +
      '<div class="field"><label>No. SK yudisium <span class="muted">(opsional)</span></label><input class="input" id="tl-sk" maxlength="80"></div>' +
      '<div class="field"><label>Keterangan</label><input class="input" id="tl-ket" value="Ditandai lulus (tanpa finalisasi IPK)" maxlength="300"></div></div><div id="tl-isi">' + skelTabel(6) + '</div>',
    tombol: [{ teks: 'Riwayat', ikon: 'history', kiri: true, aksi: () => { modalRiwayatBatch('Riwayat tandai lulus', /^LULUS-/, 'Tandai lulus bisa dibatalkan selama IPK mahasiswa belum difinalisasi di menu Kelulusan.', () => { Store.basi(); muat(); }); return false; } },
      { teks: 'Batal', aksi: () => true }, { teks: 'Tandai lulus', kelas: 'btn-primary', ikon: 'lulus', aksi: async (close, m) => {
        const nims = Array.from(pilih);
        if (!nims.length) { toast('Pilih minimal satu mahasiswa.', 'warn'); return false; }
        const ok = await konfirmasi('Tandai lulus', 'Ubah status <b>' + nims.length + ' mahasiswa</b> menjadi <b>Lulus</b> (periode ' + esc(labelPeriode($('#tl-per', m).value)) + ')? Bisa dibatalkan dari Riwayat selama IPK belum difinalisasi.', 'Tandai lulus');
        if (!ok) return false;
        const r = await api('mhs.luluskan', { nims: nims, periode: $('#tl-per', m).value, tgl_yudisium: $('#tl-tgl', m).value, no_sk: $('#tl-sk', m).value.trim(), keterangan: $('#tl-ket', m).value.trim() });
        if (!r.success) { toast(r.message, 'err', 7000); return false; }
        toast(r.message + ' Bisa dibatalkan lewat tombol Riwayat.', 'ok', 7000);
        if (o.setelah) o.setelah(); else App.render();
        return true;
      } }]
  });
  const el = md.el;
  const gambar = () => {
    const box = $('#tl-isi', el); if (!semua) return;
    const pr = $('#tl-prodi', el).value, an = $('#tl-angk', el).value;
    const ms = semua.filter((m) => (!pr || m.prodi === pr) && String(m.ikut_angkatan) === String(an));
    const calon = ms.filter((m) => ['Aktif', 'Cuti', 'Non-aktif'].includes(m.status)).sort((a, b) => String(a.nim).localeCompare(String(b.nim)));
    const sudah = ms.filter((m) => m.status === 'Lulus').length, keluar = ms.filter((m) => m.status === 'Mengundurkan Diri' || m.status === 'DO').length;
    pilih.clear(); calon.forEach((m) => pilih.add(m.nim));
    box.innerHTML = '<div class="row mb-8" style="flex-wrap:wrap;gap:8px"><span class="pill st-Aktif">' + calon.length + ' belum lulus</span><span class="pill no-dot">' + sudah + ' sudah Lulus</span>' + (keluar ? '<span class="pill no-dot">' + keluar + ' mundur/DO (tidak ikut)</span>' : '') + '<span class="spacer"></span><span class="muted" id="tl-ring"></span></div>' +
      (calon.length ? '<div class="tbl-wrap" style="max-height:40vh"><table class="tbl tbl-compact"><thead><tr><th style="width:28px"><input type="checkbox" id="tl-semua" checked></th><th>NIM</th><th>Nama</th><th>Prodi</th><th>Program</th><th>Status</th></tr></thead><tbody>' +
        calon.map((m) => '<tr><td><input type="checkbox" data-n="' + esc(m.nim) + '" checked></td><td class="mono">' + esc(m.nim) + '</td><td>' + esc(m.nama) + '</td><td>' + esc(m.prodi) + '</td><td>' + esc(PROGRAM_LABEL[m.program_kini] || m.program_kini || '') + '</td><td>' + pillMhs(m.status) + '</td></tr>').join('') + '</tbody></table></div>'
        : kosong('Tidak ada mahasiswa yang perlu ditandai', sudah ? 'Semua mahasiswa angkatan ini sudah berstatus Lulus.' : 'Tidak ada mahasiswa Aktif/Cuti/Non-aktif untuk pilihan ini.', 'checkc'));
    hitung();
  };
  const hitung = () => { const r = $('#tl-ring', el); if (r) r.textContent = pilih.size + ' dipilih'; const s = $('#tl-semua', el); if (s) { const n = $$('[data-n]', el).length; s.checked = pilih.size === n && n > 0; s.indeterminate = pilih.size > 0 && pilih.size < n; } };
  const muat = async () => { const r = await api('mhs.list', {}); if (!r.success) { $('#tl-isi', el).innerHTML = '<div class="alert danger">' + ic('xc') + '<div>' + esc(r.message) + '</div></div>'; return; } semua = r.data; gambar(); };
  $('#tl-isi', el).addEventListener('change', (e) => {
    if (e.target.id === 'tl-semua') { $$('[data-n]', el).forEach((c) => { c.checked = e.target.checked; if (c.checked) pilih.add(c.dataset.n); else pilih.delete(c.dataset.n); }); hitung(); return; }
    const c = e.target.closest('[data-n]'); if (!c) return; if (c.checked) pilih.add(c.dataset.n); else pilih.delete(c.dataset.n); hitung();
  });
  $('#tl-prodi', el).onchange = gambar;
  $('#tl-angk', el).onchange = () => { if (!perDiubah) $('#tl-per', el).value = perDefault($('#tl-angk', el).value); gambar(); };
  $('#tl-per', el).onchange = () => { perDiubah = true; };
  muat();
}

function formMahasiswa(m, onOk) {
  const baru = !m; m = m || { prodi: App.prodi()[0] && App.prodi()[0].kode, angkatan_asal: String(App.periodeAktif).slice(0, 4), program_awal: 'REG' };
  modal({
    judul: baru ? 'Tambah mahasiswa' : 'Ubah data mahasiswa', desc: baru ? '' : 'Status, kelas lapor, dan angkatan yang diikuti diubah lewat tombolnya masing-masing agar tercatat di riwayat.',
    isi: '<div class="fgrid"><div class="field"><label class="req">NIM</label><input class="input" name="nim" value="' + esc(m.nim || '') + '" ' + (baru ? '' : 'readonly') + '></div><div class="field"><label class="req">Nama lengkap</label><input class="input" name="nama" value="' + esc(m.nama || '') + '"></div>' +
      '<div class="field"><label>Prodi</label><select class="input" name="prodi">' + opsi(App.prodi().map((x) => ({ v: x.kode, t: x.kode + ' — ' + x.nama })), m.prodi) + '</select></div><div class="field"><label>Angkatan asal (tahun masuk)</label><select class="input" name="angkatan_asal">' + opsi(App.angkatanList(), m.angkatan_asal) + '</select></div>' +
      '<div class="field"><label>Program awal</label><select class="input" name="program_awal">' + opsi(Object.keys(PROGRAM_LABEL).map((k) => ({ v: k, t: PROGRAM_LABEL[k] })), m.program_awal) + '</select></div><div class="field"><label>NIK</label><input class="input" name="nik" value="' + esc(m.nik || '') + '" inputmode="numeric"></div>' +
      '<div class="field"><label>Tempat lahir</label><input class="input" name="tempat_lahir" value="' + esc(m.tempat_lahir || '') + '"></div><div class="field"><label>Tanggal lahir</label><input class="input" type="date" name="tgl_lahir" value="' + esc(m.tgl_lahir || '') + '"></div></div>',
    tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan', kelas: 'btn-primary', ikon: 'save', aksi: async (close, el) => {
      const f = bacaForm(el);
      const r = await api('mhs.simpan', { mhs: f, baru: baru });
      if (!r.success) { toast(r.message, 'err'); return false; }
      toast(r.message); if (onOk) onOk(); else App.render(); return true;
    } }]
  });
}

async function imporMahasiswa() {
  let rows = [];
  const m = modal({
    judul: 'Impor rekap mahasiswa dari Excel', lebar: 'lebar', desc: 'Kolom dibaca berdasarkan judulnya (urutan bebas): NIM, Nama, Prodi, Angkatan, Program, Tempat Lahir, Tanggal Lahir, NIK.',
    isi: '<div class="drop" id="im-drop">' + ic('upload') + '<div><b>Pilih atau seret file .xlsx</b></div><div style="font-size:12.5px">Data yang sudah ada tidak ditimpa (hanya melengkapi yang kosong).</div><input type="file" accept=".xlsx,.xls,.csv" hidden id="im-file"></div><div class="row mt-8"><button class="btn btn-sm btn-ghost" id="im-templat">' + ic('download') + 'Unduh templat</button><label class="check" style="margin-left:auto"><input type="checkbox" id="im-timpa">Timpa identitas yang sudah ada</label></div><div id="im-hasil" class="mt-12"></div>',
    tombol: [{ teks: 'Tutup', aksi: () => true }, { teks: 'Impor sekarang', kelas: 'btn-primary', aksi: async (close, el) => {
      if (!rows.length) { toast('Pilih file dulu.', 'warn'); return false; }
      const r = await api('mhs.impor', { rows: rows, timpa: $('#im-timpa', el).checked });
      if (!r.success) { toast(r.message, 'err'); return false; }
      toast(r.data.ditambah + ' ditambah, ' + r.data.diperbarui + ' diperbarui, ' + r.data.dilewati + ' dilewati.'); App.render(); return true;
    } }]
  });
  const el = m.el;
  $('#im-templat', el).onclick = () => Excel.tulisSederhana('Templat-Mahasiswa.xlsx', ['NIM', 'Nama', 'Prodi', 'Angkatan', 'Program', 'Tempat Lahir', 'Tanggal Lahir', 'NIK'], [['24210001', 'Contoh Nama', 'HES', 2024, 'Reguler', 'Bogor', '2006-01-31', '3201xxxxxxxxxxxx']]);
  pasangDrop($('#im-drop', el), $('#im-file', el), async (file) => {
    const wb = await Excel.baca(file), a = await Excel.baris(wb);
    const hi = Excel.cariHeader(a, [/^nim$|^npm$|nomor induk/, /^nama/, /prodi|program studi|jurusan/, /angkatan|tahun masuk/]);
    if (hi < 0) { $('#im-hasil', el).innerHTML = '<div class="alert danger">' + ic('xc') + '<div>Judul kolom NIM & Nama tidak ditemukan.</div></div>'; return; }
    const h = a[hi].map((x) => normNama(x));
    const col = (re) => h.findIndex((x) => re.test(x));
    const c = { nim: col(/^nim$|^npm$|nomor induk/), nama: col(/^nama/), prodi: col(/prodi|program studi|jurusan/), angk: col(/angkatan|tahun masuk/), prog: col(/^program$|^kelas$|jalur/), tl: col(/tempat lahir/), tgl: col(/tanggal lahir|tgl lahir/), nik: col(/^nik/) };
    const kodeProdi = (v) => { const s = normNama(v); const p = App.M.prodi.find((x) => normNama(x.kode) === s || normNama(x.nama) === s || normNama(x.nama_resmi) === s); return p ? p.kode : String(v || '').toUpperCase().trim(); };
    const kodeProg = (v) => { const s = normNama(v); return /mahad|ma had|aly|^ma$/.test(s) ? 'MA' : /hyb|hibrid|online/.test(s) ? 'HYB' : 'REG'; };
    const tgl = (v) => v instanceof Date ? v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0') : String(v || '');
    rows = a.slice(hi + 1).filter((r) => String(r[c.nim] || '').trim() && String(r[c.nama] || '').trim()).map((r) => ({ nim: String(r[c.nim]).trim(), nama: String(r[c.nama]).trim().replace(/\s+/g, ' '), prodi: c.prodi > -1 ? kodeProdi(r[c.prodi]) : '', angkatan_asal: c.angk > -1 ? String(r[c.angk]).replace(/\D/g, '').slice(0, 4) : '', program_awal: c.prog > -1 ? kodeProg(r[c.prog]) : 'REG', tempat_lahir: c.tl > -1 ? String(r[c.tl] || '') : '', tgl_lahir: c.tgl > -1 ? tgl(r[c.tgl]) : '', nik: c.nik > -1 ? String(r[c.nik] || '') : '' }));
    const r = await api('mhs.impor', { rows: rows, dryRun: true, timpa: $('#im-timpa', el).checked });
    if (!r.success) { toast(r.message, 'err'); return; }
    const h2 = r.data;
    $('#im-hasil', el).innerHTML = '<div class="grid g3 mb-12"><div class="card kpi k-SD"><div><div class="kpi-v">' + h2.ditambah + '</div><div class="kpi-l">akan ditambah</div></div></div><div class="card kpi k-SL"><div><div class="kpi-v">' + h2.diperbarui + '</div><div class="kpi-l">akan dilengkapi</div></div></div><div class="card kpi"><div><div class="kpi-v">' + h2.dilewati + '</div><div class="kpi-l">dilewati (sama/ganda)</div></div></div></div>' +
      (h2.peringatan.length ? '<div class="alert warn mb-12">' + ic('warn') + '<div>' + h2.peringatan.slice(0, 8).map(esc).join('<br>') + (h2.peringatan.length > 8 ? '<br>… ' + (h2.peringatan.length - 8) + ' lainnya' : '') + '</div></div>' : '') +
      '<div class="tbl-wrap" style="max-height:240px"><table class="tbl tbl-compact"><thead><tr><th>NIM</th><th>Nama</th><th>Prodi</th><th>Angkatan</th><th>Program</th></tr></thead><tbody>' + rows.slice(0, 50).map((x) => '<tr><td class="mono">' + esc(x.nim) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(x.prodi) + '</td><td>' + esc(x.angkatan_asal) + '</td><td>' + esc(PROGRAM_LABEL[x.program_awal]) + '</td></tr>').join('') + '</tbody></table></div><div class="muted mt-4">' + rows.length + ' baris dibaca.</div>';
  });
}

function pasangDrop(drop, input, onFile) {
  drop.onclick = () => input.click();
  input.onchange = () => { if (input.files[0]) jalan(input.files[0]); input.value = ''; };
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) jalan(e.dataTransfer.files[0]); };
  async function jalan(f) {
    const lama = drop.innerHTML;
    drop.innerHTML = '<div class="row" style="justify-content:center">' + '<span class="btn btn-ghost loading" style="height:auto"></span>Membaca ' + esc(f.name) + '…</div>';
    try { await onFile(f); drop.innerHTML = ic('filecheck') + '<div><b>' + esc(f.name) + '</b></div><div style="font-size:12.5px">Klik untuk mengganti file</div>'; }
    catch (e) { console.error(e); drop.innerHTML = lama; toast('Gagal membaca file: ' + e.message, 'err'); }
  }
}

function kelasAB(prodi, angk) {
  prodi = prodi || 'HES'; angk = angk || String(App.periodeAktif).slice(0, 4);
  let list = [];
  const m = modal({
    judul: 'Kelas lapor PDDIKTI (A/B)', lebar: 'lebar', desc: 'Kelas A/B menetap sampai lulus. Setelah dikunci, perubahan hanya lewat "Koreksi" di detail mahasiswa (wajib alasan).',
    isi: '<div class="row mb-12"><select class="input" id="ab-prodi" style="width:auto">' + opsi(App.prodi().map((x) => x.kode), prodi) + '</select><select class="input" id="ab-angk" style="width:auto">' + opsi(App.angkatanList(), angk, (a) => 'Angkatan ' + a) + '</select><span class="spacer"></span><button class="btn btn-sm" id="ab-saran">' + ic('spark') + 'Terapkan saran</button></div><div class="alert info mb-12">' + ic('info') + '<div>Saran: Reguler & Ma\'had Aly → <b>A</b>, Hybrid → <b>B</b> (bisa diubah per mahasiswa).</div></div><div id="ab-isi"></div>',
    tombol: [{ teks: 'Tutup', aksi: () => true }, { teks: 'Simpan', ikon: 'save', aksi: async () => {
      const rows = list.filter((x) => !x.kunci && x.baru !== x.kelas_lapor).map((x) => ({ nim: x.nim, kelas: x.baru }));
      if (!rows.length) { toast('Tidak ada perubahan.', 'info'); return false; }
      const r = await api('mhs.kelasSet', { rows: rows }); toast(r.message, r.success ? 'ok' : 'err'); if (r.success) muat(); return false;
    } }, { teks: 'Simpan & kunci', kelas: 'btn-primary', ikon: 'lock', aksi: async () => {
      const ok = await konfirmasi('Kunci kelas lapor', 'Kelas lapor ' + list.filter((x) => !x.kunci).length + ' mahasiswa akan dikunci sampai lulus. Lanjutkan?', 'Kunci');
      if (!ok) return false;
      const rows = list.filter((x) => !x.kunci && x.baru !== x.kelas_lapor).map((x) => ({ nim: x.nim, kelas: x.baru }));
      if (rows.length) { const r1 = await api('mhs.kelasSet', { rows: rows }); if (!r1.success) { toast(r1.message, 'err'); return false; } }
      const r = await api('mhs.kelasKunci', { nims: list.filter((x) => !x.kunci).map((x) => x.nim) }); toast(r.message, r.success ? 'ok' : 'err'); if (r.success) muat(); return false;
    } }]
  });
  const el = m.el;
  const muat = async () => {
    $('#ab-isi', el).innerHTML = skelTabel(5);
    const r = await Store.ambil('mhs.list', {});
    if (!r.success) return toast(r.message, 'err');
    const pr = $('#ab-prodi', el).value, an = $('#ab-angk', el).value;
    list = r.data.filter((x) => x.prodi === pr && String(x.ikut_angkatan) === an && ['Aktif', 'Cuti'].indexOf(x.status) > -1).map((x) => Object.assign({}, x, { kunci: String(x.kelas_terkunci) === '1', baru: x.kelas_lapor || (x.program_awal === 'HYB' ? 'B' : 'A') }));
    gambar();
  };
  const gambar = () => {
    const nA = list.filter((x) => x.baru === 'A').length;
    $('#ab-isi', el).innerHTML = list.length ? '<div class="muted mb-8">' + list.length + ' mahasiswa · A: <b>' + nA + '</b> · B: <b>' + (list.length - nA) + '</b> · terkunci: ' + list.filter((x) => x.kunci).length + '</div><div class="tbl-wrap" style="max-height:50vh"><table class="tbl tbl-compact"><thead><tr><th>NIM</th><th>Nama</th><th>Program awal</th><th>Program kini</th><th>Kelas</th></tr></thead><tbody>' +
      list.map((x, i) => '<tr><td class="mono">' + esc(x.nim) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(PROGRAM_LABEL[x.program_awal]) + '</td><td>' + esc(PROGRAM_LABEL[x.program_kini]) + '</td><td>' + (x.kunci ? kelasTag(x.kelas_lapor) + ' ' + ic('lock', 'ic-sm lock') : '<div class="seg" data-i="' + i + '"><button class="' + (x.baru === 'A' ? 'on' : '') + '" data-v="A">A</button><button class="' + (x.baru === 'B' ? 'on' : '') + '" data-v="B">B</button></div>') + '</td></tr>').join('') + '</tbody></table></div>' : kosong('Tidak ada mahasiswa aktif', 'Pilih prodi & angkatan lain.', 'users');
  };
  $('#ab-isi', el).addEventListener('click', (e) => { const b = e.target.closest('.seg button'); if (!b) return; list[Number(b.parentNode.dataset.i)].baru = b.dataset.v; gambar(); });
  $('#ab-saran', el).onclick = () => { list.forEach((x) => { if (!x.kunci) x.baru = x.program_awal === 'HYB' ? 'B' : 'A'; }); gambar(); };
  $('#ab-prodi', el).onchange = muat; $('#ab-angk', el).onchange = muat;
  muat();
}

function penempatanMahad(angk) {
  angk = angk || String(Number(String(App.periodeAktif).slice(0, 4)) - 2);
  let list = [];
  const m = modal({
    judul: "Penempatan semester 5 Ma'had Aly", lebar: 'lebar', desc: 'Pilih Reguler atau Hybrid untuk tiap mahasiswa Ma\'had Aly. Kelas lapor A/B tidak berubah.',
    isi: '<div class="row mb-12"><select class="input" id="pm-angk" style="width:auto">' + opsi(App.angkatanList(), angk, (a) => 'Angkatan ' + a) + '</select><span class="spacer"></span><button class="btn btn-sm" data-semua="REG">Semua Reguler</button><button class="btn btn-sm" data-semua="HYB">Semua Hybrid</button></div><div id="pm-isi"></div>',
    tombol: [{ teks: 'Tutup', aksi: () => true }, { teks: 'Simpan penempatan', kelas: 'btn-primary', ikon: 'save', aksi: async () => {
      const rows = list.filter((x) => x.baru && x.baru !== x.program_kini).map((x) => ({ nim: x.nim, program: x.baru }));
      if (!rows.length) { toast('Belum ada pilihan baru.', 'info'); return false; }
      const r = await api('mhs.penempatan', { rows: rows, periode: App.periode }); toast(r.message, r.success ? 'ok' : 'err'); if (r.success) muat(); return false;
    } }]
  });
  const el = m.el;
  const muat = async () => {
    const r = await Store.ambil('mhs.list', {}); if (!r.success) return;
    list = r.data.filter((x) => x.program_awal === 'MA' && String(x.ikut_angkatan) === $('#pm-angk', el).value && x.status === 'Aktif').map((x) => Object.assign({}, x, { baru: x.program_kini === 'MA' ? '' : x.program_kini }));
    gambar();
  };
  const gambar = () => {
    $('#pm-isi', el).innerHTML = list.length ? '<div class="tbl-wrap" style="max-height:50vh"><table class="tbl tbl-compact"><thead><tr><th>NIM</th><th>Nama</th><th>Kelas lapor</th><th>Program kini</th><th>Smt 5 ke</th></tr></thead><tbody>' + list.map((x, i) => '<tr><td class="mono">' + esc(x.nim) + '</td><td>' + esc(x.nama) + '</td><td>' + kelasTag(x.kelas_lapor) + '</td><td>' + esc(PROGRAM_LABEL[x.program_kini]) + '</td><td><div class="seg" data-i="' + i + '"><button data-v="REG" class="' + (x.baru === 'REG' ? 'on' : '') + '">Reguler</button><button data-v="HYB" class="' + (x.baru === 'HYB' ? 'on' : '') + '">Hybrid</button></div></td></tr>').join('') + '</tbody></table></div>' : kosong("Tidak ada mahasiswa Ma'had Aly aktif", 'Pilih angkatan lain.', 'mahad');
  };
  $('#pm-isi', el).addEventListener('click', (e) => { const b = e.target.closest('.seg button'); if (!b) return; list[Number(b.parentNode.dataset.i)].baru = b.dataset.v; gambar(); });
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-semua]'); if (!b) return; list.forEach((x) => { x.baru = b.dataset.semua; }); gambar(); });
  $('#pm-angk', el).onchange = muat;
  muat();
}

function HalMhsDetail(el, ctx, nim) {
  el.innerHTML = '<div class="row mb-16"><a href="#/mahasiswa" class="btn btn-sm btn-ghost">' + ic('back') + 'Kembali ke daftar</a></div><div id="md">' + skelKpi(4) + '<div class="card mt-16">' + skelTabel(6) + '</div></div>';
  let tab = App.ingat('mdtab') || 'lapor';
  pakai(ctx, 'mhs.detail', { nim: nim }, (d) => {
    const m = d.mhs, l = d.lulus;
    const persen = d.sksKurikulum ? Math.min(100, Math.round(d.sks / d.sksKurikulum * 100)) : 0;
    const kolomDef = (App.M.kolom || []).filter((k) => String(k.aktif) !== '0');
    $('#md', el).innerHTML = '<div class="grid g-side"><div>' +
      '<div class="card"><div class="card-b"><div class="row" style="align-items:flex-start;gap:16px"><div class="avatar" style="width:56px;height:56px;font-size:19px">' + esc(m.nama.split(' ').map((x) => x[0]).slice(0, 2).join('')) + '</div><div style="flex:1;min-width:0"><h2 style="font-size:19px">' + esc(m.nama) + '</h2><div class="row-wrap mt-4"><span class="mono muted">' + esc(m.nim) + '</span>' + pillMhs(m.status) + '<span class="pill no-dot">' + esc(m.prodi) + '</span><span class="pill no-dot">' + esc(PROGRAM_LABEL[m.program_kini]) + '</span>' + (m.ikut_angkatan !== m.angkatan_asal ? '<span class="pill no-dot info">ikut ' + esc(m.ikut_angkatan) + ' (asal ' + esc(m.angkatan_asal) + ')</span>' : '<span class="pill no-dot">Angkatan ' + esc(m.angkatan_asal) + '</span>') + '</div></div><button class="btn btn-sm" id="md-ubah">' + ic('edit') + 'Ubah data</button></div>' +
      '<dl class="dl mt-16"><dt>Tempat, tgl lahir</dt><dd>' + esc([m.tempat_lahir, fmtTgl(m.tgl_lahir)].filter(Boolean).join(', ') || '–') + '</dd><dt>NIK</dt><dd class="mono">' + esc(m.nik || '–') + '</dd><dt>Program awal</dt><dd>' + esc(PROGRAM_LABEL[m.program_awal]) + '</dd><dt>Sumber data</dt><dd>' + esc(m.sumber || '–') + '</dd>' + kolomDef.map((k) => '<dt>' + esc(k.nama) + '</dt><dd>' + esc(d.kolom[k.id] || '–') + '</dd>').join('') + '</dl></div></div>' +
      '<div class="card"><div class="card-b" style="padding-bottom:0"><div class="tabs" id="md-tabs" style="margin-bottom:0">' + [['lapor', 'Nilai lapor', d.lapor.length], ['riil', 'Nilai riil', d.riil.length], ['belum', 'Belum dilapor', d.belum.length], ['riwayat', 'Riwayat status', d.riwayat.length], ['kolom', 'Kolom tambahan', '']].map((x) => '<button data-t="' + x[0] + '" class="' + (tab === x[0] ? 'on' : '') + '">' + esc(x[1]) + (x[2] !== '' ? ' <span class="badge soft">' + x[2] + '</span>' : '') + '</button>').join('') + '</div></div><div id="md-tab"></div></div></div>' +
      '<div><div class="card"><div class="card-h"><h3>Ringkasan akademik</h3></div><div class="card-b"><div class="row" style="align-items:flex-end"><div><div class="muted" style="font-size:12.5px">IPK ' + (l && l.status === 'final' ? 'final' : 'berjalan') + '</div><div style="font-size:30px;font-weight:750">' + fmt2(l && l.status === 'final' ? l.ipk : d.ipk) + '</div></div><span class="spacer"></span><div style="text-align:right"><div class="muted" style="font-size:12.5px">SKS lapor</div><div style="font-weight:700;font-size:17px">' + d.sks + ' / ' + d.sksKurikulum + '</div></div></div><div class="progress mt-8"><i style="width:' + persen + '%"></i></div>' +
      '<div class="kv mt-12"><span class="muted">Kelas lapor PDDIKTI</span><span>' + kelasTag(m.kelas_lapor) + (String(m.kelas_terkunci) === '1' ? ' ' + ic('lock', 'ic-sm lock') : '') + ' <button class="btn btn-xs" id="md-koreksi">' + (String(m.kelas_terkunci) === '1' ? 'Koreksi' : 'Ubah') + '</button></span></div><div class="kv"><span class="muted">Ikut angkatan</span><b>' + esc(m.ikut_angkatan) + '</b></div><div class="kv"><span class="muted">MK kurikulum belum dilapor</span><b>' + d.belum.length + '</b></div>' + (l ? '<div class="kv"><span class="muted">Data kelulusan</span><span class="pill ' + (l.status === 'final' ? 'brand' : 'warn') + '">' + esc(l.status === 'final' ? 'Final' : 'Draf') + '</span></div>' : '') + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Tindakan</h3></div><div class="card-b" style="display:flex;flex-direction:column;gap:8px">' + (m.status !== 'Lulus' ? '<button class="btn" id="md-status">' + ic('repeat') + 'Ubah status (cuti / aktif kembali / mundur)</button>' : '') + '<button class="btn" id="md-khs">' + ic('printer') + 'Cetak KHS</button><button class="btn" id="md-tr">' + ic('file') + 'Cetak transkrip</button><a class="btn" href="#/lulus?prodi=' + esc(m.prodi) + '&angkatan=' + esc(m.ikut_angkatan) + '&nim=' + esc(m.nim) + '">' + ic('lulus') + 'Data kelulusan</a></div></div></div></div>';
    const tabIsi = () => {
      const box = $('#md-tab', el);
      if (tab === 'lapor') {
        const per = {}; d.lapor.forEach((x) => { (per[x.periode] = per[x.periode] || []).push(x); });
        box.innerHTML = d.lapor.length ? Object.keys(per).sort().map((p) => { const rs = per[p], sks = rs.reduce((s, x) => s + x.sks, 0), mutu = rs.reduce((s, x) => s + x.sks * x.indeks, 0);
          return '<div style="padding:12px 16px 4px" class="row"><b>' + esc(labelPeriode(p)) + '</b><span class="muted">· semester ' + smtDari(m.angkatan_asal, p) + '</span><span class="spacer"></span><span class="muted">' + sks + ' SKS · IPS ' + fmt2(sks ? mutu / sks : 0) + '</span></div><table class="tbl tbl-compact"><tbody>' + rs.map((x) => '<tr><td class="mono" style="width:120px">' + esc(x.kode) + '</td><td>' + esc(x.nama) + '</td><td class="num" style="width:50px">' + x.sks + '</td><td class="num" style="width:70px">' + fmt2(x.nilai) + '</td><td style="width:40px"><b>' + esc(x.huruf) + '</b></td><td class="num" style="width:56px">' + fmt2(x.indeks) + '</td><td style="width:110px"><span class="sub">' + esc(x.nama_kelas || x.kelas) + '</span> ' + ic('lock', 'ic-sm lock') + '</td></tr>').join('') + '</tbody></table>'; }).join('') : kosong('Belum ada nilai yang dilapor', '', 'lapor');
      } else if (tab === 'riil') {
        box.innerHTML = d.riil.length ? '<div class="tbl-wrap"><table class="tbl tbl-compact"><thead><tr><th>Periode</th><th>MK riil</th><th>Program</th><th class="num">SKS</th><th class="num">Nilai</th><th>Huruf</th><th>Dosen</th><th></th></tr></thead><tbody>' + d.riil.map((x) => '<tr><td class="nowrap">' + esc(labelPeriode(x.periode)) + '</td><td>' + esc(x.mk) + '</td><td>' + esc(progLabel(x.program)) + '</td><td class="num">' + esc(x.sks) + '</td><td class="num">' + (x.akhir === null ? '<span class="soft">–</span>' : fmt2(x.akhir)) + '</td><td>' + esc(x.huruf || '') + '</td><td class="sub">' + esc(x.dosen) + '</td><td>' + (x.terkunci ? ic('lock', 'ic-sm lock') : '') + '</td></tr>').join('') + '</tbody></table></div>' : kosong('Belum ada nilai riil', '', 'clip');
      } else if (tab === 'belum') {
        box.innerHTML = d.belum.length ? '<div class="tbl-wrap"><table class="tbl tbl-compact"><thead><tr><th>Smt</th><th>Kode</th><th>Mata kuliah</th><th class="num">SKS</th><th>Status</th><th class="num">Nilai</th><th>Periode lapor</th></tr></thead><tbody>' + d.belum.map((x) => '<tr><td class="center">' + x.smt + '</td><td class="mono">' + esc(x.kode) + '</td><td>' + esc(x.nama) + '</td><td class="num">' + x.sks + '</td><td>' + pillStatus(x.status) + '</td><td class="num">' + fmt2(x.nilai) + '</td><td>' + esc(labelPeriode(x.periode || '')) + '</td></tr>').join('') + '</tbody></table></div>' : kosong('Semua MK kurikulum sudah dilapor', '', 'checkc');
      } else if (tab === 'riwayat') {
        box.innerHTML = '<div class="card-b">' + (d.riwayat.length ? '<ul class="timeline">' + d.riwayat.map((x) => '<li><div class="row-wrap">' + pillMhs(x.status) + '<b>' + esc(labelPeriode(x.periode)) + '</b><span class="muted">' + esc(fmtWaktu(x.at)) + ' · ' + esc(x.oleh) + '</span></div><div class="mt-4">' + esc(x.keterangan || '') + (x.no_sk ? ' <span class="pill no-dot">SK ' + esc(x.no_sk) + '</span>' : '') + (x.ikut_angkatan ? ' <span class="muted">· ikut angkatan ' + esc(x.ikut_angkatan) + '</span>' : '') + '</div></li>').join('') + '</ul>' : kosong('Belum ada riwayat', '', 'history')) + '</div>';
      } else {
        box.innerHTML = '<div class="card-b">' + (kolomDef.length ? '<div class="fgrid" id="md-kol">' + kolomDef.map((k) => '<div class="field"><label>' + esc(k.nama) + '</label><input class="input" name="' + esc(k.id) + '" type="' + (k.tipe === 'tanggal' ? 'date' : k.tipe === 'angka' ? 'number' : 'text') + '" value="' + esc(d.kolom[k.id] || '') + '"></div>').join('') + '</div><div class="mt-12"><button class="btn btn-primary" id="md-kol-simpan">' + ic('save') + 'Simpan kolom tambahan</button></div>' : kosong('Belum ada kolom tambahan', 'Tambahkan di Pengaturan → Kolom tambahan (mis. Nomor PIN Ijazah).', 'list')) + '</div>';
        const b = $('#md-kol-simpan', el);
        if (b) b.onclick = () => tombolProses(b, async () => { const r = await api('mhs.kolom', { nim: nim, nilai: bacaForm($('#md-kol', el)) }); toast(r.message, r.success ? 'ok' : 'err'); });
      }
    };
    tabIsi();
    $('#md-tabs', el).onclick = (e) => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; App.ingat('mdtab', tab); $$('#md-tabs button', el).forEach((x) => x.classList.toggle('on', x === b)); tabIsi(); };
    $('#md-ubah', el).onclick = () => formMahasiswa(m);
    const bs = $('#md-status', el); if (bs) bs.onclick = () => ubahStatus(m);
    $('#md-koreksi', el).onclick = () => koreksiKelas(m);
    $('#md-khs', el).onclick = () => pilihCetakKhs(m, d.lapor);
    $('#md-tr', el).onclick = (e) => tombolProses(e.currentTarget, () => cetakTranskrip(m.nim));
  }, { gagal: (r) => { $('#md', el).innerHTML = '<div class="alert danger">' + ic('xc') + '<div>' + esc(r.message) + '</div></div>'; } });
}

function ubahStatus(m) {
  const aktifLagi = m.status !== 'Aktif';
  const md = modal({
    judul: 'Ubah status — ' + m.nama, desc: 'Perubahan dicatat di riwayat. Nomor SK cukup dicatat (tanpa unggah berkas).',
    isi: '<div class="fgrid"><div class="field"><label>Status baru</label><select class="input" name="status">' + opsi(['Aktif', 'Cuti', 'Mengundurkan Diri', 'DO', 'Non-aktif'], aktifLagi ? 'Aktif' : 'Cuti') + '</select></div><div class="field"><label>Mulai periode</label><select class="input" name="periode">' + opsi(App.M.periode.map((p) => ({ v: p.id, t: labelPeriode(p.id) })), App.periode) + '</select></div>' +
      '<div class="field"><label>Nomor SK</label><input class="input" name="no_sk" placeholder="mis. 012/SK/STIS-AW/II/2026"></div><div class="field"><label>Keterangan</label><input class="input" name="keterangan" placeholder="opsional"></div>' +
      '<div class="field full" id="us-ikut"><label>Ikut angkatan (saat aktif kembali)</label><div class="row"><select class="input" name="ikut_angkatan">' + opsi(App.angkatanList(), m.ikut_angkatan) + '</select><button class="btn" type="button" id="us-cek">' + ic('search') + 'Cek MK ganda/terlewat</button></div><div class="hint">NIM, angkatan asal, dan kelas A/B tetap sama. Nilai lama tetap tersimpan.</div></div><div class="full" id="us-hasil"></div></div>',
    tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan status', kelas: 'btn-primary', aksi: async (close, el) => {
      const f = bacaForm(el); f.nim = m.nim;
      if (f.status !== 'Aktif') delete f.ikut_angkatan;
      const r = await api('mhs.status', f);
      if (!r.success) { toast(r.message, 'err'); return false; }
      toast(r.message); App.render(); return true;
    } }]
  });
  const el = md.el, sel = $('[name=status]', el);
  const atur = () => { $('#us-ikut', el).classList.toggle('hidden', sel.value !== 'Aktif'); };
  sel.onchange = atur; atur();
  $('#us-cek', el).onclick = (e) => tombolProses(e.currentTarget, async () => {
    const r = await api('mhs.cekPindah', { nim: m.nim, ke: $('[name=ikut_angkatan]', el).value });
    if (!r.success) return toast(r.message, 'err');
    const g = r.data.ganda, t = r.data.terlewat;
    $('#us-hasil', el).innerHTML = (!g.length && !t.length) ? '<div class="alert ok">' + ic('checkc') + '<div>Tidak ada MK yang berpotensi ganda atau terlewat.</div></div>' :
      (g.length ? '<div class="alert info mb-8">' + ic('info') + '<div><b>' + g.length + ' MK sudah dilapor</b> (tidak akan dilapor ulang):<br>' + g.map((x) => esc(x.kode + ' ' + x.nama)).join('; ') + '</div></div>' : '') +
      (t.length ? '<div class="alert warn">' + ic('warn') + '<div><b>' + t.length + ' MK berpotensi terlewat</b> — angkatan tujuan sudah melaporkannya, sementara mahasiswa ini belum punya nilai:<br>' + t.map((x) => esc(x.kode + ' ' + x.nama)).join('; ') + '<br><span style="font-size:12.5px">Atur di Peta Klaim (periode lapor susulan) atau ikutkan mahasiswa di kelas mengulang.</span></div></div>' : '');
  });
}
function koreksiKelas(m) {
  const terkunci = String(m.kelas_terkunci) === '1';
  modal({
    judul: (terkunci ? 'Koreksi' : 'Ubah') + ' kelas lapor — ' + m.nama, desc: terkunci ? 'Kelas sudah dikunci. Koreksi tercatat di log dan tidak mengubah nilai yang sudah dilapor.' : '',
    isi: '<div class="field mb-12"><label>Kelas baru</label><select class="input" name="kelas">' + opsi(['A', 'B'], m.kelas_lapor === 'A' ? 'B' : 'A') + '</select></div>' + (terkunci ? '<div class="field"><label class="req">Alasan koreksi</label><textarea class="input" name="alasan" placeholder="mis. salah input sejak awal, sesuai SK…"></textarea></div>' : ''),
    tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan', kelas: 'btn-primary', aksi: async (close, el) => {
      const f = bacaForm(el);
      const r = terkunci ? await api('mhs.kelasKoreksi', { nim: m.nim, kelas: f.kelas, alasan: f.alasan }) : await api('mhs.kelasSet', { rows: [{ nim: m.nim, kelas: f.kelas }] });
      if (!r.success) { toast(r.message, 'err'); return false; }
      toast(r.message || 'Tersimpan.'); App.render(); return true;
    } }]
  });
}

/* ============================================================== KURIKULUM */
Hal.kurikulum = {
  prefetch() {},
  render(el, ctx, p) {
    const f = Object.assign({ tab: 'pddikti', prodi: (App.prodi()[0] || {}).kode, tahun: '', prog: '', q: '' }, App.ingat('kur') || {});
    el.innerHTML = '<div class="page-head"><div><h2>Kurikulum & mata kuliah</h2><div class="desc">MK PDDIKTI (yang dilaporkan) dan MK riil (yang benar-benar diajarkan, termasuk MK khusus Ma\'had Aly).</div></div><span class="spacer"></span><button class="btn btn-sm btn-ghost" id="k-hapus" style="display:none">' + ic('trash') + '<span>Hapus kurikulum</span></button><button class="btn btn-sm" id="k-riw" title="Riwayat impor & pembatalan">' + ic('history') + 'Riwayat impor</button></div>' +
      '<div class="tabs" id="k-tabs"><button data-t="pddikti">' + ic('lapor') + 'MK PDDIKTI (kurikulum)</button><button data-t="riil">' + ic('clip') + 'MK riil</button></div><div id="k-isi"></div>';
    const tabs = () => { $$('#k-tabs button', el).forEach((b) => b.classList.toggle('on', b.dataset.t === f.tab)); f.tab === 'pddikti' ? tabPddikti() : tabRiil(); if (f.tab !== 'pddikti') $('#k-hapus', el).style.display = 'none'; App.ingat('kur', f); };
    $('#k-tabs', el).onclick = (e) => { const b = e.target.closest('button'); if (b) { f.tab = b.dataset.t; tabs(); } };
    // v1.1: tombol kepala — Hapus kurikulum (tab PDDIKTI) & Riwayat impor (batal impor)
    const tombolKepala = () => {
      const b = $('#k-hapus', el), ada = f.tab === 'pddikti' && App.M.kurikulum.some((k) => k.prodi === f.prodi && String(k.tahun_kurikulum) === String(f.tahun));
      b.style.display = ada ? '' : 'none'; b.lastChild.textContent = 'Hapus kurikulum ' + f.prodi + ' ' + f.tahun; b.title = 'Hapus MK kurikulum ' + f.tahun + ' yang belum dipakai (bisa dibatalkan)';
    };
    $('#k-hapus', el).onclick = () => hapusKurikulum(f.prodi, f.tahun);
    $('#k-riw', el).onclick = () => f.tab === 'pddikti'
      ? modalRiwayatBatch('Riwayat impor kurikulum', /^(KUR|KURDEL|KURTHN)-/, 'Impor yang keliru bisa dibatalkan. MK yang sudah dipakai (dipetakan / sudah dilapor) tetap dipertahankan.', () => tabs())
      : modalRiwayatBatch('Riwayat impor MK riil', /^MKR-/, 'Impor yang keliru bisa dibatalkan. MK riil yang sudah dipakai kelas atau Peta Klaim tetap dipertahankan.', () => tabs());
    const tabPddikti = () => {
      const kur = App.M.kurikulum.filter((k) => k.prodi === f.prodi);
      const tahun = Array.from(new Set(kur.map((k) => String(k.tahun_kurikulum)))).sort().reverse();
      if (!tahun.includes(f.tahun)) f.tahun = tahun[0] || '';
      $('#k-isi', el).innerHTML = '<div class="card"><div class="toolbar"><select class="input" id="k-prodi">' + opsi(App.prodi().map((x) => ({ v: x.kode, t: x.kode + ' — ' + x.nama })), f.prodi) + '</select><select class="input" id="k-tahun">' + (tahun.length ? opsi(tahun, f.tahun, (t) => t ? 'Kurikulum ' + t : '⚠ Tanpa tahun kurikulum') : '<option value="">Belum ada kurikulum</option>') + '</select><div class="search" style="width:220px">' + ic('search') + '<input class="input" id="k-q" placeholder="Cari kode / nama…" value="' + esc(f.q) + '"></div><span id="k-total" class="pill brand no-dot"></span><span class="spacer"></span><button class="btn btn-sm" id="k-impor">' + ic('upload') + 'Impor Sebaran MK</button><button class="btn btn-sm btn-primary" id="k-tambah">' + ic('plus') + 'Tambah MK</button></div><div id="k-tbl"></div></div>' +
        '<div class="alert info mt-12">' + ic('info') + '<div>Kurikulum yang berlaku bagi suatu angkatan = tahun kurikulum terbaru yang ≤ tahun angkatan. Tandai MK <b>SEMINAR</b> dan <b>SKRIPSI</b> agar cek kelulusan berjalan.</div></div>' +
        (tahun.includes('') && typeof isiTahunKurikulum === 'function' ? '<div class="alert warn mt-12">' + ic('warn') + '<div><b>' + kur.filter((k) => !String(k.tahun_kurikulum ?? '').trim()).length + ' MK kurikulum ' + esc(f.prodi) + ' belum punya tahun kurikulum</b>, jadi belum berlaku untuk angkatan mana pun (tidak muncul di Peta Klaim, Rekap, maupun Unggah nilai).<div class="mt-8"><button class="btn btn-sm" id="k-isitahun">' + ic('edit', 'ic-sm') + 'Isi tahun kurikulum…</button></div></div></div>' : '');   // v1.3.1
      const t = Tabel($('#k-tbl', el), { id: (r) => r.id, urut: 'smt_sebaran', semua: true, tinggi: true, kolom: [
        { k: 'smt_sebaran', label: 'Smt', cls: 'center', val: (r) => Number(r.smt_sebaran) },
        { k: 'kode_mk', label: 'Kode', cls: 'mono nowrap' },
        { k: 'nama_mk', label: 'Mata kuliah', html: (r) => esc(r.nama_mk) + (r.jenis ? ' <span class="pill no-dot brand">' + esc(r.jenis) + '</span>' : '') },
        { k: 'sks', label: 'SKS', cls: 'num', val: (r) => Number(r.sks) },
        { k: 'aktif', label: 'Status', html: (r) => String(r.aktif) === '0' ? '<span class="pill">Nonaktif</span>' : '<span class="pill st-Aktif">Aktif</span>' },
        { k: 'x', label: '', sort: false, cls: 'aksi', html: () => '<button class="btn btn-xs btn-ghost" data-aksi="ubah">' + ic('edit', 'ic-sm') + '</button>' }
      ], cari: (r) => r.kode_mk + ' ' + r.nama_mk, aksi: (a, r) => formMk(r), klik: (r) => formMk(r), kosong: 'Belum ada MK', kosongDesc: 'Impor dari Excel Sebaran MK atau tambah satu per satu.' });
      const isi = () => { const rows = App.M.kurikulum.filter((k) => k.prodi === f.prodi && String(k.tahun_kurikulum) === String(f.tahun)); t.st.q = f.q; t.set(rows); $('#k-total', el).textContent = rows.filter((x) => String(x.aktif) !== '0').length + ' MK · ' + rows.filter((x) => String(x.aktif) !== '0').reduce((s, x) => s + Number(x.sks || 0), 0) + ' SKS'; };
      isi();
      $('#k-prodi', el).onchange = (e) => { f.prodi = e.target.value; f.tahun = ''; tabs(); };
      $('#k-tahun', el).onchange = (e) => { f.tahun = e.target.value; App.ingat('kur', f); isi(); };
      $('#k-q', el).oninput = debounce((e) => { f.q = e.target.value; t.cari(f.q); }, 150);
      $('#k-tambah', el).onclick = () => formMk({ prodi: f.prodi, tahun_kurikulum: f.tahun || String(App.periodeAktif).slice(0, 4), aktif: 1 });
      $('#k-impor', el).onclick = () => imporSebaran(f.prodi, f.tahun);
      if ($('#k-isitahun', el)) $('#k-isitahun', el).onclick = () => isiTahunKurikulum(f.prodi, '', (t) => { f.tahun = t; tabs(); });   // v1.3.1
      $('#k-tahun', el).addEventListener('change', tombolKepala);
      tombolKepala();
    };
    const hapusKurikulum = async (prodi, tahun) => {
      const c = await api('kurikulum.hapusCek', { prodi: prodi, tahun: tahun });
      if (!c.success) { toast(c.message, 'err'); return; }
      const d = c.data;
      const tetap = d.tetap.length ? '<div class="mt-12"><div class="lbl mb-4">' + d.tetap.length + ' MK tidak dihapus karena sudah dipakai</div><div class="tbl-wrap" style="max-height:220px"><table class="tbl tbl-compact"><tbody>' + d.tetap.map((x) => '<tr><td class="mono nowrap">' + esc(x.kode) + '</td><td>' + esc(x.nama) + '</td><td class="sub">' + esc(x.alasan) + '</td></tr>').join('') + '</tbody></table></div></div>' : '';
      if (!d.bisa) { modal({ judul: 'Kurikulum ' + tahun + ' tidak bisa dihapus', isi: '<div class="alert warn">' + ic('warn') + '<div>Semua MK di kurikulum ini sudah dipakai (dipetakan di Peta Klaim atau sudah dilapor).</div></div>' + tetap }); return; }
      const ok = await new Promise((resolve) => {
        let jadi = false;
        modal({ judul: 'Hapus kurikulum ' + prodi + ' ' + tahun, isi: '<div class="ringkas-batal"><div><b>' + d.bisa + '</b><span>MK akan dihapus</span></div><div><b>' + d.tetap.length + '</b><span>MK dipertahankan</span></div><div><b>' + d.total + '</b><span>MK di kurikulum ini</span></div></div>' + tetap +
          '<div class="alert info mt-12">' + ic('info') + '<div>Penghapusan tercatat di <b>Riwayat impor</b> dan masih bisa dibatalkan (MK dikembalikan dengan data yang sama).</div></div><div class="field mt-12"><label>Ketik <b>HAPUS</b> untuk melanjutkan</label><input class="input" id="hk-in" autocomplete="off"></div>',
          tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Hapus ' + d.bisa + ' MK', kelas: 'btn-danger', aksi: (close, m) => { if ($('#hk-in', m).value.trim() !== 'HAPUS') { toast('Ketik HAPUS untuk konfirmasi.', 'warn'); return false; } jadi = true; return true; } }],
          onTutup: () => resolve(jadi) });
      });
      if (!ok) return;
      const r = await api('kurikulum.hapus', { prodi: prodi, tahun: tahun, konfirmasi: 'HAPUS' });
      toast(r.message, r.success ? 'ok' : 'err', 6000);
      if (r.success) { await App.segarkanMaster(); f.tahun = ''; tabs(); }
    };
    const formMk = (r) => {
      const baru = !r.id;
      modal({ judul: baru ? 'Tambah MK kurikulum' : 'Ubah MK kurikulum', isi: '<div class="fgrid"><div class="field"><label>Prodi</label><select class="input" name="prodi">' + opsi(App.prodi().map((x) => x.kode), r.prodi) + '</select></div><div class="field"><label>Tahun kurikulum</label><input class="input" name="tahun_kurikulum" value="' + esc(r.tahun_kurikulum || '') + '" inputmode="numeric"></div><div class="field"><label class="req">Kode MK</label><input class="input mono" name="kode_mk" value="' + esc(r.kode_mk || '') + '"></div><div class="field"><label class="req">SKS</label><input class="input" type="number" min="0" max="12" name="sks" value="' + esc(r.sks || '') + '"></div><div class="field full"><label class="req">Nama MK</label><input class="input" name="nama_mk" value="' + esc(r.nama_mk || '') + '"></div><div class="field"><label>Semester sebaran</label><input class="input" type="number" min="1" max="14" name="smt_sebaran" value="' + esc(r.smt_sebaran || '') + '"></div><div class="field"><label>Jenis</label><select class="input" name="jenis">' + opsi([{ v: '', t: 'MK biasa' }, { v: 'SEMINAR', t: 'Seminar (syarat lulus)' }, { v: 'SKRIPSI', t: 'Skripsi (syarat lulus)' }], r.jenis || '') + '</select></div>' + (baru ? '' : '<div class="field full"><label class="check"><input type="checkbox" name="aktif" ' + (String(r.aktif) !== '0' ? 'checked' : '') + '>MK aktif</label></div>') + '</div>',
        tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan', kelas: 'btn-primary', aksi: async (close, m) => {
          const row = bacaForm(m); if (!baru) row.id = r.id; row.aktif = row.aktif === false ? 0 : 1;
          if (!/^\d{4}$/.test(String(row.tahun_kurikulum || '').trim())) { toast('Isi Tahun kurikulum (4 angka, mis. 2019).', 'warn'); return false; }   // v1.3.1
          const res = await api('master.simpan', { tabel: 'Kurikulum', row: row });
          if (!res.success) { toast(res.message, 'err'); return false; }
          await App.segarkanMaster(); toast('MK tersimpan.'); f.tahun = row.tahun_kurikulum; tabs(); return true;
        } }] });
    };
    const imporSebaran = (prodi, tahun) => {
      let rows = [];
      const md = modal({ judul: 'Impor Sebaran MK dari Excel', lebar: 'lebar', desc: 'Dibaca dari judul kolom: Semester, Kode MK, Mata Kuliah, SKS. Cocok untuk sheet "Home (2)" pada file PDDIKTI lama.',
        isi: '<div class="row mb-12"><div class="field"><label>Prodi</label><select class="input" id="is-prodi">' + opsi(App.prodi().map((x) => x.kode), prodi) + '</select></div><div class="field"><label>Tahun kurikulum</label><input class="input" id="is-tahun" value="' + esc(tahun || String(App.periodeAktif).slice(0, 4)) + '" style="width:120px"></div><div class="field" style="flex:1"><label>Sheet</label><select class="input" id="is-sheet" disabled><option>—</option></select></div></div><div class="drop" id="is-drop">' + ic('upload') + '<div><b>Pilih file .xlsx</b></div><input type="file" hidden id="is-file" accept=".xlsx,.xls"></div><div id="is-prev" class="mt-12"></div>',
        tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Impor', kelas: 'btn-primary', aksi: async (close, m) => {
          if (!rows.length) { toast('Belum ada baris terbaca.', 'warn'); return false; }
          if (!/^\d{4}$/.test($('#is-tahun', m).value.trim())) { toast('Isi Tahun kurikulum (4 angka, mis. 2019) — tanpa tahun, kurikulum tidak berlaku untuk angkatan mana pun.', 'warn', 6000); return false; }   // v1.3.1
          const isi = rows.map((x) => Object.assign({ prodi: $('#is-prodi', m).value, tahun_kurikulum: $('#is-tahun', m).value.trim() }, x));
          const res = await api('master.impor', { tabel: 'Kurikulum', rows: isi, file: namaFile });
          if (!res.success) { toast(res.message, 'err'); return false; }
          await App.segarkanMaster(); toast(res.data.ditambah + ' MK ditambah, ' + res.data.diperbarui + ' diperbarui.' + (res.data.batch ? ' Salah file? Batalkan lewat "Riwayat impor".' : ''), 'ok', res.data.batch ? 6000 : undefined); f.prodi = $('#is-prodi', m).value; f.tahun = $('#is-tahun', m).value.trim(); tabs(); return true;
        } }] });
      let wb = null;
      const baca = async () => {
        const a = await Excel.baris(wb, $('#is-sheet', md.el).value);
        const hi = Excel.cariHeader(a, [/kode/, /mata kuliah|nama mk/, /^sks$|s k s/, /semester|^smt$/]);
        if (hi < 0) { $('#is-prev', md.el).innerHTML = '<div class="alert warn">' + ic('warn') + '<div>Judul kolom Kode/Mata kuliah/SKS tidak ditemukan di sheet ini. Pilih sheet lain.</div></div>'; rows = []; return; }
        const h = a[hi].map(normNama), h2 = (a[hi + 1] || []).map(normNama);
        const col = (re) => { let i = h.findIndex((x) => re.test(x)); if (i < 0) i = h2.findIndex((x) => re.test(x)); return i; };
        const c = { smt: col(/semester|^smt$/), kode: col(/kode/), nama: col(/mata kuliah|nama mk/), sks: col(/^sks$|s k s/) };
        let smtTerakhir = '';
        rows = a.slice(hi + 1).filter((r) => String(r[c.kode] || '').trim() && String(r[c.nama] || '').trim() && !isNaN(Number(r[c.sks]))).map((r) => {
          if (c.smt > -1 && String(r[c.smt]).trim()) smtTerakhir = String(r[c.smt]).replace(/\D/g, '');
          const nm = String(r[c.nama]).trim();
          return { kode_mk: String(r[c.kode]).trim(), nama_mk: nm, sks: Number(r[c.sks]), smt_sebaran: smtTerakhir, jenis: /seminar/i.test(nm) ? 'SEMINAR' : /skripsi/i.test(nm) ? 'SKRIPSI' : '' };
        });
        $('#is-prev', md.el).innerHTML = '<div class="row mb-8"><b>' + rows.length + ' MK</b><span class="muted">· ' + rows.reduce((s, x) => s + x.sks, 0) + ' SKS · ' + rows.filter((x) => x.jenis).length + ' ditandai seminar/skripsi</span></div><div class="tbl-wrap" style="max-height:300px"><table class="tbl tbl-compact"><thead><tr><th>Smt</th><th>Kode</th><th>Mata kuliah</th><th class="num">SKS</th><th>Jenis</th></tr></thead><tbody>' + rows.map((x) => '<tr><td class="center">' + esc(x.smt_sebaran) + '</td><td class="mono">' + esc(x.kode_mk) + '</td><td>' + esc(x.nama_mk) + '</td><td class="num">' + x.sks + '</td><td>' + esc(x.jenis) + '</td></tr>').join('') + '</tbody></table></div>';
      };
      let namaFile = '';
      pasangDrop($('#is-drop', md.el), $('#is-file', md.el), async (file) => {
        wb = await Excel.baca(file); namaFile = file.name;
        const s = $('#is-sheet', md.el);
        s.innerHTML = opsi(wb.SheetNames, wb.SheetNames.find((n) => /home \(2\)|sebaran/i.test(n)) || wb.SheetNames[0]); s.disabled = false;
        s.onchange = baca; await baca();
      });
    };
    const tabRiil = () => {
      $('#k-isi', el).innerHTML = '<div class="card"><div class="toolbar"><select class="input" id="r-prodi">' + opsi(App.prodi().map((x) => ({ v: x.kode, t: x.kode + ' — ' + x.nama })), f.prodi) + '</select><select class="input" id="r-prog">' + opsi(Object.keys(PROGRAM_LABEL).map((k) => ({ v: k, t: PROGRAM_LABEL[k] })), f.prog, null, 'Semua program') + '</select><div class="search" style="width:220px">' + ic('search') + '<input class="input" id="r-q" placeholder="Cari nama MK…"></div><span class="spacer"></span><button class="btn btn-sm" id="r-impor">' + ic('upload') + 'Impor Excel</button><button class="btn btn-sm btn-primary" id="r-tambah">' + ic('plus') + 'Tambah MK riil</button></div><div id="r-tbl"></div></div>' +
        '<div class="muted mt-8" id="r-cermin" style="font-size:12.5px"></div><div class="alert info mt-12">' + ic('info') + '<div>Kelas otomatis dibuat dari MK riil yang <b>semester ajar</b>-nya cocok dengan semester angkatan dan programnya cocok dengan program mahasiswa. MK Ma\'had Aly cukup diberi program "Ma\'had Aly".</div></div>';
      const t = Tabel($('#r-tbl', el), { id: (r) => r.id, urut: 'smt_ajar', semua: true, tinggi: true, kolom: [
        { k: 'smt_ajar', label: 'Smt ajar', cls: 'center', val: (r) => Number(r.smt_ajar) },
        { k: 'nama_mk', label: 'Nama MK riil' },
        { k: 'sks', label: 'SKS', cls: 'num', val: (r) => Number(r.sks) },
        { k: 'program', label: 'Program', html: (r) => String(r.program || '').split(',').filter(Boolean).map((p) => '<span class="chip">' + esc(PROGRAM_LABEL[p] || p) + '</span>').join(' ') },
        { k: 'catatan', label: 'Catatan', html: (r) => '<span class="sub">' + esc(r.catatan || '') + '</span>' },
        { k: 'aktif', label: 'Status', html: (r) => String(r.aktif) === '0' ? '<span class="pill">Nonaktif</span>' : '<span class="pill st-Aktif">Aktif</span>' }
      ], cari: (r) => r.nama_mk, klik: (r) => formRiil(r), kosong: 'Belum ada MK riil', kosongDesc: 'Tambahkan MK yang benar-benar diajarkan.' });
      const isi = () => {
        const cermin = App.M.mkriil.filter((m) => m.prodi === f.prodi && /^pd-/.test(m.id)).length;   // v1.1: MK cermin kelas PDDIKTI disembunyikan
        $('#r-cermin', el).textContent = cermin ? cermin + ' MK cermin dari fitur "Kelas PDDIKTI" (tanpa MK riil) disembunyikan dari daftar ini.' : '';
        t.set(App.M.mkriil.filter((m) => m.prodi === f.prodi && !/^pd-/.test(m.id) && (!f.prog || String(m.program).split(',').includes(f.prog))));
      };
      isi();
      $('#r-prodi', el).onchange = (e) => { f.prodi = e.target.value; App.ingat('kur', f); isi(); };
      $('#r-prog', el).onchange = (e) => { f.prog = e.target.value; App.ingat('kur', f); isi(); };
      $('#r-q', el).oninput = debounce((e) => t.cari(e.target.value), 150);
      $('#r-tambah', el).onclick = () => formRiil({ prodi: f.prodi, program: 'REG,HYB', aktif: 1 });
      $('#r-impor', el).onclick = () => imporRiil();
    };
    const formRiil = (r) => {
      const baru = !r.id, prog = String(r.program || '').split(',');
      modal({ judul: baru ? 'Tambah MK riil' : 'Ubah MK riil', isi: '<div class="fgrid"><div class="field"><label>Prodi</label><select class="input" name="prodi">' + opsi(App.prodi().map((x) => x.kode), r.prodi) + '</select></div><div class="field"><label>Semester ajar</label><input class="input" type="number" min="1" max="14" name="smt_ajar" value="' + esc(r.smt_ajar || '') + '"></div><div class="field full"><label class="req">Nama MK riil</label><input class="input" name="nama_mk" value="' + esc(r.nama_mk || '') + '"></div><div class="field"><label>SKS</label><input class="input" type="number" min="0" max="12" name="sks" value="' + esc(r.sks || '') + '"></div><div class="field"><label>Program</label><div class="row-wrap" style="min-height:36px">' + Object.keys(PROGRAM_LABEL).map((k) => '<label class="check"><input type="checkbox" data-prog="' + k + '" ' + (prog.includes(k) ? 'checked' : '') + '>' + PROGRAM_LABEL[k] + '</label>').join('') + '</div></div><div class="field full"><label>Catatan</label><input class="input" name="catatan" value="' + esc(r.catatan || '') + '"></div>' + (baru ? '' : '<div class="field full"><label class="check"><input type="checkbox" name="aktif" ' + (String(r.aktif) !== '0' ? 'checked' : '') + '>MK aktif</label></div>') + '</div>',
        tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Simpan', kelas: 'btn-primary', aksi: async (close, m) => {
          const row = bacaForm(m); row.program = $$('[data-prog]', m).filter((c) => c.checked).map((c) => c.dataset.prog).join(',');
          if (!row.program) { toast('Pilih minimal satu program.', 'warn'); return false; }
          if (!baru) row.id = r.id; row.aktif = row.aktif === false ? 0 : 1;
          const res = await api('master.simpan', { tabel: 'MK_Riil', row: row });
          if (!res.success) { toast(res.message, 'err'); return false; }
          await App.segarkanMaster(); toast('MK riil tersimpan.'); tabs(); return true;
        } }] });
    };
    const imporRiil = () => {
      let rows = [];
      const md = modal({ judul: 'Impor MK riil dari Excel', lebar: 'lebar', desc: 'Kolom: Nama MK, SKS, Semester, Program (Reguler/Hybrid/Ma\'had Aly, boleh dipisah koma).',
        isi: '<div class="row mb-12"><div class="field"><label>Prodi</label><select class="input" id="ir-prodi">' + opsi(App.prodi().map((x) => x.kode), f.prodi) + '</select></div><span class="spacer"></span><button class="btn btn-sm btn-ghost" id="ir-templat">' + ic('download') + 'Unduh templat</button></div><div class="drop" id="ir-drop">' + ic('upload') + '<div><b>Pilih file .xlsx</b></div><input type="file" hidden id="ir-file" accept=".xlsx,.xls"></div><div id="ir-prev" class="mt-12"></div>',
        tombol: [{ teks: 'Batal', aksi: () => true }, { teks: 'Impor', kelas: 'btn-primary', aksi: async (close, m) => {
          if (!rows.length) { toast('Belum ada data.', 'warn'); return false; }
          const res = await api('master.impor', { tabel: 'MK_Riil', rows: rows.map((x) => Object.assign({ prodi: $('#ir-prodi', m).value }, x)) });
          if (!res.success) { toast(res.message, 'err'); return false; }
          await App.segarkanMaster(); toast(res.data.ditambah + ' ditambah, ' + res.data.diperbarui + ' diperbarui.' + (res.data.batch ? ' Salah file? Batalkan lewat "Riwayat impor".' : ''), 'ok', res.data.batch ? 6000 : undefined); tabs(); return true;
        } }] });
      $('#ir-templat', md.el).onclick = () => Excel.tulisSederhana('Templat-MK-Riil.xlsx', ['Nama MK', 'SKS', 'Semester', 'Program', 'Catatan'], [['Nahwu I', 2, 1, "Ma'had Aly", ''], ['Fiqh Muamalah', 3, 3, 'Reguler, Hybrid', '']]);
      pasangDrop($('#ir-drop', md.el), $('#ir-file', md.el), async (file) => {
        const a = await Excel.baris(await Excel.baca(file));
        const hi = Excel.cariHeader(a, [/nama/, /^sks$/, /semester|^smt/, /program/]);
        if (hi < 0) throw new Error('Judul kolom Nama MK/SKS tidak ditemukan');
        const h = a[hi].map(normNama), col = (re) => h.findIndex((x) => re.test(x));
        const c = { nama: col(/nama/), sks: col(/^sks$/), smt: col(/semester|^smt/), prog: col(/program/), cat: col(/catatan|keterangan/) };
        const kp = (v) => { const s = normNama(v); const o = []; if (/reg/.test(s)) o.push('REG'); if (/hyb|hibrid/.test(s)) o.push('HYB'); if (/mahad|ma had|aly|\bma\b/.test(s)) o.push('MA'); return (o.length ? o : ['REG', 'HYB']).join(','); };
        rows = a.slice(hi + 1).filter((r) => String(r[c.nama] || '').trim()).map((r) => ({ nama_mk: String(r[c.nama]).trim(), sks: Number(r[c.sks]) || '', smt_ajar: c.smt > -1 ? Number(r[c.smt]) || '' : '', program: c.prog > -1 ? kp(r[c.prog]) : 'REG,HYB', catatan: c.cat > -1 ? String(r[c.cat] || '') : '' }));
        $('#ir-prev', md.el).innerHTML = '<div class="tbl-wrap" style="max-height:300px"><table class="tbl tbl-compact"><thead><tr><th>Nama MK</th><th class="num">SKS</th><th>Smt</th><th>Program</th></tr></thead><tbody>' + rows.map((x) => '<tr><td>' + esc(x.nama_mk) + '</td><td class="num">' + esc(x.sks) + '</td><td>' + esc(x.smt_ajar) + '</td><td>' + esc(progLabel(x.program)) + '</td></tr>').join('') + '</tbody></table></div>';
      });
    };
    tabs();
  }
};
