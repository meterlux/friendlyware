/* ===== H: HOPPER (v1.4 gameplay, unchanged) ===== */
GAMES.h = (() => {
const DIM = 1, NRM = 2, BRT = 3;
const VX = 12, VW = 57;
// v1.4 drew with an intensity plus a CGA color; on a mono tube these were its brightness levels
const hput = (x, y, s, a = NRM, col = 0) => put(x, y, s, col || 7, 0);
const hcenter = (y, s, a, col) => hput(VX + Math.floor((VW - s.length) / 2), y, s, a, col);
const hrjust = (xEnd, y, s, a, col) => hput(xEnd - s.length + 1, y, s, a, col);
const blink = (now, rate = 2) => Math.floor(now * rate) % 2 === 0;
const SFX = {
  hop: () => clip('hp_hop'),          // the original's 580 Hz click
  back: () => clip('hp_hop'),
  die: () => clip('hp_die'),          // the original's 74 Hz buzz, 1.3 s
  home: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.07, i * 0.07)),
  level: () => [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.08, i * 0.08)),
  over: () => [523, 440, 349, 262].forEach((f, i) => tone(f, 0.18, i * 0.2))
};
const ROW_HUTCH = 5, ROW_START = 17, START_X = 40, PF_L = 13, PF_R = 67;
const BAYS = [16, 28, 40, 52, 64];
const RABBIT = C(2), RABBIT_DEAD = C(1), HATCH = C(0xB1), BLOCK = C(0xDB);
const LOGC = C(0xCD);
const CAR = C(0xC6) + LOGC + LOGC + C(0xB5);
const TRUCK = C(0xC6) + LOGC.repeat(8) + C(0xB5);
const TURTLE = C(0xCC) + C(0xB9), DIVER = C(0xF0) + C(0xF1);   // F0/F1 mark the diving group
const TIMER_BLOCKS = 30, BLOCK_SECS = 1.0, LIVES = 5;

const seq = parts => parts.map(p => typeof p === 'number' ? ' '.repeat(p) : p).join('');
const rep = (s, n) => s.repeat(n);
function placed(len, items) {
  const a = Array(len).fill(' ');
  for (const [at, s] of items) for (let k = 0; k < s.length; k++) a[(at + k) % len] = s[k];
  return a.join('');
}
const pair = TURTLE + ' ' + TURTLE, dpair = DIVER + ' ' + DIVER;
const trio = TURTLE + ' ' + TURTLE + ' ' + TURTLE, dtrio = DIVER + ' ' + DIVER + ' ' + DIVER;
// speed in columns per second; + is rightward
// lane colors in Color mode (CGA): river gray, truck gray, cars cyan / red / magenta / brown
const LANE_DEFS = [
  { y: 6,  v:  5.2, p: rep(LOGC.repeat(14) + ' '.repeat(8), 4) },
  { y: 7,  v: -7.4, p: seq([pair, 9, pair, 18, pair, 8, dpair, 9, pair, 9]), dive: [1.2, 0.45, 0.5, 0.45] },
  { y: 8,  v: 13.2, p: rep(LOGC.repeat(22) + ' '.repeat(8), 4) },
  { y: 9,  v:  2.0, p: rep(LOGC.repeat(11) + ' '.repeat(11), 4) },
  { y: 10, v: -7.5, p: rep(trio + ' '.repeat(7), 3) + dtrio + ' '.repeat(7) + rep(trio + ' '.repeat(7), 4), dive: [1.6, 0.4, 0.6, 0.4] },
  { y: 12, v: -6.2, p: placed(80,  [[0, TRUCK], [27, TRUCK]]) },
  { y: 13, col: 3, v:  5.7, p: placed(99,  [[0, CAR], [48, CAR]]) },
  { y: 14, col: 4, v: -2.9, p: placed(119, [[0, CAR], [18, CAR], [54, CAR], [71, CAR], [88, CAR]]) },
  { y: 15, col: 5, v:  3.3, p: placed(71,  [[0, CAR], [18, CAR], [36, CAR]]) },
  { y: 16, col: 6, v: -2.6, p: placed(109, [[0, CAR], [15, CAR], [50, CAR], [68, CAR], [86, CAR]]) }
];
const RIVER = y => y >= 6 && y <= 10, ROAD = y => y >= 12 && y <= 16;
const mod = (a, n) => ((a % n) + n) % n;
/* What the rabbit can stand on, checked against the original: logs, turtles (even while sinking),
   and the one-column gaps inside a turtle group. One column outside a group is water.
   1 = solid, 2 = solid unless the diving group is under, 0 = water. */
const isTurtle = c => c === 0xCC || c === 0xB9 || c === 0xF0 || c === 0xF1;
function solidMask(cells) {
  const n = cells.length;
  return cells.map((c, i) => {
    if (c === 0xCD || c === 0xCC || c === 0xB9) return 1;
    if (c === 0xF0 || c === 0xF1) return 2;
    const a = cells[mod(i - 1, n)], b = cells[mod(i + 1, n)];
    if (c === 32 && isTurtle(a) && isTurtle(b)) return a >= 0xF0 || b >= 0xF0 ? 2 : 1;
    return 0;
  });
}
const lanes = LANE_DEFS.map(d => {
  const cells = Array.from(d.p).map(c => c.charCodeAt(0));
  return { ...d, cells, solid: solidMask(cells), pos: 0, shift: 0, clock: 0 };
});
const laneAt = {};
lanes.forEach(l => { laneAt[l.y] = l; });
function resetLanes() { lanes.forEach((l, i) => { l.pos = (i * 7) % l.cells.length; l.shift = Math.floor(l.pos); l.clock = 0; }); }
function divePhase(l) {
  if (!l.dive) return 0;
  const [a, b, c, d] = l.dive, t = l.clock % (a + b + c + d);
  return t < a ? 0 : t < a + b ? 1 : t < a + b + c ? 2 : 1;   // 0 up, 1 sinking/rising, 2 under
}
function laneCode(l, x) {
  let code = l.cells[mod(x - l.shift, l.cells.length)];
  if (code === 0xF0 || code === 0xF1) {
    const ph = divePhase(l);
    if (ph === 2) return 32;
    code = ph === 1 ? (code === 0xF0 ? 0xC3 : 0xB4) : (code === 0xF0 ? 0xCC : 0xB9);
  }
  return code;
}


const G = { players: [], cur: 0, nPlayers: 1, rabbit: { x: START_X, y: ROW_START, dead: 0 },
  timer: TIMER_BLOCKS * BLOCK_SECS, hopCool: 0, hi: store.get('hi.h', store.get('hi', 0)), paused: false, over: false };
const P = () => G.players[G.cur];
const speedMul = () => Math.min(2, 1 + 0.12 * (P().level - 1));
function newRabbit() { G.rabbit = { x: START_X, y: ROW_START, dead: 0 }; G.timer = TIMER_BLOCKS * BLOCK_SECS; }
function bumpHi() { const s = P().score; if (s > G.hi) { G.hi = s; store.set('hi.h', G.hi); } }
// kind: 'splash' (water), 'splat' (traffic), 'lost' (timer or hutch wall: hollow rabbit)
function die(kind = 'lost') {
  const r = G.rabbit;
  if (r.dead) return;
  r.dead = 1.4; r.kind = kind; SFX.die();
}
function afterDeath() {
  const p = P();
  p.lives--;
  const alive = G.players.map((q, i) => q.lives > 0 ? i : -1).filter(i => i >= 0);
  if (!alive.length) { G.over = true; SFX.over(); bumpHi(); gameOver(); return; }
  if (G.nPlayers > 1) {
    const next = (G.cur + 1) % G.nPlayers;
    G.cur = G.players[next].lives > 0 ? next : G.cur;
  }
  newRabbit();
}
function checkRabbit() {
  const r = G.rabbit;
  if (r.dead) return;
  if (r.x < PF_L || r.x > PF_R) return die('lost');
  const l = laneAt[r.y];
  if (!l) return;
  if (ROAD(r.y) && laneCode(l, r.x) !== 32) return die('splat');
  if (RIVER(r.y)) {
    const s = l.solid[mod(r.x - l.shift, l.cells.length)];
    if (s === 0 || (s === 2 && divePhase(l) === 2)) return die('splash');
  }
}
function hop(dx, dy) {
  const r = G.rabbit, p = P();
  if (r.dead || G.hopCool > 0) return;
  G.hopCool = 0.09;
  const nx = r.x + dx * 3, ny = r.y + dy;
  if (ny > ROW_START || nx < PF_L || nx > PF_R) return;
  if (ny === ROW_HUTCH) {
    const bay = BAYS.findIndex(b => Math.abs(nx - b) <= 1);
    r.x = nx; r.y = ny;
    if (bay < 0 || p.homes[bay]) return die('lost');
    p.homes[bay] = 1;
    p.score += 10 + Math.ceil(G.timer / BLOCK_SECS) * 10;
    if (p.homes.every(Boolean)) { p.score += 1000; p.level++; p.homes = [0, 0, 0, 0, 0]; SFX.level(); }
    else SFX.home();
    bumpHi(); newRabbit();
    return;
  }
  r.x = nx; r.y = ny;
  if (dy < 0) { p.score += 10; bumpHi(); SFX.hop(); } else SFX.back();
  checkRabbit();
}

function update(dt) {
  if (G.paused || G.over) return;
  G.hopCool = Math.max(0, G.hopCool - dt);
  const r = G.rabbit, m = speedMul();
  // the original freezes every lane while a rabbit's death plays out
  if (!r.dead) for (const l of lanes) {
    l.clock += dt;
    l.pos += l.v * m * dt;
    const ns = Math.floor(l.pos), delta = ns - l.shift;
    l.shift = ns;
    if (!r.dead && r.y === l.y && RIVER(l.y)) r.x += delta;
  }
  if (r.dead) {
    r.dead -= dt;
    if (r.dead <= 0) afterDeath();
    return;
  }
  G.timer -= dt;
  if (G.timer <= 0) { G.timer = 0; return die('lost'); }
  checkRabbit();
}

function drawField(now) {
  const p = P(), r = G.rabbit;
  // header
  if (G.cur !== 0 || !blink(now, 2) || false) hput(15, 0, '1 UP', BRT, 15);
  if (G.cur !== 1 || !blink(now, 2) || false) hput(61, 0, '2 UP', BRT, 15);
  hrjust(19, 1, String(G.players[0].score), BRT, 7);
  hrjust(65, 1, String(G.players[1] ? G.players[1].score : 0), BRT, 7);
  // hutch
  hput(PF_L, 4, HATCH.repeat(PF_R - PF_L + 1), DIM, 2);
  for (let x = PF_L; x <= PF_R; x++) {
    const bay = BAYS.findIndex(b => Math.abs(x - b) <= 1);
    if (bay < 0) hput(x, ROW_HUTCH, HATCH, DIM, 2);
    else if (p.homes[bay] && x === BAYS[bay]) hput(x, ROW_HUTCH, RABBIT, BRT, 10);
  }
  // lanes
  for (const l of lanes) {
    for (let x = PF_L; x <= PF_R; x++) {
      const code = laneCode(l, x);
      if (code !== 32) hput(x, l.y, C(code), NRM, l.col || 7);
    }
  }
  hput(PF_L, 11, HATCH.repeat(PF_R - PF_L + 1), DIM, 2);
  hput(PF_L, ROW_START, HATCH.repeat(PF_R - PF_L + 1), DIM, 2);
  if (r.dead && r.kind !== 'lost') {
    // 3x3 block burst, as in the original: half blocks above and below, solid row in the middle
    const water = r.kind === 'splash';
    for (let dx = -1; dx <= 1; dx++) {
      const x = r.x + dx;
      if (x < PF_L || x > PF_R) continue;
      hput(x, r.y - 1, C(0xDC), NRM, water ? 7 : 6);
      hput(x, r.y, BLOCK, dx ? NRM : BRT, dx ? 7 : (water ? 1 : 10));
      hput(x, r.y + 1, C(0xDF), NRM, water ? 2 : 7);
    }
  } else if (r.x >= PF_L && r.x <= PF_R && r.y !== ROW_HUTCH || r.dead) hput(r.x, r.y, r.dead ? RABBIT_DEAD : RABBIT, BRT, 10);
  // reserve rabbits and timer
  const reserve = Math.max(0, p.lives - 1);
  for (let i = 0; i < reserve; i++) hput(PF_L + i * 2, 20, RABBIT, BRT, 10);
  const n = Math.ceil(G.timer / BLOCK_SECS);
  hput(62 - n, 20, BLOCK.repeat(n), NRM);
  hput(63, 20, 'TIMER', NRM);
  // bottom line
  if (G.paused) hcenter(24, 'Paused   Press Esc To Continue', BRT, 15);
  else bottomBar();
}


const LUM_HOPPER = [0, 1, .4, .8, .8, .8, .8, .8, .4, .8, 1, 1, .8, .8, 1, 1];
return {
  view: [VX, VW], pad: 'hopper', lum: LUM_HOPPER,
  start(n) {
    G.nPlayers = n; G.cur = 0; G.paused = false; G.over = false;
    G.players = Array.from({ length: n }, () => ({ score: 0, lives: LIVES, homes: [0, 0, 0, 0, 0], level: 1 }));
    resetLanes(); newRabbit(); requestWake();
    clip('hp_intro');                   // the original's opening tune (play is not held for it)
  },
  key(k, down) {
    if (!down) return;
    if (k === 'Esc') { G.paused = !G.paused; return; }
    if (G.paused) return;
    if (k === 'Up' || k === '8') hop(0, -1);
    else if (k === 'Down' || k === '2') hop(0, 1);
    else if (k === 'Left' || k === '4') hop(-1, 0);
    else if (k === 'Right' || k === '6') hop(1, 0);
  },
  update(dt, now) { update(dt); cls(); drawField(now); }
};
})();
