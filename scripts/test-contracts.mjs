import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {toCharacterBook,fromCharacterBook,validateWorldbook} from './lib/worldbook.mjs';
import {copyTree} from './lib/fsx.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rex-contract-'));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const run=(script,args=[])=>spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{cwd:root,encoding:'utf8'});
const write=(f,o)=>{const p=path.join(temp,f);fs.writeFileSync(p,JSON.stringify(o,null,2));return p;};
const makeCard=rs=>({chatVersion:1,pageDepth:2,statusbar:'',beginning:'测试',regex_scripts:[{id:-1,scriptName:'test',findRegex:'/test/',replaceString:rs}]});
function validate(card,args=[]){const p=write(crypto.randomUUID()+'.json',card);const r=run('validate.mjs',[p,'--json',...args]);return {exit:r.status,...JSON.parse(r.stdout)};}
const book={entries:{0:{uid:0,comment:'渡口',content:'守船人知道河流的水位。',key:'["渡口"]',keysecondary:'[]',constant:true,disable:false,probability:'100.00',order:100,position:4,depth:4,role:0}}};

function runtime(){
  const callbacks={},writes=[],messages=[],errors=[];let fail=false,scope='a';const memory={a:{},b:{}};
  const config={meta:{name:'test'},storage:{key:'test',maxSlots:2},status:{fields:[{key:'hp',type:'bar',max:100},{key:'cash',type:'num'},{key:'loc',type:'text'},{key:'flags',type:'tag'}]},npcs:[{key:'n1'}]};
  const sdk={on:(n,f)=>{callbacks[n]=f;return ()=>delete callbacks[n];},save:{get:k=>memory[scope][k]??null,set:(k,v)=>{const at=scope;writes.push({scope:at,key:k,value:JSON.parse(JSON.stringify(v))});return fail?Promise.reject(Error('NETWORK')):Promise.resolve().then(()=>{memory[at][k]=JSON.parse(JSON.stringify(v));});}},message:{send:t=>{messages.push(t);return fail?Promise.reject(Error('BUSY')):Promise.resolve();}},debug:{log(){}}};
  const win={sdk,__REX_CONTENT__:config,innerWidth:390,addEventListener(){},removeEventListener(){}};
  const context=vm.createContext({window:win,document:{querySelector:()=>null,querySelectorAll:()=>[]},setTimeout,clearTimeout,console,Date,Promise});
  for(const f of ['core.js','store.js','status.js'])vm.runInContext(read('assets/skeleton/'+f),context,{filename:f});
  const R=win.__REX__;R.refresh=()=>{};R.toast=t=>errors.push(t);R.sections={};
  return {R,sdk,writes,messages,errors,memory,callbacks,config,setFail:v=>fail=v,setScope:v=>scope=v,emit:(n,p)=>callbacks[n]?.(p)};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('three routes build then pass their matching validator',()=>{
  for(const route of ['sandbox','native']){
    const out=path.join(temp,route),src=path.join(root,'assets',route==='sandbox'?'skeleton':'native');
    const built=run('build.mjs',['--route',route,'--src',src,'--out',out,'--name','work']);assert.equal(built.status,0,built.stderr+built.stdout);
    const checked=run('validate.mjs',[path.join(out,'work-regex.json'),'--platform',route==='sandbox'?'sandbox':'legacy']);assert.equal(checked.status,0,checked.stdout);
  }
  const out=path.join(temp,'same');
  assert.equal(run('pack-samelayer.mjs',['--host',path.join(root,'assets/samelayer/host.js'),'--frame',path.join(root,'assets/samelayer/frame.html'),'--out',out,'--name','work']).status,0);
  const p=path.join(out,'work-regex.json');assert.equal(run('validate.mjs',[p,'--platform','legacy']).status,0);
  const c=JSON.parse(fs.readFileSync(p));assert.deepEqual(Object.keys(c).sort(),['beginning','pageDepth','regex_scripts','statusbar']);assert.ok(c.regex_scripts.every(r=>r.id===-1));
});
test('published sandbox scripts consume the documented protocol for two turns',()=>{
  const c=JSON.parse(fs.readFileSync(path.join(temp,'sandbox/work-regex.json')));
  const env=runtime();
  // Execute the exact status module inside the release package, not a separately retyped parser.
  const script=c.regex_scripts.find(r=>r.scriptName==='status').replaceString.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const events={};env.R.on=(n,f)=>events[n]=f;
  vm.runInNewContext(script,{window:{__REX__:env.R,__REX_CONTENT__:env.config},console,Date});
  events['message:done']({role:'ai',serverId:10,content:'第一轮[status]{"turn":1,"hp":80,"cash":12,"loc":"渡口"}[/status]'});
  events['message:done']({role:'ai',serverId:11,content:'第二轮[status]{"turn":2,"hp":65}[/status]'});
  assert.equal(env.R.data.status.hp,65);assert.equal(env.R.data.status.cash,12);assert.equal(typeof env.R.data.status.cash,'number');
  const hide=c.regex_scripts.find(r=>r.scriptName==='status-hide');const m=/^\/(.*)\/([a-z]*)$/.exec(hide.findRegex);
  assert.equal('[status]{"hp":65}[/status]'.replace(new RegExp(m[1],m[2]),hide.replaceString),'');
});
test('bad data retains valid state; blank arrays are real updates',()=>{
  const {R}=runtime();R.applyStatus('{"turn":1,"hp":70,"flags":["受伤"]}');R.applyStatus('{"hp":oops,');assert.equal(R.data.status.hp,70);
  R.applyStatus('{"turn":2,"flags":[]}');assert.equal(R.data.status.hp,70);assert.equal(R.data.status.flags.length,0);
  R.applyStatus('{"turn":3,"hp":9999,"unknown":5,"__proto__":{"polluted":true}}');assert.equal(R.data.status.hp,100);assert.equal(R.data.status.unknown,undefined);assert.equal({}.polluted,undefined);
});
test('old turns and duplicate messages do not regress or double-apply',()=>{
  const {R}=runtime();R.applyStatus('{"turn":10,"hp":80}');R.applyStatus('{"turn":2,"hp":20}');assert.equal(R.data.status.hp,80);
  const count=R.data.log.length;R.applyStatus('{"turn":10,"hp":80}');assert.equal(R.data.log.length,count);
});
test('regeneration restores before-state and explicit rollback restores snapshot',()=>{
  const {R}=runtime();R.applyStatus('{"turn":1,"hp":90,"cash":10}');R.applyStatus('{"turn":2,"hp":70,"cash":5}');
  R.applyStatus('{"turn":2,"hp":85}');assert.equal(R.data.status.hp,85);assert.equal(R.data.status.cash,10);
  assert.equal(R.restoreTurn(1),true);assert.equal(R.data.status.hp,90);assert.match(R.pendingResume,/resume_context/);
});
test('manual slots stay independent, preserve empty lists and require deletion confirmation',async()=>{
  const {R}=runtime();R.saveGet();R.applyStatus('{"turn":1,"hp":90,"flags":[]}');await R.saveSlot('first');const first=R.storageEnvelope().slots[0].id;
  R.applyStatus('{"turn":2,"hp":40}');await R.saveSlot('second');const second=R.storageEnvelope().slots[1].id;
  assert.equal(await R.saveSlot('third'),false);assert.equal(R.loadSlot(first),true);assert.equal(R.data.status.hp,90);assert.equal(R.data.status.flags.length,0);
  assert.equal(await R.deleteSlot(first,false),false);assert.equal(R.storageEnvelope().slots.length,2);
  assert.equal(R.loadSlot(second),true);assert.equal(R.data.status.hp,40);await R.deleteSlot(first,true);assert.equal(R.storageEnvelope().slots[0].name,'second');
});
test('SDK rejection stays visible and explicit retry preserves captured payload',async()=>{
  const e=runtime();e.R.saveGet();e.setFail(true);e.R.data.status.hp=31;assert.equal(await e.R.persist(true),false);assert.equal(e.R.storageStatus.ok,false);
  e.R.data.status.hp=99;e.setFail(false);assert.equal(await e.R.retrySave(),true);assert.equal(e.memory.a.test.auto.data.status.hp,31);
});
test('writes are serialized in invocation order',async()=>{
  const e=runtime();e.R.saveGet();const releases=[];e.sdk.save.set=(k,v)=>new Promise(resolve=>releases.push({hp:v.auto.data.status.hp,resolve}));
  e.R.data.status.hp=1;const p1=e.R.persist(true);e.R.data.status.hp=2;const p2=e.R.persist(true);await tick();assert.equal(releases.length,1);assert.equal(releases[0].hp,1);
  releases[0].resolve();await tick();assert.equal(releases.length,2);assert.equal(releases[1].hp,2);releases[1].resolve();await Promise.all([p1,p2]);
});
test('conversation change cancels debounced old writes and clears pending continuation',async()=>{
  const e=runtime();e.R.saveGet();e.R.data.status.hp=1;e.R.persist(false);e.R.pendingResume='old';e.setScope('b');e.emit('conversation:switch');
  await new Promise(r=>setTimeout(r,350));assert.equal(e.writes.length,0);assert.equal(e.R.pendingResume,'');assert.equal(e.R.data.status.hp,undefined);
});
test('unknown save version never auto-overwrites the original',async()=>{
  const e=runtime();e.memory.a.test={v:999,untouched:true};assert.equal(e.R.saveGet(),null);await e.R.persist(true);assert.equal(e.writes.length,0);assert.equal(e.memory.a.test.untouched,true);
});
test('continuation sends once after confirmation; failure retains it',async()=>{
  const e=runtime();e.R.pendingResume='[resume_context]old[/resume_context]';e.setFail(true);assert.equal(await e.R.confirmSend('行动'),false);assert.match(e.R.pendingResume,/resume_context/);
  e.setFail(false);assert.equal(await e.R.confirmSend('行动'),true);assert.equal(e.R.pendingResume,'');await e.R.confirmSend('再行动');assert.doesNotMatch(e.messages[2],/resume_context/);
});
test('rapid send is rejected while the first is pending',async()=>{
  const e=runtime();let release;e.sdk.message.send=()=>new Promise(r=>release=r);const first=e.R.confirmSend('一');await tick();assert.equal(await e.R.confirmSend('二'),false);release();assert.equal(await first,true);
});
test('free prose, Markdown, YAML and custom tags pass without style pressure',()=>{
  for(const personality of ['因为下雨，所以她留下。','## 性格\n温柔，但有底线。','身份: 守船人\n语气: 诗性','<自定义>人物设定</自定义>']){
    const r=validate({...makeCard('<style>.x{color:red}</style>'),personality});assert.equal(r.exit,0);assert.ok(!r.warnList.some(x=>/骨架|句式|AI 腔|首块|Markdown|成对标签/.test(x)));
  }
});
test('custom descriptive and Chinese field names remain usable',()=>{
  const e=runtime();e.config.status.fields.push({key:'reputation_score',type:'num'},{key:'心情',type:'text'});
  e.R.applyStatus('{"turn":1,"reputation_score":25,"心情":"平静"}');assert.equal(e.R.data.status.reputation_score,25);assert.equal(e.R.data.status['心情'],'平静');
});
test('UI model protocol is delivered separately without synthesizing a persona',()=>{
  const dir=path.join(temp,'sandbox');assert.ok(fs.existsSync(path.join(dir,'work-protocol.txt')));assert.ok(!fs.existsSync(path.join(dir,'work-persona.txt')));
  const card=JSON.parse(fs.readFileSync(path.join(dir,'work-card.json')));assert.equal(card.data.personality,'');assert.ok(card.data.character_book.entries.some(e=>e.constant&&e.content.includes('[status]')));
});
test('invalid SDK members, host CSS and cross-version calls fail',()=>{
  for(const code of ['<script>sdk.save.nonexistent()</script>','<style>.model-setting-scope{color:red}</style>','<style>[data-host="summary"]:has(p){background:url(x)}</style>','<style>[data-host="recharge"]{color:red}</style>'])assert.equal(validate(makeCard(code)).exit,1,code);
  const old=makeCard('<script>sdk.save.get("x")</script>');delete old.chatVersion;assert.equal(validate(old,['--platform','legacy']).exit,1);
  assert.equal(validate(makeCard('<style>[data-host="summary"].summary-sheet{color:red}</style>')).exit,0);
});
test('static author data attributes warn, and new-page onerror bootstrap fails',()=>{
  assert.ok(validate(makeCard('<button data-rex-action="x">x</button>')).warnList.some(x=>/data-/.test(x)));
  assert.equal(validate(makeCard('<img src="x" onerror="run()">')).exit,1);
});
test('lorebook validates decoded keywords and round-trips embedded v2 fields',()=>{
  const bad=structuredClone(book);bad.entries[0].key='123';bad.entries[0].keysecondary='{}';assert.equal(validateWorldbook(bad).errors.length,2);
  const embedded=toCharacterBook(book,'work');assert.ok(Array.isArray(embedded.entries));const round=fromCharacterBook(embedded);
  for(const k of ['content','key','keysecondary','constant','disable','order','probability','position'])assert.equal(round.entries[0][k],book.entries[0][k],k);
});
test('actual v2 build converts independent lorebook instead of assigning it',()=>{
  const src=path.join(temp,'with-book');copyTree(path.join(root,'assets/skeleton'),src);fs.writeFileSync(path.join(src,'worldbook.json'),JSON.stringify(book));
  const r=run('build.mjs',['--src',src,'--out',path.join(temp,'v2'),'--name','work']);assert.equal(r.status,0,r.stderr+r.stdout);
  const card=JSON.parse(fs.readFileSync(path.join(temp,'v2/work-card.json')));assert.ok(Array.isArray(card.data.character_book.entries));assert.deepEqual(card.data.character_book.entries[0].keys,['渡口']);
});
test('lorebook source IDs survive reorder and export validation',()=>{
  const dir=path.join(temp,'book-project');assert.equal(run('worldbook-project.mjs',['init',dir]).status,0);
  const input=write('book.json',book);assert.equal(run('worldbook-project.mjs',['import',dir,input]).status,0);
  const first=JSON.parse(fs.readFileSync(path.join(dir,'project.json'))).entries[0];
  assert.equal(run('worldbook-project.mjs',['move',dir,'--id',first,'--to','0']).status,0);
  const out=path.join(temp,'book-output.json');assert.equal(run('worldbook-project.mjs',['build',dir,'--out',out]).status,0);assert.equal(run('worldbook-project.mjs',['check',dir,'--out',out]).status,0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'project.json'))).entries[0],first);
});
test('legacy bootstrap is sandboxed, gives way to native UI and scopes storage',()=>{
  const elements=[],listeners={};let clicks=0;
  const node=()=>({style:{},children:[],setAttribute(k,v){this[k]=v;},appendChild(n){this.children.push(n);},addEventListener(){},remove(){this.removed=true;}});
  const persona={click(){clicks++;}};const doc={body:{appendChild:n=>elements.push(n)},createElement:()=>node(),querySelector:s=>s.includes('ico_persona')?persona:null,querySelectorAll:()=>[],title:'old'};
  const window={document:doc,location:{hash:'#/chat'},crypto:crypto.webcrypto,addEventListener:(n,f)=>listeners[n]=f,removeEventListener(){},REXHUDCONFIG:{frameScriptSource:'<p>UI</p>'},localStorage:{getItem:()=>null,setItem(){}}};
  vm.runInNewContext(read('assets/samelayer/host.js'),{window,document:doc,setTimeout,console});
  const host=window.REXHUDHOST;assert.equal(elements[0].children[0].sandbox,'allow-scripts');assert.equal(host.invoke('deleteMessage').reason,'not-implemented');
  assert.equal(host.invoke('storage.get').reason,'verified-scope-required');host.invoke('openPersona');assert.equal(clicks,1);assert.equal(elements[0].style.display,'none');host.reenter();assert.equal(elements[0].style.display,'block');
  window.location.hash='#/else';listeners.hashchange();assert.equal(elements[0].removed,true);assert.equal(window.REXHUDHOST,undefined);
});
