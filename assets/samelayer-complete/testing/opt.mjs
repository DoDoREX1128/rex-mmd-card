import { launch, sleep } from './browser.mjs';

/* 回复选项（气泡里的 .msg-opt）：点一下是「追加」进输入框，不覆盖已有草稿 */
let pass = 0, fail = 0; const bad = [];
const ok = (n, c, e = '') => { if (c) { pass++; console.log('PASS ' + n.padEnd(34) + e); } else { fail++; bad.push(n + ' ' + e); console.log('FAIL ' + n.padEnd(34) + e); } };

const OPTS = ['不出声，等她先开口', '低声问她：你也是双生？', '伸手按在她的腹部上'];
const STATUS = '<status>' + JSON.stringify({ turn: 2, y: '2622-02-01', t: '亥时三刻', opt: OPTS, sum: '石门外有人在等。' }) + '</status>';
const NAT = {
  connected: true, mode: 'mock',
  messages: [
    { id: 'm1', role: 'assistant', text: '黑暗。温热的液体包裹着你。' },
    { id: 'm2', role: 'user', text: '（以意念回应）……我在。' },
    { id: 'm3', role: 'assistant', text: '她的手落在腹上。\n\n「听见了？」她说。\n\n' + STATUS }
  ],
  capabilities: { copyMessage: { available: true } },
  actions: {
    messages: { revision: 'r-msg', items: [] },
    composer: { revision: 'r-cmp', text: '' },
    navigation: { revision: 'r-nav', favorite: false }
  }
};

const B = await launch({ port: 9683, width: 1440, height: 900 });
try {
  await B.goto('#devboot');
  await sleep(600);
  await B.ev(`(()=>{
    window.__CALLS__ = [];
    __slDev.stub((method, params) => {
      if (method === 'snapshot.now') return { native: window.__NAT__ };
      if (params && params.action === 'setInputText') { window.__CALLS__.push(['setInputText', params.payload.text]); return { ok: true, data: { phase: 'input-observed' } }; }
      window.__CALLS__.push([params && params.action, params && params.payload || {}]);
      return { ok: true, data: { phase: 'ok' } };
    });
    window.__NAT__ = ${JSON.stringify(NAT)};
    __slDev.native(window.__NAT__);
    return true;
  })()`);
  await sleep(500);

  const list = await B.ev(`(()=>{
    const bs = [...document.querySelectorAll('.msg-opt')];
    return JSON.stringify({ n: bs.length, labels: bs.map(b => b.textContent),
      visible: bs.length ? bs[0].getClientRects().length > 0 : false });
  })()`);
  const L = JSON.parse(list);
  ok('三条回复选项渲染', L.n === 3 && L.labels.join('|') === OPTS.join('|'), L.labels.join(' / '));
  ok('选项可见', L.visible);

  /* ① 空输入框点一条 → 整条写进去 */
  await B.ev(`(()=>{ const t = document.getElementById('text'); t.value = ''; t.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  await B.ev(`[...document.querySelectorAll('.msg-opt')][0].click()`);
  await sleep(250);
  const one = JSON.parse(await B.ev(`(()=>{
    const t = document.getElementById('text');
    return JSON.stringify({ v: t.value, focus: document.activeElement === t,
      caret: t.selectionStart, len: t.value.length, notice: document.getElementById('notice').textContent });
  })()`));
  ok('空框：整条写入', one.v === OPTS[0], JSON.stringify(one.v));
  ok('空框：光标在末尾并聚焦', one.focus && one.caret === one.len, 'caret ' + one.caret + '/' + one.len);
  ok('空框：提示为「已添加」', /已添加/.test(one.notice), one.notice);

  /* ② 已有草稿点第二条 → 换行接在后面，原来的字一个不少 */
  await B.ev(`(()=>{ const t = document.getElementById('text'); t.value = '我要先看看她。'; t.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  await B.ev(`[...document.querySelectorAll('.msg-opt')][1].click()`);
  await sleep(250);
  const two = JSON.parse(await B.ev(`(()=>{
    const t = document.getElementById('text');
    return JSON.stringify({ v: t.value });
  })()`));
  ok('有草稿：追加不替换', two.v === '我要先看看她。\n\n' + OPTS[1], JSON.stringify(two.v));

  /* ③ 再点同一块 → 不重复堆，提示已经在了 */
  await B.ev(`[...document.querySelectorAll('.msg-opt')][1].click()`);
  await sleep(250);
  const three = JSON.parse(await B.ev(`(()=>{
    const t = document.getElementById('text');
    return JSON.stringify({ v: t.value, notice: document.getElementById('notice').textContent });
  })()`));
  ok('重复点同一条：不叠加', three.v === two.v, JSON.stringify(three.v));
  ok('重复点同一条：给出去重提示', /已经在输入框/.test(three.notice), three.notice);

  /* ④ 第三条继续追加 → 三段按空行分开 */
  await B.ev(`[...document.querySelectorAll('.msg-opt')][2].click()`);
  await sleep(250);
  const four = JSON.parse(await B.ev(`JSON.stringify({ v: document.getElementById('text').value })`));
  const want = '我要先看看她。\n\n' + OPTS[1] + '\n\n' + OPTS[2];
  ok('连点三条：三段拼接', four.v === want, JSON.stringify(four.v));
  await B.shot('opt-append.png');

  /* ⑤ 已经镜像到原生输入框 */
  const calls = JSON.parse(await B.ev(`JSON.stringify(window.__CALLS__.filter(c => c[0] === 'setInputText').map(c => c[1]))`));
  ok('每次都推给原生输入框', calls.length >= 3 && calls[calls.length - 1] === want, calls.length + ' 次');

  /* ⑥ 空文本不写：状态块里 opt 为空的旧消息不该生按钮 */
  await B.ev(`(()=>{ window.__NAT__.messages[2].text = '只有正文，没有选项。'; __slDev.native(window.__NAT__); return true; })()`);
  await sleep(300);
  const none = JSON.parse(await B.ev(`JSON.stringify({ n: document.querySelectorAll('.msg-opt').length })`));
  ok('无 opt：不摆按钮', none.n === 0, 'n=' + none.n);

  console.log('exceptions:', B.errs.length ? B.errs : 'none');
} finally {
  B.close();
}

/* ── 手机档：同一条逻辑在 390×844 下也要能写进去，且不撑出横向滚动 ── */
const M = await launch({ port: 9684, width: 390, height: 844 });
try {
  await M.goto('#devboot');
  await sleep(700);
  await M.ev(`(()=>{
    __slDev.stub(() => ({ ok: true, data: { phase: 'ok' } }));
    window.__NAT__ = ${JSON.stringify(NAT)};
    __slDev.native(window.__NAT__);
    return true;
  })()`);
  await sleep(500);
  await M.ev(`(()=>{ const t = document.getElementById('text'); t.value = '先按着她。'; t.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  await M.ev(`[...document.querySelectorAll('.msg-opt')][2].click()`);
  await sleep(350);
  const mob = JSON.parse(await M.ev(`(()=>{
    const t = document.getElementById('text');
    return JSON.stringify({ n: document.querySelectorAll('.msg-opt').length, v: t.value,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      inView: t.getBoundingClientRect().bottom <= window.innerHeight + 1 });
  })()`));
  ok('手机：仍有三条选项', mob.n === 3, 'n=' + mob.n);
  ok('手机：追加进输入框', mob.v === '先按着她。\n\n' + OPTS[2], JSON.stringify(mob.v));
  ok('手机：无横向溢出', mob.overflow <= 0, 'overflow ' + mob.overflow);
  ok('手机：输入框没被挤出屏幕', mob.inView);
  await M.shot('opt-append-mob.png');
  console.log('exceptions:', M.errs.length ? M.errs : 'none');
} finally {
  M.close();
}
console.log('\n' + pass + '/' + (pass + fail) + (fail ? '  FAIL: ' + bad.join(' · ') : ''));
process.exit(fail ? 1 : 0);
