#!/usr/bin/env node
/* live.mjs · 目标站（PC 浏览器）真实环境测试
 * 驱动用户已登录的 Chromium（经 bsk 扩展），只读为主，显式参数才产生写操作。
 *
 *   node scripts/live.mjs --url "<聊天页URL>" [--out work/live] [--strict]
 *                        [--use-open] [--assume-host] [--selectors "a,b"]
 *                        [--shot-full] [--send "文本"] [--tab <id>] [--keep]
 *
 * 入口 URL 必须由用户提供；本脚本不猜测、不拼凑、不用相似卡替代。
 * 未安装 bsk 时写 NOT RUN，不改用无头渲染冒充目标站。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs, SKILL_ROOT } from './lib/facts.mjs';
import { resolveEntry, entryTemplate, entryHosts, probeExpr, judge } from './lib/live-probes.mjs';
import { normalizeActions, describeStep } from './lib/live-actions.mjs';

const { opts } = parseArgs(process.argv);

const OUT = path.resolve(opts.out || path.join(SKILL_ROOT, 'work', 'live'));
const STRICT = !!opts.strict;
const USE_OPEN = !!opts['use-open'];
const KEEP = !!opts.keep;
const SEND = typeof opts.send === 'string' ? opts.send : null;

function die(message, code = 2) {
  console.error(message);
  process.exit(code);
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/* ---------- 入口校验：先于任何浏览器动作 ---------- */

if (!opts.url) {
  die(
    [
      '缺少测试入口。目标站测试前必须向用户索取聊天页 URL，不能猜。',
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

/* ---------- bsk 可用性 ---------- */

const BSK = process.env.BSK || 'bsk';

function bsk(args, extra = {}) {
  const r = spawnSync(BSK, args, {
    encoding: 'utf8',
    timeout: extra.timeout || 60000,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
    shell: false
  });
  if (r.error) return { ok: false, error: r.error.message, stdout: '', stderr: '', code: -1 };
  return { ok: r.status === 0, code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function jsonOf(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(s.slice(a, b + 1));
  } catch {
    return null;
  }
}

const probe = bsk(['--version'], { timeout: 15000 });
if (!probe.ok) {
  const report = {
    schema: 'rex-live/1',
    kind: 'pc',
    at: new Date().toISOString(),
    entry,
    verdict: 'NOT RUN',
    reason: '未找到 bsk 浏览器驱动',
    detail: probe.error || probe.stderr || 'bsk --version 失败',
    next: '安装 browser-skill 的 CLI 与浏览器扩展后重跑；在此之前不要用无头渲染结果代替目标站结论'
  };
  fs.mkdirSync(OUT, { recursive: true });
  const f = path.join(OUT, `pc-NOTRUN-${stamp()}.json`);
  fs.writeFileSync(f, JSON.stringify(report, null, 2), 'utf8');
  console.error(`NOT RUN：未找到 bsk。已记录 ${path.relative(SKILL_ROOT, f)}`);
  process.exit(3);
}

/* ---------- 会话 ---------- */

const runDir = path.join(OUT, `pc-${stamp()}`);
const shotDir = path.join(runDir, 'shots');
fs.mkdirSync(shotDir, { recursive: true });

let sid = null;
const log = [];
function step(name, detail) {
  log.push({ step: name, at: new Date().toISOString(), detail });
}

function call(args, what) {
  const r = bsk(['--quiet', ...args]);
  if (!r.ok) throw new Error(`${what} 失败：${(r.stderr || r.stdout || '').trim().slice(0, 400)}`);
  return r.stdout;
}

try {
  const started = jsonOf(bsk(['session', 'start', '--json', '--no-focus', '--name', `rex-live ${entry.roleId}`]).stdout);
  sid = started?.session_id;
  if (!sid) throw new Error('会话未能建立');
  step('session', sid);

  /* ---------- 标签 ---------- */

  let tabId = opts.tab ? Number(opts.tab) : null;
  let borrowed = false;

  if (!tabId && USE_OPEN) {
    const list = jsonOf(call(['tab', 'list', '--session', sid, '--json', '--scope', 'user'], '列标签'));
    const hit = (list?.tabs || []).find((t) => {
      try {
        return new URL(t.url).host.replace(/^www\./, '') === entry.host;
      } catch {
        return false;
      }
    });
    if (hit) {
      call(['tab', 'borrow', String(hit.tab_id), '--session', sid], '借用标签');
      tabId = hit.tab_id;
      borrowed = true;
      step('tab', `借用已有标签 ${tabId}`);
    }
  }

  if (!tabId) {
    const created = jsonOf(call(['tab', 'create', '--session', sid, '--url', entry.url, '--json'], '创建标签'));
    tabId = created?.tab_id || created?.tabId;
    step('tab', `新建标签 ${tabId || '(默认)'}`);
  }

  const common = tabId ? ['--tab-id', String(tabId)] : [];

  call(['navigate', entry.url, '--session', sid, ...common], '导航');

  /* ---------- 等待新版聊天页挂载 ---------- */

  const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  const deadline = Date.now() + 30000;
  let ready = false;
  while (Date.now() < deadline) {
    const r = bsk(['--quiet', 'evaluate', '--session', sid, ...common, '--json',
      `!!document.querySelector('[data-chat="root"]')`]);
    if (r.ok) {
      const parsed = jsonOf(r.stdout);
      const value = parsed?.result ?? parsed?.value;
      if (value === true || String(value) === 'true') {
        ready = true;
        break;
      }
    }
    sleep(600);
  }
  step('ready', ready ? '聊天页已挂载' : '30 秒内未检测到 [data-chat="root"]');

  /* ---------- 截图 ---------- */

  const shots = [];
  function shot(name, extraArgs = []) {
    const p = path.join(shotDir, `${name}.png`);
    const r = bsk(['--quiet', 'screenshot', '--session', sid, ...common, '--out', p, ...extraArgs]);
    if (r.ok && fs.existsSync(p)) shots.push(path.relative(SKILL_ROOT, p));
    return r.ok;
  }

  shot('01-first-screen');
  if (opts['shot-full']) shot('02-full-page', ['--full-page']);

  /* ---------- 只读探针 ---------- */

  const selectors = String(opts.selectors || '[data-chat="input"],[data-chat="send"],[data-slot="statusbar"]')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const expr = probeExpr({ selectors });
  const readProbe = () => {
    const r = bsk(['--quiet', 'evaluate', '--session', sid, ...common, '--json', expr], { timeout: 45000 });
    if (!r.ok) return null;
    const parsed = jsonOf(r.stdout);
    const payload = parsed?.result ?? parsed;
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload);
      } catch {
        return null;
      }
    }
    return payload && typeof payload === 'object' ? payload : null;
  };
  const probeData = readProbe();
  step('probe', probeData ? '已取得页面读数' : '探针未返回可解析结果');

  /* ---------- 控制台与网络 ---------- */

  const consoleOut = jsonOf(bsk(['--quiet', 'console', '--session', sid, ...common, '--json', '--limit', '100']).stdout);
  const consoleEntries = (consoleOut?.entries || consoleOut?.messages || []).map((e) => ({
    level: e.level || e.type || '',
    text: String(e.text || e.message || '').slice(0, 300)
  }));
  const errorCount = consoleEntries.filter((e) => /error/i.test(e.level)).length;

  const netOut = jsonOf(bsk(['--quiet', 'network', '--session', sid, ...common, '--json', '--limit', '100']).stdout);
  const netEntries = (netOut?.entries || netOut?.requests || []).map((e) => ({
    url: String(e.url || '').slice(0, 200),
    status: e.status ?? null,
    failed: !!e.failed
  }));
  const failedNet = netEntries.filter((e) => e.failed || (e.status && e.status >= 400));

  /* ---------- 动作序列 ---------- */

  const issues = [];
  let steps = [];
  try {
    const raw = opts['act-file'] ? fs.readFileSync(path.resolve(opts['act-file']), 'utf8') : opts.act;
    steps = normalizeActions(raw);
  } catch (e) {
    throw new Error(`动作序列无法解析：${e.message}`);
  }

  const actLog = [];
  for (const s of steps) {
    try {
      if (s.kind === 'click') {
        call(['click', s.selector, '--session', sid, ...common], `点击 ${s.selector}`);
      } else if (s.kind === 'fill') {
        call(['fill', s.selector, '--value', s.text, '--session', sid, ...common], `填入 ${s.selector}`);
      } else if (s.kind === 'press') {
        const args = ['press', s.key, '--session', sid, ...common];
        if (s.selector) args.push('--ref', s.selector);
        call(args, `按键 ${s.key}`);
      } else if (s.kind === 'scrollTo') {
        call(['scroll-to', s.selector, '--session', sid, ...common], `滚动到 ${s.selector}`);
      } else if (s.kind === 'wait') {
        sleep(s.ms);
      } else if (s.kind === 'shot') {
        shot(s.name);
      } else if (s.kind === 'eval') {
        const r = bsk(['--quiet', 'evaluate', '--session', sid, ...common, '--json', s.expression], { timeout: 30000 });
        actLog.push({ step: s, ok: r.ok, value: (r.stdout || '').trim().slice(0, 500) });
        continue;
      }
      actLog.push({ step: s, ok: true });
    } catch (e) {
      actLog.push({ step: s, ok: false, error: String(e.message || e) });
      break;
    }
  }
  if (steps.length) step('actions', `${steps.length} 步，成功 ${actLog.filter((a) => a.ok).length} 步`);
  if (actLog.some((a) => !a.ok)) issues.push(`动作序列在第 ${actLog.findIndex((a) => !a.ok) + 1} 步中断`);

  const probeAfter = steps.length ? readProbe() : null;

  /* ---------- 可选的写操作 ---------- */

  if (SEND) {
    const filled = bsk(['--quiet', 'fill', '--session', sid, ...common, '[data-chat="input"]', '--value', SEND]);
    step('send', filled.ok ? '已填入，未自动提交' : '未找到输入框');
  }

  /* ---------- 判定 ---------- */

  const judged = judge(probeAfter || probeData);
  issues.push(...judged.issues);
  if (errorCount > 0) issues.push(`控制台 ${errorCount} 条 error`);
  for (const n of failedNet) issues.push(`请求失败 ${n.status || 'NETWORK'} ${n.url}`);
  if (!ready) issues.push('30 秒内聊天页未挂载');

  const verdict = !probeData ? 'FAIL' : issues.length ? 'WARN' : 'PASS';

  const report = {
    schema: 'rex-live/1',
    kind: 'pc',
    at: new Date().toISOString(),
    entry: { url: entry.url, host: entry.host, roleId: entry.roleId, assumed: !!entry.assumed },
    env: { driver: 'bsk', session: sid, tab: tabId, borrowed, ready },
    probe: probeData,
    probeAfter,
    judgement: { level: judged.level, issues },
    console: consoleEntries.slice(0, 50),
    actions: actLog,
    network: { total: netEntries.length, failed: failedNet.slice(0, 20) },
    shots,
    steps: log,
    verdict,
    notRun: ready ? [] : ['目标站聊天页未在时限内挂载，页面相关结论不成立']
  };

  fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

  const md = [
    `# 目标站测试 · ${entry.host} · roleId ${entry.roleId}`,
    '',
    `入口：${entry.url}`,
    `时间：${report.at}`,
    `结论：**${verdict}**（探针 ${judged.level}）`,
    '',
    '## 读数',
    '',
    probeData
      ? [
          `- 视口 ${probeData.viewport.w}×${probeData.viewport.h} @${probeData.viewport.dpr}x`,
          `- 聊天页 ${probeData.platform.detected ? '已挂载' : '未挂载'}${probeData.inFrame != null ? `（iframe #${probeData.inFrame}）` : ''}`,
          `- 主题 ${probeData.platform.theme ?? '未知'} / 消息 ${probeData.platform.messages} 条`,
          `- 横向溢出 ${probeData.doc.over ? '有' : '无'}（scroll ${probeData.doc.scrollWidth} / 视口 ${probeData.doc.innerWidth}）`,
          `- 状态栏 ${probeData.statusbar.exists ? `${probeData.statusbar.chars} 字${probeData.statusbar.clipped ? '，被裁' : ''}` : '不存在'}`,
          `- 气泡 ${probeData.bubbles.count} 条，最宽 ${probeData.bubbles.maxWidth}px`
        ].join('\n')
      : '（未取得读数）',
    '',
    actLog.length
      ? '## 动作\n\n' +
        actLog.map((a, i) => `${i + 1}. ${describeStep(a.step)} → ${a.ok ? '完成' : '失败：' + a.error}`).join('\n')
      : '',
    '',
    issues.length ? '## 待查\n\n' + issues.map((i) => `- ${i}`).join('\n') : '## 待查\n\n无',
    '',
    shots.length ? '## 截图\n\n' + shots.map((s) => `- ${s}`).join('\n') : '',
    '',
    `控制台：${consoleEntries.length} 条，error ${errorCount} 条`,
    `请求：${netEntries.length} 条，失败 ${failedNet.length} 条`
  ].join('\n');

  fs.writeFileSync(path.join(runDir, 'report.md'), md, 'utf8');

  console.log(md);
  console.log(`\n产物：${path.relative(SKILL_ROOT, runDir)}`);

  if (STRICT && issues.length) process.exitCode = 1;
  else if (verdict === 'FAIL') process.exitCode = 1;
} catch (err) {
  console.error(String(err.message || err));
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(
    path.join(runDir, 'report.json'),
    JSON.stringify({ schema: 'rex-live/1', kind: 'pc', entry, verdict: 'FAIL', error: String(err.message || err), steps: log }, null, 2),
    'utf8'
  );
  process.exitCode = 1;
} finally {
  if (sid && !KEEP) {
    bsk(['--quiet', 'session', 'stop', sid]);
  } else if (sid && KEEP) {
    console.error(`会话保留：${sid}（用 bsk session stop ${sid} 结束）`);
  }
}
