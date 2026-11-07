/* ===== A: BRICK BREAKER =====
   Measured from the original at 4.77 MHz speed: ball steps every 0.098 s, 0.054 s once a brick in the
   third row from the bottom is broken (until that ball is lost); bounces hold the ball about 0.06 s.
   Paddle: nine half blocks on row 23, 55 columns a second while a key is held. Paddle hit 689 Hz,
   brick 356 Hz. Bricks score 10 (bottom two rows), 20, 40, then 80 (top two rows: not reached in testing). */
GAMES.a = (() => {
  // 2.7: the paddle is 12 wide (the original's 9 is hard on a phone); 7 balls, plus one for every wall cleared
  const PROW = 23, BALL = 254, PADC = 223, BRICK = 223, MORTAR = 249, PADW = 12, BALLS = 7;
  const XL = 2, XR = 77, SLOW = 0.098, FAST = 0.054, HOLD = 0.06, PADRATE = 1 / 55;
  const ROWPTS = { 12: 10, 11: 10, 10: 20, 9: 20, 8: 40, 7: 40, 6: 80, 5: 80 };
  let S;
  const hiKey = 'hi.a';
  function header(now) {
    const blinkOff = Math.floor(now / 0.267) % 2 === 1;
    put(0, 0, ' '.repeat(80), 0, 7);
    if (!(blinkOff && S.cur === 0 && S.phase !== 'over')) put(1, 0, 'PLAYER 1 SCORE :', 0, 7);
    put(30, 0, 'HI SCORE :', 0, 7);
    if (!(blinkOff && S.cur === 1 && S.phase !== 'over')) put(57, 0, 'PLAYER 2 SCORE :', 0, 7);
    const sc = (v, end) => { if (v > 0) put(end - String(v).length + 1, 0, String(v), 0, 7); };
    sc(S.p[0].score, 22); sc(S.hi, 45); if (S.n > 1) sc(S.p[1].score, 79);
  }
  function status() {
    const b = S.p[S.cur].ball;
    put(0, 24, ' '.repeat(80), 0, 7);
    const tot = S.p[S.cur].balls;
    if (b < tot) put(1, 24, 'CURRENT BALL-' + b, 0, 7); else put(2, 24, 'LAST  BALL -' + tot, 0, 7);
    put(18, 24, BAR, 0, 7);
  }
  const padDraw = on => { for (let i = 0; i < PADW; i++) putc(S.pad + i, PROW, on ? PADC : 32, on ? 15 : 7); };
  const ballDraw = on => { if (S.bx >= 0) putc(S.bx, S.by, on ? BALL : 32, on ? 15 : 7); };
  function saveWall() { const out = []; for (let r = 5; r <= 12; r++) out.push(saveRow(r)); return out; }
  function loadWall(w) { for (let r = 5; r <= 12; r++) restoreRow(r, w[r - 5]); }
  function bricksLeft() { for (let r = 5; r <= 12; r++) for (let x = XL; x <= XR; x++) if (getc(x, r) === BRICK) return true; return false; }
  function breakAt(x, y, dx) {
    let c = getc(x, y);
    if (c === MORTAR) {                                   // a mortar dot: take the brick on the side it's heading
      const side = getc(x + (dx >= 0 ? 1 : -1), y) === BRICK ? (dx >= 0 ? 1 : -1) : (dx >= 0 ? -1 : 1);
      x += side; c = getc(x, y);
      if (c !== BRICK) { putc(x - side, y, 32, 7); return 0; }
    }
    let a = x, b = x;
    while (a - 1 >= XL && getc(a - 1, y) === BRICK) a--;
    while (b + 1 <= XR && getc(b + 1, y) === BRICK) b++;
    for (let i = a - 1; i <= b + 1; i++) if (i >= XL && i <= XR && (getc(i, y) === BRICK || getc(i, y) === MORTAR)) putc(i, y, 32, 7);
    return ROWPTS[y] || 10;
  }
  function addScore(v) {
    const p = S.p[S.cur]; p.score += v;
    if (p.score > S.hi) { S.hi = p.score; store.set(hiKey, S.hi); }
  }
  function serve() { S.phase = 'play'; S.bx = 40; S.by = 14; S.dx = 1; S.dy = 1; S.wait = SLOW; S.fast = false; S.topped = false; ballDraw(true); }
  function newBallSequence() {                            // paddle returns with the rising warble, serve 4.22 s later
    S.pad = 34; S.slideTo = null; padDraw(true); clip('bb_warble'); S.phase = 'warble'; S.timer = 4.22;
  }
  function stepBall() {
    let { bx: x, by: y, dx, dy } = S;
    let hold = 0;
    let nx = x + dx, ny = y + dy;
    if (nx < XL || nx > XR) { dx = -dx; nx = x + dx; if (nx < XL) nx = XL; if (nx > XR) nx = XR; }
    if (ny < 1) { dy = 1; ny = y + 1; S.topped = true; }
    if (ny === PROW) {
      if (x >= S.pad - 0 && x <= S.pad + PADW - 1) {
        const off = x - S.pad;
        if (off === 0) dx = -3; else if (off === 1) dx = -2; else if (off === PADW - 2) dx = 2; else if (off === PADW - 1) dx = 3;
        else dx = dx < 0 ? -1 : 1;
        dy = -1; ny = y - 1; nx = x + dx;
        if (nx < XL) { nx = XL + (XL - nx); dx = -dx; } if (nx > XR) { nx = XR - (nx - XR); dx = -dx; }
        tone(689, 0.057); hold = HOLD; S.topped = false;
      } else {
        ballDraw(false); S.bx = nx; S.by = ny; ballDraw(true);
        return lose();
      }
    }
    const c = getc(nx, ny);
    if (ny >= 5 && ny <= 12 && (c === BRICK || c === MORTAR)) {
      const pts = breakAt(nx, ny, dx);
      if (pts) { addScore(pts); tone(356, 0.069); hold = HOLD; }
      if (ny === 10 && pts) S.fast = true;
      if (!(S.topped && dy > 0)) dy = -dy;
      if (!bricksLeft()) S.rebuild = true;
    }
    if (ny <= 4) S.topped = true;
    if (ny >= 13) S.topped = false;
    ballDraw(false); S.bx = nx; S.by = ny; S.dx = dx; S.dy = dy; ballDraw(true);
    S.wait = (S.fast ? FAST : SLOW) + hold;
  }
  function lose() {
    clip('bb_miss'); S.phase = 'lost'; S.timer = 0; S.seq = 0;
  }
  function lostSeq(dt) {
    S.timer += dt;
    const p = S.p[S.cur];
    if (S.seq === 0 && S.timer >= 0.55) { ballDraw(false); S.bx = -1; padDraw(false); S.seq = 1; }
    if (S.seq === 1 && S.timer >= 1.5) {
      // next player with balls left
      if (S.n > 1) { S.walls[S.cur] = saveWall(); }
      p.ball++;
      const others = S.p.map((q, i) => i).filter(i => S.p[i].ball <= S.p[i].balls);
      if (!others.length) { S.phase = 'over'; header(0); for (let x = 0; x < 80; x++) putc(x, PROW, 32, 7); gameOver(); return; }
      if (S.n > 1) { const nxt = (S.cur + 1) % S.n; S.cur = S.p[nxt].ball <= S.p[nxt].balls ? nxt : S.cur; if (S.walls[S.cur]) loadWall(S.walls[S.cur]); }
      status();
      const beeps = Math.min(S.p[S.cur].ball, 7);
      for (let i = 0; i < beeps; i++) tone(356, 0.281, i * 0.293);
      S.seq = 2; S.timer = 1.5; S.beepEnd = 1.5 + beeps * 0.293 + 0.23;
    }
    if (S.seq === 2 && S.timer >= S.beepEnd) newBallSequence();
  }
  return {
    view: [0, 80], pad: 'lr2',
    start(n) {
      S = { n, cur: 0, p: Array.from({ length: n }, () => ({ score: 0, ball: 1, balls: BALLS })), hi: store.get(hiKey, 0),
            phase: 'intro', movie: new Movie('bb_intro'), pad: 35, bx: -1, by: 0, dx: 1, dy: 1, wait: SLOW,
            held: { L: false, R: false }, padT: 0, walls: [], timer: 0 };
      clip('bb_intro');
    },
    stop() { spkStop(); },
    // slider pad: move the paddle by a number of columns (fractions accumulate)
    slide(dc) {
      if (S.phase !== 'play' && S.phase !== 'warble') return;
      S.slideTo = Math.max(XL, Math.min(XR - PADW + 1, (S.slideTo ?? S.pad) + dc));
      if (S.phase === 'warble') { padDraw(false); S.pad = Math.round(S.slideTo); padDraw(true); }
    },
    slideSpan: () => XR - XL + 1 - PADW,
    key(k, down) {
      if (down && (k === 'Left' || k === 'Right' || k === '4' || k === '6')) S.slideTo = null;   // keys take over again
      // convenience: any key during the long intro skips to the serve (the original made you wait)
      if (down && S.phase === 'intro') { S.movie.finish(); spkStop(); return; }
      if (k === 'Left' || k === '4') S.held.L = down;
      if (k === 'Right' || k === '6') S.held.R = down;
    },
    update(dt, now) {
      if (S.phase === 'intro') {
        S.movie.step(dt);
        if (S.movie.done) {
          if (S.n > 1) S.walls[1] = saveWall();
          newBallSequence();
        }
        return;
      }
      header(now);
      if (S.phase === 'warble') { S.timer -= dt; if (S.timer <= 0) serve(); return; }
      if (S.phase === 'lost') { lostSeq(dt); return; }
      if (S.phase === 'rewall') { S.movie.step(dt * 3); if (S.movie.done) serve(); return; }
      if (S.phase !== 'play') return;
      // the slider pad places the paddle directly
      if (S.slideTo != null) {
        const to = Math.round(Math.max(XL, Math.min(XR - PADW + 1, S.slideTo)));
        if (to !== S.pad) { padDraw(false); S.pad = to; padDraw(true); if (S.by === PROW) ballDraw(true); }
      }
      // paddle follows held keys
      S.padT += dt;
      while (S.padT >= PADRATE) {
        S.padT -= PADRATE;
        const d = (S.held.R ? 1 : 0) - (S.held.L ? 1 : 0);
        if (d && S.pad + d >= XL && S.pad + d + PADW - 1 <= XR) {
          padDraw(false); S.pad += d; padDraw(true);
          if (S.by === PROW) ballDraw(true);
        }
      }
      S.wait -= dt;
      while (S.phase === 'play' && S.wait <= 0) {
        const w = S.wait; stepBall(); S.wait += w;
        if (S.rebuild) { S.rebuild = false; addScore(1000); S.p[S.cur].balls++; status(); S.phase = 'rewall'; S.movie = new Movie('bb_intro', e => e[1] >= 5 && e[1] <= 12 && e[2] >= 2 && e[2] <= 77); ballDraw(false); S.bx = -1; }
      }
    }
  };
})();
