#!/usr/bin/env node
/* lib/live-probes.mjs · 目标站与实体设备的只读探针
 * 页面内函数用 toString 序列化后送进浏览器执行，因此不能引用模块作用域变量。
 * 全部只读：不写 DOM、不改存储、不发消息。
 */
import { F } from './facts.mjs';

/* ---------- 入口 URL ---------- */

const ENTRY = F.liveTest.entry;

export function entryHosts() {
  return ENTRY.hosts.slice();
}

export function entryTemplate() {
  return ENTRY.urlTemplate;
}

/** 规范化 host：去端口、去 www.、小写 */
function normHost(h) {
  return String(h || '').toLowerCase().replace(/^www\./, '').replace(/:\d+$/, '');
}

/**
 * 校验用户给的测试入口。
 * 返回 {ok, url, host, roleId, params, reason, hint}
 * ok=false 时 reason 说明拒收原因，hint 给出可照抄的正确格式。
 */
export function parseEntryUrl(input, opts = {}) {
  const hosts = (opts.hosts || ENTRY.hosts).map(normHost);
  const raw = String(input == null ? '' : input).trim();
  if (!raw) {
    return { ok: false, reason: '空值', hint: `需要 ${ENTRY.urlTemplate}` };
  }
  let u;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: '不是合法 URL', hint: `需要 ${ENTRY.urlTemplate}` };
  }
  if (u.protocol !== 'https:') {
    return { ok: false, reason: `协议是 ${u.protocol}，只接受 https`, hint: `需要 ${ENTRY.urlTemplate}` };
  }

  const host = normHost(u.host);
  const known = hosts.includes(host);

  const hash = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash;
  const qMark = hash.indexOf('?');
  const path = qMark >= 0 ? hash.slice(0, qMark) : hash;
  const query = qMark >= 0 ? hash.slice(qMark + 1) : '';
  const params = Object.fromEntries(new URLSearchParams(query));

  if (path !== ENTRY.path.replace(/^#/, '')) {
    return {
      ok: false,
      host,
      knownHost: known,
      reason: `hash 路径是 ${path || '(空)'}，不是 ${ENTRY.path}`,
      hint: `create 页与首页不能当测试目标；需要 ${ENTRY.urlTemplate}`
    };
  }

  const missing = ENTRY.requiredParams.filter((k) => !params[k]);
  if (missing.length) {
    return {
      ok: false,
      host,
      knownHost: known,
      reason: `缺参数 ${missing.join(', ')}`,
      hint: `需要 ${ENTRY.urlTemplate}`
    };
  }

  if (!known) {
    return {
      ok: false,
      host,
      knownHost: false,
      roleId: params.roleId,
      params,
      reason: `域名 ${host} 不在已记录清单`,
      hint: `已知可用：${ENTRY.hosts.join(' / ')}。确认该域名确实为本轮目标后再执行。`
    };
  }

  return { ok: true, url: u.href, host, roleId: params.roleId, params };
}

/** 域名不在清单时，允许调用方带 --assume-host 放行；其余校验不可跳过 */
export function resolveEntry(input, opts = {}) {
  const r = parseEntryUrl(input, opts);
  if (r.ok) return r;
  if (opts.assumeHost && r.knownHost === false && r.roleId) {
    return { ...r, ok: true, assumed: true, url: input };
  }
  return r;
}

/* ---------- 页面内探针 ---------- */

/* 这个函数会被整体序列化送进浏览器，禁止引用外部标识符 */
function pageProbe(opts) {
  var o = opts || {};
  var out = { ok: true, at: Date.now() };

  function px(n) {
    return Math.round(Number(n) || 0);
  }

  function rect(el) {
    var r = el.getBoundingClientRect();
    return { w: px(r.width), h: px(r.height), top: px(r.top), left: px(r.left) };
  }

  function clipped(el) {
    return !!el && el.scrollWidth > el.clientWidth + 1;
  }

  function docReport(doc, win) {
    var de = doc.documentElement;
    var body = doc.body;
    return {
      innerWidth: px(win.innerWidth),
      innerHeight: px(win.innerHeight),
      scrollWidth: px(de.scrollWidth),
      clientWidth: px(de.clientWidth),
      bodyScrollWidth: body ? px(body.scrollWidth) : 0,
      over: de.scrollWidth > win.innerWidth + 1
    };
  }

  function platformReport(doc) {
    var rootEl = doc.querySelector('[data-chat="root"]');
    var slotNames = ['statusbar', 'header-extra', 'left', 'right', 'toolbar', 'message-extra'];
    var slots = {};
    slotNames.forEach(function (n) {
      slots[n] = !!doc.querySelector('[data-slot="' + n + '"]');
    });
    var msgs = doc.querySelectorAll('[data-chat="message"]');
    var generating = doc.querySelectorAll('[data-chat="message"][data-generating="1"]');
    return {
      detected: !!rootEl,
      theme: rootEl ? rootEl.getAttribute('data-theme') : null,
      composer: rootEl ? rootEl.getAttribute('data-composer') : null,
      stage: doc.querySelector('[data-stage]') ? doc.querySelector('[data-stage]').getAttribute('data-stage') : null,
      slots: slots,
      messages: msgs.length,
      generating: generating.length,
      hasStatusbarText: !!doc.querySelector('[data-slot="statusbar"]') &&
        (doc.querySelector('[data-slot="statusbar"]').textContent || '').trim().length > 0
    };
  }

  function statusbarReport(doc) {
    var el = doc.querySelector('[data-slot="statusbar"]');
    if (!el) return { exists: false };
    var r = rect(el);
    return {
      exists: true,
      chars: (el.textContent || '').trim().length,
      clipped: clipped(el),
      scrollWidth: px(el.scrollWidth),
      clientWidth: px(el.clientWidth),
      rect: r,
      zeroSize: r.w <= 1 || r.h <= 1
    };
  }

  function bubbleReport(doc) {
    var nodes = doc.querySelectorAll('[data-chat="message-body"]');
    if (!nodes.length) return { count: 0, maxWidth: 0, minWidth: 0, overflowCount: 0 };
    var maxW = 0;
    var minW = Infinity;
    var over = 0;
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect();
      if (r.width > maxW) maxW = r.width;
      if (r.width < minW) minW = r.width;
      if (nodes[i].scrollWidth > nodes[i].clientWidth + 1) over++;
    }
    return {
      count: nodes.length,
      maxWidth: px(maxW),
      minWidth: minW === Infinity ? 0 : px(minW),
      overflowCount: over
    };
  }

  function layerReport(doc) {
    var all = doc.querySelectorAll('body *');
    var list = [];
    for (var i = 0; i < all.length && list.length < 40; i++) {
      var el = all[i];
      var flag = el.getAttribute && el.getAttribute('data-chat');
      if (flag && flag !== 'author-stage' && flag !== 'author-css') continue;
      var cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'absolute' && cs.position !== 'sticky') continue;
      var z = parseInt(cs.zIndex, 10);
      if (!isFinite(z) || z < 100) continue;
      list.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && String(el.className).slice(0, 60)) || '',
        z: z,
        position: cs.position
      });
    }
    list.sort(function (a, b) { return b.z - a.z; });
    return list.slice(0, 20);
  }

  function hitTest(doc, win, sel) {
    var el = doc.querySelector(sel);
    if (!el) return { selector: sel, found: false };
    var r = el.getBoundingClientRect();
    var x = Math.max(0, Math.min(win.innerWidth - 1, r.left + r.width / 2));
    var y = Math.max(0, Math.min(win.innerHeight - 1, r.top + r.height / 2));
    var top = doc.elementFromPoint(x, y);
    return {
      selector: sel,
      found: true,
      rect: rect(el),
      clear: top === el || (!!top && el.contains(top)) || (!!top && top.contains(el)),
      coveredBy: top && top !== el ? top.tagName.toLowerCase() + '.' + String(top.className || '').slice(0, 40) : null
    };
  }

  function frameReport(doc, win) {
    var frames = doc.querySelectorAll('iframe');
    var list = [];
    for (var i = 0; i < frames.length && i < 8; i++) {
      var f = frames[i];
      var rec = { index: i, name: f.getAttribute('name') || '', src: String(f.src || '').slice(0, 200), sameOrigin: false, hasChatRoot: false };
      try {
        var d = f.contentDocument;
        if (d) {
          rec.sameOrigin = true;
          rec.hasChatRoot = !!d.querySelector('[data-chat="root"]');
        }
      } catch (e) {
        rec.sameOrigin = false;
      }
      list.push(rec);
    }
    return list;
  }

  function mediaReport(win) {
    var out = {};
    var qs = (o.media && o.media.length) ? o.media : ['(max-width:420px)', '(max-width:600px)', '(min-width:1024px)', '(orientation:portrait)'];
    qs.forEach(function (q) {
      try { out[q] = win.matchMedia(q).matches; } catch (e) { out[q] = null; }
    });
    return out;
  }

  var doc = document;
  var win = window;

  out.page = {
    url: String(location.href).slice(0, 400),
    title: String(doc.title || '').slice(0, 200),
    readyState: doc.readyState
  };
  out.viewport = { dpr: win.devicePixelRatio, w: px(win.innerWidth), h: px(win.innerHeight) };
  out.ua = String(navigator.userAgent || '').slice(0, 300);
  out.doc = docReport(doc, win);
  out.platform = platformReport(doc);
  out.statusbar = statusbarReport(doc);
  out.bubbles = bubbleReport(doc);
  out.layers = layerReport(doc);
  out.frames = frameReport(doc, win);
  out.media = mediaReport(win);
  out.fonts = { status: doc.fonts ? doc.fonts.status : 'unknown', count: doc.fonts ? doc.fonts.size : 0 };

  if (o.selectors && o.selectors.length) {
    out.hits = o.selectors.map(function (s) { return hitTest(doc, win, s); });
  }

  /* 顶层没有平台根时，落进同源 iframe 再测一遍 */
  if (!out.platform.detected && out.frames.some(function (f) { return f.sameOrigin; })) {
    for (var i = 0; i < out.frames.length; i++) {
      if (!out.frames[i].sameOrigin) continue;
      try {
        var inner = doc.querySelectorAll('iframe')[i].contentWindow;
        var idoc = inner.document;
        if (!idoc.querySelector('[data-chat="root"]')) continue;
        out.inFrame = i;
        out.doc = docReport(idoc, inner);
        out.platform = platformReport(idoc);
        out.statusbar = statusbarReport(idoc);
        out.bubbles = bubbleReport(idoc);
        out.layers = layerReport(idoc);
        out.media = mediaReport(inner);
        if (o.selectors && o.selectors.length) {
          out.hits = o.selectors.map(function (s) { return hitTest(idoc, inner, s); });
        }
        break;
      } catch (e) {
        /* 跨源或已卸载，跳过 */
      }
    }
  }

  return out;
}

/** 生成可送进 evaluate / Runtime.evaluate 的表达式 */
export function probeExpr(opts = {}) {
  return `(${pageProbe.toString()})(${JSON.stringify(opts)})`;
}

/* ---------- 判定 ---------- */

const DEFAULT_Z = F.zIndex.sandbox.author;

/** 把探针原始结果折成 PASS / FAIL / WARN 项，不替调用方下结论 */
export function judge(probe, opts = {}) {
  const issues = [];
  if (!probe || !probe.ok) return { level: 'FAIL', issues: ['探针未返回结果'] };

  if (!probe.platform.detected) {
    issues.push('页面没有 [data-chat="root"]：目标站未渲染新版聊天页，先确认 URL 与登录态');
  }
  if (probe.doc.over) {
    issues.push(`横向溢出：scrollWidth ${probe.doc.scrollWidth} > innerWidth ${probe.doc.innerWidth}`);
  }
  if (probe.statusbar.exists && probe.statusbar.zeroSize) {
    issues.push('状态栏节点存在但尺寸为 0');
  }
  if (probe.statusbar.exists && probe.statusbar.clipped) {
    issues.push(`状态栏被裁：${probe.statusbar.scrollWidth} > ${probe.statusbar.clientWidth}`);
  }
  if (probe.bubbles.overflowCount > 0) {
    issues.push(`${probe.bubbles.overflowCount} 条消息正文横向溢出`);
  }

  const z = opts.z || DEFAULT_Z;
  for (const el of probe.layers || []) {
    if (el.z >= 1000 && el.z < z.overlay[0]) {
      issues.push(`z-index ${el.z} 落在 ${z.deadBand[0]}–${z.deadBand[1]} 空档（${el.tag}.${el.cls}）`);
    }
    if (el.z > z.overlay[1] && el.z < 8000) {
      issues.push(`z-index ${el.z} 越过作者安全带（${el.tag}.${el.cls}）`);
    }
  }
  for (const h of probe.hits || []) {
    if (h.found && !h.clear) issues.push(`${h.selector} 被 ${h.coveredBy} 遮住`);
  }

  if (!issues.length) return { level: 'PASS', issues: [] };
  return { level: 'WARN', issues };
}
