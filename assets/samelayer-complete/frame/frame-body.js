/* ============================================================
   人物 / 主角 · 基础 & 武魂（全息人体）
   ============================================================ */

const RING_COL = {
  '白': '#F2EEFB', '黄': '#FFD968', '紫': '#B79BFF',
  '黑': '#7E6FA8', '红': '#FF7A90', '金': '#FFC96A', '蓝': '#7FB8FF'
};
/* 环体三色：e=边光（描边高光） k=芯色（暗部） g=辉光（外发光） */
const RING_TONE = {
  '白': { c:'#EFEAFF', l:'#FFFFFF', d:'#B9A8E0' },
  '黄': { c:'#FFD35C', l:'#FFF0B0', d:'#D89A18' },
  '紫': { c:'#A87BFF', l:'#DCC8FF', d:'#6C33D8' },
  '黑': { c:'#5A3594', l:'#B79BE8', d:'#1B0F33' },
  '红': { c:'#FF5C74', l:'#FFB7C2', d:'#B3122C' },
  '金': { c:'#FFC15A', l:'#FFE7B0', d:'#C98B18' },
  '蓝': { c:'#74B0FF', l:'#CFE4FF', d:'#2A6AD6' }
};
const ringTone = y => y >= 100000 ? '红' : y >= 10000 ? '黑' : y >= 1000 ? '紫' : y >= 100 ? '黄' : '白';
const fmtYear = y => y >= 10000 ? (y / 10000).toFixed(y % 10000 ? 1 : 0) + ' 万年' : y + ' 年';
const ringHex = r => RING_COL[r.c] || RING_COL[ringTone(r.y)] || RING_COL['黄'];
const toneOf = r => RING_TONE[(r && r.c) || ringTone(r && r.y)] || RING_TONE['黄'];

/* 魂骨部位（viewBox 400×600；左=角色右侧） */
const BONE_PTS = [
  {id:'head', label:'头骨',   x:190, y:82,  chip:'r'},
  {id:'torso',label:'躯干骨', x:190, y:262, chip:'l'},
  {id:'armR', label:'右臂骨', x:86,  y:352, chip:'l'},
  {id:'armL', label:'左臂骨', x:294, y:352, chip:'r'},
  {id:'legR', label:'右腿骨', x:152, y:664, chip:'l'},
  {id:'legL', label:'左腿骨', x:228, y:664, chip:'r'}
];

/* 穿搭槽位 */
const OUTFIT_SLOTS = [
  {id:'head',  label:'头饰', icon:'<path d="M5 15.4h14M6.6 15.4 8 8.6l4-2.4 4 2.4 1.4 6.8"/><path d="M12 6.2V4.2"/><circle cx="12" cy="3.4" r=".9"/>'},
  {id:'top',   label:'上衣', icon:'<path d="M9 4.4 5.6 6.4 3.8 10l2.6 1.6 1-1.6v8h9.2v-8l1 1.6L20.2 10l-1.8-3.6L15 4.4"/><path d="M9 4.4c.6 1.2 1.6 1.8 3 1.8s2.4-.6 3-1.8"/>'},
  {id:'inner', label:'内着', icon:'<path d="M8 5.4h8l1.2 12.2H6.8z"/><path d="M8 5.4 6.6 8.2M16 5.4l1.4 2.8"/><path d="M10.4 9.6h3.2"/>'},
  {id:'bottom',label:'下服', icon:'<path d="M7 4.6h10l-.6 6.4-1.8 8.4h-2.2L12 12.6l-.4 6.8H9.4L7.6 11z"/>'},
  {id:'under', label:'底衣', icon:'<path d="M7.6 6.4h8.8v5.2a4.4 4.4 0 0 1-8.8 0z"/><path d="M7.6 8.4h8.8M9.4 12.6l5.2-2"/>'},
  {id:'shoe',  label:'鞋履', icon:'<path d="M5.4 16.6c0-3.4.8-6.2 2-8.2l3.2 1.2.8 3.4 3 1.6c1.4.7 2.2 1.6 2.2 2.8v.8H5.4z"/><path d="M5.4 17.4h12.6"/>'}
];

/* ---------------- 人体舞台 ---------------- */
/* 「？」的字面在 em 框里不一定居中：宋体系里 92px 时整体偏左 23px、偏下 5px。
   按当前字体实测一次，把字面中心对到框心（换字体、换字号都跟着走，不留魔法数字）。 */
const BQ_SHIFT = Object.create(null);
function bqShift(px){
  const fam = (getComputedStyle(document.documentElement).getPropertyValue('--font-serif') || 'serif').trim();
  const key = px + '|' + fam;
  if (BQ_SHIFT[key]) return BQ_SHIFT[key];
  let dx = 0, dy = 0;
  try {
    const cv = document.createElement('canvas').getContext('2d');
    cv.font = '600 ' + px + 'px ' + fam;
    const m = cv.measureText('？');
    dx = m.width / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
    const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
    if (isFinite(asc) && isFinite(desc) && asc + desc > 0) {
      /* line-height:1 → 行盒高就等于字号；基线在半行距之后 */
      const base = (px - (asc + desc)) / 2 + asc;
      const inkY = (base - m.actualBoundingBoxAscent + base + m.actualBoundingBoxDescent) / 2;
      dy = px / 2 - inkY;
    }
  } catch (_) {}
  const r = v => Math.round(v * 10) / 10;
  return (BQ_SHIFT[key] = { dx: r(dx), dy: r(dy) });
}
function bqHtml(){
  /* 字号必须跟 CSS 里那两条规则一致（92 / 手机 72） */
  const px = (window.matchMedia && matchMedia('(max-width: 640px)').matches) ? 72 : 92;
  const s = bqShift(px);
  const style = (s.dx || s.dy) ? ` style="--bx:${s.dx}px;--by:${s.dy}px"` : '';
  return `<b class="bq"${style}>？</b>`;
}
function bodyStage(c, mode, content, back){
  const sex = c.sex === '男' ? 'm' : 'f';
  const src = BODY_SRC[sex];
  return `<div class="bstage" data-bstage data-mode="${mode}" style="--ar:0.4222">
    <div class="baura"></div>
    <div class="bscan"></div>
    <div class="bfig">
      <div class="bimg" style="-webkit-mask-image:url(${src});mask-image:url(${src})"></div>
      <div class="bghost" style="-webkit-mask-image:url(${src});mask-image:url(${src})"></div>
    </div>
    ${back || ''}
    ${content || ''}
    <div class="btip" data-btip></div>
  </div>`;
}

/* ============================================================
   魂环 · 从头到脚均分、等径（= 人体最大宽度）、2D 扁平花边
   —— 1 环在正中；2 环在 1/3、2/3；其余按 (n+1) 等分
   —— 前半 / 后半分层，后半被人身遮住
   ============================================================ */
const RING_GEO = { cx: 190, top: 26, bot: 884, rx: 186, flat: .22, max: 9, motifs: 24 };
let RING_SEQ = 0;

function ringRows(w){
  const rings = (w.r || []).slice(0, RING_GEO.max);
  const n = rings.length;
  const H = RING_GEO.bot - RING_GEO.top;
  const ry = Math.round(RING_GEO.rx * RING_GEO.flat);
  return rings.map((r, i) => ({
    r, i,
    cy: Math.round(RING_GEO.top + H * (n - i) / (n + 1)),
    rx: RING_GEO.rx, ry
  }));
}

/* 沿椭圆“等弧长”均布的扁平花纹：四芒星与菱形交替，朝向按椭圆法线 */
function ringMotifs(rx, ry, half){
  const M = 40, N = 400;
  const pts = [];
  let px = rx, py = 0, len = 0;
  for (let i = 0; i <= N; i++) {
    const t = i / N * Math.PI * 2;
    const x = Math.cos(t) * rx, y = Math.sin(t) * ry;
    if (i) len += Math.hypot(x - px, y - py);
    pts.push({ x, y, t, len });
    px = x; py = y;
  }
  const total = len;
  const out = [];
  for (let k = 0; k < M; k++) {
    const target = total * k / M;
    let j = 1;
    while (j < pts.length - 1 && pts[j].len < target) j++;
    const p = pts[j];
    const front = Math.sin(p.t) > 0;
    if (half === 'front' ? !front : front) continue;
    const nx = ry * Math.cos(p.t), ny = rx * Math.sin(p.t);
    const rot = Math.atan2(nx, -ny) * 180 / Math.PI;
    const star = k % 2 === 0;
    const d = star
      ? 'M0 -8.6 L1.7 -1.7 L8.6 0 L1.7 1.7 L0 8.6 L-1.7 1.7 L-8.6 0 L-1.7 -1.7Z'
      : 'M0 -5.4 L3.6 0 L0 5.4 L-3.6 0Z';
    out.push(`<path class="rmotif ${star ? 'is-star' : 'is-dia'}" d="${d}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${rot.toFixed(1)})" ${half === 'back' ? 'opacity=".42"' : ''}/>`);
  }
  /* 四个正点的长尖 */
  [0, 90, 180, 270].forEach(deg => {
    const t = deg * Math.PI / 180;
    const front = Math.sin(t) > 0.01 || Math.abs(Math.cos(t)) > 0.99;
    if (half === 'front' ? !front : front) return;
    const x = Math.cos(t) * rx, y = Math.sin(t) * ry;
    const nx = ry * Math.cos(t), ny = rx * Math.sin(t);
    const rot = Math.atan2(nx, -ny) * 180 / Math.PI;
    out.push(`<path class="rspike" d="M0 -26 L3.6 -6 L0 0 L-3.6 -6Z" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})" ${half === 'back' ? 'opacity=".45"' : ''}/>`);
  });
  return out.join('');
}

function ringBackSvg(rows){
  const g = rows.map(({ r, i, cy, rx, ry }) => {
    const t = toneOf(r);
    const B = `M ${-rx} 0 A ${rx} ${ry} 0 0 1 ${rx} 0`;
    const FULL = `M ${-rx} 0 A ${rx} ${ry} 0 1 1 ${rx} 0 A ${rx} ${ry} 0 1 1 ${-rx} 0`;
    return `<g class="brg brg--b" data-ring="${i}" transform="translate(${RING_GEO.cx} ${cy})" style="--c:${t.c};--l:${t.l};--d:${t.d}">
      <ellipse class="brg__film" rx="${rx}" ry="${ry}"/>
      <path class="brg__faint" d="${FULL}"/>
      <ellipse class="brg__pearl" rx="${rx + 9}" ry="${ry + 3}"/>
      <path class="brg__band" d="${B}"/>
      <path class="brg__edge" d="${B}"/>
      ${ringMotifs(rx, ry, 'back')}
    </g>`;
  }).join('');
  return `<svg class="bsvg bsvg--ring bsvg--back" viewBox="0 0 380 900" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${g}</svg>`;
}

function ringFrontSvg(rows){
  const u = ++RING_SEQ;
  const defs = [], body = [];
  rows.forEach(({ r, i, cy, rx, ry }) => {
    const t = toneOf(r);
    const id = `ring${u}_${i}`;
    const F = `M ${-rx} 0 A ${rx} ${ry} 0 0 0 ${rx} 0`;
    const FULL = `M ${-rx} 0 A ${rx} ${ry} 0 1 1 ${rx} 0 A ${rx} ${ry} 0 1 1 ${-rx} 0`;
    defs.push(`<linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${t.l}"/>
      <stop offset=".42" stop-color="${t.c}"/>
      <stop offset="1" stop-color="${t.d}"/>
    </linearGradient>`);
    body.push(`<g class="brg brg--f" data-ring="${i}" transform="translate(${RING_GEO.cx} ${cy})" style="--c:${t.c};--l:${t.l};--d:${t.d}">
      <path class="brg__front" d="${F}" stroke="url(#${id})"/>
      <path class="brg__line" d="${F}"/>
      <ellipse class="brg__pearl" rx="${rx + 9}" ry="${ry + 3}"/>
      <ellipse class="brg__inner" rx="${rx - 18}" ry="${Math.max(6, ry - 6)}"/>
      <ellipse class="brg__dotline" rx="${rx - 30}" ry="${Math.max(4, ry - 10)}"/>
      ${ringMotifs(rx, ry, 'front')}
      <g class="brg__orb">
        <circle class="brg__orbs" r="2.2"/>
        <animateMotion dur="${(14 + i * 1.8).toFixed(1)}s" begin="${(-i * 2.1).toFixed(1)}s"
          repeatCount="indefinite" path="${FULL}"/>
      </g>
      <ellipse class="brhit" rx="${rx}" ry="${ry}"/>
    </g>`);
  });
  return `<svg class="bsvg bsvg--ring" viewBox="0 0 380 900" preserveAspectRatio="xMidYMid meet">
    <defs>${defs.join('')}</defs>${body.join('')}</svg>`;
}

function ringStageHtml(c, w, wi){
  const rows = ringRows(w);
  const box = bodyStage(c, 'ring',
      rows.length ? ringFrontSvg(rows) : `<div class="bempty bempty--unknown">${bqHtml()}</div>`,
      rows.length ? ringBackSvg(rows) : '')
    .replace('data-bstage', 'data-bstage data-wi="' + (wi || 0) + '"');
  if (!rows.length) return box.replace('data-mode="ring"', 'data-mode="ring" data-empty="1"');
  return box;
}

function boneStageHtml(c){
  const bones = c.bones || {};
  const gems = BONE_PTS.map(p => {
    const b = bones[p.id];
    return `<g class="bgem ${b ? 'has' : 'no'}" data-bone="${p.id}" transform="translate(${p.x} ${p.y})">
      ${b ? '<circle class="bgem__aura" r="16"/>' : ''}
      <path class="bgem__dia" d="M0 -7 L7 0 L0 7 L-7 0Z"/>
      <circle class="bgem__dot" r="1.7"/>
      <circle class="bgem__hit" r="19"/>
    </g>`;
  }).join('');
  const chipY = {head:82, torso:246, armR:372, armL:372, legR:636, legL:636};
  const chips = BONE_PTS.map(p => {
    const b = bones[p.id];
    const tone = b ? ringTone(b.y) : '';
    const col = RING_COL[tone] || 'rgba(255,255,255,.4)';
    return `<button class="bchip ${b ? 'has' : 'no'} ${p.chip === 'r' ? 'r' : 'l'}"
      data-bone="${p.id}" style="top:${((chipY[p.id] || p.y) / 9).toFixed(2)}%">
      <b>${p.label}</b>
      <i>${b ? esc(b.n) : '未附'}</i>
      ${b ? `<em><span class="bdot" style="--c:${col}"></span>${fmtYear(b.y)} · ${tone}</em>` : '<em class="none">—</em>'}
    </button>`;
  }).join('');

  return bodyStage(c, 'bone', `<svg class="bsvg bsvg--bone" viewBox="0 0 380 900" preserveAspectRatio="xMidYMid meet">
    ${gems}</svg>${chips}`);
}

/* ---------------- 工具卡 ---------------- */
function ringTipHtml(c, w, i){
  const r = w.r[i];
  const tone = r.c || ringTone(r.y);
  const col = ringHex(r);
  return `<div class="btip__hd" style="--c:${col}"><i class="bringbox"></i>
      <b>第 ${i + 1} 魂环 · ${esc(r.n || '')}</b><em>${esc(tone)} · ${esc(r.y)} 年</em></div>
    <div class="btip__src">${esc(w.n)} · ${esc(w.t || '')}</div>
    <p>${esc(r.d || '（暂无描述）')}</p>`;
}
function boneTipHtml(b, label){
  if (!b) return `<div class="btip__hd"><b>${label}</b><em>空</em></div>
    <p>此部位尚未融合魂骨。魂骨产出率约千分之一，外附更低。</p>`;
  const tone = ringTone(b.y);
  return `<div class="btip__hd" style="--c:${RING_COL[tone]}"><i class="bringbox"></i>
      <b>${esc(b.n)}</b><em>${esc(tone)} · ${esc(b.y)} 年</em></div>
    <div class="btip__src">${label}</div>
    <p>${esc(b.d || '（暂无描述）')}</p>`;
}

/* ---------------- 基础 ---------------- */
function outfitHtml(c){
  const map = {};
  (c.outfit || []).forEach(r => map[r[0]] = r[1]);
  const slots = OUTFIT_SLOTS.map(s => {
    const v = map[s.label] || map[s.id];
    return `<div class="oset ${v ? '' : 'is-empty'}">
      <span class="oset__ic"><svg viewBox="0 0 24 24">${s.icon}</svg></span>
      <span class="oset__tx"><i>${s.label}</i><b>${v ? esc(v) : '—'}</b></span></div>`;
  }).join('');
  return `<section class="dt-sec">
    <div class="dt-sec__h"><i>02</i><b>实时穿搭</b><span class="ln"></span></div>
    <div class="oset-grid">${slots}</div>
  </section>`;
}

/* 身体部位固定次序：必写的那几处永远排在前面，模型换写法也不会跳来跳去 */
const BODY_ORDER = ['口腔','乳房','阴道','子宫','肛门','阴茎','阴囊','腰腹','骨盆','四肢','皮肤','背部'];
const bodyRank = k => { const i = BODY_ORDER.indexOf(String(k)); return i < 0 ? 99 : i; };

function baseHtml(c){
  const kv = (c.rows || []).length
    ? c.rows.map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('')
    : '<dt>档案</dt><dd>等待 AI 写入</dd>';
  const bodyRows = (c.body || []).slice().sort((a, b) => bodyRank(a[0]) - bodyRank(b[0]));
  const body = bodyRows.length ? `<section class="dt-sec">
      <div class="dt-sec__h"><i>04</i><b>身体</b><span class="ln"></span></div>
      <dl class="kv">${bodyRows.map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>
    </section>` : '';
  return `<section class="dt-sec">
      <div class="dt-sec__h"><i>01</i><b>情报</b><span class="ln"></span></div>
      <dl class="kv">${kv}</dl>
    </section>
    ${outfitHtml(c)}
    ${c.id === 'me' ? '' : `<section class="dt-sec">
      <div class="dt-sec__h"><i>03</i><b>关系 · 心理</b><span class="ln"></span></div>
      <div class="bondrow">
        ${bondRing(c.fav)}
        <div class="bondrow__tx">
          <b>${esc(c.rel)}</b>
          <p>${esc(c.mind || '（尚未登场）')}</p>
        </div>
      </div>
    </section>`}
    ${body}`;
}

/* ---------------- 武魂 ---------------- */
function soulNavHtml(c){
  const wu = c.wuhun || [];
  const cur = state.cSoul || 'w0';
  const items = wu.map((w, i) => {
    const on = cur === 'w' + i;
    const n = (w.r || []).length;
    const total = w.total || 0;
    /* 环数与总环数都空 → 未知：只显示一个问号，不臆断「尚未猎取」 */
    const meta = n ? (n + (total > n ? '/' + total : '') + ' 环') : '？';
    return `<button class="cnav ${on ? 'on' : ''}" data-csoul="w${i}">
      <b>${esc(w.n)}</b><i>${meta}</i></button>`;
  }).join('');
  return `<div class="cnavs">
    <div class="cnavs__scroll">${items}
      <button class="cnav ${cur === 'bone' ? 'on' : ''}" data-csoul="bone"><b>魂骨</b><i>${Object.keys(c.bones || {}).length} 处</i></button>
    </div>
  </div>`;
}

/* 标题条：武魂页 / 魂骨页同高同构，保证切换时下方人体不位移 */
function soulHeadHtml(c, w, isBone){
  if (isBone) {
    const bones = c.bones || {};
    const n = Object.keys(bones).length;
    const dots = BONE_PTS.map(p => {
      const b = bones[p.id];
      return `<s class="sdot ${b ? '' : 'no'}" style="--c:${b ? ringHex({ y: b.y }) : 'rgba(255,255,255,.22)'}"></s>`;
    }).join('');
    return `<div class="shead">
      <div class="shead__main"><b>魂骨</b><i>六部位 · 外附魂骨</i></div>
      <div class="shead__meta"><span class="shead__dots">${dots}</span><em>${n} / 6</em></div>
    </div>`;
  }
  const rings = (w && w.r) || [];
  const total = (w && w.total) || 0;
  /* 没有环的明细就是「不知道」：总环数只是标称，不能当成已知 */
  const unknown = !rings.length;
  const dots = rings.map(r => `<s class="sdot" style="--c:${ringHex(r)}"></s>`).join('');
  const sub = [w && w.t, w && w.d].filter(Boolean).map(x => esc(x)).join(' · ');
  const meta = unknown ? '？' : (rings.length + (total > rings.length ? '/' + total : '') + ' 环');
  return `<div class="shead">
    <div class="shead__main"><b>${esc(w.n)}</b><i>${sub || '武魂'}</i></div>
    <div class="shead__meta">${dots ? `<span class="shead__dots">${dots}</span>` : ''}<em class="${unknown ? 'is-q' : ''}">${meta}</em></div>
  </div>`;
}

function soulHtml(c){
  const wu = c.wuhun || [];
  const cur = state.cSoul || 'w0';

  /* ---- 魂骨 ---- */
  if (cur === 'bone') {
    const outer = (c.outer || []).map((o, i) => `<span class="botag" data-bone="outer${i}">
      <b>${esc(o.n)}</b><i>${fmtYear(o.y)}</i></span>`).join('');
    return `${soulHeadHtml(c, null, true)}
      <div class="bspace bspace--bone">${boneStageHtml(c)}</div>
      <div class="ssub">
        <div class="bouter">
          <div class="bouter__hd"><i>外附</i><span>外附魂骨 · 不入六部位</span></div>
          <div class="bouter__row">${outer || '<span class="botag botag--empty">未持有</span>'}
            <button class="botag botag--add" data-outer-add="1">＋ 外附魂骨</button></div>
        </div>
      </div>`;
  }

  /* ---- 武魂 ---- */
  const idx = Math.min(wu.length - 1, Math.max(0, parseInt((cur || 'w0').slice(1), 10) || 0));
  const w = wu[idx];
  if (!w) {
    /* 没有武魂条目也是一种「未知」：不写死成「尚未觉醒」，只给问号 */
    return `<div class="bspace">${bodyStage(c, 'ring',
      `<div class="bempty bempty--unknown">${bqHtml()}</div>`)
      .replace('data-bstage', 'data-bstage data-empty="1" data-wi="0"')}</div>`;
  }
  const rings = (w.r || []);
  const list = rings.length ? `<div class="rlist">${rings.map((r, i) => {
    const col = ringHex(r);
    const tone = r.c || ringTone(r.y);
    return `<button class="rrow" data-ring="${i}" style="--c:${col}">
      <i class="rrow__dot"></i>
      <b>${i + 1}</b><em>${esc(tone)} · ${esc(r.y)}</em>
      <span>${esc(r.n || '')}</span><s>›</s></button>`;
  }).join('')}</div>` : '';

  return `${soulHeadHtml(c, w, false)}
    <div class="bspace">${ringStageHtml(c, w, idx)}</div>
    <div class="ssub">
      ${list}
    </div>`;
}

/* ---------------- 人物详情（带双页签） ---------------- */
function statBarsHtml(c){
  if (c.flesh == null && c.soul == null) return '';
  /* 两条都是百分比：0 下限、100 上限，显示带 % */
  const one = (label, v, cls) => {
    const n = Math.round(Math.max(0, Math.min(100, Number(v) || 0)));
    return `<div class="statbar ${cls || ''}">
      <div class="statbar__hd"><span>${label}</span><b>${n}%</b></div>
      <div class="statbar__tr"><i style="width:${n}%"></i></div></div>`;
  };
  return `<div class="statbars">${one('HP', c.flesh, 'statbar--hp')}${one('魂力', c.soul, 'statbar--soul')}</div>`;
}

function charDetailHtml(c){
  if (!c) return '';
  const tab = state.cTab || 'base';
  const tags = (c.tags || []).map(t => `<span class="tag tag--${t[1]}">${esc(t[0])}</span>`).join('');
  return `<div class="dt-hero"><div class="dt-hero__orb">${c.name.slice(0, 1)}</div>
      <div class="dt-hero__txt"><h1>${esc(c.name)}</h1>
        <div class="sub">${esc([c.sex, c.lv].filter(Boolean).join(' · ') || '等待 AI 写入档案')}</div><div class="tags">${tags}</div>
        ${c.id === 'me' ? statBarsHtml(c) : ''}</div></div>
    <div class="ctabs">
      <button class="ctab ${tab === 'base' ? 'on' : ''}" data-ctab="base">基础</button>
      <button class="ctab ${tab === 'soul' ? 'on' : ''}" data-ctab="soul">武魂</button>
      <span class="ctabs__ln" style="--i:${tab === 'bone' || tab === 'soul' ? 1 : 0}"></span>
    </div>
    ${tab === 'base' ? baseHtml(c) : soulNavHtml(c) + soulHtml(c)}`;
}
