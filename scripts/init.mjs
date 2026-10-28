#!/usr/bin/env node
/* init.mjs · 骨架就位：assets/skeleton → work/src，并把 persona 样例改成待编辑的正式文件
 * 用法: node init.mjs [--force]     已存在的文件默认不覆盖（--force 才覆盖）
 */
import fs from 'node:fs';
import path from 'node:path';

const force = process.argv.includes('--force');
const from = path.resolve('assets/skeleton');
const to = path.resolve('work/src');

if (!fs.existsSync(from)) { console.error('找不到 assets/skeleton，请在 skill 根目录运行'); process.exit(1); }
fs.mkdirSync(to, { recursive: true });

let copied = 0, kept = 0;
for (const f of fs.readdirSync(from)) {
  if (f === 'persona.example.txt') continue;
  const dst = path.join(to, f);
  if (fs.existsSync(dst) && !force) { console.log('跳过（已存在） ' + f); kept++; continue; }
  fs.copyFileSync(path.join(from, f), dst);
  console.log('写入 ' + f);
  copied++;
}

// 人设：有正式 persona.txt 就不动，否则从样例复制一份
const pDst = path.join(to, 'persona.txt');
if (!fs.existsSync(pDst) || force) {
  const ex = path.join(from, 'persona.example.txt');
  if (fs.existsSync(ex)) { fs.copyFileSync(ex, pDst); console.log('写入 persona.txt（样例，需改写）'); copied++; }
}

console.log(`\nwork/src 就位：新写 ${copied} · 保留 ${kept}`);
console.log('下一步：改 work/src/content.json 与 work/src/persona.txt，然后 node scripts/build.mjs');
