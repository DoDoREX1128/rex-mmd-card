/* Complete modular scene workspace: clone, guarded review synchronization and deterministic build. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {copyTree} from './lib/fsx.mjs';

const scripts=path.dirname(fileURLToPath(import.meta.url)),skill=path.dirname(scripts);
const args=process.argv.slice(2),command=args[0],root=args[1]&&path.resolve(args[1]);
const option=(key,fallback)=>{const i=args.indexOf('--'+key);return i<0?fallback:args[i+1];};
const json=x=>JSON.stringify(x,null,2)+'\n',read=p=>fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const inline=x=>JSON.stringify(x).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const hostNames=['core.js','actions.js','actions-dom.js','actions-handlers.js','provided-actions.js','models.js','provided-models.js','native.js','host.js'];
function run(name,params){const r=spawnSync(process.execPath,[path.join(scripts,name),...params],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.stdout||name+' failed');return r.stdout;}
function write(file,text){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(tmp,text);fs.renameSync(tmp,file);}
function guardProject(){
  let current=root;
  while(current!==path.dirname(current)){if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('项目父路径含链接');current=path.dirname(current);}
  function walk(p){if(!fs.existsSync(p))return;const s=fs.lstatSync(p);if(s.isSymbolicLink())throw Error('项目内含链接：'+p);if(s.isDirectory())for(const n of fs.readdirSync(p))walk(path.join(p,n));}walk(root);
}
function validate(c){
  if(!/^[a-z0-9-]{1,40}$/.test(c.appId)||!c.title)throw Error('appId/title 无效');
  for(const k of ['creation','characters','entries','places','tracks','statusFields','help'])if(!Array.isArray(c[k])||!c[k].length)throw Error('内容缺项：'+k);
  for(const k of ['characters','entries','places','tracks']){const ids=new Set();for(const x of c[k]){if(!/^[a-z0-9-]+$/.test(x.id)||ids.has(x.id))throw Error('重复或无效ID：'+k);ids.add(x.id);}}
  for(const p of c.places)if(!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('地图坐标无效');
  for(const value of Object.values(c.theme))if(!/^#[\da-f]{3,8}$/i.test(value))throw Error('主题仅接受十六进制颜色');
  for(const f of c.creation)if(!/^[a-z][a-z0-9]*$/i.test(f.key)||!['text','textarea','select'].includes(f.type)||![0,1].includes(f.step)||f.type==='select'&&!f.options?.length)throw Error('创建字段无效');
  for(const t of c.tracks){if(t.url&&!/^https:\/\//.test(t.url))throw Error('音频URL必须是https');if(!t.url&&(!Array.isArray(t.frequencies)||t.frequencies.some(n=>!Number.isFinite(n)||n<30||n>2000)))throw Error('音景参数无效');}
  if(!c.initialState||typeof c.initialState!=='object')throw Error('缺少初始状态');
}
function html(content,source){
  return '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+content.title.replace(/[<>]/g,'')+'</title><style>'+read(path.join(source,'frame/layout.css'))+'</style><body><div id="shell"><nav id="nav" aria-label="场景导航"><strong></strong>'+[['cover','封面'],['forge','创建'],['reader','阅读'],['wiki','百科'],['map','地图'],['music','音乐'],['preferences','偏好'],['saves','存档'],['diagnostics','诊断'],['help','帮助']].map(([id,title])=>`<button data-act="nav" data-value="${id}">${title}</button>`).join('')+'</nav><main id="work"><header id="top" class="row spread"><span id="connection">正在连接宿主…</span><button data-act="back">返回上一页</button></header><div id="view"></div><div id="notice" role="status" aria-live="polite">等待宿主</div></main></div><dialog id="dialog"><div id="dialog-body"></div><p><button data-act="dialog-close">关闭</button></p></dialog><script>globalThis.SceneContent='+inline(content)+';document.querySelector("#nav strong").textContent=SceneContent.title;</script>'+['state.js','runtime.js'].map(n=>'<script>'+read(path.join(source,'frame',n)).replace(/<\/script/gi,'<\\/script')+'</script>').join('')+'</body></html>';
}
try{
  if(!root||!['init','build','verify','status','sync'].includes(command))throw Error('用法：node scripts/modular-scenes.mjs init|build|verify|status|sync <项目目录> [--variant harbor|orbit] [--name app-id] [--title 卡名]');
  guardProject();const eng=path.join(root,'工程'),source=path.join(eng,'src'),deliver=path.join(root,'交付');
  if(command==='init'){
    if(fs.existsSync(root)&&fs.readdirSync(root).length)throw Error('项目目录非空，拒绝覆盖');
    const assets=path.join(skill,'assets/modular-scenes'),variant=option('variant','harbor');if(!['harbor','orbit'].includes(variant))throw Error('未知variant');
    copyTree(assets,source);fs.mkdirSync(deliver,{recursive:true});
    const content=JSON.parse(read(path.join(source,variant==='orbit'?'content-orbit.json':'content.json')));
    content.appId=option('name',content.appId);content.title=option('title',content.title);validate(content);
    write(path.join(source,'content.json'),json(content));
    // Both themes use the same runtime. Variant text and worldbook are generated from their content data.
    write(path.join(source,'content/opening.txt'),content.readingSample+'\n请先创建角色，或写下你的第一步行动。\n');
    const wb={entries:Object.fromEntries(content.entries.map((e,i)=>[String(i),{uid:i,key:JSON.stringify(i===0?[]:[e.title,...content.places.map(p=>p.name)]),comment:e.title,content:'<entry_'+i+'>\n'+e.body+'\n</entry_'+i+'>',constant:i===0,enabled:true,order:100-i*10,position:0}]))};
    write(path.join(source,'content/worldbook.json'),json(wb));
    run('complete-samelayer-review.mjs',[root,'init']);
    fs.mkdirSync(path.join(eng,'tools/scripts'),{recursive:true});
    for(const n of ['modular-scenes.mjs','e2e-modular-scenes.mjs','pack-samelayer.mjs','complete-samelayer-review.mjs','validate.mjs'])fs.copyFileSync(path.join(scripts,n),path.join(eng,'tools/scripts',n));
    copyTree(path.join(assets,'testing'),path.join(eng,'tools/assets/modular-scenes/testing'));
    copyTree(path.join(scripts,'lib'),path.join(eng,'tools/scripts/lib'));
    fs.copyFileSync(path.join(skill,'facts.json'),path.join(eng,'tools/facts.json'));
    fs.copyFileSync(path.join(skill,'LICENSE'),path.join(eng,'tools/LICENSE'));
    write(path.join(deliver,'00-使用与验收.md'),'# '+content.title+' · 使用与验收\n\n旧版同层，模块化场景完整模板。先改三份审阅稿，由 Agent 执行 modular-scenes.mjs sync/build；不要用 project.mjs 或完整 HUD 的 Python 构建器覆盖此工程。内容与皮肤在工程/src/content.json；运行时在frame，平台适配在host。\n\n构建成功后导入 persona.txt、worldbook.json 与旧版 regex.json。第一次导入必须在测试卡验证。预览.html使用本地模拟宿主，不是真实平台。源修改与审阅稿双改会停止同步。\n\n可独立使用随项目的工程/tools/scripts/modular-scenes.mjs 继续构建，不依赖原始参考卡或原安装位置。发布包与验证报告在工程/builds。E4目标站/E5实体设备未执行。\n');
    console.log('完整工程已克隆：'+root);process.exit(0);
  }
  if(!fs.existsSync(path.join(source,'content.json')))throw Error('不是模块化场景工程');
  if(['status','sync'].includes(command)){console.log(run('complete-samelayer-review.mjs',[root,command]));process.exit(0);}
  const manifestPath=path.join(eng,'builds/release-manifest.json');
  if(command==='verify'){
    const m=JSON.parse(read(manifestPath));for(const [rel,hash]of Object.entries(m.files))if(sha(fs.readFileSync(path.join(root,rel)))!==hash)throw Error('文件哈希不符：'+rel);
    console.log(run('validate.mjs',[path.join(deliver,'regex.json'),'--platform','legacy']));console.log('发布包、Frame 与源码快照校验通过');process.exit(0);
  }
  run('complete-samelayer-review.mjs',[root,'sync']);
  const content=JSON.parse(read(path.join(source,'content.json')));validate(content);
  const frame=html(content,source),host=hostNames.map(n=>read(path.join(source,'host',n))).join('\n');
  for(const f of ['state.js','runtime.js'])new vm.Script(read(path.join(source,'frame',f)));
  new vm.Script(host);
  const buildId=sha(host+frame+read(path.join(source,'content/opening.txt'))).slice(0,20),build=path.join(eng,'builds',buildId);fs.mkdirSync(build,{recursive:true});
  const config={appId:content.appId,title:content.title,buildId,mode:'native',engine:false,models:true};
  const bootHost=host+'\nMmdSameLayerHost.boot('+inline(config)+',globalThis.REXHUDCONFIG.frameScriptSource);';
  write(path.join(build,'host.js'),bootHost);write(path.join(build,'frame.html'),frame);
  console.log(run('pack-samelayer.mjs',['--host',path.join(build,'host.js'),'--frame',path.join(build,'frame.html'),'--out',build,'--name',content.appId,'--ignite','chain','--opening',path.join(source,'content/opening.txt')]));
  const packed=path.join(build,content.appId+'-regex.json'),card=JSON.parse(read(packed));
  // Hide model data before expanding launcher payload, never rewrite protocol examples inside JS strings.
  card.regex_scripts.unshift({id:-1,scriptName:'state-protocol',findRegex:'/\\[status\\]([^<>&]*?)\\[\\/status\\]/g',replaceString:'<span hidden class="scene-state">[status]$1[/status]</span>'});
  write(packed,json(card));console.log(run('validate.mjs',[packed,'--platform','legacy']));
  run('complete-samelayer-review.mjs',[root,'check']);
  const previewConfig={...config,mode:'mock',previewMessages:[{id:'intro',role:'assistant',text:content.readingSample+'\n[status]'+JSON.stringify(content.initialState)+'[/status]'}]};
  const preview='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>本地模拟</title><body><p>本地模拟宿主，不代表目标站验证。</p><script>'+host.replace(/<\/script/gi,'<\\/script')+'\nwindow.ScenePreviewConfig='+inline(previewConfig)+';window.ScenePreview=MmdSameLayerHost.boot(ScenePreviewConfig,'+inline(frame)+');</script></body></html>';
  write(path.join(build,'preview.html'),preview);
  for(const n of ['persona.txt','worldbook.json'])write(path.join(deliver,n),read(path.join(source,'content',n)));
  write(path.join(deliver,'regex.json'),read(packed));write(path.join(root,'预览.html'),preview);
  const files={};function collect(dir){for(const n of fs.readdirSync(dir).sort()){const p=path.join(dir,n);if(fs.statSync(p).isDirectory())collect(p);else files[path.relative(root,p).replaceAll('\\','/')]=sha(fs.readFileSync(p));}}collect(source);
  for(const p of [path.join(build,'frame.html'),path.join(build,'host.js'),path.join(build,'preview.html'),path.join(root,'预览.html'),...['persona.txt','worldbook.json','regex.json'].map(n=>path.join(deliver,n))])files[path.relative(root,p).replaceAll('\\','/')]=sha(fs.readFileSync(p));
  write(manifestPath,json({schema:1,appId:content.appId,buildId,template:'sl-modular-scenes',files,modules:['cover','forge','reader','wiki','map','music','preferences','saves','diagnostics','help'],evidence:{static:'PASS',localBrowser:'NOT RUN',realMmd:'NOT RUN',physicalMobile:'NOT RUN'}}));
  run('complete-samelayer-review.mjs',[root,'record']);console.log('构建完成：'+path.join(deliver,'regex.json'));
}catch(e){console.error(e.message);process.exit(1);}
