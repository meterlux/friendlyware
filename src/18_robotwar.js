/* ===== I: ROBOT WAR =====
   Measured: rooms of █ walls grown from eight posts (rows 8 and 16, columns 17, 32, 47, 62) inside an outer wall
   with side openings; you ╒╤╕/▀█▀/█ █ step a cell every 0.08 s (legs alternate); your * shots fly 2 columns or
   1 row every 0.083 s; robots ┌╦┐/▀███▀/▀ █ step about every 0.44 s and fire + shots; a robot is 30 points.
   Shot, robot-destroyed and death warble are recorded clips. Death: you flash red for 2.5 s, then a new room. */
GAMES.i = (() => {
  const POSTS_R = [8, 16], POSTS_C = [17, 32, 47, 62];
  const ME = [C(213) + C(209) + C(184), C(223) + C(219) + C(223)], LEGS = [C(219) + ' ' + C(219), C(223) + ' ' + C(219), C(219) + ' ' + C(223)];
  const BOT = [C(218) + C(203) + C(191), C(223) + C(219) + C(219) + C(219) + C(223)], BLEGS = [' ' + C(223) + ' ' + C(219) + ' ', ' ' + C(219) + ' ' + C(223) + ' '];
  const WALL = 219, ME_STEP = 0.08, BOT_STEP = 0.44, SHOT_STEP = 0.083, ESHOT_STEP = 0.07;
  const DIRS = { Up: [-1, 0], Down: [1, 0], Left: [0, -1], Right: [0, 1], UL: [-1, -1], UR: [-1, 1], DL: [1, -1], DR: [1, 1] };
  const KEYDIR = { Up: 'Up', '8': 'Up', Down: 'Down', '2': 'Down', Left: 'Left', '4': 'Left', Right: 'Right', '6': 'Right', '7': 'UL', Home: 'UL', '9': 'UR', PgUp: 'UR', '1': 'DL', End: 'DL', '3': 'DR', PgDn: 'DR' };
  const hiKey = 'hi.i';
  let S, walls;
  const isWall = (r, x) => walls[r * 80 + x] === 1;
  function header(now) {
    const off = Math.floor(now / 0.267) % 2 === 1 && S.phase !== 'over';
    put(0, 0, ' '.repeat(80), 0, 7);
    if (!(off && S.cur === 0)) put(3, 0, 'PLAYER 1 SCORE:', 0, 7);
    put(31, 0, 'HIGH SCORE:', 0, 7);
    if (!(off && S.cur === 1)) put(56, 0, 'PLAYER 2 SCORE:', 0, 7);
    const sc = (v, end) => { if (v > 0) put(end - String(v).length + 1, 0, String(v), 0, 7); };
    sc(S.p[0].score, 22); sc(S.hi, 49); if (S.n > 1) sc(S.p[1].score, 76);
  }
  function setWall(r, x) { walls[r * 80 + x] = 1; putc(x, r, WALL, 7); }
  function buildRoom(entry) {
    for (let r = 1; r < 25; r++) put(0, r, ' '.repeat(80), 7, 0);
    walls = new Uint8Array(2000);
    for (let r = 1; r <= 23; r++) if (r < 9 || r > 15) { setWall(r, 2); setWall(r, 77); }
    for (let x = 2; x <= 77; x++) if (x < 18 || x > 62) setWall(24, x);
    if (entry === 'Left') for (let r = 9; r <= 15; r++) setWall(r, 2);
    if (entry === 'Right') for (let r = 9; r <= 15; r++) setWall(r, 77);
    for (const pr of POSTS_R) for (const pc of POSTS_C) {
      const d = ['Up', 'Down', 'Left', 'Right'][Math.floor(Math.random() * 4)];
      if (d === 'Up') for (let r = pr - 7; r <= pr; r++) setWall(r, pc);
      if (d === 'Down') for (let r = pr; r <= Math.min(23, pr + 8); r++) setWall(r, pc);
      if (d === 'Left') for (let x = pc - 15; x <= pc; x++) setWall(pr, x);
      if (d === 'Right') for (let x = pc; x <= pc + 15; x++) setWall(pr, x);
    }
    put(18, 24, BAR, 0, 7);
    S.shots = []; S.eshots = [];
    // player enters where they left the last room
    const at = { Left: [10, 4], Right: [10, 73], Top: [2, 39], Bottom: [20, 39] }[entry] || [10, 4];
    S.me = { r: at[0], x: at[1], dir: entry === 'Right' ? 'Left' : 'Right', t: 0, leg: 0, held: null, fire: false };
    // robots: more of them, and faster, as rooms go by
    const n = Math.min(9, 3 + Math.floor(S.room / 2)), cols = [3, 2, 6, 5, 4, 13, 11, 14];
    S.bots = [];
    for (let tries = 0; S.bots.length < n && tries < 400; tries++) {
      const r = 2 + Math.floor(Math.random() * 19), x = 4 + Math.floor(Math.random() * 70);
      if (Math.abs(x - S.me.x) < 16 && Math.abs(r - S.me.r) < 6) continue;
      if (blocked(r, x, 5, 3) || S.bots.some(b => Math.abs(b.r - r) < 4 && Math.abs(b.x - x) < 6)) continue;
      S.bots.push({ r, x, t: Math.random() * BOT_STEP, leg: 0, col: cols[Math.min(cols.length - 1, Math.floor(S.room / 2))], fireT: 1 + Math.random() * 2 });
    }
    S.phase = 'enter'; S.timer = 2.2;
  }
  function blocked(r, x, w, h) { for (let i = 0; i < h; i++) for (let k = 0; k < w; k++) { const rr = r + i, xx = x + k; if (rr < 1 || rr > 24 || xx < 0 || xx > 79 || isWall(rr, xx)) return true; } return false; }
  const meBox = () => [S.me.r - 1, S.me.x - 1, 3, 3];
  function drawMe(on, col = 15) {
    const { r, x } = S.me;
    put(x - 1, r - 1, on ? ME[0] : '   ', col, 0); put(x - 1, r, on ? ME[1] : '   ', col, 0); put(x - 1, r + 1, on ? LEGS[S.me.leg] : '   ', col, 0);
  }
  function drawBot(b, on) {
    put(b.x - 1, b.r - 1, on ? ' ' + BOT[0] + ' ' : '     ', b.col, 0); put(b.x - 2, b.r, on ? BOT[1] : '     ', b.col, 0); put(b.x - 2, b.r + 1, on ? BLEGS[b.leg] : '     ', b.col, 0);
  }
  function overlap(a, b) { return a[0] < b[0] + b[3] && b[0] < a[0] + a[3] && a[1] < b[1] + b[2] && b[1] < a[1] + a[2]; }
  const botBox = b => [b.r - 1, b.x - 2, 5, 3];
  function die() { S.phase = 'dying'; S.timer = 2.5; clip('rw_die'); }
  function addScore(v) { const p = S.p[S.cur]; p.score += v; if (p.score > S.hi) { S.hi = p.score; store.set(hiKey, S.hi); } }
  function killBot(b) { drawBot(b, false); b.dead = true; addScore(30); clip('rw_kill'); }
  function fire(dir) {
    if (S.shots.length >= 2) return;
    const [dr, dx] = DIRS[dir];
    S.shots.push({ r: S.me.r + dr * 1, x: S.me.x + dx * 2, dr, dx, t: 0 }); clip('rw_shot');
  }
  return {
    view: [0, 80], pad: 'eight',
    start(n) {
      S = { n, cur: 0, p: Array.from({ length: n }, () => ({ score: 0, lives: 3 })), hi: store.get(hiKey, 0), room: 0 };
      cls(); buildRoom('Left');
    },
    stop() { spkStop(); },
    key(k, down) {
      const d = KEYDIR[k];
      if (k === 'Space' || k === 'Fire') { S.me.fire = down; if (down && S.phase === 'play') fire(S.me.held || S.me.dir); return; }   // standing still, you shoot the way you face
      if (d) {
        if (down) { S.me.held = d; S.me.dir = d; if (S.me.fire && S.phase === 'play') fire(d); }
        else if (S.me.held === d) S.me.held = null;
      }
    },
    update(dt, now) {
      header(now);
      if (S.phase === 'enter') {
        S.timer -= dt;
        drawMe(Math.floor(S.timer / 0.267) % 2 === 0, 14);
        if (S.timer <= 0) { S.phase = 'play'; drawMe(true); for (const b of S.bots) drawBot(b, true); }
        return;
      }
      if (S.phase === 'dying') {
        S.timer -= dt;
        drawMe(Math.floor(S.timer / 0.267) % 2 === 0, 12);
        if (S.timer <= 0) {
          S.p[S.cur].lives--;
          if (S.p.every(q => q.lives <= 0)) { S.phase = 'over'; gameOver(); return; }
          if (S.n > 1) { const o = (S.cur + 1) % S.n; if (S.p[o].lives > 0) S.cur = o; }
          S.room++; buildRoom('Left');
        }
        return;
      }
      if (S.phase !== 'play') return;
      const me = S.me;
      // walk (shooting while the fire key is held stops you, like the original)
      me.t += dt;
      while (me.t >= ME_STEP) {
        me.t -= ME_STEP;
        if (!me.held || me.fire) continue;
        const [dr, dx] = DIRS[me.held];
        drawMe(false); me.r += dr; me.x += dx; me.leg = me.leg === 1 ? 2 : 1;
        // leaving through an opening
        const exit = me.x < 2 ? 'Right' : me.x > 77 ? 'Left' : me.r > 23 ? 'Top' : me.r < 2 ? 'Bottom' : null;
        if (exit) { S.room++; buildRoom(exit); return; }
        if (blocked(...meBox(), 3, 3) || blocked(me.r - 1, me.x - 1, 3, 3)) { drawMe(true, 12); return die(); }
        drawMe(true);
      }
      if (!me.held && me.leg) { me.leg = 0; drawMe(true); }
      // your shots
      for (const s of S.shots) {
        s.t += dt;
        while (s.t >= SHOT_STEP && !s.gone) {
          s.t -= SHOT_STEP;
          if (getc(s.x, s.r) === 42) putc(s.x, s.r, 32, 7);
          s.r += s.dr; s.x += s.dx * 2;
          if (s.r < 1 || s.r > 23 || s.x < 0 || s.x > 79 || isWall(s.r, s.x) || isWall(s.r, s.x - s.dx)) { s.gone = true; break; }
          const b = S.bots.find(o => !o.dead && overlap([s.r, s.x, 1, 1], botBox(o)));
          if (b) { killBot(b); s.gone = true; break; }
          putc(s.x, s.r, 42, 7);
        }
      }
      S.shots = S.shots.filter(s => !s.gone);
      // robots
      const speed = 1 + 0.12 * S.room;
      for (const b of S.bots) {
        if (b.dead) continue;
        b.t += dt * speed;
        if (b.t >= BOT_STEP) {
          b.t -= BOT_STEP;
          const dr = Math.sign(me.r - b.r), dx = Math.sign(me.x - b.x);
          drawBot(b, false);
          if (Math.random() < 0.6) { b.r += Math.abs(me.r - b.r) > 1 ? dr : 0; b.x += Math.abs(me.x - b.x) > 2 ? dx : 0; b.leg ^= 1; }
          // robots that walk into a wall or another robot are destroyed
          if (blocked(...botBox(b).slice(0, 2), 5, 3)) { b.dead = true; addScore(30); clip('rw_kill'); continue; }
          const hit = S.bots.find(o => o !== b && !o.dead && overlap(botBox(o), botBox(b)));
          if (hit) { drawBot(hit, false); hit.dead = b.dead = true; addScore(60); clip('rw_kill'); continue; }
          drawBot(b, true);
        }
        b.fireT -= dt * speed;
        if (b.fireT <= 0 && S.eshots.length < 1 + Math.floor(S.room / 3)) {
          b.fireT = 1.2 + Math.random() * 2;
          const vr = Math.abs(me.r - b.r) <= 1, vc = Math.abs(me.x - b.x) <= 1;
          if (vr || vc) {
            const dr = vr ? 0 : Math.sign(me.r - b.r), dx = vc ? 0 : Math.sign(me.x - b.x);
            S.eshots.push({ r: b.r + dr * 2, x: b.x + dx * 3, dr, dx, t: 0 });
          }
        }
        if (overlap(botBox(b), meBox())) { drawMe(true, 12); return die(); }
      }
      S.bots = S.bots.filter(b => !b.dead);
      // robot shots
      for (const s of S.eshots) {
        s.t += dt;
        while (s.t >= ESHOT_STEP && !s.gone) {
          s.t -= ESHOT_STEP;
          if (getc(s.x, s.r) === 43) putc(s.x, s.r, 32, 7);
          s.r += s.dr; s.x += s.dx;
          if (s.r < 1 || s.r > 23 || s.x < 0 || s.x > 79 || isWall(s.r, s.x)) { s.gone = true; break; }
          if (overlap([s.r, s.x, 1, 1], meBox())) { s.gone = true; drawMe(true, 12); return die(); }
          putc(s.x, s.r, 43, 7);
        }
      }
      S.eshots = S.eshots.filter(s => !s.gone);
    }
  };
})();
