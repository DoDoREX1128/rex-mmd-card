/* rex-view · 渲染与装配：世界条 / 导航 / 简要 / 详情 / 抽屉 / 存档 / boot */
(function () {
  var W = window, D = document;
  var REX = W.__REX__;
  if (!REX) { try { console.warn('[rex] kernel missing (view)'); } catch (e) {} return; }

  /* ================= 世界信息条 ================= */

  REX.renderWorld = function () {
    var host = this.ensureWorld();
    if (!host) return;
    var w = this.data.world || {}, st = this.data.status || {};
    var items = [];
    var add = function (k, v) {
      if (v == null || v === '') return;
      items.push('<span class="rex-wItem"><i>' + REX.esc(k) + '</i>' + REX.esc(v) + '</span>');
    };
    add('时', st.t || w.t);
    add('地', st.loc || w.loc || (this.data.map || {}).at);
    add('区', st.region || w.region);
    add('天', st.weather || w.weather);
    add('势', st.danger || w.danger);
    if (!items.length) items.push('<span class="rex-wItem"><i>世</i>未定</span>');
    host.innerHTML =
      '<span class="rex-wMark"></span>' +
      '<span class="rex-wRow">' + items.join('') + '</span>' +
      '<button class="rex-wBtn" type="button" data-act="openSheet">档案</button>';
  };

  /* ================= 行动条 ================= */

  REX.renderOpts = function () {
    var s = this.slots();
    var host = s.tool;
    if (!host) {
      if (!s._optBar || !s._optBar.parentNode) {
        var n = D.createElement('div');
        n.className = 'rex-tool';
        var anchor = s.comp || s.msgs || s.root;
        anchor.parentNode.insertBefore(n, anchor);
        s._optBar = n;
      }
      host = s._optBar;
    }
    var opt = (this.data.opt || []).slice(0, 4);
    if (!opt.length) { host.innerHTML = ''; return; }
    host.innerHTML = '<div class="rex-opts">' + opt.map(function (o, i) {
      return '<button class="rex-opt" type="button" data-opt="' + i + '"><span>' + REX.esc(o) + '</span></button>';
    }).join('') + '</div>';
  };

  /* ================= 导航 / 列表 / 详情 ================= */

  REX.navHTML = function () {
    var st = this.state;
    return this.order.map(function (id) {
      var d = REX.sections[id];
      if (!d) return '';
      return '<button class="rex-navBtn' + (id === st.nav ? ' is-on' : '') + '" type="button" data-nav="' + REX.esc(id) + '">' +
        REX.icon(d.icon) + '<b>' + REX.esc(d.title) + '</b></button>';
    }).join('');
  };

  REX.renderNav = function () {
    var s = this.slots();
    var html = this.navHTML();
    this.qa('.rex-nav', s.root).forEach(function (n) { n.innerHTML = html; });
    var m = this.q('.rex-mnav', s.root);
    if (m) m.innerHTML = html;
  };

  REX.rows = function () {
    var d = this.sections[this.state.nav];
    if (!d) return [];
    try { return d.brief(this) || []; } catch (e) { this.log('brief fail', this.state.nav, e && e.message); return []; }
  };

  REX.listHTML = function () {
    var d = this.sections[this.state.nav];
    if (!d) return REX.ui.empty('没有这一栏');
    var rows = this.rows();
    if (!rows.length) return REX.ui.empty(d.empty || '还是空的');
    var key = this.state.key;
    return rows.map(function (r) {
      return '<button class="rex-row' + (r.key === key ? ' is-on' : '') + '" type="button" data-key="' + REX.esc(r.key) + '">' +
        '<span class="rex-rowDot" style="--c:' + REX.esc(r.dot || 'var(--rex-accent)') + '"></span>' +
        '<span class="rex-rowBody"><b>' + REX.esc(r.head) + '</b><em>' + REX.esc(r.meta || '') + '</em></span>' +
        (r.tag ? '<span class="rex-rowTag">' + REX.esc(r.tag) + '</span>' : '') +
        '</button>';
    }).join('');
  };

  REX.renderList = function () {
    var s = this.slots();
    var d = this.sections[this.state.nav];
    var rows = this.rows();
    var title = d ? d.title : '';
    var cnt = rows.length ? rows.length + ' 项' : '';
    this.qa('.rex-listHead h3', s.root).forEach(function (n) { n.textContent = title; });
    this.qa('.rex-count', s.root).forEach(function (n) { n.textContent = cnt; });
    var html = this.listHTML();
    this.qa('.rex-listBody', s.root).forEach(function (n) { n.innerHTML = html; });
  };

  REX.detailHTML = function () {
    var d = this.sections[this.state.nav];
    if (!d) return '';
    if (!this.state.key) {
      var first = this.rows()[0];
      if (first) this.state.key = first.key;
    }
    try { return d.detail(this, this.state.key) || REX.ui.empty('这一页是空的'); } catch (e) {
      this.log('detail fail', this.state.nav, e && e.message);
      return REX.ui.empty('这一页没画出来');
    }
  };

  REX.renderDetail = function (host) {
    var s = this.slots();
    var box = host || this.q('.rex-detailBody', s.root);
    if (!box) return;
    var d = this.sections[this.state.nav];
    box.innerHTML = this.detailHTML();
    box.scrollTop = 0;
    if (d && d.after) { try { d.after(this, box, this.state.key); } catch (e) { this.log('detail after', e && e.message); } }
  };

  REX.rowHead = function () {
    var rows = this.rows();
    for (var i = 0; i < rows.length; i++) if (rows[i].key === this.state.key) return rows[i].head;
    return '';
  };

  /* ================= 移动抽屉 ================= */

  REX.renderSheet = function () {
    var s = this.slots();
    var sheet = this.q('.rex-sheet', s.root);
    if (!sheet) return;
    var d = this.sections[this.state.nav];
    var st = this.state;
    sheet.setAttribute('data-level', st.level);
    var h3 = this.q('.rex-sheetHead h3', sheet);
    if (h3) h3.textContent = st.level === 'detail' ? (this.rowHead() || (d ? d.title : '')) : (d ? d.title : '');
    var back = this.q('.rex-back', sheet);
    if (back) back.style.visibility = st.level === 'detail' ? 'visible' : 'hidden';
    var body = this.q('.rex-sheetBody', sheet);
    if (!body) return;
    if (st.level === 'brief') {
      body.innerHTML = '<div class="rex-list rex-list-inSheet">' + this.listHTML() + '</div>';
    } else {
      body.innerHTML = '<div class="rex-detailBody"></div>';
      this.renderDetail(this.q('.rex-detailBody', sheet));
    }
    body.scrollTop = 0;
  };

  REX.openSheet = function () {
    var s = this.slots();
    var sheet = this.q('.rex-sheet', s.root);
    if (!sheet) return;
    this.state.sheet = true;
    sheet.setAttribute('data-open', '1');
    s.root.setAttribute('data-rex-sheet', '1');
    this.renderNav();
    this.renderSheet();
    this.metrics();
  };

  REX.closeSheet = function () {
    var s = this.slots();
    var sheet = this.q('.rex-sheet', s.root);
    this.state.sheet = false;
    if (sheet) sheet.removeAttribute('data-open');
    s.root.removeAttribute('data-rex-sheet');
  };

  /* ================= 交互 ================= */

  REX.nav = function (id) {
    if (!this.sections[id]) return;
    var st = this.state;
    st.nav = id;
    st.level = 'brief';
    st.key = null;
    var rows = this.rows();
    if (rows.length) st.key = rows[0].key;
    if (st.mode === 'wide') { this.renderNav(); this.renderList(); this.renderDetail(); }
    else { this.renderNav(); this.openSheet(); }
  };

  REX.pick = function (key) {
    var st = this.state;
    st.key = key;
    if (st.mode === 'wide') { this.renderList(); this.renderDetail(); }
    else { st.level = 'detail'; this.renderSheet(); }
  };

  REX.back = function () {
    if (this.state.level === 'detail') { this.state.level = 'brief'; this.renderSheet(); }
    else this.closeSheet();
  };

  REX.refresh = function () {
    if (!this.state.booted) return;
    /* 有一部分宿主改尺寸时不会派 resize（display 切换、容器查询、嵌入页），
       所以刷新时顺手校一次模式，别等事件。 */
    var want = this.isWide() ? 'wide' : 'narrow';
    if (want !== this.state.mode) { this._slots = null; this.buildArmature(); }
    this.renderWorld();
    this.renderOpts();
    if (this.state.mode === 'wide') {
      this.renderNav(); this.renderList(); this.renderDetail();
    } else {
      this.renderNav();
      if (this.state.sheet) this.renderSheet();
    }
    this.metrics();
  };

  REX.renderAll = function () { this.refresh(); };

  REX.fillInput = function (text) {
    var r = this.tryCall('input.set', [text]);
    if (r.ok) { Promise.resolve(r.val).catch(function(){REX.toast('输入框写入失败，草稿已保留');}); this.tryCall('input.focus', []); return true; }
    var s = this.slots();
    if (s.input) {
      try {
        s.input.value = text;
        s.input.dispatchEvent(new Event('input', { bubbles: true }));
        s.input.focus();
        return true;
      } catch (e) {}
    }
    this.log('fill fail: 没有输入框也没有 sdk.input');
    return false;
  };

  /* Persistence lives in store.js; keep one runtime authority. */

  /* ================= 装配 ================= */

  REX.buildArmature = function () {
    var self = this;
    var s = this.slots(true);
    if (!s.root) return false;
    this.state.mode = this.isWide() ? 'wide' : 'narrow';
    s.root.setAttribute('data-rex-mode', this.state.mode);

    this.ensureWorld();

    /* 左：导航 + 简要信息；右：全部信息。优先用平台槽，没有就自建同层 dock */
    if (this.state.mode === 'wide') {
      var dl = s.dockL || this.mkDock('L');
      var dr = s.dockR || this.mkDock('R');
      s.dockL = dl; s.dockR = dr;
      dl.className = 'rex-dockL'; dr.className = 'rex-dockR';
      dl.innerHTML = '<div class="rex-rail"><nav class="rex-nav"></nav>' +
        '<section class="rex-list"><header class="rex-listHead"><h3></h3><span class="rex-count"></span></header>' +
        '<div class="rex-listBody"></div></section></div>';
      dr.innerHTML = '<div class="rex-detail"><div class="rex-detailBody"></div></div>';
      var mn = this.q('.rex-mnav', s.root); if (mn) mn.remove();
      var sh = this.q('.rex-sheet', s.root); if (sh) sh.remove();
    } else {
      if (s.dockL) { s.dockL.remove(); s.dockL = null; }
      if (s.dockR) { s.dockR.remove(); s.dockR = null; }
      var mnav = this.q('.rex-mnav', s.root);
      if (!mnav) { mnav = D.createElement('nav'); mnav.className = 'rex-mnav'; s.root.appendChild(mnav); }
      var sheet = this.q('.rex-sheet', s.root);
      if (!sheet) { sheet = D.createElement('section'); sheet.className = 'rex-sheet'; s.root.appendChild(sheet); }
      sheet.innerHTML = '<header class="rex-sheetHead"><button class="rex-back" type="button" aria-label="返回">←</button>' +
        '<h3></h3><button class="rex-x" type="button" aria-label="收起">×</button></header>' +
        '<div class="rex-sheetBody"></div>';
    }

    if (!s.root._rexBound) {
      s.root._rexBound = 1;
      this.listen(s.root, 'click', function (e) {
        var t = e.target, hit;
        if ((hit = t.closest && t.closest('[data-nav]'))) { self.nav(hit.getAttribute('data-nav')); return; }
        if ((hit = t.closest && t.closest('[data-key]'))) { self.pick(hit.getAttribute('data-key')); return; }
        if ((hit = t.closest && t.closest('[data-opt]'))) {
          var text = (self.data.opt || [])[+hit.getAttribute('data-opt')];
          if (text) { self.fillInput(text); self.toast('已填入输入框'); }
          return;
        }
        if (t.closest && t.closest('.rex-back')) { self.back(); return; }
        if (t.closest && t.closest('.rex-x')) { self.closeSheet(); return; }
        if ((hit = t.closest && t.closest('[data-act]'))) {
          if (hit.getAttribute('data-act') === 'openSheet') { self.openSheet(); return; }
          var fn = self.actions[hit.getAttribute('data-act')];
          if (fn) { try { fn(self, hit); } catch (err) { self.log('act fail', err && err.message); } }
        }
      });
      var onSize = function () {
        var wide = self.isWide() ? 'wide' : 'narrow';
        if (wide !== self.state.mode) {
          self._slots = null;
          self.buildArmature();
          self.renderNav();
          self.refresh();
        }
        self.metrics();
      };
      this.listen(W,'resize',onSize);
      this.listen(W,'orientationchange',onSize);
    }
    return true;
  };

  REX.boot = function () {
    var self = this;
    var tries = 0;
    var tick = function () {
      if (self.disposed) return;
      var s = self.slots(true);
      var ready = s.root && (s.msgs || s.comp || s.left || s.hdr);
      if (!ready && tries++ < 40) { setTimeout(tick, 120); return; }
      if (!self.buildArmature()) { if (tries++ < 40) setTimeout(tick, 120); return; }
      self.state.booted = true;
      var has = false;
      has = self.applySave(self.saveGet('rex'));
      if (!self.sections[self.state.nav]) self.state.nav = self.order[0] || '';
      self.metrics();
      if (has) {
        self.refresh();
        if (self.stageVisible()) self.stageClose();
      } else if ((self.content().features || {}).cover) {
        self.go('cover');
      } else { self.refresh(); }
      self.log('boot', self.state.mode, has ? 'resume' : 'new');
    };
    tick();
  };

  REX.afterReady = function () {
    var self = this;
    if (this._readyQueued) return;
    this._readyQueued = true;
    setTimeout(function () { self.boot(); }, 0);
  };

})();
