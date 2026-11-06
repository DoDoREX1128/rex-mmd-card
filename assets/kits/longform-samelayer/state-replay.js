(function(root){
  'use strict';
  // 完整历史回放；消息顺序由 Host 提供，turn 不作为身份或排序键。
  var plain=function(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);};
  var safe=function(k){return k!=='__proto__'&&k!=='constructor'&&k!=='prototype';};
  function normalize(text){
    return String(text||'')
      .replace(/<\/(?:rex-)?status\s*>/gi,'[/status]')
      .replace(/<(?:rex-)?status(?:\s[^>]*)?>/gi,'[status]')
      .replace(/\[(\/?)rex-status\]/gi,'[$1status]');
  }
  function strip(text){
    return normalize(text).replace(/\[status\][\s\S]*?(?:\[\/status\]|$)/gi,'');
  }
  function initial(){return {turn:0,loc:'',region:'',sum:'',opt:[],me:{},npcs:{},sys:{}};}
  function actor(target,patch){
    if(!plain(patch))return;
    ['name','where','state'].forEach(function(k){if(typeof patch[k]==='string')target[k]=patch[k].slice(0,200);});
    if(Array.isArray(patch.tags))target.tags=patch.tags.filter(function(v){return typeof v==='string';}).slice(0,30);
  }
  function apply(state,patch){
    if(!plain(patch))throw Error('状态必须是对象');
    if(Number.isSafeInteger(patch.turn)&&patch.turn>=0)state.turn=patch.turn;
    ['loc','region','sum'].forEach(function(k){if(typeof patch[k]==='string')state[k]=patch[k].slice(0,k==='sum'?2000:200);});
    if(Array.isArray(patch.opt))state.opt=patch.opt.filter(function(v){return typeof v==='string';}).slice(0,20);
    actor(state.me,patch.me);
    if(plain(patch.npcs))Object.keys(patch.npcs).forEach(function(id){
      if(!safe(id)||!id||id.length>80||!plain(patch.npcs[id]))return;
      if(!Object.hasOwn(state.npcs,id))state.npcs[id]={};
      actor(state.npcs[id],patch.npcs[id]);
    });
    if(plain(patch.sys)&&typeof patch.sys.say==='string')state.sys.say=patch.sys.say.slice(0,2000);
    return state;
  }
  function replay(messages){
    var state=initial(),errors=[],applied=0;
    messages.forEach(function(m,index){
      if(!m||m.role!=='assistant')return;
      var text=normalize(typeof m.raw==='string'?m.raw:m.content);
      var blocks=text.matchAll(/\[status\]([\s\S]*?)\[\/status\]/gi);
      for(var hit of blocks){
        try{apply(state,JSON.parse(hit[1]));applied++;}
        catch(e){errors.push({index:index,id:m.id||'',reason:e.message});}
      }
    });
    return {state:state,errors:errors,applied:applied};
  }
  root.REXLongformState=Object.freeze({normalize:normalize,strip:strip,initial:initial,apply:apply,replay:replay});
})(globalThis);
