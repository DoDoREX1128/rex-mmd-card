#!/usr/bin/env node
/* validate.mjs · 交付门禁（事实库驱动）
 * 用法:
 *   node scripts/validate.mjs <regex.json> [--platform auto|sandbox|legacy|same]
 *        [--persona f] [--worldbook f] [--publish] [--json] [--quiet]
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  LIMIT, F, CAPS_SET, NAMESPACES, EVENTS_SET, ABSENT,
  CHAT_VAR_SET, CHAT_VAR_ALIASES, marker, findIgnitionMarkers, zIndexVerdict,
  stripStringsAndComments, platformOf, spec, parseArgs, fail
} from './lib/facts.mjs';

const { positional, opts } = parseArgs(process.argv);
const file = positional[0];
if (!file) fail('用法: node scripts/validate.mjs <regex.json> [--persona f] [--worldbook f] [--platform sandbox|legacy] [--publish] [--json]');

const E = [];
const W = [];
const S = { checks: [] };
const err = (m) => E.push(m);
const warn = (m) => W.push(m);
const ran = (name) => S.checks.push({ name });

/* ---------- 读取 ---------- */
const buf = fs.readFileSync(file);
if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) err('文件带 UTF-8 BOM，平台可能拒绝');
let card;
try {
  card = JSON.parse(buf.toString('utf8').replace(/^\uFEFF/, ''));
} catch (e) {
  console.error('JSON 解析失败: ' + e.message);
  process.exit(1);
}
ran('BOM 与 JSON 语法');

/* ---------- 平台判定 ---------- */
const raw = String(opts.platform || 'auto').toLowerCase();
const alias = { same: 'legacy', mmd: 'legacy', old: 'legacy', sandbox: 'sandbox', new: 'sandbox', '0': 'legacy', '1': 'sandbox' };
let platform = alias[raw] || raw;
if (platform === 'auto') platform = platformOf(card.chatVersion);
if (!platform || !F.versions[platform]) fail(`无法判定平台：chatVersion=${JSON.stringify(card.chatVersion)}；请用 --platform sandbox|legacy`);
const V = spec(platform);
const isSandbox = platform === 'sandbox';

if (isSandbox && Number(card.chatVersion) !== 1) {
  err(`新版沙盒卡 chatVersion 必须是 1，当前 ${JSON.stringify(card.chatVersion)}；写 0 会落到旧页，sdk.* 与 [data-chat] 全部不存在且无报错`);
}
if (!isSandbox && Number(card.chatVersion) === 1) {
  err('旧版卡的 chatVersion 不能是 1；写 1 会被当成新页，原生桥接全部失效且无报错');
}
ran('chatVersion 与平台一致');

/* ---------- 顶层键 ---------- */
const keys = Object.keys(card);
const forbidden = keys.filter((k) => V.forbiddenTopKeys.includes(k));
const unknown = keys.filter((k) => !V.topKeys.includes(k));
const missing = V.requiredTopKeys.filter((k) => !keys.includes(k));
if (forbidden.length) err('顶层出现当前版本禁用键: ' + forbidden.join(','));
if (missing.length) err('顶层缺键: ' + missing.join(','));
if (unknown.length) warn('顶层有导入页不认识的键: ' + unknown.join(','));
if (isSandbox && !('personality' in card)) warn('新版沙盒卡建议带 personality 留档（导入正则不读它，人设仍需另贴）');
ran('顶层键白名单');

/* ---------- 标量字段 ---------- */
if (card.pageDepth !== V.pageDepth) warn(`pageDepth 建议为 ${V.pageDepth}，当前 ${JSON.stringify(card.pageDepth)}`);

const sbLen = String(card.statusbar || '').length;
if (!String(card.statusbar || '').trim()) err('statusbar 为空');
else if (sbLen > LIMIT.statusbar) err(`statusbar ${sbLen} 字，超过 ${LIMIT.statusbar}`);

const begLen = String(card.beginning || '').length;
if (!String(card.beginning || '').trim()) err('beginning 为空');
else if (begLen > LIMIT.beginning) err(`beginning ${begLen} 字，超过 ${LIMIT.beginning}`);

const personaInline = String(card.personality || '');
if (personaInline.length > LIMIT.personality) err(`personality ${personaInline.length} 字，超过 ${LIMIT.personality}`);
ran('标量长度');

/* ---------- 规则 ---------- */
const rules = Array.isArray(card.regex_scripts) ? card.regex_scripts : null;
const literalSeen = new Map();
const sdkNames = [];
const sdkEvents = [];

const styleBlocks = (s) => [...String(s).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
const visiblePart = (s) => String(s).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
const isScriptFirst = (s) => /^\s*<(script|style)\b/i.test(String(s));

if (!rules) err('regex_scripts 不是数组');
else {
  if (rules.length > LIMIT.rules) err(`规则数 ${rules.length}，超过 ${LIMIT.rules}`);

  rules.forEach((r, i) => {
    const tag = `#${i + 1} ${(r && r.scriptName) || ''}`.trim();
    if (!r || typeof r !== 'object') { err(tag + ' 不是对象'); return; }

    const ks = Object.keys(r);
    const ex = ks.filter((k) => !V.ruleKeys.includes(k));
    const mi = V.ruleKeys.filter((k) => !ks.includes(k));
    if (ex.length) err(`${tag} 多出键: ${ex.join(',')}`);
    if (mi.length) err(`${tag} 缺键: ${mi.join(',')}`);

    if (typeof r.id !== 'number' || r.id >= 0) err(`${tag} id 必须是负数`);
    if ((r.scriptName || '').length > LIMIT.scriptName) err(`${tag} scriptName 超过 ${LIMIT.scriptName} 字`);

    const fr = String(r.findRegex ?? '');
    const rs = String(r.replaceString ?? '');
    if (fr.length > LIMIT.findRegex) err(`${tag} findRegex ${fr.length} 字，超过 ${LIMIT.findRegex}`);
    if (rs.length > LIMIT.replaceString) {
      err(`${tag} replaceString ${rs.length} 字，超过编辑器上限 ${LIMIT.replaceString}（超限表现为整条改动不保存，不是截断）`);
    }
    if (!fr.trim()) err(`${tag} findRegex 为空`);

    /* 匹配式形态与重复 */
    const trimmed = fr.trim().replace(/^`|`$/g, '');
    const slash = /^\/([\s\S]+)\/([gimsuy]*)$/.exec(trimmed);
    if (slash) {
      try { new RegExp(slash[1], slash[2] || ''); }
      catch (e) { err(`${tag} findRegex 写成 /…/ 但语法错，平台会静默丢弃整条: ${e.message}`); }
    } else {
      if (trimmed.startsWith('/')) warn(`${tag} findRegex 以 / 开头但不是合法 /…/ 形态，会按字面量处理（多半永不命中）`);
      if (literalSeen.has(trimmed)) err(`${tag} 字面量匹配式与 #${literalSeen.get(trimmed)} 重复，后一条永远匹配不到`);
      else literalSeen.set(trimmed, i + 1);
      if (/[.*+?^${}()|[\]\\]/.test(trimmed)) warn(`${tag} 走字面量分支，元字符会被转义（a.b 不匹配 axb）；要正则请写 /…/`);
    }

    /* 标记形态与内容禁令 */
    if (/<rex-[a-z0-9-]+>/.test(fr)) {
      warn(`${tag} findRegex 用了 <rex-…> 尖括号标记，建议改为 ${marker('rex-x')} 形态，避免创卡页对 HTML 标签的文案禁令`);
    }
    if (/<script|<style/i.test(fr)) err(`${tag} findRegex 含 <script>/<style> 标签`);

    /* 可见 HTML 的标记必须接进 beginning/statusbar */
    const mk = /^\/(?:【|<)(rex-[a-z0-9-]+)(?:】|>)\/$/.exec(trimmed);
    if (mk) {
      const name = mk[1];
      const visible = !isScriptFirst(rs) && /<(div|button|span|section|svg|ul|table|canvas)\b/i.test(rs);
      if (visible) {
        const src = String(card.beginning || '') + '\n' + String(card.statusbar || '');
        if (!src.includes(marker(name)) && !src.includes(`<${name}>`)) {
          err(`规则 ${name} 产出可见 UI，但标记 ${marker(name)} 不在 beginning/statusbar 里，界面永远不会出现`);
        }
      }
    }

    /* CSS：全局选择器、z-index、主题变量 */
    styleBlocks(rs).forEach((css) => {
      const bare = stripStringsAndComments(css);
      if (/(^|\n)\s*(?:html|body|\*|:root)\s*\{/i.test(bare)) {
        err(`${tag} <style> 里出现全局选择器（* / html / body / :root），应改为 [data-chat="root"] 作用域`);
      }
      for (const m of bare.matchAll(/z-index\s*:\s*(-?\d+)/gi)) {
        const v = zIndexVerdict(m[1], platform);
        if (v.level === 'warn') warn(`${tag} ${v.message}`);
      }
      for (const m of bare.matchAll(/(--chat-[a-z0-9-]+)\s*:/gi)) {
        const name = m[1];
        if (!CHAT_VAR_SET.has(name)) {
          warn(`${tag} 出现未知平台变量 ${name}（平台共 ${F.chatVars.total} 个，见 23-平台-事实表）`);
        }
        if (CHAT_VAR_ALIASES[name]) {
          const after = bare.slice(m.index + m[0].length).split(';')[0].trim();
          if (!/^var\(/.test(after)) warn(`${tag} 别名变量 ${name} 应写成 ${CHAT_VAR_ALIASES[name]}，写死色值会切断主题传导链`);
        }
      }
    });

    /* 净化与 Markdown */
    const visible = visiblePart(rs);
    if (/\b(?:iframe|link|meta|base|form|object|embed)\b/i.test(visible)) {
      warn(`${tag} 可见 HTML 里出现白名单外标签（iframe/link/meta/base/form/object/embed），会被净化删除`);
    }
    if (/\n {4,}</.test(visible)) warn(`${tag} 可见 HTML 有四空格缩进，Markdown 会当成代码块`);
    if (/\bdata-[a-z][\w-]*=/.test(visible)) {
      const allowed = /data-(?:rex|chat|slot|host)[\w-]*=/.test(visible);
      if (!allowed) warn(`${tag} 静态标记里出现自写 data-* 属性，会被净化删除；改用 class/id`);
    }

    /* SDK：先剥字符串与注释，避免把日志文案当调用 */
    if (isSandbox) {
      const code = stripStringsAndComments(rs);
      for (const m of code.matchAll(/\bsdk\.([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)/g)) {
        const name = m[1];
        sdkNames.push(name);
        const head = name.split('.')[0];
        if (CAPS_SET.has(name) || CAPS_SET.has(head) || NAMESPACES.has(head)) continue;
        if (ABSENT.has(head) || ABSENT.has(name)) {
          err(`${tag} sdk.${name} 不存在；平台没有 once / off / vars / theme.set / memory，需要一次性逻辑请自加幂等哨兵`);
          continue;
        }
        err(`${tag} 能力名不在清单内: sdk.${name}（拼错不报错、永不生效）`);
      }
      for (const m of rs.matchAll(/\bsdk\.on\s*\(\s*(['"])([^'"]+)\1/g)) {
        sdkEvents.push(m[2]);
        if (!EVENTS_SET.has(m[2])) err(`${tag} 事件名不在清单内: ${m[2]}`);
      }
      if (/message:mount[\s\S]{0,600}?sdk\.on\s*\(/.test(code)) warn(`${tag} 疑似把 sdk.on 写进 message:mount 回调，每挂一条气泡会多订一份订阅`);
      if (/message:mount[\s\S]{0,600}?message-body/.test(code)) warn(`${tag} 在 message:mount 里读 message-body 当正文，会读到「消息生成中」占位`);
    } else if (/sdk\.[a-zA-Z]+\s*\(/.test(rs)) {
      warn(`${tag} 旧版卡里调用了 sdk.*（只有新页存在这些接口）`);
    }
  });

  /* 旧版：独立点火链完整性 */
  if (!isSandbox) {
    const srcText = String(card.statusbar || '') + String(card.beginning || '');
    const declared = [...new Set(srcText.match(/【([^】]{1,24}?)\s(\d{2,4})】/g) || [])];
    if (declared.length >= 2) {
      const prefix = declared[0].replace(/^【/, '').replace(/\s\d{2,4}】$/, '');
      const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`【${esc}\\s(\\d{2,4})】`);
      const nums = declared.map((m) => Number(re.exec(m)[1])).sort((a, b) => a - b);
      const matched = rules.map((r) => { const m = re.exec(String(r.findRegex || '')); return m ? Number(m[1]) : null; }).filter(Boolean);
      const miss = nums.filter((n) => !matched.includes(n));
      if (miss.length) err(`起点里有 ${miss.length} 个标记没有对应规则（不会点火）: ${miss.slice(0, 6).join(',')}`);
      if (nums[0] !== 1 || nums.some((n, i) => n !== i + 1)) err(`标记编号不连续：${nums.slice(0, 8).join(',')}…`);
      const last = rules[rules.length - 1];
      if (re.test(String(last.replaceString || ''))) warn('最后一条规则仍带分片标记（链尾残留，会显示在页面上）');
    }
    ran('旧版点火链');
  }
}

/* ---------- 注入标记覆盖 ---------- */
const allText = String(card.beginning || '') + '\n' + String(card.statusbar || '');
const leftovers = findIgnitionMarkers(allText).filter((name) => !(rules || []).some((r) => String(r.findRegex || '').includes(name)));
if (leftovers.length) err('这些注入标记没有规则匹配，会原样显示给玩家: ' + [...new Set(leftovers)].join(', '));
ran('标记点火覆盖');

/* ---------- 人设 ---------- */
let personaText = personaInline;
if (opts.persona) {
  personaText = fs.readFileSync(opts.persona, 'utf8').replace(/^\uFEFF/, '');
  if (personaText.length > LIMIT.personality) err(`人设 ${personaText.length} 字，超过 ${LIMIT.personality}`);
  ran('人设文件');
}
if (personaText) {
  if (/<script|<style|sdk\./i.test(personaText)) err('人设里出现 HTML / 脚本 / sdk 调用（人设只放自然语言）');
  if (/\{\{char\}\}|\$#char#\$|\$#user#\$/.test(personaText)) err('人设用了 {{char}} / $#char#$ / $#user#$，应写真实角色名 + {{user}}');
  if (!/<\/?角色设定/.test(personaText)) err('人设缺 <角色设定 名字：…> 块');
  if (!/\{\{user\}\}/.test(personaText)) warn('人设里没有 {{user}}');

  const stack = [];
  const tags = personaText.match(/<\/?([\u4e00-\u9fffA-Za-z][\w\u4e00-\u9fff]*)(?:\s[^>]*)?>/g) || [];
  let pairs = 0;
  tags.forEach((t) => {
    const close = /^<\//.test(t);
    const name = /^<\/?([^\s>/]+)/.exec(t)[1];
    if (!close) stack.push(name);
    else {
      const top = stack.pop();
      pairs++;
      if (top !== name) err(`人设标签交叉/不匹配：闭合 </${name}> 时栈顶是 <${top}>`);
    }
  });
  if (stack.length) err('人设标签未闭合: ' + stack.join(','));
  if (pairs < 3) warn(`人设成对标签只有 ${pairs} 组（建议 ≥3）`);
  if (/^【[^】]+】\s*$/m.test(personaText)) warn('人设里出现【章节】方括号标题，应改为成对标签');
  if (/^#{1,6}\s/m.test(personaText)) warn('人设里出现 Markdown 标题');

  const first = (personaText.trim().match(/^<([^\s>/]+)/) || [])[1];
  if (first && first !== '角色设定' && first !== '角色设置') {
    warn(`人设首块是 <${first}>，官方口径要求以 <角色设定 名字：…> 开头；本 skill 不阻断，但与官方校验器互通时会报错`);
  }
  ran('人设结构');
}

/* ---------- 世界书 ---------- */
const wbPath = opts.worldbook;
if (wbPath) {
  let wb;
  try { wb = JSON.parse(fs.readFileSync(wbPath, 'utf8').replace(/^\uFEFF/, '')); }
  catch (e) { err('世界书 JSON 解析失败: ' + e.message); }
  if (wb) {
    const ks = Object.keys(wb);
    if (ks.length !== 1 || ks[0] !== 'entries') err('世界书根对象必须只含 entries，当前: ' + ks.join(','));
    if (Array.isArray(wb.entries)) err('entries 必须是对象，不是数组');
    else if (wb.entries) {
      const uids = new Map();
      let constantChars = 0;
      Object.entries(wb.entries).forEach(([k, e]) => {
        if (typeof e.key === 'string') { try { JSON.parse(e.key); } catch { err(`entries[${k}].key 不是合法 JSON 字符串数组`); } }
        else err(`entries[${k}].key 必须是字符串（JSON 编码后的数组）`);
        if (typeof e.probability === 'number') warn(`entries[${k}].probability 建议用两位小数字符串`);
        if (e.uid != null) { if (uids.has(e.uid)) err(`uid 重复: ${e.uid}`); uids.set(e.uid, k); }
        const len = (e.content || '').length;
        if (len > LIMIT.worldbookEntryContent) err(`entries[${k}] content ${len} 字，超过 ${LIMIT.worldbookEntryContent}`);
        if ((e.comment || '').length > LIMIT.worldbookComment) warn(`entries[${k}] comment 超过 ${LIMIT.worldbookComment} 字（平台截断）: ${e.comment}`);
        if (/\{\{char\}\}|\$#char#\$/.test(e.content || '')) err(`entries[${k}] 用了 {{char}}，应写真实角色名`);
        if (e.constant && !e.disable && String(e.probability || '100.00') === '100.00') constantChars += len;
      });
      S.constantWorldbookChars = constantChars;
    }
  }
  ran('世界书结构');
}

/* ---------- 公开发布口径（仅新版，显式开启） ---------- */
if (opts.publish) {
  if (!isSandbox) warn('--publish 只对沙盒模式（chatVersion:1）有意义');
  const [lo, hi] = F.limits.sandbox.publish.transmissionChars;
  const total = (personaText || '').length + (S.constantWorldbookChars || 0);
  if (total < lo || total > hi) warn(`公开发布口径：人设 + 常驻世界书正文 = ${total} 字，应在 ${lo}–${hi}`);
  if (begLen && begLen < F.limits.sandbox.publish.beginningMin) warn(`公开发布口径：beginning ${begLen} 字，应 ≥ ${F.limits.sandbox.publish.beginningMin}`);
  ran('公开发布口径');
}

/* ---------- 输出 ---------- */
const stats = {
  file: path.resolve(file),
  platform,
  chatVersion: card.chatVersion,
  rules: rules ? rules.length : 0,
  errors: E.length,
  warns: W.length,
  sdkNames: [...new Set(sdkNames)],
  sdkEvents: [...new Set(sdkEvents)],
  checks: S.checks.map((c) => c.name)
};

if (opts.json) {
  console.log(JSON.stringify({ ...stats, errorList: E, warnList: W }, null, 2));
  process.exit(E.length ? 1 : 0);
}

if (!opts.quiet) {
  console.log(`[platform] ${V.label} chatVersion:${card.chatVersion}`);
  console.log('='.repeat(56));
  console.log(path.relative(process.cwd(), path.resolve(file)));
  console.log(`规则 ${stats.rules} 条 · ERROR ${E.length} · WARN ${W.length}`);
  E.forEach((m) => console.log('  ERROR ' + m));
  W.forEach((m) => console.log('  WARN  ' + m));
  if (stats.sdkNames.length) console.log(`  SDK    ${stats.sdkNames.join(', ')}`);
  console.log(`  静默点 已查 ${stats.checks.length} 类：${stats.checks.join(' / ')}`);
}
if (E.length) {
  if (!opts.quiet) console.log('\n结论: 未通过（修完 ERROR 再交付）');
  process.exit(1);
}
if (!opts.quiet) console.log('\n结论: 静态校验通过（不等于实机可用；S4 仍需真站取证）');
