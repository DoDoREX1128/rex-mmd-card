#!/usr/bin/env node
/* error-log.mjs · 错题本的增 / 查 / 改 / 归档 / 删除
 *
 * 查:   node scripts/error-log.mjs --find z-index [--ver v1] [--layer css]
 * 看:   node scripts/error-log.mjs --show E-002
 * 记:   node scripts/error-log.mjs --add --title "..." --ver v1 --layer css --scope platform \
 *            --symptom "..." --cause "..." --fix "..." [--verdict suspected] [--evidence probe] \
 *            [--checks 1] [--instead "..."] [--source "..."]
 * 命中: node scripts/error-log.mjs --hit E-002
 * 改:   node scripts/error-log.mjs --set E-023 --verdict unreproducible --checks 3 [--note "..."]
 * 归档: node scripts/error-log.mjs --retire E-002 --why "平台已修复，条件不再成立"
 * 删除: node scripts/error-log.mjs --purge E-002 --force      （先写进 archive.jsonl 再删）
 * 恢复: node scripts/error-log.mjs --restore E-002
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  load, save, validateEntry, nextId,
  LAYERS, VERDICTS, EVIDENCES, VERSIONS, SCOPES, DEAD, VERSION_LABEL
} from './lib/errors.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const archive = path.join(root, 'references', 'errors', 'archive.jsonl');

const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const has = (k) => args.includes('--' + k);
const today = () => new Date().toISOString().slice(0, 10);
const j = (v) => JSON.stringify(v);

const doc = load();
let all = doc.entries;

function parseVer(v) {
  if (!v) return null;
  if (v === 'both') return ['v0', 'v1'];
  const arr = String(v).split(',').map((s) => s.trim()).filter(Boolean);
  for (const x of arr) if (!VERSIONS.includes(x)) { console.error(`版本「${x}」无效，用 v0 / v1 / both`); process.exit(2); }
  return [...new Set(arr)].sort();
}

function regen() {
  const g = spawnSync(process.execPath, [path.join(here, 'gen-errors.mjs')], { encoding: 'utf8' });
  if (g.status !== 0) { console.error(g.stderr || g.stdout); process.exit(1); }
  console.log(g.stdout.trim());
}

function commit() {
  save(doc);
  regen();
}

function show(e) {
  const lay = (LAYERS.find(([id]) => id === e.layer) || [])[1] || e.layer;
  const vd = (VERDICTS.find(([id]) => id === e.verdict) || [])[1] || e.verdict;
  const ev = (EVIDENCES.find(([id]) => id === e.evidence) || [])[1] || e.evidence;
  console.log(`${e.id}  ${e.title}`);
  console.log(`  ${e.versions.map((v) => VERSION_LABEL[v]).join(' + ')} · ${lay} · ${e.scope} · ${vd} · 证据 ${ev} · 尝试 ${e.checks} 次 · ${e.date}`);
  console.log(`  症状: ${e.symptom}`);
  console.log(`  根因: ${e.cause}`);
  console.log(`  处置: ${e.fix}`);
  if (e.instead) console.log(`  真错因: ${e.instead}`);
  if (e.fixedIn) console.log(`  修复于: ${e.fixedIn}`);
  if (e.note) console.log(`  备注: ${e.note}`);
  if (e.source) console.log(`  出处: ${e.source}`);
}

/* ---------- 查 ---------- */
const find = opt('find');
const showId = opt('show');
if (find || showId) {
  if (showId) {
    const e = all.find((x) => x.id.toLowerCase() === String(showId).toLowerCase());
    if (!e) { console.error('没有 ' + showId); process.exit(1); }
    show(e); process.exit(0);
  }
  const q = String(find).toLowerCase();
  const vf = parseVer(opt('ver'));
  const lf = opt('layer');
  const layerCn = (id) => (LAYERS.find(([x]) => x === id) || [])[1] || '';
  const verdictCn = (id) => (VERDICTS.find(([x]) => x === id) || [])[1] || '';
  const hits = all.filter((e) => {
    if (vf && !vf.some((v) => e.versions.includes(v))) return false;
    if (lf && e.layer !== lf) return false;
    const hay = [e.id, e.title, e.symptom, e.cause, e.fix, e.instead, e.note, e.source, e.layer, e.scope,
      layerCn(e.layer), verdictCn(e.verdict), e.verdict]
      .filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });
  if (!hits.length) { console.log('没有匹配：' + find + '（可加 --ver / --layer 缩小范围）'); process.exit(0); }
  console.log(`匹配 ${hits.length} 条：`);
  for (const e of hits) {
    const vd = (VERDICTS.find(([id]) => id === e.verdict) || [])[1] || e.verdict;
    const dead = DEAD.has(e.verdict) ? '  ← 已失效，不要按它排查' : '';
    console.log(`  ${e.id}  [${e.versions.join('+')}/${e.layer}]  ${e.title}  (${vd})${dead}`);
  }
  console.log('\n看细节：--show <编号>');
  process.exit(0);
}

/* ---------- 加 ---------- */
if (has('add')) {
  const title = opt('title');
  const ver = parseVer(opt('ver', 'v1'));
  const e = {
    id: opt('id') || nextId(doc),
    title: title || '',
    versions: ver,
    layer: opt('layer', 'protocol'),
    scope: opt('scope', 'platform'),
    symptom: opt('symptom', ''),
    cause: opt('cause', ''),
    fix: opt('fix', ''),
    verdict: opt('verdict', 'suspected'),
    evidence: opt('evidence', 'guess'),
    checks: Number(opt('checks', 1)),
    instead: opt('instead', null),
    fixedIn: opt('fixed-in', null),
    note: opt('note', ''),
    source: opt('source', ''),
    date: today()
  };
  const errs = validateEntry(e, all);
  if (errs.length) { console.error('校验未通过：'); errs.forEach((x) => console.error('  - ' + x)); process.exit(1); }
  all.push(e);
  commit();
  console.log(`已记入 ${e.id}（${e.verdict}）`);
  process.exit(0);
}

/* ---------- 改 ---------- */
const setId = opt('set');
if (setId) {
  const e = all.find((x) => x.id === setId);
  if (!e) { console.error('没有 ' + setId); process.exit(1); }
  const before = j(e);
  const patch = {};
  for (const k of ['title', 'layer', 'scope', 'symptom', 'cause', 'fix', 'verdict', 'evidence', 'instead', 'note', 'source']) {
    const v = opt(k);
    if (v !== null) patch[k] = v;
  }
  if (opt('checks') !== null) patch.checks = Number(opt('checks'));
  if (opt('ver') !== null) patch.versions = parseVer(opt('ver'));
  if (opt('fixed-in') !== null) patch.fixedIn = opt('fixed-in');
  patch.date = today();
  Object.assign(e, patch);
  const errs = validateEntry(e, all, { allowSelf: e.id });
  if (errs.length) {
    const restored = JSON.parse(before);
    for (const k of Object.keys(e)) if (!(k in restored)) delete e[k];
    Object.assign(e, restored);
    console.error('校验未通过（已回滚）：'); errs.forEach((x) => console.error('  - ' + x)); process.exit(1);
  }
  commit();
  console.log(`已更新 ${e.id}`);
  process.exit(0);
}

/* ---------- 命中 ---------- */
const hitId = opt('hit');
if (hitId) {
  const e = all.find((x) => x.id === hitId);
  if (!e) { console.error('没有 ' + hitId); process.exit(1); }
  e.checks = Number(e.checks || 0) + 1;
  e.date = today();
  commit();
  console.log(`${e.id} 已记为命中一次（累计 ${e.checks} 次）`);
  process.exit(0);
}

/* ---------- 归档 ---------- */
const retireId = opt('retire');
if (retireId) {
  const e = all.find((x) => x.id === retireId);
  if (!e) { console.error('没有 ' + retireId); process.exit(1); }
  const why = opt('why', '');
  e.verdict = 'retired';
  e.note = why;
  e.date = today();
  const errs = validateEntry(e, all, { allowSelf: e.id });
  if (errs.length) { console.error('校验未通过：'); errs.forEach((x) => console.error('  - ' + x)); process.exit(1); }
  commit();
  console.log(`${e.id} 已归档（仍留在库里，索引归到失效区）`);
  process.exit(0);
}

/* ---------- 删除（留墓碑） ---------- */
const purgeId = opt('purge');
if (purgeId) {
  const idx = all.findIndex((x) => x.id === purgeId);
  if (idx < 0) { console.error('没有 ' + purgeId); process.exit(1); }
  const e = all[idx];
  if (!has('force')) {
    console.error(`${e.id}「${e.title}」`);
    console.error('删除会从主库移除。确认请加 --force。若只是想让它失效，用 --set --verdict invalid 或 --retire。');
    process.exit(1);
  }
  fs.appendFileSync(archive, JSON.stringify({ ...e, deletedAt: today(), deletedReason: opt('why', '') }) + '\n', 'utf8');
  all.splice(idx, 1);
  commit();
  console.log(`${e.id} 已删除，原文写入 archive.jsonl（可用 --restore ${e.id} 取回）`);
  process.exit(0);
}

/* ---------- 恢复 ---------- */
const restoreId = opt('restore');
if (restoreId) {
  if (!fs.existsSync(archive)) { console.error('没有 archive.jsonl'); process.exit(1); }
  const lines = fs.readFileSync(archive, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const e = lines.reverse().find((x) => x.id === restoreId);
  if (!e) { console.error('归档里没有 ' + restoreId); process.exit(1); }
  if (all.some((x) => x.id === e.id)) { console.error(e.id + ' 已在主库里'); process.exit(1); }
  const { deletedAt, deletedReason, ...rest } = e;
  rest.date = today();
  all.push(rest);
  all.sort((a, b) => a.id.localeCompare(b.id));
  commit();
  console.log(`${e.id} 已恢复`);
  process.exit(0);
}

/* ---------- 无参：打印清单帮助 ---------- */
console.log('错题本工具');
console.log('  查：  --find <关键词> [--ver v0|v1|both] [--layer css]');
console.log('  看：  --show E-002');
console.log('  记：  --add --title "..." --ver v1 --layer css --scope platform \\');
console.log('         --symptom "..." --cause "..." --fix "..." [--verdict suspected] [--evidence probe]');
console.log('  命中：--hit E-002');
console.log('  改：  --set E-023 --verdict unreproducible --checks 3');
console.log('  归档：--retire E-002 --why "理由"');
console.log('  删除：--purge E-002 --force [--why "理由"]');
console.log('  恢复：--restore E-002');
console.log('');
console.log('层：', LAYERS.map(([id, n]) => `${id}=${n}`).join(' '));
console.log('判决：', VERDICTS.map(([id, n]) => `${id}=${n}`).join(' '));
console.log('证据：', EVIDENCES.map(([id, n]) => `${id}=${n}`).join(' '));
console.log('归属：', SCOPES.join(' / '));
