/* rex-ui · UI 原子与图标。改视觉只改这里，分栏与档案都消费它 */
(function () {
  var REX = window.__REX__;
  if (!REX) { try { console.warn('[rex] kernel missing (ui)'); } catch (e) {} return; }

  /* ================= UI 原子（所有分栏共用，改样式只改这里） ================= */

  REX.ui = {
    row: function (k, v) {
      return '<div class="rex-rowline"><span class="rex-k">' + REX.esc(k) + '</span><span>' + REX.esc(v == null ? '—' : v) + '</span></div>';
    },
    bar: function (k, v, max, unit) {
      var p = max > 0 ? Math.max(0, Math.min(100, (Number(v) || 0) / max * 100)) : 0;
      return '<div class="rex-gauge"><div class="rex-rowline"><span class="rex-k">' + REX.esc(k) + '</span>' +
        '<span class="rex-num">' + (Number(v) || 0) + (unit || '') + '</span></div>' +
        '<div class="rex-bar"><i style="width:' + p + '%"></i></div></div>';
    },
    tags: function (arr, hot) {
      if (!arr || !arr.length) return '<span class="rex-k">—</span>';
      return '<div class="rex-tags">' + arr.map(function (x) {
        return '<span class="rex-tag' + (hot ? ' is-hot' : '') + '">' + REX.esc(x) + '</span>';
      }).join('') + '</div>';
    },
    card: function (title, inner) {
      return '<section class="rex-card">' + (title ? '<h4 class="rex-h">' + REX.esc(title) + '</h4>' : '') + inner + '</section>';
    },
    prose: function (t) {
      return t ? '<p class="rex-prose">' + REX.esc(t) + '</p>' : '';
    },
    empty: function (t) { return '<div class="rex-empty">' + REX.esc(t) + '</div>'; }
  };

  /* ================= 图标（内联路径，不依赖任何外部文件） ================= */

  REX.ICON = {
    world: 'M8 1.6a6.4 6.4 0 100 12.8 6.4 6.4 0 000-12.8zm0 1.5c1 0 2 1.8 2.2 4H5.8C6 4.9 7 3.1 8 3.1zM4.4 9.6h7.2c-.2 1.9-1.2 3.3-2.2 3.3s-2-1.4-2.2-3.3zM4.4 6.4h7.2c0 1 0 1.9-.2 2.7H4.6a8 8 0 01-.2-2.7z',
    people: 'M5.6 7.4a2.3 2.3 0 100-4.6 2.3 2.3 0 000 4.6zm5.4 1a1.9 1.9 0 100-3.8 1.9 1.9 0 000 3.8zM1.4 13.6c0-2.2 1.9-3.6 4.2-3.6s4.2 1.4 4.2 3.6H1.4zm9 0c-.1-1.5-.7-2.6-1.6-3.3.4-.1.9-.2 1.4-.2 2 0 3.6 1.2 3.6 3.5h-3.4z',
    map: 'M8 1.4c2.4 0 4.3 1.9 4.3 4.3 0 3.2-3.4 6.6-4.3 8.9-.9-2.3-4.3-5.7-4.3-8.9C3.7 3.3 5.6 1.4 8 1.4zm0 2.5a1.9 1.9 0 100 3.8 1.9 1.9 0 000-3.8z',
    codex: 'M3.2 1.6h8.2c.7 0 1.2.5 1.2 1.2v10.6c0 .7-.5 1.2-1.2 1.2H3.2V1.6zm1.3 1.5v10h6.6V3.1H4.5zm1.2 2h4.2v1.2H5.7V5.1zm0 2.6h4.2v1.2H5.7V7.7z',
    bag: 'M5.4 3.2V2.4C5.4 1.6 6 1 6.8 1h2.4c.8 0 1.4.6 1.4 1.4v.8h1.6c.7 0 1.2.5 1.2 1.2v8.2c0 .7-.5 1.2-1.2 1.2H3.8c-.7 0-1.2-.5-1.2-1.2V4.4c0-.7.5-1.2 1.2-1.2h1.6zm1.3 0h1.8v-.7h-1.8v.7z',
    set: 'M8 5.6a2.4 2.4 0 100 4.8 2.4 2.4 0 000-4.8zm6 2.4c0 .4 0 .8-.1 1.1l1.5 1.2-1.2 2.1-1.8-.6c-.6.5-1.2.9-1.9 1.1L10.1 15H7.9l-.4-1.8c-.7-.2-1.3-.6-1.9-1.1l-1.8.6L2.6 10l1.5-1.2a6 6 0 010-2.2L2.6 5.4 3.8 3.3l1.8.6c.6-.5 1.2-.9 1.9-1.1L7.9 1h2.2l.4 1.8c.7.2 1.3.6 1.9 1.1l1.8-.6 1.2 2.1-1.5 1.2c.1.3.1.7.1 1.1z'
  };
  REX.icon = function (name) {
    return '<svg class="rex-i" viewBox="0 0 16 16" aria-hidden="true"><path d="' +
      (REX.ICON[name] || REX.ICON.world) + '"/></svg>';
  };
})();
