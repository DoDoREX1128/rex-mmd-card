/* Workspace contracts: observable files, actual route builds, and edit/metadata preservation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {renderWorldbook,parseWorldbook,REVIEW_FILES} from './lib/review.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rex-project-'));
let count=0;
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const put=(p,value)=>fs.writeFileSync(p,typeof value==='string'?value:JSON.stringify(value,null,2));
const run=(cmd,dir,args=[])=>spawnSync(process.execPath,[path.join(root,'scripts/project.mjs'),cmd,dir,...args],{cwd:root,encoding:'utf8'});
function ok(result){assert.equal(result.status,0,result.stderr+result.stdout);return JSON.parse(result.stdout);}
function project(route='sandbox'){
  const dir=path.join(tmp,'卡片-'+(++count));ok(run('init',dir,['--route',route,'--name','river','--title','渡口来信']));
  return {dir,user:path.join(dir,'交付'),src:path.join(dir,'工程/src'),state:path.join(dir,'工程/project.json')};
}
const entry=(uid,title,content)=>({uid,comment:title,content,disable:false,constant:true,key:'[]',keysecondary:'[]',probability:'100.00',position:4,role:0,depth:6,order:900,selective:true,sourceOnly:{id:'keep-'+uid,values:[0,false,'']}});
const book=()=>({entries:{0:entry(7,'渡口规矩','  渡口每晚只放一班船。\n\n### 人物所知\n船期只有行会知道。\n '),1:{...entry(25,'铜牌','铜牌属于十年前失约的人。'),constant:false,disable:true,key:JSON.stringify(['铜牌','信,封','“旧友”']),keysecondary:'["守船人"]',probability:'72.50'}}});
test('review Markdown round-trips content whitespace, stable UIDs and private import metadata',()=>{
  const original=book();Object.defineProperty(original.entries,'__proto__',{value:entry(99,'特殊源键','特殊源键也不应静默丢条目。'),enumerable:true});
  const render=renderWorldbook(original),result=parseWorldbook(render.text,original,render.map);
  assert.deepEqual(result.book,original);
  assert.match(render.text,/## 全书概览/);assert.match(render.text,/## 条目目录/);assert.match(render.text,/### 设定正文/);
  assert.doesNotMatch(render.text,/sourceOnly|"entries"|sdk\.|regex_scripts/);
  assert.equal(Object.hasOwn(result.book.entries,'__proto__'),true);assert.equal(result.book.entries.__proto__.uid,99);
});
test('review edits retain hidden metadata and keywords containing punctuation',()=>{
  const original=book(),r=renderWorldbook(original);
  const changed=r.text.replace('## 条目 W0001｜渡口规矩','## 条目 W0001｜新船期').replace('渡口每晚只放一班船。','渡口每晚放两班船。');
  const result=parseWorldbook(changed,original,r.map).book;
  assert.equal(result.entries[0].comment,'新船期');assert.match(result.entries[0].content,/两班船/);
  assert.deepEqual(result.entries[0].sourceOnly,original.entries[0].sourceOnly);
  assert.equal(result.entries[0].uid,7);assert.equal(result.entries[0].depth,6);
  assert.equal(result.entries[1].key,original.entries[1].key);assert.equal(result.entries[1].disable,true);
});
test('review notes are never treated as lore content and stop synchronization',()=>{
  const original=book(),r=renderWorldbook(original);
  assert.throws(()=>parseWorldbook(r.text.replace('### 修改意见（不进入成品）\n','### 修改意见（不进入成品）\n请把船期改到黎明。'),original,r.map),/待处理/);
  assert.throws(()=>parseWorldbook(r.text+'请调整全书节奏。\n',original,r.map),/全书修改意见/);
});
test('malformed, duplicate, unknown or ambiguous review structures fail instead of dropping content',()=>{
  const original=book(),r=renderWorldbook(original);
  for(const changed of [r.text.replace('W0001｜','W0002｜'),r.text.replace('W0001｜','W9999｜'),r.text.replace('### 主触发词','### 关键词改了'),r.text.replace('- 启用：是','- 启用：随便'),r.text.replace('### 设定正文','### 设定正文\n\n### 设定正文')]){
    assert.throws(()=>parseWorldbook(changed,original,r.map));
  }
});
test('deletions require a deliberate option and new entries preserve existing identities',()=>{
  const original=book(),r=renderWorldbook(original),start=r.text.indexOf('## 条目 W0002｜'),end=r.text.indexOf('## 全书修改意见');
  const removed=r.text.slice(0,start)+r.text.slice(end);
  assert.throws(()=>parseWorldbook(removed,original,r.map),/allow-delete/);
  const result=parseWorldbook(removed,original,r.map,{allowDelete:true});assert.equal(result.book.entries[0].uid,7);assert.equal(Object.keys(result.book.entries).length,1);
  const add='## 条目 新增｜船坞\n\n- 启用：是\n- 注入方式：关键词触发\n- 触发概率：100%\n\n### 主触发词\n\n- 船坞\n\n### 次级触发词\n\n（无）\n\n### 设定正文\n\n船坞正在修船。\n\n### 修改意见（不进入成品）\n\n';
  const added=parseWorldbook(r.text.replace('## 全书修改意见',add+'## 全书修改意见'),original,r.map).book;
  assert.equal(added.entries[2].uid,26);assert.equal(added.entries[0].uid,7);assert.equal(added.entries[1].uid,25);
});
test('all three routes initialize the same seven-file user area and private engineering folders',()=>{
  for(const route of ['sandbox','native','same']){
    const p=project(route),files=fs.readdirSync(p.user).sort();
    assert.deepEqual(fs.readdirSync(p.dir).sort(),['交付','工程']);
    assert.deepEqual(files,['00-使用与验收.md',...Object.values(REVIEW_FILES),'persona.txt','regex.json','worldbook.json'].sort());
    const regex=json(path.join(p.user,'regex.json'));assert.equal('chatVersion' in regex,route==='sandbox');assert.deepEqual(json(path.join(p.user,'worldbook.json')),{entries:{}});
    for(const folder of ['src','builds','history','reports'])assert.equal(fs.statSync(path.join(p.dir,'工程',folder)).isDirectory(),true);
    assert.equal(ok(run('status',p.dir)).needsBuild,true);assert.match(read(path.join(p.user,'00-使用与验收.md')),/空白草稿/);
  }
});
test('init never overwrites an existing project or unrelated user directory',()=>{
  const p=project(),state=read(p.state);assert.notEqual(run('init',p.dir,['--route','native']).status,0);assert.equal(read(p.state),state);
  const dir=path.join(tmp,'已有资料');fs.mkdirSync(dir);put(path.join(dir,'keep.txt'),'保留');
  assert.notEqual(run('init',dir,['--route','same']).status,0);assert.equal(read(path.join(dir,'keep.txt')),'保留');assert.deepEqual(fs.readdirSync(dir),['keep.txt']);
});
test('human edits actually reach persona/opening and worldbook exports through all route builders',()=>{
  for(const route of ['sandbox','native','same']){
    const p=project(route);put(path.join(p.user,REVIEW_FILES.persona),'林舟在渡口看船，与{{user}}互不相识。');put(path.join(p.user,REVIEW_FILES.opening),'一封没有署名的信被放到你面前。');put(path.join(p.src,'worldbook.json'),book());
    const result=ok(run('build',p.dir));assert.equal(result.evidence,'E2');
    assert.equal(read(path.join(p.user,'persona.txt')),'林舟在渡口看船，与{{user}}互不相识。');
    const regex=json(path.join(p.user,'regex.json')),exported=json(path.join(p.user,'worldbook.json'));
    assert.ok(regex.beginning.includes('一封没有署名的信'));assert.equal('chatVersion' in regex,route==='sandbox');
    if(route!=='sandbox')assert.ok(regex.regex_scripts.every(r=>r.id===-1));
    assert.equal(exported.entries[0].uid,7);assert.deepEqual(exported.entries[0].sourceOnly,book().entries[0].sourceOnly);
    assert.match(read(path.join(p.user,REVIEW_FILES.worldbook)),/## 条目 W0001｜渡口规矩/);
    assert.equal(ok(run('status',p.dir)).needsBuild,false);
    const changed=read(path.join(p.user,REVIEW_FILES.worldbook)).replace('渡口每晚只放一班船。','渡口每晚放两班船。');put(path.join(p.user,REVIEW_FILES.worldbook),changed);
    ok(run('build',p.dir));assert.match(json(path.join(p.user,'worldbook.json')).entries[0].content,/两班船/);
    assert.equal(json(path.join(p.src,'worldbook.json')).entries[1].disable,true);
  }
});
test('a later conflict leaves every earlier planned file and synchronization state untouched',()=>{
  const p=project();put(path.join(p.user,REVIEW_FILES.persona),'用户修改的人设');put(path.join(p.user,REVIEW_FILES.opening),'用户开场');put(path.join(p.src,'opening.txt'),'Agent开场');
  const state=read(p.state),personaSource=read(path.join(p.src,'persona.txt'));
  const result=run('sync',p.dir);assert.notEqual(result.status,0);assert.match(result.stderr,/同时变化/);
  assert.equal(read(p.state),state);assert.equal(read(path.join(p.src,'persona.txt')),personaSource);assert.equal(read(path.join(p.user,REVIEW_FILES.persona)),'用户修改的人设');
  ok(run('sync',p.dir,['--resolve','opening=review']));assert.equal(read(path.join(p.src,'opening.txt')),'用户开场');assert.equal(read(path.join(p.src,'persona.txt')),'用户修改的人设');
  assert.ok(fs.readdirSync(path.join(p.dir,'工程/history')).length>0);
});
test('pending book comments cannot partially overwrite persona sources or last valid exports',()=>{
  const p=project();put(path.join(p.src,'worldbook.json'),book());ok(run('build',p.dir));
  const state=read(p.state),persona=read(path.join(p.src,'persona.txt')),exports=read(path.join(p.user,'regex.json'));
  put(path.join(p.user,REVIEW_FILES.persona),'准备修改的人设');
  put(path.join(p.user,REVIEW_FILES.worldbook),read(path.join(p.user,REVIEW_FILES.worldbook))+'这里增加一条全书意见。');
  const r=run('build',p.dir);assert.notEqual(r.status,0);assert.match(r.stderr,/待处理/);
  assert.equal(read(p.state),state);assert.equal(read(path.join(p.src,'persona.txt')),persona);assert.equal(read(path.join(p.user,'regex.json')),exports);
});
test('Agent-only content changes refresh review text, while manual artifact changes are protected',()=>{
  const p=project();put(path.join(p.src,'persona.txt'),'新的设定与{{user}}');ok(run('sync',p.dir));assert.equal(read(path.join(p.user,REVIEW_FILES.persona)),'新的设定与{{user}}');ok(run('build',p.dir));
  put(path.join(p.user,'persona.txt'),'外部直接改了导入版');
  const r=run('build',p.dir);assert.notEqual(r.status,0);assert.match(r.stderr,/外部改动/);assert.equal(read(path.join(p.user,'persona.txt')),'外部直接改了导入版');
  assert.notEqual(run('build',p.dir,['--replace-artifacts','false']).status,0);assert.equal(read(path.join(p.user,'persona.txt')),'外部直接改了导入版');
  ok(run('build',p.dir,['--replace-artifacts']));assert.equal(read(path.join(p.user,'persona.txt')),'新的设定与{{user}}');
});
test('invalid source builds retain all last successful import artifacts',()=>{
  const p=project();ok(run('build',p.dir));const before=Object.fromEntries(['persona.txt','regex.json','worldbook.json'].map(f=>[f,read(path.join(p.user,f))]));
  const config=path.join(p.src,'content.json'),c=json(config);c.meta.opening='绕开统一开场源';put(config,c);
  const r=run('build',p.dir);assert.notEqual(r.status,0);assert.match(r.stderr,/opening/);
  for(const [f,body]of Object.entries(before))assert.equal(read(path.join(p.user,f)),body);
  assert.match(read(path.join(p.user,'00-使用与验收.md')),/本次生成未完成/);
  assert.equal(ok(run('status',p.dir)).needsBuild,true);
});
