import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {renderWorldbook,parseWorldbook} from './lib/review.mjs';
const root=path.resolve(process.argv[2]),mode=process.argv[3]||'init';
const source=path.join(root,'工程/src/content'),deliver=path.join(root,'交付');
const statePath=path.join(root,'工程/review-state.json'),mapPath=path.join(root,'工程/review-map.json');
const read=p=>fs.readFileSync(p),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const bookOf=b=>JSON.parse(b.toString('utf8').replace(/^\uFEFF/,''));
const pairs={'persona.txt':'01-人设审阅.txt','opening.txt':'02-开场白审阅.txt','worldbook.json':'03-世界书审阅.md'};
const artifacts=()=>Object.fromEntries(['persona.txt','worldbook.json','regex.json'].filter(n=>fs.existsSync(path.join(deliver,n))).map(n=>[n,hash(read(path.join(deliver,n)))]));
function save(map){
 fs.writeFileSync(mapPath,JSON.stringify(map,null,2));
 fs.writeFileSync(statePath,JSON.stringify({pairs:Object.fromEntries(Object.entries(pairs).map(([n,r])=>[n,{source:hash(read(path.join(source,n))),review:hash(read(path.join(deliver,r)))}])),artifacts:artifacts()},null,2));
}
if(mode==='init'){
 const rendered=renderWorldbook(bookOf(read(path.join(source,'worldbook.json'))));
 const outputs={
  '00-使用与验收.md':'# 使用与验收\n\n旧版同层完整骨架。人设、世界书分别导入对应入口；regex.json 导入旧版正则入口。先在测试卡确认点火及原生动作。\n\n修改审阅稿后由 Agent 运行 complete-samelayer.py status/sync/build；修改意见须先落实，不能直接当成正文。构建报告见工程/builds/release-manifest.json。本地、目标站与实体设备分别验收。\n',
  '01-人设审阅.txt':read(path.join(source,'persona.txt')),
  '02-开场白审阅.txt':read(path.join(source,'opening.txt')),
  '03-世界书审阅.md':rendered.text,
 };
 for(const n of Object.keys(outputs))if(fs.existsSync(path.join(deliver,n)))throw Error('审阅稿已存在：'+n);
 for(const [n,text] of Object.entries(outputs))fs.writeFileSync(path.join(deliver,n),text);
 save(rendered.map);
}else{
 const baseline=bookOf(read(statePath)),map=bookOf(read(mapPath)),plans=[],pending=[],conflicts=[];
 const changedArtifacts=Object.entries(baseline.artifacts).filter(([n,h])=>!fs.existsSync(path.join(deliver,n))||hash(read(path.join(deliver,n)))!==h).map(([n])=>n);
 let nextMap=map;
 for(const [n,r] of Object.entries(pairs)){
  const src=read(path.join(source,n)),rev=read(path.join(deliver,r)),base=baseline.pairs[n];
  const sc=hash(src)!==base.source,rc=hash(rev)!==base.review;
  if(sc&&rc){conflicts.push(n);continue;}
  if(rc)pending.push(n);
  let updated=src;
  if(n==='worldbook.json'){
   const book=rc?parseWorldbook(rev.toString('utf8'),bookOf(src),map).book:bookOf(src);
   const rendered=renderWorldbook(book,map);nextMap=rendered.map;
   if(rc)updated=Buffer.from(JSON.stringify(book,null,2)+'\n');
   if(sc||rc)plans.push([path.join(deliver,r),rendered.text]);
  }else if(sc||rc){updated=rc?rev:src;plans.push([path.join(deliver,r),updated]);}
  if(rc)plans.push([path.join(source,n),updated]);
 }
 if(mode==='status')console.log(JSON.stringify({pendingReviews:pending,conflicts,changedArtifacts,plannedWrites:plans.length},null,2));
 else if(mode==='sync'){
  if(conflicts.length||changedArtifacts.length)throw Error('双向冲突或交付被外改：'+[...conflicts,...changedArtifacts].join(','));
  for(const [p,b] of plans)fs.writeFileSync(p,b);
  save(nextMap);console.log('审阅稿与源已同步');
 }else if(mode==='check'){
  if(conflicts.length||pending.length||plans.length||changedArtifacts.length)throw Error('构建期间源、审阅稿或交付发生变化，停止发布');
 }else if(mode==='record'){
  if(conflicts.length||pending.length||plans.length)throw Error('构建期间内容变化，未记录新基线');
  save(map);
 }else throw Error('未知操作：'+mode);
}
