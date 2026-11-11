(() => {
// =====================================================================
// 1. SETUP
// =====================================================================
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const title = document.getElementById('title');

const CAM_DIST = 20;                     // how far the camera is from the plant
const TARGET = { x: 0, y: 7.2, z: 0 };   // the point the camera looks at
let W, H, dpr, F, cx, cy;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 1.5);   // 1.5 keeps it sharp but much smoother on high-res screens
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  F = Math.min(H / 17, W / 12.5) * CAM_DIST;    // zoom: fits the plant on any screen
  cx = W / 2;
  cy = H * 0.54;
}
window.addEventListener('resize', resize);
resize();

// =====================================================================
// 2. HELPERS (small 3D maths)
// =====================================================================
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const V = (x, y, z) => ({ x, y, z });
const add = (a, b) => V(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => V(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a, s) => V(a.x * s, a.y * s, a.z * s);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => V(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const norm = a => { const l = Math.hypot(a.x, a.y, a.z) || 1; return V(a.x / l, a.y / l, a.z / l); };
const mixRGB = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const lerpV = (a, b, t) => add(a, mul(sub(b, a), t));

// two directions at right angles to "a" (so we can build things around an axis)
function sideVectors(a) {
  const helper = Math.abs(a.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  const p = norm(cross(a, helper));
  const q = cross(a, p);
  return [p, q];
}

// "random" numbers that come out the same every time
function makeRandom(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}
const rand = makeRandom(7);

const LIGHT = norm(V(-0.35, 0.6, 0.75));   // where the light comes from

// =====================================================================
// 3. THE CAMERA: turns a 3D point into a point on the screen
// =====================================================================
let yaw = 0;          // turning left/right
const PITCH = 0.1;    // looking slightly down

function project(p) {
  const x = p.x - TARGET.x, y = p.y - TARGET.y, z = p.z - TARGET.z;
  const cyw = Math.cos(yaw), syw = Math.sin(yaw);
  const x1 = x * cyw + z * syw;
  const z1 = -x * syw + z * cyw;
  const cp = Math.cos(PITCH), sp = Math.sin(PITCH);
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  const depth = CAM_DIST - z2;              // bigger = further away
  const s = F / depth;
  return { x: cx + x1 * s, y: cy - y2 * s, d: depth, s };
}

// =====================================================================
// 4. DRAW LIST: everything is collected, sorted far → near, then drawn
// =====================================================================
let prims = [];

function rgba(c, a) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}

function addLine(a, b, col, width) {
  prims.push({ d: (a.d + b.d) / 2, type: 1, a, b, col, width });
}
function addDot(p, r, col) {
  prims.push({ d: p.d - 0.02, type: 2, p, r, col });
}

function drawAll() {
  prims.sort((m, n) => n.d - m.d);
  ctx.lineCap = 'round';
  for (const q of prims) {
    if (q.type === 1) {
      ctx.strokeStyle = q.col;
      ctx.lineWidth = q.width;
      ctx.beginPath();
      ctx.moveTo(q.a.x, q.a.y);
      ctx.lineTo(q.b.x, q.b.y);
      ctx.stroke();
    } else if (q.type === 2) {
      ctx.fillStyle = q.col;
      ctx.beginPath();
      ctx.arc(q.p.x, q.p.y, q.r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawMesh(q);
    }
  }
  prims = [];
}

// draws one whole petal / leaf / bud in a single go (much faster than piece by piece)
function drawMesh(m) {
  if (m.tris.length) {
    // a solid shape underneath first, so no thin gaps show between the triangles
    if (m.under) {
      ctx.fillStyle = m.under;
      ctx.beginPath();
      m.outline.forEach((p, k) => k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.fill();
    }
    for (const t of m.tris) {
      ctx.fillStyle = t.col;
      ctx.beginPath();
      ctx.moveTo(t.a.x, t.a.y);
      ctx.lineTo(t.b.x, t.b.y);
      ctx.lineTo(t.c.x, t.c.y);
      ctx.fill();
    }
  }
  if (m.wire) {
    // the whole wireframe as ONE path, and the dots as tiny squares
    ctx.strokeStyle = m.wire;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const [a, b] of m.lines) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke();
    ctx.fillStyle = m.dots;
    for (const p of m.points) ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
  }
}

// a grid of 3D points (rows × cols) → solid triangles and/or a pink wireframe
// grid[i][j] = { p: 3D point, c: [r,g,b] }
function addGrid(grid, solid, wire) {
  const P = grid.map(row => row.map(v => project(v.p)));
  const m = { type: 3, d: 0, tris: [], lines: [], points: [], outline: [], wire: null, under: null };
  let dsum = 0, n = 0;
  for (const row of P) for (const p of row) { dsum += p.d; n++; }
  m.d = dsum / n;
  const avg = [0, 0, 0];
  for (let i = 0; i < grid.length - 1; i++) {
    for (let j = 0; j < grid[i].length - 1; j++) {
      const A = grid[i][j], B = grid[i + 1][j], C = grid[i + 1][j + 1], D = grid[i][j + 1];
      if (solid > 0.01) {
        // simple lighting: faces turned to the light are brighter
        const nrm = norm(cross(sub(B.p, A.p), sub(D.p, A.p)));
        const shade = 0.66 + 0.4 * Math.abs(dot(nrm, LIGHT));
        const col = [0, 1, 2].map(k => Math.min(255, (A.c[k] + B.c[k] + C.c[k] + D.c[k]) / 4 * shade));
        for (let k = 0; k < 3; k++) avg[k] += col[k];
        const c = rgba(col, solid);
        const t1 = { a: P[i][j], b: P[i + 1][j], c: P[i + 1][j + 1], col: c };
        const t2 = { a: P[i][j], b: P[i + 1][j + 1], c: P[i][j + 1], col: c };
        t1.d = (t1.a.d + t1.b.d + t1.c.d) / 3;
        t2.d = (t2.a.d + t2.b.d + t2.c.d) / 3;
        m.tris.push(t1, t2);
      }
      if (wire > 0.01) {
        m.lines.push([P[i][j], P[i + 1][j]], [P[i][j], P[i][j + 1]]);
      }
    }
  }
  if (m.tris.length) {
    m.tris.sort((a, b) => b.d - a.d);
    if (solid > 0.97) {
      const cells = m.tris.length / 2;
      m.under = rgba(avg.map(v => v / cells), 1);
      const rows = P.length, cols = P[0].length;
      for (let j = 0; j < cols; j++) m.outline.push(P[0][j]);
      for (let i = 1; i < rows; i++) m.outline.push(P[i][cols - 1]);
      for (let j = cols - 2; j >= 0; j--) m.outline.push(P[rows - 1][j]);
      for (let i = rows - 2; i > 0; i--) m.outline.push(P[i][0]);
    }
  }
  if (wire > 0.01) {
    m.wire = `rgba(255,175,215,${0.75 * wire})`;
    m.dots = `rgba(255,215,235,${0.9 * wire})`;
    for (const row of P) for (const p of row) m.points.push(p);
  }
  prims.push(m);
}

// =====================================================================
// 5. THE PLANT: three stems (each a smooth 3D curve)
// =====================================================================
const stems = [
  { a: V(-0.15, 0, 0.05), b: V(-0.3, 4, 0.0),  c: V(-0.7, 8, 0.2),  d: V(-1.0, 10.4, 0.3),  delay: 1.6 },
  { a: V(0.12, 0, 0.0),   b: V(0.25, 4, 0.1),  c: V(0.5, 7.4, 0.0), d: V(1.1, 9.4, -0.2),   delay: 1.9 },
  { a: V(0.0, 0, -0.1),   b: V(0.0, 4, -0.2),  c: V(0.1, 8, -0.3),  d: V(0.15, 11.6, -0.4), delay: 1.4 },
];

function stemPoint(s, u) {
  const k = 1 - u;
  return V(
    k * k * k * s.a.x + 3 * k * k * u * s.b.x + 3 * k * u * u * s.c.x + u * u * u * s.d.x,
    k * k * k * s.a.y + 3 * k * k * u * s.b.y + 3 * k * u * u * s.c.y + u * u * u * s.d.y,
    k * k * k * s.a.z + 3 * k * k * u * s.b.z + 3 * k * u * u * s.c.z + u * u * u * s.d.z);
}
function stemDir(s, u) {
  return norm(sub(stemPoint(s, Math.min(1, u + 0.01)), stemPoint(s, Math.max(0, u - 0.01))));
}

// leaves: long and narrow, spiralling up each stem
stems.forEach((s, si) => {
  s.leaves = [];
  for (let j = 0; j < 9; j++) {
    s.leaves.push({
      u: 0.1 + j * 0.075 + rand() * 0.02,
      angle: j * 2.4 + si * 2.1,                 // spiral around the stem
      len: 2.4 + rand() * 0.9,
      w: 0.26 + rand() * 0.08,
      tilt: 0.45 + rand() * 0.35,                 // how much it points upward
    });
  }
});

function drawStem(s, grow, t) {
  if (grow <= 0) return;
  const N = 28;
  let prev = project(stemPoint(s, 0));
  for (let i = 1; i <= N; i++) {
    const u = (i / N) * grow;
    const p = project(stemPoint(s, u));
    addLine(prev, p, 'rgb(62,150,64)', Math.max(1.5, 0.2 * p.s));
    prev = p;
  }
  // a bright growing tip while it grows
  if (grow < 1) addDot(prev, Math.max(1.5, 0.15 * prev.s), 'rgba(220,255,200,0.9)');
}

function drawLeaf(s, l, g) {
  if (g <= 0) return;
  const base = stemPoint(s, l.u);
  const up = stemDir(s, l.u);
  const out = V(Math.cos(l.angle), 0, Math.sin(l.angle));
  const dir = norm(add(mul(out, Math.cos(l.tilt)), mul(up, Math.sin(l.tilt))));
  const side = norm(cross(dir, up));
  const fold = norm(cross(side, dir));
  const L = l.len * g;
  const grid = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    const hw = l.w * Math.sin(Math.PI * Math.pow(u, 0.7)) * (0.4 + 0.6 * g);
    const droop = -u * u * L * 0.35;                            // the leaf bends down at the end
    const centre = add(add(base, mul(dir, u * L)), V(0, droop, 0));
    const row = [];
    for (let j = 0; j <= 2; j++) {
      const v = j - 1;                                          // -1, 0, 1 across the leaf
      const p = add(add(centre, mul(side, v * hw)), mul(fold, Math.abs(v) * hw * 0.3));
      row.push({ p, c: v === 0 ? [120, 200, 90] : [45, 125, 50] });   // lighter middle vein
    }
    grid.push(row);
  }
  addGrid(grid, 1, 0);
}

// =====================================================================
// 6. LILIES AND BUDS
// =====================================================================
const lilies = [
  { stem: 0, u: 0.95, ped: V(-1.7, 0.5, 0.6),  axis: V(-0.6, 0.35, 1), size: 1.0,  rot: 0.3 },
  { stem: 1, u: 0.93, ped: V(1.6, 0.4, 0.7),   axis: V(0.7, 0.25, 1),  size: 1.0,  rot: 1.1 },
  { stem: 2, u: 0.84, ped: V(-0.8, -0.3, 1.3), axis: V(-0.25, 0.1, 1), size: 0.95, rot: 0.7 },
  { stem: 1, u: 0.72, ped: V(1.3, -0.5, 1.1),  axis: V(0.55, -0.1, 1), size: 0.88, rot: 2.0 },
  { stem: 0, u: 0.7,  ped: V(-1.4, -0.4, 1.0), axis: V(-0.6, -0.05, 1), size: 0.86, rot: 1.6 },
];
const buds = [
  { stem: 2, u: 1, ped: V(0, 0.2, 0),    axis: V(0.05, 1, 0.05), len: 2.3, pink: 0.8 },
  { stem: 0, u: 1, ped: V(-0.1, 0.2, 0), axis: V(-0.3, 1, 0.2),  len: 1.6, pink: 0.4 },
  { stem: 1, u: 1, ped: V(0.2, 0.2, 0),  axis: V(0.45, 1, 0),    len: 1.4, pink: 0.2 },
];

// give every lily petal its own freckles
lilies.forEach(f => {
  f.axis = norm(f.axis);
  f.spots = [];
  for (let k = 0; k < 6; k++) {
    const list = [];
    for (let n = 0; n < 9; n++) list.push({ u: 0.12 + rand() * 0.4, v: (rand() - 0.5) * 1.1 });
    f.spots.push(list);
  }
});
buds.forEach(b => { b.axis = norm(b.axis); });

const WHITE = [252, 246, 250], PINK = [200, 30, 95], THROAT = [205, 220, 120];

// one petal: curves out from the centre and rolls back at the tip
function petalGrid(C, A, R, T, len, halfW, open) {
  const NU = 12, NV = 5;
  const spine = [], normals = [];
  let pos = add(C, mul(R, 0.08 * len));
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const phi = lerp(0.12 + 0.2 * u, 0.35 + 2.1 * Math.pow(u, 1.6), open);   // angle away from the centre
    const dir = add(mul(A, Math.cos(phi)), mul(R, Math.sin(phi)));
    spine.push(pos);
    normals.push(add(mul(A, -Math.sin(phi)), mul(R, Math.cos(phi))));
    pos = add(pos, mul(dir, len / NU));
  }
  const grid = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const hw = halfW * (0.18 * (1 - u) + Math.sin(Math.PI * Math.pow(u, 0.75)));
    const row = [];
    for (let j = 0; j <= NV; j++) {
      const v = j / NV * 2 - 1;
      const p = add(add(spine[i], mul(T, v * hw)), mul(normals[i], -v * v * hw * 0.35));
      // colour: pink heart fading to white edges, a little green in the throat
      let pink = Math.pow(clamp(1 - u / 0.7), 0.9) * (1 - 0.5 * Math.abs(v));
      pink = Math.max(pink, clamp(1 - Math.abs(v) / 0.35) * clamp(1 - u / 0.9) * 0.9);
      let c = mixRGB(WHITE, PINK, pink);
      if (u < 0.12) c = mixRGB(c, THROAT, (1 - u / 0.12) * 0.6);
      row.push({ p, c });
    }
    grid.push(row);
  }
  return { grid, spine, normals };
}

function flowerCentre(f) {
  const s = stems[f.stem];
  return add(stemPoint(s, f.u), f.ped);
}

function drawLily(f, appear, solid, time) {
  if (appear <= 0) return;
  const s = stems[f.stem];
  const C = flowerCentre(f);
  // the little stalk joining the flower to the stem
  const ps = project(stemPoint(s, f.u)), pf = project(lerpV(stemPoint(s, f.u), C, smooth(appear * 1.5)));
  addLine(ps, pf, 'rgb(62,150,64)', Math.max(1.5, 0.13 * pf.s));

  const g = smooth(appear);
  const open = smooth(appear * 0.75 + solid * 0.25) + Math.sin(time * 0.9) * 0.025 * solid;   // petals gently 'breathe'
  const wire = g * (1 - solid);
  const [P1, P2] = sideVectors(f.axis);
  for (let k = 0; k < 6; k++) {
    const inner = k % 2 === 1;
    const th = f.rot + k * Math.PI / 3;
    const R = add(mul(P1, Math.cos(th)), mul(P2, Math.sin(th)));
    const T = norm(cross(f.axis, R));
    const len = 3.0 * f.size * g * (inner ? 0.96 : 1);
    const halfW = 0.85 * f.size * (inner ? 1 : 0.75);
    const { grid } = petalGrid(C, f.axis, R, T, len, halfW, open);
    addGrid(grid, solid, wire);
    // freckles
    if (solid > 0.05) {
      for (const sp of f.spots[k]) {
        const row = grid[Math.round(sp.u * 12)];
        const a = row[Math.floor((sp.v + 1) / 2 * 5)].p, b = row[Math.ceil((sp.v + 1) / 2 * 5)].p;
        const pp = project(lerpV(a, b, 0.5));
        addDot(pp, Math.max(0.7, 0.03 * pp.s), `rgba(130,10,55,${solid * 0.9})`);
      }
    }
  }
  // stamens and the pistil in the middle
  if (g > 0.4) {
    const a = clamp((g - 0.4) / 0.6);
    for (let k = 0; k < 6; k++) {
      const th = f.rot + k * Math.PI / 3 + Math.PI / 6;
      const R = add(mul(P1, Math.cos(th)), mul(P2, Math.sin(th)));
      const end = add(add(C, mul(f.axis, 1.6 * f.size * a)), mul(R, 0.6 * f.size * a));
      const pc = project(C), pe = project(end);
      addLine(pc, pe, solid > 0.5 ? `rgba(225,240,205,${a})` : `rgba(255,190,225,${a * wire})`, Math.max(1, 0.05 * pe.s));
      if (solid > 0.05) addDot(pe, Math.max(1.2, 0.075 * pe.s), `rgba(160,60,25,${solid})`);
    }
    const tip = project(add(C, mul(f.axis, 1.8 * f.size * a)));
    addLine(project(C), tip, `rgba(175,205,115,${Math.max(solid, wire * 0.6)})`, Math.max(1.2, 0.07 * tip.s));
    if (solid > 0.05) addDot(tip, Math.max(1.4, 0.1 * tip.s), `rgba(120,150,60,${solid})`);
  }
}

function drawBud(b, appear, solid) {
  if (appear <= 0) return;
  const s = stems[b.stem];
  const B = add(stemPoint(s, b.u), b.ped);
  const [P1, P2] = sideVectors(b.axis);
  const L = b.len * smooth(appear), Rb = 0.36 * b.len / 2;
  const grid = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    const r = Rb * Math.pow(Math.sin(Math.PI * Math.min(u, 0.999)), 0.9) * (1 - 0.35 * u) * smooth(appear);
    const row = [];
    for (let j = 0; j <= 10; j++) {
      const th = j / 10 * Math.PI * 2;
      const p = add(add(B, mul(b.axis, u * L)), add(mul(P1, Math.cos(th) * r), mul(P2, Math.sin(th) * r)));
      row.push({ p, c: mixRGB([95, 165, 70], [235, 120, 160], Math.pow(u, 1.8) * b.pink) });
    }
    grid.push(row);
  }
  addGrid(grid, solid, smooth(appear) * (1 - solid));
}

// =====================================================================
// 7. SPARKLES: drift in from everywhere and gather around the plant
// =====================================================================
const sparkles = [];
for (let i = 0; i < 220; i++) {
  const a = rand() * Math.PI * 2, e = (rand() - 0.5) * Math.PI, r = 12 + rand() * 8;
  sparkles.push({
    from: V(Math.cos(a) * Math.cos(e) * r, 6 + Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r),
    home: V((rand() - 0.5) * 9, 0.5 + rand() * 12.5, (rand() - 0.5) * 5),
    phase: rand() * 6.28,
    speed: 0.5 + rand(),
  });
}

function drawSparkles(t, time) {
  const gather = smooth(t / 5);                 // sparkles take 5 seconds to gather
  for (const sp of sparkles) {
    const drift = V(Math.sin(time * 0.4 * sp.speed + sp.phase) * 0.25, Math.sin(time * 0.3 * sp.speed + sp.phase * 2) * 0.3, 0);
    const p = project(add(lerpV(sp.from, sp.home, gather), drift));
    const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(time * 1.5 * sp.speed + sp.phase));
    addDot(p, Math.max(0.6, 0.035 * p.s), `rgba(255,250,240,${twinkle * Math.min(1, t / 2)})`);
  }
}

// =====================================================================
// 8. THE TIMELINE: what happens when
// =====================================================================
function drawScene(t, time) {
  yaw = Math.sin(time * 0.3) * 0.35;           // the whole plant slowly turns side to side

  drawSparkles(t, time);

  stems.forEach(s => {
    const grow = smooth((t - s.delay) / 4.5);                  // stems: about 1.5s → 6s
    drawStem(s, grow, t);
    s.leaves.forEach(l => {
      drawLeaf(s, l, smooth((grow - l.u) * 4) * smooth((t - 2.6) / 1.5));
    });
  });

  // the stages overlap: colour starts filling in while the wireframe is still drawing
  lilies.forEach((f, i) => {
    const begin = 5.4 + i * 0.3;
    const appear = clamp((t - begin) / 2.6);                     // wireframe draws in
    const solid = smooth((t - (begin + 1.4)) / 2.6);              // colour flows in over it
    drawLily(f, appear, solid, time + i);
  });
  buds.forEach((b, i) => {
    const begin = 6.0 + i * 0.3;
    drawBud(b, clamp((t - begin) / 2.2), smooth((t - (begin + 1.3)) / 2.4));
  });

  drawAll();
}

// =====================================================================
// 9. ANIMATION LOOP + TAP TO REPLAY
// =====================================================================
let start = performance.now();

function frame(now) {
  const time = now / 1000;
  const t = (now - start) / 1000;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  drawScene(t, time);
  title.classList.toggle('show', t > 0.6);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

canvas.addEventListener('click', () => { start = performance.now(); });
})();