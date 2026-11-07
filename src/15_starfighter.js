/* ===== E: STAR FIGHTER TX-16 =====
   Measured: your ▀▄▄► sits at column 16 and, once pushed, keeps gliding up or down a row every 0.026 s until
   2 stops it (7 and 9 also climb and dive). Shots ○ cross the screen at about 62 columns a second, 25 per ship.
   Enemies come in from the right at about 50 columns a second: command ≡═╬═≡ 200 (red, drifts toward your row
   late), attack -▄█▄- 100 (yellow, lines up on you and fires ── missiles), troop carrier «╪╪╪» 500 (green,
   jinks between rows) and the mine ship ─↔↔↔─ 50 that opens into ☼ mines nothing can stop. Along the bottom row
   the ↑↑ ammo shuttle and a ▓▓ that destroys you both run left. A ship starts with a rising sweep (2.1 s); when
   it is hit the field clears, PLAYER n SCORE blinks and the stretch ends 6.1 s later. You have three ships.
   Estimated (not observed): how often each enemy appears, docking with the shuttle refilling all 25 shots,
   and the bonus ship every 10,000 from the instructions. */
GAMES.e = (() => {
  // 2.3 runs slower than the emulator measured (ship 0.026 s a row, enemies 0.04 s a step), which was unplayable on a phone
  const SHIP_X = 16, TOP = 4, BOT = 22, MOVE = 0.06, SHOT = 0.022, ENEMY = 0.075, MISSILE = 0.04, FLOOR = 0.045;
  const TYPES = {
    command: { s: [240, 205, 206, 205, 240], fg: 12, pts: 200, w: 3 },
    attack: { s: [45, 220, 219, 220, 45], fg: 14, pts: 100, w: 3 },
    troop: { s: [174, 216, 216, 216, 175], fg: 10, pts: 500, w: 1 },
    mine: { s: [196, 29, 29, 29, 196], fg: 4, pts: 50, w: 2 }
  };
  let S;
  const hiKey = 'hi.e';
  function scoreRow() {
    put(17, 1, '      ', 7, 0);
    const p = S.p[0]; if (p.score) { const s = String(p.score); put(23 - s.length, 1, s, 7, 0); }
    put(46, 1, '      ', 7, 0); if (S.hi) { const s = String(S.hi); put(52 - s.length, 1, s, 7, 0); }
    if (S.n > 1) { put(74, 1, '    ', 7, 0); const q = S.p[1]; if (q.score) { const s = String(q.score); put(78 - s.length, 1, s, 7, 0); } }
  }
  function label(on) { const p = S.cur; put(p ? 58 : 2, 1, on ? 'PLAYER ' + (p + 1) + ' SCORE:' : '               ', p ? 7 : 10, 0); }
  function ammoBar() { put(5, 3, ' '.repeat(26), 15, 0); put(5, 3, C(254).repeat(S.ammo), 15, 0); }
  function reserves() { put(2, 24, '  ', 15, 0); for (let i = 0; i < Math.min(2, S.p[S.cur].ships - 1); i++) putc(2 + i, 24, 2, 15); }
  function addScore(v) {
    const p = S.p[S.cur], before = p.score; p.score += v;
    if (Math.floor(p.score / 10000) > Math.floor(before / 10000)) p.ships++;
    if (p.score > S.hi) { S.hi = p.score; store.set(hiKey, S.hi); }
    scoreRow(); reserves();
  }
  function field() {
    loadPage('sf_board');
    for (let r = TOP; r <= BOT; r++) put(0, r, ' '.repeat(80), 7, 0);
    put(0, 1, C(186), 7, 0); label(true);
    S.ammo = 25; ammoBar(); scoreRow(); reserves();
  }
  function drawShip(on) {
    const r = S.ship.r;
    if (on) { put(SHIP_X, r, C(223) + C(220) + C(220), 15, 0); putc(SHIP_X + 3, r, 16, 15); }
    else put(SHIP_X, r, '    ', 7, 0);
  }
  function drawEnemy(o, on) {
    if (o.open) { for (let k = -1; k <= 1; k++) putc(o.x, o.r + k, on ? 15 : 32, on ? 15 : 7); return; }
    const t = TYPES[o.type];
    for (let k = 0; k < 5; k++) {
      const x = o.x + k; if (x < 0 || x > 79) continue;
      const code = on ? t.s[k] : 32;
      putc(x, o.r, code, !on ? 7 : (o.type === 'mine' && k >= 1 && k <= 3) ? (7 << 4) : t.fg);
    }
  }
  function drawFloor(o, on) {
    for (let k = 0; k < 2; k++) { const x = o.x + k; if (x < 0 || x > 79) continue; putc(x, BOT, on ? o.code : 32, on ? o.attr : 7); }
  }
  function startShip() {
    field(); S.ship = { r: 11, v: 0, t: 0 };
    S.shots = []; S.foes = []; S.missiles = []; S.floor = [];
    S.spawnT = 3.5; S.floorT = 4 + Math.random() * 2; S.blinkT = 0;
    drawShip(true); S.phase = 'play';
  }
  function spawn() {
    const roll = Math.random(), lvl = Math.min(3, Math.floor(S.p[S.cur].score / 3000));
    const type = roll < 0.32 ? 'command' : roll < 0.62 + lvl * 0.03 ? 'attack' : roll < 0.8 ? 'mine' : 'troop';
    const o = { type, r: TOP + 1 + Math.floor(Math.random() * (BOT - TOP - 2)), x: 74, t: 0, vt: 0, fire: 0.6 + Math.random() };
    if (type === 'mine') o.openAt = 30 + Math.floor(Math.random() * 25);
    S.foes.push(o); drawEnemy(o, true);
  }
  function die() {
    S.phase = 'dead'; S.timer = 0; spkStop(); clip('sf_boom'); S.sweep = false;
    for (let r = TOP - 1; r <= BOT + 1; r++) put(0, r, ' '.repeat(80), 7, 0);
    put(18, 24, ' '.repeat(45), 7, 0);
  }
  const hits = (o, r, x) => o.open ? (x === o.x && Math.abs(r - o.r) <= 1) : (r === o.r && x >= o.x && x <= o.x + 4);
  return {
    view: [0, 80], pad: 'starfighter',
    start(n) {
      S = { n, cur: 0, p: Array.from({ length: n }, () => ({ score: 0, ships: 3 })), hi: store.get(hiKey, 0) };
      cls(); loadPage('sf_board');
      for (let r = 1; r <= 24; r++) if (r !== 1) put(0, r, ' '.repeat(80), 7, 0);
      put(0, 1, C(186) + ' '.repeat(23), 7, 0);
      S.phase = 'intro'; S.timer = 2.13; clip('sf_start');
    },
    stop() { spkStop(); },
    key(k, down) {
      if (S.phase !== 'play') return;
      const s = S.ship;
      // 2.3: the ship moves while UP or DOWN is held and stops on release (2 still stops it)
      if (!down) { if ((s.v < 0 && ['Up', '4', '7', 'Home'].includes(k)) || (s.v > 0 && ['Down', '6', '9', 'PageUp'].includes(k))) s.v = 0; return; }
      if (k === 'Up' || k === '4' || k === '7' || k === 'Home') s.v = -1;
      else if (k === 'Down' || k === '6' || k === '9' || k === 'PageUp') s.v = 1;
      else if (k === 'Stop' || k === '2' || k === 'Right' || k === 'Left') s.v = 0;
      else if ((k === 'Space' || k === 'Fire') && S.ammo > 0) {
        S.ammo--; ammoBar(); S.shots.push({ r: s.r, x: SHIP_X + 5, t: 0 }); clip('sf_shot');
      }
    },
    update(dt, now) {
      if (S.phase === 'intro') { S.timer -= dt; if (S.timer <= 0) startShip(); return; }
      if (S.phase === 'dead') {
        S.timer += dt;
        label(Math.floor(S.timer / 0.267) % 2 === 1);
        if (!S.sweep && S.timer >= 3.94) { S.sweep = true; clip('sf_start'); }
        if (S.timer >= 6.09) {
          const p = S.p[S.cur]; p.ships--;
          if (S.p.every(q => q.ships <= 0)) { S.phase = 'over'; label(true); gameOver(); return; }
          label(true);
          if (S.n > 1) { const o = (S.cur + 1) % S.n; if (S.p[o].ships > 0) S.cur = o; }
          startShip();
        }
        return;
      }
      if (S.phase !== 'play') return;
      const s = S.ship;
      // ship glides until stopped
      s.t += dt;
      while (s.t >= MOVE) {
        s.t -= MOVE;
        const nr = s.r + s.v;
        if (s.v && nr >= TOP && nr <= BOT) { drawShip(false); s.r = nr; drawShip(true); } else s.v = 0;
      }
      // shots
      for (const o of S.shots) {
        o.t += dt;
        while (!o.dead && o.t >= SHOT) {
          o.t -= SHOT;
          if (getc(o.x, o.r) === 9) putc(o.x, o.r, 32, 7);
          o.x++;
          if (o.x > 79) { o.dead = true; break; }
          const f = S.foes.find(e => !e.dead && hits(e, o.r, o.x));
          if (f) {
            o.dead = true;
            if (!f.open) { drawEnemy(f, false); f.dead = true; addScore(TYPES[f.type].pts); }
            break;
          }
          putc(o.x, o.r, 9, 15);
        }
      }
      S.shots = S.shots.filter(o => !o.dead);
      // enemies
      S.spawnT -= dt;
      if (S.spawnT <= 0) { spawn(); S.spawnT = 1.0 + Math.random() * 2.0; }
      for (const o of S.foes) {
        o.t += dt;
        while (!o.dead && o.t >= ENEMY) {
          o.t -= ENEMY;
          drawEnemy(o, false);
          o.x -= 2;
          // steering: attack ships line up early, command ships late, carriers jink
          let dr = 0;
          if (o.type === 'attack' && o.x < 70) dr = Math.sign(s.r - o.r);
          else if (o.type === 'command' && o.x < 48) dr = Math.sign(s.r - o.r);
          else if (o.type === 'troop' && Math.random() < 0.25) dr = Math.random() < 0.5 ? -1 : 1;
          o.r = Math.max(TOP, Math.min(BOT - 1, o.r + dr));
          if (o.type === 'mine' && !o.open && o.x <= o.openAt) { o.open = true; o.x += 2; o.r = Math.max(TOP + 1, Math.min(BOT - 2, o.r)); }
          if (o.x < -5) { o.dead = true; break; }
          // a shot it flew into
          const q = S.shots.find(q => !q.dead && (o.open ? q.x === o.x && Math.abs(q.r - o.r) <= 1 : q.r === o.r && q.x >= o.x && q.x <= o.x + 6));
          if (q) { q.dead = true; putc(q.x, q.r, 32, 7); if (!o.open) { o.dead = true; addScore(TYPES[o.type].pts); break; } }
          drawEnemy(o, true);
        }
        if (!o.dead && o.type === 'attack') {
          o.fire -= dt;
          if (o.fire <= 0 && o.x > 30 && o.r === s.r) { o.fire = 1.2 + Math.random(); S.missiles.push({ r: o.r, x: o.x - 2, t: 0 }); }
        }
      }
      S.foes = S.foes.filter(o => !o.dead);
      for (const o of S.missiles) {
        o.t += dt;
        while (!o.dead && o.t >= MISSILE) {
          o.t -= MISSILE;
          put(o.x, o.r, '  ', 7, 0); o.x--;
          if (o.x < 0) { o.dead = true; break; }
          put(o.x, o.r, C(196) + C(196), 4, 0);
        }
      }
      S.missiles = S.missiles.filter(o => !o.dead);
      // bottom row: the ammo shuttle and the ▓▓
      S.floorT -= dt;
      if (S.floorT <= 0) {
        const shuttle = Math.random() < 0.4;
        S.floor.push({ x: 73, t: 0, shuttle, code: shuttle ? 24 : 178, attr: shuttle ? 7 << 4 : 9 });
        S.floorT = 2 + Math.random() * 3;
      }
      for (const o of S.floor) {
        o.t += dt;
        while (!o.dead && o.t >= FLOOR) {
          o.t -= FLOOR; drawFloor(o, false); o.x--;
          if (o.x < -2) { o.dead = true; break; }
          drawFloor(o, true);
        }
      }
      S.floor = S.floor.filter(o => !o.dead);
      drawShip(true);
      // collisions with your ship
      const at = x => x >= SHIP_X && x <= SHIP_X + 3;
      for (const o of S.floor) if (s.r === BOT && (at(o.x) || at(o.x + 1))) {
        if (!o.shuttle) return die();
        if (S.ammo < 25) { S.ammo = 25; ammoBar(); tone(612, 0.08); tone(816, 0.08, 0.09); }
      }
      for (const o of S.foes) for (let x = SHIP_X; x <= SHIP_X + 3; x++) if (hits(o, s.r, x)) return die();
      for (const o of S.missiles) if (o.r === s.r && (at(o.x) || at(o.x + 1))) return die();
    }
  };
})();
