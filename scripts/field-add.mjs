#!/usr/bin/env node
/* field-add.mjs · 查字段 / 加字段 / 改字段，并自动重生成索引
 * 用法:
 *   node scripts/field-add.mjs --find 体力
 *   node scripts/field-add.mjs --name 体力 --key sta --type bar --cat body --life 每轮 \
 *        [--range "0–100"] [--status common] [--alias 耐力,精力] [--conflict 耐力组] \
 *        [--source luoli] [--note "一句话"] [--update]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, save, validateEntry, CATS, TYPES, LIFECYCLES, STATUSES } from './lib/fields.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const has = (k) => args.includes('--' + k);

const doc = load();
const all = doc.fields;

/* ---------- 查 ---------- */
const find = opt('find');
if (find) {
  const q = String(find).toLowerCase();
  const hits = all.filter((f) =>
    f.name.includes(find) || f.key === q || (f.aliases || []).some((a) => a.includes(find)) ||
    f.category === q || (f.conflict || '').includes(find)
  );
  if (!hits.length) { console.log('没有匹配：' + find); process.exit(0); }
  console.log(`匹配 ${hits.length} 条：`);
  for (const f of hits) {
    const cat = (CATS.find(([id]) => id === f.category) || [])[1] || f.category;
    console.log(`  ${f.name}  ${f.key}  ${f.type}  ${cat}/${f.life}  ${f.range}  [${f.status}]` +
      (f.aliases.length ? '  近义:' + f.aliases.join('、') : '') +
      (f.conflict ? '  组:' + f.conflict : ''));
  }
  process.exit(0);
}

/* ---------- 加 / 改 ---------- */
const name = opt('name');
const key = opt('key');
if (!name || !key) {
  console.error('用法: node scripts/field-add.mjs --name 体力 --key sta --type bar --cat body --life 每轮');
  console.error('   或: node scripts/field-add.mjs --find 体力');
  process.exit(2);
}

const entry = {
  name,
  key: String(key).toLowerCase(),
  type: opt('type', 'num'),
  category: opt('cat', 'meta'),
  life: opt('life', '每轮'),
  range: opt('range', '—'),
  status: opt('status', 'common'),
  conflict: opt('conflict', null),
  aliases: (opt('alias') || '').split(',').map((s) => s.trim()).filter(Boolean),
  sources: (opt('source') || 'common').split(',').map((s) => s.trim()).filter(Boolean),
  note: opt('note', '')
};

const exists = all.find((f) => f.key === entry.key || f.name === entry.name);
const update = has('update');

if (exists && !update) {
  console.error(`已存在：${exists.name}（${exists.key}）。要覆盖请加 --update，或换一个名/键。`);
  process.exit(1);
}

const errs = validateEntry(entry, all, { allowSelf: exists ? exists.key : null });
if (errs.length) {
  console.error('校验未通过：');
  errs.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

if (exists) {
  Object.assign(exists, entry);
  console.log(`已更新：${entry.name}（${entry.key}）`);
} else {
  all.push(entry);
  console.log(`已新增：${entry.name}（${entry.key}） → ${entry.category}/${entry.life}`);
}

save(doc);
const gen = spawnSync(process.execPath, [path.join(here, 'gen-fields.mjs')], { encoding: 'utf8' });
if (gen.status !== 0) {
  console.error(gen.stderr || gen.stdout);
  process.exit(1);
}
console.log(gen.stdout.trim());
console.log('下一步：把该键写进卡片的 content.status.fields，并在人设 <输出格式> 里声明。');

/* ---------- 附：清单提示 ---------- */
if (has('help')) {
  console.log('分类:', CATS.map(([id, n]) => `${id}=${n}`).join(' '));
  console.log('类型:', TYPES.join(' '));
  console.log('生命周期:', LIFECYCLES.join(' '));
  console.log('状态:', STATUSES.join(' '));
}
