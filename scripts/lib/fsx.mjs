#!/usr/bin/env node
/* lib/fsx.mjs · 目录复制的替代实现
 * 不用 fs.cpSync：它在源路径含中文时会让进程直接死掉（退出码 3221226505，无输出），
 * 逐文件 readdir + copyFile 在各路径下都稳定。
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * 把 from 整棵树复制到 to。
 * opts.skip(relPath) 返回 true 时跳过该分支；relPath 用平台分隔符，根目录为空串。
 */
export function copyTree(from, to, opts = {}) {
  const skip = opts.skip || (() => false);
  const base = from;
  const stack = [[from, to]];

  while (stack.length) {
    const [src, dst] = stack.pop();
    const rel = path.relative(base, src);
    if (rel && skip(rel)) continue;

    const stat = fs.lstatSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      for (const name of fs.readdirSync(src)) stack.push([path.join(src, name), path.join(dst, name)]);
    } else if (stat.isSymbolicLink()) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.symlinkSync(fs.readlinkSync(src), dst);
    } else {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
    }
  }
}

/** 顶层目录黑名单形式，配合 copyTree 的 skip 使用 */
export function skipTop(names) {
  const set = new Set(names);
  return (rel) => set.has(rel.split(path.sep)[0]);
}
