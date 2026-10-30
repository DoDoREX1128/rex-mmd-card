import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LIMIT, parseArgs } from './lib/facts.mjs';
const {opts}=parseArgs(process.argv), src=path.resolve(opts.src||'work/src'), out=path.resolve(opts.out||'work/out'), name=opts.name||'card';
const config=JSON.parse(fs.readFileSync(path.join(src,'card.config.json'),'utf8'));
const rules=(config.regex_scripts||[]).map(r=>({id:-1,scriptName:r.scriptName,findRegex:r.findRegex,replaceString:r.replaceString}));
let beginning=String(config.beginning||''),statusbar=String(config.statusbar||'');
for(const [file,kind] of [['theme.css','style'],['runtime.js','script']]){
  const p=path.join(src,file);if(!fs.existsSync(p))continue;
  const marker=`【rex-native-${kind}】`;
  rules.push({id:-1,scriptName:'native-'+kind,findRegex:`/${marker}/`,replaceString:`<${kind}>${fs.readFileSync(p,'utf8')}</${kind}>`});
  // Legacy bootstrap/style rules need an actual trigger; unlike sandbox extraction.
  beginning+=marker;
}
const card={pageDepth:2,statusbar,beginning,regex_scripts:rules};
if(beginning.length>LIMIT.beginning||rules.length>LIMIT.rules)throw Error('旧版包超限');
fs.mkdirSync(out,{recursive:true});const p=path.join(out,name+'-regex.json');fs.writeFileSync(p,JSON.stringify(card,null,2));
const args=[p,'--platform','legacy'];
for(const [file,flag,suffix] of [['persona.txt','persona','-persona.txt'],['worldbook.json','worldbook','-worldbook.json']]){
  const source=path.join(src,file);if(fs.existsSync(source)){const target=path.join(out,name+suffix);fs.copyFileSync(source,target);args.push('--'+flag,target);}
}
const result=spawnSync(process.execPath,[path.join(path.dirname(fileURLToPath(import.meta.url)),'validate.mjs'),...args],{stdio:'inherit'});
if(result.status)process.exit(result.status);console.log('旧版原生包已生成：'+p);
