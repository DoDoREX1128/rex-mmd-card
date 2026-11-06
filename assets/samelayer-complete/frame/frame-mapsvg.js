/* ============================================================
   区域舆图 · 铜版工艺（800×560）
   —— 线、点刻、等高、装饰框，不用实心色块
   ============================================================ */
const SVG_W = 800, SVG_H = 560;

const C = {
  ink:  o => `rgba(228,220,204,${o})`,
  gold: o => `rgba(217,179,106,${o})`,
  hi:   o => `rgba(246,227,174,${o})`,
  jade: o => `rgba(111,214,174,${o})`,
  ice:  o => `rgba(127,227,240,${o})`,
  blood:o => `rgba(228,86,110,${o})`,
  vio:  o => `rgba(160,124,255,${o})`,
  ash:  o => `rgba(140,132,160,${o})`
};
const P  = (d, s, w = 1, o = 1, extra = '') =>
  `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" opacity="${o}" stroke-linecap="round" ${extra}/>`;
const PF = (d, s, o = 1) => `<path d="${d}" fill="${s}" opacity="${o}"/>`;

/* 纸面颗粒：随机短刻线 */
function scatter(seed, n, x0, y0, x1, y1, op) {
  let sd = seed || 7, out = '';
  const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
    const len = 3 + rnd() * 10, ang = rnd() * Math.PI;
    out += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(ang)*len).toFixed(1)} ${(Math.sin(ang)*len).toFixed(1)}" stroke="rgba(228,220,204,${(op||0.06).toFixed(3)})" stroke-width=".6" stroke-linecap="round"/>`;
  }
  return out;
}

/* 提亮 */
const lift = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + k);
  const g = Math.min(255, ((n >> 8) & 255) + k);
  const b = Math.min(255, (n & 255) + k);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
};

/* 注记框 */
function cartouche(x, y, w, lines, title) {
  const h = 18 + lines.length * 15 + (title ? 12 : 0);
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(6,3,14,.42)" stroke="${C.gold(0.20)}" stroke-width=".8"/>`;
  s += `<rect x="${x+4}" y="${y+4}" width="${w-8}" height="${h-8}" fill="none" stroke="${C.gold(0.09)}" stroke-width=".5"/>`;
  let ty = y + 22;
  if (title) {
    s += `<text x="${x+13}" y="${ty}" font-size="8.5" letter-spacing="3" fill="${C.hi(0.44)}" font-family="serif">${title}</text>`;
    ty += 15;
  }
  lines.forEach(t => {
    s += `<text x="${x+13}" y="${ty}" font-size="7.6" letter-spacing="1.2" fill="${C.ink(0.30)}" font-family="serif">${t}</text>`;
    ty += 15;
  });
  return s;
}

/* 有机闭合曲线 */
function blobPath(cx, cy, rx, ry, seed, wob = 0.10) {
  const pts = [];
  const N = 12;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    const r = 1 + Math.sin(seed + i * 1.9) * wob + Math.cos(seed * 2.3 + i * 0.8) * wob * 0.7;
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const p = pts[i], q = pts[(i + 1) % N];
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  return d + 'Z';
}
function contours(cx, cy, rx, ry, rings, col, seed = 1.2) {
  let s = '';
  for (let i = 0; i < rings; i++) {
    const k = 1 - i / rings * 0.80;
    s += P(blobPath(cx, cy, rx * k, ry * k, seed + i * 1.7, 0.08), col, 0.85, 1);
  }
  return s;
}

/* 山：叠层脊线 */
function mtn(x, y, w, h, n = 4, col = C.ink) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const ww = w * (1 - t * 0.58), hh = h * (1 - t * 0.52);
    s += P(`M${x-ww/2} ${y} Q${x-ww*0.30} ${y-hh*0.60} ${x-ww*0.08} ${y-hh} Q${x+ww*0.18} ${y-hh*0.50} ${x+ww/2} ${y}`,
           col(0.09 + t * 0.10), 1.25 - t * 0.28);
  }
  s += P(`M${x-w*0.42} ${y} Q${x} ${y-h*0.24} ${x+w*0.42} ${y}`, col(0.055), 3.2);
  return s;
}
function range(x, y, n, gap, w, h, col) {
  let s = '';
  for (let i = 0; i < n; i++) s += mtn(x + i * gap, y + (i % 2 ? h * 0.16 : 0), w * (0.8 + (i % 3) * 0.12), h * (0.8 + (i % 2) * 0.22), 4, col);
  return s;
}

/* 林：树冠叠圆 */
function canopy(x, y, r, col = C.jade) {
  let s = `<circle cx="${x}" cy="${y}" r="${r}" fill="rgba(20,52,40,.40)" stroke="${col(0.30)}" stroke-width=".9"/>`;
  s += `<circle cx="${x-r*0.06}" cy="${y-r*0.06}" r="${r*0.62}" fill="none" stroke="${col(0.14)}" stroke-width=".7"/>`;
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + 0.5;
    s += `<line x1="${x}" y1="${y}" x2="${x+Math.cos(a)*r*0.82}" y2="${y+Math.sin(a)*r*0.82}" stroke="${col(0.13)}" stroke-width=".6"/>`;
  }
  return s;
}
function wood(x, y, w, h, n, seed = 3, col = C.jade) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = Math.sin(seed + i * 2.7), b = Math.cos(seed * 1.7 + i * 1.3);
    const px = x + (a * 0.5 + 0.5) * w, py = y + (b * 0.5 + 0.5) * h;
    s += canopy(px, py, 5 + Math.abs(Math.sin(i * 1.9)) * 11, col);
  }
  return s;
}

/* 水：涟漪线 */
function ripples(x, y, w, rows, col = C.ice, gap = 6) {
  let s = '';
  for (let i = 0; i < rows; i++) {
    const yy = y + i * gap;
    const seg = w / 3;
    s += P(`M${x} ${yy} q${seg*0.25} -3 ${seg*0.5} 0 t${seg*0.5} 0 t${seg*0.5} 0 t${seg*0.5} 0 t${seg*0.5} 0`,
           col(0.28 - i * 0.035), 0.85);
  }
  return s;
}

/* 城墙：粗虚线城齿 + 细实线 */
function wallRect(x, y, w, h, col = C.hi, op = 0.34) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${col(op)}" stroke-width="3" stroke-dasharray="4.5 3.2"/>`
       + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${col(op + 0.12)}" stroke-width="1.2"/>`;
}
function wallCircle(cx, cy, r, col = C.hi, op = 0.32) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col(op)}" stroke-width="3" stroke-dasharray="4.5 3.2"/>`
       + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col(op + 0.14)}" stroke-width="1.2"/>`;
}

/* 里坊 / 建筑点阵 */
function blocks(x, y, w, h, cols, rows, col = C.ink, gap = 3) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(255,255,255,.018)" stroke="${col(0.22)}" stroke-width=".8"/>`;
  const bw = (w - gap * (cols - 1)) / cols, bh = (h - gap * (rows - 1)) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const px = x + i * (bw + gap), py = y + j * (bh + gap);
    s += `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="rgba(255,255,255,.035)" stroke="${col(0.16)}" stroke-width=".55"/>`;
  }
  return s;
}

/* 田垄 */
function fields(x, y, w, h, cols, rows) {
  let s = '';
  const cw = w / cols, ch = h / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const px = x + i * cw, py = y + j * ch;
    s += `<rect x="${px}" y="${py}" width="${cw - 1.6}" height="${ch - 1.6}" fill="none" stroke="${C.gold(0.30)}" stroke-width=".75"/>`;
    for (let k = 1; k < 3; k++) {
      const yy = py + ch * k / 3;
      s += `<line x1="${px + 1}" y1="${yy}" x2="${px + cw - 2.6}" y2="${yy}" stroke="${C.gold(0.14)}" stroke-width=".55"/>`;
    }
  }
  return s;
}

/* 罗盘玫瑰 */
function compass(cx, cy, r) {
  let s = `<circle cx="${cx}" cy="${cy}" r="${r * 1.22}" fill="rgba(6,3,14,.50)"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.gold(0.26)}" stroke-width="1"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r*0.70}" fill="none" stroke="${C.gold(0.14)}" stroke-width=".7" stroke-dasharray="2 4"/>`;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 - Math.PI / 2;
    const long = i % 2 === 0;
    const L = r * (long ? 0.94 : 0.58), wd = r * (long ? 0.10 : 0.062);
    const x1 = cx + Math.cos(a) * L, y1 = cy + Math.sin(a) * L;
    s += PF(`M${x1.toFixed(1)} ${y1.toFixed(1)} L${(cx+Math.cos(a+Math.PI/2)*wd).toFixed(1)} ${(cy+Math.sin(a+Math.PI/2)*wd).toFixed(1)} L${cx} ${cy} L${(cx+Math.cos(a-Math.PI/2)*wd).toFixed(1)} ${(cy+Math.sin(a-Math.PI/2)*wd).toFixed(1)}Z`,
            long ? C.hi(0.26) : C.hi(0.11));
  }
  s += P(`M${cx-r*1.08} ${cy}h${r*2.16}M${cx} ${cy-r*1.08}v${r*2.16}`, C.hi(0.13), 0.7);
  s += `<circle cx="${cx}" cy="${cy}" r="2.4" fill="${C.hi(0.72)}"/>`;
  s += `<text x="${cx}" y="${cy-r-7}" font-size="9" fill="${C.hi(0.42)}" text-anchor="middle" font-family="serif" letter-spacing="1">N</text>`;
  return s;
}

/* 比例尺 */
function scaleBar(x, y, w, label = '二百里') {
  let s = P(`M${x} ${y}h${w}`, C.ink(0.36), 1.1);
  for (let i = 0; i <= 4; i++) {
    const xx = x + w * i / 4;
    s += P(`M${xx} ${y-4}v8`, C.ink(0.36), 0.9);
    if (i < 4 && i % 2 === 0) s += `<rect x="${xx}" y="${y-1}" width="${w/4}" height="2" fill="${C.ink(0.30)}"/>`;
  }
  s += `<text x="${x+w/2}" y="${y+15}" font-size="7.5" fill="${C.ink(0.30)}" text-anchor="middle" font-family="serif" letter-spacing="2">${label}</text>`;
  return s;
}

/* 图名题跋 */
function titleBlock(x, y, cn, en, anchor = 'start') {
  const w = cn.replace(/\s/g, '').length * 17 + 22, h = 41;
  const bx = anchor === 'end' ? x - w + 8 : anchor === 'middle' ? x - w / 2 : x - 10;
  return `<rect x="${bx.toFixed(1)}" y="${y - 23}" width="${w}" height="${h}" fill="rgba(6,3,14,.62)" stroke="${C.gold(0.18)}" stroke-width=".7"/>`
       + `<path d="M${bx.toFixed(1)} ${y+7} h${w}" stroke="${C.gold(0.10)}" stroke-width=".6"/>`
       + `<text x="${x}" y="${y}" font-size="16" letter-spacing="8" fill="${C.hi(0.68)}" text-anchor="${anchor}" font-family="serif">${cn}</text>`
       + `<text x="${x}" y="${y+15}" font-size="6.2" letter-spacing="3.4" fill="${C.ink(0.24)}" text-anchor="${anchor}" font-family="serif">${en}</text>`;
}

/* 外框 + 角饰 */
function mapFrame() {
  let s = `<rect x="13" y="13" width="${SVG_W-26}" height="${SVG_H-26}" fill="none" stroke="${C.gold(0.26)}" stroke-width="1.3"/>`;
  s += `<rect x="21" y="21" width="${SVG_W-42}" height="${SVG_H-42}" fill="none" stroke="${C.gold(0.11)}" stroke-width=".7"/>`;
  s += `<rect x="44" y="44" width="${SVG_W-88}" height="${SVG_H-88}" fill="none" stroke="${C.gold(0.085)}" stroke-width=".6" stroke-dasharray="3 6"/>`;
  const cnr = (x, y, sx, sy) => `
    <path d="M${x+sx*20} ${y} L${x} ${y} L${x} ${y+sy*20}" fill="none" stroke="${C.hi(0.55)}" stroke-width="1.8"/>
    <path d="M${x+sx*34} ${y+sy*7} Q${x+sx*19} ${y+sy*7} ${x+sx*19} ${y+sy*22}" fill="none" stroke="${C.hi(0.26)}" stroke-width=".9"/>
    <circle cx="${x+sx*9}" cy="${y+sy*9}" r="2" fill="${C.hi(0.5)}"/>`;
  s += cnr(21,21,1,1) + cnr(779,21,-1,1) + cnr(21,539,1,-1) + cnr(779,539,-1,-1);
  const gx0 = 44, gx1 = 756, gy0 = 44, gy1 = 516;
  for (let x = gx0; x <= gx1; x += 44) {
    const major = Math.round((x - gx0) / 44) % 4 === 0;
    s += `<line x1="${x}" y1="${gy0}" x2="${x}" y2="${gy0 + (major ? 7 : 4)}" stroke="${C.gold(major ? .26 : .14)}" stroke-width=".7"/>`;
    s += `<line x1="${x}" y1="${gy1}" x2="${x}" y2="${gy1 - (major ? 7 : 4)}" stroke="${C.gold(major ? .26 : .14)}" stroke-width=".7"/>`;
  }
  for (let y = gy0; y <= gy1; y += 44) {
    const major = Math.round((y - gy0) / 44) % 4 === 0;
    s += `<line x1="${gx0}" y1="${y}" x2="${gx0 + (major ? 7 : 4)}" y2="${y}" stroke="${C.gold(major ? .26 : .14)}" stroke-width=".7"/>`;
    s += `<line x1="${gx1}" y1="${y}" x2="${gx1 - (major ? 7 : 4)}" y2="${y}" stroke="${C.gold(major ? .26 : .14)}" stroke-width=".7"/>`;
  }
  // 上下边中点小饰
  s += `<path d="M${SVG_W/2-14} 21 l14 -7 l14 7 l-14 7Z" fill="none" stroke="${C.hi(0.28)}" stroke-width=".8"/>`;
  s += `<path d="M${SVG_W/2-14} 539 l14 7 l14 -7 l-14 -7Z" fill="none" stroke="${C.hi(0.28)}" stroke-width=".8"/>`;
  return s;
}

/* 包装 */
function svgWrap(id, pal, inner) {
  return `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" preserveAspectRatio="xMidYMid meet" class="rgnsvg" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2=".62" y2="1">
      <stop offset="0" stop-color="${lift(pal[0], 18)}"/><stop offset=".42" stop-color="${lift(pal[1], 16)}"/>
      <stop offset=".78" stop-color="${lift(pal[1], 8)}"/><stop offset="1" stop-color="${lift(pal[2], 10)}"/>
    </linearGradient>
    <pattern id="pt-${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="4" stroke="#FFFFFF" stroke-width=".5" opacity=".045"/>
    </pattern>
    <pattern id="dot-${id}" width="13" height="13" patternUnits="userSpaceOnUse">
      <circle cx="2.6" cy="2.6" r=".62" fill="rgba(228,220,204,.062)"/>
      <circle cx="9.4" cy="8.2" r=".46" fill="rgba(228,220,204,.045)"/>
      <circle cx="5.8" cy="11.4" r=".34" fill="rgba(228,220,204,.032)"/>
    </pattern>
    <radialGradient id="vg-${id}" cx=".5" cy=".44" r=".78">
      <stop offset=".40" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".58"/>
    </radialGradient>
    <radialGradient id="lt-${id}" cx=".24" cy=".12" r=".72">
      <stop offset="0" stop-color="#fff" stop-opacity=".11"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <filter id="gl-${id}" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="3.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${SVG_W}" height="${SVG_H}" fill="url(#bg-${id})"/>
  <rect width="${SVG_W}" height="${SVG_H}" fill="url(#lt-${id})"/>
  <rect width="${SVG_W}" height="${SVG_H}" fill="url(#pt-${id})"/>
  <rect x="30" y="30" width="${SVG_W-60}" height="${SVG_H-60}" fill="url(#dot-${id})"/>
  <g pointer-events="none">${(() => {
    let g = '';
    for (let x = 44; x <= 756; x += 88)
      g += `<line x1="${x}" y1="30" x2="${x}" y2="530" stroke="rgba(217,179,106,.038)" stroke-width=".6"/>`;
    for (let y = 44; y <= 516; y += 88)
      g += `<line x1="30" y1="${y}" x2="770" y2="${y}" stroke="rgba(217,179,106,.038)" stroke-width=".6"/>`;
    return g;
  })()}</g>
  <g pointer-events="none">${scatter(id.length * 37 + id.charCodeAt(0) * 13, 64, 34, 34, SVG_W - 34, SVG_H - 34, 0.055)}</g>
  ${inner}
  <rect width="${SVG_W}" height="${SVG_H}" fill="url(#vg-${id})" pointer-events="none"/>
  ${mapFrame()}
</svg>`;
}

/* ========== 1. 武魂城 · 曼陀罗城图 ========== */
const RGN_WUHUN = svgWrap('wuhun', ['#1A1230', '#0E0819', '#04020A'], (() => {
  const roads = Array.from({ length: 12 }, (_, i) => {
    const a = i / 12 * Math.PI * 2 - Math.PI / 2;
    return P(`M400 282L${(400 + Math.cos(a) * 258).toFixed(1)} ${(282 + Math.sin(a) * 250).toFixed(1)}`, C.gold(.115), 2.8);
  }).join('');
  const wards = Array.from({ length: 12 }, (_, i) => {
    const a = i / 12 * Math.PI * 2 - Math.PI / 2 + Math.PI / 12;
    const cx = 400 + Math.cos(a) * 150, cy = 282 + Math.sin(a) * 145;
    return `<g transform="rotate(${(a * 180 / Math.PI + 90).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})">${blocks(cx - 26, cy - 18, 52, 36, 3, 2, C.ink, 2)}</g>`;
  }).join('');
  const gates = [[400, 24], [400, 540], [142, 282], [658, 282]].map(([x, y]) =>
    `<rect x="${x-9}" y="${y-9}" width="18" height="18" fill="rgba(8,4,16,.9)" stroke="${C.hi(.55)}" stroke-width="1.2"/>`).join('');
  return `
  ${contours(400, 282, 276, 266, 3, C.vio(.075), 1.4)}
  ${roads}
  ${wallCircle(400, 282, 258, C.hi, .17)}
  ${wallCircle(400, 282, 184, C.hi, .22)}
  ${wards}
  ${wallCircle(400, 282, 106, C.hi, .30)}
  ${gates}
  ${contours(400, 278, 88, 84, 4, C.hi(.10), 2.4)}
  <path d="M374 296 L374 262 L386 262 L386 250 L414 250 L414 262 L426 262 L426 296Z"
    fill="rgba(246,227,174,.07)" stroke="${C.hi(.46)}" stroke-width="1.3"/>
  <path d="M386 250 L400 238 L414 250" fill="none" stroke="${C.hi(.30)}" stroke-width="1"/>
  <circle cx="400" cy="278" r="3.4" fill="${C.hi(.85)}" filter="url(#gl-wuhun)"/>
  ${P('M142 282H40M658 282H760M400 24V-0M400 540V560', C.gold(.13), 2)}
  ${[0,1,2,3].map(i=>{
    const a=i/4*Math.PI*2+Math.PI/4;
    const x=400+Math.cos(a)*300, y=282+Math.sin(a)*292;
    return `<g opacity=".5">${canopy(x,y,13,C.ink)}${canopy(x+22,y+14,9,C.ink)}</g>`;
  }).join('')}
  ${compass(706, 100, 36)}
  ${scaleBar(598, 508, 118, '五里')}
  ${titleBlock(76, 78, '武魂城', 'SPIRIT CITY')}
  <text x="700" y="130" font-size="7" letter-spacing="2" fill="${C.vio(.34)}" text-anchor="end" font-family="serif">教皇山 · 六坊 · 十二道</text>`;
})());

/* ========== 2. 天斗城 · 中轴都城图 ========== */
const RGN_TIANDOU = svgWrap('tiandou', ['#1C3029', '#101E22', '#06090C'], (() => {
  const wardBox = (x, y) => blocks(x, y, 70, 56, 2, 2, C.ink, 2.4);
  const wardsL = [[182, 266], [182, 326], [182, 386], [258, 266], [258, 386]].map(([x, y]) => wardBox(x, y)).join('');
  const wardsR = [[444, 266], [444, 386], [520, 266], [520, 326], [520, 386]].map(([x, y]) => wardBox(x, y)).join('');
  const markets = `
    <rect x="258" y="326" width="70" height="56" fill="rgba(217,179,106,.06)" stroke="${C.gold(.38)}" stroke-width="1"/>
    ${blocks(262, 330, 62, 48, 3, 3, C.gold, 1.6)}
    <text x="293" y="398" font-size="7.5" letter-spacing="2.5" fill="${C.gold(.44)}" text-anchor="middle" font-family="serif">西 市</text>
    <rect x="444" y="326" width="70" height="56" fill="rgba(217,179,106,.06)" stroke="${C.gold(.38)}" stroke-width="1"/>
    ${blocks(448, 330, 62, 48, 3, 3, C.gold, 1.6)}
    <text x="479" y="398" font-size="7.5" letter-spacing="2.5" fill="${C.gold(.44)}" text-anchor="middle" font-family="serif">东 市</text>`;
  const bridge = `
    ${P('M376 450v-11M424 450v-11', C.hi(.34), 1.4)}
    <path d="M368 452 Q400 440 432 452" fill="none" stroke="${C.hi(.42)}" stroke-width="1.6"/>`;
  return `
  ${ripples(30, 468, 740, 5, C.ice, 7)}
  <path d="M0 462 C120 452 220 476 320 464 C420 452 520 476 620 464 C680 457 740 466 800 460"
    fill="none" stroke="${C.ice(.30)}" stroke-width="1.6"/>
  ${range(120, 108, 3, 74, 78, 54, C.ink)}
  ${range(560, 96, 3, 70, 74, 48, C.ink)}
  ${wallRect(150, 110, 500, 340, C.hi, .20)}
  <rect x="176" y="134" width="448" height="292" fill="rgba(255,255,255,.012)" stroke="${C.gold(.16)}" stroke-width=".8"/>
  ${wardsL}${wardsR}${markets}
  ${P('M400 110V450', C.gold(.24), 3.2)}
  ${P('M400 110V450', C.hi(.34), 1)}
  ${wallRect(302, 128, 196, 120, C.hi, .34)}
  <rect x="332" y="148" width="136" height="84" fill="rgba(246,227,174,.05)" stroke="${C.hi(.42)}" stroke-width="1.2"/>
  ${blocks(338, 154, 124, 72, 4, 3, C.gold, 2)}
  <text x="400" y="132" font-size="7.5" letter-spacing="3" fill="${C.hi(.45)}" text-anchor="middle" font-family="serif">宫 城</text>
  ${bridge}
  ${P('M120 456 L168 448 M680 448 L728 456', C.ink(.28), 2)}
  <g opacity=".75">${canopy(660, 430, 15, C.ink)}${canopy(690, 448, 11, C.ink)}${canopy(160, 432, 13, C.ink)}</g>
  ${compass(706, 100, 34)}
  ${scaleBar(78, 516, 130, '二百里')}
  ${cartouche(596, 452, 148, ['郭城九门 · 中轴一线', '宫城居北 · 两市分列'], '都 城 制')}
  ${titleBlock(76, 78, '天斗城', 'TIANDOU')}
  <text x="400" y="82" font-size="7" letter-spacing="2.4" fill="${C.gold(.30)}" text-anchor="middle" font-family="serif">郭城 · 皇城 · 宫城 · 东西两市</text>`;
})());

/* ========== 3. 法斯诺行省 · 边境图 ========== */
const RGN_FASINUO = svgWrap('fasinuo', ['#1E2A1B', '#121A14', '#060806'], `
  ${ripples(60, 250, 300, 5, C.ice, 7)}
  ${P('M60 244 C160 232 260 262 360 250 C440 240 500 256 560 248', C.ice(.26), 1.4)}
  ${wood(376, 58, 360, 176, 54, 4.2)}
  ${P('M372 70 L372 232', C.jade(.24), 1.6, 1, 'stroke-dasharray="5 5"')}
  <text x="400" y="58" font-size="8" letter-spacing="3" fill="${C.jade(.44)}" text-anchor="middle" font-family="serif">猎 魂 森 林</text>
  ${range(60, 132, 3, 66, 66, 52, C.ink)}
  ${wood(56, 320, 120, 96, 20, 6.2)}
  ${wood(300, 400, 90, 60, 14, 7.4)}
  <text x="112" y="444" font-size="7.5" letter-spacing="2.5" fill="${C.jade(.30)}" text-anchor="middle" font-family="serif">西 陲 林</text>
  ${range(670, 300, 2, 62, 58, 44, C.ink)}
  ${P('M120 470 C240 404 340 372 460 330 C560 296 650 262 730 214', C.gold(.22), 2.2, 1, 'stroke-dasharray="9 7"')}
  ${P('M100 492 C230 424 330 392 450 350 C550 316 640 282 724 234', C.gold(.10), 1)}
  ${wallRect(268, 274, 70, 58, C.hi, .34)}
  ${blocks(274, 280, 58, 46, 3, 2, C.ink, 2)}
  <text x="303" y="264" font-size="8" letter-spacing="2.5" fill="${C.hi(.54)}" text-anchor="middle" font-family="serif">诺 丁 城</text>
  <g>
    <rect x="184" y="416" width="26" height="18" fill="rgba(255,255,255,.04)" stroke="${C.ink(.30)}" stroke-width=".9"/>
    <rect x="216" y="422" width="22" height="16" fill="rgba(255,255,255,.04)" stroke="${C.ink(.30)}" stroke-width=".9"/>
    <rect x="196" y="440" width="30" height="18" fill="rgba(255,255,255,.04)" stroke="${C.ink(.30)}" stroke-width=".9"/>
    ${canopy(248, 430, 10, C.jade)}
    <text x="212" y="474" font-size="8" letter-spacing="2.5" fill="${C.hi(.52)}" text-anchor="middle" font-family="serif">圣 魂 村</text>
  </g>
  ${P('M0 500 L800 500', C.blood(.34), 2.4, 1, 'stroke-dasharray="14 8"')}
  <text x="66" y="492" font-size="8" letter-spacing="3" fill="${C.blood(.48)}" font-family="serif">边 境 线</text>
  <text x="736" y="492" font-size="8" letter-spacing="2" fill="${C.blood(.38)}" text-anchor="end" font-family="serif">↓ 星罗帝国 二百里</text>
  ${[0,1,2].map(i=>`<g opacity=".6">${P(`M${120+i*220} 500v-16`, C.blood(.40), 1.4)}${P(`M${112+i*220} 484h16`, C.blood(.40), 1.4)}</g>`).join('')}
  ${compass(706, 100, 34)}
  ${scaleBar(600, 520, 120, '百里')}
  ${titleBlock(76, 78, '法斯诺行省', 'FASINUO')}
  ${cartouche(560, 296, 168, ['北 · 猎魂森林（圈养魂兽）', '中 · 诺丁城 · 武魂分殿', '南 · 边境线 · 去星罗二百里'], '行 省 志')}
`);

/* ========== 4. 巴拉克王国 · 田园关隘图 ========== */
const RGN_BALAKE = svgWrap('balake', ['#2A2618', '#191408', '#080603'], (() => {
  const plain = 'M198 268 C258 246 336 260 404 250 C476 240 566 252 622 272 C650 316 642 374 596 404 C520 436 424 418 352 428 C284 438 220 414 200 378 C186 340 188 300 198 268Z';
  return `
  <defs><clipPath id="cl-balake"><path d="${plain}"/></clipPath></defs>
  <g clip-path="url(#cl-balake)">
    <rect x="180" y="240" width="440" height="210" fill="rgba(217,179,106,.055)"/>
    ${fields(176, 236, 470, 214, 13, 5)}
  </g>
  <path d="${plain}" fill="none" stroke="${C.gold(.30)}" stroke-width="1.3"/>
  ${P('M196 352 C280 344 340 360 420 350 C480 342 540 352 580 344', C.ice(.24), 1.6)}
  ${P('M180 330 C260 322 320 338 400 328 C470 320 530 330 570 322', C.ice(.14), 1)}
  ${range(646, 116, 4, 44, 52, 70, C.ink)}
  <text x="726" y="92" font-size="8" letter-spacing="3" fill="${C.ink(.40)}" text-anchor="end" font-family="serif">天 灵 山 脉</text>
  ${wallRect(212, 300, 66, 54, C.hi, .34)}
  ${blocks(218, 306, 54, 42, 3, 2, C.ink, 2)}
  <text x="245" y="292" font-size="8" letter-spacing="2.5" fill="${C.hi(.52)}" text-anchor="middle" font-family="serif">巴拉克城</text>
  ${wallRect(404, 306, 62, 50, C.hi, .36)}
  ${blocks(410, 312, 50, 38, 3, 2, C.ink, 2)}
  <text x="435" y="298" font-size="8" letter-spacing="2.5" fill="${C.hi(.56)}" text-anchor="middle" font-family="serif">索托城</text>
  <g>
    <rect x="676" y="132" width="46" height="44" fill="rgba(8,4,14,.55)" stroke="${C.blood(.50)}" stroke-width="1.4"/>
    <rect x="680" y="136" width="38" height="36" fill="none" stroke="${C.blood(.22)}" stroke-width=".7" stroke-dasharray="3 3"/>
    <rect x="686" y="142" width="26" height="24" fill="rgba(228,86,110,.10)" stroke="${C.blood(.42)}" stroke-width=".9"/>
    <text x="699" y="124" font-size="8" letter-spacing="2.5" fill="${C.blood(.58)}" text-anchor="middle" font-family="serif">嘉陵关</text>
  </g>
  ${P('M690 176 L640 232 L520 300 L470 306', C.gold(.20), 1.8, 1, 'stroke-dasharray="7 6"')}
  ${P('M212 354 L200 420 L210 470', C.gold(.16), 1.6, 1, 'stroke-dasharray="7 6"')}
  ${wood(100, 356, 92, 116, 22, 2.6)}
  ${contours(120, 440, 96, 62, 4, C.ink(.075), 8.1)}
  ${wood(560, 420, 110, 92, 18, 5.1)}
  <text x="380" y="336" font-size="7.5" letter-spacing="5" fill="${C.gold(.30)}" text-anchor="middle" font-family="serif">立 马 平 原</text>
  ${compass(706, 100, 34)}
  ${scaleBar(600, 508, 120, '三百里')}
  ${titleBlock(76, 78, '巴拉克王国', 'BARAK KINGDOM')}
  ${cartouche(78, 366, 176, ['西 · 巴拉克城（王都）', '中 · 索托城 · 立马平原', '东 · 嘉陵关（天灵山脉）'], '王 国 志')}
  <text x="700" y="486" font-size="7" letter-spacing="2.4" fill="${C.gold(.30)}" text-anchor="end" font-family="serif">四大王国之门户 · 王国粮仓</text>`;
})());

/* ========== 5. 星罗帝国 · 山川图 ========== */
const RGN_XINGLUO = svgWrap('xingluo', ['#1E2438', '#121626', '#06070C'], (() => {
  const mines = `<g opacity=".55">
    ${P('M158 386 l30 30 M188 386 l-30 30', C.gold(.34), 1.2)}
    ${P('M150 404 h46', C.gold(.24), 1)}
    ${P('M206 392 l24 24 M230 392 l-24 24', C.gold(.20), 1)}
  </g>`;
  return `
  ${contours(150, 200, 128, 92, 5, C.ink(.075), 1.1)}
  ${contours(300, 150, 96, 74, 4, C.ink(.06), 2.6)}
  ${contours(650, 400, 132, 96, 5, C.ink(.07), 4.1)}
  ${contours(500, 470, 96, 66, 4, C.ink(.055), 5.2)}
  ${ripples(40, 214, 340, 4, C.ice, 7)}
  <path d="M0 206 C110 194 200 226 300 212 C400 198 470 226 560 212 C650 198 730 220 800 206"
    fill="none" stroke="${C.ice(.24)}" stroke-width="1.5"/>
  ${P('M120 392 C200 356 280 344 380 330 C480 316 560 288 648 252', C.gold(.20), 2, 1, 'stroke-dasharray="9 7"')}
  ${P('M392 316 C392 368 400 424 410 470', C.gold(.14), 1.6, 1, 'stroke-dasharray="8 7"')}
  ${wallRect(360, 276, 72, 58, C.hi, .36)}
  ${blocks(366, 282, 60, 46, 3, 2, C.ink, 2)}
  <text x="396" y="268" font-size="8" letter-spacing="2.5" fill="${C.hi(.56)}" text-anchor="middle" font-family="serif">星 罗 城</text>
  ${wallRect(166, 380, 52, 42, C.hi, .32)}
  ${blocks(171, 385, 42, 32, 2, 2, C.ink, 2)}
  <text x="192" y="372" font-size="8" letter-spacing="2" fill="${C.hi(.52)}" text-anchor="middle" font-family="serif">庚辛城</text>
  ${mines}
  ${wallRect(586, 216, 54, 44, C.hi, .30)}
  ${blocks(591, 221, 44, 34, 2, 2, C.ink, 2)}
  <text x="613" y="208" font-size="8" letter-spacing="2" fill="${C.hi(.50)}" text-anchor="middle" font-family="serif">龙兴城</text>
  <text x="176" y="152" font-size="7.5" letter-spacing="4" fill="${C.ink(.30)}" text-anchor="middle" font-family="serif">北 境 山 地</text>
  <text x="654" y="470" font-size="7.5" letter-spacing="4" fill="${C.ink(.28)}" text-anchor="middle" font-family="serif">南 疆 丘 陵</text>
  ${wood(470, 400, 90, 70, 16, 3.7)}
  ${contours(300, 430, 110, 74, 4, C.ink(.06), 6.3)}
  ${contours(560, 150, 84, 58, 3, C.ink(.05), 7.7)}
  ${P('M470 340 C520 372 556 410 596 452', C.gold(.14), 1.4, 1, 'stroke-dasharray="8 7"')}
  ${compass(706, 100, 34)}
  ${scaleBar(594, 512, 122, '四百里')}
  ${titleBlock(76, 78, '星罗帝国', 'XINGLUO EMPIRE')}
  ${cartouche(560, 108, 168, ['北 · 丘陵与河谷', '中 · 星罗城（都城）', '西南 · 庚辛城（金属之都）'], '帝 国 志')}
  <text x="74" y="94" font-size="7" letter-spacing="2.4" fill="${C.ink(.26)}" font-family="serif">南方帝国 · 细腻华美</text>`;
})());

/* ========== 6. 落日森林 · 树冠俯视图 ========== */
const RGN_LUORI = svgWrap('luori', ['#152A20', '#0C1812', '#040805'], (() => {
  let trees = '';
  const ring = [[70,120,26],[150,90,20],[240,74,17],[330,64,14],[640,80,20],[710,120,24],
                [86,220,22],[168,196,18],[250,186,15],[660,206,19],[726,262,22],
                [82,360,24],[160,392,19],[240,420,16],[620,400,18],[700,430,23],
                [120,470,21],[210,486,17],[560,470,16],[640,478,20],[480,80,13],[390,70,11]];
  ring.forEach(([x,y,r])=>{ trees += canopy(x,y,r,C.jade); });
  const inner = [[300,150],[500,160],[566,300],[318,420],[300,300],[500,420],[420,110],[470,470],[210,300],[600,340],[150,300],[660,150]];
  inner.forEach(([x,y])=>{ trees += `<g opacity=".62">${canopy(x,y,12,C.jade)}</g>`; });
  return `
  ${trees}
  ${canopy(354, 236, 15, C.jade)}${canopy(452, 244, 13, C.jade)}${canopy(336, 344, 14, C.jade)}${canopy(468, 342, 12, C.jade)}
  ${P('M120 470 C200 420 260 392 340 356 C380 338 380 316 396 300', C.gold(.22), 1.8, 1, 'stroke-dasharray="6 6"')}
  ${P('M400 300 C430 246 420 200 470 152', C.gold(.12), 1.4, 1, 'stroke-dasharray="5 6"')}
  <circle cx="400" cy="290" r="66" fill="rgba(4,10,8,.42)" stroke="${C.hi(.26)}" stroke-width="1.1" stroke-dasharray="7 6"/>
  <path d="M400 290 m-46 0 a46 46 0 0 1 46 -46 a46 46 0 0 1 -46 46Z"
    fill="rgba(127,227,240,.14)" stroke="${C.ice(.48)}" stroke-width="1.3"/>
  <path d="M400 290 m46 0 a46 46 0 0 1 -46 46 a46 46 0 0 1 46 -46Z"
    fill="rgba(255,146,92,.13)" stroke="rgba(255,158,110,.48)" stroke-width="1.3"/>
  ${P('M400 290 m0 -46 a46 46 0 0 1 0 92 a46 46 0 0 1 0 -92', C.hi(.22), .8)}
  <circle cx="400" cy="290" r="6" fill="${C.hi(.78)}" filter="url(#gl-luori)"/>
  <circle cx="400" cy="290" r="14" fill="none" stroke="${C.hi(.22)}" stroke-width=".8"/>
  <text x="400" y="196" font-size="8" letter-spacing="3" fill="${C.hi(.48)}" text-anchor="middle" font-family="serif">冰 火 两 仪 眼</text>
  <text x="118" y="524" font-size="7.5" letter-spacing="3" fill="${C.jade(.30)}" font-family="serif">外 围 林 区</text>
  ${compass(706, 100, 32)}
  ${titleBlock(76, 78, '落日森林', 'SUNSET FOREST')}
  ${scaleBar(600, 512, 118, '三十里')}
  <text x="700" y="516" font-size="7" letter-spacing="2.2" fill="${C.jade(.28)}" text-anchor="end" font-family="serif">温带 · 千年至万年魂兽</text>`;
})());

/* ========== 7. 海神岛 · 航海图 ========== */
const RGN_HAISHEN = svgWrap('haishen', ['#08202E', '#041420', '#02070C'], (() => {
  const rhumb = Array.from({ length: 16 }, (_, i) => {
    const a = i / 16 * Math.PI * 2;
    return P(`M400 300L${(400 + Math.cos(a) * 560).toFixed(0)} ${(300 + Math.sin(a) * 560).toFixed(0)}`, C.ice(.11), .9);
  }).join('');
  const rhumb2 = Array.from({ length: 8 }, (_, i) => {
    const a = i / 8 * Math.PI * 2 + 0.2;
    return P(`M660 150L${(660 + Math.cos(a) * 420).toFixed(0)} ${(150 + Math.sin(a) * 420).toFixed(0)}`, C.gold(.10), .8);
  }).join('');
  const shorelines = [1.0, 0.90, 0.80].map((k, i) =>
    `<path d="${blobPath(400, 302, 192 * k, 168 * k, 1.6 + i * 0.3, 0.055)}" fill="none"
      stroke="${i === 0 ? C.jade(.40) : C.ice(.16 + i * 0.06)}" stroke-width="${i === 0 ? 1.6 : 0.8}"
      ${i ? 'stroke-dasharray="4 5"' : ''}/>`).join('');
  const pillars = Array.from({ length: 7 }, (_, i) => {
    const a = i / 7 * Math.PI * 2 - Math.PI / 2;
    const x = 400 + Math.cos(a) * 118, y = 302 + Math.sin(a) * 104;
    return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${C.hi(.72)}" filter="url(#gl-haishen)"/>
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="none" stroke="${C.hi(.22)}" stroke-width=".7"/></g>`;
  }).join('');
  return `
  ${rhumb}${rhumb2}
  <defs><clipPath id="cl-hs"><path d="${blobPath(400, 302, 200, 176, 1.4, 0.05)}"/></clipPath></defs>
  <path d="${blobPath(400, 302, 206, 182, 1.4, 0.05)}" fill="rgba(26,56,44,.62)"/>
  <g clip-path="url(#cl-hs)">
    ${contours(400, 302, 198, 174, 2, C.jade(.16), 1.9)}
    ${wood(210, 140, 380, 320, 48, 9.1)}
    ${mtn(320, 372, 82, 50, 5, C.ink)}${mtn(486, 372, 70, 42, 5, C.ink)}
    ${mtn(340, 246, 62, 38, 4, C.ink)}${mtn(470, 240, 54, 34, 4, C.ink)}
    <ellipse cx="400" cy="302" rx="72" ry="64" fill="rgba(18,42,34,.88)"/>
  </g>
  ${shorelines}
  ${contours(400, 296, 82, 74, 4, C.ink(.16), 2.2)}
  ${P('M400 232 L400 372', C.hi(.14), 1.1, 1, 'stroke-dasharray="3 5"')}
  ${P('M400 250 L400 342 M356 296 L444 296', C.hi(.20), .9)}
  ${pillars}
  ${ripples(520, 470, 210, 5, C.ice, 8)}
  ${ripples(70, 96, 190, 4, C.ice, 8)}
  <text x="400" y="94" font-size="8" letter-spacing="4" fill="${C.ice(.40)}" text-anchor="middle" font-family="serif">环 形 海</text>
  <text x="400" y="300" font-size="8" letter-spacing="2" fill="${C.hi(.60)}" text-anchor="middle" font-family="serif">海神山</text>
  <text x="676" y="498" font-size="8" letter-spacing="2.5" fill="${C.blood(.42)}" text-anchor="end" font-family="serif">魔 鲸 海 域</text>
  ${P('M0 534 C120 526 200 540 320 532 C440 524 520 538 640 530 C710 526 760 532 800 528', C.ice(.16), 1)}
  ${compass(706, 104, 40)}
  ${scaleBar(78, 508, 120, '二十里')}
  ${titleBlock(76, 78, '海神岛', 'SEA GOD ISLAND')}
  ${cartouche(74, 400, 172, ['外 · 环形海（不可渡）', '周 · 七圣柱（封号斗罗）', '心 · 海神山 · 海神九考'], '岛 志')}
  <text x="74" y="90" font-size="7" letter-spacing="2.2" fill="${C.ice(.30)}" font-family="serif">武魂殿称之为 · 魔鬼岛</text>`;
})());

/* ========== 8. 杀戮之都 · 竞技场图 ========== */
const RGN_SHALU = svgWrap('shalu', ['#2A1220', '#190A12', '#07040A'], (() => {
  const oct = (cx, cy, r) => {
    let d = '';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 - Math.PI / 2;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1);
    }
    return d + 'Z';
  };
  const seats = [0.94, 0.82, 0.70, 0.58].map((k, i) =>
    `<path d="${oct(400, 280, 152 * k)}" fill="none" stroke="${C.blood(.10 + i * 0.055)}" stroke-width=".9"/>`).join('');
  const ticks = Array.from({ length: 32 }, (_, i) => {
    const a = i / 32 * Math.PI * 2;
    return P(`M${(400 + Math.cos(a) * 150).toFixed(1)} ${(280 + Math.sin(a) * 150).toFixed(1)}L${(400 + Math.cos(a) * 158).toFixed(1)} ${(280 + Math.sin(a) * 158).toFixed(1)}`, C.blood(.28), .9);
  }).join('');
  return `
  ${P(oct(400, 280, 168), C.blood(.34), 1.6)}
  ${P(oct(400, 280, 156), C.blood(.22), .8)}
  ${seats}${ticks}
  <rect x="150" y="106" width="500" height="348" fill="none" stroke="${C.blood(.16)}" stroke-width="1.2" stroke-dasharray="18 10"/>
  <path d="${oct(400, 280, 88)}" fill="rgba(150,20,44,.14)" stroke="${C.blood(.62)}" stroke-width="1.8"/>
  ${P(oct(400, 280, 62), C.blood(.34), 1)}
  ${P('M400 206V354M326 280H474', C.blood(.36), 1.4)}
  <circle cx="400" cy="280" r="9" fill="${C.blood(.75)}" filter="url(#gl-shalu)"/>
  <circle cx="400" cy="280" r="22" fill="none" stroke="${C.blood(.24)}" stroke-width=".8"/>
  ${Array.from({ length: 8 }, (_, i) => {
    const a = i / 8 * Math.PI * 2 - Math.PI / 2 + Math.PI / 8;
    return P(`M${(400 + Math.cos(a) * 60).toFixed(1)} ${(280 + Math.sin(a) * 60).toFixed(1)}L${(400 + Math.cos(a) * 160).toFixed(1)} ${(280 + Math.sin(a) * 160).toFixed(1)}`, C.blood(.10), .8);
  }).join('')}
  ${Array.from({ length: 8 }, (_, i) => {
    const a = i / 8 * Math.PI * 2 - Math.PI / 2;
    return P(`M${(400 + Math.cos(a) * 168).toFixed(1)} ${(280 + Math.sin(a) * 168).toFixed(1)}L${(400 + Math.cos(a) * 250).toFixed(1)} ${(280 + Math.sin(a) * 250).toFixed(1)}`, C.blood(.07), .7, 1, 'stroke-dasharray="4 8"');
  }).join('')}
  ${P('M470 330 C520 366 540 400 566 436', C.blood(.30), 1.8, 1, 'stroke-dasharray="8 6"')}
  ${P('M330 330 C280 366 240 400 214 436', C.blood(.14), 1.2, 1, 'stroke-dasharray="8 6"')}
  <g>
    <rect x="120" y="446" width="30" height="22" fill="rgba(255,255,255,.04)" stroke="${C.ink(.28)}" stroke-width=".9"/>
    <rect x="154" y="452" width="24" height="18" fill="rgba(255,255,255,.035)" stroke="${C.ink(.24)}" stroke-width=".8"/>
    <text x="150" y="486" font-size="7.5" letter-spacing="2" fill="${C.ink(.36)}" text-anchor="middle" font-family="serif">入口小镇</text>
  </g>
  <text x="566" y="458" font-size="7.5" letter-spacing="2" fill="${C.blood(.44)}" text-anchor="middle" font-family="serif">地狱路</text>
  <text x="400" y="96" font-size="8" letter-spacing="4" fill="${C.blood(.44)}" text-anchor="middle" font-family="serif">独 立 空 间 · 无 光</text>
  ${compass(706, 100, 30)}
  ${titleBlock(76, 78, '杀戮之都', 'CITY OF KILLING')}
  ${[0,1,2,3].map(i=>{const a=i/4*Math.PI*2; const x=400+Math.cos(a)*88, y=280+Math.sin(a)*88;
    return `<rect x="${(x-7).toFixed(1)}" y="${(y-7).toFixed(1)}" width="14" height="14" fill="rgba(6,3,14,.9)" stroke="${C.blood(.5)}" stroke-width="1" transform="rotate(${(a*180/Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;}).join('')}
  ${cartouche(548, 100, 172, ['外 · 独立空间（无光）', '中 · 地狱杀戮场（百场）', '南 · 地狱路（通外界）'], '都 志')}
  <text x="700" y="92" font-size="7" letter-spacing="2.2" fill="${C.blood(.34)}" text-anchor="end" font-family="serif">百场胜利 · 方可入地狱路</text>`;
})());

/* ========== 9. 星斗大森林 · 热带雨林图 ========== */
const RGN_XINGDOU = svgWrap('xingdou', ['#17392C', '#0C2119', '#040B08'], (() => {
  const tree = (x, y, r, op = 1) => {
    let s = `<g opacity="${op}">`;
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="rgba(28,78,56,.52)" stroke="${C.jade(.42)}" stroke-width="1"/>`;
    s += `<circle cx="${x}" cy="${y}" r="${(r*.66).toFixed(1)}" fill="rgba(18,54,40,.35)" stroke="${C.jade(.20)}" stroke-width=".7"/>`;
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + 0.4;
      s += `<line x1="${x}" y1="${y}" x2="${(x + Math.cos(a) * r * .86).toFixed(1)}" y2="${(y + Math.sin(a) * r * .86).toFixed(1)}" stroke="${C.jade(.18)}" stroke-width=".6"/>`;
    }
    s += `<circle cx="${x}" cy="${y}" r="${(r*.18).toFixed(1)}" fill="${C.jade(.12)}"/>`;
    return s + '</g>';
  };
  const ring = [[64,110,26],[140,86,22],[220,72,18],[310,60,15],[400,54,13],[490,60,15],[580,72,18],[664,88,22],[726,116,26],
                [58,200,24],[120,168,20],[196,150,16],[700,190,21],[742,250,24],
                [54,330,26],[110,300,20],[690,318,21],[744,360,25],
                [64,440,25],[130,472,21],[210,492,18],[600,486,19],[680,470,22],[736,440,25]];
  const inner = [[190,260,16],[300,150,13],[500,140,13],[610,260,15],[620,370,14],[300,430,15],[210,370,14],[470,430,13],[380,180,11]];
  const giant = (x, y, r, label) => `
    ${contours(x, y, r*2.0, r*1.9, 3, C.jade(.12), 1.3)}
    ${tree(x, y, r)}
    <circle cx="${x}" cy="${y}" r="${(r*1.30).toFixed(1)}" fill="none" stroke="${C.hi(.24)}" stroke-width=".9" stroke-dasharray="3 5"/>
    ${P(`M${x} ${y+r*.4} v${(r*.95).toFixed(1)}`, C.ink(.34), 2.4)}`;
  return `
  ${contours(400, 300, 330, 268, 5, C.jade(.06), 1.8)}
  ${ring.map(([x,y,r]) => tree(x,y,r)).join('')}
  ${inner.map(([x,y,r]) => tree(x,y,r,.62)).join('')}
  ${P('M400 34 C382 104 432 154 402 206 C374 252 392 268 400 286', C.ice(.26), 2.4)}
  ${giant(252, 218, 38, '泰坦巨猿领地')}
  ${giant(560, 224, 36, '天青牛蟒领地')}
  ${P('M170 438 C220 400 260 372 316 344 C350 328 368 320 384 310', C.gold(.30), 1.8, 1, 'stroke-dasharray="5 6"')}
  <path d="M400 286 C438 262 482 276 498 302 C512 328 492 354 458 358 C428 362 400 350 386 332 C374 316 380 300 400 286 Z"
    fill="rgba(10,42,46,.78)" stroke="${C.ice(.55)}" stroke-width="1.4"/>
  ${ripples(398, 300, 86, 5, C.ice, 7)}
  <circle cx="400" cy="320" r="3.4" fill="${C.hi(.9)}" filter="url(#gl-xingdou)"/>
  ${P('M60 250 C150 236 230 254 300 240 C380 224 470 244 560 232 C640 222 700 236 748 226', C.ice(.14), 1.3)}
  ${P('M56 268 C140 254 220 272 296 258 C376 242 464 262 552 250 C632 240 698 254 746 244', C.ice(.09), 1)}
  ${Array.from({length:24},(_,i)=>{const x=80+(i*47)%650, y=104+((i*61)%380);return `<circle cx="${x}" cy="${y}" r="${1+(i%2)*.5}" fill="${C.hi(.45)}"/>`;}).join('')}
  ${compass(706, 100, 34)}
  ${titleBlock(76, 78, '星斗大森林', 'STAR DOU FOREST')}
  ${scaleBar(596, 510, 126, '二百里')}
  <text x="700" y="516" font-size="7" letter-spacing="2.2" fill="${C.jade(.36)}" text-anchor="end" font-family="serif">热带 · 大陆中央 · 十万年魂兽</text>`;
})());

/* ========== 索引 ========== */
const REGION_SVG = {
  wuhun: { n:'武魂城', rn:'武魂城', s:'SPIRIT CITY', d:'两大帝国交界，两国都无属权。全城以教皇山为心，十二道放射大街向外展开，三道环墙层层收束，六坊居于环间。', svg:RGN_WUHUN,
    marks:[
      {id:'wh_jh', n:'教皇殿', x:400, y:268, k:'city', d:'号称整个斗罗大陆最为宏伟的建筑，立于教皇山之巅。'},
      {id:'wh_hill', n:'教皇山', x:368, y:250, k:'region', d:'武魂城的中心山丘，教皇殿在其上俯瞰全城。'},
      {id:'wh_dl', n:'斗罗殿', x:440, y:312, k:'sect', d:'供奉历代封号斗罗牌位，武魂殿的精神核心。'},
      {id:'wh_zl', n:'长老殿', x:356, y:306, k:'sect', d:'长老议事之所，比比东与千道流曾在此对峙。'},
      {id:'wh_xy', n:'武魂殿学院', x:466, y:232, k:'sect', d:'武魂殿直属学院，精英大赛的常胜队伍。'},
      {id:'wh_dh', n:'大斗魂场', x:334, y:232, k:'sect', d:'总决赛赛场，可容数万人，非魂师不得入内。'}
    ]},
  tiandou: { n:'天斗城', rn:'天斗帝国', s:'TIANDOU CITY', d:'帝国首都，北方恢宏大气。郭城包皇城，皇城包宫城，中轴一线贯穿南北；东西两市分列，七宝琉璃宗的城堡在东南郊外。', svg:RGN_TIANDOU,
    marks:[
      {id:'td_palace', n:'皇宫', x:400, y:190, k:'city', d:'雪氏皇族的居所，天斗帝国权力的中心。'},
      {id:'td_royal', n:'天斗皇家学院', x:470, y:262, k:'sect', d:'帝国最高魂师学府，三位魂斗罗教委坐镇。'},
      {id:'td_auction', n:'天斗拍卖场', x:330, y:262, k:'sect', d:'大陆顶级拍卖场，稀有魂骨与仙草在此易手。'},
      {id:'td_lanba', n:'蓝霸学院', x:250, y:220, k:'sect', d:'天斗城内的老牌学院，柳二龙曾任教。'},
      {id:'td_douhun', n:'天斗大斗魂场', x:400, y:372, k:'sect', d:'帝国最大的斗魂场，史莱克七怪在此打出名号。'},
      {id:'td_qibao', n:'七宝琉璃宗城堡', x:640, y:420, k:'sect', d:'七宝琉璃塔一脉的宗城，大陆最富有的魂师宗门。'}
    ]},
  fasinuo: { n:'法斯诺行省', rn:'法斯诺行省', s:'FASINUO', d:'天斗帝国西南边境行省。北部是圈养魂兽的猎魂森林，南部边境线之外不到二百里就是星罗帝国。', svg:RGN_FASINUO,
    marks:[
      {id:'fs_nd', n:'诺丁城', x:303, y:300, k:'city', d:'边境小城，城墙厚实，设有武魂分殿与诺丁学院。'},
      {id:'fs_nd2', n:'诺丁学院', x:330, y:318, k:'sect', d:'唐三的启蒙学院，工读生七舍。'},
      {id:'fs_fd', n:'武魂分殿', x:276, y:288, k:'sect', d:'武魂殿在诺丁城的据点，执事素云涛、马修诺。'},
      {id:'fs_sh', n:'圣魂村', x:212, y:434, k:'village', d:'三百余户的小村，百年前出过一位魂圣。唐三出生地。'},
      {id:'fs_tj', n:'老杰克铁匠铺', x:196, y:456, k:'sect', d:'唐昊的铁匠铺，屋顶木牌画着一柄简陋的锤子。'},
      {id:'fs_lh', n:'猎魂森林', x:540, y:150, k:'forest', d:'帝国圈养魂兽之处，唐三第一魂环得于此。'}
    ]},
  balake: { n:'巴拉克王国', rn:'巴拉克王国', s:'BARAK KINGDOM', d:'天斗帝国门户，军力四大王国之首。立马平原是全境粮仓，东侧天灵山脉中的嘉陵关扼住南北通道。', svg:RGN_BALAKE,
    marks:[
      {id:'bl_city', n:'巴拉克城', x:245, y:326, k:'city', d:'王国都城，国王昆德拉居于此。'},
      {id:'bl_suotuo', n:'索托城', x:435, y:330, k:'city', d:'立马平原中央，巴拉克粮仓，设有第三级武魂主殿。'},
      {id:'bl_dh', n:'索托大斗魂场', x:462, y:352, k:'sect', d:'金斗魂级战队的诞生地。'},
      {id:'bl_slk', n:'史莱克学院', x:510, y:404, k:'sect', d:'索托城外的破烂学院，只收怪物。'},
      {id:'bl_jl', n:'嘉陵关', x:699, y:154, k:'pass', d:'天灵山脉中心，一夫当关。关后平原直捣腹地。'},
      {id:'bl_lima', n:'立马平原', x:352, y:396, k:'region', d:'王国最富饶的平原，索托城坐落其中央。'}
    ]},
  xingluo: { n:'星罗帝国', rn:'星罗帝国', s:'XINGLUO EMPIRE', d:'南方帝国，都城星罗城细腻华美。西南庚辛城是金属之都，龙兴城在两大帝国接壤处不远。', svg:RGN_XINGLUO,
    marks:[
      {id:'xl_city', n:'星罗城', x:396, y:300, k:'city', d:'帝国首都，唯一能与天斗城媲美的城市。'},
      {id:'xl_royal', n:'星罗皇家学院', x:424, y:324, k:'sect', d:'帝国最高魂师学府，戴沐白出身于此。'},
      {id:'xl_lx', n:'龙兴城', x:613, y:240, k:'city', d:'两大帝国接壤处不远，御之一族扎根于此。'},
      {id:'xl_gx', n:'庚辛城', x:192, y:400, k:'city', d:'金属之都，铁匠铺上千家，铁匠协会总会所在。'},
      {id:'xl_tj', n:'铁匠协会总会', x:168, y:428, k:'sect', d:'大陆铁匠的最高组织，神匠楼高曾在此坐镇。'}
    ]},
  xingdou: { n:'星斗大森林', rn:'星斗大森林', s:'STAR DOU FOREST', d:'大陆中央最大的魂兽森林，属热带，终年潮湿，古木遮天。核心是生命之湖，泰坦巨猿与天青牛蟒守在外围，万年以上魂兽遍地。', svg:RGN_XINGDOU,
    marks:[
      {id:'xd_camp', n:'猎魂营地', x:170, y:438, k:'village', d:'魂师进入星斗大森林前的最后一个落脚点：补给、组队、卖魂兽材料都在这里。'},
      {id:'xd_ming', n:'泰坦巨猿领地', x:252, y:218, k:'forest', d:'森林之王泰坦巨猿的领地，十万年魂兽，寻常魂师不敢越过界碑。'},
      {id:'xd_erming', n:'天青牛蟒领地', x:560, y:224, k:'forest', d:'天青牛蟒盘踞的沼泽与古木，与泰坦巨猿各守一方，井水不犯河水。'},
      {id:'xd_lake', n:'生命之湖', x:400, y:300, k:'relic', d:'星斗大森林的核心，湖水终年不冻，传说魂兽的起源就在湖底。'}
    ]},
  luori: { n:'落日森林', rn:'落日森林', s:'SUNSET FOREST', d:'天斗帝国中央的温带森林，魂兽多在千年至万年之间。冰火两仪眼藏在林心，一眼双生、两仪互克。', svg:RGN_LUORI,
    marks:[
      {id:'lr_bh', n:'冰火两仪眼', x:400, y:290, k:'relic', d:'天下三大聚宝盆之一，唐三在此完成冰火炼金身。'},
      {id:'lr_yy', n:'独孤博药园', x:440, y:322, k:'sect', d:'仙品药草遍地：幽香绮罗、八角玄冰草、相思断肠红。'},
      {id:'lr_ju', n:'独孤博山居', x:328, y:232, k:'sect', d:'毒斗罗的住处，他虽受皇室聘用却不住天斗城。'},
      {id:'lr_sw', n:'万年魂兽区', x:512, y:392, k:'forest', d:'万年以上魂兽出没，寻常魂师不敢深入。'}
    ]},
  haishen: { n:'海神岛', rn:'海神岛', s:'SEA GOD ISLAND', d:'武魂殿称之为魔鬼岛。外围是环形海与魔鲸海域，岛上七根圣柱环绕海神山，海神九考由此开启。', svg:RGN_HAISHEN,
    marks:[
      {id:'hs_shan', n:'海神山', x:400, y:308, k:'region', d:'岛上最高的山，海神传承的核心之地。'},
      {id:'hs_tai', n:'海神台', x:400, y:252, k:'sect', d:'海神九考的仪式台，九道考核由此开启。'},
      {id:'hs_zhu', n:'七圣柱', x:512, y:300, k:'sect', d:'海马、海星、海龙、海魔女等七位封号斗罗的圣柱。'},
      {id:'hs_huan', n:'环形海', x:400, y:106, k:'sea', d:'环绕海神岛的深海，普通船只无法穿越。'},
      {id:'hs_mj', n:'魔鲸海域', x:660, y:486, k:'sea', d:'深海魔鲸王的领地，最凶险的水域。'}
    ]},
  shalu: { n:'杀戮之都', rn:'杀戮之都', s:'CITY OF KILLING', d:'独立空间，入口藏在一座看起来绝不可能是杀戮之都的小镇。百场胜利方可挑战地狱路。', svg:RGN_SHALU,
    marks:[
      {id:'sl_city', n:'杀戮之都', x:400, y:184, k:'relic', d:'不见天日的城内空间，规则只有一条：活下去。'},
      {id:'sl_chang', n:'地狱杀戮场', x:400, y:280, k:'sect', d:'百场胜利方可获得挑战地狱路的资格。'},
      {id:'sl_road', n:'地狱路', x:566, y:446, k:'pass', d:'冲出地狱路即可离开，并获得杀神领域。'},
      {id:'sl_town', n:'入口小镇', x:150, y:462, k:'village', d:'酒馆地窖下就是通往杀戮之都的入口。'}
    ]}
};
