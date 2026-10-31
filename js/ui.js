/* ui.js — éléments d'interface communs : touches, boutons rotatifs, menus à touches programmables */
(function (g) {
'use strict';
const OL = g.OL = g.OL || {};

OL.el = function (tag, cls, parent, css, html) {
  const e = document.createElement(tag); if (cls) e.className = cls;
  if (css) Object.assign(e.style, css);
  if (html !== undefined) e.innerHTML = html;
  if (parent) parent.appendChild(e); return e;
};
const px = v => (typeof v === 'number' ? v + 'px' : v);

/* touche : { x,y,w,h, label, cls, led, on } */
OL.Key = function (parent, o) {
  const e = OL.el('button', 'key ' + (o.cls || ''), parent, { left: px(o.x), top: px(o.y), width: px(o.w || 44), height: px(o.h || 24) });
  e.type = 'button'; e.innerHTML = '<span>' + (o.label || '') + '</span>'; if (o.title) e.title = o.title;
  if (o.led) { e.classList.add('hasled'); OL.el('i', 'led', e); }
  e.addEventListener('click', ev => { ev.preventDefault(); e.classList.add('pulse'); setTimeout(() => e.classList.remove('pulse'), 220); if (o.on) o.on(ev); });
  e.setLed = v => e.classList.toggle('lit', !!v);
  return e;
};

/* bouton rotatif : turn(n) n = +/-1 par cran ; push() = appui. o : { x,y,r,cls,turn,push,label } */
OL.Knob = function (parent, o) {
  const r = o.r || 24, e = OL.el('div', 'knob ' + (o.cls || ''), parent, { left: px(o.x - r), top: px(o.y - r), width: px(2 * r), height: px(2 * r) });
  e.tabIndex = 0; e.title = o.title || 'Tourner : molette ou glisser — Appuyer : clic';
  const cap = OL.el('div', 'cap', e); OL.el('b', 'mark', cap);
  let ang = 0;
  const rot = n => { ang += n * 15; cap.style.transform = 'rotate(' + ang + 'deg)'; if (o.turn) o.turn(n); };
  let sx = 0, sy = 0, acc = 0, moved = false, down = false;
  e.addEventListener('pointerdown', ev => { down = true; moved = false; sx = ev.clientX; sy = ev.clientY; acc = 0; e.setPointerCapture(ev.pointerId); e.classList.add('pressed'); ev.preventDefault(); });
  e.addEventListener('pointermove', ev => {
    if (!down) return; const dx = ev.clientX - sx, dy = ev.clientY - sy; sx = ev.clientX; sy = ev.clientY;
    acc += dx - dy; if (Math.abs(acc) > 3) moved = true;
    while (Math.abs(acc) >= 9) { rot(acc > 0 ? 1 : -1); acc -= acc > 0 ? 9 : -9; }
  });
  const up = ev => { if (!down) return; down = false; e.classList.remove('pressed'); if (!moved && o.push) o.push(); };
  e.addEventListener('pointerup', up); e.addEventListener('pointercancel', () => { down = false; e.classList.remove('pressed'); });
  e.addEventListener('wheel', ev => { ev.preventDefault(); rot(ev.deltaY < 0 ? 1 : -1); }, { passive: false });
  e.addEventListener('keydown', ev => { if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') { rot(1); ev.preventDefault(); } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') { rot(-1); ev.preventDefault(); } else if (ev.key === 'Enter' || ev.key === ' ') { if (o.push) o.push(); ev.preventDefault(); } });
  if (o.label) OL.el('div', 'klabel ' + (o.lcls || ''), parent, { left: px(o.x - 60), top: px(o.y + (o.ly === undefined ? r + 3 : o.ly)), width: '120px' }, o.label);
  return e;
};

/* petit texte posé sur la face avant */
OL.Label = function (parent, x, y, txt, cls, w) { return OL.el('div', 'plabel ' + (cls || ''), parent, { left: px(x), top: px(y), width: w ? px(w) : undefined }, txt); };

/* ---------- Menu à touches programmables ----------
   menu = { title, items: [ { label, val(), opts:[{t, f}], knob(n), push(), hidden() } ] }                */
OL.fmtT = (x) => OL.fmt(x, 's');
OL.fmtV = (x) => OL.fmt(x, 'V');
})(typeof window !== 'undefined' ? window : globalThis);
