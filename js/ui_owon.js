/* ui_owon.js — face avant et écran de l'OWON SDS5032E(V) */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};
const E = OL.el;

OL.OwonUI = function (root, S) {
  const P = S.P, st = S.st, U = this;
  U.S = S; U.menu = null; U.open = -1; U.toast = null; U.toastT = 0; U.meas = []; U.autoscale = false;
  U.cur = { type: 'off', src: 0, a: 1.5, b: -1.5 };       /* curseurs : en divisions (position) */
  U.trigKnob = 'level'; U.page = 0; U.selfcal = 0; U.measSrc = 0; U.measCh = 0; U.focus = null;
  U.shotUrl = null;
  const cols = ['#ff2a2a', '#ffe000', '#e24dc9', '#3c8dff'];
  U.colors = cols;

  /* ===== dimensions de conception 940 x 500 ===== */
  const W = 940, H = 500;
  const box = E('div', 'panel owon', root, { width: W + 'px', height: H + 'px' });
  U.box = box;
  E('div', 'o-bezel', box, { left: '28px', top: '28px', width: '506px', height: '387px' });
  const cv = E('canvas', 'o-screen', box, { left: '36px', top: '36px', width: '490px', height: '367px' });
  cv.width = 800; cv.height = 600; U.cv = cv;
  const ctx = cv.getContext('2d');
  E('div', 'o-logo', box, { left: '34px', top: '440px' }, '<b>OWON</b> <small>Smart&nbsp;Oscilloscope</small>');
  E('div', 'o-model', box, { left: '34px', top: '466px' }, 'SDS5032E');
  E('div', 'o-spec', box, { left: '150px', top: '468px' }, '30&nbsp;MHz &nbsp;250&nbsp;MS/s &nbsp;Digital Storage Oscilloscope');

  /* touches H et F */
  const hk = [], fk = [];
  for (let i = 0; i < 5; i++) hk.push(OL.Key(box, { x: 240.4 + 55.4 * i, y: 421, w: 40, h: 22, label: 'H' + (i + 1), cls: 'round', on: () => pressH(i) }));
  for (let i = 0; i < 5; i++) fk.push(OL.Key(box, { x: 556, y: 116 + i * 46, w: 38, h: 30, label: 'F' + (i + 1), cls: 'round', on: () => pressF(i) }));
  OL.Key(box, { x: 556, y: 346, w: 38, h: 22, label: 'Menu<br>off', cls: 'round tiny', on: () => { U.menu = null; U.open = -1; } });

  /* panneau de commande */
  E('div', 'o-zone', box, { left: '603px', top: '4px', width: '326px', height: '478px' });
  const mk = (x, y, label, cls, fn, w, h) => OL.Key(box, { x, y, w: w || 56, h: h || 24, label, cls, on: fn });
  OL.Knob(box, { x: 610, y: 52, r: 24, cls: 'bigk', label: 'M', ly: -9999, turn: n => mKnob(n), push: () => mPush() });
  const kx = [648, 716, 784], ky = [66, 101, 142];
  const bk = {};
  bk.measure = mk(kx[0], ky[0] - 12, 'Measure', 'white', () => openMenu('measure'));
  bk.acquire = mk(kx[1], ky[0] - 12, 'Acquire', 'white', () => openMenu('acquire'));
  bk.autoset = mk(kx[2], ky[0] - 12, 'Autoset', 'white', () => doAutoset());
  bk.utility = mk(kx[0], ky[1] - 12, 'Utility', 'white', () => openMenu('utility'));
  bk.cursor = mk(kx[1], ky[1] - 12, 'Cursor', 'white', () => openMenu('cursor'));
  bk.autoscale = mk(kx[2], ky[1] - 12, 'Autoscale', 'white', () => { U.autoscale = !U.autoscale; bk.autoscale.setLed(U.autoscale); if (U.autoscale) doAutoset(); });
  bk.save = mk(kx[0], ky[2] - 14, 'Save', 'white', () => openMenu('save'));
  bk.display = mk(kx[1], ky[2] - 14, 'Display', 'white', () => openMenu('display'));
  bk.help = mk(kx[2], ky[2] - 14, 'Help', 'white', () => { U.help = !U.help; });
  mk(606, 118, 'Copy', 'grey round', () => copyShot(), 38, 22);
  bk.run = OL.Key(box, { x: 858, y: 66, w: 62, h: 34, label: 'Run/Stop', cls: 'green round', on: () => { st.run = !st.run; if (st.run) st.single = false; } });
  bk.single = OL.Key(box, { x: 858, y: 114, w: 62, h: 34, label: 'Single', cls: 'grey round', on: () => { S.arm(); } });

  /* zone verticale */
  E('div', 'o-vert', box, { left: '612px', top: '176px', width: '160px', height: '234px' });
  OL.Label(box, 612, 180, 'VERTICAL POSITION', 'zl', 160);
  const kpos = [], kv = [];
  for (let i = 0; i < 2; i++) {
    const x = 652 + i * 70;
    kpos.push(OL.Knob(box, { x, y: 213, r: 16, cls: 'smk', turn: n => vpos(i, n), push: () => vposPush(i) }));
    OL.Label(box, x - 30, 262, 'MENU', 'zl', 60);
    bk['ch' + i] = OL.Key(box, { x: x - 20, y: 274, w: 40, h: 22, label: 'CH' + (i + 1), cls: i ? 'ch2' : 'ch1', on: () => chKey(i) });
    OL.Label(box, x - 30, 330, 'VOLTS/DIV', 'zl', 60);
    kv.push(OL.Knob(box, { x, y: 365, r: 27, cls: 'bigk', turn: n => vdiv(i, n), push: () => {} }));
  }
  bk.math = OL.Key(box, { x: 675, y: 241, w: 34, h: 20, label: 'Math', cls: 'blue', on: () => { st.math.on = !st.math.on; if (st.math.on) openMenu('math'); } });
  /* zone horizontale */
  E('div', 'o-hor', box, { left: '776px', top: '176px', width: '76px', height: '234px' });
  OL.Label(box, 776, 180, 'HORIZONTAL POSITION', 'zl', 76);
  OL.Knob(box, { x: 813, y: 213, r: 17, cls: 'smk', turn: n => { st.hdelay += n * S.tdiv() / 25 * (-1); st.hdelay = hclamp(st.hdelay); }, push: () => { st.hdelay = 0; } });
  OL.Label(box, 783, 262, 'MENU', 'zl', 60);
  bk.horiz = OL.Key(box, { x: 790, y: 274, w: 46, h: 22, label: 'HORIZ', cls: 'darkblue', on: () => openMenu('horiz') });
  OL.Label(box, 783, 330, 'SEC/DIV', 'zl', 60);
  OL.Knob(box, { x: 813, y: 365, r: 28, cls: 'bigk', turn: n => tdiv(n), push: () => {} });
  /* déclenchement */
  E('div', 'o-trg', box, { left: '858px', top: '176px', width: '66px', height: '210px' });
  OL.Label(box, 858, 180, 'Trigger', 'zl', 66);
  bk.trigmenu = OL.Key(box, { x: 866, y: 198, w: 50, h: 28, label: 'Menu', cls: 'darkblue2', on: () => openMenu('trig') });
  OL.Label(box, 858, 232, 'TRIG LEVEL', 'zl', 66);
  OL.Knob(box, { x: 891, y: 268, r: 17, cls: 'smk', turn: n => level(n) });
  bk.p50 = OL.Key(box, { x: 866, y: 308, w: 50, h: 28, label: '50%', cls: 'white', on: () => level50() });
  bk.force = OL.Key(box, { x: 866, y: 352, w: 50, h: 28, label: 'Force', cls: 'white', on: () => S.force() });
  /* BNC */
  const bnc = (x, y, t) => { E('div', 'bnc', box, { left: (x - 20) + 'px', top: (y - 20) + 'px' }, '<i></i>'); OL.Label(box, x - 30, y + 22, t, 'zl dark', 60); };
  bnc(652, 430, 'CH1'); bnc(722, 430, 'CH2'); bnc(813, 430, 'EXT TRIG');
  OL.Label(box, 626, 396, 'X', 'zl dark', 16); OL.Label(box, 714, 396, 'Y', 'zl dark', 16);
  OL.Label(box, 855, 392, 'PROBE COMP', 'zl dark', 72);
  E('div', 'comp-term', box, { left: '881px', top: '408px' }, '<i class="pin"></i><i class="gnd"></i>');
  OL.Label(box, 855, 458, '5V&nbsp;1kHz', 'zl dark', 72);
  U.bnc = { ch: [{ x: 652, y: 430 }, { x: 722, y: 430 }], comp: { x: 893, y: 422 }, gnd: { x: 893, y: 443 } };

  /* ===== logique des commandes ===== */
  function hclamp(v) { const lim = 6 * S.tdiv() * 50; return Math.max(-lim, Math.min(lim, v)); }
  function msg(t) { U.toast = t; U.toastT = performance.now(); }
  U.msg = msg;
  function doAutoset() { const ok = S.autoset(); msg(ok ? 'Autoset' : 'Signal introuvable'); if (ok) { U.menu = null; U.cur.type = 'off'; } }
  function chKey(i) {
    const c = st.ch[i];
    U.open = -1;
    if (!c.on) { c.on = true; U.menu = 'ch' + i; S.st.sel = i; return; }
    if (U.menu === 'ch' + i) { c.on = false; U.menu = null; U.open = -1; return; }
    U.menu = 'ch' + i; U.open = -1; S.st.sel = i;
  }
  function openMenu(id) { if (U.menu === id) { U.open = -1; return; } U.menu = id; U.open = -1; U.page = 0; }
  function vpos(i, n) {
    if (U.cur.type !== 'off' && U.menu === 'cursor') { if (i === 0) U.cur.a = clampD(U.cur.a + n * 0.08); else U.cur.b = clampD(U.cur.b + n * 0.08); return; }
    st.ch[i].pos = Math.max(-8, Math.min(8, st.ch[i].pos + n * 0.04));
  }
  function clampD(v) { return Math.max(-5.9, Math.min(5.9, v)); }
  function vposPush(i) { st.ch[i].pos = 0; }
  function vdiv(i, n) { const c = st.ch[i]; c.vIdx = Math.max(0, Math.min(P.vdivs.length - 1, c.vIdx - n)); S.resetAvg(); }
  function tdiv(n) { st.tdivIdx = Math.max(0, Math.min(P.tdivs.length - 1, st.tdivIdx - n)); S.resetAvg(); st.hdelay = hclamp(st.hdelay); }
  function level(n) {
    if (U.trigKnob === 'holdoff') { st.trig.holdoff = Math.max(100e-9, Math.min(1.5, st.trig.holdoff * (n > 0 ? 1.1 : 1 / 1.1))); return; }
    const lab = Math.abs(S.vdivLabel(st.trig.src)); st.trig.level += n * lab / 25;
    const lim = 4 * lab - st.ch[st.trig.src].pos * lab; st.trig.level = Math.max(-lim - 4 * lab, Math.min(lim + 4 * lab, st.trig.level));
  }
  function level50() {
    const t = st.trig, nd = S.nodeOf(t.src); if (!nd) { t.level = 0; return; }
    const v = S.volts(t.src); if (!v) return; let mn = Infinity, mx = -Infinity; for (const x of v) { if (x < mn) mn = x; if (x > mx) mx = x; } t.level = (mn + mx) / 2;
  }
  function copyShot() { try { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'oscillolab-owon.png'; a.click(); msg('Copie : image enregistrée'); } catch (e) { msg('Copie impossible'); } }
  function mKnob(n) { const it = U.activeItem(); if (it && it.knob) it.knob(n); else if (U.menu === 'cursor') { } }
  function mPush() { const it = U.activeItem(); if (it && it.push) it.push(); else { U.open = -1; } }
  U.activeItem = () => { const m = menus[U.menu]; if (!m) return null; const items = m(); const it = items[U.open]; return it || null; };

  /* ===== menus ===== */
  const cyc = (list, cur, n) => list[(list.indexOf(cur) + n + list.length) % list.length];
  const opt = (t, f) => ({ t, f });
  const menus = {};
  [0, 1].forEach(i => {
    menus['ch' + i] = () => { const c = st.ch[i]; return [
      { label: 'Coupling', val: () => c.coup.toUpperCase(), opts: ['dc', 'ac', 'gnd'].map(k => opt(k === 'gnd' ? 'GND' : k.toUpperCase(), () => { c.coup = k; })) },
      { label: 'BW Limit', val: () => c.bw20 ? 'ON' : 'OFF', opts: [opt('OFF', () => { c.bw20 = false; }), opt('ON', () => { c.bw20 = true; })] },
      { label: 'Volts/Div', val: () => 'Coarse', opts: [opt('Coarse', () => { }), opt('Fine', () => msg('Réglage fin : non simulé'))] },
      { label: 'Probe', val: () => c.probe + 'X', opts: P.probes.map(k => opt(k + 'X', () => { c.probe = k; S.resetAvg(); })) },
      { label: 'Invert', val: () => c.inv ? 'ON' : 'OFF', opts: [opt('OFF', () => { c.inv = false; }), opt('ON', () => { c.inv = true; })] }]; };
  });
  menus.trig = () => { const t = st.trig; return [
    { label: 'Single', val: () => 'Edge', opts: [opt('Edge', () => { })] },
    { label: 'Source', val: () => t.src === 'line' ? 'AC Line' : P.chNames[t.src], opts: P.chNames.map((n, k) => opt(n, () => { t.src = k; })).concat([opt('EXT', () => msg('EXT : entrée non câblée dans ce simulateur')), opt('AC Line', () => { t.src = 'line'; })]) },
    { label: 'Coupling', val: () => ({ dc: 'DC', ac: 'AC', hf: 'HF', lf: 'LF' })[t.coup], opts: [opt('DC', () => { t.coup = 'dc'; }), opt('AC', () => { t.coup = 'ac'; }), opt('HF Reject', () => { t.coup = 'hf'; }), opt('LF Reject', () => { t.coup = 'lf'; })] },
    { label: 'Slope', val: () => t.slope === 'rise' ? '↗' : '↘', opts: [opt('↗ Rising', () => { t.slope = 'rise'; }), opt('↘ Falling', () => { t.slope = 'fall'; })] },
    { label: 'Auto', val: () => '&Holdoff', labelf: () => ({ auto: 'Auto', normal: 'Normal', single: 'Single' })[t.mode], knob: n => { t.holdoff = Math.max(100e-9, Math.min(1.5, t.holdoff * (n > 0 ? 1.1 : 1 / 1.1))); },
      opts: [opt('Auto', () => { t.mode = 'auto'; }), opt('Normal', () => { t.mode = 'normal'; }), opt('Single', () => { t.mode = 'single'; S.arm(); }), { t: () => 'Holdoff<br>' + OL.fmt(t.holdoff, 's'), f: () => { }, knobOpt: true }, opt('Reset<br>Holdoff', () => { t.holdoff = 100e-9; })] }]; };
  menus.horiz = () => [
    { label: 'Main TB', val: () => 'Window', opts: [opt('Main TB', () => { })] },
    { label: 'Holdoff', val: () => OL.fmt(st.trig.holdoff, 's'), knob: n => { st.trig.holdoff = Math.max(100e-9, Math.min(1.5, st.trig.holdoff * (n > 0 ? 1.1 : 1 / 1.1))); }, opts: [opt('Reset', () => { st.trig.holdoff = 100e-9; })] },
    { label: 'Trig knob', val: () => U.trigKnob === 'level' ? 'Level' : 'Holdoff', opts: [opt('Level', () => { U.trigKnob = 'level'; }), opt('Holdoff', () => { U.trigKnob = 'holdoff'; })] }];
  const MK = OL.OWON_MEAS.concat(['rdelay', 'fdelay']), mname = k => k === 'rdelay' ? 'Delay A→B ↑' : k === 'fdelay' ? 'Delay A→B ↓' : OL.MEAS[k].n;
  const addM = () => { const k = MK[U.mType || 0]; OL.toggleMeas(U.meas, OL.MEAS2[k] ? { id: k, key: k, a: 0, b: 1 } : { id: U.measCh + k, key: k, a: U.measCh }, 8); };
  const rmM = () => { const k = MK[U.mType || 0], id = OL.MEAS2[k] ? k : U.measCh + k; const i = U.meas.findIndex(x => x.id === id); if (i >= 0) U.meas.splice(i, 1); };
  const mTypeKnob = n => { U.mType = ((U.mType || 0) + n + MK.length) % MK.length; };
  const typeOpt = () => ({ t: () => 'Type<br>' + mname(MK[U.mType || 0]), f: () => { } }), srcOpt = () => ({ t: () => 'Source<br>' + P.chNames[U.measCh], f: () => { U.measCh = (U.measCh + 1) % P.nch; } });
  menus.measure = () => [
    { label: 'Add', val: () => '', knob: mTypeKnob, opts: [typeOpt(), srcOpt(), { t: '', f: () => { } }, { t: 'Add', f: addM }, { t: '', f: () => { } }] },
    { label: 'Remove', val: () => '', knob: mTypeKnob, opts: [typeOpt(), srcOpt(), { t: 'Remove', f: rmM }, { t: 'Remove<br>All', f: () => { U.meas.length = 0; } }, { t: '', f: () => { } }] }];
  menus.cursor = () => [
    { label: 'Type', val: () => ({ off: 'Off', v: 'Voltage', t: 'Time' })[U.cur.type], opts: [opt('Off', () => { U.cur.type = 'off'; }), opt('Voltage', () => { U.cur.type = 'v'; }), opt('Time', () => { U.cur.type = 't'; })] },
    { label: 'Source', val: () => P.chNames[U.cur.src], opts: P.chNames.map((n, k) => opt(n, () => { U.cur.src = k; })) },
    { label: 'Cur 1', val: () => 'POSITION CH1', opts: [opt('Tourner', () => { })] },
    { label: 'Cur 2', val: () => 'POSITION CH2', opts: [opt('Tourner', () => { })] }];
  menus.acquire = () => [
    { label: 'Mode', val: () => ({ sample: 'Sample', peak: 'Peak', avg: 'Average' })[st.acq], opts: [opt('Sample', () => { st.acq = 'sample'; }), opt('Peak Detect', () => { st.acq = 'peak'; }), opt('Average', () => { st.acq = 'avg'; S.resetAvg(); })] },
    { label: 'Averages', val: () => String(st.avgN), opts: [4, 16, 64, 128].map(n => opt(String(n), () => { st.avgN = n; S.resetAvg(); })) },
    { label: 'Sampling', val: () => 'Real-time', opts: [opt('Real-time', () => { })] }];
  menus.display = () => [
    { label: 'Type', val: () => st.dots ? 'Dots' : 'Vect', opts: [opt('Vect', () => { st.dots = false; }), opt('Dots', () => { st.dots = true; })] },
    { label: 'Format', val: () => st.xy ? 'XY' : 'YT', opts: [opt('YT', () => { st.xy = false; }), opt('XY', () => { st.xy = true; })] },
    { label: 'Persist', val: () => ({ 0: 'Off', 1: '1s', 2: '2s', 5: '5s', 99: 'Inf' })[st.persist] || 'Off', opts: [[0, 'Off'], [1, '1 s'], [2, '2 s'], [5, '5 s'], [99, 'Infinite']].map(([v, t]) => opt(t, () => { st.persist = v; U.ghost = null; })) },
    { label: 'Grid', val: () => U.gridMode === 'cross' ? 'Axes' : 'Full', opts: [opt('Full', () => { U.gridMode = 'full'; }), opt('Axes', () => { U.gridMode = 'cross'; })] }];
  menus.utility = () => [
    { label: 'Self Cal', val: () => '', opts: [opt('Exécuter', () => { U.selfcal = performance.now(); })] },
    { label: 'Language', val: () => 'Français', opts: [opt('Français', () => { })] },
    { label: 'Counter', val: () => U.counter ? 'On' : 'Off', opts: [opt('Off', () => { U.counter = false; }), opt('On', () => { U.counter = true; })] }];
  const mem = {};
  menus.save = () => [
    { label: 'Type', val: () => U.saveType || 'Setting', opts: [opt('Wave', () => { U.saveType = 'Wave'; }), opt('Setting', () => { U.saveType = 'Setting'; }), opt('Image', () => { U.saveType = 'Image'; })] },
    { label: 'Save', val: () => '', opts: [opt('Enregistrer', () => { if (U.saveType === 'Image') copyShot(); else { mem.s = JSON.stringify(st); msg('Réglages enregistrés'); } })] },
    { label: 'Recall', val: () => '', opts: [opt('Rappeler', () => { if (mem.s) { Object.assign(st, JSON.parse(mem.s)); msg('Réglages rappelés'); } else msg('Mémoire vide'); })] },
    { label: 'Default', val: () => '', opts: [opt('Réglages d\'usine', () => { S.defaultSetup(); U.meas.length = 0; U.cur.type = 'off'; msg('Réglages d\'usine'); })] }];
  menus.math = () => [
    { label: 'Operation', val: () => ({ 'a+b': 'CH1+CH2', 'a-b': 'CH1-CH2', 'a*b': 'CH1×CH2', 'a/b': 'CH1÷CH2' })[st.math.op], opts: [opt('CH1+CH2', () => { st.math.op = 'a+b'; }), opt('CH1-CH2', () => { st.math.op = 'a-b'; }), opt('CH1×CH2', () => { st.math.op = 'a*b'; }), opt('CH1÷CH2', () => { st.math.op = 'a/b'; })] }];
  function pressH(i) {
    const m = menus[U.menu]; if (!m) return; const it = m()[i]; if (!it) return;
    if (it.opts) { U.open = (U.open === i) ? -1 : i; U.page = 0; }
  }
  function pressF(i) {
    const m = menus[U.menu]; if (!m || U.open < 0) return; const it = m()[U.open]; if (!it || !it.opts) return;
    let opts = typeof it.opts === 'function' ? it.opts() : it.opts;
    const paged = opts.length > 5 || it.paged; let first = 0, per = 5;
    if (opts.length > 5) { per = 4; first = U.page * 4; if (i === 4) { U.page = (U.page + 1) % Math.ceil(opts.length / 4); return; } }
    const o = opts[first + i]; if (!o) return; o.f();
    if (!(it.paged)) { if (!it.knob) U.open = -1; }
  }
  U.menus = menus; U.pressF = pressF; U.pressH = pressH; U.openMenu = openMenu; U.doAutoset = doAutoset; U.keys = bk;

  /* ===== rendu de l'écran (800x600) ===== */
  const GR = { x: 22, y: 20, w: 756, h: 496 };
  U.GR = GR;
  const fmtV = v => OL.fmt(v, 'V', 3), fmtDiv = lab => (lab >= 1 ? lab.toPrecision(3).replace(/\.?0+$/, '') + 'V' : (lab * 1000).toPrecision(3).replace(/\.?0+$/, '') + 'mV');
  const fmtVd = lab => lab >= 1 ? String(+lab.toPrecision(3)) + 'V' : String(+(lab * 1000).toPrecision(3)) + 'mV';
  const fmtTd = t => { const a = Math.abs(t); return a >= 1 ? String(+t.toPrecision(3)) + 's' : a >= 1e-3 ? String(+(t * 1e3).toPrecision(3)) + 'ms' : a >= 1e-6 ? String(+(t * 1e6).toPrecision(3)) + 'us' : String(+(t * 1e9).toPrecision(3)) + 'ns'; };
  const fmtFreq = f => f === null ? '' : f >= 1e6 ? (f / 1e6).toFixed(5) + 'MHz' : f >= 1e3 ? (f / 1e3).toFixed(5) + 'KHz' : f.toFixed(4) + 'Hz';
  const chColor = i => cols[i];
  function chBadge(c, x, y, i, on) { c.fillStyle = cols[i]; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); OL.text(c, String(i + 1), x, y + 1, { size: 12, color: '#fff', align: 'center', bold: true }); }

  U.measureOf = function (i) { const v = S.volts(i); if (!v) return null; return OL.measure(v, S.window() / v.length); };
  U.ghost = null;

  U.draw = function () {
    const c = ctx; c.fillStyle = '#000'; c.fillRect(0, 0, 800, 600);
    const sc = S, rec = sc.rec;
    if (U.selfcal && performance.now() - U.selfcal < 2500) { OL.text(c, 'Auto-étalonnage en cours…', 400, 300, { size: 26, align: 'center' }); return; } else U.selfcal = 0;
    /* barre du haut */
    OL.text(c, 'OWON', 8, 10, { size: 15, bold: true, color: '#3c9bff' });
    const stText = { 'AUTO': 'Auto', "TRIG'D": 'Trig', 'WAIT': 'Ready', 'STOP': 'Stop', 'ROLL': 'Roll', 'FORCE': 'Trig' }[sc.status] || '';
    OL.rrect(c, 120, 1, 80, 18, 7, st.run ? (sc.status === "TRIG'D" || sc.status === 'FORCE' ? '#17a34a' : '#c78a00') : '#b91c1c');
    OL.text(c, stText, 160, 10, { size: 14, align: 'center', bold: true });
    c.strokeStyle = '#ccc'; c.strokeRect(250.5, 3.5, 300, 13);
    c.fillStyle = '#9a9a9a'; c.fillRect(254, 9, 292, 1);
    const tp = 400 - (st.hdelay / (S.window())) * 300 * 0;      /* repère de position mémoire */
    c.fillStyle = '#e0a'; c.fillRect(396 - st.hdelay / S.window() * 292, 4, 8, 11);
    OL.text(c, 'T', 400 - st.hdelay / S.window() * 292, 10, { size: 10, color: '#fff', align: 'center', bold: true });
    OL.rrect(c, 562, 1, 120, 18, 8, '#222', '#a3a', 1.5); OL.text(c, OL.fmt(-st.hdelay, 's', 4).replace('µ', 'u').replace(',', '.').replace(' ', ''), 570, 10, { size: 13 });
    OL.rrect(c, 684, 1, 68, 18, 8, '#111', '#8aa', 1); OL.text(c, '17:01', 718, 10, { size: 13, align: 'center' });
    /* graticule */
    OL.drawGrid(c, GR, { full: U.gridMode !== 'cross', line: '#585858', axis: '#9b9b9b', frame: '#bdbdbd' });
    const dh = GR.h / 8, cy = GR.y + GR.h / 2;
    /* tracés */
    if (rec) OL.persistDraw(U, S, c, 800, 600, st.persist, c => {
      if (st.xy) { const a = sc.divs(0), b = sc.divs(1); OL.drawXY(c, GR, a, b, cols[0]); }
      else for (let i = 0; i < P.nch; i++) {
        if (!st.ch[i].on) continue;
        const d = sc.divs(i); const pk = st.acq === 'peak' ? sc.peakDivs(i) : null;
        if (pk) OL.drawPeak(c, GR, pk, cols[i]); else OL.drawTrace(c, GR, d, cols[i], { dots: st.dots, step: 6 });
      }
      if (st.math.on && st.ch[0].on && st.ch[1].on && !st.xy) {
        const v0 = sc.volts(0), v1 = sc.volts(1), m = new Float64Array(v0.length), lab = Math.abs(sc.vdivLabel(0));
        for (let j = 0; j < m.length; j++) { const a = v0[j], b = v1[j]; const r = st.math.op === 'a+b' ? a + b : st.math.op === 'a-b' ? a - b : st.math.op === 'a*b' ? a * b : (b ? a / b : 0); m[j] = Math.max(-4.2, Math.min(4.2, r / lab)); }
        OL.drawTrace(c, GR, m, '#c050ff', {});
      }
    });
    /* marqueurs de position (gauche) et de niveau de déclenchement (droite) */
    for (let i = 0; i < P.nch; i++) if (st.ch[i].on) {
      const y = cy - st.ch[i].pos * dh; c.fillStyle = cols[i]; c.beginPath(); c.moveTo(0, y - 9); c.lineTo(14, y - 9); c.lineTo(20, y); c.lineTo(14, y + 9); c.lineTo(0, y + 9); c.closePath(); c.fill();
      OL.text(c, String(i + 1), 7, y + 1, { size: 12, color: '#000', align: 'center', bold: true });
    }
    if (st.trig.src !== 'line') { const t = st.trig, lab = Math.abs(sc.vdivLabel(t.src)), y = Math.max(GR.y + 4, Math.min(GR.y + GR.h - 4, cy - (t.level / lab + st.ch[t.src].pos) * dh));
      c.fillStyle = '#d8d8ff'; c.beginPath(); c.moveTo(800, y); c.lineTo(786, y - 8); c.lineTo(786, y + 8); c.closePath(); c.fill(); OL.text(c, 'T', 792, y + 1, { size: 9, color: '#000', align: 'center', bold: true }); }
    /* curseurs */
    if (U.cur.type !== 'off') drawCursors(c);
    /* mesures affichées */
    drawMeas(c);
    /* bas d'écran : lectures voies */
    c.fillStyle = '#0b0b0b'; c.fillRect(0, 518, 800, 82);
    let ly = 520;
    for (let i = 0; i < P.nch; i++) { if (!st.ch[i].on) continue; const ch = st.ch[i];
      c.strokeStyle = '#8c8c8c'; OL.rrect(c, 0.5, ly, 206, 19, 3, null, '#8c8c8c', 1);
      chBadge(c, 12, ly + 10, i); OL.text(c, fmtVd(sc.vdivLabel(i)) + (ch.coup === 'ac' ? '~' : ch.coup === 'gnd' ? '⏚' : '') + (ch.inv ? ' ⇅' : '') + (ch.bw20 ? ' B' : ''), 26, ly + 10, { size: 15, color: cols[i] });
      OL.text(c, ch.pos.toFixed(2) + 'div', 198, ly + 10, { size: 15, color: cols[i], align: 'right' });
      ly += 21; }
    if (st.math.on) { OL.rrect(c, 0.5, ly, 206, 19, 3, null, '#8c8c8c', 1); OL.text(c, 'M  ' + ({ 'a+b': 'CH1+CH2', 'a-b': 'CH1-CH2', 'a*b': 'CH1×CH2' })[st.math.op], 10, ly + 10, { size: 14, color: '#c050ff' }); }
    OL.rrect(c, 209.5, 518.5, 107, 40, 4, null, '#8c8c8c', 1);
    const sr = sc.sampleRate(); OL.text(c, '(' + (sr >= 1e6 ? +(sr / 1e6).toPrecision(3) + 'MS/s' : sr >= 1e3 ? +(sr / 1e3).toPrecision(3) + 'kS/s' : +sr.toPrecision(3) + 'S/s') + ')', 262, 531, { size: 14, align: 'center' });
    OL.text(c, 'Depth:' + (P.depth >= 1e3 ? P.depth / 1e3 + 'K' : P.depth), 262, 548, { size: 14, align: 'center' });
    OL.rrect(c, 320.5, 520.5, 100, 20, 8, null, '#aaa', 1); OL.text(c, 'M:' + fmtTd(S.tdiv()), 370, 531, { size: 14, align: 'center' });
    OL.rrect(c, 430.5, 520.5, 76, 20, 8, null, '#aaa', 1); OL.text(c, 'W:' + fmtTd(S.tdiv()), 468, 531, { size: 14, align: 'center' });
    const t = st.trig; OL.rrect(c, 640.5, 520.5, 150, 20, 8, null, '#aaa', 1);
    chBadge(c, 654, 531, t.src); OL.text(c, (t.slope === 'rise' ? '⎍ ' : '⎍̸ ').slice(0, 0) + (t.slope === 'rise' ? '↗ ' : '↘ ') + fmtV(t.level).replace(' ', '').replace('µ', 'u').replace(',', '.'), 672, 531, { size: 14 });
    /* compteur de fréquence */
    if (U.counter !== false) { const fc = S.counterFreq(); if (fc) { c.fillStyle = '#000'; OL.rrect(c, 660.5, 497.5, 118, 18, 6, '#000', '#bbb', 1); chBadge(c, 670, 507, t.src); OL.text(c, fmtFreq(fc), 776, 507, { size: 13, align: 'right' }); } }
    drawMenu(c);
    if (U.toast && performance.now() - U.toastT < 1800) { OL.rrect(c, 250, 250, 300, 40, 6, 'rgba(30,30,30,.92)', '#fff', 1); OL.text(c, U.toast, 400, 270, { size: 18, align: 'center' }); }
    if (U.help) { OL.rrect(c, 120, 80, 560, 330, 8, 'rgba(15,25,45,.96)', '#fff', 1.5); const L = ['Aide : appuyez sur une touche de menu (Measure, Cursor…).', 'H1…H5 : choisir un élément du menu en bas.', 'F1…F5 : choisir une option dans le menu de droite.', 'Bouton M : modifier une valeur (par ex. le temps de maintien).', 'Autoset : réglage automatique du signal.', 'Appui sur un bouton POSITION : remise à zéro.']; L.forEach((l, k) => OL.text(c, l, 140, 120 + k * 36, { size: 17 })); }
  };
  function drawCursors(c) {
    const cu = U.cur, dh = GR.h / 8, cy = GR.y + GR.h / 2, src = cu.src, lab = Math.abs(S.vdivLabel(src)), col = '#fff';
    c.save(); c.setLineDash([5, 4]); c.strokeStyle = cols[src] === '#ffe000' ? '#ffe000' : col; c.lineWidth = 1;
    if (cu.type === 'v') {
      [cu.a, cu.b].forEach(d => { const y = cy - d * dh; c.beginPath(); c.moveTo(GR.x, y); c.lineTo(GR.x + GR.w, y); c.stroke(); });
      const y1 = (cu.a - st.ch[src].pos) * lab, y2 = (cu.b - st.ch[src].pos) * lab;
      c.setLineDash([]); OL.rrect(c, 24, 436, 188, 76, 6, 'rgba(0,0,30,.85)', '#8aa', 1.5);
      chBadge(c, 38, 450, src); OL.text(c, '△y:' + (y1 - y2).toFixed(2).replace(',', '.') + 'v'.replace(' ', ''), 56, 450, { size: 15 });
      OL.text(c, 'y1:' + y1.toFixed(2) + 'v', 36, 474, { size: 15 }); OL.text(c, 'y2:' + y2.toFixed(2) + 'v', 36, 496, { size: 15 });
    } else {
      const wd = GR.w / 12; [cu.a, cu.b].forEach(d => { const x = GR.x + GR.w / 2 + d * wd; c.beginPath(); c.moveTo(x, GR.y); c.lineTo(x, GR.y + GR.h); c.stroke(); });
      const t1 = cu.a * S.tdiv(), t2 = cu.b * S.tdiv(), dt = Math.abs(t1 - t2);
      c.setLineDash([]); OL.rrect(c, 24, 436, 214, 76, 6, 'rgba(0,0,30,.85)', '#8aa', 1.5);
      OL.text(c, '△T:' + OL.fmt(dt, 's', 4).replace(',', '.'), 36, 450, { size: 15 }); OL.text(c, '1/△T:' + (dt ? OL.fmt(1 / dt, 'Hz', 4).replace(',', '.') : '****'), 36, 474, { size: 15 });
      OL.text(c, 'T1:' + OL.fmt(t1, 's', 3).replace(',', '.') + '  T2:' + OL.fmt(t2, 's', 3).replace(',', '.'), 36, 496, { size: 13 });
    }
    c.restore();
  }
  function drawMeas(c) {
    if (!U.meas.length) return;
    const lines = U.meas.map(m => OL.measValue(S, m, 'owon'));
    const h = 8 + lines.length * 21; OL.rrect(c, GR.x + 4, GR.y + 4, 232, h, 5, 'rgba(0,0,0,.72)', '#667', 1);
    lines.forEach((l, k) => OL.text(c, (l.label + ': ' + l.val).replace('µ', 'u').replace(/(\d),(\d)/g, '$1.$2'), GR.x + 12, GR.y + 18 + k * 21, { size: 15, color: cols[l.ci] }));
  }
  function drawMenu(c) {
    if (!U.menu) return; const mf = menus[U.menu]; if (!mf) return; const items = mf();
    for (let i = 0; i < 5; i++) {
      const it = items[i], x = 322 + i * 91.5, y = 541, w = 88, h = 57; if (!it) continue;
      const sel = (U.open === i);
      const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, sel ? '#4fb0ff' : '#1d5fb0'); g.addColorStop(1, sel ? '#1a6fd0' : '#0d3a78');
      OL.rrect(c, x, y, w, h, 5, g, '#aee', 1);
      const lab = it.labelf ? it.labelf() : it.label;
      OL.text(c, lab, x + w / 2, y + 17, { size: 16, align: 'center' });
      const v = typeof it.val === 'function' ? it.val() : ''; OL.rrect(c, x + 6, y + 30, w - 12, 20, 3, '#e8f1ff'); OL.text(c, v.replace(/&amp;/g, '&').replace('&Holdoff', '&Holdoff'), x + w / 2, y + 40, { size: 15, color: '#102', align: 'center' });
    }
    if (U.open >= 0 && items[U.open] && items[U.open].opts) {
      const it = items[U.open]; let opts = typeof it.opts === 'function' ? it.opts() : it.opts; let first = 0;
      if (opts.length > 5) { first = U.page * 4; const show = opts.slice(first, first + 4); show.push({ t: 'Page ' + (U.page + 1) + '/' + Math.ceil(opts.length / 4) + ' ▼' }); opts = show; first = 0; }
      opts.forEach((o, k) => { const y = 122 + k * 76.4; const g = c.createLinearGradient(0, y, 0, y + 62); g.addColorStop(0, '#2a74c8'); g.addColorStop(1, '#0d3a78'); OL.rrect(c, 700, y, 92, 62, 6, g, '#aee', 1);
        const t = typeof o.t === 'function' ? o.t() : o.t; const parts = String(t).split('<br>'); parts.forEach((p, q) => OL.text(c, p, 746, y + 31 + (q - (parts.length - 1) / 2) * 17, { size: 15, align: 'center' })); });
    }
  }
  /* repères des commandes (pour le bouton « Montre-moi » des TP) */
  U.ctl = {}; const KM = { Measure: 'measure', Acquire: 'acquire', Autoset: 'autoset', Utility: 'utility', Cursor: 'cursor', Autoscale: 'autoscale', Save: 'save', Display: 'display', Help: 'help', Copy: 'copy', 'Run/Stop': 'run', Single: 'single', CH1: 'ch1', CH2: 'ch2', Math: 'math', HORIZ: 'horiz', Menu: 'trigmenu', '50%': 'p50', Force: 'force', Menuoff: 'menuoff' };
  box.querySelectorAll('button.key').forEach(b => { const tx = b.textContent.trim(); const id = KM[tx] || (/^[HF][1-5]$/.test(tx) ? tx.toLowerCase() : null); if (id) U.ctl[id] = b; });
  ['m', 'vpos1', 'vdiv1', 'vpos2', 'vdiv2', 'hpos', 'secdiv', 'level'].forEach((id, i) => { U.ctl[id] = box.querySelectorAll('.knob')[i]; });
  ['bnc1', 'bnc2', 'bnc3'].forEach((id, i) => { U.ctl[id] = box.querySelectorAll('.bnc')[i]; }); U.ctl.comp = box.querySelector('.comp-term');
  U.flash = ids => { [].concat(ids).forEach(id => { const e = U.ctl[id]; if (!e) return; e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); setTimeout(() => e.classList.remove('flash'), 3600); }); };
  U.tickFrame = function (dt) {
    const mm = { measure: 'measure', acquire: 'acquire', cursor: 'cursor', display: 'display', utility: 'utility', save: 'save', math: 'math', horiz: 'horiz', trig: 'trigmenu' };
    Object.keys(mm).forEach(m => { const e = U.ctl[mm[m]]; if (e) e.classList.toggle('lit', U.menu === m || (m === 'math' && st.math.on)); });
    [0, 1].forEach(i => { const e = U.ctl['ch' + (i + 1)]; if (e) e.classList.toggle('lit', st.ch[i].on && U.menu === 'ch' + i); });
    if (U.ctl.autoscale) U.ctl.autoscale.classList.toggle('lit', U.autoscale);
    if (U.ctl.single) U.ctl.single.classList.toggle('lit', S.status === 'WAIT' && !st.run);
    if (U.autoscale) { U.asT = (U.asT || 0) + dt; if (U.asT > 2) { U.asT = 0; if (!st.xy) S.autoset({ keep: true }); } }
    bk.run.setLed(st.run); bk.run.classList.toggle('stopped', !st.run);
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
