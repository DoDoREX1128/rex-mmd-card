/* Human-facing lorebook review: prose/Markdown only; platform metadata stays in the project. */
import {validateWorldbook,keywords} from './worldbook.mjs';

export const REVIEW_FILES={persona:'01-人设审阅.txt',opening:'02-开场白审阅.txt',worldbook:'03-世界书审阅.md'};
export const normalize=text=>String(text).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
const clone=value=>JSON.parse(JSON.stringify(value));
const cells=text=>String(text).replaceAll('|','\\|').replace(/\n/g,' ');
const ENTRY=/^## 条目 (W\d{4,}|新增(?:-\d+)?)｜(.+)$/gm;
const GLOBAL='## 全书修改意见（不进入成品）';
const MAIN='### 主触发词',SECOND='### 次级触发词',BODY='### 设定正文',NOTES='### 修改意见（不进入成品）';
function assertBook(book){const r=validateWorldbook(book);if(r.errors.length)throw Error(r.errors.join('\n'));}
function safeText(text,label){
  if(/^## (?:条目 |全书修改意见)|^### (?:主触发词|次级触发词|设定正文|修改意见（不进入成品）)/m.test(text))throw Error(label+'含审阅结构的保留标题，请由Agent改用其他正文标题；未自动截断');
}
function list(values){
  for(const value of values)if(/[\r\n]/.test(value)||!value.trim())throw Error('触发词含换行或空词，无法无损生成审阅稿');
  return values.length?values.map(v=>'- '+v).join('\n'):'（无）';
}
function readList(raw,label){
  const text=raw.trim();if(!text||text==='（无）')return [];
  return text.split('\n').map(line=>{
    if(!/^- .+/.test(line))throw Error(label+'请按“一行一个 - 触发词”填写；未猜测或吞掉文本');
    return line.slice(2).trim();
  });
}
export function renderWorldbook(book,previousMap={}){
  assertBook(book);const map={},used=new Set();
  let next=Math.max(0,...Object.keys(previousMap).map(id=>Number(id.slice(1))||0))+1;
  const entries=Object.entries(book.entries).map(([key,entry])=>{
    let id=Object.keys(previousMap).find(id=>previousMap[id].uid===entry.uid&&!used.has(id));
    if(!id)id='W'+String(next++).padStart(4,'0');used.add(id);map[id]={key,uid:entry.uid};
    if(/[\r\n]/.test(entry.comment)||!entry.comment.trim())throw Error('世界书标题需为非空单行文本，未改写原文');
    safeText(entry.content,entry.comment);
    return {id,entry};
  });
  const lines=['# 世界书审阅稿','','你可以直接修改标题、触发方式、触发词和设定正文，也可以在每条末尾写修改意见交给 Agent。这里只展示创作设定，不需要填写导入格式或程序代码。',
    '保留“条目编号”和各小标题，便于准确同步；新增条目用“## 条目 新增｜标题”，并沿用相同小标题。删除整条需由 Agent 核对后处理。',
    '修改意见不会进入成品；有待处理意见时会暂停生成导入版。目录和统计由 Agent 更新，不用手动维护。','',
    '## 全书概览','',`- 条目总数：${entries.length}`,`- 已启用：${entries.filter(x=>!x.entry.disable).length}`,`- 常驻条目：${entries.filter(x=>x.entry.constant&&!x.entry.disable).length}`,'',
    '## 条目目录','','| 审阅编号 | 标题 | 启用 | 注入方式 |','|---|---|---|---|'];
  for(const {id,entry:e} of entries)lines.push(`| ${id} | ${cells(e.comment)} | ${e.disable?'否':'是'} | ${e.constant?'常驻':'关键词触发'} |`);
  if(!entries.length)lines.push('','暂无条目。可先让 Agent 按设定补齐，或按下方规则新增。');
  for(const {id,entry:e} of entries){
    lines.push('','---','',`## 条目 ${id}｜${e.comment}`,'',`- 启用：${e.disable?'否':'是'}`,`- 注入方式：${e.constant?'常驻':'关键词触发'}`,`- 触发概率：${Number(e.probability??100)}%`,'',
      MAIN,'',list(keywords(e.key,'key',[])),'',SECOND,'',list(keywords(e.keysecondary??'[]','keysecondary',[])),'',BODY,'',e.content,'',NOTES,'');
  }
  lines.push('',GLOBAL,'','');
  return {text:lines.join('\n'),map};
}
export function parseWorldbook(text,base,map,{allowDelete=false}={}){
  assertBook(base);text=normalize(text);
  if(!text.startsWith('# 世界书审阅稿\n'))throw Error('世界书审阅稿缺少标题；未按未知格式猜测');
  const globalAt=text.indexOf('\n'+GLOBAL+'\n');
  if(globalAt<0||text.indexOf('\n'+GLOBAL+'\n',globalAt+1)>=0)throw Error('世界书审阅稿的全书修改意见区域缺失或重复');
  if(text.slice(globalAt+GLOBAL.length+2).trim())throw Error('世界书有待处理的全书修改意见，请先由Agent落实');
  const source=text.slice(0,globalAt),heads=[...source.matchAll(ENTRY)];
  const allHeaders=source.split('\n').filter(line=>/^## 条目 /.test(line));
  if(allHeaders.length!==heads.length)throw Error('世界书条目标题格式损坏；请保留“## 条目 编号｜标题”');
  const entries={},seen=new Set(),newIds=[];
  let nextUid=Math.max(-1,...Object.values(base.entries).map(e=>e.uid))+1;
  let nextKey=Math.max(-1,...Object.keys(base.entries).filter(k=>/^\d+$/.test(k)).map(Number))+1;
  for(let i=0;i<heads.length;i++){
    const match=heads[i],id=match[1],title=match[2].trim();
    if(seen.has(id))throw Error('重复审阅编号：'+id);seen.add(id);
    const known=map[id];
    if(!known&&!id.startsWith('新增'))throw Error('未知审阅编号：'+id+'；新增请使用“新增”编号');
    const block=source.slice(match.index+match[0].length,i+1<heads.length?heads[i+1].index:source.length).replace(/\n---\s*$/,'');
    const at=[MAIN,SECOND,BODY,NOTES].map(h=>{
      const marker='\n'+h+'\n',pos=block.indexOf(marker);
      if(pos<0||block.indexOf(marker,pos+marker.length)>=0)throw Error(title+'的小标题缺失或重复：'+h);
      return pos;
    });
    if(at.some((n,j)=>j&&n<=at[j-1]))throw Error(title+'的小标题顺序被改变');
    const header=block.slice(0,at[0]).trim();
    const metadata={};
    for(const line of header.split('\n')){
      const item=/^- (启用|注入方式|触发概率)：(.+)$/.exec(line);
      if(!item||Object.hasOwn(metadata,item[1]))throw Error(title+'的启用/触发说明损坏或重复');
      metadata[item[1]]=item[2].trim();
    }
    if(!['是','否'].includes(metadata['启用'])||!['常驻','关键词触发'].includes(metadata['注入方式'])||!/^\d+(?:\.\d{1,2})?%$/.test(metadata['触发概率']||''))throw Error(title+'的启用、注入方式或概率无效');
    const chance=Number(metadata['触发概率'].slice(0,-1));if(chance>100)throw Error(title+'的概率超过100%');
    const rawRegion=(j,h)=>block.slice(at[j]+h.length+2,j+1<at.length?at[j+1]:block.length);
    const region=(j,h)=>rawRegion(j,h).trim();
    const main=readList(region(0,MAIN),title+'主触发词'),secondary=readList(region(1,SECOND),title+'次级触发词');
    const content=rawRegion(2,BODY).replace(/^\n/,'').replace(/\n$/,'');safeText(content,title);
    if(region(3,NOTES))throw Error(title+'有待处理的修改意见，请先由Agent落实');
    let key,entry;
    if(known){
      key=known.key;entry=clone(base.entries[key]);
      if(!entry||entry.uid!==known.uid)throw Error('审阅映射与源世界书不一致，未重新编号');
    }else{key=String(nextKey++);entry={uid:nextUid++,order:100,position:4,depth:4,role:0};newIds.push(id);}
    Object.defineProperty(entries,key,{value:{...entry,comment:title,disable:metadata['启用']==='否',constant:metadata['注入方式']==='常驻',probability:chance.toFixed(2),key:JSON.stringify(main),keysecondary:JSON.stringify(secondary),content},enumerable:true,writable:true,configurable:true});
  }
  const removed=Object.keys(map).filter(id=>!seen.has(id));
  if(removed.length&&!allowDelete)throw Error('审阅稿移除了条目 '+removed.join('、')+'；核对删除意图后用--allow-delete，未自动删除');
  const book={entries};assertBook(book);return {book,removed,newIds};
}
