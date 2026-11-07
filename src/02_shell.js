/* ===== shell: the original's splash, color question, menu, instructions, prompts ===== */
const GAMES = {};          // filled by each game file: GAMES.a = {...}
const MENU = 'abcdefghijk';
const MENU_NAMES = { a: 'BRICK BREAKER', b: 'EAGLE LANDER', c: 'BUG BLASTER', d: 'GORILLA GORILLA', e: 'STARFIGHTER',
  f: 'SHOOTER', g: 'ASCII MAN', h: 'HOPPER', i: 'ROBOT WAR', j: 'PC DERBY', k: 'INSTRUCTIONS FOR ALL GAMES' };
const MENU_POS = { a: [18, 7], b: [18, 9], c: [18, 11], d: [18, 13], e: [18, 15], f: [49, 7], g: [49, 9], h: [49, 11], i: [49, 13], j: [49, 15], k: [24, 17] };
const BAR = ' <F1>Boss  <F9>Turns Sound Off  <F10>To Menu ';
const Sys = {
  state: 'splash', t: 0, movie: null, sel: 0, game: null, letter: null,
  prompt: null, promptRow: null, bossFrom: null, note: '', noteT: 0
};
function bottomBar() { put(18, 24, BAR, 0, 7); }

function goSplash() {
  Sys.state = 'splash'; Sys.t = 0; setView(0, 80); setLum(null);
  cls(); Sys.movie = new Movie('splash');
}
// the color question comes first (a nostalgia cheat), shown on the amber tube, then the intro scroll
// a quick DOS boot before the color question: B> prompt, GAMES.EXE typed in, then the loading lines
// [start, row, prompt, text, seconds per character, seconds per trailing dot]
const BOOT = [
  [0.9, 0, 'B>  ', 'GAMES.EXE', 0.17, 0],
  [2.9, 1, '', 'READING FLOPPY DISK', 0.028, 0.5],
  [5.2, 2, '', 'LOADING FRIENDLYWARE PC ARCADE 2026  V.' + VERSION, 0.024, 0],
  [7.2, 3, '', 'LOADING', 0.06, 0.6]
];
const BOOT_END = 9.5;
function goBoot() { spkStop(); setPhosphor(0); document.body.classList.add('booting'); Sys.state = 'boot'; Sys.t = 0; setView(0, 80); setLum(null); cls(); }
function bootDraw(t) {
  cls();
  let row = 0, cur = [2, 0];
  put(0, 0, 'B>', 7, 0);
  for (const [t0, r, pre, text, rate, dot] of BOOT) {
    if (t < t0) break;
    const n = Math.min(text.length, Math.floor((t - t0) / rate) + 1);
    put(pre.length, r, text.slice(0, n), 7, 0);
    cur = [pre.length + n, r];
    // the drive light: dots tick out while the disk is read
    if (dot && n === text.length) { const d = Math.max(0, Math.min(3, Math.floor((t - t0 - text.length * rate) / dot))); put(text.length, r, '.'.repeat(d), 7, 0); cur = [text.length + d, r]; }
    row = r;
  }
  // solid block cursor, blinking like the PC's
  if (Math.floor(t / 0.16) % 2 === 0 || t < BOOT[0][0]) putc(cur[0], cur[1], 219, 7);
  return row;
}
function goColorQ() {
  document.body.classList.remove('booting'); spkStop(); setPhosphor(0); Sys.state = 'colorq'; setView(0, 80); setLum(null); loadPage('colorq'); }
function goMenu() {
  setFontOv(null); spkStop(); Sys.state = 'menu'; Sys.game = null; Sys.prompt = null; setView(0, 80); setLum(null);
  loadPage('menu'); Sys.sel = Math.max(0, Sys.sel);
}
function goInstrPick() {
  Sys.state = 'instrpick'; loadPage('menu');
  put(18, 17, ' '.repeat(46), 0, 0);
  put(18, 17, ' For which game would you like instructions? ', 0, 7);
}
function goInstr(letter) {
  Sys.state = 'instr'; Sys.letter = letter; setView(0, 80); loadPage('instr_' + letter);
}
function chooseGame(letter) {
  const g = GAMES[letter];
  if (!g) { Sys.note = MENU_NAMES[letter] + ' is not in this build yet'; Sys.noteT = 2.5; return; }
  Sys.letter = letter;
  if (g.players === false) return startGame(letter, 1);
  Sys.state = 'players'; setView(0, 80); loadPage('players');
}
function startGame(letter, n) {
  const g = GAMES[letter];
  Sys.state = 'game'; Sys.game = g; Sys.prompt = null;
  setView(g.view ? g.view[0] : 0, g.view ? g.view[1] : 80); setLum(g.lum || null); setFontOv(g.font || null);
  cls(); g.start(n);
}
// yes/no prompt on row 24 (leave game / play again)
function askRow24(kind) {
  Sys.prompt = kind; Sys.promptRow = saveRow(24);
  put(0, 24, ' '.repeat(80), 7, 0);
  const s = kind === 'leave' ? ' Do You Wish To Leave This Game?  <Y/N> ' : ' Would You Like To Play Again?  <Y/N> ';
  put(kind === 'leave' ? 20 : 21, 24, s, 15, 0);
}
function answerRow24(yes) {
  const kind = Sys.prompt; Sys.prompt = null;
  if (kind === 'leave') {
    if (yes) { Sys.game.stop && Sys.game.stop(); return goMenu(); }
    restoreRow(24, Sys.promptRow); return;
  }
  if (kind === 'again') {
    if (yes) { const L = Sys.letter; if (GAMES[L].players === false) return startGame(L, 1); Sys.state = 'players'; setView(0, 80); setLum(null); return loadPage('players'); }
    return goMenu();
  }
}
// games call this when the game is over
function gameOver() { askRow24('again'); }

function sysKey(k, fromPad) {
  if (k === 'F9') { toggleSound(); return; }
  if (k === 'F1' && Sys.state !== 'splash') {
    if (Sys.state === 'boss') { Sys.state = Sys.bossFrom.state; restoreScreen(Sys.bossFrom.scr); setView(Sys.bossFrom.view.x0, Sys.bossFrom.view.w); return; }
    Sys.bossFrom = { state: Sys.state, scr: [scrCh.slice(), scrAt.slice()], view: { ...view } };
    spkStop(); Sys.state = 'boss'; setView(0, 80); loadPage('boss'); return;
  }
  switch (Sys.state) {
    case 'boot': goColorQ(); return;
    case 'splash': Sys.movie.finish(); goMenu(); return;
    case 'colorq':
      if (k === 'Y') { setPhosphor(PHOSPHORS.findIndex(p => p.color)); goSplash(); }
      else if (k === 'N') { setPhosphor(0); goSplash(); }
      return;
    case 'boss': return;
    case 'menu': case 'instrpick': {
      const L = k.length === 1 ? k.toLowerCase() : '';
      if (Sys.state === 'instrpick') {
        if (L && 'abcdefghij'.includes(L)) goInstr(L);
        else if (k === 'Enter' && Sys.sel < 10) goInstr(MENU[Sys.sel]);
        else if (k === 'F10' || k === 'Esc') goMenu();
        else if (k === 'Left' || k === 'Right') moveSel(k === 'Left' ? -1 : 1, 10);
        return;
      }
      if (L && MENU.includes(L)) { Sys.sel = MENU.indexOf(L); return L === 'k' ? goInstrPick() : chooseGame(L); }
      if (k === 'Left' || k === 'Up') moveSel(-1, 11);
      else if (k === 'Right' || k === 'Down') moveSel(1, 11);
      else if (k === 'Enter' || k === 'Space') { const L2 = MENU[Sys.sel]; return L2 === 'k' ? goInstrPick() : chooseGame(L2); }
      return;
    }
    case 'instr': if (k !== 'F10') chooseGame(Sys.letter); else goMenu(); return;
    case 'players':
      if (k === '1' || k === '2') startGame(Sys.letter, +k);
      else if (k === 'F10') goMenu();
      return;
    case 'game':
      if (Sys.prompt) {
        if (k === 'Y') answerRow24(true); else if (k === 'N') answerRow24(false);
        return;
      }
      if (k === 'F10') { askRow24('leave'); return; }
      Sys.game.key && Sys.game.key(k, true);
      return;
  }
}
function sysKeyUp(k) { if (Sys.state === 'game' && !Sys.prompt && Sys.game.key) Sys.game.key(k, false); }
function moveSel(d, n) { Sys.sel = ((Sys.sel % n) + d + n) % n; }
function restoreScreen(s) { scrCh.set(s[0]); scrAt.set(s[1]); }

function sysUpdate(dt, now) {
  Sys.t += dt;
  if (Sys.noteT > 0) Sys.noteT -= dt;
  switch (Sys.state) {
    case 'boot': {
      const prev = Sys.t - dt;
      bootDraw(Sys.t);
      // a floppy-seek tick as each line starts
      for (const [t0] of BOOT) if (prev < t0 && Sys.t >= t0) { tone(90, 0.03); tone(70, 0.03, 0.06); }
      if (Sys.t >= BOOT_END) goColorQ();
      break;
    }
    case 'splash':
      Sys.movie.step(dt);
      if (Sys.movie.done && Sys.movie.t > Sys.movie.dur + 0.2) goMenu();
      break;
    case 'menu': case 'instrpick': {
      // a blinking box marks the touch selection (the original had none); keyboard mode goes without it
      for (const L of MENU) {
        const [x, y] = MENU_POS[L];
        if (Sys.state === 'instrpick' && L === 'k') continue;
        const on = ctlMode === 'pad' && MENU[Sys.sel] === L && Math.floor(now * 3) % 2 === 0;
        put(x, y, ' ' + L.toUpperCase() + ' ', on ? 15 : 0, on ? 0 : 7);
      }
      if (Sys.state === 'menu') { put(16, 19, ' '.repeat(48), 7, 0); if (Sys.noteT > 0) center80(19, Sys.note, 7, 0); }
      break;
    }
    case 'game':
      if (!Sys.prompt && Sys.game.update) Sys.game.update(dt, now);
      break;
  }
}
