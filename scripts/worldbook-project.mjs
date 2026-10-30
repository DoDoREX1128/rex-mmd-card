/* Optional source workflow for medium/large lorebooks. Stable IDs are not export UIDs. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {parseArgs} from './lib/facts.mjs';
import {validateWorldbook} from './lib/worldbook.mjs';
const {positional,opts}=parseArgs(process.argv),command=positional[0],dir=path.resolve(positional[1]||'work/worldbook');
const indexPath=path.join(dir,'project.json');
function put(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function load(){if(!fs.existsSync(indexPath))throw Error('先运行 init');return JSON.parse(fs.readFileSync(indexPath,'utf8'));}
function entryPath(id){if(!/^e-[a-f0-9-]+$/.test(id))throw Error('无效entry_id');return path.join(dir,'entries',id+'.json');}
function add(project,entry){const id='e-'+crypto.randomUUID();put(entryPath(id),{entry_id:id,entry});project.entries.push(id);return id;}
if(command==='init'){
  if(fs.existsSync(indexPath))throw Error('项目已存在，不覆盖');
  fs.mkdirSync(path.join(dir,'entries'),{recursive:true});fs.mkdirSync(path.join(dir,'archive'),{recursive:true});
  put(indexPath,{v:1,entries:[]});console.log(dir);
}else{
  const project=load();
  if(command==='import'){
    const book=JSON.parse(fs.readFileSync(path.resolve(positional[2]),'utf8'));
    const check=validateWorldbook(book);if(check.errors.length)throw Error(check.errors.join('\n'));
    Object.values(book.entries).forEach(e=>add(project,e));put(indexPath,project);
  }else if(command==='add'){
    if(!opts.title||!opts.content)throw Error('add需要--title与--content正文文件');
    const entry={uid:0,comment:String(opts.title),content:fs.readFileSync(path.resolve(opts.content),'utf8'),constant:opts.constant===true||opts.constant==='true',disable:false,key:JSON.stringify(String(opts.keys||'').split(',').filter(Boolean)),keysecondary:'[]',probability:'100.00',position:1,role:0,depth:4,order:100};
    const check=validateWorldbook({entries:{0:entry}});if(check.errors.length)throw Error(check.errors.join('\n'));
    console.log(add(project,entry));put(indexPath,project);
  }else if(command==='move'){
    const id=opts.id,at=Number(opts.to);if(!project.entries.includes(id)||!Number.isInteger(at)||at<0||at>=project.entries.length)throw Error('move需要现有--id与范围内--to');
    project.entries.splice(project.entries.indexOf(id),1);project.entries.splice(at,0,id);put(indexPath,project);
  }else if(command==='archive'){
    const id=opts.id;if(!project.entries.includes(id))throw Error('找不到entry_id');
    fs.renameSync(entryPath(id),path.join(dir,'archive',id+'.json'));project.entries=project.entries.filter(x=>x!==id);put(indexPath,project);
  }else if(command==='list'){
    console.log(JSON.stringify(project.entries.map(id=>({id,...JSON.parse(fs.readFileSync(entryPath(id),'utf8')).entry})),null,2));
  }else if(command==='build'||command==='check'){
    if(new Set(project.entries).size!==project.entries.length)throw Error('源索引ID重复');
    const book={entries:Object.fromEntries(project.entries.map((id,i)=>{
      const source=JSON.parse(fs.readFileSync(entryPath(id),'utf8'));if(source.entry_id!==id)throw Error('源身份不一致');
      return [String(i),{...source.entry,uid:i,order:project.entries.length-i}];
    }))};
    const check=validateWorldbook(book);if(check.errors.length)throw Error(check.errors.join('\n'));
    if(command==='build'){if(!opts.out)throw Error('build需要--out');const p=path.resolve(opts.out);fs.mkdirSync(path.dirname(p),{recursive:true});put(p,book);}
    else if(opts.out && JSON.stringify(book)!==JSON.stringify(JSON.parse(fs.readFileSync(path.resolve(opts.out),'utf8'))))throw Error('导出与源不一致');
    console.log('PASS '+project.entries.length+' 条；稳定entry_id未改变');
  }else throw Error('命令：init/import/list/add/move/archive/build/check');
}
