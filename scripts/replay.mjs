#!/usr/bin/env node
/* replay.mjs · 用平台真实的替换算法重放一张卡的规则链
 * 用法:
 *   node replay.mjs card.json                 # 自动从 statusbar / beginning 选起点
 *   node replay.mjs card.json --from beginning
 *   node replay.mjs card.json --out work/replay.txt
 * 退出码: 0 无残留且关键规则全点火；1 有残留/未点火；2 用法错误
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const file = args[0];
if (!file) { console.error('用法: node replay.mjs <card.json> [--from auto|statusbar|beginning] [--out file]'); process.exit(2); }
const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };

const card = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const rules = Array.isArray(card.regex_scripts) ? card.regex_scripts : [];

/* 平台语义：见 references/01-平台事实.md §1 */
function compile(rule) {
  const raw = String(rule.findRegex ?? '').trim().replace(/^`|`$/g, '');
  if (!raw) return null;
  const m = /^\/(.+)\/([gimsuy]*)$/.exec(raw);
  if (!m) return { kind: 'literal', needle: rule.findRegex, content: rule.replaceString ?? '' };
  let flags = m[2] || '';
  if (!flags.includes('g')) flags += 'g';
  try { return { kind: 'regex', re: new RegExp(m[1], flags), content: rule.replaceString ?? '' }; }
  catch { return { kind: 'broken', content: rule.replaceString ?? '' }; } // 平台会静默丢弃整条
}

function expand(content, groups) {
  let out = String(content);
  if (groups) out = out.replace(/\$(\d+)/g, (d, n) => (groups[Number(n)] !== undefined ? groups[Number(n)] : d));
  out = out.replace(/\$&/g, groups ? groups[0] : '$&');
  // {{random:甲::乙::丙}} —— 平台随机取一个；重放取第一个，保证可复现
  out = out.replace(/\{\{random:([^}]+)\}\}/g, (d, body) => {
    const parts = body.split('::').map((s) => s.trim()).filter(Boolean);
    return parts.length ? parts[0] : '';
  });
  return out;
}

function applyOne(text, c) {
  if (!c || c.kind === 'broken') return { text, hit: false, broken: !!c };
  if (c.kind === 'literal') {
    const out = text.split(c.needle).join(expand(c.content));
    return { text: out, hit: out !== text };
  }
  let hit = false;
  const out = text.replace(c.re, (...a) => {
    hit = true;
    const groups = Array.isArray(a[0]) ? a : a.slice(0, -2);
    return expand(c.content, groups);
  });
  return { text: out, hit };
}

/* 起点：默认 statusbar（旧版同层卡），没有再用 beginning */
const forced = opt('from', 'auto');
let source = forced;
if (source === 'auto') {
  const bar = String(card.statusbar || '');
  const beg = String(card.beginning || '');
  const barLooksMarker = /^【[^】]*\d+】$/.test(bar.trim()) || /^<[a-z0-9-]+>$/.test(bar.trim());
  source = barLooksMarker || !beg ? 'statusbar' : 'beginning';
  if (beg && rules.some((r) => String(r.findRegex).includes('<')) && !rules.some((r) => String(r.findRegex).includes('【'))) source = 'beginning';
}

let text = String(card[source] ?? '');
if (!text.trim()) { console.error(`起点字段 ${source} 为空`); process.exit(2); }

const fired = [], missed = [], broken = [];
for (const r of rules) {
  const c = compile(r);
  if (!c) continue;
  if (c.kind === 'broken') { broken.push(r.scriptName); continue; }
  const res = applyOne(text, c);
  text = res.text;
  (res.hit ? fired : missed).push(r.scriptName || `#${rules.indexOf(r)}`);
}

/* 残留标记：中文方头括号占位 + 尖括号标签（脚本内的不算） */
const visible = text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
const leftoverCn = [...new Set(visible.match(/【(?:rex-[a-z0-9-]+|[^】]{0,40}?\d{1,4})】/g) || [])];
const leftoverTag = [...new Set(visible.match(/<(?!\/?(?:div|span|p|br|img|strong|em|b|i|small|button|input|textarea|select|option|ul|ol|li|h[1-6]|section|article|header|footer|nav|canvas|svg|path|g|main|aside|figure|figcaption|table|thead|tbody|tr|td|th|style|script|link|meta|rex-)\b)[a-z][a-z0-9-]{2,}>/gi) || [])];

const outFile = opt('out', null);
if (outFile) { fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true }); fs.writeFileSync(outFile, text, 'utf8'); }

const scriptCount = (text.match(/<script/gi) || []).length;
console.log('='.repeat(64));
console.log('文件      ', file);
console.log('chatVersion', card.chatVersion);
console.log('规则数    ', rules.length, '| 起点', source);
console.log('点火      ', `${fired.length}/${rules.length}`);
console.log('未命中    ', missed.length ? missed.join(' | ') : '无');
console.log('语法错丢弃', broken.length ? broken.join(' | ') : '无');
console.log('产物长度  ', text.length, '| script 块', scriptCount);
console.log('残留标记  ', leftoverCn.length ? leftoverCn.join(',') : '无');
console.log('残留标签  ', leftoverTag.length ? leftoverTag.slice(0, 8).join(',') : '无');
if (outFile) console.log('已写出    ', path.resolve(outFile));

const fatal = leftoverCn.length > 0 || broken.length > 0;
// 分片链只存在于旧版同层卡：最后一条 launcher 未命中就是断链。
// 新版沙盒的 statusbar 标记本来就不在 beginning 里，不能按断链处理。
const isLegacy = Number(card.chatVersion) !== 1;
if (isLegacy && rules.length > 3 && missed.includes(rules[rules.length - 1].scriptName)) fatal = true;
process.exit(fatal ? 1 : 0);
