/* ==========================================================================
   NILAI – AL WAFA · core.js
   API (fetch → GAS /exec) · SWR cache sessionStorage · Batcher · Router SPA
   UI kit: toast, modal, konfirmasi ketik, tabel, skeleton, cetak A4, lazy-lib
   ========================================================================== */
'use strict';
const APP_VER = '1.0.0';
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = (v) => String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ((window.ICONS || {})[n] || '') + '</svg>';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const debounce = (fn, ms) => { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; };

/* ---------------------------------------------------------------- format (koma desimal) */
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const fmt2 = (n) => (n === null || n === undefined || n === '' || isNaN(Number(n))) ? '' : Number(n).toFixed(2).replace('.', ',');
const fmt1 = (n) => (n === null || n === undefined || n === '') ? '' : Number(n).toFixed(1).replace('.', ',');
const fmtInt = (n) => (n === null || n === undefined || n === '') ? '' : Number(n).toLocaleString('id-ID');
const fmtTgl = (v, pendek) => {
  if (!v) return '';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(v);
  const b = BULAN[Number(m[2]) - 1] || '';
  return Number(m[3]) + ' ' + (pendek ? b.slice(0, 3) : b) + ' ' + m[1];
};
const fmtWaktu = (v) => { if (!v) return ''; const s = String(v); return fmtTgl(s, true) + (s.length > 10 ? ' ' + s.slice(11, 16) : ''); };
const labelPeriode = (p) => { p = String(p || ''); if (!/^\d{5}$/.test(p)) return p; return (p.slice(-1) === '1' ? 'Ganjil ' : 'Genap ') + p.slice(0, 4) + '/' + (Number(p.slice(0, 4)) + 1); };
const smtDari = (angk, periode) => { const p = String(periode); return (Number(p.slice(0, 4)) - Number(angk)) * 2 + Number(p.slice(-1)); };
const normNama = (s) => String(s || '').toLowerCase().replace(/[`'’‘"]/g, '').replace(/[^a-z0-9؀-ۿ]+/g, ' ').replace(/\s+/g, ' ').trim();
const parseAngka = (v) => { if (v === null || v === undefined) return null; const s = String(v).trim().replace(/\s/g, ''); if (s === '') return null; const n = Number(s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isNaN(n) ? NaN : n; };
const STATUS_LABEL = { SD: 'Sudah dilapor', SX: 'Ada selisih', SL: 'Siap lapor', MN: 'Menunggu nilai', BP: 'Belum dipetakan', TB: 'Tidak berlaku' };
const pillStatus = (s, teks) => '<span class="pill s-' + esc(s) + '">' + esc(teks || STATUS_LABEL[s] || s) + '</span>';
const pillMhs = (s) => '<span class="pill st-' + esc(String(s || 'Aktif').split(' ')[0]) + '">' + esc(s || 'Aktif') + '</span>';
const kelasTag = (k) => k ? '<span class="kelas-tag ' + esc(k) + '">' + esc(k) + '</span>' : '<span class="soft">–</span>';
const PROGRAM_LABEL = { REG: 'Reguler', HYB: 'Hybrid', MA: "Ma'had Aly" };
const progLabel = (p) => String(p || '').split(',').map((x) => PROGRAM_LABEL[x] || x).join(' + ');

/* ---------------------------------------------------------------- sesi (sessionStorage, 8 jam) */
const Sesi = {
  KEY: 'nw_sesi',
  get() { try { const s = JSON.parse(sessionStorage.getItem(this.KEY) || 'null'); return s && s.exp > Date.now() ? s : null; } catch (e) { return null; } },
  set(s) { sessionStorage.setItem(this.KEY, JSON.stringify(s)); },
  token() { const s = this.get(); return s ? s.token : ''; },
  clear() { sessionStorage.removeItem(this.KEY); Store.reset(); }
};

/* ---------------------------------------------------------------- API */
const CONF = window.APP_CONFIG || {};
const GAS_URL = String(CONF.GAS_URL || '');
const KONFIG_OK = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(GAS_URL) && !/GANTI|XXXX/.test(GAS_URL);
const READ = new Set(['ping', 'boot', 'auth.me', 'master.get', 'pengaturan.get', 'log.list', 'mhs.list', 'mhs.detail', 'mhs.cekPindah', 'kelas.list', 'nilai.get',
  'klaim.get', 'lapor.kelas', 'lapor.detail', 'mahad.rekap', 'lulus.list', 'lulus.get', 'cetak.khs', 'cetak.transkrip', 'dasbor.ringkasan', 'dasbor.matriks',
  'dasbor.sebaran', 'batch.list', 'doc.templateList', 'doc.pejabatList', 'doc.list', 'doc.antrean']);
const Net = {
  n: 0,
  bar() { return $('#netbar'); },
  on() { this.n++; const b = this.bar(); if (b) { b.className = 'net-bar'; void b.offsetWidth; b.className = 'net-bar on'; } },
  off() { this.n = Math.max(0, this.n - 1); const b = this.bar(); if (b && !this.n) b.className = 'net-bar done'; }
};
const Perf = {
  log: [],
  add(a, total, server, cached) { this.log.push({ aksi: a, total: total, server: server, net: total - (server || 0), cache: cached ? '✓' : '' }); if (this.log.length > 200) this.log.shift(); },
  table() { console.table(this.log.slice(-40)); },
  summary() { const g = {}; this.log.forEach((x) => { const s = g[x.aksi] = g[x.aksi] || { n: 0, total: 0, server: 0 }; s.n++; s.total += x.total; s.server += x.server || 0; }); console.table(Object.keys(g).map((k) => ({ aksi: k, n: g[k].n, rata_total: Math.round(g[k].total / g[k].n), rata_server: Math.round(g[k].server / g[k].n) }))); }
};
window.Perf = Perf;
let _gantiSandiTampil = false;
async function apiRaw(action, data, opt) {
  opt = opt || {};
  if (!KONFIG_OK) return { success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL /exec Apps Script.' };
  const t0 = performance.now();
  if (!opt.diam) Net.on();
  try {
    const res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, token: opt.token !== undefined ? opt.token : Sesi.token(), data: data || {} }), redirect: 'follow' });
    const j = await res.json();
    Perf.add(action, Math.round(performance.now() - t0), j.ms, j.cached);
    if (!j.success && j.code === 'AUTH' && action !== 'auth.login') { App.keluarPaksa('Sesi Anda berakhir. Silakan masuk lagi.'); }
    if (!j.success && j.code === 'GANTI_SANDI' && !_gantiSandiTampil) { App.gantiSandi(true); }
    return j;
  } catch (e) {
    return { success: false, message: navigator.onLine ? 'Tidak dapat menghubungi server. Coba lagi beberapa saat.' : 'Perangkat sedang offline.' , net: true };
  } finally { if (!opt.diam) Net.off(); }
}
// Aksi non-baca yang tidak mengubah data (tidak perlu membuat cache basi)
const TANPA_EPOCH = new Set(['auth.logout', 'auth.tema', 'sinkron.baca', 'sinkron.pindai', 'migrasi.pratinjau', 'doc.pratinjau', 'doc.unduh', 'kelas.generate:preview']);
/** Panggil aksi. Aksi tulis menaikkan epoch → semua data tersimpan dianggap basi (diambil ulang di latar). */
async function api(action, data, opt) {
  if (!READ.has(action) && !TANPA_EPOCH.has(action) && !(action === 'kelas.generate' && data && data.preview) && !(data && data.dryRun)) {
    const r = await apiRaw(action, data, opt);
    if (r.success && !(opt && opt.tanpaEpoch)) Store.basi();
    return r;
  }
  return apiRaw(action, data, opt);
}

/* ---------------------------------------------------------------- Batcher: aksi baca dalam 1 tik → 1 eksekusi */
const Batcher = {
  q: null,
  add(action, data) {
    return new Promise((resolve) => {
      if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); }
      this.q.push({ action: action, data: data || {}, resolve: resolve });
    });
  },
  async flush() {
    const q = this.q; this.q = null;
    const uniq = []; const map = {};
    q.forEach((x) => { const k = x.action + '|' + JSON.stringify(x.data); if (!map[k]) { map[k] = []; uniq.push(x); } map[k].push(x.resolve); });
    for (let i = 0; i < uniq.length; i += 12) {
      const part = uniq.slice(i, i + 12);
      if (part.length === 1) { const r = await apiRaw(part[0].action, part[0].data); map[part[0].action + '|' + JSON.stringify(part[0].data)].forEach((f) => f(r)); continue; }
      apiRaw('batch', { calls: part.map((x) => ({ action: x.action, data: x.data })) }).then((r) => {
        part.forEach((x, j) => {
          const res = r.success ? r.data[j] : r;
          map[x.action + '|' + JSON.stringify(x.data)].forEach((f) => f(res));
        });
      });
    }
  }
};

/* ---------------------------------------------------------------- Store (stale-while-revalidate) */
const Store = {
  KEY: 'nw_swr', m: {}, epoch: 0, inflight: {}, simpanT: null,
  init() { try { const s = JSON.parse(sessionStorage.getItem(this.KEY) || '{}'); this.m = s.m || {}; this.epoch = s.e || 0; } catch (e) { this.m = {}; } },
  kunci(a, d) { return a + '|' + JSON.stringify(d || {}); },
  peek(a, d) { const x = this.m[this.kunci(a, d)]; return x ? x.d : undefined; },
  segar(a, d, maxAge) { const x = this.m[this.kunci(a, d)]; return !!x && x.e === this.epoch && Date.now() - x.t < (maxAge || 60000); },
  put(a, d, data) { this.m[this.kunci(a, d)] = { t: Date.now(), e: this.epoch, d: data, h: hashStr(JSON.stringify(data)) }; this.persist(); },
  basi() { this.epoch++; this.inflight = {}; this.persist(); },
  reset() { this.m = {}; this.epoch = 0; this.inflight = {}; try { sessionStorage.removeItem(this.KEY); } catch (e) { /* abaikan */ } },
  persist() {
    clearTimeout(this.simpanT);
    this.simpanT = setTimeout(() => {
      const tulis = () => sessionStorage.setItem(this.KEY, JSON.stringify({ e: this.epoch, m: this.m }));
      try { tulis(); } catch (e) {
        const ks = Object.keys(this.m).sort((a, b) => this.m[a].t - this.m[b].t);
        for (let i = 0; i < ks.length / 2; i++) delete this.m[ks[i]];
        try { tulis(); } catch (e2) { /* penuh — abaikan, cache hanya di memori */ }
      }
    }, 250);
  },
  /** Ambil data: kembalikan dari server (dedupe permintaan identik, lewat Batcher). */
  async ambil(a, d, opt) {
    const k = this.epoch + '|' + this.kunci(a, d);
    if (this.inflight[k]) return this.inflight[k];
    const p = (opt && opt.langsung ? apiRaw(a, d) : Batcher.add(a, d)).then((r) => {
      delete this.inflight[k];
      if (r && r.success) this.put(a, d, r.data);
      return r;
    });
    this.inflight[k] = p;
    return p;
  },
  async get(a, d, maxAge) {
    if (this.segar(a, d, maxAge)) return { success: true, data: this.peek(a, d), cached: true };
    return this.ambil(a, d);
  }
};
function hashStr(s) { let h = 5381; for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h; }

/**
 * Pakai data di halaman: render segera dari cache (bila ada), lalu ambil ulang di latar bila basi.
 * cb(data, {dariCache}) dipanggil 1–2 kali; dihentikan otomatis bila halaman sudah berganti.
 */
function pakai(ctx, a, d, cb, opt) {
  opt = opt || {};
  const ada = Store.peek(a, d);
  if (ada !== undefined) cb(ada, { dariCache: true });
  if (ada !== undefined && Store.segar(a, d, opt.maxAge)) return Promise.resolve(ada);
  const hLama = ada !== undefined ? (Store.m[Store.kunci(a, d)] || {}).h : null;
  return Store.ambil(a, d).then((r) => {
    if (!ctx.alive) return;
    if (!r.success) { if (ada === undefined) { if (opt.gagal) opt.gagal(r); else toast(r.message, 'err'); } return; }
    const hBaru = (Store.m[Store.kunci(a, d)] || {}).h;
    if (ada === undefined || hBaru !== hLama) cb(r.data, { dariCache: false });
    return r.data;
  });
}
/** Prefetch diam-diam (hover menu / idle). */
function prefetch(a, d, maxAge) { if (!Store.segar(a, d, maxAge)) Store.ambil(a, d); }
const idle = window.requestIdleCallback || ((f) => setTimeout(f, 300));

/* ---------------------------------------------------------------- UI kit */
function toast(msg, jenis, ms) {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; document.body.appendChild(box); }
  const ikon = { ok: 'checkc', err: 'xc', warn: 'warn', info: 'info' }[jenis || 'ok'] || 'info';
  const el = document.createElement('div');
  el.className = 'toast ' + (jenis || 'ok');
  el.innerHTML = ic(ikon) + '<div>' + esc(msg) + '</div>';
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, ms || (jenis === 'err' ? 6000 : 3200));
}
/** Modal: {judul, desc, isi (html), tombol:[{teks, kelas, aksi(close, el) → bool|Promise}], lebar, onBuka(el, close)} */
function modal(o) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = '<div class="modal ' + (o.lebar || '') + '" role="dialog" aria-modal="true"><div class="modal-h"><div style="flex:1"><h3>' + esc(o.judul || '') + '</h3>' + (o.desc ? '<div class="desc">' + o.desc + '</div>' : '') + '</div><button class="btn btn-ghost btn-sm btn-icon" data-tutup aria-label="Tutup">' + ic('x') + '</button></div><div class="modal-b">' + (o.isi || '') + '</div>' + (o.tombol === false ? '' : '<div class="modal-f"></div>') + '</div>';
  document.body.appendChild(bg);
  const el = $('.modal', bg);
  let selesai = false;
  const close = (v) => { if (selesai) return; selesai = true; bg.remove(); document.removeEventListener('keydown', onKey); if (o.onTutup) o.onTutup(v); };
  const onKey = (e) => { if (e.key === 'Escape' && !o.wajib) close(); };
  document.addEventListener('keydown', onKey);
  if (!o.wajib) { $('[data-tutup]', bg).onclick = () => close(); bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); }); }
  else $('[data-tutup]', bg).remove();
  const f = $('.modal-f', bg);
  (o.tombol || [{ teks: 'Tutup', aksi: () => true }]).forEach((t) => {
    if (o.tombol === false) return;
    const b = document.createElement('button');
    b.className = 'btn ' + (t.kelas || '');
    b.innerHTML = (t.ikon ? ic(t.ikon) : '') + esc(t.teks);
    if (t.kiri) { b.style.marginRight = 'auto'; }
    b.onclick = async () => {
      if (!t.aksi) return close();
      b.classList.add('loading');
      try { const r = await t.aksi(close, el); if (r === true) close(r); } finally { b.classList.remove('loading'); }
    };
    f.appendChild(b);
  });
  if (o.onBuka) o.onBuka(el, close);
  const first = $('input:not([type=hidden]):not([readonly]), select, textarea', el);
  if (first && !o.tanpaFokus) setTimeout(() => first.focus(), 30);
  return { el: el, close: close };
}
/** Konfirmasi dengan mengetik ulang kata (tindakan permanen). */
function konfirmasiKetik(o) {
  return new Promise((resolve) => {
    modal({
      judul: o.judul, isi: '<div class="alert warn mb-12">' + ic('warn') + '<div>' + o.pesan + '</div></div><div class="field"><label>Ketik <b>' + esc(o.kata) + '</b> untuk melanjutkan</label><input class="input" id="kk-in" autocomplete="off"></div>',
      tombol: [{ teks: 'Batal', aksi: () => true }, { teks: o.tombolTeks || 'Lanjutkan', kelas: o.bahaya ? 'btn-danger' : 'btn-primary', aksi: (close, el) => { const v = $('#kk-in', el).value.trim(); if (v !== o.kata) { toast('Ketikan belum sesuai.', 'warn'); return false; } resolve(v); close(); } }],
      onTutup: () => resolve(null)
    });
  });
}
function konfirmasi(judul, pesan, teksYa, bahaya) {
  return new Promise((resolve) => {
    let ok = false;
    modal({ judul: judul, isi: '<p>' + pesan + '</p>', tombol: [{ teks: 'Batal', aksi: () => true }, { teks: teksYa || 'Ya', kelas: bahaya ? 'btn-danger' : 'btn-primary', aksi: () => { ok = true; return true; } }], onTutup: () => resolve(ok) });
  });
}
const skelKpi = (n) => '<div class="grid g6">' + Array(n || 6).fill('<div class="skel skel-kpi"></div>').join('') + '</div>';
const skelTabel = (n) => '<div style="padding:10px 14px">' + Array(n || 8).fill('<div class="skel skel-row"></div>').join('') + '</div>';
const kosong = (judul, desc, ikon) => '<div class="empty">' + ic(ikon || 'archive') + '<h4>' + esc(judul) + '</h4><div>' + (desc || '') + '</div></div>';
async function tombolProses(btn, fn) { btn.classList.add('loading'); try { return await fn(); } finally { btn.classList.remove('loading'); } }
function opsi(list, nilai, label, kosongTeks) {
  return (kosongTeks !== undefined ? '<option value="">' + esc(kosongTeks) + '</option>' : '') + list.map((x) => { const v = typeof x === 'object' ? x.v : x, t = typeof x === 'object' ? x.t : (label ? label(x) : x); return '<option value="' + esc(v) + '"' + (String(v) === String(nilai) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
}
function bacaForm(el) { const o = {}; $$('[name]', el).forEach((i) => { o[i.name] = i.type === 'checkbox' ? i.checked : i.value; }); return o; }
function unduhBlob(blob, nama) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
function base64KeBlob(b64, mime) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); }
function salin(teks) { navigator.clipboard.writeText(teks).then(() => toast('Disalin.', 'ok'), () => toast('Gagal menyalin.', 'err')); }

/* ---------------------------------------------------------------- Tabel (cari, urut, halaman, pilih) */
function Tabel(host, o) {
  const st = { rows: [], q: '', sort: o.urut || null, dir: o.arah || 1, hal: 1, per: o.perHalaman || 25, pilih: new Set(), filter: null };
  const idOf = o.id || ((r) => r.id);
  host.innerHTML = '<div class="tbl-wrap ' + (o.tinggi ? 'tall' : '') + '"><table class="tbl ' + (o.ringkas ? 'tbl-compact' : '') + '"><thead></thead><tbody></tbody></table></div><div class="tbl-foot"></div>';
  const thead = $('thead', host), tbody = $('tbody', host), foot = $('.tbl-foot', host);
  const kol = o.kolom;
  function hasil() {
    let r = st.rows;
    if (st.filter) r = r.filter(st.filter);
    if (st.q) { const q = normNama(st.q); r = r.filter((x) => normNama((o.cari ? o.cari(x) : Object.values(x).join(' '))).indexOf(q) > -1); }
    if (st.sort) {
      const c = kol.find((k) => k.k === st.sort), val = c && c.val ? c.val : (x) => x[st.sort];
      r = r.slice().sort((a, b) => { const va = val(a), vb = val(b); if (va === vb) return 0; if (va === null || va === undefined || va === '') return 1; if (vb === null || vb === undefined || vb === '') return -1; return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'id', { numeric: true })) * st.dir; });
    }
    return r;
  }
  function render() {
    const semuaDipilih = o.pilih && st.rows.length > 0 && hasil().every((x) => st.pilih.has(String(idOf(x))));
    thead.innerHTML = '<tr>' + (o.pilih ? '<th style="width:34px"><input type="checkbox" class="chk-all"' + (semuaDipilih ? ' checked' : '') + '></th>' : '') + kol.map((k) => '<th class="' + (k.sort !== false ? 'sortable ' : '') + (k.cls || '') + '" data-k="' + esc(k.k) + '" style="' + (k.w ? 'width:' + k.w : '') + '">' + esc(k.label) + (st.sort === k.k ? (st.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr>';
    const r = hasil(), tot = r.length, maxHal = Math.max(1, Math.ceil(tot / st.per));
    if (st.hal > maxHal) st.hal = maxHal;
    const tampil = o.semua ? r : r.slice((st.hal - 1) * st.per, st.hal * st.per);
    tbody.innerHTML = tampil.length ? tampil.map((x) => {
      const id = idOf(x);
      return '<tr data-id="' + esc(id) + '" class="' + (o.klik ? 'klik ' : '') + (st.pilih.has(String(id)) ? 'sel ' : '') + (o.kelasBaris ? o.kelasBaris(x) : '') + '">' + (o.pilih ? '<td><input type="checkbox" class="chk" ' + (st.pilih.has(String(id)) ? 'checked' : '') + '></td>' : '') + kol.map((k) => '<td class="' + (k.cls || '') + '">' + (k.html ? k.html(x) : esc(x[k.k])) + '</td>').join('') + '</tr>';
    }).join('') : '<tr><td colspan="' + (kol.length + (o.pilih ? 1 : 0)) + '">' + kosong(o.kosong || 'Tidak ada data', o.kosongDesc || (st.q ? 'Coba kata kunci lain.' : ''), 'search') + '</td></tr>';
    if (o.semua) { foot.innerHTML = '<span>' + fmtInt(tot) + ' baris' + (o.pilih ? ' · ' + st.pilih.size + ' dipilih' : '') + '</span>' + (o.kaki ? '<span class="spacer"></span>' + o.kaki(r) : ''); return; }
    const pages = [];
    for (let i = 1; i <= maxHal; i++) if (i === 1 || i === maxHal || Math.abs(i - st.hal) <= 1) pages.push(i); else if (pages[pages.length - 1] !== '…') pages.push('…');
    foot.innerHTML = '<span>' + (tot ? ((st.hal - 1) * st.per + 1) + '–' + Math.min(tot, st.hal * st.per) + ' dari ' + fmtInt(tot) : '0 data') + (o.pilih ? ' · <b>' + st.pilih.size + '</b> dipilih' : '') + '</span><span class="spacer"></span>' + (o.kaki ? o.kaki(r) : '') +
      '<select class="input input-sm per" style="width:auto">' + [10, 25, 50, 100, 250].map((n) => '<option ' + (n === st.per ? 'selected' : '') + '>' + n + '</option>').join('') + '</select><div class="pager"><button data-p="prev" ' + (st.hal <= 1 ? 'disabled' : '') + '>‹</button>' + pages.map((p) => p === '…' ? '<button disabled>…</button>' : '<button data-p="' + p + '" class="' + (p === st.hal ? 'on' : '') + '">' + p + '</button>').join('') + '<button data-p="next" ' + (st.hal >= maxHal ? 'disabled' : '') + '>›</button></div>';
  }
  thead.addEventListener('click', (e) => {
    if (e.target.classList.contains('chk-all')) { const r = hasil(); if (e.target.checked) r.forEach((x) => st.pilih.add(String(idOf(x)))); else st.pilih.clear(); render(); if (o.onPilih) o.onPilih(api_.dipilih()); return; }
    const th = e.target.closest('th.sortable'); if (!th) return;
    const k = th.dataset.k; if (st.sort === k) st.dir = -st.dir; else { st.sort = k; st.dir = 1; } render();
  });
  tbody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    const id = tr.dataset.id, row = st.rows.find((x) => String(idOf(x)) === id);
    if (e.target.classList.contains('chk')) { if (e.target.checked) st.pilih.add(id); else st.pilih.delete(id); tr.classList.toggle('sel', e.target.checked); render(); if (o.onPilih) o.onPilih(api_.dipilih()); return; }
    if (e.target.closest('[data-aksi]')) { const b = e.target.closest('[data-aksi]'); if (o.aksi) o.aksi(b.dataset.aksi, row, b, e); return; }
    if (e.target.closest('input,select,button,a,textarea')) return;
    if (o.klik) o.klik(row, e);
  });
  tbody.addEventListener('mouseover', (e) => { if (!o.hover) return; const tr = e.target.closest('tr[data-id]'); if (tr && !tr._h) { tr._h = 1; o.hover(st.rows.find((x) => String(idOf(x)) === tr.dataset.id)); } });
  foot.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return; const p = b.dataset.p; st.hal = p === 'prev' ? st.hal - 1 : p === 'next' ? st.hal + 1 : Number(p); render(); host.scrollIntoView({ block: 'nearest' }); });
  foot.addEventListener('change', (e) => { if (e.target.classList.contains('per')) { st.per = Number(e.target.value); st.hal = 1; render(); } });
  const api_ = {
    set(rows) { st.rows = rows || []; const ada = new Set(st.rows.map((x) => String(idOf(x)))); st.pilih.forEach((p) => { if (!ada.has(p)) st.pilih.delete(p); }); render(); return api_; },
    cari(q) { st.q = q; st.hal = 1; render(); },
    saring(fn) { st.filter = fn; st.hal = 1; render(); },
    dipilih() { return st.rows.filter((x) => st.pilih.has(String(idOf(x)))); },
    bersihPilih() { st.pilih.clear(); render(); },
    hasil: hasil, render: render, st: st
  };
  return api_;
}

/* ---------------------------------------------------------------- lazy lib dari CDN */
const LIB = {
  xlsx: { url: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', g: 'XLSX' },
  exceljs: { url: 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js', g: 'ExcelJS' },
  jszip: { url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', g: 'JSZip' },
  chart: { url: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js', g: 'Chart' }
};
const _libP = {};
function muat(nama) {
  const L = LIB[nama];
  if (window[L.g]) return Promise.resolve(window[L.g]);
  if (_libP[nama]) return _libP[nama];
  _libP[nama] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = L.url; s.async = true;
    s.onload = () => res(window[L.g]);
    s.onerror = () => { delete _libP[nama]; rej(new Error('Gagal memuat pustaka ' + nama + '. Periksa koneksi internet.')); };
    document.head.appendChild(s);
  });
  return _libP[nama];
}

/* ---------------------------------------------------------------- tema */
const TEMA = [
  { id: 'hijau', nama: 'Hijau Al Wafa', warna: '#1B6B45' },
  { id: 'biru', nama: 'Biru Akademik', warna: '#1E4E8C' },
  { id: 'marun', nama: 'Marun', warna: '#7A1F2B' },
  { id: 'grafit', nama: 'Abu Grafit', warna: '#3F4652' }
];
function warnaTema(t) { const p = TEMA.find((x) => x.id === t); if (p) return p.warna; return /^#[0-9a-f]{6}$/i.test(t || '') ? t : TEMA[0].warna; }
function terapkanTema(t) { document.documentElement.style.setProperty('--brand', warnaTema(t)); try { localStorage.setItem('nw_tema', t || 'hijau'); } catch (e) { /* abaikan */ } }
try { terapkanTema(localStorage.getItem('nw_tema') || 'hijau'); } catch (e) { /* abaikan */ }

/* ---------------------------------------------------------------- cetak A4 (overlay) */
const Cetak = {
  tampil(judul, halamanHtml) {
    const old = $('.print-layer'); if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'print-layer';
    el.innerHTML = '<div class="print-bar"><b>' + esc(judul) + '</b><span class="muted">· ' + (halamanHtml.match(/class="a4/g) || []).length + ' halaman A4</span><span class="spacer"></span><span class="muted" style="font-size:12.5px">Tip: pilih "Simpan sebagai PDF" di dialog cetak</span><button class="btn btn-primary" data-c="print">' + ic('printer') + 'Cetak</button><button class="btn" data-c="tutup">' + ic('x') + 'Tutup</button></div>' + halamanHtml;
    document.body.appendChild(el);
    el.querySelector('[data-c=print]').onclick = () => window.print();
    el.querySelector('[data-c=tutup]').onclick = () => el.remove();
    const onKey = (e) => { if (e.key === 'Escape') { el.remove(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  },
  kop(id) {
    return '<div class="kop">' + (id.logo ? '<img src="' + esc(id.logo) + '" alt="">' : '') + '<div style="flex:1;text-align:center"><div class="t1">' + esc(id.institusi || '') + '</div><div class="t2">' + esc(id.alamat || '') + '</div></div>' + (id.logo ? '<div style="width:64px"></div>' : '') + '</div>';
  },
  ttd(id, tanggal) {
    return '<div class="ttd"><div>' + esc(id.kota || '') + ', ' + esc(fmtTgl(tanggal)) + '<br>' + esc(id.ttdJabatan || '') + '<div class="ruang"></div><b><u>' + esc(id.ttdNama || '……………………………') + '</u></b><br>' + (id.ttdNidn ? 'NIDN. ' + esc(id.ttdNidn) : '') + '</div></div>';
  }
};

/* ---------------------------------------------------------------- Router & App shell */
const Hal = {};
const MENU = [
  { id: 'dasbor', judul: 'Dasbor', ikon: 'dasbor' },
  { id: 'mahasiswa', judul: 'Mahasiswa', ikon: 'users' },
  { id: 'kurikulum', judul: 'Kurikulum', ikon: 'book' },
  { id: 'perkuliahan', judul: 'Perkuliahan & Nilai', ikon: 'clip' },
  { id: 'klaim', judul: 'Peta Klaim', ikon: 'route' },
  { id: 'lapor', judul: 'Lapor PDDIKTI', ikon: 'lapor' },
  { id: 'mahad', judul: "Ma'had Aly", ikon: 'mahad' },
  { id: 'lulus', judul: 'Kelulusan', ikon: 'lulus' },
  { id: 'pengaturan', judul: 'Pengaturan', ikon: 'settings' }
];
const App = {
  M: null, me: null, periode: '', ctx: { alive: false }, rute: '', jagaKeluar: null,
  async mulai() {
    Store.init();
    if (!KONFIG_OK) { this.tampilLogin('Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL /exec dari Apps Script.'); return; }
    const s = Sesi.get();
    if (!s) { this.tampilLogin(); return; }
    this.me = s.me;
    terapkanTema(s.me.tema);
    this.tampilShell();
    const boot = Store.peek('boot', {});
    if (boot) this.terimaBoot(boot);
    const r = await Store.get('boot', {}, 300000);
    if (!r.success) { if (!boot) { $('#konten').innerHTML = '<div class="alert danger">' + ic('xc') + '<div>' + esc(r.message) + '</div></div>'; } return; }
    this.terimaBoot(r.data);
    if (r.data.me && r.data.me.wajibGanti) this.gantiSandi(true);
  },
  terimaBoot(b) {
    const awal = !this.M;
    this.M = b.master; this.me = Object.assign({}, this.me, b.me || {});
    this.periodeAktif = String(b.periodeAktif);
    this.periode = sessionStorage.getItem('nw_periode') || this.periodeAktif;
    this.isiPeriode();
    this.isiUser();
    if (b.master.pengaturan.LOGO_URL) $('#brand-mark').innerHTML = '<img src="' + esc(b.master.pengaturan.LOGO_URL) + '" alt="">';
    if (awal) { window.addEventListener('hashchange', () => this.navigasi()); this.navigasi(); idle(() => this.prefetchAwal()); }
  },
  prefetchAwal() {
    ['dasbor.ringkasan'].forEach((a) => prefetch(a, {}));
    prefetch('mhs.list', {});
    prefetch('kelas.list', { periode: this.periode });
  },
  tampilLogin(pesan) {
    document.body.innerHTML = '<div class="login"><div class="login-art"><div class="row" style="gap:12px"><div class="brand-mark" style="background:rgba(255,255,255,.15);width:44px;height:44px">NA</div><div><div class="brand-t" style="font-size:16px">NILAI – AL WAFA</div><div style="opacity:.8;font-size:12.5px">STIS Al Wafa</div></div></div>' +
      '<h1>Satu tempat untuk nilai riil, klaim, dan lapor PDDIKTI.</h1><p>Pantau nilai yang sudah, siap, dan belum dilapor tanpa membuka puluhan file Excel.</p><div class="feat"><div>' + ic('check') + 'Status lapor otomatis per mahasiswa & mata kuliah</div><div>' + ic('lock') + 'Nilai yang sudah dilapor terkunci permanen</div><div>' + ic('download') + 'Unduh file siap impor Neo Feeder</div></div><div style="opacity:.6;font-size:12px">v' + APP_VER + '</div></div>' +
      '<div class="login-form"><form class="login-box" id="f-login" autocomplete="on"><h2>Masuk</h2><p class="muted mb-16">Gunakan akun admin yang diberikan kepada Anda.</p>' + (pesan ? '<div class="alert ' + (KONFIG_OK ? 'info' : 'danger') + ' mb-16">' + ic('info') + '<div>' + esc(pesan) + '</div></div>' : '') +
      '<div class="field mb-12"><label for="lg-u">Username</label><input class="input" id="lg-u" name="username" autocomplete="username" required></div><div class="field mb-16"><label for="lg-p">Kata sandi</label><div class="row" style="gap:0;position:relative"><input class="input" type="password" id="lg-p" name="password" autocomplete="current-password" required style="padding-right:40px"><button type="button" class="btn btn-ghost btn-sm btn-icon" id="lg-eye" style="position:absolute;right:3px" aria-label="Lihat sandi">' + ic('eye') + '</button></div></div>' +
      '<div id="lg-err" class="alert danger mb-12 hidden"></div><button class="btn btn-primary w-100" id="lg-btn" style="height:40px"' + (KONFIG_OK ? '' : ' disabled') + '>Masuk</button><p class="muted mt-16" style="font-size:12.5px">Lupa sandi? Minta admin lain me-reset sandi Anda di Pengaturan → Pengguna.</p></form></div></div>';
    $('#lg-eye').onclick = () => { const p = $('#lg-p'); p.type = p.type === 'password' ? 'text' : 'password'; };
    // warmup server saat form login dibuka (gas-scale-turbo 4.7)
    if (KONFIG_OK && !sessionStorage.getItem('nw_warm')) { sessionStorage.setItem('nw_warm', '1'); fetch(GAS_URL + '?w=pub', { mode: 'no-cors' }).catch(() => {}); }
    $('#f-login').onsubmit = async (e) => {
      e.preventDefault();
      const b = $('#lg-btn'), err = $('#lg-err');
      err.classList.add('hidden');
      const r = await tombolProses(b, () => apiRaw('auth.login', { username: $('#lg-u').value.trim(), password: $('#lg-p').value }, { token: '' }));
      if (!r.success) { err.innerHTML = ic('xc') + '<div>' + esc(r.message) + '</div>'; err.classList.remove('hidden'); return; }
      Store.reset();
      Sesi.set({ token: r.data.token, me: r.data.me, exp: r.data.exp });
      location.hash = '#/dasbor';
      location.reload();
    };
  },
  tampilShell() {
    document.body.innerHTML = '<div id="netbar" class="net-bar"></div><div class="app"><aside class="sidebar"><div class="brand"><div class="brand-mark" id="brand-mark">NA</div><div><div class="brand-t">NILAI – AL WAFA</div><div class="brand-s">Sistem Penilaian Akademik</div></div></div><nav class="nav" id="nav">' +
      MENU.map((m, i) => (i === 8 ? '<div class="nav-label">Sistem</div>' : i === 0 ? '<div class="nav-label">Menu</div>' : '') + '<a href="#/' + m.id + '" data-m="' + m.id + '">' + ic(m.ikon) + '<span>' + esc(m.judul) + '</span></a>').join('') +
      '</nav><div class="side-foot"><div class="user-card"><div class="avatar" id="u-av">A</div><div style="min-width:0;flex:1"><div style="font-weight:620;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" id="u-nama"></div><div class="muted" style="font-size:12px" id="u-jab"></div></div><button class="btn btn-ghost btn-sm btn-icon" id="btn-keluar" title="Keluar">' + ic('logout') + '</button></div></div></aside>' +
      '<main class="main"><header class="topbar"><div style="min-width:0"><div class="crumb" id="crumb">NILAI – AL WAFA</div><h1 id="judul">Dasbor</h1></div><span class="spacer"></span><div class="periode-pill" title="Periode kerja (hanya untuk tampilan Anda)">' + ic('cal', 'ic-sm') + '<select id="sel-periode"></select></div><button class="btn btn-ghost btn-icon" id="btn-akun" title="Akun saya">' + ic('user') + '</button></header><section class="content" id="konten"></section></main></div>';
    $('#btn-keluar').onclick = () => this.keluar();
    $('#btn-akun').onclick = () => this.menuAkun();
    $('#sel-periode').onchange = (e) => { this.periode = e.target.value; sessionStorage.setItem('nw_periode', this.periode); this.render(); };
    $('#nav').addEventListener('mouseover', (e) => { const a = e.target.closest('a[data-m]'); if (a && Hal[a.dataset.m] && Hal[a.dataset.m].prefetch && !a._pf) { a._pf = 1; setTimeout(() => { a._pf = 0; }, 20000); Hal[a.dataset.m].prefetch(); } });
    $('#konten').innerHTML = skelKpi(6) + '<div class="card mt-16">' + skelTabel(6) + '</div>';
  },
  isiPeriode() {
    const sel = $('#sel-periode'); if (!sel || !this.M) return;
    const ps = this.M.periode.slice().sort((a, b) => Number(b.id) - Number(a.id));
    if (!ps.some((p) => String(p.id) === String(this.periode))) this.periode = this.periodeAktif;
    sel.innerHTML = ps.map((p) => '<option value="' + esc(p.id) + '"' + (String(p.id) === String(this.periode) ? ' selected' : '') + '>' + esc(labelPeriode(p.id)) + (String(p.id) === this.periodeAktif ? ' • aktif' : '') + '</option>').join('');
  },
  isiUser() {
    if (!this.me) return;
    $('#u-nama').textContent = this.me.nama || this.me.username;
    $('#u-jab').textContent = this.me.jabatan || this.me.username;
    $('#u-av').textContent = String(this.me.nama || this.me.username || 'A').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  },
  navigasi() {
    if (this.jagaKeluar && !this.jagaKeluar()) { history.replaceState(null, '', '#' + this.rute); return; }
    this.jagaKeluar = null; window.onbeforeunload = null;
    this.rute = location.hash.replace(/^#/, '') || '/dasbor';
    this.render();
  },
  render() {
    if (!this.M) return;
    this.ctx.alive = false;
    const ctx = this.ctx = { alive: true };
    const p = this.rute.split('?')[0].split('/').filter(Boolean), id = p[0] || 'dasbor', h = Hal[id] || Hal.dasbor;
    const q = {}; (this.rute.split('?')[1] || '').split('&').filter(Boolean).forEach((kv) => { const s = kv.split('='); q[decodeURIComponent(s[0])] = decodeURIComponent(s[1] || ''); });
    $$('#nav a').forEach((a) => a.classList.toggle('aktif', a.dataset.m === (h.menu || id)));
    const m = MENU.find((x) => x.id === (h.menu || id)) || MENU[0];
    $('#judul').textContent = h.judul ? (typeof h.judul === 'function' ? h.judul(p, q) : h.judul) : m.judul;
    $('#crumb').textContent = 'NILAI – AL WAFA · ' + labelPeriode(this.periode);
    document.title = m.judul + ' · NILAI – AL WAFA';
    const el = $('#konten');
    el.innerHTML = '';
    window.scrollTo(0, 0);
    try { h.render(el, ctx, p.slice(1), q); } catch (e) { console.error(e); el.innerHTML = '<div class="alert danger">' + ic('xc') + '<div>Terjadi kesalahan tampilan: ' + esc(e.message) + '</div></div>'; }
  },
  pergi(h) { if (location.hash === '#' + h) this.navigasi(); else location.hash = '#' + h; },
  keluar() {
    konfirmasi('Keluar', 'Keluar dari aplikasi?', 'Keluar').then((ok) => { if (!ok) return; apiRaw('auth.logout', {}, { diam: true }); Sesi.clear(); location.hash = ''; location.reload(); });
  },
  keluarPaksa(pesan) { Sesi.clear(); this.tampilLogin(pesan); },
  menuAkun() {
    modal({
      judul: 'Akun saya', isi: '<div class="row mb-16"><div class="avatar" style="width:46px;height:46px;font-size:16px">' + esc($('#u-av').textContent) + '</div><div><b>' + esc(this.me.nama) + '</b><div class="muted">@' + esc(this.me.username) + ' · ' + esc(this.me.jabatan || 'Admin') + '</div></div></div><div class="list-plain"><button class="btn w-100 mb-8" data-a="sandi">' + ic('key') + 'Ganti kata sandi</button><button class="btn w-100 mb-8" data-a="tema">' + ic('star') + 'Warna tema</button><button class="btn w-100 mb-8" data-a="semua">' + ic('shield') + 'Keluar dari semua perangkat</button><button class="btn btn-danger w-100" data-a="keluar">' + ic('logout') + 'Keluar</button></div>',
      tombol: false, onBuka: (el, close) => {
        el.addEventListener('click', (e) => {
          const a = e.target.closest('[data-a]'); if (!a) return; close();
          if (a.dataset.a === 'sandi') this.gantiSandi(false);
          if (a.dataset.a === 'tema') this.pergi('/pengaturan/tema');
          if (a.dataset.a === 'keluar') this.keluar();
          if (a.dataset.a === 'semua') konfirmasi('Keluar dari semua perangkat', 'Semua sesi aktif akun Anda (di perangkat mana pun) akan diakhiri.', 'Akhiri semua', true).then(async (ok) => { if (!ok) return; await api('auth.logout', { semua: true }); Sesi.clear(); location.reload(); });
        });
      }
    });
  },
  gantiSandi(wajib) {
    _gantiSandiTampil = true;
    modal({
      judul: wajib ? 'Ganti kata sandi sementara' : 'Ganti kata sandi', wajib: wajib,
      desc: wajib ? 'Demi keamanan, ganti sandi sementara sebelum memakai aplikasi.' : '',
      isi: '<div class="field mb-12"><label>Kata sandi saat ini</label><input class="input" type="password" name="lama" autocomplete="current-password"></div><div class="field mb-12"><label>Kata sandi baru</label><input class="input" type="password" name="baru" autocomplete="new-password"><div class="hint">Minimal 8 karakter, berisi huruf dan angka.</div></div><div class="field"><label>Ulangi kata sandi baru</label><input class="input" type="password" name="ulang" autocomplete="new-password"></div>',
      tombol: (wajib ? [] : [{ teks: 'Batal', aksi: () => true }]).concat([{ teks: 'Simpan sandi', kelas: 'btn-primary', aksi: async (close, el) => {
        const f = bacaForm(el);
        if (f.baru !== f.ulang) { toast('Ulangan sandi tidak sama.', 'warn'); return false; }
        const r = await api('auth.gantiSandi', { lama: f.lama, baru: f.baru });
        if (!r.success) { toast(r.message, 'err'); return false; }
        const s = Sesi.get(); s.token = r.data.token; s.me.wajibGanti = false; Sesi.set(s); this.me.wajibGanti = false;
        toast('Kata sandi diganti. Sesi lain telah diakhiri.', 'ok');
        if (wajib) { Store.reset(); location.reload(); }
        return true;
      } }]),
      onTutup: () => { _gantiSandiTampil = false; }
    });
  },
  /** Ambil ulang data induk (setelah simpan Pengaturan/Kurikulum). */
  async segarkanMaster() {
    const r = await Store.ambil('boot', {}, { langsung: true });
    if (r.success) { this.M = r.data.master; this.periodeAktif = String(r.data.periodeAktif); this.isiPeriode(); }
    return r;
  },
  prodi() { return (this.M.prodi || []).filter((p) => String(p.aktif) !== '0'); },
  angkatanList() { const y = Number(String(this.periodeAktif).slice(0, 4)); const o = []; for (let t = y; t >= 2019; t--) o.push(String(t)); return o; },
  dosen(id) { return (this.M.dosen || []).find((d) => d.id === id) || {}; },
  ingat(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem('nw_f_' + k) || 'null'); sessionStorage.setItem('nw_f_' + k, JSON.stringify(v)); } catch (e) { return null; } }
};

/* ---------------------------------------------------------------- Excel helper (SheetJS) */
const Excel = {
  async baca(file) {
    const XLSX = await muat('xlsx');
    const buf = await file.arrayBuffer();
    return XLSX.read(buf, { type: 'array', cellDates: true });
  },
  /** Ubah sheet → array baris (header: 1). */
  async baris(wb, nama) { const XLSX = await muat('xlsx'); return XLSX.utils.sheet_to_json(wb.Sheets[nama || wb.SheetNames[0]], { header: 1, defval: '', raw: true }); },
  /** Cari baris header: baris pertama yang memuat ≥2 kata kunci. */
  cariHeader(rows, kunci, maks) {
    for (let i = 0; i < Math.min(rows.length, maks || 40); i++) {
      const r = rows[i].map((x) => normNama(x));
      const hit = kunci.filter((k) => r.some((c) => k.test(c)));
      if (hit.length >= 2) return i;
    }
    return -1;
  },
  async tulisSederhana(namaFile, header, rows, namaSheet) {
    const XLSX = await muat('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([header].concat(rows));
    ws['!cols'] = header.map((h, i) => ({ wch: Math.min(48, Math.max(String(h).length + 2, ...rows.slice(0, 200).map((r) => String(r[i] === undefined ? '' : r[i]).length + 2))) }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, namaSheet || 'Data');
    XLSX.writeFile(wb, namaFile);
  }
};

/** Pencocokan baris file (NIM/nama/nilai) dengan daftar peserta — tidak bergantung urutan. */
function cocokkanPeserta(peserta, masuk) {
  const byNim = {}, byNama = {};
  peserta.forEach((p) => { byNim[String(p.nim).trim()] = p; const k = normNama(p.nama); (byNama[k] = byNama[k] || []).push(p); });
  const dipakai = {};
  const hasil = masuk.map((x) => {
    const o = { nimFile: x.nim || '', namaFile: x.nama || '', nilaiFile: x.nilai, nilai: parseAngka(x.nilai), jenis: '', p: null, pilihan: [] };
    if (x.nim && byNim[String(x.nim).trim()]) { o.p = byNim[String(x.nim).trim()]; o.jenis = 'nim'; }
    else if (x.nama) {
      const k = byNama[normNama(x.nama)] || [];
      if (k.length === 1) { o.p = k[0]; o.jenis = 'nama'; } else if (k.length > 1) { o.jenis = 'ragu'; o.pilihan = k; } else o.jenis = 'tidak';
    } else o.jenis = 'tidak';
    if (o.nilai !== null && (isNaN(o.nilai) || o.nilai < 0 || o.nilai > 100)) o.tolak = true;
    if (o.p) { if (dipakai[o.p.nim]) { o.ganda = true; } dipakai[o.p.nim] = 1; }
    return o;
  });
  const tanpa = peserta.filter((p) => !dipakai[p.nim]);
  return { hasil: hasil, tanpaNilai: tanpa };
}

document.addEventListener('DOMContentLoaded', () => App.mulai());
