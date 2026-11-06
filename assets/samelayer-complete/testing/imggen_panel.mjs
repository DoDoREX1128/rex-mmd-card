import { launch, sleep } from './browser.mjs';

/* 2026-11-05 · HUD「选择生图段落」面板验收（PC + 手机）
   覆盖：面板结构 / 段落选择回写 / 合并模式 / 生成确认 / 滚动保位 / 窄屏不溢出
   走的是真实点击 → run → 宿主回写 → refreshView 这条链，不直接改面板数据。 */
let pass = 0, fail = 0; const bad = [];
const ok = (n, c, e = '') => {
  if (c) { pass++; console.log('PASS ' + n.padEnd(32) + e); }
  else { fail++; bad.push(n + ' ' + e); console.log('FAIL ' + n.padEnd(32) + e); }
};

const SETUP = `(() => {
  const N = 12;
  const segs = () => Array.from({ length: N }, (_, i) => ({
    id: 's' + i, index: i,
    label: i === 3 ? '只有 阴茎 / 阴囊（这一段原生不让选）' : ('第 ' + (i + 1) + ' 段：' + '这是一段来自回复正文的提示词候选，用来测试长列表的滚动与选中态。'),
    selected: false, disabled: i === 3
  }));
  const modes = (merge) => [
    { id: 'mo0', index: 0, label: '单段生图', selected: !merge, disabled: false },
    { id: 'mo1', index: 1, label: '合并生图', selected: !!merge, disabled: false }
  ];
  const recount = (ig) => {
    const on = ig.segments.filter(s => s.selected).length;
    ig.selectedCount = on;
    ig.imageCount = ig.merge && on ? 1 : on;
    ig.canGenerate = on > 0 && !ig.submitting;
  };
  const state = (over = {}) => ({
    connected: true,
    messages: [
      { id: 'm0', role: 'assistant', text: '标题', capabilities: { copy: true, imageGen: false } },
      { id: 'm1', role: 'assistant', text: '开场', capabilities: { copy: true, imageGen: false } },
      { id: 'm2', role: 'assistant', text: '正文', capabilities: { copy: true, edit: true, delete: true, regenerate: true, rollback: true, startNewStory: true, imageGen: true } }
    ],
    capabilities: {
      openImageGen: { available: true, reason: '' }, copyMessage: { available: true, reason: '' },
      selectImageSegment: { available: true, reason: '' }, setImageGenMode: { available: true, reason: '' },
      submitImageGen: { available: true, reason: '' }, closeImageGen: { available: true, reason: '' }
    },
    actions: {
      messages: { revision: 'rev-m', items: [] }, composer: { text: '', revision: 'c1' },
      imageGen: Object.assign({ open: false, title: '选择生图段落', merge: false, banner: '', modes: modes(false),
        segments: [], selectedCount: 0, imageCount: 0, price: 55, cost: '⚡55',
        canGenerate: false, submitting: false, revision: 'ig1' }, over)
    }
  });
  window.__state = state();
  window.__calls = [];
  window.__slDev.native(window.__state);
  window.__slDev.stub((method, params) => {
    const a = params && params.action, payload = (params && params.payload) || {};
    window.__calls.push([method, a, payload]);
    const st = window.__state, ig = st.actions.imageGen;
    if (method === 'snapshot.now') return { native: st };
    if (a === 'openImageGen') { ig.open = true; ig.modes = modes(false); ig.segments = segs(); recount(ig); }
    if (a === 'setImageGenMode') {
      ig.merge = payload.modeId === 'mo1';
      ig.banner = ig.merge ? '🔗 合并模式：选中段落合并为一张图的提示词' : '';
      ig.modes = modes(ig.merge); recount(ig);
    }
    if (a === 'selectImageSegment') {
      const seg = ig.segments.find(s => s.id === payload.segmentId);
      if (seg && !seg.disabled) seg.selected = !seg.selected;
      recount(ig);
    }
    if (a === 'submitImageGen') {
      ig.submitting = true; recount(ig);
      /* 模拟平台：任务建好后自己关弹层 */
      setTimeout(() => { ig.open = false; window.__slDev.native(st); }, 260);
    }
    if (a === 'closeImageGen') { ig.open = false; }
    window.__slDev.native(st);
    return { ok: true, accepted: true, completed: 'unknown', persisted: 'unknown', data: {} };
  });
  return true;
})()`;

const panelOpen = `document.getElementById('features-dialog').hasAttribute('open')`;
const clickSeg = i => `document.querySelectorAll('.sl-imgseg__row')[${i}].click()`;

/* ── PC ─────────────────────────────────────────────── */
const B = await launch({ port: 9643, width: 1440, height: 900 });
await B.goto('#devboot');
await sleep(400);
await B.ev(`document.getElementById('messages').replaceChildren()`);
await B.ev(SETUP);

await B.ev(`(() => { const box = [...document.querySelectorAll('#messages .message')].find(m => [...m.querySelectorAll('.sl-message-actions button')].some(b => b.textContent === '生图'));
  [...box.querySelectorAll('.sl-message-actions button')].find(b => b.textContent === '生图').click(); return true; })()`);
await sleep(700);

ok('面板打开', await B.ev(panelOpen));
ok('点了原生按钮', (await B.ev(`window.__calls.filter(c => c[1] === 'openImageGen').length`)) === 1);
ok('标题是生图', (await B.ev(`document.getElementById('features-title').textContent`)) === '生图');
ok('段落条数', (await B.ev(`document.querySelectorAll('.sl-imgseg__row').length`)) === 12, String(await B.ev(`document.querySelectorAll('.sl-imgseg__row').length`)));
ok('初始生成禁用', await B.ev(`document.querySelector('.sl-imgseg__go').disabled === true`));
ok('初始计数', /已选 0 段 → 生成 0 张/.test(await B.ev(`document.querySelector('.sl-imgseg__info').textContent`)));
ok('禁用段按死', await B.ev(`document.querySelectorAll('.sl-imgseg__row')[3].disabled === true`));

/* 点第 2 段 */
await B.ev(clickSeg(1));
await sleep(500);
ok('选择回写原生', (await B.ev(`window.__calls.filter(c => c[1] === 'selectImageSegment').map(c => c[2].segmentId)`)).join() === 's1');
ok('选中行高亮', await B.ev(`document.querySelectorAll('.sl-imgseg__row')[1].classList.contains('is-on')`));
ok('生成可点', await B.ev(`document.querySelector('.sl-imgseg__go').disabled === false`));
ok('计数更新', /已选 1 段 → 生成 1 张/.test(await B.ev(`document.querySelector('.sl-imgseg__info').textContent`)));

/* 再点第 5 段 → 2 段 */
await B.ev(clickSeg(4));
await sleep(500);
ok('多选累加', /已选 2 段 → 生成 2 张/.test(await B.ev(`document.querySelector('.sl-imgseg__info').textContent`)));

/* 合并模式 */
await B.ev(`[...document.querySelectorAll('.sl-imgseg__mode')][1].click()`);
await sleep(500);
ok('合并提示', /合并模式/.test(await B.ev(`document.querySelector('.sl-imgseg__banner')?.textContent || ''`)));
ok('合并只出 1 张', /已选 2 段 → 生成 1 张/.test(await B.ev(`document.querySelector('.sl-imgseg__info').textContent`)));

/* 滚动保位：滚到中间，点第 10 段 */
await B.ev(`document.querySelector('.sl-feature-body').scrollTop = 220`);
const before = await B.ev(`document.querySelector('.sl-feature-body').scrollTop`);
await B.ev(clickSeg(9));
await sleep(500);
const after = await B.ev(`document.querySelector('.sl-feature-body').scrollTop`);
ok('重绘保住滚动', before > 0 && Math.abs(after - before) < 2, `${before} -> ${after}`);

/* 生成 → 确认 → 提交 */
await B.ev(`document.querySelector('.sl-imgseg__go').click()`);
await sleep(300);
ok('生成前确认', await B.ev(`document.getElementById('features-confirm').hasAttribute('open')`));
await B.ev(`document.getElementById('features-confirm-yes').click()`);
await sleep(1500);
ok('提交生图', (await B.ev(`window.__calls.filter(c => c[1] === 'submitImageGen').length`)) === 1);
ok('提交后收面板', !(await B.ev(panelOpen)));
if (B.errs.length) bad.push('PC JS: ' + B.errs[0]);

/* ── 手机 390×844 ───────────────────────────────────── */
const M = await launch({ port: 9644, width: 390, height: 844, mobile: true });
await M.goto('#devboot');
await sleep(400);
await M.ev(`document.getElementById('messages').replaceChildren()`);
await M.ev(SETUP);
await M.ev(`(() => { const box = [...document.querySelectorAll('#messages .message')].find(m => [...m.querySelectorAll('.sl-message-actions button')].some(b => b.textContent === '生图'));
  [...box.querySelectorAll('.sl-message-actions button')].find(b => b.textContent === '生图').click(); return true; })()`);
await sleep(700);
ok('手机面板打开', await M.ev(panelOpen));
ok('手机无横向溢出', await M.ev(`document.documentElement.scrollWidth <= innerWidth + 1`), `scroll=${await M.ev(`document.documentElement.scrollWidth`)} vw=390`);
ok('手机段落触控高度', (await M.ev(`Math.round(document.querySelector('.sl-imgseg__row').getBoundingClientRect().height)`)) >= 44, String(await M.ev(`Math.round(document.querySelector('.sl-imgseg__row').getBoundingClientRect().height)`)));
ok('手机生成键在视口内', await M.ev(`(() => { const b = document.querySelector('.sl-imgseg__go'); const r = b.getBoundingClientRect(); return r.width > 0 && r.bottom <= innerHeight + 1 && r.top >= 0; })()`));
await M.ev(clickSeg(0));
await sleep(500);
ok('手机选择生效', /已选 1 段/.test(await M.ev(`document.querySelector('.sl-imgseg__info').textContent`)));
if (M.errs.length) bad.push('MOB JS: ' + M.errs[0]);

console.log(`\n${pass} pass / ${fail} fail`);
if (bad.length) console.log('---\n' + bad.join('\n'));
B.close(); M.close();
