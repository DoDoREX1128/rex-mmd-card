#!/usr/bin/env node
/* gen-errors.mjs · 由 errors.json 生成 references/errors/index.md
 * 用法: node scripts/gen-errors.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYERS, VERDICTS, DEAD, VERSION_LABEL, SCOPES, SCOPE_LABEL, EVIDENCES, ROUTES, ROUTE_LABEL, routesOf, validateEntry } from './lib/errors.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = path.join(root, 'references', 'errors', 'errors.json');
const out = path.join(root, 'references', 'errors', 'index.md');
const checkOnly = process.argv.includes('--check');

if (!fs.existsSync(src)) { console.error('找不到 errors.json'); process.exit(2); }
const doc = JSON.parse(fs.readFileSync(src, 'utf8'));
const all = doc.entries;
if(new Set(all.map(e=>e.id)).size !== all.length)throw new Error('错题编号重复');
for (const e of all) {
  const errors = validateEntry(e, all, {allowSelf:e.id});
  if (errors.length) throw new Error(`${e.id}: ${errors.join('; ')}`);
}

const VERDICT = new Map(VERDICTS.map(([id, name, desc]) => [id, { name, desc }]));
const LAYER = new Map(LAYERS.map(([id, name, desc]) => [id, { name, desc }]));
const EVID = new Map(EVIDENCES.map(([id, name]) => [id, name]));

const verKey = (e) => (e.versions.length > 1 ? 'both' : e.versions[0]);
const brief = (s, n = 62) => {
  const first = String(s || '').split(/(?<=。)|[；;]/)[0].replace(/\s+/g, ' ').trim();
  return first.length > n ? first.slice(0, n - 1) + '…' : first;
};
const cell = (s) => String(s || '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');

const alive = all.filter((e) => !DEAD.has(e.verdict));
const dead = all.filter((e) => DEAD.has(e.verdict));

const L = [];
const p = (s = '') => L.push(s);

p('# 错题本索引（生成文件）');
p();
 p('完整的症状、根因、解法、复测与边界见 [逐条错题](cases.md)。不要只读本页截断的处置摘要。');
 p();
 p('## 按路线预检');
 p();
 for (const r of ROUTES) {
   p(`### ${ROUTE_LABEL[r]} · ${r}`); p();
   p(alive.filter(e=>routesOf(e).includes(r)).map(e=>`[${e.id}](cases.md#${e.id.toLowerCase()})`).join(' · ')); p();
 }
p('> 本文件由 `scripts/gen-errors.mjs` 从 `errors.json` 生成，**不要手改**。');
p('> 记新条目用 `node scripts/error-log.mjs --add`；判决与分层规则见 [README](README.md)。');
p(`> 更新：${doc.updated} · 条目 **${all.length}** · 有效 **${alive.length}** · 失效 **${dead.length}**`);
p();

/* 怎么用 */
p('## 怎么用');
p();
p('1. **先定版本**：新版（`chatVersion:1`）只看 `v1` 与 `both`；旧版（`0`）只看 `v0` 与 `both`。跨版本套结论是本库最常见误用。');
p('2. **再定分层**：按「故障发生在哪一层」找（点火 / 字符集 / 正则 / 能力 / 协议 / 样式 / 数据 / 可观测 / 验收 / 工具 / 流程），不按症状找。症状会重叠，层不会。');
p('3. **看判决**：只有 `已复现` 能直接当排障依据。`待复现` 是线索；`失效区`里的条目**不要再按它排查**。');
p('4. **命中就回写**：按某条解决了，把 `date` 更新为当天；没解决或发现归因错了，改判决而不是新开一条。');
p();

/* 判决分布 */
p('## 判决分布');
p();
p('| 判决 | 含义 | 条数 |');
p('|---|---|---|');
for (const [id, name, desc] of VERDICTS) {
  const n = all.filter((e) => e.verdict === id).length;
  if (n) p(`| ${DEAD.has(id) ? '~~' + name + '~~' : '**' + name + '**'} \`${id}\` | ${desc} | ${n} |`);
}
p();

/* 有效条目：按版本 → 层 */
for (const vk of ['v1', 'v0', 'both']) {
  const rows = alive.filter((e) => verKey(e) === vk);
  if (!rows.length) continue;
  p(`## ${VERSION_LABEL[vk]} · \`${vk}\``);
  p();
  p(`共 ${rows.length} 条。` + (vk === 'both' ? '两版都会遇到，先修这类。' : ''));
  p();
  for (const [lid, lname] of LAYERS) {
    const sub = rows.filter((e) => e.layer === lid);
    if (!sub.length) continue;
    p(`### ${lname} · \`${lid}\``);
    p();
    p('| 编号 | 症状 | 处置 | 证据 | 尝试 | 判决 |');
    p('|---|---|---|---|---|---|');
    for (const e of sub) {
      const vd = VERDICT.get(e.verdict);
      const mark = e.verdict === 'confirmed' ? vd.name : `**${vd.name}**`;
      p(`| [${e.id}](cases.md#${e.id.toLowerCase()}) | ${cell(e.title)} | ${cell(brief(e.fix))} | ${EVID.get(e.evidence) || e.evidence} | ${e.checks} | ${mark} |`);
    }
    p();
  }
}

/* 失效区 */
p('## 失效区（不要再按这些排查）');
p();
if (!dead.length) {
  p('当前没有失效条目。');
} else {
  p('这些条目被复测或复核推翻了。**保留它们的目的不是提供答案，而是阻止同一个假问题被反复排查。**');
  p();
  p('| 编号 | 标题 | 判决 | 真错因 / 说明 | 依据 |');
  p('|---|---|---|---|---|');
  for (const e of dead) {
    const vd = VERDICT.get(e.verdict);
    p(`| \`${e.id}\` | ${cell(e.title)} | **${vd.name}** | ${cell(e.instead || e.cause)} | ${cell(e.source)} |`);
  }
}
p();

/* 分层速查 */
p('## 分层速查');
p();
p('| 层 | 说明 | 编号 |');
p('|---|---|---|');
for (const [lid, lname, ldesc] of LAYERS) {
  const ids = all.filter((e) => e.layer === lid).map((e) => (DEAD.has(e.verdict) ? '~~' + e.id + '~~' : e.id));
  p(`| ${lname} \`${lid}\` | ${ldesc} | ${ids.join('、') || '—'} |`);
}
p();

/* 归属统计 */
p('## 归属（这错该谁改）');
p();
p('| 归属 | 含义 | 条数 |');
p('|---|---|---|');
for (const s of SCOPES) {
  const n = all.filter((e) => e.scope === s).length;
  p(`| ${SCOPE_LABEL[s]} \`${s}\` | ${s === 'platform' ? '平台机制约束，改不了，只能绕' : s === 'author' ? '作者代码写法，能改，改写法' : '本 skill 的文档或工具，由维护者改'} | ${n} |`);
}
p();
p('搞错归属是最贵的一种错：去改平台改不动，去改文档改不到点上。');
p();

const text = L.join('\n');
const detail = ['# 错题本 · 逐条记录', '', '> 由 errors.json 生成。先按路线与判决筛选；制作记录证据不等于本轮真站或实体设备复测。', ''];
for (const e of all) {
  detail.push(`<a id="${e.id.toLowerCase()}"></a>`, `## ${e.id} · ${e.title}`, '',
    `适用：${routesOf(e).map(r=>ROUTE_LABEL[r]).join(' / ')}；分层：${e.layer}；判决：${e.verdict}；证据：${EVID.get(e.evidence)}；核验：${e.date}。`, '',
    `**症状**：${e.symptom}`, '', `**根因**：${e.cause}`, '', `**解决方案**：${e.fix}`, '',
    `**复测**：${e.verification || '按上述症状做修改前后对照，检查可见结果与原始数据；真站、夹具、实体设备分别记录。'}`, '',
    `**边界**：${e.limits || '仅在记录的版本、目标与前提下使用；当前环境不相符时先复现，不直接套用。'}`, '',
    ...(e.instead ? [`**真错因**：${e.instead}`, ''] : []),
    `**依据**：${e.source || '未记录出处，使用前补证据。'}${e.note ? '；'+e.note : ''}`, '',
    ...(e.example ? ['**调用/修复示例**', '', e.example.trim(), ''] : []));
}
const details = detail.join('\n');
const detailOut = path.join(root,'references','errors','cases.md');

if (checkOnly) {
  const old = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (old.trim() !== text.trim() || !fs.existsSync(detailOut) || fs.readFileSync(detailOut,'utf8').trim() !== details.trim()) {
    console.error('错题本索引与 errors.json 不一致，请重跑 node scripts/gen-errors.mjs');
    process.exit(1);
  }
  console.log(`错题本索引一致（${all.length} 条）`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, text, 'utf8');
fs.writeFileSync(detailOut, details, 'utf8');
console.log(`已生成 references/errors/index.md（${all.length} 条 / 有效 ${alive.length} / 失效 ${dead.length}）`);
