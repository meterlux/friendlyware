/* ===== C: BUG BLASTER =====
   Measured: a graphics-mode game, all white. Field between two mushroom borders (columns 16 and 64);
   mushrooms take four hits (each shot clips one more row off the original shape); a 14-segment O centipede
   enters at the top and runs about 18 columns a second, dropping a row at walls and mushrooms; your ▲ blaster
   moves about 16 columns a second near the bottom. Points: mushroom 1, body 10, head 100, spider 300-900.
   Sound: a 98 Hz thump about every 0.45 s while the centipede marches; death is a recorded clip. */
GAMES.c = (() => {
  const hex = h => Array.from({ length: 8 }, (_, i) => parseInt(h.substr(i * 2, 2), 16));
  const M4 = 1, M3 = 3, M2 = 4, M1 = 5, SPIDER = 6, BURST = 7;   // borrowed codes for the custom shapes
  const FONT_BB = { [M4]: hex('387cfefe38383800'), [M3]: hex('387cfefe38000000'), [M2]: hex('387cfefe00000000'), [M1]: hex('387c000000000000'),
    [SPIDER]: hex('c6386cc6c66c3800'), [BURST]: hex('66a5c31818c3a566') };
  const MUSH = [0, M1, M2, M3, M4];
  const XL = 17, XR = 63, PLAYER_TOP = 18, SEG = 79, SHOT = 24, SHIP = 30;
  // 2.7.5: the blaster moves 12 columns a second (the original's 16 overshoots under a thumb)
  const SEG_STEP = 0.055, SHIP_STEP = 1 / 12, SHOT_STEP = 1 / 45;
  const hiKey = 'hi.c';
  let S;
  function addScore(v) {
    const p = S.p[S.cur]; p.score += v; if (p.score > S.hi) { S.hi = p.score; store.set(hiKey, S.hi); }
    put(0, 2, ' '.repeat(16), 15, 0); const s = String(p.score); put(11 - s.length, 2, s, 15, 0);
  }
  function lives() { put(0, 4, ' '.repeat(16), 15, 0); for (let i = 0; i < S.p[S.cur].lives - 1; i++) putc(4 + i, 4, SHIP, 15); }
  const mAt = (r, x) => S.mush[r * 80 + x];
  function drawM(r, x) { const h = mAt(r, x); putc(x, r, h ? MUSH[h] : 32, 15); }
  function field() {
    cls();
    put(4, 0, 'SCORE', 15, 0);
    for (let r = 0; r <= 23; r++) { putc(16, r, M4, 15); putc(64, r, M4, 15); }
    for (let i = 0; i < 80 * 25; i++) if (S.mush[i]) drawM(Math.floor(i / 80), i % 80);
    put(19, 24, BAR.trim(), 15, 0);
    addScore(0); lives();
  }
  function newCentipede(n = 14) {
    S.segs = [];
    for (let i = 0; i < n; i++) S.segs.push({ r: 0, x: 43 - i, dx: 1, head: i === 0, down: 1 });
  }
  function freshMushrooms() {
    S.mush = new Uint8Array(2000);
    for (let i = 0; i < 38; i++) { const r = 1 + Math.floor(Math.random() * 21), x = XL + Math.floor(Math.random() * (XR - XL + 1)); S.mush[r * 80 + x] = 4; }
  }
  function startLife() {
    S.ship = { r: 23, x: 40 }; S.shot = null; S.spider = null; S.spiderT = 4 + Math.random() * 4;
    newCentipede(); S.phase = 'play'; S.segT = 0; S.thumpT = 0; S.shipT = 0;
    field(); putc(S.ship.x, S.ship.r, SHIP, 15);
  }
  function moveSegs() {
    for (const s of S.segs) putc(s.x, s.r, mAt(s.r, s.x) ? MUSH[mAt(s.r, s.x)] : 32, 15);
    // each segment follows the logic of a head: step sideways, or drop a row and turn at walls and mushrooms
    for (const s of S.segs) {
      const nx = s.x + s.dx;
      if (nx < XL || nx > XR || mAt(s.r, nx)) {
        s.dx = -s.dx;
        let nr = s.r + s.down;
        if (nr > 23) { s.down = -1; nr = s.r - 1; }
        if (nr < PLAYER_TOP && s.down < 0) { s.down = 1; nr = s.r + 1; }
        s.r = nr;
      } else s.x = nx;
    }
    for (const s of S.segs) putc(s.x, s.r, SEG, 15);
  }
  function killShip() { S.phase = 'dead'; S.timer = 2.0; clip('bug_die'); putc(S.ship.x, S.ship.r, BURST, 15); }
  return {
    view: [0, 80], pad: 'eight', font: FONT_BB,
    start(n) {
      S = { n, cur: 0, p: Array.from({ length: n }, () => ({ score: 0, lives: 5 })), hi: store.get(hiKey, 0), held: new Set() };
      freshMushrooms(); startLife();
    },
    stop() { spkStop(); },
    key(k, down) {
      if (down) S.held.add(k); else S.held.delete(k);
      // one shot on screen at a time, as in the original; holding FIRE refires the moment it is gone (2.7.3),
      // and a tap while a shot is still flying is kept for 0.25 s instead of being dropped
      if (k === 'Space' || k === 'Fire') { S.firing = down; if (down) S.fireBuf = 0.25; }
    },
    update(dt) {
      if (S.phase === 'dead') {
        S.timer -= dt;
        if (S.timer <= 0) {
          S.p[S.cur].lives--;
          if (S.p.every(q => q.lives <= 0)) { S.phase = 'over'; gameOver(); return; }
          if (S.n > 1) { const o = (S.cur + 1) % S.n; if (S.p[o].lives > 0) S.cur = o; }
          startLife();
        }
        return;
      }
      if (S.phase !== 'play') return;
      const h = S.held;
      // blaster: 8 directions; + gives a burst of speed
      const up = h.has('Up') || h.has('8') || h.has('7') || h.has('9'), dn = h.has('Down') || h.has('2') || h.has('1') || h.has('3');
      const lf = h.has('Left') || h.has('4') || h.has('7') || h.has('1'), rt = h.has('Right') || h.has('6') || h.has('9') || h.has('3');
      S.shipT += dt * (h.has('+') || h.has('=') ? 2 : 1);
      while (S.shipT >= SHIP_STEP) {
        S.shipT -= SHIP_STEP;
        const nr = Math.max(PLAYER_TOP, Math.min(23, S.ship.r + (dn ? 1 : 0) - (up ? 1 : 0)));
        const nx = Math.max(XL, Math.min(XR, S.ship.x + (rt ? 1 : 0) - (lf ? 1 : 0)));
        if ((nr !== S.ship.r || nx !== S.ship.x) && !mAt(nr, nx)) { putc(S.ship.x, S.ship.r, 32, 15); S.ship.r = nr; S.ship.x = nx; putc(nx, nr, SHIP, 15); }
      }
      // shot
      S.fireBuf = Math.max(0, (S.fireBuf || 0) - dt);
      if (!S.shot && (S.firing || S.fireBuf > 0)) { S.shot = { r: S.ship.r - 1, x: S.ship.x, t: SHOT_STEP }; S.fireBuf = 0; }
      if (S.shot) {
        S.shot.t += dt;
        while (S.shot && S.shot.t >= SHOT_STEP) {
          S.shot.t -= SHOT_STEP;
          const s = S.shot;
          if (getc(s.x, s.r) === SHOT) putc(s.x, s.r, 32, 15);
          s.r--;
          if (s.r < 0) { S.shot = null; break; }
          const seg = S.segs.findIndex(o => o.r === s.r && o.x === s.x);
          if (seg >= 0) {
            const o = S.segs[seg]; addScore(o.head ? 100 : 10);
            S.mush[o.r * 80 + o.x] = 4; drawM(o.r, o.x);
            if (S.segs[seg + 1]) S.segs[seg + 1].head = true;
            S.segs.splice(seg, 1); S.shot = null; break;
          }
          if (S.spider && Math.abs(S.spider.r - s.r) <= 0 && Math.abs(S.spider.x - s.x) <= 0) {
            const d = Math.abs(S.spider.r - S.ship.r); addScore(d <= 1 ? 900 : d <= 3 ? 600 : 300);
            putc(S.spider.x, S.spider.r, BURST, 15); S.spider = null; S.burstAt = [s.r, s.x, 0.3]; S.shot = null; break;
          }
          if (mAt(s.r, s.x)) {
            S.mush[s.r * 80 + s.x]--; if (!S.mush[s.r * 80 + s.x]) addScore(1);
            drawM(s.r, s.x); S.shot = null; break;
          }
          putc(s.x, s.r, SHOT, 15);
        }
      }
      if (S.burstAt) { S.burstAt[2] -= dt; if (S.burstAt[2] <= 0) { drawM(S.burstAt[0], S.burstAt[1]); S.burstAt = null; } }
      // centipede
      S.segT += dt;
      while (S.segT >= SEG_STEP) { S.segT -= SEG_STEP; moveSegs(); }
      S.thumpT -= dt; if (S.thumpT <= 0 && S.segs.length) { tone(98, 0.075); S.thumpT = 0.45; }
      if (!S.segs.length) { newCentipede(); }
      // spider zigzags across the lower field eating mushrooms
      S.spiderT -= dt;
      if (!S.spider && S.spiderT <= 0) S.spider = { r: 20, x: Math.random() < 0.5 ? XL : XR, dx: 0, dr: -1, t: 0 };
      if (S.spider) {
        const sp = S.spider; sp.t += dt;
        if (!sp.dx) sp.dx = sp.x === XL ? 1 : -1;
        if (sp.t >= 0.09) {
          sp.t = 0; putc(sp.x, sp.r, mAt(sp.r, sp.x) ? MUSH[mAt(sp.r, sp.x)] : 32, 15);
          sp.x += sp.dx; sp.r += sp.dr;
          if (sp.r <= PLAYER_TOP - 2 || sp.r >= 23) sp.dr = -sp.dr;
          if (Math.random() < 0.1) sp.dr = -sp.dr;
          if (mAt(sp.r, sp.x) && Math.random() < 0.3) { S.mush[sp.r * 80 + sp.x] = 0; }
          if (sp.x < XL || sp.x > XR) { S.spider = null; S.spiderT = 4 + Math.random() * 5; }
          else putc(sp.x, sp.r, SPIDER, 15);
        }
      }
      // collisions with the blaster
      if (S.segs.some(o => o.r === S.ship.r && o.x === S.ship.x) || (S.spider && S.spider.r === S.ship.r && S.spider.x === S.ship.x)) killShip();
    }
  };
})();
