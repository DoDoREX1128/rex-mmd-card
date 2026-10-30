#!/usr/bin/env node
/* worldbook-normalize.mjs · 任意世界书 JSON → 平台可导入的 { entries } 结构
 * 用法: node scripts/worldbook-normalize.mjs <in.json> [--out out.json] [--quiet]
 * 退出码: 0 已规范化（可能有告警） / 1 结构不可修复 / 2 用法错误
 */
import fs from 'node:fs';
import path from 'node:path';
import { LIMIT, parseArgs, fail } from './lib/facts.mjs';
import { validateWorldbook } from './lib/worldbook.mjs';

const { positional, opts } = parseArgs(process.argv);
const input = positional[0];
if (!input) fail('用法: node scripts/worldbook-normalize.mjs <in.json> [--out out.json]', 2);

let raw;
try {
  raw = JSON.parse(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, ''));
} catch (e) {
  fail('JSON 解析失败: ' + e.message, 1);
}

const warn = [];
const note = [];

/* 定位 entries：对象映射、数组、或整份文件就是一条 */
let entries = null;
let droppedRoot = [];
if (Array.isArray(raw)) {
  entries = raw;
  note.push('输入是数组，按条目列表处理');
} else if (raw && typeof raw === 'object' && 'entries' in raw) {
  entries = raw.entries;
  droppedRoot = Object.keys(raw).filter((k) => k !== 'entries');
} else if (raw && typeof raw === 'object' && ('content' in raw || 'key' in raw)) {
  entries = [raw];
  note.push('输入是单条条目，已包成 entries');
} else {
  fail('认不出结构：既没有 entries，也不像单条条目', 1);
}

if (!entries || typeof entries !== 'object') fail('entries 不是对象或数组', 1);
if (droppedRoot.length) note.push('根元数据保留在输入文件；指定 --out 时另写 -source.json，导入文件仅含 entries: ' + droppedRoot.join(', '));

const isArr = Array.isArray(entries);
const list = isArr ? entries.map((e, i) => [String(i), e]) : Object.entries(entries);

function keyString(v, where) {
  if (v == null) return '[]';
  if (Array.isArray(v)) return JSON.stringify(v.map(String));
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return '[]';
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return JSON.stringify(parsed.map(String));
      return JSON.stringify([String(parsed)]);
    } catch {
      const parts = t.split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
      warn.push(`${where}.key 不是 JSON 数组，已按分隔符拆成 ${parts.length} 个关键词`);
      return JSON.stringify(parts);
    }
  }
  warn.push(`${where}.key 类型异常（${typeof v}），已置空`);
  return '[]';
}

const out = {};
const uids = new Set();
let nextUid = Math.max(0, ...list.map(([, e]) => Number(e && e.uid) || 0)) + 1;
let convertedKeys = 0;

list.forEach(([k, e], i) => {
  if (!e || typeof e !== 'object') { warn.push(`entries[${k}] 不是对象，已跳过`); return; }
  const where = `entries[${k}]`;
  const before = JSON.stringify(e.key);
  const key = keyString(e.key, where);
  if (before !== key) convertedKeys++;

  let uid = Number(e.uid);
  if (!Number.isFinite(uid) || uids.has(uid)) {
    if (e.uid != null) warn.push(`${where}.uid ${JSON.stringify(e.uid)} 重复或非法，已重编为 ${nextUid}`);
    uid = nextUid++;
  }
  uids.add(uid);

  let probability = e.probability;
  if (typeof probability === 'number') probability = probability.toFixed(2);
  else if (typeof probability === 'string' && probability.trim() && !/^\d+(\.\d+)?$/.test(probability.trim())) {
    warn.push(`${where}.probability 不是数字，已置为 "100.00"`);
    probability = '100.00';
  } else if (typeof probability === 'string' && probability.trim()) {
    probability = Number(probability).toFixed(2);
  } else probability = '100.00';

  const content = typeof e.content === 'string' ? e.content : String(e.content ?? '');
  if (content.length > LIMIT.worldbookEntryContent) warn.push(`${where}.content ${content.length} 字，超过 ${LIMIT.worldbookEntryContent}`);

  const comment = typeof e.comment === 'string' ? e.comment : (e.comment == null ? '' : String(e.comment));
  if (comment.length > LIMIT.worldbookComment) warn.push(`${where}.comment 超过 ${LIMIT.worldbookComment} 字，平台会截断`);

  out[String(k)] = {
    ...e,
    uid,
    key,
    keysecondary: keyString(e.keysecondary, `${where}.keysecondary`),
    comment,
    content,
    probability
  };
});

const result = { entries: out };
const checked = validateWorldbook(result);
if (checked.errors.length) fail('规范化后仍不合法，未写输出：\n' + checked.errors.join('\n'), 1);
const text = JSON.stringify(result, null, 2);

if (opts.out) {
  const p = path.resolve(opts.out);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text, 'utf8');
  if (droppedRoot.length) fs.writeFileSync(p.replace(/\.json$/i, '') + '-source.json', JSON.stringify(raw, null, 2), 'utf8');
}

if (!opts.quiet) {
  console.log('世界书规范化完成');
  console.log('  条目      ' + Object.keys(out).length);
  console.log('  关键词转换 ' + convertedKeys + ' 条');
  if (note.length) { console.log('  说明'); note.forEach((n) => console.log('    - ' + n)); }
  if (warn.length) { console.log('  告警'); warn.slice(0, 12).forEach((w) => console.log('    WARN ' + w)); if (warn.length > 12) console.log(`    … 另有 ${warn.length - 12} 条`); }
  if (opts.out) console.log('  ' + path.resolve(opts.out));
}

if (!opts.out) process.stdout.write(text + '\n');
process.exit(0);
