/* rex-core · 微内核：四区同层装配 / 导航-简要-详情 / 抽屉 / 存档 / 事件
   改这里之前先读 references/40-界面-卡架构.md。只此一份，后加载模块往 window.__REX__ 挂。 */
(function () {
  var W = window, D = document;
  if (W.__REX__ && W.__REX__.ver === 3 && !W.__REX__.disposed) return;
  if (W.__REX__ && W.__REX__.destroy) W.__REX__.destroy();

  var REX = {
    ver: 3,
    disposed: false,
    _listeners: [],
    _unsub: [],
    sdk: null,
    state: {
      booted: false,
      mode: 'narrow',        // wide = 导航+简要 / 全部信息 三列同层；narrow = 底部导航 + 上滑抽屉
      scene: '',             // '' | 'cover' | 'forge'
      hasSave: false,
      nav: '',
      key: null,
      sheet: false,
      level: 'brief'         // 抽屉内：brief 列表 → detail 详情
    },
    data: {
      player: {}, status: {}, world: {}, npcs: {}, codex: {}, bag: [],
      log: [], flags: [], opt: [], map: {}
    },
    sections: {},
    order: [],
    scenes: {},
    actions: {},
    _timers: [],
    _slots: null,
    _ev: {}
  };

  /* ================= 基础 ================= */

  REX.content = function () {
    if (!this._c) this._c = W.__REX_CONTENT__ || {};
    return this._c;
  };
  REX.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  REX.q = function (sel, root) { try { return (root || D).querySelector(sel); } catch (e) { return null; } };
  REX.qa = function (sel, root) { try { return [].slice.call((root || D).querySelectorAll(sel)); } catch (e) { return []; } };
  /* Sandbox route: use only the published SDK, never guessed globals. */
  REX.sdkGet = function () { return W.sdk || null; };
  REX.tryCall = function (p, args) {
    var s = this.sdkGet();
    if (!s) return { ok: false };
    var parts = String(p).split('.'), cur = s, own = null, i;
    for (i = 0; i < parts.length; i++) {
      own = cur;
      cur = (cur == null) ? null : cur[parts[i]];
      if (cur == null) return { ok: false };
    }
    if (typeof cur !== 'function') return { ok: true, val: cur };
    try { return { ok: true, val: cur.apply(own, args || []) }; } catch (e) { return { ok: false }; }
  };

  REX.log = function () {
    var r = this.tryCall('debug.log', ['[rex]'].concat([].slice.call(arguments)));
    if (!r.ok) { try { console.log.apply(console, ['[rex]'].concat([].slice.call(arguments))); } catch (e) {} }
  };
  REX.timer = function (fn, ms) {
    var id = setTimeout(fn, ms || 0);
    this._timers.push(id);
    return id;
  };
  REX.toast = function (msg, ms) {
    var host = (this._slots && this._slots.root) || D.body;
    var t = this.q('.rex-toast', host);
    if (!t) { t = D.createElement('div'); t.className = 'rex-toast'; host.appendChild(t); }
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('is-on'); }, ms || 1600);
  };

  REX.on = function(name,fn) {
    var self=this;
    if(this._ev[name]) { this._ev[name].push(fn); return; }
    this._ev[name]=[fn];
    var sdk=this.sdkGet();
    if(sdk && typeof sdk.on==='function') {
      var off=sdk.on(name,function(payload){
        if(self.disposed)return;
        (self._ev[name]||[]).slice().forEach(function(f){try{f(payload);}catch(e){self.log('event',name,e.message);}});
      });
      if(typeof off==='function')this._unsub.push(off);
    }
  };
  REX.listen=function(el,name,fn,options){el.addEventListener(name,fn,options);this._listeners.push(function(){el.removeEventListener(name,fn,options);});};
  REX.destroy=function(){
    if(this.disposed)return;this.disposed=true;
    this._timers.forEach(clearTimeout);clearTimeout(this._saveH);
    this._listeners.splice(0).forEach(function(f){f();});this._unsub.splice(0).forEach(function(f){f();});
    this.qa('.rex-world,.rex-dockL,.rex-dockR,.rex-mnav,.rex-sheet,.rex-tool,.rex-toast').forEach(function(n){n.remove();});
    if(this.stageVisible())this.stageClose();
    if(this._slots && this._slots.root)delete this._slots.root._rexBound;
    this._slots=null;
  };
  /* ================= 注册表 ================= */

  REX.section = function (id, def) {
    if (!this.sections[id]) this.order.push(id);
    this.sections[id] = def;
    if (!this.state.nav) this.state.nav = id;
    if (this.state.booted) this.refresh();
  };
  REX.scene = function (id, def) { this.scenes[id] = def; };

  /* ================= 槽位 ================= */

  REX.slots = function (force) {
    if (this._slots && !force) return this._slots;
    var root = this.q('[data-chat="root"]') || D.body;
    var s = {
      root: root,
      hdr: this.q('[data-chat="header"]', root),
      bar: this.q('[data-slot="statusbar"]', root),
      left: this.q('[data-slot="left"]', root),
      right: this.q('[data-slot="right"]', root),
      tool: this.q('[data-slot="toolbar"]', root),
      msgs: this.q('[data-chat="messages"]', root),
      comp: this.q('[data-chat="composer"]', root),
      input: this.q('[data-chat="input"]', root),
      world: this.q('#rex-world', root),
      dockL: this.q('.rex-dockL', root),
      dockR: this.q('.rex-dockR', root)
    };
    this._slots = s;
    return s;
  };

  REX.isWide = function () { return W.innerWidth >= 1024; };

  /* 世界信息条：自己建，不依赖 statusbar 槽是否为空 */
  REX.ensureWorld = function () {
    var s = this.slots();
    if (s.world && s.world.parentNode) return s.world;
    var n = D.createElement('div');
    n.id = 'rex-world';
    n.className = 'rex-world';
    var anchor = s.bar || s.hdr;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(n, anchor.nextSibling);
    else s.root.insertBefore(n, s.root.firstChild);
    s.world = n;
    return n;
  };

  REX.mkDock = function (side) {
    var s = this.slots();
    var cls = side === 'L' ? 'rex-dockL' : 'rex-dockR';
    var n = D.createElement('aside');
    n.className = cls;
    s.root.appendChild(n);
    if (side === 'L') s.dockL = n; else s.dockR = n;
    return n;
  };

  /* 头顶/脚下高度按宿主真实布局量，绝不写死 */
  REX.metrics = function () {
    var s = this.slots();
    var root = s.root;
    if (!root) return;
    var vh = W.innerHeight;
    var top = s.hdr ? Math.max(0, Math.round(s.hdr.getBoundingClientRect().bottom)) : 0;
    var bot = s.comp ? Math.max(0, Math.round(vh - s.comp.getBoundingClientRect().top)) : 0;
    root.style.setProperty('--rex-top', top + 'px');
    root.style.setProperty('--rex-bot', bot + 'px');
    var wb = s.world ? Math.round(s.world.getBoundingClientRect().height) : 0;
    root.style.setProperty('--rex-worldH', wb + 'px');
    var stop = s.world ? Math.round(s.world.getBoundingClientRect().bottom) : top;
    root.style.setProperty('--rex-sheetTop', Math.max(0, stop) + 'px');
    var mnav = this.q('.rex-mnav', root);
    var mh = mnav ? Math.round(mnav.getBoundingClientRect().height) : 0;
    if (mh) root.style.setProperty('--rex-mnavH', mh + 'px');
  };

  /* ================= 场景（封面 / 捏人，走舞台全屏） ================= */

  /* 舞台：优先用宿主 sdk.stage；拿不到就在 root 里自建同层覆盖层 */
  REX.stageEl = function () {
    var s = this.slots();
    if (s.stageEl && s.stageEl.parentNode) return s.stageEl;
    var r = this.tryCall('stage.el', []);
    var el = (r.ok && r.val) ? r.val : null;
    if (!el) { this.log('舞台不可用'); return null; }
    s.stageEl = el;
    return el;
  };
  REX.stageOpen = function (mode) {
    var el = this.stageEl();
    if (!el) return null;
    el.setAttribute('data-open', '1');
    this.tryCall('stage.open', [mode || 'full']);
    return el;
  };
  REX.stageClose = function () {
    var s = this.slots();
    this.tryCall('stage.close', []);
    if (s.stageEl) {
      s.stageEl.removeAttribute('data-open');
      s.stageEl.innerHTML = '';
    }
    this.state.scene = '';
  };
  REX.stageVisible = function () {
    var r = this.tryCall('stage.visible', []);
    if (r.ok) return !!r.val;
    var el = this.slots().stageEl;
    return !!(el && el.getAttribute('data-open') === '1');
  };

  REX.go = function (id) {
    var def = this.scenes[id];
    if (!def) { this.log('no scene', id); return; }
    this.state.scene = id;
    var el = this.stageVisible() ? this.stageEl() : this.stageOpen('full');
    if (!el) return;
    el.innerHTML = '';
    var node = def.render(this);
    if (node) { node.className = 'rex-scene rex-scene-' + id; el.appendChild(node); }
    if (def.after) { try { def.after(this, node); } catch (e) { this.log('scene after', e && e.message); } }
  };

  REX.closeStage = function () { this.stageClose(); };

  W.__REX__ = REX;
  REX.on('dispose', function(){ REX.destroy(); });

  /* 自点火：正文里的内核先跑，不必等 statusbar 的 ping 先到 */
  setTimeout(function () { try { if (!REX.disposed && REX.afterReady) REX.afterReady(); } catch (e) {} }, 0);
})();
