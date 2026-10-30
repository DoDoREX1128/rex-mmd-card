#!/usr/bin/env node
/* export-raw.mjs · 平台原始接口数据 → 可导入的角色卡 JSON
 * 用法:
 *   node export-raw.mjs --role role.json --regexp regexp.json --out card.json
 *   node export-raw.mjs --role r.json --regexp x.json --out c.json --personality
 * 说明:
 *   - 按 regexSort 升序还原执行顺序（平台 loadRoleRegex 会 reverse）
 *   - 新版 id 为负整数；旧版 id 固定 -1，独立包不带 chatVersion/personality
 *   - beginning 优先 beginningZh
 *   - chatVersion 归一为 0/1
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
const rolePath = opt('role'); const rexPath = opt('regexp'); const outPath = opt('out', 'card.json');
if (!rolePath || !rexPath) { console.error('用法: node export-raw.mjs --role role.json --regexp regexp.json --out card.json'); process.exit(2); }

const unwrap = (p) => { const j = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); return j && j.data ? j.data : j; };
const role = unwrap(rolePath);
let raw = unwrap(rexPath);
if (!Array.isArray(raw)) raw = raw.regex_scripts || raw.list || [];
const asc = raw.slice().sort((a, b) => (a.regexSort ?? a.sort ?? 0) - (b.regexSort ?? b.sort ?? 0));

const v = Number(role.chatVersion) >= 1 ? 1 : 0;
const rules = asc.map((r, i) => ({
  id: v === 1 ? -(i + 1) : -1,
  scriptName: String(r.name ?? r.scriptName ?? `rule-${i + 1}`),
  findRegex: String(r.regex ?? r.findRegex ?? ''),
  replaceString: String(r.content ?? r.replaceString ?? '')
}));

const beginning = (role.beginningZh && String(role.beginningZh).trim()) ? role.beginningZh : (role.beginning ?? '');
const card = {
  ...(v === 1 ? {chatVersion:1} : {}),
  pageDepth: Number(role.pageDepth ?? 2),
  statusbar: String(role.statusbar ?? ''),
  beginning,
  regex_scripts: rules
};
if (v === 1) {
  const persona = role.personalityZh || role.personality;
  if (persona) card.personality = persona;
}
const personaOut = opt('persona-out') || (v === 0 && flag('personality') ? outPath.replace(/\.json$/i, '') + '-persona.txt' : null);
if (personaOut) {
  const target = path.resolve(personaOut);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, String(role.personalityZh || role.personality || ''), 'utf8');
}

fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(card, null, 2), 'utf8');

const maxR = Math.max(0, ...rules.map((r) => r.replaceString.length));
const total = rules.reduce((n, r) => n + r.replaceString.length, 0);
const sha = crypto.createHash('sha256').update(JSON.stringify(card)).digest('hex').slice(0, 16);
console.log('输出      ', path.resolve(outPath));
console.log('平台      ', v === 1 ? '新版沙盒卡（chatVersion:1）' : '旧版（原生或同层，独立包无 chatVersion）');
console.log('规则数    ', rules.length, '| 总字数', total.toLocaleString(), '| 最大条', maxR.toLocaleString());
console.log('beginning ', String(beginning).length, '字', role.beginningZh ? '(用 beginningZh)' : '(用 beginning)');
console.log('statusbar ', JSON.stringify(card.statusbar));
console.log('内容指纹  ', sha);
if (maxR > 20000) { console.error('存在超过 20000 字的规则，需分片'); process.exit(1); }
