import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const arg=(n,d)=>{const i=process.argv.indexOf('--'+n);return i<0?d:process.argv[i+1];};
const project=arg('project');if(!project)throw Error('需要 --project <完整同层项目>；可选 --case <用例> --out <报告目录>');
const frame=path.resolve(project,'工程/builds/frame.html');if(!fs.existsSync(frame))throw Error('先运行 complete-samelayer.py build');
const output=path.resolve(arg('out',path.join(os.tmpdir(),'rex-e2e-'+Date.now())));fs.mkdirSync(output,{recursive:true});
const cases=['transport','native','panel','models','mdl_cfg','composer','opt','imggen','imggen_panel','v6_reset','native_rollback'];
const only=arg('case');if(only&&!cases.includes(only))throw Error('未知用例：'+only);
const tests=fileURLToPath(new URL('../assets/samelayer-complete/testing/',import.meta.url)),results=[];
const fixtureDir=path.join(output,'fixtures');fs.mkdirSync(fixtureDir,{recursive:true});
const kitUrl=pathToFileURL(path.resolve(project,'工程/src/kit')+path.sep).href;
for(const file of ['native-chat.html','transport.html']){
 const text=fs.readFileSync(path.join(tests,'fixtures',file),'utf8').replaceAll('src="../../kit/','src="'+kitUrl);
 fs.writeFileSync(path.join(fixtureDir,file),text);
}
for(const name of only?[only]:cases){
 console.log('RUN '+name);
 const dir=path.join(output,name);fs.mkdirSync(dir,{recursive:true});
 const outcome=await new Promise(resolve=>{
  const proc=spawn(process.execPath,[path.join(tests,name+'.mjs')],{cwd:dir,windowsHide:true,env:{...process.env,FRAME_URL:pathToFileURL(frame).href,REX_TEST_OUT:dir,REX_PROJECT:path.resolve(project),REX_FIXTURE_ROOT:pathToFileURL(fixtureDir+path.sep).href}});
  const chunks=[];proc.stdout.on('data',b=>chunks.push(b));proc.stderr.on('data',b=>chunks.push(b));let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;proc.kill();},120000);
  proc.on('error',e=>{clearTimeout(timer);resolve({code:-1,text:e.message});});
  proc.on('close',code=>{clearTimeout(timer);resolve({code,text:Buffer.concat(chunks).toString('utf8'),timedOut});});
 });
 fs.writeFileSync(path.join(dir,'result.log'),outcome.text);
 const failed=outcome.code!==0||outcome.timedOut||/^FAIL\b|\b[1-9]\d* FAILED\b|异常 [1-9]/m.test(outcome.text);
 results.push({name,pass:!failed,exitCode:outcome.code,assertions:(outcome.text.match(/^PASS /gm)||[]).length});
 console.log((failed?'FAIL ':'PASS ')+name+(failed?' '+outcome.text.slice(-1200):''));
}
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({results,realMmd:'NOT RUN',physicalMobile:'NOT RUN'},null,2));
if(results.some(x=>!x.pass))process.exitCode=1;
console.log(JSON.stringify({passed:results.filter(x=>x.pass).length,total:results.length,assertions:results.reduce((n,x)=>n+x.assertions,0),report:path.join(output,'report.json')}));
