/* ui_rigol.js — face avant et écran du RIGOL DS1054Z (famille DS1000Z) */
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
  E('div', 'r-brand', box, { left: '74px', top: '4px' }, '<b>RIGOL</b><i>DS1054Z</i>');
  E('div', 'r-sub', box, { left: '300px', top: '12px' }, 'DIGITAL OSCILLOSCOPE &nbsp; 50&nbsp;MHz &nbsp; 1&nbsp;GSa/s &nbsp; 12&nbsp;Mpts');

  /* touches programmables */
  const sk = [];
  const mkSoft = (side, i) => {
    const x = side === 'l' ? 28 : 676, y = 82 + i * 44;
    return OL.Key(box, { x, y, w: 46, h: 30, label: '', cls: 'rkey ' + (side === 'l' ? 'soft' : 'softr'), on: () => (side === 'l' ? pressQM(i) : pressSoft(i)) });
  };
  const rs = [], ls = [];
  for (let i = 0; i < 6; i++) { ls.push(mkSoft('l', i)); rs.push(mkSoft('r', i)); }
  OL.Key(box, { x: 28, y: 40, w: 46, h: 30, label: 'MENU', cls: 'rkey arrow', on: () => { U.qm = U.qm === null ? 0 : (U.qm === 0 ? 1 : null); U.qmPage = 0; } });
  OL.Key(box, { x: 676, y: 40, w: 46, h: 30, label: '▲', cls: 'rkey arrow', on: () => { U.page = Math.max(0, U.page - 1); } });
  OL.Key(box, { x: 676, y: 340, w: 46, h: 30, label: '▼', cls: 'rkey arrow', on: () => { U.page = U.page + 1; } });
  const qmN = () => Math.ceil((U.qm === 1 ? OL.RIGOL_V : OL.RIGOL_H).length / 6);
  OL.Key(box, { x: 28, y: 340, w: 46, h: 20, label: '▲', cls: 'rkey arrow', on: () => { U.qmPage = Math.max(0, (U.qmPage || 0) - 1); } });
  OL.Key(box, { x: 28, y: 364, w: 46, h: 20, label: '▼', cls: 'rkey arrow', on: () => { U.qmPage = Math.min(qmN() - 1, (U.qmPage || 0) + 1); } });

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
  OL.Knob(box, { x: 760, y: 118, r: 26, cls: 'rk', turn: n => mfKnob(n), push: () => mfPush(), title: 'Bouton multifonction : sert à choisir dans les menus ; sans menu, règle l\'intensité du tracé' });
  OL.Label(box, 724, 150, 'Intensity', 'rl', 72);
  const mname = [['Measure', 'measure'], ['Acquire', 'acquire'], ['Storage', 'storage'], ['Cursor', 'cursor'], ['Display', 'display'], ['Utility', 'utility']];
  mname.forEach(([lab, id], k) => K(826 + (k % 3) * 64, 96 + Math.floor(k / 3) * 34, 58, 26, lab, 'light', () => openMenu(id)));

  /* VERTICAL */
  E('div', 'r-zone', box, { left: '732px', top: '172px', width: '170px', height: '210px' }); OL.Label(box, 735, 164, 'VERTICAL', 'rl', 60);
  const chk = [];
  for (let i = 0; i < 4; i++) {
    const k = K(738, 186 + i * 36, 46, 26, 'CH' + (i + 1), 'ring', () => chKey(i)); k.style.borderColor = cols[i]; k.style.boxShadow = '0 0 0 1px ' + cols[i] + ', 0 2px 0 #14161a'; chk.push(k);
  }
  K(796, 254, 40, 24, 'MATH', 'ring', () => openMenu('math'));
  K(846, 254, 40, 24, 'REF', 'ring', () => msg('REF : forme d\'onde de référence non simulée'));
  OL.Knob(box, { x: 830, y: 218, r: 22, cls: 'rk', turn: n => vpos(n), push: () => { st.ch[U.sel].pos = 0; }, title: 'POSITION' }); OL.Label(box, 800, 242, 'POSITION', 'rl', 60);
  OL.Knob(box, { x: 846, y: 322, r: 26, cls: 'rk', turn: n => vdiv(n), push: () => { const c = st.ch[U.sel]; c.fineMode = !c.fineMode; c.fk = c.fineMode ? c.fk : 0; msg(c.fineMode ? 'Volts/Div : réglage fin' : 'Volts/Div : réglage par paliers'); }, title: 'SCALE (appui : fin / paliers)' }); OL.Label(box, 816, 351, 'SCALE', 'rl', 60);
  /* HORIZONTAL */
  E('div', 'r-zone', box, { left: '908px', top: '172px', width: '92px', height: '210px' }); OL.Label(box, 910, 164, 'HORIZONTAL', 'rl', 90);
  OL.Knob(box, { x: 954, y: 206, r: 20, cls: 'rk', turn: n => { st.hdelay -= n * S.tdiv() / 25; st.hdelay = Math.max(-60 * S.tdiv(), Math.min(60 * S.tdiv(), st.hdelay)); }, push: () => { st.hdelay = 0; } }); OL.Label(box, 924, 228, 'POSITION', 'rl', 60);
  K(932, 258, 44, 24, 'MENU', 'light', () => openMenu('horiz'));
  OL.Knob(box, { x: 954, y: 326, r: 26, cls: 'rk', turn: n => tdiv(n), push: () => { } }); OL.Label(box, 924, 354, 'SCALE', 'rl', 60);
  /* TRIGGER */
  E('div', 'r-zone', box, { left: '1006px', top: '172px', width: '80px', height: '210px' }); OL.Label(box, 1008, 164, 'TRIGGER', 'rl', 76);
  const bMode = K(1024, 184, 44, 22, 'MODE', 'light', () => { const t = st.trig; t.mode = t.mode === 'auto' ? 'normal' : t.mode === 'normal' ? 'single' : 'auto'; if (t.mode === 'single') S.arm(); });
  const leds = ['Auto', 'Normal', 'Single'].map((n, i) => { const l = E('div', 'r-led', box, { left: (1076) + 'px', top: (184 + i * 10) + 'px', width: '7px', height: '7px' }); return l; });
  OL.Knob(box, { x: 1046, y: 250, r: 18, cls: 'rk', turn: n => level(n), push: () => level0(), title: 'LEVEL (appui : niveau à 0 V)' }); OL.Label(box, 1016, 272, 'LEVEL', 'rl', 60);
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
  E('div', '', box, { left: '90px', top: '510px', width: '110px', height: '24px', background: '#3a3b3d', borderRadius: '0 0 8px 8px' });
  E('div', '', box, { left: '840px', top: '510px', width: '110px', height: '24px', background: '#3a3b3d', borderRadius: '0 0 8px 8px' });

  /* ===== logique ===== */
  function msg(t) { U.toast = t; U.toastT = performance.now(); } U.msg = msg;
  function copyShot() { try { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'oscillolab-rigol.png'; a.click(); msg('Capture enregistrée'); } catch (e) { msg('Capture impossible'); } }
  function doAuto() {
    U.autoSnap = JSON.stringify(st); const ok = S.autoset(); msg(ok ? 'Auto réglage' : 'Aucun signal (fréquence ≥ 41 Hz et amplitude ≥ 20 mV requises)');
    if (ok) { U.menu = 'auto'; U.page = 0; U.sel = st.sel; U.drop = null; U.sel2 = -1; }
  }
  const autoShape = (periods, edge) => { const per = (S.lastAuto || {}).per; if (!per) return; st.tdivIdx = OL.nearest(P.tdivs, edge ? per / 100 : periods * per / P.hdiv); if (edge) st.trig.slope = edge; st.hdelay = 0; S.resetAvg(); };
  function chKey(i) {
    const c = st.ch[i];
    if (!c.on) { c.on = true; U.sel = i; st.sel = i; U.menu = 'ch'; U.drop = null; return; }
    if (U.sel === i) { if (U.menu === 'ch') { c.on = false; U.menu = null; const nxt = st.ch.findIndex(x => x.on); if (nxt >= 0) { U.sel = nxt; st.sel = nxt; } } else { U.menu = 'ch'; } return; }
    U.sel = i; st.sel = i; U.menu = 'ch'; U.drop = null;
  }
  function openMenu(id) { if (U.menu === id && !U.drop) { U.menu = null; return; } U.menu = id; U.drop = null; U.page = 0; }
  function vpos(n) { if (U.menu === 'cursor' && U.cur.mode !== 'off' && U.cur.fromKnob) return; const c = st.ch[U.sel]; c.pos = Math.max(-8, Math.min(8, c.pos + n * 0.04)); }
  function vdiv(n) { const c = st.ch[U.sel], old = Math.abs(S.vdivLabel(U.sel)); if (c.fineMode) S.fineStep(U.sel, -n); else { c.fk = 0; c.vIdx = Math.max(0, Math.min(P.vdivs.length - 1, c.vIdx - n)); } const nw = Math.abs(S.vdivLabel(U.sel)); c.pos = c.pos * old / nw; S.resetAvg(); }
  function tdiv(n) { st.tdivIdx = Math.max(0, Math.min(P.tdivs.length - 1, st.tdivIdx - n)); S.resetAvg(); }
  function level(n) { const lab = Math.abs(S.vdivLabel(st.trig.src)); st.trig.level += n * lab / 25; }
  function level0() { st.trig.level = 0; }
  function level50() { const t = st.trig, v = S.volts(t.src); if (!v) return; let mn = Infinity, mx = -Infinity; for (const x of v) { if (x < mn) mn = x; if (x > mx) mx = x; } t.level = (mn + mx) / 2; }
  function mfKnob(n) {
    if (U.drop) { U.drop.idx = Math.max(0, Math.min(U.drop.opts.length - 1, U.drop.idx + n)); return; }
    const it = U.menu ? U.activeItem() : null; if (it && it.knob) it.knob(n); else if (!U.menu || !it) U.inten = Math.max(1, Math.min(100, U.inten + n * 2));
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
    { label: 'Volts/Div', val: () => c.fineMode ? 'Fine' : 'Coarse', opts: [opt('Coarse', () => { c.fineMode = false; c.fk = 0; }), opt('Fine', () => { c.fineMode = true; })] }]; };
  menus.trig = () => { const t = st.trig; return [
    { label: 'Type', val: () => 'Edge', opts: ['Edge', 'Pulse', 'Slope', 'Video', 'Pattern', 'Duration', 'TimeOut', 'Runt', 'Window', 'Delay', 'Setup/Hold', 'Nth Edge', 'RS232', 'I2C', 'SPI'].map(n => opt(n, () => { if (n !== 'Edge') msg('Non simulé : seul le déclenchement sur front (Edge) est disponible'); })) },
    { label: 'Source', val: () => t.src === 'line' ? 'AC Line' : P.chNames[t.src], opts: P.chNames.map((n, k) => opt(n, () => { t.src = k; })).concat([opt('AC Line', () => { t.src = 'line'; })]) },
    { label: 'Slope', val: () => t.slope === 'rise' ? '↗' : t.slope === 'fall' ? '↘' : '↗↘', opts: [opt('↗ Rising', () => { t.slope = 'rise'; }), opt('↘ Falling', () => { t.slope = 'fall'; }), opt('↗↘ Both', () => { t.slope = 'both'; })] },
    { label: 'Sweep', val: () => ({ auto: 'Auto', normal: 'Normal', single: 'Single' })[t.mode], opts: [opt('Auto', () => { t.mode = 'auto'; }), opt('Normal', () => { t.mode = 'normal'; }), opt('Single', () => { t.mode = 'single'; S.arm(); })] },
    { label: 'Coupling', val: () => ({ dc: 'DC', ac: 'AC', hf: 'HF Reject', lf: 'LF Reject' })[t.coup], opts: [opt('DC', () => { t.coup = 'dc'; }), opt('AC', () => { t.coup = 'ac'; }), opt('LF Reject', () => { t.coup = 'lf'; }), opt('HF Reject', () => { t.coup = 'hf'; })] },
    { label: 'Holdoff', val: () => OL.fmt(t.holdoff, 's'), knob: n => { t.holdoff = Math.max(100e-9, Math.min(10, t.holdoff * (n > 0 ? 1.1 : 1 / 1.1))); }, push: () => { t.holdoff = 100e-9; } }]; };
  const PAIRS = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
  menus.horiz = () => [
    { label: 'Time Base', val: () => st.xy ? 'XY' : st.roll ? 'Roll' : 'YT', opts: [opt('YT', () => { st.xy = false; st.roll = false; }), opt('XY', () => { st.xy = true; st.roll = false; }), opt('Roll', () => { st.xy = false; st.roll = true; if (S.tdiv() < 0.2) st.tdivIdx = OL.nearest(P.tdivs, 0.2); })] },
    { label: 'X-Y', val: () => 'CH' + (st.xyPair[0] + 1) + '-CH' + (st.xyPair[1] + 1), opts: PAIRS.map(p => opt('CH' + (p[0] + 1) + '-CH' + (p[1] + 1), () => { st.xyPair = p; })) }];
  const HL = OL.RIGOL_H.concat(['rdelay', 'fdelay', 'rphase', 'fphase']), VL = OL.RIGOL_V;
  const mnm = k => OL.MEAS2[k] || OL.MEAS[k].r;
  const addM = k => { if (OL.MEAS2[k]) OL.toggleMeas(U.meas, { id: k + (U.mSrc || 0) + (U.mSrcB || 1), key: k, a: U.mSrc || 0, b: U.mSrcB === undefined ? 1 : U.mSrcB }, 5); else OL.toggleMeas(U.meas, { id: (U.mSrc || 0) + k, key: k, a: U.mSrc || 0 }, 5); };
  menus.auto = () => [
    { label: 'Multi-period', val: () => '', act: () => { S.autoset(); } },
    { label: 'Single-period', val: () => '', act: () => autoShape(1.6) },
    { label: 'Rising edge', val: () => '', act: () => autoShape(0, 'rise') },
    { label: 'Falling edge', val: () => '', act: () => autoShape(0, 'fall') },
    { label: 'Back', val: () => '', act: () => { U.menu = null; } },
    { label: 'Undo', val: () => '', act: () => { try { const o = JSON.parse(U.autoSnap); Object.keys(st).forEach(k => delete st[k]); Object.assign(st, o); } catch (e) { } U.menu = null; msg('Auto réglage annulé'); } }];
  menus.measure = () => [
    { label: 'Source', val: () => P.chNames[U.mSrc || 0], opts: P.chNames.map((n, k) => opt(n, () => { U.mSrc = k; })) },
    { label: 'Source B', val: () => P.chNames[U.mSrcB === undefined ? 1 : U.mSrcB], opts: P.chNames.map((n, k) => opt(n, () => { U.mSrcB = k; })) },
    { label: 'Horizontal', val: () => '▼', opts: HL.map(k => opt(mnm(k), () => addM(k))) },
    { label: 'Vertical', val: () => '▼', opts: VL.map(k => opt(mnm(k), () => addM(k))) },
    { label: 'All Measure', val: () => U.allMeas ? 'ON' : 'OFF', opts: [opt('OFF', () => { U.allMeas = false; }), opt('ON', () => { U.allMeas = true; })] },
    { label: 'Clear', val: () => '', opts: [opt('Tout effacer', () => { U.meas.length = 0; })] }];
  menus.acquire = () => [
    { label: 'Mode', val: () => ({ sample: 'Normal', peak: 'Peak Detect', avg: 'Average', hires: 'High Res' })[st.acq], opts: [opt('Normal', () => { st.acq = 'sample'; }), opt('Average', () => { st.acq = 'avg'; S.resetAvg(); }), opt('Peak Detect', () => { st.acq = 'peak'; }), opt('High Res', () => { st.acq = 'hires'; })] },
    { label: 'Averages', val: () => String(st.avgN), opts: [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024].map(n => opt(String(n), () => { st.avgN = n; S.resetAvg(); })) },
    { label: 'Mem Depth', val: () => !st.mem || st.mem === 'auto' ? 'Auto' : OL.fmtPts(st.mem), opts: () => [opt('Auto', () => { st.mem = 'auto'; })].concat(P.memOpts(Math.max(1, S.nOn())).map(m => opt(OL.fmtPts(m), () => { st.mem = m; }))) }];
  OL.fmtPts = m => m >= 1e6 ? +(m / 1e6).toFixed(1) + 'M' : +(m / 1e3).toFixed(0) + 'k';
  menus.display = () => [
    { label: 'Type', val: () => st.dots ? 'Dots' : 'Vectors', opts: [opt('Vectors', () => { st.dots = false; }), opt('Dots', () => { st.dots = true; })] },
    { label: 'Persist', val: () => U.persName(), opts: [[0, 'Min'], [0.1, '100 ms'], [0.2, '200 ms'], [0.5, '500 ms'], [1, '1 s'], [2, '2 s'], [5, '5 s'], [10, '10 s'], [99, 'Infinite']].map(([v, t]) => opt(t, () => { st.persist = v; U.ghost = null; })) },
    { label: 'Intensity', val: () => (U.inten) + '%', knob: n => { U.inten = Math.max(1, Math.min(100, U.inten + n * 2)); }, push: () => { U.inten = 50; } },
    { label: 'Grid', val: () => ({ full: 'Full', half: 'Half', none: 'None' })[U.gridMode || 'full'], opts: [opt('Full', () => { U.gridMode = 'full'; }), opt('Half', () => { U.gridMode = 'half'; }), opt('None', () => { U.gridMode = 'none'; })] },
    { label: 'Grid Bright.', val: () => (U.gridB) + '%', knob: n => { U.gridB = Math.max(0, Math.min(100, U.gridB + n * 2)); }, push: () => { U.gridB = 50; } }];
  U.inten = 50; U.gridB = 50; U.persName = () => ({ 0: 'Min', 0.1: '100 ms', 0.2: '200 ms', 0.5: '500 ms', 1: '1 s', 2: '2 s', 5: '5 s', 10: '10 s', 99: 'Infinite' })[st.persist] || 'Min';
  menus.cursor = () => [
    { label: 'Mode', val: () => ({ off: 'OFF', manual: 'Manual', track: 'Track' })[U.cur.mode], opts: [opt('OFF', () => { U.cur.mode = 'off'; }), opt('Manual', () => { U.cur.mode = 'manual'; }), opt('Track', () => { U.cur.mode = 'track'; })] },
    { label: 'Type', val: () => U.cur.type === 'x' ? 'X' : 'Y', opts: [opt('X', () => { U.cur.type = 'x'; }), opt('Y', () => { U.cur.type = 'y'; })] },
    { label: 'Source', val: () => P.chNames[U.cur.src], opts: P.chNames.map((n, k) => opt(n, () => { U.cur.src = k; })) },
    { label: 'CurA', val: () => OL.fmt(U.cur.a * S.tdiv(), 's'), knob: n => { U.cur.a = Math.max(-5.9, Math.min(5.9, U.cur.a + n * 0.05)); } },
    { label: 'CurB', val: () => OL.fmt(U.cur.b * S.tdiv(), 's'), knob: n => { U.cur.b = Math.max(-5.9, Math.min(5.9, U.cur.b + n * 0.05)); } },
    { label: 'CurAB', val: () => 'A+B', knob: n => { U.cur.a = Math.max(-5.9, Math.min(5.9, U.cur.a + n * 0.05)); U.cur.b = Math.max(-5.9, Math.min(5.9, U.cur.b + n * 0.05)); } }];
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
    { label: 'Operate', val: () => ({ 'a+b': 'A+B', 'a-b': 'A-B', 'a*b': 'A×B', 'a/b': 'A/B' })[st.math.op] + (st.math.on ? '' : ' (OFF)'), opts: [opt('A+B', () => { st.math.op = 'a+b'; st.math.on = true; }), opt('A-B', () => { st.math.op = 'a-b'; st.math.on = true; }), opt('A×B', () => { st.math.op = 'a*b'; st.math.on = true; }), opt('A/B', () => { st.math.op = 'a/b'; st.math.on = true; }), opt('OFF', () => { st.math.on = false; })] }];
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9%]/g, '');
  function pressSoft(i) {
    const m = menus[U.menu]; if (!m) return; const items = m(); const idx = U.page * 6 + i; const it = items[idx]; if (!it) return;
    U.sel2 = idx;
    if (it.act) { it.act(); return; }
    if (!it.opts) return;
    const opts = typeof it.opts === 'function' ? it.opts() : it.opts;
    if (U.drop && U.drop.item === it) { U.drop.opts[U.drop.idx].f(); U.drop = null; return; }   /* 2e appui : valide la liste */
    const v = norm(typeof it.val === 'function' ? it.val() : ''); let cur = opts.findIndex(o => { const n = norm(o.t); return n === v || (v && (n.indexOf(v) === 0 || v.indexOf(n) === 0)); }); if (cur < 0) cur = 0;
    if (opts.length <= 4) { opts[(cur + 1) % opts.length].f(); }        /* chaque appui passe à l'option suivante */
    else U.drop = { item: it, idx: cur, opts };                       /* liste : bouton multifonction pour choisir, appui pour valider */
  }
  function addM2(k) { OL.toggleMeas(U.meas, { id: st.sel + k, key: k, a: st.sel }, 5); }
  function pressQM(i) {
    if (U.qm === null) return; const set = U.qm === 0 ? OL.RIGOL_H : OL.RIGOL_V, key = set[(U.qmPage || 0) * 6 + i]; if (key) addM2(key);
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
    if (t.src === 'line') OL.text(c, 'AC', 722, 18, { size: 12, color: '#fc0', bold: true }); else { c.fillStyle = cols[t.src]; c.fillRect(716, 12, 11, 12); OL.text(c, String(t.src + 1), 721, 18, { size: 10, color: '#000', align: 'center', bold: true }); }
    if (t.src !== 'line') OL.text(c, OL.fmt(t.level, 'V', 3).replace(',', '.').replace(' ', ''), 790, 18, { size: 13, align: 'right', color: '#fc0' });
    /* graticule */
    OL.drawGrid2(c, GR, U.gridMode || 'full', U.gridB, { axis: '#808080' });
    const dh = GR.h / 8, cy = GR.y + GR.h / 2;
    if (rec) OL.persistDraw(U, S, c, 800, 480, st.persist, cx => {
      cx.save(); cx.globalAlpha = 0.35 + 0.65 * U.inten / 100;
      if (st.xy) OL.drawXY(cx, GR, sc.divs(st.xyPair[0]), sc.divs(st.xyPair[1]), cols[st.xyPair[0]]);
      else for (let i = 0; i < P.nch; i++) { if (!st.ch[i].on) continue; const pk = st.acq === 'peak' ? sc.peakDivs(i) : null; if (pk) OL.drawPeak(cx, GR, pk, cols[i]); else OL.drawTrace(cx, GR, sc.divs(i), cols[i], { dots: st.dots, step: 6 }); }
      if (st.math.on && st.ch[0].on && st.ch[1].on && !st.xy) {
        const v0 = sc.volts(0), v1 = sc.volts(1), m = new Float64Array(v0.length), lab = Math.abs(sc.vdivLabel(U.sel));
        for (let j = 0; j < m.length; j++) { const a = v0[j], b = v1[j]; const r = st.math.op === 'a+b' ? a + b : st.math.op === 'a-b' ? a - b : st.math.op === 'a*b' ? a * b : (b ? a / b : 0); m[j] = Math.max(-4.2, Math.min(4.2, r / lab)); }
        OL.drawTrace(cx, GR, m, '#ff8c1a', {});
      }
      cx.restore();
    });
    /* repères de zéro (gauche) et de niveau (droite) */
    for (let i = 0; i < P.nch; i++) if (st.ch[i].on) { const y = cy - st.ch[i].pos * dh; c.fillStyle = cols[i]; c.beginPath(); c.moveTo(GR.x - 18, y - 7); c.lineTo(GR.x - 6, y - 7); c.lineTo(GR.x, y); c.lineTo(GR.x - 6, y + 7); c.lineTo(GR.x - 18, y + 7); c.closePath(); c.fill(); OL.text(c, String(i + 1), GR.x - 11, y + 1, { size: 11, color: '#000', align: 'center', bold: true }); }
    if (t.src !== 'line') { const lab = Math.abs(sc.vdivLabel(t.src)), y = Math.max(GR.y + 6, Math.min(GR.y + GR.h - 6, cy - (t.level / lab + st.ch[t.src].pos) * dh)); c.fillStyle = '#ff9a1a'; c.beginPath(); c.moveTo(GR.x + GR.w, y); c.lineTo(GR.x + GR.w + 7, y - 7); c.lineTo(GR.x + GR.w + 20, y - 7); c.lineTo(GR.x + GR.w + 20, y + 7); c.lineTo(GR.x + GR.w + 7, y + 7); c.closePath(); c.fill(); OL.text(c, 'T', GR.x + GR.w + 13, y + 1, { size: 10, color: '#000', align: 'center', bold: true }); }
    const tx = GR.x + GR.w / 2 - st.hdelay / S.window() * GR.w; if (tx > GR.x && tx < GR.x + GR.w) { c.fillStyle = '#f90'; c.beginPath(); c.moveTo(tx - 6, GR.y - 8); c.lineTo(tx + 6, GR.y - 8); c.lineTo(tx, GR.y); c.closePath(); c.fill(); }
    if (U.cur.mode !== 'off') drawCursors(c);
    drawAll(c);
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
    if (U.qm === null) return; const keys = (U.qm === 0 ? OL.RIGOL_H : OL.RIGOL_V).slice((U.qmPage || 0) * 6, (U.qmPage || 0) * 6 + 6);
    OL.text(c, U.qm === 0 ? 'Horizontal' : 'Vertical', 40, 62, { size: 12, align: 'center', color: '#fff' });
    keys.forEach((k, i) => { const y = 76 + i * 56; OL.rrect(c, 8, y, 64, 50, 4, '#101820', '#3a6', 1); OL.text(c, OL.MEAS[k].r.replace('Rise Time', 'Rise').replace('Fall Time', 'Fall').replace('Period Area', 'P.Area'), 40, y + 36, { size: 12, align: 'center', color: U.meas.some(m => m.id === st.sel + k) ? '#ff0' : '#fff' }); c.strokeStyle = '#7fb'; c.strokeRect(24, y + 8, 32, 18); });
  }
  function drawCursors(c) {
    const cu = U.cur, dh = GR.h / 8, cy = GR.y + GR.h / 2, src = cu.src, lab = Math.abs(S.vdivLabel(src)), wd = GR.w / 12, pos = st.ch[src].pos;
    c.save(); c.setLineDash([6, 4]); c.strokeStyle = '#fff'; c.lineWidth = 1;
    const box = (n, lines) => { c.setLineDash([]); OL.rrect(c, GR.x + 6, GR.y + 6, 232, 8 + n * 17, 4, 'rgba(0,0,0,.82)', '#888', 1); lines.forEach((l, k) => OL.text(c, l, GR.x + 12, GR.y + 19 + k * 17, { size: 12.5 })); };
    const f = (v, u) => OL.fmt(v, u, 4).replace(',', '.');
    if (cu.mode === 'track' || cu.type === 'x') {
      const d = S.volts(src), N = d ? d.length : 0, val = x => { if (!N) return 0; const j = Math.max(0, Math.min(N - 1, Math.round((x + 6) / 12 * N))); return d[j]; };
      const xs = [cu.a, cu.b], t = xs.map(x => x * S.tdiv() - st.hdelay * 0), v = xs.map(val);
      xs.forEach((x, k) => { const px = GR.x + GR.w / 2 + x * wd; c.beginPath(); c.moveTo(px, GR.y); c.lineTo(px, GR.y + GR.h); c.stroke(); OL.text(c, k ? 'B' : 'A', px + 4, GR.y + 10, { size: 12 });
        if (cu.mode === 'track') { c.setLineDash([]); c.fillStyle = '#fff'; c.beginPath(); c.arc(px, cy - (v[k] / lab + pos) * dh, 4, 0, 7); c.fill(); c.setLineDash([6, 4]); } });
      const dt = Math.abs(t[1] - t[0]);
      if (cu.mode === 'track') box(7, ['AX: ' + f(t[0], 's'), 'AY: ' + f(v[0], 'V'), 'BX: ' + f(t[1], 's'), 'BY: ' + f(v[1], 'V'), 'ΔX: ' + f(dt, 's') + '   ΔY: ' + f(v[1] - v[0], 'V'), '1/ΔX: ' + (dt ? f(1 / dt, 'Hz') : '****'), '']);
      else box(4, ['AX: ' + f(t[0], 's'), 'BX: ' + f(t[1], 's'), 'ΔX: ' + f(dt, 's'), '1/ΔX: ' + (dt ? f(1 / dt, 'Hz') : '****')]);
    } else {
      [cu.a, cu.b].forEach((d, k) => { const y = cy - d * dh; c.beginPath(); c.moveTo(GR.x, y); c.lineTo(GR.x + GR.w, y); c.stroke(); OL.text(c, k ? 'B' : 'A', GR.x + 6, y - 7, { size: 12 }); });
      const y1 = (cu.a - pos) * lab, y2 = (cu.b - pos) * lab; box(3, ['AY: ' + f(y1, 'V'), 'BY: ' + f(y2, 'V'), 'ΔY: ' + f(Math.abs(y2 - y1), 'V')]);
    }
    c.restore();
  }
  function drawAll(c) {
    if (!U.allMeas) return; const s = U.mSrc || 0, v = S.volts(s); if (!v) return; const dt = S.window() / v.length, r = OL.measure(v, dt, v.length / 2 - st.hdelay / dt);
    const keys = OL.RIGOL_H.concat(OL.RIGOL_V), colW = 196, rows = 14; OL.rrect(c, GR.x + 4, GR.y + 4, colW * 3 + 8, rows * 17 + 22, 4, 'rgba(0,0,0,.85)', cols[s], 1);
    OL.text(c, 'All Measure — ' + P.chNames[s], GR.x + 10, GR.y + 14, { size: 12, color: cols[s], bold: true });
    keys.forEach((k, i) => { const col = Math.floor(i / rows), row = i % rows, def = OL.MEAS[k]; OL.text(c, def.r + ':', GR.x + 10 + col * colW, GR.y + 32 + row * 17, { size: 11.5, color: '#9cf' }); OL.text(c, OL.fmtMeas(def, def.v(r)).replace('µ', 'u').replace(',', '.'), GR.x + 6 + (col + 1) * colW - 8, GR.y + 32 + row * 17, { size: 11.5, align: 'right' }); });
  }
  function drawMeas(c) {
    U.meas.forEach((m, k) => { const l = OL.measValue(S, m, 'rigol'), col = cols[l.ci];
      const x = GR.x + 4 + k * 118, y = GR.y + GR.h - 40; OL.rrect(c, x, y, 114, 36, 3, 'rgba(0,0,0,.78)', col, 1);
      OL.text(c, l.label, x + 6, y + 11, { size: 11, color: col }); OL.text(c, l.val.replace(',', '.').replace('µ', 'u'), x + 108, y + 27, { size: 15, align: 'right', color: '#fff' }); });
  }
  function drawMenu(c) {
    if (!U.menu) return; const m = menus[U.menu]; if (!m) return; const items = m(), x0 = 702, w = 96;
    OL.rrect(c, x0 - 2, 38, w + 4, 402, 8, 'rgba(14,16,20,.97)', '#556', 1);
    OL.text(c, U.menu === 'ch' ? 'CH' + (U.sel + 1) : ({ auto: 'Auto Setting', trig: 'Trigger', horiz: 'Horizontal', measure: 'Measure', acquire: 'Acquire', display: 'Display', cursor: 'Cursor', storage: 'Storage', utility: 'Utility', math: 'Math' })[U.menu], x0 + w / 2, 52, { size: 14, align: 'center', color: '#8cf', bold: true });
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
  U.ctl = {}; const KM = { CLEAR: 'clear', AUTO: 'auto', 'RUN/STOP': 'run', SINGLE: 'single', Help: 'help', Measure: 'measure', Acquire: 'acquire', Storage: 'storage', Cursor: 'cursor', Display: 'display', Utility: 'utility', CH1: 'ch1', CH2: 'ch2', CH3: 'ch3', CH4: 'ch4', MATH: 'math', REF: 'ref', MODE: 'mode', FORCE: 'force' };
  const menus3 = []; box.querySelectorAll('button.key').forEach(b => { const tx = b.textContent.trim(); if (KM[tx]) U.ctl[KM[tx]] = b; if (tx === 'MENU') menus3.push(b); });
  U.ctl.qm = menus3[0]; U.ctl.horizmenu = menus3[1]; U.ctl.trigmenu = menus3[2]; rs.forEach((b, i) => { U.ctl['soft' + (i + 1)] = b; });
  ['mf', 'vpos', 'vscale', 'hpos', 'hscale', 'level'].forEach((id, i) => { U.ctl[id] = box.querySelectorAll('.knob')[i]; });
  ['bnc1', 'bnc2', 'bnc3', 'bnc4'].forEach((id, i) => { U.ctl[id] = box.querySelectorAll('.bnc')[i]; }); U.ctl.comp = box.querySelector('.comp-term');
  U.flash = ids => { [].concat(ids).forEach(id => { const e = U.ctl[id]; if (!e) return; e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); setTimeout(() => e.classList.remove('flash'), 3600); }); };
  U.tickFrame = function (dt) {
    bRun.classList.toggle('runlit', st.run); bRun.classList.toggle('stoplit', !st.run);
    chk.forEach((k, i) => { k.classList.toggle('lit', st.ch[i].on); });
    leds.forEach((l, i) => l.classList.toggle('on', ['auto', 'normal', 'single'][i] === st.trig.mode));
    bSingle.classList.toggle('lit', S.status === 'WAIT' && !st.run);
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
