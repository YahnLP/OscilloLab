/* tps_a.js — TP 1 à 6 : prise en main, sonde, lecture, couplage, déclenchement */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};
const ds = (o, r) => '<span class="owon-only"><span class="dev o">OWON</span> ' + o + '</span><span class="rigol-only"><span class="dev r">RIGOL</span> ' + r + '</span>';
OL.ds = ds;
const fmtD = (x, u) => OL.fmt(x, u, 3);
const R = OL.rnd = { pick: (rng, a) => a[Math.floor(rng() * a.length)], range: (rng, a, b) => a + (b - a) * rng() };
const wire = (ctx, i, id) => { const n = ctx.App.bench; const [k, key] = id.split('.'); const src = Object.values(n).find(s => s && s.kind === k); ctx.W.ch[i] = Object.assign(ctx.W.ch[i] || { sw: 10, trim: 0.5, ground: true }, { node: { src, key } }); };
OL.wire = wire;
const probeOK = (ctx, i) => ctx.st.ch[i].probe === ctx.W.ch[i].sw;
const choice = (q, opts, ans, extra) => Object.assign({ label: q, opts, ans }, extra || {});

OL.TPS.push({
  n: 1, id: 'prise-en-main', title: 'Prise en main : le signal de compensation', level: 'débutant',
  goal: 'Brancher une sonde, régler l\'appareil avec <b>Autoset</b> et lire un premier signal : le carré de test de l\'oscilloscope.',
  only: ['probecomp.out'],
  setup: ctx => { wire(ctx, 0, 'probecomp.out'); ctx.W.ch[0].sw = 10; ctx.st.ch[0].probe = 1; ctx.st.ch[0].vIdx = OL.nearest(ctx.P.vdivs, 1); },
  steps: [
    { title: 'Brancher la sonde', html: '<p>La sonde est déjà sur la <b>sortie de compensation</b> (pointe) avec la pince de masse reliée à la borne de masse. L\'interrupteur de la sonde est sur <b>×10</b>. Il faut aussi le dire à l\'oscilloscope.</p><p>' + ds('Appuie sur <kbd>CH1</kbd>, puis <kbd>H4</kbd> (Probe), puis choisis <kbd>10X</kbd> avec la touche F.', 'Appuie sur <kbd>CH1</kbd>, puis sur la touche bleue <b>Probe</b>, tourne le bouton multifonction jusqu\'à <b>10X</b> et appuie dessus.') + '</p>',
      checks: [{ label: 'Le réglage « Probe » de l\'appareil est identique à l\'interrupteur de la sonde (×10)', ok: c => probeOK(c, 0) && c.st.ch[0].probe === 10 }] },
    { title: 'Régler automatiquement', html: '<p>Appuie sur <kbd>' + ds('Autoset', 'AUTO') + '</kbd>. L\'appareil choisit tout seul V/div, s/div et le déclenchement.</p>',
      checks: [{ label: 'Autoset utilisé', ok: c => c.S.log.autoset > 0 }, { label: 'Le signal occupe 3 à 7 carreaux en hauteur', ok: c => { const d = c.divPP(0); return d >= 3 && d <= 7.4; } }] },
    { title: 'Lire à l\'écran', html: '<p>Lis V/div en bas de l\'écran, compte les carreaux, puis réponds. Rappel : $U_{pp}$ = carreaux (hauteur) × V/div ; $T$ = carreaux (largeur d\'une période) × s/div ; $f = 1/T$.</p>'.replace(/\$[^$]*\$/g, m => m.slice(1, -1)),
      questions: [{ label: 'Amplitude crête-à-crête du signal de test', unit: 'V', ans: c => c.P.compVpp, tol: 0.12 }, { label: 'Période du signal', unit: 'ms', ans: 1, tol: 0.1 }, { label: 'Fréquence du signal', unit: 'Hz', ans: 1000, tol: 0.1 }] }
  ]
});

OL.TPS.push({
  n: 2, id: 'compensation', title: 'Compenser la sonde', level: 'indispensable',
  goal: 'Une sonde ×10 doit être <b>compensée</b> avant toute mesure sérieuse : sinon les fronts sont déformés et les mesures de temps et de phase sont faussées. On règle la vis de la sonde pour obtenir un carré parfait.',
  only: ['probecomp.out'],
  setup: ctx => { wire(ctx, 0, 'probecomp.out'); ctx.st.ch[0].probe = 10; ctx.st.ch[0].vIdx = OL.nearest(ctx.P.vdivs, 0.1); if (ctx.P.nch > 1) { wire(ctx, 1, 'probecomp.out'); ctx.st.ch[1].on = true; ctx.st.ch[1].probe = 10; ctx.st.ch[1].vIdx = OL.nearest(ctx.P.vdivs, 0.1); ctx.st.ch[1].pos = -2; } ctx.W.ch[0].trim = 0.7; if (ctx.W.ch[1]) ctx.W.ch[1].trim = 0.25; ctx.st.tdivIdx = OL.nearest(ctx.P.tdivs, 200e-6); ctx.st.trig.level = ctx.P.compVpp / 2; },
  steps: [
    { title: 'Voir les fronts', html: '<p>Les deux sondes sont sur la sortie de compensation. Règle la base de temps pour voir <b>un front montant en grand</b> (environ 100 à 500 µs/div) et le signal sur 3 à 5 carreaux de haut. Observe les coins du carré.</p>',
      checks: [{ label: 'Base de temps entre 50 µs/div et 500 µs/div', ok: c => { const t = c.S.tdiv(); return t >= 49e-6 && t <= 501e-6; } }],
      questions: [choice('Un pic au sommet de chaque front (le signal « dépasse ») signifie que la sonde est…', ['sous-compensée', 'sur-compensée', 'parfaitement compensée'], 1), choice('Des fronts « arrondis » (le signal monte lentement) signifient que la sonde est…', ['sous-compensée', 'sur-compensée', 'parfaitement compensée'], 0)] },
    { title: 'Régler la vis', html: '<p>Avec le <b>tournevis</b> (curseur « Vis de compensation » de chaque sonde, à droite), rends les coins du carré <b>parfaitement droits</b>. Chaque sonde se règle sur <b>sa propre voie</b>.</p>',
      checks: [{ label: 'Voie 1 compensée', ok: c => Math.abs(c.rho(0) - 1) < 0.05 }, { label: 'Voie 2 compensée', ok: c => !c.W.ch[1] || Math.abs(c.rho(1) - 1) < 0.05 }] }
  ],
  note: 'Dans la vraie vie, on recompense la sonde dès qu\'on la branche sur une autre voie ou un autre oscilloscope.'
});

OL.TPS.push({
  n: 3, id: 'piege-x1-x10', title: 'Le piège ×1 / ×10', level: 'indispensable',
  goal: 'L\'erreur la plus fréquente à l\'examen : l\'interrupteur de la sonde et le réglage de l\'oscilloscope ne sont pas identiques. Toutes les tensions affichées sont alors <b>fausses d\'un facteur 10</b>.',
  only: ['funcgen.out'],
  setup: ctx => { const g = ctx.B.gbf; g.shape = 'sine'; g.freq = R.pick(ctx.r, [500, 800, 1000, 2000]); g.amp = R.pick(ctx.r, [2, 3, 4, 5, 6]); g.offset = 0; wire(ctx, 0, 'funcgen.out'); ctx.W.ch[0].sw = 10; ctx.W.ch[0].trim = 0.25; ctx.st.ch[0].probe = 1; ctx.st.ch[0].vIdx = OL.nearest(ctx.P.vdivs, 0.2); ctx.st.tdivIdx = OL.nearest(ctx.P.tdivs, 0.5 / g.freq / 2 / 1.0); },
  steps: [
    { title: 'Observer l\'erreur', html: '<p>L\'interrupteur de la sonde est sur <b>×10</b> mais l\'oscilloscope est réglé sur <b>1X</b>. Le générateur envoie un sinus. Utilise <b>Autoset</b> et lis l\'amplitude affichée.</p>',
      checks: [{ label: 'Autoset utilisé', ok: c => c.S.log.autoset > 0 }],
      questions: [choice('Interrupteur ×10, menu 1X : l\'amplitude lue à l\'écran est…', ['10 fois trop grande', 'exacte', '10 fois trop petite'], 2)] },
    { title: 'Corriger', html: '<p>Mets le réglage « Probe » de l\'oscilloscope sur <b>10X</b>, puis relis l\'amplitude. Elle doit correspondre à celle du générateur.</p>',
      checks: [{ label: 'Menu Probe = interrupteur de la sonde (10X)', ok: c => probeOK(c, 0) }, { label: 'Signal bien cadré (3 à 7 carreaux)', ok: c => { const d = c.divPP(0); return d >= 3 && d <= 7.4; } }],
      questions: [{ label: 'Amplitude crête-à-crête réelle du signal du générateur', unit: 'V', ans: c => c.B.gbf.amp, tol: 0.08 }, { label: 'Fréquence du signal', unit: 'Hz', ans: c => c.B.gbf.freq, tol: 0.08 }] }
  ]
});

OL.TPS.push({
  n: 4, id: 'lecture-graticule', title: 'Lire un signal sur la grille', level: 'débutant',
  goal: 'Mesurer à l\'écran comme à l\'examen : <b>tension crête-à-crête</b>, <b>période</b> et <b>fréquence</b>, en comptant les carreaux sans les mesures automatiques.',
  only: ['funcgen.out'],
  setup: ctx => { const g = ctx.B.gbf; g.shape = R.pick(ctx.r, ['sine', 'triangle', 'square']); g.freq = R.pick(ctx.r, [250, 400, 750, 1200, 2500, 4000]); g.amp = R.pick(ctx.r, [1.5, 2.4, 3.6, 5, 7]); g.offset = 0; g.duty = 0.5; wire(ctx, 0, 'funcgen.out'); ctx.W.ch[0].sw = 10; ctx.W.ch[0].trim = 0.25; ctx.st.ch[0].probe = 10; ctx.st.ch[0].vIdx = OL.nearest(ctx.P.vdivs, 2 * 0.1 / 1); ctx.st.tdivIdx = OL.nearest(ctx.P.tdivs, 10e-3); ctx.st.trig.mode = 'auto'; },
  steps: [
    { title: 'Bien régler pour bien lire', html: '<p>Un signal se lit bien quand il occupe <b>le plus de carreaux possible</b> (4 à 7 en hauteur) et qu\'on voit <b>2 à 4 périodes</b>. Règle V/div et s/div (n\'utilise pas Autoset !), centre-le avec POSITION, stabilise-le avec le niveau de déclenchement.</p>',
      checks: [{ label: 'Signal de 4 à 7,4 carreaux de haut', ok: c => { const d = c.divPP(0); return d >= 4 && d <= 7.4; } }, { label: 'Entre 1,8 et 5 périodes affichées', ok: c => { const p = c.periods(0); return p >= 1.8 && p <= 5.2; } }, { label: 'Image stable (l\'appareil est déclenché)', ok: c => c.S.status === "TRIG'D" }] },
    { title: 'Lire et calculer', html: '<p>Relève les valeurs sur la grille (sans les mesures automatiques) puis réponds. Réponses acceptées à 8 % près.</p>',
      questions: [{ label: 'Amplitude crête-à-crête', unit: 'V', ans: c => c.B.gbf.amp, tol: 0.08 }, { label: 'Tension maximale (sommet)', unit: 'V', ans: c => c.B.gbf.amp / 2, tol: 0.1 }, { label: 'Période', unit: 'ms', ans: c => 1000 / c.B.gbf.freq, tol: 0.08 }, { label: 'Fréquence ($f = 1/T$)'.replace(/\$/g, ''), unit: 'Hz', ans: c => c.B.gbf.freq, tol: 0.08 }] }
  ]
});

OL.TPS.push({
  n: 5, id: 'couplage', title: 'Couplage DC, AC et GND', level: 'intermédiaire',
  goal: 'Le <b>couplage</b> décide ce que l\'oscilloscope laisse passer : tout (DC), seulement la partie variable (AC) ou rien (GND, pour repérer le zéro). Indispensable pour mesurer une petite ondulation posée sur une tension continue.',
  only: ['funcgen.out', 'dc.out'],
  setup: ctx => { const g = ctx.B.gbf; g.shape = 'sine'; g.freq = R.pick(ctx.r, [500, 1000, 2000]); g.amp = R.pick(ctx.r, [1, 2, 3]); g.offset = R.pick(ctx.r, [1.5, 2, 2.5, 3]); wire(ctx, 0, 'funcgen.out'); ctx.W.ch[0].sw = 10; ctx.W.ch[0].trim = 0.25; ctx.st.ch[0].probe = 10; ctx.st.ch[0].vIdx = OL.nearest(ctx.P.vdivs, 0.1); ctx.st.tdivIdx = OL.nearest(ctx.P.tdivs, 0.4 / g.freq); ctx.st.trig.level = g.offset; },
  steps: [
    { title: 'Trouver le zéro avec GND', html: '<p>Passe la voie 1 en couplage <b>GND</b> : l\'entrée est reliée à la masse, la trace plate montre où se trouve 0 V. Place-la sur la ligne centrale avec POSITION, puis repasse en <b>DC</b> : le signal est décalé par sa composante continue.</p>' + ds('<kbd>CH1</kbd> → <kbd>H1</kbd> (Coupling) → <kbd>F</kbd>.', '<kbd>CH1</kbd> → touche <b>Coupling</b> → bouton multifonction.'),
      checks: [{ label: 'Couplage GND utilisé', ok: c => c.st.ch[0].coup === 'gnd' }, { label: 'Retour en couplage DC avec le signal bien visible', ok: c => c.st.ch[0].coup === 'dc' && c.S.log.coupGnd && c.divPP(0) >= 2 }],
      questions: [{ label: 'Valeur moyenne (composante continue) du signal', unit: 'V', ans: c => c.B.gbf.offset, tol: 0.1 }] },
    { title: 'Couplage AC', html: '<p>Passe en <b>AC</b> : un condensateur à l\'entrée bloque la composante continue. Le signal se centre sur zéro.</p>',
      checks: [{ label: 'Couplage AC utilisé', ok: c => c.st.ch[0].coup === 'ac' }],
      questions: [{ label: 'En AC, tension maximale du signal', unit: 'V', ans: c => c.B.gbf.amp / 2, tol: 0.12 }, choice('Pour mesurer une ondulation de 50 mV sur une alimentation de 12 V, on choisit le couplage…', ['DC', 'AC', 'GND'], 1)] }
  ]
});

OL.TPS.push({
  n: 6, id: 'declenchement', title: 'Le déclenchement', level: 'intermédiaire',
  goal: 'Sans déclenchement correct, l\'image défile ou reste figée. Le déclenchement (<b>trigger</b>) dit à l\'appareil <b>quand</b> commencer à dessiner : sur quelle voie, à quel niveau, sur quelle pente.',
  only: ['funcgen.out'],
  setup: ctx => { const g = ctx.B.gbf; g.shape = 'sine'; g.freq = R.pick(ctx.r, [800, 1000, 1500]); g.amp = 4; g.offset = 1; wire(ctx, 0, 'funcgen.out'); ctx.W.ch[0].sw = 10; ctx.W.ch[0].trim = 0.25; ctx.st.ch[0].probe = 10; ctx.st.ch[0].vIdx = OL.nearest(ctx.P.vdivs, 0.1); ctx.st.tdivIdx = OL.nearest(ctx.P.tdivs, 0.4 / g.freq); ctx.st.trig.level = 0.3; ctx.st.trig.mode = 'auto'; },
  steps: [
    { title: 'Niveau hors du signal', html: '<p>Passe le déclenchement en mode <b>Normal</b>, puis tourne le bouton <b>LEVEL</b> pour mettre le niveau <b>au-dessus du signal</b> (le repère de niveau sort de la courbe). Observe l\'indicateur d\'état : l\'appareil <b>attend</b> un déclenchement qui n\'arrive jamais.</p>' + ds('<kbd>Trigger Menu</kbd> → <kbd>H5</kbd> → Normal', '<kbd>MODE</kbd> (voyant Normal) ou <kbd>MENU</kbd> trigger → Sweep'),
      checks: [{ label: 'Mode Normal choisi', ok: c => c.st.trig.mode === 'normal' }, { label: 'L\'appareil a été vu en attente (Ready / WAIT)', ok: c => c.S.log.sawWait }],
      questions: [choice('En mode Normal sans déclenchement, l\'écran…', ['défile sans arrêt', 'garde la dernière image', 'devient noir'], 1), choice('En mode Auto sans déclenchement, l\'écran…', ['défile : image instable', 'garde la dernière image', 'devient noir'], 0)] },
    { title: 'Stabiliser', html: '<p>Mets le niveau <b>à l\'intérieur</b> du signal (sur l\'OWON, la touche <kbd>50%</kbd> le fait pour toi) et choisis la <b>pente descendante</b>. Le signal doit devenir stable.</p>',
      checks: [{ label: 'Pente descendante choisie', ok: c => c.st.trig.slope === 'fall' }, { label: 'Niveau à l\'intérieur du signal', ok: c => { const s = c.sig(c.B.gbf, 'out'); return c.st.trig.level > s.min + 0.15 * s.pp && c.st.trig.level < s.max - 0.15 * s.pp; } }, { label: 'Image stable', ok: c => c.S.status === "TRIG'D" }] },
    { title: 'Lire le point de déclenchement', html: '<p>Mets le <b>niveau à 2 V</b> environ. Le point de déclenchement est au centre de l\'écran (marqueur T en haut).</p>',
      checks: [{ label: 'Niveau de déclenchement entre 1,5 V et 2,5 V', ok: c => c.st.trig.level > 1.5 && c.st.trig.level < 2.5 }],
      questions: [{ label: 'Tension du signal à l\'instant du déclenchement (au centre de l\'écran)', unit: 'V', ans: c => c.st.trig.level, abs: 0.35 }] }
  ]
});
})(typeof window !== 'undefined' ? window : globalThis);
