#!/usr/bin/env node
/* gen-facts.mjs · 从 facts.json 生成 references/23-平台-事实表.md
 * 用法: node scripts/gen-facts.mjs [--check]
 *   --check 只比对不写盘，内容不一致时退出码 1（供 test.mjs 用）
 */
import fs from 'node:fs';
import path from 'node:path';
import { F, SKILL_ROOT, CHAT_VARS, LIMIT } from './lib/facts.mjs';

const outFile = path.join(SKILL_ROOT, 'references', '23-平台-事实表.md');
const checkOnly = process.argv.includes('--check');

const L = [];
const p = (s = '') => L.push(s);
const ev = (id) => (F.evidenceLevels.find((e) => e.id === id) || {}).label || id;

p('# 23 · 平台事实表（生成文件）');
p();
p('> 本文件由 `scripts/gen-facts.mjs` 从根目录 `facts.json` 生成，**不要手改**。');
p('> 改事实只改 `facts.json`，再跑 `node scripts/gen-facts.mjs`。叙述性说明见 [21-平台-新页事实](21-平台-新页事实.md)、[22-平台-同层卡架构](22-平台-同层卡架构.md)、[24-平台-旧版事实](24-平台-旧版事实.md)。');
p(`> 生成时间基准：${F.updated} · 事实条数：见各表`);
p();

/* ---------- 版本分流 ---------- */
p('## 1. 版本分流');
p();
p('| | 新版沙盒卡 | 旧版卡 |');
p('|---|---|---|');
p(`| chatVersion | **1** | **0 或缺省** |`);
p(`| 导入顶层键 | ${F.versions.sandbox.topKeys.join(' / ')} | ${F.versions.legacy.topKeys.join(' / ')} |`);
p(`| 可选键 | ${F.versions.sandbox.optionalTopKeys.join(' / ') || '无'} | ${F.versions.legacy.optionalTopKeys.join(' / ') || '无'} |`);
p(`| 禁用键 | ${F.versions.sandbox.forbiddenTopKeys.join(' / ')} | ${F.versions.legacy.forbiddenTopKeys.join(' / ')} |`);
p(`| 规则字段 | ${F.versions.sandbox.ruleKeys.join(' / ')} | ${F.versions.legacy.ruleKeys.join(' / ')} |`);
p(`| 规则 id | ${F.versions.sandbox.idRule} | ${F.versions.legacy.idRule} |`);
p();
p('两条路线的事实**不可互相套用**：新版没有 iframe 与原生动作，旧版没有 `sdk.*` 与 `[data-chat]`。');
p();

/* ---------- 限额 ---------- */
p('## 2. 限额');
p();
p('| 字段 | 值 | 说明 | 证据 |');
p('|---|---|---|---|');
const lim = [
  ['scriptName', `${F.limits.common.scriptName.use}`, `UI 显示 ${F.limits.common.scriptName.ui} / 源码常量 ${F.limits.common.scriptName.source}，交付按 UI 值`, F.limits.common.scriptName.evidence],
  ['findRegex', `${F.limits.common.findRegex.use}`, `UI 显示 ${F.limits.common.findRegex.ui} / 源码常量 ${F.limits.common.findRegex.source}，交付按 UI 值`, F.limits.common.findRegex.evidence],
  ['replaceString', `${F.limits.common.replaceString.use}`, `编辑器上限 ${F.limits.common.replaceString.editor} / 导入路径 ${F.limits.common.replaceString.import}；超编辑器上限表现为整条改动不保存`, F.limits.common.replaceString.evidence],
  ['regex_scripts 条数', `${F.limits.common.rules.max}`, '导入时超出直接截断', F.limits.common.rules.evidence],
  ['statusbar', `${F.limits.sandbox.statusbar.max}`, '两版一致', F.limits.sandbox.statusbar.evidence],
  ['beginning', `${F.limits.sandbox.beginning.max}`, '两版一致；官方旧文档写 10240 已被源码证伪', F.limits.sandbox.beginning.evidence],
  ['personality', `${F.limits.sandbox.personality.max}`, '公开卡审核另有 2000–15000 口径', F.limits.sandbox.personality.evidence],
  ['imageUrl', `${F.limits.sandbox.imageUrl.max}`, '超出静默截断', F.limits.sandbox.imageUrl.evidence],
  ['世界书单条 content', `${F.limits.common.worldbookEntryContent.max}`, '超出截断', F.limits.common.worldbookEntryContent.evidence],
  ['世界书条目标题', `${F.limits.common.worldbookComment.max}`, '中文一字算 1，标点计入', F.limits.common.worldbookComment.evidence],
  ['旧版固定传输', `${F.limits.legacy.fixedTransmission.max}`, '人设 + 世界设定合计，超出截断', F.limits.legacy.fixedTransmission.evidence]
];
lim.forEach((r) => p(`| ${r[0]} | ${r[1]} | ${r[2]} | ${ev(r[3])} |`));
p();
p(`公开发布口径（仅新版，\`validate --publish\`）：固定传输 ${F.limits.sandbox.publish.transmissionChars.join('–')} 字，beginning ≥ ${F.limits.sandbox.publish.beginningMin} 字。`);
p();

/* ---------- SDK ---------- */
p('## 3. SDK 能力与事件');
p();
p(`能力 ${F.capabilities.length} 个：`);
p();
p('```');
p(F.capabilities.join('  '));
p('```');
p();
p(`事件 ${F.events.length} 个（拼错不报错，只是永不触发）：`);
p();
p('```');
p(F.events.join('  '));
p('```');
p();
p('| 事件 | 载荷 |');
p('|---|---|');
Object.entries(F.eventPayloads).forEach(([k, v]) => p(`| ${k} | ${v} |`));
p();
p(`冷启动到达顺序：${F.eventOrder.coldStart.join(' → ')}；补发：${F.eventOrder.replay.join(' / ')}；不补发：${F.eventOrder.noReplay.join(' / ')}。`);
p();
p(`不存在的能力：${F.absentCapabilities.join(' / ')}。`);
p();

/* ---------- 选择器 ---------- */
p('## 4. 选择器与槽位');
p();
p(`稳定钩子 \`[data-chat="…"]\`：${F.selectors.chat.join(' / ')}。`);
p();
p('| 槽位 | 说明 |');
p('|---|---|');
Object.entries(F.selectors.slotNotes).forEach(([k, v]) => p(`| ${k} | ${v} |`));
p();
p(`窄屏可能缺失：${F.selectors.slotsMissingOnNarrow.join(' / ')}。`);
p();
p('| 节点 | 状态属性 |');
p('|---|---|');
Object.entries(F.selectors.stateAttrs).forEach(([k, v]) => p(`| ${k} | ${v.join('；')} |`));
p();

/* ---------- 变量 ---------- */
p('## 5. 主题变量（29 个）');
p();
p(`定义在 ${F.chatVars.definedOn.join(' 与 ')}；没有 \`:root\` 定义、没有 \`prefers-color-scheme\`。`);
p();
p('| 组 | 变量 |');
p('|---|---|');
p(`| 气泡 / 整页（${F.chatVars.groups.bubblePage.length}） | ${F.chatVars.groups.bubblePage.join(' ')} |`);
p(`| 底栏与白名单弹窗（${F.chatVars.groups.composerAndModal.length}） | ${F.chatVars.groups.composerAndModal.join(' ')} |`);
p(`| 别名（${F.chatVars.groups.alias.length}） | ${F.chatVars.groups.alias.join(' ')} |`);
p();
p('| 别名变量 | 应写为 |');
p('|---|---|');
Object.entries(F.chatVars.aliases).forEach(([k, v]) => p(`| ${k} | ${v} |`));
p();
p(F.chatVars.overrideNote);
p();

/* ---------- z-index ---------- */
p('## 6. z-index');
p();
p('| 层 | 值 |');
p('|---|---|');
Object.entries(F.zIndex.sandbox.platform).forEach(([k, v]) => p(`| ${k} | ${v} |`));
p();
p(`作者安全带（新版）：装饰 ${F.zIndex.sandbox.author.decoration.join('–')}，页面级浮层 **${F.zIndex.sandbox.author.overlay.join('–')}**，空档 ${F.zIndex.sandbox.author.deadBand.join('–')} 不要用。`);
p();
p(F.zIndex.sandbox.author.note);
p();
p('旧版层级参照：');
p();
p('| 节点 | 值 |');
p('|---|---|');
Object.entries(F.zIndex.legacy.platform).forEach(([k, v]) => p(`| ${k} | ${v} |`));
p();
p(F.zIndex.legacy.note);
p();

/* ---------- 错误码 ---------- */
p('## 7. 错误码与限频');
p();
p(`源码 ${F.errorCodes.source.length} 个：${F.errorCodes.source.join(' / ')}。`);
p();
p(`contract.json 收录 ${F.errorCodes.inContract.length} 个，漏记：${F.errorCodes.extraInSource.join(' / ')}。`);
p();
p(`限频窗口 ${F.rateLimits.window} 秒：${Object.entries(F.rateLimits.perWindow).map(([k, v]) => `${k} ${v} 次`).join('；')}。`);
p();

/* ---------- 瘦预览 ---------- */
p('## 8. 瘦预览（创卡页）能力矩阵');
p();
p(`同步抛错：${F.preview.thin.throws.join(' / ')}`);
p();
p(`返回 undefined：${F.preview.thin.undefined.join(' / ')}`);
p();
p(`返回 NOT_SUPPORTED：${F.preview.thin.notSupported.join(' / ')}`);
p();
p(`仍可用：${F.preview.thin.works.join(' / ')}`);
p();
p(`固定返回值：${Object.entries(F.preview.thin.returns).map(([k, v]) => `${k} → ${JSON.stringify(v)}`).join('；')}`);
p();
p(F.preview.thin.note);
p();

/* ---------- 正则 ---------- */
p('## 9. 正则与替换机制');
p();
p(`slash 形态合法 flags：\`${F.regex.slashFlags}\`，缺 \`g\` 自动补；字面量分支对元字符转义。`);
p();
p(`写成 \`/…/\` 但语法错：${F.regex.badSlash}。`);
p();
p(`\`${F.regex.disablePrefix}\` 前缀：整条规则被丢弃，可用于临时停用。执行顺序：${F.regex.order}。`);
p();
p(`输出预算：\`${F.regex.budget.formula}\`；超限时${F.regex.budget.onExceed}。`);
p();
p(`替换记号：${F.regex.tokens.join(' / ')}。`);
p();

/* ---------- 净化 ---------- */
p('## 10. 净化');
p();
p(`白名单 ${F.sanitizer.whitelist.length} 项：${F.sanitizer.whitelist.join(' ')}。`);
p();
p(`会被删除：${F.sanitizer.removed.join(' / ')}；属性：${F.sanitizer.removedAttrs.join(' / ')}。`);
p();
p(`${F.sanitizer.keptEventAttrs}。`);
p();
p(F.sanitizer.stripRule);
p();

/* ---------- 静默失败 ---------- */
p('## 11. 静默失败清单');
p();
F.silentFailures.forEach((s, i) => p(`${i + 1}. ${s}`));
p();

/* ---------- 证据等级 ---------- */
p('## 12. 证据等级');
p();
p('| 等级 | 含义 |');
p('|---|---|');
F.evidenceLevels.forEach((e) => p(`| ${e.label} | ${e.meaning} |`));
p();
p('采信顺序：源码确证 > 实机实测 > 官方手册 > 外部整理。冲突时按上一级覆盖，并把复现步骤写进交付说明。');
p();

const text = L.join('\n');
fs.mkdirSync(path.dirname(outFile), { recursive: true });

if (checkOnly) {
  const old = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  if (old.trim() !== text.trim()) {
    console.error('事实表与 facts.json 不一致，请重跑 node scripts/gen-facts.mjs');
    process.exit(1);
  }
  console.log('事实表与 facts.json 一致');
  process.exit(0);
}

fs.writeFileSync(outFile, text, 'utf8');
console.log('已生成 ' + path.relative(SKILL_ROOT, outFile) + `（${text.split('\n').length} 行 / ${CHAT_VARS.length} 个变量 / 限额 ${Object.keys(LIMIT).length} 项）`);
