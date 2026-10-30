import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from './lib/facts.mjs';
const {opts}=parseArgs(process.argv),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const route=opts.route||'sandbox',dirs={sandbox:'skeleton',native:'native',same:'samelayer'};
if(!dirs[route])throw Error('route 必须是 sandbox/native/same');
const source=path.join(root,'assets',dirs[route]),target=path.resolve(opts.out||'work/src');
fs.mkdirSync(target,{recursive:true});
for(const name of fs.readdirSync(source)){
  if(name==='persona.example.txt'&&!opts['with-persona'])continue;
  const destination=path.join(target,name==='persona.example.txt'?'persona.txt':name);
  if(fs.existsSync(destination)&&!opts.force){console.log('保留 '+destination);continue;}
  fs.cpSync(path.join(source,name),destination,{recursive:true});
}
console.log('已初始化 '+route+' → '+target+'；已有文件默认保留，人设按需添加');
