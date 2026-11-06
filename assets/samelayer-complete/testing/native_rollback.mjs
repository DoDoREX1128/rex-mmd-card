import { launch, sleep } from './browser.mjs';

/* 原生消息层夹具：把 actions-dom + actions-handlers 原样加载到一份仿平台 DOM 上，
   逐条跑「回溯」。目的不是证明真站能用，而是把实现里对文案 / 结构 / 结果的假设逼出来。 */
let pass = 0, fail = 0; const bad = [];
const ok = (n, c, e = '') => { if (c) { pass++; console.log('PASS ' + n.padEnd(38) + e); } else { fail++; bad.push(n + ' ' + e); console.log('FAIL ' + n.padEnd(38) + e); } };

const BASE = new URL('native-chat.html',process.env.REX_FIXTURE_ROOT||new URL('./fixtures/',import.meta.url)).href;
const B = await launch({ port: 9691, width: 900, height: 700, url: BASE });

async function run(query, index,preopen=false) {
  await B.goto('#' + query);
  await sleep(350);
  if(preopen){
    await B.ev(`document.querySelectorAll('#msglistview .item .content')[1].dispatchEvent(new MouseEvent('mousedown',{bubbles:true,buttons:1}))`);
    await sleep(1200);
    if(!(await B.ev(`!!document.querySelector('.msg-option-scope')`)))return {ok:false,reason:'预开菜单未成功'};
  }
  await B.ev(`(window.__run(${JSON.stringify({ index,timeout:2500 })}), true)`);
  for (let i = 0; i < 80; i++) {
    const r = await B.ev(`window.__last ? JSON.stringify(window.__last) : ''`);
    if (r) return JSON.parse(r);
    await sleep(100);
  }
  return { ok: false, code: 'NO_RESULT', message: '夹具没有回结果' };
}

try {
  /* ① 基线：真站那套 .mmd-confirm + 连目标一起删 */
  const base = await run('text=full');
  ok('基线：回溯生效（mmd 确认框）', base.ok === true && base.after === 1, JSON.stringify(base));

  /* ①b 旧的 .confirm-scope 写法也要认 */
  const scopeUi = await run('text=full&ui=scope');
  ok('旧式 .confirm-scope 也认', scopeUi.ok === true && scopeUi.after === 1, JSON.stringify(scopeUi));

  /* ② 文案换过（只说删除，不带「回溯」） */
  const plain = await run('text=plain');
  ok('文案不含「回溯」也能确认', plain.ok === true && plain.after === 1, JSON.stringify(plain));

  /* ③ 某些版本不弹确认框，点完立刻回溯 */
  const noDlg = await run('dialog=off');
  ok('无确认框（立即回溯）', noDlg.ok === true && noDlg.after === 1, JSON.stringify(noDlg));

  /* ④ 有的版本连目标消息一起回溯掉 */
  const dropSelf = await run('keep=1');
  ok('保留目标的版本也算成功', dropSelf.ok === true && dropSelf.after === 2, JSON.stringify(dropSelf));

  /* ⑤ 确定按钮没有 .ok-btn 类，只有文案 */
  const plainOk = await run('ui=scope&ok=plain');
  ok('确定按钮无 .ok-btn 也能点', plainOk.ok === true && plainOk.after === 1, JSON.stringify(plainOk));

  /* ⑥ 最后一条：后面没有内容，不该进原生流程 */
  const last = await run('text=full', 3);
  ok('最后一条：不卡 4.5 秒也不报错', last.ok === true && last.after === 4 && !last.menuOpen && !last.stuckDialog, JSON.stringify(last));

  /* ⑦ 删除消息没被回溯的改动带坏 */
  await B.goto('#text=full'); await sleep(300);
  await B.ev('(window.__runDelete({}), true)');
  let del = null;
  for (let i = 0; i < 60 && !del; i++) { const r = await B.ev(`window.__last ? JSON.stringify(window.__last) : ''`); if (r) del = JSON.parse(r); else await sleep(100); }
  ok('删除消息仍然只删这一条', del && del.ok === true && del.after === 3, JSON.stringify(del));

  /* ⑧ 夹具里那两张常驻隐藏确认框不该被当成「已有弹窗」 */
  const busy = await run('text=full');
  ok('隐藏模板不阻塞', busy.ok === true && busy.after === 1, JSON.stringify(busy));
  const held=await run('text=full&hold=1000&toggle=1');
  ok('真实长按时序：保持1000ms后才开菜单',held.ok===true&&held.after===1,JSON.stringify(held));
  const toggled=await run('text=full&hold=1000&toggle=1',undefined,true);
  ok('菜单已打开：先关闭再长按，避免toggle反关',toggled.ok===true&&toggled.after===1,JSON.stringify(toggled));

  console.log('exceptions:', B.errs.length ? B.errs : 'none');
} finally {
  B.close();
}
console.log('\n' + pass + '/' + (pass + fail) + (fail ? '  FAIL: ' + bad.join(' · ') : ''));
process.exit(fail ? 1 : 0);
