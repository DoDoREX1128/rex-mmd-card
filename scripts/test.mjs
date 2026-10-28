#!/usr/bin/env node
/* test.mjs · 脚本自测：校验器的每条拦截、工具链的每个产物
 * 用法: node scripts/test.mjs [--keep]
 * 退出码: 0 全部通过 / 1 有失败
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const tmp = path.join(root, 'test', 'tmp');
const keep = process.argv.includes('--keep');

if (fs.existsSync(tmp) && !keep) fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

let pass = 0;
const fails = [];
function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log('PASS ' + name + (detail ? '  [' + detail + ']' : '')); }
  else { fails.push(name + (detail ? '  [' + detail + ']' : '')); console.log('FAIL ' + name + (detail ? '  [' + detail + ']' : '')); }
}

function run(script, args) {
  const r = spawnSync(process.execPath, [path.join(here, script), ...args], { cwd: root, encoding: 'utf8' });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
}

/* ---------- 基础卡：一条可见规则 + 一条样式 + 一条脚本 ---------- */
const PERSONA = `<角色设定 名字：禾安>
<基本信息>
- 身份：种子铺守护人
</基本信息>
<与{{user}}的关系>
禾安与{{user}}认识很久，习惯把伞往{{user}}那边偏。
</与{{user}}的关系>
<说话方式>
禾安说话短，不爱解释。
</说话方式>
</角色设定>`;

function card(over = {}) {
  return {
    chatVersion: 1,
    pageDepth: 2,
    statusbar: '【rex-hud】',
    beginning: '雨还在下。【rex-hud】',
    personality: PERSONA,
    regex_scripts: [
      { id: -1, scriptName: 'hud', findRegex: '/【rex-hud】/', replaceString: '<div class="hud">体力 70</div>' },
      { id: -2, scriptName: 'hud-style', findRegex: '/【rex-style】/', replaceString: '<style>[data-chat="root"] .hud{color:var(--chat-text);z-index:10}</style>' },
      { id: -3, scriptName: 'kit', findRegex: '/【rex-kit】/', replaceString: '<script>sdk.on("message:done", function(m){ sdk.save.set("hp", 70).catch(function(){}); });<\\/script>' }
    ],
    ...over
  };
}

function writeCard(name, obj, { bom = false } = {}) {
  const p = path.join(tmp, name + '.json');
  const text = JSON.stringify(obj, null, 2);
  fs.writeFileSync(p, (bom ? '\uFEFF' : '') + text, 'utf8');
  return p;
}

function validate(file, extra = []) {
  const r = run('validate.mjs', [file, '--json', ...extra]);
  let json = null;
  try { json = JSON.parse(r.out); } catch { /* 解析失败时留空 */ }
  return { code: r.code, json, raw: r.out + r.err };
}

const has = (res, kind, re) => ((res.json && res.json[kind]) || []).some((m) => re.test(m));

/* ---------- 1. 合法卡 ---------- */
{
  const res = validate(writeCard('ok', card()));
  ok('合法沙盒卡通过', res.code === 0 && res.json.errors === 0, `E${res.json && res.json.errors}/W${res.json && res.json.warns}`);
  ok('识别平台为 sandbox', res.json && res.json.platform === 'sandbox');
  ok('SDK 名单被记录', res.json && res.json.sdkNames.includes('save.set'), (res.json && res.json.sdkNames || []).join(','));
}

/* ---------- 2. BOM ---------- */
{
  const res = validate(writeCard('bom', card(), { bom: true }));
  ok('BOM 被拦截', res.code === 1 && has(res, 'errorList', /BOM/));
}

/* ---------- 3. 正则语法错 ---------- */
{
  const c = card();
  c.regex_scripts[0].findRegex = '/【rex-hud'; // 只有左斜杠 → 走字面量分支
  const c2 = card();
  c2.regex_scripts[0].findRegex = '/[【rex-hud】/'; // slash 形态但正则语法错
  const res = validate(writeCard('bad-regex', c2));
  ok('slash 语法错被拦截', res.code === 1 && has(res, 'errorList', /静默丢弃整条/));
  const res2 = validate(writeCard('bad-regex-literal', c));
  ok('缺右斜杠按字面量处理并告警', res2.code === 0 && has(res2, 'warnList', /以 \/ 开头但不是合法/));
}

/* ---------- 4. 字面量重复 ---------- */
{
  const c = card();
  c.regex_scripts.push({ id: -4, scriptName: 'dup', findRegex: '雨还在下', replaceString: 'X' });
  c.regex_scripts.push({ id: -5, scriptName: 'dup2', findRegex: '雨还在下', replaceString: 'Y' });
  const res = validate(writeCard('dup-literal', c));
  ok('重复字面量被拦截', res.code === 1 && has(res, 'errorList', /重复/));
}

/* ---------- 5. 可见界面未点火 ---------- */
{
  const c = card();
  c.beginning = '雨还在下。';
  c.statusbar = 'HUD';
  const res = validate(writeCard('unfired', c));
  ok('未接上的可见界面被拦截', res.code === 1 && has(res, 'errorList', /永远不会出现/));
}

/* ---------- 6. 能力名 / 事件名 / 不存在的能力 ---------- */
{
  const c = card();
  c.regex_scripts[2].replaceString = '<script>sdk.inupt.get();<\\/script>';
  ok('能力名拼错被拦截', validate(writeCard('bad-cap', c)).code === 1 && has(validate(writeCard('bad-cap2', c)), 'errorList', /能力名不在清单内/));
}
{
  const c = card();
  c.regex_scripts[2].replaceString = '<script>sdk.once("message:done", function(){});<\\/script>';
  const res = validate(writeCard('absent-cap', c));
  ok('sdk.once 被拦截', res.code === 1 && has(res, 'errorList', /不存在/));
}
{
  const c = card();
  c.regex_scripts[2].replaceString = '<script>sdk.on("message:donee", function(){});<\\/script>';
  const res = validate(writeCard('bad-event', c));
  ok('事件名拼错被拦截', res.code === 1 && has(res, 'errorList', /事件名不在清单内/));
}
{
  const c = card();
  c.regex_scripts[2].replaceString = '<script>if (!sdk.stage) return; sdk.stage.open("full");<\\/script>';
  const res = validate(writeCard('stage-ns', c));
  ok('sdk.stage 命名空间不误报', res.code === 0, (res.json && res.json.errorList || []).join(' | '));
}
{
  const c = card();
  c.regex_scripts[2].replaceString = '<script>sdk.debug.log("sdk.vars unavailable");<\\/script>';
  const res = validate(writeCard('string-sdk', c));
  ok('字符串里的 sdk.xxx 不误报', res.code === 0, (res.json && res.json.errorList || []).join(' | '));
}

/* ---------- 7. z-index / 全局 CSS / 主题变量 ---------- */
{
  const c = card();
  c.regex_scripts[1].replaceString = '<style>.hud{z-index:1500}</style>';
  const res = validate(writeCard('z-dead', c));
  ok('z-index 空档告警', res.code === 0 && has(res, 'warnList', /1000–3499 空档/));
}
{
  const c = card();
  c.regex_scripts[1].replaceString = '<style>*{box-sizing:border-box}</style>';
  const res = validate(writeCard('global-css', c));
  ok('全局选择器被拦截', res.code === 1 && has(res, 'errorList', /全局选择器/));
}
{
  const c = card();
  c.regex_scripts[1].replaceString = '<style>[data-chat="root"]{--chat-bgcolor:#000}</style>';
  const res = validate(writeCard('var-typo', c));
  ok('未知主题变量告警', res.code === 0 && has(res, 'warnList', /未知平台变量/));
}
{
  const c = card();
  c.regex_scripts[1].replaceString = '<style>[data-chat="root"]{--chat-bubble-text:#fff}</style>';
  const res = validate(writeCard('alias', c));
  ok('别名变量写死色值告警', res.code === 0 && has(res, 'warnList', /别名变量/));
}

/* ---------- 8. 标记形态 ---------- */
{
  const c = card();
  c.statusbar = '<rex-hud>';
  c.beginning = '雨还在下。<rex-hud>';
  c.regex_scripts[0].findRegex = '/<rex-hud>/';
  const res = validate(writeCard('angle-marker', c));
  ok('尖括号标记只告警不阻断', res.code === 0 && has(res, 'warnList', /尖括号标记/));
}
{
  const c = card();
  c.beginning = '雨还在下。【rex-hud】【rex-orphan】';
  const res = validate(writeCard('leftover', c));
  ok('无规则的注入标记被拦截', res.code === 1 && has(res, 'errorList', /没有规则匹配/));
}

/* ---------- 9. 版本边界 ---------- */
{
  const legacy = {
    pageDepth: 2,
    statusbar: '【RexHUD 001】',
    beginning: '雨还在下。',
    regex_scripts: [{ id: -1, scriptName: 'init', findRegex: '/【RexHUD 001】/', replaceString: '<div class="hud">HUD</div>' }]
  };
  const res = validate(writeCard('legacy', legacy), ['--platform', 'legacy']);
  ok('旧版四键卡通过', res.code === 0, `E${res.json && res.json.errors}/W${res.json && res.json.warns}`);
  const bad = validate(writeCard('legacy-v1', { ...legacy, chatVersion: 1 }), ['--platform', 'legacy']);
  ok('旧版卡写 chatVersion:1 被拦截', bad.code === 1 && has(bad, 'errorList', /不能是 1/));
  const extra = validate(writeCard('legacy-extra', { ...legacy, entries: {} }), ['--platform', 'legacy']);
  ok('旧版卡混入 entries 被拦截', extra.code === 1 && has(extra, 'errorList', /禁用键/));
}

/* ---------- 10. 人设 ---------- */
{
  const c = card();
  c.personality = '禾安是种子铺守护人。';
  const res = validate(writeCard('persona-bad', c));
  ok('人设缺标签被拦截', res.code === 1 && has(res, 'errorList', /缺 <角色设定/));
}
{
  const c = card();
  c.personality = `<世界观>\n雨多年不停。\n</世界观>\n\n${PERSONA}`;
  const res = validate(writeCard('persona-world', c));
  ok('世界观在前的写法只告警', res.code === 0 && has(res, 'warnList', /人设首块/));
}

/* ---------- 11. 世界书 ---------- */
{
  const wb = path.join(tmp, 'wb-bad.json');
  fs.writeFileSync(wb, JSON.stringify({ entries: [] }), 'utf8');
  const res = validate(writeCard('with-wb', card()), ['--worldbook', wb]);
  ok('世界书 entries 为数组被拦截', res.code === 1 && has(res, 'errorList', /必须是对象/));
}
{
  const wb = path.join(tmp, 'wb-ok.json');
  fs.writeFileSync(wb, JSON.stringify({ entries: {
    0: { uid: 0, key: '["雨"]', comment: '天气', content: '雨多年不停。', constant: true, probability: '100.00' }
  } }), 'utf8');
  const res = validate(writeCard('with-wb-ok', card()), ['--worldbook', wb]);
  ok('合法世界书通过', res.code === 0, (res.json && res.json.errorList || []).join(' | '));
}

/* ---------- 12. 事实表一致性 ---------- */
{
  const r = run('gen-facts.mjs', ['--check']);
  ok('事实表与 facts.json 一致', r.code === 0, r.out.trim() || r.err.trim());
}

/* ---------- 12.5 字段库 ---------- */
{
  const r = run('gen-fields.mjs', ['--check']);
  ok('字段索引与 fields.json 一致', r.code === 0, r.out.trim() || r.err.trim());

  const doc = JSON.parse(fs.readFileSync(path.join(root, 'references', 'fields', 'fields.json'), 'utf8'));
  const nameRe = /^[\u4e00-\u9fa5]{2,4}$/;
  const keyRe = /^[a-z]{2,4}$/;
  const bad = doc.fields.filter((f) => !nameRe.test(f.name) || !keyRe.test(f.key));
  ok('字段名 2–4 汉字、键 2–4 字母', bad.length === 0, bad.slice(0, 3).map((f) => f.name + '/' + f.key).join(','));

  const keys = new Set(), names = new Set();
  let dup = 0;
  doc.fields.forEach((f) => { if (keys.has(f.key) || names.has(f.name)) dup++; keys.add(f.key); names.add(f.name); });
  ok('字段库无重名重键', dup === 0, dup + ' 处重复');

  const cats = new Set(['identity', 'body', 'mind', 'eros', 'rel', 'social', 'res', 'prog', 'combat', 'space', 'time', 'item', 'meta']);
  const badCat = doc.fields.filter((f) => !cats.has(f.category));
  ok('字段分类均在清单内', badCat.length === 0, badCat.slice(0, 3).map((f) => f.name + ':' + f.category).join(','));
}

/* ---------- 12.6 错题本 ---------- */
{
  const r = run('gen-errors.mjs', ['--check']);
  ok('错题本索引与 errors.json 一致', r.code === 0, r.out.trim() || r.err.trim());

  const doc = JSON.parse(fs.readFileSync(path.join(root, 'references', 'errors', 'errors.json'), 'utf8'));
  const ids = new Set();
  let dup = 0, badId = 0, short = 0;
  for (const e of doc.entries) {
    if (!/^E-\d{3}$/.test(e.id)) badId++;
    if (ids.has(e.id)) dup++; ids.add(e.id);
    for (const k of ['symptom', 'cause', 'fix']) if (!e[k] || e[k].trim().length < 8) short++;
  }
  ok('错题编号形如 E-001 且不重复', badId === 0 && dup === 0, `${badId} 个格式错 / ${dup} 个重号`);
  ok('每条都有症状、根因、处置', short === 0, short + ' 处缺失');

  const LAYERS = new Set(['ignite', 'charset', 'regex', 'sdk', 'protocol', 'css', 'data', 'observ', 'accept', 'tooling', 'process']);
  const VERDICTS = new Set(['confirmed', 'suspected', 'unreproducible', 'false-positive', 'invalid', 'retired']);
  const EVID = new Set(['source', 'probe', 'device', 'manual', 'guess']);
  const SCOPES = new Set(['platform', 'author', 'skill']);
  const badEnum = doc.entries.filter((e) => !LAYERS.has(e.layer) || !VERDICTS.has(e.verdict) || !EVID.has(e.evidence) || !SCOPES.has(e.scope));
  ok('分层 / 判决 / 证据 / 归属均在清单内', badEnum.length === 0, badEnum.slice(0, 3).map((e) => e.id).join(','));

  const badVer = doc.entries.filter((e) => !Array.isArray(e.versions) || !e.versions.length || e.versions.some((v) => !['v0', 'v1'].includes(v)));
  ok('每条都标了版本 0 或 1', badVer.length === 0, badVer.slice(0, 3).map((e) => e.id).join(','));

  /* 自欺守卫 */
  const fake = doc.entries.filter((e) => e.verdict === 'confirmed' && e.evidence === 'guess');
  ok('没有「已复现 + 推断」的组合', fake.length === 0, fake.slice(0, 3).map((e) => e.id).join(','));
  const noInstead = doc.entries.filter((e) => e.verdict === 'false-positive' && !e.instead);
  ok('误报必须指向真错因', noInstead.length === 0, noInstead.slice(0, 3).map((e) => e.id).join(','));
  const weak = doc.entries.filter((e) => e.verdict === 'unreproducible' && Number(e.checks || 0) < 2);
  ok('无法复现至少 2 次尝试', weak.length === 0, weak.slice(0, 3).map((e) => e.id).join(','));
}

/* ---------- 13. 工具链 ---------- */
{
  const inWb = path.join(tmp, 'wb-messy.json');
  fs.writeFileSync(inWb, JSON.stringify({
    name: '旧世界书',
    entries: {
      0: { uid: 0, key: ['雨', '旱'], comment: '天气', content: '雨多年不停。', constant: true, probability: 100 },
      1: { uid: 0, key: '风,沙', comment: '风沙', content: '风里带沙。' }
    }
  }), 'utf8');
  const outWb = path.join(tmp, 'wb-norm.json');
  const r = run('worldbook-normalize.mjs', [inWb, '--out', outWb, '--quiet']);
  const norm = fs.existsSync(outWb) ? JSON.parse(fs.readFileSync(outWb, 'utf8')) : null;
  ok('世界书归一化产出 entries', r.code === 0 && norm && norm.entries && !Array.isArray(norm.entries));
  ok('数组关键词转成 JSON 字符串', norm && typeof norm.entries['0'].key === 'string' && JSON.parse(norm.entries['0'].key).length === 2);
  ok('重复 uid 被重编', norm && norm.entries['1'].uid !== norm.entries['0'].uid);
  ok('概率补两位小数', norm && norm.entries['0'].probability === '100.00');
}
{
  const p = path.join(tmp, 'persona.txt');
  fs.writeFileSync(p, PERSONA, 'utf8');
  const wb = path.join(tmp, 'wb-norm.json');
  const out = path.join(tmp, 'packed.txt');
  const r = run('worldbook-pack.mjs', ['--persona', p, '--worldbook', wb, '--out', out, '--quiet']);
  const text = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  ok('世界书并入人设', r.code === 0 && text.includes('<世界设定>') && text.includes('雨多年不停'));
  ok('并入后仍在人设上限内', r.code === 0 && text.length <= 10000, text.length + ' 字');
}
{
  const v2 = {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: '禾安', description: '', personality: PERSONA, first_mes: '雨还在下。',
      extensions: { regex_scripts: [{ id: -1, scriptName: 'hud', findRegex: '/【rex-hud】/', replaceString: '<div>HUD</div>' }] }
    }
  };
  const cp = writeCard('card-v2', v2);
  const png = path.join(tmp, 'card.png');
  const r = run('card-png.mjs', ['--card', cp, '--out', png]);
  const buf = fs.existsSync(png) ? fs.readFileSync(png) : Buffer.alloc(0);
  ok('整卡 PNG 生成并可回读', r.code === 0 && buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a', buf.length + ' B');
}
{
  const v2 = { spec: 'chara_card_v2', spec_version: '2.0', data: { name: '禾安' } };
  const cp = writeCard('card-min', v2);
  const png = path.join(tmp, 'card-min.png');
  const r = run('card-png.mjs', ['--card', cp, '--out', png, '--quiet']);
  ok('缺 extensions 也能封装', r.code === 0 && fs.existsSync(png));
}

/* ---------- 汇总 ---------- */
if (!keep) fs.rmSync(tmp, { recursive: true, force: true });
console.log('\n' + '='.repeat(48));
console.log(`合计 ${pass + fails.length} 项：通过 ${pass} · 失败 ${fails.length}`);
if (fails.length) {
  console.log('\n失败项：');
  fails.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('全部通过');
