/* rex-dossier · 人物档案：表层 / 里层的 HTML 与交互（人形与热区在 figure.js） */
(function () {
  var REX = window.__REX__;
  if (!REX) { try { console.warn('[rex] kernel missing (dossier)'); } catch (e) {} return; }
  var U = REX.ui, esc = REX.esc;

  var FEMALE = ['口腔', '乳房', '子宫', '阴部', '后庭'];
  var MALE = ['阴茎', '阴囊'];

  REX.dossierHTML = function (R, key) {
    var n = R.npcByKey(key);
    if (!n) return U.empty('没有这个人的档案');
    var look = (R._layer && R._layer[key]) || 'holo';
    var rt = (R.data.npcs || {})[key] || {};
    var rel = n.me ? '本人' : R.REL(rt.rel);
    var sex = n.sex === 'm' ? 'm' : 'f';

    var head =
      '<div class="rex-dosHead">' +
        '<div class="rex-dosName"><h2>' + esc(n.name) + '</h2>' +
          '<p>' + esc([n.title, n.faction].filter(Boolean).join(' · ')) + '</p></div>' +
        '<div class="rex-dosRel"><span class="rex-k">关系</span><b>' + esc(rel) + '</b></div>' +
      '</div>' +
      '<div class="rex-layer" role="tablist">' +
        '<button type="button" data-layer="holo" class="' + (look === 'real' ? '' : 'is-on') + '">表层</button>' +
        '<button type="button" data-layer="real" class="' + (look === 'real' ? 'is-on' : '') + '">里层</button>' +
      '</div>';

    var d = REX.figData && REX.figData(sex, look);
    var fig =
      '<div class="rex-dosFig" data-look="' + look + '">' +
        '<div class="rex-figWrap" style="--ar:' + ((d && d.ar) || 0.418) + '">' + REX.figHTML(sex, look) + '</div>' +
        '<div class="rex-bub" data-bub="0"></div>' +
      '</div>';

    var body = look === 'real' ? privateBody(n, rt, sex) : surfaceBody(n);
    return '<div class="rex-dos">' + head + fig + body + '</div>';
  };

  function surfaceBody(n) {
    var fs = (n.surface || []).filter(function (f) {
      var v = Array.isArray(f) ? f[1] : f.v;
      return v != null && v !== '';
    });
    var rows = fs.map(function (f) {
      return U.row(Array.isArray(f) ? f[0] : f.k, Array.isArray(f) ? f[1] : f.v);
    }).join('');
    var hooks = (n.hooks || []).map(function (h) { return U.prose(h); }).join('');
    var out = U.card('基础', rows || '<span class="rex-k">这个人还什么都没露出来</span>');
    /* 内心：身体是数据，内心是戏。一句没说出口的话，比三行形容词有用 */
    if (n.thought) out += U.card('心里', '<p class="rex-thought">' + esc(n.thought) + '</p>');
    if (hooks) out += U.card('印象', hooks);
    out += '<div class="rex-note">表层是能看见的。里层不只是身体的，也是关系的。</div>';
    return out;
  }

  function thumb(name, st) {
    var src = REX.partImg && REX.partImg(name, st);
    if (!src) return '';
    return '<figure class="rex-partFig"><img alt="" src="' + src + '" loading="lazy"></figure>';
  }

  function privateBody(n, rt, sex) {
    var priv = (rt.priv && Object.keys(rt.priv).length) ? rt.priv : (n.priv || {});
    var names = sex === 'm' ? MALE : FEMALE;
    var has = false, k;
    for (k in priv) { if (priv.hasOwnProperty(k)) { has = true; break; } }
    var out = '<div class="rex-note" style="padding:0 2px 8px">点身体上的圆点，看那个部位的细节。</div>';
    if (!has) out += U.card('私有', '<span class="rex-k">这一层还没被写开。里层内容由模型按剧情推进写入。</span>');
    names.forEach(function (nm) {
      var d = priv[nm];
      if (!d) return;
      var st = REX.stNormalize ? REX.stNormalize(nm, d.st) : d.st;
      var ml = Number(d.ml) || 0;
      out += '<section class="rex-privCard" data-priv="' + esc(nm) + '">' +
        thumb(nm, st) +
        '<div class="rex-privBody">' +
        '<header><b>' + esc(nm) + '</b>' +
        (st ? '<span class="rex-st" data-st="' + esc(st) + '">' + esc(st) + '</span>' : '') +
        (ml > 0 ? '<span class="rex-ml">' + ml + ' ml</span>' : '') + '</header>' +
        (ml > 0 ? '<div class="rex-bar"><i style="width:' + Math.min(100, ml / 20 * 100) + '%"></i></div>' : '') +
        (d.fixed ? U.row('固定', d.fixed) : '') +
        (d.rt && d.rt !== '—' ? U.row('此刻', d.rt) : '') +
        ((d.spec || []).length ? '<div class="rex-spec">' + d.spec.map(function (p) {
          return '<span><i>' + esc(p[0]) + '</i>' + esc(p[1]) + '</span>';
        }).join('') + '</div>' : '') +
        '</div></section>';
    });
    if (rt.note) out += U.card('你注意到的', U.prose(rt.note));
    return out;
  }

  /* ================= 交互 ================= */

  REX.bindDossier = function (R, host, key) {
    if (!host || host._rexDos) return;
    host._rexDos = 1;
    host.addEventListener('click', function (e) {
      var lb = e.target.closest('[data-layer]');
      if (lb) {
        R._layer = R._layer || {};
        R._layer[key] = lb.getAttribute('data-layer');
        /* 只换内容，不要重绑：监听器挂在 host 上，innerHTML 换掉不影响它；
           一旦重绑，同一个 click 会被两个监听器各处理一次 → 气泡开了又立刻关。 */
        host.innerHTML = REX.dossierHTML(R, key);
        return;
      }
      var hot = e.target.closest('[data-hot]');
      if (hot) { showBub(R, host, key, hot.getAttribute('data-hot'), hot); return; }
      var pc = e.target.closest('[data-priv]');
      if (pc) {
        var nm = pc.getAttribute('data-priv');
        var hs = REX.qa('[data-hot]', host), i;
        for (i = 0; i < hs.length; i++) {
          if (hs[i].getAttribute('data-hot') === nm) { showBub(R, host, key, nm, hs[i]); break; }
        }
      }
    });
  };

  function privOf(R, key, name) {
    var rt = (R.data.npcs || {})[key] || {};
    if (rt.priv && rt.priv[name]) return rt.priv[name];
    var n = R.npcByKey(key) || {};
    return (n.priv && n.priv[name]) || {};
  }

  function specHTML(d) {
    if (!d.spec || !d.spec.length) return '';
    return '<div class="rex-spec">' + d.spec.map(function (p) {
      return '<span><i>' + esc(p[0]) + '</i>' + esc(p[1]) + '</span>';
    }).join('') + '</div>';
  }

  function closeBub(bub, host) {
    bub.setAttribute('data-bub', '0');
    bub.innerHTML = '';
    REX.qa('[data-hot]', host).forEach(function (h) { h.classList.remove('is-on'); });
  }

  function showBub(R, host, key, name, hot) {
    var bub = REX.q('.rex-bub', host);
    if (!bub) return;
    if (bub.getAttribute('data-bub') === name) return closeBub(bub, host);
    REX.qa('[data-hot]', host).forEach(function (h) { h.classList.toggle('is-on', h === hot); });
    var d = privOf(R, key, name);
    var st = REX.stNormalize ? REX.stNormalize(name, d.st) : d.st;
    var ml = Number(d.ml) || 0;
    bub.innerHTML = '<h4>' + esc(name) + '</h4>' +
      thumb(name, st) +
      (st ? '<div class="rex-bubTop"><span class="rex-st" data-st="' + esc(st) + '">' + esc(st) + '</span>' +
        (ml > 0 ? '<span class="rex-ml">' + ml + ' / 20 ml</span>' : '') + '</div>' : '') +
      (ml > 0 ? '<div class="rex-bar"><i style="width:' + Math.min(100, ml / 20 * 100) + '%"></i></div>' : '') +
      '<dl class="rex-bubDl">' +
      (d.fixed ? '<dt>固定</dt><dd>' + esc(d.fixed) + '</dd>' : '') +
      (d.rt && d.rt !== '—' ? '<dt>此刻</dt><dd>' + esc(d.rt) + '</dd>' : '') +
      '</dl>' + specHTML(d) +
      '<button class="rex-x2" type="button" data-bubclose="1">收起</button>';
    bub.setAttribute('data-bub', name);
    var cx = parseFloat(hot.getAttribute('data-cx'));
    if (!isFinite(cx)) cx = 50;
    bub.style.setProperty('--px', Math.max(14, Math.min(86, cx)) + '%');
    var close = REX.q('[data-bubclose]', bub);
    if (close) close.addEventListener('click', function () { closeBub(bub, host); });
  }
})();
