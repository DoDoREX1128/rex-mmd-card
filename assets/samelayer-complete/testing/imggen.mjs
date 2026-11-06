import { launch, sleep } from './browser.mjs';

/* 2026-11-05 · HUD「生图」入口的本地验收
   目标：
   1) 原生快照里该条 AI 带 imageGen 能力时，消息操作条出现「生图」；
   2) 点击后宿主收到 native.invoke{action:'openImageGen', payload.messageId}；
   3) 随后调 ui.native 收 HUD 让位（弹层在原生页上操作）。
   只看本地界面与协议，不代表真站已通。 */

let pass = 0, fail = 0; const bad = [];
const ok = (n, c, e = '') => {
  if (c) { pass++; console.log('PASS ' + n.padEnd(34) + e); }
  else { fail++; bad.push(n + ' ' + e); console.log('FAIL ' + n.padEnd(34) + e); }
};

const B = await launch({ port: 9641, width: 1440, height: 900 });
const go = B.goto;

await go('#devboot');
await sleep(400);

/* devboot 会塞 10 条排版样本；清掉，否则量到的是样本不是快照 */
await B.ev(`document.getElementById('messages').replaceChildren()`);

/* 记录宿主收到的请求 */
await B.ev(`(() => { window.__calls = []; window.__slDev.stub((method, params) => {
  window.__calls.push([method, params]);
  if (method === 'native.invoke' && params.action === 'openImageGen') {
    return { ok: true, action: 'openImageGen', accepted: true, completed: 'unknown', persisted: 'unknown', data: { phase: 'opened', segments: 27 } };
  }
  return { accepted: true };
}); return true; })()`);

/* 假快照：一条 AI 消息带 imageGen，其余能力照常 */
await B.ev(`(() => { window.__slDev.native({
  connected: true,
  messages: [
    { id: 'm0', role: 'assistant', text: '标题', capabilities: { copy: true, edit: false, delete: true, regenerate: false, rollback: true, startNewStory: true, imageGen: false } },
    { id: 'm1', role: 'assistant', text: '开场白。', capabilities: { copy: true, imageGen: false } },
    { id: 'm2', role: 'assistant', text: '这一段是正文。', capabilities: { copy: true, edit: true, delete: true, regenerate: true, rollback: true, startNewStory: true, imageGen: true } }
  ],
  capabilities: { openImageGen: { available: true, reason: '' }, copyMessage: { available: true, reason: '' } },
  actions: { messages: { revision: 'rev-1', items: [] }, composer: { text: '', revision: 'c-1' } }
}); return true; })()`);
await sleep(400);

const labels = await B.ev(`[...document.querySelectorAll('#messages .sl-message-actions button')].map(b => b.textContent)`);
ok('生图按钮出现', labels.includes('生图'), JSON.stringify(labels));
ok('只出现在带能力的消息', (await B.ev(`[...document.querySelectorAll('#messages .message')].filter(m => [...m.querySelectorAll('.sl-message-actions button')].some(b => b.textContent === '生图')).length`)) === 1);

/* 点它 */
await B.ev(`(() => { const box = [...document.querySelectorAll('#messages .message')].find(m => [...m.querySelectorAll('.sl-message-actions button')].some(b => b.textContent === '生图'));
  [...box.querySelectorAll('.sl-message-actions button')].find(b => b.textContent === '生图').click(); return true; })()`);
await sleep(600);

const calls = await B.ev(`window.__calls.map(c => [c[0], c[1] && c[1].action, c[1] && c[1].payload && c[1].payload.messageId])`);
const inv = calls.find(c => c[0] === 'native.invoke' && c[1] === 'openImageGen');
ok('发出 openImageGen', !!inv, JSON.stringify(calls));
ok('带上 messageId', inv && inv[2] === 'm2', inv ? String(inv[2]) : '');
ok('不再收 HUD 让位', !calls.some(c => c[0] === 'ui.native'), JSON.stringify(calls));

/* 能力不可用时按钮不出 */
await go('#devboot');
await sleep(300);
await B.ev(`(() => { window.__calls = []; window.__slDev.stub(() => ({ accepted: true })); window.__slDev.native({
  connected: true,
  messages: [{ id: 'x1', role: 'assistant', text: '无生图', capabilities: { copy: true, imageGen: false } }],
  capabilities: { openImageGen: { available: false, reason: '这条消息没有生图入口' } },
  actions: { messages: { revision: 'r2', items: [] }, composer: { text: '', revision: 'c2' } }
}); return true; })()`);
await sleep(400);
ok('无能力时不摆按钮', !(await B.ev(`[...document.querySelectorAll('#messages .sl-message-actions button')].some(b => b.textContent === '生图')`)));

if (B.errs.length) bad.push('JS: ' + B.errs[0]);
console.log(`\n${pass} pass / ${fail} fail`);
if (bad.length) console.log('---\n' + bad.join('\n'));
B.close();
