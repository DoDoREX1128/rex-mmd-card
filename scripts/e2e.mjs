#!/usr/bin/env node
/* e2e.mjs · 离线交互回归。生成 e2e 页 → 找 Chrome 无头跑 → 断言结果
 * 用法: node e2e.mjs [--src work/src] [--out work/out] [--keep]      （先跑 build.mjs + preview.mjs）
 * 退出码: 0 全通过 / 1 有失败 / 2 找不到浏览器（页面已生成，可手动打开）
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const out = path.resolve(arg('out', 'work/out'));
const src = path.resolve(arg('src', 'work/src'));

/* ---------- 0. 先把冒烟页生成出来（缺了这一步 iframe 会 404 成跨域错页） ---------- */
{
  const self = path.dirname(fileURLToPath(import.meta.url));
  const r = spawnSync(process.execPath, [path.join(self, 'preview.mjs'), '--src', src, '--out', out], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('生成冒烟页失败：\n' + (r.stderr || r.stdout || ''));
    process.exit(1);
  }
  console.log('冒烟页已生成');
}

/* ---------- 1. 生成测试页 ---------- */
const HARNESS = String.raw`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>e2e running</title>
<style>html,body{margin:0;background:#111}iframe{width:390px;height:844px;border:0;display:block}
pre{color:#9f9;font:11px/1.5 monospace;white-space:pre-wrap;padding:8px;margin:0}</style>
</head><body>
<iframe id="f" src="demo-preview.html?nomock=1&reset=1"></iframe>
<pre id="o">running…</pre>
<script>
var f = document.getElementById('f'), L = [], fails = 0;
function log(s) { L.push(s); document.getElementById('o').textContent = L.join('\n'); }
function ok(name, cond, extra) {
  if (!cond) fails++;
  log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : ''));
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function click(el) { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }

f.addEventListener('load', function () {
  var w = f.contentWindow, d = f.contentDocument;
  var R = function () { return w.__REX__; };
  var q = function (s) { return d.querySelector(s); };
  var qa = function (s) { return [].slice.call(d.querySelectorAll(s)); };

  (async function () {
    await sleep(1000);
    var REX = R();
    ok('内核已挂载', !!REX, REX ? 'v' + REX.version : 'null');
    if (!REX) { log('\n== 内核没起来，后面全部无意义 =='); document.title = 'E2E fails=' + fails; return; }

    /* ---------- 封面 ---------- */
    var cover = q('[data-act="start"]');
    ok('封面已渲染', !!q('.rex-title'), (q('.rex-title') || {}).textContent || '');
    ok('封面有开始按钮', !!cover);

    if (cover) click(cover);
    await sleep(700);

    /* ---------- 捏人 ---------- */
    var fs = qa('.rex-field');
    ok('捏人页字段 >= 5', fs.length >= 5, fs.length + ' 项');
    var picks = qa('.rex-pick');
    ok('捏人有选项按钮', picks.length >= 4, picks.length + ' 个');
    var enter = q('[data-act="enter"]');
    ok('初始"入局"为禁用', !!enter && enter.disabled === true);

    var dims = {};
    picks.forEach(function (b) { dims[b.getAttribute('data-f')] = 1; });
    Object.keys(dims).forEach(function (k) {
      var b = d.querySelector('.rex-pick[data-f="' + k + '"]');
      if (b) click(b);
    });
    await sleep(150);
    qa('.rex-input[data-f]').forEach(function (el) {
      if (el.tagName === 'INPUT' && !el.value) {
        el.value = '沈砚';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(180);
    ok('选完后"入局"可点', !!enter && enter.disabled === false);

    if (enter && !enter.disabled) click(enter);
    await sleep(900);

    /* ---------- 主界面：同层四区 ---------- */
    var root = q('[data-chat="root"]');
    ok('已进入主界面', !!root && root.getAttribute('data-rex-mode') === 'narrow',
      root ? 'mode=' + root.getAttribute('data-rex-mode') : 'no root');
    var inp = q('[data-chat="input"]') || q('#fake-input');
    var iv = inp ? inp.value : '';
    ok('入局文本写进输入框（不代发）', /【角色创建】/.test(iv), (iv.split('\n')[0] || '(空)'));
    ok('入局文本含姓名', /沈砚/.test(iv));

    /* ---------- 手机端：底部导航 + 抽屉 ---------- */
    var mnav = q('.rex-mnav');
    var navs = qa('.rex-mnav [data-nav]');
    ok('底部导航存在', !!mnav);
    ok('底部导航 6 项', navs.length === 6, navs.map(function (b) { return b.getAttribute('data-nav'); }).join('|'));
    ok('无横向溢出（390）', d.documentElement.scrollWidth <= w.innerWidth + 1,
      d.documentElement.scrollWidth + ' / ' + w.innerWidth);

    var people = q('.rex-mnav [data-nav="people"]');
    if (people) click(people);
    await sleep(500);
    var sheet = q('.rex-sheet');
    ok('抽屉已打开', !!sheet && sheet.getAttribute('data-open') === '1');
    var world = q('.rex-world');
    if (sheet && world) {
      var sr = sheet.getBoundingClientRect(), wr = world.getBoundingClientRect();
      ok('抽屉上沿贴住世界条', Math.abs(sr.top - wr.bottom) <= 6,
        'sheet.top=' + Math.round(sr.top) + ' world.bottom=' + Math.round(wr.bottom));
    } else ok('抽屉上沿贴住世界条', false, '缺 sheet 或 world');

    var rows = qa('.rex-sheet .rex-row');
    ok('人物列表有行', rows.length >= 1, rows.length + ' 行');
    /* 点 NPC 而不是玩家自己：玩家的 priv/thought 来自运行时数据，内容层看不到 */
    var npcRow = q('.rex-sheet [data-key="npc1"]') || rows[rows.length - 1];
    if (npcRow) click(npcRow);
    await sleep(500);
    ok('点行进入详情', !!q('.rex-dos'), q('.rex-dosName h2') ? q('.rex-dosName h2').textContent : '');
    ok('表层默认是人形图', !!q('.rex-figImg'), q('.rex-figWrap') ? 'ok' : 'no wrap');
    ok('有"心里"块', !!q('.rex-thought'), q('.rex-thought') ? q('.rex-thought').textContent.slice(0, 14) : '');
    ok('键值行为定宽网格', !!q('.rex-rowline') &&
      getComputedStyle(q('.rex-rowline')).display === 'grid',
      q('.rex-rowline') ? getComputedStyle(q('.rex-rowline')).gridTemplateColumns : '');

    /* ---------- 里层：热区 ---------- */
    var lr = q('[data-layer="real"]');
    if (lr) click(lr);
    await sleep(400);
    ok('切到里层', !!q('.rex-dosFig[data-look="real"]'));
    var regs = qa('.rex-regg');
    ok('里层有部位热区', regs.length >= 2, regs.map(function (g) { return g.getAttribute('data-hot'); }).join('|'));
    if (regs.length) {
      click(regs[0]);
      await sleep(250);
      var bub = q('.rex-bub');
      ok('点热区弹气泡', !!bub && bub.getAttribute('data-bub') !== '0', bub ? bub.getAttribute('data-bub') : '');
    } else ok('点热区弹气泡', false, '没有热区');

    /* ---------- 坏状态兜底 ---------- */
    var kept = (R().data.status || {}).hp;
    R().applyStatus('<rex-status>{"loc":"别处"}</rex-status>', true);
    await sleep(160);
    ok('残缺状态不清零旧值', (R().data.status || {}).hp === kept, 'hp ' + kept + ' -> ' + (R().data.status || {}).hp);
    ok('残缺状态仍能换地点', (R().data.status || {}).loc === '别处', (R().data.status || {}).loc);

    /* ---------- 切宽屏：并排四区 ---------- */
    f.style.width = '1280px';
    await sleep(400);
    R().refresh();          /* 无头环境不一定派 resize，显式刷一次（refresh 自带模式校正） */
    await sleep(400);
    var mNow = (q('[data-chat="root"]') || {}).getAttribute ? q('[data-chat="root"]').getAttribute('data-rex-mode') : '-';
    ok('宽屏切到 wide', mNow === 'wide', 'innerW=' + w.innerWidth + ' mode=' + mNow + ' isWide=' + (R().isWide ? R().isWide() : '?'));
    ok('宽屏有左右 dock', !!q('.rex-dockL') && !!q('.rex-dockR'));
    var dl = q('.rex-dockL'), dr = q('.rex-dockR');
    if (dl && dr) {
      var a1 = dl.getBoundingClientRect(), a2 = dr.getBoundingClientRect();
      ok('左 dock 贴左边', a1.left <= 1, 'left=' + Math.round(a1.left));
      ok('右 dock 贴右边', Math.abs(a2.right - w.innerWidth) <= 1, 'right=' + Math.round(a2.right) + '/' + w.innerWidth);
      ok('左右等宽', Math.abs(a1.width - a2.width) <= 2, Math.round(a1.width) + ' vs ' + Math.round(a2.width));
    }
    ok('宽屏无横向溢出', d.documentElement.scrollWidth <= w.innerWidth + 1,
      d.documentElement.scrollWidth + ' / ' + w.innerWidth);

    ok('无运行时错误', document.title.indexOf('ERR') !== 0, document.title);

    log('');
    log(fails === 0 ? '== 全部通过 ==' : '== 失败 ' + fails + ' 项 ==');
    document.title = 'E2E fails=' + fails;
  })().catch(function (e) { log('EXCEPTION ' + e.message + '\n' + e.stack); document.title = 'E2E crash'; });
});
</script>
</body></html>`;

fs.mkdirSync(out, { recursive: true });
const pagePath = path.join(out, 'e2e.html');
fs.writeFileSync(pagePath, HARNESS, 'utf8');
console.log('测试页: ' + pagePath);

/* ---------- 2. 找浏览器 ---------- */
const CAND = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].filter(Boolean);
const chrome = CAND.find((p) => { try { return fs.existsSync(p); } catch { return false; } });

if (!chrome) {
  console.log('\n没找到 Chrome（设 CHROME_PATH 环境变量可指定）。');
  console.log('手动验证：浏览器打开上面这个测试页，看页面上的 PASS / FAIL 列表。');
  process.exit(2);
}

/* ---------- 3. 跑 ---------- */
console.log('浏览器: ' + chrome);
const res = spawnSync(chrome, [
  '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
  '--window-size=460,2600', '--virtual-time-budget=25000',
  '--dump-dom', 'file:///' + pagePath.replace(/\\/g, '/')
], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120000 });

const dom = res.stdout || '';
const m = dom.match(/<pre id="o">([\s\S]*?)<\/pre>/);
if (!m) {
  console.error('拿不到测试输出。可能是页面没跑起来，手动打开测试页看。');
  process.exit(1);
}
const text = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
console.log('\n' + text);

const fails = (text.match(/^FAIL /gm) || []).length;
const passes = (text.match(/^PASS /gm) || []).length;
console.log(`\n合计 ${passes + fails} 项：通过 ${passes} · 失败 ${fails}`);
process.exit(fails === 0 ? 0 : 1);
