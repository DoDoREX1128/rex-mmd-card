/* Versioned SDK storage. No silent switch to localStorage in a sandbox. */
(function () {
  var R = window.__REX__;
  if (!R) return;
  var generation = 0, queue = Promise.resolve(), retry = null, envelope = null;
  var keys = ['player','status','world','npcs','codex','bag','log','flags','opt','map','settings'];
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function clean(v, depth) {
    if ((depth || 0) > 8) return null;
    if (v === null || typeof v === 'boolean' || typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'string') return v.slice(0, 12000);
    if (Array.isArray(v)) return v.slice(0, 200).map(function(x){ return clean(x, (depth || 0)+1); });
    if (!v || typeof v !== 'object') return null;
    var out = {};
    Object.keys(v).slice(0, 200).forEach(function(k){
      if (['__proto__','prototype','constructor'].indexOf(k) < 0) out[k] = clean(v[k], (depth || 0)+1);
    });
    return out;
  }
  R.cleanData = function(d) {
    var out = {};
    var arrays=['bag','log','flags','opt'];
    keys.forEach(function(k){
      if(!d || !Object.prototype.hasOwnProperty.call(d,k))return;
      if(arrays.indexOf(k)>=0){if(Array.isArray(d[k]))out[k]=clean(d[k]);}
      else if(d[k] && typeof d[k]==='object' && !Array.isArray(d[k]))out[k]=clean(d[k]);
    });
    return out;
  };
  function storageKey() {
    var c = R.content(), setting = c.storage || {};
    // SDK owns its account/role/conversation scope. Never infer one from DOM IDs.
    return setting.key || 'rex:' + ((c.meta || {}).name || 'card');
  }
  function snapshot() {
    return { turn: R.turn || 0, data: clone(R.cleanData(R.data)), nav: R.state.nav, key: R.state.key, history: clone(R.statusHistory || []) };
  }
  function fresh() { return {v:3, updatedAt:0, auto:null, slots:[], settings:{choiceBehavior:'stageDraft'}}; }
  function notify(ok, error) {
    R.storageStatus = {ok:ok, error:error ? String(error.message || error) : '', retry:!!retry};
    if (!ok && R.state.booted && R.toast) R.toast('进度未保存，请在存档页重试');
  }
  function migrate(raw) {
    if (!raw) return fresh();
    if (raw.v === 2 && raw.data) return {v:3, updatedAt:0, auto:{turn:0,data:R.cleanData(raw.data),nav:raw.nav,key:raw.key}, slots:[],settings:{choiceBehavior:'stageDraft'}};
    if (raw.v !== 3 || !Array.isArray(raw.slots)) throw Error('存档版本不兼容，原档已保留；可导出后处理或确认新开');
    var e = fresh();
    e.updatedAt = Number(raw.updatedAt) || 0;
    e.auto = raw.auto && clean(raw.auto);
    e.slots = raw.slots.slice(0,20).filter(function(s){return s && typeof s.id === 'string' && s.snap && s.snap.data;}).map(cleanSlot);
    if (raw.settings && ['stageDraft','direct'].indexOf(raw.settings.choiceBehavior) >= 0) e.settings.choiceBehavior = raw.settings.choiceBehavior;
    return e;
  }
  function cleanSlot(s) { return {id:s.id.slice(0,80),name:String(s.name||'存档').slice(0,40),ts:Number(s.ts)||0,summary:String(s.summary||'').slice(0,200),snap:clean(s.snap)}; }
  R.snapshot = snapshot;
  R.storageEnvelope = function(){ return clone(envelope || fresh()); };
  R.exportSave = function(){ return JSON.stringify(envelope || fresh(),null,2); };
  R.saveGet = function() {
    var sdk = R.sdkGet();
    if (!sdk || !sdk.save || typeof sdk.save.get !== 'function') { R.storageReadError = true; notify(false, Error('当前环境不支持 SDK 存档')); return null; }
    try {
      envelope = migrate(sdk.save.get(storageKey()));
      R.storageReadError = false; retry = null; notify(true);
      return envelope.auto;
    } catch(e) { R.storageReadError = true; notify(false,e); return null; }
  };
  R.applySave = function(saved) {
    if (!saved || !saved.data || typeof saved.data !== 'object') return false;
    var data = R.cleanData(saved.data);
    keys.forEach(function(k){ if (Object.prototype.hasOwnProperty.call(data,k)) R.data[k] = data[k]; });
    R.turn = Math.max(0,Number(saved.turn)||0);
    R.statusHistory = Array.isArray(saved.history) ? clean(saved.history) : [];
    if (R.turn && !R.statusHistory.length) R.statusHistory = [{turn:R.turn, data:clone(R.data)}];
    if (saved.nav && R.sections[saved.nav]) R.state.nav = saved.nav;
    R.state.key = saved.key || null;
    R.state.hasSave = true;
    return true;
  };
  R.saveSet = function(key, value) {
    if (R.storageReadError) { notify(false,Error('读档未确认，禁止自动覆盖原档')); return Promise.resolve(false); }
    var token = generation, targetKey = storageKey(), sdk = R.sdkGet();
    var payload = clone(value);
    var task = function() {
      if (token !== generation || R.disposed) return false;
      if (!sdk || !sdk.save || typeof sdk.save.set !== 'function') throw Error('存档不可用');
      return Promise.resolve(sdk.save.set(targetKey,payload)).then(function(){
        if (token !== generation) return false;
        retry = null; notify(true); return true;
      });
    };
    queue = queue.catch(function(){}).then(task).catch(function(e){
      if (token === generation) { retry = {key:targetKey,value:payload}; notify(false,e); }
      return false;
    });
    return queue;
  };
  R.persist = function(immediate) {
    clearTimeout(R._saveH);
    function write() {
      envelope = envelope || fresh();
      envelope.auto = snapshot(); envelope.updatedAt = Date.now();
      return R.saveSet(storageKey(),envelope);
    }
    if (immediate) return write();
    R._saveH = setTimeout(write,300); return Promise.resolve(true);
  };
  R.retrySave = function() { return retry ? R.saveSet(retry.key,retry.value) : Promise.resolve(true); };
  R.saveSlot = function(name, id) {
    envelope = envelope || fresh();
    var slot = envelope.slots.find(function(x){return x.id === id;});
    if (!slot && envelope.slots.length >= ((R.content().storage || {}).maxSlots || 8)) return Promise.resolve(false);
    if (!slot) { slot = {id:'slot-'+Date.now()+'-'+Math.random().toString(36).slice(2)}; envelope.slots.push(slot); }
    slot.name = String(name || '手动存档').slice(0,40); slot.ts=Date.now(); slot.snap=snapshot();
    slot.summary='第 '+R.turn+' 轮 · '+String(R.data.status.loc || R.data.map.at || '当前场景').slice(0,80);
    return R.persist(true);
  };
  R.deleteSlot = function(id, confirmed) {
    if (!confirmed || !envelope) return Promise.resolve(false);
    envelope.slots=envelope.slots.filter(function(s){return s.id!==id;}); return R.persist(true);
  };
  R.loadSlot = function(id) {
    if (!envelope) return false;
    var slot = id==='auto' ? {snap:envelope.auto} : envelope.slots.find(function(s){return s.id===id;});
    if (!slot || !R.applySave(slot.snap)) return false;
    R.pendingResume = R.resumeContext();
    R.refresh(); R.toast('已恢复游戏快照，旧聊天消息仍在'); return true;
  };
  R.resumeContext = function() {
    var fields = ((R.content().status || {}).fields || []).map(function(f){return f.key;});
    var status={};fields.forEach(function(k){ if(R.data.status[k]!==undefined)status[k]=R.data.status[k]; });
    return '[resume_context]\n'+('时间点：第 '+(R.turn||0)+' 轮\n状态：'+JSON.stringify(status)+'\n选项：'+JSON.stringify(R.data.opt||[])).slice(0,1200)+'\n以此快照为准，忽略该时间点之后的旧剧情。\n[/resume_context]';
  };
  R.confirmSend = function(text) {
    if (R.sending || !String(text||'').trim()) return Promise.resolve(false);
    var sdk=R.sdkGet(), resume=R.pendingResume||'', token=generation;
    if (!sdk || !sdk.message || typeof sdk.message.send!=='function') return Promise.resolve(false);
    R.sending=true;
    return Promise.resolve().then(function(){return sdk.message.send((resume?resume+'\n':'')+text);}).then(function(){
      if(token===generation && R.pendingResume===resume) R.pendingResume=''; return true;
    }).catch(function(e){if(token===generation) R.toast('发送失败，草稿与续档信息已保留');return false;}).finally(function(){if(token===generation)R.sending=false;});
  };
  R.reset = function(confirmed) {
    if (!confirmed) return Promise.resolve(false);
    R.storageReadError=false;envelope=fresh();
    R.data={player:{},status:{},world:{},npcs:{},codex:{},bag:[],log:[],flags:[],opt:[],map:{}};
    R.turn=0;R.statusHistory=[];R.pendingResume='';R.state.hasSave=false;
    return R.persist(true);
  };
  R.on('conversation:switch',function(){
    generation++;clearTimeout(R._saveH);envelope=null;retry=null;R.sending=false;R.pendingResume='';
    R.data={player:{},status:{},world:{},npcs:{},codex:{},bag:[],log:[],flags:[],opt:[],map:{}};R.turn=0;R.statusHistory=[];
    R.applySave(R.saveGet());R.refresh();
  });
  R.on('dispose',function(){generation++;clearTimeout(R._saveH);retry=null;});
})();
