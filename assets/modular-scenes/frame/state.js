/* Pure state model. Model-derived state is rebuilt from ordered assistant messages. */
(function(G){
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x));
  const plain=x=>x && typeof x==='object' && !Array.isArray(x);
  const safe=k=>!['__proto__','constructor','prototype'].includes(k);
  function merge(base,patch,depth=0){
    if(depth>12)throw Error('状态嵌套超过限制');
    if(Array.isArray(patch))return copy(patch);
    if(!plain(patch))return patch;
    const out=plain(base)?copy(base):{};
    for(const [k,v]of Object.entries(patch))if(safe(k))out[k]=plain(v)?merge(out[k],v,depth+1):copy(v);
    return out;
  }
  function blocks(raw){
    return [...String(raw||'').matchAll(/\[status\]([\s\S]*?)\[\/status\]/g)].map(m=>m[1]);
  }
  function strip(raw){return String(raw||'').replace(/\[status\][\s\S]*?(?:\[\/status\]|$)/g,'').trim();}
  function rebuild(messages,initial,choices={}){
    let state=copy(initial);const versions=[],issues=[];
    for(const [i,m]of messages.entries()){
      if(m.role!=='assistant')continue;
      const id=String(m.id||'row-'+i),raw=String(m.raw??m.text??'');
      blocks(raw).forEach((body,n)=>{
        try{
          if(body.length>120000)throw Error('状态块过长');
          const patch=JSON.parse(body);if(!plain(patch))throw Error('状态必须为对象');
          // Only declared top-level fields may enter model state; arrays replace, including [].
          const allowed=Object.fromEntries(Object.entries(patch).filter(([k])=>safe(k)&&Object.hasOwn(initial,k)));
          const next=merge(state,allowed);versions.push({id,index:n,state:next});
          if(choices[id]!=='ignore')state=next;
        }catch(e){issues.push({id,index:n,error:e.message,body});}
      });
    }
    return {state,versions,issues};
  }
  function validateSave(value,appId){
    if(!plain(value)||value.schema!==1||value.appId!==appId||!plain(value.slots))throw Error('存档版本或作品不匹配');
    if(Object.keys(value.slots).length>12)throw Error('存档槽数量过多');
    for(const [key,slot]of Object.entries(value.slots)){
      if(!safe(key)||!plain(slot)||!plain(slot.data)||!['player','draft','preferences','choices'].every(k=>plain(slot.data[k])))throw Error('存档结构无效');
      for(const p of [slot.data.player,slot.data.draft]){
        if(Object.entries(p).some(([k,v])=>!safe(k)||(k==='active'?!Array.isArray(v)||v.some(x=>typeof x!=='string'):typeof v!=='string')))throw Error('角色数据类型无效');
      }
      if(Object.entries(slot.data.choices).some(([k,v])=>!safe(k)||!['use','ignore'].includes(v)))throw Error('状态选择无效');
      for(const k of ['size','line','volume'])if(!Number.isFinite(slot.data.preferences[k]))throw Error('偏好数值无效');
      if(!['default','light'].includes(slot.data.preferences.theme))throw Error('主题设置无效');
      if(JSON.stringify(slot).length>120000)throw Error('存档过大');
    }
    return copy(value);
  }
  G.SceneState=Object.freeze({copy,merge,blocks,strip,rebuild,validateSave});
})(globalThis);
