/* ===== B: EAGLE LANDER =====
   Measured: gravity adds about 8 to the vertical speed a second; throttle n (1-6) gives about 3.3·n^1.3 of
   thrust and burns the same fuel (diagonals thrust both ways); 650 fuel, start drifting 50 to the right.
   One far-view column is about 28 speed units, a row 14. The terrain is the original 169-column landscape,
   stitched from the emulator. Close to the ground the view switches to the big lander over ▓ flats and ░
   slopes. Crash, landing and lost-in-space messages are the original's. Landing limits are my estimate. */
GAMES.b = (() => {
  const TER_R0 = 13, TW = EL_TERRAIN[0].length, UX = 28, UY = 14, CX = 3.5, CY = 3.5;
  const G = 8, LANDER = C(214) + C(183);
  const BIG = [
    [36, C(206) + ' ' + C(220) + C(220) + C(219) + C(220) + C(220)],
    [34, C(219).repeat(13)], [33, C(219).repeat(7) + '+' + C(219).repeat(7)], [35, C(219).repeat(11)], [32, C(219).repeat(17)],
    [31, C(222) + C(219) + C(223) + C(223) + C(223) + C(219) + '       ' + C(219) + C(223) + C(223) + C(223) + C(219) + C(221)],
    [31, C(219) + C(223) + '               ' + C(223) + C(219)],
    [30, C(220) + C(219) + C(220) + '               ' + C(220) + C(219) + C(220)]
  ];
  // surface height (in units from the top of row 1) at world column wx (fractional), and whether it's flat
  const top = [];
  for (let x = 0; x < TW; x++) {
    let r = -1, ch = 32;
    for (let k = 0; k < EL_TERRAIN.length; k++) { const c = EL_TERRAIN[k].charCodeAt(x); if (c !== 32) { r = TER_R0 + k; ch = c; break; } }
    top.push([r, ch]);
  }
  function ground(wx) {
    const x = ((Math.floor(wx) % TW) + TW) % TW, f = wx - Math.floor(wx), [r, ch] = top[x];
    if (r < 0) return [24 * UY, false];
    const y0 = (r - 1) * UY;                   // top of that cell
    if (ch === 95) return [y0 + UY, true];     // _
    if (ch === 47) return [y0 + UY * (1 - f), false];   // /
    if (ch === 92) return [y0 + UY * f, false];         // \
    return [y0 + UY, false];
  }
  let S;
  function hud() {
    const arw = (v, a, b) => v < 0 ? a : b;
    const num = v => String(Math.abs(Math.round(v))).padStart(5);
    let s = '     FUEL:' + String(Math.max(0, Math.round(S.fuel))).padStart(6) + '  HORZ VEL.: ' + arw(S.hv, C(17), C(16)) + num(S.hv) +
      '  VERT VEL.: ' + arw(S.vv, C(30), C(31)) + num(S.vv) + '      ';
    put(10, 0, s, 0, 7);
    if (S.fuel < 100 && S.fuel > 0 && Math.floor(S.time * 2) % 2) put(0, 0, ' LOW FUEL ', 15, 0); else put(0, 0, '          ', 7, 0);
  }
  function scoreLine() { const s = ' SCORE:' + String(S.score).padStart(6) + ' '; put(33, 23, s, 0, 7); }
  function far() {
    for (let r = 1; r <= 23; r++) put(0, r, ' '.repeat(80), 7, 0);
    const off = Math.floor(S.wx) - 40;
    for (let k = 0; k < EL_TERRAIN.length; k++) {
      let s = '';
      for (let c = 0; c < 80; c++) { const x = ((off + c) % TW + TW) % TW; s += EL_TERRAIN[k][x]; }
      put(0, TER_R0 + k, s, 7, 0);
    }
    const row = 1 + Math.floor(S.y / UY);
    if (row >= 1 && row <= 23) put(40, row, LANDER, 15, 0);
  }
  function close() {
    for (let r = 1; r <= 24; r++) put(0, r, ' '.repeat(80), 7, 0);
    // ground under the feet (row 10 is the bottom of the lander)
    for (let c = 0; c < 80; c++) {
      const [gy, flat] = ground(S.wx + (c - 40) * CX / UX);
      const rr = 10 + Math.round((gy - S.y - UY) / CY);
      if (rr >= 1 && rr <= 24) putc(c, rr, flat ? 178 : 176, 7);
      if (!flat) { const [gy2] = ground(S.wx + (c - 39.5) * CX / UX); const r2 = 10 + Math.round((gy2 - S.y - UY) / CY); if (r2 !== rr && r2 >= 1 && r2 <= 24) putc(c, r2, 176, 7); }
    }
    BIG.forEach(([x, s], i) => put(x, 3 + i, s, 7, 0));
    if (S.burn) { const a = Math.floor(S.time * 12) % 2; put(39, 8, a ? C(186) + C(157) + C(186) : C(157) + C(186) + C(157), 12, 0); putc(40, 9, a ? 186 : 157, 12 | 0); }
  }
  function message(a, b) { put(0, 20, ' '.repeat(80), 7, 0); put(0, 21, ' '.repeat(80), 7, 0); center80(20, a, 15, 0); center80(21, b, 15, 0); }
  function newDescent() {
    S.y = 0; S.vv = 0; S.hv = 50; S.fuel = Math.max(S.fuel, 0) || 650; S.wx = Math.random() * TW;
    S.phase = 'appear'; S.timer = 3.0; S.view = 'far'; S.time = 0;
    cls(); far(); put(18, 24, BAR, 0, 7);
  }
  function crash() {
    S.phase = 'crash'; S.timer = 0; clip('el_crash'); S.movie = new Movie('el_crash');
  }
  return {
    view: [0, 80], pad: 'lander', players: false,
    start() { S = { score: 0, fuel: 650, held: new Set(), latch: 2 }; newDescent(); },
    stop() { spkStop(); },
    padText(k) { return k === 'Pwr' ? 'PWR ' + S.latch : null; },
    key(k, down) {
      if (/^T[1-6]$/.test(k)) { if (down) S.latch = +k[1]; return; }
      if (k === 'Pwr') { if (down) S.latch = S.latch % 6 + 1; return; }
      if (down) S.held.add(k); else S.held.delete(k);
    },
    update(dt) {
      S.time += dt;
      if (S.phase === 'appear') { S.timer -= dt; if (S.timer <= 0) { S.phase = 'fly'; } return; }
      if (S.phase === 'crash') {
        S.movie.step(dt);
        if (S.movie.done) {
          message("You Just Destroyed A $147 million Lunar Lander!!", "Good Thing You Don't Work For NASA !");
          scoreLine(); S.phase = 'over'; gameOver();
        }
        return;
      }
      if (S.phase === 'landed') {
        S.timer -= dt;
        if (S.timer <= 0) newDescent();
        return;
      }
      if (S.phase !== 'fly') return;
      // controls: a direction key plus a throttle (held digit, or the pad's chosen throttle)
      const h = S.held;
      let n = 0;
      for (let d = 6; d >= 1; d--) if (h.has(String(d))) { n = d; break; }
      const up = h.has('Up') || h.has('8'), left = h.has('Left') || h.has('4'), right = h.has('Right') || h.has('6');
      const ul = h.has('7') || h.has('Home') || (up && left), ur = h.has('9') || h.has('PgUp') || (up && right);
      const anyDir = up || left || right || ul || ur;
      if (anyDir && !n) n = S.latch;
      const thrust = anyDir && S.fuel > 0 ? 3.3 * Math.pow(n, 1.3) : 0;
      let ax = 0, ay = G;
      if (thrust) {
        if (ul || ur) { ay -= thrust; ax += ul ? -thrust : thrust; S.fuel -= thrust * 1.25 * dt; }
        else if (up) { ay -= thrust; S.fuel -= thrust * dt; }
        else { ax += left ? -thrust : thrust; S.fuel -= thrust * dt; }
      }
      S.burn = thrust > 0;
      S.vv += ay * dt; S.hv += ax * dt;
      S.y += S.vv * dt; S.wx += S.hv / UX * dt;
      hud();
      if (S.y < -UY * 6) { message('Sorry,  But You Blasted Out Of Orbit', 'Your Ship Is Forever Lost In Space'); scoreLine(); S.phase = 'over'; gameOver(); return; }
      // the original switches to the close-up once the lander is down to screen row 11
      const feet = [ground(S.wx - 0.3), ground(S.wx), ground(S.wx + 0.3)];
      const clear = Math.min(...feet.map(g => g[0])) - (S.y + UY);
      S.view = S.y >= 10 * UY ? 'close' : 'far';
      if (S.view === 'far') far(); else close();
      if (clear <= 0) {
        const flat = feet.every(g => g[1]) && Math.abs(feet[0][0] - feet[2][0]) < 1;
        if (flat && Math.abs(S.vv) <= 15 && Math.abs(S.hv) <= 15) {
          // narrow pads are worth more
          let w = 0; for (let k = -6; k <= 6; k++) if (ground(S.wx + k)[1]) w++;
          S.score += Math.max(50, (8 - Math.min(7, w)) * 50) + Math.round(S.fuel / 10);
          S.vv = 0; S.hv = 0; S.burn = false; close(); hud();
          message('The PC  EAGLE Has Landed !!!', 'Great Landing. You Get Another Try'); scoreLine();
          S.phase = 'landed'; S.timer = 4;
        } else crash();
      }
    }
  };
})();
