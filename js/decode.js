/* decode.js — décodeurs de bus série (UART/RS232, I2C, SPI) : analysent les données AFFICHÉES à l'écran,
   comme le décodeur de l'oscilloscope. Entrées : tableaux de volts (une valeur par colonne) et durée d'une colonne. */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};
const hex2 = v => (v < 16 ? '0' : '') + v.toString(16).toUpperCase();
OL.fmtVal = function (v, fmt, bits) {
  bits = bits || 8;
  if (fmt === 'ascii') { return v >= 32 && v < 127 ? String.fromCharCode(v) : (v === 10 ? '\\n' : v === 13 ? '\\r' : '·'); }
  if (fmt === 'dec') return String(v); if (fmt === 'bin') { let s = v.toString(2); while (s.length < bits) s = '0' + s; return s; }
  return (bits > 8 ? v.toString(16).toUpperCase() : hex2(v));
};
/* franchissement : indice fractionnaire du premier passage de y[...] au seuil dans le sens demandé à partir de i0 */
function logic(y, thr, inv) { const out = new Uint8Array(y.length); for (let i = 0; i < y.length; i++) out[i] = ((y[i] > thr) !== !!inv) ? 1 : 0; return out; }
function ysafe(y) { return y ? y : null; }

/* ---------- UART / RS232 ---------- */
OL.decodeUART = function (y, dt, c) {
  const ev = []; if (!y) return ev;
  const L = logic(y, c.thr, c.invert), N = L.length, Tb = 1 / c.baud;
  let i = 1;
  while (i < N) {
    if (L[i - 1] === 1 && L[i] === 0) {                       /* front descendant : début du bit de start */
      const t0 = i * dt; const nbits = c.dataBits + (c.parity !== 'none' ? 1 : 0), end = t0 + (1 + nbits + c.stop) * Tb;
      if (end > N * dt) { ev.push({ t0, t1: N * dt, kind: 'err', text: '…', err: 'incomplet' }); break; }
      const at = t => L[Math.min(N - 1, Math.max(0, Math.round(t / dt)))];
      let v = 0, ones = 0;
      for (let j = 0; j < c.dataBits; j++) { const b = at(t0 + (1.5 + j) * Tb); ones += b; if (c.endian === 'lsb') v |= b << j; else v |= b << (c.dataBits - 1 - j); }
      let err = null;
      if (c.parity !== 'none') { const pb = at(t0 + (1.5 + c.dataBits) * Tb); const exp = c.parity === 'even' ? ones & 1 : (ones & 1) ^ 1; if (pb !== exp) err = 'parité'; }
      const sb = at(t0 + (1.5 + nbits) * Tb); if (sb !== 1) err = err || 'stop';
      ev.push({ t0, t1: end, kind: err ? 'err' : 'data', val: v, bits: c.dataBits, err });
      i = Math.max(i + 1, Math.floor((end - 0.5 * Tb) / dt));
      while (i < N && L[i] === 0) i++;                         /* attend le retour au repos avant de chercher un nouveau start */
    } else i++;
  }
  return ev;
};

/* ---------- I2C ---------- */
OL.decodeI2C = function (scl, sda, dt, c) {
  const ev = []; if (!scl || !sda) return ev;
  const C = logic(scl, c.thrScl, false), D = logic(sda, c.thrSda, false), N = Math.min(C.length, D.length);
  let state = 'idle', bits = [], byteIdx = 0, tByte = 0;
  const flush = (i) => { };
  for (let i = 1; i < N; i++) {
    const sclHigh = C[i] === 1 && C[i - 1] === 1;
    if (sclHigh && D[i - 1] === 1 && D[i] === 0) { /* START ou RESTART */
      ev.push({ t0: i * dt, t1: i * dt, kind: state === 'idle' ? 'start' : 'restart', text: state === 'idle' ? 'S' : 'Sr' }); state = 'bits'; bits = []; byteIdx = 0; tByte = i * dt; continue; }
    if (sclHigh && D[i - 1] === 0 && D[i] === 1) { if (state !== 'idle') ev.push({ t0: i * dt, t1: i * dt, kind: 'stop', text: 'P' }); state = 'idle'; bits = []; continue; }
    if (state !== 'idle' && C[i - 1] === 0 && C[i] === 1) {   /* front montant de SCL : échantillonnage de SDA */
      if (!bits.length) tByte = i * dt; bits.push(D[i]);
      if (bits.length === 9) {
        let v = 0; for (let k = 0; k < 8; k++) v = (v << 1) | bits[k]; const ack = bits[8] === 0, t1 = i * dt;
        if (byteIdx === 0) ev.push({ t0: tByte, t1, kind: 'addr', val: v >> 1, rw: v & 1, ack, bits: 7 });
        else ev.push({ t0: tByte, t1, kind: 'data', val: v, ack, bits: 8, rw: ev.filter(e => e.kind === 'addr').pop().rw });
        byteIdx++; bits = [];
      }
    }
  }
  return ev;
};

/* ---------- SPI (CS actif bas ou haut, échantillonnage sur front montant ou descendant de SCLK) ---------- */
OL.decodeSPI = function (clk, mosi, miso, cs, dt, c) {
  const ev = []; if (!clk || !cs) return ev;
  const K = logic(clk, c.thrClk, false), S = logic(cs, c.thrCs, c.csHigh ? true : false), M = mosi ? logic(mosi, c.thrMosi, false) : null, I = miso ? logic(miso, c.thrMiso, false) : null, N = K.length;
  /* S = 1 quand CS est actif (bas par défaut → inversé pour obtenir "actif") */
  const active = i => (c.csHigh ? S[i] === 1 : S[i] === 0);
  let inFrame = false, wm = [], wi = [], tw = 0;
  const bitsMax = c.dataBits;
  for (let i = 1; i < N; i++) {
    const a = active(i);
    if (a && !active(i - 1)) { inFrame = true; wm = []; wi = []; ev.push({ t0: i * dt, t1: i * dt, kind: 'start', text: 'CS' }); }
    if (!a && active(i - 1)) { inFrame = false; wm = []; wi = []; }
    if (!inFrame) continue;
    const edge = c.edge === 'rise' ? (K[i - 1] === 0 && K[i] === 1) : (K[i - 1] === 1 && K[i] === 0);
    if (edge) {
      if (!wm.length) tw = i * dt;
      if (M) wm.push(M[i]); if (I) wi.push(I[i]);
      if (wm.length === bitsMax || (!M && wi.length === bitsMax)) {
        const val = arr => { let v = 0; for (let k = 0; k < arr.length; k++) v = c.endian === 'msb' ? (v << 1) | arr[k] : v | (arr[k] << k); return v >>> 0; };
        ev.push({ t0: tw, t1: i * dt, kind: 'data', val: M ? val(wm) : null, valMiso: I ? val(wi) : null, bits: bitsMax }); wm = []; wi = [];
      }
    }
  }
  return ev;
};
})(typeof window !== 'undefined' ? window : globalThis);
