/* Real-browser smoke test of the actual published package. No fixed character/layout assumptions. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseArgs} from './lib/facts.mjs';
const {opts}=parseArgs(process.argv),here=path.dirname(fileURLToPath(import.meta.url));
const out=path.resolve(opts.out||'work/out'),src=path.resolve(opts.src||'work/src'),card=path.resolve(opts.card||path.join(out,'card-regex.json'));
fs.mkdirSync(out,{recursive:true});
const r=spawnSync(process.execPath,[path.join(here,'preview.mjs'),'--card',card,'--src',src,'--out',out],{encoding:'utf8'});
if(r.status!==0)throw Error(r.stderr+r.stdout);
const numberField=JSON.parse(fs.readFileSync(path.join(src,'content.json'),'utf8')).status?.fields?.find(f=>f.type==='bar'||f.type==='num');
const same=spawnSync(process.execPath,[path.join(here,'preview-samelayer.mjs'),'--host',path.resolve(here,'../assets/samelayer/host.js'),'--frame',path.resolve(here,'../assets/samelayer/frame.html'),'--out',out,'--name','same-e2e'],{encoding:'utf8'});
if(same.status)throw Error(same.stderr);
const html=`<!doctype html><html><head><meta charset="utf-8"><title>Rex browser contracts</title></head><body>
<iframe id="sandbox" src="demo-preview.html?reset=1&nomock=1" style="width:390px;height:844px"></iframe>
<iframe id="same" src="same-e2e.html" style="width:390px;height:600px"></iframe><pre id="results">RUNNING</pre>
<script>
(async function(){
var lines=[],failures=0,output=document.getElementById('results');
function ok(name,value){lines.push((value?'PASS ':'FAIL ')+name);if(!value)failures++;output.textContent=lines.join('\\n');}
function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
try{
 await wait(1700);
 var frame=document.getElementById('sandbox'),w=frame.contentWindow,R=w.__REX__;
 ok('published kernel booted',!!R&&R.state.booted);if(!R)throw Error('kernel missing');
 ok('no runtime error panel',!w.document.getElementById('err'));
 R.fillInput('浏览器草稿');await wait(30);ok('SDK input writes real DOM',w.document.querySelector('[data-chat="input"]').value==='浏览器草稿');
 var field=${JSON.stringify(numberField||null)};
 if(field){var t=(R.turn||0)+1,one={turn:t},two={turn:t+1};one[field.key]=20;two[field.key]=35;
   w.__emit('message:done',{role:'ai',serverId:901,content:'[status]'+JSON.stringify(one)+'[/status]'});
   w.__emit('message:done',{role:'ai',serverId:902,content:'[status]'+JSON.stringify(two)+'[/status]'});
   await wait(50);ok('two raw message rounds update numeric state',R.data.status[field.key]===35);
   w.__emit('message:done',{role:'ai',serverId:901,content:'[status]'+JSON.stringify(one)+'[/status]'});ok('old round cannot regress state',R.data.status[field.key]===35);
 }
 if(R.storageEnvelope){await R.saveSlot('browser-slot');var saved=R.storageEnvelope().slots;ok('named save slot persisted',saved.some(function(s){return s.name==='browser-slot';}));}
 var roots=w.document.querySelectorAll('.rex-world').length;frame.style.width='1440px';w.dispatchEvent(new Event('resize'));await wait(50);
 ok('wide viewport adapts without duplicate root',R.state.mode==='wide'&&w.document.querySelectorAll('.rex-world').length===roots);
 frame.style.width='390px';w.dispatchEvent(new Event('resize'));await wait(50);ok('narrow viewport adapts',R.state.mode==='narrow');
 var sw=document.getElementById('same').contentWindow,host=sw.REXHUDHOST;
 ok('legacy Host connected via MessagePort',!!host&&host.status().ready);
 var inner=sw.document.querySelector('#rex-hud-root iframe');ok('Frame is isolated from parent DOM',inner&&inner.contentDocument===null);
 host.invoke('openPersona');ok('native panel gets space',sw.document.getElementById('rex-hud-root').style.display==='none'&&sw.document.getElementById('dlg').classList.contains('on'));
 host.reenter();ok('return to same-layer works',sw.document.getElementById('rex-hud-root').style.display==='block');
 host.destroy();ok('legacy destroy removes frame',!sw.document.getElementById('rex-hud-root'));
 ok('no late sandbox errors',!w.document.getElementById('err'));
}catch(e){ok('exception: '+e.message,false);}
output.textContent=lines.join('\\n')+'\\nRESULT '+(failures?'FAIL':'PASS');
document.documentElement.setAttribute('data-result',failures?'FAIL':'PASS');
})();
</script></body></html>`;
const p=path.join(out,'e2e.html');fs.writeFileSync(p,html);
const candidates=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const browser=candidates.find(p=>fs.existsSync(p));
if(!browser){console.log('NOT RUN：未找到 Chrome/Edge。设置 CHROME_PATH 后重跑。手动入口 '+p);process.exit(2);}
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'rex-browser-'));
const result=spawnSync(browser,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--allow-file-access-from-files','--user-data-dir='+profile,'--virtual-time-budget=10000','--dump-dom',new URL('file:///'+p.replaceAll('\\','/')).href],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024});
fs.writeFileSync(path.join(out,'e2e-dom.html'),result.stdout||'');
const message=(result.stdout||'').match(/<pre id="results">([\s\S]*?)<\/pre>/)?.[1]||'浏览器未返回测试结果';console.log(message);
if(!/data-result="PASS"/.test(result.stdout||'')){console.error(result.error?.message||result.stderr?.slice(-2000)||'browser failed');process.exit(1);}
