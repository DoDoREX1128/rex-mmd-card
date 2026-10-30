#!/usr/bin/env node
/* pack-samelayer.mjs · 把 Host / Frame 两段源码打包成旧版同层卡的「分片链」
 * 用法:
 *   node pack-samelayer.mjs --host work/src/host.js --frame work/src/frame.js \
 *        --out work/out --name my-card [--theme mytheme] [--opening 开场.txt] \
 *        [--persona 人设.txt] [--worldbook 世界书.json] [--limit 19000]
 * 产出:
 *   <out>/<name>-regex.json     旧版四键，不带 chatVersion
 *   <out>/<name>-manifest.json  规则数 / 最大条 / 分片 / sha
 *   <out>/<name>-persona.txt    可选
 *   <out>/<name>-worldbook.json 可选
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const hostPath = opt('host'); const framePath = opt('frame');
if (!hostPath || !framePath) { console.error('用法: node pack-samelayer.mjs --host host.js --frame frame.js --out dir --name slug'); process.exit(2); }
const outDir = path.resolve(opt('out', 'work/out'));
const name = opt('name', 'card');
const theme = opt('theme', name);
const LIMIT = Number(opt('limit', 19000));
if (!Number.isInteger(LIMIT) || LIMIT < 32 || LIMIT > 19000) throw Error('limit 必须是 32–19000 的整数');
const MAX_RULE = 20000;

const STATE = 'REXHUDSTATE';
const CONFIG = 'REXHUDCONFIG';
const MARK = 'REXHUD';

/* 单字符转义后的长度：与 escapeJs 一一对应 */
const cost = (ch) => ch === '\\' || ch === '"' || ch === '\n' || ch === '\r' || ch === '\t' ? 2
  : ch === '<' ? 6 : ch === '$' ? 4 : ch === '\u2028' || ch === '\u2029' ? 6 : ch.length;

const escapeJs = (s) => s
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/\n/g, '\\n')
  .replace(/\r/g, '\\r')
  .replace(/\t/g, '\\t')
  .replace(/</g, '\\u003c')
  .replace(/\$/g, '\\x24')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

/* 在「原串」上按转义后的预算切片：天然不会切进转义序列 */
function sliceByEscapedBudget(src, limit) {
  const out = []; let cur = ''; let n = 0;
  for (const ch of src) {
    const c = cost(ch);
    if (n + c > limit && cur) { out.push(cur); cur = ''; n = 0; }
    cur += ch; n += c;
  }
  if (cur) out.push(cur);
  return out;
}

const read = (p) => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
const host = read(hostPath); const frame = read(framePath);
if (!host.trim() || !frame.trim()) { console.error('host / frame 不能为空'); process.exit(1); }

const hChunks = sliceByEscapedBudget(host, LIMIT);
const fChunks = sliceByEscapedBudget(frame, LIMIT);
const ignite = opt('ignite', 'independent');
if (!['independent', 'chain'].includes(ignite)) throw Error('ignite 必须是 independent 或 chain'); // independent | chain
const marker = (n) => `【${MARK} ${String(n).padStart(3, '0')}】`;
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const wrap = (body) => `<script>(()=>{const s=globalThis.${STATE};${body}})()</script>`;
const acc = (which, lit) => `s.${which}=(s.${which}??'')+"${lit}";`;

/* 先把「每条规则要执行的代码」按顺序排好，再决定用哪种点火拓扑 */
const codes = [];
codes.push(`<script>(()=>{const s=globalThis.${STATE}=Object.create(null);${acc('h', escapeJs(hChunks[0]))}})()</script>`);
for (let i = 1; i < hChunks.length; i++) codes.push(wrap(acc('h', escapeJs(hChunks[i]))));
for (let i = 0; i < fChunks.length; i++) codes.push(wrap(acc('f', escapeJs(fChunks[i]))));

const launcher = `<script>(()=>{const s=globalThis.${STATE};if(!s||!s.h||!s.f)throw new Error('REX HUD 载荷不完整');globalThis.${CONFIG}={theme:${JSON.stringify(theme)},frameScriptSource:s.f||''};const e=document.createElement('script');e.dataset.rexHud=${JSON.stringify(name)};e.textContent=s.h;(document.head||document.documentElement).appendChild(e);})()</script>`;
codes.push(launcher);

const rules = codes.map((code, i) => {
  const isLast = i === codes.length - 1;
  const tail = ignite === 'chain' && !isLast ? marker(i + 2) : '';
  return {
    id: -1,
    scriptName: i === 0 ? 'hud-init'
      : i === codes.length - 1 ? 'hud-launch'
        : (i <= hChunks.length - 1 ? `hud-host-${String(i + 1).padStart(2, '0')}` : `hud-frame-${String(i - hChunks.length + 1).padStart(2, '0')}`),
    findRegex: `/${escRe(marker(i + 1))}/g`,
    replaceString: code + tail
  };
});

const openingPath = opt('opening');
const opening = openingPath ? read(openingPath) : '页面已准备，可通过返回 MMD 入口使用原生聊天。';
const allMarkers = rules.map((_, i) => marker(i + 1)).join('');
const beginning = ignite === 'independent' ? opening + allMarkers : opening;
const statusbar = ignite === 'independent' ? 'Rex HUD' : marker(1);

const card = {
  pageDepth: 2,
  statusbar,
  beginning,
  regex_scripts: rules
};

/* 断言 */
const errors = [];
const maxR = Math.max(...rules.map((r) => r.replaceString.length));
if (maxR > MAX_RULE) errors.push(`单条 ${maxR} 字超过 ${MAX_RULE}`);
if (rules.length > 130) errors.push(`规则 ${rules.length} 条超过 130`);
if (card.statusbar.length > 200) errors.push('statusbar 超过 200 字');
if (beginning.length > 4000) errors.push('beginning 超过 4000 字');
if (errors.length) { console.error('打包失败：\n- ' + errors.join('\n- ')); process.exit(1); }

fs.mkdirSync(outDir, { recursive: true });
const jsonPath = path.join(outDir, `${name}-regex.json`);
fs.writeFileSync(jsonPath, JSON.stringify(card, null, 2), 'utf8');

const written = { [`${name}-regex.json`]: jsonPath };
const personaPath = opt('persona');
if (personaPath) { const p = path.join(outDir, `${name}-persona.txt`); fs.copyFileSync(personaPath, p); written[`${name}-persona.txt`] = p; }
const wbPath = opt('worldbook');
if (wbPath) { const p = path.join(outDir, `${name}-worldbook.json`); fs.copyFileSync(wbPath, p); written[`${name}-worldbook.json`] = p; }

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest = {
  format: 'rex-samelayer-release', platform: 'mmd', chatVersion: 0, name, theme, ignite,
  stateKey: STATE, markerPrefix: MARK,
  rules: rules.length, chunks: { host: hChunks.length, frame: fChunks.length },
  maxReplacementUtf16: maxR,
  payload: { host: host.length, frame: frame.length },
  files: Object.fromEntries(Object.entries(written).map(([k, p]) => [k, sha(p)])),
  evidence: { static: 'PASS', localBrowser: 'NOT RUN', realMmd: 'NOT RUN', physicalMobile: 'NOT RUN' }
};
fs.writeFileSync(path.join(outDir, `${name}-manifest.json`), JSON.stringify(manifest, null, 2), 'utf8');

console.log('规则数    ', rules.length, `(h ${hChunks.length} + f ${fChunks.length} + init + launch)`);
console.log('最大条    ', maxR, '字');
console.log('载荷      ', `host ${host.length} / frame ${frame.length} 字`);
console.log('statusbar ', card.statusbar);
console.log('输出      ', jsonPath);
