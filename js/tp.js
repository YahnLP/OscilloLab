/* tp.js — moteur de travaux pratiques : étapes, vérifications automatiques, questions corrigées */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};
const E = OL.el;

OL.TPS = [];
/* mini-convertisseur LaTeX -> HTML/Unicode pour les énoncés (sans dépendance) */
OL.tex = function (s) {
  if (typeof s !== 'string') return s;
  const map = [[/\\langle u\\rangle/g, '⟨u⟩'], [/\\alpha/g, 'α'], [/\\tau/g, 'τ'], [/\\varphi/g, 'φ'], [/\\Delta/g, 'Δ'], [/\\sin/g, 'sin'], [/\\times/g, '×'], [/\\cdot/g, '·'], [/\\,/g, ' '], [/\{,\}/g, ','], [/\\sqrt\{([^}]*)\}/g, '√$1'], [/\\sqrt ?(\w)/g, '√$1']];
  map.forEach(([a, b]) => { s = s.replace(a, b); });
  s = s.replace(/([A-Za-zΔφτ])_\{([^}]*)\}/g, '$1<sub>$2</sub>').replace(/([A-Za-zΔφτ])_([A-Za-z0-9])/g, '$1<sub>$2</sub>').replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>');
  return s.replace(/\$/g, '');
};
/* contexte donné aux fonctions des TP */
OL.tpContext = function (App, rnd) {
  const S = App.scope, U = App.ui, B = App.bench, W = S.bench, st = S.st, P = S.P;
  const ctx = { App, S, U, B, W, st, P, r: rnd, dev: App.dev };
  ctx.node = i => W.ch[i] && W.ch[i].node ? W.ch[i].node.src.kind + '.' + W.ch[i].node.key : '';
  ctx.rho = i => (W.mism[i] || 1) * (0.6 + 0.8 * W.ch[i].trim);
  ctx.meas = i => { const v = S.volts(i); return v ? OL.measure(v, S.window() / v.length) : null; };
  ctx.divPP = i => { const m = ctx.meas(i); return m ? m.pp / Math.abs(S.vdivLabel(i)) : 0; };
  ctx.periods = i => { const m = ctx.meas(i); return m && m.period ? S.window() / m.period : 0; };
  ctx.hasMeas = key => (U.meas || []).some(m => m.key === key);
  ctx.sig = (src, key) => { const f = src.nodes[key].fn, T = 1 / (src.fhint ? src.fhint() : 1000); let mn = 1e9, mx = -1e9; for (let k = 0; k < 4000; k++) { const v = f(k * 4 * T / 4000 + 0.0003); if (v < mn) mn = v; if (v > mx) mx = v; } return { min: mn, max: mx, pp: mx - mn }; };
  return ctx;
};
/* tolérance : relative (tol) ou absolue (abs) */
function okNum(val, ans, q) { if (!isFinite(val)) return false; const tol = q.abs !== undefined ? q.abs : Math.abs(ans) * (q.tol === undefined ? 0.08 : q.tol); return Math.abs(val - ans) <= tol; }
function parseNum(s) { return parseFloat(String(s).replace(',', '.').replace(/\s/g, '')); }

OL.TPUI = function (parent, App) {
  const T = this; T.App = App; T.root = E('div', '', parent); T.cur = null; T.step = 0; T.done = {}; T.seed = 1; T.q = {};
  try { T.done = JSON.parse(localStorage.getItem('oscillolab.done') || '{}'); } catch (e) { T.done = {}; }
  T.list();
};
OL.TPUI.prototype.list = function () {
  const T = this, r = T.root; r.innerHTML = ''; T.cur = null; document.getElementById('tpName').textContent = '';
  const c = E('div', 'card', r); E('h3', '', c, null, 'Travaux pratiques');
  const top = E('div', 'row', c);
  const ls = E('button', 'btn pri', top, null, '📖 Les bases de l\'oscilloscope (à lire avant le TP 1)'); ls.addEventListener('click', () => T.lessons());
  const f = E('button', 'btn', top, null, 'Mode libre (tous les montages)');  f.addEventListener('click', () => { T.App.free(); });
  const L = E('div', 'tplist', c);
  OL.TPS.forEach(tp => { const b = E('button', 'btn' + (T.done[tp.id] ? ' done' : ''), L, null, '<b>' + tp.n + '.</b> ' + tp.title + ' <span class="hint">— ' + tp.level + (tp.devices ? ' · RIGOL uniquement' : '') + '</span>'); b.addEventListener('click', () => T.open(tp)); });
  E('div', 'hint', c, null, 'Chaque TP règle le banc d\'essai pour toi. Les cases se cochent toutes seules quand l\'oscilloscope est bien réglé ; les questions se corrigent automatiquement.');
};
OL.TPUI.prototype.lessons = function () {
  const T = this, r = T.root; r.innerHTML = ''; T.cur = null; T.checkEls = [];
  const c = E('div', 'card lesson', r); const top = E('div', 'row', c); const back = E('button', 'btn', top, null, '← Liste des TP'); back.addEventListener('click', () => T.list());
  E('h3', '', c, null, 'Les bases de l\'oscilloscope');
  E('p', '', c, null, 'Manipule l\'appareil à gauche pendant que tu lis. Le bouton <b>👆 Montre-moi</b> fait clignoter la commande dont on parle.');
  OL.LESSONS.forEach((L, i) => {
    E('h4', '', c, null, (i + 1) + '. ' + L.t); E('div', 'learn', c, null, OL.tex(L.learn));
    const hw = L.how && L.how[T.App.dev]; if (hw) { const ol = E('ol', 'how', c); hw.forEach(([txt, ids]) => { const li = E('li', '', ol, null, OL.tex(txt)); if (ids && ids.length) { const b = E('button', 'show', li, null, '👆 Montre-moi'); b.type = 'button'; b.addEventListener('click', () => T.App.ui.flash(ids)); } }); }
  });
  const go = E('button', 'btn pri', c, null, 'Commencer le TP 1 ▶'); go.style.marginTop = '10px'; go.addEventListener('click', () => T.open(OL.TPS[0]));
};
OL.TPUI.prototype.open = function (tp) {
  const T = this, App = T.App; T.cur = tp; T.step = 0; T.q = {}; T.seed = (Math.random() * 1e6) | 0;
  App.startTP(tp, T.seed); T.render(); document.getElementById('tpName').textContent = 'TP ' + tp.n + ' — ' + tp.title;
};
OL.TPUI.prototype.render = function () {
  const T = this, tp = T.cur, r = T.root; r.innerHTML = ''; if (!tp) return T.list();
  const ctx = T.ctx = OL.tpContext(T.App, T.App.rnd);
  const c = E('div', 'card', r);
  const top = E('div', 'row', c); const back = E('button', 'btn', top, null, '← Liste des TP'); back.addEventListener('click', () => { T.App.free(true); T.list(); });
  const nw = E('button', 'btn', top, null, '↻ Nouveau signal'); nw.addEventListener('click', () => { T.open(tp); });
  E('h3', '', c, null, 'TP ' + tp.n + ' — ' + tp.title);
  E('div', '', c, null, '<p>' + OL.tex(tp.goal) + '</p>');
  T.checkEls = []; T.qEls = [];
  tp.steps.forEach((s, si) => {
    const d = E('div', 'step' + (si === T.step ? ' cur' : ''), c); E('h4', '', d, null, (si + 1) + '. ' + s.title);
    E('div', '', d, null, OL.tex(typeof s.html === 'function' ? s.html(ctx) : s.html));
    const te = (OL.TEACH[tp.id] || [])[si];
    if (te) {
      if (te.learn) E('div', 'learn', d, null, '<b class="t">💡 À savoir</b><br>' + OL.tex(te.learn));
      const hw = te.how && te.how[T.App.dev];
      if (hw && hw.length) {
        E('div', '', d, null, '<b>🛠 Pas à pas sur ' + (T.App.dev === 'owon' ? 'l\'OWON' : 'le RIGOL') + '</b>');
        const ol = E('ol', 'how', d);
        hw.forEach(([txt, ids]) => { const li = E('li', '', ol, null, OL.tex(txt)); if (ids && ids.length) { const b = E('button', 'show', li, null, '👆 Montre-moi'); b.type = 'button'; b.addEventListener('click', () => T.App.ui.flash(ids)); } });
      }
      if (te.hint) E('details', 'hint', d, null, '<summary>🆘 Un coup de pouce</summary>' + OL.tex(te.hint));
    }
    (s.checks || []).forEach((ck, k) => { const row = E('div', 'chk', d, null, '<i>○</i><span>' + (typeof ck.label === 'function' ? ck.label(ctx) : ck.label) + '</span>'); T.checkEls.push({ row, ck, si }); });
    (s.questions || []).forEach((q, k) => {
      const id = tp.id + '.' + si + '.' + k, row = E('div', 'qrow', d); const lab = typeof q.label === 'function' ? q.label(ctx) : q.label; E('span', '', row, null, OL.tex(lab));
      let inp; if (q.opts) { inp = E('select', '', row); E('option', '', inp, null, '— choisir —').value = ''; q.opts.forEach((o, i) => E('option', '', inp, null, o).value = i); } else { inp = E('input', '', row); inp.type = 'text'; inp.placeholder = q.unit || ''; inp.inputMode = q.str ? 'text' : 'decimal'; if (q.str) inp.style.width = '170px'; }
      if (q.unit && !q.opts) E('span', 'hint', row, null, q.unit);
      const btn = E('button', 'btn', row, null, 'Vérifier'); const res = E('span', 'res', row);
      if (T.q[id]) { inp.value = T.q[id].v; res.textContent = T.q[id].t; res.className = 'res ' + (T.q[id].ok ? 'ok' : 'bad'); }
      btn.addEventListener('click', () => {
        const ans = typeof q.ans === 'function' ? q.ans(T.ctx = OL.tpContext(T.App, T.App.rnd)) : q.ans; let ok, txt;
        if (q.opts) { ok = inp.value !== '' && +inp.value === ans; txt = ok ? '✓ Juste' : (inp.value === '' ? 'Choisis une réponse' : '✗ Pas tout à fait'); }
        else if (q.str) { const norm = s => String(s).toUpperCase().replace(/\s+/g, ' ').replace(/[^A-Z0-9 ]/g, '').trim(); ok = norm(inp.value) === norm(ans) && (inp.value.trim() !== '' || String(ans) === ''); txt = ok ? '✓ Juste' : (inp.value.trim() === '' ? 'Écris ta réponse (laisse vide s\'il n\'y a rien)' : '✗ Pas tout à fait : relis le décodage'); }
        else { const v = parseNum(inp.value); ok = okNum(v, ans, q); txt = ok ? '✓ Juste' : (isFinite(v) ? '✗ ' + (q.hint || 'Pas tout à fait : revérifie ta lecture et l\'unité') : 'Entre un nombre'); }
        if (!ok && q.show) txt += ' (attendu ≈ ' + (q.show(ans)) + ')';
        T.q[id] = { v: inp.value, ok, t: txt }; res.textContent = txt; res.className = 'res ' + (ok ? 'ok' : 'bad'); T.score(); });
      T.qEls.push({ id, q, row });
    });
  });
  T.sc = E('div', 'score', c); T.score();
  const nav = E('div', 'row', c); const pv = E('button', 'btn', nav, null, '◀ Étape précédente'), nx = E('button', 'btn pri', nav, null, 'Étape suivante ▶');
  pv.addEventListener('click', () => { T.step = Math.max(0, T.step - 1); T.render(); }); nx.addEventListener('click', () => { T.step = Math.min(tp.steps.length - 1, T.step + 1); T.render(); });
  if (tp.note) E('div', 'hint', c, null, OL.tex(tp.note));
};
OL.TPUI.prototype.score = function () {
  const T = this, tp = T.cur; if (!tp) return; let nq = 0, ok = 0; tp.steps.forEach((s, si) => (s.questions || []).forEach((q, k) => { nq++; if (T.q[tp.id + '.' + si + '.' + k] && T.q[tp.id + '.' + si + '.' + k].ok) ok++; }));
  const nc = T.checkEls.length, cok = T.checkEls.filter(x => x.row.classList.contains('ok')).length;
  T.sc.innerHTML = '<b>Réglages :</b> ' + cok + ' / ' + nc + ' &nbsp; <b>Questions :</b> ' + ok + ' / ' + nq + (cok === nc && ok === nq && nq + nc > 0 ? ' &nbsp; <span class="res ok">🎉 TP réussi !</span>' : '');
  if (cok === nc && ok === nq && nq + nc > 0 && !T.done[tp.id]) { T.done[tp.id] = true; try { localStorage.setItem('oscillolab.done', JSON.stringify(T.done)); } catch (e) { } }
};
/* appelé régulièrement : met à jour les cases */
OL.TPUI.prototype.poll = function () {
  const T = this; if (!T.cur || !T.checkEls) return; const ctx = T.ctx = OL.tpContext(T.App, T.App.rnd); let changed = false;
  T.checkEls.forEach(x => { if (x.row.classList.contains('ok')) return; let ok = false; try { ok = !!x.ck.ok(ctx); } catch (e) { ok = false; } if (ok) { x.row.classList.add('ok'); x.row.firstChild.textContent = '✓'; changed = true; } });
  if (changed) T.score();
};
})(typeof window !== 'undefined' ? window : globalThis);
