/* ===== touch pads, vintage keyboard, switch bar, main loop ===== */
const ICON = {
  left: '<svg viewBox="0 0 48 48"><path d="M30 10 L14 24 L30 38 Z"/></svg>',
  right: '<svg viewBox="0 0 48 48"><path d="M18 10 L34 24 L18 38 Z"/></svg>',
  up: '<svg viewBox="0 0 48 48"><path d="M10 31 L24 15 L38 31 Z"/></svg>',
  down: '<svg viewBox="0 0 48 48"><path d="M10 17 L24 33 L38 17 Z"/></svg>',
  fire: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="11"/></svg>',
  none: ''
};
// Pads keep one shape: two side squares plus a stacked pair (or one tall button) in a third column.
// The bias toggle moves the columns: left = sides on the left thumb, right = mirrored, split = sides at both edges.
// A button is [icon, label, key, repeat]; null leaves a faint blank square.
const B = (icon, label, k, rep = 0) => [icon, label, k, rep];
const P4 = (def, l, r, u, d, f, allow) => ({ kind: 4, def, allow: allow || ['left', 'right', 'split'], l, r, u, d, f });
const P8 = (def, b) => ({ kind: 8, def, allow: ['left', 'right'], b });
// a compact four-way cross for one thumb, with an optional big button on the far side
// a centered row of one or two squares, the same size as the other pads' buttons
const PR = (...b) => ({ kind: 'row', def: 'center', allow: ['center'], b });
const PX = (def, b, allow) => ({ kind: 'x', def, allow: allow || ['left', 'right'], b });
const PADS = {
  hopper: P4('left', B('left', 'LEFT', 'Left', 1), B('right', 'RIGHT', 'Right', 1), B('up', 'HOP', 'Up', 1), B('down', 'BACK', 'Down', 1)),
  lr2: P4('split', B('left', 'LEFT', 'Left'), B('right', 'RIGHT', 'Right'), null, null, null, ['split', 'left', 'right', 'slide']),
  dpad: PX('left', { u: B('up', '', 'Up'), l: B('left', '', 'Left'), r: B('right', '', 'Right'), d: B('down', '', 'Down') }, ['left', 'split', 'right']),
  lrf: P4('left', B('left', 'LEFT', 'Left'), B('right', 'RIGHT', 'Right'), null, null, B('fire', 'FIRE', 'Space')),
  derby: P4('left', B('none', 'RACE AGAIN', 'F5'), B('none', 'MENU', 'Space'), null, null),
  // Eagle Lander: hold THRUST with LEFT or RIGHT for the diagonals; PWR steps the throttle 1-6
  lander: P4('left', B('left', 'LEFT', 'Left'), B('right', 'RIGHT', 'Right'), B('up', 'THRUST', 'Up'), B('none', 'PWR', 'Pwr')),
  // STOP dropped in 2.7.7: the ship already stops when UP or DOWN is released (the keyboard 2 still stops it)
  starfighter: P4('right', null, B('fire', 'FIRE', 'Space'), B('up', 'UP', 'Up'), B('down', 'DOWN', 'Down')),
  // Bug Blaster and Robot War: the smart d-pad with diagonals (eight wedges in a ring) beside a tall FIRE
  eight: Object.assign(PX('left', { f: B('fire', 'FIRE', 'Space') }), { eight: true }),
  gorilla: PX('left', { u: B('up', 'UP', 'Up'), l: B('left', '', 'Left'), r: B('right', '', 'Right'), d: B('down', 'DOWN', 'Down'), f: B('fire', 'JUMP', 'Space') })
};
// shell screens use the same shape; the menu defaults to the mirrored (right) layout
function shellPad() {
  const s = Sys.state;
  // shell screens default to the centered (split) layout: choices stacked in the middle, HOW TO far left, go/back far right
  if (s === 'menu') return P4('split', B('none', 'HOW TO', 'Help'), B('none', 'PLAY', 'Enter'), B('up', 'PREV', 'Left', 1), B('down', 'NEXT', 'Right', 1));
  if (s === 'instrpick') return P4('split', B('none', 'MENU', 'F10'), B('none', 'OPEN', 'Enter'), B('up', 'PREV', 'Left', 1), B('down', 'NEXT', 'Right', 1));
  // two-choice questions: two squares side by side in the middle (2.7.2)
  if (s === 'colorq' || (s === 'game' && Sys.prompt)) return PR(B('none', 'YES', 'Y'), B('none', 'NO', 'N'));
  if (s === 'players') return P4('split', B('none', 'HOW TO', 'Help'), B('none', 'BACK', 'F10'), B('none', '1 PLAYER', '1'), B('none', '2 PLAYERS', '2'));
  // one-action screens (intro, instructions, boss): a single button in the middle
  const k = s === 'boss' ? 'F1' : 'Space';
  return PR(B('none', s === 'boss' ? 'RETURN' : s === 'splash' || s === 'boot' ? 'SKIP' : 'GO', k));
}
const padEl = document.getElementById('pad');
const padName = document.getElementById('padName'), padHint = document.getElementById('padHint');
const biasKey = () => 'bias2.' + (Sys.state === 'game' && !Sys.prompt ? Sys.letter : 'menu');
function biasFor(spec) { const b = store.get(biasKey(), spec.def); return spec.allow.includes(b) ? b : spec.def; }
const COLS4 = { left: ['l', 'r', 's'], right: ['s', 'l', 'r'], split: ['l', 's', 'r'] };
const Pad = {
  cur: null, sig: '', bias: 'left',
  use(spec) {
    const bias = biasFor(spec);
    const sig = JSON.stringify(spec) + bias;
    if (sig === this.sig) return;
    this.sig = sig; this.cur = spec; this.bias = bias;
    held.forEach((_, id) => release(id));
    padEl.innerHTML = ''; padEl.removeAttribute('style');
    const add = (area, b) => {
      const btn = document.createElement('button');
      btn.className = 'pb a-' + area;
      if (b) { const [icon, label, k, rep] = b; btn.dataset.k = k; btn.dataset.rep = rep; btn.innerHTML = ICON[icon] + '<span>' + label + '</span>'; btn.setAttribute('aria-label', label || k); }
      else { btn.classList.add('off'); btn.setAttribute('aria-hidden', 'true'); }
      if (b && !b[2]) btn.classList.add('off');
      padEl.appendChild(btn);
    };
    if (spec.kind === 'row') {
      padEl.className = 'pad lay-row';
      spec.b.forEach((b, i) => add('c' + i, b));
      sizeRows();
    } else if (spec.kind === 'x') {
      padEl.className = 'pad lay-cross';
      const L = bias === 'left';
      const M = bias === 'split';   // centered d-pad (no big button beside it)
      padEl.style.gridTemplateColumns = M ? '1fr repeat(3,var(--cx)) 1fr' : L ? 'repeat(3,var(--cx)) 1fr var(--cf)' : 'var(--cf) 1fr repeat(3,var(--cx))';
      // one d-pad spanning three columns, the big button (if any) on the far side
      let areas = ('"' + (M ? '. s s s .' : L ? 's s s . f' : 'f . s s s') + '" ').repeat(3).trim();
      if (!spec.b.f) areas = areas.replace(/f/g, '.');
      padEl.style.gridTemplateAreas = areas;
      const st = document.createElement('div');
      st.className = 'stick'; st.style.gridArea = 's';
      if (spec.eight) {
        // keypad shape: big up/down/left/right arms pointing in to the centre, the diagonals in the four corners
        const P = { Up: 'M33 3H67V29L50 44L33 29Z', Down: 'M33 97H67V71L50 56L33 71Z', Left: 'M3 33V67H29L44 50L29 33Z', Right: 'M97 33V67H71L56 50L71 33Z',
          UL: 'M3 3H29V20L20 29H3Z', UR: 'M97 3H71V20L80 29H97Z', DL: 'M3 97H29V80L20 71H3Z', DR: 'M97 97H71V80L80 71H97Z' };
        const CH = { Up: 'M43 18L50 11L57 18', Down: 'M43 82L50 89L57 82', Left: 'M18 43L11 50L18 57', Right: 'M82 43L89 50L82 57',
          UL: 'M10 18V10H18', UR: 'M90 18V10H82', DL: 'M10 82V90H18', DR: 'M90 82V90H82' };
        let svg = '';
        for (const d in P) svg += `<path class="w" data-d="${d}" d="${P[d]}"/><path class="ch" d="${CH[d]}"/>`;
        st.innerHTML = '<svg viewBox="0 0 100 100">' + svg + '</svg>';
        padEl.appendChild(st);
        if (spec.b.f) add('f', spec.b.f);
      } else {
      const W = { Up: 'M24 4 H76 V20 L50 44 L24 20 Z', Down: 'M24 96 H76 V80 L50 56 L24 80 Z', Left: 'M4 24 V76 H20 L44 50 L20 24 Z', Right: 'M96 24 V76 H80 L56 50 L80 24 Z' };
      const TX = { Up: [50, 31], Down: [50, 73], Left: [31, 52], Right: [69, 52] };
      const A = { Up: 'M42 18 L50 10 L58 18', Down: 'M42 82 L50 90 L58 82', Left: 'M18 42 L10 50 L18 58', Right: 'M82 42 L90 50 L82 58' };
      st.innerHTML = '<svg viewBox="0 0 100 100">' + Object.keys(W).map(d => `<path class="w" data-d="${d}" d="${W[d]}"/><path class="ch" d="${A[d]}"/><text class="lbl" data-d="${d}" x="${TX[d][0]}" y="${TX[d][1]}"></text>`).join('') + '</svg>';
      padEl.appendChild(st);
      if (spec.b.f) add('f', spec.b.f);
      }
    } else if (spec.kind === 8) {
      padEl.className = 'pad lay-eight' + (bias === 'right' ? ' mir' : '');
      for (const [area, b] of Object.entries(spec.b)) add(area, b);
    } else if (bias === 'slide') {
      // one full-width touch strip: drag like a laptop trackpad to place the paddle
      padEl.className = 'pad lay-slide';
      const sl = document.createElement('div');
      sl.className = 'slider'; sl.innerHTML = '<span>\u25C0 SLIDE \u25B6</span>';
      padEl.appendChild(sl);
    } else {
      padEl.className = 'pad lay-four';
      const cols = COLS4[bias];
      const col = { l: cols.indexOf('l'), r: cols.indexOf('r'), s: cols.indexOf('s') };
      const area = (a, b) => cols.map(c => c === 's' ? a : c).join(' ') + '" "' + cols.map(c => c === 's' ? b : c).join(' ');
      padEl.style.gridTemplateAreas = '"' + (spec.f ? area('f', 'f') : area('u', 'd')) + '"';
      add('l', spec.l); add('r', spec.r);
      if (spec.f) add('f', spec.f); else { add('u', spec.u); add('d', spec.d); }
      sizeRows();
    }
    syncLayoutBtn();
  }
};
// the stacked column holds two squares; rows follow the column width so a tall button is two squares high
function sizeRows() {
  if (padEl.classList.contains('lay-row')) {
    // squares as big as the four-button layout's, and the row sits where that layout's middle would be
    const sq = Math.min(154, (padEl.clientWidth - 24) / 3);
    padEl.style.setProperty('--sq', sq + 'px'); padEl.style.height = (2 * sq + 12) + 'px';
    return;
  }
  if (!padEl.classList.contains('lay-four')) return;
  const w = padEl.querySelector('.pb');
  if (!w) return;
  const cw = w.getBoundingClientRect().width;
  if (cw) padEl.style.gridTemplateRows = `${cw}px ${cw}px`;
}
new ResizeObserver(() => sizeRows()).observe(padEl);
function refreshPad() {
  const inGame = Sys.state === 'game' && !Sys.prompt;
  Pad.use(inGame ? PADS[Sys.game.pad] : shellPad());
  const name = inGame ? (MENU_NAMES[Sys.letter] || '') : ({ boot: 'PC Arcade', splash: 'PC Arcade', colorq: 'Display', menu: 'Menu', instrpick: 'Instructions', instr: 'Instructions', players: 'Players', boss: 'Boss key' }[Sys.state] || 'PC Arcade');
  const hint = inGame ? (Sys.game.pad === 'hopper' ? 'Hold to repeat · slide to switch' : Sys.game.pad === 'dpad' ? 'Tap or swipe anywhere on the pad' : Pad.cur.kind === 'x' ? 'Press, then slide to steer' : 'Hold to move') : (Sys.state === 'menu' ? 'Choose a game, then play' : 'Tap to continue');
  // a game can relabel a button for its current setting (Eagle Lander's throttle)
  if (inGame && Sys.game.padText) padEl.querySelectorAll('.pb').forEach(b => {
    const t = b.dataset.k && Sys.game.padText(b.dataset.k), sp = b.querySelector('span');
    if (t != null && sp && sp.textContent !== t) sp.textContent = t;
  });
  if (inGame && Sys.game.padText) padEl.querySelectorAll('.stick .lbl').forEach(t => { const v = Sys.game.padText(t.dataset.d) || ''; if (t.textContent !== v) t.textContent = v; });
  if (padName.textContent !== name) padName.textContent = name;
  if (padHint.textContent !== hint) padHint.textContent = hint;
}

/* key routing: pad, on-screen keyboard and a real keyboard all end up here */
function keyDown(k) {
  ensureAudio();
  if (k === 'Help' && Sys.state === 'players') { goInstr(Sys.letter); return; }
  if (k === 'Help') { if (MENU[Sys.sel] !== 'k') goInstr(MENU[Sys.sel]); else goInstrPick(); return; }
  sysKey(k, false);
}
function keyUp(k) { sysKeyUp(k); }

const held = new Map();
const REPEAT_DELAY = 0.3, REPEAT_RATE = 0.15;
function press(id, el, k, repeat) {
  release(id);
  el.classList.add('on');
  held.set(id, { el, k, t: 0, next: repeat ? REPEAT_DELAY : Infinity });
  haptic();
  keyDown(k);
}
function release(id) {
  const h = held.get(id);
  if (!h) return;
  if (h.stick) { stickSet(id, null); held.delete(id); return; }
  if (h.slide) { h.el.classList.remove('on'); held.delete(id); return; }
  h.el.classList.remove('on'); held.delete(id); keyUp(h.k);
}
function tickHeld(dt) {
  for (const h of held.values()) {
    h.t += dt;
    if (h.t >= h.next) { h.next += REPEAT_RATE; keyDown(h.k); }
  }
}
// d-pad: the first touch picks the wedge under it; after that the direction follows the way the thumb moves,
// so a drifting thumb or a swipe anywhere on the pad still steers (ASCII Man takes swipes over the whole pad)
const DKEY = { Up: 'Up', Down: 'Down', Left: 'Left', Right: 'Right', UL: '7', UR: '9', DL: '1', DR: '3' };
const DIRS8 = [['Right', 0], ['DR', 45], ['Down', 90], ['DL', 135], ['Left', 180], ['UL', 225], ['Up', 270], ['UR', 315]];
function stickDir(dx, dy) {
  if (!Pad.cur || !Pad.cur.eight) return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'Left' : 'Right') : (dy < 0 ? 'Up' : 'Down');
  // eight ways: cardinals get 50 degrees each, diagonals 40, so straight lines are easy to hold
  const deg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
  for (const [d, c] of DIRS8) { const half = d.length > 1 ? 20 : 25; if (Math.abs(((deg - c + 540) % 360) - 180) <= half) return d; }
  return 'Right';
}
function stickSet(id, d) {
  const h = held.get(id);
  if (!h || h.d === d) return;
  if (h.d) keyUp(DKEY[h.d]);
  h.d = d; h.k = d ? DKEY[d] : null;
  padEl.querySelectorAll('.stick .w').forEach(w => w.classList.toggle('on', w.dataset.d === d));
  if (d) { haptic(); keyDown(DKEY[d]); }
}
// a tiny tap of feedback on pad presses during play: vibrate where the phone allows it; on iPhone Safari a
// hidden switch toggle gives the system haptic tick (iOS 18 and later)
const hapticSw = document.createElement('label');
hapticSw.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;overflow:hidden;opacity:0';
hapticSw.innerHTML = '<input type="checkbox" switch tabindex="-1" aria-hidden="true">';
document.body.appendChild(hapticSw);
// Safari only lets a page do this from a touch that is ending (the finger lifting), not when it lands, so on an
// iPhone the tick comes on release; phones with vibration buzz on the press itself
const canVibrate = typeof navigator.vibrate === 'function';
function haptic(lifting) {
  if (Sys.state !== 'game' || Sys.prompt || !store.get('haptic', true)) return;
  if (canVibrate) { if (!lifting) try { navigator.vibrate(8); } catch (e) {} return; }
  if (lifting) try { hapticSw.click(); } catch (e) {}
}
padEl.addEventListener('pointerup', () => haptic(true));
padEl.addEventListener('pointerdown', e => {
  const sl = e.target.closest('.slider');
  if (sl) {
    e.preventDefault(); ensureAudio(); haptic();
    try { padEl.setPointerCapture(e.pointerId); } catch (_) {}
    held.set(e.pointerId, { el: sl, k: null, slide: true, lx: e.clientX, t: 0, next: Infinity });
    sl.classList.add('on');
    return;
  }
  const st = padEl.querySelector('.stick');
  if (st && !e.target.closest('.pb') && (e.target.closest('.stick') || !Pad.cur.b.f)) {
    e.preventDefault(); ensureAudio();
    try { padEl.setPointerCapture(e.pointerId); } catch (_) {}
    release(e.pointerId);
    held.set(e.pointerId, { el: st, k: null, d: null, stick: true, ax: e.clientX, ay: e.clientY, t: 0, next: Infinity });
    const r = st.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (e.target.closest('.stick') && Math.hypot(dx, dy) > r.width * (Pad.cur.eight ? 0.14 : 0.08)) stickSet(e.pointerId, stickDir(dx, dy));
    return;
  }
  const b = e.target.closest('.pb');
  if (!b || !b.dataset.k) return;
  e.preventDefault();
  try { padEl.setPointerCapture(e.pointerId); } catch (_) {}
  press(e.pointerId, b, b.dataset.k, b.dataset.rep === '1');
});
padEl.addEventListener('pointermove', e => {
  const h = held.get(e.pointerId);
  if (!h) return;
  if (h.slide) {
    // a drag across about 70% of the strip covers the whole field
    const g = Sys.state === 'game' && Sys.game.slide;
    if (g) Sys.game.slide((e.clientX - h.lx) * Sys.game.slideSpan() / (h.el.getBoundingClientRect().width * 0.7));
    h.lx = e.clientX;
    return;
  }
  if (h.stick) {
    const dx = e.clientX - h.ax, dy = e.clientY - h.ay;
    if (Math.hypot(dx, dy) > (Pad.cur && Pad.cur.eight ? 24 : 14)) { stickSet(e.pointerId, stickDir(dx, dy)); h.ax = e.clientX; h.ay = e.clientY; }
    return;
  }
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const b = el && el.closest && el.closest('#pad .pb');
  if (b && b !== h.el && b.dataset.k) press(e.pointerId, b, b.dataset.k, b.dataset.rep === '1');
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => padEl.addEventListener(t, e => release(e.pointerId)));

document.querySelector('.controls').addEventListener('pointerdown', e => {
  if (Sys.state !== 'boot') return;
  e.preventDefault(); e.stopPropagation(); ensureAudio(); goColorQ();
}, true);

/* vintage keyboard */
const KB = [
  [['Esc'], ['F1'], ['F2'], ['F3'], ['F4'], ['F5'], ['F6'], ['F7'], ['F8'], ['F9'], ['F10']],
  [['`'], ['1'], ['2'], ['3'], ['4'], ['5'], ['6'], ['7'], ['8'], ['9'], ['0']],
  [['Tab', 'TAB', 1.4], ['-'], ['='], ['['], [']'], ['\\'], [';'], ["'"], [','], ['.'], ['/'], ['Bksp', 'BKSP', 1.6]],
  [['Q'], ['W'], ['E'], ['R'], ['T'], ['Y'], ['U'], ['I'], ['O'], ['P']],
  [['Caps', 'CAPS', 1.5], ['A'], ['S'], ['D'], ['F'], ['G'], ['H'], ['J'], ['K'], ['L'], ['Enter', 'ENTER', 1.7]],
  [['Shift', 'SHIFT', 1.6], ['Z'], ['X'], ['C'], ['V'], ['B'], ['N'], ['M'], ['Shift', 'SHIFT', 1.6]],
  [['Ctrl', 'CTRL', 1.4], ['Alt', 'ALT', 1.3], ['Space', 'SPACE', 3.6], ['Left', '←'], ['Up', '↑'], ['Down', '↓'], ['Right', '→']],
  [['NumLk', 'NUM'], ['ScrLk', 'SCRL'], ['PrtSc', 'PRTSC'], ['Ins', 'INS'], ['Del', 'DEL'], ['Home', 'HOME'], ['End', 'END'], ['PgUp', 'PGUP'], ['PgDn', 'PGDN']]
];
const LOCKS = ['Caps', 'NumLk', 'ScrLk'], MODS = ['Ctrl', 'Alt', 'Shift'];
const kbdEl = document.getElementById('kbd');
const readout = document.getElementById('readout');
const mods = { Ctrl: false, Alt: false, Shift: false };
const locks = { Caps: false, NumLk: true, ScrLk: false };
KB.forEach(row => {
  const r = document.createElement('div'); r.className = 'krow';
  row.forEach(([k, label, w]) => {
    const b = document.createElement('button'); b.className = 'key'; b.dataset.k = k;
    const text = label === undefined ? k : label; b.textContent = text;
    if (text.length > 2) b.classList.add('sm');
    if (MODS.includes(k) || LOCKS.includes(k) || ['Esc', 'Tab', 'Bksp', 'Enter'].includes(k)) b.classList.add('mod');
    if (LOCKS.includes(k)) { const lt = document.createElement('span'); lt.className = 'lt'; b.appendChild(lt); }
    if (w) b.style.setProperty('--w', w);
    b.setAttribute('aria-label', k); r.appendChild(b);
  });
  kbdEl.appendChild(r);
});
function syncKeys() {
  kbdEl.querySelectorAll('.key').forEach(b => {
    const k = b.dataset.k;
    if (MODS.includes(k)) b.classList.toggle('latched', mods[k]);
    if (LOCKS.includes(k)) b.querySelector('.lt').classList.toggle('lit', locks[k]);
  });
  document.getElementById('ledCaps').classList.toggle('lit', locks.Caps);
  document.getElementById('ledNum').classList.toggle('lit', locks.NumLk);
  document.getElementById('ledScrl').classList.toggle('lit', locks.ScrLk);
}
function sendKey(k, m = {}) {
  readout.textContent = [m.Ctrl && 'CTRL', m.Alt && 'ALT', m.Shift && 'SHIFT', k.toUpperCase()].filter(Boolean).join('+');
  if (m.Ctrl && m.Alt && k === 'Del') { spkStop(); goBoot(); return; }
  keyDown(k);
}
kbdEl.addEventListener('pointerdown', e => {
  const b = e.target.closest('.key');
  if (!b) return;
  e.preventDefault(); ensureAudio();
  const k = b.dataset.k;
  if (MODS.includes(k)) { mods[k] = !mods[k]; syncKeys(); readout.textContent = k.toUpperCase(); return; }
  if (LOCKS.includes(k)) { locks[k] = !locks[k]; syncKeys(); return; }
  const snap = { ...mods };
  b.classList.add('on');
  const id = 'k' + e.pointerId;
  held.set(id, { el: b, k, t: 0, next: Sys.state === 'game' && Sys.game.pad === 'hopper' ? REPEAT_DELAY : Infinity });
  sendKey(k, snap);
  if (mods.Ctrl || mods.Alt || mods.Shift) { mods.Ctrl = mods.Alt = mods.Shift = false; syncKeys(); }
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => kbdEl.addEventListener(t, e => release('k' + e.pointerId)));
syncKeys();

/* physical keyboard (desktop testing) */
const PHYS = { ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Escape: 'Esc', Enter: 'Enter', ' ': 'Space', Delete: 'Del', Backspace: 'Bksp', Tab: 'Tab' };
const physKey = e => PHYS[e.key] || (/^F\d{1,2}$/.test(e.key) ? e.key : e.key.length === 1 ? e.key.toUpperCase() : null);
window.addEventListener('keydown', e => {
  const k = physKey(e);
  if (!k || ['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
  e.preventDefault();
  if (e.repeat && Sys.state === 'game' && Sys.game.pad !== 'hopper') return;
  sendKey(k, { Ctrl: e.ctrlKey, Alt: e.altKey, Shift: e.shiftKey });
});
window.addEventListener('keyup', e => { const k = physKey(e); if (k) keyUp(k); });

/* switch bar: pad/keys and layout on the left; sound and display on the right */
const modeBtn = document.getElementById('modeBtn'), layBtn = document.getElementById('layBtn');
function setMode(m) {
  ctlMode = m;
  document.getElementById('padPane').hidden = m !== 'pad';
  document.getElementById('kbdPane').hidden = m !== 'kbd';
  modeBtn.textContent = m === 'pad' ? 'Pad' : 'Keys';
  layBtn.hidden = m !== 'pad';
  held.forEach((_, id) => release(id));
  store.set('mode', m);
}
modeBtn.addEventListener('click', () => setMode(ctlMode === 'pad' ? 'kbd' : 'pad'));
// the layout button draws the current arrangement in miniature
function layIcon(spec, bias) {
  const r = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5"/>`;
  if (spec.kind === 'row') return spec.b.length === 1 ? r(12.5, 5, 9, 9) : r(6.5, 5, 9, 9) + r(18.5, 5, 9, 9);
  if (spec.kind === 'x') {
    const x0 = bias === 'right' ? 15 : bias === 'split' ? 8 : 1, fx = bias === 'right' ? 1 : 26;
    if (spec.eight) { let g = ''; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== 1 || j !== 1) g += r(x0 + j * 6, 1 + i * 6, 5, 5); return g + (spec.b.f ? r(fx, 1, 7, 17) : ''); }
    const d = `<path d="M${x0 + 6} 1h5v6l-2.5 2.5L${x0 + 6} 7zM${x0 + 6} 18h5v-6l-2.5-2.5L${x0 + 6} 12zM${x0} 6.5v5h6l2.5-2.5L${x0 + 6} 6.5zM${x0 + 17} 6.5v5h-6l-2.5-2.5L${x0 + 11} 6.5z"/>`;
    return spec.b.f ? d + r(fx, 1, 7, 17) : d;
  }
  if (spec.kind === 8) {
    let d = '';
    const x0 = bias === 'right' ? 13 : 1, fx = bias === 'right' ? 1 : 26;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (!(i === 1 && j === 1)) d += r(x0 + j * 6.5, 1 + i * 6, 5, 5);
    return d + r(fx, 1, 7, 17);
  }
  if (bias === 'slide') return r(1, 5, 32, 9) + '<path d="M6 9.5h22M9 7l-3 2.5L9 12M25 7l3 2.5L25 12"/>';
  const cols = COLS4[bias], X = [1, 12.5, 24];
  let d = '';
  cols.forEach((c, i) => {
    if (c === 's') d += spec.f ? r(X[i], 1, 9, 17) : r(X[i], 1, 9, 8) + r(X[i], 10, 9, 8);
    else d += r(X[i], 5, 9, 9);
  });
  return d;
}
function syncLayoutBtn() {
  const spec = Pad.cur; if (!spec) return;
  layBtn.innerHTML = `<svg viewBox="0 0 34 19" aria-hidden="true">${layIcon(spec, Pad.bias)}</svg>`;
  layBtn.disabled = spec.allow.length < 2;
  layBtn.setAttribute('aria-label', 'Pad layout: ' + Pad.bias);
}
layBtn.addEventListener('click', () => {
  const spec = Pad.cur; if (!spec || spec.allow.length < 2) return;
  const next = spec.allow[(spec.allow.indexOf(Pad.bias) + 1) % spec.allow.length];
  store.set(biasKey(), next); refreshPad();
});
const sndBtn = document.getElementById('sndBtn');
function toggleSound() { soundOn = !soundOn; store.set('sound', soundOn); sndBtn.textContent = soundOn ? 'Snd: on' : 'Snd: off'; if (!soundOn) spkStop(); }
sndBtn.addEventListener('click', () => { ensureAudio(); toggleSound(); });
sndBtn.textContent = soundOn ? 'Snd: on' : 'Snd: off';
document.getElementById('phosBtn').addEventListener('click', () => setPhosphor((phosIdx + 1) % PHOSPHORS.length));
// F1 (boss) and F10 (menu) as small chips, so they work without the keyboard
for (const k of ['F1', 'F10']) document.getElementById('k' + k).addEventListener('click', () => { held.forEach((_, id) => release(id)); ensureAudio(); keyDown(k); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && Sys.state === 'game' && !Sys.prompt) { held.forEach((_, id) => release(id)); askRow24('leave'); }
});
function requestWake() { try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch (e) {} }

/* ===== start ===== */
function start() {
  setPhosphor(phosIdx);
  setMode(store.get('mode', 'pad'));
  fit();
  goBoot();
  let last = performance.now();
  function frame(nowMs) {
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    last = nowMs;
    const now = nowMs / 1000;
    tickHeld(dt);
    sysUpdate(dt, now);
    refreshPad();
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
start();

