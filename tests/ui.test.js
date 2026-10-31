/* tests d'interface (Playwright) : node tests/ui.test.js [chemin/vers/index.html] */
const { chromium } = require('playwright'); const path = require('path'); const assert = require('assert');
const file = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1500, height: 950 } }); const errs = [];
  pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto(file); await pg.waitForTimeout(500); let n = 0; const ok = s => { n++; console.log('ok  ' + s); };

  /* 1. chaque TP, sur chaque appareil : s'ouvre, les cases se calculent, les réponses attendues sont des nombres */
  const info = await pg.evaluate(async () => {
    const out = [];
    for (const dev of ['owon', 'rigol']) for (const tp of OL.TPS) {
      OL.App.build(dev, null, 1); OL.App.tpui.open(tp); await new Promise(r => setTimeout(r, 450));
      const ctx = OL.tpContext(OL.App, OL.App.rnd); const bad = [];
      tp.steps.forEach((s, si) => { if (typeof s.html === 'function') s.html(ctx); (s.checks || []).forEach(c => { try { c.ok(ctx); if (typeof c.label === 'function') c.label(ctx); } catch (e) { bad.push('check ' + si + ': ' + e.message); } }); (s.questions || []).forEach(q => { try { const a = typeof q.ans === 'function' ? q.ans(ctx) : q.ans; if (!q.str && !isFinite(a)) bad.push('réponse non numérique ' + si); } catch (e) { bad.push('ans ' + si + ': ' + e.message); } }); });
      const txt = document.getElementById('tpPane').innerText; if (/\$|\\\\|undefined|NaN/.test(txt)) bad.push('texte suspect: ' + (txt.match(/.{0,20}(\$|\\\\|undefined|NaN).{0,20}/) || [''])[0]);
      out.push({ dev, id: tp.id, bad });
    }
    return out;
  });
  info.forEach(i => { assert.deepStrictEqual(i.bad, [], i.dev + ' ' + i.id + ' : ' + i.bad.join(' | ')); }); ok(info.length + ' ouvertures de TP (2 appareils × ' + info.length / 2 + ' TP) sans erreur');

  /* 2. TP 1 résolu comme un élève (OWON) : probe 10X puis Autoset */
  await pg.evaluate(() => { OL.App.build('owon', null, 1); OL.App.tpui.open(OL.TPS[0]); });
  await pg.waitForTimeout(500);
  await pg.evaluate(() => { const U = OL.App.ui; U.menus && 0; });
  await pg.click('button:has-text("CH1")'); await pg.click('button:has-text("H4")'); await pg.waitForTimeout(100);
  const f = await pg.$$('button.key:has-text("F")'); /* F1..F5 + Menu off */
  await pg.evaluate(() => OL.App.ui.pressF(1)); /* 10X */
  await pg.click('button:has-text("Autoset")'); await pg.waitForTimeout(1500);
  const st = await pg.evaluate(() => { const c = OL.tpContext(OL.App, OL.App.rnd); return { probe: c.st.ch[0].probe, auto: c.S.log.autoset, pp: c.divPP(0), status: c.S.status }; });
  assert.strictEqual(st.probe, 10); assert(st.auto >= 1); assert(st.pp >= 3 && st.pp <= 7.4, 'divPP=' + st.pp); ok('TP 1 : sonde 10X, Autoset et lecture (' + st.pp.toFixed(1) + ' carreaux)');
  const ticks = await pg.$$eval('.chk.ok', e => e.length); assert(ticks >= 3, 'cases cochées: ' + ticks); ok(ticks + ' cases cochées automatiquement');
  await pg.evaluate(() => OL.App.tpui.step = 2); await pg.evaluate(() => OL.App.tpui.render());
  const inputs = await pg.$$('.qrow input'); await inputs[0].fill('5'); await inputs[1].fill('1'); await inputs[2].fill('1000');
  for (const bt of await pg.$$('.qrow button')) await bt.click(); await pg.waitForTimeout(100);
  const res = await pg.$$eval('.qrow .res', e => e.map(x => x.textContent)); assert(res.every(r => /Juste/.test(r)), res.join('|')); ok('questions du TP 1 corrigées automatiquement');

  /* 3. bascule d'appareil + clavier / molette */
  await pg.click('#devSeg button[data-d="rigol"]'); await pg.waitForTimeout(500);
  await pg.evaluate(() => OL.App.ui.doAutoset()); await pg.waitForTimeout(800); await pg.screenshot({ path: path.join(__dirname, '..', 'docs', 'capture-rigol.png') });
  await pg.click('#devSeg button[data-d="owon"]'); await pg.waitForTimeout(500); await pg.evaluate(() => OL.App.ui.doAutoset()); await pg.waitForTimeout(800); await pg.screenshot({ path: path.join(__dirname, '..', 'docs', 'capture-owon.png') });
  ok('bascule OWON / RIGOL et captures'); assert.deepStrictEqual(errs, [], errs.join('\n')); ok('aucune erreur JavaScript');
  await b.close(); console.log('\n' + n + ' contrôles réussis');
})().catch(e => { console.error(e); process.exit(1); });
