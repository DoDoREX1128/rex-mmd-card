#!/usr/bin/env node
/* install.mjs · 把本技能装到宿主的 skills 目录
 *
 * 用法:
 *   node scripts/install.mjs --target workbuddy
 *   node scripts/install.mjs --target codex --scope project --dir D:/my-card
 *   node scripts/install.mjs --target claude --dry-run
 *
 * 参数:
 *   --target    workbuddy | codex | claude     必填
 *   --scope     user（默认）| project
 *   --dir       project 作用域下的项目根目录，默认当前工作目录
 *   --force     覆盖同名旧版本（旧目录改名为 .old-<时间戳> 保留，不删除）
 *   --dry-run   只打印目标路径，不写盘
 *
 * 为什么要有这个脚本: 技能目录名必须与 SKILL.md 的 name 一致（rex-mmd-card），
 * 且 SKILL.md 必须在目录根部。手工复制时最容易多套一层 exe 解压目录，
 * 表现为「装好了但宿主扫不到」——又是一次没有报错的失败。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const SKILL_NAME = 'rex-mmd-card';
const HOME = os.homedir();

/* 不装进用户目录的东西: 做卡现场、构建产物、版本库、依赖 */
const EXCLUDE_TOP = new Set(['work', 'dist', 'test', 'node_modules', '.git', '.idea', '.vscode']);

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};
const has = (k) => process.argv.includes('--' + k);

const TARGETS = {
  workbuddy: { label: 'WorkBuddy', user: ['.workbuddy', 'skills'] },
  codex: { label: 'Codex', user: ['.agents', 'skills'] },
  claude: { label: 'Claude Code', user: ['.claude', 'skills'] },
};

function fail(msg, code = 1) {
  console.error('\n✗ ' + msg);
  process.exit(code);
}

const target = (arg('target', '') || '').toLowerCase();
if (!target) {
  console.error('用法: node scripts/install.mjs --target workbuddy|codex|claude [--scope user|project] [--dir 路径] [--force] [--dry-run]');
  process.exit(2);
}
if (!TARGETS[target]) fail(`未知 --target: ${target}（可选 workbuddy / codex / claude）`);
const cfg = TARGETS[target];
const scope = (arg('scope', 'user') || '').toLowerCase();
if (!['user', 'project'].includes(scope)) fail(`未知 --scope: ${scope}（可选 user / project）`);

/* Codex 若设了 CODEX_HOME，优先装到它下面 */
function baseDir() {
  if (scope === 'project') return path.resolve(arg('dir', process.cwd()));
  if (target === 'codex' && process.env.CODEX_HOME) return path.resolve(process.env.CODEX_HOME);
  return HOME;
}

const base = baseDir();
const skillsRoot = path.join(base, ...cfg.user);
const dest = path.join(skillsRoot, SKILL_NAME);

/* 自装检测: 从已安装目录里再装一次会自我递归 */
const rel = path.relative(root, dest);
if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
  fail(`目标目录与源目录重叠: ${dest}\n从已安装的副本里运行安装器不会有效果，请在 git clone 出来的目录里运行。`);
}

/* 前置校验: 源必须是一个合规的技能目录 */
const srcSkill = path.join(root, 'SKILL.md');
if (!fs.existsSync(srcSkill)) fail(`源目录里没有 SKILL.md: ${root}`);

const fm = fs.readFileSync(srcSkill, 'utf8').slice(0, 2000);
const nameMatch = fm.match(/^---[\s\S]*?^name:\s*(.+?)\s*$/m);
if (!nameMatch) fail('SKILL.md 缺少 name 字段');
const declaredName = nameMatch[1].trim();
if (declaredName !== SKILL_NAME) {
  fail(`SKILL.md 的 name 是「${declaredName}」，与安装目录名「${SKILL_NAME}」不一致。\n规范要求两者相同，否则部分宿主会静默跳过这个技能。`);
}

console.log('Rex-MMD角色卡 · 安装');
console.log('  宿主    ' + cfg.label);
console.log('  作用域  ' + scope + (scope === 'project' ? '（' + base + '）' : ''));
console.log('  目标    ' + dest);

if (has('dry-run')) {
  console.log('\n[dry-run] 未写入任何文件。去掉 --dry-run 即可安装。');
  process.exit(0);
}

/* 已存在: 改名保留，不删除用户已有副本 */
if (fs.existsSync(dest)) {
  if (!has('force')) {
    fail(`目标已存在: ${dest}\n加 --force 覆盖（旧版会改名保留为 .old-<时间戳>，不会删除）`, 2);
  }
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const backup = `${dest}.old-${stamp}`;
  try {
    fs.renameSync(dest, backup);
    console.log('  旧版    → ' + path.basename(backup) + '（保留，确认新版本可用后可手动删除）');
  } catch (e) {
    fail(`旧版目录改名失败（可能被宿主占用，先关掉宿主再试）: ${e.message}`);
  }
}

/* 复制 */
let files = 0, bytes = 0;
fs.mkdirSync(skillsRoot, { recursive: true });
fs.cpSync(root, dest, {
  recursive: true,
  filter: (src) => {
    const r = path.relative(root, src);
    if (r === '') return true;
    const top = r.split(path.sep)[0];
    if (EXCLUDE_TOP.has(top)) return false;
    if (/\.tmp\.html$/i.test(r)) return false;
    return true;
  },
});

(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else { files++; bytes += st.size; }
  }
})(dest);

/* 回读校验: 装完必须能读到 SKILL.md，且 name 与目录名一致 */
const okSkill = fs.existsSync(path.join(dest, 'SKILL.md'));
const okRefs = fs.existsSync(path.join(dest, 'facts.json')) && fs.existsSync(path.join(dest, 'references'));
if (!okSkill || !okRefs) fail(`复制不完整: ${dest}\n目录里缺少 SKILL.md 或 facts.json / references`);

console.log('\n✓ 已安装');
console.log('  文件    ' + files + ' 个 / ' + (bytes / 1024).toFixed(0) + ' KB');

const next = {
  workbuddy: [
    '重开一个会话，在侧栏「技能」里应能看到 ' + SKILL_NAME,
    '试一句：「帮我做一张 MMD 角色卡，先告诉我该选哪条路线」',
  ],
  codex: [
    '输入 /skills 应能看到 ' + SKILL_NAME,
    '显式调用：$' + SKILL_NAME + '；或直接描述任务让它自动匹配',
  ],
  claude: [
    '新会话里询问可用技能，应能看到 ' + SKILL_NAME,
    '直接描述任务即可，按 description 自动匹配',
  ],
}[target];

console.log('\n下一步');
next.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
console.log('\n卸载: 直接删掉 ' + dest);
