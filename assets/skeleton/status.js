/* Model protocol: [status]{JSON}[/status]. Parse original message content. */
(function () {
  var R = window.__REX__;
  if (!R) return;
  var block = /\[status\]([\s\S]*?)\[\/status\]/;
  var copy = function(v){return JSON.parse(JSON.stringify(v));};
  var config = function(){return (window.__REX_CONTENT__ || {}).status || {};};
  function parse(raw) {
    var text=String(raw || '').trim().replace(/^```[a-z]*\s*/i,'').replace(/```\s*$/,'');
    var a=text.indexOf('{'), b=text.lastIndexOf('}');
    if(a<0) return null;
    text=b>a?text.slice(a,b+1):text.slice(a);
    var fixed=text.replace(/[“”]/g,'"').replace(/，/g,',').replace(/：/g,':')
      .replace(/,\s*([}\]])/g,'$1').replace(/([{,]\s*)([A-Za-z_]\w*)(\s*:)/g,'$1"$2"$3');
    for(var i=0;i<2;i++)try{
      var obj=JSON.parse(i?fixed:text);
      if(obj && typeof obj==='object' && !Array.isArray(obj))return obj;
    }catch(e){}
    var out={};
    (config().fields || []).forEach(function(f){
      if(f.type!=='text' || typeof f.key!=='string' || !/^[\p{L}_][\p{L}\p{N}_-]{0,63}$/u.test(f.key))return;
      var m=new RegExp('"'+f.key+'"\\s*:\\s*"([^"\\n]{0,120})"').exec(text);
      if(m)out[f.key]=m[1];
    });
    return Object.keys(out).length?out:null;
  }
  R.parseStatus=parse;
  function clip(obj) {
    var out={};
    (config().fields || []).forEach(function(f){
      if(typeof f.key!=='string'||!/^[\p{L}_][\p{L}\p{N}_-]{0,63}$/u.test(f.key)||['constructor','prototype','__proto__'].indexOf(f.key)>=0)return;
      var v=obj[f.key]; if(v===undefined || v===null)return;
      if(f.type==='bar'||f.type==='num'){
        if(typeof v!=='number' && typeof v!=='string' || String(v).trim()==='')return;
        var n=Number(v);if(!isFinite(n))return;
        var max=Number.isFinite(Number(f.max))?Number(f.max):(f.type==='bar'?100:1000000000);
        var min=Number.isFinite(Number(f.min))?Number(f.min):(f.type==='bar'?0:-1000000000);
        out[f.key]=Math.max(min,Math.min(max,Math.round(n)));
      }else if(f.type==='tag'||f.type==='tags'){
        if(Array.isArray(v))out[f.key]=v.slice(0,6).filter(function(x){return typeof x==='string';}).map(function(x){return x.slice(0,40);});
      }else if(typeof v==='string')out[f.key]=v.slice(0,Number(f.maxLength)||120);
    });
    if(Array.isArray(obj.opt))out.opt=obj.opt.filter(function(v){return typeof v==='string';}).slice(0,4).map(function(v){return v.slice(0,120);});
    return out;
  }
  function applyNpcs(obj) {
    if(!obj || typeof obj!=='object' || Array.isArray(obj))return;
    var known=((window.__REX_CONTENT__ || {}).npcs || []).map(function(n){return n.key;});known.push('__me');
    known.forEach(function(k){
      if(['__proto__','constructor','prototype'].indexOf(k)>=0 || !Object.prototype.hasOwnProperty.call(obj,k))return;
      var src=obj[k];if(!src||typeof src!=='object'||Array.isArray(src))return;
      var next=R.data.npcs[k] || {}, allowed=['rel','fav','note','thought','surface','hooks'];
      allowed.forEach(function(f){
        var v=src[f];if(v===undefined)return;
        if(f==='rel'||f==='fav'){if(typeof v==='number'&&isFinite(v))next[f]=Math.max(-100,Math.min(100,v));}
        else if(typeof v==='string')next[f]=v.slice(0,200);
        else if(Array.isArray(v))next[f]=v.slice(0,8).map(function(x){return Array.isArray(x)?x.slice(0,2).map(function(y){return String(y).slice(0,120);}):String(x).slice(0,120);});
      });
      var privateFields=config().npcPrivateFields || [];
      if(src.priv && privateFields.length){
        next.priv=next.priv||{};
        privateFields.forEach(function(p){if(typeof p==='string' && Object.prototype.hasOwnProperty.call(src.priv,p) && !/^(?:__proto__|constructor|prototype)$/.test(p))next.priv[p]=R.cleanData?R.cleanData({player:src.priv[p]}).player: {};});
      }
      R.data.npcs[k]=next;
    });
  }
  R.applyStatus=function(raw, silent, message) {
    var obj=parse(raw);if(!obj){if(!silent)R.repairHint();return false;}
    var patch=clip(obj);
    if(!Object.keys(patch).length && !obj.npcs)return false;
    var turn=obj.turn===undefined?(R.turn||0)+1:Number(obj.turn);
    if(!Number.isInteger(turn)||turn<0 || turn>10000000)return false;
    if(turn<(R.turn||0))return false;
    var history=R.statusHistory=R.statusHistory||[], prev=history[history.length-1];
    var signature=JSON.stringify(obj);
    if(prev && prev.turn===turn && prev.signature===signature)return true;
    var before=prev&&prev.turn===turn?prev.before:copy(R.data);
    if(prev&&prev.turn===turn){R.data=copy(before);history.pop();}
    Object.keys(patch).forEach(function(k){R.data.status[k]=patch[k];});
    if(patch.opt)R.data.opt=patch.opt;
    if(patch.flags)R.data.flags=patch.flags;
    if(patch.loc){R.data.map.at=patch.loc;var visited=(R.data.map.visited||[]).slice();if(visited.indexOf(patch.loc)<0)visited.push(patch.loc);R.data.map.visited=visited.slice(-100);}
    applyNpcs(obj.npcs);
    R.turn=turn;
    R.data.log=(R.data.log||[]).filter(function(x){return !x||x.turn!==turn;});
    R.data.log.push({turn:turn,at:Date.now()});R.data.log=R.data.log.slice(-100);
    history.push({turn:turn,serverId:message&&message.serverId!=null?message.serverId:null,signature:signature,before:before,data:copy(R.data)});
    if(history.length>40)history.splice(0,history.length-40);
    R.refresh();R.persist(true);return true;
  };
  R.restoreTurn=function(turn){
    var list=(R.statusHistory||[]).filter(function(s){return s.turn<=turn;});
    var item=list[list.length-1];
    if(!item){R.toast('没有可用快照，当前状态保留');return false;}
    R.data=copy(item.data);R.turn=item.turn;R.statusHistory=list;
    R.pendingResume=R.resumeContext?R.resumeContext():'';
    R.toast(item.turn===turn?'已恢复游戏快照，旧聊天仍在':'仅恢复到第 '+item.turn+' 轮，可能不精确');
    R.refresh();R.persist(true);return true;
  };
  R.repairHint=function(){ if(R.toast)R.toast('本轮状态未读到，保留上一份有效状态'); };
  R.on('message:done',function(msg){
    if(!msg || !msg.content || msg.role==='user' || msg.role==='human')return;
    var m=block.exec(msg.content);if(m)R.applyStatus(m[1],false,msg);
  });
})();
