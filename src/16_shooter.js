/* ===== F: SHOOTER =====
   Measured from the original: base ╔╦╩╦╗ on row 23 moves 30 columns a second; missiles ↑ climb 30 rows a
   second, two in the air at most. Bombers «═╬══╛ / ╘══╬═» fly at 15 or 8 columns a second; bombs ■ fall one
   row and one column (in the bomber's direction) every 0.0625 s. A bomber is worth 28 points, 36 after 500
   points. Bombers die silently; the fire, bomb, base explosion and new-base tune are recorded clips. */
GAMES.f = (() => {
  const BASE = C(201) + C(203) + C(202) + C(203) + C(187);
  const BL = C(174) + C(205) + C(206) + C(205) + C(205) + C(190);     // flying left
  const BR = C(212) + C(205) + C(205) + C(206) + C(205) + C(175);     // flying right
  const MISSILE = 24, BOMB = 254, SPARK = 248;
  const BASE_RATE = 1 / 30, MISSILE_RATE = 1 / 30, BOMB_RATE = 0.0625;
  const hiKey = 'hi.f';
  let S;
  const level = () => Math.floor(S.p[S.cur].score / 500);
  const value = () => 28 + 8 * level();
  function header(now) {
    const off = Math.floor(now / 0.267) % 2 === 1 && S.phase !== 'over';
    put(0, 0, ' '.repeat(80), 0, 7);
    if (!(off && S.cur === 0)) put(0, 0, 'PLAYER 1 SCORE :', 0, 7);
    put(31, 0, 'HIGH SCORE :', 0, 7);
    if (!(off && S.cur === 1)) put(57, 0, 'PLAYER 2 SCORE :', 0, 7);
    const sc = (v, end) => { if (v > 0) put(end - String(v).length + 1, 0, String(v), 0, 7); };
    sc(S.p[0].score, 20); sc(S.hi, 48); if (S.n > 1) sc(S.p[1].score, 77);
  }
  function status() {
    put(0, 24, ' '.repeat(80), 0, 7);
    for (let i = 0; i < S.p[S.cur].lives - 1; i++) putc(1 + i, 24, 2, 0x70);
    put(17, 24, BAR, 0, 7);
  }
  const drawBase = on => put(S.bx, 23, on ? BASE : '     ', 2, 0);
  function clearField() { for (let r = 1; r <= 23; r++) put(0, r, ' '.repeat(80), 7, 0); }
  function newLife() {
    clearField(); S.bombers = []; S.bombs = []; S.missiles = []; S.sparks = [];
    clip('sh_tune'); S.phase = 'tune'; S.timer = 2.55;
  }
  function spawnBomber() {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const lv = level();
    const fast = Math.random() < 0.55 + 0.05 * lv;
    const rate = (fast ? 0.067 : 0.125) / (1 + 0.1 * lv);
    const row = 2 + Math.floor(Math.random() * 14);
    if (S.bombers.some(b => b.row === row)) return;
    S.bombers.push({ row, x: dir < 0 ? 80 : -6, dir, rate, t: 0, dropT: 0.6 + Math.random() * 1.8, dead: 0, parts: null });
  }
  function drawBomber(b, on) {
    const s = b.dir < 0 ? BL : BR;
    for (let k = 0; k < 6; k++) { const x = b.x + k; if (x >= 0 && x < 80) putc(x, b.row, on ? s.charCodeAt(k) : 32, on ? 2 : 7); }
  }
  function spark(x, y, fg, life) { if (x >= 0 && x < 80 && y >= 1 && y <= 23) { S.sparks.push({ x, y, life, fg }); putc(x, y, SPARK, fg); } }
  function hitBomber(b) {
    b.dead = 0.7; b.parts = [0, 1, 2, 3, 4, 5].filter(k => b.x + k >= 0 && b.x + k < 80);
    const p = S.p[S.cur]; p.score += value(); if (p.score > S.hi) { S.hi = p.score; store.set(hiKey, S.hi); }
  }
  function baseHit() {
    S.phase = 'boom'; S.timer = 0; clip('sh_boom');
    S.baseParts = [0, 1, 2, 3, 4];
  }
  return {
    view: [0, 80], pad: 'lrf',
    start(n) {
      S = { n, cur: 0, p: Array.from({ length: n }, () => ({ score: 0, lives: 3 })), hi: store.get(hiKey, 0),
            bx: 31, held: { L: false, R: false }, fire: false, bombers: [], bombs: [], missiles: [], sparks: [],
            phase: 'tune', timer: 2.55, mt: 0, bt: 0, spawnT: 1 };
      cls(); clearField(); status(); clip('sh_tune');
    },
    stop() { spkStop(); },
    key(k, down) {
      if (k === 'Left' || k === '4') S.held.L = down;
      if (k === 'Right' || k === '6') S.held.R = down;
      if ((k === 'Space' || k === 'Fire') && down && S.phase === 'play' && S.missiles.length < 2) {
        S.missiles.push({ x: S.bx + 2, y: 23, t: 0 }); clip('sh_fire');
      }
    },
    update(dt, now) {
      header(now);
      if (S.phase === 'tune') {
        S.timer -= dt;
        if (S.timer <= 0) { S.phase = 'play'; status(); drawBase(true); }
        return;
      }
      if (S.phase === 'boom') {
        S.timer += dt;
        // the base breaks apart into sparks while everything else holds still
        if (S.baseParts.length && Math.random() < dt * 14) {
          const k = S.baseParts.splice(Math.floor(Math.random() * S.baseParts.length), 1)[0];
          putc(S.bx + k, 23, SPARK, 6);
          spark(S.bx + k + Math.round((Math.random() - 0.5) * 12), 23 - Math.floor(Math.random() * 4), 6, 0.1);
        }
        if (S.timer >= 2.65) {
          const p = S.p[S.cur]; p.lives--;
          if (S.p.every(q => q.lives <= 0)) { clearField(); S.phase = 'over'; gameOver(); return; }
          if (S.n > 1) { const o = (S.cur + 1) % S.n; if (S.p[o].lives > 0) S.cur = o; }
          put(0, 24, ' '.repeat(80), 7, 0); S.phase = 'gap'; S.timer = 2.45; clearField();
        }
        for (const s of S.sparks) { s.life -= dt; if (s.life <= 0 && getc(s.x, s.y) === SPARK) putc(s.x, s.y, 32, 7); }
        S.sparks = S.sparks.filter(s => s.life > 0);
        return;
      }
      if (S.phase === 'gap') { S.timer -= dt; if (S.timer <= 0) { status(); clip('sh_tune'); S.phase = 'tune'; S.timer = 2.55; } return; }
      if (S.phase !== 'play') return;
      // base
      S.bt += dt;
      while (S.bt >= BASE_RATE) {
        S.bt -= BASE_RATE;
        const d = (S.held.R ? 1 : 0) - (S.held.L ? 1 : 0);
        if (d && S.bx + d >= 0 && S.bx + d <= 75) { drawBase(false); S.bx += d; drawBase(true); }
      }
      // missiles
      for (const m of S.missiles) {
        m.t += dt;
        while (m.t >= MISSILE_RATE && !m.gone) {
          m.t -= MISSILE_RATE;
          if (m.y < 23) putc(m.x, m.y, 32, 7);
          m.y--;
          if (m.y < 1) { m.gone = true; break; }
          const b = S.bombers.find(o => !o.dead && o.row === m.y && m.x >= o.x && m.x < o.x + 6);
          if (b) { hitBomber(b); m.gone = true; break; }
          const bb = S.bombs.find(o => o.y === m.y && o.x === m.x);
          if (bb) { bb.gone = true; putc(bb.x, bb.y, 32, 7); m.gone = true; break; }
          putc(m.x, m.y, MISSILE, 5);
        }
      }
      S.missiles = S.missiles.filter(m => !m.gone);
      // bombers
      S.spawnT -= dt;
      const maxB = Math.min(5, 2 + level());
      if (S.spawnT <= 0) { if (S.bombers.length < maxB) spawnBomber(); S.spawnT = 0.5 + Math.random() * 1.5; }
      for (const b of S.bombers) {
        if (b.dead) {
          b.dead -= dt;
          if (b.parts.length && Math.random() < dt * 12) {
            const k = b.parts.splice(Math.floor(Math.random() * b.parts.length), 1)[0];
            putc(b.x + k, b.row, SPARK, 12);
            spark(b.x + k + Math.round((Math.random() - 0.5) * 6), b.row + Math.round((Math.random() - 0.3) * 3), 12, 0.07);
          }
          if (b.dead <= 0) { for (let k = 0; k < 6; k++) if (b.x + k >= 0 && b.x + k < 80) putc(b.x + k, b.row, 32, 7); b.gone = true; }   // nothing of the bomber is left behind
          continue;
        }
        b.t += dt;
        while (b.t >= b.rate) {
          b.t -= b.rate; drawBomber(b, false); b.x += b.dir; drawBomber(b, true);
          if (b.x < -6 || b.x > 80) { b.gone = true; break; }
        }
        b.dropT -= dt;
        if (b.dropT <= 0 && !S.bombs.some(o => o.owner === b) && b.x > 0 && b.x < 74 && b.row < 20) {
          S.bombs.push({ x: b.x + 1 + (b.dir > 0 ? 3 : 0), y: b.row + 2, dx: b.dir, t: 0, owner: b });
          clip('sh_bomb'); b.dropT = 1 + Math.random() * 2;
        }
      }
      S.bombers = S.bombers.filter(b => !b.gone);
      // bombs
      for (const o of S.bombs) {
        if (o.gone) continue;
        o.t += dt;
        while (o.t >= BOMB_RATE && !o.gone) {
          o.t -= BOMB_RATE;
          if (getc(o.x, o.y) === BOMB) putc(o.x, o.y, 32, 7);
          o.y++; o.x += o.dx;
          if (o.x < 0 || o.x > 79) { o.gone = true; break; }
          if (o.y >= 23) {
            o.gone = true;
            if (o.x >= S.bx && o.x < S.bx + 5) { baseHit(); return; }
            for (let i = 0; i < 4; i++) spark(o.x + Math.round((Math.random() - 0.5) * 8), 23 - Math.floor(Math.random() * 4), 6, 0.08 + Math.random() * 0.25);
            break;
          }
          putc(o.x, o.y, BOMB, 7);
        }
      }
      S.bombs = S.bombs.filter(o => !o.gone);
      for (const s of S.sparks) { s.life -= dt; if (s.life <= 0 && getc(s.x, s.y) === SPARK) putc(s.x, s.y, 32, 7); }
      S.sparks = S.sparks.filter(s => s.life > 0);
      if (getc(S.bx, 23) !== 201) drawBase(true);
    }
  };
})();
