/* Standalone scene application. Content and visual tokens are injected by the builder. */
(function(G){
  'use strict';
  const C=G.SceneContent,S=G.SceneState,D=document;
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button=(label,act,value='',extra='')=>`<button type="button" data-act="${act}" data-value="${esc(value)}" ${extra}>${esc(label)}</button>`;
  const $=s=>D.querySelector(s),modules=new Map(),pending=new Map(),history=[];
  const listeners=[];let port=null,contextId='',counter=0,connected=false,disposed=false,loaded=false,busy=false,saveTail=Promise.resolve();
  let current='cover',selected=null,search='',step=0,map={x:0,y:0,z:1},focusBefore=null,lastMessages='';
  let messages=[],snapshot={},replay=S.rebuild([],C.initialState),audio=null,audioNodes=[],audioOn=false;
  let player={},draft={},choices={},preferences={size:17,line:1.9,theme:'default',volume:.15},book={schema:1,appId:C.appId,slots:{}};
  const positions=new Map();
  function on(target,type,fn,options){target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));}
  function notice(text,error=false){$('#notice').textContent=text;$('#notice').dataset.error=String(error);}
  function register(name,module){if(modules.has(name))throw Error('重复模块：'+name);for(const dep of module.needs||[])if(!modules.has(dep))throw Error('缺少依赖：'+dep);modules.set(name,module);}
  function viewData(){return {player:S.copy(player),draft:S.copy(draft),preferences:S.copy(preferences),choices:S.copy(choices)};}
  function restore(data){player=S.copy(data.player||{});draft=S.copy(data.draft||{});preferences={...preferences,...data.preferences};choices=S.copy(data.choices||{});applyTheme();replay=S.rebuild(messages,C.initialState,choices);}
  function applyTheme(){
    for(const [key,value]of Object.entries(C.theme))D.documentElement.style.setProperty('--'+key,value);
    if(preferences.theme==='light'){D.documentElement.style.setProperty('--bg','#f1eee6');D.documentElement.style.setProperty('--surface','#fffdf6');D.documentElement.style.setProperty('--ink','#252933');D.documentElement.style.setProperty('--muted','#5d6470');D.documentElement.style.setProperty('--line','#22222226');}
    D.documentElement.style.setProperty('--reading-size',Math.min(26,Math.max(13,Number(preferences.size)||17))+'px');
    D.documentElement.style.setProperty('--reading-line',Math.min(2.5,Math.max(1.4,Number(preferences.line)||1.9)));
  }
  function request(method,params={}){
    if(!port||!contextId)return Promise.reject(Error('尚未连接宿主'));
    const id=C.appId+'-'+(++counter);
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(Error('结果未确认；保留当前内容，不自动重试'));},12000);
      pending.set(id,{resolve,reject,timer});
      port.postMessage({protocol:'mmd-sl/1',type:'request',buildId:bootstrap.buildId,nonce:bootstrap.nonce,contextId,id,method,params});
    });
  }
  async function persist(slot='auto'){
    const next=S.copy(book);next.slots[slot]={title:slot==='auto'?'自动进度':slot,updated:new Date().toISOString(),data:viewData()};
    const value=S.validateSave(next,C.appId);
    const op=saveTail.catch(()=>{}).then(()=>request('scene.save',{value}));saveTail=op;
    await op;book=value;return true;
  }
  async function act(fn){if(busy)return;busy=true;$('#top').setAttribute('aria-busy','true');try{await fn();}catch(e){notice(e.message,true);}finally{busy=false;$('#top').setAttribute('aria-busy','false');}}
  function navigate(name,back=false){
    if(!modules.has(name))return notice('找不到场景',true);
    const scroll=$('#view').scrollTop;positions.set(current,scroll);modules.get(current)?.leave?.();
    if(!back&&name!==current)history.push(current);current=name;selected=null;render();modules.get(name)?.enter?.();
    $('#view').scrollTop=positions.get(name)||0;
  }
  function render(){
    $('#view').innerHTML=modules.get(current).render();
    for(const b of D.querySelectorAll('#nav [data-act="nav"]'))b.setAttribute('aria-current',String(b.dataset.value===current));
    if(current==='reader')renderReader();
    if(current==='map')bindMap();
  }
  function detail(title,body){focusBefore=D.activeElement;$('#dialog-body').innerHTML=`<h2>${esc(title)}</h2><div class="detail">${esc(body)}</div>`;$('#dialog').showModal();}
  function stateRows(){return C.statusFields.map(f=>`<dt>${esc(f.label)}</dt><dd>${esc(replay.state[f.key]??'—')}</dd>`).join('');}
  function renderReader(){
    const list=$('#messages');if(!list)return;
    const bottom=list.scrollHeight-list.clientHeight-list.scrollTop<70,scroll=list.scrollTop;
    list.innerHTML=messages.length?messages.map(m=>`<article class="message" data-role="${esc(m.role)}"><small>${m.role==='assistant'?'叙事':m.role==='user'?'玩家':'记录'}</small>\n${esc(S.strip(m.raw??m.text))}</article>`).join(''):'<p class="muted">暂无聊天内容。创建角色或在下方写入开场行动。</p>';
    list.scrollTop=bottom?list.scrollHeight:scroll;
    $('#state-fields').innerHTML=stateRows();
    $('#story-options').innerHTML=(Array.isArray(replay.state.options)?replay.state.options:[]).slice(0,8).map(x=>button(String(x),'option',String(x))).join('');
    $('#state-issues').textContent=replay.issues.length?`${replay.issues.length} 处状态格式错误，可到诊断页检查`:'状态已同步';
  }
  function creationFields(){
    return C.creation.filter(f=>f.step===step).map(f=>`<label class="${f.type==='textarea'?'wide':''}">${esc(f.label)}${f.type==='select'?`<select data-field="${esc(f.key)}">${f.options.map(x=>`<option ${String(draft[f.key]??f.options[0])===x?'selected':''}>${esc(x)}</option>`).join('')}</select>`:f.type==='textarea'?`<textarea data-field="${esc(f.key)}" maxlength="2000">${esc(draft[f.key]||'')}</textarea>`:`<input data-field="${esc(f.key)}" value="${esc(draft[f.key]||'')}" maxlength="120">`}</label>`).join('');
  }
  function summary(){return C.creation.map(f=>`${f.label}：${draft[f.key]||f.options?.[0]||'未填写'}`).join('\n')+'\n激活角色：'+(draft.active||[]).map(id=>C.characters.find(x=>x.id===id)?.name||id).join('、');}
  function cover(){return `<section class="hero"><div class="step">${esc(C.subtitle)}</div><h1>${esc(C.title)}</h1><p style="max-width:48rem">${esc(C.description)}</p><div class="row">${button('创建角色','nav','forge')}${button('进入阅读','nav','reader')}${button('继续进度','resume')}${button('查看资料','nav','wiki')}</div><p class="muted">${esc(C.coverNote)}</p></section>`;}
  register('cover',{render:cover});
  register('forge',{needs:['cover'],render:()=>`<div class="row spread"><h2>创建角色</h2><span class="step">${step+1} / 4</span></div><div class="progress"><span style="width:${(step+1)*25}%"></span></div><p class="muted">${['身份与出身','目标与所在地','同伴与关系','确认与提交'][step]}</p>${step<2?`<div class="form-grid">${creationFields()}</div>`:step===2?`<div class="grid">${C.characters.map(x=>`<article class="card ${(draft.active||[]).includes(x.id)?'selected':''}"><h3>${esc(x.name)}</h3><p>${esc(x.brief)}</p><div class="row">${button((draft.active||[]).includes(x.id)?'取消选择':'选择同伴','character',x.id)}${button('人物详情','person',x.id)}</div></article>`).join('')}</div>`:`<pre class="card">${esc(summary())}</pre><p>确认只会生成草稿，不会自动发送。</p>`}<hr class="divider"><div class="row">${button('上一步','step','-1',''+(step===0?'disabled':''))}${step<3?button('下一步','step','1'):button('生成创建草稿','forge-submit')}${button('保存创建进度','save')}${button('返回封面','nav','cover')}</div>`});
  register('reader',{render:()=>`<div class="row spread"><h2>故事阅读</h2><div class="row">${button('跳到最新','latest')}${button('回到开头','first')}${button('阅读设置','nav','preferences')}</div></div><div class="reader"><section><div id="messages" class="messages" tabindex="0" aria-label="聊天正文"></div><div id="story-options" class="choices"></div><label for="composer">行动草稿</label><textarea id="composer" placeholder="你的下一步行动…"></textarea><div class="row">${button('写入原生输入框','draft')}${button('确认发送','send')}${button('返回原生聊天','native')}</div></section><aside class="card side"><h3>${esc(player.name||'当前状态')}</h3><dl id="state-fields"></dl><small id="state-issues"></small><hr class="divider"><p>模型状态来自完整消息历史；草稿、设置与收藏由本地进度保存。</p>${button('查看状态历史','nav','diagnostics')}${button('保存进度','save')}</aside></div>`});
  register('wiki',{render:()=>`<h2>资料百科</h2><input id="wiki-search" aria-label="搜索资料" placeholder="搜索标题、分类或正文" value="${esc(search)}"><div class="choices">${['全部',...new Set(C.entries.map(x=>x.category))].map(x=>button(x,'filter',x)).join('')}</div><div class="grid">${C.entries.filter(x=>(selected===null||selected==='全部'||x.category===selected)&&(!search||[x.title,x.category,x.body].join(' ').includes(search))).map(x=>`<article class="card"><span class="chip">${esc(x.category)}</span><h3>${esc(x.title)}</h3><p>${esc(x.brief)}</p>${button('阅读全文','entry',x.id)}</article>`).join('')||'<p>没有匹配条目，请更换搜索词。</p>'}</div>`});
  register('map',{render:()=>`<div class="row spread"><h2>地区地图</h2><div class="row">${button('放大','zoom','1.2')}${button('缩小','zoom','0.8')}${button('复位','map-reset')}</div></div><p class="muted">拖动地图，滚轮缩放；点击地点查看详情。所在地：${esc(replay.state.location||player.location||'未指定')}</p><div class="map-wrap"><svg viewBox="0 0 800 480" role="img" aria-label="可交互地区地图"><g id="map-world" transform="translate(${map.x},${map.y}) scale(${map.z})">${C.places.slice(1).map((p,i)=>`<line x1="${C.places[i].x}" y1="${C.places[i].y}" x2="${p.x}" y2="${p.y}" stroke="var(--line)" stroke-width="3"/>`).join('')}${C.places.map(p=>`<g class="map-node" data-act="place" data-value="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.name)}" aria-current="${replay.state.location===p.name}" transform="translate(${p.x},${p.y})"><circle r="17"/><text y="40" text-anchor="middle">${esc(p.name)}</text></g>`).join('')}</g></svg></div>`});
  function bindMap(){
    const box=$('.map-wrap'),svg=box.querySelector('svg');let start=null;
    const transform=()=>$('#map-world')?.setAttribute('transform',`translate(${map.x},${map.y}) scale(${map.z})`);
    box.onpointerdown=e=>{if(e.target.closest('[data-act]'))return;start={x:e.clientX,y:e.clientY,mx:map.x,my:map.y};box.setPointerCapture(e.pointerId);};
    box.onpointermove=e=>{if(!start)return;const b=svg.getBoundingClientRect();map.x=start.mx+(e.clientX-start.x)*800/b.width;map.y=start.my+(e.clientY-start.y)*480/b.height;transform();};
    box.onpointerup=box.onpointercancel=()=>{start=null;};
    box.onwheel=e=>{e.preventDefault();map.z=Math.max(.5,Math.min(3,map.z*(e.deltaY<0?1.1:.9)));transform();};
  }
  register('music',{render:()=>`<h2>音乐与氛围</h2><p>内置合成音景不依赖网络与外部素材；可在内容配置中添加自己的音频。</p><div class="grid">${C.tracks.map(x=>`<article class="card"><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p>${button('播放','track',x.id)}</article>`).join('')}</div><hr class="divider"><label>音量<input id="volume" type="range" min="0" max="0.5" step="0.01" value="${preferences.volume}"></label><div class="row">${button('暂停全部','stop-audio')}<span id="audio-status">${audioOn?'正在播放':'已暂停'}</span></div>`,leave:()=>{}});
  async function stopAudio(){for(const n of audioNodes)try{n.stop?.();n.disconnect?.();}catch(_){}audioNodes=[];if(audio instanceof HTMLAudioElement){audio.pause();audio.src='';}else if(audio)await audio.close();audio=null;audioOn=false;}
  async function playTrack(id){
    await stopAudio();const track=C.tracks.find(x=>x.id===id);if(!track)throw Error('找不到音景');
    if(track.url){audio=new Audio(track.url);audio.volume=preferences.volume;audio.loop=true;audio.onerror=()=>notice('音频加载失败，请检查地址与平台媒体策略',true);await audio.play();}
    else{const AC=G.AudioContext||G.webkitAudioContext;if(!AC)throw Error('设备不支持音频合成');audio=new AC();await audio.resume();const gain=audio.createGain();gain.gain.value=preferences.volume*.15;gain.connect(audio.destination);for(const f of track.frequencies){const o=audio.createOscillator();o.type='sine';o.frequency.value=f;o.connect(gain);o.start();audioNodes.push(o);}audioNodes.push(gain);}
    audioOn=true;if(current==='music')render();notice('正在播放：'+track.title);
  }
  register('preferences',{render:()=>`<h2>阅读与外观</h2><div class="form-grid"><label>文字大小<input id="font-size" type="range" min="13" max="26" value="${preferences.size}"></label><label>行距<input id="line-height" type="range" min="1.4" max="2.5" step="0.1" value="${preferences.line}"></label><label>主题<select id="theme"><option value="default" ${preferences.theme==='default'?'selected':''}>作品主题</option><option value="light" ${preferences.theme==='light'?'selected':''}>浅色阅读</option></select></label></div><p class="message">${esc(C.readingSample)}</p>${button('保存偏好','save')}${button('返回阅读','nav','reader')}`});
  register('saves',{render:()=>`<h2>进度与存档</h2><p>作用域由宿主确认；账号、角色、会话或作品不同不会共用本地进度。模型状态仍以消息历史为准。</p><div class="row">${button('保存自动槽','save')}${button('新增命名槽','new-slot')}${button('导出存档','export')}<label>导入存档<input id="import-file" type="file" accept="application/json,.json"></label></div><div class="stack">${Object.entries(book.slots).map(([id,x])=>`<article class="card"><h3>${esc(x.title)}</h3><small>${esc(x.updated)}</small><div class="row">${button('恢复','load-slot',id)}${button('删除此槽','delete-slot',id)}</div></article>`).join('')||'<p class="muted">还没有存档，点击保存后创建。</p>'}</div>`});
  register('diagnostics',{render:()=>`<h2>状态历史与诊断</h2><p>连接：${connected?'已连接':'未连接'}；历史消息 ${messages.length}；有效状态 ${replay.versions.length}；错误 ${replay.issues.length}。</p><div class="row">${button('重新读取宿主','refresh')}${button('恢复全部有效状态','reset-choices')}${button('返回阅读','nav','reader')}</div><h3>当前状态</h3><pre class="card">${esc(JSON.stringify(replay.state,null,2))}</pre><h3>解析异常</h3>${replay.issues.map(x=>`<article class="card"><strong>${esc(x.id)}</strong><p>${esc(x.error)}</p><pre>${esc(x.body)}</pre></article>`).join('')||'<p>无异常。</p>'}<h3>版本选择</h3>${replay.versions.map(x=>`<article class="card"><strong>${esc(x.id)} · ${x.index+1}</strong><pre>${esc(JSON.stringify(x.state,null,2))}</pre>${button(choices[x.id]==='ignore'?'恢复使用':'忽略此消息状态','ignore',x.id)}</article>`).join('')}`});
  register('help',{render:()=>`<h2>帮助与平台功能</h2><div class="grid">${C.help.map(x=>`<article class="card"><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></article>`).join('')}</div><h3>原生入口</h3><p>打开后切回原生页面操作；关闭原生面板后可返回同层。是否可用由当前页面决定。</p><div class="row">${[['人设','openPersona'],['会话','openConversationPanel'],['模型','openModelSettings'],['聊天设置','openChatSettings'],['补充设定','openSupplement'],['更多功能','openMoreMenu']].map(([t,a])=>button(t,'platform',a)).join('')}${button('返回原生聊天','native')}</div><h3>范围</h3><p>完整收录本方法的场景、布局、数据与存档流程。保留既有原生处理器，但未为每项原生动作重新制作独立面板；原生编辑、删除、设置等仍在原生页面完成。不是任意参考卡的全部功能等价承诺。</p>`});
  const handlers={
    nav:v=>navigate(v),back:()=>navigate(history.pop()||'cover',true),
    step:v=>{for(const f of C.creation)if(draft[f.key]===undefined&&f.options)draft[f.key]=f.options[0];if(v==='1'&&step===0&&!String(draft.name||'').trim())throw Error('请填写角色姓名');step=Math.max(0,Math.min(3,step+Number(v)));render();},
    character:id=>{draft.active=draft.active||[];draft.active=draft.active.includes(id)?draft.active.filter(x=>x!==id):[...draft.active,id];render();},
    person:id=>{const x=C.characters.find(x=>x.id===id);if(x)detail(x.name,x.body);},
    'forge-submit':()=>{player=S.copy(draft);navigate('reader');$('#composer').value='【角色创建】\n'+summary();notice('创建结果已放入草稿；请检查后确认发送');},
    option:v=>{$('#composer').value=v;$('#composer').focus();},
    draft:async()=>{const text=$('#composer').value;if(!text.trim())throw Error('草稿为空');const r=await request('native.invoke',{action:'setInputText',payload:{text}});if(r?.ok===false)throw Error(r.reason||'写入失败');notice('已写入原生输入框，尚未发送');},
    send:async()=>{const input=$('#composer'),text=input.value;if(!text.trim())throw Error('草稿为空');const r=await request('native.invoke',{action:'sendMessage',payload:{text}});if(r?.ok===false)throw Error(r.reason||'发送失败');if(input.value===text)input.value='';notice('发送请求已触发；回复及服务端保存尚未确认');},
    native:()=>request('ui.native'),platform:async v=>{await request('native.invoke',{action:v,payload:{}});await request('ui.native');},
    entry:id=>{const x=C.entries.find(x=>x.id===id);if(x)detail(x.title,x.body);},
    filter:v=>{selected=v;render();},place:id=>{const x=C.places.find(x=>x.id===id);if(x)detail(x.name,x.description);},
    zoom:v=>{map.z=Math.max(.5,Math.min(3,map.z*Number(v)));render();},'map-reset':()=>{map={x:0,y:0,z:1};render();},
    track:playTrack,'stop-audio':async()=>{await stopAudio();render();},
    save:async()=>{await persist();notice('进度已保存');if(current==='saves')render();},
    resume:async()=>{const x=await request('scene.load');if(!x?.slots?.auto)throw Error('没有可恢复的自动进度');book=S.validateSave(x,C.appId);restore(book.slots.auto.data);navigate('reader');notice('自动进度已恢复');},
    'new-slot':async()=>{if(Object.keys(book.slots).length>=12)throw Error('最多保留12个槽');const id='slot-'+Date.now();await persist(id);render();notice('命名槽已保存');},
    'load-slot':id=>{if(!book.slots[id])throw Error('存档不存在');restore(book.slots[id].data);navigate('reader');notice('存档已恢复');},
    'delete-slot':async id=>{if(!G.confirm('仅删除此本地存档槽，确定继续？'))return;const value=S.copy(book);delete value.slots[id];await request('scene.save',{value});book=value;render();notice('存档槽已删除');},
    export:()=>{const blob=new Blob([JSON.stringify(book,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=D.createElement('a');a.href=url;a.download=C.appId+'-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('已生成存档下载');},
    refresh:async()=>{const x=await request('snapshot.now');applySnapshot(x);notice('已重新读取宿主');},
    ignore:id=>{choices[id]=choices[id]==='ignore'?'use':'ignore';replay=S.rebuild(messages,C.initialState,choices);render();},
    'reset-choices':()=>{choices={};replay=S.rebuild(messages,C.initialState);render();},
    latest:()=>{$('#messages').scrollTop=$('#messages').scrollHeight;},first:()=>{$('#messages').scrollTop=0;},
    'dialog-close':()=>$('#dialog').close()
  };
  async function importSave(value){const next=S.validateSave(value,C.appId);await request('scene.save',{value:next});book=next;render();notice('存档已导入；选择恢复槽位后应用');}
  function applySnapshot(value){
    if(!value||!value.native)return;snapshot=value;connected=!!value.native.connected;
    $('#connection').textContent=connected?(value.localPreview?'本地模拟连接':'宿主已连接'):'宿主不可用';
    const next=Array.isArray(value.native.messages)?value.native.messages:[],signature=JSON.stringify(next);
    if(signature!==lastMessages){lastMessages=signature;messages=next;replay=S.rebuild(messages,C.initialState,choices);if(current==='reader')renderReader();}
  }
  let bootstrap={};try{bootstrap=JSON.parse(G.name||'{}');}catch(_){}
  function connect(e){
    const m=e.data;if(e.source!==G.parent||m?.protocol!=='mmd-sl/1'||m.type!=='connect'||!e.ports?.[0])return;
    if(m.buildId!==bootstrap.buildId||m.nonce!==bootstrap.nonce||e.origin!==bootstrap.parentOrigin)return;
    if(port){e.ports[0].close();return;}port=e.ports[0];
    port.onmessage=event=>{
      const m=event.data;if(m?.protocol!=='mmd-sl/1')return;
      if(m.type==='snapshot'){
        contextId=m.contextId;applySnapshot(m.snapshot);
        if(!loaded){loaded=true;act(async()=>{const value=await request('scene.load');if(value){book=S.validateSave(value,C.appId);if(book.slots.auto)restore(book.slots.auto.data);}render();notice('界面已准备');});}
      }else if(m.contextId!==contextId)return;
      else if(m.type==='result'){
        const p=pending.get(m.id);if(!p)return;clearTimeout(p.timer);pending.delete(m.id);m.ok?p.resolve(m.result):p.reject(Error(m.error||m.code||'宿主操作失败'));
      }else if(m.type==='notice')notice(m.text);
    };
    port.start();port.postMessage({protocol:'mmd-sl/1',type:'ready',buildId:bootstrap.buildId,nonce:bootstrap.nonce});
  }
  on(G,'message',connect);
  on(D,'click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const handler=handlers[b.dataset.act];if(handler)act(()=>handler(b.dataset.value));});
  on(D,'keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.map-node')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  on($('#dialog'),'close',()=>{focusBefore?.focus?.();});
  on(D,'input',e=>{
    const el=e.target;if(el.dataset.field)draft[el.dataset.field]=el.value;
    if(el.id==='wiki-search'){search=el.value;const start=el.selectionStart;render();$('#wiki-search').focus();$('#wiki-search').setSelectionRange(start,start);}
    if(el.id==='font-size')preferences.size=Number(el.value);if(el.id==='line-height')preferences.line=Number(el.value);
    if(el.id==='volume'){preferences.volume=Number(el.value);if(audio instanceof HTMLAudioElement)audio.volume=preferences.volume;else{const gain=audioNodes.find(x=>x.gain);if(gain)gain.gain.value=preferences.volume*.15;}}
    applyTheme();
  });
  on(D,'change',e=>{
    if(e.target.dataset.field)draft[e.target.dataset.field]=e.target.value;
    if(e.target.id==='theme'){preferences.theme=e.target.value;applyTheme();}
    if(e.target.id==='import-file'){const file=e.target.files[0];if(file)act(async()=>{if(file.size>500000)throw Error('存档文件过大');await importSave(JSON.parse(await file.text()));});}
  });
  function destroy(){if(disposed)return;disposed=true;listeners.splice(0).forEach(fn=>fn());for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('界面已卸载'));}pending.clear();port?.close();for(const m of modules.values())m.dispose?.();stopAudio().catch(()=>{});}
  on(G,'pagehide',destroy);applyTheme();render();
  G.SceneApp=Object.freeze({navigate,request,importSave,destroy,inspect:()=>({current,connected,modules:[...modules.keys()],player:S.copy(player),draft:S.copy(draft),replay:S.copy(replay),book:S.copy(book),preferences:S.copy(preferences),busy,disposed})});
})(globalThis);
