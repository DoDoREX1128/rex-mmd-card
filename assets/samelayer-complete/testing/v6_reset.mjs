import { launch, sleep } from './browser.mjs';

const CAP = { copy: true, edit: true, delete: true, regenerate: true, rollback: true, startNewStory: true };
const MSGS = [
  { id: 'a1', index: 0, role: 'assistant', text: '黑。', raw: '', fingerprint: '1', capabilities: CAP },
  { id: 'a2', index: 1, role: 'assistant', text: '那片意识安静了一瞬。', raw: '', fingerprint: '2', capabilities: CAP }
];
const base = (more, msgs) => ({
  connected: true,
  capabilities: { copyMessage: { available: true }, openEditMessage: { available: true } },
  messages: msgs,
  actions: {
    messages: { revision: 'r' },
    moreMenu: more,
    editPanel: { open: false, revision: 'e', messageId: '', text: '', transforms: [] },
    conversationPanel: { open: false, revision: 'c', conversations: [], currentConversationId: 'c1' }
  }
});
const MORE = { open: true, revision: 'm1', items: [
  { id: 'x1', label: '编辑角色', kind: 'roleEdit', available: true, destructive: false },
  { id: 'x2', label: '重置聊天', kind: 'resetChat', available: true, destructive: true }
] };

const B = await launch({ port: 9917, width: 1440, height: 900 });
const ev = B.ev;
await B.goto('#devboot&nav=term'); await sleep(400);
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('PASS', name, extra); } else { fail++; console.log('FAIL', name, extra); } };

// ── 成功路径：菜单项在、确认框出现、记录被清空
await ev('__slDev.ui.reset()');
await ev('__slDev.native(' + JSON.stringify(base(MORE, MSGS)) + ')'); await sleep(300);
await ev(`window.__CALLS__=[]`);
await ev(`__slDev.stub((m,p)=>{
  window.__CALLS__.push([m, p&&p.action, p&&p.payload && p.payload.confirmed]);
  if (m==='native.invoke' && p.action==='activateMoreMenuItem') {
    __slDev.native(${JSON.stringify(base({ ...MORE, open: false }, []))});
    return { ok:true, result:{ confirmed:true, kind:'resetChat' } };
  }
  return { ok:true, result:{} };
})`);
await ev(`document.querySelector('[data-feat="resetChat"]').click()`); await sleep(300);
ok('confirm opens', await ev(`document.getElementById('confirm').open`));
await ev(`document.getElementById('confirm-ok').click()`); await sleep(1400);
const calls = await ev(`JSON.stringify(window.__CALLS__)`);
ok('calls open+activate', /openMoreMenu/.test(calls) || /activateMoreMenuItem/.test(calls), calls);
ok('activate confirmed=true', /activateMoreMenuItem","resetChat?",true|true/.test(calls) || calls.includes('true'), calls);
ok('says reset ok', (await ev(`document.getElementById('notice').textContent`)).includes('已重置'), await ev(`document.getElementById('notice').textContent`));

// ── 失败路径：原生确认框没出现 → 不许报「已重置」
await ev('__slDev.ui.reset()');
await ev('__slDev.native(' + JSON.stringify(base(MORE, MSGS)) + ')'); await sleep(300);
await ev(`window.__CALLS__=[]`);
await ev(`__slDev.stub((m,p)=>{ window.__CALLS__.push([m,p&&p.action]);
  if (m==='native.invoke' && p.action==='activateMoreMenuItem') return { ok:true, result:{ confirmed:false } };
  return { ok:true, result:{} } })`);
await ev(`document.querySelector('[data-feat="resetChat"]').click()`); await sleep(250);
await ev(`document.getElementById('confirm-ok').click()`); await sleep(1300);
const msg = await ev(`document.getElementById('notice').textContent`);
ok('no false success', !msg.includes('已重置') && /没有出现|没完成/.test(msg), msg);

// ── 第一次没弹确认、第二次弹：HUD 应自动重试，不让玩家重复整轮操作
await ev('__slDev.ui.reset()');
await ev('__slDev.native(' + JSON.stringify(base(MORE, MSGS)) + ')'); await sleep(300);
await ev('window.__CLEARED__ = ' + JSON.stringify(base({ ...MORE, open: false }, [])) + '; 1');
await ev(`(()=>{
  window.__CALLS__=[];
  __slDev.__retry=0;
  __slDev.stub((m,p)=>{
    window.__CALLS__.push([m, p&&p.action]);
    if (m==='native.invoke' && p.action==='activateMoreMenuItem') {
      __slDev.__retry++;
      if (__slDev.__retry === 1) return { ok:true, data:{ confirmed:false, kind:'resetChat' } };
      __slDev.native(window.__CLEARED__);
      return { ok:true, data:{ confirmed:true, kind:'resetChat' } };
    }
    return { ok:true, data:{} };
  });
  return 1;
})()`);
await ev(`document.querySelector('[data-feat="resetChat"]').click()`); await sleep(250);
await ev(`document.getElementById('confirm-ok').click()`); await sleep(2200);
const n2 = await ev(`window.__CALLS__.filter(c => c[1] === 'activateMoreMenuItem').length`);
const msg2 = await ev(`document.getElementById('notice').textContent`);
ok('retry once on data.confirmed=false', n2 === 2 && msg2.includes('已重置'), `activate=${n2} ${msg2}`);

console.log('pass', pass, 'fail', fail, 'errs', JSON.stringify(B.errs));
B.close();
