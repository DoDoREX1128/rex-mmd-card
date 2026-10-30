#!/usr/bin/env node
/* build.mjs · 源模块 → 6 键导入包 + 人设 + 世界书
 * 用法: node build.mjs --src work/src --out work/out --name demo
 */
import fs from 'node:fs';
import path from 'node:path';
import { LIMIT, marker, findIgnitionMarkers, F, SENTENCE_BANS } from './lib/facts.mjs';

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
  { name: 'status', file: 'status.js', kind: 'js' },
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
if (/^(卡名|角色|待填写|未命名)$/.test(String((content.meta && content.meta.title) || '').trim())) {
  warn.push('content.meta.title 仍是占位符（' + content.meta.title + '），交付前必须改成真实角色名');
}
const beginning = tags.join('') + (opening ? '\n\n' + opening : '');
if (beginning.length > LIMIT.beginning) errs.push(`beginning ${beginning.length} 字，超过 ${LIMIT.beginning}`);
const statusbar = marker(PING.name);
if (statusbar.length > LIMIT.statusbar) errs.push('statusbar 超长');

let persona = readIf('persona.txt');
if (persona == null) {
  const nm = (content.meta && content.meta.title) || '角色';
  persona = [
    '<前提：AI担任说书人，负责推演世界、扮演所有NPC、判定事件结果；{{user}}扮演这个世界芸芸众生中的一员，所有行动与对话由玩家决定>',
    '',
    '<主题>',
    '[核心玩法]【待填写：玩法类型与核心循环，不写具体地点】',
    '[世界观]定性：【待填写】。秩序：【待填写】。稀缺：【待填写】。代价：【待填写】。',
    '[视角]第三人称限知，跟着{{user}}的所见。不写{{user}}的内心判断。',
    '[风格]',
    '-基调：【待填写】',
    '-节奏：短句为主；紧张处一句一段，平缓处可到三行',
    '-禁止：空转模糊词、八股微表情、语气声线描写、极端情绪词、替{{user}}发言',
    '</主题>',
    '',
    '<主要角色>',
    `-<主角：${nm}>`,
    '[基础信息]【待填写：性别、年龄】',
    '[身份]【待填写：职业、社会位置】',
    '[性格]【待填写：写行为，不写形容词】',
    '[长线记忆]',
    '-【待填写：不随剧情改变、必须一直记得的事实】',
    '-</主角>',
    '</主要角色>',
    '',
    '<约束规则>',
    '[对话禁忌]禁止跳出角色说话、禁止自称AI、禁止向玩家解释设定',
    '[句式禁忌]',
    '-禁止「不是…是…」这类先否定再肯定的句式（含「不是…而是…」「与其说…不如说…」）',
    '-禁止「A等于B」「A就是B」式生硬比喻',
    '-禁止术语腔与抽象词堆叠：外显、建制、成正比、位移、闭环、赋能、维度、底层逻辑',
    '-禁止同一句信息在两处原样重复；同一段里意思重复的句子只留一句',
    '-禁止三段式排比（先…再…最后）、对偶金句（X很A，Y很B）、因果解释（因为…所以…）、升华收尾',
    '[视角]【待填写：人称与聚焦；明确写出不写什么】',
    '[风格校准]',
    '-基调：【待填写：类型＋情绪底色】',
    '-对话：占比【待填写】。台词推进关系，不解释设定；单句不超过三行',
    '-描写侧重：动作与环境细节为主，心理只写身体反应',
    '</约束规则>',
    '',
    '<开局场景>',
    '[场景描述]【待填写：时间、地点、空间细节，写到能听见看见】',
    '[开局状态]',
    '-【待填写：玩家在哪、身体状态、正在发生什么】',
    '[随身物品]【待填写；确实没有就写「无」并说明为什么】',
    '</开局场景>'
  ].join('\n');
  warn.push('未找到 persona.txt，使用占位人设（必须在交付前替换）');
}
if (persona.length > LIMIT.personality) errs.push(`persona ${persona.length} 字，超过 ${LIMIT.personality}`);
if (/<script|<style|sdk\./.test(persona)) errs.push('persona 里出现了 HTML / 脚本 / sdk 调用');
if (!/\[句式禁忌\]/.test(persona)) {
  warn.push('persona 的 <约束规则> 缺 [句式禁忌]：应把四项禁令（先否定再肯定 / 生硬比喻 / 术语腔 / 同段重复）逐条写进去');
} else {
  const bans = SENTENCE_BANS.items || [];
  const missing = bans.filter((b) => {
    if (b.id === 'neg-first') return !/不是[^，。；！？\n]{0,14}?[，,]?(?:而是|是)/.test(persona) && !/先否定再肯定|不是…是…/.test(persona);
    if (b.id === 'flat-metaphor') return !/等于|就是/.test(persona);
    if (b.id === 'jargon') return !/外显|建制|成正比|位移|闭环|赋能|维度|底层逻辑/.test(persona);
    if (b.id === 'repeat') return !/重复/.test(persona);
    return false;
  });
  if (missing.length) warn.push('persona 的 [句式禁忌] 缺条目: ' + missing.map((b) => b.label).join('、'));
}

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
