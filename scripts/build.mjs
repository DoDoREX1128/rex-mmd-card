#!/usr/bin/env node
/* build.mjs · 源模块 → 6 键导入包 + 人设 + 世界书
 * 用法: node build.mjs --src work/src --out work/out --name demo
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateWorldbook, toCharacterBook } from './lib/worldbook.mjs';
import { compileTheme } from './lib/theme.mjs';
import { LIMIT, marker, findIgnitionMarkers, F, SENTENCE_BANS } from './lib/facts.mjs';

let MODULES = [
  { name: 'rex-boot', file: 'core.js', kind: 'js' },       // 状态 / 适配 / 槽位 / 舞台
  { name: 'rex-store', file: 'store.js', kind: 'js' },
  { name: 'rex-ui', file: 'ui.js', kind: 'js' },           // UI 原子 + 图标
  { name: 'rex-view', file: 'view.js', kind: 'js' },       // 渲染 / 交互 / 存档 / boot
  { name: 'rex-content', file: 'content.json', kind: 'json' },
  { name: 'rex-css', file: 'base.css', kind: 'css' },      // token / 四区 / 组件
  { name: 'rex-skin', file: 'skin.css', kind: 'css' },     // 档案 / 舞台 / 封面 / 捏人
  { name: 'rex-sections', file: 'sections.js', kind: 'js' },
  { name: 'status', file: 'status.js', kind: 'js' },
  { name: 'rex-scene', file: 'scenes.js', kind: 'js' },
  { name: 'rex-saves', file: 'saves.js', kind: 'js' }
];
const PING = { name: 'rex-ping', file: 'ping.js' };

function arg(k, d) {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? process.argv[i + 1] : d;
}

const src = path.resolve(arg('src', 'work/src'));
const out = path.resolve(arg('out', 'work/out'));
const shortName = arg('name', 'card');
const route = arg('route', 'sandbox');
if (route === 'native') {
  const result = spawnSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), 'build-native.mjs'), ...process.argv.slice(2)], {stdio:'inherit'});
  process.exit(result.status ?? 1);
}
if (route !== 'sandbox') throw Error('build 支持 --route sandbox|native；同层卡使用 pack-samelayer.mjs');
const modulesPath = path.join(src, 'modules.json');
if (fs.existsSync(modulesPath)) {
  MODULES = JSON.parse(fs.readFileSync(modulesPath, 'utf8'));
  if (!Array.isArray(MODULES) || MODULES.some(m => !m || !['js','css','json'].includes(m.kind) || !/^[a-zA-Z0-9_.-]+$/.test(m.file) || !/^[a-zA-Z0-9_-]+$/.test(m.name))) throw Error('modules.json 条目需要安全的 name/file/kind');
}

if (!fs.existsSync(src)) { console.error('源目录不存在:', src); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

const warn = [];
const errs = [];

function readIf(f) {
  const p = path.join(src, f);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function wrap(kind, body, name) {
  const safe = String(body).replace(/<\/script>/gi, '<\\/script>');
  if (kind === 'css') return `<style data-rex="${name}">\n${safe}\n</style>`;
  if (kind === 'json') return `<script>window.__REX_CONTENT__ = ${safe};\n<\/script>`;
  return `<script>\n${safe}\n<\/script>`;
}

const rules = [];
const tags = [];
let idx = 0;

/* 单条超限时按「顶层 REX.register( 边界」安全拆分：每块补回 IIFE 头，语法必须过，否则放弃 */
function splitModule(name, src) {
  const head = src.search(/\(function\s*\(\s*\)\s*\{/);
  if (head < 0) return null;
  const open = src.indexOf('{', head);
  const inner = src.slice(open + 1);
  const m = inner.search(/\n {2}REX\.(?:register|section|scene)\(/);
  if (m < 0) return null;
  const pre = inner.slice(0, m);
  let rest = inner.slice(m);
  const tail = rest.lastIndexOf('})();');
  if (tail < 0) return null;
  rest = rest.slice(0, tail);
  const pieces = rest.split(/\n(?= {2}REX\.(?:register|section|scene)\()/);
  if (pieces.length < 2) return null;
  const chunks = [];
  for (let i = 0; i < pieces.length; i++) {
    const nm = `${name}-${i + 1}`;
    if (nm.length > LIMIT.scriptName) return null;
    const code = '(function () {' + pre + '\n' + pieces[i].replace(/\s+$/, '') + '\n})();';
    try { new Function(code); } catch (e) { return null; }   // 拆坏了就整块放弃，交给人工
    chunks.push({ name: nm, code });
  }
  return chunks;
}

for (const m of MODULES) {
  const body = readIf(m.file);
  if (body == null) { errs.push(`缺模块文件: ${m.file}`); continue; }
  const rs = wrap(m.kind, body, m.name);

  if (rs.length > LIMIT.replaceString) {
    const parts = m.kind === 'js' ? splitModule(m.name, body) : null;
    if (!parts) {
      errs.push(`${m.name} 替换内容 ${rs.length} 字，超过 ${LIMIT.replaceString}，且无法安全拆分。请把 ${m.file} 拆成两个模块文件（一文件一规则）。`);
      continue;
    }
    let okAll = true;
    for (const p of parts) {
      const prs = wrap('js', p.code, p.name);
      if (prs.length > LIMIT.replaceString) { errs.push(`${p.name} 拆分后仍 ${prs.length} 字，超过上限`); okAll = false; continue; }
      rules.push({ id: -(++idx), scriptName: p.name, findRegex: `/${marker(p.name)}/`, replaceString: prs });
      tags.push(marker(p.name));
    }
    if (okAll) warn.push(`${m.name} 超限（${rs.length} 字），已自动拆成 ${parts.length} 块`);
    continue;
  }

  rules.push({ id: -(++idx), scriptName: m.name, findRegex: `/${marker(m.name)}/`, replaceString: rs });
  tags.push(marker(m.name));
}

const pingBody = readIf(PING.file);
if (pingBody == null) errs.push('缺模块文件: ping.js');
else rules.push({ id: -(++idx), scriptName: PING.name, findRegex: `/${marker(PING.name)}/`, replaceString: wrap('js', pingBody, PING.name) });

/* 内容协议消耗：模型每轮吐的 [status] 原文必须被替换掉，否则玩家会看到 JSON。
   脚本从 message:done 的 msg.content（未经替换的原文）解析，不依赖这条规则的产物。
   这条规则不推入 tags——它不需要被注入标记命中。 */
rules.push({
  id: -(++idx),
  scriptName: 'status-hide',
  findRegex: '/\\[status\\][\\s\\S]*?\\[\\/status\\]/',
  replaceString: ''
});

for (const r of rules) {
  if (r.scriptName.length > LIMIT.scriptName) errs.push(`scriptName 超长: ${r.scriptName}`);
  if (r.findRegex.length > LIMIT.findRegex) errs.push(`findRegex 超长: ${r.scriptName}`);
}
if (rules.length > LIMIT.rules) errs.push(`规则数 ${rules.length} 超过 ${LIMIT.rules}`);

let content = {};
try {
  const raw = readIf('content.json');
  content = raw ? JSON.parse(raw.replace(/^\uFEFF/, '')) : {};
} catch (e) { errs.push('content.json 不是合法 JSON: ' + e.message); }

const opening = (content.meta && content.meta.opening) || '';
const themeName = 'rex-theme';
rules.push({id:-(++idx),scriptName:themeName,findRegex:`/${marker(themeName)}/`,replaceString:wrap('css',compileTheme(content.theme || {}),themeName)});
if (/^(卡名|角色|待填写|未命名)$/.test(String((content.meta && content.meta.title) || '').trim())) {
  (process.argv.includes('--release') ? errs : warn).push('content.meta.title 仍是占位符（' + content.meta.title + '）');
}
const beginning = tags.join('') + (opening ? '\n\n' + opening : '');
if (beginning.length > LIMIT.beginning) errs.push(`beginning ${beginning.length} 字，超过 ${LIMIT.beginning}`);
const statusbar = marker(PING.name);
if (statusbar.length > LIMIT.statusbar) errs.push('statusbar 超长');

const persona = readIf('persona.txt') || '';
if (persona.length > LIMIT.personality) errs.push(`persona 超过 ${LIMIT.personality}`);
if (/【待填写|（待填写/.test(persona)) (process.argv.includes('--release') ? errs : warn).push('人设仍有待填写占位内容');
let worldbook = null;
const wbRaw = readIf('worldbook.json');
if (wbRaw) {
  try {
    worldbook = JSON.parse(wbRaw.replace(/^\uFEFF/, ''));
    const result = validateWorldbook(worldbook);
    errs.push(...result.errors); warn.push(...result.warnings);
  } catch (e) { errs.push('worldbook.json 不是合法 JSON: ' + e.message); }
}

// Model protocol is a separate artifact, not a forced persona template.
if (content.status?.fields && !Array.isArray(content.status.fields)) errs.push('status.fields 必须是数组');
const fieldNames = new Set();
for (const f of Array.isArray(content.status?.fields) ? content.status.fields : []) {
  if (!f || typeof f.key !== 'string' || !/^[\p{L}_][\p{L}\p{N}_-]{0,63}$/u.test(f.key) || ['__proto__','constructor','prototype'].includes(f.key)) errs.push('状态字段需要安全、稳定的自定义 key');
  else if (fieldNames.has(f.key)) errs.push('状态字段 key 重复: ' + f.key);
  else fieldNames.add(f.key);
}
const usesStatus = MODULES.some(m => m.file === 'status.js') && (content.status?.fields || []).length > 0 && content.status?.authority !== 'program';
let protocol = '';
if (usesStatus) {
  const example = {turn:1};
  for (const f of content.status.fields) example[f.key] = f.type === 'bar' ? (f.max ?? 100) : f.type === 'num' ? 0 : ['tag','tags'].includes(f.type) ? [] : String(f.label || f.key);
  protocol = content.status.protocol || `每轮正文末尾输出 [status]${JSON.stringify(example)}[/status]。turn 随有效回合递增；业务字段使用当前绝对值，未变字段可省略，清空列表写 []。只能使用声明字段，数值遵守范围。需要行动选项时可附 opt 字符串数组，按钮只填草稿。收到 [resume_context] 时，以其时间点为准，旧聊天仍在但不作为当前事实。`;
  const declared = persona.includes('[status]') || Object.values(worldbook?.entries || {}).some(e => String(e.content || '').includes('[status]'));
  if (!declared) {
    worldbook = worldbook || {entries:{}};
    const uid = Math.max(-1,...Object.values(worldbook.entries).map(e=>e.uid)) + 1;
    worldbook.entries[String(uid)] = {uid,comment:'界面状态输出',content:protocol,constant:true,disable:false,key:'[]',keysecondary:'[]',probability:'100.00',order:10000,position:4,role:0,depth:4};
  }
}
if (worldbook) {
  const finalBook = validateWorldbook(worldbook);
  errs.push(...finalBook.errors);
}

/* ---- 点火重放：用平台 applyRegexList 的语义验证 ---- */
function compile(rule) {
  const raw = String(rule.findRegex ?? '').trim().replace(/^`|`$/g, '');
  const m = /^\/(.+)\/([gimsuy]*)$/.exec(raw);
  if (!m) return { kind: 'literal', needle: rule.findRegex, content: rule.replaceString ?? '' };
  let flags = m[2] || ''; if (!flags.includes('g')) flags += 'g';
  return { kind: 'regex', re: new RegExp(m[1], flags), content: rule.replaceString ?? '' };
}
function applyAll(text, list) {
  let t = text; const fired = [], missed = [];
  list.forEach((r) => {
    const c = compile(r);
    const before = t;
    if (c.kind === 'literal') t = t.replaceAll(c.needle, c.content);
    else t = t.replace(c.re, () => c.content);
    (t !== before ? fired : missed).push(r.scriptName);
  });
  return { text: t, fired, missed };
}

if (!errs.length) {
  const beg = applyAll(beginning, rules);
  const bar = applyAll(statusbar, rules);
  const strip = (t) => t.replace(/<script>[\s\S]*?<\/script>/g, '');
  const leftover = findIgnitionMarkers(strip(beg.text));
  if (leftover.length) errs.push('beginning 里有未点火的标记: ' + [...new Set(leftover)].join(','));
  if (findIgnitionMarkers(strip(bar.text)).length) errs.push('statusbar 标记未点火');
  console.log('[replay] beginning 点火 ' + beg.fired.length + '/' + rules.length + '，未命中 ' + (beg.missed.join(',') || '无'));
  console.log('[replay] 产物 ' + beg.text.length + ' 字，script 块 ' + (beg.text.match(/<script>/g) || []).length + ' 个');

  const card = { chatVersion: 1, pageDepth: 2, statusbar, beginning, personality: persona, regex_scripts: rules };

  if (errs.length) {
    console.error('\n构建失败：');
    errs.forEach((e) => console.error('  ERROR ' + e));
    process.exit(1);
  }

  const pRegex = path.join(out, `${shortName}-regex.json`);
  fs.writeFileSync(pRegex, JSON.stringify(card, null, 2), 'utf8');
  const pPersona = path.join(out, `${shortName}-persona.txt`);
  if (persona) fs.writeFileSync(pPersona, persona, 'utf8');
  if (protocol) fs.writeFileSync(path.join(out, `${shortName}-protocol.txt`), protocol, 'utf8');
  const pWb = worldbook ? path.join(out, `${shortName}-worldbook.json`) : null;
  if (pWb) fs.writeFileSync(pWb, JSON.stringify(worldbook, null, 2), 'utf8');

  /* v2 整卡 JSON：用于内嵌正则与 PNG 封装（MMD 只认 PNG 整卡，JSON 供备份与再加工） */
  const meta = content.meta || {};
  const cardV2 = {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: meta.title || shortName,
      description: meta.desc || '',
      personality: persona,
      scenario: (content.world && content.world.era) || '',
      first_mes: beginning,
      mes_example: '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      character_book: worldbook ? toCharacterBook(worldbook, meta.title || shortName) : undefined,
      tags: [],
      creator: '',
      character_version: '1.0',
      extensions: { regex_scripts: rules }
    }
  };
  const pCard = path.join(out, `${shortName}-card.json`);
  fs.writeFileSync(pCard, JSON.stringify(cardV2, null, 2), 'utf8');

  console.log('\n构建成功');
  console.log('  注入标记  ' + F.markers.ignition.open + F.markers.ignition.prefix + 'x' + F.markers.ignition.close);
  console.log('  规则      ' + rules.length + ' 条');
  console.log('  总替换量  ' + rules.reduce((a, r) => a + r.replaceString.length, 0) + ' 字');
  console.log('  beginning ' + beginning.length + ' 字 / persona ' + persona.length + ' 字');
  console.log('  ' + pRegex);
  if (persona) console.log('  ' + pPersona);
  if (pWb) console.log('  ' + pWb);
  console.log('  ' + pCard + '（v2 整卡，供 card-png.mjs 封成 PNG）');
  if (warn.length) { console.log('\n告警：'); warn.forEach((w) => console.log('  WARN ' + w)); }
} else {
  console.error('构建失败：');
  errs.forEach((e) => console.error('  ERROR ' + e));
  process.exit(1);
}
