import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),asset=path.join(root,'assets/modular-scenes');
const read=p=>fs.readFileSync(p,'utf8'),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const context=vm.createContext({});vm.runInContext(read(path.join(asset,'frame/state.js')),context);const S=context.SceneState;
const plain=x=>JSON.parse(JSON.stringify(x)),initial={energy:100,inventory:[],options:[],info:{name:'initial',known:true}};
test('消息顺序是权威，用户块忽略，重复turn不遗漏，删除编辑可逆',()=>{
  const rows=[{id:'a',role:'assistant',raw:'[status]{"turn":1,"energy":60,"inventory":["key"]}[/status]'},
    {id:'u',role:'user',raw:'[status]{"energy":0}[/status]'},
    {id:'b',role:'assistant',raw:'[status]{"turn":1,"energy":40,"inventory":[]}[/status]'}];
  assert.equal(S.rebuild(rows,initial).state.energy,40);assert.deepEqual(plain(S.rebuild(rows,initial).state.inventory),[]);
  assert.equal(S.rebuild(rows.slice(0,2),initial).state.energy,60);
  rows[2].raw='[status]{"energy":30}[/status]';assert.equal(S.rebuild(rows,initial).state.energy,30);
  assert.equal(S.rebuild(rows,initial,{b:'ignore'}).state.energy,60);
  assert.equal(S.rebuild([],initial).state.energy,100);
});
test('坏块保留上次状态，半截不应用，缺键继承，原型键与未知字段不入状态',()=>{
  const rows=[{role:'assistant',raw:'[status]{"energy":60,"info":{"name":"new"},"evil":1,"__proto__":{"polluted":true}}[/status]'},
    {role:'assistant',raw:'[status]broken[/status]尾文[status]{"energy":0'}];
  const r=S.rebuild(rows,initial);assert.equal(r.state.energy,60);assert.equal(r.state.info.known,true);
  assert.equal(r.issues.length,1);assert.equal(r.state.evil,undefined);assert.equal({}.polluted,undefined);
  assert.equal(S.strip('正文[status]{bad'),'正文');assert.equal(S.strip('前[status]{}[/status]后'),'前后');
});
test('存档拒绝错作品、坏版本、坏草稿和原型槽，允许真实完整进度',()=>{
  const save={schema:1,appId:'test',slots:{auto:{data:{player:{name:'A'},draft:{active:['guide']},preferences:{size:17,line:1.9,volume:.1,theme:'default'},choices:{a:'ignore'}}}}};
  assert.equal(S.validateSave(save,'test').appId,'test');assert.throws(()=>S.validateSave(save,'other'));
  for(const bad of [{...save,schema:2},{...save,slots:{auto:{data:{}}}}])assert.throws(()=>S.validateSave(bad,'test'));
  const bad=plain(save);bad.slots.auto.data.draft.active={};assert.throws(()=>S.validateSave(bad,'test'));
});

test('两套皮肉共用运行时，独立克隆/构建/回读/同步/失败保护',()=>{
  fs.mkdirSync(path.join(root,'work'),{recursive:true});const base=fs.mkdtempSync(path.join(root,'work/modular-scenes-test-'));
  const run=(script,args)=>spawnSync(process.execPath,[script,...args],{encoding:'utf8',timeout:30000});
  const tool=path.join(root,'scripts/modular-scenes.mjs'),projects=[];
  for(const variant of ['harbor','orbit']){
    const project=path.join(base,variant);projects.push(project);
    let r=run(tool,['init',project,'--variant',variant]);assert.equal(r.status,0,r.stderr);
    const localTool=path.join(project,'工程/tools/scripts/modular-scenes.mjs');
    r=run(localTool,['build',project]);assert.equal(r.status,0,r.stderr);
    r=run(localTool,['verify',project]);assert.equal(r.status,0,r.stderr);
    const output=path.join(project,'交付/regex.json'),before=sha(output);
    r=run(localTool,['build',project]);assert.equal(r.status,0,r.stderr);assert.equal(sha(output),before,'可复现构建');
    const card=JSON.parse(read(output));assert.deepEqual(Object.keys(card).sort(),['beginning','pageDepth','regex_scripts','statusbar']);
    assert.ok(!card.beginning.includes('【REXHUD'));assert.ok(card.regex_scripts.every(x=>x.id===-1&&x.replaceString.length<=20000));
    let expanded=card.statusbar;for(const rule of card.regex_scripts){const m=/^\/(.*)\/([a-z]*)$/.exec(rule.findRegex);expanded=expanded.replace(new RegExp(m[1],m[2]),rule.replaceString);}
    assert.ok(!expanded.includes('【REXHUD'));
    let captured='';const ctx=vm.createContext({document:{createElement:()=>({dataset:{}}),head:{appendChild:e=>{captured=e.textContent;}}}});
    for(const m of expanded.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(m[1],ctx);
    const manifest=JSON.parse(read(path.join(project,'工程/builds/release-manifest.json'))),build=path.join(project,'工程/builds',manifest.buildId);
    assert.equal(captured,read(path.join(build,'host.js')),'点火重放还原Host');assert.equal(ctx.REXHUDSTATE.f,read(path.join(build,'frame.html')),'点火重放还原Frame');
    const rev=path.join(project,'交付/01-人设审阅.txt');fs.appendFileSync(rev,'\n保持新的创作规则。');
    r=run(localTool,['sync',project]);assert.equal(r.status,0,r.stderr);assert.match(read(path.join(project,'工程/src/content/persona.txt')),/新的创作规则/);
    fs.appendFileSync(rev,'审阅侧修改');fs.appendFileSync(path.join(project,'工程/src/content/persona.txt'),'源码侧修改');
    r=run(localTool,['build',project]);assert.notEqual(r.status,0);assert.equal(sha(output),before,'失败不覆盖旧发布包');
    r=run(tool,['init',project]);assert.notEqual(r.status,0,'拒绝覆盖非空目录');
    console.log('独立克隆验证工程：'+project);
  }
  for(const f of ['frame/state.js','frame/runtime.js','frame/layout.css',...fs.readdirSync(path.join(asset,'host')).map(n=>'host/'+n)])assert.equal(sha(path.join(projects[0],'工程/src',f)),sha(path.join(projects[1],'工程/src',f)),f+'换皮肉不改骨');
});
