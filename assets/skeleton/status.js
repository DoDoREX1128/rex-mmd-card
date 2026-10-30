/* rex-status · 状态解析 / 白名单裁剪 / 接线
   模型每轮在正文里吐一个 [rex-status]{…}[/rex-status]，这里只认这个块，别的一概不猜。
   原文由一条替换规则消耗（build 自动生成 status-hide），所以气泡里看不到 JSON。 */
(function () {
  var REX = window.__REX__;
  if (!REX) { try { console.warn('[rex] kernel missing (status)'); } catch (e) {} return; }
  var C = function () { return window.__REX_CONTENT__ || {}; };

  var RE_BLOCK = /\[rex-status\]([\s\S]*?)\[\/rex-status\]/;
  var RE_BLOCK_OLD = /<rex-status>([\s\S]*?)<\/rex-status>/;   // 旧卡兼容

  /* ---------- 三级容错：直读 → 修引号/裸键 → 正则捞关键字段 ---------- */
  function parse(raw) {
    var s = String(raw || '').trim();
    s = s.replace(/^```[a-z]*\s*/i, '').replace(/```$/g, '');
    var a = s.indexOf('{');
    if (a < 0) return null;
    var b = s.lastIndexOf('}');
    /* 括号不配对也要往下走 —— 那正是模型最常见的坏法，直接 return null 等于兜底永远不可达 */
    s = b > a ? s.slice(a, b + 1) : s.slice(a);
    try { return JSON.parse(s); } catch (e) {}
    var f = s.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'")
      .replace(/\uff0c/g, ',').replace(/\uff1a/g, ':')
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([{\[,]\s*)([A-Za-z_]\w*)(\s*:)/g, '$1"$2"$3');
    try { return JSON.parse(f); } catch (e) {}
    var out = {}, m;
    if ((m = /"loc"\s*:\s*"([^"]{0,24})"/.exec(s))) out.loc = m[1];
    if ((m = /"t"\s*:\s*"([^"]{0,24})"/.exec(s))) out.t = m[1];
    if ((m = /"hp"\s*:\s*(\d{1,3})/.exec(s))) out.hp = Number(m[1]);
    return Object.keys(out).length ? out : null;
  }
  REX.parseStatus = parse;

  /* ---------- 白名单裁剪：绝不 Object.assign 整块 ---------- */
  function clipStatus(obj) {
    var fs = ((C().status || {}).fields) || [];
    var out = {}, took = 0;
    fs.forEach(function (f) {
      var v = obj[f.key];
      if (v === undefined || v === null) return;
      if (f.type === 'bar') {
        var n = Number(v);
        if (!isFinite(n)) return;
        out[f.key] = Math.max(0, Math.min(f.max || 100, Math.round(n)));
      } else if (f.type === 'tag') {
        if (!Array.isArray(v)) return;
        out[f.key] = v.slice(0, 5).map(function (x) { return String(x).slice(0, 10); });
      } else {
        out[f.key] = String(v).slice(0, 40);
      }
      took++;
    });
    if (Array.isArray(obj.opt)) {
      out.opt = obj.opt.slice(0, 4).map(function (x) { return String(x).slice(0, 24); });
    }
    return { data: out, took: took };
  }

  function clipPriv(p) {
    if (!p || typeof p !== 'object') return null;
    var out = {}, any = false;
    Object.keys(p).forEach(function (k) {
      var d = p[k];
      if (!d || typeof d !== 'object') {
        if (typeof d === 'string') { out[k] = { st: d.slice(0, 12) }; any = true; }
        return;
      }
      var e = {};
      if (d.st != null) { e.st = String(d.st).slice(0, 12); }
      if (d.ml != null) { var ml = Number(d.ml); if (isFinite(ml)) e.ml = Math.max(0, Math.min(99, Math.round(ml))); }
      if (d.fixed != null) { e.fixed = String(d.fixed).slice(0, 60); }
      if (d.rt != null) { e.rt = String(d.rt).slice(0, 60); }
      if (Array.isArray(d.spec)) {
        e.spec = d.spec.slice(0, 6).map(function (x) {
          return [String(x && x[0] != null ? x[0] : '').slice(0, 10), String(x && x[1] != null ? x[1] : '').slice(0, 14)];
        });
      }
      if (Object.keys(e).length) { out[k] = e; any = true; }
    });
    return any ? out : null;
  }

  function clipNpcs(obj) {
    if (!obj || typeof obj !== 'object') return null;
    var known = { '__me': 1 };
    ((C().npcs) || []).forEach(function (n) { known[n.key] = 1; });
    var out = {}, any = false;
    Object.keys(obj).forEach(function (k) {
      if (!known[k]) return;
      var s = obj[k];
      if (!s || typeof s !== 'object') return;
      var e = {};
      if (s.rel != null) { var r = Number(s.rel); if (isFinite(r)) e.rel = Math.max(0, Math.min(100, Math.round(r))); }
      if (Array.isArray(s.surface)) {
        e.surface = s.surface.slice(0, 8).map(function (x) {
          return [String(x && x[0] != null ? x[0] : '').slice(0, 10), String(x && x[1] != null ? x[1] : '').slice(0, 40)];
        });
      }
      if (Array.isArray(s.hooks)) e.hooks = s.hooks.slice(0, 3).map(function (x) { return String(x).slice(0, 80); });
      if (s.note != null) e.note = String(s.note).slice(0, 120);
      var pv = clipPriv(s.priv);
      if (pv) e.priv = pv;
      if (Object.keys(e).length) { out[k] = e; any = true; }
    });
    return any ? out : null;
  }

  /* ---------- 应用 ---------- */

  REX.applyStatus = function (raw, silent) {
    var obj = parse(raw);
    if (!obj) { if (!silent) REX.repairHint(); return false; }
    var c = clipStatus(obj);
    if (c.took) {
      /* 缺字段不清零：只覆盖这轮真的给了的键 */
      Object.keys(c.data).forEach(function (k) { REX.data.status[k] = c.data[k]; });
    }
    if (c.data.opt) REX.data.opt = c.data.opt;
    if (c.data.flags) REX.data.flags = c.data.flags;

    var loc = c.data.loc || obj.loc;
    if (loc) {
      var m = Object.assign({}, REX.data.map);
      m.at = String(loc);
      var v = (m.visited || []).slice();
      if (v.indexOf(m.at) < 0) v.push(m.at);
      m.visited = v.slice(-16);
      REX.data.map = m;
    }
    var np = clipNpcs(obj.npcs);
    if (np) {
      REX.data.npcs = REX.data.npcs || {};
      Object.keys(np).forEach(function (k) {
        var old = REX.data.npcs[k] || {};
        REX.data.npcs[k] = Object.assign({}, old, np[k]);
        /* priv 按部位合并：这轮只写了一个部位，不该把别的部位清掉 */
        if (old.priv && np[k].priv) REX.data.npcs[k].priv = Object.assign({}, old.priv, np[k].priv);
      });
    }
    if (Array.isArray(obj.codex)) {
      REX.data.codex = REX.data.codex || {};
      var un = (REX.data.codex.unlocked || []).slice();
      obj.codex.slice(0, 6).forEach(function (id) {
        var s = String(id);
        if (un.indexOf(s) < 0) un.push(s);
      });
      REX.data.codex.unlocked = un;
    }
    REX.data.log = REX.data.log || [];
    if (c.took || np) REX.data.log.push(Date.now());

    REX.refresh();
    REX.persist(true);
    return true;
  };

  /* ---------- 自修复提示 ---------- */
  REX.repairHint = function () {
    var s = REX.slots();
    if (!s.root || REX.q('[data-rex-repair]', s.root)) return;
    var d = document.createElement('div');
    d.className = 'rex-repair';
    d.setAttribute('data-rex-repair', '1');
    d.innerHTML = '<span>这轮状态块没读到，已沿用上一轮。</span>' +
      '<button class="rex-btn" type="button">知道了</button>';
    s.root.appendChild(d);
    d.querySelector('button').addEventListener('click', function () { d.remove(); });
    REX.timer(function () { if (d.parentNode) d.remove(); }, 10000);
  };

  /* ---------- 接线 ---------- */

  function scan() {
    var s = REX.slots();
    if (!s.root) return;
    var els = REX.qa('[data-rex-json]', s.root);
    if (!els.length) return;
    var last = els[els.length - 1];
    var txt = last.getAttribute('data-rex-json') || last.textContent || '';
    if (txt && txt !== REX._lastJson) { REX._lastJson = txt; REX.applyStatus(txt); }
    els.forEach(function (e) { e.style.display = 'none'; });
  }

  REX.on('message:done', function (msg) {
    var text = (msg && (msg.content || msg.text)) || '';
    var m = RE_BLOCK.exec(text) || RE_BLOCK_OLD.exec(text);
    if (m) { REX.applyStatus(m[1]); return; }
    scan();
  });
  REX.on('message:mount', function () { REX.timer(scan, 120); });

  REX.timer(function () { if (REX.state.booted) scan(); }, 1200);
})();
