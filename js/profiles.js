/* profiles.js — caractéristiques propres à chaque oscilloscope */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};

OL.PROFILES = {
  owon: {
    id: 'owon', name: 'OWON SDS5032E(V)', nch: 2, bw: 30e6, bwProbeX1: 5e6,
    vdivs: OL.seq125(0.005, 5), tdivs: OL.seq125(5e-9, 100), autoMinF: 20, autoMinV: 0.005,
    srMax: 250e6, depth: 10000, compVpp: 5, compFreq: 1000,
    probes: [1, 10, 100, 1000], hdiv: 12, vdiv: 8,
    colors: ['#f2d200', '#1ec7f0', '#e24dc9', '#3c8dff'], posUnit: 'div',
    chNames: ['CH1', 'CH2'], rollFrom: 0.1, hasExt: true
  },
  rigol: {
    id: 'rigol', name: 'RIGOL DS1054Z', nch: 4, bw: 50e6, bwProbeX1: 6e6,
    vdivs: OL.seq125(0.001, 10), tdivs: OL.seq125(5e-9, 50), autoMinF: 41, autoMinV: 0.02,
    srMax: 1e9, depth: 12e6, compVpp: 3, compFreq: 1000,
    probes: [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000], hdiv: 12, vdiv: 8,
    colors: ['#f6e11a', '#19e0ff', '#ff3df0', '#2a73ff'], posUnit: 'V',
    chNames: ['CH1', 'CH2', 'CH3', 'CH4'], rollFrom: 0.2, hasExt: false
  }
};
OL.PROFILES.owon.sr = nCh => OL.PROFILES.owon.srMax;
/* profondeurs mémoire proposées (RIGOL) selon le nombre de voies actives ; 'auto' = la plus grande */
OL.PROFILES.rigol.memOpts = nCh => nCh <= 1 ? [12e3, 120e3, 1.2e6, 12e6] : nCh === 2 ? [6e3, 60e3, 600e3, 6e6] : [3e3, 30e3, 300e3, 3e6];
OL.PROFILES.rigol.sr = nCh => (nCh <= 1 ? 1e9 : nCh === 2 ? 5e8 : 2.5e8);
})(typeof window !== 'undefined' ? window : globalThis);
