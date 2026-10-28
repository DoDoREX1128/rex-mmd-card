/* rex-sections · 六栏定义：世界 / 人物 / 地图 / 见闻 / 行囊 / 设置
   一栏一个 REX.section()，brief 出「标题+一行摘要」，detail 出「全部信息」。
   加一栏 = 在这里多写一个 section，不要去动 core.js。 */
(function () {
  var REX = window.__REX__;
  if (!REX) { try { console.warn('[rex] kernel missing (sections)'); } catch (e) {} return; }
  var U = REX.ui, esc = REX.esc;
  var C = function () { return window.__REX_CONTENT__ || {}; };

  var REL = function (v) {
    if (v == null || v === '') return '未识';
    var n = Number(v);
    if (!isFinite(n)) return String(v);
    return n >= 80 ? '交心' : n >= 55 ? '亲近' : n >= 30 ? '熟识' : n >= 10 ? '眼熟' : '陌生';
  };
  REX.REL = REL;

  /* ---------- 世界 ---------- */

  REX.section('world', {
    icon: 'world', title: '世界', empty: '还没写下这个世界',
    brief: function (R) {
      var w = R.data.world || {}, st = R.data.status || {};
      var rows = [];
      var t = st.t || w.t, loc = st.loc || w.loc || (R.data.map || {}).at;
      if (loc) rows.push({ key: 'loc', head: loc, meta: '当前所在', tag: '地', dot: 'var(--rex-accent)' });
      if (t) rows.push({ key: 'time', head: t, meta: '时历', tag: '时', dot: 'var(--rex-muted)' });
      if (w.era) rows.push({ key: 'era', head: '时代', meta: w.era.slice(0, 26), dot: 'var(--rex-muted)' });
      var flags = st.flags || R.data.flags || [];
      if (flags.length) rows.push({ key: 'flags', head: flags[0], meta: '当前状态', tag: flags.length + ' 项', dot: 'var(--rex-accent2)' });
      return rows;
    },
    detail: function (R, key) {
      var w = R.data.world || {}, st = R.data.status || {}, p = R.data.player || {};
      var out = '';
      if (key === 'loc') {
        out += U.card('所在', U.prose(w.placeNote || ((C().world || {}).places || {})[st.loc] || '') +
          U.row('地名', st.loc || (R.data.map || {}).at || '—') +
          U.row('时历', st.t || '—') +
          U.row('天气', st.weather || w.weather || '—') +
          U.row('凶险', st.danger || w.danger || '—'));
      } else if (key === 'time') {
        out += U.card('时历', U.row('当前', st.t || '—') + U.row('已历', (R.data.log || []).length + ' 轮'));
      } else if (key === 'era') {
        out += U.card('时代', U.prose(w.era) + U.prose(w.rule));
      } else {
        out += U.card('状态', U.tags(st.flags || R.data.flags || [], true) +
          U.row('轮次', (R.data.log || []).length));
      }
      out += U.card('我', U.row('姓名', p.name || '—') + U.row('性别', p.gender || '—') +
        U.row('出身', p.race || '—') + U.row('倾向', p.trait || '—') + U.row('战力', p.power || '—'));
      out += U.card('世界规则', U.prose(w.rule || (C().world || {}).rule || '—'));
      return out;
    }
  });

  /* ---------- 人物（表层 / 里层档案在 dossier.js 里画） ---------- */

  function roster(R) {
    var list = [];
    var p = R.data.player || {};
    if (p.name || p.gender) {
      list.push({
        key: '__me', name: p.name || '我', sex: p.gender === '女' ? 'f' : 'm',
        title: [p.race, p.trait, p.power].filter(Boolean).join(' · ') || '你自己',
        faction: '己方', rank: '', me: true,
        surface: [['性别', p.gender], ['出身', p.race], ['倾向', p.trait], ['战力', p.power], ['来自', p.origin]],
        hooks: p.background ? [p.background] : [],
        thought: (R.data.npcs || {}).__me && (R.data.npcs.__me).thought,
        priv: (R.data.npcs || {}).__me && (R.data.npcs.__me).priv
      });
    }
    (C().npcs || []).forEach(function (n) {
      var rt = (R.data.npcs || {})[n.key] || {};
      list.push({
        key: n.key, name: n.name, sex: n.sex || 'f', title: n.title || n.role || '',
        faction: n.faction || '', rank: n.rank || '',
        surface: rt.surface || n.surface || [],
        hooks: rt.hooks || n.hooks || [],
        thought: rt.thought || n.thought || '',
        priv: rt.priv || n.priv
      });
    });
    return list;
  }
  REX.roster = roster;
  REX.npcByKey = function (key) {
    var all = roster(REX);
    for (var i = 0; i < all.length; i++) if (all[i].key === key) return all[i];
    return null;
  };

  REX.section('people', {
    icon: 'people', title: '人物', empty: '还没遇到人',
    brief: function (R) {
      return roster(R).map(function (n) {
        var rt = (R.data.npcs || {})[n.key] || {};
        var rel = n.me ? '本人' : REL(rt.rel);
        var meta = [n.title, n.faction].filter(Boolean).join(' · ');
        return {
          key: n.key, head: n.name, meta: meta, tag: rel,
          dot: n.me ? 'var(--rex-accent)' : 'var(--rex-muted)'
        };
      });
    },
    detail: function (R, key) {
      return REX.dossierHTML ? REX.dossierHTML(R, key) : U.empty('档案模块未加载');
    },
    after: function (R, host, key) {
      if (REX.bindDossier) REX.bindDossier(R, host, key);
    }
  });

  /* ---------- 地图 ---------- */

  REX.section('map', {
    icon: 'map', title: '地图', empty: '还没有路',
    brief: function (R) {
      var nodes = (C().map || {}).nodes || [];
      var at = (R.data.map || {}).at || (R.data.status || {}).loc || '';
      var vis = (R.data.map || {}).visited || [];
      return nodes.map(function (n) {
        return {
          key: n.id, head: n.name, meta: n.links ? (n.links.length + ' 条路') : '孤地',
          tag: n.name === at ? '所在' : (vis.indexOf(n.name) >= 0 ? '去过' : ''),
          dot: n.name === at ? 'var(--rex-accent)' : 'var(--rex-muted)'
        };
      });
    },
    detail: function (R, key) {
      var nodes = (C().map || {}).nodes || [];
      var at = (R.data.map || {}).at || (R.data.status || {}).loc || '';
      var node = null;
      nodes.forEach(function (n) { if (n.id === key) node = n; });
      if (!node) return U.empty('这个地方在地图上找不到');
      var byId = {};
      nodes.forEach(function (n) { byId[n.id] = n; });
      var links = (node.links || []).map(function (id) {
        var t = byId[id]; if (!t) return '';
        return '<button class="rex-row" type="button" data-key="' + esc(t.id) + '">' +
          '<span class="rex-rowDot" style="--c:var(--rex-muted)"></span>' +
          '<span class="rex-rowBody"><b>' + esc(t.name) + '</b><em>可去</em></span></button>';
      }).join('');
      return U.card(node.name,
        '<div class="rex-rowline"><span class="rex-k">当前位置</span><span>' + esc(node.name === at ? '是' : '否') + '</span></div>' +
        U.prose(node.note || '') +
        '<div class="rex-k" style="margin-top:10px">可去之处</div>' +
        (links || U.empty('无路可走'))) +
        '<div class="rex-card"><h4 class="rex-h">全图</h4>' + REX.mapSVG(nodes, at) + '</div>';
    }
  });

  REX.mapSVG = function (nodes, at) {
    if (!nodes || !nodes.length) return U.empty('无');
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });
    var lines = '';
    nodes.forEach(function (n) {
      (n.links || []).forEach(function (id) {
        var t = byId[id]; if (!t) return;
        lines += '<line x1="' + n.x + '" y1="' + n.y + '" x2="' + t.x + '" y2="' + t.y + '" stroke="var(--rex-line)" stroke-width="0.5"/>';
      });
    });
    var dots = nodes.map(function (n) {
      var on = n.name === at;
      return '<g><circle cx="' + n.x + '" cy="' + n.y + '" r="' + (on ? 2.4 : 1.6) + '" fill="' +
        (on ? 'var(--rex-accent)' : 'var(--rex-muted)') + '"/>' +
        '<text x="' + n.x + '" y="' + (n.y + 6.5) + '" font-size="3.4" text-anchor="middle" fill="' +
        (on ? 'var(--rex-accent)' : 'var(--rex-muted)') + '">' + esc(n.name) + '</text></g>';
    }).join('');
    return '<div class="rex-mapBox"><svg viewBox="0 0 100 100" preserveAspectRatio="none">' +
      lines + dots + '</svg></div>';
  };

  /* ---------- 见闻 ---------- */

  REX.section('codex', {
    icon: 'codex', title: '见闻', empty: '还没有听说什么',
    brief: function (R) {
      var un = (R.data.codex || {}).unlocked || [];
      return ((C().codex || [])).filter(function (c) {
        return c.unlock !== 'later' || un.indexOf(c.id) >= 0;
      }).map(function (c) {
        return { key: c.id, head: c.title, meta: c.content.slice(0, 24), dot: 'var(--rex-muted)' };
      });
    },
    detail: function (R, key) {
      var c = null;
      (C().codex || []).forEach(function (x) { if (x.id === key) c = x; });
      if (!c) return U.empty('这一条还没解锁');
      return U.card(c.title, U.prose(c.content));
    }
  });

  /* ---------- 行囊 ---------- */

  REX.section('bag', {
    icon: 'bag', title: '行囊', empty: '两手空空',
    brief: function (R) {
      var items = (R.data.bag && R.data.bag.length) ? R.data.bag : (C().bag || []);
      return items.map(function (i) {
        return { key: i.id, head: i.name, meta: i.type || '', dot: 'var(--rex-muted)' };
      });
    },
    detail: function (R, key) {
      var items = (R.data.bag && R.data.bag.length) ? R.data.bag : (C().bag || []);
      var it = null;
      items.forEach(function (x) { if (x.id === key) it = x; });
      if (!it) return U.empty('不在行囊里');
      return U.card(it.name, U.row('类别', it.type || '—') + U.row('数量', it.n || 1) + U.prose(it.desc || ''));
    }
  });

  /* ---------- 设置 ---------- */

  REX.section('set', {
    icon: 'set', title: '设置', empty: '',
    brief: function () {
      return [
        { key: 'save', head: '进度', meta: '导出 / 清除', dot: 'var(--rex-muted)' },
        { key: 'font', head: '字号', meta: '界面文字大小', dot: 'var(--rex-muted)' },
        { key: 'about', head: '关于', meta: '版本与协议', dot: 'var(--rex-muted)' }
      ];
    },
    detail: function (R, key) {
      if (key === 'font') {
        var f = (R.data.settings || {}).font || 1;
        return U.card('字号',
          '<div class="rex-flex">' +
          [0.9, 1, 1.15].map(function (v, i) {
            return '<button class="rex-btn' + (f === v ? ' is-primary' : '') + '" data-act="font" data-v="' + v + '">' +
              ['小', '中', '大'][i] + '</button>';
          }).join('') + '</div>');
      }
      if (key === 'about') {
        var m = C().meta || {};
        return U.card('关于',
          U.row('卡名', m.title || m.name || '—') +
          U.row('版本', m.version || '1.0') +
          U.row('协议', 'rex v' + (REX.ver || 1)) +
          U.prose('四区同层：世界信息 / 导航 / 简要 / 全部信息。移动端底栏上滑抽屉。'));
      }
      return U.card('进度',
        U.prose('导出后可直接存进备忘录，换设备再贴回来。') +
        '<div class="rex-flex" style="margin-top:6px">' +
        '<button class="rex-btn" data-act="export">导出进度</button>' +
        '<button class="rex-btn" data-act="wipe">清除进度</button></div>' +
        U.row('轮次', (R.data.log || []).length) +
        U.row('存档', R.state.hasSave ? '有' : '无'));
    }
  });

  /* ---------- 设置里的动作 ---------- */

  REX.actions.font = function (R, el) {
    var v = Number(el.getAttribute('data-v')) || 1;
    R.data.settings = R.data.settings || {};
    R.data.settings.font = v;
    REX.q('[data-chat="root"]').style.setProperty('--rex-fs', v);
    R.persist(true);
    R.refresh();
  };

  REX.actions.export = function (R, el) {
    var txt = JSON.stringify({ v: 2, data: R.data, nav: R.state.nav, key: R.state.key });
    R.fillInput('【进度存档】\n' + txt);
    R.toast('已写入输入框，复制保存即可');
  };

  REX.actions.wipe = function (R, el) {
    el.textContent = '再点一次确认';
    el.setAttribute('data-act', 'wipe2');
  };
  REX.actions.wipe2 = function (R) {
    var p = R.data.player || {};
    R.reset();
    if (p.name) R.data.player = {};
    R.toast('进度已清除');
    R.go('cover');
  };
})();
