#!/usr/bin/env node
/* live-mobile.mjs · 实体设备（Android）真实环境测试
 * 走 adb + Chrome DevTools Protocol，驱动设备上真实运行的 Chrome。
 * 与 PC 链的区别：这里的内核、字体、触摸、软键盘、性能都是设备本身的，
 * 不是桌面 Chromium 的 viewport / UA / touch 覆盖。
 *
 *   node scripts/live-mobile.mjs --url "<聊天页URL>" [--out work/live] [--serial <设备>]
 *                               [--port 9223] [--assume-host] [--rotate] [--strict]
 *
 * 无设备时写 NOT RUN 并退出 3，不降级成桌面模拟。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs, SKILL_ROOT } from './lib/facts.mjs';
import { resolveEntry, entryTemplate, entryHosts, probeExpr, judge } from './lib/live-probes.mjs';
import { normalizeActions, describeStep } from './lib/live-actions.mjs';

const { opts } = parseArgs(process.argv);

const OUT = path.resolve(opts.out || path.join(SKILL_ROOT, 'work', 'live'));
const PORT = Number(opts.port || 9223);
const STRICT = !!opts.strict;
const ROTATE = !!opts.rotate;
const KEEP_FORWARD = !!opts['keep-forward'];

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function die(message, code = 2) {
  console.error(message);
  process.exit(code);
}

if (!opts.url) {
  die(
    [
      '缺少测试入口。实体设备测试前必须向用户索取聊天页 URL，不能猜。',
      '',
      '需要的格式：',
      '  ' + entryTemplate(),
      '',
      '可用域名：' + entryHosts().join(' / '),
      '示例：https://meimoai15.com/#/pages/chat/chat?roleId=114739&prePath=1'
    ].join('\n')
  );
}

const entry = resolveEntry(opts.url, { assumeHost: !!opts['assume-host'] });
if (!entry.ok) {
  die(
    [
      `入口被拒：${entry.reason}`,
      entry.hint || '',
      '',
      '正确格式：' + entryTemplate(),
      '可用域名：' + entryHosts().join(' / '),
      '若该域名确为本轮目标，加 --assume-host 再执行。'
    ]
      .filter(Boolean)
      .join('\n')
  );
}

/* ---------- adb ---------- */

const ADB = process.env.ADB || 'adb';

function adb(args, timeout = 30000) {
  const r = spawnSync(ADB, args, {
    encoding: 'utf8',
    timeout,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
    shell: false
  });
  return {
    ok: r.status === 0,
    code: r.status,
    out: (r.stdout || '').trim(),
    err: (r.stderr || '').trim(),
    missing: !!r.error
  };
}

const runDir = path.join(OUT, `mobile-${stamp()}`);
const shotDir = path.join(runDir, 'shots');

function writeNotRun(reason, detail) {
  fs.mkdirSync(runDir, { recursive: true });
  const report = {
    schema: 'rex-live/1',
    kind: 'mobile',
    at: new Date().toISOString(),
    entry,
    verdict: 'NOT RUN',
    reason,
    detail: detail || '',
    next: '接上 Android 设备并开启 USB 调试后重跑；桌面浏览器的视口模拟不能替代本项'
  };
  fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.error(`NOT RUN：${reason}\n${detail || ''}\n已记录 ${path.relative(SKILL_ROOT, path.join(runDir, 'report.json'))}`);
  process.exit(3);
}

const version = adb(['version'], 10000);
if (version.missing || !version.ok) {
  writeNotRun('未找到 adb', version.err || '把 Android platform-tools 加入 PATH，或设置 ADB 环境变量');
}

/* ---------- 选设备 ---------- */

const devicesRaw = adb(['devices', '-l']);
if (!devicesRaw.ok) writeNotRun('adb devices 执行失败', devicesRaw.err);

const devices = devicesRaw.out
  .split('\n')
  .slice(1)
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const parts = l.split(/\s+/);
    return { serial: parts[0], state: parts[1] };
  })
  .filter((d) => d.state === 'device');

const unauthorized = devicesRaw.out.split('\n').filter((l) => /unauthorized/.test(l));

if (!devices.length) {
  writeNotRun(
    '没有可用的 Android 设备',
    unauthorized.length
      ? '设备处于 unauthorized：在手机上点「允许 USB 调试」后重跑'
      : 'adb devices 列表为空：插线、开 USB 调试、确认手机已授权本机'
  );
}

const serial = opts.serial ? String(opts.serial) : devices[0].serial;
if (!devices.some((d) => d.serial === serial)) {
  writeNotRun(`未找到设备 ${serial}`, `当前可用：${devices.map((d) => d.serial).join(', ')}`);
}

const S = ['-s', serial];
function dev(args, timeout) {
  return adb([...S, ...args], timeout);
}

const model = dev(['shell', 'getprop', 'ro.product.model']).out || 'unknown';
const android = dev(['shell', 'getprop', 'ro.build.version.release']).out || 'unknown';
const fingerprint = dev(['shell', 'getprop', 'ro.build.fingerprint']).out || '';

/* ---------- Chrome ---------- */

const pkgList = dev(['shell', 'pm', 'list', 'packages']).out;
const CHROME = ['com.android.chrome', 'com.chrome.beta', 'com.brave.browser'].find((p) =>
  new RegExp(`package:${p.replace(/\./g, '\\.')}$`, 'm').test(pkgList)
);
if (!CHROME) writeNotRun('设备上没有可调试的 Chrome', '需要 com.android.chrome 或同族浏览器');

const openArgs = ['shell', `am start -a android.intent.action.VIEW -d '${entry.url}' ${CHROME}`];
const opened = dev(openArgs, 30000);
if (!opened.ok && /Error/.test(opened.out + opened.err)) {
  writeNotRun('无法在设备上打开链接', opened.err || opened.out);
}

/* ---------- CDP ---------- */

const forward = dev(['forward', `tcp:${PORT}`, 'localabstract:chrome_devtools_remote']);
if (!forward.ok) writeNotRun('端口转发失败', forward.err || forward.out);

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

async function targets() {
  for (let i = 0; i < 20; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json`);
      if (r.ok) {
        const list = await r.json();
        if (Array.isArray(list) && list.length) return list;
      }
    } catch {
      /* Chrome 还没把 devtools socket 拉起来 */
    }
    sleep(500);
  }
  return null;
}

const list = await targets();
if (!list) {
  writeNotRun('连不上设备上的 DevTools', `127.0.0.1:${PORT} 无响应；确认 Chrome 已在前台、设备保持解锁`);
}

const target =
  list.find((t) => t.type === 'page' && String(t.url || '').includes(`roleId=${entry.roleId}`)) ||
  list.find((t) => t.type === 'page' && /meimoai|sexyai/.test(String(t.url || ''))) ||
  list.find((t) => t.type === 'page');

if (!target || !target.webSocketDebuggerUrl) writeNotRun('没有可附加的页面', JSON.stringify(list.map((t) => ({ t: t.type, u: t.url }))).slice(0, 400));

let ws;
try {
  ws = new WebSocket(target.webSocketDebuggerUrl);
} catch (e) {
  writeNotRun('WebSocket 建立失败', String(e.message || e));
}

let cdpSeq = 0;
const pending = new Map();
const events = [];

function send(method, params = {}, timeout = 30000) {
  const id = ++cdpSeq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`CDP 超时：${method}`));
      }
    }, timeout);
    pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.addEventListener('message', (ev) => {
  let msg;
  try {
    msg = JSON.parse(ev.data);
  } catch {
    return;
  }
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message || 'CDP error')) : resolve(msg.result);
  } else if (msg.method) {
    events.push({ method: msg.method, params: msg.params });
    if (events.length > 200) events.shift();
  }
});

await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('WebSocket 连接超时')), 10000);
  ws.addEventListener('open', () => { clearTimeout(t); res(); });
  ws.addEventListener('error', () => { clearTimeout(t); rej(new Error('WebSocket 出错')); });
});

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable').catch(() => {});

async function evalJs(expr, timeout) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, timeout);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || '页面内异常');
  return r.result ? r.result.value : undefined;
}

/* 页面可能还在跳转，等聊天页挂载 */
let ready = false;
for (let i = 0; i < 30; i++) {
  try {
    if (await evalJs(`!!document.querySelector('[data-chat="root"]')`)) {
      ready = true;
      break;
    }
  } catch {
    /* 导航中 */
  }
  sleep(1000);
}

fs.mkdirSync(shotDir, { recursive: true });

const shots = [];
async function shot(name) {
  try {
    const r = await send('Page.captureScreenshot', { format: 'png' }, 20000);
    const p = path.join(shotDir, `${name}.png`);
    fs.writeFileSync(p, Buffer.from(r.data, 'base64'));
    shots.push(path.relative(SKILL_ROOT, p));
    return true;
  } catch {
    return false;
  }
}

await shot('01-first-screen');

/* ---------- 探针 ---------- */

let probeData = null;
try {
  const rawValue = await evalJs(probeExpr({ selectors: ['[data-chat="input"]', '[data-chat="send"]'] }), 45000);
  probeData = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
} catch {
  probeData = null;
}

/* ---------- 设备侧事实 ---------- */

function imeShown() {
  const d = dev(['shell', 'dumpsys', 'input_method']);
  const m = /mInputShown=(\w+)/.exec(d.out);
  return m ? m[1] === 'true' : null;
}

const keyboardBefore = imeShown();
let keyboardAfter = null;
let focusOk = null;

if (probeData) {
  try {
    const box = await evalJs(`(function(){var e=document.querySelector('[data-chat="input"]');if(!e)return null;var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
    if (box) {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(box.x), y: Math.round(box.y) }] });
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      sleep(800);
      keyboardAfter = imeShown();
      focusOk = await evalJs(`document.activeElement === document.querySelector('[data-chat="input"]')`);
      await shot('02-keyboard');
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Back', code: 'Back', windowsVirtualKeyCode: 4, nativeVirtualKeyCode: 4 }).catch(() => {});
    }
  } catch {
    focusOk = null;
  }
}

/* ---------- 动作序列 ---------- */

const issues = [];
let steps = [];
try {
  const raw = opts['act-file'] ? fs.readFileSync(path.resolve(opts['act-file']), 'utf8') : opts.act;
  steps = normalizeActions(raw);
} catch (e) {
  issues.push(`动作序列无法解析：${e.message}`);
}

async function touchSelector(selector) {
  const box = await evalJs(
    `(function(){var e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`
  );
  if (!box) throw new Error(`未找到 ${selector}`);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(box.x), y: Math.round(box.y) }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

const KEY_CODES = { Enter: 13, Backspace: 8, Tab: 9, Escape: 27 };
const actLog = [];

for (const s of steps) {
  try {
    if (s.kind === 'click') {
      await touchSelector(s.selector);
    } else if (s.kind === 'scrollTo') {
      const found = await evalJs(
        `(function(){var e=document.querySelector(${JSON.stringify(s.selector)});if(e)e.scrollIntoView({block:'center'});return !!e;})()`
      );
      if (!found) throw new Error(`未找到 ${s.selector}`);
    } else if (s.kind === 'fill') {
      await touchSelector(s.selector);
      await send('Input.insertText', { text: s.text });
    } else if (s.kind === 'press') {
      const code = KEY_CODES[s.key] || 0;
      const base = { key: s.key, code: s.key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
      await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    } else if (s.kind === 'wait') {
      sleep(s.ms);
    } else if (s.kind === 'shot') {
      await shot(s.name);
    } else if (s.kind === 'eval') {
      actLog.push({ step: s, ok: true, value: await evalJs(s.expression) });
      continue;
    }
    actLog.push({ step: s, ok: true });
  } catch (e) {
    actLog.push({ step: s, ok: false, error: String(e.message || e) });
    break;
  }
}
if (actLog.some((a) => !a.ok)) issues.push(`动作序列在第 ${actLog.findIndex((a) => !a.ok) + 1} 步中断`);

let probeAfter = null;
if (steps.length) {
  try {
    const v = await evalJs(probeExpr({ selectors: [] }), 45000);
    probeAfter = typeof v === 'string' ? JSON.parse(v) : v;
  } catch {
    probeAfter = null;
  }
}

let rotation = null;
if (ROTATE) {
  const before = dev(['shell', 'settings', 'get', 'system', 'user_rotation']).out;
  dev(['shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0']);
  dev(['shell', 'settings', 'put', 'system', 'user_rotation', '1']);
  sleep(1500);
  try {
    const landscape = await evalJs(`(function(){var root=document.querySelector('[data-chat="root"]');return {w:innerWidth,h:innerHeight,over:document.documentElement.scrollWidth>innerWidth+1,theme:root?root.getAttribute('data-theme'):null};})()`);
    rotation = { before, landscape };
    await shot('03-landscape');
  } catch {
    rotation = { before, landscape: null };
  }
  dev(['shell', 'settings', 'put', 'system', 'user_rotation', before || '0']);
  dev(['shell', 'settings', 'put', 'system', 'accelerometer_rotation', '1']);
}

/* ---------- 判定 ---------- */

const judged = judge(probeAfter || probeData);
issues.push(...judged.issues);
if (!ready) issues.push('30 秒内聊天页未挂载：多为设备上未登录或链接被拦截');
if (focusOk === false) issues.push('点击输入框后焦点未落在 [data-chat="input"]');
if (keyboardAfter === false) issues.push('点击输入框后软键盘未弹出');
if (rotation && rotation.landscape && rotation.landscape.over) issues.push('横屏出现横向溢出');
if (rotation && rotation.landscape && rotation.landscape.h < 400) issues.push(`横屏高度仅 ${rotation.landscape.h}px，输入区可能被压`);

const verdict = !probeData ? 'FAIL' : issues.length ? 'WARN' : 'PASS';

const report = {
  schema: 'rex-live/1',
  kind: 'mobile',
  at: new Date().toISOString(),
  entry: { url: entry.url, host: entry.host, roleId: entry.roleId, assumed: !!entry.assumed },
  device: { serial, model, android, fingerprint: fingerprint.slice(0, 160), chrome: CHROME },
  transport: { adb: 'forward', port: PORT, target: String(target.url || '').slice(0, 200) },
  env: { ready },
  probe: probeData,
  probeAfter,
  actions: actLog,
  touch: { focusOk, keyboardBefore, keyboardAfter },
  rotation,
  judgement: { level: judged.level, issues },
  shots,
  verdict
};

fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

const md = [
  `# 实体设备测试 · ${model} · Android ${android}`,
  '',
  `入口：${entry.url}`,
  `设备：${serial} / ${CHROME}`,
  `结论：**${verdict}**（探针 ${judged.level}）`,
  '',
  '## 读数',
  '',
  probeData
    ? [
        `- 视口 ${probeData.viewport.w}×${probeData.viewport.h} @${probeData.viewport.dpr}x`,
        `- 聊天页 ${probeData.platform.detected ? '已挂载' : '未挂载'}`,
        `- 横向溢出 ${probeData.doc.over ? '有' : '无'}（scroll ${probeData.doc.scrollWidth} / 视口 ${probeData.doc.innerWidth}）`,
        `- 状态栏 ${probeData.statusbar.exists ? `${probeData.statusbar.chars} 字${probeData.statusbar.clipped ? '，被裁' : ''}` : '不存在'}`,
        `- 气泡 ${probeData.bubbles.count} 条，最宽 ${probeData.bubbles.maxWidth}px`
      ].join('\n')
    : '（未取得读数）',
    '',
    '## 触摸与键盘',
    '',
    `- 输入框焦点：${focusOk === null ? '未测' : focusOk ? '正常' : '未取到'}`,
    `- 软键盘：${keyboardBefore === null ? '未测' : `${keyboardBefore ? '测试前已开' : '测试前关闭'} → ${keyboardAfter === null ? '未测' : keyboardAfter ? '已弹出' : '未弹出'}`}`,
    rotation && rotation.landscape
      ? `- 横屏：${rotation.landscape.w}×${rotation.landscape.h}，${rotation.landscape.over ? '有横向溢出' : '无横向溢出'}`
      : '- 横屏：未测',
    '',
    actLog.length
      ? '## 动作\n\n' +
        actLog.map((a, i) => `${i + 1}. ${describeStep(a.step)} → ${a.ok ? '完成' : '失败：' + a.error}`).join('\n')
      : '',
    '',
    issues.length ? '## 待查\n\n' + issues.map((i) => `- ${i}`).join('\n') : '## 待查\n\n无',
    '',
    shots.length ? '## 截图\n\n' + shots.map((s) => `- ${s}`).join('\n') : ''
  ].join('\n');

fs.writeFileSync(path.join(runDir, 'report.md'), md, 'utf8');
console.log(md);
console.log(`\n产物：${path.relative(SKILL_ROOT, runDir)}`);

try {
  ws.close();
} catch {
  /* 已关闭 */
}

if (!KEEP_FORWARD) dev(['forward', '--remove', `tcp:${PORT}`]);

if (STRICT && issues.length) process.exitCode = 1;
else if (verdict === 'FAIL') process.exitCode = 1;
