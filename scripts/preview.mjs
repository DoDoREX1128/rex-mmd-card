#!/usr/bin/env node
/* preview.mjs · 把构建产物放进「仿平台外壳」里跑，用来本地冒烟
 * 用法: node preview.mjs --card work/out/card-regex.json --out work/out
 *       ?scene=cover|forge|main   ?turn=1   ?slots=0   ?nomock=1
 */
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const cardPath = path.resolve(arg('card', 'work/out/card-regex.json'));
const out = path.resolve(arg('out', 'work/out'));

if (!fs.existsSync(cardPath)) { console.error('找不到构建产物:', cardPath, '\n先跑 node scripts/build.mjs'); process.exit(1); }
const card = JSON.parse(fs.readFileSync(cardPath, 'utf8'));
const rules = card.regex_scripts || [];

/* ---- 与平台 applyRegexList 同语义 ---- */
function compile(rule) {
  const raw = String(rule.findRegex ?? '').trim().replace(/^`|`$/g, '');
  const m = /^\/(.+)\/([gimsuy]*)$/.exec(raw);
  if (!m) return { kind: 'literal', needle: rule.findRegex, content: rule.replaceString ?? '' };
  let flags = m[2] || ''; if (!flags.includes('g')) flags += 'g';
  return { kind: 'regex', re: new RegExp(m[1], flags), content: rule.replaceString ?? '' };
}
function applyAll(text) {
  let t = text;
  rules.forEach((r) => {
    const c = compile(r);
    if (c.kind === 'literal') t = t.replaceAll(c.needle, c.content);
    else t = t.replace(c.re, () => c.content);
  });
  return t;
}

const rendered = applyAll(card.beginning || '');
const statusbar = applyAll(card.statusbar || '');

/* 模型沙盒的字段表与角色名：从源目录 content.json 取，取不到就留空 */
const srcDir = path.resolve(arg('src', 'work/src'));
let fields = [];
let roleName = '演示角色';
try {
  const c = JSON.parse(fs.readFileSync(path.join(srcDir, 'content.json'), 'utf8').replace(/^\uFEFF/, ''));
  fields = (c.status && c.status.fields) || [];
  roleName = (c.meta && (c.meta.title || c.meta.name)) || roleName;
} catch { /* 没有 content.json 也能预览，只是沙盒字段为空 */ }

const MOCK = `
(function(){
  var W = window, D = document;
  var q = new URLSearchParams(W.location.search);
  var profile = q.get('profile') === 'thin' ? 'thin' : 'chat';
  var store = {};
  try { var raw = W.localStorage.getItem('rexpreview'); if (raw) store = JSON.parse(raw); } catch (e) {}
  function flush(){ try { W.localStorage.setItem('rexpreview', JSON.stringify(store)); } catch (e) {} }

  var __diag = { profile: profile, events: [], calls: [], errors: [], model: [] };
  W.__diag = __diag;

  var bus = {};
  function emit(n, p){
    __diag.events.push({ name: n, len: (p && p.content) ? p.content.length : 0 });
    var a = bus[n] || [];
    for (var i = 0; i < a.length; i++) {
      try { a[i](p); } catch (e) { __diag.errors.push(n + ': ' + e.message); console.error('[preview]', n, e); }
    }
  }
  W.__emit = emit;

  function serr(code, msg){ var e = new Error(msg || code); e.name = 'SdkError'; e.code = code; return e; }
  var THIN = ${JSON.stringify({
    throws: ['save.get', 'save.keys'],
    notSupported: ['input.set', 'input.add', 'input.insert', 'input.clear', 'input.focus', 'input.blur', 'input.setCursor', 'composer.show', 'composer.hide', 'message.send', 'message.edit', 'save.set', 'save.remove'],
    undef: ['cache.get'],
    returns: { 'composer.visible': true, 'input.get': '', 'input.getCursor': 0 }
  })};

  var stageEl = null;
  function stage(){
    if (stageEl && stageEl.parentNode) return stageEl;
    stageEl = D.createElement('div');
    stageEl.className = 'rex-stage';
    (D.querySelector('[data-chat="root"]') || D.body).appendChild(stageEl);
    return stageEl;
  }
  function input(){ return D.querySelector('[data-chat="input"]'); }
  function list(){ return D.querySelector('[data-chat="list"]'); }
  function composer(){ return D.querySelector('[data-chat="composer"]'); }

  var impl = {
    'input.get': function(){ var i = input(); return i ? i.value : ''; },
    'input.set': function(t){ var i = input(); if (i) { i.value = t; i.dispatchEvent(new Event('input', { bubbles: true })); } },
    'input.add': function(t){ var i = input(); if (i) { i.value += t; i.dispatchEvent(new Event('input', { bubbles: true })); } },
    'input.insert': function(t){ var i = input(); if (i) { var p = (i.selectionStart == null ? i.value.length : i.selectionStart); i.value = i.value.slice(0, p) + t + i.value.slice(i.selectionEnd == null ? p : i.selectionEnd); i.dispatchEvent(new Event('input', { bubbles: true })); } },
    'input.clear': function(){ var i = input(); if (i) { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); } },
    'input.focus': function(){ var i = input(); if (i) i.focus(); },
    'input.blur': function(){ var i = input(); if (i) i.blur(); },
    'input.getCursor': function(){ var i = input(); return i && i.selectionStart != null ? i.selectionStart : 0; },
    'input.setCursor': function(p){ var i = input(); if (i) { i.selectionStart = i.selectionEnd = p; } },
    'composer.show': function(){ var c = composer(); if (c) c.setAttribute('data-composer', 'visible'); },
    'composer.hide': function(){ var c = composer(); if (c) c.setAttribute('data-composer', 'hidden'); },
    'composer.visible': function(){ var c = composer(); return c ? c.getAttribute('data-composer') !== 'hidden' : false; },
    'message.send': function(t){
      var l = list();
      if (l) {
        var f = D.createElement('div'); f.setAttribute('data-chat', 'message-frame');
        var m = D.createElement('div'); m.setAttribute('data-chat', 'message'); m.setAttribute('data-from', 'user');
        var b = D.createElement('div'); b.setAttribute('data-chat', 'message-body'); b.textContent = String(t || '');
        m.appendChild(b); f.appendChild(m); l.appendChild(f);
      }
      return Promise.resolve({ ok: true });
    },
    'message.edit': function(){ return Promise.resolve({ ok: true }); },
    'cache.get': function(k){ return store['c:' + k]; },
    'cache.set': function(k, v){ store['c:' + k] = v; flush(); return Promise.resolve({ ok: true }); },
    'cache.remove': function(k){ delete store['c:' + k]; flush(); return Promise.resolve({ ok: true }); },
    'save.get': function(k){ return store[k] == null ? null : store[k]; },
    'save.set': function(k, v){ if (v == null) delete store[k]; else store[k] = v; flush(); return Promise.resolve({ ok: true }); },
    'save.remove': function(k){ delete store[k]; flush(); return Promise.resolve({ ok: true }); },
    'save.keys': function(){ return Object.keys(store).filter(function(k){ return k.indexOf('c:') !== 0; }); },
    'stage.open': function(m){ stage().setAttribute('data-open', '1'); stage().setAttribute('data-stage', m || 'content'); return Promise.resolve({ ok: true }); },
    'stage.close': function(){ if (stageEl) stageEl.removeAttribute('data-open'); return Promise.resolve({ ok: true }); },
    'stage.el': function(){ return stage(); },
    'stage.visible': function(){ return !!(stageEl && stageEl.getAttribute('data-open') === '1'); },
    'role.get': function(){ return { name: W.__REX_ROLE__ || '演示角色' }; },
    'user.get': function(){ return { nickname: '旅人' }; },
    'debug.log': function(){ console.log.apply(console, arguments); },
    'version': 'mock-1'
  };

  /* 能力包装：瘦预览按 facts.preview.thin 的实测矩阵降级，其余走完整实现 */
  function cap(name){
    return function(){
      __diag.calls.push({ name: name, profile: profile });
      if (profile === 'thin') {
        if (THIN.throws.indexOf(name) >= 0) throw serr('NOT_SUPPORTED', name + ' 在瘦预览同步抛 SdkError');
        if (THIN.notSupported.indexOf(name) >= 0) return { ok: false, code: 'NOT_SUPPORTED', capability: name };
        if (THIN.undef.indexOf(name) >= 0) return undefined;
        if (THIN.returns && name in THIN.returns) return THIN.returns[name];
      }
      return impl[name].apply(null, arguments);
    };
  }

  W.sdk = {
    version: 'mock-1',
    debug: { log: cap('debug.log') },
    input: {
      get: cap('input.get'), set: cap('input.set'), add: cap('input.add'), insert: cap('input.insert'),
      clear: cap('input.clear'), focus: cap('input.focus'), blur: cap('input.blur'),
      getCursor: cap('input.getCursor'), setCursor: cap('input.setCursor')
    },
    composer: { show: cap('composer.show'), hide: cap('composer.hide'), visible: cap('composer.visible') },
    message: { send: cap('message.send'), edit: cap('message.edit') },
    cache: { get: cap('cache.get'), set: cap('cache.set'), remove: cap('cache.remove') },
    save: { get: cap('save.get'), set: cap('save.set'), remove: cap('save.remove'), keys: cap('save.keys') },
    stage: { open: cap('stage.open'), close: cap('stage.close'), el: cap('stage.el'), visible: cap('stage.visible') },
    role: { get: cap('role.get') },
    user: { get: cap('user.get') },
    on: function(n, fn){ (bus[n] = bus[n] || []).push(fn); __diag.calls.push({ name: 'on', args: [n] }); },
    off: undefined
  };

  var FIELDS = W.__REX_FIELDS__ || [];
  function statusOf(){
    var st = { loc: '周家水号', t: '酉时', flags: ['口渴'] };
    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i];
      if (f.type === 'bar') st[f.key] = Math.max(12, 70 - i * 10);
      else if (f.type === 'tags') st[f.key] = ['口渴'];
      else if (f.key !== 'loc' && f.key !== 't') st[f.key] = '未定';
    }
    return st;
  }
  function replyOf(preset){
    var body = '他把水牌推过来，指尖在牌面上按了一下。\\n\\n「你要的水在你手里。」他说，「但我不卖水，我卖路。」';
    if (preset === 'badjson') return body + '\\n\\n<rex-status>{"loc":"别处",</rex-status>';
    if (preset === 'missing') return body + '\\n\\n<rex-status>{"loc":"别处"}</rex-status>';
    if (preset === 'empty') return '';
    return body + '\\n\\n<rex-status>' + JSON.stringify(statusOf()) + '</rex-status>';
  }
  function bubble(text){
    var l = list(); if (!l) return;
    var f = D.createElement('div'); f.setAttribute('data-chat', 'message-frame');
    var m = D.createElement('div'); m.setAttribute('data-chat', 'message');
    m.setAttribute('data-from', 'ai'); m.setAttribute('data-state', 'done');
    var b = D.createElement('div'); b.setAttribute('data-chat', 'message-body');
    b.textContent = String(text).replace(/<rex-status>[\\s\\S]*?<\\/rex-status>/g, '').trim();
    m.appendChild(b); f.appendChild(m); l.appendChild(f);
    var msgs = D.querySelector('[data-chat="messages"]'); if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  W.__mockModel = {
    presets: ['ok', 'badjson', 'missing', 'empty'],
    reply: function(preset){ return replyOf(preset || 'ok'); },
    run: function(preset){
      preset = preset || 'ok';
      var text = replyOf(preset);
      var msg = { content: text, id: 'm' + Date.now(), role: 'ai', serverId: null };
      __diag.model.push({ preset: preset, mode: 'once' });
      emit('message:new', msg);
      if (text) bubble(text);
      emit('message:mount', msg);
      emit('message:done', msg);
      return preset;
    },
    stream: function(preset){
      preset = preset || 'ok';
      var text = replyOf(preset);
      var id = 'm' + Date.now();
      var base = { id: id, role: 'ai', serverId: null };
      __diag.model.push({ preset: preset, mode: 'stream' });
      emit('message:new', Object.assign({ content: '' }, base));
      var parts = text.split(/(?=。|\\n)/);
      var acc = '';
      for (var i = 0; i < parts.length; i++) {
        acc += parts[i];
        emit('message:stream', Object.assign({ content: acc }, base));
      }
      if (text) bubble(text);
      emit('message:done', Object.assign({ content: text }, base));
      return preset;
    }
  };
  W.__previewTurn = function(){ return W.__mockModel.run('ok'); };

  W.__diagDump = function(){
    var el = D.getElementById('diag');
    if (!el) return;
    var ev = {};
    __diag.events.forEach(function(e){ ev[e.name] = (ev[e.name] || 0) + 1; });
    el.textContent = [
      'profile  ' + __diag.profile,
      'events   ' + (Object.keys(ev).map(function(k){ return k + '×' + ev[k]; }).join(' ') || '无'),
      'caps     ' + (__diag.calls.length ? __diag.calls.map(function(c){ return c.name; }).slice(-8).join(' ') : '无'),
      'model    ' + (__diag.model.length ? __diag.model.map(function(m){ return m.preset + '/' + m.mode; }).join(' ') : '无'),
      'errors   ' + (__diag.errors.length ? __diag.errors.slice(-3).join(' | ') : '无')
    ].join('\\n');
    el.style.display = 'block';
  };

  /* ---------- 场景与挂载参数（与原预览保持一致） ---------- */
  var scene = q.get('scene') || (W.location.hash || '').replace('#', '') || '';
  if (scene === 'main') {
    store.rex = { v: 2, nav: 'people', key: 'zhou', data: {
      player: { name: '无名客', gender: '男', race: '流民', trait: '求索', power: '好手', origin: '南渡口' },
      status: { loc: '周家水号', t: '申时', hp: 66, water: 38, desire: 24, intimacy: 18, flags: ['口渴'] },
      map: { at: '周家水号', visited: ['南渡口', '周家水号'] }
    }};
    flush();
  } else if (scene) {
    store.rex = null; flush();
  }

  if (q.get('slots') === '0') {
    W.addEventListener('DOMContentLoaded', function(){
      ['left', 'right'].forEach(function(s){
        var n = D.querySelector('[data-slot="' + s + '"]'); if (n) n.remove();
      });
    });
  }

  W.addEventListener('error', function(e){
    var pre = D.getElementById('err');
    if (!pre) {
      pre = D.createElement('pre'); pre.id = 'err';
      pre.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;margin:0;padding:8px;background:#7a1f1f;color:#fff;font:11px monospace;white-space:pre-wrap;max-height:40vh;overflow:auto';
      D.body.appendChild(pre);
    }
    pre.textContent += (e.message || '') + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno + '\\n';
    __diag.errors.push(e.message || 'error');
    if (D.title.indexOf('ERR') !== 0) D.title = 'ERR ' + (e.message || '').slice(0, 60);
  });

  W.addEventListener('load', function(){
    setTimeout(function(){
      var R = W.__REX__;
      if (!R) return;
      if (scene === 'forge' && R.beginForge) R.beginForge();
      if (scene === 'cover' && R.go) { R.stageClose(); R.go('cover'); }
      if (q.get('layer') === 'real') { R._layer = { zhou: 'real', __me: 'real', ya: 'real' }; R.refresh(); }
      if (q.get('turn') === '1') W.__mockModel.run('ok');
      var preset = q.get('preset');
      if (preset) setTimeout(function(){ W.__mockModel.run(preset); }, 300);
    }, 700);
  });
})();
`;

/* 冷启动事件按平台顺序补发：?cold=1 时启用（默认关闭，避免干扰既有断言） */
const COLD = `
(function(){
  var q = new URLSearchParams(location.search);
  if (q.get('cold') !== '1') return;
  setTimeout(function(){
    var t = document.querySelector('[data-chat="list"] [data-chat="message-body"]');
    var text = t ? t.textContent : '';
    var msg = { content: text, id: 'greeting', role: 'ai', serverId: null };
    window.__emit('message:new', msg);
    window.__emit('message:mount', msg);
    window.__emit('message:done', msg);
    window.__emit('ready', undefined);
  }, 1200);
})();
`;



const SHELL_CSS = `
html,body{margin:0;padding:0;height:100%;background:#070605;color:#f2ece0;
  font-family:"Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif}
[data-chat="root"]{position:relative;display:flex;flex-direction:column;height:100%;overflow:hidden}
[data-chat="header"]{flex:0 0 auto;height:52px;display:flex;align-items:center;gap:10px;
  padding:0 14px;border-bottom:1px solid #241f1b;background:#100d0b;z-index:60}
[data-chat="header-back"]{font-size:18px;color:#9a8f80}
[data-chat="header-title"]{font-size:14px;letter-spacing:.04em}
[data-chat="header-actions"]{margin-left:auto;display:flex;gap:12px;font-size:12px;color:#6b6156}
[data-chat="messages"]{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;box-sizing:border-box}
[data-chat="list"]{padding:14px 12px 8px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box}
[data-chat="message-frame"]{display:flex}
[data-chat="message"]{max-width:min(680px,86%);background:#171310;border:1px solid #2b2520;
  border-radius:12px;padding:11px 13px;font-size:13.5px;line-height:1.85;color:#e8e0d4;white-space:pre-wrap}
[data-chat="composer"]{flex:0 0 auto;border-top:1px solid #241f1b;background:#100d0b;
  padding:6px 10px 8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;z-index:60}
[data-chat="composer"] [data-slot="toolbar"]{flex:1 1 100%}
[data-chat="input"]{flex:1;min-width:0;background:#171310;border:1px solid #2b2520;border-radius:9px;
  color:#f2ece0;font:inherit;font-size:13px;padding:9px 11px;outline:none;height:38px;box-sizing:border-box}
[data-chat="send"]{background:#c9a227;color:#16110d;border:0;border-radius:9px;
  font:inherit;font-size:13px;font-weight:500;padding:9px 16px;cursor:pointer}
#bar{position:fixed;left:auto;right:8px;bottom:8px;z-index:300;display:none;gap:6px;padding:7px 9px;
  border-radius:9px;box-shadow:0 6px 20px rgba(0,0,0,.5);
  background:rgba(14,11,9,.96);border-top:1px solid #2b2520;font-size:11px;flex-wrap:wrap;align-items:center}
#bar button{background:#26211c;color:#d8cfc2;border:1px solid #3a332c;border-radius:6px;
  font:inherit;font-size:11px;padding:4px 9px;cursor:pointer}
#bar button:hover{border-color:#c9a227;color:#c9a227}
#bar span{color:#6b6156}
#diag{display:none;position:fixed;left:8px;bottom:8px;z-index:301;max-width:min(46vw,420px);
  margin:0;padding:8px 10px;border-radius:9px;background:rgba(14,11,9,.96);
  border:1px solid #2b2520;color:#b3a693;font:11px/1.6 ui-monospace,monospace;white-space:pre-wrap}
`;

const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>rex preview</title>
<style>${SHELL_CSS}</style>
<script>window.__REX_FIELDS__ = ${JSON.stringify(fields)}; window.__REX_ROLE__ = ${JSON.stringify(roleName)};</script>
<script>${MOCK}</script>
<script>${COLD}</script>
</head>
<body>
<div data-chat="root" data-theme="dark">
  <header data-chat="header">
    <span data-chat="header-back">‹</span>
    <span data-chat="header-title">${roleName}</span>
    <span data-chat="header-actions"><span>评论</span><span>分享</span></span>
  </header>
  <div data-slot="statusbar">${statusbar}</div>
  <div data-chat="messages"><div data-chat="list">
    <div data-chat="message-frame"><div data-chat="message" data-from="char">
      <div data-chat="message-body">${rendered}</div>
    </div></div>
  </div></div>
  <div data-slot="left"></div>
  <div data-slot="right"></div>
  <div data-chat="composer">
    <div data-slot="toolbar"></div>
    <input data-chat="input" placeholder="说点什么…">
    <button data-chat="send">发送</button>
  </div>
</div>
<div id="bar">
  <span>冒烟</span>
  <button onclick="__mockModel.run('ok')">正常一轮</button>
  <button onclick="__mockModel.run('badjson')">坏 JSON</button>
  <button onclick="__mockModel.run('missing')">缺字段</button>
  <button onclick="__mockModel.run('empty')">空正文</button>
  <button onclick="__mockModel.stream('ok')">流式</button>
  <button onclick="__diagDump()">诊断</button>
  <button onclick="__REX__ && __REX__.go('cover')">封面</button>
  <button onclick="__REX__ && __REX__.beginForge()">捏人</button>
  <button onclick="__REX__ && __REX__.refresh()">重绘</button>
  <button onclick="__REX__ && __REX__.reset()">清档</button>
</div>
<pre id="diag"></pre>
<script>
/* 开发条默认隐藏，带 ?dev=1 才出来，免得挡住真机布局 */
if (/[?&]dev=1/.test(location.search)) document.getElementById('bar').style.display = 'flex';
/* ?nav=people&key=zhouwan 直接落到某个栏目 / 某个人，方便截图核对 */
(function () {
  var q = new URLSearchParams(location.search);
  if (!q.get('nav') && !q.get('key')) return;
  var n = 0;
  var t = setInterval(function () {
    var R = window.__REX__;
    if (R && R.nav) {
      clearInterval(t);
      try {
        if (q.get('nav')) R.nav(q.get('nav'));
        if (q.get('key')) R.pick(q.get('key'));
      } catch (e) {}
    }
    if (++n > 80) clearInterval(t);
  }, 60);
})();
</script>
</body></html>`;

fs.mkdirSync(out, { recursive: true });
const p = path.join(out, 'demo-preview.html');
fs.writeFileSync(p, html, 'utf8');
console.log('预览已生成:', p);
console.log('  规则 ' + rules.length + ' 条 / 内联 ' + rendered.length + ' 字 / 模型字段 ' + fields.length + ' 个');
console.log('  参数: ?profile=thin 能力精度切瘦预览 · ?preset=badjson|missing|empty 模型沙盒 · ?cold=1 冷启动事件 · ?dev=1 开发条');
