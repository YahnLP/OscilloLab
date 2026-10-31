/* draw.js — fonctions de dessin partagées des deux écrans (canvas 2D) */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};

/* Trace une graticule : rect {x,y,w,h}, 12 x 8 divisions */
OL.drawGrid = function (c, R, o) {
  o = o || {}; const dw = R.w / 12, dh = R.h / 8;
  c.save();
  c.strokeStyle = o.line || '#4a4a4a'; c.lineWidth = 1;
  if (o.full !== false) {
    c.setLineDash([1, 3]);
    c.beginPath();
    for (let i = 1; i < 12; i++) { const x = Math.round(R.x + i * dw) + .5; c.moveTo(x, R.y); c.lineTo(x, R.y + R.h); }
    for (let j = 1; j < 8; j++) { const y = Math.round(R.y + j * dh) + .5; c.moveTo(R.x, y); c.lineTo(R.x + R.w, y); }
    c.stroke(); c.setLineDash([]);
  }
  c.strokeStyle = o.axis || '#8a8a8a';
  c.beginPath();
  const cx = Math.round(R.x + R.w / 2) + .5, cy = Math.round(R.y + R.h / 2) + .5;
  c.moveTo(cx, R.y); c.lineTo(cx, R.y + R.h); c.moveTo(R.x, cy); c.lineTo(R.x + R.w, cy);
  /* graduations (5 par division) sur les axes centraux */
  for (let i = 0; i <= 60; i++) { const x = R.x + i * R.w / 60, t = i % 5 === 0 ? 5 : 3; c.moveTo(Math.round(x) + .5, cy - t); c.lineTo(Math.round(x) + .5, cy + t); }
  for (let j = 0; j <= 40; j++) { const y = R.y + j * R.h / 40, t = j % 5 === 0 ? 5 : 3; c.moveTo(cx - t, Math.round(y) + .5); c.lineTo(cx + t, Math.round(y) + .5); }
  c.stroke();
  c.strokeStyle = o.frame || '#8a8a8a'; c.strokeRect(R.x + .5, R.y + .5, R.w, R.h);
  c.restore();
};

/* Convertit les divisions (Float64Array NCOL) en polyligne */
OL.drawTrace = function (c, R, d, color, o) {
  if (!d) return; o = o || {};
  const N = d.length, dh = R.h / 8, cy = R.y + R.h / 2;
  c.save(); c.beginPath(); c.rect(R.x, R.y, R.w, R.h); c.clip();
  c.strokeStyle = color; c.fillStyle = color; c.lineWidth = o.lw || 1.4; c.lineJoin = 'round';
  if (o.dots) {
    const step = Math.max(1, o.step || 1);
    for (let j = 0; j < N; j += step) if (!isNaN(d[j])) c.fillRect(R.x + (j + .5) / N * R.w - 1, cy - d[j] * dh - 1, 2, 2);
  } else {
    c.beginPath(); let pen = false;
    for (let j = 0; j < N; j++) {
      if (isNaN(d[j])) { pen = false; continue; }
      const x = R.x + (j + .5) / N * R.w, y = cy - d[j] * dh;
      if (!pen) { c.moveTo(x, y); pen = true; } else c.lineTo(x, y);
    }
    c.stroke();
  }
  c.restore();
};
OL.drawPeak = function (c, R, pk, color) {
  if (!pk) return; const N = pk.lo.length, dh = R.h / 8, cy = R.y + R.h / 2;
  c.save(); c.beginPath(); c.rect(R.x, R.y, R.w, R.h); c.clip(); c.strokeStyle = color; c.lineWidth = 1.2; c.beginPath();
  for (let j = 0; j < N; j++) { if (isNaN(pk.lo[j])) continue; const x = R.x + (j + .5) / N * R.w; c.moveTo(x, cy - pk.hi[j] * dh); c.lineTo(x, cy - pk.lo[j] * dh); }
  c.stroke(); c.restore();
};
/* écran XY : point (Y2 en ordonnée, Y1 en abscisse) — 8 divisions */
OL.drawXY = function (c, R, dx, dy, color, dots) {
  if (!dx || !dy) return; const N = dx.length, s = R.h / 8, cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  c.save(); c.beginPath(); c.rect(R.x, R.y, R.w, R.h); c.clip(); c.strokeStyle = color; c.lineWidth = 1.3; c.beginPath();
  for (let j = 0; j < N; j++) { if (isNaN(dx[j]) || isNaN(dy[j])) continue; const x = cx + dx[j] * s, y = cy - dy[j] * s; if (j === 0) c.moveTo(x, y); else c.lineTo(x, y); }
  c.stroke(); c.restore();
};
OL.text = function (c, s, x, y, o) {
  o = o || {}; c.font = (o.bold ? 'bold ' : '') + (o.size || 13) + 'px ' + (o.font || 'Arial, Helvetica, sans-serif');
  c.fillStyle = o.color || '#fff'; c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'middle'; c.fillText(s, x, y);
};
OL.rrect = function (c, x, y, w, h, r, fill, stroke, lw) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
};
})(typeof window !== 'undefined' ? window : globalThis);
