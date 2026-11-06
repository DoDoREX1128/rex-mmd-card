import { launch, sleep } from './browser.mjs';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('./models.mjs',import.meta.url), 'utf8').replace(/\r\n/g,'\n');
const MODELS = eval('(' + src.match(/const MODELS = ([\s\S]*?);\nconst CAPS/)[1] + ')');
const CAPS = eval('(' + src.match(/const CAPS = ([\s\S]*?);\n\nconst b = await launch/)[1] + ')');

const CFG = {
  open: true, title: '模型设置', modelName: 'claude-4.6-opus(逆向-高智版)', energyLabel: '剩余能量 9600', revision: 'r-cfg',
  controls: [
    { id: 'c1', label: '深度思考', description: '更慢，但更稳', type: 'toggle', value: true, available: true, choices: [] },
    { id: 'c2', label: '温度', description: '越高越发散', type: 'choice', value: null, available: true,
      choices: [{ id: 'o1', label: '0.6', selected: false }, { id: 'o2', label: '0.8', selected: true }, { id: 'o3', label: '1.0', selected: false }] },
  ],
};
const NATIVE = { connected: true, mode: 'native-dom', messages: [], capabilities: CAPS, actions: {}, models: MODELS };

const b = await launch({ width: 1440, height: 900 });
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' | ' + x : '')); };
try {
  await b.goto('#devboot');
  await sleep(300);
  await b.ev(`(()=>{
    window.__CUR__ = ${JSON.stringify(MODELS)};
    window.__NAT__ = ${JSON.stringify(NATIVE)};
    window.__MODEL_CALLS__=[];
    __slDev.stub((method, params) => {
      if (method === 'snapshot.now') return { native: Object.assign({}, window.__NAT__, { models: window.__CUR__ }) };
      if (method === 'native.invoke') {
        const a = params && params.action;
        const p=params.payload||params;
        window.__MODEL_CALLS__.push([a,p]);
        if (a === 'openModelConfiguration') window.__CUR__.modelConfiguration = ${JSON.stringify(CFG)};
        if (a === 'closeModelConfiguration') window.__CUR__.modelConfiguration = Object.assign({}, ${JSON.stringify(CFG)}, { open: false });
        if (a === 'selectModel') {
          window.__CUR__.modelPanel.models.forEach(m => { m.selected = m.id === p.modelId; });
          const selected=window.__CUR__.modelPanel.models.find(m=>m.selected);
          window.__CUR__.current={name:selected.name};
        }
        if(a==='setModelSetting'){
          const c=window.__CUR__.modelConfiguration.controls.find(c=>c.id===p.controlId);
          if(typeof p.value==='boolean')c.value=p.value;
          if(p.choiceId)c.choices.forEach(ch=>ch.selected=ch.id===p.choiceId);
        }
        return { ok: true, action: a };
      }
      return {};
    });
    __slDev.native(window.__NAT__);
  })()`);
  await sleep(300);

  ok('trigger ready', (await b.ev(`document.getElementById('models-open').textContent`)).startsWith('模型 · claude-4.6-opus(逆向-高智版)'));

  await b.ev(`document.getElementById('models-open').click()`);
  await sleep(450);
  ok('list rendered', (await b.ev(`document.querySelectorAll('.mdl__card').length`)) === 3);

  await b.ev(`document.querySelectorAll('.mdl__cfg')[0].click()`);
  await sleep(700);
  const r = await b.ev(`(()=>{const d=document.getElementById('models-dialog');
    return JSON.stringify({title:(d.querySelector('h2')||{}).textContent,
      groups:d.querySelectorAll('.mdl__group').length,
      switchOn:!!(d.querySelector('.mdl__switch input')||{}).checked,
      chips:[...d.querySelectorAll('.mdl__chips .mdl__chip')].map(x=>x.textContent),
      chosen:[...d.querySelectorAll('.mdl__chips .mdl__chip.is-on')].map(x=>x.textContent),
      save:(d.querySelector('.mdl__use')||{}).textContent,
      disabled:[...d.querySelectorAll('.mdl__use,.mdl__cfg,.mdl__chip')].map(x=>x.disabled)});})()`);
  const m = JSON.parse(r);
  ok('switched to config view', m.title === 'claude-4.6-opus(逆向-高智版)', r);
  ok('two control groups', m.groups === 2, r);
  ok('toggle reflects value', m.switchOn === true, r);
  ok('choice list', m.chips.join('/') === '0.6/0.8/1.0', r);
  ok('one chosen', m.chosen.join('') === '0.8', r);
  ok('save button label', m.save === '确认配置', r);
  ok('all controls enabled', m.disabled.every(x => x === false), r);
  await b.ev(`document.querySelector('.mdl__switch input').click()`);await sleep(350);
  ok('toggle writes native value',await b.ev(`__MODEL_CALLS__.some(([a,p])=>a==='setModelSetting'&&p.controlId==='c1'&&p.value===false)`));
  await b.ev(`[...document.querySelectorAll('.mdl__chip')].find(b=>b.textContent==='1.0').click()`);await sleep(350);
  ok('choice writes native id',await b.ev(`__MODEL_CALLS__.some(([a,p])=>a==='setModelSetting'&&p.controlId==='c2'&&p.choiceId==='o3')`));
  await b.shot('_mdl_cfg.png');

  await b.ev(`[...document.querySelectorAll('.mdl__row .ghost')].find(b=>/返回模型/.test(b.textContent)).click()`);
  await sleep(600);
  ok('back to list', (await b.ev(`document.querySelectorAll('.mdl__card').length`)) === 3);

  await b.ev(`document.querySelectorAll('.mdl__use')[1].click()`);
  await sleep(700);
  const after = await b.ev(`JSON.stringify({open:document.getElementById('models-dialog').open,
    text:document.getElementById('models-open').textContent,
    notice:(document.getElementById('models-notice')||{}).textContent})`);
  const a = JSON.parse(after);
  ok('pick closes panel', a.open === false, after);
  ok('trigger shows new model and cost', a.text === '模型 · claude-4.6-opus(逆向) 75⚡', after);
  ok('pick reaches native model target',await b.ev(`__MODEL_CALLS__.some(([a,p])=>a==='selectModel'&&p.modelId==='m2')`));

  console.log(fails === 0 ? 'ALL PASS' : fails + ' FAILED');
} finally { b.close(); }
