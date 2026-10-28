#!/usr/bin/env node
/* build.mjs · 源模块 → 6 键导入包 + 人设 + 世界书
 * 用法: node build.mjs --src work/src --out work/out --name demo
 */
import fs from 'node:fs';
import path from 'node:path';
import { LIMIT, marker, findIgnitionMarkers, F } from './lib/facts.mjs';

const MODULES = [
  { name: 'rex-boot', file: 'core.js', kind: 'js' },       // 状态 / 适配 / 槽位 / 舞台
  { name: 'rex-ui', file: 'ui.js', kind: 'js' },           // UI 原子 + 图标
  { name: 'rex-view', file: 'view.js', kind: 'js' },       // 渲染 / 交互 / 存档 / boot
  { name: 'rex-content', file: 'content.json', kind: 'json' },
  { name: 'rex-css', file: 'base.css', kind: 'css' },      // token / 四区 / 组件
  { name: 'rex-skin', file: 'skin.css', kind: 'css' },     // 档案 / 舞台 / 封面 / 捏人
  { name: 'rex-sections', file: 'sections.js', kind: 'js' },
  { name: 'rex-figdata', file: 'figdata.js', kind: 'js' },
  { name: 'rex-figure', file: 'figure.js', kind: 'js' },
  { name: 'rex-dossier', file: 'dossier.js', kind: 'js' },
  { name: 'rex-status', file: 'status.js', kind: 'js' },
  { name: 'rex-scene', file: 'scenes.js', kind: 'js' }
];
const PING = { name: 'rex-ping', file: 'ping.js' };

function arg(k, d) {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? process.argv[i + 1] : d;
}

const src = path.resolve(arg('src', 'work/src'));
const out = path.resolve(arg('out', 'work/out'));
const shortName = arg('name', 'card');

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
if (/^(卡名|角色|待填写|未命名)$/.test(String((content.meta && content.meta.title) || '').trim())) {
  warn.push('content.meta.title 仍是占位符（' + content.meta.title + '），交付前必须改成真实角色名');
}
const beginning = tags.join('') + (opening ? '\n\n' + opening : '');
if (beginning.length > LIMIT.beginning) errs.push(`beginning ${beginning.length} 字，超过 ${LIMIT.beginning}`);
const statusbar = marker(PING.name);
if (statusbar.length > LIMIT.statusbar) errs.push('statusbar 超长');

let persona = readIf('persona.txt');
if (persona == null) {
  persona = `<世界观>\n${(content.world && content.world.era) || ''}\n</世界观>\n\n<角色设定 名字：${(content.meta && content.meta.title) || '角色'}>\n<基本信息>\n- 待填写\n</基本信息>\n</角色设定>`;
  warn.push('未找到 persona.txt，使用占位人设（必须在交付前替换）');
}
if (persona.length > LIMIT.personality) errs.push(`persona ${persona.length} 字，超过 ${LIMIT.personality}`);
if (/<script|<style|sdk\./.test(persona)) errs.push('persona 里出现了 HTML / 脚本 / sdk 调用');

let worldbook = null;
const wbRaw = readIf('worldbook.json');
if (wbRaw) {
  try {
    worldbook = JSON.parse(wbRaw.replace(/^\uFEFF/, ''));
    if (Array.isArray(worldbook.entries)) errs.push('worldbook.entries 必须是对象，不是数组');
    else if (!worldbook.entries) errs.push('worldbook 缺 entries');
    else {
      const uids = new Set();
      for (const [k, e] of Object.entries(worldbook.entries)) {
        if (typeof e.key === 'string') { try { JSON.parse(e.key); } catch { errs.push(`entries[${k}].key 不是合法 JSON 字符串`); } }
        else errs.push(`entries[${k}].key 必须是字符串`);
        if (e.uid != null) { if (uids.has(e.uid)) errs.push(`uid 重复: ${e.uid}`); uids.add(e.uid); }
        if ((e.content || '').length > LIMIT.worldbookEntryContent) errs.push(`entries[${k}] content 超过 ${LIMIT.worldbookEntryContent} 字`);
        if ((e.comment || '').length > LIMIT.worldbookComment) warn.push(`条目标题超过 ${LIMIT.worldbookComment} 字（会被平台截断）: ${e.comment}`);
      }
    }
  } catch (e) { errs.push('worldbook.json 不是合法 JSON: ' + e.message); }
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
  fs.writeFileSync(pPersona, persona, 'utf8');
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
      first_mes: opening,
      mes_example: '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      character_book: worldbook || undefined,
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
  console.log('  ' + pPersona);
  if (pWb) console.log('  ' + pWb);
  console.log('  ' + pCard + '（v2 整卡，供 card-png.mjs 封成 PNG）');
  if (warn.length) { console.log('\n告警：'); warn.forEach((w) => console.log('  WARN ' + w)); }
} else {
  console.error('构建失败：');
  errs.forEach((e) => console.error('  ERROR ' + e));
  process.exit(1);
}
