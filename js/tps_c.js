/* tps_c.js — TP 17 : le bruit, le reconnaître et l'atténuer */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {}, R = OL.rnd, wire = OL.wire;
const choice = (q, opts, ans) => ({ label: q, opts, ans });

OL.TPS.push({
  n: 17, id: 'gerer-bruit', title: 'Le bruit : le reconnaître et l\'atténuer', level: 'avancé',
  goal: 'Un capteur délivre un petit signal <b>noyé dans le bruit</b> : trace épaisse, image qui tremble, lecture imprécise. On apprend à <b>régler l\'oscilloscope</b> pour atténuer le bruit sans perdre le signal : bande passante, déclenchement, moyennage, sensibilité.',
  only: ['noisy.out'],
  setup: c => { const n = c.B.noisy; n.freq = R.pick(c.r, [5000, 8000, 10000, 20000]); n.amp = R.pick(c.r, [0.16, 0.2, 0.24]); n.noise = 0.008; n.hum = 0; n.offset = 0; wire(c, 0, 'noisy.out'); c.W.ch[0].trim = 0.25; c.st.ch[0].probe = 10; c.st.ch[0].vIdx = OL.nearest(c.P.vdivs, 0.01); c.st.tdivIdx = OL.nearest(c.P.tdivs, 0.3 / n.freq); c.st.trig.level = 0; c.st.trig.mode = 'auto'; },
  steps: [
    { title: 'Reconnaître le bruit', html: '<p>Le signal du capteur est un sinus. Utilise <b>Autoset</b> puis observe la trace : elle est <b>épaisse et floue</b>, et l\'image <b>tremble</b> d\'un balayage à l\'autre.</p>',
      checks: [{ label: 'Autoset utilisé', ok: c => c.S.log.autoset > 0 }, { label: 'Signal bien cadré (3 à 7,4 carreaux)', ok: c => { const d = c.divPP(0); return d >= 3 && d <= 7.4; } }],
      questions: [choice('Cette « fourrure » sur la trace est…', ['un signal aléatoire et rapide ajouté au signal utile (le bruit)', 'le secteur 50 Hz', 'un défaut de compensation de la sonde'], 0), { label: 'Amplitude crête-à-crête du <b>signal utile</b> (lis au milieu de l\'épaisseur de la trace)', unit: 'V', ans: c => c.B.noisy.amp, tol: 0.25, hint: 'Ne compte pas les pointes isolées du bruit : lis au centre de la trace' }] },
    { title: 'Limiter la bande passante', html: '<p>Le signal utile est lent ; le bruit, lui, occupe <b>toutes les fréquences</b>. En limitant la bande passante, on laisse passer le signal et on coupe une partie du bruit. Active la limite <b>20 MHz</b> de la voie 1 et compare l\'épaisseur de la trace.</p>',
      checks: [{ label: 'Limite de bande passante 20 MHz activée sur la voie 1', ok: c => c.st.ch[0].bw20 }],
      questions: [choice('Limiter la bande passante à 20 MHz peut poser problème pour…', ['un signal sinusoïdal de 10 kHz', 'un signal carré de 5 MHz à fronts très rapides (les fronts seraient arrondis)', 'un signal continu'], 1)] },
    { title: 'Stabiliser le déclenchement', html: '<p>Le bruit atteint aussi le <b>circuit de déclenchement</b> : l\'oscilloscope démarre parfois sur un pic de bruit et non sur le signal, l\'image saute. Choisis le couplage de déclenchement <b>HF Reject</b> (rejet des hautes fréquences), et place le niveau <b>au milieu du signal</b>.</p>',
      checks: [{ label: 'Couplage de déclenchement : rejet HF (HF Reject)', ok: c => c.st.trig.coup === 'hf' }, { label: 'Niveau de déclenchement au milieu du signal', ok: c => Math.abs(c.st.trig.level) < 0.35 * c.B.noisy.amp * 0.5 * (c.st.ch[0].probe === c.W.ch[0].sw ? 1 : 0.1) + 0.01 }, { label: 'Image stable (appareil déclenché)', ok: c => c.S.status === "TRIG'D" }],
      questions: [choice('Un déclenchement qui « saute » sur un signal bruité vient de…', ['la pointe de la sonde qui est cassée', 'des pics de bruit qui franchissent le niveau avant le signal', 'la base de temps trop lente'], 1)] },
    { title: 'Moyenner les balayages', html: '<p>Le mode <b>moyenne</b> (Average) calcule la moyenne de plusieurs balayages successifs : le signal utile se répète à l\'identique, le bruit change à chaque fois et <b>s\'annule</b> (divisé par √N). Active-le avec <b>16 moyennes ou plus</b>. Sur le RIGOL, le mode <b>High Res</b> fait aussi une moyenne, sur des points voisins.</p>',
      checks: [{ label: 'Moyennage actif (16 moyennes ou plus) ou High Res', ok: c => (c.st.acq === 'avg' && c.st.avgN >= 16) || c.st.acq === 'hires' }],
      questions: [{ label: 'Amplitude crête-à-crête du signal utile, maintenant que le bruit est atténué', unit: 'V', ans: c => c.B.noisy.amp, tol: 0.1 }, choice('Le moyennage ne fonctionne bien que si le signal est…', ['répétitif et bien synchronisé (déclenchement stable)', 'unique, jamais répété', 'continu'], 0)] },
    { title: 'Bien lire', html: '<p>Dernier réglage : la <b>sensibilité</b>. Le signal doit occuper <b>4 à 7 carreaux</b> : plus il est grand, plus le bruit pèse peu dans la lecture. Mesure ensuite la fréquence.</p>',
      checks: [{ label: 'Signal de 4 à 7,4 carreaux de haut', ok: c => { const d = c.divPP(0); return d >= 4 && d <= 7.4; } }],
      questions: [{ label: 'Fréquence du signal', unit: 'kHz', ans: c => c.B.noisy.freq / 1000, tol: 0.06 }, choice('Quel réglage <b>ne</b> réduit <b>pas</b> le bruit à la lecture ?', ['limiter la bande passante à 20 MHz', 'moyenner les balayages', 'augmenter V/div jusqu\'à ce que le bruit « disparaisse »', 'déclencher en rejet HF'], 2)] }
  ],
  note: 'Remarque : augmenter V/div fait disparaître le bruit… et le signal avec lui. Mieux vaut atténuer le bruit que le cacher.'
});
})(typeof window !== 'undefined' ? window : globalThis);
