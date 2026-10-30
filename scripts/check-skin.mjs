#!/usr/bin/env node
/* check-skin.mjs · 视觉相似度提示（不证明原创或授权）
 * 用法: node check-skin.mjs --tokens assets/skin/tokens.json
 * 退出码: 0 通过（可能有 warn）；1 有 error；2 用法错误
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const tokensPath = opt('tokens');
const exPath = opt('examples', path.join(here, '..', 'assets', 'skin', 'example-palettes.json'));
if (!tokensPath) { console.error('用法: node check-skin.mjs --tokens tokens.json [--examples palettes.json]'); process.exit(2); }

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const tokens = read(tokensPath);
const examples = read(exPath);

const E = [], W = [];
const err = (m) => E.push(m);
const warn = (m) => W.push(m);

const hex = (s) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(s || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const norm = (s) => String(s || '').toLowerCase().replace(/[\s"'_-]/g, '');

/* 必填 */
const colors = tokens.colors || {};
['bg', 'surface', 'text', 'accent'].forEach((k) => { if (!colors[k]) err(`colors.${k} 缺失`); });
if (!tokens.fonts || !tokens.fonts.display || !tokens.fonts.body) err('fonts.display / fonts.body 缺失');
if (!tokens.texture) err('texture 缺失（paper/glass/metal/noise/none）');

/* hex 合法 */
const parsed = {};
for (const [k, v] of Object.entries(colors)) {
  const c = hex(v);
  if (!c) err(`colors.${k} 不是合法 hex: ${v}`);
  else parsed[k] = c;
}

/* 与示例配色比较 */
const exColors = [];
for (const [key, ex] of Object.entries(examples)) {
  for (const h of ex.colors || []) {
    const c = hex(h);
    if (c) exColors.push({ key, name: ex.name, hex: h, rgb: c });
  }
}

for (const [k, c] of Object.entries(parsed)) {
  const exactHit = exColors.find((e) => e.hex.toLowerCase() === String(colors[k]).toLowerCase());
  if (exactHit) { warn(`colors.${k} 与示例 ${exactHit.name} 的 ${exactHit.hex} 完全相同`); continue; }
  // 深色底/面天然接近，不参与"雷同"判定
  if (lum(c) < 0.12) continue;
  const near = exColors
    .map((e) => ({ ...e, d: dist(c, e.rgb) }))
    .filter((e) => e.d < 30)
    .sort((a, b) => a.d - b.d);
  if (near.length) {
    const top = near[0];
    warn(`colors.${k} ${colors[k]} 与示例 ${top.name} 的 ${top.hex} 距离 ${top.d.toFixed(1)}（<30 视为接近）`);
  }
}

/* 统计高亮色的接近数量：>=2 判雷同 */
const brightClose = Object.entries(parsed).filter(([, c]) => lum(c) >= 0.12).filter(([k, c]) =>
  exColors.some((e) => dist(c, e.rgb) < 30 && e.hex.toLowerCase() !== String(colors[k]).toLowerCase())
);
if (brightClose.length >= 2) warn(`有 ${brightClose.length} 个主色与示例过近（${brightClose.map(([k]) => k).join(',')}），换一套配色`);

/* 字体 */
if (tokens.fonts) {
  const mine = norm(tokens.fonts.display) + ' ' + norm(tokens.fonts.body) + ' ' + norm(tokens.fonts.num || '');
  for (const [key, ex] of Object.entries(examples)) {
    for (const f of ex.fonts || []) {
      if (mine.includes(norm(f))) warn(`字体直接用了示例 ${ex.name} 的 ${f}`);
    }
  }
}

/* 质感 */
if (tokens.texture) {
  for (const [key, ex] of Object.entries(examples)) {
    if (tokens.texture === ex.texture && brightClose.length >= 1) {
      warn(`质感 ${tokens.texture} 与示例 ${ex.name} 相同，且配色也接近，建议换质感或换色`);
    }
  }
}

/* 半径/动效（提示级） */
if (tokens.radius == null) warn('radius 未填（默认按 8 处理）');
if (!tokens.motion) warn('motion 未填（subtle/normal/none）');

console.log('='.repeat(56));
console.log(tokensPath);
console.log(`颜色 ${Object.keys(colors).length} 个 · 字体 ${tokens.fonts ? Object.keys(tokens.fonts).length : 0} 个 · 质感 ${tokens.texture || '-'}`);
E.forEach((m) => console.log('  ERROR ' + m));
W.forEach((m) => console.log('  WARN  ' + m));
if (E.length) { console.log('\n结论: 检测到相似度信号，需按用户参考意图人工判断；不作为原创性结论'); process.exit(1); }
console.log('\n结论: 未触发当前相似度阈值，不证明原创或授权');
