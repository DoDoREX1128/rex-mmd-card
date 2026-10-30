/* rex-figure · 人形渲染与部位热区
   整身图与部位特写图的数据在 figdata.js（window.__REX_FIG__），这里只做渲染与命中。
   图片加载失败时用 rows 扫描线画兜底剪影 —— rows 是从原图 alpha 描出来的，
   所以兜底轮廓和真图几乎重合，不会出现「图挂了就变成另一个人的身材」。
   对外：figHTML(sex,look) / partImg(name,st) / regionsOf(sex,look) / figData(sex,look) */
(function () {
  var REX = window.__REX__;
  if (!REX) { try { console.warn('[rex] kernel missing (figure)'); } catch (e) {} return; }

  var FIG = window.__REX_FIG__ || { fig: {}, part: {} };

  function figKey(sex, look) { return (sex === 'm' ? '男' : '女') + '-' + (look === 'real' ? 'real' : 'holo'); }
  function figData(sex, look) { return FIG.fig[figKey(sex, look)] || FIG.fig['女-holo'] || null; }

  /* ============ 部位剖面：t=0 顶 → 1 底，值是这一行的半宽系数 ============ */
  var SHAPE = {
    '口腔': [[0, 0], [.06, .40], [.16, .70], [.30, .91], [.50, 1], [.70, .91], [.84, .70], [.94, .40], [1, 0]],
    '乳房': [[0, 0], [.05, .42], [.14, .73], [.28, .93], [.46, 1], [.64, .96], [.80, .80], [.93, .48], [1, 0]],
    '子宫': [[0, 0], [.04, .50], [.11, .82], [.22, .97], [.36, 1], [.50, .96], [.64, .84], [.78, .64], [.92, .36], [1, 0]],
    '阴部': [[0, 0], [.04, .56], [.10, .88], [.21, 1], [.36, .96], [.54, .82], [.76, .52], [1, 0]],
    '后庭': [[0, 0], [.10, .46], [.26, .82], [.48, 1], [.72, .90], [.92, .44], [1, 0]],
    '阴茎': [[0, 0], [.07, .52], [.20, .86], [.40, 1], [.66, .95], [.86, .70], [1, 0]],
    '阴囊': [[0, 0], [.08, .44], [.22, .82], [.46, 1], [.70, .92], [.90, .50], [1, 0]],
    '_def': [[0, 0], [.2, .7], [.5, 1], [.8, .7], [1, 0]]
  };

  /* Catmull-Rom，平滑但不改两端：两端仍是 0，所以形状一定收尖 */
  function prof(p, t) {
    var n = p.length;
    if (n < 2) return 1;
    if (t <= p[0][0]) return p[0][1];
    if (t >= p[n - 1][0]) return p[n - 1][1];
    var i = 0;
    while (i < n - 2 && t > p[i + 1][0]) i++;
    var p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(n - 1, i + 2)];
    var u = (t - p1[0]) / ((p2[0] - p1[0]) || 1);
    var u2 = u * u, u3 = u2 * u;
    return 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u
      + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2
      + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3);
  }

  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  function smoothClosed(pts) {
    var n = pts.length;
    if (n < 3) return '';
    var m0 = mid(pts[n - 1], pts[0]);
    var d = 'M' + m0[0].toFixed(2) + ' ' + m0[1].toFixed(2);
    for (var i = 0; i < n; i++) {
      var cur = pts[i], m = mid(cur, pts[(i + 1) % n]);
      d += 'Q' + cur[0].toFixed(2) + ' ' + cur[1].toFixed(2) + ' ' + m[0].toFixed(2) + ' ' + m[1].toFixed(2);
    }
    return d + 'Z';
  }

  /* rows 是「每 2% 高度一行」的横向区间；取包含 cx 的那一段，用来把热区宽度夹进身体里 */
  function runAt(d, y, cx) {
    if (!d || !d.rows || !d.rows.length) return null;
    var i = Math.max(0, Math.min(d.rows.length - 1, Math.round(y / 2)));
    var runs = d.rows[i] || [], j, best = null, w = 0;
    for (j = 0; j < runs.length; j++) {
      var s = runs[j], ww = s[1] - s[0];
      if (s[0] - 2 <= cx && s[1] + 2 >= cx && ww > w) { best = s; w = ww; }
    }
    if (!best) {
      for (j = 0; j < runs.length; j++) {
        var s2 = runs[j];
        if (s2[1] - s2[0] > w) { best = s2; w = s2[1] - s2[0]; }
      }
    }
    return best;
  }

  /* 整块一个宽度上限：逐行求交会把曲线拉出折角，所以整块只夹一次 */
  function roomHalf(d, r) {
    var lim = r.rx;
    var s = runAt(d, r.cy, r.cx);
    if (s) lim = Math.min(lim, (s[1] - s[0]) / 2);
    return Math.max(1.6, lim);
  }

  function regionPath(r, half) {
    var p = SHAPE[r.name] || SHAPE._def, N = 22, pts = [], i, t, y, hw;
    for (i = 0; i <= N; i++) {
      t = i / N; y = r.cy - r.ry + 2 * r.ry * t;
      hw = half * prof(p, t); pts.push([r.cx - hw, y]);
    }
    for (i = N - 1; i >= 1; i--) {
      t = i / N; y = r.cy - r.ry + 2 * r.ry * t;
      hw = half * prof(p, t); pts.push([r.cx + hw, y]);
    }
    return smoothClosed(pts);
  }

  /* ============ 兜底剪影：把每一行画成一条圆头粗线 ============ */
  function outlineSVG(d) {
    var s = '', i, j, runs, sp;
    for (i = 0; i < d.rows.length; i++) {
      runs = d.rows[i] || [];
      for (j = 0; j < runs.length; j++) {
        sp = runs[j];
        if (sp[1] - sp[0] < 0.2) continue;
        s += '<line x1="' + sp[0].toFixed(1) + '" y1="' + (i * 2) + '" x2="' + sp[1].toFixed(1) + '" y2="' + (i * 2) + '"/>';
      }
    }
    return '<svg class="rex-figFall" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g>' + s + '</g></svg>';
  }

  /* ============ 热区 ============ */
  function regionsOf(sex, look) { var d = figData(sex, look); return (d && d.regions) || []; }

  /* 圆点用「零长度描边路径 + 非缩放线宽」画：viewBox 被 preserveAspectRatio=none 拉伸，
     <circle> 会变成竖椭圆，描边线宽不受拉伸影响，所以画出来是正圆。 */
  function dot(cx, cy) {
    return '<path class="rex-dot" d="M' + (+cx).toFixed(2) + ' ' + (+cy).toFixed(2) + 'l0 .01"/>';
  }

  function hotSVG(d) {
    if (!d || !d.regions) return '';
    var out = '', i;
    for (i = 0; i < d.regions.length; i++) {
      var r = d.regions[i], half = roomHalf(d, r);
      if (r.name === '乳房') {
        /* 两瓣直接用椭圆：椭圆不会被剖面在顶点处拉出尖角；命中层是一整块，胸沟里点下去也算 */
        var rx2 = half * 0.66, dd = half * 0.735;
        out += '<g class="rex-regg" data-hot="乳房" data-cx="' + r.cx.toFixed(2) + '">' +
          '<ellipse class="rex-hit" cx="' + r.cx.toFixed(2) + '" cy="' + r.cy.toFixed(2) +
            '" rx="' + (half + 1).toFixed(2) + '" ry="' + (r.ry * 1.15).toFixed(2) + '"/>' +
          '<ellipse class="rex-reg" cx="' + (r.cx - dd).toFixed(2) + '" cy="' + r.cy.toFixed(2) +
            '" rx="' + rx2.toFixed(2) + '" ry="' + r.ry.toFixed(2) + '"/>' +
          '<ellipse class="rex-reg" cx="' + (r.cx + dd).toFixed(2) + '" cy="' + r.cy.toFixed(2) +
            '" rx="' + rx2.toFixed(2) + '" ry="' + r.ry.toFixed(2) + '"/>' +
          dot(r.cx - dd, r.cy) + dot(r.cx + dd, r.cy) +
          '</g>';
        continue;
      }
      out += '<g class="rex-regg" data-hot="' + r.name + '" data-cx="' + r.cx.toFixed(2) + '">' +
        '<path class="rex-hit" d="' + regionPath(r, half + 1.2) + '"/>' +
        '<path class="rex-reg" d="' + regionPath(r, half) + '"/>' +
        dot(r.cx, r.cy) +
        '</g>';
    }
    return '<svg class="rex-figHot" viewBox="0 0 100 100" preserveAspectRatio="none">' + out + '</svg>';
  }

  /* ============ 对外 ============ */
  function figHTML(sex, look) {
    var d = figData(sex, look);
    if (!d) return '<div class="rex-figEmpty">这一层没有配图</div>';
    var c = d.crop || [100, 100, 0, 0];
    return '<img class="rex-figImg" alt="" src="' + d.img + '"' +
      ' style="--iw:' + c[0] + ';--ih:' + c[1] + ';--il:' + c[2] + ';--it:' + c[3] + '">' +
      outlineSVG(d) +
      (look === 'real' ? hotSVG(d) : '') +
      '<i class="rex-band"></i>';
  }

  var PARTKEY = { '后庭': '肛门' };

  /* 每个部位支持的档位。口腔/乳房只有两档 —— 后三档对这两处没意义，
     模型写了也裁掉，免得界面上出现一个永远取不到图的档位。 */
  var STLEVELS = {
    '口腔': ['干净', '沾染精液'],
    '乳房': ['干净', '沾染精液'],
    '子宫': ['干净'],
    '阴部': ['干净', '被外射', '被内射', '被同时内外射'],
    '后庭': ['干净', '被外射', '被内射', '被同时内外射'],
    '阴茎': ['干净'],
    '阴囊': ['干净']
  };
  /* 不显示特写图的部位。男性性器没有配图，按"只给文字"处理，不留空框。 */
  var NOART = { '阴茎': 1, '阴囊': 1 };

  REX.stLevels = function (name) { return STLEVELS[name] || ['干净']; };
  REX.stNormalize = function (name, st) {
    var lv = STLEVELS[name];
    if (!lv) return st;
    return lv.indexOf(st) >= 0 ? st : lv[0];
  };

  function partImg(name, st) {
    if (NOART[name]) return '';
    var P = FIG.part || {};
    if (name === '子宫') {
      var w = P.womb || [];
      if (!w.length) return '';
      var i = Math.max(0, Math.min(w.length - 1, Math.round((Number(st) || 0) / 33)));
      return w[i];
    }
    var grp = (P.real || {})[PARTKEY[name] || name];
    if (!grp) return '';
    if (typeof grp === 'string') return grp;
    var ok = REX.stNormalize(name, st);
    return grp[ok] || grp['干净'] || grp[Object.keys(grp)[0]] || '';
  }

  REX.figHTML = figHTML;
  REX.partImg = partImg;
  REX.regionsOf = regionsOf;
  REX.figData = figData;

  /* 图片挂掉（离线 / 被墙 / CDN 失效）就切到 rows 兜底剪影。
     error 事件不冒泡，只能在捕获阶段拦；一次注册，管后面所有动态插入的图。 */
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('rex-figImg') && t.parentNode) {
      t.parentNode.classList.add('isNoImg');
    }
  }, true);
})();
