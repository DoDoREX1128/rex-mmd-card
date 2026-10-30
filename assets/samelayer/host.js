/* Legacy-only Host. A small, accurately advertised bridge, not a 61-action implementation. */
(function(){
  'use strict';
  var W=window,D=document,KEY='REXHUDHOST',VER=2,CFG=W.REXHUDCONFIG||{};
  if(W[KEY] && W[KEY].ver===VER){W[KEY].reenter();return;}
  if(W[KEY] && W[KEY].destroy)W[KEY].destroy();
  var SEL={
    messageList:['#msglistview','.scroll-view'],
    messageItem:['#msglistview .item.Ai','#msglistview .item.self'],
    input:['#chat-input-scope textarea.uni-textarea-textarea','#chat-input-scope textarea'],
    sendBtn:['.chat-send-proxy','.chat-bottom .send-btn'],
    personaEntry:['[id*="ico_persona_"]','[class*="ico_persona_"]'],
    moreEntry:['[id*="ico_chat_set_"]','.more-scope .more-btn'],
    dialogInput:['.dialog-scope input.uni-input-input','.uni-modal input.uni-input-input'],
    dialogConfirm:['.dialog-scope .confirm-btn','.uni-modal .confirm-btn']
  };
  if(CFG.selectors)Object.keys(SEL).forEach(function(k){if(Array.isArray(CFG.selectors[k])&&CFG.selectors[k].every(function(x){return typeof x==='string';}))SEL[k]=CFG.selectors[k];});
  function pick(list){for(var i=0;i<list.length;i++)try{var e=D.querySelector(list[i]);if(e)return e;}catch(e){}return null;}
  var state={frame:null,root:null,port:null,returnButton:null,ready:false,disposed:false,busy:false};
  var route=W.location.hash,session=Array.from(W.crypto.getRandomValues(new Uint32Array(4))).join('-');
  function scope(){
    var s=typeof W.REXHUDSCOPE==='function'?W.REXHUDSCOPE():CFG.scope;
    if(!s||!['accountKey','roleId','conversationKey'].every(function(k){return typeof s[k]==='string'&&s[k].length>0&&s[k].length<=200;}))return null;
    return 'rex-sl:'+['accountKey','roleId','conversationKey'].map(function(k){return encodeURIComponent(s[k]);}).join(':');
  }
  function status(){return {ready:state.ready,hasMessages:!!pick(SEL.messageList),hasInput:!!pick(SEL.input),hasSend:!!pick(SEL.sendBtn),messageCount:D.querySelectorAll(SEL.messageItem.join(',')).length,title:D.title||'',storageAvailable:!!scope()};}
  function capabilities(){return {implemented:['snapshot','setInput','send','openPersona','openMore','fillDialog','confirmDialog','storage.get','storage.set','capabilities','returnNative'],unimplemented:['editMessage','deleteMessage','rollbackMessage'],available:{send:!!pick(SEL.sendBtn),setInput:!!pick(SEL.input),'storage.get':!!scope(),'storage.set':!!scope()},realMmd:'NOT RUN'};}
  function put(el,text){
    if(!el)return {ok:false,reason:'input-not-found'};
    var proto=el.tagName==='TEXTAREA'?W.HTMLTextAreaElement.prototype:W.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,'value').set.call(el,String(text==null?'':text));
    el.dispatchEvent(new W.Event('input',{bubbles:true}));el.dispatchEvent(new W.Event('change',{bubbles:true}));return {ok:true};
  }
  function hide(){if(state.root)state.root.style.display='none';if(state.returnButton)state.returnButton.style.display='block';}
  function show(){if(state.root)state.root.style.display='block';if(state.returnButton)state.returnButton.style.display='none';}
  function invoke(method,params){
    params=params||{};
    if(state.disposed)return {ok:false,reason:'disposed'};
    if(Array.isArray(CFG.allowedActions)&&CFG.allowedActions.indexOf(method)<0)return {ok:false,reason:'action-not-allowed'};
    var el;
    switch(method){
      case 'snapshot':return {ok:true,data:status()};
      case 'capabilities':return {ok:true,data:capabilities()};
      case 'setInput':return put(pick(SEL.input),params.text);
      case 'send':
        if(state.busy)return {ok:false,reason:'busy'};
        el=pick(SEL.input);if(!el)return {ok:false,reason:'input-not-found'};
        if(params.text!=null && el.value.trim() && el.value!==String(params.text))return {ok:false,reason:'draft-conflict'};
        if(params.text!=null)put(el,params.text);
        if(!el.value.trim())return {ok:false,reason:'empty-draft'};
        var button=pick(SEL.sendBtn);if(!button)return {ok:false,reason:'send-not-found'};
        state.busy=true;button.click();setTimeout(function(){state.busy=false;},300);
        return {ok:true,data:{phase:'triggered',replyComplete:false,serverSaved:false}};
      case 'openPersona':case 'openMore':
        el=pick(method==='openPersona'?SEL.personaEntry:SEL.moreEntry);if(!el)return {ok:false,reason:'entry-not-found'};
        hide();el.click();return {ok:true,data:{phase:'opened-native',returnVia:'返回同层'}};
      case 'fillDialog':return put(pick(SEL.dialogInput),params.text);
      case 'confirmDialog':
        if(params.confirmed!==true)return {ok:false,reason:'confirmation-required'};
        el=pick(SEL.dialogConfirm);if(!el)return {ok:false,reason:'dialog-not-open'};
        el.click();return {ok:true,data:{phase:'triggered',serverSaved:false}};
      case 'storage.get':case 'storage.set':
        var key=scope();if(!key)return {ok:false,reason:'verified-scope-required'};
        try{
          if(method==='storage.get')return {ok:true,data:JSON.parse(W.localStorage.getItem(key)||'null')};
          var encoded=JSON.stringify(params.value);if(encoded.length>64000)return {ok:false,reason:'storage-too-large'};
          W.localStorage.setItem(key,encoded);return {ok:true};
        }catch(e){return {ok:false,reason:'storage-failed:'+e.message};}
      case 'editMessage':case 'deleteMessage':case 'rollbackMessage':return {ok:false,reason:'not-implemented'};
      case 'returnNative':hide();return {ok:true};
      default:return {ok:false,reason:'unknown-method'};
    }
  }
  function destroy(){
    state.disposed=true;if(state.port)state.port.close();
    if(state.root)state.root.remove();if(state.returnButton)state.returnButton.remove();
    W.removeEventListener('hashchange',onRoute);W.removeEventListener('pagehide',destroy);
    if(W[KEY]===api)delete W[KEY];
  }
  function onRoute(){if(W.location.hash!==route)destroy();}
  function mount(){
    var root=D.createElement('div');root.id='rex-hud-root';root.style.cssText='position:fixed;inset:0;z-index:10000;background:#10161c;';
    var frame=D.createElement('iframe');frame.title='MMD 同层界面';frame.setAttribute('sandbox','allow-scripts');
    frame.style.cssText='width:100%;height:100%;border:0;display:block';
    frame.addEventListener('load',function(){
      if(state.port)state.port.close();state.ready=false;
      var channel=new W.MessageChannel();state.port=channel.port1;
      state.port.onmessage=function(e){
        var d=e.data;if(!d||d.session!==session||d.protocol!=='rex-sl/2')return;
        if(d.type==='ready'){state.ready=true;return;}
        if(d.type!=='invoke'||typeof d.id!=='string'||typeof d.method!=='string')return;
        var result;try{result=invoke(d.method,d.params);}catch(err){result={ok:false,reason:err.message};}
        state.port.postMessage(Object.assign({protocol:'rex-sl/2',session:session,type:'result',id:d.id},result));
      };state.port.start();
      frame.contentWindow.postMessage({protocol:'rex-sl/2',type:'connect',session:session},'*',[channel.port2]);
    });
    frame.srcdoc=CFG.frameScriptSource||'<p>Frame 未加载</p>';
    root.appendChild(frame);D.body.appendChild(root);
    var back=D.createElement('button');back.textContent='返回同层';back.style.cssText='position:fixed;right:12px;bottom:12px;z-index:10000;padding:10px;display:none';
    back.addEventListener('click',show);D.body.appendChild(back);
    state.root=root;state.frame=frame;state.returnButton=back;
  }
  var api={ver:VER,reenter:show,destroy:destroy,invoke:invoke,status:status,capabilities:capabilities};
  W[KEY]=api;W.addEventListener('hashchange',onRoute);W.addEventListener('pagehide',destroy);mount();
})();
