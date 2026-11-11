(() => {
// =====================================================================
// 1. SETUP
// =====================================================================
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const glowCanvas = document.createElement('canvas');      // a small copy used for a soft glow
const gctx = glowCanvas.getContext('2d');

let W, H, dpr, U, rose;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);          // sharp lines on phones too
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  glowCanvas.width = Math.ceil(canvas.width / 4);
  glowCanvas.height = Math.ceil(canvas.height / 4);
  // U = one "unit" of size, so the whole poster scales with the screen
  U = Math.min(W * 0.8, H * 0.56) / 2;
  const narrow = W < 600;
  rose = { x: narrow ? W * 0.5 : W * 0.5, y: H * (narrow ? 0.52 : 0.55), R: U * (narrow ? 0.85 : 0.74) };
}
window.addEventListener('resize', () => { resize(); cacheReady = false; });
resize();

// =====================================================================
// 2. HELPERS
// =====================================================================
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const flow = x => Math.sin(clamp(x) * Math.PI / 2);          // starts moving straight away, then settles
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };

function makeRandom(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}
const rand = makeRandom(5);

// =====================================================================
// 3. THE ROSE: string art seen from above
//    Every petal is an arc woven from hundreds of fine threads.
//    Threads add their light together ("lighter"), so edges where many
//    threads meet glow bright and the gaps between petals stay dark.
// =====================================================================
const ROSE_COL = '255,155,185';                   // baby pink
const NPET = 22;
const PETALS = [];
for (let k = 0; k < NPET; k++) {
  const f = k / (NPET - 1);                       // 0 = the tight middle … 1 = the outer petals
  PETALS.push({
    f,
    r: 0.1 + 0.9 * Math.pow(f, 0.75),             // how far out the petal sits
    a: k * 2.39996 + rand() * 0.25,                    // where it points (a spiral around the middle)
    span: lerp(1.1, 1.45, f) + rand() * 0.15,      // how wide the arc is (half-angle)
    flat: 1.3 + rand() * 0.35,                     // how flat the petal's rim is
    strands: Array.from({ length: 7 }, () => ({ dr: (rand() - 0.5) * 0.05, da: (rand() - 0.5) * 0.12, bend: (rand() - 0.5) * 0.08 })),
  });
}

// a point on the petal's outer edge; s goes -1 … 1 along the arc.
// Each petal is part of a big, flat circle whose centre sits on the far side,
// so the edge is a gentle curve — like the rim of a real rose petal.
function edgePoint(p, s, R, st) {
  const k = p.flat + st.bend * 4;                         // >1 = flatter curve
  const ca = p.a + st.da * 0.3;
  const cx = Math.cos(ca) * p.r * R * (1 - k), cy = Math.sin(ca) * p.r * R * (1 - k);
  const rr = p.r * R * k * (1 + st.dr);
  const th = ca + s * p.span / k;
  return [cx + Math.cos(th) * rr, cy + Math.sin(th) * rr];
}

const STEPS = 28;                                 // points along each arc

// paints the whole open rose with its middle at 0,0 onto the drawing surface "c"
function paintRose(c, R) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';

  for (const p of PETALS) {
    // --- the woven fill: threads from the edge across to the inner side of the petal ---
    const inner = Math.max(0.04, p.r * 0.62);
    c.lineWidth = 0.6;
    c.strokeStyle = `rgba(${ROSE_COL},0.1)`;
    c.beginPath();
    const N = 56;
    for (let i = 0; i <= N; i++) {
      const s = i / N * 2 - 1;
      const [ex, ey] = edgePoint(p, s, R, p.strands[0]);
      // the other end of the thread sits further in and twisted round → crossing threads
      const th2 = p.a + (s * 0.7 - 0.55) * p.span;
      c.moveTo(ex, ey);
      c.lineTo(Math.cos(th2) * inner * R, Math.sin(th2) * inner * R);
      const th3 = p.a + (s * 0.7 + 0.55) * p.span;
      c.moveTo(ex, ey);
      c.lineTo(Math.cos(th3) * inner * R * 1.05, Math.sin(th3) * inner * R * 1.05);
    }
    c.stroke();

    // --- the sheen: fainter copies of the rim, stepping inwards, so each petal has a glowing band ---
    for (let L = 1; L <= 9; L++) {
      const sh = { dr: -L * 0.022, da: -L * 0.035, bend: L * 0.01 };
      c.strokeStyle = `rgba(${ROSE_COL},${0.15 * (1 - L / 10)})`;
      c.beginPath();
      for (let i = 0; i <= STEPS; i++) {
        const [x, y] = edgePoint(p, i / STEPS * 2 - 1, R, sh);
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
    }

    // --- the bright rim: a bundle of fine strands, each a little different ---
    c.lineWidth = 0.8;
    c.strokeStyle = `rgba(${ROSE_COL},0.34)`;
    c.beginPath();
    for (const st of p.strands) {
      for (let i = 0; i <= STEPS; i++) {
        const [x, y] = edgePoint(p, i / STEPS * 2 - 1, R, st);
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
    }
    c.stroke();

    // --- loose threads: the rim carries on past the petal in straight lines ---
    // drawn in 4 pieces that get fainter → the thread fades out
    c.lineWidth = 0.6;
    for (let piece = 0; piece < 4; piece++) {
      c.strokeStyle = `rgba(${ROSE_COL},${0.26 * (1 - piece / 4)})`;
      c.beginPath();
      for (const end of [-1, 1]) {
        for (const st of p.strands) {
          const [x1, y1] = edgePoint(p, end * 0.97, R, st);
          const [x2, y2] = edgePoint(p, end, R, st);
          const dx = x2 - x1, dy = y2 - y1, m = Math.hypot(dx, dy) || 1;
          const L = R * (0.1 + p.f * 0.22) / 4;
          c.moveTo(x2 + dx / m * L * piece, y2 + dy / m * L * piece);
          c.lineTo(x2 + dx / m * L * (piece + 1), y2 + dy / m * L * (piece + 1));
        }
      }
      c.stroke();
    }
  }
  c.restore();
}

// The rose never changes shape, so we paint it ONCE into a picture (cache)
// and every frame we just turn that picture. Very fast and smooth.
const cache = document.createElement('canvas');
let cacheReady = false;

function drawRose(time) {
  if (!cacheReady) {
    const size = Math.ceil(rose.R * 3.2 * dpr);
    cache.width = cache.height = size;
    const c = cache.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, size / 2, size / 2);
    paintRose(c, rose.R);
    cacheReady = true;
  }
  const s = rose.R * 3.2;
  ctx.save();
  ctx.translate(rose.x, rose.y);
  ctx.rotate(time * 0.05);                        // the rose slowly turns
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(cache, -s / 2, -s / 2, s, s);
  ctx.restore();
}

// =====================================================================
// 4. THE BEE: a soft, fuzzy X-ray bee (glowing light, not outlines)
// =====================================================================
let beePos = { x: 0, y: 0 };

// fine hairs all over the body, made once (positions in "bee units")
const HAIRS = [];
for (let n = 0; n < 750; n++) {
  // pick a body part: abdomen, thorax or head
  const part = n < 420 ? 0 : n < 660 ? 1 : 2;
  const [cx, cy, rx, ry] = [[-1.0, 0.15, 1.15, 0.78], [0.45, 0, 0.6, 0.58], [1.25, 0.12, 0.36, 0.38]][part];
  const a = rand() * Math.PI * 2, r = Math.pow(rand(), 0.3);      // mostly near the outline, so the edges look fuzzy
  const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
  const out = a + (rand() - 0.5) * 1.2;
  HAIRS.push({ x, y, dx: Math.cos(out), dy: Math.sin(out), len: 0.05 + rand() * (part === 1 ? 0.16 : 0.1), edge: r });
}

// the bee stays in one place: above the rose, on the left
function updateBee() {
  beePos = { x: Math.max(U * 0.45, rose.x - rose.R * 1.05), y: Math.max(H * 0.2, rose.y - rose.R * 1.3) };
}

// a soft glowing blob: bright in the middle, fading out
function glowBlob(x, y, rx, ry, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(245,240,232,${a})`);
  g.addColorStop(0.6, `rgba(235,228,220,${a * 0.45})`);
  g.addColorStop(1, 'rgba(235,228,220,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBee(time) {
  const B = U * 0.15;
  ctx.save();
  ctx.translate(beePos.x, beePos.y);
  ctx.rotate(-0.2);
  ctx.globalCompositeOperation = 'lighter';           // X-ray: layers add up and glow
  ctx.lineCap = 'round';

  // wings: see-through with fine veins and a bright edge
  const flap = 0.4 + 0.6 * Math.abs(Math.sin(time * 22));
  for (const [wx, wy, rx, ry, rot] of [[-0.1, -1.05, 1.7, 0.6, -0.45], [0.55, -0.85, 1.2, 0.45, -0.15]]) {
    ctx.save();
    ctx.scale(1, flap);
    ctx.translate(wx * B, wy * B);
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(225,230,240,0.13)';
    ctx.strokeStyle = 'rgba(240,240,245,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, rx * B, ry * B, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,240,245,0.16)';
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(-rx * B * 0.95, 0);
      ctx.bezierCurveTo(-rx * B * 0.3, k * ry * B * 0.5, rx * B * 0.3, k * ry * B * 0.45, rx * B * 0.9, k * ry * B * 0.25);
      ctx.stroke();
    }
    for (let k = 1; k < 4; k++) {   // cross veins make little cells
      const xx = (-0.6 + k * 0.4) * rx * B;
      ctx.beginPath(); ctx.moveTo(xx, -ry * B * 0.7); ctx.lineTo(xx + rx * B * 0.1, ry * B * 0.7); ctx.stroke();
    }
    ctx.restore();
  }

  // legs: thin and jointed, gently moving
  ctx.strokeStyle = 'rgba(235,228,220,0.4)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) {
    const lx = (0.2 + k * 0.3) * B, sw = Math.sin(time * 3 + k) * B * 0.08;
    ctx.beginPath();
    ctx.moveTo(lx, B * 0.4);
    ctx.lineTo(lx - B * 0.35 + sw, B * 0.95);
    ctx.lineTo(lx - B * 0.6 + sw, B * 1.45);
    ctx.stroke();
  }

  // soft glowing body volumes: abdomen, thorax, head
  glowBlob(-1.0 * B, 0.15 * B, 1.25 * B, 0.85 * B, 0.6);
  glowBlob(0.45 * B, 0, 0.7 * B, 0.66 * B, 0.75);
  glowBlob(1.25 * B, 0.12 * B, 0.42 * B, 0.44 * B, 0.65);
  // stripes on the abdomen: brighter bands
  for (const sx of [-1.55, -1.05, -0.55]) glowBlob(sx * B, 0.15 * B, 0.22 * B, 0.75 * B, 0.35);

  // the fuzz: hundreds of fine hairs
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = 'rgba(250,245,238,0.2)';
  ctx.beginPath();
  for (const h of HAIRS) {
    const wob = Math.sin(time * 2 + h.x * 5) * 0.03;
    ctx.moveTo(h.x * B, h.y * B);
    ctx.lineTo((h.x + (h.dx + wob) * h.len) * B, (h.y + h.dy * h.len) * B);
  }
  ctx.stroke();

  // antennae
  ctx.strokeStyle = 'rgba(240,235,228,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(1.4 * B, -0.15 * B); ctx.quadraticCurveTo(1.75 * B, -0.7 * B, 2.1 * B, -0.65 * B); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1.5 * B, -0.05 * B); ctx.quadraticCurveTo(1.95 * B, -0.45 * B, 2.25 * B, -0.3 * B); ctx.stroke();
  ctx.restore();
}

// =====================================================================
// 5. THE POSTER LAYER: callout boxes, typed notes, drifting symbols
// =====================================================================
const FONT = "12px 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace";
const SYMBOLS = ' .:-+=*#%';
const glyphs = [];
for (let i = 0; i < 160; i++) {
  // in rows, like the ASCII lines in the reference poster
  glyphs.push({ ang: rand() * Math.PI * 2, rad: 0.95 + rand() * 0.75, row: Math.floor(rand() * 9) - 4, seed: rand() * 100 });
}

// text that types itself out: shows the first part of "str" as "p" goes 0 → 1
function typed(str, p) { return str.slice(0, Math.floor(str.length * clamp(p))); }

function callout(box, labelX, labelY, lines, p, time) {
  if (p <= 0) return;
  const a = smooth(p * 2);
  ctx.strokeStyle = `rgba(225,210,218,${0.7 * a})`;
  ctx.lineWidth = 1;
  // the box draws itself around the object
  const per = 2 * (box.w + box.h) * clamp(p * 1.5);
  ctx.setLineDash([per, 99999]);
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.setLineDash([]);
  // a thin line from the box corner to the label
  const lp = clamp(p * 2 - 0.6);
  if (lp > 0) {
    const cx = labelX < box.x ? box.x : box.x + box.w;        // start from the box corner nearest the label
    const cy = labelY > box.y + box.h ? box.y + box.h : box.y;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const ex = labelX < box.x ? labelX + 80 : labelX - 8;
    ctx.lineTo(lerp(cx, ex, lp), lerp(cy, labelY - 4, lp));
    ctx.stroke();
  }
  // the label lines type themselves out
  ctx.font = FONT;
  lines.forEach((ln, k) => {
    const q = clamp(p * 2.5 - 1 - k * 0.25);
    ctx.fillStyle = k === 0 ? `rgba(240,230,235,${0.9 * a})` : `rgba(170,155,165,${0.85 * a})`;
    ctx.fillText(typed(ln, q) + (q > 0 && q < 1 && Math.floor(time * 4) % 2 ? '▍' : ''), labelX, labelY + k * 17);
  });
}

function drawPoster(t, time) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textBaseline = 'top';

  // drifting ASCII symbols around the rose
  const gl = flow((t - 0.3) / 2.5);
  if (gl > 0) {
    ctx.font = FONT;
    for (const s of glyphs) {
      const x = rose.x + Math.cos(s.ang) * rose.R * s.rad * 1.15;
      const y = rose.y + s.row * 6 + Math.sin(s.ang) * rose.R * s.rad * 1.1;
      const flick = Math.sin(time * 2 + s.seed);
      const ch = SYMBOLS[Math.floor((flick * 0.5 + 0.5) * (SYMBOLS.length - 1))];
      ctx.fillStyle = `rgba(200,170,190,${0.3 * gl * (0.4 + 0.6 * Math.abs(flick))})`;
      ctx.fillText(ch, Math.round(x / 8) * 8, Math.round(y / 15) * 15);
    }
  }

  // object (2): the rose
  const rb = { x: rose.x - rose.R * 1.12, y: rose.y - rose.R * 1.12, w: rose.R * 2.24, h: rose.R * 2.24 };
  const narrow = W < 600;
  const rLabelX = narrow ? W * 0.5 : Math.min(W - 150, rose.x + rose.R * 1.5);          // phones: under the rose, laptops: to the right
  const rLabelY = narrow ? rose.y + rose.R * 1.45 : rose.y + rose.R * 0.75;
  callout(rb, rLabelX, rLabelY, ['object (2)', 'rose.png', 'the nectar', 'is found'], (t - 0.8) / 3, time);

  // object (1): the bee
  {
    const bs = U * 0.55;
    const bb = { x: beePos.x - bs * 0.55, y: beePos.y - bs * 0.6, w: bs * 1.1, h: bs * 1.05 };
    callout(bb, bb.x + bb.w + 24, bb.y - 10, ['object (1)', 'bee.png', 'looking for', 'nectar'], (t - 1.8) / 3, time);
  }
}

// a live clock in the top-right corner, like the date on the poster
const clockEl = document.getElementById('clock');
function updateClock() {
  const d = new Date();
  const mon = d.toLocaleString('en', { month: 'short' });
  clockEl.innerHTML = `${mon} ${d.getDate()}<br>${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
updateClock();
setInterval(updateClock, 10000);

// =====================================================================
// 6. ANIMATION LOOP + SOFT GLOW + TAP TO REPLAY
// =====================================================================
let start = performance.now();

function frame(now) {
  const time = now / 1000;
  const t = (now - start) / 1000;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#060406';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawRose(time);
  updateBee();
  drawBee(time);

  // soft glow: shrink the picture, blur the small copy (cheap!), add it back on top
  gctx.globalCompositeOperation = 'copy';
  gctx.filter = 'blur(2px)';
  gctx.drawImage(canvas, 0, 0, glowCanvas.width, glowCanvas.height);
  gctx.filter = 'none';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.45;
  ctx.drawImage(glowCanvas, 0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  drawPoster(t, time);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

canvas.addEventListener('click', () => { start = performance.now(); });
})();