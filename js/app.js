/* app.js — assemblage : paillasse, oscilloscope, TP, boucle d'animation
   © Yahn LE PRETTRE, Enseignant à la MFR de Pontonx — Licence CC BY-NC-SA 4.0 */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};
const $ = s => document.querySelector(s);
const App = OL.App = { dev: 'owon', scope: null, ui: null, bench: null, tp: null, seed: 1, rnd: null, tpui: null };

App.makeBench = function () {
  return { gbf: OL.FuncGen({}), comp: null, bridge: OL.Bridge({}), ne555: OL.NE555({}), rc: OL.RCStep({}), rcf: OL.RCFilter({}), dc: OL.DCSource({}), push: OL.PushButton({}), noisy: OL.NoisySignal({}), uart: OL.UartSource({}), i2c: OL.I2CSource({}), spi: OL.SPISource({}) };
};
/* construit un appareil + une paillasse ; tp = null pour le mode libre */
App.build = function (dev, tp, seed) {
  if (tp && tp.devices && tp.devices.indexOf(dev) < 0) { tp = null; App.pendingNote = 'Ce TP utilise le décodeur série du RIGOL : l\'OWON n\'en possède pas.'; }
  App.dev = dev; App.tp = tp || null; App.seed = seed || 1; const P = OL.PROFILES[dev];
  App.bench = App.makeBench(); App.bench.comp = OL.ProbeComp(P.compVpp); App.rnd = OL.rng(App.seed);
  const box = $('#scopeBox'); box.innerHTML = '';
  const wiring = { ch: [], mism: [1.25, 0.85, 1.12, 0.9] };
  for (let i = 0; i < P.nch; i++) wiring.ch.push({ node: null, sw: 10, trim: 0.5, ground: true });
  App.scope = new OL.Scope(P, wiring);
  App.ui = dev === 'owon' ? new OL.OwonUI(box, App.scope) : new OL.RigolUI(box, App.scope);
  const st = App.scope.st;
  if (tp) { const ctx = OL.tpContext(App, App.rnd); ctx.W = wiring; tp.setup(ctx); }
  else { wiring.ch[0].node = { src: App.bench.comp, key: 'out' }; st.ch[0].probe = 10; st.ch[0].vIdx = OL.nearest(P.vdivs, 0.1); }
  document.body.className = 'body-' + dev;
  document.querySelectorAll('#devSeg button').forEach(b => b.classList.toggle('on', b.dataset.d === dev));
  App.benchUI = new OL.Bench($('#benchPop'), App, tp && tp.only ? { only: tp.only } : {});
  App.fit();
};
App.startTP = function (tp, seed) { if (tp.devices && tp.devices.indexOf(App.dev) < 0) App.dev = tp.devices[0]; App.build(App.dev, tp, seed); };
App.free = function (keepList) { App.build(App.dev, null, 1); if (!keepList) App.tpui.list(); };
App.fit = function () {
  if (!App.ui) return; const w = $('#scopeWrap').clientWidth, bw = App.ui.box.offsetWidth, bh = App.ui.box.offsetHeight, k = Math.min(1.6, w / bw, g.innerWidth > 1250 ? (g.innerHeight - 140) / bh : 9);
  $('#scopeBox').style.transform = 'scale(' + k + ')'; $('#scopeWrap').style.height = (bh * k) + 'px';
};
/* suivi de ce que l'élève a fait (pour la correction automatique) */
function trackLog() {
  const S = App.scope, c0 = S.st.ch[0]; if (!c0) return;
  if (c0.coup === 'gnd') S.log.coupGnd = true; if (c0.coup === 'ac') S.log.coupAc = true;
}
let last = performance.now(), acc = 0, poll = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt; poll += dt;
  if (App.scope && acc >= 0.04) { try { App.scope.tick(acc); App.ui.tickFrame(acc); App.ui.draw(); trackLog(); } catch (e) { console.error(e); } acc = 0; }
  if (poll > 0.35) { poll = 0; if (App.tpui && App.tp) App.tpui.poll(); }
  requestAnimationFrame(loop);
}
g.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#devSeg button').forEach(b => b.addEventListener('click', () => { App.build(b.dataset.d, App.tp, App.seed); if (App.tp) App.tpui.render(); else if (App.pendingNote) { App.tpui.list(); const n = document.createElement('div'); n.className = 'card'; n.style.borderColor = '#ffb020'; n.textContent = '⚠ ' + App.pendingNote; document.getElementById('tpPane').prepend(n); App.pendingNote = null; } }));
  g.addEventListener('resize', () => App.fit());
  const pop = $('#benchPop'); const show = k => { pop.classList.toggle('open', !!k); pop.querySelectorAll(':scope > div').forEach(d => { d.style.display = d.dataset.p === k ? '' : 'none'; }); document.querySelectorAll('#benchBar button[data-p]').forEach(b => b.classList.toggle('pri', b.dataset.p === k)); App.pop = k; };
  document.querySelectorAll('#benchBar button[data-p]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); show(App.pop === b.dataset.p ? null : b.dataset.p); }));
  /* fenêtre déplaçable (par son titre) : on peut la ranger sur le côté pour garder l'écran visible */
  let drag = null;
  pop.addEventListener('pointerdown', e => { const h = e.target.closest('h3'); if (!h) return; const box = h.closest('#benchPop > div'); drag = { box, x: e.clientX, y: e.clientY, l: box.offsetLeft, t: box.offsetTop }; h.setPointerCapture(e.pointerId); h.style.cursor = 'grabbing'; });
  pop.addEventListener('pointermove', e => { if (!drag) return; drag.box.style.left = (drag.l + e.clientX - drag.x) + 'px'; drag.box.style.top = (drag.t + e.clientY - drag.y) + 'px'; });
  pop.addEventListener('pointerup', () => { drag = null; });
  document.querySelector('#benchBar button[data-a=lessons]').addEventListener('click', e => { e.stopPropagation(); show(null); App.tpui.lessons(); document.getElementById('side').scrollTop = 0; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') show(null); });
  show(null);
  App.tpui = new OL.TPUI($('#tpPane'), App);
  App.build('owon', null, 1); requestAnimationFrame(loop);
});
})(window);
