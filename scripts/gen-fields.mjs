#!/usr/bin/env node
/* gen-fields.mjs · 由 fields.json 生成 references/fields/index.md
 * 用法: node scripts/gen-fields.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATS } from './lib/fields.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = path.join(root, 'references', 'fields', 'fields.json');
const out = path.join(root, 'references', 'fields', 'index.md');
const checkOnly = process.argv.includes('--check');

if (!fs.existsSync(src)) { console.error('找不到 fields.json'); process.exit(2); }
const doc = JSON.parse(fs.readFileSync(src, 'utf8'));

const CAT_MAP = new Map(CATS.map(([id, name, desc]) => [id, { name, desc }]));

const STATUS = { core: '核心', common: '常用', niche: '小众', supplement: '补充' };
const SRC = { persona: '通用模拟器', yuji: '无羁', yinyu: '因缘', luoli: '洛璃', common: '通用补充' };
const TYPE = { bar: 'bar', num: 'num', tag: 'tag', text: 'text', enum: 'enum', bool: 'bool', list: 'list' };

const L = [];
const p = (s = '') => L.push(s);

p('# 字段库索引（生成文件）');
p();
p('> 本文件由 `scripts/gen-fields.mjs` 从 `fields.json` 生成，**不要手改**。');
p('> 增删字段用 `node scripts/field-add.mjs`；命名与分类规则见 [README](README.md)。');
p(`> 更新：${doc.updated} · 条目 **${doc.fields.length}** · 分类 ${CATS.length}`);
p();

/* 使用 */
p('## 怎么用');
p();
p('1. **先查重**：按语义搜本页，或 `node scripts/field-add.mjs --find 体力`。近义先看「冲突组」，同组只留一个。');
p('2. **再定形**：选类型（bar / num / tag / text / enum / bool / list）、生命周期（每轮 / 阶段 / 一次性）、范围。');
p('3. **按需登记**：项目字段写进 `content.status.fields` 并同步协议；加入本候选库时另按库内 2–4 字简短命名校验。项目可自定义更长或中文键，无需先入库。');
p();
p('库内字段名是**语义名**，显示名放 `label`；库内缩写习惯是 2–4 个小写字母，不是平台或项目运行时限制。候选 enum/bool/list 等类型也不代表默认状态解析器已支持，接入前映射或扩展。');
p();

/* 分类总览 */
p('## 分类总览');
p();
p('| 分类 | 说明 | 条目 | 核心 |');
p('|---|---|---|---|');
for (const [id, name, desc] of CATS) {
  const rows = doc.fields.filter((f) => f.category === id);
  p(`| ${name} \`${id}\` | ${desc} | ${rows.length} | ${rows.filter((f) => f.status === 'core').length} |`);
}
p();

/* 各分类 */
for (const [id, name, desc] of CATS) {
  const rows = doc.fields.filter((f) => f.category === id);
  if (!rows.length) continue;
  p(`## ${name} · ${id}`);
  p();
  p(desc + '。');
  p();
  p('| 名 | 键 | 类型 | 生命周期 | 范围 | 状态 | 近义 / 冲突 | 来源 |');
  p('|---|---|---|---|---|---|---|---|');
  for (const f of rows) {
    const ali = (f.aliases || []).join('、') || '—';
    const conflict = f.conflict ? `**${f.conflict}**<br>` : '';
    const srcs = (f.sources || []).map((s) => SRC[s] || s).join('、');
    p(`| ${f.name} | \`${f.key}\` | ${TYPE[f.type] || f.type} | ${f.life} | ${f.range} | ${STATUS[f.status] || f.status} | ${conflict}${ali} | ${srcs} |`);
  }
  p();
}

/* 冲突组 */
const groups = new Map();
for (const f of doc.fields) {
  if (!f.conflict) continue;
  if (!groups.has(f.conflict)) groups.set(f.conflict, []);
  groups.get(f.conflict).push(f);
}
p('## 冲突组（同组只留一个）');
p();
p('| 组 | 成员 | 处理 |');
p('|---|---|---|');
for (const [g, arr] of groups) {
  const members = arr.map((f) => `${f.name} \`${f.key}\``).join('、');
  p(`| ${g} | ${members} | 选一个当主字段，其余写成别名或不建；两个都建会让模型分不清该更新哪个 |`);
}
p();

/* 补充区 */
const sup = doc.fields.filter((f) => f.status === 'supplement');
p('## 待验证 / 补充字段');
p();
p('这些字段在现有素材中**没有直接证据**，是按常见玩法补的；用之前先确认题材真的需要。');
p();
p(sup.map((f) => `\`${f.name}\``).join('、'));
p();

const text = L.join('\n');

if (checkOnly) {
  const old = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (old.trim() !== text.trim()) {
    console.error('字段索引与 fields.json 不一致，请重跑 node scripts/gen-fields.mjs');
    process.exit(1);
  }
  console.log('字段索引一致（' + doc.fields.length + ' 条）');
  process.exit(0);
}

fs.writeFileSync(out, text, 'utf8');
console.log(`已生成 references/fields/index.md（${doc.fields.length} 条 / ${CATS.length} 类）`);
