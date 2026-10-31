/* signals.js — sources de signaux : générateur de fonctions et montages.
   Chaque source expose des NOEUDS : source.nodes = { nom: {label, fn(t)->volts} }.
   Les valeurs sont des fonctions pures du temps absolu t (s). */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};
const TAU = 2 * Math.PI;

/* ---------- formes d'onde élémentaires, phase p dans [0,1[ ---------- */
const wave = {
  sine: p => Math.sin(TAU * p),
  square: (p, d) => (p < d ? 1 : -1),
  triangle: p => (p < 0.5 ? 4 * p - 1 : 3 - 4 * p),
  ramp: (p, d) => { d = d || 0.5; return p < d ? -1 + 2 * p / d : 1 - 2 * (p - d) / (1 - d); },
  pulse: (p, d) => (p < d ? 1 : -1)
};
OL.wave = wave;

/* ---------- Générateur de fonctions (GBF) ---------- */
OL.FuncGen = function (o) {
  const s = Object.assign({ label: 'GBF', shape: 'sine', freq: 1000, amp: 2, offset: 0, duty: 0.5, phase: 0, on: true }, o);
  s.kind = 'funcgen'; s.name = 'Générateur de fonctions';
  const f = t => {
    if (!s.on) return 0;
    let p = (t * s.freq + s.phase / 360) % 1; if (p < 0) p += 1;
    const w = s.shape === 'triangle' ? wave.triangle(p) : s.shape === 'ramp' ? wave.ramp(p, s.duty) : s.shape === 'sine' ? wave.sine(p) : wave.square(p, s.duty);
    return s.offset + 0.5 * s.amp * w;          /* amp = crête à crête */
  };
  s.nodes = { out: { label: 'Sortie GBF', fn: f } };
  s.fhint = () => s.freq;
  return s;
};

/* ---------- Sortie de compensation de sonde (carré 1 kHz) ---------- */
OL.ProbeComp = function (vpp) {
  const s = { kind: 'probecomp', name: 'Sortie de compensation', vpp: vpp || 5, freq: 1000 };
  s.nodes = { out: { label: 'COMP', fn: t => { const p = (t * s.freq) % 1; return p < 0.5 ? s.vpp : 0; } } };
  s.fhint = () => s.freq;
  return s;
};

/* ---------- Pont de diodes : secondaire du transfo -> redressé (+ filtrage éventuel) ---------- */
OL.Bridge = function (o) {
  const s = Object.assign({ kind: 'bridge', name: 'Pont de diodes', veff: 9, freq: 50, vd: 0.7, C: 0, R: 1000, full: true }, o);
  const vm = () => s.veff * Math.SQRT2;
  const sec = t => vm() * Math.sin(TAU * s.freq * t);
  /* sortie : sans condensateur -> |sec| - 2Vd ; avec C -> simulation numérique par pas (cache) */
  const raw = t => { const v = (s.full ? Math.abs(sec(t)) : Math.max(0, sec(t))) - (s.full ? 2 : 1) * s.vd; return Math.max(0, v); };
  let cache = null;
  function build() {
    const T = 1 / s.freq, dt = T / 400, N = Math.round(8 * T / dt) ;
    /* régime établi : on simule 8 périodes et on garde la dernière */
    let vc = 0; const tab = new Float64Array(400);
    const tauD = Math.max(s.R * s.C, 1e-9);
    for (let n = 0; n < N + 400; n++) {
      const t = n * dt, src = raw(t);
      if (src > vc) vc = src; else vc *= Math.exp(-dt / tauD);   /* décharge exponentielle dans R */
      if (n >= N) tab[n - N] = vc;
    }
    cache = { key: [s.veff, s.freq, s.vd, s.C, s.R, s.full].join('|'), tab, T };
  }
  const out = t => {
    if (!(s.C > 0)) return raw(t);
    const key = [s.veff, s.freq, s.vd, s.C, s.R, s.full].join('|');
    if (!cache || cache.key !== key) build();
    let p = (t / cache.T) % 1; if (p < 0) p += 1;
    const x = p * 400, i = Math.floor(x) % 400, j = (i + 1) % 400, fr = x - Math.floor(x);
    return cache.tab[i] * (1 - fr) + cache.tab[j] * fr;
  };
  s.nodes = { sec: { label: 'Secondaire', fn: sec }, out: { label: 'Sortie pont', fn: out } };
  s.fhint = () => s.freq;
  return s;
};

/* ---------- NE555 astable ---------- */
OL.NE555 = function (o) {
  const s = Object.assign({ kind: 'ne555', name: 'NE555 astable', vcc: 9, R1: 1000, R2: 10000, C: 100e-9 }, o);
  const th = () => 0.693 * (s.R1 + s.R2) * s.C, tl = () => 0.693 * s.R2 * s.C;
  s.freq = () => 1 / (th() + tl());
  s.duty = () => th() / (th() + tl());
  const ph = t => { const T = th() + tl(); let x = t % T; if (x < 0) x += T; return x; };
  /* condensateur : monte de Vcc/3 à 2Vcc/3 (charge R1+R2), descend (R2) */
  const vc = t => {
    const x = ph(t), a = s.vcc / 3, b = 2 * s.vcc / 3, V = s.vcc;
    if (x < th()) return V - (V - a) * Math.exp(-x / ((s.R1 + s.R2) * s.C));
    return b * Math.exp(-(x - th()) / (s.R2 * s.C));
  };
  /* la charge réelle va de Vcc/3 à 2Vcc/3 : on ajuste les constantes pour que les seuils soient exacts */
  const vcExact = t => {
    const x = ph(t), a = s.vcc / 3, b = 2 * s.vcc / 3, V = s.vcc;
    if (x < th()) return V - (V - a) * Math.exp(-x / ((s.R1 + s.R2) * s.C));
    return b * Math.exp(-(x - th()) / (s.R2 * s.C));
  };
  s.nodes = {
    out: { label: 'Sortie (broche 3)', fn: t => (ph(t) < th() ? s.vcc - 1.7 : 0.1) },
    cap: { label: 'Condensateur (broches 2-6)', fn: vcExact }
  };
  s.fhint = () => s.freq();
  return s;
};

/* ---------- Charge / décharge d'un condensateur (RC), générateur carré 0/E ---------- */
OL.RCStep = function (o) {
  const s = Object.assign({ kind: 'rcstep', name: 'RC : charge / décharge', E: 5, R: 10000, C: 100e-9, freq: 100 }, o);
  const e = t => { const p = (t * s.freq) % 1; return (p < 0 ? p + 1 : p) < 0.5 ? s.E : 0; };
  const vc = t => {
    /* régime établi, signal carré 0/E de rapport cyclique 1/2 */
    const T = 1 / s.freq, th = T / 2, tau = s.R * s.C, k = Math.exp(-th / tau);
    const vhi = s.E * (1 - k) / (1 - k * k), vlo = vhi * k;   /* valeur max atteinte / valeur min */
    let x = t % T; if (x < 0) x += T;
    return x < th ? s.E - (s.E - vlo) * Math.exp(-x / tau) : vhi * Math.exp(-(x - th) / tau);
  };
  s.tau = () => s.R * s.C;
  s.nodes = { in: { label: 'Entrée E', fn: e }, vc: { label: 'Tension Uc', fn: vc } };
  s.fhint = () => s.freq;
  return s;
};

/* ---------- Filtre RC passe-bas / passe-haut (déphasage) ---------- */
OL.RCFilter = function (o) {
  const s = Object.assign({ kind: 'rcfilter', name: 'Filtre RC', type: 'low', R: 1000, C: 100e-9, freq: 1000, amp: 4, shape: 'sine' }, o);
  s.fc = () => 1 / (TAU * s.R * s.C);
  const H = () => { const x = TAU * s.freq * s.R * s.C; return s.type === 'low' ? { g: 1 / Math.sqrt(1 + x * x), ph: -Math.atan(x) } : { g: x / Math.sqrt(1 + x * x), ph: Math.PI / 2 - Math.atan(x) }; };
  s.gain = () => H().g; s.phaseDeg = () => H().ph * 180 / Math.PI;
  const vin = t => 0.5 * s.amp * Math.sin(TAU * s.freq * t);
  const vout = t => 0.5 * s.amp * H().g * Math.sin(TAU * s.freq * t + H().ph);
  s.nodes = { in: { label: 'Entrée Ve', fn: vin }, out: { label: 'Sortie Vs', fn: vout } };
  s.fhint = () => s.freq;
  return s;
};

/* ---------- Tension continue (pile, alimentation) avec ondulation optionnelle ---------- */
OL.DCSource = function (o) {
  const s = Object.assign({ kind: 'dc', name: 'Alimentation continue', v: 5, ripple: 0, rfreq: 100 }, o);
  s.nodes = { out: { label: 'Sortie', fn: t => s.v + 0.5 * s.ripple * Math.sin(TAU * s.rfreq * t) } };
  s.fhint = () => s.rfreq;
  return s;
};
/* ---------- Bouton poussoir (avec ou sans rebonds), niveau 0 -> E ---------- */
OL.PushButton = function (o) {
  const s = Object.assign({ kind: 'push', name: 'Bouton poussoir', E: 5, bounce: true, tev: null, pat: [], tstable: 0 }, o);
  s.press = function (t) {
    s.tev = t; const r = OL.rng(Math.floor(t * 1e6) % 100000 + 7);
    s.pat = []; let x = 0;
    if (s.bounce) { const n = 3 + Math.floor(r() * 4); for (let i = 0; i < n; i++) { const d = (0.05 + r() * 0.35) * 1e-3, gap = (0.05 + r() * 0.25) * 1e-3; s.pat.push([x, x + d]); x += d + gap; } }
    s.tstable = x;
  };
  s.release = function () { s.tev = null; s.pat = []; };
  s.nodes = { out: { label: 'Sortie du bouton', fn: t => {
    if (s.tev === null || t < s.tev) return 0; const x = t - s.tev;
    if (!s.bounce || x >= s.tstable) return s.E;
    for (const p of s.pat) if (x >= p[0] && x < p[1]) return s.E; return 0; } } };
  s.fhint = () => 1;
  return s;
};
/* ---------- Signal bruité : sinus + bruit large bande (+ ronflement 50 Hz éventuel) ----------
   noise = valeur efficace du bruit pour une bande passante de 100 MHz (le bruit diminue avec la bande passante utilisée) */
OL.NoisySignal = function (o) {
  const s = Object.assign({ kind: 'noisy', name: 'Capteur bruité', freq: 10000, amp: 0.2, offset: 0, noise: 0.012, hum: 0 }, o);
  s.noiseRms = s.noise;
  s.nodes = { out: { label: 'Sortie du capteur (bruitée)', fn: t => s.offset + 0.5 * s.amp * Math.sin(TAU * s.freq * t) + s.hum * Math.sin(TAU * 50 * t) } };
  s.fhint = () => s.freq;
  Object.defineProperty(s, 'noiseRms', { get: () => s.noise });
  return s;
};
})(typeof window !== 'undefined' ? window : globalThis);
