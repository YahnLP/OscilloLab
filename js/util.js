/* util.js — outils communs (navigateur et Node) */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};

/* générateur pseudo-aléatoire reproductible (mulberry32) */
OL.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
OL.gauss = function (r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
OL.clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/* séquence 1-2-5 */
OL.seq125 = function (min, max) {
  const out = []; let dec = Math.pow(10, Math.floor(Math.log10(min)));
  while (dec <= max * 1.0001) { for (const m of [1, 2, 5]) { const v = m * dec; if (v >= min * 0.9999 && v <= max * 1.0001) out.push(+v.toPrecision(3)); } dec *= 10; }
  return out;
};

/* notation ingénieur française : 1,25 ms ; 2,00 V ; 500 µs */
OL.fmt = function (x, unit, digits) {
  if (x === null || x === undefined || !isFinite(x)) return '****';
  digits = digits || 3;
  if (x === 0) return '0 ' + unit;
  const a = Math.abs(x);
  const pre = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
  let p = pre[pre.length - 1];
  for (const q of pre) { if (a >= q[0] * 0.9999) { p = q; break; } }
  let v = x / p[0];
  let s = v.toPrecision(digits);
  if (s.indexOf('e') >= 0) s = String(+v.toFixed(2));
  return s.replace('.', ',') + ' ' + p[1] + unit;
};
OL.fmtNum = (x, d) => (x === null || !isFinite(x)) ? '****' : x.toFixed(d === undefined ? 2 : d).replace('.', ',');
OL.nearest = function (list, v) { let b = 0; for (let i = 1; i < list.length; i++) if (Math.abs(Math.log(list[i] / v)) < Math.abs(Math.log(list[b] / v))) b = i; return b; };
})(typeof window !== 'undefined' ? window : globalThis);
