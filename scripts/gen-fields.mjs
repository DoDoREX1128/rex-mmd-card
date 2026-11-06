#!/usr/bin/env node
/* gen-fields.mjs · 由 fields.json 生成 references/fields/index.md
 * 用法: node scripts/gen-fields.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATS, loadBlueprints, validateBlueprints } from './lib/fields.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = path.join(root, 'references', 'fields', 'fields.json');
const out = path.join(root, 'references', 'fields', 'index.md');
const checkOnly = process.argv.includes('--check');

if (!fs.existsSync(src)) { console.error('找不到 fields.json'); process.exit(2); }
const doc = JSON.parse(fs.readFileSync(src, 'utf8'));
const bp=loadBlueprints();
const bpErrors=validateBlueprints(bp);
if(bpErrors.length)throw new Error(bpErrors.join('; '));

const CAT_MAP = new Map(CATS.map(([id, name, desc]) => [id, { name, desc }]));

const STATUS = { core: '核心', common: '常用', niche: '小众', supplement: '补充' };
const SRC = { persona: '通用模拟器', yuji: '无羁', yinyu: '因缘', luoli: '洛璃', common: '通用补充', 'complete-template':'完整同层模板' };
const TYPE = { bar: 'bar', num: 'num', tag: 'tag', text: 'text', enum: 'enum', bool: 'bool', list: 'list' };

const L = [];
const p = (s = '') => L.push(s);

p('# 字段库索引（生成文件）');
p();
p('创作设计维度和完整同层实际嵌套路径见 [创作与运行时蓝图](blueprints.md)。语义池缩写不代替已选解析器。');
p();
p('> 本文件由 `scripts/gen-fields.mjs` 从 `fields.json` 生成，**不要手改**。');
p('> 增删字段用 `node scripts/field-add.mjs`；命名与分类规则见 [README](README.md)。');
p(`> 更新：${doc.updated} · 条目 **${doc.fields.length}** · 分类 ${CATS.length}`);
p();

/* 使用 */
p('## 怎么用');
p();
p('1. **先查重**：按语义搜本页，或 `node scripts/field-add.mjs --find 体力`。近义先看冲突组，判清同义还是不同资源。');
p('2. **再定形**：选类型（bar / num / tag / text / enum / bool / list）、生命周期（每轮 / 阶段 / 一次性）、范围。');
p('3. **按路线接入**：新版配置型骨架写 `content.status.fields`；旧版完整同层按蓝图映射嵌套字段与解析器；旧版原生KV用配套键。加入语义池另按库内命名校验，项目无需先入库。');
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
  p('| 名 | 候选键 | 类型 | 生命周期 | 范围 | 状态 | 近义 / 冲突 | 来源 | 语义与映射 |');
  p('|---|---|---|---|---|---|---|---|---|');
  for (const f of rows) {
    const ali = (f.aliases || []).join('、') || '—';
    const conflict = f.conflict ? `**${f.conflict}**<br>` : '';
    const srcs = (f.sources || []).map((s) => SRC[s] || s).join('、');
    p(`| ${f.name} | \`${f.key}\` | ${TYPE[f.type] || f.type} | ${f.life} | ${f.range} | ${STATUS[f.status] || f.status} | ${conflict}${ali} | ${srcs} | ${String(f.note||'—').replace(/\|/g,'\\|')} |`);
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
p('## 冲突组（先判语义）');
p();
p('| 组 | 成员 | 处理 |');
p('|---|---|---|');
for (const [g, arr] of groups) {
  const members = arr.map((f) => `${f.name} \`${f.key}\``).join('、');
  p(`| ${g} | ${members} | 同义时保留主字段与别名；确为不同资源或关联档案可并存，需定义独立语义与联动 |`);
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
const cell=s=>String(s).replace(/\|/g,'\\|').replace(/\n/g,' ');
const B=['# 创作字段与完整运行时蓝图','','> 由 blueprints.json 生成。各字段均为候选；只选择本次作品需要的部分。语义池类型不等于代码自动支持。','','## 创作设计维度','','| 维度 | 要解决的问题 | 写法与边界 | 落点 |','|---|---|---|---|'];
for(const f of bp.planning)B.push(`| ${f.label} | ${cell(f.meaning)} | ${cell(f.writing)} | ${cell(f.target)} |`);
B.push('','## 旧版同层完整骨架的实际字段','','新版沙盒默认平面字段配置、旧版原生KV与本表不是同一schema；跨路线必须显式映射。', '', `实现依据：${bp.runtime.source}。`, '', '| 路径 | 形状 | 更新时机 | 合并/清空 | 写法与映射 | 界面 |', '|---|---|---|---|---|---|');
for(const f of bp.runtime.fields)B.push(`| \`${f.path}\`（${f.label}） | ${cell(f.shape)} | ${cell(f.when)} | ${cell(f.merge)} | ${cell(f.writing)} | ${cell(f.ui)} |`);
B.push('','缺键继承；首屏未知不自动补演示值。对象按键合并不等于支持删除；不能用一条“所有数组替换”规则覆盖实体增量集合。', '', '## 实现差异与换卡前检查', '');
for(const x of bp.runtime.differences)B.push('- '+x);
B.push('','历史兼容入口仅用于旧档读取，新稿不继续要求生成：'+bp.runtime.compatibilityOnly.join('；')+'。','','参见错题 [E-036](../errors/cases.md#e-036)、[E-075](../errors/cases.md#e-075)、[E-080](../errors/cases.md#e-080)、[E-081](../errors/cases.md#e-081)、[E-086](../errors/cases.md#e-086)。','','## 东方玄幻修仙示例','','只示范所选字段的映射，不要求照搬题材、主角身份、境界、系统或选项数量。地点必须同步到新工程地名注册表；本例选项控制在当前投影20字内。','','```text','[status]'+JSON.stringify(bp.runtime.example)+'[/status]','```','','## 接入验收','');
for(const x of bp.checklist)B.push('- '+x);
const blueprintText=B.join('\n')+'\n';
const blueprintOut=path.join(root,'references','fields','blueprints.md');

if (checkOnly) {
  const old = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (old.trim() !== text.trim() || !fs.existsSync(blueprintOut) || fs.readFileSync(blueprintOut,'utf8').trim()!==blueprintText.trim()) {
    console.error('字段索引与 fields.json 不一致，请重跑 node scripts/gen-fields.mjs');
    process.exit(1);
  }
  console.log('字段索引一致（' + doc.fields.length + ' 条）');
  process.exit(0);
}

fs.writeFileSync(out, text, 'utf8');
fs.writeFileSync(blueprintOut, blueprintText, 'utf8');
console.log(`已生成 references/fields/index.md（${doc.fields.length} 条 / ${CATS.length} 类）`);
