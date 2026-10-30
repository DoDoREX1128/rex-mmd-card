/* rex-scene · 封面 / 捏人（走舞台全屏；进主界面后舞台关闭，改用同层四区） */
(function () {
  var REX = window.__REX__;
  if (!REX) { try { console.warn('[rex] kernel missing (scenes)'); } catch (e) {} return; }
  var C = function () { return window.__REX_CONTENT__ || {}; };
  var esc = REX.esc;
  var opt = function (o) { return typeof o === 'string' ? { v: o, d: '' } : (o || {}); };

  /* ================= 封面 ================= */

  REX.scene('cover', {
    render: function (R) {
      var m = C().meta || {}, t = C().theme || {}, wd = C().world || {};
      var hasSave = !!(R.state.hasSave || (R.data.player && R.data.player.name));
      var bg = t.cover
        ? 'background-image:url(' + esc(t.cover) + ');background-size:cover;background-position:center'
        : 'radial-gradient(120% 80% at 72% 18%,' + (t.accent2 || '#3a2a1c') + '33 0%,#16110d 46%,#0a0807 100%)';
      var n = document.createElement('div');
      n.innerHTML =
        '<div class="rex-coverBg" style="' + bg + '"></div>' +
        '<div class="rex-coverMark" aria-hidden="true">' + esc(String(m.title || m.name || '·').slice(0, 1)) + '</div>' +
        '<div class="rex-coverBody">' +
          (wd.era ? '<div class="rex-eyebrow"><i></i><span>' + esc(wd.era) + '</span></div>' : '') +
          '<h1 class="rex-title">' + esc(m.title || m.name || '未命名') + '</h1>' +
          '<p class="rex-sub">' + esc(m.subtitle || '') + '</p>' +
          '<div class="rex-flex rex-coverBtns">' +
            (hasSave ? '<button class="rex-btn" data-act="continue">继续</button>' : '') +
            '<button class="rex-btn' + (hasSave ? '' : ' is-primary') + '" data-act="start">开始</button>' +
            '<button class="rex-btn" data-act="set">设置</button>' +
            '<span class="rex-spacer"></span>' +
            '<span class="rex-k">v' + esc(m.version || '1.0') + '</span>' +
          '</div>' +
        '</div>';
      return n;
    },
    after: function (R, node) {
      node.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b) return;
        var a = b.getAttribute('data-act');
        if (a === 'start') {
          if (b.getAttribute('data-v') !== 'primary' && R.state.hasSave && !confirm('重新开始会覆盖当前进度，确定？')) return;
          R.beginForge();
        } else if (a === 'continue') {
          R.closeStage();
          R.refresh();
        } else if (a === 'set') {
          R.closeStage();
          R.state.nav = 'set';
          R.refresh();
        }
      });
    }
  });

  /* ================= 捏人 ================= */

  REX.beginForge = function () {
    if (!(C().features || {}).forge) {
      this.closeStage();
      this.refresh();
      return;
    }
    this.state.forge = this.state.forge || {};
    this.go('forge');
  };

  /* One validator serves both the button state and the actual commit. */
  REX.validateForge = function () {
    var st = this.state.forge || {}, values = {}, errors = [];
    ((C().player || {}).fields || []).forEach(function (f) {
      if (!f || typeof f.key !== 'string' || !/^[\p{L}_][\p{L}\p{N}_-]{0,63}$/u.test(f.key) ||
          ['__proto__', 'constructor', 'prototype'].indexOf(f.key) >= 0) {
        errors.push('创建字段名无效'); return;
      }
      var raw = Object.prototype.hasOwnProperty.call(st, f.key) ? st[f.key] : f.default;
      var value = String(raw == null ? '' : raw).trim(), label = f.label || f.key;
      values[f.key] = value;
      if (!value) { if (!f.optional) errors.push('请填写或选择' + label); return; }
      if (f.type === 'text') {
        var max = Number(f.maxLength == null ? f.max : f.maxLength);
        if (isFinite(max) && max > 0 && value.length > max) errors.push(label + '最多' + max + '字');
      } else {
        var options = f.source === 'map.nodes'
          ? ((C().map || {}).nodes || []).map(function (n) { return n.name; })
          : (f.options || []).map(function (o) { return opt(o).v; });
        if (options.map(String).indexOf(value) < 0) errors.push('请重新选择' + label);
      }
    });
    return {values:values, errors:errors};
  };

  REX.scene('forge', {
    render: function (R) {
      var p = (C().player || {}).fields || [];
      var st = R.state.forge || (R.state.forge = {});
      var nodes = (C().map || {}).nodes || [];
      var rows = p.map(function (f) {
        var fv = st[f.key] == null ? (f.default == null ? '' : String(f.default)) : st[f.key];
        var body;
        if (f.type === 'text') {
          body = f.multiline
            ? '<textarea class="rex-input" rows="2" data-f="' + esc(f.key) + '" placeholder="' + esc(f.hint || f.label) + '">' + esc(fv) + '</textarea>'
            : '<input class="rex-input" data-f="' + esc(f.key) + '" value="' + esc(fv) + '" placeholder="' + esc(f.hint || f.label) + '">';
        } else {
          var list = (f.source === 'map.nodes'
            ? nodes.map(function (x) { return { v: x.name, d: (x.note || '') }; })
            : (f.options || []).map(opt));
          body = '<div class="rex-picks">' + list.map(function (o) {
            return '<button class="rex-pick" type="button" data-f="' + esc(f.key) + '" data-val="' + esc(o.v) + '"' +
              (fv === o.v ? ' data-on="1"' : '') + '>' +
              '<b>' + esc(o.v) + '</b>' + (o.d ? '<em>' + esc(o.d) + '</em>' : '') + '</button>';
          }).join('') + '</div>';
        }
        return '<section class="rex-field" data-field="' + esc(f.key) + '">' +
          '<div class="rex-fieldK">' + esc(f.label) + (f.optional ? '<i>可空</i>' : '') + '</div>' + body + '</section>';
      }).join('');

      var n = document.createElement('div');
      n.innerHTML =
        '<div class="rex-forgeBody">' +
          '<header class="rex-forgeHead">' +
            '<h2 class="rex-title">你将成为谁</h2>' +
            '<p class="rex-sub">' + esc((C().world || {}).era || '') + '</p>' +
          '</header>' +
          '<div data-rows>' + rows + '</div>' +
          '<div class="rex-forgeFoot">' +
            '<button class="rex-btn" data-act="back">返回</button>' +
            '<span class="rex-spacer"></span>' +
            '<span class="rex-k" data-need></span>' +
            '<button class="rex-btn is-primary" data-act="enter" disabled>入局</button>' +
          '</div>' +
        '</div>';
      return n;
    },
    after: function (R, node) {
      var p = (C().player || {}).fields || [];
      var st = R.state.forge || (R.state.forge = {});
      var check = function () {
        var errors = R.validateForge().errors;
        var btn = node.querySelector('[data-act="enter"]');
        if (btn) btn.disabled = !!errors.length;
        var tip = node.querySelector('[data-need]');
        if (tip) tip.textContent = errors[0] || '';
      };
      node.addEventListener('input', function (e) {
        var f = e.target.getAttribute('data-f');
        if (!f) return;
        st[f] = e.target.value;
        check();
      });
      node.addEventListener('change', check);
      node.addEventListener('click', function (e) {
        var o = e.target.closest('.rex-pick');
        if (o) {
          var k = o.getAttribute('data-f');
          st[k] = o.getAttribute('data-val');
          Array.prototype.forEach.call(node.querySelectorAll('.rex-pick[data-f="' + k + '"]'), function (b) {
            b.removeAttribute('data-on');
          });
          o.setAttribute('data-on', '1');
          check();
          return;
        }
        var a = e.target.closest('[data-act]');
        if (!a) return;
        if (a.getAttribute('data-act') === 'back') {
          if ((C().features || {}).cover) R.go('cover');
          else { R.closeStage(); R.refresh(); }
        }
        if (a.getAttribute('data-act') === 'enter') R.commitForge();
      });
      check();
    }
  });

  REX.commitForge = async function () {
    if (this._forgeSubmitting) return false;
    var checked = this.validateForge(), p = (C().player || {}).fields || [];
    if (checked.errors.length) { this.toast(checked.errors[0]); return false; }
    var player = checked.values;
    if (!player.name) player.name = (C().meta || {}).defaultName || '无名';
    var lines = ['【角色创建】'];
    p.forEach(function (f) { if (player[f.key]) lines.push(f.label + '：' + player[f.key]); });
    this.state.creationDraft = lines.join('\n');
    this._forgeSubmitting = true;
    try {
      if (!await this.writeDraft(this.state.creationDraft)) {
        this.toast('输入框写入失败，创建选择与草稿已保留'); return false;
      }
    } finally { this._forgeSubmitting = false; }
    this.data.player = player;

    var sf = (C().status || {}).fields || [];
    this.data.status = this.data.status || {};
    var self = this;
    sf.forEach(function (f) {
      if (self.data.status[f.key] !== undefined) return;
      self.data.status[f.key] = f.type === 'bar' ? Math.round((f.max || 100) * (f.init == null ? 0.7 : f.init))
        : f.type === 'tag' || f.type === 'tags' ? [] : f.type === 'num' ? Number(f.init || 0) : (f.init || '');
    });
    var start = player.origin || (((C().map || {}).nodes || [])[0] || {}).name || '';
    this.data.map = { at: start, visited: start ? [start] : [] };
    this.data.bag = this.data.bag || [];
    this.data.npcs = this.data.npcs || {};
    this.state.hasSave = true;
    this.persist(true);

    /* 只写进输入框，绝不代发 —— 代发会让用户失去最后一次改口的机会 */
    this.closeStage();
    this.refresh();
    this.toast('已写入输入框，确认后发送');
    return true;
  };
})();
