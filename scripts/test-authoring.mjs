/* Behavioral regressions for restored authoring contracts. No live MMD side effects. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rex-authoring-'));
const run=(name,args)=>spawnSync(process.execPath,[path.join(root,'scripts',name),...args],{cwd:root,encoding:'utf8'});
const fields=[{key:'name',label:'姓名',type:'text',maxLength:12},{key:'job',label:'身份',type:'choice',options:['船工',{v:'行商',d:'带着货物'}]},{key:'origin',label:'起点',type:'choice',source:'map.nodes'},{key:'note',label:'补充',type:'text',optional:true,maxLength:20}];
// Build the actual published package first; the VM runs the emitted view/scenes modules.
const src=path.join(temp,'src'),out=path.join(temp,'out');
fs.cpSync(path.join(root,'assets/skeleton'),src,{recursive:true});
const config=JSON.parse(fs.readFileSync(path.join(src,'content.json'),'utf8'));
config.meta.name='authoring';config.player.fields=fields;config.map.nodes=[{id:'dock',name:'渡口',x:18,y:62,links:[]}];
fs.writeFileSync(path.join(src,'content.json'),JSON.stringify(config));
const built=run('build.mjs',['--src',src,'--out',out,'--name','authoring']);
assert.equal(built.status,0,built.stderr+built.stdout);
const card=JSON.parse(fs.readFileSync(path.join(out,'authoring-regex.json')));
const script=name=>card.regex_scripts.find(r=>r.scriptName===name).replaceString.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
function env(features={cover:true,forge:true},saved=false){
  const calls={go:[],drafts:[],closed:0,refresh:0,persist:0,messages:[],toasts:[]},scenes={};
  const content=structuredClone(config);content.features=features;
  const sdk={input:{set:t=>{calls.drafts.push(t);},focus(){}},message:{send:t=>calls.messages.push(t)}};
  const R={state:{forge:{},nav:'world'},data:{player:{},status:{},map:{},npcs:{},bag:[]},
    esc:String,content:()=>content,sdkGet:()=>sdk,scene:(id,def)=>scenes[id]=def,log(){},
    toast:t=>calls.toasts.push(t),sections:{world:{}},order:['world']};
  const context={window:{__REX__:R,__REX_CONTENT__:content},document:{},setTimeout,clearTimeout,console,confirm:()=>true};
  vm.runInNewContext(script('rex-view'),context);
  vm.runInNewContext(script('rex-scene'),context);
  Object.assign(R,{go:id=>calls.go.push(id),closeStage:()=>calls.closed++,stageVisible:()=>false,
    refresh:()=>calls.refresh++,slots:()=>({root:{},hdr:{}}),buildArmature:()=>true,metrics(){},
    saveGet:()=>saved?{data:{}}:null,applySave:()=>saved,persist:()=>calls.persist++});
  return {R,calls,scenes,sdk,content};
}
function controlNode(){
  const handlers={},button={disabled:true},tip={textContent:''};
  return {handlers,button,tip,node:{addEventListener:(type,fn)=>handlers[type]=fn,
    querySelector:s=>s.includes('enter')?button:tip}};
}
test('all four opening combinations route through the published code',()=>{
  for(const cover of [false,true])for(const forge of [false,true]){
    const e=env({cover,forge});e.R.boot();
    assert.deepEqual(e.calls.go,cover?['cover']:forge?['forge']:[]);
    if(cover){
      const n=controlNode();e.scenes.cover.after(e.R,n.node);
      n.handlers.click({target:{closest:()=>({getAttribute:k=>k==='data-act'?'start':null})}});
      assert.equal(e.calls.go.at(-1),forge?'forge':'cover');
      if(!forge)assert.ok(e.calls.closed>0&&e.calls.refresh>0);
    }
  }
});
test('valid saves bypass cover and creation for every opening combination',()=>{
  for(const cover of [false,true])for(const forge of [false,true]){
    const e=env({cover,forge},true);e.R.boot();assert.deepEqual(e.calls.go,[]);assert.ok(e.calls.refresh);
  }
});
test('required text whitespace keeps button disabled; valid selections enable it',()=>{
  const e=env(),n=controlNode();e.R.state.forge={name:'  ',job:'船工',origin:'渡口'};
  e.scenes.forge.after(e.R,n.node);assert.equal(n.button.disabled,true);assert.match(n.tip.textContent,/姓名/);
  n.handlers.input({target:{getAttribute:()=> 'name',value:' 林舟 '}});
  assert.equal(n.button.disabled,false);assert.equal(e.R.validateForge().values.name,'林舟');
});
test('programmatic commit cannot bypass required text, length or choice validation',async()=>{
  const invalid=[{name:'',job:'船工',origin:'渡口'},{name:'林'.repeat(13),job:'船工',origin:'渡口'},
    {name:'林舟',job:'不存在',origin:'渡口'},{name:'林舟',job:'船工',origin:'不存在'},
    {name:'林舟',job:'船工',origin:'渡口',note:'长'.repeat(21)}];
  for(const values of invalid){
    const e=env();e.R.state.forge=values;
    assert.equal(await e.R.commitForge(),false);assert.equal(e.calls.drafts.length,0);
    assert.equal(e.calls.persist,0);assert.equal(e.calls.closed,0);assert.deepEqual(e.R.data.player,{});
  }
});
test('defaults and optional empty fields become one editable draft without sending',async()=>{
  const e=env();e.content.player.fields[0].default='林舟';
  e.R.state.forge={job:'行商',origin:'渡口',note:''};
  e.content.status.fields.push({key:'cash',type:'num',init:12},{key:'tags',type:'tags'});
  assert.equal(e.R.validateForge().errors.length,0);
  assert.equal(await e.R.commitForge(),true);assert.equal(e.calls.drafts.length,1);
  assert.match(e.calls.drafts[0],/姓名：林舟/);assert.doesNotMatch(e.calls.drafts[0],/补充：/);
  assert.equal(e.calls.messages.length,0);assert.equal(e.R.data.status.cash,12);
  assert.equal(Array.isArray(e.R.data.status.tags),true);assert.equal(e.R.data.map.at,'渡口');
});
test('SDK draft rejection retains creation state and can be retried without fake completion',async()=>{
  const e=env();e.R.state.forge={name:'林舟',job:'船工',origin:'渡口'};
  e.sdk.input.set=()=>Promise.reject(Error('NOT_SUPPORTED'));
  assert.equal(await e.R.commitForge(),false);assert.equal(e.calls.closed,0);assert.equal(e.calls.persist,0);
  assert.match(e.R.state.creationDraft,/林舟/);assert.equal(e.R.state.forge.job,'船工');
  e.sdk.input.set=t=>e.calls.drafts.push(t);
  assert.equal(await e.R.commitForge(),true);assert.equal(e.calls.closed,1);
});
test('simultaneous creation commits write one draft and persist once',async()=>{
  const e=env();e.R.state.forge={name:'林舟',job:'船工',origin:'渡口'};let release;
  e.sdk.input.set=t=>{e.calls.drafts.push(t);return new Promise(r=>release=r);};
  const first=e.R.commitForge();assert.equal(await e.R.commitForge(),false);release();
  assert.equal(await first,true);assert.equal(e.calls.drafts.length,1);assert.equal(e.calls.persist,1);
});
test('back without cover closes creation and keeps selections for later return',()=>{
  const e=env({cover:false,forge:true}),n=controlNode();e.R.state.forge.name='林舟';
  e.scenes.forge.after(e.R,n.node);
  n.handlers.click({target:{closest:s=>s==='.rex-pick'?null:{getAttribute:()=> 'back'}}});
  assert.deepEqual(e.calls.go,[]);assert.equal(e.calls.closed,1);assert.equal(e.R.state.forge.name,'林舟');
});
test('raw exports preserve order and localized opening and pass route validators',()=>{
  for(const version of [0,1]){
    const role=path.join(temp,'role-'+version+'.json'),regexp=path.join(temp,'regexp.json');
    const dest=path.join(temp,'export-'+version+'.json'),persona=path.join(temp,'persona-'+version+'.txt');
    fs.writeFileSync(role,JSON.stringify({chatVersion:version,beginning:'old',beginningZh:'中文开场',personalityZh:'守船人{{user}}'}));
    fs.writeFileSync(regexp,JSON.stringify([{regexSort:2,name:'second',regex:'/beta/',content:'<style>.b{color:red}</style>'},
      {regexSort:1,name:'first',regex:'/alpha/',content:'<style>.a{color:red}</style>'}]));
    const result=run('export-raw.mjs',['--role',role,'--regexp',regexp,'--out',dest,'--personality','--persona-out',persona]);
    assert.equal(result.status,0,result.stderr+result.stdout);
    const c=JSON.parse(fs.readFileSync(dest));assert.equal(c.beginning,'中文开场');
    assert.deepEqual(c.regex_scripts.map(r=>r.scriptName),['first','second']);
    assert.deepEqual(c.regex_scripts.map(r=>r.id),version===0?[-1,-1]:[-1,-2]);
    if(version===0)assert.deepEqual(Object.keys(c).sort(),['beginning','pageDepth','regex_scripts','statusbar']);
    else assert.equal(c.chatVersion,1);
    assert.equal(fs.readFileSync(persona,'utf8'),'守船人{{user}}');
    const checked=run('validate.mjs',[dest,'--platform',version===0?'legacy':'sandbox']);assert.equal(checked.status,0,checked.stdout);
  }
});
test('custom module documentation example builds and exposes its configured content',()=>{
  const custom=path.join(temp,'custom');fs.cpSync(src,custom,{recursive:true});
  const guide=fs.readFileSync(path.join(root,'references/40-界面-卡架构.md'),'utf8');
  const code=guide.match(/```js\n([\s\S]*?)\n```/)[1];fs.writeFileSync(path.join(custom,'quests.js'),code);
  const modules=JSON.parse(fs.readFileSync(path.join(custom,'modules.json')));modules.push({name:'rex-quests',file:'quests.js',kind:'js'});
  fs.writeFileSync(path.join(custom,'modules.json'),JSON.stringify(modules));
  const cfg=structuredClone(config);cfg.quests=[{id:'q1',title:'一封信',note:'找到信的收件人<script>'}];
  fs.writeFileSync(path.join(custom,'content.json'),JSON.stringify(cfg));
  const result=run('build.mjs',['--src',custom,'--out',path.join(temp,'custom-out'),'--name','custom']);assert.equal(result.status,0,result.stderr+result.stdout);
  const release=JSON.parse(fs.readFileSync(path.join(temp,'custom-out/custom-regex.json')));
  const compiled=release.regex_scripts.find(r=>r.scriptName==='rex-quests').replaceString.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  let def;vm.runInNewContext(compiled,{window:{__REX__:{section:(_,d)=>def=d}}});
  const mock={content:()=>cfg,esc:s=>s.replaceAll('<','&lt;').replaceAll('>','&gt;'),ui:{empty:()=> 'empty'}};
  assert.equal(def.brief(mock)[0].head,'一封信');assert.match(def.detail(mock,'q1'),/&lt;script&gt;/);assert.equal(def.detail(mock,'missing'),'empty');
  const checked=run('validate.mjs',[path.join(temp,'custom-out/custom-regex.json'),'--platform','sandbox']);assert.equal(checked.status,0,checked.stdout);
});
// Keep temp artifacts inspectable after a failure; no recursive deletion or live browser mutation here.
