#!/usr/bin/env node
/* lib/facts.mjs · 读取 facts.json，给 build/validate/preview 共用
 * 只做读取与派生，不写文件。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SKILL_ROOT = path.resolve(here, '..', '..');
const factsPath = path.join(SKILL_ROOT, 'facts.json');

if (!fs.existsSync(factsPath)) {
  console.error('找不到 facts.json:', factsPath);
  process.exit(2);
}

export const F = JSON.parse(fs.readFileSync(factsPath, 'utf8'));

/* ---------- 版本 ---------- */
export const VERSION_KEYS = { sandbox: 'sandbox', legacy: 'legacy' };

export function platformOf(chatVersion) {
  const n = Number(chatVersion);
  if (n === 1) return 'sandbox';
  if (n === 0) return 'legacy';
  return null;
}

export function spec(platform) {
  return F.versions[platform];
}

/* ---------- 限额 ---------- */
const L = F.limits;
export const LIMIT = {
  scriptName: L.common.scriptName.use,
  findRegex: L.common.findRegex.use,
  replaceString: L.common.replaceString.use,
  rules: L.common.rules.max,
  statusbar: L.sandbox.statusbar.max,
  beginning: L.sandbox.beginning.max,
  personality: L.sandbox.personality.max,
  worldbookEntryContent: L.common.worldbookEntryContent.max,
  worldbookComment: L.common.worldbookComment.max,
  legacyFixedTransmission: L.legacy.fixedTransmission.max
};

/* ---------- SDK 名单 ---------- */
export const CAPS = F.capabilities;
export const CAPS_SET = new Set(CAPS);
export const NAMESPACES = new Set(F.capabilityNamespaces);
export const EVENTS = F.events;
export const EVENTS_SET = new Set(EVENTS);
export const ABSENT = new Set(F.absentCapabilities);

/* ---------- 标记 ---------- */
const M = F.markers.ignition;

export function marker(name) {
  return M.open + name + M.close;
}

export function markerRegexSource(name) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return esc(M.open) + esc(name) + esc(M.close);
}

/** 识别一段文本里的注入标记（新旧两种都认，用于兼容旧卡） */
export function findIgnitionMarkers(text) {
  const out = [];
  const re = /【(rex-[a-z0-9-]+)】|<(rex-[a-z0-9-]+)>/g;
  let m;
  while ((m = re.exec(String(text))) !== null) out.push(m[1] || m[2]);
  return out;
}

export function isLegacyAngleMarker(text) {
  return /<rex-[a-z0-9-]+>/.test(String(text));
}

/* ---------- 主题变量 ---------- */
export const CHAT_VARS = [
  ...F.chatVars.groups.bubblePage,
  ...F.chatVars.groups.composerAndModal,
  ...F.chatVars.groups.alias
];
export const CHAT_VAR_SET = new Set(CHAT_VARS);
export const CHAT_VAR_ALIASES = F.chatVars.aliases;

/* ---------- z-index ---------- */
export function zIndexVerdict(value, platform = 'sandbox') {
  const z = Number(value);
  if (!Number.isFinite(z)) return { level: 'ok' };
  const band = F.zIndex[platform].author;
  const [lo, hi] = band.overlay;
  if (z <= 999) return { level: 'ok', band: 'decoration' };
  if (z >= lo && z <= hi) return { level: 'ok', band: 'overlay' };
  if (platform === 'sandbox' && z >= 1000 && z < lo) {
    return { level: 'warn', band: 'dead', message: `z-index:${z} 落在 1000–3499 空档，会被舞台（content 2000 / full 3000）压住；页面级浮层用 ${lo}–${hi}` };
  }
  return { level: 'warn', band: 'above', message: `z-index:${z} 越过作者安全带上限 ${hi}，会盖住平台提示与长按菜单` };
}

/* ---------- 代码扫描前先剥字符串与注释 ---------- */
/** 把字符串字面量、模板串、行/块注释替换成等长空白，避免把日志文案里的 sdk.xxx 当成调用 */
export function stripStringsAndComments(code) {
  const s = String(code);
  let out = '';
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    const next = s[i + 1];
    if (c === '/' && next === '/') {
      while (i < n && s[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (c === '/' && next === '*') {
      out += '  '; i += 2;
      while (i < n && !(s[i] === '*' && s[i + 1] === '/')) { out += s[i] === '\n' ? '\n' : ' '; i++; }
      if (i < n) { out += '  '; i += 2; }
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out += ' '; i++;
      while (i < n) {
        if (s[i] === '\\') { out += '  '; i += 2; continue; }
        if (s[i] === quote) { out += ' '; i++; break; }
        out += s[i] === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }
    out += c; i++;
  }
  return out;
}

export function fail(message, code = 2) {
  console.error(message);
  process.exit(code);
}

export function parseArgs(argv) {
  const args = argv.slice(2);
  const positional = [];
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      opts[k] = v;
    } else positional.push(a);
  }
  return { positional, opts };
}
