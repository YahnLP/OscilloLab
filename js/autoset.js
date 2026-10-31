/* autoset.js — réglage automatique (Autoset / Auto) : fréquence >= 20 Hz et amplitude >= 5 mV requises */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};
OL.Scope.prototype.autoset = function (opts) {
  opts = opts || {};
  const S = this, P = S.P, st = S.st;
  let found = null;
  const first = [];
  for (let i = 0; i < P.nch; i++) {
    const nd = S.nodeOf(i); if (!nd) continue; if (opts.keep && !st.ch[i].on) continue;   /* Autoscale n'allume ni n'éteint de voie */
    const f = nd.src.fhint ? nd.src.fhint() : 0;
    /* analyse sur 40 périodes : amplitude crête-crête et moyenne */
    const T = 1 / f, N = 4000; let mn = Infinity, mx = -Infinity, sm = 0;
    for (let k = 0; k < N; k++) { const v = nd.fn(k * 6 * T / N + 0.00123); if (v < mn) mn = v; if (v > mx) mx = v; sm += v; }
    const sw = S.bench.ch[i].sw, att = sw === 10 ? 0.1 : 1;
    first.push({ i, f, pp: (mx - mn), mn, mx, mean: sm / N, ok: f >= P.autoMinF && (mx - mn) * (sw === 10 ? 1 : 1) >= P.autoMinV });
  }
  const ok = first.filter(x => x.ok);
  if (!ok.length) { S.autosetMsg = 'Signal introuvable'; return false; }
  S.autosetMsg = ''; S.log.autoset++;
  /* base de temps : environ 3 périodes sur l'écran (la 1re voie qui a un signal pilote) */
  const lead = ok[0], per = 1 / lead.f;
  st.tdivIdx = OL.nearest(P.tdivs, per * 3 / P.hdiv * 1.0);
  while (P.tdivs[st.tdivIdx] * P.hdiv < per * 1.8 && st.tdivIdx < P.tdivs.length - 1) st.tdivIdx++;
  st.hdelay = 0; st.xy = false; st.acq = 'sample'; st.single = false; st.run = true;
  const nOk = ok.length;
  for (const x of first) {
    const c = st.ch[x.i];
    if (!x.ok) { if (!opts.keep) c.on = false; continue; }
    c.on = true; if (c.coup === 'gnd') c.coup = 'dc';
    const sw = S.bench.ch[x.i].sw, att = sw === 10 ? 0.1 : 1;
    const ppIn = x.pp * att;                           /* amplitude réelle à l'entrée de l'appareil */
    const target = nOk > 1 ? 3.0 : 4.0;                 /* hauteur visée en divisions */
    c.vIdx = OL.nearest(P.vdivs, ppIn / target);
    while (P.vdivs[c.vIdx] * 5.2 < ppIn && c.vIdx < P.vdivs.length - 1) c.vIdx++;
    const lab = S.vdivLabel(x.i), mid = (x.mn + x.mx) / 2 * att * c.probe;
    c.pos = c.coup === 'ac' ? 0 : -mid / lab;              /* centre le signal */
    c.pos = Math.max(-3.5, Math.min(3.5, c.pos));
    if (P.id === 'rigol' && nOk > 1) c.pos += (x.i % 2 ? -1.2 : 1.2) * 0;   /* les Rigol superposent ; l'élève sépare */
  }
  /* déclenchement : 1re voie active, front montant, niveau au milieu du signal */
  st.trig.src = lead.i; st.trig.slope = 'rise'; st.trig.mode = 'auto'; st.trig.coup = 'dc';
  st.trig.level = ((lead.mn + lead.mx) / 2) * (S.bench.ch[lead.i].sw === 10 ? 0.1 : 1) * st.ch[lead.i].probe;
  S.sel = lead.i; st.sel = lead.i;
  S.lastAuto = { per: per, lead: lead.i };
  S.resetAvg(); return true;
};
})(typeof window !== 'undefined' ? window : globalThis);
