(() => {
// =====================================================================
// 1. THE FLOWERS IN THE BOOK
//    To add a new flower later, just add one more { … } here.
//    In "about", type \n wherever you want a new line.
// =====================================================================
const FLOWERS = [
  { name: 'Sunflower & Tulip', latin: 'Helianthus annuus · Tulipa', link: 'sunflower-tulip/', img: 'images/sunflower-tulip.jpg',
    about: "Or you'll be left in the dust\nUnless I stuck by ya\nYou're the sunflower,\nYou're the sunflower.",
    style: 'ASCII art', season: 'Spring · Summer', caption: '☀', tag: "xxxxx",
    reminder: 'reminder: always turn toward the light.' },
  { name: 'Lily', latin: 'Lilium ‘Stargazer’', link: 'lilies/', img: 'images/lily.jpg',
    about: 'City of stars \n Are you shining just for me? \n City of stars \n There\'s so much that I can\'t see…',
    style: '3D', season: 'Summer', caption: '✧', tag: 'they open so slowly…',
    reminder: 'reminder: blooming slowly is still blooming.' },
  { name: 'Hibiscus', latin: 'Hibiscus rosa-sinensis', link: 'hibiscus/', img: 'images/hibiscus.jpg',
    about: 'Can I take you to a moment\nWhere the fields are painted gold\nAnd the trees are filled with memories\nOf the feelings never told?',
    style: 'X-ray', season: 'All year', caption: 'ღ', tag: 'one looks at you, one looks away',
    reminder: 'reminder: even one-day flowers are worth it.' },
  { name: 'Rose', latin: 'Rosa', link: 'rose/', img: 'images/rose.jpg',
    about: "We've traveled the seas we've ridden the stars \n We've seen everything from Satrun to Mars \n As much as it seems like you own my heart \n It's astronomy,we're two worlds apart.",
    style: 'String art', season: 'Spring · Autumn', caption: '◎', tag: 'the bee found the nectar',
    reminder: 'reminder: say thank you with flowers.' },
];
const two = n => String(n).padStart(2, '0');

// =====================================================================
// 2. THE COVER DRAWING
//    Deep blue cloth, navy flowers outlined in gold, pale blue leaves.
//    Drawn in code (SVG), so it is our own and stays sharp at any size.
// =====================================================================
function makeRandom(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

function coverArt(withTitle) {
  const rand = makeRandom(withTitle ? 21 : 34);
  const GOLD = '#e2c47e', NAVY = '#252c69', NAVY2 = '#323a82', LEAF = '#7088dc', LEAFV = '#5167bd', STEM = '#8299e6';
  let back = '', mid = '', front = '';

  const leaf = (x, y, len, ang, w) => {
    const veins = [0.3, 0.5, 0.7].map(t => `M0,${-len * t} l${w * 0.6},${-len * 0.12} M0,${-len * t} l${-w * 0.6},${-len * 0.12}`).join(' ');
    return `<g transform="translate(${x},${y}) rotate(${ang})">
      <path d="M0,0 Q${w},${-len * 0.45} 0,${-len} Q${-w},${-len * 0.45} 0,0Z" fill="${LEAF}"/>
      <path d="M0,0 L0,${-len * 0.92} ${veins}" stroke="${LEAFV}" stroke-width="0.6" fill="none"/></g>`;
  };
  const flower = (x, y, r, rot) => {
    let g = `<g transform="translate(${x},${y}) rotate(${rot})">`;
    const petal = (rr, fill, k, n, off) => {
      const a = k * 360 / n + off;
      return `<path transform="rotate(${a})" d="M0,0 C${rr * 0.62},${-rr * 0.22} ${rr * 0.7},${-rr * 0.95} 0,${-rr} C${-rr * 0.7},${-rr * 0.95} ${-rr * 0.62},${-rr * 0.22} 0,0Z" fill="${fill}" stroke="${GOLD}" stroke-width="0.7"/>
        <path transform="rotate(${a})" d="M0,${-rr * 0.2} L0,${-rr * 0.85} M${rr * 0.06},${-rr * 0.2} L${rr * 0.25},${-rr * 0.8} M${-rr * 0.06},${-rr * 0.2} L${-rr * 0.25},${-rr * 0.8}" stroke="#3d479b" stroke-width="0.5"/>`;
    };
    for (let k = 0; k < 5; k++) g += petal(r * 1.05, NAVY2, k, 5, 36);   // back petals
    for (let k = 0; k < 5; k++) g += petal(r, NAVY, k, 5, 0);            // front petals
    g += `<circle r="${r * 0.2}" fill="#1a2055"/>`;
    for (let k = 0; k < 16; k++) {                                       // the stamens
      const a = rand() * 6.28, d = r * (0.08 + rand() * 0.2);
      g += `<circle cx="${Math.cos(a) * d}" cy="${Math.sin(a) * d}" r="${0.9 + rand() * 0.9}" fill="${rand() < 0.3 ? GOLD : '#b4c3ff'}"/>`;
    }
    return g + '</g>';
  };
  const bud = (x, y, s, ang) => `<g transform="translate(${x},${y}) rotate(${ang})">
      <path d="M0,0 L0,${s * 1.6}" stroke="${STEM}" stroke-width="1.2"/>
      <ellipse cx="0" cy="0" rx="${s * 0.55}" ry="${s * 0.8}" fill="${NAVY}" stroke="${GOLD}" stroke-width="0.6"/>
      <path d="M0,${s * 0.8} Q${s * 0.7},${s * 0.3} ${s * 0.5},${-s * 0.2} M0,${s * 0.8} Q${-s * 0.7},${s * 0.3} ${-s * 0.5},${-s * 0.2}" stroke="${LEAF}" stroke-width="1.6" fill="none"/></g>`;

  // [x, y, size, turn] — flowers sit around the edges, leaving room for the title
  const blooms = withTitle
    ? [[48, 66, 46, 12], [158, 30, 30, -20], [264, 96, 24, 30], [8, 236, 36, -8], [96, 318, 26, 20], [36, 392, 40, 5], [276, 14, 20, 0]]
    : [[240, 70, 40, 10], [80, 190, 30, -15], [250, 300, 44, 25], [60, 380, 30, 0]];

  for (const [x, y, r] of blooms) {
    // stems and leaves spraying out from behind each flower
    for (let k = 0; k < 6; k++) {
      const ang = rand() * 360;
      const len = r * (0.9 + rand() * 0.8);
      const lx = x + Math.cos(ang * Math.PI / 180) * r * 0.7, ly = y + Math.sin(ang * Math.PI / 180) * r * 0.7;
      back += leaf(lx, ly, len, ang + 90, len * 0.32);
    }
    back += `<path d="M${x},${y} q${(rand() - 0.5) * 60},${r * 1.2} ${(rand() - 0.5) * 40},${r * 2.4}" stroke="${STEM}" stroke-width="1.3" fill="none"/>`;
  }
  for (const [x, y, r, rot] of blooms) mid += flower(x, y, r, rot);
  for (const [x, y, s, a] of (withTitle ? [[205, 66, 9, 25], [92, 150, 8, -30], [150, 300, 8, 15]] : [[150, 120, 9, -20], [170, 350, 8, 20]])) front += bud(x, y, s, a);

  // a faint repeating sprig pattern on the cloth, like the reference cover
  const pattern = `<defs><pattern id="sprig${withTitle ? 1 : 2}" width="22" height="26" patternUnits="userSpaceOnUse">
      <path d="M11,20 L11,10 M11,14 Q7,12 6,8 M11,14 Q15,12 16,8 M11,10 Q11,7 11,5" stroke="#6f79c8" stroke-width="0.8" fill="none" opacity="0.55"/></pattern></defs>
    <rect x="${withTitle ? 150 : 0}" y="${withTitle ? 150 : 0}" width="300" height="408" fill="url(#sprig${withTitle ? 1 : 2})"/>`;

  return `<svg viewBox="0 0 300 408" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="300" height="408" fill="#4b5398"/>${pattern}${back}${mid}${front}</svg>`;
}

// =====================================================================
// 2b. SCRAPBOOK PAGES (the right-hand photo pages)
//     Each flower gets its OWN scrapbook layout, inspired by its song.
//     Everything is drawn in code: no extra image files needed.
// =====================================================================

// --- little helpers ---------------------------------------------------
// place a piece on the page: x, y, w in % of the page, r = tilt in degrees
const put = (html, x, y, w, r = 0, z = 3, extra = '') =>
  `<div class="deco" style="left:${x}%;top:${y}%;width:${w}%;transform:rotate(${r}deg);z-index:${z};${extra}">${html}</div>`;

// handwritten words on a scrap of paper
const scrapNote = (text, x, y, w, r, bg = '#fffdf7', color = 'var(--ink)') =>
  `<div class="scrap-note" style="left:${x}%;top:${y}%;width:${w}%;transform:rotate(${r}deg);background:${bg};color:${color}">${text}</div>`;

// cut-out "magazine" letters
function ransom(word, x, y, r, seed, papers) {
  const rand = makeRandom(seed);
  const fonts = ["'Cormorant Garamond', serif", 'Georgia, serif', "'Inter', sans-serif", "'Courier New', monospace", "'Caveat', cursive"];
  return `<div class="ransom" style="left:${x}%;top:${y}%;transform:rotate(${r}deg)">${[...word].map(ch => {
    if (ch === ' ') return '<i></i>';
    const bg = papers[Math.floor(rand() * papers.length)];
    const dark = parseInt(bg.slice(1, 3), 16) < 140;
    return `<span style="background:${bg};color:${dark ? '#fff' : '#2c2420'};font-family:${fonts[Math.floor(rand() * fonts.length)]};transform:rotate(${(rand() * 16 - 8).toFixed(1)}deg) translateY(${(rand() * 5 - 2.5).toFixed(1)}px);font-weight:${rand() < .5 ? 700 : 400};font-style:${rand() < .3 ? 'italic' : 'normal'}">${rand() < .45 ? ch.toUpperCase() : ch}</span>`;
  }).join('')}</div>`;
}

// the photo itself (position and tilt change per page)
const photo = (f, x, y, w, r, tape = '<i class="tape tr"></i>') =>
  `<a class="polaroid" href="${f.link}" style="position:absolute;margin:0;left:${x}%;top:${y}%;width:${w}%;transform:rotate(${r}deg)">
     ${tape}<img src="${f.img}" alt="${f.name}"><span>${f.caption}</span></a>`;

// gingham fabric for SVG fills
const gingham = (id, c) => `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse">
  <rect width="8" height="8" fill="#fff"/><rect width="4" height="8" fill="${c}" opacity=".5"/><rect width="8" height="4" fill="${c}" opacity=".5"/></pattern>`;

// --- the drawings -----------------------------------------------------
const ART = {
  // a pressed sunflower with its stem and a leaf
  sunflower: () => `<svg viewBox="0 0 80 160">
    <path d="M40 60 Q44 110 38 158" stroke="#6b8a3a" stroke-width="3" fill="none"/>
    <path d="M41 110 Q62 96 70 108 Q58 122 41 114Z" fill="#7d9b45" opacity=".9"/>
    ${Array.from({ length: 16 }, (_, k) => `<ellipse cx="40" cy="22" rx="5.5" ry="16" fill="${k % 2 ? '#f4c430' : '#e8a917'}" transform="rotate(${k * 22.5} 40 40)"/>`).join('')}
    <circle cx="40" cy="40" r="13" fill="#5a3a1a"/><circle cx="40" cy="40" r="9" fill="#6e4a24"/>
    ${Array.from({ length: 14 }, (_, k) => `<circle cx="${40 + Math.cos(k) * 7}" cy="${40 + Math.sin(k) * 7}" r="1" fill="#3b2410"/>`).join('')}</svg>`,
  // a ticket stub with notched sides
  ticket: (top, big, small, color) => `<div class="ticket" style="--t:${color}"><b>${top}</b><strong>${big}</strong><small>${small}</small></div>`,
  paperclip: (c = '#9aa0ab') => `<svg viewBox="0 0 20 60"><path d="M6 50 V12 a5 5 0 0 1 10 0 V46 a7 7 0 0 1 -14 0 V16" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  ginghamHeart: (c, id) => `<svg viewBox="0 0 40 36"><defs>${gingham(id, c)}</defs>
    <path d="M20 33 C5 23 3 12 10 7.5 C15 4.5 19 7 20 11 C21 7 25 4.5 30 7.5 C37 12 35 23 20 33Z" fill="url(#${id})" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`,
  bow: (c, deep, id) => `<svg viewBox="0 0 100 70"><defs>${gingham(id, c)}</defs>
    <path d="M50 30 C35 5 8 8 10 26 C12 42 38 38 50 30Z" fill="url(#${id})" stroke="${deep}" stroke-width="1.2"/>
    <path d="M50 30 C65 5 92 8 90 26 C88 42 62 38 50 30Z" fill="url(#${id})" stroke="${deep}" stroke-width="1.2"/>
    <path d="M47 33 L32 66 L41 62 L45 68 L50 36Z" fill="url(#${id})" stroke="${deep}" stroke-width="1.2"/>
    <path d="M53 33 L68 66 L59 62 L55 68 L50 36Z" fill="url(#${id})" stroke="${deep}" stroke-width="1.2"/>
    <rect x="43" y="23" width="14" height="15" rx="4" fill="url(#${id})" stroke="${deep}" stroke-width="1.2"/></svg>`,
  star: (c) => `<svg viewBox="0 0 40 38"><path d="M20 3 L24.5 14.5 L37 15 L27.2 22.8 L30.6 35 L20 28 L9.4 35 L12.8 22.8 L3 15 L15.5 14.5Z" fill="${c}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`,
  moon: () => `<svg viewBox="0 0 40 40"><path d="M26 4 A16 16 0 1 0 36 30 A13 13 0 1 1 26 4Z" fill="#f6e3b0" stroke="#fff" stroke-width="2.5"/></svg>`,
  // a stamp: perforated edge, a little picture, a price and a word
  stamp: (bg, ink, art, price, word) => `<div class="pstamp"><div class="in" style="background:${bg}">
      <svg viewBox="0 0 40 40">${art(ink)}</svg><b style="color:${ink}">${price}</b><i style="color:${ink}">${word}</i></div></div>`,
  city: c => `<path d="M2 38 V24 h5 V18 h4 v20 M13 38 V12 h6 v26 M21 38 V20 h5 v18 M28 38 V8 h6 v30 M34 38 V22 h4 v16" fill="none" stroke="${c}" stroke-width="1.6"/>
    <circle cx="8" cy="7" r="1.2" fill="${c}"/><circle cx="20" cy="4" r="1" fill="${c}"/><circle cx="36" cy="4" r="1.4" fill="${c}"/><circle cx="25" cy="11" r=".9" fill="${c}"/>`,
  // golden wheat for the "fields"
  wheat: () => `<svg viewBox="0 0 40 160"><path d="M20 158 Q22 90 18 30" stroke="#b8902f" stroke-width="2" fill="none"/>
    ${Array.from({ length: 9 }, (_, k) => `<ellipse cx="${k % 2 ? 24 : 13}" cy="${22 + k * 9}" rx="4" ry="8" fill="${k % 2 ? '#e3b955' : '#d4a53c'}" transform="rotate(${k % 2 ? 30 : -30} ${k % 2 ? 24 : 13} ${22 + k * 9})"/>`).join('')}
    <ellipse cx="18" cy="14" rx="3.6" ry="8" fill="#e3b955"/></svg>`,
  // an old photo frame with a golden field in it (a "memory")
  memory: (label, tone) => `<div class="mini-pol"><div style="background:${tone}"></div><span>${label}</span></div>`,
  // a dictionary scrap
  dictionary: (word, say, kind, meaning) => `<div class="dict"><b>${word}</b> <i>${say}</i> <em>${kind}</em> ${meaning}</div>`,
  saturn: () => `<svg viewBox="0 0 70 44"><ellipse cx="35" cy="22" rx="33" ry="8" fill="none" stroke="#e8c48a" stroke-width="3" transform="rotate(-14 35 22)"/>
    <circle cx="35" cy="22" r="14" fill="#e9c27d"/><path d="M22 18 Q35 14 48 18 M21 24 Q35 21 49 25" stroke="#d4a45c" stroke-width="2" fill="none"/>
    <path d="M3 28 Q35 38 67 16" fill="none" stroke="#f2d7a8" stroke-width="3" transform="rotate(-2 35 22)"/></svg>`,
  mars: () => `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#c4553b"/><circle cx="14" cy="15" r="3" fill="#a5432c"/><circle cx="25" cy="25" r="4" fill="#a5432c"/><circle cx="27" cy="12" r="2" fill="#d97357"/>
    <circle cx="20" cy="20" r="16" fill="none" stroke="#fff" stroke-width="2.5"/></svg>`,
  orbit: () => `<svg viewBox="0 0 100 60"><ellipse cx="50" cy="30" rx="48" ry="26" fill="none" stroke="#7e2238" stroke-width=".8" stroke-dasharray="2 3" opacity=".6"/></svg>`,
  envelope: () => `<svg viewBox="0 0 80 54"><rect x="1" y="1" width="78" height="52" rx="2" fill="#fbf3e6" stroke="#d9c7aa"/>
    <path d="M1 1 L40 30 L79 1" fill="none" stroke="#d9c7aa"/>
    ${Array.from({ length: 10 }, (_, k) => `<rect x="${k * 8}" y="0" width="4" height="3" fill="${k % 2 ? '#c4553b' : '#2c3566'}" transform="skewX(-30)"/>`).join('')}
    <circle cx="40" cy="30" r="8" fill="#9e2238"/></svg>`,
  sparkle: c => `<svg viewBox="0 0 20 20"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8Z" fill="${c}"/></svg>`,
};

// --- one layout per flower (same order as FLOWERS) ---------------------
const LAYOUTS = [
  // 1. SUNFLOWER: sunny, friendly, "I'll stick by you" — yellow gingham, a ticket for two
  (f, i) => `
    <div class="torn-strip" style="left:-6%;top:68%;width:80%;height:16%;transform:rotate(-6deg);--g:#e8b923"></div>
    ${photo(f, 12, 5, 60, -4, '')}
    ${put(ART.paperclip(), 18, 1, 6, -8, 6)}
    ${put(ART.sunflower(), 74, 8, 22, 10, 4)}
    ${put(ART.ginghamHeart('#e8b923', 'gh' + i), 74, 52, 14, 12, 5)}
    ${put(ART.ticket('ADMIT', '#####', '№ 0614 · stay!', '#f4c430'), 52, 74, 42, -5, 5)}
    ${ransom('sunny', 60, 66, 6, 11, ['#fdf4d7', '#e8b923', '#ffffff', '#5d8a4c', '#2c3566'])}
    ${scrapNote('Happiness-Joy!!', 10, 79, 35, 3)}`,

  // 2. LILY: a city at night, stars — navy night paper, moon, stars, a city stamp
  (f, i) => `
    <div class="torn-night" style="left:42%;top:-4%;width:66%;height:46%;transform:rotate(7deg)"></div>
    ${put(ART.moon(), 72, 4, 14, -10, 4)}
    ${put(ART.sparkle('#f6e3b0'), 88, 22, 6, 0, 4)}
    ${put(ART.sparkle('#fff'), 62, 30, 4, 0, 4)}
    ${photo(f, 20, 12, 56, 5)}
    ${put(ART.star('#e58fb0'), 5, 10, 11, -14, 5)}
    ${put(ART.star('#f6e3b0'), 80, 60, 9, 12, 5)}
    ${put(ART.star('#e58fb0'), 86, 70, 6, -6, 5)}
    ${put(ART.stamp('#f9d6e3', '#b8577d', ART.city, '50c', 'CITY · POST'), 6, 66, 22, -7, 5, 'filter:drop-shadow(0 3px 4px rgba(20,25,60,.3))')}
    <div class="washi" style="left:30%;top:9%;width:28%;transform:rotate(-6deg);--w:#f2b6cc"></div>
    ${ransom('shine', 44, 76, 3, 23, ['#2c3566', '#f9d6e3', '#ffffff', '#e58fb0', '#f6e3b0'])}
    ${scrapNote('Purity-Elegance ✧', 34, 87, 40, -2, '#eef0fb')}`,

  // 3. HIBISCUS: a golden moment, memories — wheat, old photos, a dictionary word
  (f, i) => `
    ${put(ART.memory('summer \'26', 'linear-gradient(#f7d58b, #d9a441 60%, #a5762a)'), 54, 4, 34, 12, 1)}
    ${put(ART.memory('golden hour', 'linear-gradient(#f3c9a0, #e09a5a 55%, #b5612c)'), 60, 22, 30, -6, 1)}
    ${photo(f, 12, 8, 56, -10)}
    ${put(ART.wheat(), 80, 46, 10, 14, 4)}
    ${put(ART.wheat(), 87, 50, 8, 24, 4)}
    ${put(ART.dictionary('del.i.ca.cy', '/ˈdel.ɪ.kə.si/', 'n.', 'the qualities of fragile, soft, or graceful beauty.'), 6, 70, 46, -4, 5)}
    ${ransom('moment', 45, 81, 5, 37, ['#c8323c', '#fdf4d7', '#e8b923', '#ffffff', '#8e1d26'])}
    ${put(ART.star('#c8323c'), 82, 70, 9, 10, 5)}`,

  // 4. ROSE: astronomy, far apart under one sky — planets, orbits, a love letter by air mail
  (f, i) => `
    ${put(ART.orbit(), -6, 6, 112, -8, 0)}
    ${put(ART.saturn(), 66, 2, 30, 8, 4)}
    ${put(ART.mars(), 4, 4, 13, 0, 4)}
    ${photo(f, 22, 10, 54, -2)}
    ${put(ART.sparkle('#c4566e'), 84, 38, 5, 0, 4)}
    ${put(ART.sparkle('#e8b923'), 8, 34, 4, 0, 4)}
    ${put(ART.envelope(), 10, 66, 35, 15, 5)}
    ${ransom('orbit', 55, 73, -3, 41, ['#7e2238', '#f2d3da', '#ffffff', '#2c3566', '#e8c48a'])}
    ${scrapNote('Grace-Gratitude!!', 42, 86, 40, 2, '#fdf0f3')}`,
];

// the whole scrapbook photo page for one flower
function scrapbookPage(f, i, folio) {
  const layout = LAYOUTS[i % LAYOUTS.length];
  return `<div class="page plate">${layout(f, i)}<span class="folio">${folio}</span></div>`;
}

// =====================================================================
// 3. WHAT EACH KIND OF PAGE LOOKS LIKE
// =====================================================================
const coverPage = () => `
  ${coverArt(true)}
  <div class="cover-title"><h2>BLOOM</h2><p>A FIELD GUIDE</p></div>
  <div class="label"><div><b>FLORA ARCHIVE</b><i>digital flowers</i></div></div>`;

const backCoverPage = () => `${coverArt(false)}`;

const contentsPage = folioOf => `
  <div class="page">
    <p class="hand big" style="margin-top:0">contents</p>
    <ul class="toc">
      ${FLOWERS.map((f, i) => `<li data-go="${i}"><span class="tname">${f.name.toLowerCase()}</span><span class="dots"></span><span>${folioOf(i)}</span></li>`).join('')}
    </ul>
    <p class="hand" style="font-size:calc(var(--pw)*0.055);margin-top:18px;opacity:.75">(tap a name to jump to it)</p>
  </div>`;

const notePage = () => `
  <div class="page">
    <p class="hand big" style="margin-top:0">how to read<br>this book</p>
    <div class="torn" style="transform:rotate(1.5deg)"><span class="hand">Every flower here was grown in code.<br>Turn the pages to meet them, then tap a photo to watch it bloom ✿</span></div>
    <p class="hand" style="font-size:calc(var(--pw)*0.06);color:var(--red);margin-top:22px;text-align:right">— keep turning →</p>
    <span class="folio">1</span>
  </div>`;

const textPage = (f, i, folio) => `
  <div class="page text">
    <div class="stamp">No. ${two(i + 1)} | ${f.style.toUpperCase()}</div>
    <p class="hand big">${f.name.toLowerCase()}</p>
    <p class="latin">${f.latin}</p>
    <div class="torn"><span class="hand">${f.about}</span></div>
    <ul class="list hand">
      <li><b>style:</b> ${f.style}</li>
      <li><b>season:</b> ${f.season}</li>
    </ul>
    <a class="sticker" href="${f.link}">see it bloom →</a>
    <span class="folio">${folio}</span>
  </div>`;

const platePage = (f, i, folio) => scrapbookPage(f, i, folio);

// on phones everything about one flower fits on one page
const phonePage = (f, i, folio) => `
  <div class="page text">
    <div class="stamp">No. ${two(i + 1)} | ${f.style.toUpperCase()}</div>
    <p class="hand big">${f.name.toLowerCase()}</p>
    <p class="latin">${f.latin}</p>
    <a class="polaroid" href="${f.link}"><i class="tape tl"></i><img src="${f.img}" alt="${f.name}"><span>${f.caption}</span></a>
    <div class="torn"><span class="hand">${f.about}</span></div>
    <a class="sticker" href="${f.link}">see it bloom →</a>
    <span class="folio">${folio}</span>
  </div>`;

const endPage = () => `
  <div class="page" style="display:flex;flex-direction:column;justify-content:center;text-align:center">
    <p class="hand big">the end…</p>
    <p class="hand" style="font-size:calc(var(--pw)*0.075);color:var(--green)">for now ✿</p>
    <p class="hand" style="font-size:calc(var(--pw)*0.055);opacity:.7;margin-top:10px">more flowers are still growing</p>
  </div>`;

// =====================================================================
// 4. BUILD THE BOOK
//    Laptop: an open ring-binder journal. Each flower gets a spread:
//            notes on the left (lined paper), its photo on the right (grid paper).
//    Phone:  one page at a time, like flipping a notebook.
// =====================================================================
const book = document.getElementById('book');
let leaves = [];
let turned = 0;
let single = false;
let flowerStart = [];
let firstBuild = true;

function sheet(frontHTML, backHTML, frontClass = '', backClass = '') {
  return `<div class="leaf"><div class="face front ${frontClass}">${frontHTML}</div><div class="face back ${backClass}">${backHTML}</div></div>`;
}

function build() {
  single = window.innerWidth < 760;
  let html = '';
  flowerStart = [];
  if (!single) {
    html += sheet(coverPage(), contentsPage(i => 2 + i * 2), 'cover', 'lined');
    FLOWERS.forEach((f, i) => {
      const front = i === 0 ? notePage() : platePage(FLOWERS[i - 1], i - 1, 2 + (i - 1) * 2 + 1);
      html += sheet(front, textPage(f, i, 2 + i * 2), 'grid', 'lined');
      flowerStart.push(i + 2);
    });
    const last = FLOWERS.length - 1;
    html += sheet(platePage(FLOWERS[last], last, 2 + last * 2 + 1), endPage(), 'grid', 'lined');
    html += sheet('<div class="page"></div>', backCoverPage(), 'grid', 'backcover');
  } else {
     // phone: the same book, one page at a time
    html += sheet(coverPage(), '', 'cover');
    html += sheet(contentsPage(i => 2 + i * 2), '', 'lined');
    html += sheet(notePage(), '', 'grid');
    FLOWERS.forEach((f, i) => {
      flowerStart.push(3 + i * 2);                       // the flower's notes page…
      html += sheet(textPage(f, i, 2 + i * 2), '', 'lined');
      html += sheet(platePage(f, i, 3 + i * 2), '', 'grid');   // …then its scrapbook photo page
    });
    html += sheet(endPage(), '', 'lined');
    html += sheet(backCoverPage(), '', 'backcover');
  }
  book.innerHTML = html + '<div class="rings">' + '<i></i>'.repeat(6) + '</div>';
  book.classList.toggle('single', single);
  leaves = [...book.querySelectorAll('.leaf')];
  turned = Math.min(turned, maxTurn());
  if (firstBuild) { loadPage(); firstBuild = false; }     // reopen on the page you left
  document.getElementById('count').textContent = `${FLOWERS.length} flowers · ${FLOWERS.length * 2 + 2} pages`;
  size();
  fitNotes();
  paint(true);
}

// if a note has too much text for its box, shrink the writing a little until it fits
function fitNotes() {
  book.querySelectorAll('.torn').forEach(box => {
    const text = box.querySelector('.hand');
    text.style.fontSize = '';
    const st = getComputedStyle(box);
    const room = box.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom);
    let size = parseFloat(getComputedStyle(text).fontSize);
    while (text.offsetHeight > room && size > 9) {
      size -= 0.5;
      text.style.fontSize = size + 'px';
    }
  });
}

const maxTurn = () => single ? leaves.length - 1 : leaves.length;

// =====================================================================
// 5. MAKE THE BOOK FIT THE SCREEN
// =====================================================================
function size() {
  const availW = window.innerWidth * (single ? 0.9 : 0.84);
  const availH = window.innerHeight - (single ? 250 : 240);    // room for the title, buttons and reminder
  const ratio =1.36;
  let pw = single ? availW : availW / 2;
  let ph = pw * ratio;
  if (ph > availH) { ph = availH; pw = ph / ratio; }
  pw = Math.min(pw, 540); ph = pw * ratio;
  document.documentElement.style.setProperty('--pw', pw + 'px');
  document.documentElement.style.setProperty('--ph', ph + 'px');
}

// =====================================================================
// 6. TURN THE PAGES
// =====================================================================
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const pageNo = document.getElementById('pageNo');
const reminder = document.getElementById('reminder');

function paint(instant) {
  leaves.forEach((leaf, i) => {
    const isTurned = i < turned;
    if (instant) leaf.style.transition = 'none';
    leaf.classList.toggle('flipped', isTurned);
    leaf.style.zIndex = isTurned ? i + 1 : leaves.length - i + 1;
    if (instant) { leaf.offsetHeight; leaf.style.transition = ''; }
  });
  book.classList.toggle('closed-front', turned === 0);
  book.classList.toggle('closed-back', !single && turned === leaves.length);
  prevBtn.disabled = turned === 0;
  nextBtn.disabled = turned >= maxTurn();
  const [label, line] = describe();
  pageNo.textContent = label;
  savePage();
  if (reminder.textContent !== line) {
    reminder.style.opacity = 0;
    setTimeout(() => { reminder.textContent = line; reminder.style.opacity = 1; }, 300);
  }
}

function describe() {
  if (turned === 0) return ['cover', 'a field guide of moving flowers.'];
  if (turned === maxTurn()) return ['back cover', 'see you in the next bloom.'];
  if (turned === 1) return ['contents', 'every flower here was grown in code.'];
  if (single && turned === 2) return ['a note', 'turn the pages to meet them.'];
  for (let k = 0; k < FLOWERS.length; k++) {
    // on phones a flower has two pages (notes, then photo); on laptops one spread
    if (turned === flowerStart[k] || (single && turned === flowerStart[k] + 1)) return [FLOWERS[k].name.toLowerCase(), FLOWERS[k].reminder];
  }
  return ['the end', 'more flowers are still growing.'];
}
function go(target) {
  target = Math.max(0, Math.min(maxTurn(), target));
  if (target === turned) return;
  const moving = target > turned ? leaves[turned] : leaves[turned - 1];
  turned = target;
  paint(false);
  if (moving) {
    moving.style.zIndex = 999;                      // the turning sheet stays on top
    clearTimeout(moving.t);
    moving.t = setTimeout(() => paint(false), 1100);
  }
}

prevBtn.addEventListener('click', () => go(turned - 1));
nextBtn.addEventListener('click', () => go(turned + 1));
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') go(turned + 1);
  if (e.key === 'ArrowLeft') go(turned - 1);
});

// tap a page: the right page turns forward, the left page goes back
book.addEventListener('click', e => {
  if (e.target.closest('a')) return;                 // photos and stickers open the flower
  const item = e.target.closest('[data-go]');
  if (item) { go(flowerStart[+item.dataset.go]); return; }
  const face = e.target.closest('.face');
  if (!face) return;
  go(turned + (face.classList.contains('back') ? -1 : 1));
});

// swipe on phones
let touchX = null;
book.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
book.addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 40) go(turned + (dx < 0 ? 1 : -1));
  touchX = null;
});

// =====================================================================
// 7. REMEMBER THE PAGE
//    When you open a flower and come back with "back to Bloom",
//    the book opens again on the page you left (not the cover).
// =====================================================================
function savePage() {
  try { sessionStorage.setItem('bloom-page', JSON.stringify({ single, turned })); } catch (e) {}
}
function loadPage() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('bloom-page'));
    if (saved && saved.single === single) turned = Math.min(saved.turned, maxTurn());
  } catch (e) {}
}

let lastSingle = window.innerWidth < 760;
window.addEventListener('resize', () => {
  const nowSingle = window.innerWidth < 760;
  if (nowSingle !== lastSingle) { lastSingle = nowSingle; turned = 0; build(); } else { size(); fitNotes(); }
});
build();
if (document.fonts) document.fonts.ready.then(fitNotes);   // re-check once the handwriting font has loaded

// =====================================================================
// 8. LIVE CLOCK in the top-right corner
// =====================================================================
const clockEl = document.getElementById('clock');
function updateClock() {
  const d = new Date();
  const mon = d.toLocaleString('en', { month: 'short' }).toUpperCase();
  clockEl.textContent = `${mon} ${d.getDate()} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
updateClock();
setInterval(updateClock, 10000);
})();