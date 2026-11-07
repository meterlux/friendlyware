/* ===== J: PC DERBY =====
   Measured: seven horses -▄▄n▄░▀ (horse n in CGA color n) gallop with a six-frame leg cycle (0.068 s a frame);
   the rail (═ with ╦ posts every 23 columns) and the lower fence (posts every 46) scroll left about 15 columns
   a second; horses creep across the screen and a race lasts about 44 s. Each horse's pace is redrawn three
   times a race (the three 'kicks' in the instructions). No sound. The winner is announced on rows 0-1. */
GAMES.j = (() => {
  const LEGS = [[0, C(223) + C(223) + C(223) + '  ' + C(219)], [1, C(223) + C(223) + ' ' + C(220) + C(223)], [2, C(223) + C(220) + C(223) + C(223)],
                [1, C(223) + C(219) + ' ' + C(223) + C(223)], [1, C(219) + C(223) + '  ' + C(223) + C(223)], [0, C(220) + C(223) + C(223) + '  ' + C(223) + C(220)]];
  const FRAME = 0.068, SCROLL = 15, FINISH = 72;
  let S;
  function scenery() {
    const off = Math.floor(S.scroll);
    let rail = '', posts = '', f1 = '', f2 = '';
    for (let x = 0; x < 80; x++) {
      const a = ((x + off) % 23 + 23) % 23 === 0, b = ((x + off) % 46 + 46) % 46;
      rail += a ? C(203) : C(205); posts += a ? C(186) : ' ';
      f1 += b === 0 ? C(191) : b === 2 ? C(218) : b === 1 ? ' ' : C(196);
      f2 += b === 0 || b === 2 ? C(179) : ' ';
    }
    put(0, 2, rail, 7, 0); put(0, 3, posts, 7, 0);
    put(0, 20, C(196).repeat(80), 7, 0); put(0, 21, f1, 7, 0); put(0, 22, f2, 7, 0);
  }
  function horse(i, h) {
    const r = 5 + i * 2, x = Math.round(h.x);
    put(0, r, ' '.repeat(80), 7, 0); put(0, r + 1, ' '.repeat(80), 7, 0);
    put(x, r, '-' + C(220) + C(220), i + 1, 0); put(x + 3, r, String(i + 1), 15, 0); put(x + 4, r, C(220) + C(176) + C(223), i + 1, 0);
    const [dx, s] = LEGS[h.leg];
    put(x + dx, r + 1, s, i + 1, 0);
  }
  function newPaces() { for (const h of S.h) h.v = 0.35 + Math.random() * 2.3; }
  function startRace() {
    cls();
    S.h = Array.from({ length: 7 }, (_, i) => ({ x: 4 + Math.round(Math.random()), leg: Math.floor(Math.random() * 6), t: Math.random() * FRAME, v: 1 }));
    S.scroll = 0; S.time = 0; S.kick = 0; S.phase = 'race'; newPaces();
    put(18, 24, BAR, 0, 7);
  }
  return {
    view: [0, 80], pad: 'derby', players: false,
    start() { S = {}; startRace(); },
    stop() {},
    key(k, down) {
      if (!down || S.phase !== 'done') return;
      if (k === 'F5') startRace(); else goMenu();
    },
    update(dt) {
      if (S.phase !== 'race') return;
      S.time += dt; S.scroll += SCROLL * dt;
      // three kicks: a new pace for every horse at one and two thirds of the race
      if (S.kick < 2 && S.time > (S.kick + 1) * 14.5) { S.kick++; newPaces(); }
      for (const h of S.h) {
        h.x = Math.min(FINISH, h.x + h.v * dt);
        h.t += dt; while (h.t >= FRAME) { h.t -= FRAME; h.leg = (h.leg + 1) % 6; }
      }
      scenery();
      S.h.forEach((h, i) => horse(i, h));
      const win = S.h.findIndex(h => h.x >= FINISH);
      if (win >= 0) {
        S.phase = 'done';
        put(26, 0, ' HORSE NO. ' + (win + 1) + ' IS THE WINNER ! ', 0, 7);
        put(26, 1, ' Strike  <F5>  To Race Again ', 0, 7);
        put(18, 24, ' '.repeat(45), 0, 7); put(18, 24, '         Strike Any Key To Continue          ', 0, 7);
      }
    }
  };
})();
