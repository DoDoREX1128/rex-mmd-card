import { launch, sleep } from './browser.mjs';

const MOCK = {
  connected: true, mode: 'native-dom', messages: [],
  capabilities: {
    openPersona: { available: true }, setPersonaMode: { available: true }, setPersonaGender: { available: true },
    submitPersona: { available: true }, closePersona: { available: true },
    openConversationPanel: { available: true }, selectConversation: { available: true }, closeConversationPanel: { available: true },
    openSupplement: { available: true }, setSupplementText: { available: true }, submitSupplement: { available: true }, closeSupplement: { available: true },
    openPromptSelector: { available: true }, applyInstruction: { available: true }, closePromptSelector: { available: true },
    openChatSettings: { available: true }, submitChatSettings: { available: true }, closeChatSettings: { available: true },
    openSharePanel: { available: true }, copyShareLink: { available: true }, closeSharePanel: { available: true },
    openConversationPanel: { available: true }, renameConversation: { available: true },
    requestDeleteConversation: { available: true }, deleteConversation: { available: true },
    closeBackgroundPanel: { available: true }, openBackgroundPanel: { available: true },
    openCustomInstructions: { available: true }, closeCustomInstructions: { available: true },
    addCustomInstruction: { available: true }, editCustomInstruction: { available: true },
    deleteCustomInstruction: { available: true }, moveCustomInstruction: { available: true },
    resetCustomInstructions: { available: true }
  },
  actions: {
    personaPanel: {
      open: true, revision: 'r-persona', title: '用户人设',
      modes: [{ id: 'm1', label: '扮演自己', selected: true, disabled: false }], currentModeId: 'm1',
      name: '渡', maxLength: 20, nameDisabled: false,
      genderChoices: [{ id: 'g1', label: '男', selected: true, disabled: false }, { id: 'g2', label: '女', selected: false, disabled: false }],
      selectedGenderId: 'g1', identity: '青岚宗外门弟子。', identityMaxLength: 500, identityDisabled: false,
      restriction: ''
    },
    conversationPanel: {
      open: true, revision: 'r-conv', title: '会话记录', currentConversationId: 'c1',
      conversations: [
        { id: 'c1', fingerprint: 'f1', index: 0, title: '第一卷 · 山门初见', preview: '你在执事堂等候。', current: true, available: true, capabilities: { rename: true, delete: false } },
        { id: 'c2', fingerprint: 'f2', index: 1, title: '另一条时间线', preview: '长老提前三日回宗。', current: false, available: true, capabilities: { rename: true, delete: true } }
      ]
    },
    supplementPanel: {
      open: true, revision: 'r-sup', title: '设定补充', text: '', maxLength: 2000, positionLabel: '故事背景之后', positionId: 'p1',
      picker: { open: false, choices: [], pendingChoiceId: '' }
    },
    instructionSelector: {
      open: true, revision: 'r-ins', empty: false,
      instructions: [
        { id: 'i1', label: '继续', fingerprint: 'a', index: 0 }, { id: 'i2', label: '描写环境', fingerprint: 'b', index: 1 },
        { id: 'i3', label: '加快节奏', fingerprint: 'c', index: 2 }, { id: 'i4', label: '插入回忆', fingerprint: 'd', index: 3 }
      ]
    },
    chatSettings: {
      open: true, revision: 'r-set', title: '对话设置', empty: false,
      controls: [
        { id: 's1', label: '温度', description: '越高越发散', options: [{ id: 'o1', label: '0.8', selected: true }], selectedOptionId: 'o1', collapsed: false },
        { id: 's2', label: '上下文长度', description: '保留的楼层数', options: [{ id: 'o2', label: '20 层', selected: true }], selectedOptionId: 'o2', collapsed: false }
      ]
    },
    sharePanel: { open: true, revision: 'r-share', title: '分享对话', subtitle: '拿到链接后可以发给任何人。', link: 'https://sexyai.top/s/abcd1234' },
    moreMenu: { open: true, revision: 'r-more', items: [] },
    backgroundPanel: { open: true, revision: 'r-bg', title: '更换背景',
      items: [{ id: 'b0', index: 0, label: '重置背景图' }, { id: 'b1', index: 1, label: '从相册选择' }] },
    customInstructionsPanel: { open: true, revision: 'r-ci', title: '自定义指令', count: 3, limit: 30,
      instructions: [
        { id: 'ci1', index: 0, label: '清空输入框' },
        { id: 'ci2', index: 1, label: '通用总结' },
        { id: 'ci3', index: 2, label: '极致微操' }
      ] },
    messages: { revision: 'r-msg', items: [] },
    navigation: { revision: 'r-nav', favorite: false },
    composer: { revision: 'r-cmp', text: '', available: true }
  },
  models: null
};

async function run(w, h, tag, kind) {
  const b = await launch({ width: w, height: h });
  try {
    await b.goto('#devboot');
    await b.ev(`__slDev.feature(${JSON.stringify(MOCK)})`);
    await b.ev(`__slDev.ui.showPanel(${JSON.stringify(kind)})`);
    await sleep(700);
    const out = await b.ev(`(()=>{
      const d = document.getElementById('features-dialog');
      const open = document.body.classList.contains('feature-open');
      const r = d ? d.getBoundingClientRect() : null;
      const detail = document.querySelector('.detail');
      const dr = detail ? detail.getBoundingClientRect() : null;
      return JSON.stringify({
        featureOpen: open, dialogOpen: d ? d.hasAttribute('open') : null,
        dialog: r ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null,
        detail: dr ? [Math.round(dr.x), Math.round(dr.y), Math.round(dr.width), Math.round(dr.height)] : null,
        title: (d && d.querySelector('h2') ? d.querySelector('h2').textContent : null),
        notice: (document.getElementById('features-notice') || {}).textContent,
        cards: d ? d.querySelectorAll('.sl-card').length : 0,
        buttons: d ? [...d.querySelectorAll('button')].map(x => x.textContent.trim()).slice(0, 14) : [],
        marked: [...document.querySelectorAll('[data-feat].on')].map(x => x.dataset.feat),
        busyNotice: /正在等待/.test((document.getElementById('features-notice') || {}).textContent || ''),
        enabledBtns: d ? [...d.querySelectorAll('button')].filter(x => !x.disabled).length : 0
      }, null, 1);
    })()`);
    const check=JSON.parse(out);
    const pass=check.featureOpen&&check.dialogOpen&&!check.busyNotice&&check.enabledBtns>0;
    console.log((pass?'PASS ':'FAIL ')+tag+'面板打开、控件可用且不永久忙锁');
    if(!pass)process.exitCode=1;
    console.log('[' + tag + '] ' + out);
    console.log('[' + tag + '] 异常 ' + b.errs.length + '：' + JSON.stringify(b.errs.slice(0, 2)));
    await b.shot('../shots/_panel_' + tag + '.png');
  } finally { b.close(); }
}

for (const k of ['conversations', 'persona', 'supplement', 'instructions', 'settings', 'sharing', 'background', 'customInstructions']) await run(1440, 900, 'pc-' + k, k);
await run(420, 900, 'mob', 'conversations');
process.exit(process.exitCode||0);
