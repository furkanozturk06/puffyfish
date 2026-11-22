// Puffy Fish: deniz canlılarının piksel çizimleri.
// Her tür kısa bir tariften (gövde şekli, yüzgeçler, kuyruk, desen, göz, ağız) piksel piksel kurulur;
// gövde gölgesi kıvrımı izler, kontur her canlının kendi koyu rengidir.
(function (global) {
'use strict';

const INK = '#141c2b';
const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const dark = (c, t) => mix(c, '#000000', t), light = (c, t) => mix(c, '#ffffff', t);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const noiseR = i => noise(i, i * 3, 99);
function noise(x, y, s) {
  let n = Math.imul(x + 11, 374761393) ^ Math.imul(y + 7, 668265263) ^ Math.imul(s + 3, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

class Grid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.k = Array.from({ length: h }, () => Array(w).fill(null));   // parça: body, fin, ...
    this.o = Array.from({ length: h }, () => Array(w).fill(null));   // üstüne boyanan renkler (göz, desen)
  }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, v) { x = Math.round(x); y = Math.round(y); if (this.in(x, y)) this.k[y][x] = v; }
  get(x, y) { return this.in(x, y) ? this.k[y][x] : null; }
  over(x, y, v) { x = Math.round(x); y = Math.round(y); if (this.in(x, y)) this.o[y][x] = v; }
  // Gövdenin üstündeyse boya, boşsa parça olarak ekle (yüzgeç kanatları gibi taşan şeyler için).
  paint(x, y, v, part) { x = Math.round(x); y = Math.round(y); if (!this.in(x, y)) return; if (this.k[y][x]) this.o[y][x] = v; else this.k[y][x] = part || v; }
}

function makePal(s) {
  const [back, side, belly] = s.c, fin = s.fin || dark(back, 0.1);
  return Object.assign({
    back, mid: side, bellyc: belly, lite: light(back, 0.35), shade: dark(side, 0.3), out: dark(back, 0.62),
    fin, fin2: light(fin, 0.28), pf: light(fin, 0.18), eo: dark(back, 0.55), lid: dark(back, 0.32),
    r: '#3a1620', w: '#ffffff', k: INK, y: '#ffe680', g: '#9fe8ff', bk: '#1c1414',
    dk: dark(back, 0.35), lp: dark(belly, 0.12), st: light(side, 0.5), red: '#e03a3a', ye: '#f2c230', bk2: light(back, 0.4), w2: '#ffffff',
  }, s.pal || {});
}

// Gövde profilleri: [konum (baş 0, kuyruk 1), üst yarı yükseklik, alt yarı yükseklik]
const SHAPES = {
  torpedo: [[0, .35, .3], [.1, .75, .65], [.3, 1, .9], [.65, .85, .75], [.92, .35, .3], [1, .22, .2]],
  round:   [[0, .35, .35], [.1, .75, .75], [.4, 1, 1], [.7, .9, .9], [.92, .5, .5], [1, .3, .3]],
  deep:    [[0, .15, .15], [.12, .6, .6], [.38, 1, 1], [.7, .9, .9], [.93, .45, .45], [1, .3, .3]],
  long:    [[0, .55, .5], [.05, .85, .8], [.15, 1, .95], [.85, .9, .85], [1, .3, .25]],
  fat:     [[0, .6, .55], [.08, .9, .85], [.35, 1, 1], [.7, .85, .8], [.95, .45, .4], [1, .35, .3]],
  slim:    [[0, .3, .25], [.1, .7, .6], [.3, 1, .85], [.75, .85, .7], [.95, .4, .35], [1, .3, .25]],
  shark:   [[0, .25, .1], [.1, .65, .45], [.3, 1, .85], [.65, .8, .65], [.92, .3, .25], [1, .2, .18]],
  angler:  [[0, .75, .95], [.12, 1, 1], [.4, .95, .9], [.75, .6, .55], [.95, .3, .3], [1, .25, .25]],
  hump:    [[0, .55, .45], [.06, 1, .7], [.25, 1.08, .95], [.6, .9, .8], [.92, .4, .35], [1, .28, .25]],
  squid:   [[0, .7, .7], [.18, 1, 1], [.55, .8, .8], [.85, .45, .45], [1, .12, .12]],
  ray:     [[0, .35, .25], [.18, 1.35, .55], [.45, .6, .35], [.75, .3, .22], [1, .12, .12]],
  manta:   [[0, .55, .5], [.12, .7, .6], [.32, 1.7, 1.3], [.5, .7, .55], [.8, .35, .3], [1, .15, .15]],
  gulper:  [[0, .95, 1.1], [.15, .9, .95], [.35, .55, .5], [.7, .35, .3], [1, .15, .12]],
};
function prof(shape, u, i) {
  const p = SHAPES[shape];
  for (let j = 1; j < p.length; j++) if (u <= p[j][0]) {
    const a = p[j - 1], b = p[j], t = (u - a[0]) / (b[0] - a[0]), s = (1 - Math.cos(t * Math.PI)) / 2;
    return a[i] + (b[i] - a[i]) * s;
  }
  return p[p.length - 1][i];
}

function tailIn(t, a, b) {
  const B = Math.abs(b);
  switch (t) {
    case 'fork':  { const o = .3 + .9 * a, i = a > .4 ? (a - .4) * 1.4 : -1; return B <= o && B >= i; }
    case 'cres':  { const o = .25 + 1.25 * Math.pow(a, .8), i = a > .2 ? (a - .2) * 1.55 : -1; return B <= o && B >= i; }
    case 'round': return B <= (.35 + .5 * a) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (a - .55) / .45), 2)));
    case 'fan':   return B <= .3 + .75 * a;
    case 'point': return B <= .45 * (1 - a) + .05;
    case 'shark': if (b < -(.3 + 1.25 * a) || b > .3 + .6 * a) return false;
                  return !(a > .45 && b > -(a - .45) * 1.7 && b < (a - .45) * .7);
  }
  return false;
}
function finH(t, v, h, i) {
  switch (t) {
    case 'tri':    return h * (v < .3 ? v / .3 : (1 - v) / .7) + .4;
    case 'rtri':   return h * (v > .7 ? (1 - v) / .3 : v / .7) + .4;
    case 'round':  return h * Math.sin(Math.PI * v) + .3;
    case 'spiky':  return h * Math.sin(Math.PI * Math.min(1, v * 1.1)) * (i % 2 ? .55 : 1) + .3;
    case 'spines': return (i % 2 ? h * .3 : h) * (1 - v * .35);
    case 'sail':   return h * (v < .15 ? v / .15 : 1 - (v - .15) * .45) + .3;
    case 'shark':  return v < .4 ? h * v / .4 + .3 : h * Math.max(0, (1 - v) / .6) * (1.2 - v) + .3;
    case 'flat':   return h;
  }
  return h;
}

// Göz şablonları (sola bakan): w beyaz, k göz bebeği, h parlama
const EYES = {
  3: ['www', 'kkw', 'kkw'],
  4: ['.ww.', 'hkww', 'kkww', '.ww.'],
};
function eyeShape(e, pk) {
  if (EYES[e] && !pk) return EYES[e];
  const rows = [], c = e / 2, pr = e * (pk || 0.31), px = e * 0.4, py = e * 0.56;
  for (let y = 0; y < e; y++) {
    let r = '';
    for (let x = 0; x < e; x++) {
      const inE = (x + .5 - c) ** 2 + (y + .5 - c) ** 2 <= c * c + .35;
      const inP = (x + .5 - px) ** 2 + (y + .5 - py) ** 2 <= pr * pr + .25;
      r += !inE ? '.' : inP ? 'k' : 'w';
    }
    rows.push(r.split(''));
  }
  const sx = Math.floor(px - pr * .5), sy = Math.floor(py - pr * .5);
  if (rows[sy] && rows[sy][sx] === 'k') rows[sy][sx] = 'h';
  if (e >= 7) { const tx = Math.floor(px + pr * .55), ty = Math.floor(py + pr * .5); if (rows[ty] && rows[ty][tx] === 'k') rows[ty][tx] = 'h'; }
  return rows.map(r => r.join(''));
}
function drawEye(g, ex, ey, e, angry) {
  const rows = eyeShape(e), mine = new Set();
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.') return;
    g.paint(ex + x, ey + y, ch === 'k' ? 'k' : 'w', 'eyew');
    mine.add((ex + x) + ',' + (ey + y));
  }));
  // Gözü gövdeden ayıran koyu halka
  for (const key of mine) {
    const [x, y] = key.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!mine.has(nx + ',' + ny) && g.get(nx, ny)) g.over(nx, ny, 'eo');
    }
  }
  if (angry) {
    for (let x = 0; x < e; x++) if (rows[0][x] !== '.') g.over(ex + x, ey, 'lid');
    for (let x = -1; x <= e; x++) g.over(ex + x, x < e / 2 ? ey : ey - 1, 'out');
  }
}

function drawMouth(g, s, fx, my, L, H) {
  const m = s.mouth || 'small';
  if (m === 'small') { g.paint(fx, my, 'r'); g.paint(fx + 1, my, 'r'); }
  else if (m === 'smile') { g.paint(fx, my, 'r'); g.paint(fx + 1, my + 1, 'r'); g.paint(fx + 2, my + 1, 'r'); }
  else if (m === 'teeth') {
    const n = clamp(Math.round(L * .16), 3, 9);
    for (let j = 0; j < n; j++) g.paint(fx + j, my, j % 2 ? 'w' : 'r');
    for (let j = 0; j < n - 1; j++) g.paint(fx + j, my + 1, j % 2 ? 'r' : 'w');
  } else if (m === 'big') {
    const n = clamp(Math.round(L * (s.mouthW || .3)), 4, 14), h = clamp(Math.round(H * (s.mouthH || .3)), 3, 8);
    for (let y = 0; y < h; y++) for (let j = 0; j < n - (y === h - 1 ? 1 : 0); j++) {
      const top = y === 0, bot = y === h - 1;
      g.paint(fx + j, my - Math.floor(h / 2) + y, (top && j % 2 === 0) || (bot && j % 2 === 1) ? 'w' : 'r');
    }
  } else if (m === 'lips') {
    for (let j = 0; j < 3; j++) { g.paint(fx + j, my - 1, 'lp'); g.paint(fx + j, my + 1, 'lp'); }
    g.paint(fx, my, 'r'); g.paint(fx + 1, my, 'r');
  } else if (m === 'beak') {
    g.paint(fx, my - 1, 'w'); g.paint(fx + 1, my - 1, 'w'); g.paint(fx, my, 'r'); g.paint(fx + 1, my, 'r'); g.paint(fx, my + 1, 'w'); g.paint(fx + 1, my + 1, 'w');
  } else if (m === 'wide') {
    const n = clamp(Math.round(L * .2), 3, 10);
    for (let j = 0; j < n; j++) g.paint(fx + j, my + (j > n * .7 ? -1 : 0), 'r');
  }
}

function buildFish(s) {
  const L = s.L, H = s.H, half = H / 2, shape = s.shape || 'torpedo';
  const T = s.tail ? s.tail[1] : 0, tk = s.tail && s.tail[2] || 1;
  const fins = s.fins || [];
  const dor = Math.max(0, ...fins.filter(f => f.at === 'top').map(f => f.h));
  const bel = Math.max(0, ...fins.filter(f => f.at === 'bot').map(f => f.h));
  const peakT = Math.max(...SHAPES[shape].map(p => p[1])), peakB = Math.max(...SHAPES[shape].map(p => p[2]));
  const front = (s.beak ? s.beak[1] : 0) + (s.tent ? s.tent[1] : 0) + (s.lure ? 3 : 0);
  const ox = front + 1;
  const upper = Math.max(dor + half * peakT, half * 1.5 * tk, s.extraTop || 0) + 1;
  const lower = Math.max(bel + half * peakB, half * 1.5 * tk, s.extraBot || 0) + 2;
  const g = new Grid(Math.ceil(ox + L + T + 2), Math.ceil(upper + lower + 1));
  const cy = upper;
  const top = [], bot = [];
  for (let i = 0; i < L; i++) {
    const u = L > 1 ? i / (L - 1) : 0;
    let y0 = Math.round(cy - prof(shape, u, 1) * half), y1 = Math.max(y0, Math.round(cy + prof(shape, u, 2) * half) - 1);
    if (s.hammer && i < 3) { y0 -= Math.round(half * .85); y1 += Math.round(half * .15); }
    top[i] = y0; bot[i] = y1;
    for (let y = y0; y <= y1; y++) g.set(ox + i, y, 'body');
  }
  const tailX = ox + L - 1;
  if (s.tail) {
    const th = half * tk;
    for (let d = 0; d < T; d++) {
      const a = (d + 0.5) / T;
      for (let y = 0; y < g.h; y++) if (tailIn(s.tail[0], a, (y + 0.5 - cy) / th)) g.set(tailX + 1 + d, y, s.tail[3] || 'fin');
    }
  }
  for (const f of fins) {
    const i0 = Math.round(f.u[0] * (L - 1)), i1 = Math.round(f.u[1] * (L - 1));
    for (let i = i0; i <= i1; i++) {
      const v = i1 > i0 ? (i - i0) / (i1 - i0) : 0, hh = Math.round(finH(f.type || 'tri', v, f.h, i));
      for (let k = 1; k <= hh; k++) g.set(ox + i, f.at === 'top' ? top[i] - k : bot[i] + k, f.col || 'fin');
    }
  }
  const col = i => ({ x: ox + i, t: top[i], b: bot[i] });
  const at = (u, t) => { const i = clamp(Math.round(u * (L - 1)), 0, L - 1), c = col(i); return [c.x, Math.round(c.t + t * (c.b - c.t + 1))]; };

  for (const p of s.pat || []) {
    if (p.type === 'vband') {
      const i0 = Math.round(p.u * (L - 1)), w = p.w || 1;
      for (let i = i0; i < i0 + w && i < L; i++) for (let y = top[i]; y <= bot[i]; y++) g.over(ox + i, y, p.col);
      if (p.edge !== false) for (const i of [i0 - 1, i0 + w]) if (i >= 0 && i < L) for (let y = top[i]; y <= bot[i]; y++) g.over(ox + i, y, 'bk');
    } else if (p.type === 'hline') {
      const [a, b] = p.u || [.05, .95];
      for (let i = Math.round(a * (L - 1)); i <= Math.round(b * (L - 1)); i++) {
        const y = Math.round(top[i] + p.t * (bot[i] - top[i] + 1));
        for (let k = 0; k < (p.th || 1); k++) if (y + k <= bot[i]) g.over(ox + i, y + k, p.col);
      }
    } else if (p.type === 'spots') {
      const [a, b] = p.t || [0, 1];
      for (let i = 1; i < L - 1; i++) for (let y = top[i]; y <= bot[i]; y++) {
        const t = (y - top[i]) / Math.max(1, bot[i] - top[i]);
        if (t < a || t > b) continue;
        if (noise(i, y, p.seed || 1) < (p.n || .12) && (i + y) % (p.gap || 2) === 0) {
          g.over(ox + i, y, p.col);
          if (p.size === 2) { g.over(ox + i + 1, y, p.col); }
        }
      }
    } else if (p.type === 'bars') {
      for (let k = 0; k < p.n; k++) {
        const i = Math.round((p.from || .25) * (L - 1) + k * ((p.to || .85) - (p.from || .25)) * (L - 1) / Math.max(1, p.n - 1));
        for (let y = top[i]; y <= top[i] + Math.round((p.depth || .5) * (bot[i] - top[i] + 1)); y++) for (let w = 0; w < (p.w || 1); w++) g.over(ox + i + w, y, p.col);
      }
    } else if (p.type === 'vstripes') {
      for (let i = Math.round((p.from || 0) * L); i < L; i++) if (i % (p.every || 3) < (p.w || 1)) for (let y = top[i]; y <= bot[i]; y++) g.over(ox + i, y, p.col);
    } else if (p.type === 'scales') {
      for (let i = 2; i < L - 2; i++) for (let y = top[i] + 1; y < bot[i]; y++) {
        const t = (y - top[i]) / Math.max(1, bot[i] - top[i]);
        if (t > .25 && t < .8 && i % 3 === 0 && (y + (i % 6 ? 1 : 0)) % 2 === 0) g.over(ox + i, y, p.col);
      }
    } else if (p.type === 'slant') {
      for (let i = 0; i < L; i++) for (let y = top[i]; y <= top[i] + (bot[i] - top[i]) * (p.depth || .45); y++) if ((i + y) % (p.every || 4) === 0) g.over(ox + i, y, p.col);
    } else if (p.type === 'dot') {
      const [x, y] = at(p.u, p.t), r = p.r || 1;
      for (let dy = 0; dy < r; dy++) for (let dx = 0; dx < r; dx++) g.over(x + dx, y + dy, p.col);
      if (p.ring) for (const [dx, dy] of [[-1, 0], [r, 0], [0, -1], [0, r]]) g.over(x + dx, y + dy, p.ring);
    } else if (p.type === 'photo') {
      for (let i = 3; i < L - 3; i += 3) g.over(ox + i, bot[i] - 1, p.col);
    } else if (p.type === 'grid') {
      for (let i = 1; i < L - 1; i++) for (let y = top[i] + 1; y < bot[i]; y++) if (i % 3 === 1 && y % 3 === 1) g.over(ox + i, y, p.col);
    } else if (p.type === 'squiggle') {
      for (let i = Math.round((p.from || 0) * L); i < Math.round((p.to || .4) * L); i++) {
        const y = Math.round(top[i] + (bot[i] - top[i]) * (.45 + .25 * Math.sin(i * 1.3 + (p.ph || 0))));
        g.over(ox + i, y, p.col);
      }
    }
  }

  if (s.gill) {
    const n = s.gill === true ? 1 : s.gill;
    for (let k = 0; k < n; k++) {
      const i = Math.round(L * (.22 + k * .05)), c = col(i), m = (c.t + c.b) / 2, r = (c.b - c.t) * .3;
      for (let y = Math.round(m - r); y <= Math.round(m + r); y++) g.over(c.x + (Math.abs(y - m) > r * .6 ? 1 : 0), y, 'shade');
    }
  }
  if (s.finlets) for (let k = 0; k < s.finlets; k++) {
    const i = Math.round(L * (.72 + k * .06));
    if (i < L) { g.set(ox + i, top[i] - 1, 'ye'); g.set(ox + i, bot[i] + 1, 'ye'); }
  }
  if (s.pect) {
    const [x0, y0] = at(s.pect.u || .3, s.pect.t || .55), n = s.pect.size || Math.max(2, Math.round(H * .25));
    for (let r = 0; r < n; r++) for (let c = 0; c <= n - r - (s.pect.fan ? 0 : 1); c++) {
      const x = x0 + c + Math.round(r * (s.pect.fan ? .3 : .6)), y = y0 + r;
      g.paint(x, y, c === n - r - (s.pect.fan ? 0 : 1) ? 'fin' : (s.pect.col || 'pf'), s.pect.col || 'fin2');
    }
  }

  const fx = ox, my = Math.round(cy + half * (s.mouthT !== undefined ? s.mouthT : .2));
  if (s.beak) {
    const [bt, bl] = s.beak, by = Math.round(cy - half * (bt === 'goblin' ? .45 : .15));
    for (let d = 1; d <= bl; d++) {
      const x = ox - d + 1;
      if (bt === 'sword' || bt === 'needle') { g.set(x - 1, by, 'bk2'); if (d < bl * .5 || bt === 'needle') g.set(x - 1, by + 1, bt === 'needle' ? 'bk2' : 'bk2'); }
      if (bt === 'needle' && d % 2 === 0) g.over(x - 1, by + 1, 'r');
      if (bt === 'goblin') { g.set(x - 1, by, 'bk2'); g.set(x - 1, by + 1, 'bk2'); }
      if (bt === 'saw') { g.set(x - 1, by, 'bk2'); g.set(x - 1, by + 1, 'bk2'); if (d % 2 === 0) { g.set(x - 1, by - 1, 'w2'); g.set(x - 1, by + 2, 'w2'); } }
    }
  }
  if (s.tent) {
    const [n, len, club] = s.tent;
    for (let k = 0; k < n; k++) {
      const y0 = cy - half * .55 + k * (half * 1.1) / Math.max(1, n - 1), ln = len - (k % 2) * 2 - (club && (k === 0 || k === n - 1) ? 0 : 2);
      for (let d = 1; d <= ln; d++) g.set(ox - d, Math.round(y0 + Math.sin(d * .7 + k) * .8 + (y0 - cy) * d * .04), 'tn');
      if (club && (k === 1 || k === n - 2)) { g.set(ox - ln - 1, Math.round(y0), 'tn'); g.set(ox - ln - 1, Math.round(y0) + 1, 'tn'); }
    }
  }
  if (s.lure) {
    const i = Math.round(L * .28), x0 = ox + i, y0 = top[i] - 1, pts = [];
    for (let d = 0; d <= 8; d++) { const t = d / 8; pts.push([Math.round(x0 - t * (i + 4)), Math.round(y0 - Math.sin(t * Math.PI) * (half * .9 + 2))]); }
    for (const [x, y] of pts) g.set(x, y, 'fin');
    const [bx, by] = pts[pts.length - 1];
    for (const [dx, dy] of [[0, 0], [-1, 0], [0, 1], [-1, 1]]) g.set(bx + dx, by + dy + 1, 'y');
    g.over(bx - 1, by + 1, 'w');
  }
  if (s.barbel) {
    for (let d = 0; d < 6; d++) g.set(fx + 2 - Math.round(d * .6), my + 2 + d, 'fin');
    g.set(fx - 2, my + 8, 'g'); g.set(fx - 1, my + 8, 'g');
  }
  if (s.fangs) {
    for (const j of [1, 4]) for (let d = 0; d < 3; d++) g.set(fx + j, my + 1 + d, 'w2');
    for (const j of [2, 6]) for (let d = 0; d < 3; d++) g.set(fx + j, my - 1 - d, 'w2');
  }
  if (s.plume) for (let k = 0; k < 4; k++) for (let d = 1; d <= 5 - k; d++) g.set(ox + 1 + k * 2, top[1 + k * 2] - d, 'red');
  if (s.horns) { g.set(ox - 1, cy - 2, 'fin'); g.set(ox - 2, cy - 2, 'fin'); g.set(ox - 1, cy + 1, 'fin'); g.set(ox - 2, cy + 1, 'fin'); }
  if (s.whip) {
    const y = Math.round(cy);
    for (let d = 1; d <= s.whip; d++) g.set(tailX + d, y + Math.round(Math.sin(d * .35) * .6), 'fin');
  }

  const e = s.e || clamp(Math.round(H * (s.food ? .44 : .34)), 3, 9);
  const [eyX, eyY] = at(s.eyeU !== undefined ? s.eyeU : .15, s.eyeT !== undefined ? s.eyeT : .36);
  drawEye(g, eyX - Math.floor(e / 2), eyY - Math.floor(e / 2), e, s.angry !== undefined ? s.angry : !s.food);
  drawMouth(g, s, fx, my, L, H);
  if (s.blush) g.over(eyX + 1, eyY + Math.ceil(e / 2) + 1, 'p');
  if (s.extra) s.extra(g, { ox, cy, half, top, bot, at, L, H, fx, my });
  return { g, tailX, pal: makePal(s) };
}

// ---------- Özel çizilen canlılar ----------
function fromSpans(w, h, parts, px) {
  const g = new Grid(w, h);
  for (const [key, str] of parts) str.split(';').forEach(r => {
    const [y, xs] = r.split(':');
    xs.trim().split(' ').forEach(seg => { const [a, b] = seg.split('-').map(Number); for (let x = a; x <= (b === undefined ? a : b); x++) g.set(x, +y, key); });
  });
  for (const [x, y, k] of px || []) g.over(x, y, k);
  return g;
}
const CUSTOM = {
  karides(s) {
    const g = fromSpans(17, 12, [['tn', '0:1-4;1:0;2:0 1;3:0'], ['fin', '7:3 5 7;8:10-14;9:9-11 13-15'], ['body', '1:4-9;2:2-11;3:1-12;4:1-13;5:2-13;6:5-13;7:9-13']],
      [[6, 1, 'sg'], [8, 1, 'sg'], [6, 2, 'sg'], [8, 2, 'sg'], [10, 2, 'sg'], [7, 3, 'sg'], [9, 3, 'sg'], [11, 3, 'sg'], [12, 4, 'sg']]);
    drawEye(g, 2, 1, 3, false); g.over(1, 5, 'r');
    return { g, tailX: 13, pal: makePal(s) };
  },
  denizati(s) {
    const g = fromSpans(13, 20, [['fin', '0:6 8;8:11;9:11-12;10:11'], ['body', '1:5-8;2:4-9;3:1-9;4:1-9;5:4-9;6:5-10;7:5-10;8:5-10;9:6-10;10:6-10;11:6-10;12:7-10;13:7-9;14:7-9;15:6-9;16:4-6 8-9;17:4-5 8-9;18:4-8']],
      [[6, 7, 'shade'], [6, 9, 'shade'], [7, 11, 'shade'], [7, 13, 'shade'], [1, 4, 'r']]);
    drawEye(g, 5, 2, 3, false);
    return { g, tailX: 99, pal: makePal(s), vertical: true };
  },
  // Pelikan yılan balığı: kese gibi açılan dev alt çene, kamçı gibi incelen gövde.
  pelikan(s) {
    const w = 38, h = 16, g = new Grid(w, h);
    for (let x = 2; x <= 13; x++) { g.set(x, 2, 'body'); g.set(x, 3, 'body'); }
    for (let y = 4; y <= 12; y++) {
      const x0 = 2 + Math.round((y - 4) * .55), x1 = 13 - Math.round((y - 4) * .35);
      for (let x = x0; x <= x1; x++) g.set(x, y, 'body');
      for (let x = x0 + 1; x < x1; x++) if (y < 12) g.over(x, y, 'r');
    }
    for (let x = 3; x <= 12; x += 2) g.over(x, 4, 'w');
    for (let x = 12; x < w - 1; x++) {
      const t = Math.max(1, Math.round(5 - (x - 12) * .19)), y0 = 2 + Math.round(Math.sin((x - 12) * .22) * .8);
      for (let y = y0; y < y0 + t; y++) g.set(x, y, 'body');
    }
    g.set(w - 1, 3, 'g'); g.set(w - 2, 3, 'g');
    drawEye(g, 5, 0, 3, true);
    return { g, tailX: 9999, pal: makePal(s) };
  },
  // tStyle: a = dalgalı şeritler, b = fırfırlı perde + ince uzun dokunaçlar, c = kısa kıvrık dokunaçlar
  denizanasi(s) {
    const R = s.R || 6, st = s.tStyle || 'c', w = 2 * R + 7, h = R + (st === 'c' ? 9 : 15), g = new Grid(w, h), cx = R + 3;
    for (let y = 0; y <= R; y++) for (let x = 0; x < w; x++) if ((x + .5 - cx - .5) ** 2 / (R + .5) ** 2 + (y + .5 - R - 1) ** 2 / (R + .5) ** 2 <= 1 && y >= 1) g.set(x, y, 'body');
    for (let x = cx - R; x <= cx + R + 1; x++) g.set(x, R + 1, 'rim');
    const line = (x0, len, amp, ph, thick, key) => {
      let px = x0;
      for (let d = 2; d < len; d++) {
        const x = Math.round(x0 + Math.sin(d * .55 + ph) * amp), y = R + d;
        g.set(x, y, key); if (thick) g.set(x + 1, y, key);
        if (Math.abs(x - px) > 1) g.set((x + px) >> 1, y, key);   // kopukluk olmasın
        px = x;
      }
    };
    if (st === 'o') {   // ilk hali: tek piksel dokunaçlar ve ortada iki sütun ağız kolu
      for (let k = 0; k < 5; k++) { const x0 = cx - R + 1 + k * Math.round((2 * R) / 4); for (let d = 2; d < 10; d++) g.set(x0 + Math.round(Math.sin(d * .9 + k) * .8), R + d, 'tn'); }
      for (let d = 2; d < 7; d++) { g.set(cx, R + d, 'arm'); g.set(cx + 1, R + d + (d % 2), 'arm'); }
    } else if (st === 'a') {
      for (let k = 0; k < 4; k++) line(cx - R + 2 + k * Math.round((2 * R - 2) / 3), 13, 1.4, k * 1.7, true, 'tn');
    } else if (st === 'b') {
      for (let k = 0; k < 6; k++) line(cx - R + 1 + k * Math.round((2 * R) / 5), 15, .8, k, false, 'tn');
      for (let d = 2; d < 9; d++) for (let j = -1; j <= 1; j++) g.set(cx + j + Math.round(Math.sin(d * .9) * .7), R + d, (d + j) % 2 ? 'arm' : 'tn2');
    } else {
      for (let k = 0; k < 5; k++) {
        const x0 = cx - R + 1 + k * Math.round((2 * R) / 4), dir = k < 2 ? -1 : k > 2 ? 1 : (k % 2 ? 1 : -1);
        for (let d = 2; d < 6; d++) { g.set(x0, R + d, 'tn'); g.set(x0 + 1, R + d, 'tn'); }
        g.set(x0 + dir, R + 6, 'tn'); g.set(x0 + dir * 2, R + 6, 'tn'); g.set(x0 + dir * 2, R + 5, 'tn');
      }
    }
    drawEye(g, cx - 3, Math.round(R * .55), 3, false); drawEye(g, cx + 2, Math.round(R * .55), 3, false);
    g.over(cx, Math.round(R * .55) + 4, 'r'); g.over(cx + 1, Math.round(R * .55) + 4, 'r');
    return { g, tailX: 99, pal: makePal(s), jelly: true };
  },
  // Vatoz ve manta üstten görünür: geniş kanatlar, iki göz, uzun kuyruk.
  ray(s) {
    const a = s.a || 9, b = s.b || 7, tl = s.whip || 12, w = 2 * a + tl + 6, h = 2 * b + 5, g = new Grid(w, h), cx = a + 2, cy = b + 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x + .5 - cx) / a, dy = (y + .5 - cy) / b;
      const wing = s.manta ? Math.pow(Math.abs(dx), 1.3) + Math.pow(Math.abs(dy), .9) : Math.pow(Math.abs(dx), 1.5) + Math.pow(Math.abs(dy), 1.5);
      if (wing <= 1 && !(s.manta && dx > .35 && Math.abs(dy) > .55 * (1 - dx))) g.set(x, y, 'body');
    }
    for (let d = 0; d < tl; d++) g.set(cx + a - 1 + d, cy + Math.round(Math.sin(d * .4) * .6), 'fin');
    if (!s.manta) { g.set(cx + a + 2, cy - 1, 'fin'); g.set(cx + a + 3, cy - 1, 'fin'); }
    if (s.manta) for (const dy of [-2, 1]) { g.set(cx - a, cy + dy, 'fin'); g.set(cx - a - 1, cy + dy, 'fin'); g.set(cx - a - 1, cy + dy + 1, 'fin'); }
    for (let i = 0; i < (s.manta ? 0 : 10); i++) { const x = Math.round(cx + (noiseR(i) - .5) * a * 1.2), y = Math.round(cy + (noiseR(i + 50) - .5) * b * 1.2); if (g.get(x, y)) g.over(x, y, 'dk'); }
    if (s.manta) for (let x = cx - Math.round(a * .3); x <= cx + Math.round(a * .3); x++) g.over(x, cy + Math.round(b * .15), 'mid');
    const e = 3;
    drawEye(g, cx - Math.round(a * .55), cy - Math.round(b * .45), e, false);
    drawEye(g, cx - Math.round(a * .55), cy + Math.round(b * .45) - 2, e, false);
    return { g, tailX: 9999, pal: makePal(s) };
  },
  ahtapot(s) {
    const R = s.R || 7, w = 2 * R + 10, h = 2 * R + 11, g = new Grid(w, h), cx = R + 5, cy = R + 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (((x + .5 - cx) / (R + .3)) ** 2 + ((y + .5 - cy) / (R + 1.2)) ** 2 <= 1) g.set(x, y, 'body');
    for (let k = 0; k < 6; k++) {
      const x0 = cx - R + 1 + k * (2 * R - 2) / 5, dir = k < 3 ? -1 : 1;
      for (let d = 0; d < R + 3; d++) {
        const x = Math.round(x0 + dir * (d > R - 2 ? (d - R + 2) * .9 : 0) + Math.sin(d * .8 + k) * .5), y = cy + R - 1 + d;
        g.set(x, y, 'tn'); if (d < R - 1) g.set(x + 1, y, 'tn');
        if (d % 2 === 1 && d < R) g.over(x + (dir > 0 ? 1 : 0), y, 'sk');
      }
    }
    drawEye(g, cx - 4, cy + 1, 4, s.angry); drawEye(g, cx + 1, cy + 1, 4, s.angry);
    g.over(cx, cy + 6, 'r');
    return { g, tailX: 99, pal: makePal(s), octo: true };
  },
};

// ---------- Türler ----------
// zone: bölge, cls: boy sınıfları (yırtıcı), food: yem
const SPECIES = [
  // Yemler
  { id: 'hamsi', tr: 'Hamsi', en: 'Anchovy', food: true, zone: 0, L: 18, H: 7, shape: 'slim', c: ['#4f86ad', '#cfe4f1', '#f2f9fc'], fin: '#4f86ad',
    tail: ['fork', 5], fins: [{ at: 'top', u: [.45, .6], h: 2 }, { at: 'bot', u: [.55, .68], h: 1 }], pat: [{ type: 'hline', t: .42, col: 'w', u: [.25, .9] }] },
  { id: 'sardalya', tr: 'Sardalya', en: 'Sardine', food: true, zone: 0, L: 17, H: 7, c: ['#2f6f8f', '#b9d6e3', '#eef7fb'], fin: '#3f7f9f',
    tail: ['fork', 5], fins: [{ at: 'top', u: [.4, .55], h: 2 }], pat: [{ type: 'hline', t: .35, col: 'dk', u: [.3, .85] }], pal: { dk: '#1f4a60' } },
  { id: 'istavrit', tr: 'İstavrit', en: 'Horse mackerel', food: true, zone: 0, L: 18, H: 8, c: ['#4a7a7f', '#c9dcdc', '#f1f7f7'], fin: '#c9b860',
    tail: ['fork', 6], fins: [{ at: 'top', u: [.3, .45], h: 2 }, { at: 'top', u: [.5, .85], h: 1, type: 'flat' }], pat: [{ type: 'hline', t: .5, col: 'll', u: [.25, .95] }], pal: { ll: '#5f8a8c' } },
  { id: 'gumus', tr: 'Gümüş balığı', en: 'Silverside', food: true, zone: 0, L: 16, H: 6, shape: 'slim', c: ['#7fa8b8', '#e4f1f5', '#ffffff'], fin: '#8fb6c4',
    tail: ['fork', 4], fins: [{ at: 'top', u: [.5, .62], h: 2 }], pat: [{ type: 'hline', t: .45, col: 'st', u: [.2, .95] }], pal: { st: '#5f8fa8' } },
  { id: 'karides', tr: 'Karides', en: 'Shrimp', food: true, zone: 0, custom: 'karides', c: ['#f08872', '#ffa48f', '#ffd0c2'], fin: '#e8735e', pal: { sg: '#d65c48', tn: '#d65c48', out: '#7a2a1c' } },
  { id: 'palyaco', tr: 'Palyaço balığı', en: 'Clownfish', food: true, zone: 1, L: 13, H: 10, shape: 'round', c: ['#ff7d1f', '#ff8e2e', '#ffa64d'], fin: '#f06a14',
    tail: ['round', 4], fins: [{ at: 'top', u: [.25, .8], h: 3, type: 'round' }, { at: 'bot', u: [.55, .8], h: 2, type: 'round' }],
    pat: [{ type: 'vband', u: .22, w: 2, col: 'w' }, { type: 'vband', u: .6, w: 2, col: 'w' }], mouth: 'smile', eyeU: .1 },
  { id: 'kelebek', tr: 'Kelebek balığı', en: 'Butterflyfish', food: true, zone: 1, L: 12, H: 11, shape: 'deep', c: ['#ffcc33', '#ffdf4d', '#fff2b0'], fin: '#f2b51a',
    tail: ['fan', 3], fins: [{ at: 'top', u: [.2, .9], h: 3, type: 'round' }, { at: 'bot', u: [.35, .9], h: 3, type: 'round' }],
    pat: [{ type: 'vband', u: .2, w: 2, col: 'bk', edge: false }, { type: 'dot', u: .78, t: .3, r: 2, col: 'bk', ring: 'w' }], eyeU: .2, e: 4 },
  { id: 'cerrah', tr: 'Mavi cerrah', en: 'Blue tang', food: true, zone: 1, L: 14, H: 10, shape: 'deep', c: ['#1f4fbf', '#2f6be0', '#5b8ff0'], fin: '#1a3f9a',
    tail: ['fork', 4, 1, 'tc'], fins: [{ at: 'top', u: [.2, .95], h: 2, type: 'flat' }, { at: 'bot', u: [.4, .95], h: 2, type: 'flat' }],
    pat: [{ type: 'hline', t: .2, th: 2, col: 'bk', u: [.35, .95] }], pal: { tc: '#ffd23f' }, e: 4 },
  { id: 'damsel', tr: 'Çavuş balığı', en: 'Sergeant major', food: true, zone: 1, L: 13, H: 9, shape: 'deep', c: ['#e8d84a', '#f0f0c0', '#ffffff'], fin: '#c9c050',
    tail: ['fork', 4], fins: [{ at: 'top', u: [.25, .85], h: 2, type: 'round' }], pat: [{ type: 'bars', n: 4, col: 'bk', depth: .85, from: .3, to: .85 }], e: 4 },
  { id: 'kardinal', tr: 'Kardinal balığı', en: 'Cardinalfish', food: true, zone: 2, L: 11, H: 8, shape: 'round', c: ['#d8403a', '#ff6b55', '#ffb0a0'], fin: '#c8302c',
    tail: ['fork', 4], fins: [{ at: 'top', u: [.3, .45], h: 3 }, { at: 'top', u: [.6, .75], h: 2 }], e: 5 },
  { id: 'gobi', tr: 'Kaya balığı', en: 'Goby', food: true, zone: 0, L: 13, H: 6, c: ['#a8825a', '#d8b888', '#f5e8cc'], fin: '#b89060',
    tail: ['round', 3], fins: [{ at: 'top', u: [.3, .45], h: 2, type: 'round' }, { at: 'top', u: [.55, .8], h: 2, type: 'round' }],
    pat: [{ type: 'spots', col: 'dk', n: .25, t: [.1, .6], seed: 3 }], pal: { dk: '#6e4d2f' }, eyeT: .1, e: 4 },
  { id: 'mandarin', tr: 'Mandarin balığı', en: 'Mandarinfish', food: true, zone: 2, L: 12, H: 8, c: ['#2d6fd0', '#ff8a2a', '#ffd07a'], fin: '#e0602a',
    tail: ['round', 3], fins: [{ at: 'top', u: [.3, .8], h: 3, type: 'round', col: 'bl' }],
    pat: [{ type: 'squiggle', col: 'bl', from: .15, to: .95 }, { type: 'squiggle', col: 'bl', from: .15, to: .95, ph: 2 }], pal: { bl: '#2fa0e0' }, e: 4 },
  { id: 'denizati', tr: 'Denizatı', en: 'Seahorse', food: true, zone: 1, custom: 'denizati', c: ['#f5a623', '#ffc04d', '#ffe0a0'], fin: '#ffd27a', pal: { out: '#7a4a05' } },
  { id: 'kalamarcik', tr: 'Kalamar yavrusu', en: 'Baby squid', food: true, zone: 2, L: 10, H: 6, shape: 'squid', c: ['#e8a0c0', '#f5c0d8', '#ffe0ee'], fin: '#d080a8',
    fins: [{ at: 'top', u: [.7, 1], h: 2, type: 'rtri' }, { at: 'bot', u: [.7, 1], h: 2, type: 'rtri' }], tent: [4, 5, false], pal: { tn: '#d080a8' }, mouth: 'none', e: 3 },

  // Sığ sular
  { id: 'levrek', tr: 'Levrek', en: 'Sea bass', zone: 0, cls: [1, 2], L: 20, H: 13, shape: 'fat', c: ['#3f7059', '#7aab8c', '#d8eedb'], fin: '#2d5a47',
    tail: ['round', 5], fins: [{ at: 'top', u: [.25, .8], h: 3, type: 'spiky' }, { at: 'bot', u: [.6, .8], h: 2, type: 'round' }],
    pat: [{ type: 'scales', col: 'sc' }], pal: { sc: '#5f9174' }, mouth: 'teeth', gill: true, pect: { u: .35, t: .55 } },
  { id: 'lufer', tr: 'Lüfer', en: 'Bluefish', zone: 0, cls: [1, 2], L: 22, H: 11, c: ['#2f6f9a', '#7fb3cf', '#e8f3f8'], fin: '#2a5a7f',
    tail: ['fork', 7], fins: [{ at: 'top', u: [.28, .42], h: 3 }, { at: 'top', u: [.5, .75], h: 2, type: 'round' }, { at: 'bot', u: [.55, .75], h: 2, type: 'round' }],
    pat: [{ type: 'dot', u: .3, t: .55, r: 2, col: 'bk' }], mouth: 'teeth', gill: true },
  { id: 'cupra', tr: 'Çipura', en: 'Gilthead bream', zone: 0, cls: [1], L: 18, H: 12, shape: 'deep', c: ['#5a7f9a', '#b9cad6', '#eef3f6'], fin: '#4a6a80',
    tail: ['fork', 6], fins: [{ at: 'top', u: [.25, .85], h: 3, type: 'spiky' }, { at: 'bot', u: [.55, .85], h: 2, type: 'round' }],
    pat: [{ type: 'vband', u: .12, w: 2, col: 'gold', edge: false }], pal: { gold: '#e8c84a' }, mouth: 'lips', pect: { u: .35, t: .5 } },
  { id: 'kefal', tr: 'Kefal', en: 'Mullet', zone: 0, cls: [1], L: 21, H: 9, c: ['#6b7f8a', '#b4c2ca', '#eef2f4'], fin: '#5f727d',
    tail: ['fork', 6], fins: [{ at: 'top', u: [.35, .45], h: 2 }, { at: 'top', u: [.6, .7], h: 2 }],
    pat: [{ type: 'hline', t: .3, col: 'ln' }, { type: 'hline', t: .5, col: 'ln' }, { type: 'hline', t: .7, col: 'ln' }], pal: { ln: '#8a9ca6' } },
  { id: 'aslan', tr: 'Aslan balığı', en: 'Lionfish', zone: 0, cls: [1, 2], L: 15, H: 10, c: ['#c8402a', '#e86a4a', '#f5c0a8'], fin: '#8a2414',
    tail: ['round', 4], fins: [{ at: 'top', u: [.1, .85], h: 7, type: 'spines' }, { at: 'bot', u: [.55, .85], h: 4, type: 'spines' }],
    pat: [{ type: 'vstripes', every: 3, w: 1, col: 'st' }], pal: { st: '#fff2e8' }, pect: { u: .3, t: .5, size: 7, fan: true }, mouth: 'small' },
  { id: 'zargana', tr: 'Zargana', en: 'Needlefish', zone: 0, cls: [1], L: 26, H: 5, shape: 'slim', c: ['#3f8f8a', '#a8d8cf', '#eefaf7'], fin: '#3f8f8a',
    tail: ['fork', 4], fins: [{ at: 'top', u: [.8, .92], h: 2 }, { at: 'bot', u: [.78, .9], h: 2 }], beak: ['needle', 7], pal: { bk2: '#2f7f7a' }, mouth: 'none' },
  { id: 'kirlangic', tr: 'Kırlangıç', en: 'Gurnard', zone: 0, cls: [1, 2], L: 17, H: 10, shape: 'angler', c: ['#d0503a', '#e8806a', '#f8d0c0'], fin: '#c04030',
    tail: ['fork', 5], fins: [{ at: 'top', u: [.15, .4], h: 3, type: 'spiky' }, { at: 'top', u: [.5, .85], h: 2, type: 'round' }],
    pect: { u: .3, t: .45, size: 8, fan: true, col: 'wing' }, pal: { wing: '#3fa0d0' }, mouth: 'small' },

  // Mercan resifi
  { id: 'barakuda', tr: 'Barakuda', en: 'Barracuda', zone: 1, cls: [1, 2], L: 28, H: 9, shape: 'slim', c: ['#556c80', '#a9bccb', '#eaf1f6'], fin: '#4a5f72',
    tail: ['fork', 7], fins: [{ at: 'top', u: [.3, .4], h: 3 }, { at: 'top', u: [.7, .78], h: 2 }, { at: 'bot', u: [.7, .78], h: 2 }],
    pat: [{ type: 'bars', n: 6, col: 'bar', depth: .45, from: .3, to: .9 }], pal: { bar: '#3f5466' }, mouth: 'teeth', reach: 1.1 },
  { id: 'murana', tr: 'Murana', en: 'Moray eel', zone: 1, cls: [1, 2], L: 32, H: 7, shape: 'long', c: ['#4f7f30', '#6e9e3c', '#b8cf6a'], fin: '#4c7a2e',
    tail: ['point', 4], fins: [{ at: 'top', u: [.15, 1], h: 1, type: 'flat' }, { at: 'bot', u: [.55, 1], h: 1, type: 'flat' }],
    pat: [{ type: 'spots', col: 'sp', n: .3, seed: 5 }], pal: { sp: '#e3d65e' }, mouth: 'teeth', eyeU: .08, eyeT: .25 },
  { id: 'napolyon', tr: 'Napolyon balığı', en: 'Humphead wrasse', zone: 1, cls: [2, 3], L: 22, H: 15, shape: 'hump', c: ['#2f7f7a', '#4fb0a0', '#a8e0d0'], fin: '#2a6a66',
    tail: ['round', 6], fins: [{ at: 'top', u: [.3, .85], h: 2, type: 'round' }, { at: 'bot', u: [.55, .85], h: 2, type: 'round' }],
    pat: [{ type: 'squiggle', col: 'sq', from: .05, to: .3 }, { type: 'squiggle', col: 'sq', from: .05, to: .3, ph: 2 }, { type: 'scales', col: 'sc' }], pal: { sq: '#2a5f9a', sc: '#3f9a8a', lp: '#3f9a8a' },
    mouth: 'lips', eyeU: .17 },
  { id: 'tetik', tr: 'Tetik balığı', en: 'Triggerfish', zone: 1, cls: [1], L: 15, H: 11, shape: 'deep', c: ['#e0d4b0', '#f2ead4', '#ffffff'], fin: '#b8a870',
    tail: ['fan', 4], fins: [{ at: 'top', u: [.3, .4], h: 4 }, { at: 'top', u: [.6, .9], h: 2, type: 'round' }, { at: 'bot', u: [.6, .9], h: 2, type: 'round' }],
    pat: [{ type: 'hline', t: .35, col: 'bl', u: [.05, .4] }, { type: 'hline', t: .55, col: 'ye', u: [.05, .35] }, { type: 'vband', u: .5, w: 2, col: 'bk', edge: false }],
    pal: { bl: '#2f6be0', ye: '#ffcc33' }, mouth: 'small' },
  { id: 'iskorpit', tr: 'İskorpit', en: 'Scorpionfish', zone: 1, cls: [1, 2], L: 17, H: 11, shape: 'fat', c: ['#a8402a', '#c86a4a', '#e8b090'], fin: '#a0482e',
    tail: ['round', 5], fins: [{ at: 'top', u: [.15, .8], h: 4, type: 'spines' }],
    pat: [{ type: 'spots', col: 'dk', n: .35, seed: 7 }, { type: 'spots', col: 'lt', n: .2, seed: 9 }], pal: { dk: '#7a2a1a', lt: '#f0c8a0' },
    pect: { u: .3, t: .5, size: 5, fan: true }, mouth: 'wide' },
  { id: 'papagan', tr: 'Papağan balığı', en: 'Parrotfish', zone: 1, cls: [1, 2], L: 19, H: 11, c: ['#2fa090', '#4fd0b0', '#a8f0d8'], fin: '#e070a0',
    tail: ['cres', 5], fins: [{ at: 'top', u: [.25, .85], h: 2, type: 'flat' }, { at: 'bot', u: [.55, .85], h: 2, type: 'flat' }],
    pat: [{ type: 'grid', col: 'pk' }], pal: { pk: '#ff8ab8' }, mouth: 'beak' },
  { id: 'vatoz', tr: 'Vatoz', en: 'Stingray', zone: 1, cls: [1, 2], custom: 'ray', a: 9, b: 7, whip: 13, c: ['#8a7a5a', '#a89878', '#c8b898'], fin: '#6a5a3a',
    pal: { dk: '#5a4a2a', out: '#3a2a10' } },
  { id: 'denizanasi', tr: 'Denizanası', en: 'Jellyfish', zone: 1, cls: [1], custom: 'denizanasi', R: 6, c: ['#e890d0', '#f5b0e0', '#ffd8f0'], fin: '#d070b8',
    pal: { rim: '#c060a8', tn: '#f0a0d8', tn2: '#d878c0', arm: '#ffc8e8', out: '#7a2a68' } },
  { id: 'kalamar', tr: 'Kalamar', en: 'Squid', zone: 1, cls: [2], L: 18, H: 10, shape: 'squid', c: ['#c8608a', '#e890b0', '#f8d0e0'], fin: '#b05078',
    fins: [{ at: 'top', u: [.7, 1], h: 3, type: 'rtri' }, { at: 'bot', u: [.7, 1], h: 3, type: 'rtri' }], tent: [6, 8, true], pal: { tn: '#b05078' },
    pat: [{ type: 'spots', col: 'dk', n: .2, seed: 4 }], mouth: 'none', angry: false },
  { id: 'ahtapot', tr: 'Ahtapot', en: 'Octopus', zone: 1, cls: [2, 3], custom: 'ahtapot', R: 7, c: ['#d0603a', '#e8805a', '#f5b090'], fin: '#c05030',
    pal: { tn: '#d86a44', sk: '#ffd0b0', out: '#6a2410' }, angry: true },

  // Açık deniz
  { id: 'orkinos', tr: 'Orkinos', en: 'Tuna', zone: 2, cls: [2, 3], L: 26, H: 12, c: ['#22426f', '#8fa6bf', '#eef3f8'], fin: '#1c3560',
    tail: ['cres', 8], fins: [{ at: 'top', u: [.3, .45], h: 3 }, { at: 'top', u: [.55, .65], h: 3, col: 'ye' }, { at: 'bot', u: [.55, .65], h: 3, col: 'ye' }],
    finlets: 4, pat: [{ type: 'hline', t: .48, col: 'll', u: [.2, .95] }], pal: { ye: '#f2c230', ll: '#c9a43a' }, mouth: 'small', pect: { u: .3, t: .5 } },
  { id: 'kilic', tr: 'Kılıç balığı', en: 'Swordfish', zone: 2, cls: [2, 3], L: 28, H: 11, c: ['#47577c', '#8796ba', '#e2e8f2'], fin: '#3c4a6b',
    tail: ['cres', 9], fins: [{ at: 'top', u: [.12, .3], h: 7, type: 'sail' }, { at: 'bot', u: [.6, .7], h: 2 }], beak: ['sword', 13], pal: { bk2: '#c9d3e6' },
    mouth: 'small', pect: { u: .2, t: .65, size: 5 }, reach: 1.45 },
  { id: 'kopekbaligi', tr: 'Köpekbalığı', en: 'Shark', zone: 2, cls: [3, 4, 5], L: 28, H: 12, shape: 'shark', c: ['#6c7e93', '#8597ab', '#eef2f5'], fin: '#5d6f84',
    tail: ['shark', 9], fins: [{ at: 'top', u: [.3, .48], h: 6, type: 'shark' }, { at: 'top', u: [.75, .8], h: 2 }, { at: 'bot', u: [.7, .76], h: 2 }],
    mouth: 'teeth', mouthT: .35, gill: 3, pect: { u: .32, t: .7, size: 5 } },
  { id: 'marlin', tr: 'Marlin', en: 'Marlin', zone: 2, cls: [3, 4], L: 30, H: 11, c: ['#1f3f7a', '#5f8fc8', '#e0ecf8'], fin: '#2a4f9a',
    tail: ['cres', 10], fins: [{ at: 'top', u: [.08, .55], h: 7, type: 'sail', col: 'sl' }], beak: ['sword', 10], pal: { bk2: '#2a4f8a', sl: '#3f6fc0' },
    pat: [{ type: 'bars', n: 8, col: 'st', depth: .7, from: .2, to: .85 }], pal2: 1, mouth: 'small', reach: 1.3 },
  { id: 'mahi', tr: 'Lambuka', en: 'Mahi-mahi', zone: 2, cls: [2, 3], L: 24, H: 12, shape: 'hump', c: ['#2fa05a', '#d8d040', '#f5e88a'], fin: '#2f7fd0',
    tail: ['fork', 8], fins: [{ at: 'top', u: [.05, .9], h: 3, type: 'flat' }, { at: 'bot', u: [.5, .9], h: 2, type: 'flat' }],
    pat: [{ type: 'spots', col: 'bl', n: .25, seed: 11 }], pal: { bl: '#2f9fd0' }, mouth: 'small' },
  { id: 'palamut', tr: 'Palamut', en: 'Bonito', zone: 2, cls: [2], L: 22, H: 10, c: ['#2a4f7a', '#a8bccf', '#eef3f8'], fin: '#22426a',
    tail: ['cres', 7], fins: [{ at: 'top', u: [.25, .45], h: 3 }, { at: 'top', u: [.55, .62], h: 2 }], finlets: 3,
    pat: [{ type: 'slant', col: 'st', every: 4, depth: .45 }], pal: { st: '#183a60', ye: '#c9d8e6' }, mouth: 'teeth' },
  { id: 'mako', tr: 'Mako köpekbalığı', en: 'Mako shark', zone: 2, cls: [3, 4], L: 27, H: 11, shape: 'shark', c: ['#2a4f9a', '#5f7fc0', '#f2f5fa'], fin: '#22428a',
    tail: ['cres', 9], fins: [{ at: 'top', u: [.32, .48], h: 6, type: 'shark' }], mouth: 'teeth', mouthT: .35, gill: 3, pect: { u: .32, t: .7, size: 5 } },
  { id: 'cekic', tr: 'Çekiç başlı köpekbalığı', en: 'Hammerhead', zone: 2, cls: [4, 5], L: 28, H: 11, shape: 'shark', hammer: true, c: ['#7a8a9a', '#98a8b8', '#eef2f5'], fin: '#6a7a8a',
    tail: ['shark', 9], fins: [{ at: 'top', u: [.3, .45], h: 7, type: 'shark' }], mouth: 'teeth', mouthT: .4, gill: 3, eyeU: .02, eyeT: .06, extraTop: 12 },
  { id: 'manta', tr: 'Manta', en: 'Manta ray', zone: 2, cls: [4, 5], custom: 'ray', manta: true, a: 11, b: 12, whip: 9, c: ['#2a3550', '#3f4c6a', '#56658a'], fin: '#1f283e',
    pal: { mid: '#8a9ab8', out: '#0f1424' } },
  { id: 'testere', tr: 'Testere balığı', en: 'Sawfish', zone: 2, cls: [4, 5], L: 28, H: 10, shape: 'shark', c: ['#8a7a5a', '#b0a07a', '#efe8d8'], fin: '#7a6a4a',
    tail: ['shark', 8], fins: [{ at: 'top', u: [.35, .48], h: 5, type: 'shark' }, { at: 'top', u: [.68, .78], h: 4, type: 'shark' }], beak: ['saw', 12],
    pal: { bk2: '#a09070', w2: '#f5f0e0' }, mouth: 'small', mouthT: .4, reach: 1.4 },

  // Derin deniz
  { id: 'fener', tr: 'Fener balığı', en: 'Anglerfish', zone: 3, cls: [3, 4], L: 18, H: 15, shape: 'angler', c: ['#3b2a55', '#4d3a6b', '#5f4a80'], fin: '#2b1e3e',
    tail: ['round', 4], fins: [{ at: 'top', u: [.55, .8], h: 2, type: 'round' }], lure: true, mouth: 'big', mouthW: .45, mouthH: .38, mouthT: .25,
    pat: [{ type: 'spots', col: 'gl', n: .08, seed: 13 }], pal: { gl: '#a891e0', out: '#120a1e' }, eyeU: .4, eyeT: .25 },
  { id: 'orfoz', tr: 'Dev orfoz', en: 'Giant grouper', zone: 3, cls: [4, 5], L: 22, H: 16, shape: 'fat', c: ['#6e4d2f', '#8f6a45', '#c9a880'], fin: '#5a3e26',
    tail: ['round', 6], fins: [{ at: 'top', u: [.3, .85], h: 3, type: 'spiky' }, { at: 'bot', u: [.6, .85], h: 2, type: 'round' }],
    pat: [{ type: 'spots', col: 'dk', n: .3, seed: 17, size: 2, gap: 3 }], pal: { dk: '#4a3220', lp: '#b08560' }, mouth: 'big', mouthW: .3, mouthH: .26, pect: { u: .35, t: .55, size: 4 } },
  { id: 'engerek', tr: 'Engerek balığı', en: 'Viperfish', zone: 3, cls: [3, 4], L: 22, H: 8, shape: 'slim', c: ['#1f2a3a', '#2f3f55', '#3f5570'], fin: '#1a2230',
    tail: ['fork', 5], fins: [{ at: 'top', u: [.15, .2], h: 4 }], fangs: true, pat: [{ type: 'photo', col: 'g' }], pal: { w2: '#ffffff', out: '#05080e' }, mouth: 'wide', e: 4 },
  { id: 'ejder', tr: 'Ejder balığı', en: 'Dragonfish', zone: 3, cls: [3], L: 26, H: 6, shape: 'long', c: ['#141418', '#24242c', '#34343f'], fin: '#141418',
    tail: ['fork', 4], fins: [{ at: 'top', u: [.85, .95], h: 2 }], barbel: true, fangs: true, pat: [{ type: 'photo', col: 'g' }], pal: { w2: '#ffffff', out: '#000000', eo: '#5a0a0a' }, mouth: 'wide', e: 4 },
  { id: 'devkalamar', tr: 'Dev kalamar', en: 'Giant squid', zone: 3, cls: [4, 5], L: 26, H: 12, shape: 'squid', c: ['#a0303a', '#c84a50', '#f0a0a0'], fin: '#8a2030',
    fins: [{ at: 'top', u: [.75, 1], h: 4, type: 'rtri' }, { at: 'bot', u: [.75, 1], h: 4, type: 'rtri' }], tent: [8, 12, true], pal: { tn: '#a8303a' },
    pat: [{ type: 'spots', col: 'dk', n: .25, seed: 19 }], mouth: 'none', e: 6 },
  { id: 'kurek', tr: 'Kürek balığı', en: 'Oarfish', zone: 3, cls: [3, 4], L: 36, H: 6, shape: 'long', c: ['#9ab0c0', '#d0dde6', '#f2f6f9'], fin: '#e03a3a',
    tail: ['point', 4], fins: [{ at: 'top', u: [.1, 1], h: 3, type: 'flat', col: 'red' }], plume: true, pat: [{ type: 'spots', col: 'dk', n: .15, seed: 23, t: [.1, .5] }],
    pal: { dk: '#5f7a8c', red: '#e03a3a' }, mouth: 'small' },
  { id: 'goblin', tr: 'Goblin köpekbalığı', en: 'Goblin shark', zone: 3, cls: [4, 5], L: 26, H: 11, shape: 'shark', c: ['#d08a8a', '#e8b0ac', '#f5dcd8'], fin: '#c07a7a',
    tail: ['shark', 8], fins: [{ at: 'top', u: [.4, .5], h: 3, type: 'round' }], beak: ['goblin', 7], pal: { bk2: '#e0a0a0' }, mouth: 'teeth', mouthT: .4, gill: 3 },
  { id: 'balinakopek', tr: 'Balina köpekbalığı', en: 'Whale shark', zone: 3, cls: [5], L: 30, H: 14, shape: 'shark', c: ['#3a4a6a', '#4a5a7a', '#e8eef5'], fin: '#344060',
    tail: ['shark', 10], fins: [{ at: 'top', u: [.4, .55], h: 6, type: 'shark' }], pat: [{ type: 'grid', col: 'w' }], mouth: 'wide', mouthT: .25, gill: 3, angry: false, e: 4 },
  { id: 'pelikan', tr: 'Pelikan yılan balığı', en: 'Gulper eel', zone: 3, cls: [3, 4], custom: 'pelikan', c: ['#1a1a24', '#2a2a36', '#3a3a48'], fin: '#1a1a24',
    tail: ['point', 6], whip: 6, mouth: 'big', mouthW: .3, mouthH: .5, mouthT: .15, pal: { out: '#000000' }, eyeU: .05, eyeT: .1, e: 3 },
];
for (const s of SPECIES) if (s.id === 'marlin') s.pal = { bk2: '#2a4f8a', sl: '#3f6fc0', st: '#9fd0ff' };

const cache = new Map();
function build(s) { return s.custom ? CUSTOM[s.custom](s) : buildFish(s); }

// Çizim: gövde sütun sütun gölgelenir, yüzgeçler çizgili, kontur türün koyu rengi.
function render(b, frame) {
  const { g, pal, tailX } = b, w = g.w, h = g.h + 1;
  const K = Array.from({ length: h }, () => Array(w).fill(null)), O = Array.from({ length: h }, () => Array(w).fill(null));
  for (let y = 0; y < g.h; y++) for (let x = 0; x < w; x++) {
    let ny = y;
    if (frame && x > tailX) ny = y + 1;
    if (frame && (b.octo || b.jelly) && g.k[y][x] === 'tn' && y > g.h * .6) ny = y + ((x + y) % 3 === 0 ? 1 : 0);
    if (g.k[y][x]) K[ny][x] = g.k[y][x];
    if (g.o[y][x]) O[ny][x] = g.o[y][x];
  }
  let minX = w, maxX = 0; const top = [], bot = [];
  for (let x = 0; x < w; x++) { top[x] = -1; for (let y = 0; y < h; y++) if (K[y][x] === 'body') { if (top[x] < 0) top[x] = y; bot[x] = y; minX = Math.min(minX, x); maxX = Math.max(maxX, x); } }
  const T = [[0.16, 'lite'], [0.42, 'back'], [0.68, 'mid'], [2, 'bellyc']], big = h >= 13;
  const col = Array.from({ length: h }, () => Array(w).fill(null));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = K[y][x];
    if (!k) continue;
    if (k === 'body') {
      const t = (y - top[x] + 0.5) / (bot[x] - top[x] + 1), u = (x - minX) / Math.max(1, maxX - minX);
      let i = T.findIndex(([lim]) => t < lim);
      if (big && x % 2 === 0 && y % 2 === 0 && i < T.length - 1 && T[i][0] - t < 0.04) i++;
      let c = T[i][1];
      if (c === 'lite' && u > 0.6) c = 'back';
      if (!(K[y + 1] && K[y + 1][x] === 'body')) c = 'shade';
      col[y][x] = pal[c];
    } else if (k === 'fin') col[y][x] = x % 2 === 0 ? pal.fin2 : pal.fin;
    else if (k === 'eyew') col[y][x] = '#ffffff';
    else col[y][x] = pal[k] || pal.fin;
    if (O[y][x]) col[y][x] = O[y][x] === 'k' ? INK : O[y][x] === 'w' ? '#ffffff' : pal[O[y][x]] || O[y][x];
  }
  const cv = document.createElement('canvas'); cv.width = w + 2; cv.height = h + 2;
  const c = cv.getContext('2d');
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    const v = col[y] && col[y][x];
    if (v) { c.fillStyle = v; c.fillRect(x + 1, y + 1, 1, 1); }
    else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => col[y + dy] && col[y + dy][x + dx])) { c.fillStyle = pal.out; c.fillRect(x + 1, y + 1, 1, 1); }
  }
  // Gövdenin kutusu (çarpışma ve boy için), kenar payı dahil kanvas koordinatında.
  let y0 = h, y1 = 0;
  for (let x = minX; x <= maxX; x++) if (top[x] >= 0) { y0 = Math.min(y0, top[x]); y1 = Math.max(y1, bot[x]); }
  cv.box = maxX >= minX ? { x0: minX + 1, x1: maxX + 1, y0: y0 + 1, y1: y1 + 1 } : { x0: 1, x1: w, y0: 1, y1: h };
  return cv;
}
function sprite(id, frame) {
  const key = id + '_' + (frame ? 1 : 0);
  if (!cache.has(key)) {
    const s = SPECIES.find(q => q.id === id);
    if (!s._b) s._b = build(s);
    cache.set(key, render(s._b, frame));
  }
  return cache.get(key);
}

// Balon balığı kademeleri (sağa bakar).
function puffer(R, frame, skin, opt) {
  const puffed = R > 4, Ls = puffed ? (R >= 9 ? 2 : 1) : 0, pad = Ls + 3, cx = R + pad + 2, cy = R + pad;
  const w = 2 * R + 2 * pad + 3, h = 2 * R + 2 * pad + 1, g = new Grid(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - cx + 0.5) ** 2 + (y - cy + 0.5) ** 2 <= R * R) g.set(x, y, 'body');
  if (puffed) {
    const n = Math.max(8, Math.round(R * 1.5));
    for (let i = 0; i < n; i++) {
      const an = (i + 0.5) / n * Math.PI * 2;
      if (Math.cos(an) < -0.75) continue;
      for (let d = 1; d <= Ls; d++) g.set(Math.round(cx - 0.5 + Math.cos(an) * (R + d - 0.3)), Math.round(cy - 0.5 + Math.sin(an) * (R + d - 0.3)), 'sp');
    }
  }
  const tl = Math.max(2, Math.round(R * 0.5)), tx = cx - R - 1;
  for (let d = 0; d < tl; d++) for (let y = cy - 1 - Math.floor(d * 0.8); y <= cy + Math.floor(d * 0.8); y++) g.set(tx - d, y + (frame && d > 0 ? 1 : 0), 'fin');
  const e = Math.max(3, Math.round(R * 0.46)), ex = Math.round(cx + R * 0.2), ey = Math.round(cy - R * 0.5);
  // sağa bakan göz: şablonu aynala (çizgisiz; istenirse opt.line ile üst ve arka çizgi)
  const rows = eyeShape(e).map(r => [...r].reverse().join(''));
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') g.over(ex + x, ey + y, ch === 'k' ? 'k' : 'w'); }));
  if (opt && opt.line) for (let x = -1; x <= e; x++) g.over(ex + x, ey - 1, 'eo');
  if (opt && opt.line) for (let y = 0; y < e; y++) g.over(ex - 1, ey + y, 'eo');
  // kavisli küçük kaş: ortası yukarıda, uçları aşağıda
  if (R >= 6) for (let x = 0; x < e; x++) { const yb = ey - 2 - (x > 0 && x < e - 1 ? 1 : 0); g.paint(ex + x, yb, 'brow', 'brow'); }
  if (puffed) { g.over(cx + R - 1, cy + Math.round(R * 0.25), 'm'); g.over(cx + R - 1, cy + Math.round(R * 0.25) + 1, 'm'); g.over(ex, ey + e + 1, 'p'); g.over(ex + 1, ey + e + 1, 'p'); }
  else { g.over(cx + R - 1, cy + 1, 'r'); g.over(cx + R - 2, cy + 1, 'r'); g.over(cx + R - 1, cy + 2, 'r'); }
  if (R >= 7) for (const [a, b2] of [[-0.55, -0.35], [-0.2, -0.65], [-0.6, 0.15], [-0.25, 0.05]]) g.over(Math.round(cx + a * R), Math.round(cy + b2 * R), 's');
  const sk = skin || {};
  // Parıltı: gövdede birkaç beyaz pırıltı (altın görünüm)
  if (sk.sparkle) for (const [a2, b3] of [[-0.35, -0.5], [0.1, 0.35], [-0.6, 0.35], [0.35, -0.75]]) {
    const x = Math.round(cx + a2 * R), y = Math.round(cy + b3 * R);
    g.over(x, y, 'w'); if (R >= 9) { g.over(x - 1, y, 'sp2'); g.over(x + 1, y, 'sp2'); g.over(x, y - 1, 'sp2'); g.over(x, y + 1, 'sp2'); }
  }
  // Taç: başın üstünde, kırmızı taşlı
  if (sk.crown) {
    const cw = Math.max(5, Math.round(R * 0.9)) | 1, x0 = Math.round(cx + R * 0.1 - cw / 2), yb = cy - R - 1;
    for (let x = 0; x < cw; x++) { g.set(x0 + x, yb, 'cr'); g.set(x0 + x, yb - 1, 'cr'); }
    for (const x of [0, cw >> 1, cw - 1]) { g.set(x0 + x, yb - 2, 'cr'); g.set(x0 + x, yb - 3, 'cr'); }
    g.over(x0 + (cw >> 1), yb - 1, 'gm');
  }
  const p = skin || {};
  const pal = { out: p.out || (p.body ? dark(p.body, .58) : '#7a3f0e'), back: p.body || '#f9cf48', lite: p.lite || '#fff0a8', mid: p.body || '#f9cf48', bellyc: p.belly || '#fff3cc', shade: p.shade || '#e3a034',
    fin: p.fin || '#e8902c', fin2: light(p.fin || '#e8902c', .25), cr: '#ffe066', gm: '#e0303a', sp2: '#fff6c8', sp: p.spike || '#f0a43a', s: p.spot || '#d0841f', m: '#ff6f4f', p: '#ff9b7d', eo: dark(p.body || '#f9cf48', .45), brow: dark(p.body || '#f9cf48', .5), r: '#7a2830' };
  return render({ g, pal, tailX: 9999 }, 0);
}

// Bir türü bazı ayarları değiştirilmiş olarak çizer (önizleme ve seçenek denemeleri için).
function variant(id, over, frame) {
  const s = Object.assign({}, SPECIES.find(q => q.id === id), over);
  return render(build(s), frame);
}

global.FishArt = { SPECIES, sprite, puffer, variant };
})(window);
