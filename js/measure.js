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
  const half = B >> 1;
  let ib = 0, it = half;
  for (let i = 0; i < half; i++) if (h[i] > h[ib]) ib = i;
  for (let i = half; i < B; i++) if (h[i] > h[it]) it = i;
  return { top: mn + (it + 0.5) * w, base: mn + (ib + 0.5) * w, mn, mx };
}
/* franchissements d'un seuil : retourne tableaux de temps (indices fractionnaires) montants/descendants */
function crossings(y, lvl) {
  const up = [], dn = [];
  for (let i = 1; i < y.length; i++) {
    const a = y[i - 1], b = y[i];
    if (a < lvl && b >= lvl) up.push(i - 1 + (lvl - a) / (b - a));
    else if (a > lvl && b <= lvl) dn.push(i - 1 + (lvl - a) / (b - a));
  }
  return { up, dn };
}
function firstAfter(arr, x) { for (const v of arr) if (v > x) return v; return null; }

/* y : Float64Array en volts ; dt : durée d'une colonne. Retourne un objet de mesures (null = "****"). */
OL.measure = function (y, dt) {
  const r = {}, N = y.length;
  if (!y.length || y.some(isNaN)) { const yy = Array.from(y).filter(v => !isNaN(v)); if (!yy.length) return r; y = Float64Array.from(yy); }
  const L = histLevels(y), amp = L.top - L.base;
  let s = 0, s2 = 0; for (const v of y) { s += v; s2 += v * v; }
  r.max = L.mx; r.min = L.mn; r.pp = L.mx - L.mn; r.avg = s / y.length; r.rms = Math.sqrt(s2 / y.length);
  r.top = L.top; r.base = L.base; r.amp = amp;
  r.over = amp > 0 ? (L.mx - L.top) / amp * 100 : null; r.pre = amp > 0 ? (L.base - L.mn) / amp * 100 : null;
  r.period = r.freq = r.rise = r.fall = r.pwidth = r.nwidth = r.pduty = r.nduty = r.cycAvg = r.cycRms = null;
  if (amp > 0 && amp > 0.1 * r.pp) {
    const mid = (L.top + L.base) / 2, c = crossings(y, mid);
    if (c.up.length >= 2) {
      const T = (c.up[1] - c.up[0]) * dt; r.period = T; r.freq = 1 / T;
      const a = Math.round(c.up[0]), b = Math.round(c.up[1]);   /* moyenne et efficace sur une période entière */
      let ss = 0, sq = 0, m = 0; for (let i = a; i < b; i++) { ss += y[i]; sq += y[i] * y[i]; m++; }
      if (m) { r.cycAvg = ss / m; r.cycRms = Math.sqrt(sq / m); }
      const dn = firstAfter(c.dn, c.up[0]); if (dn !== null && dn < c.up[1]) { r.pwidth = (dn - c.up[0]) * dt; r.nwidth = T - r.pwidth; r.pduty = r.pwidth / T * 100; r.nduty = 100 - r.pduty; }
    } else if (c.dn.length >= 2) { const T = (c.dn[1] - c.dn[0]) * dt; r.period = T; r.freq = 1 / T; }
    /* temps de montée 10-90 %, descente 90-10 % */
    const l10 = L.base + 0.1 * amp, l90 = L.base + 0.9 * amp, c10 = crossings(y, l10), c90 = crossings(y, l90);
    for (const t10 of c10.up) { const t90 = firstAfter(c90.up, t10); if (t90 !== null && (!c10.up.some(v => v > t10 && v < t90))) { r.rise = (t90 - t10) * dt; break; } }
    for (const t90 of c90.dn) { const t10 = firstAfter(c10.dn, t90); if (t10 !== null && (!c90.dn.some(v => v > t90 && v < t10))) { r.fall = (t10 - t90) * dt; break; } }
  }
  r.levels = L;
  return r;
};

/* Retard (délai) entre deux voies : A↑ -> B↑ au niveau 50 %. Retourne secondes (négatif si B avant A). */
OL.delayAB = function (ya, yb, dt) {
  const la = histLevels(ya), lb = histLevels(yb);
  if (!(la.top - la.base > 0.1 * (la.mx - la.mn)) || !(lb.top - lb.base > 0.1 * (lb.mx - lb.mn))) return null;
  const ca = crossings(ya, (la.top + la.base) / 2).up, cb = crossings(yb, (lb.top + lb.base) / 2).up;
  if (!ca.length || !cb.length) return null;
  const a0 = ca.length > 1 ? ca[0] : ca[0], T = ca.length > 1 ? ca[1] - ca[0] : null;
  /* plus proche front montant de B autour de A0, dans ±T/2 */
  let best = null;
  for (const b of cb) { const d = b - a0; if (best === null || Math.abs(d) < Math.abs(best)) best = d; }
  if (T && Math.abs(best) > T / 2) best -= Math.sign(best) * T;
  return best * dt;
};
})(typeof window !== 'undefined' ? window : globalThis);
(function (g) {
const OL = g.OL;
/* définition des mesures : n = nom OWON, r = nom RIGOL, u = unité */
OL.MEAS = {
  max: { n: 'Max', r: 'Vmax', u: 'V', v: r => r.max }, min: { n: 'Min', r: 'Vmin', u: 'V', v: r => r.min },
  pp: { n: 'Pk-Pk', r: 'Vpp', u: 'V', v: r => r.pp }, top: { n: 'Vtop', r: 'Vtop', u: 'V', v: r => r.top },
  base: { n: 'Vbase', r: 'Vbase', u: 'V', v: r => r.base }, amp: { n: 'Vamp', r: 'Vamp', u: 'V', v: r => r.amp },
  avg: { n: 'Mean', r: 'Vavg', u: 'V', v: r => r.avg }, rms: { n: 'Vrms', r: 'Vrms', u: 'V', v: r => r.rms },
  cycavg: { n: 'CMean', r: 'Cycle Vavg', u: 'V', v: r => r.cycAvg }, cycrms: { n: 'CRMS', r: 'Cycle Vrms', u: 'V', v: r => r.cycRms },
  over: { n: 'Overshoot', r: 'Overshoot', u: '%', v: r => r.over }, pre: { n: 'Preshoot', r: 'Preshoot', u: '%', v: r => r.pre },
  freq: { n: 'Freq', r: 'Freq', u: 'Hz', v: r => r.freq }, period: { n: 'Period', r: 'Period', u: 's', v: r => r.period },
  rise: { n: 'Rise', r: 'Rise Time', u: 's', v: r => r.rise }, fall: { n: 'Fall', r: 'Fall Time', u: 's', v: r => r.fall },
  pwidth: { n: '+Width', r: '+Width', u: 's', v: r => r.pwidth }, nwidth: { n: '-Width', r: '-Width', u: 's', v: r => r.nwidth },
  pduty: { n: '+Duty', r: '+Duty', u: '%', v: r => r.pduty }, nduty: { n: '-Duty', r: '-Duty', u: '%', v: r => r.nduty }
};
OL.fmtMeas = function (def, v) { return v === null || v === undefined || !isFinite(v) ? '****' : def.u === '%' ? OL.fmtNum(v, 1) + '%' : OL.fmt(v, def.u, 4); };
})(typeof window !== 'undefined' ? window : globalThis);
