import glob, os, re
S = '.'
head = open(S + '/head.html').read()
head = head.replace('<title>Hopper Arcade</title>', '<title>PC Arcade 2.7.7</title>')
head = head.replace('Monochrome display &middot; 80&times;25', 'PC Arcade v2.7.7 &middot; 80&times;25')
head = re.sub(r'<div class="pad" id="pad">.*?</div>\n    </div>', '<div class="pad" id="pad"></div>\n    </div>', head, flags=re.S)
head = re.sub(r'<nav class="bar">.*?</nav>', '''<nav class="bar">
    <div class="chips">
      <button class="chip mode" id="modeBtn">Pad</button>
      <button class="chip lay" id="layBtn" aria-label="Pad layout"></button>
      <button class="chip fk" id="kF1" aria-label="F1 boss key">F1</button>
    </div>
    <div class="chips">
      <button class="chip" id="sndBtn">Snd: on</button>
      <button class="chip" id="phosBtn">Green</button>
      <button class="chip fk" id="kF10" aria-label="F10 menu">F10</button>
    </div>
  </nav>''', head, flags=re.S)
head = head.replace('<span id="padName">Hopper pad</span>', '<span id="padName">PC Arcade</span>')
css_old = head[head.index('.pad{flex:0 0 auto;'):head.index('.pb{display:flex;')]
css_new = """.pad{flex:0 0 auto;display:grid;grid-template-columns:repeat(3,minmax(0,154px));justify-content:space-between;gap:12px;padding-bottom:10px}
.pad .pb{aspect-ratio:1;width:100%;height:auto;border:1.5px solid var(--line-strong);border-radius:18px;background:var(--fill)}
.pad .pb.off{border-color:var(--line);background:transparent;opacity:.35}
.lay-four .a-l{grid-area:l;align-self:center}.lay-four .a-r{grid-area:r;align-self:center}
.lay-four .a-u{grid-area:u}.lay-four .a-d{grid-area:d}
.lay-four .a-f{grid-area:f;aspect-ratio:auto;height:100%}
.lay-eight.mir{grid-template-columns:minmax(0,140px) repeat(3,minmax(0,74px));grid-template-areas:"f ul u ur" "f l . r" "f dl d dr"}
html.color #scr{filter:none}
.bar button:focus{outline:none}
.bar .chips{gap:5px}
.bar .chip{letter-spacing:.1em;padding:9px 6px;text-align:center;white-space:nowrap}
.chip.mode{min-width:58px}#sndBtn{min-width:72px}#phosBtn{min-width:56px}.chip.fk{min-width:32px;padding:9px 4px}
.lay-cross{--cx:minmax(0,82px);--cf:minmax(0,118px);gap:8px;justify-content:stretch}
.pb{transition:none}.pb.on{box-shadow:none}
.booting #pad,.booting #kbd,.booting .strip span{visibility:hidden}
.lay-slide{grid-template-columns:1fr}
.pad.lay-row{display:flex;justify-content:center;align-items:center;gap:12px}
.lay-row .pb{width:var(--sq,110px);flex:0 0 auto}
.slider{height:clamp(110px,26vw,154px);border:1.5px solid var(--line-strong);border-radius:18px;background:var(--fill);touch-action:none;
  display:flex;align-items:center;justify-content:center;font:18px/1 var(--font-term);letter-spacing:.3em;color:var(--mute)}
.slider.on{background:var(--press);color:var(--phos)}
.stick{aspect-ratio:1;width:100%;align-self:center;touch-action:none}
.stick svg{width:100%;height:100%;overflow:visible}
.stick .w{fill:var(--fill);stroke:var(--line-strong);stroke-width:1.2;stroke-linejoin:round;transition:fill .06s}
.stick .w.on{fill:var(--press);stroke:var(--phos)}
.stick .lbl{font:5.5px var(--font-term);letter-spacing:.06em;fill:var(--text);text-anchor:middle;pointer-events:none}
.stick .ch{fill:none;stroke:var(--text);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
.lay-cross .pb{border-radius:14px}.lay-cross .pb svg{width:30px;height:30px}.lay-cross .pb span{font-size:15px}
.lay-cross .a-u{grid-area:u}.lay-cross .a-d{grid-area:d}.lay-cross .a-l{grid-area:l}.lay-cross .a-r{grid-area:r}
.lay-cross .a-f{grid-area:f;aspect-ratio:auto;height:100%}
.chip.lay{padding:5px 9px;display:flex;align-items:center}
.chip.lay svg{width:34px;height:19px;fill:none;stroke:currentColor;stroke-width:1.2}
.chip.lay:disabled{opacity:.3}
.chip.lay[hidden]{display:none}
.lay-hopper{grid-template-areas:"l r u" "l r d"}
.lay-hopper .a-l{grid-area:l;align-self:center}.lay-hopper .a-r{grid-area:r;align-self:center}
.lay-hopper .a-u{grid-area:u;align-self:end}.lay-hopper .a-d{grid-area:d;align-self:start}
.lay-lr2{grid-template-areas:"l . r"}
.lay-lr2 .a-l{grid-area:l}.lay-lr2 .a-r{grid-area:r}
.lay-eight{grid-template-columns:repeat(3,minmax(0,74px)) minmax(0,140px);grid-template-areas:"ul u ur f" "l . r f" "dl d dr f";gap:8px}
.lay-eight .pb{border-radius:14px}.lay-eight .pb span{font-size:24px}.lay-eight .pb svg{width:30px;height:30px}
.lay-eight .a-ul{grid-area:ul}.lay-eight .a-u{grid-area:u}.lay-eight .a-ur{grid-area:ur}.lay-eight .a-l{grid-area:l}.lay-eight .a-r{grid-area:r}
.lay-eight .a-dl{grid-area:dl}.lay-eight .a-d{grid-area:d}.lay-eight .a-dr{grid-area:dr}.lay-eight .a-f{grid-area:f;aspect-ratio:auto;height:100%}
.lay-lander{grid-template-columns:repeat(3,minmax(0,74px)) repeat(2,minmax(0,60px));grid-template-areas:"ul u ur t6 t5" "l . r t4 t3" ". . . t2 t1";gap:8px}
.lay-lander .pb{border-radius:14px}.lay-lander .pb span{font-size:22px}.lay-lander .pb svg{width:30px;height:30px}
.lay-lander .a-ul{grid-area:ul}.lay-lander .a-u{grid-area:u}.lay-lander .a-ur{grid-area:ur}.lay-lander .a-l{grid-area:l}.lay-lander .a-r{grid-area:r}
.lay-lander .a-t1{grid-area:t1}.lay-lander .a-t2{grid-area:t2}.lay-lander .a-t3{grid-area:t3}.lay-lander .a-t4{grid-area:t4}.lay-lander .a-t5{grid-area:t5}.lay-lander .a-t6{grid-area:t6}
.pb.sel{background:var(--press);color:var(--phos)}
.lay-lrf{grid-template-areas:"l r f"}
.lay-lrf .a-l{grid-area:l}.lay-lrf .a-r{grid-area:r}.lay-lrf .a-f{grid-area:f}
"""
head = head.replace(css_old, css_new)
head = head.replace('.pb svg{width:46px;height:46px;', '.pb span{font-size:16px}\n.pb svg{width:42px;height:42px;')
js = ''.join(open(f).read() + '\n' for f in sorted(glob.glob(S + '/src/*.js')))
out = head + '<script>\n(() => {\n' + js + '})();\n</script>\n'
os.makedirs('./out', exist_ok=True)
open('./out/index.html', 'w').write(out)
print('built', len(out))
