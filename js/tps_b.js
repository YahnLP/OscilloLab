/* tps_b.js — TP 7 à 16 : mesures, curseurs, NE555, pont, RC, déphasage, XY, capture unique, bruit, masse */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {}, ds = OL.ds, R = OL.rnd, wire = OL.wire;
const choice = (q, opts, ans) => ({ label: q, opts, ans });
const curOn = c => c.U.cur && ((c.U.cur.type !== undefined && c.U.cur.type !== 'off' && c.dev === 'owon') || (c.dev === 'rigol' && c.U.cur.mode !== 'off'));
const goodView = (i, lo, hi, p0, p1) => c => { const d = c.divPP(i), p = c.periods(i); return d >= lo && d <= hi && p >= p0 && p <= p1 && c.S.status === "TRIG'D"; };
const stdCh = (c, i, base) => { c.st.ch[i].on = true; c.st.ch[i].probe = 10; c.st.ch[i].vIdx = OL.nearest(c.P.vdivs, base || 0.1); };

OL.TPS.push({
  n: 7, id: 'mesures-auto', title: 'Les mesures automatiques', level: 'intermédiaire',
  goal: 'L\'oscilloscope calcule pour toi la fréquence, la tension crête-à-crête, la valeur efficace, le rapport cyclique… Mais il faut <b>savoir les demander</b> et surtout <b>savoir si elles ont un sens</b>.',
  only: ['funcgen.out'],
  setup: c => { const g = c.B.gbf; g.shape = 'square'; g.freq = R.pick(c.r, [1200, 2000, 3000]); g.amp = 5; g.offset = 2.5; g.duty = R.pick(c.r, [0.2, 0.3, 0.4, 0.6]); wire(c, 0, 'funcgen.out'); c.W.ch[0].trim = 0.25; stdCh(c, 0); c.st.tdivIdx = OL.nearest(c.P.tdivs, 0.3 / g.freq); c.st.trig.level = 2.5; },
  steps: [
    { title: 'Afficher des mesures', html: '<p>Règle l\'écran pour voir 2 à 4 périodes, puis affiche les mesures <b>fréquence</b>, <b>tension crête-à-crête</b> et <b>rapport cyclique positif</b>.</p><p>' + ds('<kbd>Measure</kbd> → <kbd>H3</kbd> (Time) → Freq, +Duty ; <kbd>H2</kbd> (Voltage) → Pk-Pk.', '<kbd>Measure</kbd> → touches <b>Horizontal</b> (Freq, +Duty) et <b>Vertical</b> (Vpp). Ou la touche <b>MENU</b> à gauche de l\'écran : mesures rapides.') + '</p>',
      checks: [{ label: 'Image stable avec 1,8 à 5 périodes', ok: goodView(0, 3, 7.4, 1.8, 5.2) }, { label: 'Mesure de fréquence affichée', ok: c => c.hasMeas('freq') }, { label: 'Mesure de rapport cyclique + affichée', ok: c => c.hasMeas('pduty') }, { label: 'Mesure crête-à-crête affichée', ok: c => c.hasMeas('pp') }] },
    { title: 'Lire et interpréter', html: '<p>Lis les mesures affichées, puis calcule la <b>valeur moyenne</b> et la <b>valeur efficace</b> d\'un signal rectangulaire 0 – 5 V : $\\langle u\\rangle = \\alpha\\,U_{max}$ et $U_{eff} = U_{max}\\sqrt{\\alpha}$ (α = rapport cyclique).'.replace(/\$[^$]*\$/g, m => m.slice(1, -1).replace('\\langle u\\rangle', '<u>').replace('\\alpha\\,U_{max}', 'α·Umax').replace('U_{eff}', 'Ueff').replace('U_{max}\\sqrt{\\alpha}', 'Umax·√α')),
      questions: [{ label: 'Fréquence', unit: 'Hz', ans: c => c.B.gbf.freq, tol: 0.03 }, { label: 'Rapport cyclique α', unit: '%', ans: c => c.B.gbf.duty * 100, tol: 0.06 }, { label: 'Valeur moyenne calculée', unit: 'V', ans: c => 5 * c.B.gbf.duty, tol: 0.06 }, { label: 'Valeur efficace calculée', unit: 'V', ans: c => 5 * Math.sqrt(c.B.gbf.duty), tol: 0.06 }] }
  ]
});

OL.TPS.push({
  n: 8, id: 'curseurs', title: 'Mesurer avec les curseurs', level: 'intermédiaire',
  goal: 'Les <b>curseurs</b> sont deux lignes que tu places sur l\'écran : l\'appareil affiche la différence. Précis et indispensable pour mesurer un temps ou une tension entre deux points choisis.',
  only: ['funcgen.out'],
  setup: c => { const g = c.B.gbf; g.shape = 'triangle'; g.freq = R.pick(c.r, [400, 500, 800, 1000]); g.amp = R.pick(c.r, [3, 4, 5, 6]); g.offset = 0; wire(c, 0, 'funcgen.out'); c.W.ch[0].trim = 0.25; stdCh(c, 0); c.st.ch[0].vIdx = OL.nearest(c.P.vdivs, 0.1 * 1); c.st.tdivIdx = OL.nearest(c.P.tdivs, 0.5 / g.freq); },
  steps: [
    { title: 'Régler la vue', html: '<p>Règle l\'écran pour voir 2 à 4 périodes du triangle sur 4 à 7 carreaux de haut.</p>', checks: [{ label: 'Image bien cadrée et stable', ok: goodView(0, 4, 7.4, 1.8, 5.2) }] },
    { title: 'Curseurs de tension', html: '<p>' + ds('<kbd>Cursor</kbd> → <kbd>H1</kbd> Type → <b>Voltage</b>. Les <b>deux boutons VERTICAL POSITION</b> déplacent les deux curseurs.', '<kbd>Cursor</kbd> → Mode <b>Manual</b>, Type <b>Y</b>. Le <b>bouton multifonction</b> déplace le curseur choisi (CurA, CurB).') + '</p><p>Place un curseur sur un sommet et l\'autre sur le creux.</p>',
      checks: [{ label: 'Curseurs affichés', ok: c => curOn(c) }], questions: [{ label: 'Tension entre sommet et creux (ΔU)', unit: 'V', ans: c => c.B.gbf.amp, tol: 0.06 }] },
    { title: 'Curseurs de temps', html: '<p>Passe en curseurs de <b>temps</b> et place-les sur deux sommets consécutifs.</p>', checks: [{ label: 'Curseurs de temps affichés', ok: c => c.dev === 'owon' ? c.U.cur.type === 't' : c.U.cur.mode !== 'off' && c.U.cur.type === 'x' }],
      questions: [{ label: 'Durée entre deux sommets (période)', unit: 'ms', ans: c => 1000 / c.B.gbf.freq, tol: 0.06 }, { label: 'Fréquence ($1/\\Delta T$)'.replace('$1/\\Delta T$', '1/ΔT'), unit: 'Hz', ans: c => c.B.gbf.freq, tol: 0.06 }] }
  ]
});

OL.TPS.push({
  n: 9, id: 'ne555', title: 'Signal d\'un NE555 : fréquence et rapport cyclique', level: 'intermédiaire',
  goal: 'Un NE555 monté en astable fournit un signal rectangulaire. On <b>mesure</b> sa fréquence et son rapport cyclique, puis on les compare au <b>calcul</b>.',
  only: ['ne555.out', 'ne555.cap'],
  setup: c => { const n = c.B.ne555; n.vcc = 9; n.R1 = R.pick(c.r, [1000, 2200, 4700]); n.R2 = R.pick(c.r, [10000, 22000, 47000]); n.C = R.pick(c.r, [10e-9, 22e-9, 47e-9, 100e-9]); wire(c, 0, 'ne555.out'); c.W.ch[0].trim = 0.25; stdCh(c, 0); c.st.tdivIdx = OL.nearest(c.P.tdivs, 0.35 / n.freq()); c.st.trig.level = 4; },
  steps: [
    { title: 'Observer la sortie', html: (c) => '<p>Sortie du NE555 sur la voie 1. Composants : $R_1$ = ' + OL.fmt(c.B.ne555.R1, 'Ω', 3) + ', $R_2$ = ' + OL.fmt(c.B.ne555.R2, 'Ω', 3) + ', $C$ = ' + OL.fmt(c.B.ne555.C, 'F', 3) + '. Alimentation 9 V.</p>'.replace(/\$/g, '') + '<p>Affiche 2 à 4 périodes stables et mesure <b>fréquence</b> et <b>rapport cyclique +</b>.</p>',
      checks: [{ label: 'Image stable (1,8 à 5 périodes)', ok: goodView(0, 3, 7.4, 1.8, 5.2) }, { label: 'Fréquence et rapport cyclique affichés (mesures auto)', ok: c => c.hasMeas('freq') && c.hasMeas('pduty') }],
      questions: [{ label: 'Fréquence mesurée', unit: 'Hz', ans: c => c.B.ne555.freq(), tol: 0.05 }, { label: 'Rapport cyclique mesuré', unit: '%', ans: c => c.B.ne555.duty() * 100, tol: 0.05 }] },
    { title: 'Comparer au calcul', html: '<p>Pour un NE555 astable : $T_H = 0{,}693\\,(R_1+R_2)\\,C$ ; $T_L = 0{,}693\\,R_2\\,C$ ; $f = 1/(T_H+T_L)$ ; $\\alpha = T_H/(T_H+T_L)$.</p>'.replace(/\$([^$]*)\$/g, (m, x) => x.replace(/\\,/g, ' ').replace(/\\alpha/g, 'α').replace(/\{,\}/g, ',').replace(/[{}]/g, '').replace(/_/g, '')),
      questions: [{ label: 'Durée de l\'état haut calculée', unit: 'ms', ans: c => 693 * (c.B.ne555.R1 + c.B.ne555.R2) * c.B.ne555.C, tol: 0.03, show: v => v.toFixed(3) + ' ms' }, { label: 'Fréquence calculée', unit: 'Hz', ans: c => c.B.ne555.freq(), tol: 0.03 }, choice('Le rapport cyclique est toujours supérieur à 50 % car…', ['R1 est toujours plus grande que R2', 'le condensateur se charge à travers R1 + R2 mais se décharge seulement à travers R2', 'la tension d\'alimentation est trop faible'], 1)] }
  ]
});

OL.TPS.push({
  n: 10, id: 'pont-diodes', title: 'Redressement : le pont de diodes', level: 'avancé',
  goal: 'Observer la tension avant et après un pont de diodes, repérer la chute de tension de deux diodes, puis mesurer l\'<b>ondulation</b> après filtrage avec le couplage AC.',
  only: ['bridge.sec', 'bridge.out'],
  setup: c => { const b = c.B.bridge; b.veff = R.pick(c.r, [6, 9, 12]); b.C = 0; b.R = 1000; b.vd = 0.7; wire(c, 0, 'bridge.sec'); c.W.ch[0].trim = 0.25; stdCh(c, 0, 0.5 / 1); c.st.ch[0].vIdx = OL.nearest(c.P.vdivs, 0.2); c.st.tdivIdx = OL.nearest(c.P.tdivs, 5e-3); c.st.trig.level = 0; },
  note: 'Sécurité : toutes les masses de sonde sont reliées entre elles (et à la terre). Ne branche jamais deux pinces de masse sur deux points différents d\'un montage.',
  steps: [
    { title: 'Tension du secondaire', html: '<p>La voie 1 est sur le <b>secondaire du transformateur</b> (alternatif 50 Hz). Règle pour voir 2 périodes et lis la tension maximale.</p>',
      checks: [{ label: 'Image stable, 1,8 à 5 périodes, signal bien lisible', ok: goodView(0, 3, 7.4, 1.8, 5.2) }], questions: [{ label: 'Tension maximale du secondaire', unit: 'V', ans: c => c.B.bridge.veff * Math.SQRT2, tol: 0.08 }, { label: 'Valeur efficace correspondante ($U_{max}/\\sqrt 2$)'.replace(/\$[^$]*\$/, 'Umax/√2'), unit: 'V', ans: c => c.B.bridge.veff, tol: 0.08 }] },
    { title: 'Après le pont', html: '<p>Déplace la sonde sur la <b>sortie du pont</b> (liste « Branchements »). Observe : toutes les alternances sont devenues positives.</p>',
      checks: [{ label: 'Voie 1 sur la sortie du pont', ok: c => c.node(0) === 'bridge.out' }, { label: 'Image stable', ok: goodView(0, 2, 7.4, 1.8, 8) }],
      questions: [{ label: 'Tension maximale en sortie du pont', unit: 'V', ans: c => c.B.bridge.veff * Math.SQRT2 - 1.4, abs: 0.5, show: v => v.toFixed(1) + ' V' }, { label: 'Fréquence de la tension redressée', unit: 'Hz', ans: 100, tol: 0.06 }, choice('Pourquoi la tension max baisse d\'environ 1,4 V ?', ['le transformateur chauffe', 'deux diodes (2 × 0,7 V) conduisent en série', 'la sonde est mal compensée'], 1)] },
    { title: 'Filtrage et ondulation', html: '<p>Dans « Montages → Pont de diodes », mets un condensateur de <b>470 µF</b>. La tension devient presque continue avec une petite <b>ondulation</b>. Pour la mesurer : couplage <b>AC</b> et V/div plus petit.</p>',
      checks: [{ label: 'Condensateur de filtrage ≥ 100 µF branché', ok: c => c.B.bridge.C >= 100e-6 }, { label: 'Couplage AC utilisé', ok: c => c.st.ch[0].coup === 'ac' }, { label: 'Ondulation lisible (≥ 2 carreaux)', ok: c => c.divPP(0) >= 2 }],
      questions: [{ label: 'Ondulation crête-à-crête', unit: 'V', ans: c => c.sig(c.B.bridge, 'out').pp, tol: 0.15, show: v => v.toFixed(2) + ' V' }] }
  ]
});

OL.TPS.push({
  n: 11, id: 'rc-tau', title: 'Charge d\'un condensateur : mesurer τ', level: 'avancé',
  goal: 'Un condensateur se charge selon une courbe exponentielle de constante de temps $\\tau = R\\,C$. On la mesure sur l\'écran avec la règle des <b>63 %</b>.'.replace(/\$[^$]*\$/, 'τ = R·C'),
  only: ['rcstep.in', 'rcstep.vc'],
  setup: c => { const r = c.B.rc; r.R = R.pick(c.r, [4700, 10000, 22000]); r.C = R.pick(c.r, [47e-9, 100e-9, 220e-9]); r.E = 5; r.freq = 1 / (12 * r.R * r.C); wire(c, 0, 'rcstep.in'); wire(c, 1, 'rcstep.vc'); c.W.ch[0].trim = 0.25; if (c.W.ch[1]) c.W.ch[1].trim = 0.4; stdCh(c, 0, 0.1); if (c.P.nch > 1) { stdCh(c, 1, 0.1); c.st.ch[1].pos = 0; } c.st.tdivIdx = OL.nearest(c.P.tdivs, r.R * r.C); c.st.trig.level = 2.5; },
  steps: [
    { title: 'Observer les deux tensions', html: c => '<p>Voie 1 : tension d\'entrée E (carré 0 – 5 V). Voie 2 : tension $U_C$ aux bornes du condensateur. $R$ = ' + OL.fmt(c.B.rc.R, 'Ω', 3) + ', $C$ = ' + OL.fmt(c.B.rc.C, 'F', 3) + '. Règle pour voir une charge complète (la courbe monte puis se stabilise).</p>'.replace(/\$/g, ''),
      checks: [{ label: 'Voie 2 active et image stable', ok: c => c.st.ch[1] && c.st.ch[1].on && c.S.status === "TRIG'D" }, { label: 'Une charge complète est visible (≈ 5 τ sur 3 à 9 carreaux)', ok: c => { const tau = c.B.rc.R * c.B.rc.C, w = 5 * tau / c.S.tdiv(); return w >= 3 && w <= 9; } }] },
    { title: 'Mesurer τ', html: '<p>À $t = \\tau$, $U_C$ vaut <b>63 %</b> de E.'.replace('$t = \\tau$', 't = τ').replace('$U_C$', 'Uc') + ' Calcule 0,63 × E, lis le temps nécessaire (curseurs conseillés) depuis le début de la charge.</p>',
      checks: [{ label: 'Curseurs utilisés', ok: c => curOn(c) }],
      questions: [{ label: 'Tension $U_C$ à t = τ'.replace('$U_C$', 'Uc'), unit: 'V', ans: c => 0.632 * c.B.rc.E, tol: 0.04 }, { label: 'Constante de temps mesurée τ', unit: 'ms', ans: c => c.B.rc.R * c.B.rc.C * 1000, tol: 0.12, show: v => v.toFixed(3) + ' ms' }, { label: 'Durée pour atteindre ≈ 99 % (5τ)', unit: 'ms', ans: c => 5 * c.B.rc.R * c.B.rc.C * 1000, tol: 0.15, show: v => v.toFixed(2) + ' ms' }, { label: 'τ calculée avec R × C', unit: 'ms', ans: c => c.B.rc.R * c.B.rc.C * 1000, tol: 0.03 }] }
  ]
});

OL.TPS.push({
  n: 12, id: 'dephasage', title: 'Mesurer un déphasage', level: 'examen',
  goal: 'Deux signaux de même fréquence, décalés dans le temps : on mesure le <b>retard Δt</b> et la <b>période T</b>, puis on calcule le déphasage $\\varphi = 360° \\times \\Delta t / T$.'.replace('$\\varphi = 360° \\times \\Delta t / T$', 'φ = 360° × Δt / T'),
  only: ['rcfilter.in', 'rcfilter.out', 'probecomp.out'],
  setup: c => { const f = c.B.rcf; f.type = 'low'; f.R = R.pick(c.r, [1000, 2200, 4700]); f.C = 100e-9; f.amp = 4; const ratio = R.pick(c.r, [0.5, 1, 2]); f.freq = Math.round(f.fc() * ratio / 10) * 10; wire(c, 0, 'rcfilter.in'); wire(c, 1, 'rcfilter.out'); c.W.ch[0].trim = 0.9; c.W.ch[1].trim = 0.1; stdCh(c, 0, 0.1); if (c.P.nch > 1) stdCh(c, 1, 0.1); c.st.ch[1].pos = 0; c.st.tdivIdx = OL.nearest(c.P.tdivs, 0.3 / f.freq); },
  steps: [
    { title: 'Compenser les deux sondes', html: '<p>Une sonde mal compensée <b>retarde</b> légèrement son signal : la mesure de phase serait fausse. Compense d\'abord les deux sondes : branche-les temporairement sur « Sortie de compensation (appareil) » (liste « Branchements »), règle les vis comme au TP 2, puis remets la voie 1 sur l\'entrée du filtre et la voie 2 sur sa sortie.</p>',
      checks: [{ label: 'Sonde 1 compensée', ok: c => Math.abs(c.rho(0) - 1) < 0.08 }, { label: 'Sonde 2 compensée', ok: c => Math.abs(c.rho(1) - 1) < 0.08 }] },
    { title: 'Afficher les deux voies', html: '<p>Voie 1 = entrée du filtre RC, voie 2 = sortie. Les deux masses sont communes. Déclenche sur la <b>voie 1</b>, mets les <b>deux traces au même niveau de zéro</b> (POSITION) et le même nombre de carreaux si possible.</p>',
      checks: [{ label: 'Déclenchement sur la voie 1', ok: c => c.st.trig.src === 0 }, { label: 'Voie 2 affichée', ok: c => c.st.ch[1].on }, { label: 'Deux à cinq périodes visibles, image stable', ok: goodView(0, 3, 7.4, 1.8, 5.2) }, { label: 'Les deux zéros sont superposés (positions identiques)', ok: c => Math.abs(c.st.ch[0].pos - c.st.ch[1].pos) < 0.3 }] },
    { title: 'Mesurer et calculer', html: '<p>Place les curseurs de temps sur deux <b>passages à zéro montants</b> (un par voie) pour lire Δt. Ou utilise la mesure automatique ' + ds('<b>Delay</b> (Measure → H4)', '<b>Delay A↑B↑</b> (Measure → Delay)') + '.</p>',
      checks: [{ label: 'Curseurs ou mesure Delay utilisés', ok: c => curOn(c) || (c.U.meas || []).some(m => m.delay) }],
      questions: [{ label: 'Période T', unit: 'µs', ans: c => 1e6 / c.B.rcf.freq, tol: 0.06 }, { label: 'Retard Δt entre les deux signaux (valeur positive)', unit: 'µs', ans: c => Math.abs(c.B.rcf.phaseDeg()) / 360 * 1e6 / c.B.rcf.freq, tol: 0.15, show: v => v.toFixed(1) + ' µs' }, { label: 'Déphasage |φ|', unit: '°', ans: c => Math.abs(c.B.rcf.phaseDeg()), abs: 7, show: v => v.toFixed(0) + '°' }, choice('La sortie du filtre passe-bas est…', ['en avance sur l\'entrée', 'en retard sur l\'entrée', 'en phase avec l\'entrée'], 1)] }
  ],
  note: 'Dans l\'exemple, le gain du filtre est aussi mesurable : Us/Ue = 1 / √(1 + (f/fc)²).'
});

OL.TPS.push({
  n: 13, id: 'xy-lissajous', title: 'Mode XY : déphasage avec l\'ellipse', level: 'examen',
  goal: 'En mode <b>XY</b>, la voie 1 commande l\'axe horizontal et la voie 2 l\'axe vertical : deux sinus de même fréquence dessinent une <b>ellipse</b> dont la forme donne le déphasage.',
  only: ['rcfilter.in', 'rcfilter.out'],
  setup: c => { const f = c.B.rcf; f.type = 'low'; f.R = 1000; f.C = 100e-9; f.amp = 4; f.freq = R.pick(c.r, [800, 1600, 3200]); wire(c, 0, 'rcfilter.in'); wire(c, 1, 'rcfilter.out'); c.W.ch[0].trim = 0.25; c.W.ch[1].trim = 0.4; stdCh(c, 0, 0.1); stdCh(c, 1, 0.05); c.st.ch[1].pos = 0; c.st.ch[0].pos = 0; c.st.tdivIdx = OL.nearest(c.P.tdivs, 0.3 / f.freq); },
  steps: [
    { title: 'Passer en XY', html: '<p>' + ds('<kbd>Display</kbd> → <kbd>H2</kbd> Format → <b>XY</b>', '<kbd>Horizontal MENU</kbd> → Time Base → <b>XY</b>') + '. Mets les deux positions à 0 pour centrer l\'ellipse.</p>',
      checks: [{ label: 'Mode XY actif', ok: c => c.st.xy }, { label: 'Ellipse centrée (positions des voies à zéro)', ok: c => Math.abs(c.st.ch[0].pos) < 0.2 && Math.abs(c.st.ch[1].pos) < 0.2 }] },
    { title: 'Lire le déphasage', html: '<p>$\\sin\\varphi = Y_0 / Y_{max}$ : $Y_{max}$ = demi-hauteur de l\'ellipse, $Y_0$ = ordonnée où l\'ellipse coupe l\'axe vertical (x = 0).'.replace(/\$[^$]*\$/g, m => ({ '$\\sin\\varphi = Y_0 / Y_{max}$': 'sin φ = Y0 / Ymax', '$Y_{max}$': 'Ymax', '$Y_0$': 'Y0' })[m] || m) + ' Mesure en carreaux, puis calcule φ.</p>',
      questions: [{ label: 'Déphasage |φ| trouvé avec l\'ellipse', unit: '°', ans: c => Math.abs(c.B.rcf.phaseDeg()), abs: 9, show: v => v.toFixed(0) + '°' }] }
  ]
});

OL.TPS.push({
  n: 14, id: 'single-rebonds', title: 'Capture unique : les rebonds d\'un bouton', level: 'avancé',
  goal: 'Un événement qui ne se produit <b>qu\'une fois</b> (appui sur un bouton poussoir) se capture en mode <b>Single</b> : l\'appareil attend le déclenchement, enregistre, puis s\'arrête. On observe ainsi les <b>rebonds</b> du contact.',
  only: ['push.out'],
  setup: c => { c.B.push.bounce = true; c.B.push.release(); wire(c, 0, 'push.out'); c.W.ch[0].trim = 0.25; stdCh(c, 0, 0.1); c.st.ch[0].vIdx = OL.nearest(c.P.vdivs, 0.5); c.st.tdivIdx = OL.nearest(c.P.tdivs, 1e-3); c.st.trig.level = 0.5; c.st.trig.mode = 'auto'; c.st.hdelay = 0; },
  steps: [
    { title: 'Armer l\'appareil', html: '<p>Règle ≈ 500 µs/div, déclenche sur <b>front montant</b> à ≈ 2,5 V (niveau bien au milieu entre 0 et 5 V), puis appuie sur <kbd>' + ds('Single', 'SINGLE') + '</kbd> : l\'appareil attend. Place le point de déclenchement vers la <b>gauche</b> de l\'écran avec HORIZONTAL POSITION pour voir la suite.</p>',
      checks: [{ label: 'Niveau de déclenchement entre 1 V et 4 V, pente montante', ok: c => c.st.trig.level > 1 && c.st.trig.level < 4 && c.st.trig.slope === 'rise' }, { label: 'Appareil armé (Single)', ok: c => c.S.status === 'WAIT' && !c.st.run || c.S.log.single || c.st.single }] },
    { title: 'Appuyer sur le bouton', html: '<p>Dans « Montages → Bouton poussoir », clique sur <b>Appuyer</b>. L\'appareil capture puis s\'arrête.</p>', checks: [{ label: 'Capture réalisée (appareil arrêté après déclenchement)', ok: c => c.S.log.single }] },
    { title: 'Analyser', html: '<p>Observe la capture figée. Utilise les curseurs pour mesurer la durée pendant laquelle le contact est instable.</p>',
      questions: [{ label: 'Nombre d\'impulsions (états hauts parasites) avant l\'état stable', unit: '', ans: c => c.B.push.pat.length || 1, abs: 0, hint: 'Compte chaque palier à 5 V avant la fin des rebonds' }, { label: 'Durée de l\'instabilité', unit: 'ms', ans: c => (c.B.push.tstable - 0.0001) * 1000, abs: 0.5, show: v => v.toFixed(1) + ' ms' }, choice('Pour éviter qu\'un microcontrôleur compte plusieurs appuis, on peut…', ['augmenter la tension d\'alimentation', 'filtrer avec un RC ou ignorer les changements pendant quelques ms (anti-rebond)', 'utiliser un câble plus long'], 1)] }
  ]
});

OL.TPS.push({
  n: 15, id: 'bruit-moyenne', title: 'Réduire le bruit : la moyenne', level: 'avancé',
  goal: 'Un petit signal est noyé dans le bruit. Le mode d\'acquisition <b>Average</b> (moyennage) calcule la moyenne de plusieurs balayages : le bruit s\'efface, le signal reste.',
  only: ['funcgen.out'],
  setup: c => { const g = c.B.gbf; g.shape = 'sine'; g.freq = 1000; g.amp = R.pick(c.r, [0.006, 0.008, 0.01]); g.offset = 0; wire(c, 0, 'funcgen.out'); c.W.ch[0].sw = 1; c.W.ch[0].trim = 0.5; c.st.ch[0].probe = 1; c.st.ch[0].vIdx = OL.nearest(c.P.vdivs, 0.002); c.st.tdivIdx = OL.nearest(c.P.tdivs, 250e-6); c.st.trig.level = 0; c.st.trig.mode = 'auto'; c.st.trig.coup = 'dc'; },
  steps: [
    { title: 'Voir le bruit', html: '<p>Sonde en <b>×1</b> (c\'est la plus sensible, elle ne divise pas la tension). Le signal est très petit : mets la sensibilité à 2 mV/div (ou 1 mV/div). La trace est épaisse et tremblante : c\'est le bruit.</p>', checks: [{ label: 'Sensibilité ≤ 2 mV/div', ok: c => Math.abs(c.S.vdivLabel(0)) <= 0.0021 }] },
    { title: 'Moyenner', html: '<p>' + ds('<kbd>Acquire</kbd> → Mode <b>Average</b>, puis <b>Averages</b> = 64.', '<kbd>Acquire</kbd> → Acquisition <b>Averages</b>, puis <b>Averages</b> = 64.') + '</p>',
      checks: [{ label: 'Mode moyennage actif', ok: c => c.st.acq === 'avg' }, { label: '16 balayages ou plus', ok: c => c.st.avgN >= 16 }],
      questions: [{ label: 'Amplitude crête-à-crête du signal', unit: 'mV', ans: c => c.B.gbf.amp * 1000, tol: 0.2 }] }
  ]
});

OL.TPS.push({
  n: 16, id: 'masse', title: 'La pince de masse oubliée', level: 'débutant',
  goal: 'Une sonde dont la pince de masse n\'est pas branchée capte tout le <b>bruit ambiant</b>, dont les 50 Hz du secteur. L\'oscilloscope ne le dit pas : il faut reconnaître le défaut.',
  only: ['funcgen.out'],
  setup: c => { const g = c.B.gbf; g.shape = 'sine'; g.freq = 1000; g.amp = 2; g.offset = 0; wire(c, 0, 'funcgen.out'); c.W.ch[0].ground = false; c.W.ch[0].trim = 0.25; stdCh(c, 0, 0.1); c.st.ch[0].vIdx = OL.nearest(c.P.vdivs, 0.1); c.st.tdivIdx = OL.nearest(c.P.tdivs, 5e-3); c.st.trig.mode = 'auto'; c.st.trig.level = 0; },
  steps: [
    { title: 'Reconnaître le défaut', html: '<p>La sonde est branchée sur le générateur, mais la trace ondule bizarrement. Regarde bien une durée de 20 à 50 ms : un motif <b>se répète à cadence régulière</b>.</p>',
      questions: [{ label: 'Fréquence du motif parasite (lis sa période sur l\'écran)', unit: 'Hz', ans: 50, tol: 0.15 }] },
    { title: 'Réparer', html: '<p>Coche « pince de masse » dans les branchements. Le parasite doit disparaître.</p>', checks: [{ label: 'Pince de masse branchée', ok: c => c.W.ch[0].ground !== false }] }
  ]
});
})(typeof window !== 'undefined' ? window : globalThis);
