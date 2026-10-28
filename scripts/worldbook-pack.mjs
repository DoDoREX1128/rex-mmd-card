#!/usr/bin/env node
/* worldbook-pack.mjs · 世界书 → 人设里的 <世界设定> 块（仅在入口不支持世界书或用户要求单文件时使用）
 * 用法:
 *   node scripts/worldbook-pack.mjs --persona p.txt --worldbook w.json --out packed.txt \
 *        [--max 10000] [--allow-partial] [--quiet]
 * 退出码: 0 成功 / 1 超限且未允许截断 / 2 用法错误
 */
import fs from 'node:fs';
import path from 'node:path';
import { LIMIT, parseArgs, fail } from './lib/facts.mjs';

const { opts } = parseArgs(process.argv);
const personaPath = opts.persona;
const wbPath = opts.worldbook;
if (!personaPath || !wbPath) fail('用法: node scripts/worldbook-pack.mjs --persona p.txt --worldbook w.json --out packed.txt [--max N] [--allow-partial]', 2);
if (!fs.existsSync(personaPath)) fail('找不到人设文件: ' + personaPath, 2);
if (!fs.existsSync(wbPath)) fail('找不到世界书: ' + wbPath, 2);

const max = Number(opts.max || LIMIT.personality);
const partial = Boolean(opts['allow-partial']);
const persona = fs.readFileSync(personaPath, 'utf8').replace(/^\uFEFF/, '');

let wb;
try { wb = JSON.parse(fs.readFileSync(wbPath, 'utf8').replace(/^\uFEFF/, '')); }
catch (e) { fail('世界书 JSON 解析失败: ' + e.message, 1); }
if (!wb || !wb.entries || typeof wb.entries !== 'object' || Array.isArray(wb.entries)) {
  fail('世界书必须是 { entries: { … } }；先跑 worldbook-normalize.mjs', 1);
}

function keywordsOf(entry) {
  try {
    const arr = JSON.parse(entry.key || '[]');
    return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
  } catch { return []; }
}

const rows = Object.entries(wb.entries)
  .filter(([, e]) => e && !e.disable && String(e.content || '').trim())
  .map(([id, e]) => {
    const kw = keywordsOf(e);
    const constant = Boolean(e.constant) || kw.length === 0;
    return {
      id,
      constant,
      order: Number(e.order) || 0,
      comment: String(e.comment || '').trim(),
      content: String(e.content || '').trim(),
      kw
    };
  })
  .sort((a, b) => (Number(b.constant) - Number(a.constant)) || (b.order - a.order));

const lines = ['', '<世界设定>'];
const omitted = [];
let used = persona.length + 12;

for (const r of rows) {
  const head = r.constant
    ? `【常驻${r.comment ? ' · ' + r.comment : ''}】`
    : `【触发${r.comment ? ' · ' + r.comment : ''}${r.kw.length ? '（' + r.kw.join('、') + '）' : ''}】`;
  const block = head + '\n' + r.content;
  if (used + block.length + 2 > max) {
    if (!partial) {
      console.error(`合并后会超过 ${max} 字（已用 ${used}，本条 ${block.length}）。`);
      console.error('可选：拆成独立世界书导入；或加 --allow-partial 接受遗漏（会逐条列出）。');
      process.exit(1);
    }
    omitted.push(r);
    continue;
  }
  lines.push(block);
  used += block.length + 2;
}
lines.push('</世界设定>');

const packed = persona.replace(/\s+$/, '') + '\n' + lines.join('\n') + '\n';

if (opts.out) {
  const p = path.resolve(opts.out);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, packed, 'utf8');
}

if (!opts.quiet) {
  console.log('世界书已并入人设');
  console.log('  条目      ' + rows.length + ' 条（常驻 ' + rows.filter((r) => r.constant).length + '）');
  console.log('  长度      ' + packed.length + ' / ' + max);
  if (omitted.length) {
    console.log('  已遗漏    ' + omitted.length + ' 条（--allow-partial）');
    omitted.forEach((r) => console.log('    - ' + (r.comment || r.id) + `（${r.content.length} 字）`));
  }
  if (opts.out) console.log('  ' + path.resolve(opts.out));
}

if (packed.length > LIMIT.personality) {
  console.error(`合并结果 ${packed.length} 字，超过 personality 上限 ${LIMIT.personality}`);
  process.exit(1);
}

if (!opts.out) process.stdout.write(packed);
