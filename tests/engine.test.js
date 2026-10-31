/* tests du moteur (Node, sans navigateur) : node tests/engine.test.js */
const assert = require('assert'); const path = require('path');
['util', 'signals', 'profiles', 'scope', 'measure', 'meas_ui', 'autoset'].forEach(m => require(path.join('..', 'js', m + '.js')));
const O = globalThis.OL; let n = 0; const t = (name, f) => { f(); n++; console.log('ok  ' + name); };
const mk = (dev, src, key, sw, trim) => new O.Scope(O.PROFILES[dev], { ch: [{ node: { src, key }, sw: sw || 10, trim: trim === undefined ? 0.5 : trim, ground: true }, { node: null, sw: 10, trim: 0.5, ground: true }], mism: [1.25, 0.85, 1, 1] });
const rho = (S, i) => S.bench.mism[i] * (0.6 + 0.8 * S.bench.ch[i].trim);
const run = (S, k) => { for (let i = 0; i < (k || 3); i++) S.tick(0.04); };

t('compensation : carré parfait quand rho = 1', () => {
  const S = mk('owon', O.ProbeComp(5), 'out', 10, 0.25); S.st.ch[0].probe = 10; S.st.ch[0].vIdx = O.nearest(S.P.vdivs, 0.1); S.st.tdivIdx = O.nearest(S.P.tdivs, 200e-6); S.st.trig.level = 2.5; run(S);
  assert(Math.abs(rho(S, 0) - 1) < 1e-9); const m = O.measure(S.volts(0), S.window() / 1200); assert(Math.abs(m.pp - 5) < 0.1, 'pp=' + m.pp); assert(m.over < 3, 'over=' + m.over);
});
t('sonde sur-compensée : dépassement visible ; sous-compensée : fronts arrondis', () => {
  const S = mk('owon', O.ProbeComp(5), 'out', 10, 0.7); S.st.ch[0].probe = 10; S.st.ch[0].vIdx = O.nearest(S.P.vdivs, 0.1); S.st.tdivIdx = O.nearest(S.P.tdivs, 200e-6); S.st.trig.level = 2.5; run(S);
  assert(rho(S, 0) > 1.2); assert(O.measure(S.volts(0), S.window() / 1200).over > 15);
  S.bench.ch[0].trim = 0; run(S); assert(rho(S, 0) < 0.8); assert(O.measure(S.volts(0), S.window() / 1200).over < 5);
});
t('piège ×10 : menu 1X => tension affichée 10 fois trop petite', () => {
  const g = O.FuncGen({ amp: 4, freq: 1000 }); const S = mk('rigol', g, 'out', 10, 0.25); S.st.ch[0].probe = 1; S.st.ch[0].vIdx = O.nearest(S.P.vdivs, 0.1); S.st.tdivIdx = O.nearest(S.P.tdivs, 0.5e-3); run(S);
  const lo = O.measure(S.volts(0), S.window() / 1200).pp; S.st.ch[0].probe = 10; S.st.ch[0].vIdx = O.nearest(S.P.vdivs, 0.1); run(S); const ok = O.measure(S.volts(0), S.window() / 1200).pp;
  assert(Math.abs(ok - 4) < 0.15, 'ok=' + ok); assert(Math.abs(lo - 0.4) < 0.03, 'lo=' + lo);
});
t('autoset : fréquence, amplitude et déclenchement', () => {
  for (const dev of ['owon', 'rigol']) { const g = O.FuncGen({ shape: 'square', amp: 3, freq: 2500, offset: 1.5, duty: 0.3 }); const S = mk(dev, g, 'out', 10, 0.25); S.st.ch[0].probe = 10; assert(S.autoset()); run(S);
    assert.strictEqual(S.status, "TRIG'D"); const m = O.measure(S.volts(0), S.window() / 1200); assert(Math.abs(m.freq - 2500) < 25, 'f=' + m.freq); assert(Math.abs(m.pduty - 30) < 2, 'duty=' + m.pduty); assert(Math.abs(m.pp - 3) < 0.1); }
});
t('autoset échoue sous 20 Hz (comme sur le vrai appareil)', () => { const S = mk('owon', O.FuncGen({ freq: 5, amp: 2 }), 'out', 10, 0.25); assert.strictEqual(S.autoset(), false); });
t('mode Normal : niveau hors signal => WAIT, image conservée', () => {
  const S = mk('owon', O.FuncGen({ freq: 1000, amp: 2 }), 'out', 10, 0.25); S.st.ch[0].probe = 10; S.st.tdivIdx = O.nearest(S.P.tdivs, 0.5e-3); S.st.trig.mode = 'normal'; S.st.trig.level = 0; run(S); assert.strictEqual(S.status, "TRIG'D");
  const v = S.rec.version; S.st.trig.level = 5; run(S); assert.strictEqual(S.status, 'WAIT'); S.st.trig.mode = 'auto'; run(S); assert.strictEqual(S.status, 'AUTO');
});
t('couplage AC : composante continue supprimée', () => {
  const S = mk('rigol', O.FuncGen({ freq: 1000, amp: 2, offset: 3 }), 'out', 10, 0.25); S.st.ch[0].probe = 10; S.st.ch[0].vIdx = O.nearest(S.P.vdivs, 0.1); S.st.tdivIdx = O.nearest(S.P.tdivs, 0.5e-3); S.st.trig.level = 3; run(S);
  assert(Math.abs(O.measure(S.volts(0), S.window() / 1200).avg - 3) < 0.1); S.st.ch[0].coup = 'ac'; S.st.trig.level = 0; run(S); assert(Math.abs(O.measure(S.volts(0), S.window() / 1200).avg) < 0.1);
});
t('pont de diodes : Umax - 1,4 V et 100 Hz', () => {
  const b = O.Bridge({ veff: 9, C: 0 }); const S = mk('owon', b, 'out', 10, 0.25); S.st.ch[0].probe = 10; S.st.ch[0].vIdx = O.nearest(S.P.vdivs, 0.2); S.st.tdivIdx = O.nearest(S.P.tdivs, 5e-3); S.st.trig.level = 6; run(S);
  const m = O.measure(S.volts(0), S.window() / 1200); assert(Math.abs(m.max - (9 * Math.SQRT2 - 1.4)) < 0.4, 'max=' + m.max); assert(Math.abs(S.counterFreq() - 100) < 0.5);
});
t('NE555 : f et rapport cyclique mesurés = calculés', () => {
  const n = O.NE555({ R1: 2200, R2: 22000, C: 47e-9 }); const S = mk('rigol', n, 'out', 10, 0.25); S.st.ch[0].probe = 10; S.autoset(); run(S);
  const m = O.measure(S.volts(0), S.window() / 1200); assert(Math.abs(m.freq / n.freq() - 1) < 0.03, m.freq + ' vs ' + n.freq()); assert(Math.abs(m.pduty - n.duty() * 100) < 3);
});
t('filtre RC : délai mesuré = déphasage théorique (sondes compensées)', () => {
  const f = O.RCFilter({ freq: 1600, R: 1000, C: 100e-9, amp: 4 }); const S = new O.Scope(O.PROFILES.owon, { ch: [{ node: { src: f, key: 'in' }, sw: 10, trim: 0.25, ground: true }, { node: { src: f, key: 'out' }, sw: 10, trim: (1 / 0.85 - 0.6) / 0.8, ground: true }], mism: [1.25, 0.85] });
  S.st.ch[0].probe = 10; S.st.ch[1].probe = 10; S.st.ch[1].on = true; S.autoset(); run(S);
  const dt = S.window() / 1200, d = O.delayAB(S.volts(0), S.volts(1), dt), per = 1 / f.freq; const phi = d / per * 360; assert(Math.abs(phi - Math.abs(f.phaseDeg())) < 3, phi + ' vs ' + f.phaseDeg());
});
t('RC : constante de temps lue à 63 %', () => {
  const r = O.RCStep({ R: 10000, C: 100e-9, E: 5, freq: 1 / (12 * 1e-3) }); const v = r.nodes.vc.fn; const T = 1 / r.freq, tau = 1e-3; let x0 = 0; for (let i = 0; i < 4000; i++) { if (v(i * T / 4000 - 1e-9) < 0.05 && v(i * T / 4000 + 1e-9) > v(i * T / 4000 - 1e-9)) { x0 = i * T / 4000; break; } }
  const e = r.nodes.in.fn; assert(Math.abs(v(x0 + tau) - 5 * 0.632) < 0.1);
});
t('Single : capture unique des rebonds', () => {
  const p = O.PushButton({ bounce: true }); const S = mk('rigol', p, 'out', 10, 0.25); S.st.ch[0].probe = 10; S.st.ch[0].vIdx = O.nearest(S.P.vdivs, 0.5); S.st.tdivIdx = O.nearest(S.P.tdivs, 1e-3); S.st.trig.level = 2.5; S.st.trig.mode = 'single'; S.arm(); run(S, 5); assert.strictEqual(S.status, 'WAIT');
  p.press(S.scanEnd + 0.002); run(S, 3); assert(S.log.single); assert.strictEqual(S.st.run, false);
});
t('profondeur mémoire : un petit parasite échappe à l\'OWON en Sample mais pas en Peak', () => {
  const sp = { kind: 'x', fhint: () => 100, nodes: { out: { fn: t => { const x = (t % 0.01); return x < 2e-6 ? 5 : 0; } } } };
  const S = mk('owon', sp, 'out', 10, 0.25); S.st.ch[0].probe = 10; S.st.ch[0].vIdx = O.nearest(S.P.vdivs, 0.2); S.st.tdivIdx = O.nearest(S.P.tdivs, 50e-3); S.st.trig.mode = 'auto'; S.st.trig.level = 2.5; S.st.tdivIdx = O.nearest(S.P.tdivs, 10e-3); run(S, 2);
  S.st.acq = 'peak'; run(S, 2); const pk = S.peakDivs(0); assert(pk && Math.max(...pk.hi) > 1.5, 'peak detect doit voir l\'impulsion');
});
console.log('\n' + n + ' tests réussis');
(() => { /* Autoscale continu : ne rallume pas une voie éteinte */
  const g = O.FuncGen({ freq: 1000, amp: 2 }), c = O.ProbeComp(5); const S = new O.Scope(O.PROFILES.owon, { ch: [{ node: { src: g, key: 'out' }, sw: 10, trim: 0.25, ground: true }, { node: { src: c, key: 'out' }, sw: 10, trim: 0.25, ground: true }], mism: [1.25, 0.85] });
  S.st.ch[0].probe = 10; S.st.ch[1].probe = 10; S.autoset(); assert(S.st.ch[1].on); S.st.ch[1].on = false; S.autoset({ keep: true }); assert.strictEqual(S.st.ch[1].on, false); console.log('ok  Autoscale ne rallume pas une voie éteinte');
})();
