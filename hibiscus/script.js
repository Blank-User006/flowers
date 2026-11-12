(() => {
// =====================================================================
// 1. SETUP
// =====================================================================
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const glowCanvas = document.createElement('canvas');      // a small copy used for the soft glow
const gctx = glowCanvas.getContext('2d');
const title = document.getElementById('title');

const CAM_DIST = 22;                     // how far the camera is from the flower
const TARGET = { x: -0.3, y: 6.6, z: 0 }; // the point the camera looks at
let W, H, dpr, F, cx, cy;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 1.25);   // a little lower = smoother on high-res screens
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  glowCanvas.width = Math.ceil(W / 4);
  glowCanvas.height = Math.ceil(H / 4);
  F = Math.min(H / 18.5, W / 16.5) * CAM_DIST;    // zoom: fits both flowers on any screen
  cx = W / 2;
  cy = H * 0.43;
}
window.addEventListener('resize', resize);
resize();

// =====================================================================
// 2. HELPERS (small 3D maths)
// =====================================================================
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const flow = x => Math.sin(clamp(x) * Math.PI / 2);      // starts moving straight away, then gently settles
const V = (x, y, z) => ({ x, y, z });
const add = (a, b) => V(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => V(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a, s) => V(a.x * s, a.y * s, a.z * s);
const cross = (a, b) => V(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const norm = a => { const l = Math.hypot(a.x, a.y, a.z) || 1; return V(a.x / l, a.y / l, a.z / l); };
const lerpV = (a, b, t) => add(a, mul(sub(b, a), t));

function sideVectors(a) {
  const helper = Math.abs(a.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  const p = norm(cross(a, helper));
  return [p, cross(a, p)];
}

function makeRandom(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}
const rand = makeRandom(11);

// =====================================================================
// 3. THE CAMERA
// =====================================================================
let yaw = 0;
const PITCH = 0.1;

function project(p) {
  const x = p.x - TARGET.x, y = p.y - TARGET.y, z = p.z - TARGET.z;
  const cyw = Math.cos(yaw), syw = Math.sin(yaw);
  const x1 = x * cyw + z * syw;
  const z1 = -x * syw + z * cyw;
  const cp = Math.cos(PITCH), sp = Math.sin(PITCH);
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  const s = F / (CAM_DIST - z2);
  return { x: cx + x1 * s, y: cy - y2 * s, s };
}

// =====================================================================
// 4. X-RAY DRAWING TOOLS
//    Everything is drawn with "lighter" blending: overlapping parts ADD
//    their light together. Where many fine veins cross, they glow white.
// =====================================================================
const CORAL = '255,95,70';        // the hibiscus colour of the veins
const BLUSH = '255,170,150';      // lighter pink near the base
const SAGE = '200,240,205';       // pale green for the calyx and stem

// draw a line through 3D points (from point "a" to point "b" along the list)
function strand(pts, a, b, col, width) {
  a = Math.max(0, Math.floor(a));
  b = Math.min(pts.length - 1, b);
  if (b - a <= 0) return;
  ctx.beginPath();
  const last = Math.floor(b);
  for (let i = a; i <= last; i++) {
    const p = project(pts[i]);
    i === a ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  }
  if (b > last) {                                   // the growing tip moves smoothly, not point-by-point
    const p = project(lerpV(pts[last], pts[last + 1], b - last));
    ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = width;
  ctx.stroke();
}

// =====================================================================
// 5. FLOATING DUST
// =====================================================================
const dust = [];
for (let i = 0; i < 90; i++) {
  dust.push({ p: V((rand() - 0.5) * 18, rand() * 15, (rand() - 0.5) * 6), ph: rand() * 6.28, sp: 0.3 + rand() * 0.7 });
}
function drawDust(t, time) {
  for (const d of dust) {
    const q = project(add(d.p, V(Math.sin(time * 0.2 * d.sp + d.ph) * 0.4, ((time * 0.15 * d.sp + d.ph) % 3) - 1.5, 0)));
    const a = (0.12 + 0.3 * Math.abs(Math.sin(time * d.sp + d.ph))) * smooth(t / 2);
    ctx.fillStyle = `rgba(255,225,215,${a})`;
    ctx.fillRect(q.x, q.y, 1.4, 1.4);
  }
}

// =====================================================================
// 6. WHERE THE TWO FLOWERS SIT (one side-on, one facing us)
// =====================================================================
const NU = 26;   // points along each fibre

function makeFlower(o) {
  const f = { ...o, A: norm(o.A), petals: [], pollen: [] };
  // every petal gets its own random fibres (veins)
  for (let k = 0; k < 5; k++) {
    const fibres = [];
    for (let n = 0; n < 95; n++) {
      fibres.push({
        v: (rand() * 2 - 1) * 0.97,                            // where across the petal it runs
        start: n < 52 ? rand() * 0.08 : 0.2 + rand() * 0.45,  // some start later: veins branch out
        end: 0.82 + rand() * 0.18,                             // ragged ends make the frilly edge
        wave: rand() * 6.28,
        wobble: 0.015 + rand() * 0.03,
        bright: 0.6 + rand() * 0.6,
      });
    }
    f.petals.push({ angle: k * Math.PI * 2 / 5 + rand() * 0.3, seed: rand() * 6.28, size: 0.9 + rand() * 0.2, fibres });
  }
  // the pollen filaments on the column: random positions, lengths and directions
  for (let i = 0; i < 55; i++) {
    f.pollen.push({ u: 0.6 + rand() * 0.36, angle: rand() * 6.28, len: 0.2 + rand() * 0.45, bend: (rand() - 0.5) * 0.4 });
  }
  return f;
}

const FLOWERS = [
  // seen from the side, like a trumpet (upper right)
  makeFlower({ base: V(0.6, 7.2, -0.8), A: V(1, 0.65, 0.15), len: 5.4, width: 3.8, flare: 1.45, colLen: 6.6, delay: 0, glow: 1 }),
  // facing us, opened wide like a saucer (lower left)
  makeFlower({ base: V(-2.2, 3.0, 1.0), A: V(-0.2, 0.3, 1), len: 4.6, width: 3.4, flare: 1.75, colLen: 5.0, delay: 0.8, glow: 1.45 }),   // glow: brighter, as it's spread out wider
];

// =====================================================================
// 7. STEMS AND LEAVES (in the same fibre style, softly behind the flowers)
// =====================================================================
function bez(a, b, c, d, u) {
  const k = 1 - u;
  return add(add(mul(a, k * k * k), mul(b, 3 * k * k * u)), add(mul(c, 3 * k * u * u), mul(d, u * u * u)));
}
// one stem per flower, both coming up from below and joining at the bottom
const STEMS = FLOWERS.map((fl, i) => {
  const end = add(fl.base, mul(fl.A, -0.9));
  const start = V(-1.4 + i * 0.3, -3, -0.5);
  const pts = [];
  for (let k = 0; k <= 40; k++) {
    pts.push(bez(start, add(start, V(0.3, 4, 0)), add(end, V(-1.5 * (i ? -0.3 : 1), -2.5, 0)), end, k / 40));
  }
  return pts;
});

// leaves: where they grow from, which way they point, how big (they sit a little behind the flowers)
const LEAVES = [
  { stem: 0, at: 0.55, dir: V(1, 0.25, -0.5),   len: 5.0, w: 1.6 },
  { stem: 1, at: 0.25, dir: V(-1, -0.1, -0.5),  len: 4.6, w: 1.5 },
  { stem: 0, at: 0.28, dir: V(1, -0.4, -0.4),   len: 4.0, w: 1.3 },
  { stem: 1, at: 0.6,  dir: V(-0.6, 1, -1),     len: 3.4, w: 1.1 },
].map(l => {
  const veins = [];
  for (let n = 0; n < 34; n++) veins.push({ u: 0.05 + rand() * 0.8, side: rand() < 0.5 ? -1 : 1, reach: 0.6 + rand() * 0.4, bright: rand() });
  return { ...l, dir: norm(l.dir), veins, seed: rand() * 6.28 };
});

function drawLeaf(l, grow, sway) {
  if (grow <= 0) return;
  const base = STEMS[l.stem][Math.round(l.at * 40)];
  const dir = norm(add(l.dir, V(0, sway, 0)));
  const side = norm(cross(dir, V(0.15, 0.25, 1)));
  const lift = norm(cross(side, dir));
  const g = smooth(grow);
  const L = l.len * g;
  // point on the leaf at (u along, v across): an oval with a pointed tip, slightly toothed edge, curving down
  const at = (u, v) => {
    const hw = l.w * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 1.1) * Math.pow(1 - u, 0.25) * (1 + 0.05 * Math.sin(u * 45)) * g;   // pointed tip
    const c = add(add(base, mul(dir, u * L)), mul(lift, -u * u * L * 0.18 + Math.abs(v) * 0.15));
    return add(c, mul(side, v * hw));
  };
  // soft see-through skin
  const outline = [];
  for (let i = 0; i <= 24; i++) outline.push(at(i / 24, -1));
  for (let i = 24; i >= 0; i--) outline.push(at(i / 24, 1));
  ctx.beginPath();
  outline.map(project).forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath();
  ctx.fillStyle = `rgba(${SAGE},${0.036 * g})`;
  ctx.fill();
  // the edge, very faint
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = `rgba(${SAGE},0.19)`;
  ctx.stroke();
  // side veins: curve out from the middle towards the tip, like a real leaf
  const soft = new Path2D(), bright = new Path2D();
  for (const vn of l.veins) {
    const tgt = vn.bright > 0.7 ? bright : soft;
    let prev = null;
    for (let k = 0; k <= 6; k++) {
      const s2 = k / 6;
      const p = project(at(Math.min(1, vn.u + s2 * 0.22 * vn.reach), vn.side * s2 * vn.reach * 0.95));
      if (prev) { tgt.moveTo(prev.x, prev.y); tgt.lineTo(p.x, p.y); }
      prev = p;
    }
  }
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = `rgba(${SAGE},0.18)`; ctx.stroke(soft);
  ctx.strokeStyle = `rgba(${SAGE},0.36)`; ctx.stroke(bright);
  // the midrib
  const mid = [];
  for (let i = 0; i <= 20; i++) mid.push(at(i / 20, 0));
  strand(mid, 0, 20, `rgba(${SAGE},0.48)`, 1);
}

function drawStems(grow) {
  STEMS.forEach(pts => {
    strand(pts, 0, 40 * grow, `rgba(${SAGE},0.10)`, 4);
    strand(pts, 0, 40 * grow, `rgba(${SAGE},0.35)`, 1.4);
  });
}

// =====================================================================
// 8. THE PETALS: hundreds of fine glowing veins + the green calyx
// =====================================================================
// the surface of one petal: point at (u along, v across)
function petalFrame(fl, pt, open, spin) {
  const { base, A } = fl;
  const [P1, P2] = sideVectors(A);
  const ang = pt.angle + spin;
  const R = add(mul(P1, Math.cos(ang)), mul(P2, Math.sin(ang)));
  const T = norm(cross(A, R));
  const len = fl.len * pt.size;
  // the petal's middle line: a narrow tube at first, then flaring out
  const spine = [], normals = [];
  let pos = add(base, mul(R, 0.12));
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const phi = lerp(0.08 + 0.12 * u, 0.15 + fl.flare * Math.pow(u, 1.5), open);
    const dir = add(mul(A, Math.cos(phi)), mul(R, Math.sin(phi)));
    spine.push(pos);
    normals.push(add(mul(A, -Math.sin(phi)), mul(R, Math.cos(phi))));
    pos = add(pos, mul(dir, len / NU));
  }
  return (u, v) => {
    const i = Math.min(NU, Math.round(u * NU));
    const hw = fl.width * pt.size * Math.pow(u, 0.9) * (1 - 0.25 * Math.pow(u, 6)) * (0.3 + 0.7 * open);   // a fan: narrow base, wide end
    // the frilly, wavy edge
    const ruffle = (Math.sin(v * 8 + pt.seed) * 0.45 + Math.sin(v * 17 + pt.seed * 2) * 0.18) * Math.pow(u, 2.4) * open;
    return add(add(spine[i], mul(T, v * hw)), mul(normals[i], ruffle - v * v * hw * 0.25));
  };
}

function drawPetal(fl, pt, grow, membrane, open, spin) {
  const at = petalFrame(fl, pt, open, spin);

  // 1) a very faint see-through skin
  if (membrane > 0) {
    const outline = [];
    for (let i = 0; i <= NU; i++) outline.push(at(i / NU, -0.97));                       // up one side
    for (let j = 0; j <= 30; j++) outline.push(at(1, j / 30 * 1.94 - 0.97));              // along the frilly edge
    for (let i = NU; i >= 0; i--) outline.push(at(i / NU, 0.97));                         // back down the other side
    ctx.beginPath();
    outline.map(project).forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = `rgba(${CORAL},${0.045 * membrane * fl.glow})`;
    ctx.fill();
  }

  // 2) the fibres: hundreds of fine veins fanning out from the base.
  //    They're collected into 4 batches (pale/coral × softer/brighter) and each batch is drawn in ONE go.
  const batches = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
  for (const f of pt.fibres) {
    const a = f.start * NU, b = Math.min(f.end, grow) * NU;
    if (b <= a) continue;
    const mid = Math.max(a, Math.min(b, 0.35 * NU));
    const hi = f.bright > 0.9 ? 1 : 0;
    let prev = null;
    const steps = [];
    for (let i = Math.floor(a); i <= Math.floor(b); i++) steps.push(i);
    if (b > Math.floor(b)) steps.push(b);                      // the very tip grows smoothly, not in jumps
    for (const i of steps) {
      const u = i / NU;
      const v = f.v * Math.pow(u, 0.25) + Math.sin(u * 11 + f.wave) * f.wobble;   // fan out + wobble
      const p = project(at(u, v));
      if (prev) {
        const path = batches[(i <= mid ? 0 : 2) + hi];        // near the base: pale blush, further out: coral
        path.moveTo(prev.x, prev.y);
        path.lineTo(p.x, p.y);
      }
      prev = p;
    }
  }
  ctx.lineWidth = 0.75;
  const k = fl.glow;   // how bright this flower is
  ctx.strokeStyle = `rgba(${BLUSH},${0.10 * k})`; ctx.stroke(batches[0]);
  ctx.strokeStyle = `rgba(${BLUSH},${0.16 * k})`; ctx.stroke(batches[1]);
  ctx.strokeStyle = `rgba(${CORAL},${0.13 * k})`; ctx.stroke(batches[2]);
  ctx.strokeStyle = `rgba(${CORAL},${0.20 * k})`; ctx.stroke(batches[3]);
}

// the green cup (calyx) at the base of a flower
function drawCalyx(fl, grow) {
  if (grow <= 0) return;
  const { base, A } = fl;
  const [P1, P2] = sideVectors(A);
  // a soft bulb
  const b = project(add(base, mul(A, -0.3)));
  const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 0.9 * b.s);
  g.addColorStop(0, `rgba(240,250,235,${0.5 * grow})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(b.x, b.y, 0.9 * b.s, 0, Math.PI * 2); ctx.fill();
  // thin pointed sepals curling around the petals
  for (let k = 0; k < 7; k++) {
    const ang = k * Math.PI * 2 / 7 + 0.3;
    const R = add(mul(P1, Math.cos(ang)), mul(P2, Math.sin(ang)));
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      pts.push(add(add(base, mul(A, -0.4 + u * 1.4)), mul(R, 0.35 + u * 0.5 + u * u * 0.35)));
    }
    strand(pts, 0, 10 * grow, `rgba(${SAGE},0.5)`, 1.1);
  }
}

// =====================================================================
// 9. THE CENTRE COLUMN with pollen
// =====================================================================
// the long column with pollen sticking out of the middle
function drawColumn(fl, grow, time) {
  if (grow <= 0) return;
  const { base, A } = fl;
  const [P1, P2] = sideVectors(A);
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const u = i / 30 * grow;
    pts.push(add(add(add(base, mul(A, u * fl.colLen)), mul(P2, Math.sin(u * 2.2) * 0.35)), V(0, u * u * 0.6, 0)));
  }
  // a soft glowing tube: the same line drawn wide-and-faint, then narrower-and-brighter
  const sc = project(pts[0]).s;
  strand(pts, 0, 30, 'rgba(255,170,160,0.10)', 0.42 * sc);
  strand(pts, 0, 30, 'rgba(255,195,185,0.14)', 0.2 * sc);
  strand(pts, 0, 30, 'rgba(255,230,225,0.38)', 0.06 * sc);
  // tiny filaments with pollen near the end
  for (const f of fl.pollen) {
    if (f.u > grow) continue;
    const p = pts[Math.round(f.u / grow * 30)];
    const a = f.angle + time * 0.15;
    const out = add(mul(P1, Math.cos(a)), mul(P2, Math.sin(a)));
    const mid = add(p, add(mul(out, f.len * 0.5), mul(A, f.bend * 0.3)));
    const tip = add(p, add(mul(out, f.len), mul(A, f.bend)));
    strand([p, mid, tip], 0, 2, 'rgba(255,200,190,0.3)', 0.7);
    const q = project(tip);
    ctx.fillStyle = 'rgba(255,195,180,0.55)';
    ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(0.9, 0.035 * q.s), 0, Math.PI * 2); ctx.fill();
  }
  // five little stigma pads at the very tip
  if (grow > 0.97) {
    const end = pts[30];
    for (let k = 0; k < 5; k++) {
      const a = k * Math.PI * 2 / 5;
      const q = project(add(end, add(mul(P1, Math.cos(a) * 0.2), mul(P2, Math.sin(a) * 0.2))));
      ctx.fillStyle = 'rgba(255,150,140,0.9)';
      ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1.4, 0.08 * q.s), 0, Math.PI * 2); ctx.fill();
    }
  }
}

// =====================================================================
// 10. THE TIMELINE: what happens when
// =====================================================================
function drawScene(t, time) {
  yaw = -0.15 + Math.sin(time * 0.22) * 0.22;                // slowly turns side to side
  const spin = time * 0.05;                                  // the flowers slowly roll around themselves

  drawDust(t, time);

  // background first: stems and leaves, softly
  drawStems(flow(t / 3));                                    // stems: 0s → 3s
  LEAVES.forEach((l, i) => drawLeaf(l, flow((t - 0.8 - i * 0.35) / 3), Math.sin(time * 0.6 + i) * 0.04));

  // then the two flowers, the front-facing one a little later
  FLOWERS.forEach((fl, i) => {
    const d = fl.delay;
    // every stage starts before the previous one finishes, so it all flows together
    drawCalyx(fl, flow((t - 1.2 - d) / 2));                  // green base
    const grow = flow((t - 1.9 - d) / 4.5);                  // veins grow outward
    const open = 0.15 + 0.85 * flow((t - 1.9 - d) / 5.5);    // the flower opens at the same time
    const skin = flow((t - 2.8 - d) / 4);                    // see-through skin
    fl.petals.forEach(pt => drawPetal(fl, pt, grow, skin, open, spin * (i ? -1 : 1)));
    drawColumn(fl, flow((t - 4 - d) / 3.5), time);           // the column grows out
  });
}

// =====================================================================
// 11. ANIMATION LOOP + SOFT GLOW + TAP TO REPLAY
// =====================================================================
let start = performance.now();

function frame(now) {
  const time = now / 1000;
  const t = (now - start) / 1000;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'lighter';           // X-ray: overlapping light adds up
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawScene(t, time);

  // soft glow: shrink the picture, blur the small copy (cheap!), then add it back on top
  gctx.globalCompositeOperation = 'copy';
  gctx.filter = 'blur(3px)';
  gctx.drawImage(canvas, 0, 0, glowCanvas.width, glowCanvas.height);
  gctx.filter = 'none';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.8;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(glowCanvas, 0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  title.classList.toggle('show', t > 0.6);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

canvas.addEventListener('click', () => { start = performance.now(); });
})();