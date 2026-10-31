/* Project workspace: user delivery/review and Agent engineering, with guarded synchronization. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseArgs} from './lib/facts.mjs';
import {validateWorldbook} from './lib/worldbook.mjs';
import {REVIEW_FILES,normalize,renderWorldbook,parseWorldbook} from './lib/review.mjs';
import {copyTree} from './lib/fsx.mjs';

const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {positional,opts}=parseArgs(process.argv),command=positional[0];
if(!['init','sync','build','status'].includes(command)||!positional[1]){
  console.error('用法: node scripts/project.mjs init|sync|build|status <项目目录> [--route sandbox|native|same] [--name slug] [--title 卡名]');process.exit(2);
}
const root=path.resolve(positional[1]),at=(...parts)=>path.join(root,...parts);
const deliver=at('交付'),eng=at('工程'),src=at('工程','src'),statePath=at('工程','project.json');
const SOURCES={persona:'persona.txt',opening:'opening.txt',worldbook:'worldbook.json'};
const ARTIFACTS=['persona.txt','regex.json','worldbook.json'];
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex');
const text=p=>normalize(fs.readFileSync(p,'utf8'));
function guard(p){
  const rel=path.relative(root,p);if(path.isAbsolute(rel)||rel==='..'||rel.startsWith('..'+path.sep))throw Error('路径超出项目');
  let current=root;
  for(const segment of ['',...rel.split(path.sep).filter(Boolean)]){
    if(segment)current=path.join(current,segment);
    if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('项目路径含符号链接，未写入：'+current);
  }
}
function atomic(p,body){guard(p);fs.mkdirSync(path.dirname(p),{recursive:true});const tmp=p+'.rex-'+crypto.randomUUID()+'.tmp';fs.writeFileSync(tmp,body,'utf8');fs.renameSync(tmp,p);}
function snapshot(paths,reason){
  const existing=paths.filter(p=>fs.existsSync(p));if(!existing.length)return;
  const dir=at('工程','history',stamp());fs.mkdirSync(dir,{recursive:true});
  for(const p of existing){guard(p);const target=path.join(dir,path.relative(root,p));fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(p,target);}
  fs.writeFileSync(path.join(dir,'原因.txt'),reason+'\n','utf8');
}
function sourceValue(kind){const raw=text(path.join(src,SOURCES[kind]));return kind==='worldbook'?JSON.parse(raw):raw;}
const valueHash=value=>sha(typeof value==='string'?value:JSON.stringify(value));
function saveState(s){atomic(statePath,json(s));}
function load(){
  guard(statePath);const s=JSON.parse(text(statePath));
  if(s.v!==1||!['sandbox','native','same'].includes(s.route)||!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(s.name)||!s.base||!s.worldbookMap)throw Error('工程/project.json不完整或不受支持');
  for(const kind of Object.keys(REVIEW_FILES)){guard(path.join(src,SOURCES[kind]));guard(path.join(deliver,REVIEW_FILES[kind]));}
  return s;
}
function readme(s,message){
  const zone=s.timezone||'UTC';
  const displayTime=s.lastBuild?new Intl.DateTimeFormat('zh-CN',{timeZone:zone,dateStyle:'medium',timeStyle:'medium',hour12:false}).format(new Date(s.lastBuild.at))+'（'+zone+'）':'';
  const route={sandbox:'新版沙盒卡',native:'旧版原生卡',same:'旧版同层卡'}[s.route];
  const imported=s.lastBuild?`上次生成时间：${displayTime}\n\n已完成静态检查。本工具未执行本地体验、真实 MMD 或实体手机测试；Agent 如另行实测，应在本页补充结果与范围。`:'尚未完成首次构建。导入文件目前是空白草稿，请先完成内容并交给 Agent 生成。';
  return `# ${s.title} · 使用与验收\n\n你只需查看这个“交付”文件夹。修改下面三份审阅稿即可，工程文件由 Agent 维护。\n\n## 当前情况\n\n${message}\n\n制作路线：${route}。\n\n${imported}\n\n本页记录上次生成情况；你修改审阅稿后，请交给 Agent 同步并重新生成，再使用导入文件。\n\n## 你可以直接修改\n\n| 文件 | 用途 |\n|---|---|\n| [01-人设审阅.txt](01-人设审阅.txt) | 改人物设定、关系、语言与文风，保留你喜欢的结构 |\n| [02-开场白审阅.txt](02-开场白审阅.txt) | 改进入对话时的第一段内容 |\n| [03-世界书审阅.md](03-世界书审阅.md) | 按目录逐条检查标题、触发方式、关键词与设定正文；也可写修改意见 |\n\n世界书的修改意见不会混进设定正文，Agent 处理后才更新导入版。目录与统计不用自己维护。界面连接由 Agent 处理，审阅稿以创作内容为主。\n\n## 用于导入的文件\n\n| 文件 | 用途 |\n|---|---|\n| persona.txt | 角色人设，可复制到角色人设栏 |\n| regex.json | 该路线的正则与界面导入文件，不需要手改代码 |\n| worldbook.json | 世界书导入文件；不需要世界书时可为空书 |\n\n${s.route==='sandbox'?'新版导入时新建卡，并在首次保存前选择“使用新版聊天页”；正则导入不会代贴人设。':'在旧版聊天页使用这份产物，不要用新版沙盒入口替换运行环境。'}人设、正则和世界书按各自入口使用。若 Agent 另外提供整卡 PNG，按其导入说明操作。\n\n## 建议怎么验收\n\n- 人物是否符合你的设定与文风，开场是否能接话。\n- 世界书是否缺条目、触发词是否好理解、常驻与按需设定是否安排合理。\n- 有界面时直接体验按钮、返回、输入与存档；不需要阅读实现。\n- 修改后告诉 Agent“按审阅稿同步并重新生成”，遇到冲突先核对，不覆盖你的稿件。\n`;
}
function treeHash(){
  const files=[];
  function walk(dir){guard(dir);for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,e.name);guard(p);if(e.isDirectory())walk(p);else files.push([path.relative(src,p).replaceAll('\\','/'),sha(fs.readFileSync(p))]);}}
  walk(src);return sha(JSON.stringify(files));
}
function status(s){
  const changed={};
  for(const kind of Object.keys(REVIEW_FILES))changed[kind]={source:valueHash(sourceValue(kind))!==s.base[kind].source,review:sha(text(path.join(deliver,REVIEW_FILES[kind])))!==s.base[kind].review};
  const artifactsChanged=ARTIFACTS.filter(f=>!fs.existsSync(path.join(deliver,f))||sha(fs.readFileSync(path.join(deliver,f)))!==s.artifacts[f]);
  return {route:s.route,title:s.title,changed,artifactsChanged,needsBuild:!s.lastBuild||treeHash()!==s.lastBuild.sourceHash||Object.values(changed).some(x=>x.source||x.review),lastBuild:s.lastBuild||null};
}
function synchronize(s){
  const choices={};
  if(opts.resolve){for(const choice of String(opts.resolve).split(',')){
    const match=/^(persona|opening|worldbook)=(source|review)$/.exec(choice);
    if(!match||choices[match[1]])throw Error('--resolve格式为persona=source,opening=review,worldbook=source，不接受未知或重复项');choices[match[1]]=match[2];
  }}
  const plans=[],next=structuredClone(s);
  for(const kind of Object.keys(REVIEW_FILES)){
    const value=sourceValue(kind),review=text(path.join(deliver,REVIEW_FILES[kind]));
    const sc=valueHash(value)!==s.base[kind].source,rc=sha(review)!==s.base[kind].review;
    if(sc&&rc&&!choices[kind])throw Error(kind+'审阅稿与源内容同时变化；请先核对，未覆盖任意一方。核对后可--resolve '+kind+'=source或'+kind+'=review');
    const direction=sc&&rc?choices[kind]:rc?'review':sc?'source':null;
    let result=value,rendered=review;
    if(kind==='worldbook'){
      if(direction==='review')result=parseWorldbook(review,s.worldbookBase,s.worldbookMap,{allowDelete:opts['allow-delete']===true}).book;
      else if(direction==='source'){const check=validateWorldbook(value);if(check.errors.length)throw Error(check.errors.join('\n'));}
      if(direction){const r=renderWorldbook(result,s.worldbookMap);rendered=r.text;next.worldbookMap=r.map;next.worldbookBase=result;}
    }else if(direction==='review')result=review;
    else if(direction==='source')rendered=value;
    if(direction){
      plans.push({kind,source:typeof result==='string'?result:json(result),review:rendered,direction});
      next.base[kind]={source:valueHash(result),review:sha(rendered)};
    }
  }
  // All parsing/conflict checks finish before any source, review or state write.
  if(plans.length){
    snapshot([statePath,...plans.flatMap(p=>[path.join(src,SOURCES[p.kind]),path.join(deliver,REVIEW_FILES[p.kind])])],'同步前备份；'+plans.map(p=>p.kind+' ← '+p.direction).join('；'));
    for(const p of plans){atomic(path.join(src,SOURCES[p.kind]),p.source);atomic(path.join(deliver,REVIEW_FILES[p.kind]),p.review);}
    saveState(next);atomic(path.join(deliver,'00-使用与验收.md'),readme(next,'审阅内容已同步，导入文件待重新生成。'));
  }
  return {state:next,synced:plans.map(p=>({kind:p.kind,from:p.direction}))};
}
function tool(script,args,log){
  const r=spawnSync(process.execPath,[path.join(skill,'scripts',script),...args],{cwd:skill,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
  log.push({tool:script,args,exit:r.status,stdout:r.stdout||'',stderr:r.stderr||''});
  if(r.status!==0)throw Error(script+'失败：'+(r.stderr||r.stdout||r.error?.message));return r;
}
function init(){
  if(!['sandbox','native','same'].includes(opts.route))throw Error('新项目必须指定--route sandbox|native|same');
  const timezone=String(opts.timezone||'UTC');new Intl.DateTimeFormat('zh-CN',{timeZone:timezone}).format(new Date());
  const name=String(opts.name||'card');if(!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(name))throw Error('name需为安全的英文短名，中文作品名用--title');
  if(fs.existsSync(root)&&(!fs.statSync(root).isDirectory()||fs.readdirSync(root).length))throw Error('目标项目目录非空；不会覆盖已有项目。请指定新目录，已有工程另行迁移');
  guard(root);fs.mkdirSync(src,{recursive:true});fs.mkdirSync(deliver,{recursive:true});
  const log=[];tool('init.mjs',['--route',opts.route,'--out',src],log);
  if(opts.route==='sandbox'){
    const p=path.join(src,'content.json'),c=JSON.parse(text(p));c.meta={...c.meta,name,title:String(opts.title||path.basename(root)),opening:''};atomic(p,json(c));
  }else if(opts.route==='native'){
    const p=path.join(src,'card.config.json'),c=JSON.parse(text(p));c.beginning='';atomic(p,json(c));
  }
  const book={entries:{}},rendered=renderWorldbook(book),s={v:1,name,timezone,title:String(opts.title||path.basename(root)),route:opts.route,base:{},worldbookMap:rendered.map,worldbookBase:book,artifacts:{}};
  for(const [kind,value]of Object.entries({persona:'',opening:'',worldbook:book})){
    const review=kind==='worldbook'?rendered.text:value;
    atomic(path.join(src,SOURCES[kind]),typeof value==='string'?value:json(value));atomic(path.join(deliver,REVIEW_FILES[kind]),review);
    s.base[kind]={source:valueHash(value),review:sha(review)};
  }
  const empty={...(s.route==='sandbox'?{chatVersion:1}:{}),pageDepth:2,statusbar:'',beginning:'',regex_scripts:[]};
  const drafts={'persona.txt':'','regex.json':json(empty),'worldbook.json':json(book)};
  for(const [f,body]of Object.entries(drafts)){atomic(path.join(deliver,f),body);s.artifacts[f]=sha(body);}
  fs.mkdirSync(at('工程','reports'),{recursive:true});fs.mkdirSync(at('工程','builds'),{recursive:true});fs.mkdirSync(at('工程','history'),{recursive:true});
  atomic(at('工程','工作说明.md'),`# Agent工程区\n\n路线：${s.route}；构建短名：${s.name}。用户只需要交付文件夹。\n\n- src是源码，persona.txt、opening.txt、worldbook.json对应三份审阅稿。开场白只在opening.txt维护；构建时投影到各路线入口。\n- 先运行project status，再sync，处理冲突/修改意见后build。同步状态在project.json，旧稿在history，构建与报告分别在builds/reports。\n- 不直接覆盖交付里的审阅稿，不把regex改动当作已改源码。不要复制skill目录成为项目工作区。\n- 用户已有文件默认保留；此工具的init只接受空目录。纯人设或局部修复不强制新建整卡工程。\n`);
  atomic(at('工程','任务记录.md'),'# 任务与验收记录\n\n## 已确定\n\n## 待完成\n\n## 关键决策\n\n## 已验证与未验证\n\n- 已初始化工作区；未构建，未进行目标站或实机测试。\n');
  saveState(s);atomic(path.join(deliver,'00-使用与验收.md'),readme(s,'初始草稿，等待创作。'));
  console.log(json({project:root,delivery:deliver,route:s.route,status:'initialized-draft'}));
}
function build(s){
  const synced=synchronize(s);s=synced.state;
  const current=status(s);
  if(current.artifactsChanged.length&&!opts['replace-artifacts'])throw Error('导入文件被外部改动：'+current.artifactsChanged.join('、')+'。先核对来源，确认覆盖时用--replace-artifacts；旧文件会备份');
  const beforeArtifacts=ARTIFACTS.map(f=>{const p=path.join(deliver,f);return fs.existsSync(p)?sha(fs.readFileSync(p)):null;});
  const run=stamp(),dir=at('工程','builds',run),stage=path.join(dir,'src'),out=path.join(dir,'out'),log=[];
  const guardHash=sha(JSON.stringify({source:treeHash(),review:Object.fromEntries(Object.entries(REVIEW_FILES).map(([k,f])=>[k,sha(text(path.join(deliver,f)))]))}));
  fs.mkdirSync(dir,{recursive:true});copyTree(src,stage);
  const opening=sourceValue('opening');
  try{
    if(s.route==='sandbox'){
      const p=path.join(stage,'content.json'),c=JSON.parse(text(p));
      if(c.meta?.opening&&c.meta.opening!==opening)throw Error('content.meta.opening与opening.txt不一致，请先统一开场白源，未静默覆盖');
      c.meta={...c.meta,opening};fs.writeFileSync(p,json(c));
      tool('build.mjs',['--route','sandbox','--src',stage,'--out',out,'--name',s.name],log);
    }else if(s.route==='native'){
      const p=path.join(stage,'card.config.json'),c=JSON.parse(text(p));
      if(c.beginning&&c.beginning!==opening)throw Error('card.config.beginning与opening.txt不一致，请先统一开场白源');
      c.beginning=opening;fs.writeFileSync(p,json(c));tool('build.mjs',['--route','native','--src',stage,'--out',out,'--name',s.name],log);
    }else{
      tool('pack-samelayer.mjs',['--host',path.join(stage,'host.js'),'--frame',path.join(stage,'frame.html'),'--opening',path.join(stage,'opening.txt'),'--persona',path.join(stage,'persona.txt'),'--worldbook',path.join(stage,'worldbook.json'),'--out',out,'--name',s.name],log);
    }
    const regex=path.join(out,s.name+'-regex.json'),bookPath=path.join(out,s.name+'-worldbook.json');
    if(!fs.existsSync(bookPath))fs.copyFileSync(path.join(stage,'worldbook.json'),bookPath);
    const checked=tool('validate.mjs',[regex,'--platform',s.route==='sandbox'?'sandbox':'legacy','--persona',path.join(stage,'persona.txt'),'--worldbook',bookPath,'--json'],log);
    const validation=JSON.parse(checked.stdout);if(validation.errors)throw Error('静态检查仍有错误');
    const fresh=sha(JSON.stringify({source:treeHash(),review:Object.fromEntries(Object.entries(REVIEW_FILES).map(([k,f])=>[k,sha(text(path.join(deliver,f)))]))}));
    if(fresh!==guardHash)throw Error('构建期间源码或审阅稿发生变化，未更新交付文件，请重试');
    if(ARTIFACTS.some((f,i)=>{const p=path.join(deliver,f);return (fs.existsSync(p)?sha(fs.readFileSync(p)):null)!==beforeArtifacts[i];}))throw Error('构建期间导入文件发生外部变化，未覆盖新改动');
    const bodies={'persona.txt':text(path.join(stage,'persona.txt')),'regex.json':text(regex),'worldbook.json':text(bookPath)};
    snapshot([statePath,...ARTIFACTS.map(f=>path.join(deliver,f)),path.join(deliver,'00-使用与验收.md')],'成功构建后更新导入文件前备份');
    for(const [f,body]of Object.entries(bodies)){atomic(path.join(deliver,f),body);s.artifacts[f]=sha(body);}
    s.lastBuild={at:new Date().toISOString(),sourceHash:treeHash(),run,evidence:'E2',warnings:validation.warns};
    saveState(s);atomic(path.join(deliver,'00-使用与验收.md'),readme(s,'三份审阅稿已同步，导入文件已重新生成，可开始内容验收。'));
    atomic(at('工程','reports',run+'.json'),json({ok:true,route:s.route,synced:synced.synced,validation,log}));
    console.log(json({project:root,delivery:deliver,route:s.route,evidence:'E2',warnings:validation.warns,synced:synced.synced}));
  }catch(e){
    atomic(at('工程','reports',run+'.json'),json({ok:false,error:e.message,log}));
    atomic(path.join(deliver,'00-使用与验收.md'),readme(s,'本次生成未完成，导入文件未更新。请交给 Agent 查看工程报告并修复。'));
    throw e;
  }
}
try{
  for(const flag of ['allow-delete','replace-artifacts'])if(opts[flag]!==undefined&&opts[flag]!==true)throw Error('--'+flag+'是显式开关，不接受false/0等文本值');
  if(command==='init')init();
  else{const s=load();if(command==='status')console.log(json(status(s)));else if(command==='sync'){const result=synchronize(s);console.log(json({synced:result.synced,...status(result.state)}));}else build(s);}
}catch(e){console.error(e.message);process.exitCode=1;}
