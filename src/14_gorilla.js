/* ===== D: GORILLA GORILLA =====
   Measured: a graphics-mode game; three stage screens copied from the original (game 1 coconuts, game 2 rivets,
   game 3 elevators). After the player count it asks TYPE NUMBER OF GAME WANTED <1,2,3>, plays its tune, draws the
   stage and starts after a short jingle. You step 2 columns every 0.2 s, climb a row every 0.41 s and a jump lasts
   0.5 s, one row up. Coconuts roll a column every 0.082 s and fall a row every 0.15 s; the gorilla throws one
   every 2.5 s and the first of each life drops straight into the drum and lights a fire. Fires step every 0.22 s.
   Jumping a coconut is 100 (two at once 300). The coco-masher swings every 0.1 s with a 131 Hz pulse; a smash
   freezes play 1.5 s and pays 300, 500 or 800. Bonus items pay 500. The bonus starts at 5000 and drops 100 every
   2 s. Elevators step every 0.33 s; the stage-3 gorilla bounces a spring every 1.34 s. Death: the original's tune,
   a halo 2.9 s later, and the stage redraws at 4.5 s. Reaching the mate plays the original rescue scene.
   Estimated (not observed): how often coconuts take a ladder, fire wandering, rivet points (100) and the
   gorilla's fall when the last rivet comes out. */
GAMES.d = (() => {
  const G = ASSETS.gg;
  // eased from the original a little: jumps hang 0.56 s (original 0.5; 2.3-2.7.5 used 0.65) and the gorilla throws
  // every 3.5 s (original 2.5)
  const STEP = 0.2, CLIMB = 0.41, JUMP = 0.56, PFALL = 0.2, ROLL = 0.082, CFALL = 0.15, THROW = 3.5;
  const FSTEP = 0.22, FCLIMB = 0.45, MASH = 11.5, ELEV = 0.33, SPRING = 1.34;
  const HX = {
    man: '7effdbffc3e7ff7e', life: '7effdbffc3e70000', coco: '000078cccccc7800', fireA: '102078cccccc7800', fireB: '201078cccccc7800',
    mashUp: '183c7e1818181800', headL: '020e3eff3e0e0200', headR: '80e0f8fef8e08000', shaft: '000000ff00000000',
    halo: '003c664242663c00', heart: '6cfefefe7c381000', flameA: '183060c060301800', flameB: '6030180c18306000',
    spring: 'aa55aa55aa55aa55', girder: '00000000000000ff', blank: '0000000000000000', pole: '0808080808080808',
    rivet: '0000000000ffffff', mate: '7e81a581bd9981ff'
  };
  const ITEMS = ['10387cfe381010ff', '387c38fefe3810ff', '10387cfe7c3810ff'];
  /* ---- glyphs: standard characters keep their codes; the game's own shapes borrow free codes ---- */
  const FONT_GG = {}, STD = new Map(), CODE = new Map();
  for (let c = 255; c >= 1; c--) STD.set(Array.from(FONT.subarray(c * 8, c * 8 + 8), b => b.toString(16).padStart(2, '0')).join(''), c);
  for (let c = 126; c >= 32; c--) STD.set(Array.from(FONT.subarray(c * 8, c * 8 + 8), b => b.toString(16).padStart(2, '0')).join(''), c);
  STD.set(HX.blank, 32);
  const PAGES = G.pages.map(p => { const b = b64bytes(p); return new Uint16Array(b.buffer, b.byteOffset, 2000); });
  const used = new Set(); for (const p of PAGES) for (const v of p) if (v < 256) used.add(v);
  const POOL = [];
  for (let c = 1; c < 256; c++) if (!used.has(c) && !(c >= 32 && c <= 126) && !(c >= 176 && c <= 223)) POOL.push(c);
  function code(hex) {
    if (CODE.has(hex)) return CODE.get(hex);
    let c = STD.get(hex);
    if (c === undefined || c === 1 || c === 2) {
      c = POOL.shift(); if (c === undefined) return 63;
      FONT_GG[c] = Array.from({ length: 8 }, (_, i) => parseInt(hex.substr(i * 2, 2), 16));
    }
    CODE.set(hex, c); return c;
  }
  const hexOf = v => v < 256 ? Array.from(FONT.subarray(v * 8, v * 8 + 8), b => b.toString(16).padStart(2, '0')).join('') : G.glyphs[v - 256];
  const orBottom = (h, b) => h.slice(0, 14) + b.slice(14) === h ? h : h.slice(0, 14) + (parseInt(h.slice(14), 16) | parseInt(b.slice(14), 16)).toString(16).padStart(2, '0');

  let S;
  const base = new Array(2000);             // what the stage shows under the moving things (hex)
  const B = (r, c) => base[r * 80 + c] || HX.blank;
  const setBase = (r, c, h) => { base[r * 80 + c] = h; putc(c, r, code(h), 15); };
  const show = (r, c) => { if (r >= 0 && r < 24 && c >= 0 && c < 80) putc(c, r, code(B(r, c)), 15); };
  // a moving shape keeps the girder line under it
  function spr(r, c, h) { if (r < 0 || r > 23 || c < 0 || c > 79) return; const b = B(r, c); putc(c, r, code(b.endsWith('ff') ? orBottom(h, b) : h), 15); }
  const girder = (r, c) => r >= 0 && r < 24 && c >= 0 && c < 80 && B(r, c).endsWith('ff');
  const byte = (h, i) => parseInt(h.substr(i * 2, 2), 16);
  const railL = h => (byte(h, 1) === 8 && byte(h, 2) === 8) || (byte(h, 5) === 8 && byte(h, 6) === 8);
  const railR = h => (byte(h, 1) === 16 && byte(h, 2) === 16) || (byte(h, 5) === 16 && byte(h, 6) === 16);
  const seg = (r, c) => r >= 0 && r < 24 && railL(B(r, c - 1)) && railR(B(r, c + 1));
  const canUp = (r, c) => seg(r - 1, c) || (seg(r, c) && girder(r - 1, c));
  const canDown = (r, c) => seg(r + 1, c) || (seg(r, c) && girder(r + 1, c));

  /* ---- HUD ---- */
  const P = () => S.pl[S.cur];
  function hud() {
    const p = P();
    put(0, 1, '       ', 15, 0); const s = String(p.score); put(7 - s.length, 1, s, 15, 0);
    put(70, 1, '       ', 15, 0); const h = String(S.hi); put(77 - h.length, 1, h, 15, 0);
    put(73, 3, 'L=' + String(p.level).padStart(2, '0'), 15, 0);
    put(74, 6, String(Math.max(0, S.bonus)).padStart(4, ' '), 15, 0);
  }
  function lifeIcons(n) { for (let i = 0; i < 4; i++) putc(2 + i, 3, i < n ? code(HX.life) : 32, 15); }
  function addScore(v) { const p = P(); p.score += v; if (p.score > S.hi) { S.hi = p.score; store.set('hi.d', S.hi); } hud(); }
  function popup(r, c, text) { S.pops.push({ r, c, text, t: 0.4 }); put(c, r, text, 15, 0); }

  /* ---- stage setup ---- */
  function drawStage() {
    const pg = PAGES[P().stage - 1];
    cls();
    for (let i = 0; i < 2000; i++) { base[i] = hexOf(pg[i]); }
    for (let r = 0; r < 24; r++) for (let c = 0; c < 80; c++) show(r, c);
    put(0, 0, '  ' + (S.cur ? '2' : '1') + ' UP', 15, 0);
    put(19, 24, BAR.trim(), 15, 0);
    S.bonus = 5000; hud();
    const st = P().stage;
    // rivets and elevator shafts come from the screen itself
    S.rivets = []; S.shafts = [];
    for (let r = 0; r < 24; r++) for (let c = 0; c < 80; c++) if (B(r, c) === HX.rivet) S.rivets.push([r, c]);
    if (st === 3) {
      for (let c = 0; c < 80; c++) if (B(12, c) === HX.pole) {
        const rows = []; for (let r = 7; r <= 22; r++) if (B(r, c) === HX.girder) rows.push(r);
        const up = S.shafts.length === 0;
        S.shafts.push({ c, up, pos: rows.map(r => r - 7), t: 0 });
      }
    }
  }
  function startLife() {
    const st = P().stage;
    drawStage();
    S.man = st === 3 ? { r: 22, c: 14 } : { r: 23, c: 20 };
    Object.assign(S.man, { mode: 'walk', t: 0, face: 1, jt: 0, jdx: 0, over: 0, fall: 0, mash: 0, swing: 0, pulse: 0 });
    S.cocos = []; S.fires = []; S.springs = []; S.pops = [];
    S.throwT = 0; S.firstDrop = st === 1; S.bonusT = 0; S.fireT = 3; S.springT = 0.2; S.freeze = 0; S.flick = 0;
    lifeIcons(P().lives);
    if (st === 3) { S.fires.push(newFire(15, 58)); S.fires.push(newFire(19, 26)); }
    drawMan();
    S.phase = 'ready'; S.timer = 1.2; S.jingle = false;
  }
  const newFire = (r, c) => ({ r, c, dir: Math.random() < 0.5 ? -1 : 1, mode: 'walk', t: 0, dr: 0 });

  /* ---- drawing the player ---- */
  function eraseMan() {
    const m = S.man;
    show(m.r, m.c);
    if (m.mash) { show(m.r - 1, m.c); for (const d of [-2, -1, 1, 2]) show(m.r, m.c + d); }
  }
  function drawMan() {
    const m = S.man;
    if (m.mash) {
      if (m.swing) { spr(m.r, m.c + m.face, HX.shaft); spr(m.r, m.c + 2 * m.face, m.face < 0 ? HX.headL : HX.headR); }
      else spr(m.r - 1, m.c, HX.mashUp);
    }
    spr(m.r, m.c, HX.man);
  }

  /* ---- player ---- */
  function held(...k) { return k.some(x => S.keys.has(x)); }
  function die() {
    S.phase = 'dying'; S.timer = 0; S.halo = false; spkStop(); clip('gg_die');
  }
  function landCheck() {
    const m = S.man;
    if (girder(m.r, m.c)) { if (m.fall >= 2) return die(); m.mode = 'walk'; m.fall = 0; return; }
    m.mode = 'fall'; m.t = 0;
  }
  function touchItems() {
    const m = S.man, h = B(m.r, m.c);
    if (ITEMS.includes(h)) { setBase(m.r, m.c, HX.girder); addScore(500); popup(m.r - 2, m.c - 1, '500'); tone(479, 0.3); }
  }
  function pullRivets(c0, c1) {
    const m = S.man;
    for (let i = S.rivets.length - 1; i >= 0; i--) {
      const [r, c] = S.rivets[i];
      if (r === m.r && c >= Math.min(c0, c1) && c <= Math.max(c0, c1) && c !== m.c) {
        setBase(r, c, HX.blank); S.rivets.splice(i, 1); addScore(100); popup(r - 2, c - 1, '100'); tone(479, 0.15);
      }
    }
    if (P().stage === 2 && !S.rivets.length) clearStage();
  }
  function stepMan(dt) {
    const m = S.man;
    const L = held('Left', '4'), R = held('Right', '6'), U = held('Up', '8'), D = held('Down', '2');
    if (L) m.face = -1; else if (R) m.face = 1;
    if (m.mash) {
      m.mash -= dt; m.st = (m.st || 0) + dt;
      if (m.st >= 0.1) { m.st -= 0.1; eraseMan(); m.swing = 1 - m.swing; drawMan(); }
      m.pulse -= dt; if (m.pulse <= 0) { clip('gg_pulse'); m.pulse = 0.2; }
      if (m.mash <= 0) { eraseMan(); m.mash = 0; drawMan(); }
    }
    m.t += dt;
    if (m.mode === 'walk') {
      if (S.jumpReq && !m.mash) {
        S.jumpReq = false;
        eraseMan(); m.mode = 'jump'; m.r--; m.jt = 0; m.jdx = L ? -1 : R ? 1 : 0; m.over = 0; m.moved = 0; m.base = m.r + 1; drawMan();
        // grab a coco-masher hanging above
        if (B(m.r - 1, m.c) === HX.mashUp) { setBase(m.r - 1, m.c, HX.blank); m.mash = MASH; m.swing = 0; m.st = 0; m.pulse = 0; }
        return;
      }
      S.jumpReq = false;
      if (m.t < STEP) return;
      // 2.3: you may climb with the coco-masher
      if ((U && canUp(m.r, m.c)) || (D && canDown(m.r, m.c))) { m.mode = 'climb'; m.t = 0; return; }
      if (L || R) {
        const nc = m.c + (L ? -2 : 2);
        if (nc < 8 || nc > 71) return;
        eraseMan(); const oc = m.c; m.c = nc; m.t = 0; clip('gg_step');
        if (P().stage === 2) pullRivets(oc, nc);
        touchItems(); drawMan();
        if (!girder(m.r, m.c)) { m.mode = 'fall'; m.t = 0; m.fall = 0; }
      }
    } else if (m.mode === 'climb') {
      S.jumpReq = false;
      if (girder(m.r, m.c) && !U && !D) { m.mode = 'walk'; m.t = STEP; return; }
      if (m.t < CLIMB) return;
      if (U && canUp(m.r, m.c)) { eraseMan(); m.r--; m.t = 0; clip('gg_step'); drawMan(); }
      else if (D && canDown(m.r, m.c)) { eraseMan(); m.r++; m.t = 0; clip('gg_step'); drawMan(); }
      else if (girder(m.r, m.c) && (L || R)) { m.mode = 'walk'; m.t = STEP; }
      if (girder(m.r, m.c) && !U && !D) m.mode = 'walk';
      if (P().stage !== 2 && m.r <= S.goalRow) clearStage();
    } else if (m.mode === 'jump') {
      m.jt += dt;
      if (m.jdx && !m.moved && m.jt >= 0.26) { eraseMan(); m.c = Math.max(8, Math.min(71, m.c + 2 * m.jdx)); m.moved = 1; drawMan(); }
      if (m.jt >= JUMP) {
        eraseMan(); m.r++; if (m.jdx) m.c = Math.max(8, Math.min(71, m.c + 2 * m.jdx));
        m.t = 0; m.fall = 0;
        if (P().stage === 2) pullRivets(m.c - 4 * m.jdx, m.c);
        touchItems(); drawMan();
        if (m.over) { const v = m.over > 1 ? 300 : 100; addScore(v); popup(m.r - 2, m.c - 1, String(v)); tone(479, 0.15); }
        m.mode = 'walk'; landCheck();
      }
    } else if (m.mode === 'fall') {
      S.jumpReq = false;
      if (m.t < PFALL) return;
      m.t = 0; eraseMan(); m.r++; m.fall++;
      if (m.r > 23) return die();
      drawMan();
      if (girder(m.r, m.c) || onLift(m.r, m.c)) { if (m.fall >= 2) return die(); m.mode = 'walk'; m.fall = 0; }
    }
  }
  const onLift = (r, c) => false;

  /* ---- coconuts (stage 1) ---- */
  const rowDir = r => ([8, 14, 20].includes(r) ? 1 : -1);
  function drawCoco(o) { spr(o.r, o.c, HX.coco); }
  function stepCoco(o) {
    show(o.r, o.c);
    if (o.mode === 'roll') {
      // at a ladder top a coconut may take the ladder, more often when you are below
      if (seg(o.r + 1, o.c) && !o.justLad) {
        const m = S.man, chance = m.r > o.r && Math.abs(m.c - o.c) < 16 ? 0.45 : 0.22;
        if (Math.random() < chance) { o.mode = 'fall'; o.justLad = true; o.r++; o.t = -CFALL + ROLL; return drawCoco(o); }
      }
      o.justLad = false;
      o.c += o.dir;
      if (o.r === 23 && o.c <= 19) {
        // into the drum: the first one lights it and lets a fire out
        o.dead = true;
        if (o.first || (S.fires.length < 3 && Math.random() < 0.5)) { const f = newFire(23, 18); f.dir = 1; S.fires.push(f); }
        if (o.first) S.drumLit = true;
        return;
      }
      if (!girder(o.r, o.c)) { o.mode = 'fall'; o.t = -CFALL + ROLL; }
    } else {
      o.r++;
      if (o.r > 23) { o.dead = true; return; }
      if (girder(o.r, o.c) && !(o.straight && o.r < 23)) {
        o.mode = 'roll'; o.dir = rowDir(o.r);
        if (o.straight) { o.dir = -1; o.straight = false; }
      }
    }
    if (!o.dead) drawCoco(o);
  }
  /* ---- fires ---- */
  function drawFire(o) { spr(o.r, o.c, S.flick ? HX.fireA : HX.fireB); }
  function stepFire(o) {
    show(o.r, o.c);
    const m = S.man;
    if (o.mode === 'walk') {
      if (seg(o.r - 1, o.c) || seg(o.r + 1, o.c)) {
        if (Math.random() < 0.3) {
          const wantUp = m.r < o.r ? 0.75 : 0.25;
          const up = seg(o.r - 1, o.c) && (!seg(o.r + 1, o.c) || Math.random() < wantUp);
          o.mode = 'climb'; o.dr = up ? -1 : 1; o.t = -FCLIMB + FSTEP;
          return drawFire(o);
        }
      }
      if (Math.random() < 0.08) o.dir = -o.dir;
      const nc = o.c + o.dir;
      if (!girder(o.r, nc) || nc < 9 || nc > 70) o.dir = -o.dir; else o.c = nc;
    } else {
      o.r += o.dr;
      if (girder(o.r, o.c) && !seg(o.r + o.dr, o.c)) { o.mode = 'walk'; o.t = 0; }
      else if (girder(o.r, o.c) && Math.random() < 0.5) { o.mode = 'walk'; }
    }
    drawFire(o);
  }
  /* ---- springs (stage 3) ---- */
  function drawSpring(o, on) { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) on ? putc(o.x + dx, o.y + dy, code(HX.spring), 15) : show(o.y + dy, o.x + dx); }
  function stepSpring(o) {
    drawSpring(o, false);
    o.n++;
    if (o.x < o.drop) { o.x += 2; o.y = 3 + (o.n % 4 < 2 ? 0 : 1); }
    else { o.y++; if (o.y > 21) { o.dead = true; return; } }
    drawSpring(o, true);
  }
  /* ---- elevators (stage 3) ---- */
  function stepShaft(sh) {
    const m = S.man;
    const riding = sh.pos.findIndex(p => p <= 15 && 7 + p === m.r && Math.abs(m.c - sh.c) <= 2 && m.mode === 'walk');
    for (const p of sh.pos) if (p <= 15) for (let dx = -2; dx <= 2; dx++) setBase(7 + p, sh.c + dx, dx === 0 ? HX.pole : HX.blank);
    sh.pos = sh.pos.map(p => (p + (sh.up ? 20 : 1)) % 21);
    for (const p of sh.pos) if (p <= 15) for (let dx = -2; dx <= 2; dx++) setBase(7 + p, sh.c + dx, HX.girder);
    if (riding >= 0) {
      const p = sh.pos[riding];
      eraseMan();
      if (sh.up && p === 20) { return die(); }
      if (p > 15) { m.mode = 'fall'; m.t = 0; m.fall = 0; drawMan(); return; }
      m.r = 7 + p; drawMan();
      if (sh.up && m.r <= 7) { /* carried into the top */ }
    } else if (m.mode === 'walk' && !girder(m.r, m.c)) { m.mode = 'fall'; m.t = 0; m.fall = 0; }
    drawMan();
  }

  /* ---- collisions ---- */
  function hit() {
    const m = S.man;
    const at = (r, c) => r === m.r && c === m.c;
    for (const o of S.cocos.concat(S.fires)) {
      if (o.first) continue;               // the drum coconut passes you; the fire it lights does not
      if (m.mash) {
        const inSwing = (o.r === m.r && (m.face < 0 ? o.c >= m.c - 3 && o.c < m.c : o.c > m.c && o.c <= m.c + 3)) || (o.c === m.c && (o.r === m.r - 1 || o.r === m.r - 2));
        if (inSwing) { smash(o); return false; }
      }
      if (at(o.r, o.c)) return true;
      // a rolling coconut or fire right next to you and heading your way counts as touching
      if (o.r === m.r && Math.abs(o.c - m.c) === 1 && (o.mode === 'roll' || o.mode === 'walk') && o.dir === Math.sign(m.c - o.c) && m.mode !== 'jump') return true;
      if (m.mode === 'jump' && o.r === m.r + 1 && o.c === m.c && !o.jumped) { o.jumped = true; m.over++; }
    }
    for (const o of S.springs) if (m.r >= o.y && m.r <= o.y + 1 && m.c >= o.x && m.c <= o.x + 2) return true;
    return false;
  }
  function smash(o) {
    const m = S.man;
    show(o.r, o.c); o.dead = true;
    const v = [300, 500, 800][Math.floor(Math.random() * 3)];
    addScore(v); popup(m.r - 2, m.face < 0 ? m.c - 3 : m.c + 1, String(v));
    S.freeze = 1.5; clip('gg_smash');
  }

  /* ---- stage clear ---- */
  function clearStage() {
    if (S.phase !== 'play') return;
    S.phase = 'clear'; S.timer = 4.0; spkStop(); clip('gg_clear');
    addScore(Math.max(0, S.bonus));
    const m = S.man, st = P().stage;
    if (st === 1) S.movie = parseGG(G.clear1);
    else if (st === 3) spr(m.r - 1, m.c - 2, HX.heart);
    else { S.fallG = { y: 2, t: 0 }; spr(m.r - 1, m.c, HX.heart); }
  }
  function parseGG(b64s) {
    const b = b64bytes(b64s), ev = []; let i = 0, t = 0;
    while (i < b.length) { let v = 0, sh = 0; for (;;) { const x = b[i++]; v |= (x & 127) << sh; if (!(x & 128)) break; sh += 7; } t += v; ev.push([t / 1000, b[i], b[i + 1], b[i + 2] | (b[i + 3] << 8)]); i += 4; }
    return { ev, i: 0, t: 0 };
  }
  // stage 2: the gorilla tumbles once the last rivet is out
  function gorillaFall(dt) {
    const f = S.fallG;
    if (!f.started) {
      f.started = true;
      for (let r = 2; r <= 7; r++) for (let c = 36; c <= 44; c++) setBase(r, c, r === 7 ? HX.girder : HX.blank);
    }
    f.t += dt;
    if (f.t < 0.12 || f.y >= 18) return;
    f.t = 0;
    for (let r = f.y; r < f.y + 5; r++) for (let c = 36; c <= 44; c++) show(r, c);
    f.y++;
    const UPSIDE = ['  ' + C(219) + '   ' + C(219) + '  ', C(219) + ' ' + C(219).repeat(5) + ' ' + C(219), C(219) + C(220) + C(219).repeat(5) + C(220) + C(219),
      '  ' + C(179) + 'O O' + C(179) + '  ', '  ' + C(192) + C(196).repeat(3) + C(217) + '  '];
    UPSIDE.forEach((s, k) => { for (let x = 0; x < 9; x++) if (s[x] !== ' ') putc(36 + x, f.y + k, s.charCodeAt(x), 15); });
  }

  function nextLevel() {
    const p = P();
    p.stage = p.stage % 3 + 1; if (p.stage === 1) p.level++;
    S.goalRow = p.stage === 1 ? 4 : 2;
    startLife();
  }
  function lose() {
    const p = P(); p.lives--;
    if (S.pl.every(q => q.lives <= 0)) { S.phase = 'over'; lifeIcons(0); gameOver(); return; }
    if (S.n > 1) { const o = (S.cur + 1) % S.n; if (S.pl[o].lives > 0) S.cur = o; }
    S.goalRow = P().stage === 1 ? 4 : 2;
    startLife();
  }

  return {
    view: [0, 80], pad: 'gorilla', font: FONT_GG,
    padText(k) { if (!S || S.phase !== 'ask') return { Up: '', Down: '', Left: '', Right: '', Space: 'JUMP' }[k] ?? null; return { Left: 'GAME 1', Up: 'GAME 2', Right: 'GAME 3', Down: '', Space: 'GAME 1' }[k] ?? null; },
    start(n) {
      S = { n, cur: 0, pl: Array.from({ length: n }, () => ({ score: 0, lives: 3, stage: 1, level: 1 })), hi: store.get('hi.d', 0), keys: new Set(), pops: [], cocos: [], fires: [], springs: [] };
      cls(); put(22, 12, 'TYPE NUMBER OF GAME WANTED.  <1,2,3>', 15, 0);
      S.phase = 'ask';
    },
    stop() { spkStop(); },
    key(k, down) {
      if (down) S.keys.add(k); else S.keys.delete(k);
      if (!down) return;
      if (S.phase === 'ask') {
        // the pad offers the three games on LEFT, UP and RIGHT
        const g = { '1': 1, '2': 2, '3': 3, Space: 1, Fire: 1, Enter: 1, Left: 1, Up: 2, Right: 3 }[k];
        if (!g) return;
        for (const p of S.pl) p.stage = g;
        S.goalRow = g === 1 ? 4 : 2;
        S.phase = 'intro'; S.timer = 4.7; clip('gg_intro');
        return;
      }
      if ((k === 'Space' || k === 'Fire') && S.phase === 'play') S.jumpReq = true;
    },
    update(dt) {
      if (S.phase === 'ask' || S.phase === 'over') return;
      if (S.phase === 'intro') { S.timer -= dt; if (S.timer <= 0) startLife(); return; }
      if (S.phase === 'ready') {
        S.timer -= dt;
        if (!S.jingle && S.timer <= 0) { S.jingle = true; clip('gg_start'); S.timer = 1.0; lifeIcons(P().lives - 1); return; }
        if (S.jingle && S.timer <= 0) { S.phase = 'play'; S.bonus -= 100; hud(); }
        return;
      }
      if (S.phase === 'dying') {
        S.timer += dt;
        if (S.timer >= 2.94 && !S.halo) { S.halo = true; spr(S.man.r - 1, S.man.c, HX.halo); }
        if (S.timer >= 4.46) { S.halo = false; lose(); }
        return;
      }
      if (S.phase === 'clear') {
        S.timer -= dt;
        if (S.movie) { const mv = S.movie; mv.t += dt; while (mv.i < mv.ev.length && mv.ev[mv.i][0] <= mv.t) { const [, r, c, g] = mv.ev[mv.i++]; putc(c, r, code(hexOf(g)), 15); } }
        if (S.fallG) gorillaFall(dt);
        if (S.timer <= 0) { S.movie = null; S.fallG = null; nextLevel(); }
        return;
      }
      if (S.phase !== 'play') return;
      // popups fade
      for (const q of S.pops) { q.t -= dt; if (q.t <= 0) for (let k = 0; k < q.text.length; k++) show(q.r, q.c + k); }
      S.pops = S.pops.filter(q => q.t > 0);
      if (S.freeze > 0) { S.freeze -= dt; return; }
      const st = P().stage;
      S.bonusT += dt; if (S.bonusT >= 2.0) { S.bonusT -= 2.0; S.bonus -= 100; hud(); if (S.bonus <= 0) { S.bonus = 0; hud(); return die(); } }
      // fire flicker (and the drum flame in stage 1)
      S.flickT = (S.flickT || 0) + dt;
      if (S.flickT >= 0.1) {
        S.flickT -= 0.1; S.flick ^= 1;
        for (const o of S.fires) drawFire(o);
        if (st === 1 && S.drumLit) { spr(21, 16, S.flick ? HX.flameA : HX.flameB); spr(21, 17, S.flick ? HX.flameA : HX.flameB); }
      }
      stepMan(dt);
      if (S.phase !== 'play') return;
      const speed = 1 + 0.1 * (P().level - 1);
      if (st === 1) {
        S.throwT -= dt;
        if (S.throwT <= 0) {
          S.throwT = THROW;
          if (S.firstDrop) { S.firstDrop = false; S.cocos.push({ r: 8, c: 20, mode: 'fall', straight: true, first: true, t: 0, dir: -1 }); }
          else S.cocos.push({ r: 8, c: 24, mode: 'roll', dir: 1, t: 0 });
          drawCoco(S.cocos[S.cocos.length - 1]);
        }
        for (const o of S.cocos) {
          o.t += dt * speed;
          // the first coconut drops straight past the girders a little slower (0.22 s a row)
          const per = () => o.mode === 'roll' ? ROLL : o.straight ? 0.22 : CFALL;
          while (!o.dead && o.t >= per()) { o.t -= per(); stepCoco(o); }
        }
        S.cocos = S.cocos.filter(o => !o.dead);
      }
      if (st === 2) {
        S.fireT -= dt;
        if (S.fireT <= 0 && S.fires.length < 5) { S.fireT = 3.5 + Math.random() * 2; const [r, c] = [[15, 13], [19, 11], [23, 9]][Math.floor(Math.random() * 3)]; S.fires.push(newFire(r, c)); }
      }
      if (st === 3) {
        for (const sh of S.shafts) { sh.t += dt; while (sh.t >= ELEV) { sh.t -= ELEV; stepShaft(sh); if (S.phase !== 'play') return; } }
        S.springT -= dt;
        if (S.springT <= 0) { S.springT = SPRING; S.springs.push({ x: 14, y: 3, n: 0, t: 0, drop: Math.random() < 0.5 ? 54 : 56 }); }
        for (const o of S.springs) { o.t += dt; while (!o.dead && o.t >= 0.034) { o.t -= 0.034; stepSpring(o); } }
        S.springs = S.springs.filter(o => !o.dead);
      }
      for (const o of S.fires) { o.t += dt * speed; const per = o.mode === 'walk' ? FSTEP : FCLIMB; while (o.t >= per) { o.t -= per; stepFire(o); } }
      S.fires = S.fires.filter(o => !o.dead);
      drawMan();
      if (hit()) return die();
    }
  };
})();
