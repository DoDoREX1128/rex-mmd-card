import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const base=new URL('../assets/kits/longform-samelayer/',import.meta.url);
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('state-replay.js',base),'utf8'),ctx);
const api=ctx.REXLongformState;
const messages=JSON.parse(fs.readFileSync(new URL('replay.example.json',base),'utf8'));
test('历史增量继承、重复 turn、空数组与用户引用',()=>{
  const r=api.replay(messages);
  assert.equal(r.applied,2);assert.equal(r.state.loc,'青岚宗·执事堂');
  assert.equal(r.state.npcs['陆云衡'].where,'青岚宗');
  assert.equal(r.state.npcs['陆云衡'].state,'核对药材');assert.equal(r.state.opt.length,0);
});
test('重复快照幂等；删除、编辑、重置和切会话可重建',()=>{
  assert.equal(JSON.stringify(api.replay(messages)),JSON.stringify(api.replay(messages)));
  assert.equal(api.replay(messages.slice(0,1)).state.npcs['陆云衡'].state,'在场');
  const edited=structuredClone(messages);edited[0].content='[status]{"loc":"新地点"}[/status]';
  assert.equal(api.replay(edited).state.loc,'新地点');
  assert.equal(Object.keys(api.replay([]).state.npcs).length,0);
});
test('坏 JSON 不应用，保留上一有效结果并报告消息',()=>{
  const r=api.replay([...messages,{id:'bad',role:'assistant',content:'[status]{broken}[/status]'}]);
  assert.equal(r.state.loc,'青岚宗·执事堂');assert.equal(r.errors[0].id,'bad');
});
test('历史开闭标签一起归一，生成中协议不露出',()=>{
  const r=api.replay([{role:'assistant',raw:'正文<rex-status hidden>{"loc":"藏经阁"}</rex-status>'}]);
  assert.equal(r.state.loc,'藏经阁');assert.equal(api.strip('正文[status]{"turn":'), '正文');
  assert.equal(api.strip('正文<rex-status hidden>{}</rex-status>尾声'),'正文尾声');
});
test('只使用原文与白名单，不污染对象原型',()=>{
  const r=api.replay([{role:'assistant',raw:'[status]{"npcs":{"__proto__":{"name":"污染"}},"unknown":123}[/status]',content:'忽略显示文本'}]);
  assert.equal(Object.keys(r.state.npcs).length,0);assert.equal(r.state.unknown,undefined);
});
