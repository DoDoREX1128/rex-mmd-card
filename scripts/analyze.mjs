#!/usr/bin/env node
/* analyze.mjs · 拆解任意一张导出的角色卡 JSON
 * 用法: node analyze.mjs card.json [--out work/analysis]
 * 产出: analysis.md / analysis.json / chunks/*.js
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const file = args[0];
if (!file) { console.error('用法: node analyze.mjs <card.json> [--out dir]'); process.exit(2); }
const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const outDir = path.resolve(opt('out', 'work/analysis'));

const card = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const rules = Array.isArray(card.regex_scripts) ? card.regex_scripts : [];
const blob = rules.map((r) => r.replaceString || '').join('\n');

/* ---------- 分类 ---------- */
const kindOf = (s) => {
  if (/data:image\//.test(s)) return 'IMG';
  if (/<style/i.test(s)) return 'CSS';
  if (/<script/i.test(s)) return 'JS';
  if (/<[a-z][\s\S]*>/i.test(s)) return 'HTML';
  return 'TEXT';
};
const rows = rules.map((r, i) => ({
  i, id: r.id, name: r.scriptName || '', find: String(r.findRegex || '').slice(0, 48),
  len: String(r.replaceString || '').length, kind: kindOf(String(r.replaceString || ''))
}));

/* ---------- 分片链识别 ---------- */
const ACC = /s\.([A-Za-z_$][\w$]*)\s*=\s*\(\s*s\.\1\s*\?\?\s*(['"])\2\s*\)\s*\+\s*(['"])/;
const isChunk = rows.filter((r) => ACC.test(String(rules[r.i].replaceString || '')));
const parts = new Map(); // name -> [strings]

function unescapeJs(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== '\\') { out += ch; continue; }
    const n = s[++i];
    switch (n) {
      case 'n': out += '\n'; break;
      case 'r': out += '\r'; break;
      case 't': out += '\t'; break;
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case 'v': out += '\v'; break;
      case '0': out += '\0'; break;
      case 'x': out += String.fromCharCode(parseInt(s.slice(i + 1, i + 3), 16) || 0); i += 2; break;
      case 'u': out += String.fromCharCode(parseInt(s.slice(i + 1, i + 5), 16) || 0); i += 4; break;
      case '\n': break;
      case undefined: break;
      default: out += n;
    }
  }
  return out;
}

for (const r of isChunk) {
  const s = String(rules[r.i].replaceString || '');
  const m = ACC.exec(s);
  if (!m) continue;
  const which = m[1];
  const start = s.indexOf(m[0]) + m[0].length;
  const end = s.indexOf('";})()</script>', start) >= 0
    ? s.indexOf('";})()</script>', start)
    : s.lastIndexOf('";');
  if (end < 0) continue;
  const lit = s.slice(start, end);
  if (!parts.has(which)) parts.set(which, []);
  parts.get(which).push(unescapeJs(lit));
}

/* ---------- 标记链 ---------- */
const allText = [card.statusbar, card.beginning, ...rules.map((r) => r.findRegex), ...rules.map((r) => r.replaceString)].join('\n');
const markers = [...new Set((allText.match(/【([^】]{0,30}?)(\d{2,4})】/g) || []))];
const markerNums = markers.map((m) => Number((m.match(/(\d{2,4})】/) || [])[1])).filter(Boolean).sort((a, b) => a - b);
const markerPrefix = (markers[0] || '').replace(/\d{2,4}】$/, '');
const contiguous = markerNums.length > 1 && markerNums[0] === 1 && markerNums.every((n, i) => n === i + 1);

/* ---------- 原生动作命中 ---------- */
const ACTIONS = ['openEditMessage', 'setEditText', 'submitEditMessage', 'deleteMessage', 'rollbackMessage',
  'startNewStoryFromMessage', 'openConversationPanel', 'selectConversation', 'renameConversation', 'deleteConversation',
  'createConversation', 'refreshConversation', 'openPersona', 'setPersonaName', 'setPersonaGender', 'setPersonaIdentity',
  'submitPersona', 'openSupplement', 'setSupplementText', 'submitSupplement', 'openPromptSelector', 'applyInstruction',
  'openMoreMenu', 'activateMoreMenuItem', 'openChatSettings', 'submitChatSettings', 'openSharePanel', 'toggleFavorite',
  'openComments', 'exit'];
const actionHits = ACTIONS
  .map((a) => [a, (blob.match(new RegExp('\\b' + a + '\\s*\\(', 'g')) || []).length])
  .filter(([, n]) => n > 0);

/* ---------- 协议嗅探 ---------- */
const protocols = [
  ['<zml-status> JSON', blob.includes('<zml-status>')],
  ['[状态] 文本块', blob.includes('[状态]')],
  ['<状态> 标签', /<状态[\s>]/.test(blob)],
  ['JSON.parse 解析', blob.includes('JSON.parse')],
  ['状态栏文字', blob.includes('状态栏')],
  ['本地存档 localStorage', blob.includes('localStorage')]
].filter(([, v]) => v).map(([k]) => k);

/* ---------- 架构判定 ---------- */
let arch = '单体';
let archNote = '';
if (isChunk.length >= 2) {
  arch = '分片链（HUD 接管型）';
  archNote = `累计器 ${[...parts.keys()].join(' / ')}，共 ${isChunk.length} 条分片`;
} else if (rules.length >= 5 && /^<[a-z0-9-]+>$/.test(String(card.statusbar || '').trim())) {
  arch = '标签模块（原生增强型）';
  archNote = 'statusbar 是单标签，beginning 可能是标签链';
}
const tagChain = [...new Set((String(card.beginning || '').match(/<[a-z][a-z0-9-]{2,}>/g) || []))];

/* ---------- 输出 ---------- */
fs.mkdirSync(outDir, { recursive: true });
if (parts.size) {
  fs.mkdirSync(path.join(outDir, 'chunks'), { recursive: true });
  for (const [k, arr] of parts) fs.writeFileSync(path.join(outDir, 'chunks', `${k}.js`), arr.join(''), 'utf8');
}

const stat = {
  file: path.resolve(file), chatVersion: card.chatVersion, rules: rules.length,
  totalChars: rules.reduce((n, r) => n + String(r.replaceString || '').length, 0),
  maxReplace: Math.max(0, ...rules.map((r) => String(r.replaceString || '').length)),
  statusbar: card.statusbar, beginningLen: String(card.beginning || '').length,
  arch, archNote, markerPrefix, markers: markers.length, markerContiguous: contiguous,
  decoded: Object.fromEntries([...parts].map(([k, v]) => [k, v.join('').length])),
  actions: actionHits, protocols, tagChain: tagChain.slice(0, 80)
};

const md = [];
md.push(`# 卡结构分析 · ${path.basename(file)}`, '');
md.push('| 项 | 值 |', '|---|---|');
md.push(`| chatVersion | ${card.chatVersion} |`);
md.push(`| 规则数 | ${stat.rules} |`);
md.push(`| 总替换字数 | ${stat.totalChars.toLocaleString()} |`);
md.push(`| 单条最大 | ${stat.maxReplace.toLocaleString()} |`);
md.push(`| statusbar | \`${stat.statusbar}\` |`);
md.push(`| beginning | ${stat.beginningLen} 字 |`);
md.push(`| 架构 | **${arch}** |`);
if (archNote) md.push(`| 说明 | ${archNote} |`);
if (stat.markers) md.push(`| 标记链 | ${stat.markers} 个，连续：${contiguous ? '是' : '否'} |`);
md.push('');
if (parts.size) {
  md.push('## 还原的载荷', '', '| 段 | 解码字数 |', '|---|---|');
  for (const [k, v] of parts) md.push(`| ${k} | ${v.join('').length.toLocaleString()} |`);
  md.push('', `已写出：\`chunks/${[...parts.keys()].map((k) => k + '.js').join('`, `chunks/')}\``, '');
}
if (stat.protocols.length) md.push('## 协议嗅探', '', stat.protocols.map((p) => `- ${p}`).join('\n'), '');
if (actionHits.length) md.push('## 原生动作命中', '', '| 动作 | 次数 |', '|---|---|', ...actionHits.map(([a, n]) => `| ${a} | ${n} |`), '');
if (tagChain.length) md.push('## beginning 标签链（前 80）', '', '```', tagChain.join(''), '```', '');

md.push('## 规则表（前 40 条）', '', '| # | id | 名称 | findRegex | 长度 | 类型 |', '|---|---|---|---|---|---|');
for (const r of rows.slice(0, 40)) md.push(`| ${r.i} | ${r.id} | ${r.name} | \`${r.find}\` | ${r.len} | ${r.kind} |`);
if (rows.length > 40) md.push(`| … | | 其余 ${rows.length - 40} 条见 analysis.json | | | |`);
md.push('');

fs.writeFileSync(path.join(outDir, 'analysis.md'), md.join('\n'), 'utf8');
fs.writeFileSync(path.join(outDir, 'analysis.json'), JSON.stringify({ stat, rows }, null, 2), 'utf8');

console.log('架构      ', arch, archNote);
console.log('规则数    ', stat.rules, '| 总字数', stat.totalChars.toLocaleString(), '| 单条最大', stat.maxReplace.toLocaleString());
console.log('标记链    ', stat.markers, contiguous ? '(连续)' : '(不连续/无)');
if (parts.size) console.log('载荷还原  ', [...parts].map(([k, v]) => `${k}=${v.join('').length}`).join(' '));
console.log('原生动作  ', actionHits.length ? actionHits.map(([a, n]) => `${a}×${n}`).join(' ') : '无');
console.log('协议      ', protocols.length ? protocols.join(' / ') : '未识别');
console.log('报告      ', path.join(outDir, 'analysis.md'));
