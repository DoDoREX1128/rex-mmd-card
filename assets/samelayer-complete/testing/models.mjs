import { launch, sleep } from './browser.mjs';

const MODELS = {
  enabled: true,
  current: { name: 'claude-4.6-opus(逆向-高智版)' },
  modelPanel: {
    open: true, title: '选择模型', revision: 'r-mp',
    filters: [
      { id: 'recent', label: '最近使用', active: true, available: true },
      { id: 'all', label: '全部', active: false, available: true },
      { id: 'cn', label: '国产之光', active: false, available: true },
      { id: 'gemini', label: 'Gemini', active: false, available: true },
    ],
    models: [
      { id: 'm1', name: 'claude-4.6-opus(逆向-高智版)', description: '逆向高智版！',
        batteryLabel: '100 / 每条消息', permission: '已解锁此模型', successRate: '成功率 0.00%',
        selected: true, available: true, canConfigure: true },
      { id: 'm2', name: 'claude-4.6-opus(逆向)', description: 'claude最强rp模型！ 逆向性价比极高',
        batteryLabel: '75 / 每条消息', permission: '已解锁此模型', successRate: '成功率 100.00%',
        selected: false, available: true, canConfigure: true },
      { id: 'm3', name: 'mimo-v2.6-pro', description: '文风超好，遵守设定，智商高',
        batteryLabel: '90 / 每条消息', permission: '已解锁此模型', successRate: '成功率 98.97%',
        selected: false, available: true, canConfigure: true },
    ],
    loading: false,
  },
  modelConfiguration: { open: false, title: '', modelName: '', energyLabel: '', revision: 'r-cfg', controls: [] },
};
const CAPS = {
  openModelSettings: { available: true },
  closeModelSettings: { available: true },
  selectModel: { available: true },
  selectModelFilter: { available: true },
  openModelConfiguration: { available: true },
  closeModelConfiguration: { available: true },
  setModelSetting: { available: true },
  submitModelConfiguration: { available: true },
};

const b = await launch({ width: 1440, height: 900 });
let fails = 0;
const ok = (name, cond, extra = '') => {
  if (!cond) fails++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' | ' + extra : ''));
};

try {
  await b.goto('#devboot');
  await sleep(400);
  await b.ev(`__slDev.models(${JSON.stringify({ models: MODELS, capabilities: CAPS })})`);
  await sleep(200);

  const trig = await b.ev(`document.getElementById('models-open').textContent`);
  ok('trigger shows name', /模型.*claude-4\.6-opus/.test(trig), trig);
  ok('trigger enabled', (await b.ev(`!document.getElementById('models-open').disabled`)));

  // 打开
  await b.ev(`document.getElementById('models-open').click()`);
  await sleep(300);
  const opened = await b.ev(`(()=>{const d=document.getElementById('models-dialog');
    return JSON.stringify({open:d.open, cards:d.querySelectorAll('.mdl__card').length,
      filters:d.querySelectorAll('.mdl__chip').length,
      title:(d.querySelector('h2')||{}).textContent,
      selected:d.querySelectorAll('.mdl__card.is-on').length,
      useDisabled:[...d.querySelectorAll('.mdl__use')].map(x=>x.disabled),
      cfgDisabled:[...d.querySelectorAll('.mdl__cfg')].map(x=>x.disabled)});})()`);
  const o = JSON.parse(opened);
  ok('dialog open', o.open);
  ok('cards = 3', o.cards === 3, opened);
  ok('filters = 4', o.filters === 4);
  ok('one selected', o.selected === 1);
  ok('use buttons enabled', o.useDisabled.every(x => x === false), JSON.stringify(o.useDisabled));
  ok('cfg buttons enabled', o.cfgDisabled.every(x => x === false), JSON.stringify(o.cfgDisabled));

  await b.shot('_mdl_list.png');

  // 点「使用此模型」：本地无 port → 报错，但按钮必须立即恢复
  await b.ev(`document.querySelectorAll('.mdl__use')[1].click()`);
  await sleep(400);
  const after = await b.ev(`(()=>{const d=document.getElementById('models-dialog');
    return JSON.stringify({notice:(document.getElementById('models-notice')||{}).textContent,
      useDisabled:[...d.querySelectorAll('.mdl__use')].map(x=>x.disabled),
      open:d.open});})()`);
  const a = JSON.parse(after);
  ok('use click gives feedback', !!a.notice, after);
  ok('use buttons re-enabled after failure', a.useDisabled.every(x => x === false), after);

  // 再点一次「模型」应能关闭再打开（不再永久禁用）
  await b.ev(`document.getElementById('models-open').click()`);
  await sleep(200);
  ok('trigger toggles closed', (await b.ev(`document.getElementById('models-dialog').open`)) === false);
  await b.ev(`document.getElementById('models-open').click()`);
  await sleep(250);
  ok('trigger reopens', (await b.ev(`document.getElementById('models-dialog').open`)) === true);
  await b.ev(`document.getElementById('models-dialog').close()`);

  // 模型键与其它工具按钮对齐（同步键已删除）
  const align = await b.ev(`(()=>{const m=document.getElementById('models-open'),c=document.querySelector('#cmpBar [data-cmp="clear"]');
    const a=m.getBoundingClientRect(),d=c.getBoundingClientRect();
    return JSON.stringify({my:Math.round(a.y+a.height/2),cy:Math.round(d.y+d.height/2),
      mh:Math.round(a.height),ch:Math.round(d.height),text:m.textContent});})()`);
  const al = JSON.parse(align);
  ok('model and tools on same row', Math.abs(al.my - al.cy) <= 1, align);
  ok('model same height as tools', al.mh === al.ch, align);
  ok('no sync button', await b.ev(`!document.getElementById('composer-sync')`));

  console.log(fails === 0 ? 'ALL PASS' : fails + ' FAILED');
} finally {
  b.close();
}
