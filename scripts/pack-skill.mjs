#!/usr/bin/env node
/* pack-skill.mjs · 生成可安装的技能副本（排除工作现场）
 * 用法: node scripts/pack-skill.mjs [--out dist/rex-mmd-skill] [--force]
 * 说明: 技能安装只需要 SKILL.md / facts.json / references / scripts / assets / examples / README。
 *       work/（做卡产物，常含上百张 PNG）、test/tmp、.git 一律不带。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const out = path.resolve(arg('out', path.join(root, 'dist', 'rex-mmd-skill')));
const force = process.argv.includes('--force');

const SHIP = ['SKILL.md', 'README.md', 'facts.json', 'references', 'scripts', 'assets', 'examples'];
const SKIP_DIR = new Set(['work', 'test', 'dist', 'node_modules', '.git', '.idea', '.vscode']);
const SKIP_FILE = /\.(tmp\.html|log)$/i;

if (fs.existsSync(out)) {
  if (!force) {
    console.error('目标已存在：' + out + '\n加 --force 覆盖（会先删除该目录）');
    process.exit(2);
  }
  fs.rmSync(out, { recursive: true, force: true });
}
fs.mkdirSync(out, { recursive: true });

let files = 0, bytes = 0;
const missing = [];

function copy(rel) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) { missing.push(rel); return; }
  const stat = fs.statSync(src);
  if (stat.isFile()) {
    if (SKIP_FILE.test(rel)) return;
    const dst = path.join(out, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    files++; bytes += stat.size;
    return;
  }
  for (const name of fs.readdirSync(src)) {
    if (SKIP_DIR.has(name)) continue;
    copy(path.join(rel, name));
  }
}

SHIP.forEach(copy);
if (missing.length) {
  console.error('缺少待打包项: ' + missing.join(', '));
  process.exit(1);
}

/* 回读校验：确认没有把工作现场带进来 */
const bad = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const rel = path.relative(out, p).replace(/\\/g, '/');
    if (fs.statSync(p).isDirectory()) {
      if (SKIP_DIR.has(name)) bad.push(rel + '/');
      else walk(p);
    } else if (name.endsWith('.png') && rel.startsWith('work/')) bad.push(rel);
  }
})(out);

console.log('技能包已生成');
console.log('  目录    ' + out);
console.log('  文件    ' + files + ' 个');
console.log('  体积    ' + (bytes / 1024 / 1024).toFixed(2) + ' MB');
console.log('  排除    work/ test/tmp dist/ .git');
if (bad.length) {
  console.error('  异常    包含不应打包的路径: ' + bad.slice(0, 5).join(', '));
  process.exit(1);
}
console.log('  校验    无工作现场残留');
