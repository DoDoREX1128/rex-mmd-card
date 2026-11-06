import { launch, sleep } from './browser.mjs';

/* 输入区改造：模型 / 同步并到工具条、指令集浮层、自定义指令「修」 */
let pass = 0, fail = 0; const bad = [];
const ok = (n, c, e = '') => { if (c) { pass++; console.log('PASS ' + n.padEnd(32) + e); } else { fail++; bad.push(n); console.log('FAIL ' + n.padEnd(32) + e); } };

const NAT = {
  connected: true, mode: 'native-dom', messages: [], models: {
    enabled: true, busy: false, issue: '',
    current: { id: 'm1', name: '叙事模型' },
    modelPanel: { open: true, revision: 'r-mp', filters: [], models: [
      { id: 'm1', name: '叙事模型', description: '默认', selected: true, available: true, canConfigure: true },
      { id: 'm2', name: '推理模型', description: '逻辑', selected: false, available: true, canConfigure: true }
    ] },
    modelConfiguration: { open: false, revision: 'r-mc', modelName: '', controls: [] }
  },
  capabilities: {
    openModelSettings: { available: true }, selectModel: { available: true }, openModelConfiguration: { available: true },
    submitModelConfiguration: { available: true }, setModelSetting: { available: true },
    openPromptSelector: { available: true }, closePromptSelector: { available: true }, applyInstruction: { available: true },
    setInputText: { available: true }, openCustomInstructions: { available: true }, closeCustomInstructions: { available: true },
    addCustomInstruction: { available: true }, editCustomInstruction: { available: true },
    deleteCustomInstruction: { available: true }, moveCustomInstruction: { available: true }, resetCustomInstructions: { available: true },
    openChatSettings: { available: true }, closeChatSettings: { available: true }, submitChatSettings: { available: true },
    setChatSetting: { available: true }
  },
  actions: {
    instructionSelector: { open: true, revision: 'r-ins', empty: false, instructions: [
      { id: 'i1', label: '继续', fingerprint: 'a', index: 0 },
      { id: 'i2', label: '描写环境', fingerprint: 'b', index: 1 },
      { id: 'i3', label: '加快节奏', fingerprint: 'c', index: 2 }
    ] },
    customInstructionsPanel: { open: true, revision: 'r-ci', title: '自定义指令', count: 3, limit: 30,
      instructions: [{ id: 'ci1', index: 0, label: '清空输入框', content: '清空' },
        { id: 'ci2', index: 1, label: '通用总结', content: '总结正文' },
        { id: 'ci3', index: 2, label: '极致微操', content: '微操正文' }] },
    chatSettings: { open: true, revision: 'r-cs', title: '对话设置', empty: false, controls: [
      { id: 'g1', label: '文风设置', description: 'AI回复文笔风格', collapsed: false,
        options: [{ id: 'o1', label: '默认文风', selected: true, disabled: false }, { id: 'o2', label: '作者文风', selected: false, disabled: false }],
        selectedOptionId: 'o1' }
    ] },
    messages: { revision: 'r-msg', items: [] }, navigation: { revision: 'r-nav', favorite: false },
    composer: { revision: 'r-cmp', text: '已有的句子。', available: true },
    moreMenu: { open: false, revision: 'r-more', items: [] }
  }
};

const B = await launch({ port: 9671, width: 1440, height: 900 });
try {
  await B.goto('#devboot&nav=term');
  await B.ev(`(()=>{
    window.__CALLS__ = [];
    __slDev.stub((method, params) => {
      if (method === 'snapshot.now') return { native: window.__NAT__ };
      if (method === 'ui.native') return { accepted: true };
      window.__CALLS__.push([params.action, params.payload || {}]);
      if (params.action === 'applyInstruction') return { ok: true, data: { phase: 'input-observed', text: '（继续）' } };
      if (params.action === 'setInputText') { window.__NAT__.actions.composer.text = params.payload.text; return { ok: true, data: { phase: 'input-observed' } }; }
      if (params.action === 'setChatSetting') return { ok: true, data: { phase: 'setting-observed' } };
      return { ok: true, data: { phase: 'ok' } };
    });
    window.__NAT__ = ${JSON.stringify(NAT)};
    __slDev.native(window.__NAT__);
    return true;
  })()`);
  await sleep(400);

  // ── 1. 同一行 ──
  const row = await B.ev(`(()=>{
    const bar = document.getElementById('cmpBar');
    const kids = [...bar.children].filter(e => e.getClientRects().length && e.tagName === 'BUTTON' || e.id === 'models-slot');
    const y = el => Math.round(el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2);
    const model = document.getElementById('models-open');
    const sync = document.getElementById('composer-sync');
    const clear = bar.querySelector('[data-cmp="clear"]');
    return JSON.stringify({ inBar: !!bar.querySelector('#models-open'),
      yModel: model ? y(model) : -1, ySync: sync ? y(sync) : -1, yClear: clear ? y(clear) : -1,
      rightOfClear: model ? model.getBoundingClientRect().left < clear.getBoundingClientRect().left : false,
      syncText: sync ? sync.textContent.trim() : '', modelText: model ? model.textContent.trim() : '' });
  })()`);
  const R = JSON.parse(row);
  ok('模型在工具条内', R.inBar);
  ok('模型与清空同一行', R.yModel === R.yClear, `model ${R.yModel} / clear ${R.yClear}`);
  ok('模型在清空左边', R.rightOfClear);
  ok('同步按钮已删除', await B.ev(`!document.getElementById('composer-sync')`));

  // ── 2. 模型浮层 ──
  await B.ev(`document.getElementById('models-open').click()`);
  await sleep(400);
  const mdl = await B.ev(`(()=>{
    const d = document.getElementById('models-dialog');
    const c = document.getElementById('composer').getBoundingClientRect();
    const r = d.getBoundingClientRect();
    return JSON.stringify({ open: d.hasAttribute('open'), position: getComputedStyle(d).position,
      above: r.bottom <= c.top + 2, width: Math.round(r.width), modal: d.matches(':modal') });
  })()`);
  const M = JSON.parse(mdl);
  ok('模型面板打开', M.open);
  ok('模型面板是浮层', M.position === 'absolute' && !M.modal, M.position);
  ok('浮在输入区上方', M.above, `w=${M.width}`);
  await B.ev(`document.getElementById('models-dialog').close()`);

  // ── 3. 指令集浮层 ──
  await B.ev(`document.getElementById('library-open').click()`);
  await sleep(500);
  const lib = await B.ev(`(()=>{
    const pop = document.getElementById('libPop');
    const c = document.getElementById('composer').getBoundingClientRect();
    const r = pop.getBoundingClientRect();
    return JSON.stringify({ hidden: pop.hidden, chips: pop.querySelectorAll('.lib-chip').length,
      above: r.bottom <= c.top + 2, labels: [...pop.querySelectorAll('.lib-chip')].map(b => b.textContent) });
  })()`);
  const L = JSON.parse(lib);
  ok('指令集浮层展开', !L.hidden && L.chips === 3, JSON.stringify(L.labels));
  ok('指令集在输入区上方', L.above);

  await B.ev(`(()=>{ document.getElementById('text').value = '已有的句子。'; document.getElementById('text').dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  await B.ev(`[...document.querySelectorAll('.lib-chip')][0].click()`);
  await sleep(700);
  const applied = await B.ev(`(()=>{
    const calls = window.__CALLS__;
    const box = document.getElementById('text');
    return JSON.stringify({ calls: calls.map(c => c[0]), value: box.value });
  })()`);
  const A = JSON.parse(applied);
  ok('点指令不再动原生芯片', !A.calls.includes('applyInstruction'), JSON.stringify(A.calls));
  ok('追加而非替换', A.value.includes('已有的句子。') && A.value.includes('清空'), JSON.stringify(A.value));
  ok('回写原生输入框', A.calls.filter(c => c === 'setInputText').length >= 1);

  // ── 4. 自定义指令「修」 ──
  await B.ev(`__slDev.ui.showPanel('customInstructions')`);
  await sleep(500);
  const ci = await B.ev(`(()=>{
    const row = document.querySelector('#features-dialog .sl-ci__row');
    const tools = [...row.querySelectorAll('.sl-ci__tools button')].map(b => b.textContent.trim());
    return JSON.stringify({ tools, name: row.querySelector('.sl-ci__name')?.tagName });
  })()`);
  const C = JSON.parse(ci);
  ok('每行四个按钮', C.tools.length === 4, JSON.stringify(C.tools));
  ok('删的左边是修', C.tools[2] === '修' && C.tools[3] === '删', JSON.stringify(C.tools));
  ok('名称可点追加', C.name === 'BUTTON', C.name);

  await B.ev(`[...document.querySelectorAll('#features-dialog .sl-ci__row .sl-ci__tools button')].find(b => b.textContent.trim() === '修').click()`);
  await sleep(400);
  const ed = await B.ev(`(()=>{
    const d = document.getElementById('features-editor');
    const t = document.getElementById('features-editor-text');
    return JSON.stringify({ open: d.hasAttribute('open'), tag: t.tagName, rows: t.rows, title: d.querySelector('h2').textContent });
  })()`);
  const E = JSON.parse(ed);
  ok('修 → 多行编辑窗', E.open && E.tag === 'TEXTAREA', E.title);
  await B.ev(`(()=>{ const t = document.getElementById('features-editor-text'); t.value = '新的指令内容'; document.getElementById('features-editor-ok').click(); return true; })()`);
  await sleep(700);
  const sent = JSON.parse(await B.ev(`JSON.stringify(window.__CALLS__.filter(c => c[0] === 'editCustomInstruction'))`));
  ok('保存发出 editCustomInstruction', sent.length === 1 && sent[0][1].text === '新的指令内容', JSON.stringify(sent[0]?.[1] || {}));

  // ── 5. 对话设置可点 ──
  await B.ev(`__slDev.ui.closePanel()`);
  await sleep(400);
  await B.ev(`(()=>{ window.__NAT__.actions.chatSettings.open = true; window.__CALLS__ = []; __slDev.native(window.__NAT__); __slDev.ui.showPanel('settings'); return true; })()`);
  await sleep(600);
  const st = await B.ev(`(()=>{
    const d = document.getElementById('features-dialog');
    const buttons = [...d.querySelectorAll('button')].map(b => b.textContent.trim());
    return JSON.stringify({ buttons, cards: d.querySelectorAll('.sl-card').length });
  })()`);
  const S = JSON.parse(st);
  ok('设置项渲染成按钮', S.buttons.includes('默认文风') && S.buttons.includes('作者文风'), JSON.stringify(S.buttons));
  ok('有保存设置', S.buttons.includes('保存设置'));
  await B.ev(`[...document.querySelectorAll('#features-dialog button')].find(b => b.textContent.trim() === '作者文风').click()`);
  await sleep(600);
  const setCall = JSON.parse(await B.ev(`JSON.stringify(window.__CALLS__.filter(c => c[0] === 'setChatSetting'))`));
  ok('点选项发 setChatSetting', setCall.length === 1 && setCall[0][1].optionId === 'o2', JSON.stringify(setCall[0]?.[1] || {}));
} finally { B.close(); }
console.log('\n' + pass + ' pass / ' + fail + ' fail' + (fail ? ' → ' + bad.join(' | ') : ''));
process.exit(fail ? 1 : 0);
