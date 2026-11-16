(function () {
'use strict';
var W = 720, H = 315, G = 250, CX = 158, SP = 300, DUR = 20;
var D, C, X, SC, raf, last, ret, st, held = false, mono = 'monospace', sans = 'sans-serif';
var rm = matchMedia('(prefers-reduced-motion: reduce)');
var CSS = '.jc-dialog{background:#0D0B14;color:#F4F2FA;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:18px;width:min(760px,94vw);max-width:min(760px,94vw);font-family:var(--sans,system-ui,sans-serif)}' +
'.jc-dialog::backdrop{background:rgba(13,11,20,.75);backdrop-filter:blur(4px)}' +
'.jc-dialog h2{margin:0 0 6px;font-size:1.1rem;font-weight:600}' +
'.jc-dialog p{margin:0 0 12px;color:#C4B5FD;font-size:.9rem;line-height:1.5}' +
'.jc-dialog canvas{display:block;width:100%;max-width:720px;aspect-ratio:16/7;margin:0 auto;border-radius:12px;border:1px solid rgba(255,255,255,.08);touch-action:none;cursor:pointer}' +
'.jc-row{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:12px}' +
'.jc-score{margin:0;font-size:.85rem;color:#F4F2FA}' +
'.jc-btns{display:flex;gap:8px}' +
'.jc-dialog button{font:inherit;font-size:.9rem;color:#F4F2FA;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);border-radius:999px;padding:8px 18px;cursor:pointer}' +
'.jc-dialog button:hover{background:rgba(255,255,255,.1)}' +
'.jc-dialog button.jc-p{background:#7C3AED;border-color:#7C3AED}' +
'.jc-dialog button.jc-p:hover{background:#6D2FD6}' +
'.jc-dialog :focus-visible{outline:2px solid #C4B5FD;outline-offset:2px}';

function skyline(min, max, seed) {
  var a = [], x = 0, r = seed, f = function () { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  while (x < W) { var w = 30 + f() * 50; a.push([x, w, min + f() * (max - min)]); x += w + 6; }
  return { a: a, p: x };
}
var far = skyline(40, 100, 7), near = skyline(25, 65, 31);

function rv(n, d) { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d; } catch (e) { return d; } }
function best() { try { return +localStorage.getItem('jcMiniBest') || 0; } catch (e) { return 0; } }
function say(m) { SC.textContent = 'Score ' + st.score + (m ? ' \u00B7 ' + m : ''); }
function pop(t, c, big) { st.fx.push({ t: t, c: c, big: big, age: 0, life: rm.matches ? .8 : .55 }); }

function start() {
  st = { ph: 'count', cd: 0, t: DUR, nx: 1.2, wx: 0, ramps: [], h: 0, vy: 0, a: 0, air: false,
    score: 0, landed: 0, cuts: 0, crashes: 0, fx: [], wipe: 0, shake: 0 };
  held = false; last = 0; say('get ready'); C.focus();
}

function finish() {
  var b = best(), nb = st.score > b;
  if (nb) { b = st.score; try { localStorage.setItem('jcMiniBest', b); } catch (e) {} }
  st.ph = 'end'; st.best = b; st.nb = nb;
  say("That's a wrap. " + st.landed + ' landed, ' + st.cuts + ' cuts, ' + st.crashes + ' crashes. Best ' + b);
}

function update(dt) {
  var s = st, i, r;
  for (i = s.fx.length; i--;) { s.fx[i].age += dt; if (s.fx[i].age > s.fx[i].life) s.fx.splice(i, 1); }
  s.wipe = Math.max(0, s.wipe - dt); s.shake = Math.max(0, s.shake - dt);
  if (s.ph === 'end') return;
  s.wx += SP * dt;
  if (s.ph === 'count') { s.cd += dt; if (s.cd >= 2.6) { s.ph = 'play'; say('go'); } return; }
  s.t -= dt;
  if (s.t <= 0) { s.t = 0; finish(); return; }
  s.nx -= dt;
  if (s.nx <= 0) { s.ramps.push({ x: W + 20 }); s.nx = 1.8 + Math.random() * .8; }
  for (i = s.ramps.length; i--;) {
    r = s.ramps[i]; r.x -= SP * dt;
    if (!r.d && r.x <= CX + 26) {
      r.d = 1;
      if (!s.air) {
        if (held) { s.ramps.splice(i, 1); s.score++; s.cuts++; s.wipe = .12; pop('CUT', '#F4F2FA', 1); say('cut'); }
        else { s.air = true; s.vy = 380; s.a = .35; }
      }
    } else if (r.x < -100) s.ramps.splice(i, 1);
  }
  if (s.air) {
    s.vy -= 900 * dt; s.h += s.vy * dt; s.a += (held ? 1.5 : -.9) * dt;
    if (s.h <= 0 && s.vy < 0) {
      s.h = 0; s.air = false;
      if (Math.abs(s.a) < .314) { s.score += 3; s.landed++; pop('LANDED', '#C4B5FD', 1); say('landed +3'); }
      else { s.score = Math.max(0, s.score - 1); s.crashes++; s.shake = .3; pop('CRASH', '#0EA5E9', 1); say('crash -1'); }
      s.a = 0; s.vy = 0;
    }
  }
}

function rr(c, x, y, w, h, r) { c.beginPath(); (c.roundRect || c.rect).call(c, x, y, w, h, r); c.fill(); }
function text(t, x, y, size, col, font, al, a) {
  X.globalAlpha = a == null ? 1 : a; X.fillStyle = col; X.font = size + 'px ' + font; X.textAlign = al || 'center'; X.fillText(t, x, y); X.globalAlpha = 1;
}

function layer(L, off, col) {
  var o = off % L.p, k, i;
  X.fillStyle = col;
  for (k = 0; k < 2; k++) for (i = 0; i < L.a.length; i++) { var b = L.a[i]; X.fillRect(b[0] - o + k * L.p, G - b[2], b[1], b[2]); }
}

function draw() {
  var s = st, i, f, r, p;
  X.setTransform(1, 0, 0, 1, 0, 0); X.clearRect(0, 0, C.width, C.height);
  var k = C.width / W; X.setTransform(k, 0, 0, k, 0, 0);
  if (s.shake > 0 && !rm.matches) X.translate((Math.random() - .5) * 8, (Math.random() - .5) * 8);
  X.fillStyle = '#0D0B14'; X.fillRect(-10, -10, W + 20, H + 20);
  layer(far, s.wx * .08, 'rgba(30,27,75,.55)'); layer(near, s.wx * .2, 'rgba(30,27,75,.9)');
  X.fillStyle = 'rgba(30,27,75,.45)'; X.fillRect(-10, G, W + 20, H - G + 10);
  X.fillStyle = 'rgba(196,181,253,.5)'; X.fillRect(-10, G, W + 20, 1.5);
  X.fillStyle = 'rgba(196,181,253,.18)';
  for (i = 0; i < 14; i++) X.fillRect(((i * 70 - s.wx) % 980 + 980) % 980 - 60, G + 16, 26, 2);
  if (!rm.matches && s.ph !== 'end') {
    X.fillStyle = 'rgba(196,181,253,.22)';
    for (i = 0; i < 7; i++) X.fillRect(((i * 131 + 40 - s.wx * 2.2) % 840 + 840) % 840 - 60, 40 + (i * 53) % 190, 50 + (i % 3) * 20, 1.5);
  }
  for (i = 0; i < s.ramps.length; i++) {
    r = s.ramps[i]; X.fillStyle = '#7C3AED'; X.beginPath();
    X.moveTo(r.x, G); X.lineTo(r.x + 80, G); X.lineTo(r.x + 80, G - 34); X.closePath(); X.fill();
  }
  X.save(); X.translate(CX, G - 8 - s.h); X.rotate(-s.a);
  X.fillStyle = '#F4F2FA'; rr(X, -30, -18, 60, 16, 6);
  X.fillStyle = '#C4B5FD'; rr(X, -14, -29, 28, 13, 5);
  X.fillStyle = '#0EA5E9'; rr(X, 25, -14, 6, 5, 2);
  X.fillStyle = '#0D0B14'; X.strokeStyle = '#7C3AED'; X.lineWidth = 3;
  for (i = -1; i <= 1; i += 2) { X.beginPath(); X.arc(i * 19, 0, 8, 0, 7); X.fill(); X.stroke(); }
  X.restore();
  if (s.wipe > 0 && !rm.matches) {
    p = 1 - s.wipe / .12; var x0 = -300 + p * (W + 500), g = X.createLinearGradient(x0, 0, x0 + 260, 0);
    g.addColorStop(0, '#7C3AED'); g.addColorStop(1, '#0EA5E9'); X.fillStyle = g;
    X.beginPath(); X.moveTo(x0, 0); X.lineTo(x0 + 260, 0); X.lineTo(x0 + 180, H); X.lineTo(x0 - 80, H); X.fill();
  }
  for (i = 0; i < s.fx.length; i++) {
    f = s.fx[i]; p = f.age / f.life;
    text(f.t, W / 2, 120 - (rm.matches ? 0 : p * 24), 46, f.c, sans, 'center', 1 - p);
  }
  if (s.ph === 'count') {
    var n = Math.floor(s.cd / .7), lab = n < 3 ? String(3 - n) : 'Action!';
    text(lab, W / 2, 140, 60, '#F4F2FA', sans, 'center', n < 3 ? 1 - (s.cd % .7) / .9 : 1);
  }
  text('SCORE ' + s.score, 18, 30, 16, '#C4B5FD', mono, 'left');
  text(String(Math.ceil(s.t)).padStart(2, '0') + 's', W - 18, 30, 18, '#F4F2FA', mono, 'right');
  if (s.ph === 'end') {
    X.fillStyle = 'rgba(13,11,20,.82)'; X.fillRect(0, 0, W, H);
    text("That's a wrap", W / 2, 100, 38, '#F4F2FA', sans);
    text('Score ' + s.score + (s.nb ? '  (new best)' : '  \u00B7  best ' + s.best), W / 2, 142, 20, '#C4B5FD', mono);
    text('landed ' + s.landed + '   cuts ' + s.cuts + '   crashes ' + s.crashes, W / 2, 176, 16, '#F4F2FA', mono);
  }
}

function loop(now) {
  raf = requestAnimationFrame(loop);
  var dt = last ? Math.min(.05, (now - last) / 1000) : 0;
  last = now;
  if (document.hidden) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(C.clientWidth * dpr);
  if (!w) return;
  if (C.width !== w) { C.width = w; C.height = Math.round(w * 7 / 16); }
  update(dt); draw();
}

function key(e, v) {
  if (e.code !== 'Space' && e.code !== 'Enter') return;
  if (e.target.closest && e.target.closest('button')) return;
  e.preventDefault(); held = v;
}
function kd(e) { key(e, true); }
function ku(e) { key(e, false); }
function rel() { held = false; }
function vis() { held = false; last = 0; }

function build() {
  var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
  D = document.createElement('dialog'); D.className = 'jc-dialog'; D.setAttribute('aria-labelledby', 'jc-title');
  D.innerHTML = '<h2 id="jc-title">JUMP CUT \u00B7 20-second mini</h2>' +
    '<p>Ramps come at you. Hold Space, tap or click and hold to CUT past a stunt. Let go to drive it for real, then hold in the air to level the car and land it.</p>' +
    '<canvas tabindex="0" aria-label="JUMP CUT mini game"></canvas>' +
    '<div class="jc-row"><p class="jc-score" aria-live="polite"></p><div class="jc-btns">' +
    '<button type="button" class="jc-p">Play again</button><button type="button">Close</button></div></div>';
  document.body.appendChild(D);
  C = D.querySelector('canvas'); X = C.getContext('2d'); SC = D.querySelector('.jc-score');
  var b = D.querySelectorAll('button');
  b[0].onclick = start; b[1].onclick = function () { D.close(); };
  C.addEventListener('pointerdown', function (e) { held = true; try { C.setPointerCapture(e.pointerId); } catch (x) {} C.focus(); e.preventDefault(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { C.addEventListener(n, rel); });
  D.addEventListener('click', function (e) {
    if (e.target !== D) return;
    var r = D.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) D.close();
  });
  D.addEventListener('close', function () {
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku);
    document.removeEventListener('visibilitychange', vis);
    if (ret && ret.focus) ret.focus();
  });
}

window.openJumpCutMini = function (el) {
  ret = el || document.activeElement;
  if (!D) build();
  if (D.open) return;
  mono = rv('--mono', 'monospace'); sans = rv('--sans', 'sans-serif');
  D.showModal();
  document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
  document.addEventListener('visibilitychange', vis);
  start(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
};
})();
