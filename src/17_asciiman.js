/* ===== G: ASCII MAN =====
   Measured: maze, dots and pellets copied from the original screen; ASCII MAN ☻ (yellow) moves a cell every
   0.1 s and keeps going in the last direction pressed; Omega Monsters § (green, cyan, red, magenta) move a
   cell about every 0.085 s and leave the house 6.2, 13.1, 20.2 and 27 s after READY!. Dots 10 points with an
   up-down chirp. Death: everything holds 1.7 s with the original's tone, then READY! for 2 s.
   Not observed in testing (standard maze-game rules used): monsters turning blue after an aggression bit,
   their point values, and the level-clear sequence. */
GAMES.g = (() => {
  const MAN = 2, MON = 21, DOT = 249, PEL = 42, X0 = 18, X1 = 62, Y0 = 0, Y1 = 22, TUN = 11;
  const HOUSE = [[11, 37], [11, 39], [11, 41], [11, 43]], MCOL = [2, 3, 4, 5], RELEASE = [6.2, 13.1, 20.2, 27];
  const START = [17, 40], DIRS = { Up: [-1, 0], Down: [1, 0], Left: [0, -1], Right: [0, 1] };
  // 2.7.7: 20% slower than measured (0.1 / 0.085 s); with two-column sideways steps the original pace felt quick
  const MAN_STEP = 0.12, MON_STEP = 0.102;
  const isWall = c => c >= 179 && c <= 218;
  let S, maze, mazeAt;          // maze: walls + original dots, saved from the board page
  const hiKey = 'hi.g';
  function walkable(r, x) {
    if (r === TUN && (x < X0 || x > X1)) return true;
    if (r < Y0 || r > Y1 || x < X0 || x > X1) return false;
    return !isWall(maze[r * 80 + x]) && !(r === 10 && x >= 39 && x <= 41);   // the house door
  }
  // everyone moves on the dot grid: even columns, two columns per sideways step (2.6). The walls are drawn with
  // a blank column between blocks, so a one-column step let ASCII MAN slip up those gutters past the dots.
  const wrap = x => x < X0 - 2 ? X1 + 2 : x > X1 + 2 ? X0 - 2 : x;
  function cellUnder(r, x) {           // what's drawn on the maze at this cell (dot, pellet or blank)
    if (x < X0 || x > X1) return [32, 7];
    const d = S.dots[r * 80 + x];
    return d ? [d, 7] : [maze[r * 80 + x], mazeAt[r * 80 + x]];
  }
  function drawCell(r, x) { const [c, a] = cellUnder(r, x); putc(x, r, c, a); }
  function drawSprites() {
    for (const m of S.mons) if (m.x >= X0 && m.x <= X1) putc(m.x, m.r, MON, m.fright > 0 ? (m.fright < 2 && Math.floor(m.fright * 4) % 2 ? 15 : 1) : m.col);
    if (S.man.x >= X0 && S.man.x <= X1) putc(S.man.x, S.man.r, MAN, 14);
  }
  function eraseSprites() { for (const m of S.mons) drawCell(m.r, m.x); drawCell(S.man.r, S.man.x); }
  function resetActors() {
    S.man = { r: START[0], x: START[1], dir: null, want: null, t: 0 };
    S.mons = HOUSE.map(([r, x], i) => ({ r, x, home: true, col: MCOL[i], dir: 'Up', t: 0, fright: 0, release: RELEASE[i], eaten: false }));
    S.clock = 0;
  }
  function board() {
    loadPage('am_board');
    maze = scrCh.slice(); mazeAt = scrAt.slice();
    for (let r = 0; r < 23; r++) for (let x = X0; x <= X1; x++) {
      const i = r * 80 + x;
      if (maze[i] === DOT || maze[i] === PEL || maze[i] === MON || maze[i] === MAN || (r === 13 && !isWall(maze[i]))) { maze[i] = 32; mazeAt[i] = 7; }
    }
    for (let r = 0; r < 25; r++) for (let x = 0; x < 18; x++) putc(x, r, 32, 7);
    put(18, 13, ' '.repeat(45), 7, 0);
  }
  function freshDots() {
    const page = b64bytes(ASSETS.pages.am_board);
    S.dots = new Uint8Array(2000);
    for (let i = 0; i < 2000; i++) if (page[i] === DOT || page[i] === PEL) S.dots[i] = page[i];
    S.left = S.dots.filter(Boolean).length;
    for (let r = 0; r < 23; r++) for (let x = X0; x <= X1; x++) drawCell(r, x);
  }
  function side() {
    for (let i = 0; i < 3; i++) putc(6 + i * 2, 4, 32, 7);
    for (let i = 0; i < S.p[S.cur].lives - 1; i++) putc(6 + i * 2, 4, MAN, 14);
    put(0, 2, ' '.repeat(12), 7, 0);
    const s = String(S.p[S.cur].score); put(11 - s.length, 2, s, 15, 0);
  }
  function ready(on) { put(35, 13, on ? 'R E A D Y !' : '           ', 7, 0); }
  function addScore(v) { const p = S.p[S.cur]; p.score += v; if (p.score > S.hi) { S.hi = p.score; store.set(hiKey, S.hi); } side(); }
  function stepMan() {
    const m = S.man;
    // forgiving corners (2.5): a turn pressed just after passing an opening, or held while sliding into a wall,
    // steps back one cell into the lane instead of being lost; the lanes are one column wide
    if (m.want && m.want !== m.dir && !canGo(m.r, m.x, m.want) && m.last && S.clock - m.last.t < 0.22 && canGo(m.last.r, m.last.x, m.want)) {
      drawCell(m.r, m.x); m.r = m.last.r; m.x = m.last.x; m.last = null;
    }
    if (m.want && canGo(m.r, m.x, m.want)) m.dir = m.want;
    if (!m.dir || !canGo(m.r, m.x, m.dir)) return;
    const [dr, dx] = DIRS[m.dir];
    m.last = { r: m.r, x: m.x, t: S.clock };
    drawCell(m.r, m.x); m.r += dr; m.x = wrap(m.x + 2 * dx);
    const i = m.r * 80 + m.x;
    if (m.x >= X0 && m.x <= X1 && S.dots[i]) {
      const d = S.dots[i]; S.dots[i] = 0; S.left--;
      if (d === DOT) { addScore(10); tone(262, 0.028, 0, 298); tone(298, 0.03, 0.06, 262); }
      else { addScore(50); S.chain = 200; for (const o of S.mons) if (!o.home) { o.fright = 7; o.dir = rev(o.dir); } tone(196, 0.2, 0, 392); }
    }
  }
  const rev = d => ({ Up: 'Down', Down: 'Up', Left: 'Right', Right: 'Left' })[d];
  function canGo(r, x, d) {
    const [dr, dx] = DIRS[d];
    if (x % 2) return dr !== 0 ? false : walkable(r, x + dx);         // only inside the monster house (odd columns)
    return dx ? walkable(r, x + dx) && walkable(r, wrap(x + 2 * dx)) : walkable(r + dr, x);
  }
  function stepMon(o) {
    if (o.home) {
      if (S.clock < o.release) return;
      // leave through the door at column 40
      drawCell(o.r, o.x);
      if (o.r > 9 && o.x !== 40) o.x += o.x < 40 ? 1 : -1;
      else if (o.r > 8) o.r--;
      if (o.r <= 9 && o.x === 40) { o.home = false; o.dir = 'Left'; }
      return;
    }
    const opts = Object.keys(DIRS).filter(d => d !== rev(o.dir) && canGo(o.r, o.x, d));
    let d = opts[0] || rev(o.dir);
    if (opts.length > 1) {
      if (o.fright > 0) d = opts[Math.floor(Math.random() * opts.length)];
      else {
        // chase: each monster aims a little differently so they spread out
        const off = [[0, 0], [-4, 0], [4, 0], [0, 8]][MCOL.indexOf(o.col)];
        const tr = S.man.r + off[0], tx = S.man.x + off[1];
        d = opts.reduce((best, k) => {
          const [dr, dx] = DIRS[k], dist = Math.abs(o.r + dr - tr) * 2 + Math.abs(o.x + 2 * dx - tx);
          return dist < best[1] ? [k, dist] : best;
        }, [null, 1e9])[0];
      }
    }
    o.dir = d;
    const [dr, dx] = DIRS[d];
    drawCell(o.r, o.x); o.r += dr; o.x = wrap(o.x + 2 * dx);
  }
  function collide() {
    for (const o of S.mons) {
      if (o.home || o.r !== S.man.r || Math.abs(o.x - S.man.x) > 0) continue;
      if (o.fright > 0) {
        addScore(S.chain); S.chain *= 2; tone(988, 0.12, 0, 1976);
        drawCell(o.r, o.x); const [r, x] = HOUSE[MCOL.indexOf(o.col)]; Object.assign(o, { r, x, home: true, fright: 0, release: S.clock + 2 });
      } else return true;
    }
    return false;
  }
  function die() { S.phase = 'dying'; S.timer = 1.7; clip('am_die'); }
  return {
    view: [0, 80], pad: 'dpad', dbg: () => ({ S, maze, walkable }),
    start(n) {
      S = { n, cur: 0, p: Array.from({ length: n }, () => ({ score: 0, lives: 3, dots: null, level: 1 })), hi: store.get(hiKey, 0), chain: 200 };
      cls(); board(); freshDots(); resetActors(); side(); ready(true); drawSprites();
      S.phase = 'ready'; S.timer = 2.0;
    },
    stop() { spkStop(); },
    key(k, down) {
      if (!down) return;
      const d = { Up: 'Up', '8': 'Up', Down: 'Down', '2': 'Down', Left: 'Left', '4': 'Left', Right: 'Right', '6': 'Right' }[k];
      if (d) S.man.want = d;
    },
    update(dt, now) {
      // blinking 1 UP and aggression bits, like the original
      const on = Math.floor(now / 0.267) % 2 === 0;
      put(6, 0, on ? (S.cur ? '2 UP' : '1 UP') : '    ', 15, 0);
      for (let i = 0; i < 2000; i++) if (S.dots[i] === PEL) { const r = Math.floor(i / 80), x = i % 80; if (getc(x, r) === PEL || getc(x, r) === 32) putc(x, r, on ? PEL : 32, 7); }
      if (S.phase === 'ready') {
        S.timer -= dt;
        if (S.timer <= 0) { ready(false); S.phase = 'play'; }
        return;
      }
      if (S.phase === 'dying') {
        S.timer -= dt;
        if (S.timer <= 0) {
          eraseSprites();
          const p = S.p[S.cur]; p.lives--;
          if (S.p.every(q => q.lives <= 0)) { S.phase = 'over'; gameOver(); return; }
          if (S.n > 1) { p.dots = S.dots; const o = (S.cur + 1) % S.n; if (S.p[o].lives > 0) { S.cur = o; if (S.p[o].dots) { S.dots = S.p[o].dots; for (let r = 0; r < 23; r++) for (let x = X0; x <= X1; x++) drawCell(r, x); } else freshDots(); } }
          resetActors(); side(); ready(true); drawSprites(); S.phase = 'ready'; S.timer = 2.0;
        }
        return;
      }
      if (S.phase === 'clear') {
        S.timer -= dt;
        const flash = Math.floor(S.timer * 5) % 2 === 0;
        for (let r = 0; r < 23; r++) for (let x = X0; x <= X1; x++) if (isWall(maze[r * 80 + x])) putc(x, r, maze[r * 80 + x], flash ? 15 : mazeAt[r * 80 + x] & 15);
        if (S.timer <= 0) { S.p[S.cur].level++; board(); freshDots(); resetActors(); side(); ready(true); drawSprites(); S.phase = 'ready'; S.timer = 2.0; }
        return;
      }
      if (S.phase !== 'play') return;
      S.clock += dt;
      const speed = 1 + 0.08 * (S.p[S.cur].level - 1);
      S.man.t += dt * speed;
      while (S.man.t >= MAN_STEP) { S.man.t -= MAN_STEP; stepMan(); if (collide()) { drawSprites(); return die(); } }
      for (const o of S.mons) {
        if (o.fright > 0) o.fright -= dt;
        o.t += dt * speed * (o.fright > 0 ? 0.55 : 1);
        while (o.t >= MON_STEP) { o.t -= MON_STEP; stepMon(o); }
      }
      if (collide()) { drawSprites(); return die(); }
      drawSprites();
      if (S.left <= 0) { S.phase = 'clear'; S.timer = 2.0; }
    }
  };
})();
