/* ui_rigol.js — face avant et écran du RIGOL DS1104Z (Plus) */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};
const E = OL.el;

OL.RigolUI = function (root, S) {
  const P = S.P, st = S.st, U = this;
  U.S = S; U.menu = null; U.sel = 0; U.toast = null; U.toastT = 0; U.meas = []; U.qm = null; U.qmSet = 0; U.drop = null; U.page = 0; U.help = false;
  U.cur = { mode: 'off', type: 'x', src: 0, a: -2, b: 2 };
  const cols = ['#ffd800', '#19e0ff', '#ff3df0', '#2a7bff']; U.colors = cols; st.sel = 0;
  const W = 1100, H = 540;
  const box = E('div', 'panel rigol', root, { width: W + 'px', height: H + 'px' }); U.box = box;
  E('div', 'r-bezel', box, { left: '70px', top: '34px', width: '588px', height: '364px' });
  const cv = E('canvas', 'r-screen', box, { left: '95px', top: '56px', width: '540px', height: '324px' }); cv.width = 800; cv.height = 480; U.cv = cv;
  const ctx = cv.getContext('2d');
  E('div', 'r-brand', box, { left: '74px', top: '4px' }, '<b>RIGOL</b><i>DS1104Z <u style="font-size:10px">Plus</u></i>');
  E('div', 'r-sub', box, { left: '300px', top: '12px' }, 'DIGITAL OSCILLOSCOPE &nbsp; 100&nbsp;MHz &nbsp; 1&nbsp;GSa/s &nbsp; 24&nbsp;Mpts');

  /* touches programmables */
  const sk = [];
  const mkSoft = (side, i) => {
    const x = side === 'l' ? 28 : 676, y = 86 + i * 44;
    return OL.Key(box, { x, y, w: 46, h: 30, label: '', cls: 'rkey ' + (side === 'l' ? 'soft' : 'softr'), on: () => (side === 'l' ? pressQM(i) : pressSoft(i)) });
  };
  const rs = [], ls = [];
  for (let i = 0; i < 6; i++) { ls.push(mkSoft('l', i)); rs.push(mkSoft('r', i)); }
  OL.Key(box, { x: 28, y: 44, w: 46, h: 26, label: 'MENU', cls: 'rkey arrow', on: () => { U.qm = U.qm === null ? 0 : (U.qm === 0 ? 1 : null); } });
  OL.Key(box, { x: 676, y: 44, w: 46, h: 26, label: '▲', cls: 'rkey arrow', on: () => { U.page = Math.max(0, U.page - 1); } });
  OL.Key(box, { x: 676, y: 352, w: 46, h: 26, label: '▼', cls: 'rkey arrow', on: () => { U.page = U.page + 1; } });
  OL.Key(box, { x: 28, y: 352, w: 46, h: 26, label: '▼', cls: 'rkey arrow', on: () => { } });

  const K = (x, y, w, h, label, cls, fn) => OL.Key(box, { x, y, w, h, label, cls: 'rkey ' + cls, on: fn });
  /* rangée du haut */
  K(770, 44, 56, 26, 'CLEAR', 'light', () => { S.resetAvg(); U.ghost = null; });
  const bAuto = K(840, 44, 56, 26, 'AUTO', 'light', () => doAuto());
  const bRun = K(910, 44, 62, 26, 'RUN/STOP', 'light', () => { st.run = !st.run; if (st.run) st.single = false; });
  const bSingle = K(984, 44, 58, 26, 'SINGLE', 'light', () => S.arm());
  OL.Label(box, 1048, 120, '', 'rl');
  const bHelp = K(1020, 96, 50, 24, 'Help', 'green', () => { U.help = !U.help; });
  K(1020, 128, 50, 24, '🖶', 'green', () => copyShot());
  /* bouton multifonction + touches de menu */
  OL.Knob(box, { x: 760, y: 118, r: 26, cls: 'rk', turn: n => mfKnob(n), push: () => mfPush(), title: 'Bouton multifonction' });
  OL.Label(box, 724, 150, 'MULTIFONCTION', 'rl', 72);
  const mname = [['Measure', 'measure'], ['Acquire', 'acquire'], ['Storage', 'storage'], ['Cursor', 'cursor'], ['Display', 'display'], ['Utility', 'utility']];
  mname.forEach(([lab, id], k) => K(826 + (k % 3) * 64, 96 + Math.floor(k / 3) * 34, 58, 26, lab, 'light', () => openMenu(id)));

  /* VERTICAL */
  E('div', 'r-zone', box, { left: '732px', top: '172px', width: '170px', height: '210px' }); OL.Label(box, 735, 164, 'VERTICAL', 'rl', 60);
  const chk = [];
  for (let i = 0; i < 4; i++) {
    const k = K(738, 186 + i * 36, 46, 26, 'CH' + (i + 1), 'ring', () => chKey(i)); k.style.borderColor = cols[i]; k.style.boxShadow = '0 0 0 1px ' + cols[i] + ', 0 2px 0 #14161a'; chk.push(k);
  }
  K(738, 330, 46, 26, 'LA', 'ring', () => msg('Analyseur logique : non disponible'));
  K(800, 336, 40, 24, 'MATH', 'ring', () => openMenu('math'));
  K(850, 336, 40, 24, 'REF', 'ring', () => msg('REF : non simulé'));
  OL.Knob(box, { x: 830, y: 218, r: 22, cls: 'rk', turn: n => vpos(n), push: () => { st.ch[U.sel].pos = 0; }, title: 'POSITION' }); OL.Label(box, 800, 242, 'POSITION', 'rl', 60);
  OL.Knob(box, { x: 850, y: 296, r: 0 + 26, cls: 'rk', turn: n => vdiv(n), push: () => { }, title: 'SCALE' }); OL.Label(box, 820, 324, 'SCALE', 'rl', 60);
  /* HORIZONTAL */
  E('div', 'r-zone', box, { left: '908px', top: '172px', width: '92px', height: '210px' }); OL.Label(box, 910, 164, 'HORIZONTAL', 'rl', 90);
  OL.Knob(box, { x: 946, y: 206, r: 20, cls: 'rk', turn: n => { st.hdelay -= n * S.tdiv() / 25; st.hdelay = Math.max(-60 * S.tdiv(), Math.min(60 * S.tdiv(), st.hdelay)); }, push: () => { st.hdelay = 0; } }); OL.Label(box, 916, 228, 'POSITION', 'rl', 60);
  K(924, 258, 44, 24, 'MENU', 'light', () => openMenu('horiz'));
  OL.Knob(box, { x: 946, y: 326, r: 26, cls: 'rk', turn: n => tdiv(n), push: () => { } }); OL.Label(box, 916, 354, 'SCALE', 'rl', 60);
  /* TRIGGER */
  E('div', 'r-zone', box, { left: '1006px', top: '172px', width: '80px', height: '210px' }); OL.Label(box, 1008, 164, 'TRIGGER', 'rl', 76);
  const bMode = K(1024, 184, 44, 22, 'MODE', 'light', () => { const t = st.trig; t.mode = t.mode === 'auto' ? 'normal' : t.mode === 'normal' ? 'single' : 'auto'; if (t.mode === 'single') S.arm(); });
  const leds = ['Auto', 'Normal', 'Single'].map((n, i) => { const l = E('div', 'r-led', box, { left: (1076) + 'px', top: (184 + i * 10) + 'px', width: '7px', height: '7px' }); return l; });
  OL.Knob(box, { x: 1046, y: 250, r: 18, cls: 'rk', turn: n => level(n), push: () => level50(), title: 'LEVEL' }); OL.Label(box, 1016, 272, 'LEVEL', 'rl', 60);
  K(1024, 296, 44, 24, 'MENU', 'light', () => openMenu('trig'));
  K(1024, 336, 44, 24, 'FORCE', 'light', () => S.force());
  /* BNC et accessoires */
  const bnc = (x, y, t, i) => { const e = E('div', 'bnc rb', box, { left: (x - 20) + 'px', top: (y - 20) + 'px' }, '<i></i>'); E('div', 'rl', box, { left: (x - 40) + 'px', top: (y + 22) + 'px', width: '80px', color: i < 4 ? '#12161c' : '' }, t); if (i < 4) { e.style.boxShadow = '0 0 0 3px ' + cols[i] + ', 0 2px 4px #0008'; } };
  const bx = [630, 726, 848, 970];
  bx.forEach((x, i) => bnc(x, 468, 'CH' + (i + 1), i));
  U.bnc = { ch: bx.map(x => ({ x, y: 468 })), comp: { x: 1050, y: 436 }, gnd: { x: 1050, y: 462 } };
  E('div', 'comp-term', box, { left: '1038px', top: '420px' }, '<i class="pin"></i><i class="gnd"></i>');
  E('div', 'rl', box, { left: '1002px', top: '402px', width: '100px' }, 'Compensation ⎍ 3&nbsp;V&nbsp;1&nbsp;kHz');
  E('div', 'rl', box, { left: '40px', top: '440px', width: '120px', textAlign: 'left' }, '⏻ &nbsp; &nbsp;USB HOST');
  E('div', 'rl', box, { left: '40px', top: '420px', width: '260px', textAlign: 'left' }, '');
  E('div', '', box, { left: '34px', top: '454px', width: '40px', height: '34px', background: 'linear-gradient(#e7e8ea,#bfc1c5)', border: '2px solid #777', borderRadius: '4px' });
  E('div', '', box, { left: '86px', top: '460px', width: '24px', height: '14px', background: '#222', border: '2px solid #888', borderRadius: '2px' });
  E('div', '', box, { left: '130px', top: '460px', width: '180px', height: '12px', background: '#222', border: '2px solid #888', borderRadius: '2px' });
  E('div', '', box, { left: '90px', top: '510px', width: '110px', height: '24px', background: '#3a3b3d', borderRadius: '0 0 8px 8px' });
  E('div', '', box, { left: '840px', top: '510px', width: '110px', height: '24px', background: '#3a3b3d', borderRadius: '0 0 8px 8px' });

  /* ===== logique ===== */
  function msg(t) { U.toast = t; U.toastT = performance.now(); } U.msg = msg;
  function copyShot() { try { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'oscillolab-rigol.png'; a.click(); msg('Capture enregistrée'); } catch (e) { msg('Capture impossible'); } }
  function doAuto() { const ok = S.autoset(); msg(ok ? 'Autoset' : 'Aucun signal'); if (ok) { U.menu = null; U.sel = st.sel; } }
  function chKey(i) {
    const c = st.ch[i];
    if (!c.on) { c.on = true; U.sel = i; st.sel = i; U.menu = 'ch'; U.drop = null; return; }
    if (U.sel === i) { if (U.menu === 'ch') { c.on = false; U.menu = null; const nxt = st.ch.findIndex(x => x.on); if (nxt >= 0) { U.sel = nxt; st.sel = nxt; } } else { U.menu = 'ch'; } return; }
    U.sel = i; st.sel = i; U.menu = 'ch'; U.drop = null;
  }
  function openMenu(id) { if (U.menu === id && !U.drop) { U.menu = null; return; } U.menu = id; U.drop = null; U.page = 0; }
  function vpos(n) { if (U.menu === 'cursor' && U.cur.mode !== 'off' && U.cur.fromKnob) return; const c = st.ch[U.sel]; c.pos = Math.max(-8, Math.min(8, c.pos + n * 0.04)); }
  function vdiv(n) { const c = st.ch[U.sel], old = Math.abs(S.vdivLabel(U.sel)); c.vIdx = Math.max(0, Math.min(P.vdivs.length - 1, c.vIdx + n)); const nw = Math.abs(S.vdivLabel(U.sel)); c.pos = c.pos * old / nw; S.resetAvg(); }
  function tdiv(n) { st.tdivIdx = Math.max(0, Math.min(P.tdivs.length - 1, st.tdivIdx + n)); S.resetAvg(); }
  function level(n) { const lab = Math.abs(S.vdivLabel(st.trig.src)); st.trig.level += n * lab / 25; }
  function level50() { const t = st.trig, v = S.volts(t.src); if (!v) return; let mn = Infinity, mx = -Infinity; for (const x of v) { if (x < mn) mn = x; if (x > mx) mx = x; } t.level = (mn + mx) / 2; }
  function mfKnob(n) {
    if (U.drop) { U.drop.idx = Math.max(0, Math.min(U.drop.opts.length - 1, U.drop.idx + n)); return; }
    const it = U.activeItem(); if (it && it.knob) it.knob(n);
  }
  function mfPush() { if (U.drop) { U.drop.opts[U.drop.idx].f(); U.drop = null; return; } const it = U.activeItem(); if (it && it.push) it.push(); }
  U.activeItem = () => { const m = menus[U.menu]; if (!m) return null; return m()[U.sel2] || null; };
  U.sel2 = -1;

  const opt = (t, f) => ({ t, f }), menus = {};
  const lst = (xs, f) => xs.map(x => opt(x[1], () => f(x[0])));
  menus.ch = () => { const i = U.sel, c = st.ch[i]; return [
    { label: 'Coupling', val: () => c.coup.toUpperCase(), opts: [opt('DC', () => { c.coup = 'dc'; }), opt('AC', () => { c.coup = 'ac'; }), opt('GND', () => { c.coup = 'gnd'; })] },
    { label: 'BW Limit', val: () => c.bw20 ? '20MHz' : 'OFF', opts: [opt('OFF', () => { c.bw20 = false; }), opt('20MHz', () => { c.bw20 = true; })] },
    { label: 'Probe', val: () => c.probe + 'X', opts: P.probes.map(k => opt(k + 'X', () => { c.probe = k; S.resetAvg(); })) },
    { label: 'Invert', val: () => c.inv ? 'ON' : 'OFF', opts: [opt('OFF', () => { c.inv = false; }), opt('ON', () => { c.inv = true; })] },
    { label: 'Scale', val: () => 'Coarse', opts: [opt('Coarse', () => { }), opt('Fine', () => msg('Réglage fin : non simulé'))] },
    { label: 'Unit', val: () => 'V', opts: [opt('V', () => { })] }]; };
  menus.trig = () => { const t = st.trig; return [
    { label: 'Type', val: () => 'Edge', opts: [opt('Edge', () => { })] },
    { label: 'Source', val: () => P.chNames[t.src], opts: P.chNames.map((n, k) => opt(n, () => { t.src = k; })) },
    { label: 'Slope', val: () => t.slope === 'rise' ? '↗' : t.slope === 'fall' ? '↘' : '↗↘', opts: [opt('↗ Rising', () => { t.slope = 'rise'; }), opt('↘ Falling', () => { t.slope = 'fall'; }), opt('↗↘ Both', () => { t.slope = 'both'; })] },
    { label: 'Sweep', val: () => ({ auto: 'Auto', normal: 'Normal', single: 'Single' })[t.mode], opts: [opt('Auto', () => { t.mode = 'auto'; }), opt('Normal', () => { t.mode = 'normal'; }), opt('Single', () => { t.mode = 'single'; S.arm(); })] },
    { label: 'Coupling', val: () => ({ dc: 'DC', ac: 'AC', hf: 'HF Reject', lf: 'LF Reject' })[t.coup], opts: [opt('DC', () => { t.coup = 'dc'; }), opt('AC', () => { t.coup = 'ac'; }), opt('LF Reject', () => { t.coup = 'lf'; }), opt('HF Reject', () => { t.coup = 'hf'; })] },
    { label: 'Holdoff', val: () => OL.fmt(t.holdoff, 's'), knob: n => { t.holdoff = Math.max(100e-9, Math.min(10, t.holdoff * (n > 0 ? 1.1 : 1 / 1.1))); }, push: () => { t.holdoff = 100e-9; } }]; };
  menus.horiz = () => [
    { label: 'Delayed', val: () => 'OFF', opts: [opt('OFF', () => { })] },
    { label: 'Time Base', val: () => st.xy ? 'XY' : 'YT', opts: [opt('YT', () => { st.xy = false; }), opt('XY', () => { st.xy = true; })] },
    { label: 'Hor. Ref', val: () => 'Center', opts: [opt('Center', () => { })] },
    { label: 'Delay offset', val: () => OL.fmt(st.hdelay, 's'), knob: n => { st.hdelay -= n * S.tdiv() / 25; }, push: () => { st.hdelay = 0; } }];
  const HL = ['period', 'freq', 'rise', 'fall', 'pwidth', 'nwidth', 'pduty', 'nduty'], VL = ['max', 'min', 'pp', 'top', 'base', 'amp', 'avg', 'rms', 'cycavg', 'cycrms', 'over', 'pre'];
  const addMeas = (key, ch) => { const id = ch + key; const i = U.meas.findIndex(m => m.id === id); if (i >= 0) U.meas.splice(i, 1); else { if (U.meas.length >= 5) U.meas.shift(); U.meas.push({ id, key, ch }); } };
  const addDelay = k => { const id = 'D' + k; const i = U.meas.findIndex(m => m.id === id); if (i >= 0) U.meas.splice(i, 1); else { if (U.meas.length >= 5) U.meas.shift(); U.meas.push({ id, key: k, ch: 0, delay: true }); } };
  menus.measure = () => [
    { label: 'Source', val: () => P.chNames[U.mSrc || 0], opts: P.chNames.map((n, k) => opt(n, () => { U.mSrc = k; })) },
    { label: 'Horizontal', val: () => '▼', opts: HL.map(k => opt(OL.MEAS[k].r, () => addMeas(k, U.mSrc || 0))) },
    { label: 'Vertical', val: () => '▼', opts: VL.map(k => opt(OL.MEAS[k].r, () => addMeas(k, U.mSrc || 0))) },
    { label: 'Delay', val: () => '▼', opts: [opt('Delay A↑B↑', () => addDelay('delay')), opt('Phase A↑B↑', () => addDelay('phase'))] },
    { label: 'Clear', val: () => '', opts: [opt('Tout effacer', () => { U.meas.length = 0; })] }];
  menus.acquire = () => [
    { label: 'Acquisition', val: () => ({ sample: 'Normal', peak: 'Peak Detect', avg: 'Averages' })[st.acq], opts: [opt('Normal', () => { st.acq = 'sample'; }), opt('Averages', () => { st.acq = 'avg'; S.resetAvg(); }), opt('Peak Detect', () => { st.acq = 'peak'; })] },
    { label: 'Averages', val: () => String(st.avgN), opts: [2, 4, 8, 16, 32, 64, 128, 256].map(n => opt(String(n), () => { st.avgN = n; S.resetAvg(); })) },
    { label: 'Mem Depth', val: () => 'Auto', opts: [opt('Auto', () => { })] },
    { label: 'Anti-Aliasing', val: () => 'OFF', opts: [opt('OFF', () => { })] }];
  menus.display = () => [
    { label: 'Type', val: () => st.dots ? 'Dots' : 'Vectors', opts: [opt('Vectors', () => { st.dots = false; }), opt('Dots', () => { st.dots = true; })] },
    { label: 'Persist', val: () => ({ 0: 'Min', 1: '1 s', 2: '2 s', 5: '5 s', 99: 'Infinite' })[st.persist], opts: [[0, 'Min'], [1, '1 s'], [2, '2 s'], [5, '5 s'], [99, 'Infinite']].map(([v, t]) => opt(t, () => { st.persist = v; U.ghost = null; })) },
    { label: 'Grid', val: () => U.gridMode === 'cross' ? 'Axes' : 'Full', opts: [opt('Full', () => { U.gridMode = 'full'; }), opt('Axes', () => { U.gridMode = 'cross'; })] }];
  menus.cursor = () => [
    { label: 'Mode', val: () => ({ off: 'OFF', manual: 'Manual' })[U.cur.mode], opts: [opt('OFF', () => { U.cur.mode = 'off'; }), opt('Manual', () => { U.cur.mode = 'manual'; })] },
    { label: 'Type', val: () => U.cur.type === 'x' ? 'X' : 'Y', opts: [opt('X', () => { U.cur.type = 'x'; }), opt('Y', () => { U.cur.type = 'y'; })] },
    { label: 'Source', val: () => P.chNames[U.cur.src], opts: P.chNames.map((n, k) => opt(n, () => { U.cur.src = k; })) },
    { label: 'CurA', val: () => U.cur.type === 'x' ? OL.fmt(U.cur.a * S.tdiv(), 's') : '', knob: n => { U.cur.a = Math.max(-5.9, Math.min(5.9, U.cur.a + n * 0.05)); } },
    { label: 'CurB', val: () => U.cur.type === 'x' ? OL.fmt(U.cur.b * S.tdiv(), 's') : '', knob: n => { U.cur.b = Math.max(-5.9, Math.min(5.9, U.cur.b + n * 0.05)); } }];
  const mem = {};
  menus.storage = () => [
    { label: 'Storage', val: () => U.sType || 'Setup', opts: [opt('Setup', () => { U.sType = 'Setup'; }), opt('Picture', () => { U.sType = 'Picture'; })] },
    { label: 'Save', val: () => '', opts: [opt('Save', () => { if (U.sType === 'Picture') copyShot(); else { mem.s = JSON.stringify(st); msg('Réglages enregistrés'); } })] },
    { label: 'Load', val: () => '', opts: [opt('Load', () => { if (mem.s) { Object.assign(st, JSON.parse(mem.s)); msg('Réglages chargés'); } else msg('Mémoire vide'); })] },
    { label: 'Default', val: () => '', opts: [opt('Default', () => { S.defaultSetup(); U.meas.length = 0; st.sel = 0; U.sel = 0; msg('Réglages par défaut'); })] }];
  menus.utility = () => [
    { label: 'System', val: () => '▼', opts: [opt('Self-Cal', () => { U.selfcal = performance.now(); })] },
    { label: 'Language', val: () => 'Français', opts: [opt('Français', () => { })] }];
  menus.math = () => [
    { label: 'Operate', val: () => ({ 'a+b': 'A+B', 'a-b': 'A-B', 'a*b': 'A×B' })[st.math.op] + (st.math.on ? '' : ' (OFF)'), opts: [opt('A+B', () => { st.math.op = 'a+b'; st.math.on = true; }), opt('A-B', () => { st.math.op = 'a-b'; st.math.on = true; }), opt('A×B', () => { st.math.op = 'a*b'; st.math.on = true; }), opt('OFF', () => { st.math.on = false; })] }];
  function pressSoft(i) {
    const m = menus[U.menu]; if (!m) return; const items = m(); const idx = U.page * 6 + i; const it = items[idx]; if (!it) return;
    U.sel2 = idx;
    if (it.opts) {
      if (it.opts.length <= 4) { const cur = it.val(); let k = it.opts.findIndex(o => o.t === cur || o.t.replace(/^[↗↘↗↘ ]+/, '').split(' ')[0] === cur.toUpperCase()); if (U.lastKey === idx + U.menu) { k = ((it.opts.findIndex(o => String(o.t).toLowerCase().indexOf(String(cur).toLowerCase()) === 0) + 1) % it.opts.length); it.opts[k].f(); } else { U.lastKey = idx + U.menu; } }
      else if (U.drop && U.drop.item === it) { U.drop.opts[U.drop.idx].f(); U.drop = null; }
      else { U.drop = { item: it, idx: 0, opts: it.opts }; }
      U.lastKey = idx + U.menu;
    } else { U.lastKey = idx + U.menu; }
  }
  function pressQM(i) {
    if (U.qm === null) return; const key = (U.qm === 0 ? HL : VL)[i]; if (key) addMeas(key, st.sel);
  }
  U.menus = menus; U.pressSoft = pressSoft; U.openMenu = openMenu; U.doAutoset = doAuto; U.chKey = chKey;

  /* ===== écran 800x480 ===== */
  const GR = { x: 96, y: 40, w: 600, h: 400 }; U.GR = GR;
  const fmtVd = lab => lab >= 1 ? (+lab.toPrecision(3)).toFixed(2) + 'V' : (+(lab * 1000).toPrecision(3)) + 'mV';
  const fmtTd = t => { const a = Math.abs(t); return a >= 1 ? (+t.toPrecision(3)) + 's' : a >= 1e-3 ? (+(t * 1e3).toPrecision(3)) + 'ms' : a >= 1e-6 ? (+(t * 1e6).toPrecision(3)) + 'us' : (+(t * 1e9).toPrecision(3)) + 'ns'; };
  U.measureOf = function (i) { const v = S.volts(i); if (!v) return null; return OL.measure(v, S.window() / v.length); };
  U.draw = function () {
    const c = ctx, sc = S, rec = sc.rec; c.fillStyle = '#000'; c.fillRect(0, 0, 800, 480);
    if (U.selfcal && performance.now() - U.selfcal < 2500) { OL.text(c, 'Auto-étalonnage en cours…', 400, 240, { size: 26, align: 'center' }); return; } else U.selfcal = 0;
    /* barre du haut */
    OL.text(c, 'RIGOL', 8, 18, { size: 21, bold: true, color: '#e6c34a', font: 'Georgia, serif' });
    const stt = !st.run ? ['STOP', '#ff3b30'] : sc.status === "TRIG'D" || sc.status === 'FORCE' ? ["T'D", '#35e06a'] : sc.status === 'WAIT' ? ['WAIT', '#ffb020'] : sc.status === 'ROLL' ? ['ROLL', '#35e06a'] : ['AUTO', '#35e06a'];
    OL.text(c, stt[0], 98, 18, { size: 17, bold: true, color: stt[1] });
    OL.rrect(c, 135, 6, 76, 24, 3, '#0a0a0a', '#c33', 1.2); OL.text(c, 'H', 142, 18, { size: 13, bold: true }); OL.text(c, fmtTd(sc.tdiv()), 160, 18, { size: 14 });
    OL.rrect(c, 218, 4, 78, 28, 3, '#0a0a0a', '#c33', 1.2); const sr = sc.sampleRate(); OL.text(c, (sr >= 1e9 ? +(sr / 1e9).toPrecision(3) + 'GSa/s' : sr >= 1e6 ? +(sr / 1e6).toPrecision(3) + 'MSa/s' : +(sr / 1e3).toPrecision(3) + 'kSa/s'), 257, 13, { size: 11, align: 'center' });
    const dp = sc.sampleRate() * sc.window(); OL.text(c, dp >= 1e6 ? (dp / 1e6).toFixed(1) + 'Mpts' : (dp / 1e3).toFixed(1) + 'kpts', 257, 26, { size: 11, align: 'center' });
    c.strokeStyle = '#aaa'; c.strokeRect(304.5, 8.5, 190, 16); c.fillStyle = '#333'; c.fillRect(306, 10, 187, 13); c.fillStyle = '#f90'; c.fillRect(398 - st.hdelay / S.window() * 20, 9, 7, 8);
    OL.rrect(c, 520, 6, 140, 24, 3, '#0a0a0a', '#c33', 1.2); OL.text(c, 'D', 528, 18, { size: 13, bold: true, color: '#f90' }); OL.text(c, OL.fmt(-st.hdelay, 's', 4).replace(',', '.').replace('µ', 'u'), 652, 18, { size: 14, align: 'right' });
    const t = st.trig; OL.rrect(c, 676, 6, 120, 24, 3, '#0a0a0a', '#c33', 1.2); OL.text(c, 'T', 684, 18, { size: 13, bold: true }); OL.text(c, t.slope === 'rise' ? '↗' : t.slope === 'fall' ? '↘' : '↗↘', 702, 18, { size: 13, color: '#fc0' });
    c.fillStyle = cols[t.src]; c.fillRect(716, 12, 11, 12); OL.text(c, String(t.src + 1), 721, 18, { size: 10, color: '#000', align: 'center', bold: true });
    OL.text(c, OL.fmt(t.level, 'V', 3).replace(',', '.').replace(' ', ''), 790, 18, { size: 13, align: 'right', color: '#fc0' });
    /* graticule */
    OL.drawGrid(c, GR, { full: U.gridMode !== 'cross', line: '#454545', axis: '#808080', frame: '#9a9a9a' });
    const dh = GR.h / 8, cy = GR.y + GR.h / 2;
    if (rec) {
      if (st.xy) OL.drawXY(c, GR, sc.divs(0), sc.divs(1), cols[0]);
      else for (let i = 0; i < P.nch; i++) { if (!st.ch[i].on) continue; const pk = st.acq === 'peak' ? sc.peakDivs(i) : null; if (pk) OL.drawPeak(c, GR, pk, cols[i]); else OL.drawTrace(c, GR, sc.divs(i), cols[i], { dots: st.dots, step: 6 }); }
      if (st.math.on && st.ch[0].on && st.ch[1].on && !st.xy) {
        const v0 = sc.volts(0), v1 = sc.volts(1), m = new Float64Array(v0.length), lab = Math.abs(sc.vdivLabel(U.sel));
        for (let j = 0; j < m.length; j++) { const a = v0[j], b = v1[j]; const r = st.math.op === 'a+b' ? a + b : st.math.op === 'a-b' ? a - b : a * b; m[j] = Math.max(-4.2, Math.min(4.2, r / lab)); }
        OL.drawTrace(c, GR, m, '#ff8c1a', {});
      }
    }
    /* repères de zéro (gauche) et de niveau (droite) */
    for (let i = 0; i < P.nch; i++) if (st.ch[i].on) { const y = cy - st.ch[i].pos * dh; c.fillStyle = cols[i]; c.beginPath(); c.moveTo(GR.x - 18, y - 7); c.lineTo(GR.x - 6, y - 7); c.lineTo(GR.x, y); c.lineTo(GR.x - 6, y + 7); c.lineTo(GR.x - 18, y + 7); c.closePath(); c.fill(); OL.text(c, String(i + 1), GR.x - 11, y + 1, { size: 11, color: '#000', align: 'center', bold: true }); }
    { const lab = Math.abs(sc.vdivLabel(t.src)), y = Math.max(GR.y + 6, Math.min(GR.y + GR.h - 6, cy - (t.level / lab + st.ch[t.src].pos) * dh)); c.fillStyle = '#ff9a1a'; c.beginPath(); c.moveTo(GR.x + GR.w, y); c.lineTo(GR.x + GR.w + 7, y - 7); c.lineTo(GR.x + GR.w + 20, y - 7); c.lineTo(GR.x + GR.w + 20, y + 7); c.lineTo(GR.x + GR.w + 7, y + 7); c.closePath(); c.fill(); OL.text(c, 'T', GR.x + GR.w + 13, y + 1, { size: 10, color: '#000', align: 'center', bold: true }); }
    const tx = GR.x + GR.w / 2 - st.hdelay / S.window() * GR.w; if (tx > GR.x && tx < GR.x + GR.w) { c.fillStyle = '#f90'; c.beginPath(); c.moveTo(tx - 6, GR.y - 8); c.lineTo(tx + 6, GR.y - 8); c.lineTo(tx, GR.y); c.closePath(); c.fill(); }
    if (U.cur.mode !== 'off') drawCursors(c);
    drawMeas(c);
    /* barre des voies */
    for (let i = 0; i < 4; i++) {
      const x = 10 + i * 118, on = st.ch[i].on, sel = (U.sel === i);
      c.fillStyle = on ? (sel ? cols[i] : '#3a3a3a') : '#161616'; c.beginPath(); c.moveTo(x + 6, 446); c.lineTo(x + 116, 446); c.lineTo(x + 108, 476); c.lineTo(x - 2, 476); c.closePath(); c.fill();
      if (on) { OL.text(c, String(i + 1), x + 12, 461, { size: 20, bold: true, color: sel ? '#000' : cols[i] }); OL.text(c, st.ch[i].coup === 'ac' ? '~' : st.ch[i].coup === 'gnd' ? '⏚' : '=', x + 34, 460, { size: 14, color: sel ? '#000' : '#ddd' }); OL.text(c, fmtVd(sc.vdivLabel(i)) + (st.ch[i].bw20 ? ' B' : ''), x + 98, 461, { size: 15, align: 'right', color: sel ? '#000' : '#ddd' }); }
      else OL.text(c, String(i + 1) + '   ' + fmtVd(sc.vdivLabel(i)), x + 14, 461, { size: 14, color: '#555' });
    }
    OL.text(c, 'USB', 700, 461, { size: 12, color: '#999' });
    drawQM(c); drawMenu(c);
    if (U.toast && performance.now() - U.toastT < 1800) { OL.rrect(c, 260, 220, 280, 40, 6, 'rgba(235,235,235,.95)', '#666', 1); OL.text(c, U.toast, 400, 240, { size: 18, align: 'center', color: '#111' }); }
    if (U.help) { OL.rrect(c, 110, 60, 580, 330, 8, 'rgba(10,20,40,.96)', '#9ab', 1.5); ['Aide : appuyez sur une touche (Measure, Cursor…).', 'Touches grises à droite de l\'écran : menu affiché.', 'MENU (à gauche) : mesures rapides ; touches bleues.', 'Un seul POSITION et un seul SCALE : voie sélectionnée.', 'Appui sur POSITION : retour à zéro.', 'Appui sur LEVEL : niveau de déclenchement à 50 %.', 'AUTO : réglage automatique.'].forEach((l, k) => OL.text(c, l, 130, 96 + k * 38, { size: 17 })); }
  };
  function drawQM(c) {
    if (U.qm === null) return; const keys = U.qm === 0 ? HL : VL;
    OL.text(c, U.qm === 0 ? 'Horizontal' : 'Vertical', 40, 62, { size: 12, align: 'center', color: '#fff' });
    keys.slice(0, 6).forEach((k, i) => { const y = 76 + i * 56; OL.rrect(c, 8, y, 64, 50, 4, '#101820', '#3a6', 1); OL.text(c, OL.MEAS[k].r.replace('Rise Time', 'Rise').replace('Fall Time', 'Fall'), 40, y + 36, { size: 12, align: 'center', color: U.meas.some(m => m.id === st.sel + k) ? '#ff0' : '#fff' }); c.strokeStyle = '#7fb'; c.strokeRect(24, y + 8, 32, 18); });
  }
  function drawCursors(c) {
    const cu = U.cur, dh = GR.h / 8, cy = GR.y + GR.h / 2, src = cu.src, lab = Math.abs(S.vdivLabel(src));
    c.save(); c.setLineDash([6, 4]); c.strokeStyle = '#fff'; c.lineWidth = 1;
    const wd = GR.w / 12;
    if (cu.type === 'x') {
      [cu.a, cu.b].forEach((d, k) => { const x = GR.x + GR.w / 2 + d * wd; c.beginPath(); c.moveTo(x, GR.y); c.lineTo(x, GR.y + GR.h); c.stroke(); OL.text(c, k ? 'B' : 'A', x + 2, GR.y + 10, { size: 12, color: '#fff' }); });
      const t1 = cu.a * S.tdiv(), t2 = cu.b * S.tdiv(), dt = Math.abs(t2 - t1);
      c.setLineDash([]); OL.rrect(c, GR.x + 6, GR.y + 6, 220, 70, 4, 'rgba(0,0,0,.8)', '#888', 1);
      OL.text(c, 'AX: ' + OL.fmt(t1, 's', 4).replace(',', '.'), GR.x + 12, GR.y + 20, { size: 13 }); OL.text(c, 'BX: ' + OL.fmt(t2, 's', 4).replace(',', '.'), GR.x + 12, GR.y + 38, { size: 13 }); OL.text(c, 'ΔX: ' + OL.fmt(dt, 's', 4).replace(',', '.') + '   1/ΔX: ' + (dt ? OL.fmt(1 / dt, 'Hz', 4).replace(',', '.') : '****'), GR.x + 12, GR.y + 58, { size: 13 });
    } else {
      [cu.a, cu.b].forEach((d, k) => { const y = cy - d * dh; c.beginPath(); c.moveTo(GR.x, y); c.lineTo(GR.x + GR.w, y); c.stroke(); OL.text(c, k ? 'B' : 'A', GR.x + 6, y - 7, { size: 12 }); });
      const y1 = (cu.a - st.ch[src].pos) * lab, y2 = (cu.b - st.ch[src].pos) * lab;
      c.setLineDash([]); OL.rrect(c, GR.x + 6, GR.y + 6, 180, 70, 4, 'rgba(0,0,0,.8)', '#888', 1);
      OL.text(c, 'AY: ' + OL.fmt(y1, 'V', 3).replace(',', '.'), GR.x + 12, GR.y + 20, { size: 13 }); OL.text(c, 'BY: ' + OL.fmt(y2, 'V', 3).replace(',', '.'), GR.x + 12, GR.y + 38, { size: 13 }); OL.text(c, 'ΔY: ' + OL.fmt(Math.abs(y2 - y1), 'V', 3).replace(',', '.'), GR.x + 12, GR.y + 58, { size: 13 });
    }
    c.restore();
  }
  function drawMeas(c) {
    if (!U.meas.length) return; const cache = {};
    U.meas.forEach((m, k) => {
      let lab, val, col;
      if (m.delay) { const a = S.volts(0), b = S.volts(1); lab = m.key === 'phase' ? 'RPhase 1→2' : 'RDelay 1→2'; col = '#fff'; val = '****';
        if (a && b) { const d = OL.delayAB(a, b, S.window() / a.length), m0 = OL.measure(a, S.window() / a.length); if (d !== null) val = m.key === 'delay' ? OL.fmt(d, 's', 4) : (m0.period ? OL.fmtNum(d / m0.period * 360, 1) + '°' : '****'); } }
      else { const r = cache[m.ch] || (cache[m.ch] = U.measureOf(m.ch)); const def = OL.MEAS[m.key]; lab = P.chNames[m.ch] + ' ' + def.r; col = cols[m.ch]; val = r ? OL.fmtMeas(def, def.v(r)) : '****'; }
      const x = GR.x + 4 + k * 118, y = GR.y + GR.h - 40; OL.rrect(c, x, y, 114, 36, 3, 'rgba(0,0,0,.78)', col, 1);
      OL.text(c, lab, x + 6, y + 11, { size: 11, color: col }); OL.text(c, val.replace(',', '.').replace('µ', 'u'), x + 108, y + 27, { size: 15, align: 'right', color: '#fff' });
    });
  }
  function drawMenu(c) {
    if (!U.menu) return; const m = menus[U.menu]; if (!m) return; const items = m(), x0 = 702, w = 96;
    OL.rrect(c, x0 - 2, 38, w + 4, 402, 8, 'rgba(14,16,20,.97)', '#556', 1);
    OL.text(c, U.menu === 'ch' ? 'CH' + (U.sel + 1) : ({ trig: 'Trigger', horiz: 'Horizontal', measure: 'Measure', acquire: 'Acquire', display: 'Display', cursor: 'Cursor', storage: 'Storage', utility: 'Utility', math: 'Math' })[U.menu], x0 + w / 2, 52, { size: 14, align: 'center', color: '#8cf', bold: true });
    for (let i = 0; i < 6; i++) {
      const idx = U.page * 6 + i, it = items[idx]; if (!it) continue; const y = 64 + i * 62, sel = U.sel2 === idx;
      const g = c.createLinearGradient(0, y, 0, y + 56); g.addColorStop(0, sel ? '#33557a' : '#2a2d33'); g.addColorStop(1, sel ? '#1a3352' : '#17191d');
      OL.rrect(c, x0 + 2, y, w - 4, 56, 5, g, sel ? '#7cf' : '#555', 1);
      OL.text(c, it.label, x0 + w / 2, y + 16, { size: 14, align: 'center' });
      const v = typeof it.val === 'function' ? it.val() : ''; if (v) { OL.rrect(c, x0 + 8, y + 28, w - 16, 22, 3, 'rgba(0,0,0,.55)', sel ? '#7cf' : '#444', 1); OL.text(c, v, x0 + w / 2, y + 39, { size: 13, align: 'center', color: '#8df' }); }
    }
    if (U.drop) { const d = U.drop, n = d.opts.length, show = Math.min(7, n), top = Math.max(0, Math.min(n - show, d.idx - 3)); OL.rrect(c, 580, 80, 118, show * 28 + 10, 5, '#10141a', '#7cf', 1);
      for (let k = 0; k < show; k++) { const o = d.opts[top + k], y = 86 + k * 28; if (top + k === d.idx) { c.fillStyle = '#2f6cb5'; c.fillRect(584, y, 110, 26); } OL.text(c, o.t, 639, y + 13, { size: 14, align: 'center' }); } }
  }
  U.tickFrame = function (dt) {
    bRun.classList.toggle('runlit', st.run); bRun.classList.toggle('stoplit', !st.run);
    chk.forEach((k, i) => { k.classList.toggle('lit', st.ch[i].on); });
    leds.forEach((l, i) => l.classList.toggle('on', ['auto', 'normal', 'single'][i] === st.trig.mode));
    bSingle.classList.toggle('lit', S.status === 'WAIT' && !st.run);
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
