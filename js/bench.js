/* bench.js — paillasse : générateur, montages, branchements des sondes */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};
const E = OL.el;

/* champ numérique avec unité sélectionnable : units = [[nom, facteur], ...] */
function numField(parent, label, get, set, units, o) {
  o = o || {}; const row = E('div', 'row', parent); E('label', '', row, null, label);
  const inp = E('input', '', row); inp.type = 'number'; inp.step = 'any';
  let u = null; const un = units || [['', 1]];
  if (un.length > 1) { u = E('select', '', row); un.forEach((x, i) => E('option', '', u, null, x[0]).value = i); } else if (un[0][0]) E('span', 'hint', row, null, un[0][0]);
  const pick = v => { let k = 0, best = -1; for (let i = 0; i < un.length; i++) { if (Math.abs(v) >= un[i][1] * 0.9999 && un[i][1] > best) { best = un[i][1]; k = i; } } if (best < 0) { let m = 0; for (let i = 1; i < un.length; i++) if (un[i][1] < un[m][1]) m = i; k = m; } return k; };
  const show = () => { const v = get(), k = u ? +u.value : 0; if (u && document.activeElement !== inp && document.activeElement !== u) u.value = pick(v); const f = un[u ? +u.value : 0][1]; if (document.activeElement !== inp) inp.value = +(v / f).toPrecision(5); };
  const apply = () => { const f = un[u ? +u.value : 0][1]; const v = parseFloat(inp.value); if (isFinite(v)) { set(v * f); if (o.after) o.after(); } };
  inp.addEventListener('input', apply); inp.addEventListener('change', apply); if (u) u.addEventListener('change', apply);
  inp.addEventListener('wheel', e => { e.preventDefault(); const f = un[u ? +u.value : 0][1]; const v = get(); set(Math.max(0, v + (e.deltaY < 0 ? 1 : -1) * f * (o.wheel || 1))); show(); if (o.after) o.after(); }, { passive: false });
  show(); row.refresh = show; return row;
}
OL.numField = numField;

OL.Bench = function (parent, App, opts) {
  const B = this; opts = opts || {}; B.App = App;
  B.root = parent; B.pw = parent.querySelector('[data-p=wire]'); B.pg = parent.querySelector('[data-p=gbf]'); B.pm = parent.querySelector('[data-p=mont]');
  B.refreshers = [];
  /* options de branchement */
  B.nodeList = () => {
    const b = App.bench, l = [['', '— non connecté —']];
    const add = (src, key, txt) => { if (!opts.only || opts.only.indexOf(src.kind + '.' + key) >= 0) l.push([src.kind + '.' + key, txt]); };
    add(b.comp, 'out', 'Sortie de compensation (appareil)'); add(b.gbf, 'out', 'Générateur de fonctions — sortie');
    add(b.bridge, 'sec', 'Pont de diodes — secondaire du transformateur'); add(b.bridge, 'out', 'Pont de diodes — sortie redressée');
    add(b.ne555, 'out', 'NE555 — sortie (broche 3)'); add(b.ne555, 'cap', 'NE555 — condensateur (broches 2-6)');
    add(b.rc, 'in', 'RC — tension d\'entrée E'); add(b.rc, 'vc', 'RC — tension Uc aux bornes de C');
    add(b.rcf, 'in', 'Filtre RC — entrée Ue'); add(b.rcf, 'out', 'Filtre RC — sortie Us');
    add(b.push, 'out', 'Bouton poussoir — sortie'); add(b.noisy, 'out', 'Capteur bruité — sortie');
    add(b.uart, 'tx', 'Liaison série UART — TX'); add(b.uart, 'rx', 'Liaison série UART — RX');
    add(b.i2c, 'scl', 'Bus I²C — SCL'); add(b.i2c, 'sda', 'Bus I²C — SDA');
    add(b.spi, 'sclk', 'Bus SPI — SCLK'); add(b.spi, 'mosi', 'Bus SPI — MOSI'); add(b.spi, 'miso', 'Bus SPI — MISO'); add(b.spi, 'cs', 'Bus SPI — CS'); add(b.dc, 'out', 'Alimentation continue');
    return l;
  };
  B.find = id => { const [k, key] = id.split('.'); const src = Object.values(App.bench).find(s => s && s.kind === k); return src ? { src, key } : null; };
  B.build();
};
OL.Bench.prototype.build = function () {
  const B = this, App = B.App, P = App.scope.P, W = App.scope.bench;
  B.pw.innerHTML = ''; B.pg.innerHTML = ''; B.pm.innerHTML = '';
  const c1 = E('div', 'card', B.pw); E('h3', '', c1, null, '⠿ '+'Branchements des sondes' + ' <span class="hint" style="float:right">déplaçable · Échap pour fermer</span>');
  for (let i = 0; i < P.nch; i++) {
    const row = E('div', 'row', c1); const lab = E('label', '', row, null, '<span class="chdot" style="background:' + App.ui.colors[i] + '"></span>' + P.chNames[i]);
    const sel = E('select', '', row); B.nodeList().forEach(([v, t]) => { const o = E('option', '', sel, null, t); o.value = v; });
    const cur = W.ch[i] && W.ch[i].node ? W.ch[i].node.src.kind + '.' + W.ch[i].node.key : ''; sel.value = cur;
    sel.addEventListener('change', () => { const n = sel.value ? B.find(sel.value) : null; W.ch[i] = W.ch[i] || { sw: 10, trim: 0.5, ground: true }; W.ch[i].node = n; });
    const row2 = E('div', 'row', c1); E('label', '', row2, null, 'Sonde ' + (i + 1));
    const seg = E('div', 'seg', row2); ['1', '10'].forEach(v => { const b = E('button', '', seg, null, '×' + v); b.dataset.v = v; b.addEventListener('click', () => { W.ch[i].sw = +v; upd(); }); });
    const gl = E('label', '', row2); gl.style.minWidth = '0'; const gc = E('input', '', gl); gc.type = 'checkbox'; gc.checked = W.ch[i].ground !== false; gl.append(' pince de masse'); gc.addEventListener('change', () => { W.ch[i].ground = gc.checked; });
    const row3 = E('div', 'row', c1); E('label', '', row3, null, 'Vis de compensation'); const sl = E('input', '', row3); sl.type = 'range'; sl.min = 0; sl.max = 1; sl.step = 0.005; sl.value = W.ch[i].trim; sl.style.width = '170px'; sl.title = 'Tourner la vis de réglage de la sonde avec un tournevis';
    sl.addEventListener('input', () => { W.ch[i].trim = +sl.value; });
    const upd = () => { seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === W.ch[i].sw)); row3.style.display = W.ch[i].sw === 10 ? '' : 'none'; };
    upd(); B.refreshers.push(() => { sel.value = W.ch[i].node ? W.ch[i].node.src.kind + '.' + W.ch[i].node.key : ''; upd(); gc.checked = W.ch[i].ground !== false; sl.value = W.ch[i].trim; });
  }
  E('div', 'hint', c1, null, 'L\'interrupteur de la sonde (×1 / ×10) et le réglage « Probe » du menu de l\'oscilloscope doivent toujours être identiques.');
  const c2 = E('div', 'card', B.pg); E('h3', '', c2, null, '⠿ '+'Générateur de fonctions' + ' <span class="hint" style="float:right">déplaçable · Échap pour fermer</span>');
  const gbf = App.bench.gbf, Hz = [['Hz', 1], ['kHz', 1e3], ['MHz', 1e6]], Vv = [['V', 1], ['mV', 1e-3]];
  const shp = E('div', 'row', c2); const sg = E('div', 'seg', shp);
  [['sine', '∿ Sinus'], ['square', '⊓ Carré'], ['triangle', '△ Triangle'], ['ramp', '◿ Rampe']].forEach(([k, t]) => { const b = E('button', '', sg, null, t); b.addEventListener('click', () => { gbf.shape = k; sync(); }); b.dataset.k = k; });
  const sync = () => sg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === gbf.shape));
  sync();
  const rows = [numField(c2, 'Fréquence', () => gbf.freq, v => { gbf.freq = Math.max(0.01, v); }, Hz), numField(c2, 'Amplitude (crête-crête)', () => gbf.amp, v => { gbf.amp = Math.max(0, v); }, Vv), numField(c2, 'Offset', () => gbf.offset, v => { gbf.offset = v; }, Vv), numField(c2, 'Rapport cyclique', () => gbf.duty * 100, v => { gbf.duty = Math.min(0.95, Math.max(0.05, v / 100)); }, [['%', 1]])];
  B.refreshers.push(() => { sync(); rows.forEach(r => r.refresh()); });
  const c3 = E('div', 'card', B.pm); E('h3', '', c3, null, '⠿ '+'Montages' + ' <span class="hint" style="float:right">déplaçable · Échap pour fermer</span>');
  const mk = (title, f) => { const d = E('details', 'mont', c3); E('summary', '', d, null, title); const b = E('div', '', d); f(b); return d; };
  const bb = App.bench;
  const R = [['Ω', 1], ['kΩ', 1e3], ['MΩ', 1e6]], Cc = [['nF', 1e-9], ['µF', 1e-6], ['mF', 1e-3], ['pF', 1e-12]].sort((a, b) => a[1] - b[1]);
  mk('Pont de diodes (secondaire 50 Hz)', b => { numField(b, 'Tension efficace', () => bb.bridge.veff, v => { bb.bridge.veff = v; }, [['V', 1]]); numField(b, 'Condensateur', () => bb.bridge.C, v => { bb.bridge.C = Math.max(0, v); }, [['µF', 1e-6], ['mF', 1e-3]]); numField(b, 'Résistance de charge', () => bb.bridge.R, v => { bb.bridge.R = Math.max(1, v); }, R); });
  mk('NE555 astable', b => { numField(b, 'R1', () => bb.ne555.R1, v => { bb.ne555.R1 = Math.max(1, v); }, R); numField(b, 'R2', () => bb.ne555.R2, v => { bb.ne555.R2 = Math.max(1, v); }, R); numField(b, 'C', () => bb.ne555.C, v => { bb.ne555.C = Math.max(1e-12, v); }, [['nF', 1e-9], ['µF', 1e-6]]); numField(b, 'Alimentation Vcc', () => bb.ne555.vcc, v => { bb.ne555.vcc = v; }, [['V', 1]]); });
  mk('RC : charge / décharge', b => { numField(b, 'Résistance R', () => bb.rc.R, v => { bb.rc.R = Math.max(1, v); }, R); numField(b, 'Condensateur C', () => bb.rc.C, v => { bb.rc.C = Math.max(1e-12, v); }, [['nF', 1e-9], ['µF', 1e-6]]); numField(b, 'Tension E', () => bb.rc.E, v => { bb.rc.E = v; }, [['V', 1]]); numField(b, 'Fréquence du carré', () => bb.rc.freq, v => { bb.rc.freq = Math.max(0.01, v); }, Hz); });
  mk('Filtre RC (déphasage)', b => { const r = E('div', 'row', b); const s = E('div', 'seg', r); [['low', 'Passe-bas'], ['high', 'Passe-haut']].forEach(([k, t]) => { const bt = E('button', k === bb.rcf.type ? 'on' : '', s, null, t); bt.addEventListener('click', () => { bb.rcf.type = k; s.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === bt)); }); }); numField(b, 'R', () => bb.rcf.R, v => { bb.rcf.R = Math.max(1, v); }, R); numField(b, 'C', () => bb.rcf.C, v => { bb.rcf.C = Math.max(1e-12, v); }, [['nF', 1e-9], ['µF', 1e-6]]); numField(b, 'Fréquence', () => bb.rcf.freq, v => { bb.rcf.freq = Math.max(0.1, v); }, Hz); numField(b, 'Amplitude (c-c)', () => bb.rcf.amp, v => { bb.rcf.amp = v; }, [['V', 1]]); });
  mk('Bouton poussoir', b => { const r = E('div', 'row', b); const p = E('button', 'btn pri', r, null, 'Appuyer'); const q = E('button', 'btn', r, null, 'Relâcher'); p.addEventListener('click', () => { bb.push.press((App.scope.scanEnd || App.scope.simT) + 0.003); }); q.addEventListener('click', () => bb.push.release()); const l = E('label', '', r); const cb = E('input', '', l); cb.type = 'checkbox'; cb.checked = bb.push.bounce; cb.addEventListener('change', () => { bb.push.bounce = cb.checked; }); l.append(' avec rebonds'); });
  mk('Capteur bruité', b => { numField(b, 'Fréquence', () => bb.noisy.freq, v => { bb.noisy.freq = Math.max(1, v); }, Hz); numField(b, 'Amplitude (c-c)', () => bb.noisy.amp, v => { bb.noisy.amp = Math.max(0, v); }, [['mV', 1e-3], ['V', 1]]); numField(b, 'Bruit (efficace, à 100 MHz)', () => bb.noisy.noise, v => { bb.noisy.noise = Math.max(0, v); }, [['mV', 1e-3], ['V', 1]]); numField(b, 'Ronflement 50 Hz', () => bb.noisy.hum, v => { bb.noisy.hum = Math.max(0, v); }, [['mV', 1e-3], ['V', 1]]); });
  const hexList = (b, label, get, set) => { const r = E('div', 'row', b); E('label', '', r, null, label); const i = E('input', '', r); i.type = 'text'; i.style.width = '140px'; i.value = get().map(v => v.toString(16).toUpperCase().padStart(2, '0')).join(' '); i.addEventListener('change', () => { const a = i.value.trim().split(/[\s,;]+/).map(x => parseInt(x, 16)).filter(x => isFinite(x) && x >= 0 && x < 256); if (a.length) set(a); i.value = get().map(v => v.toString(16).toUpperCase().padStart(2, '0')).join(' '); }); E('span', 'hint', r, null, 'hexa'); };
  const selField = (b, label, opts, get, set) => { const r = E('div', 'row', b); E('label', '', r, null, label); const s = E('select', '', r); opts.forEach(([v, t]) => { const o = E('option', '', s, null, t); o.value = v; }); s.value = get(); s.addEventListener('change', () => set(isNaN(+s.value) || s.value === '' ? s.value : +s.value)); };
  mk('Liaison série UART / RS-232', b => { selField(b, 'Vitesse', [2400, 4800, 9600, 19200, 38400, 57600, 115200].map(x => [x, x + ' bauds']), () => bb.uart.baud, v => { bb.uart.baud = v; }); const r = E('div', 'row', b); E('label', '', r, null, 'Message TX'); const i = E('input', '', r); i.type = 'text'; i.value = bb.uart.text; i.maxLength = 12; i.style.width = '130px'; i.addEventListener('input', () => { if (i.value) bb.uart.text = i.value; }); selField(b, 'Parité', [['none', 'Aucune'], ['even', 'Paire'], ['odd', 'Impaire']], () => bb.uart.parity, v => { bb.uart.parity = v; }); selField(b, 'Niveaux', [['ttl', 'TTL 0 / 3,3 V (repos haut)'], ['rs232', 'RS-232 ±9 V (repos bas)']], () => bb.uart.level, v => { bb.uart.level = v; }); });
  mk('Bus I²C', b => { const r = E('div', 'row', b); E('label', '', r, null, 'Adresse (7 bits)'); const i = E('input', '', r); i.type = 'text'; i.style.width = '70px'; i.value = bb.i2c.addr.toString(16).toUpperCase(); i.addEventListener('change', () => { const v = parseInt(i.value, 16); if (isFinite(v) && v >= 0 && v < 128) bb.i2c.addr = v; i.value = bb.i2c.addr.toString(16).toUpperCase(); }); E('span', 'hint', r, null, 'hexa'); hexList(b, 'Octets envoyés', () => bb.i2c.data, v => { bb.i2c.data = v; }); selField(b, 'Sens', [[0, 'Écriture (W)'], [1, 'Lecture (R)']], () => bb.i2c.read ? 1 : 0, v => { bb.i2c.read = !!v; }); const l = E('label', '', E('div', 'row', b)); const c = E('input', '', l); c.type = 'checkbox'; c.checked = bb.i2c.ack; c.addEventListener('change', () => { bb.i2c.ack = c.checked; }); l.append(' le composant répond (ACK)'); numField(b, 'Fréquence SCL', () => bb.i2c.fscl, v => { bb.i2c.fscl = Math.max(1000, v); }, [['kHz', 1e3], ['MHz', 1e6]]); });
  mk('Bus SPI', b => { hexList(b, 'Octets MOSI', () => bb.spi.mosi, v => { bb.spi.mosi = v; while (bb.spi.miso.length < v.length) bb.spi.miso.push(0); bb.spi.miso.length = v.length; }); hexList(b, 'Octets MISO', () => bb.spi.miso, v => { bb.spi.miso = v; }); numField(b, 'Fréquence SCLK', () => bb.spi.fclk, v => { bb.spi.fclk = Math.max(1000, v); }, [['kHz', 1e3], ['MHz', 1e6]]); });
  mk('Alimentation continue', b => { numField(b, 'Tension', () => bb.dc.v, v => { bb.dc.v = v; }, [['V', 1]]); numField(b, 'Ondulation (c-c)', () => bb.dc.ripple, v => { bb.dc.ripple = Math.max(0, v); }, [['mV', 1e-3], ['V', 1]]); });
};
OL.Bench.prototype.refresh = function () { this.refreshers.forEach(f => f()); };
})(typeof window !== 'undefined' ? window : globalThis);
