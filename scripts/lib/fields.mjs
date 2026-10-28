#!/usr/bin/env node
/* lib/fields.mjs · 字段库的常量与校验（gen-fields / field-add 共用） */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..', '..');
export const DATA = path.join(ROOT, 'references', 'fields', 'fields.json');

export const CATS = [
  ['identity', '身份', '姓名、性别、年龄、出身、职业、外貌等不变或很少变的标签'],
  ['body', '生理', '生命、体力、饥饿、伤势等在游玩中被消耗与恢复的量'],
  ['mind', '心理', '心情、压力、恐惧、理智等影响判断与表现的量'],
  ['eros', '欲情', '性欲、堕落、癖好、身体细节等成人向字段'],
  ['rel', '关系', '好感、亲密、信任、怀疑与人物名录'],
  ['social', '社会', '声望、地位、势力、情报、线索'],
  ['res', '资源', '金钱、物资、补给、负债等可消耗资产'],
  ['prog', '进度', '等级、经验、境界、任务、轮次、章节'],
  ['combat', '战斗', '攻防、命中、闪避、护甲、士气'],
  ['space', '空间', '地点、区域、地图、方位、距离、地盘'],
  ['time', '时间', '时间、日期、天气、季节'],
  ['item', '物品', '装备、背包、道具、武器、消耗品'],
  ['meta', '元', '状态、标记、选项、属性、模块等协议层字段']
];
export const CAT_IDS = new Set(CATS.map(([id]) => id));

export const TYPES = ['bar', 'num', 'tag', 'text', 'enum', 'bool', 'list'];
export const LIFECYCLES = ['每轮', '阶段', '一次性'];
export const STATUSES = ['core', 'common', 'niche', 'supplement'];
export const SOURCES = ['persona', 'yuji', 'yinyu', 'luoli', 'common']; // 已知来源；新素材可直接加新 slug

export const NAME_RE = /^[\u4e00-\u9fa5]{2,4}$/;
export const KEY_RE = /^[a-z]{2,4}$/;

export function load() {
  if (!fs.existsSync(DATA)) { console.error('找不到 ' + DATA); process.exit(2); }
  return JSON.parse(fs.readFileSync(DATA, 'utf8'));
}

export function save(doc) {
  doc.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(DATA, JSON.stringify(doc, null, 2) + '\n', 'utf8');
}

export function validateEntry(e, all, { allowSelf = null } = {}) {
  const errs = [];
  if (!NAME_RE.test(e.name)) errs.push(`名「${e.name}」必须是 2–4 个汉字`);
  if (!KEY_RE.test(e.key)) errs.push(`键「${e.key}」必须是 2–4 个小写字母`);
  if (!CAT_IDS.has(e.category)) errs.push(`分类「${e.category}」不在清单内`);
  if (!TYPES.includes(e.type)) errs.push(`类型「${e.type}」不在清单内`);
  if (!LIFECYCLES.includes(e.life)) errs.push(`生命周期「${e.life}」必须是 ${LIFECYCLES.join(' / ')}`);
  if (!STATUSES.includes(e.status)) errs.push(`状态「${e.status}」必须是 ${STATUSES.join(' / ')}`);
  for (const f of all) {
    if (allowSelf && f.key === allowSelf) continue;
    if (f.name === e.name) errs.push(`重名：${f.name} 已存在（键 ${f.key}）`);
    if (f.key === e.key) errs.push(`重键：${e.key} 已被「${f.name}」占用`);
    for (const a of e.aliases || []) {
      if (f.name === a || (f.aliases || []).includes(a)) errs.push(`近义词「${a}」已被「${f.name}」占用`);
    }
  }
  return errs;
}
