import { launch, sleep } from './browser.mjs';

/* 终端动作链：用真站同形的快照喂 HUD，检查它到底向宿主发了什么。 */
let pass = 0, fail = 0; const bad = [];
const ok = (n, c, e = '') => { if (c) { pass++; console.log('PASS ' + n.padEnd(34) + e); } else { fail++; bad.push(n); console.log('FAIL ' + n.padEnd(34) + e); } };

const NAT = {
  connected: true, mode: 'native-dom', messages: [], models: null,
  capabilities: {
    openConversationPanel: { available: true }, selectConversation: { available: true }, closeConversationPanel: { available: true },
    createConversation: { available: true }, renameConversation: { available: true }, requestDeleteConversation: { available: true },
    deleteConversation: { available: false },
    openCustomInstructions: { available: true }, closeCustomInstructions: { available: true },
    addCustomInstruction: { available: false, reason: '已达上限' }, editCustomInstruction: { available: false, reason: '已达上限' },
    deleteCustomInstruction: { available: true }, moveCustomInstruction: { available: true }, resetCustomInstructions: { available: true },
    openBackgroundPanel: { available: true }, closeBackgroundPanel: { available: true },
    openMoreMenu: { available: true }, closeMoreMenu: { available: true }
  },
  actions: {
    conversationPanel: {
      open: true, revision: 'r-conv', title: '开启新的聊天', currentConversationId: 'c1',
      conversations: [
        { id: 'c1', fingerprint: 'f1', index: 0, title: '测试卡', preview: '先是黑。', current: true, available: true, capabilities: { rename: true, delete: false } },
        { id: 'c2', fingerprint: 'f2', index: 1, title: '历史聊天7', preview: '', current: false, available: true, capabilities: { rename: true, delete: true } },
        { id: 'c3', fingerprint: 'f3', index: 2, title: '历史聊天5', preview: '', current: false, available: true, capabilities: { rename: true, delete: true } }
      ]
    },
    customInstructionsPanel: {
      open: true, revision: 'r-ci', title: '自定义指令', count: 34, limit: 30,
      instructions: [
        { id: 'ci1', index: 0, label: '清空输入框' }, { id: 'ci2', index: 1, label: '通用总结' },
        { id: 'ci3', index: 2, label: '极致微操' }
      ]
    },
    moreMenu: { open: true, revision: 'r-more', items: [] },
    backgroundPanel: { open: false, revision: 'r-bg', title: '', items: [] },
    personaPanel: { open: false, revision: 'r-p' }, supplementPanel: { open: false, revision: 'r-s' },
    chatSettings: { open: false, revision: 'r-set' }, sharePanel: { open: false, revision: 'r-share' },
    instructionSelector: { open: false, revision: 'r-ins', instructions: [] },
    messages: { revision: 'r-msg', items: [] },
    navigation: { revision: 'r-nav', favorite: false }, composer: { revision: 'r-cmp', text: '', available: true }
  }
};

const B = await launch({ port: 9651, width: 1440, height: 900 });
try {
  await B.goto('#devboot&nav=term');
  await B.ev(`(()=>{
    window.__CALLS__ = [];
    __slDev.stub((method, params) => {
      if (method === 'snapshot.now') return { native: window.__NAT__ };
      if (method === 'ui.native') return { accepted: true };
      window.__CALLS__.push([method, params.action, params.payload || {}]);
      if (params.action === 'requestDeleteConversation') {
        window.__NAT__.actions.conversationPanel.conversations =
          window.__NAT__.actions.conversationPanel.conversations.filter(x => x.id !== params.payload.conversationId);
        return { ok: true, data: { phase: 'deleted' } };
      }
      if (params.action === 'moveCustomInstruction') return { ok: true, data: { phase: 'moved' } };
      if (params.action === 'closeConversationPanel' || params.action === 'closeMoreMenu'
        || params.action === 'closeCustomInstructions' || params.action === 'closeBackgroundPanel') {
        const key = { closeConversationPanel: 'conversationPanel', closeMoreMenu: 'moreMenu',
          closeCustomInstructions: 'customInstructionsPanel', closeBackgroundPanel: 'backgroundPanel' }[params.action];
        window.__NAT__.actions[key].open = false;
        return { ok: true, data: { phase: 'closed' } };
      }
      return { ok: true, data: { phase: 'ok' } };
    });
    window.__NAT__ = ${JSON.stringify(NAT)};
    __slDev.native(window.__NAT__);
    return true;
  })()`);
  await sleep(300);

  // ── 会话记录：删除是一次调用，且收尾关掉残留的「更多」菜单 ──
  await B.ev(`__slDev.ui.showPanel('conversations')`);
  await sleep(500);
  const rows = await B.ev(`document.querySelectorAll('#features-dialog .cv-row').length`);
  ok('conv rows rendered', rows === 3, String(rows));

  await B.ev(`(()=>{
    const rows = [...document.querySelectorAll('#features-dialog .cv-row')];
    const row = rows.find(r => /历史聊天7/.test(r.textContent));
    const del = [...row.querySelectorAll('.cv-tools button')].find(b => b.textContent.trim() === '删除');
    window.__DEL__ = !!del; del && del.click(); return true;
  })()`);
  await sleep(300);
  ok('delete asks once', await B.ev(`!!document.getElementById('features-confirm')?.hasAttribute('open')`));
  await B.ev(`document.getElementById('features-confirm-yes').click()`);
  await sleep(900);

  const calls = await B.ev(`JSON.stringify(window.__CALLS__)`);
  const list = JSON.parse(calls);
  const delCalls = list.filter(c => c[1] === 'requestDeleteConversation');
  ok('one delete call only', delCalls.length === 1, JSON.stringify(delCalls.map(c => c[1])));
  ok('delete carries id+fingerprint+index', !!(delCalls[0] && delCalls[0][2].conversationId === 'c2' && delCalls[0][2].fingerprint === 'f2' && delCalls[0][2].index === 1), JSON.stringify(delCalls[0]?.[2] || {}));
  ok('no deleteConversation token round', !list.some(c => c[1] === 'deleteConversation'));
  ok('settle closes stray more menu', list.some(c => c[1] === 'closeMoreMenu'));
  const afterRows = await B.ev(`document.querySelectorAll('#features-dialog .cv-row').length`);
  ok('list shrinks after delete', afterRows === 2, String(afterRows));

  // ── 自定义指令：超限态 + 上移 ──
  await B.ev(`__slDev.ui.closePanel()`);
  await sleep(400);
  await B.ev(`(()=>{ window.__NAT__.actions.moreMenu.open = false;
    window.__NAT__.actions.customInstructionsPanel.open = true; window.__CALLS__ = [];
    __slDev.native(window.__NAT__); __slDev.ui.showPanel('customInstructions'); return true; })()`);
  await sleep(600);
  const ci = await B.ev(`(()=>{
    const d = document.getElementById('features-dialog');
    const rows = [...d.querySelectorAll('.sl-ci__row')];
    const add = [...d.querySelectorAll('button')].find(b => b.textContent.trim() === '新增指令');
    const nameBtn = rows[0] && rows[0].querySelector('.sl-ci__name');
    const isSpan = nameBtn ? nameBtn.tagName : '';
    return JSON.stringify({ rows: rows.length, addDisabled: add ? add.disabled : null,
      nameDisabled: nameBtn ? (nameBtn.disabled ?? null) : null, isSpan, up: rows[0] ? [...rows[0].querySelectorAll('.sl-ci__tools button')].length : 0,
      text: d.innerText.replace(/\\s+/g,' ').slice(0, 120) });
  })()`);
  const ciObj = JSON.parse(ci);
  ok('ci rows rendered', ciObj.rows === 3, String(ciObj.rows));
  ok('ci add disabled at limit', ciObj.addDisabled === true);
  ok('ci name is clickable', ciObj.isSpan === 'BUTTON', ciObj.isSpan);
  ok('ci row has 4 tools', ciObj.up === 4, String(ciObj.up));
  ok('ci shows limit hint', /34 \/ 30/.test(ciObj.text) && /已达原生上限/.test(ciObj.text), ciObj.text);

  await B.ev(`(()=>{
    const row = [...document.querySelectorAll('#features-dialog .sl-ci__row')][1];
    [...row.querySelectorAll('.sl-ci__tools button')][0].click(); return true;
  })()`);
  await sleep(700);
  const calls2 = JSON.parse(await B.ev(`JSON.stringify(window.__CALLS__)`));
  const mv = calls2.filter(c => c[1] === 'moveCustomInstruction');
  ok('move sends dir=up', mv.length === 1 && mv[0][2].dir === 'up' && mv[0][2].instructionId === 'ci2', JSON.stringify(mv[0]?.[2] || {}));

  // ── 关闭面板：先发原生关闭，再收本地 ──
  await B.ev(`(()=>{ window.__CALLS__ = []; __slDev.ui.closePanel(); return true; })()`);
  await sleep(800);
  const calls3 = JSON.parse(await B.ev(`JSON.stringify(window.__CALLS__)`));
  ok('close sends native close', calls3.some(c => c[1] === 'closeCustomInstructions'), JSON.stringify(calls3.map(c => c[1])));
  ok('dialog closed locally', !(await B.ev(`document.getElementById('features-dialog').hasAttribute('open')`)));

  // ── 文案：不再出现「已交给 MMD」 ──
  const body = await B.ev(`document.body.innerText`);
  ok('no "已交给 MMD" copy', !/已交给\s*MMD|已提交给\s*MMD/.test(body));
} finally { B.close(); }
console.log('\n' + pass + ' pass / ' + fail + ' fail' + (fail ? ' → ' + bad.join(' | ') : ''));
process.exit(fail ? 1 : 0);
