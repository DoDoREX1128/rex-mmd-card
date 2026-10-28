#!/usr/bin/env node
/* lib/errors.mjs · 错题本的常量与校验（gen-errors / error-log 共用）
 *
 * 与字段库的关键差异：字段库只增不删；错题本允许被推翻。
 * 判决（verdict）是错题本的核心——它记录「这条经验现在还算不算数」。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..', '..');
export const DATA = path.join(ROOT, 'references', 'errors', 'errors.json');

/* 按「故障发生在哪一层」分类，不按症状分类。
   症状会重叠（都叫"按钮没反应"），层不会。 */
export const LAYERS = [
  ['ignite', '点火', '标记没被替换、载体没触发、拓扑不对、旧实例抢跑'],
  ['charset', '字符集', '代码被 Markdown、编辑器或净化器改写'],
  ['regex', '正则', '匹配式形态、语法错、字面量转义、重复匹配'],
  ['sdk', '能力', '方法名、可用性、事件时机、瘦预览降级'],
  ['protocol', '协议', '状态块形状、字段名对齐、解析容错、存档'],
  ['css', '样式', '层级、选择器、变量、作用域、平台默认样式'],
  ['data', '数据', '限额超限、键数、编码、导入结构'],
  ['observ', '可观测', '失败不上屏、只在控制台报错、无法判断有没有跑'],
  ['accept', '验收', '判定口径、假环境自证、把模拟当实机'],
  ['tooling', '工具', '本 skill 的校验器 / 构建脚本自身出错'],
  ['process', '流程', '换骨架、跨版本套结论、跳过阶段、误判归因']
];
export const LAYER_IDS = new Set(LAYERS.map(([id]) => id));

/* 版本维度：0 = 旧页（chatVersion:0）、1 = 新版沙盒（chatVersion:1） */
export const VERSIONS = ['v0', 'v1', 'both'];
export const VERSION_LABEL = { v0: '旧版 0', v1: '新版 1', both: '两版共用' };

/* 归属：回答「这错该谁改」。排障时先分清，不然会去改改不动的东西 */
export const SCOPES = ['platform', 'author', 'skill'];
export const SCOPE_LABEL = { platform: '平台行为', author: '作者写法', skill: '本 skill 自身' };

/* 判决：这条经验现在算什么 */
export const VERDICTS = [
  ['confirmed', '已复现', '按现象能稳定重现，可直接用于排障'],
  ['suspected', '待复现', '只观察到一次或来自转述，先当线索不当结论'],
  ['unreproducible', '无法复现', '按记录的条件试过多次不出现；条件缺失或平台已变'],
  ['false-positive', '误报', '现象真实，但归因错了；必须指向真错因'],
  ['invalid', '经验无效', '结论本身错，或平台已改版使前提不成立'],
  ['retired', '已归档', '不再适用于本 skill 的范围，保留备查']
];
export const VERDICT_IDS = new Set(VERDICTS.map(([id]) => id));
/* 失效判决：不再作为排障依据，索引里单独一区 */
export const DEAD = new Set(['unreproducible', 'false-positive', 'invalid', 'retired']);

/* 证据等级：判「结论有多硬」，与判决是两回事 */
export const EVIDENCES = [
  ['source', '源码', '平台源码 / 发布文件里能直接读到'],
  ['probe', '隔离实测', '本机可复现：脚本、无头浏览器、构造输入'],
  ['device', '真站实测', '真实页面 / 真机 + 截图或抓包'],
  ['manual', '他人实测', '别人测的或官方手册写的，本机未复现'],
  ['guess', '推断', '从机制推出来的，没验过']
];
export const EVIDENCE_IDS = new Set(EVIDENCES.map(([id]) => id));
export const HARD_EVIDENCE = new Set(['source', 'probe', 'device', 'manual']);

export const ID_RE = /^E-\d{3}$/;

export function load() {
  if (!fs.existsSync(DATA)) { console.error('找不到 ' + DATA); process.exit(2); }
  return JSON.parse(fs.readFileSync(DATA, 'utf8'));
}

export function save(doc) {
  doc.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(DATA, JSON.stringify(doc, null, 2) + '\n', 'utf8');
}

export function nextId(doc) {
  const n = doc.entries.reduce((m, e) => Math.max(m, Number(String(e.id).slice(2)) || 0), 0);
  return 'E-' + String(n + 1).padStart(3, '0');
}

export function validateEntry(e, all, { allowSelf = null } = {}) {
  const errs = [];
  if (!ID_RE.test(e.id)) errs.push(`编号「${e.id}」必须形如 E-001`);
  if (!e.title || e.title.length < 8 || e.title.length > 60) errs.push('标题长度需在 8–60 字之间');
  if (!Array.isArray(e.versions) || !e.versions.length) errs.push('必须至少标注一个版本（v0 / v1 / both）');
  else for (const v of e.versions) if (!VERSIONS.includes(v)) errs.push(`版本「${v}」必须是 ${VERSIONS.join(' / ')}`);
  if (!LAYER_IDS.has(e.layer)) errs.push(`分层「${e.layer}」不在清单内`);
  if (!SCOPES.includes(e.scope)) errs.push(`归属「${e.scope}」必须是 ${SCOPES.join(' / ')}`);
  if (!VERDICT_IDS.has(e.verdict)) errs.push(`判决「${e.verdict}」不在清单内`);
  if (!EVIDENCE_IDS.has(e.evidence)) errs.push(`证据「${e.evidence}」不在清单内`);
  for (const k of ['symptom', 'cause', 'fix']) {
    if (!e[k] || String(e[k]).trim().length < 8) errs.push(`${k} 太短（至少 8 字，写清具体现象/机理/动作）`);
  }
  /* 自欺守卫 */
  if (e.verdict === 'confirmed' && !HARD_EVIDENCE.has(e.evidence)) {
    errs.push('判决为「已复现」但证据是「推断」：要么补实测，要么降为「待复现」');
  }
  if (e.verdict === 'false-positive' && !e.instead) {
    errs.push('判决为「误报」时必须填 instead——说清真正的原因是什么，否则这条记录没有价值');
  }
  if (e.verdict === 'unreproducible' && Number(e.checks || 0) < 2) {
    errs.push('判决为「无法复现」至少要有 2 次尝试记录（checks）');
  }
  if (e.verdict === 'suspected' && Number(e.checks || 0) > 3) {
    errs.push('试过 3 次以上还没成，应该改成「无法复现」或补条件后重判');
  }
  if (e.verdict === 'retired' && !String(e.note || '').trim()) {
    errs.push('归档必须写理由（--why）——不写理由的归档，下一个人会重新捡起来查一遍');
  }
  for (const f of all) {
    if (allowSelf && f.id === allowSelf) continue;
    if (f.id === e.id) errs.push(`重号：${e.id} 已存在（${f.title}）`);
  }
  return errs;
}
