/* scope.js — moteur d'oscilloscope numérique (sans interface).
   Modélise : chaîne verticale (sonde, couplage, bande passante, CAN 8 bits, bruit),
   déclenchement sur front, base de temps, profondeur mémoire, modes d'acquisition. */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};
const TAU = 2 * Math.PI;
const NCOL = 1200;                       /* colonnes d'affichage (100 par division horizontale) */

OL.Scope = function (profile, bench) {
  const P = profile, S = this;
  S.P = P; S.bench = bench || { ch: [] };
  S.rand = OL.rng(12345);
  S.simT = 0.37;                         /* horloge simulée (s) */
  S.status = 'AUTO';                     /* AUTO, TRIG'D, WAIT, STOP, ROLL */
  S.version = 0; S.log = { autoset: 0, coup: {}, sawWait: false, single: false };                         /* incrémenté à chaque nouvelle acquisition */
  S.rec = null;
  S.defaultSetup();
  /* câblage par défaut : voies vides, hors-sonde x10, trimmer au milieu */
  for (let i = 0; i < P.nch; i++) if (!S.bench.ch[i]) S.bench.ch[i] = { node: null, sw: 10, trim: 0.5, ground: true };
  if (!S.bench.mism) S.bench.mism = [1.25, 0.85, 1.12, 0.9];
};
const SP = OL.Scope.prototype;

SP.defaultSetup = function () {
  const P = this.P;
  this.st = {
    run: true, single: false,
    tdivIdx: OL.nearest(P.tdivs, 1e-3), hdelay: 0,
    ch: [], acq: 'sample', avgN: 16, dots: false, persist: 0, xy: false,
    trig: { src: 0, slope: 'rise', level: 0, mode: 'auto', coup: 'dc', holdoff: 100e-9, sweepForce: false },
    math: { on: false, op: 'a-b' }, xyPair: [0, 1], mem: 'auto', roll: false, measure: [], cursors: { mode: 'off', x: [-2, 2], y: [-2, 2], src: 0 }, sel: 0
  };
  for (let i = 0; i < P.nch; i++) this.st.ch.push({
    on: i === 0, vIdx: OL.nearest(P.vdivs, 1), pos: 0, coup: 'dc', probe: 10, inv: false, bw20: false });
  this.avgBuf = null; this.rec = null;
};

/* ----- accesseurs ----- */
SP.tdiv = function () { return this.P.tdivs[this.st.tdivIdx]; };
SP.window = function () { return this.tdiv() * this.P.hdiv; };
SP.baseV = function (i) { const c = this.st.ch[i]; return this.P.vdivs[c.vIdx] * (1 + 0.02 * (c.fk || 0)); };
SP.fineStep = function (i, n) { const c = this.st.ch[i], v = this.P.vdivs, cap = Math.max(1, Math.floor((v[Math.min(c.vIdx + 1, v.length - 1)] / v[c.vIdx] - 1) / 0.02) - 1); c.fk = (c.fk || 0) + n; if (c.fk > cap) { if (c.vIdx < v.length - 1) { c.vIdx++; c.fk = 0; } else c.fk = cap; } if (c.fk < 0) { if (c.vIdx > 0) { c.vIdx--; c.fk = Math.max(0, Math.floor((v[c.vIdx + 1] / v[c.vIdx] - 1) / 0.02) - 1); } else c.fk = 0; } };
SP.trigCh = function () { const s = this.st.trig.src; return s === 'line' ? 0 : s; };           /* V/div à l'entrée */
SP.vdivLabel = function (i) { return this.baseV(i) * this.st.ch[i].probe; };   /* V/div affiché */
SP.nOn = function () { return this.st.ch.filter(c => c.on).length; };
SP.sampleRate = function () {
  const P = this.P, w = this.window();
  const srmax = P.sr(Math.max(1, this.nOn()));
  return Math.min(srmax, this.depthNow() / w);
};
SP.depthNow = function () {
  const P = this.P; if (!P.memOpts) return P.depth; const o = P.memOpts(Math.max(1, this.nOn())), m = this.st.mem;
  return !m || m === 'auto' ? (this.nOn() >= 2 ? Math.min(3e6, o[o.length - 1]) : o[o.length - 1]) : (o.indexOf(m) >= 0 ? m : o[o.length - 1]);
};
SP.isRoll = function () { return this.P.id === 'rigol' ? (!!this.st.roll && this.tdiv() >= 0.2 && !this.st.xy) : (this.tdiv() >= this.P.rollFrom && !this.st.xy); };

/* ----- chaîne verticale ----- */
function lpStep(state, x, dt, tau) { const a = 1 - Math.exp(-dt / tau); return state + a * (x - state); }
const dcCache = new Map();
SP.dcMean = function (src, nodeKey) {
  const f = (src.fhint ? src.fhint() : 1e3) || 1e3, T = 1 / f, key = src.kind + nodeKey + JSON.stringify(Object.assign({}, src, { nodes: 0 }), (k, v) => typeof v === 'function' ? 0 : v);
  if (dcCache.has(key)) return dcCache.get(key);
  const fn = src.nodes[nodeKey].fn, N = 4000, span = Math.max(T * 20, 1e-6); let s = 0;
  for (let i = 0; i < N; i++) s += fn(i * span / N + 0.001234);
  const m = s / N; dcCache.set(key, m); if (dcCache.size > 200) dcCache.clear(); return m;
};
SP.nodeOf = function (i) {
  const c = this.bench.ch[i]; if (!c || !c.node) return null;
  const src = c.node.src; return src && src.nodes[c.node.key] ? { src, key: c.node.key, fn: src.nodes[c.node.key].fn } : null;
};
/* Retourne les tensions À L'ENTRÉE de l'oscilloscope (après sonde/couplage/BW), pour les temps ts. */
SP.front = function (i, ts, ntot) {
  const P = this.P, c = this.st.ch[i], b = this.bench.ch[i], nd = this.nodeOf(i), N = ts.length;
  const y = new Float64Array(N);
  if (c.coup === 'gnd') return y;
  if (nd) {
    const x = new Float64Array(N); for (let k = 0; k < N; k++) x[k] = nd.fn(ts[k]);
    let mean = 0; if (c.coup === 'ac') mean = this.dcMean(nd.src, nd.key);
    /* sonde */
    const x10 = b.sw === 10;
    const rho = (this.bench.mism[i] || 1) * (0.6 + 0.8 * b.trim);       /* rapport tau1/tau2 : 1 = compensée */
    const tau2 = 20e-6, tauP = 1 / (TAU * (x10 ? 100e6 : P.bwProbeX1));
    const tauF = 1 / (TAU * P.bw), tauB = 1 / (TAU * 20e6);
    let s1 = x[0], s2 = x[0], s3 = x[0], s4 = x[0];
    for (let k = 0; k < N; k++) {
      const dt = k ? ts[k] - ts[k - 1] : 1e-12;
      let v = x[k] - mean;
      if (x10) { s1 = lpStep(s1, v, dt, tau2); v = 0.1 * (v + (rho - 1) * (v - s1)); }
      s2 = lpStep(s2, v, dt, tauP); v = s2;
      if (c.bw20) { s3 = lpStep(s3, v, dt, tauB); v = s3; }
      s4 = lpStep(s4, v, dt, tauF); y[k] = s4;
    }
    if (b.ground === false) for (let k = 0; k < N; k++) y[k] += 0.35 * Math.sin(TAU * 50 * ts[k] + 1) * (x10 ? 0.1 : 1) + 0.12 * Math.sin(TAU * 150 * ts[k]);
  }
  return y;
};
/* construit une grille de temps : préfixe grossier (mise en régime des filtres) + grille fine */
function timeGrid(t0, dt, N, pre) {
  const m = pre > 0 ? Math.min(400, Math.ceil(pre / Math.max(dt, pre / 300))) : 0, step = m ? pre / m : 0, ts = new Float64Array(m + N);
  for (let k = 0; k < m; k++) ts[k] = t0 - pre + k * step;
  for (let k = 0; k < N; k++) ts[m + k] = t0 + k * dt;
  return { ts, m };
}
SP.preTime = function (i) { const b = this.bench.ch[i]; return (b.sw === 10 ? 20e-6 * 8 : 0) + 3e-6; };

/* ----- bruit d'entrée : proportionnel à la racine de la bande passante réellement utilisée ----- */
SP.noiseSigma = function (i, forTrigger) {
  const nd = this.nodeOf(i); if (!nd || !nd.src.noiseRms) return 0;
  const b = this.bench.ch[i], c = this.st.ch[i], x10 = b.sw === 10, att = x10 ? 0.1 : 1;
  let bw = Math.min(this.P.bw, x10 ? 100e6 : this.P.bwProbeX1); if (c.bw20 && !forTrigger) bw = Math.min(bw, 20e6);
  return nd.src.noiseRms * att * Math.sqrt(bw / 100e6);
};
/* ----- déclenchement ----- */
SP.trigSignal = function (ts, shift) {
  const t = this.st.trig, i = t.src; let y = this.front(i, ts);
  const c = this.st.ch[i], k = c.probe;
  let out = y;
  const sg = this.noiseSigma(i, true) * (t.coup === 'hf' ? 0.12 : 1);
  if (sg > 0) { out = new Float64Array(y.length); for (let k = 0; k < y.length; k++) out[k] = y[k] + OL.gauss(this.rand) * sg; y = out; }
  if (t.coup === 'ac') { /* passe-haut ~ 10 Hz : retrait de la moyenne locale */
    const nd = this.nodeOf(i); if (nd) { const m = this.dcMean(nd.src, nd.key) * (this.bench.ch[i].sw === 10 ? 0.1 : 1); out = y.map(v => v - m); }
  }
  return out;
};
SP.findTrigger = function (tStart, span) {
  const st = this.st, t = st.trig, i = t.src;
  if (i === 'line') {                       /* synchronisation sur le secteur 50 Hz (passage par zéro) */
    const T = 0.02, up = Math.ceil(tStart / T) * T, dn = Math.ceil((tStart - T / 2) / T) * T + T / 2;
    return t.slope === 'fall' ? dn : t.slope === 'both' ? Math.min(up, dn) : up;
  }
  const nd = this.nodeOf(i);
  if (!nd || !st.ch[i].on && false) return null;
  const f = nd.src.fhint ? nd.src.fhint() : 1e3;
  const dt = Math.max(1e-9, Math.min(1 / (60 * f), this.window() / 1500, span / 20));
  const level = t.level / this.st.ch[i].probe;   /* niveau ramené à l'entrée */
  const hy = 0.1 * this.baseV(i);                 /* sensibilité du déclenchement : 0,1 carreau */
  const pre = this.preTime(i), block = 4096;
  let tt = tStart, prev = null, last = -Infinity, scanned = 0, maxSteps = 300000, armUp = false, armDn = false;
  const hold = Math.max(t.holdoff, 0);
  while (scanned < span && maxSteps > 0) {
    const g = timeGrid(tt, dt, block, scanned === 0 ? pre : 0), y = this.trigSignal(g.ts);
    const base = g.m;
    for (let k = base; k < y.length; k++) {
      const v = y[k];
      if (v < level - hy) armUp = true; if (v > level + hy) armDn = true;      /* hystérésis du comparateur : le signal doit d'abord s'éloigner du niveau */
      if (prev !== null) {
        const up = armUp && prev < level && v >= level, dn = armDn && prev > level && v <= level;
        const hit = (t.slope === 'rise' && up) || (t.slope === 'fall' && dn) || (t.slope === 'both' && (up || dn));
        if (hit) {
          if (up) armUp = false; if (dn) armDn = false;
          const tc = g.ts[k - 1] + (level - prev) / (v - prev) * (g.ts[k] - g.ts[k - 1]);
          if (tc - last >= hold && tc > tStart + 0) return tc;
          /* sinon : dans le temps mort, on ignore */
        }
      }
      prev = v;
    }
    tt += block * dt; scanned += block * dt; maxSteps -= block;
  }
  return null;
};

/* ----- acquisition ----- */
SP.acquire = function (tLeft) {
  const st = this.st, P = this.P, w = this.window();
  const sr = this.sampleRate(), n = Math.max(2, Math.round(w * sr));
  const peak = st.acq === 'peak' && n > 2 * 0 ;
  const N = Math.min(NCOL * 2, n), dt = w / (N - (N === n ? 0 : 0)) ;
  const rec = { t0: tLeft, dt: w / N, n: N, w, ch: [], pk: null, sr, n_real: n };
  for (let i = 0; i < P.nch; i++) {
    const c = st.ch[i]; if (!c.on && !(st.trig.src === i)) { rec.ch.push(null); continue; }
    const pre = this.preTime(i);
    /* peak detect : on suréchantillonne 8x puis on garde min/max par point d'écran */
    const F = (st.acq === 'peak' && n > N) ? Math.max(8, Math.min(64, Math.ceil(rec.dt / 0.5e-6))) : (st.acq === 'hires' && n > N ? 8 : 1);
    const g = timeGrid(tLeft, rec.dt / F, N * F, pre), y = this.front(i, g.ts);
    const out = new Float64Array(N), pkm = st.acq === 'peak', mn = F > 1 && pkm ? new Float64Array(N) : null, mx = F > 1 && pkm ? new Float64Array(N) : null;
    const vk = this.baseV(i), sx = this.noiseSigma(i, false), noiseV = Math.sqrt(Math.pow(0.0004 + vk * 0.003, 2) + sx * sx);
    for (let j = 0; j < N; j++) {
      if (F === 1) out[j] = y[g.m + j] + OL.gauss(this.rand) * noiseV;
      else if (!pkm) { let s = 0; for (let q = 0; q < F; q++) s += y[g.m + j * F + q] + OL.gauss(this.rand) * noiseV; out[j] = s / F; }
      else {
        let a = Infinity, b = -Infinity;
        for (let q = 0; q < F; q++) { const v = y[g.m + j * F + q] + OL.gauss(this.rand) * noiseV; if (v < a) a = v; if (v > b) b = v; }
        mn[j] = a; mx[j] = b; out[j] = 0.5 * (a + b);
      }
    }
    if (st.acq === 'avg') {
      const key = i + '|' + N + '|' + st.avgN;
      if (!this.avgBuf || this.avgBuf.key !== key || this.avgBuf.reset) this.avgBuf = Object.assign(this.avgBuf && this.avgBuf.key === key ? this.avgBuf : {}, { key, n: 0, d: {}, reset: false });
      const A = this.avgBuf.d[i] || (this.avgBuf.d[i] = new Float64Array(N));
      const k = Math.min(this.avgBuf.n, st.avgN - 1);
      for (let j = 0; j < N; j++) A[j] = k ? (A[j] * k + out[j]) / (k + 1) : out[j];
      if (i === Math.max(0, st.ch.findIndex(c => c.on))) this.avgBuf.n++;
      for (let j = 0; j < N; j++) out[j] = A[j];
    }
    rec.ch.push(out); if (mn) { rec.pk = rec.pk || []; rec.pk[i] = { mn, mx }; }
  }
  this.rec = rec; this.version++;
  return rec;
};

/* tick : avance l'horloge simulée de dtReal secondes ; fait une acquisition si en marche */
SP.tick = function (dtReal) {
  const st = this.st; this.simT += dtReal;
  if (!st.run) { this.status = 'STOP'; this.scanEnd = Math.max(this.scanEnd || 0, this.simT); return false; }
  const w = this.window();
  if (this.isRoll()) {                    /* mode ROLL : défilement sans déclenchement */
    this.status = 'ROLL'; this.scanEnd = this.simT; this.acquire(this.simT - w); return true;
  }
  const t = st.trig, nd = t.src === 'line' ? true : this.nodeOf(t.src);
  const span = Math.max(0.05, w * 1.5);
  const start = Math.max(this.scanEnd || this.simT, this.simT - 2);   /* le balayage de déclenchement est continu */
  const tt = nd ? this.findTrigger(start, span) : null;
  if (tt !== null) {
    this.status = "TRIG'D"; this.lastTrig = tt; this.scanEnd = tt + Math.max(t.holdoff, 1e-4, w / 2 + Math.max(0, st.hdelay)); this.simT = Math.max(this.simT, this.scanEnd);
    this.acquire(tt + st.hdelay - w / 2);
    if (st.single) { st.run = false; st.single = false; this.status = 'STOP'; this.log.single = true; }
    return true;
  }
  this.scanEnd = start + span; this.simT = Math.max(this.simT, this.scanEnd);
  if (t.mode === 'auto') {                /* pas de déclenchement : balayage libre (non synchronisé) */
    this.status = 'AUTO'; this.lastTrig = null; this.acquire(this.simT + this.rand() * 1e-3); return true;
  }
  this.status = 'WAIT'; this.log.sawWait = true; return false;       /* Normal / Single : on garde l'ancien tracé */
};
/* compteur de fréquence matériel : fréquence du signal de déclenchement si l'appareil est déclenché */
SP.counterFreq = function () {
  const nd = this.st.trig.src === 'line' ? null : this.nodeOf(this.st.trig.src); if (!nd || this.status !== "TRIG'D" && this.status !== 'STOP') return null;
  if (!this.lastTrig) return null; const f = nd.src.fhint ? nd.src.fhint() : null; if (!f) return null;
  const nodeKey = nd.key; if (nd.src.kind === 'bridge' && nodeKey === 'out') return f * (nd.src.full ? 2 : 1);
  return f;
};
SP.force = function () { this.acquire(this.simT + this.rand() * 1e-3); this.status = 'FORCE'; if (this.st.single) { this.st.run = false; this.st.single = false; this.status = 'STOP'; } };
SP.arm = function () { this.st.run = true; this.st.single = true; this.status = 'WAIT'; };
SP.resetAvg = function () { if (this.avgBuf) this.avgBuf.reset = true; };

/* ----- affichage : conversion en divisions (haut = positif) ----- */
SP.sampleRec = function (arr, rec, t) {
  let x = (t - rec.t0) / rec.dt; if (x < -0.5 || x > rec.n - 0.5) return NaN; x = Math.max(0, Math.min(rec.n - 1, x));
  const i = Math.floor(x), f = x - i, a = arr[i], b = arr[Math.min(i + 1, rec.n - 1)];
  return a + (b - a) * f;
};
/* retourne, pour la voie i, Float64Array(NCOL) en VOLTS affichés (tension × facteur de sonde, avant position) ou null */
SP.volts = function (i) {
  const rec = this.rec; if (!rec || !rec.ch[i]) return null;
  const st = this.st, c = st.ch[i], k = c.probe * (c.inv ? -1 : 1), w = this.window();
  const left = this.screenLeft();
  const out = new Float64Array(NCOL), arr = rec.ch[i];
  for (let j = 0; j < NCOL; j++) out[j] = this.sampleRec(arr, rec, left + (j + 0.5) / NCOL * w) * k;
  return out;
};
SP.screenLeft = function () { return this.rec ? (this.rec.t0 + (this.rec.keepLeft || 0)) : 0; };
/* divisions à l'écran, avec position, quantification 8 bits, écrêtage */
SP.divs = function (i) {
  const v = this.volts(i); if (!v) return null;
  const st = this.st, c = st.ch[i], lab = Math.abs(this.vdivLabel(i)), out = new Float64Array(NCOL);
  for (let j = 0; j < NCOL; j++) {
    let d = v[j] / lab + c.pos;
    if (isNaN(d)) { out[j] = NaN; continue; }
    d = Math.max(-4.2, Math.min(4.2, d));
    out[j] = Math.round(d * 32) / 32;
  }
  return out;
};
SP.peakDivs = function (i) {
  const rec = this.rec; if (!rec || !rec.pk || !rec.pk[i]) return null;
  const c = this.st.ch[i], lab = Math.abs(this.vdivLabel(i)), k = c.probe * (c.inv ? -1 : 1), w = this.window(), left = this.screenLeft();
  const lo = new Float64Array(NCOL), hi = new Float64Array(NCOL);
  for (let j = 0; j < NCOL; j++) {
    const t = left + (j + 0.5) / NCOL * w, a = this.sampleRec(rec.pk[i].mn, rec, t) * k / lab + c.pos, b = this.sampleRec(rec.pk[i].mx, rec, t) * k / lab + c.pos;
    lo[j] = Math.min(a, b); hi[j] = Math.max(a, b);
  }
  return { lo, hi };
};
})(typeof window !== 'undefined' ? window : globalThis);
