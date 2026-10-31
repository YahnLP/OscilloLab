/* measure.js — mesures automatiques calculées sur les données affichées (comme sur les vrais appareils) */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};

function histLevels(y) {
  let mn = Infinity, mx = -Infinity;
  for (const v of y) { if (v < mn) mn = v; if (v > mx) mx = v; }
  if (!(mx > mn)) return { top: mx, base: mn, mn, mx };
  const B = 128, h = new Float64Array(B), w = (mx - mn) / B;
  for (const v of y) h[Math.min(B - 1, Math.floor((v - mn) / w))]++;
  const half = B >> 1; let ib = 0, it = half;
  for (let i = 0; i < half; i++) if (h[i] > h[ib]) ib = i;
  for (let i = half; i < B; i++) if (h[i] > h[it]) it = i;
  return { top: mn + (it + 0.5) * w, base: mn + (ib + 0.5) * w, mn, mx };
}
/* franchissements d'un seuil (indices fractionnaires) */
function crossings(y, lvl) {
  const up = [], dn = [];
  for (let i = 1; i < y.length; i++) { const a = y[i - 1], b = y[i];
    if (a < lvl && b >= lvl) up.push(i - 1 + (lvl - a) / (b - a)); else if (a > lvl && b <= lvl) dn.push(i - 1 + (lvl - a) / (b - a)); }
  return { up, dn };
}
const firstAfter = (arr, x) => { for (const v of arr) if (v > x) return v; return null; };

/* y : Float64Array en volts ; dt : durée d'une colonne ; origin : indice de la colonne du point de déclenchement */
OL.measure = function (y, dt, origin) {
  const r = {};
  if (!y.length) return r;
  if (y.some(isNaN)) { const yy = Array.from(y).filter(v => !isNaN(v)); if (!yy.length) return r; y = Float64Array.from(yy); }
  const L = histLevels(y), amp = L.top - L.base; let s = 0, s2 = 0, imax = 0, imin = 0;
  y.forEach((v, i) => { s += v; s2 += v * v; if (v > y[imax]) imax = i; if (v < y[imin]) imin = i; });
  const n = y.length; r.max = L.mx; r.min = L.mn; r.pp = L.mx - L.mn; r.avg = s / n; r.rms = Math.sqrt(s2 / n);
  r.top = L.top; r.base = L.base; r.amp = amp; r.area = s * dt; r.variance = s2 / n - (s / n) * (s / n);
  r.upper = L.base + 0.9 * amp; r.mid = L.base + 0.5 * amp; r.lower = L.base + 0.1 * amp;
  const o = origin === undefined ? n / 2 : origin; r.tvmax = (imax - o) * dt; r.tvmin = (imin - o) * dt;
  r.over = amp > 0 ? (L.mx - L.top) / amp * 100 : null; r.pre = amp > 0 ? (L.base - L.mn) / amp * 100 : null;
  ['period', 'freq', 'rise', 'fall', 'pwidth', 'nwidth', 'pduty', 'nduty', 'perrms', 'perarea', 'pslew', 'nslew', 'ppulses', 'npulses', 'pedges', 'nedges'].forEach(k => { r[k] = null; });
  if (amp > 0 && amp > 0.1 * r.pp) {
    const mid = r.mid, c = crossings(y, mid); r.pedges = c.up.length; r.nedges = c.dn.length;
    r.ppulses = c.up.filter(u => { const d = firstAfter(c.dn, u); return d !== null; }).length; r.npulses = c.dn.filter(d => { const u = firstAfter(c.up, d); return u !== null; }).length;
    if (c.up.length >= 2) {
      const T = (c.up[1] - c.up[0]) * dt; r.period = T; r.freq = 1 / T;
      const a = Math.round(c.up[0]), b = Math.round(c.up[1]); let ss = 0, sq = 0, m = 0; for (let i = a; i < b; i++) { ss += y[i]; sq += y[i] * y[i]; m++; }
      if (m) { r.perrms = Math.sqrt(sq / m); r.perarea = ss * dt; }
      const dn = firstAfter(c.dn, c.up[0]); if (dn !== null && dn < c.up[1]) { r.pwidth = (dn - c.up[0]) * dt; r.nwidth = T - r.pwidth; r.pduty = r.pwidth / T * 100; r.nduty = 100 - r.pduty; }
    } else if (c.dn.length >= 2) { const T = (c.dn[1] - c.dn[0]) * dt; r.period = T; r.freq = 1 / T; }
    const c10 = crossings(y, r.lower), c90 = crossings(y, r.upper);
    for (const t10 of c10.up) { const t90 = firstAfter(c90.up, t10); if (t90 !== null && !c10.up.some(v => v > t10 && v < t90)) { r.rise = (t90 - t10) * dt; r.pslew = (r.upper - r.lower) / r.rise; break; } }
    for (const t90 of c90.dn) { const t10 = firstAfter(c10.dn, t90); if (t10 !== null && !c90.dn.some(v => v > t90 && v < t10)) { r.fall = (t10 - t90) * dt; r.nslew = -(r.upper - r.lower) / r.fall; break; } }
  }
  r.levels = L; return r;
};

/* Retard entre deux voies, au niveau 50 % : fronts montants ('up') ou descendants ('dn'). Négatif si B avant A. */
OL.delayAB = function (ya, yb, dt, edge) {
  edge = edge || 'up'; const la = histLevels(ya), lb = histLevels(yb);
  if (!(la.top - la.base > 0.1 * (la.mx - la.mn)) || !(lb.top - lb.base > 0.1 * (lb.mx - lb.mn))) return null;
  const ca = crossings(ya, (la.top + la.base) / 2)[edge], cb = crossings(yb, (lb.top + lb.base) / 2)[edge];
  if (!ca.length || !cb.length) return null;
  const a0 = ca[0], T = ca.length > 1 ? ca[1] - ca[0] : null; let best = null;
  for (const b of cb) { const d = b - a0; if (best === null || Math.abs(d) < Math.abs(best)) best = d; }
  if (T && Math.abs(best) > T / 2) best -= Math.sign(best) * T;
  return best * dt;
};

/* Définition des mesures : n = nom OWON, r = nom RIGOL, u = unité */
const M = (n, r, u, v) => ({ n, r, u, v });
OL.MEAS = {
  max: M('Vmax', 'Vmax', 'V', r => r.max), min: M('Vmin', 'Vmin', 'V', r => r.min), pp: M('Vpp', 'Vpp', 'V', r => r.pp),
  top: M('Vtop', 'Vtop', 'V', r => r.top), base: M('Vbase', 'Vbase', 'V', r => r.base), amp: M('Vamp', 'Vamp', 'V', r => r.amp),
  upper: M('Vupper', 'Vupper', 'V', r => r.upper), mid: M('Vmid', 'Vmid', 'V', r => r.mid), lower: M('Vlower', 'Vlower', 'V', r => r.lower),
  avg: M('Vavg', 'Vavg', 'V', r => r.avg), rms: M('Vrms', 'Vrms', 'V', r => r.rms), perrms: M('Per.Vrms', 'Per.Vrms', 'V', r => r.perrms),
  over: M('Overshoot', 'Overshoot', '%', r => r.over), pre: M('Preshoot', 'Preshoot', '%', r => r.pre),
  area: M('Area', 'Area', 'Vs', r => r.area), perarea: M('Period Area', 'Period Area', 'Vs', r => r.perarea), variance: M('Variance', 'Variance', 'V²', r => r.variance),
  period: M('Period', 'Period', 's', r => r.period), freq: M('Freq', 'Freq', 'Hz', r => r.freq),
  rise: M('Rise time', 'Rise Time', 's', r => r.rise), fall: M('Fall time', 'Fall Time', 's', r => r.fall),
  pwidth: M('+Width', '+Width', 's', r => r.pwidth), nwidth: M('-Width', '-Width', 's', r => r.nwidth),
  pduty: M('+Duty', '+Duty', '%', r => r.pduty), nduty: M('-Duty', '-Duty', '%', r => r.nduty),
  tvmax: M('tVmax', 'tVmax', 's', r => r.tvmax), tvmin: M('tVmin', 'tVmin', 's', r => r.tvmin),
  pslew: M('+Slew Rate', '+Slew Rate', 'V/s', r => r.pslew), nslew: M('-Slew Rate', '-Slew Rate', 'V/s', r => r.nslew),
  ppulses: M('+Pulses', '+Pulses', '', r => r.ppulses), npulses: M('-Pulses', '-Pulses', '', r => r.npulses),
  pedges: M('+Edges', '+Edges', '', r => r.pedges), nedges: M('-Edges', '-Edges', '', r => r.nedges)
};
/* mesures entre deux voies */
OL.MEAS2 = { rdelay: 'RDelay', fdelay: 'FDelay', rphase: 'RPhase', fphase: 'FPhase', delay: 'Delay' };
/* listes proposées par chaque appareil (d'après leurs notices) */
OL.OWON_MEAS = ['pp', 'max', 'min', 'avg', 'rms', 'top', 'base', 'amp', 'over', 'pre', 'freq', 'period', 'rise', 'fall', 'pwidth', 'nwidth', 'pduty', 'nduty'];
OL.RIGOL_H = ['period', 'freq', 'rise', 'fall', 'pwidth', 'nwidth', 'pduty', 'nduty', 'tvmax', 'tvmin', 'pslew', 'nslew', 'ppulses', 'npulses', 'pedges', 'nedges'];
OL.RIGOL_V = ['max', 'min', 'pp', 'top', 'base', 'amp', 'upper', 'mid', 'lower', 'avg', 'rms', 'perrms', 'over', 'pre', 'area', 'perarea', 'variance'];
OL.fmtMeas = function (def, v) {
  if (v === null || v === undefined || !isFinite(v)) return '****';
  if (def.u === '%') return OL.fmtNum(v, 1) + '%'; if (def.u === '') return String(Math.round(v));
  return OL.fmt(v, def.u, 4);
};
})(typeof window !== 'undefined' ? window : globalThis);
