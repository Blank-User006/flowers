(() => {
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const tiny = document.createElement('canvas');
const tctx = tiny.getContext('2d', { willReadFrequently: true });
const CHARS = '.:-=+*o#%@';
let W, H, dpr, fontSize, cellW, cellH, cols, rows, S, tie, base;
let time = 0;          // seconds since the page opened (used for swaying)

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);   // sharper letters on high-res screens
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  fontSize = 10;
  cellW = fontSize * 0.6;
  cellH = fontSize;
  cols = Math.ceil(W / cellW);
  rows = Math.ceil(H / cellH);
  tiny.width = cols;
  tiny.height = rows;
  // bouquet size + position
  S = Math.min(W * 0.47 / 62, H * 0.62 / 90);   // leaves room at the top for the bee
  tie = { x: W / 2, y: H * 0.74 };
  base = { x: W / 2, y: tie.y + 14 * S };
}
window.addEventListener('resize', resize);
resize();

// ===== Helpers =====
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = x => Math.sin(clamp(x) * Math.PI / 2);   // starts moving right away, then gently slows down
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const backOut = x => { x = clamp(x); return 1 + 2.3 * Math.pow(x - 1, 3) + 1.3 * Math.pow(x - 1, 2); }; // slight overshoot
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(t)))).join(',')})`;
};

// "random" numbers that come out the same every time, so the bouquet always looks the same
function makeRandom(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}
const rand = makeRandom(1102);

// tulip colours: [deep, middle, light]
const TULIPS = [
  ['#b3122e', '#e0283f', '#ff6b6b'],   // red
  ['#c2185b', '#ec5f94', '#ffa6c6'],   // pink
  ['#d9480f', '#f7782a', '#ffb066'],   // orange
  ['#6a2c91', '#9b4dca', '#c99bf0'],   // purple
  ['#e0283f', '#f04e6a', '#ffd166'],   // flame (red with yellow tips)
];

// ===== The bouquet: one object per stem =====
const types = ['tulip','sun','tulip','tbud','sun','tulip','tulip','sun','tulip','tbud','tulip','sun','tulip','sun','tulip'];

const stems = types.map((type, i) => {
  const k = i / (types.length - 1);           // 0 = far left, 1 = far right
  const angle = lerp(-0.62, 0.62, k) + (rand() - 0.5) * 0.12;
  const middle = 1 - Math.abs(k - 0.5) * 2;    // 1 in the middle, 0 at the edges
  const len = (type === 'sun' ? 40 : 54) + middle * 12 + (rand() - 0.5) * 12;
  const leaves = [];
  const count = type === 'sun' ? 3 + Math.floor(rand() * 2) : 2;
  for (let j = 0; j < count; j++) {
    const side = j % 2 ? 1 : -1;
    if (type === 'sun') {      // broad, heart-shaped sunflower leaves
      leaves.push({ u: 0.3 + (j / count) * 0.5 + rand() * 0.05, side, spread: 0.9 + rand() * 0.4,
        len: 10 + rand() * 4, w: 4 + rand() * 1.5, heart: true,
        col: ['#6cbf3a', '#7ccf45', '#5aae32'][Math.floor(rand() * 3)] });
    } else {                   // long, thin tulip leaves
      leaves.push({ u: 0.3 + j * 0.25 + rand() * 0.08, side, spread: 0.5 + rand() * 0.3,
        len: 15 + rand() * 6, w: 2.6 + rand() * 0.8, heart: false,
        col: ['#7fc98a', '#8fd896', '#6cbb7a'][Math.floor(rand() * 3)] });
    }
  }
  return {
    type, angle, len, leaves,
    tip:  { x: Math.sin(angle) * len * 1.1, y: -Math.cos(angle) * len },
    bend: { x: Math.sin(angle) * len * 0.28, y: -len * 0.58 },
    jit: (rand() - 0.5) * 2.4,                 // small sideways offset
    delay: rand() * 1.0 + Math.abs(k - 0.5) * 0.6,
    // for the flowers
    size: 0.9 + rand() * 0.22,
    tilt: (rand() - 0.5) * 0.6,
    squash: 0.82 + rand() * 0.18,
    rot: rand() * 6.28,
    bloomOff: rand() * 1.6,
    pal: TULIPS[Math.floor(rand() * TULIPS.length)],
    phase: rand() * 6.28,                      // so each stem sways a little differently
  };
});

// flowers are drawn in this order: tulips first, sunflowers last (in front)
const drawOrder = stems.slice().sort((p, q) =>
  (p.type === 'sun' ? 1 : 0) - (q.type === 'sun' ? 1 : 0) || p.tip.y - q.tip.y);

// a point on the curved part of a stem (u = 0 at the tie … 1 at the tip)
function stemPoint(s, u) {
  // gentle breeze: two slow waves mixed together, so it never looks mechanical
  const sway = Math.sin(time * 0.7 + s.phase) * 1.1 + Math.sin(time * 0.31 + s.phase * 2) * 0.6;
  const p0 = { x: tie.x + s.jit * 0.18 * S, y: tie.y };
  const p1 = { x: tie.x + (s.bend.x + sway * 0.3) * S, y: tie.y + s.bend.y * S };
  const p2 = { x: tie.x + (s.tip.x + sway) * S, y: tie.y + s.tip.y * S };
  return {
    x: (1 - u) ** 2 * p0.x + 2 * (1 - u) * u * p1.x + u * u * p2.x,
    y: (1 - u) ** 2 * p0.y + 2 * (1 - u) * u * p1.y + u * u * p2.y,
  };
}

// which way the stem is pointing at u (an angle)
function stemAngle(s, u) {
  const a = stemPoint(s, Math.max(0, u - 0.01));
  const b = stemPoint(s, Math.min(1, u + 0.01));
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function drawStem(s, progress) {
  if (progress <= 0) return;
  tctx.strokeStyle = s.type === 'sun' ? '#4a8a26' : '#4f9058';
  tctx.lineWidth = Math.max((s.type === 'sun' ? 1.3 : 0.95) * S, cellW * 1.05);
  tctx.lineCap = 'round';
  tctx.beginPath();

  // bottom part: a straight line from the base up to the tie point
  const low = clamp(progress / 0.22);
  const bx = base.x + s.jit * 0.5 * S;
  tctx.moveTo(bx, base.y);
  tctx.lineTo(lerp(bx, tie.x + s.jit * 0.18 * S, low), lerp(base.y, tie.y, low));

  // top part: curve out towards the tip
  if (progress > 0.22) {
    const u = (progress - 0.22) / 0.78;
    for (let i = 1; i <= 30; i++) {
      const p = stemPoint(s, u * i / 30);
      tctx.lineTo(p.x, p.y);
    }
  }
  tctx.stroke();
}

// draw one leaf at (x, y), pointing at angle ang; g = how grown it is (0 → 1)
function drawLeaf(x, y, ang, l, g) {
  tctx.save();
  tctx.translate(x, y);
  tctx.rotate(ang);
  const L = l.len * S * easeOut(g);
  const w = Math.max(l.w * S, cellW * 0.9) * (0.5 + 0.5 * g);
  const bend = w * 0.3;

  // a little shading: lighter on top, darker underneath
  const grad = tctx.createLinearGradient(0, -w, 0, w);
  grad.addColorStop(0, l.col);
  grad.addColorStop(1, mix(l.col, '#1e3a12', 0.35));
  tctx.fillStyle = grad;

  tctx.beginPath();
  tctx.moveTo(0, 0);
  if (l.heart) {
    tctx.bezierCurveTo(L * 0.1, -w * 1.1, L * 0.6, -w * 0.9, L, bend);
    tctx.bezierCurveTo(L * 0.6, w * 0.9, L * 0.1, w * 1.1, 0, 0);
  } else {
    tctx.quadraticCurveTo(L * 0.4, -w + bend, L, bend * 2);
    tctx.quadraticCurveTo(L * 0.4, w + bend, 0, 0);
  }
  tctx.fill();

  // the vein down the middle
  tctx.strokeStyle = 'rgba(200,230,150,0.35)';
  tctx.lineWidth = cellW * 0.5;
  tctx.beginPath();
  tctx.moveTo(0, 0);
  tctx.quadraticCurveTo(L * 0.5, bend * 0.5, L * 0.9, bend * 1.4);
  tctx.stroke();
  tctx.restore();
}

// ===== Tulips =====
// one cup-shaped petal, pointing along +x
function tulipPetal(Lp, Wp, spread, c0, c1, c2) {
  const grad = tctx.createLinearGradient(0, 0, Lp, 0);
  grad.addColorStop(0, c0);
  grad.addColorStop(0.55, c1);
  grad.addColorStop(1, c2);
  tctx.fillStyle = grad;
  tctx.beginPath();
  tctx.moveTo(0, -Wp * 0.25);
  tctx.bezierCurveTo(Lp * 0.35, -Wp * 1.05, Lp * 0.8, -Wp * (0.85 + spread), Lp, -Wp * (0.2 + spread * 0.9));
  tctx.bezierCurveTo(Lp * 0.7, -Wp * 0.1, Lp * 0.4, Wp * 0.3, 0, Wp * 0.25);
  tctx.closePath();
  tctx.fill();
}

// budG = how big the bud is (0 → 1), f = how open/coloured the flower is (0 → 1)
function drawTulip(s, x, y, ang, budG, f) {
  if (budG <= 0) return;
  const [deep, mid, light] = s.pal;
  const grow = easeOut(budG) * (0.55 + 0.45 * backOut(f));
  const col = c => mix('#8fbf5a', c, f * 1.6);      // starts green, turns colourful
  const Lp = 12 * s.size * S * grow;
  const Wp = 4.7 * s.size * S * grow;
  const spread = 0.35 * clamp((f - 0.5) * 2);       // petal tips open outward at the end

  tctx.save();
  tctx.translate(x, y);
  tctx.rotate(ang + s.tilt * 0.4);

  // little green knob where the flower meets the stem
  tctx.fillStyle = '#5a9a2e';
  tctx.beginPath();
  tctx.arc(0, 0, Math.max(1.2 * S, cellW * 0.9), 0, Math.PI * 2);
  tctx.fill();

  // back petal (darker)
  tctx.save();
  tctx.translate(Lp * 0.05, 0);
  tulipPetal(Lp * 0.98, Wp * 0.75, spread * 0.5, col(deep), col(deep), col(mid));
  tctx.restore();

  // two side petals (the second one is mirrored)
  tulipPetal(Lp, Wp, spread, col(deep), col(mid), col(light));
  tctx.save();
  tctx.scale(1, -1);
  tulipPetal(Lp, Wp, spread, col(deep), col(mid), col(light));
  tctx.restore();

  // front petal, lighter in the middle
  const grad = tctx.createLinearGradient(0, 0, Lp, 0);
  grad.addColorStop(0, col(mid));
  grad.addColorStop(0.6, col(light));
  grad.addColorStop(1, col(mid));
  tctx.fillStyle = grad;
  tctx.beginPath();
  tctx.moveTo(0, 0);
  tctx.bezierCurveTo(Lp * 0.3, -Wp * 0.6, Lp * 0.8, -Wp * 0.45, Lp * 0.97, 0);
  tctx.bezierCurveTo(Lp * 0.8, Wp * 0.45, Lp * 0.3, Wp * 0.6, 0, 0);
  tctx.fill();

  tctx.restore();
}

// ===== Sunflowers =====
// a round seed disc with two rings of yellow petals, seen from the front
function drawSun(s, x, y, ang, budG, f) {
  if (budG <= 0) return;
  tctx.save();
  // sit the flower just past the stem tip, facing us (slightly tilted)
  tctx.translate(x + Math.cos(ang) * 3 * S, y + Math.sin(ang) * 3 * S);
  tctx.rotate(ang + Math.PI / 2 + s.tilt);
  tctx.scale(1, s.squash);            // a little squashed = turned slightly away
  tctx.rotate(s.rot);

  const disc = 4.8 * s.size * S * easeOut(budG) * (0.7 + 0.3 * clamp(f * 2));

  // green leafy cup behind the flower (this is all you see while it's a bud)
  tctx.fillStyle = '#4f8a2a';
  for (let k = 0; k < 14; k++) {
    tctx.save();
    tctx.rotate(k * Math.PI * 2 / 14 + 0.2);
    tctx.beginPath();
    tctx.ellipse(disc * 1.05, 0, disc * 0.45, disc * 0.2, 0, 0, Math.PI * 2);
    tctx.fill();
    tctx.restore();
  }

  // yellow petals: two rings of 16, the back ring slightly darker
  if (f > 0) {
    const F = backOut(f);
    for (let ring = 0; ring < 2; ring++) {
      const Lp = disc * (ring ? 1.05 : 1.25) * F;
      const Wp = disc * 0.27 * (0.5 + 0.5 * clamp(f * 1.5));
      for (let k = 0; k < 16; k++) {
        tctx.save();
        tctx.rotate(k * Math.PI * 2 / 16 + ring * 0.196);
        tctx.translate(disc * 0.85, 0);
        const grad = tctx.createLinearGradient(0, 0, Lp, 0);
        grad.addColorStop(0, ring ? '#e09a0e' : '#f0a81a');
        grad.addColorStop(0.5, ring ? '#f6c02a' : '#ffcf33');
        grad.addColorStop(1, ring ? '#f9d34a' : '#ffe066');
        tctx.fillStyle = grad;
        tctx.beginPath();
        tctx.moveTo(0, 0);
        tctx.bezierCurveTo(Lp * 0.3, -Wp, Lp * 0.8, -Wp * 0.8, Lp, 0);
        tctx.bezierCurveTo(Lp * 0.8, Wp * 0.8, Lp * 0.3, Wp, 0, 0);
        tctx.fill();
        tctx.restore();
      }
    }
  }

  // brown seed disc (green while it's still a bud)
  const rg = tctx.createRadialGradient(0, 0, 0, 0, 0, disc);
  rg.addColorStop(0,    mix('#6b8f2a', '#6a4220', f * 2));
  rg.addColorStop(0.55, mix('#5a8a2a', '#8a5426', f * 2));
  rg.addColorStop(0.85, mix('#4f7d26', '#a8682a', f * 2));
  rg.addColorStop(1,    mix('#4f8a2a', '#c98a2e', f * 2));
  tctx.fillStyle = rg;
  tctx.beginPath();
  tctx.arc(0, 0, disc, 0, Math.PI * 2);
  tctx.fill();

  // seed dots in a spiral (the "golden angle" 2.39996 is how real sunflowers do it!)
  if (f > 0.3) {
    tctx.fillStyle = `rgba(240,180,90,${0.55 * clamp((f - 0.3) * 2)})`;
    for (let i = 0; i < 70; i++) {
      const r = disc * 0.92 * Math.sqrt(i / 70);
      const th = i * 2.39996;
      tctx.beginPath();
      tctx.arc(Math.cos(th) * r, Math.sin(th) * r, Math.max(disc * 0.045, cellW * 0.25), 0, Math.PI * 2);
      tctx.fill();
    }
  }
  tctx.restore();
}

// ===== Ribbon =====
// a pink bow tied where the stems meet; g = how far it has appeared (0 → 1)
function drawRibbon(g) {
  if (g <= 0) return;
  const R = 2.3 * S;   // ribbon size: make this bigger or smaller
  const light = '#ff8fb1', mid = '#e8457a', dark = '#b8285a';
  tctx.save();
  tctx.translate(tie.x, tie.y + 4 * S);
  tctx.globalAlpha = clamp(g * 2);

  // two tails hanging down
  tctx.fillStyle = dark;
  for (const side of [-1, 1]) {
    tctx.beginPath();
    tctx.moveTo(0, 0);
    tctx.quadraticCurveTo(side * 3 * R, 5 * R * g, side * 4.5 * R, 10 * R * g);
    tctx.lineTo(side * 2.6 * R, 10.5 * R * g);
    tctx.quadraticCurveTo(side * 1.5 * R, 5 * R * g, 0, 0);
    tctx.fill();
  }

  // the band wrapped around the stems
  tctx.fillStyle = mid;
  tctx.fillRect(-3.4 * R, -1.2 * R, 6.8 * R, 2.4 * R);

  // two loops of the bow, tilted slightly upward
  for (const side of [-1, 1]) {
    tctx.save();
    tctx.rotate(side * -0.35);
    const grad = tctx.createLinearGradient(0, 0, side * 10 * R, 0);
    grad.addColorStop(0, dark);
    grad.addColorStop(0.6, mid);
    grad.addColorStop(1, light);
    tctx.fillStyle = grad;
    tctx.beginPath();
    tctx.ellipse(side * 5 * R * g, 0, 5 * R * g, 2.8 * R * g, 0, 0, Math.PI * 2);
    tctx.fill();
    tctx.restore();
  }

  // the knot in the middle
  tctx.fillStyle = light;
  tctx.beginPath();
  tctx.arc(0, 0, Math.max(1.8 * R, cellW), 0, Math.PI * 2);
  tctx.fill();
  tctx.restore();
}

// ===== Bee =====
// the bee flies to the tallest red tulip and stays there
const redTulip = stems
  .filter(s => s.type === 'tulip' && s.pal === TULIPS[0])
  .sort((a, b) => a.tip.y - b.tip.y)[0];

// the middle of a flower (follows the flower as it sways)
function flowerCenter(s) {
  const p = stemPoint(s, 1);
  const ang = stemAngle(s, 1);
  return { x: p.x + Math.cos(ang) * 7 * S, y: p.y + Math.sin(ang) * 7 * S - 1.2 * S };
}

const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };   // gentle start AND gentle stop

function drawBee(t) {
  // the moment the red tulip is about 90% open, the bee sets off
  const leave = redTulip.delay + 3.2 + redTulip.bloomOff * 0.3 + 2.4 * 0.71;
  const FLY = 2.6;                                    // seconds to fly in
  const p = smooth((t - leave) / FLY);
  if (p <= 0) return;

  const from = { x: W + 80, y: tie.y - 70 * S };     // starts off-screen, top right
  const to = flowerCenter(redTulip);
  const flying = p < 1;

  let x = to.x, y = to.y;                            // landed: sits still on the flower
  if (flying) {
    // a curved path in, with a little buzzy wobble
    x = lerp(from.x, to.x, p) + Math.sin(time * 6) * 1.2 * S * Math.sin(Math.PI * p);
    y = lerp(from.y, to.y, p) - Math.sin(Math.PI * p) * 14 * S + Math.sin(time * 9) * 0.8 * S;
  }

  const Bs = 2.2 * S;                 // bee size: make this bigger or smaller
  tctx.save();
  tctx.translate(x, y);
  tctx.scale(-1, 1);                  // facing left (it comes in from the right)
  tctx.rotate(flying ? -0.15 : 0);

  // wings: buzz while flying, completely still once it has landed
  const flap = flying ? 0.35 + 0.65 * Math.abs(Math.sin(time * 38)) : 1;
  tctx.fillStyle = 'rgba(200, 235, 255, 0.5)';   // see-through wings
  tctx.save();
  tctx.translate(-0.3 * Bs, -1 * Bs);
  tctx.scale(1, flap);
  tctx.beginPath();
  tctx.ellipse(-0.6 * Bs, -1.2 * Bs, 0.9 * Bs, 1.5 * Bs, -0.5, 0, Math.PI * 2);   // back wing
  tctx.fill();
  tctx.beginPath();
  tctx.ellipse(0.6 * Bs, -1.3 * Bs, 0.9 * Bs, 1.6 * Bs, 0.35, 0, Math.PI * 2);    // front wing
  tctx.fill();
  tctx.restore();

  // fuzzy yellow body
  const grad = tctx.createLinearGradient(0, -1.6 * Bs, 0, 1.6 * Bs);
  grad.addColorStop(0, '#ffe066');
  grad.addColorStop(1, '#f2a900');
  tctx.fillStyle = grad;
  tctx.beginPath();
  tctx.ellipse(-0.4 * Bs, 0, 2.6 * Bs, 1.6 * Bs, 0, 0, Math.PI * 2);
  tctx.fill();

  // dark stripes
  tctx.fillStyle = '#3a2508';
  for (const sx of [-1.6, -0.3, 1.0]) {
    tctx.beginPath();
    tctx.ellipse(sx * Bs, 0, 0.38 * Bs, 1.5 * Bs, 0, 0, Math.PI * 2);
    tctx.fill();
  }

  // stinger
  tctx.beginPath();
  tctx.moveTo(-3 * Bs, -0.3 * Bs);
  tctx.lineTo(-3.9 * Bs, 0);
  tctx.lineTo(-3 * Bs, 0.3 * Bs);
  tctx.fill();

  // head
  tctx.fillStyle = '#6b4a1c';
  tctx.beginPath();
  tctx.arc(2.6 * Bs, -0.1 * Bs, 1.05 * Bs, 0, Math.PI * 2);
  tctx.fill();
  tctx.restore();
}

function drawScene(t) {
  tctx.setTransform(1, 0, 0, 1, 0, 0);
  tctx.clearRect(0, 0, cols, rows);
  tctx.setTransform(1 / cellW, 0, 0, 1 / cellH, 0, 0);

  stems.forEach(s => drawStem(s, ease((t - s.delay) / 3)));

  // leaves pop out once the stem has grown past them
  stems.forEach(s => {
    const grown = (ease((t - s.delay) / 3) - 0.22) / 0.78;
    s.leaves.forEach(l => {
      const g = clamp((grown - l.u) * 3.2) * clamp((t - s.delay - 0.6) / 1.2);
      if (g <= 0) return;
      const p = stemPoint(s, l.u);
      drawLeaf(p.x, p.y, stemAngle(s, l.u) + l.side * l.spread, l, g);
    });
  });

  // flowers on the tips: a bud forms once the stem is done, then it blooms
  drawOrder.forEach(s => {
    const p = stemPoint(s, 1);
    const ang = stemAngle(s, 1);
    // the bud starts while the stem is still finishing, and the flower starts
    // opening while the bud is still growing, so it all overlaps into one smooth motion
    const budG  = ease((t - (s.delay + 2.4)) / 1.6);
    const bloom = ease((t - (s.delay + 3.2 + s.bloomOff * 0.3)) / 2.4);
    if (s.type === 'tulip') drawTulip(s, p.x, p.y, ang, budG, bloom);
    if (s.type === 'tbud')  drawTulip(s, p.x, p.y, ang, budG, bloom * 0.35);
    if (s.type === 'sun')   drawSun(s, p.x, p.y, ang, budG, bloom);
  });

  // the bow gets tied once the stems have grown
  drawRibbon(ease((t - 3.2) / 1.4));

  // the bee flies in as the red tulip opens, and stays on it
  drawBee(t);
}

function toAscii() {
  const data = tctx.getImageData(0, 0, cols, rows).data;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#040404';
  ctx.fillRect(0, 0, W, H);

  // soft glow: a blurry, faint copy of the tiny canvas behind the letters
  ctx.globalAlpha = 0.18;
  ctx.filter = 'blur(6px)';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tiny, 0, 0, cols * cellW, rows * cellH);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;

  ctx.font = fontSize + 'px monospace';
  ctx.textBaseline = 'top';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const a = data[i + 3] / 255;
      if (a < 0.1) continue;
      const bright = Math.pow((0.3 * r + 0.59 * g + 0.11 * b) / 255, 0.6) * a;
      const index = Math.min(CHARS.length - 1, Math.floor(bright * CHARS.length));
      ctx.fillStyle = `rgb(${Math.min(255, r * 1.25)},${Math.min(255, g * 1.25)},${Math.min(255, b * 1.25)})`;
      ctx.fillText(CHARS[index], x * cellW, y * cellH);
    }
  }
}

// ===== Animation loop and replay =====
let start = performance.now();

function frame(now) {
  time = now / 1000;
  const t = (now - start) / 1000;          // seconds since the bouquet started growing
  drawScene(t);
  toAscii();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// tap / click anywhere to grow it again
canvas.addEventListener('click', () => { start = performance.now(); });
})();