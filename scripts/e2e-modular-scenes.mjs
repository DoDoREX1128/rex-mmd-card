import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {launch,sleep} from '../assets/modular-scenes/testing/browser.mjs';

const args=process.argv.slice(2),at=k=>args[args.indexOf('--'+k)+1];
if(!args.includes('--project'))throw Error('需要 --project <完整工程> [--out 报告目录]');
const root=path.resolve(at('project')),out=path.resolve(args.includes('--out')?at('out'):path.join(root,'工程/reports/browser'));
fs.mkdirSync(out,{recursive:true});process.env.REX_TEST_OUT=out;
const report={project:root,tests:[],targetSite:'NOT RUN',physicalDevice:'NOT RUN'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/${encodeURIComponent('预览.html')}`;
const check=(name,value)=>{report.tests.push({name,pass:!!value});if(!value)throw Error('FAIL '+name);console.log('PASS '+name);};
let browser;
try{
  for(const width of [1440,390]){
    console.log('启动浏览器 '+width+' '+url);
    browser=await launch({width,height:width===390?844:960,url});
    console.log('浏览器已连接，加载工程');
    await browser.goto('');
    const f=expr=>browser.ev(`document.querySelector('iframe').contentWindow.eval(${JSON.stringify(expr)})`);
    const click=(act,value)=>f(`document.querySelector('[data-act="${act}"]${value===undefined?'':'[data-value="'+value+'"]'}').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    const wait=async predicate=>{for(let i=0;i<70;i++){if(await f(predicate))return;await sleep(100);}throw Error('等待超时：'+predicate);};
    await wait('SceneApp.inspect().connected && !SceneApp.inspect().busy');
    check(width+' 模块注册与实际宿主握手',(await f('SceneApp.inspect().modules.length'))===10);
    check(width+' 视口无横向溢出',await f('document.documentElement.scrollWidth<=innerWidth+1'));
    check(width+' Frame真实视口与布局断点',await f(`Math.abs(innerWidth-${width})<=2 && getComputedStyle(document.querySelector('#nav')).flexDirection===${JSON.stringify(width<650?'row':'column')}`));
    await browser.shot(width+'-cover.png');
    await click('nav','forge');
    await f(`(()=>{const e=document.querySelector('[data-field="name"]');e.value='测试旅人';e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await click('step','1');await click('step','-1');
    check(width+' 创建返回保留草稿',await f(`document.querySelector('[data-field="name"]').value==='测试旅人'`));
    await click('step','1');await click('step','1');await click('character','guide');await click('person','guide');
    check(width+' 人物详情打开',await f('document.querySelector("dialog").open'));
    await click('dialog-close');await click('step','1');await click('forge-submit');
    check(width+' 创建只生成草稿不发送',await f('document.querySelector("#composer").value.includes("测试旅人")') && await browser.ev('ScenePreview.bridge.snapshot().messages.length===1'));
    await click('draft');await wait('!SceneApp.inspect().busy');
    check(width+' 草稿经真实MessagePort写入',await browser.ev('ScenePreview.bridge.previewDraft().includes("测试旅人")'));
    await click('send');await wait('!SceneApp.inspect().busy');await sleep(700);
    check(width+' 发送经宿主并回读消息',(await f('SceneApp.inspect().replay.versions.length'))===1 && (await browser.ev('ScenePreview.bridge.snapshot().messages.length'))===3);
    await f(`document.querySelector('#composer').value='失败时保留草稿'`);
    await browser.ev('ScenePreviewConfig.previewFailure=true');await click('send');await wait('!SceneApp.inspect().busy');
    check(width+' 失败不清空草稿',await f(`document.querySelector('#composer').value==='失败时保留草稿' && document.querySelector('#notice').dataset.error==='true'`));
    await browser.ev('ScenePreviewConfig.previewFailure=false');
    const rows=[{id:'a',role:'assistant',raw:'正文[status]{"energy":60,"inventory":["钥匙"],"options":["调查"]}[/status]'},
      {id:'u',role:'user',raw:'[status]{"energy":0}[/status]'},
      {id:'b',role:'assistant',raw:'次轮[status]{"energy":40,"inventory":[]}[/status]'},
      {id:'bad',role:'assistant',raw:'[status]{broken}[/status]'}];
    await browser.ev(`ScenePreview.bridge.setPreviewMessages(${JSON.stringify(rows)})`);await sleep(700);
    check(width+' 历史重放、用户过滤、空列表清空、坏JSON保留',await f('SceneApp.inspect().replay.state.energy===40 && SceneApp.inspect().replay.state.inventory.length===0 && SceneApp.inspect().replay.issues.length===1'));
    rows.splice(2,1);await browser.ev(`ScenePreview.bridge.setPreviewMessages(${JSON.stringify(rows)})`);await sleep(700);
    check(width+' 删除历史后重建',await f('SceneApp.inspect().replay.state.energy===60'));
    await browser.shot(width+'-reader.png');
    await click('nav','diagnostics');await click('ignore','a');
    check(width+' 状态版本可忽略恢复',await f('SceneApp.inspect().replay.state.energy===100'));
    await click('ignore','a');await click('nav','wiki');await click('entry','rule');
    check(width+' 百科正文可打开',await f('document.querySelector("dialog").open'));await click('dialog-close');
    await click('filter','关系');check(width+' 分类筛选',await f('document.querySelectorAll("#view .card").length===1'));
    await click('nav','map');await click('zoom','1.2');await click('place','start');await click('dialog-close');
    check(width+' 地图缩放与地点详情',await f('document.querySelector("#map-world").getAttribute("transform").includes("1.2")'));
    await browser.shot(width+'-map.png');
    await click('nav','preferences');
    await f(`(()=>{const e=document.querySelector('#font-size');e.value=22;e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await click('save');await wait('!SceneApp.inspect().busy');
    check(width+' 保存确认与偏好生效',await f('SceneApp.inspect().book.slots.auto.data.preferences.size===22'));
    await browser.goto('');await wait('SceneApp.inspect().connected && !SceneApp.inspect().busy');
    check(width+' 刷新恢复偏好与创建稿',await f('SceneApp.inspect().preferences.size===22 && SceneApp.inspect().player.name==="测试旅人"'));
    await click('nav','saves');await click('new-slot');await wait('!SceneApp.inspect().busy');
    check(width+' 命名存档与恢复',await f('Object.keys(SceneApp.inspect().book.slots).length===2'));
    await browser.ev('ScenePreview.bridge.changeConversation("second")');await sleep(1000);await wait('SceneApp.inspect().connected && !SceneApp.inspect().busy');
    check(width+' 会话隔离无串档',await f('Object.keys(SceneApp.inspect().book.slots).length===0 && !SceneApp.inspect().player.name'));
    await click('nav','music');
    const audioResult=await browser.send('Runtime.evaluate',{expression:`document.querySelector('iframe').contentWindow.document.querySelector('[data-act="track"]').click()`,userGesture:true});
    await wait('!SceneApp.inspect().busy');
    check(width+' 内置音景可播放',await f(`document.querySelector('#audio-status').textContent==='正在播放'`));
    await click('stop-audio');await wait('!SceneApp.inspect().busy');
    await click('nav','help');await click('native');await wait('!SceneApp.inspect().busy');
    check(width+' 返回原生入口',await browser.ev('document.querySelector("[id^=MMD_SL_]").hidden'));
    await browser.ev('ScenePreview.show()');
    check(width+' 重入不重复挂载',await browser.ev('document.querySelectorAll("iframe").length===1'));
    check(width+' 无页面运行异常',browser.errs.length===0);
    browser.close();browser=null;
  }
  report.pass=true;
}catch(e){report.pass=false;report.error=e.message;throw e;}
finally{browser?.close();server.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
