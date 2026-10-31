/* meas_ui.js — liste des mesures affichées (commune aux deux appareils) */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};
/* m = { id, key, a, b? } ; retourne { label, val, ci } */
OL.measValue = function (S, m, dev) {
  const nm = k => (dev === 'rigol' ? OL.MEAS[k].r : OL.MEAS[k].n);
  const cn = S.P.chNames;
  if (OL.MEAS2[m.key]) {
    const a = S.volts(m.a), b = S.volts(m.b); const lab = (dev === 'rigol' ? OL.MEAS2[m.key] : 'Delay') + ' ' + cn[m.a] + '→' + cn[m.b] + (dev === 'rigol' ? '' : (m.key === 'fdelay' ? ' ↓' : ' ↑')); let val = '****';
    if (a && b) { const dt = S.window() / a.length, edge = (m.key === 'fdelay' || m.key === 'fphase') ? 'dn' : 'up', d = OL.delayAB(a, b, dt, edge), ma = OL.measure(a, dt);
      if (d !== null) val = (m.key === 'rphase' || m.key === 'fphase') ? (ma.period ? OL.fmtNum(d / ma.period * 360, 1) + '°' : '****') : OL.fmt(d, 's', 4); }
    return { label: lab, val, ci: m.a };
  }
  const v = S.volts(m.a); const r = v ? OL.measure(v, S.window() / v.length, v.length / 2 - S.st.hdelay / (S.window() / v.length)) : null; const def = OL.MEAS[m.key];
  return { label: cn[m.a] + ' ' + nm(m.key), val: r ? OL.fmtMeas(def, def.v(r)) : '****', ci: m.a };
};
OL.toggleMeas = function (list, m, max) { const i = list.findIndex(x => x.id === m.id); if (i >= 0) list.splice(i, 1); else { if (list.length >= max) list.shift(); list.push(m); } };
})(typeof window !== 'undefined' ? window : globalThis);
