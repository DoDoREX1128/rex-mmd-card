
/* ============================================================
   地图模块（世界 / 区域 / 局部 · 全屏 · 缩放锁）
   ============================================================ */

/* ============================================================
   地标徽记（24×24 · 线性工艺）
   ============================================================ */
const MK_ICON = {
  city: `<path d="M3.2 20.6h17.6"/><path d="M5 20.6v-8.9h3.5v8.9"/><path d="M15.5 20.6v-8.9H19v8.9"/>
    <path d="M9.8 20.6V7.5h4.4v13.1"/><path d="M9.8 7.5 12 4.8l2.2 2.7"/>
    <path d="M5 11.7 6.75 9.9 8.5 11.7"/><path d="M15.5 11.7 17.25 9.9 19 11.7"/>
    <path d="M11.15 20.6V17a.85.85 0 0 1 1.7 0v3.6"/>`,
  sect: `<path d="M3.4 20.7h17.2"/><path d="M6.3 20.7V13.1h11.4v7.6"/>
    <path d="M8.1 13.1V9.3h7.8v3.8"/><path d="M9.6 9.3V6.1h4.8v3.2"/>
    <path d="M12 3 13.5 6.1h-3Z"/><path d="M10 20.7v-3.3a2 2 0 0 1 4 0v3.3"/>
    <path d="M6.3 16.6h11.4"/>`,
  forest: `<path d="M12 20.9v-4.6"/><path d="M12 16.3 6.9 10.9h2.5L6.2 6.6h2.7L12 2.9l3.1 3.7h2.7l-3.2 4.3h2.5Z"/>
    <path d="M8.4 20.9c0-1.1.8-1.5.8-1.5s.8.4.8 1.5"/><path d="M14 20.9c0-1.1.8-1.5.8-1.5s.8.4.8 1.5"/>`,
  pass: `<path d="M3 20.6h18"/><path d="M5.2 20.6V8.4h4.1v12.2"/><path d="M14.7 20.6V8.4h4.1v12.2"/>
    <path d="M9.3 20.6v-4.9a2.7 2.7 0 0 1 5.4 0v4.9"/>
    <path d="M5.2 8.4 7.25 5.9 9.3 8.4"/><path d="M14.7 8.4 16.75 5.9 18.8 8.4"/>
    <path d="M5.2 12.2h4.1M14.7 12.2h4.1"/>`,
  island: `<path d="M4.6 14.4c1.4-2.6 4.1-4.2 7.4-4.2s6 1.6 7.4 4.2c-1.4 2-4.1 3.2-7.4 3.2s-6-1.2-7.4-3.2Z"/>
    <path d="M9.6 12.6c.7-1.1 1.4-1.7 2.4-1.7s1.7.6 2.4 1.7"/>
    <path d="M2.6 19.2c1.6 0 1.6 1.2 3.2 1.2s1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2" opacity=".8"/>`,
  relic: `<path d="M12 2.6 16.6 8.1 12 21.4 7.4 8.1Z"/><path d="M7.4 8.1h9.2M12 2.6v18.8"/>
    <path d="M9.4 8.1 12 2.6l2.6 5.5-2.6 12.9Z" opacity=".55"/>
    <path d="M4.4 11.2 6.5 9.6M3.4 15.4l2.2-.9M19.6 11.2 17.5 9.6M20.6 15.4l-2.2-.9"/>`,
  region: `<path d="M12 2.9 20.2 7.6v8.8L12 21.1 3.8 16.4V7.6Z"/><path d="M12 8.1 15.4 10v4.2L12 16.1 8.6 14.2V10Z"/>
    <path d="M12 2.9v5.2M20.2 7.6l-4.8 2.4M20.2 16.4l-4.8-2.2M12 21.1v-5M3.8 16.4 8.6 14.2M3.8 7.6l4.8 2.4" opacity=".5"/>`,
  sea: `<path d="M2.4 9.2c1.7 0 1.7 1.5 3.4 1.5s1.7-1.5 3.4-1.5 1.7 1.5 3.4 1.5 1.7-1.5 3.4-1.5 1.7 1.5 3.4 1.5 1.7-1.5 2.6-1.5"/>
    <path d="M2.4 13.5c1.7 0 1.7 1.5 3.4 1.5s1.7-1.5 3.4-1.5 1.7 1.5 3.4 1.5 1.7-1.5 3.4-1.5 1.7 1.5 3.4 1.5 1.7-1.5 2.6-1.5"/>
    <path d="M2.4 17.8c1.7 0 1.7 1.5 3.4 1.5s1.7-1.5 3.4-1.5 1.7 1.5 3.4 1.5 1.7-1.5 3.4-1.5 1.7 1.5 3.4 1.5 1.7-1.5 2.6-1.5" opacity=".55"/>`,
  village: `<path d="M3.4 20.7h17.2"/><path d="M6.4 20.7v-6.5h6v6.5"/><path d="M5.4 14.2 9.4 10.4l4 3.8"/>
    <path d="M12.4 20.7v-3.2a1.5 1.5 0 0 1 3 0v3.2"/><path d="M9.4 17.9h.01"/>
    <path d="M17.6 20.7v-3.4"/><path d="M17.6 17.3c-1.6 0-2.6-1-2.6-2.4 0-1.5 1.2-2.6 2.6-2.6s2.6 1.1 2.6 2.6c0 1.4-1 2.4-2.6 2.4Z"/>`
};

const mesc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const MK_WORLD = [
  {id:'jibei',   n:'极北之地',   k:'region', x:44, y:5,  lv:2, r:'tiandou', d:'大陆最北的苦寒荒原，终年风雪。奥斯卡为突破瓶颈曾在此历练五年。'},
  {id:'bingfeng',n:'冰封森林',   k:'forest', x:30, y:11, lv:2, r:'tiandou', d:'天斗帝国北端的针叶林，气温极低、人迹罕至。'},
  {id:'tiandou', n:'天斗城',     k:'city',   x:48, y:27, lv:1, r:'tiandou', d:'天斗帝国首都，北方恢宏大气。皇宫、皇家学院、拍卖场皆在此。'},
  {id:'qibao',   n:'七宝琉璃宗', k:'sect',   x:54, y:31, lv:2, r:'tiandou', d:'七宝琉璃塔武魂一脉相传，大陆最富有的魂师宗门。'},
  {id:'haotian', n:'昊天宗',     k:'sect',   x:78, y:22, lv:2, r:'tiandou', d:'上三门之首，隐于山间村落，宗门外只有一道铁索桥。'},
  {id:'micong',   n:'迷踪大峡谷', k:'pass',   x:62, y:14, lv:2, r:'tiandou', d:'天斗境内的险地，峡谷终年迷雾，传说是昊天锤器魂真身的试炼地。'},
  {id:'luori',   n:'落日森林',   k:'forest', x:33, y:33, lv:2, r:'luori',   d:'天斗帝国中央的温带森林，魂兽多在千年至万年之间。'},
  {id:'binghuo', n:'冰火两仪眼', k:'relic',  x:36, y:36, lv:2, r:'luori',   d:'一眼双生、两仪互克，天下三大聚宝盆之一。'},
  {id:'fasinuo', n:'法斯诺行省', k:'region', x:18, y:37, lv:2, r:'fasinuo', d:'天斗帝国西南边境行省，与星罗帝国相距不到二百里。'},
  {id:'nuoding', n:'诺丁城',     k:'city',   x:17, y:40, lv:2, r:'fasinuo', d:'边境小城，城墙厚实，设有武魂分殿与诺丁学院。'},
  {id:'shenghun',n:'圣魂村',     k:'village',x:13, y:43, lv:2, r:'fasinuo', d:'三百余户的小村，百年前出过一位魂圣。唐三出生地。'},
  {id:'liehun',  n:'猎魂森林',   k:'forest', x:22, y:35, lv:2, r:'fasinuo', d:'帝国圈养魂兽之处，距诺丁城东北四百里。'},
  {id:'xierwei', n:'西尔维斯王国',k:'region',x:52, y:40, lv:2, r:'balake',  d:'巴拉克以北，赴天斗城须穿越其全境，近两千里。'},
  {id:'wuhun',   n:'武魂城',     k:'city',   x:36, y:45, lv:1, ls:'l', r:'wuhun',   d:'两大帝国交界，两国都无属权。教皇殿号称大陆最宏伟的建筑。'},
  {id:'xingdou', n:'星斗大森林', k:'forest', x:53, y:49, lv:1, r:'xingdou',   d:'大陆中央最大的魂兽森林，属热带，泰坦巨猿与天青牛蟒的领地。'},
  {id:'jialing', n:'嘉陵关',     k:'pass',   x:73, y:44, lv:2, r:'balake',  d:'天灵山脉中心，一夫当关。关后平原直捣巴拉克腹地。'},
  {id:'balake',  n:'巴拉克王国', k:'region', x:67, y:54.6, lv:2, r:'balake',d:'天斗帝国门户，四大王国中军力最强，南接星罗帝国。'},
  {id:'suotuo',  n:'索托城',     k:'city',   x:68, y:57, lv:2, r:'balake',  d:'立马平原中央，巴拉克粮仓。索托大斗魂场所在。'},
  {id:'shilaike',n:'史莱克学院', k:'sect',   x:71, y:61, lv:2, r:'balake',  d:'索托城外的破烂学院，只收怪物。史莱克七怪在此集结。'},
  {id:'xingluo', n:'星罗帝国',   k:'region', x:44, y:77, lv:2, r:'xingluo', d:'南方帝国，都城星罗城以细腻华美著称。'},
  {id:'xingluoc',n:'星罗城',     k:'city',   x:47, y:62, lv:2, r:'xingluo', d:'星罗帝国首都，唯一能与天斗城媲美的城市。'},
  {id:'gengxin', n:'庚辛城',     k:'city',   x:26, y:72, lv:1, r:'xingluo', d:'星罗帝国主城之一，金属之都。铁匠铺上千家。'},
  {id:'longxing',n:'龙兴城',     k:'city',   x:58, y:68, lv:2, r:'xingluo', d:'两大帝国接壤处不远的城，御之一族扎根于此。'},
  {id:'xilu',     n:'西鲁城',     k:'city',   x:82, y:51, lv:2, r:'balake',  d:'巴拉克东境的边城，设武魂主殿；再往东就是哈根达斯王国的地界。'},
  {id:'hanhai',  n:'瀚海城',     k:'city',   x:8,  y:55, lv:2, r:'haishen', d:'帝国西部海滨唯一港口，出海约十日可达海神岛。'},
  {id:'zizhen',  n:'紫珍珠岛',   k:'island', x:5,  y:47, lv:2, r:'haishen', d:'距瀚海城两日海程，紫珍珠海盗团的老巢。'},
  {id:'haishen', n:'海神岛',     k:'island', x:4,  y:62, lv:1, r:'haishen', d:'武魂殿称之为魔鬼岛。海神山、七圣柱、海神九考皆在此。'},
  {id:'mojing',  n:'魔鲸海域',   k:'sea',    x:3,  y:70, lv:2, r:'haishen', d:'深海魔鲸王的领地，海神岛外围最凶险的水域。'},
  {id:'shalu',   n:'杀戮之都',   k:'relic',  x:92, y:90, lv:2, r:'shalu',   d:'独立空间，入口藏在普通小镇。百场胜利方可挑战地狱路。'},
];

const RN = r => (REGION_SVG[r] && (REGION_SVG[r].rn || REGION_SVG[r].n)) || '';
const MS = { view:'world', sel:null, lock:false, zoom:1, px:0, py:0, rgn:null, labels:false, full:false };

/* 局部地图示例槽位：初始为空，等 loc / near 字段写入 */
const LOCAL_DEMO = { here:'', nodes:[] };

/* 局部实时地图：loc 是中心，near 是周围节点；没有数据时回退示例 */
function kindOf(name){
  const s = String(name || '');
  if (/林|森/.test(s)) return 'forest';
  if (/门|关|口|渡/.test(s)) return 'pass';
  if (/城/.test(s)) return 'city';
  if (/殿|阁|院|堂|宗|塔|宫/.test(s)) return 'sect';
  if (/岛|海|湾/.test(s)) return 'relic';
  if (/村|镇|庄/.test(s)) return 'village';
  return 'sect';
}
const LOCAL = { here: LOCAL_DEMO.here, nodes: LOCAL_DEMO.nodes.slice(), live: false };
function setLocalMap(here, near){
  const list = (near || []).filter(x => x && x.n);
  if (!list.length) return;
  const h = String(here || LOCAL.here).replace(/^.*[·›]\s*/, '').trim() || LOCAL.here;
  const n = list.length;
  const nodes = [{ n: h, x: 50, y: 50, k: kindOf(h), cur: true, dist: '' }];
  list.forEach((x, i) => {
    const a = -Math.PI / 2 + i * Math.PI * 2 / n;
    const r = 33 + (i % 2) * 4;
    nodes.push({ n: x.n, x: +(50 + Math.cos(a) * r).toFixed(1), y: +(50 + Math.sin(a) * r).toFixed(1),
                 k: kindOf(x.n), dist: x.d || '' });
  });
  LOCAL.here = h; LOCAL.nodes = nodes; LOCAL.live = true;
}

/* ---------- 图标尺寸：层级越高越大 ---------- */
const MK_D = { region:33, sea:31, forest:30, city:26, sect:22, pass:21, island:21, relic:16, village:16 };
const mkSize = k => MK_D[k] || 24;

/* ---------- 世界地图 ---------- */
function worldMapHtml() {
  const sel = MK_WORLD.find(m => m.id === MS.sel);
  const marks = MK_WORLD.map(m => `<button class="mk ${MS.sel===m.id?'on':''}" data-mark="${m.id}" data-k="${m.k}" data-lv="${m.lv}"
      style="left:${m.x}%;top:${m.y}%;--mk:${mkSize(m.k)}px">
      <span class="mki"><svg viewBox="0 0 24 24">${MK_ICON[m.k]||MK_ICON.city}</svg></span>
      <b>${mesc(m.n)}</b><em>${KL[m.k]||''}</em></button>`).join('');
  const pop = sel ? `<div class="mpop" data-flip="${sel.y < 44 ? 1 : 0}" style="left:50%;top:50%">
      <div class="mpop__hd"><b>${mesc(sel.n)}</b><i>${KL[sel.k]||''}</i></div>
      <div class="mpop__t">${mesc(RN(sel.r))}</div>
      <p class="mpop__d">${mesc(sel.d)}</p>
      <button class="mpop__b" data-goregion="${sel.r}">前往该区域</button></div>` : '';
  return `<div class="mzoom" data-zoom style="transform:${mzTransform()}">
      <div class="mbg" style="background-image:url(&quot;${MAP_BG}&quot;)"></div>
      <div class="mgrid"></div>
      ${marks}
    </div>${pop}`;
}

/* ---------- 区域地图 ---------- */
function regionMapHtml(rid) {
  const R = REGION_SVG[rid]; if (!R) return '';
  const sel = (R.marks || []).find(m => m.id === MS.sel);
  const marks = (R.marks || []).map(m => {
    const lx = m.x / SVG_W * 100, ly = m.y / SVG_H * 100;
    return `<button class="mk ${MS.sel===m.id?'on':''}" data-mark="${m.id}" data-k="${m.k}" data-lv="1"
      style="left:${lx}%;top:${ly}%;--mk:${mkSize(m.k)}px">
      <span class="mki"><svg viewBox="0 0 24 24">${MK_ICON[m.k]||MK_ICON.city}</svg></span>
      <b>${mesc(m.n)}</b><em>${KL[m.k]||''}</em></button>`;
  }).join('');
  const pop = sel ? `<div class="mpop" data-flip="${(sel.y/SVG_H*100) < 44 ? 1 : 0}" style="left:50%;top:50%">
      <div class="mpop__hd"><b>${mesc(sel.n)}</b><i>${KL[sel.k]||''}</i></div>
      <div class="mpop__t">${mesc(RN(rid))}</div>
      <p class="mpop__d">${mesc(sel.d)}</p>
      <button class="mpop__b" data-go="${mesc(sel.n)}">前往该地点</button></div>` : '';
  return `<div class="mzoom" data-zoom style="transform:${mzTransform()}">
      <div class="mbg">${R.svg}</div>
      ${marks}
    </div>${pop}`;
}

const KL = { city:'城', village:'村', forest:'林', pass:'关', island:'岛', sect:'宗门', relic:'遗迹', region:'区域', sea:'海域' };
const mzTransform = () => `scale(${MS.zoom}) translate(${MS.px}px,${MS.py}px)`;

/* ---------- 地名清单：点名字只选中并弹气泡，不直接跳区域 ---------- */
function namesHtml(){
  const row = m => `<button class="mname ${MS.sel===m.id?'on':''}" data-mark="${m.id}" data-k="${m.k}">
      <i></i>${mesc(m.n)}</button>`;
  if (MS.view !== 'world') {
    const R = REGION_SVG[MS.view];
    return `<div class="mnames__g"><b>${mesc(RN(MS.view))}</b><i>${(R.marks||[]).length} 处</i><span class="ln"></span></div>
      <div class="mnames__list">${(R.marks||[]).map(row).join('')}</div>`;
  }
  const groups = {};
  MK_WORLD.forEach(m => { (groups[m.r] = groups[m.r] || []).push(m); });
  return Object.keys(groups).map(r => `<div class="mnames__g"><b>${mesc((REGION_SVG[r]||{}).n||r)}</b><i>${groups[r].length}</i><span class="ln"></span></div>
    <div class="mnames__list">${groups[r].map(row).join('')}</div>`).join('');
}

/* ---------- 全屏（PC）：左侧八域索引 / 右侧选中详情 ---------- */
function msideIdxHtml(){
  const inRegion = MS.view !== 'world';
  const groups = {};
  MK_WORLD.forEach(m => { (groups[m.r] = groups[m.r] || []).push(m); });
  const regRows = Object.keys(REGION_SVG).map(k => {
    const R = REGION_SVG[k];
    const n = (MK_WORLD.filter(m => m.r === k) || []).length + ((R.marks || []).length);
    return `<button class="midt ${MS.view===k?'on':''}" data-goregion="${k}">
      <span class="mki" style="--mk:22px"><svg viewBox="0 0 24 24">${MK_ICON.region}</svg></span>
      <b>${mesc(RN(k))}</b><i>${n}</i></button>`;
  }).join('');
  const markRows = (inRegion ? (REGION_SVG[MS.view].marks || []) : MK_WORLD).map(m =>
    `<button class="midt ${MS.sel===m.id?'on':''}" data-mark="${m.id}">
      <span class="mki" style="--mk:22px"><svg viewBox="0 0 24 24">${MK_ICON[m.k]||MK_ICON.city}</svg></span>
      <b>${mesc(m.n)}</b><i>${KL[m.k]||''}</i></button>`).join('');
  return `<div class="midx__hd"><b>舆图册</b><i>ATLAS</i></div>
    <div class="midx__list">${inRegion
      ? `<button class="midt" data-goback="1"><b>‹ 世界地图</b><i>WORLD</i></button>`
      : regRows}</div>
    <div class="midx__hd"><b>${inRegion ? mesc(RN(MS.view)) : '斗罗大陆'}</b><i>${inRegion ? (REGION_SVG[MS.view].marks||[]).length : MK_WORLD.length} 处</i></div>
    <div class="midx__list">${markRows}</div>`;
}

function msideInfoHtml(){
  const inRegion = MS.view !== 'world';
  const R = inRegion ? REGION_SVG[MS.view] : null;
  const sel = inRegion
    ? (R.marks || []).find(m => m.id === MS.sel)
    : MK_WORLD.find(m => m.id === MS.sel);
  const body = sel
    ? `<div class="mif">
        <div class="mif__hd">
          <span class="mki mki--lg" style="--mk:46px;color:currentColor"><svg viewBox="0 0 24 24">${MK_ICON[sel.k]||MK_ICON.city}</svg></span>
          <div><b>${mesc(sel.n)}</b><i>${KL[sel.k]||''} · ${inRegion ? mesc(RN(MS.view)) : mesc(RN(sel.r))}</i></div>
        </div>
        <p>${mesc(sel.d)}</p>
        ${inRegion
          ? `<button class="mpop__b" data-go="${mesc(sel.n)}">前往该地点</button>`
          : `<button class="mpop__b" data-goregion="${sel.r}">前往该区域</button>`}
      </div>`
    : `<div class="mside__empty"><b>选一处地标</b><p>点地图上的徽记，或左侧目录里的名字，<br>这里会展开它的来历。</p></div>`;
  const legend = [['city','城'],['region','区域'],['sect','宗门'],['forest','森林'],['pass','关隘'],['island','海岛'],['sea','海域'],['relic','遗迹'],['village','村']]
    .map(([k,t]) => `<span data-k="${k}"><svg viewBox="0 0 24 24">${MK_ICON[k]}</svg>${t}</span>`).join('');
  return `<div class="midx__hd"><b>地志</b><i>${sel ? 'PLACE' : 'INDEX'}</i></div>
    ${body}
    <div class="mlegend mlegend--v">${legend}</div>`;
}

/* ---------- 详情栏 ---------- */
function mapPanelHtml() {
  const inRegion = MS.view !== 'world';
  const R = inRegion ? REGION_SVG[MS.view] : null;
  const full = !!MS.full && window.innerWidth >= 1280;
  const crumb = inRegion
    ? `<div class="mcrumbs"><b data-goback="1">世界</b><em>›</em><span>${mesc(RN(MS.view))}</span><em>·</em><span>${(R.marks||[]).length} 处</span></div>`
    : `<div class="mcrumbs"><b>斗罗大陆</b><em>·</em><span>${MK_WORLD.length} 处地标</span></div>`;
  const stageCls = inRegion ? 'mstage mstage--region' : 'mstage mstage--world';

  const dock = `<div class="mdock">
      <button class="mdock__b ${MS.labels?'on':''}" data-maplabels title="显示全部地名">
        <svg viewBox="0 0 24 24"><path d="M4 7h10M4 12h16M4 17h7"/><circle cx="18" cy="7" r="1.6"/></svg><span>地名</span></button>
      <button class="mdock__b ${MS.lock?'on':''}" data-maplock title="${MS.lock?'已锁定，点击解锁':'锁定地图'}">
        <svg viewBox="0 0 24 24">${MS.lock
          ? '<rect x="5" y="10.6" width="14" height="9" rx="2"/><path d="M8.4 10.6V7.8a3.6 3.6 0 0 1 7.2 0v2.8"/>'
          : '<rect x="5" y="10.6" width="14" height="9" rx="2"/><path d="M8.4 10.6V7.8a3.6 3.6 0 0 1 6.6-2"/>'}</svg><span>${MS.lock?'解锁':'锁定'}</span></button>
      <span class="mzoomctl"><button data-zoomout title="缩小">−</button><button data-zoomreset title="复位">${Math.round(MS.zoom*100)}%</button><button data-zoomin title="放大">＋</button></span>
      ${inRegion ? `<button class="mdock__b mdock__b--back" data-mapback title="返回世界地图">
        <svg viewBox="0 0 24 24"><path d="M14.4 5.6 8 12l6.4 6.4"/></svg><span>世界地图</span></button>` : ''}
      <button class="mdock__b mdock__b--full" data-mapfull title="${full?'退出全屏':'全屏舆图'}">
        <svg viewBox="0 0 24 24">${full
          ? '<path d="M9 4.4v4.6H4.4M15 4.4v4.6h4.6M9 19.6v-4.6H4.4M15 19.6v-4.6h4.6"/>'
          : '<path d="M4.4 9V4.4H9M16.6 4.4H21V9M21 15v4.6h-4.4M9 19.6H4.4V15"/>'}</svg><span>${full?'退出':'全屏'}</span></button>
    </div>`;

  const main = `<div class="mmain">
      <div class="mmain__top"><div class="mlevel">${crumb}</div></div>
      <div class="${stageCls} ${MS.labels?'show-labels':''}" data-stage>
        ${inRegion ? regionMapHtml(MS.view) : worldMapHtml()}
      </div>
      ${full ? `<div class="mfull-info"><b>${inRegion ? mesc(RN(MS.view)) : '斗罗大陆'}</b>
        <p>${inRegion ? mesc(R.s) : '两大帝国与海外诸岛的全图。点徽记查看地志，再决定去处。'}</p></div>` : ''}
      ${dock}
      ${full ? '' : `<div class="mnames">${namesHtml()}</div>`}
    </div>`;

  if (full) {
    return `<div class="mapd is-full">
      <aside class="mside mside--idx">${msideIdxHtml()}</aside>
      ${main}
      <aside class="mside mside--info">${msideInfoHtml()}</aside>
    </div>`;
  }
  return `<div class="dt-hero" data-maphero><div class="dt-hero__orb">图</div>
      <div class="dt-hero__txt"><h1>${inRegion ? mesc(RN(MS.view)) : '斗罗大陆'}</h1>
      <div class="sub">ATLAS · ${inRegion ? mesc(R.s) : '世界地图'}</div></div></div>
    <div class="mapd">${main}</div>`;
}

/* 全屏时按舆图比例把舞台贴合到中间列的可用空间 */
function fitMapStage(){
  const box = document.querySelector('.mapd.is-full');
  if (!box) return;
  const stage = box.querySelector('[data-stage]');
  const main = box.querySelector('.mmain');
  if (!stage || !main) return;
  const inRegion = MS.view !== 'world';
  const ratio = inRegion ? 800 / 560 : 1386 / 1472;
  const extra = (main.querySelector('.mmain__top')?.offsetHeight || 26)
    + (main.querySelector('.mdock')?.offsetHeight || 46)
    + (main.querySelector('.mfull-info')?.offsetHeight || 32) + 34;
  const maxW = Math.max(200, main.clientWidth - 6);
  const maxH = Math.max(180, main.clientHeight - extra);
  let w = maxW, h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  stage.style.width = Math.round(w) + 'px';
  stage.style.height = Math.round(h) + 'px';
}

/* 气泡贴边夹取：按舞台像素定位，尾巴对准徽记 */
function layoutPops(){
  document.querySelectorAll('[data-stage]').forEach(stage => {
    const pop = stage.querySelector('.mpop');
    if (!pop) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const mk = stage.querySelector('.mk.on');
    const sr = stage.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    pop.dataset.fixed = '1';
    const cx = mk ? (mk.getBoundingClientRect().left + mk.getBoundingClientRect().width / 2 - sr.left) : W / 2;
    const left = Math.max(6, Math.min(W - pw - 6, cx - pw / 2));
    pop.style.left = Math.round(left) + 'px';
    pop.style.setProperty('--tail', Math.max(14, Math.min(pw - 14, cx - left)) + 'px');
    /* 垂直：优先上方 → 下方 → 上下都放不下就贴边夹取 */
    const iy = mk ? (mk.getBoundingClientRect().top - sr.top) : H / 2;
    const ih = mk ? mk.getBoundingClientRect().height : 20;
    let top, flip;
    if (iy > ph + 8) { top = iy - 8; flip = '0'; }
    else if (iy + ih + 8 + ph <= H) { top = iy + ih + 8; flip = '1'; }
    /* 上下都挤：保持底边模式，但把顶边压进舞台内（尾巴仍指向地标） */
    else { top = Math.max(ph + 4, iy - 8); flip = '0'; }
    pop.dataset.flip = flip;
    pop.style.top = Math.round(top) + 'px';
    pop.dataset.ready = '1';        /* 位置算完再淡入 */
  });
}

/* 地标排布：图标按层级定大小并轻微推开；地名四向避让，放不下才收起 */
function layoutMarks(){
  document.querySelectorAll('[data-stage]').forEach(stage => {
    if (!stage.clientWidth || !stage.clientHeight) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    const mks = [...stage.querySelectorAll('.mk')];
    if (!mks.length) return;
    /* 图标随舞台宽度整体缩放：窄栏（PC 右栏）不至于挤成一团 */
    const k = Math.min(1.12, Math.max(0.8, W / 360));
    const info = mks.map(el => {
      const base = mkSize(el.dataset.k) || 24;     /* 基准尺寸来自 kind，幂等 */
      const x = (parseFloat(el.style.left) || 0) / 100 * W;
      const y = (parseFloat(el.style.top) || 0) / 100 * H;
      return { el, size: Math.max(15, base * k), x, y, ox: x, oy: y };
    });
    /* 1) 图标互相推开，避免徽记压在一起 */
    for (let iter = 0; iter < 30; iter++) {
      let moved = false;
      for (let i = 0; i < info.length; i++) {
        for (let j = i + 1; j < info.length; j++) {
          const p1 = info[i], p2 = info[j];
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          const d = Math.hypot(dx, dy) || 0.01;
          const min = (p1.size + p2.size) / 2 + 3;
          if (d >= min) continue;
          const push = (min - d) / 2, ux = dx / d, uy = dy / d;
          const w1 = p2.size / (p1.size + p2.size), w2 = 1 - w1;
          p1.x -= ux * push * 2 * w1; p1.y -= uy * push * 2 * w1;
          p2.x += ux * push * 2 * w2; p2.y += uy * push * 2 * w2;
          moved = true;
          /* 位置尽量忠实于地理坐标：最多挪 7px */
          p1.x = Math.min(p1.ox + 12, Math.max(p1.ox - 12, p1.x));
          p1.y = Math.min(p1.oy + 12, Math.max(p1.oy - 12, p1.y));
          p2.x = Math.min(p2.ox + 12, Math.max(p2.ox - 12, p2.x));
          p2.y = Math.min(p2.oy + 12, Math.max(p2.oy - 12, p2.y));
        }
      }
      if (!moved) break;
    }
    /* 位置夹在舞台内 */
    info.forEach(it => {
      const r = it.size / 2;
      it.x = Math.min(W - r, Math.max(r, it.x));
      it.y = Math.min(H - r, Math.max(r, it.y));
    });
    /* 2) 挪不开的，把小的一方缩小一点，直到不压 */
    for (let round = 0; round < 14; round++) {
      let done = true;
      for (let i = 0; i < info.length; i++) {
        for (let j = i + 1; j < info.length; j++) {
          const p1 = info[i], p2 = info[j];
          const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          if (d >= (p1.size + p2.size) / 2 + 2) continue;
          const small = p1.size <= p2.size ? p1 : p2;
          if (small.size <= 15) continue;
          small.size = Math.max(15, small.size * 0.84);
          done = false;
        }
      }
      if (done) break;
    }
    info.forEach(it => {
      it.el.style.left = (it.x / W * 100).toFixed(3) + '%';
      it.el.style.top = (it.y / H * 100).toFixed(3) + '%';
      it.el.style.setProperty('--mk', it.size.toFixed(1) + 'px');
      it.el.removeAttribute('data-side');
    });
    /* 3) 地名试位：先保证「地名之间不压」，再尽量不压图标 */
    const iconRects = info.map(it => ({ x: it.x - it.size/2 - 1, y: it.y - it.size/2 - 1, w: it.size + 2, h: it.size + 2 }));
    const labelRects = [];
    const over = (a, b) => !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);
    info.slice().sort((x, y) => y.size - x.size).forEach(it => {
      const bEl = it.el.querySelector('b');
      if (!bEl || !bEl.offsetWidth) return;
      const w = bEl.offsetWidth + 2, h = bEl.offsetHeight, r = it.size / 2;
      const cands = [];
      [2, 8, 14, 21, 28, 36].forEach(gap => {
        cands.push(['d', it.x - w/2, it.y + r + gap]);
        cands.push(['u', it.x - w/2, it.y - r - gap - h]);
        cands.push(['r', it.x + r + gap, it.y - h/2]);
        cands.push(['l', it.x - r - gap - w, it.y - h/2]);
      });
      let best = null, bestScore = -1e9;
      for (const [side, x0, y0] of cands) {
        /* 越界的候选夹回舞台内，边缘地标才不会被裁 */
        const x = Math.min(Math.max(6, x0), Math.max(6, W - w - 6));
        const y = Math.min(Math.max(6, y0), Math.max(6, H - h - 6));
        const drift = Math.abs(x - x0) + Math.abs(y - y0);
        const rect = { x, y, w, h };
        const lo = labelRects.filter(t => over(t, rect)).length;
        const io = iconRects.filter(t => over(t, rect)).length;
        if (lo === 0 && io === 0 && drift === 0) { it.el.dataset.side = side; labelRects.push(rect); return; }
        const score = lo * -100 - io * 22 - drift * 2;
        if (score > bestScore) { bestScore = score; best = { side, rect, drift }; }
      }
      if (best) {
        if (best.drift > 0.5) {
          /* 被夹过：直接给相对图标的 px 偏移，不再依赖四向 CSS */
          it.el.dataset.side = 'free';
          it.el.style.setProperty('--bx', (best.rect.x - (it.x - r)).toFixed(1) + 'px');
          it.el.style.setProperty('--by', (best.rect.y - (it.y - r)).toFixed(1) + 'px');
        } else {
          it.el.dataset.side = best.side;
          it.el.style.removeProperty('--bx');
          it.el.style.removeProperty('--by');
        }
        labelRects.push(best.rect);
      }
    });
  });
}

/* 窗口变化时重排（缩略图切换/旋转屏） */
let mkT = 0;
window.addEventListener('resize', () => { clearTimeout(mkT); mkT = setTimeout(layoutMarks, 140); });

/* ---------- 简要栏（局部实时地图） ---------- */
function localMapHtml(showNote) {
  const L = LOCAL;
  if (!L.nodes.length) {
    return `<div class="difempty"><i>—</i><p>还没有位置数据。<br>AI 写出 <b>loc</b> 与 <b>near</b> 后在这里生成。</p></div>`;
  }
  const W = 260, H = 200;
  let lines = '', dots = '';
  L.nodes.forEach(n => {
    if (n.cur) return;
    const x = n.x / 100 * W, y = n.y / 100 * H;
    lines += `<line x1="${W/2}" y1="${H/2}" x2="${x}" y2="${y}" stroke="rgba(140,92,255,.22)" stroke-width="1" stroke-dasharray="4 4"/>`;
  });
  L.nodes.forEach(n => {
    const x = n.x / 100 * W, y = n.y / 100 * H;
    const col = n.cur ? '#F6E3AE' : ({city:'#D9B36A',sect:'#F0D89A',forest:'#6FD6AE',pass:'#E4566E',village:'#D8CBB4',relic:'#FF9EC4'}[n.k] || '#D9B36A');
    dots += `<g><circle cx="${x}" cy="${y}" r="${n.cur?5:3}" fill="${col}" ${n.cur?'filter="url(#lg)"':''}/>
      <text x="${x}" y="${y-9}" font-size="9" fill="${n.cur?'#F6E3AE':'rgba(226,214,190,.72)'}" text-anchor="middle" font-family="sans-serif">${mesc(n.n)}</text>
      ${n.dist?`<text x="${x}" y="${y+13}" font-size="7.5" fill="rgba(140,130,160,.65)" text-anchor="middle" font-family="sans-serif">${mesc(n.dist)}</text>`:''}</g>`;
  });
  const svg = `<svg viewBox="0 0 ${W} ${H}" class="localsvg" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="lg"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="${W}" height="${H}" fill="rgba(10,6,20,.55)"/>
    ${[1,2,3].map(r=>`<circle cx="${W/2}" cy="${H/2}" r="${r*24}" fill="none" stroke="rgba(217,179,106,.10)" stroke-width="1"/>`).join('')}
    ${lines}${dots}
  </svg>`;
  const list = L.nodes.filter(n => !n.cur).map(n => `<button class="lmt" data-go="${n.n}">
      <i></i><span>${mesc(n.n)}</span><em>${mesc(n.dist||'前往')}</em></button>`).join('');
  return `<div class="lmap">${svg}</div>
    <div class="mappad">${herePeopleHtml()}</div>
    <div class="lmap-foot">
      <div class="eyebrow" style="margin:0 0 7px">此刻在 ${mesc(L.here)} · 可前往</div>
      <div class="lmap-list">${list}</div>
      ${showNote ? `<div class="lmap-note">${L.live
        ? '这里由每轮 <b>[状态]</b> 的 loc / near 字段生成。'
        : '还没有 near 数据，先显示教皇殿示例。'}</div>` : ''}
    </div>`;
}

/* ---------- 手机端：局部实时 + 世界/区域全屏入口 ---------- */
function mapEntryHtml(){
  return `${localMapHtml(false)}
    <div class="mappad"><div class="mapgo mapgo--one">
      <button class="mapgo__b" data-openmap="world">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8M12 3.6c2.6 2.4 2.6 14.4 0 16.8M12 3.6c-2.6 2.4-2.6 14.4 0 16.8"/></svg>
        <b>世界地图</b><i>${MK_WORLD.length} 处地标 · 可进入 ${Object.keys(REGION_SVG).length} 域</i>
      </button>
    </div></div>`;
}

/* ---------- 交互 ---------- */
function mapHandleClick(e) {
  if (e.target.closest('[data-maplabels]')) { MS.labels = !MS.labels; return 'repaint'; }
  if (e.target.closest('[data-mapfull]')) {
    MS.full = !MS.full;
    MS.sel = null; MS.zoom = 1; MS.px = 0; MS.py = 0;
    return 'full';
  }
  if (e.target.closest('[data-maplock]')) { MS.lock = !MS.lock; return 'repaint'; }
  if (e.target.closest('[data-zoomin]')) { mapZoomBy(1.25); return 'zoom'; }
  if (e.target.closest('[data-zoomout]')) { mapZoomBy(0.8); return 'zoom'; }
  if (e.target.closest('[data-zoomreset]')) {
    MS.zoom = 1; MS.px = 0; MS.py = 0;
    document.querySelectorAll('[data-zoomreset]').forEach(b => { b.textContent = '100%'; });
    document.querySelectorAll('[data-zoom]').forEach(z => { z.style.transform = mzTransform(); });
    return 'zoom';
  }
  if (e.target.closest('[data-mapback]') || e.target.closest('[data-goback]')) {
    MS.view = 'world'; MS.sel = null; MS.zoom = 1; MS.px = 0; MS.py = 0; return 'repaint';
  }
  /* 出发：写入输入框 */
  const go = e.target.closest('[data-go]');
  if (go) return 'go:' + go.dataset.go;
  const gr = e.target.closest('[data-goregion]');
  if (gr) { MS.view = gr.dataset.goregion; MS.sel = null; MS.zoom = 1; MS.px = 0; MS.py = 0; return 'repaint'; }
  const mk = e.target.closest('[data-mark]');
  if (mk) { MS.sel = MS.sel === mk.dataset.mark ? null : mk.dataset.mark; return 'repaint'; }
  /* 点舞台空白收气泡 */
  if (e.target.closest('[data-stage]') && !e.target.closest('.mk,.mpop') && MS.sel) {
    MS.sel = null; return 'repaint';
  }
  return null;
}
function mapZoomBy(f) {
  /* 缩放不受「锁定」影响：锁定只锁拖动与滚轮，按钮随时可用 */
  MS.zoom = Math.max(1, Math.min(4, MS.zoom * f));
  if (MS.zoom < 1.02) MS.zoom = 1;
  if (MS.zoom === 1) { MS.px = 0; MS.py = 0; }
  document.querySelectorAll('[data-zoom]').forEach(z => { z.style.transform = mzTransform(); });
  document.querySelectorAll('[data-zoomreset]').forEach(b => { b.textContent = Math.round(MS.zoom * 100) + '%'; });
  layoutPops();
}

/* 滚轮 / 双指 / 拖拽 */
function mapBindStage() {
  document.querySelectorAll('[data-stage]').forEach(bindOneStage);
  fitMapStage();
  layoutMarks();
  layoutPops();
}

function bindOneStage(stage) {
  if (!stage || stage.dataset.bound) return;
  stage.dataset.bound = '1';
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, pinch = 0, pz = 1;

  stage.addEventListener('wheel', e => {
    if (MS.lock) return;
    /* 100% 且向下滚 = 让页面继续滚，避免地图把正文卡住 */
    if (MS.zoom === 1 && e.deltaY > 0) return;
    e.preventDefault();
    mapZoomBy(e.deltaY < 0 ? 1.12 : 0.89);
  }, { passive: false });

  stage.addEventListener('pointerdown', e => {
    if (e.isPrimary === false) return;                 /* 第二根手指交给 pinch */
    if (MS.lock || MS.zoom <= 1 || e.target.closest('.mk,.mpop,.mtools')) return;
    dragging = true; sx = e.clientX; sy = e.clientY; ox = MS.px; oy = MS.py;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!dragging) return;
    MS.px = ox + (e.clientX - sx) / MS.zoom;
    MS.py = oy + (e.clientY - sy) / MS.zoom;
    document.querySelectorAll('[data-zoom]').forEach(z => { z.style.transform = mzTransform(); });
  });
  const end = () => { dragging = false; };
  stage.addEventListener('pointerup', e => { end(); });
  stage.addEventListener('pointercancel', end);

  stage.addEventListener('touchstart', e => {
    if (MS.lock) return;
    if (e.touches.length === 2) {
      e.preventDefault();                              /* 别让浏览器把双指当页面缩放 */
      pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pz = MS.zoom;
    }
  }, { passive: false });
  stage.addEventListener('touchmove', e => {
    if (MS.lock || e.touches.length !== 2 || !pinch) return;
    e.preventDefault();
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    MS.zoom = Math.max(1, Math.min(4, pz * d / pinch));
    if (MS.zoom === 1) { MS.px = 0; MS.py = 0; }
    document.querySelectorAll('[data-zoom]').forEach(z => { z.style.transform = mzTransform(); });
    document.querySelectorAll('[data-zoomreset]').forEach(b => { b.textContent = Math.round(MS.zoom * 100) + '%'; });
  }, { passive: false });
  stage.addEventListener('touchend', () => { pinch = 0; });
}
