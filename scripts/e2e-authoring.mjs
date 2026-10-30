/* Published opening and creation UI regression, using isolated local Chrome/Edge. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outIndex=process.argv.indexOf('--out');
const out=outIndex>=0?path.resolve(process.argv[outIndex+1]):path.join(root,'work/authoring-browser');
fs.mkdirSync(out,{recursive:true});
function run(file,args){const r=spawnSync(process.execPath,[path.join(root,'scripts',file),...args],{cwd:root,encoding:'utf8'});if(r.status)throw Error(r.stderr+r.stdout);return r.stdout;}
for(let i=0;i<4;i++){
  const src=path.join(out,'src-'+i),dest=path.join(out,'case-'+i);fs.cpSync(path.join(root,'assets/skeleton'),src,{recursive:true});
  const c=JSON.parse(fs.readFileSync(path.join(src,'content.json')));c.meta.name='browser-'+i;
  c.features={cover:!!(i&2),forge:!!(i&1)};
  c.player.fields=[{key:'name',label:'姓名',type:'text',maxLength:12},{key:'job',label:'身份',type:'choice',options:['船工','行商']}];
  fs.writeFileSync(path.join(src,'content.json'),JSON.stringify(c));
  run('build.mjs',['--src',src,'--out',dest,'--name','case']);
  run('preview.mjs',['--card',path.join(dest,'case-regex.json'),'--src',src,'--out',dest]);
}
const html=`<!doctype html><html><head><meta charset="utf-8"></head><body>
${[0,1,2,3].map(i=>`<iframe id="case${i}" src="case-${i}/demo-preview.html?reset=1&nomock=1" style="width:390px;height:844px"></iframe>`).join('')}
<iframe id="thin" src="case-1/demo-preview.html?reset=1&nomock=1&profile=thin" style="width:390px;height:844px"></iframe><pre id="result">RUNNING</pre>
<script>
(async function(){var failures=0,lines=[],result=document.getElementById('result');
function ok(name,value){lines.push((value?'PASS ':'FAIL ')+name);if(!value)failures++;result.textContent=lines.join('\\n');}
function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
function choose(w,text){var b=[].find.call(w.document.querySelectorAll('[data-val]'),function(b){return b.getAttribute('data-val')===text;});b.click();}
function name(w,text){var n=w.document.querySelector('[data-f="name"]');n.value=text;n.dispatchEvent(new w.Event('input',{bubbles:true}));}
try{await wait(2000);
for(var i=0;i<4;i++){
 var w=document.getElementById('case'+i).contentWindow,R=w.__REX__,cover=!!(i&2),forge=!!(i&1);
 ok('opening '+i+' mounted correct initial screen',!!R&&R.state.booted&&(cover?R.state.scene==='cover':forge?R.state.scene==='forge':!R.state.scene));
 if(cover){w.document.querySelector('.rex-scene-cover [data-act="start"]').click();await wait(50);}
 if(!forge){ok('opening '+i+' enters main without unwanted forge',!R.state.scene&&!w.document.querySelector('.rex-scene-forge'));continue;}
 var enter=w.document.querySelector('.rex-scene-forge [data-act="enter"]');
 ok('opening '+i+' required text initially blocks commit',enter&&enter.disabled);
 choose(w,'船工');name(w,'   ');ok('opening '+i+' whitespace stays blocked',enter.disabled);
 name(w,'林舟');ok('opening '+i+' valid text and choice enable commit',!enter.disabled);
 var count=w.document.querySelectorAll('[data-from="user"]').length;enter.click();await wait(100);
 ok('opening '+i+' creates editable draft and closes creation',!R.state.scene&&w.document.querySelector('[data-chat="input"]').value.includes('姓名：林舟'));
 ok('opening '+i+' never auto-sends',w.document.querySelectorAll('[data-from="user"]').length===count);
}
var tw=document.getElementById('thin').contentWindow;choose(tw,'船工');name(tw,'林舟');tw.document.querySelector('.rex-scene-forge [data-act="enter"]').click();await wait(150);
ok('SDK input rejection leaves creation visible',!!tw.document.querySelector('.rex-scene-forge')&&tw.__REX__.state.scene==='forge');
ok('SDK input rejection leaves selection and a visible error',tw.document.querySelector('[data-f="name"]').value==='林舟'&&tw.document.querySelector('.rex-toast').textContent.includes('写入失败'));
}catch(e){ok('exception '+e.message,false);}
result.textContent=lines.join('\\n')+'\\nRESULT '+(failures?'FAIL':'PASS');document.documentElement.setAttribute('data-result',failures?'FAIL':'PASS');
})();
</script></body></html>`;
const page=path.join(out,'authoring.html');fs.writeFileSync(page,html);
const browser=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(p=>fs.existsSync(p));
if(!browser)throw Error('NOT RUN: Chrome/Edge unavailable');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'rex-authoring-browser-'));
const r=spawnSync(browser,['--headless=new','--disable-extensions','--disable-background-networking','--disable-component-update','--disable-gpu','--no-first-run','--no-default-browser-check','--allow-file-access-from-files','--user-data-dir='+profile,'--virtual-time-budget=10000','--dump-dom',new URL('file:///'+page.replaceAll('\\','/')).href],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024,windowsHide:true,env:{...process.env,SSLKEYLOGFILE:''}});
fs.writeFileSync(path.join(out,'authoring-dom.html'),r.stdout||'');
const report=(r.stdout||'').match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1]||r.stderr;console.log(report);
if(!/data-result="PASS"/.test(r.stdout||''))process.exit(1);
