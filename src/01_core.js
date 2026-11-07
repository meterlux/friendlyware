'use strict';
/* ===== core: 80x25 CGA text screen, renderer, speaker, input ===== */
const VERSION = '2.7.7';
const COLS = 80, ROWS = 25;
const C = n => String.fromCharCode(n);
const b64bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

const FONT = new Uint8Array(2048);
for (let i = 0; i < 2048; i++) FONT[i] = parseInt(ASSETS.font.substr(i * 2, 2), 16);

const store = {
  get(k, d) { try { const v = localStorage.getItem('pcarcade.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('pcarcade.' + k, JSON.stringify(v)); } catch (e) {} }
};

/* screen memory: code + attribute (fg | bg << 4), like the real text buffer */
const scrCh = new Uint8Array(COLS * ROWS), scrAt = new Uint8Array(COLS * ROWS);
function cls() { scrCh.fill(32); scrAt.fill(7); }
function put(x, y, s, fg = 7, bg = 0) {
  if (y < 0 || y >= ROWS) return;
  const a = (fg & 15) | ((bg & 15) << 4);
  for (let k = 0; k < s.length; k++) {
    const xx = x + k;
    if (xx < 0 || xx >= COLS) continue;
    scrCh[y * COLS + xx] = s.charCodeAt(k) & 255; scrAt[y * COLS + xx] = a;
  }
}
const putc = (x, y, code, attr) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) { scrCh[y * COLS + x] = code; scrAt[y * COLS + x] = attr; } };
const getc = (x, y) => scrCh[y * COLS + x];
const geta = (x, y) => scrAt[y * COLS + x];
function saveRow(y) { return [scrCh.slice(y * COLS, y * COLS + COLS), scrAt.slice(y * COLS, y * COLS + COLS)]; }
function restoreRow(y, r) { scrCh.set(r[0], y * COLS); scrAt.set(r[1], y * COLS); }
function loadPage(name) {
  const b = b64bytes(ASSETS.pages[name]);
  scrCh.set(b.subarray(0, 2000)); scrAt.set(b.subarray(2000, 4000));
}
const center80 = (y, s, fg = 7, bg = 0) => put(Math.floor((COLS - s.length) / 2), y, s, fg, bg);

/* ===== display: color (CGA) or a monochrome phosphor ===== */
const CGA = [[0,0,0],[0,0,170],[0,170,0],[0,170,170],[170,0,0],[170,0,170],[170,85,0],[170,170,170],
  [85,85,85],[85,85,255],[85,255,85],[85,255,255],[255,85,85],[255,85,255],[255,255,85],[255,255,255]];
// brightness of each CGA color on a monochrome tube; a game may supply its own table
const LUM_DEFAULT = [0, .32, .45, .6, .45, .55, .55, .8, .42, .6, .9, .9, .72, .78, .95, 1];
let lum = LUM_DEFAULT;
const PHOSPHORS = [
  { name: 'Amber', rgb: [232, 176, 44] },
  { name: 'Green', rgb: [92, 255, 138] },
  { name: 'White', rgb: [222, 232, 242] },
  { name: 'Color', rgb: [200, 200, 200], color: true }
];
let phosIdx = store.get('phos', 0) % PHOSPHORS.length;
let lastMono = PHOSPHORS[phosIdx].color ? 0 : phosIdx;
const isColor = () => !!PHOSPHORS[phosIdx].color;
let ctlMode = 'pad';            // 'pad' or 'kbd' (keyboard mode drops the touch cursor on the menu)
let palette = [];
function rebuildPalette() {
  const p = PHOSPHORS[phosIdx];
  palette = CGA.map((c, i) => isColor() ? `rgb(${c[0]},${c[1]},${c[2]})`
    : `rgba(${p.rgb[0]},${p.rgb[1]},${p.rgb[2]},${lum[i]})`);
  sprites.clear();
}
function setPhosphor(i) {
  phosIdx = i; store.set('phos', i);
  if (!isColor()) lastMono = i;
  const [r, g, b] = PHOSPHORS[i].rgb;
  document.documentElement.style.setProperty('--phos-rgb', `${r},${g},${b}`);
  document.getElementById('phosBtn').textContent = PHOSPHORS[i].name;
  document.documentElement.classList.toggle('color', isColor());   // color text keeps its own edges, no phosphor glow
  rebuildPalette();
}
function setLum(table) { lum = table || LUM_DEFAULT; rebuildPalette(); }

/* ===== renderer ===== */
const canvas = document.getElementById('scr');
const ctx2 = canvas.getContext('2d');
const sprites = new Map();
// some games (graphics-mode ones like Bug Blaster) draw their own shapes; they borrow unused codes
let fontOv = null;
function setFontOv(map) { fontOv = map || null; sprites.clear(); }
const glyphRow = (code, r) => fontOv && fontOv[code] ? fontOv[code][r] : FONT[code * 8 + r];
let cw = 8, chh = 8;
let view = { x0: 0, w: 80 };
function sprite(code, attr) {
  const key = (code << 8) | attr;
  let s = sprites.get(key);
  if (s) return s;
  s = document.createElement('canvas'); s.width = cw; s.height = chh;
  const x = s.getContext('2d'), fg = attr & 15, bg = attr >> 4, pw = cw / 8, ph = chh / 8;
  if (bg) { x.fillStyle = palette[bg]; x.fillRect(0, 0, cw, chh); }
  if (fg !== bg) {
    if (bg && !isColor()) { x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; }
    else x.fillStyle = palette[fg];
    for (let r = 0; r < 8; r++) {
      const bits = glyphRow(code, r);
      for (let k = 0; k < 8; k++) if (bits & (128 >> k))
        x.fillRect(Math.floor(k * pw), Math.floor(r * ph), Math.ceil(pw), Math.ceil(ph));
    }
    // on a mono tube, foreground over a lit background shows its own brightness
    if (bg && !isColor() && fg) {
      x.globalCompositeOperation = 'source-over'; x.fillStyle = palette[fg];
      for (let r = 0; r < 8; r++) {
        const bits = glyphRow(code, r);
        for (let k = 0; k < 8; k++) if (bits & (128 >> k))
          x.fillRect(Math.floor(k * pw), Math.floor(r * ph), Math.ceil(pw), Math.ceil(ph));
      }
    }
  }
  sprites.set(key, s);
  return s;
}
function render() {
  ctx2.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < ROWS; y++) {
    for (let x = view.x0; x < view.x0 + view.w; x++) {
      const i = y * COLS + x, code = scrCh[i], attr = scrAt[i];
      if ((attr >> 4) === 0 && ((attr & 15) === 0 || code === 32 || code === 0 || code === 255)) continue;
      ctx2.drawImage(sprite(code, attr), (x - view.x0) * cw, y * chh);
    }
  }
}
const app = document.getElementById('app');
const crt = document.getElementById('crt');
function fit() {
  const cs = getComputedStyle(app);
  const SHAPE = (3 / 4) * (COLS / view.w);
  const iw = Math.floor(app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 16);
  let ih = Math.floor(iw * SHAPE);
  ih = Math.min(ih, Math.floor(app.clientHeight * 0.5 - 24));
  crt.style.width = (iw + 6) + 'px'; crt.style.height = (ih + 4) + 'px';
  canvas.style.width = iw + 'px'; canvas.style.height = ih + 'px';
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  cw = Math.max(3, Math.floor(iw * dpr / view.w));
  chh = Math.max(4, Math.floor(ih * dpr / ROWS));
  canvas.width = cw * view.w; canvas.height = chh * ROWS;
  sprites.clear();
}
function setView(x0, w) { if (view.x0 !== x0 || view.w !== w) { view = { x0, w }; fit(); } }
new ResizeObserver(fit).observe(app);

/* ===== PC speaker ===== */
const SR = 22050;
let ac = null, master = null;
let soundOn = store.get('sound', true);
// iPhone sound: ask Safari to treat this as media playback (so the ring/silent switch does not mute it), unlock
// the audio on a real touch with a silent buffer, and resume it whenever iOS suspended or interrupted it
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
let unlocked = false;
function ensureAudio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.12; master.connect(ac.destination); }
    catch (e) { ac = null; }
  }
  if (!ac) return;
  if (ac.state !== 'running') ac.resume().catch(() => {});
  if (!unlocked) {
    try { const s = ac.createBufferSource(); s.buffer = ac.createBuffer(1, 1, 22050); s.connect(ac.destination); s.start(0); unlocked = true; } catch (e) {}
  }
}
['touchend', 'pointerup', 'click', 'keydown'].forEach(t => window.addEventListener(t, ensureAudio, true));
document.addEventListener('visibilitychange', () => { if (!document.hidden && ac && ac.state !== 'running') ac.resume().catch(() => {}); });
const live = new Set();
function track(node, end) { live.add(node); node.onended = () => live.delete(node); }
function spkStop() { for (const n of live) { try { n.stop(); } catch (e) {} } live.clear(); }
// square tone; slideTo sweeps linearly in frequency
function tone(freq, dur, at = 0, slideTo = 0) {
  if (!soundOn || !ac) return;
  const t = ac.currentTime + at;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'square'; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(1, t); g.gain.setValueAtTime(0, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.01); track(o);
}
// recorded speaker clip: edge positions (varint deltas, in samples) replayed as a 1-bit wave
const clipCache = new Map();
function clipBuffer(name) {
  if (clipCache.has(name)) return clipCache.get(name);
  const c = ASSETS.clips[name];
  const bytes = b64bytes(c.e), edges = [];
  let pos = 0, v = 0, sh = 0;
  for (const b of bytes) { v |= (b & 127) << sh; if (b & 128) { sh += 7; continue; } pos += v; edges.push(pos); v = 0; sh = 0; }
  const n = Math.max(c.n || 0, (edges[edges.length - 1] || 0) + 10);
  const buf = ac.createBuffer(1, n, SR), d = buf.getChannelData(0);
  // between edges the cone holds its level; long gaps (silence) decay to rest
  let lvl = c.l ? 1 : -1;
  for (let i = 0; i < edges.length; i++) {
    const a = edges[i], b = i + 1 < edges.length ? edges[i + 1] : a;
    if (b - a < SR * 0.02) d.fill(lvl, a, b);
    lvl = -lvl;
  }
  clipCache.set(name, buf);
  return buf;
}
function clip(name, at = 0) {
  if (!soundOn || !ac || !ASSETS.clips[name]) return;
  const s = ac.createBufferSource(); s.buffer = clipBuffer(name); s.connect(master);
  s.start(ac.currentTime + at); track(s);
}

/* ===== recorded screen movies (timed cell writes) ===== */
function parseMovie(name) {
  const b = b64bytes(ASSETS.movies[name]), ev = [];
  let i = 0, t = 0;
  while (i < b.length) {
    let v = 0, sh = 0;
    for (;;) { const x = b[i++]; v |= (x & 127) << sh; if (!(x & 128)) break; sh += 7; }
    t += v; ev.push([t / 1000, b[i], b[i + 1], b[i + 2], b[i + 3]]); i += 4;
  }
  return ev;
}
class Movie {
  constructor(name, filter) { this.ev = parseMovie(name).filter(filter || (() => true)); this.i = 0; this.t = 0; }
  get done() { return this.i >= this.ev.length; }
  get dur() { return this.ev.length ? this.ev[this.ev.length - 1][0] : 0; }
  step(dt) {
    this.t += dt;
    while (this.i < this.ev.length && this.ev[this.i][0] <= this.t) {
      const [, r, c, code, at] = this.ev[this.i++]; putc(c, r, code, at);
    }
  }
  finish() { this.step(1e9); }
}
