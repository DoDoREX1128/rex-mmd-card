try{window.addEventListener('error',function(e){try{window.__ERR__=String(e.message)+' @'+String(e.lineno)+':'+String(e.colno);}catch(_){}});}catch(_){}
(function () {
  'use strict';
/*__MAP_PRE__*/
  const $ = id => document.getElementById(id);
  let boot;
  try { boot = JSON.parse(window.name); } catch (_) { boot = null; }
  if (!boot || !boot.protocol) {
    if (location.hash.indexOf('devboot') >= 0) {
      boot = { protocol:'mmd-sl/1', buildId:'dev', nonce:'dev', parentOrigin: location.origin };
    } else {
      /* 宿主没写进 window.name、或沙盒下读不到：不退出，等 connect 自报身份 */
      boot = { protocol:'mmd-sl/1', buildId:'', nonce:'', parentOrigin:'' };
      $('notice').textContent = '等待宿主连接…';
    }
  }
  let port = null, contextId = '', snapshot = null, busy = false, disposed = false;
  let devStub = null;          /* 仅 devboot：本地模拟宿主应答 */
  const pending = new Map();
  function say(text) { const n = $('notice'); n.textContent = text; n.classList.add('on'); clearTimeout(say._t); say._t = setTimeout(() => n.classList.remove('on'), 2600); }
  function transmit(value) { port.postMessage({ protocol: 'mmd-sl/1', buildId: boot.buildId, nonce: boot.nonce, contextId, ...value }); }
  function call(method, params = {}) {
    if (!port || !contextId || disposed) {
      if (devStub) { try { return Promise.resolve(devStub(method, params)); } catch (e) { return Promise.reject(e); } }
      return Promise.reject(new Error('尚未连接宿主'));
    }
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('结果尚未确认，请查看原生记录；不会自动重试。')); }, 16000);
      pending.set(id, { resolve, reject, timer }); transmit({ type: 'request', id, method, params });
    });
  }
  function rejectPending(message) { pending.forEach(p => { clearTimeout(p.timer); p.reject(new Error(message)); }); pending.clear(); }
  async function act(fn) {
    if (busy) return; busy = true; paint();
    try { await fn(); } catch (e) { say(e.message); }
    finally { busy = false; paint(); }
  }

  window.addEventListener('resize', () => {
    if (state.nav !== 'map') return;
    if (MS.full && window.innerWidth < 1280) { MS.full = false; paint(); return; }
    if (MS.full) { syncMapFull(); mapBindStage(); }
  });
  /* 全屏舆图按 Esc 退出 */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && MS.full) { MS.full = false; paint(); }
  });

  /* 正文排版：段首字特化（关 / 放大 / 下沉） */
  const TYPO = {
    render(el, text){
      if (!el) return;
      el.dataset.raw = text;
      const cap0 = state.look.cap;
      /* allup / alldrop：每个自然段都特化；up / drop：只特化气泡第一段 */
      const every = cap0 === 'allup' || cap0 === 'alldrop';
      const cap = cap0 === 'allup' ? 'up' : cap0 === 'alldrop' ? 'drop' : cap0;
      if (cap !== 'up' && cap !== 'drop') { el.replaceChildren(document.createTextNode(text)); return; }
      const segs = String(text).split(/\n{2,}/).filter(x => x.trim());
      el.replaceChildren();
      segs.forEach((seg, k) => {
        const p = document.createElement('p');
        p.className = 'rd-para';
        if (!every && k > 0) { p.textContent = seg; el.append(p); return; }   /* 只特化第一段 */
        const lead = (seg.match(/^[「『（(“"'“‘《…·—\s]+/) || [''])[0];
        const i = lead.length;
        const ch = seg.slice(i, i + 1) || seg.slice(0, 1);
        const rest = seg.slice(i + 1);
        const c = document.createElement('span');
        c.className = 'rd-cap' + (cap === 'drop' ? ' is-drop' : '');
        if (cap === 'drop' && lead) {
          const q = document.createElement('i');
          q.className = 'rd-lead';
          q.textContent = lead;
          c.append(q);
        }
        c.append(document.createTextNode(ch));
        if (cap === 'drop') p.append(c, document.createTextNode(rest));
        else p.append(document.createTextNode(lead), c, document.createTextNode(rest));
        el.append(p);
      });
    },
    refresh(){
      document.querySelectorAll('.sl-message-text').forEach(el => {
        if (el.dataset.raw != null) TYPO.render(el, el.dataset.raw);
      });
    }
  };
  window.MmdSameLayerTypo = TYPO;

  /* 滑块：字号 / 行距 实时写入 CSS 变量 */
  document.addEventListener('input', e => {
    const r = e.target.closest('[data-lkr]');
    if (!r) return;
    const k = r.dataset.lkr;
    state.look[k] = parseFloat(r.value);
    applyLook();
    const out = r.parentElement.querySelector('em');
    if (out) out.textContent = k === 'scale' ? fmtScale(state.look.scale) : fmtLh(state.look.lh);
  });

  /* 作者账号探测：只有原生「更多」菜单里存在「编辑角色」时才算作者。
     该项不出现在能力表里，也没有可调用的 itemId，只能开一次菜单读快照。 */
  async function probeAuthor(){
    if (state.authorProbed || !port) return;
    state.authorProbed = true;
    state.authorTries = (state.authorTries || 0) + 1;
    try {
      await call('native.invoke', { action:'openMoreMenu', payload:{} });
      const nat = await pull();
      const items = nat?.actions?.moreMenu?.items || snapshot?.native?.actions?.moreMenu?.items || [];
      /* 没读到条目就下次再试，但最多 3 次，避免每次进终端都闪一下原生菜单 */
      if (!items.length && state.authorTries < 3) state.authorProbed = false;
      else state.author = items.some(it => /编辑角色|编辑角色卡|编辑卡/.test(it.label || ''));
      const mmRev = snapshot?.native?.actions?.moreMenu?.revision;
      await call('native.invoke', { action:'closeMoreMenu', payload: mmRev ? { revision: mmRev } : {} }).catch(() => {});
    } catch (_) { state.author = false; }
    paint();
  }

  /* 原生动作：面板类之外的直接调用 */
  const NATIVE_GROUP = {
    toggleFavorite: 'navigation', refreshConversation: 'navigation',
    openComments: 'navigation', exit: 'navigation', openSharePanel: 'sharePanel',
    openConversationPanel: 'conversationPanel', createConversation: 'conversationPanel',
    openPersona: 'personaPanel',
    openSupplement: 'supplementPanel', openPromptSelector: 'instructionSelector',
    openChatSettings: 'chatSettings', openMoreMenu: 'moreMenu'
  };
  async function nativeAct(action, label, opts){
    if (!port) { say('本地预览未连接 MMD：「' + (label || action) + '」需要在平台内执行。'); return false; }
    try {
      /* 新建会话的按钮长在会话面板里：没开就先开一次（HUD 盖着，玩家看不见过程） */
      const needPanel = action === 'createConversation' && snapshot?.native?.actions?.conversationPanel?.open !== true;
      if (needPanel) {
        await call('native.invoke', { action: 'openConversationPanel', payload: {} });
        await pull();
      }
      const acts = snapshot?.native?.actions || {};
      const g = NATIVE_GROUP[action];
      const payload = (g && acts[g] && acts[g].revision) ? { revision: acts[g].revision } : {};
      await call('native.invoke', { action, payload });
      if (action === 'createConversation') {
        await pull();
        const cur = snapshot?.native?.actions?.conversationPanel;
        if (cur?.open && cur.revision) {
          await call('native.invoke', { action: 'closeConversationPanel', payload: { revision: cur.revision } }).catch(() => {});
        }
        await pull();
      }
      if (opts && opts.message) say(opts.message);
      return true;
    } catch (err) {
      say(err && err.message ? err.message : '原生动作执行失败');
      return false;
    }
  }
  /* 通用原生点击：帮忙回答这类没有独立面板的按钮直接点原生那一颗 */
  async function tapNative(key, label){
    if (!port) { say('本地预览未连接 MMD：「' + (label || key) + '」要在平台内点。'); return; }
    try {
      await call('native.invoke', { action: 'tapNative', payload: { key } });
      /* 结果可能落在原生输入框，拉一次把草稿同步到我们这边 */
      await new Promise(r => setTimeout(r, 320));
      await pull();
      const text = snapshot?.native?.composer?.text || '';
      const box = $('text');
      if (box && text && box.value !== text) { box.value = text; box.dispatchEvent(new Event('input', { bubbles: true })); }
      say(box && text ? '已把建议放进输入框' : '已点「' + (label || key) + '」，结果在原生页');
    } catch (e) {
      say((e && e.message) || '原生动作执行失败');
    }
  }
  /* ── 帮忙回答：原生会弹一列建议，我们把它投影到输入框上方 ───────────── */
  const nativeDoc = () => {
    try { return (window.parent && window.parent !== window) ? window.parent.document : null; } catch (_) { return null; }
  };
  function tapEl(el){
    if (!el) return;
    const w = el.ownerDocument.defaultView || window;
    for (const t of ['pointerdown','mousedown','pointerup','mouseup','click']) {
      const E = t.startsWith('pointer') && w.PointerEvent ? w.PointerEvent : w.MouseEvent;
      el.dispatchEvent(new E(t, { bubbles:true, cancelable:true, composed:true, button:0 }));
    }
  }
  function paintAssist(){
    const bar = $('assistBar'); if (!bar) return;
    const list = state.assistList || [];
    if (!list.length && !state.assistBusy) { bar.hidden = true; bar.replaceChildren(); return; }
    bar.hidden = false;
    const hd = document.createElement('div'); hd.className = 'assist-bar__hd';
    const b = document.createElement('b');
    b.textContent = state.assistBusy ? 'AI 正在想…' : 'AI 递来 ' + list.length + ' 句';
    const i = document.createElement('i');
    i.textContent = state.assistBusy ? '生成期间其它按钮已锁' : '点一句放进输入框 · 不会直接发送';
    hd.append(b, i);
    bar.replaceChildren(hd);
    if (state.assistBusy) {
      const p = document.createElement('div'); p.className = 'assist-bar__txt';
      p.textContent = '正在根据上下文起草，请稍候……';
      bar.append(p);
      return;
    }
    const wrap = document.createElement('div'); wrap.className = 'assist-bar__list';
    for (const txt of list) {
      const item = document.createElement('button'); item.type = 'button'; item.textContent = txt;
      item.onclick = () => {
        const box = $('text');
        const ok = box && toComposer(txt, { append: false });
        if (ok) box.dispatchEvent(new Event('input', { bubbles: true }));
        state.assistList = []; paintAssist(); say('已放进输入框，可改完再发送');
      };
      wrap.append(item);
    }
    const no = document.createElement('button'); no.type = 'button'; no.className = 'ghost';
    no.textContent = '都不要'; no.onclick = () => { state.assistList = []; paintAssist(); };
    bar.append(wrap, no);
  }
  async function runAssist(){
    if (!port) { say('本地预览未连接 MMD：「帮忙回答」要在平台内执行。'); return; }
    if (state.assistBusy) return;
    state.assistBusy = true; state.assistList = [];
    /* 手机端：先收起导航层回到对话页，否则看不到生成结果 */
    if (MOB.open) { MOB.open = false; MOB.lv = 'brief'; }
    paint(); paintAssist();
    try {
      await call('native.invoke', { action: 'tapNative', payload: { key: 'aiAssist' } });
      const d = nativeDoc();
      let items = [];
      const end = performance.now() + 40000;
      while (performance.now() < end) {
        await new Promise(r => setTimeout(r, 350));
        items = [...(d ? d.querySelectorAll('.ai-chat-item-scope .ai-chat-item .item-content') : [])]
          .map(e => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
        if (items.length) break;
      }
      /* 收起原生建议层：只点它自己的开关 —— 点条目会直接发送，绝不去点 */
      if (d && d.querySelector('.ai-chat-item-scope')) {
        tapEl(d.querySelector('.more-options-scope .btn-icon'));
      }
      state.assistList = items.slice(0, 6);
      say(items.length ? ('AI 递了 ' + state.assistList.length + ' 句，挑一句用') : '没有读到建议，可能还在生成');
    } catch (e) {
      say((e && e.message) || '生成失败');
    } finally {
      state.assistBusy = false;
      paint(); paintAssist();
    }
  }
  /* 二次确认：确认框只有一个入口，避免误触花钱的动作 */
  let confirmTask = null;
  /* 应用内 WebView 可能没有 <dialog>：showModal 一旦不存在，确认框就永远不出现，
     「重置聊天」看起来就是点了没反应。没有就走普通浮层。 */
  function openDlg(dlg){
    if (!dlg || dlg.open) return;
    try {
      if (typeof dlg.showModal === 'function') { dlg.showModal(); return; }
    } catch (_) {}
    dlg.setAttribute('open', '');
    dlg.classList.add('is-open');
  }
  function closeDlg(dlg){
    if (!dlg) return;
    try { if (typeof dlg.close === 'function') dlg.close(); } catch (_) {}
    dlg.removeAttribute('open');
    dlg.classList.remove('is-open');
  }
  function askConfirm(title, text, fn){
    const dlg = $('confirm');
    if (!dlg) { fn && fn(); return; }
    dlg.querySelector('h2').textContent = title;
    dlg.querySelector('p').textContent = text;
    confirmTask = fn || null;
    openDlg(dlg);
  }

  /* 只能从「更多」菜单进的原生入口（快捷栏里没有的那几项） */
  async function openViaMoreMenu(moreKind, label, opts){
    if (!port && !devStub) { say('本地预览未连接 MMD：「' + (label || moreKind) + '」需要在平台内执行。'); return false; }
    const norm = t => String(t || '').replace(/\s+/g, '');
    const want = norm(label || '');
    const sigOf = list => (list || []).map(m => String(m.text || '').slice(0, 60)).join('|');

    /* 不信任快照里的 open：平台可能已经自己收起菜单，而快照还停在上一拍。
       基座的 openMoreMenu 是幂等的（已经开着就 no-op），所以每次都叫一遍。 */
    const openAndFind = async () => {
      await call('native.invoke', { action: 'openMoreMenu', payload: {} });
      await pull();
      let mm = snapshot?.native?.actions?.moreMenu;
      for (let i = 0; i < 8 && !((mm?.items || []).length); i++) {
        await new Promise(r => setTimeout(r, 250));
        await pull();
        mm = snapshot?.native?.actions?.moreMenu;
      }
      /* kind 优先；有些条目（如「重置聊天」）没有登记 kind，按文案兜底 */
      const row = (mm?.items || []).find(i => i.kind === moreKind)
        || (mm?.items || []).find(i => want && norm(i.label).indexOf(want) >= 0)
        || (mm?.items || []).find(i => moreKind === 'resetChat' && /重置|重开|重新开始/.test(String(i.label || '')));
      if (!row) throw Error('「更多」里没有「' + (label || moreKind) + '」这一项');
      return { mm, row };
    };

    const activate = async ({ mm, row }) => {
      const before = (snapshot?.native?.messages || []).length;
      const beforeSig = sigOf(snapshot?.native?.messages || []);
      const res = await call('native.invoke', { action: 'activateMoreMenuItem',
        payload: { revision: mm.revision, itemId: row.id, confirmed: opts?.confirmed === true } });
      await pull();
      /* 基座回的是 { ok, data:{ kind, confirmed } } —— 之前只看 res.result，
         confirmed:false 永远读不到，于是第一次失败也照样干等 7 秒。 */
      const r = (res && (res.data || res.result || res)) || {};
      return { res, r, before, beforeSig };
    };

    const waitCleared = async (before, beforeSig) => {
      let cleared = false;
      /* 慢设备上原生清档 + 重新拉历史要好几秒；给到 13 秒，别几秒就判死 */
      for (let i = 0; i < 24 && !cleared; i++) {
        await new Promise(r2 => setTimeout(r2, 550));
        await pull();
        const now = snapshot?.native?.messages || [];
        cleared = now.length < before || (now.length === before && sigOf(now) !== beforeSig);
        if (!cleared && (i === 4 || i === 10)) {
          try { await call('native.invoke', { action: 'refreshConversation', payload: {} }); } catch (_) {}
        }
      }
      return cleared;
    };

    try {
      let target = await openAndFind();
      let out = await activate(target);

      if (opts?.confirmed) {
        /* 第一次没弹原生确认框：菜单/弹层状态没跟上，自动重来一次，
           不需要玩家再点一遍整个流程。 */
        if (out.r.confirmed === false) {
          try { await call('native.invoke', { action: 'closeMoreMenu', payload: {} }); } catch (_) {}
          await new Promise(r2 => setTimeout(r2, 320));
          await pull();
          target = await openAndFind();
          out = await activate(target);
        }
        if (out.r.confirmed === false) {
          say('原生确认框没有出现，重置没完成 —— 到原生「更多」里再点一次。');
          return false;
        }
        const cleared = await waitCleared(out.before, out.beforeSig);
        /* 聊天清了、但世界/编年/系统还挂着旧存档 —— 玩家看着就像「没重置」。 */
        if (cleared) { resetStory(); await pull(); }
        say(cleared ? '已重置这段聊天' : '已点过重置，但记录还没刷新；稍候片刻或到原生页确认一次。');
        return cleared;
      }
      return true;
    } catch (e) { say((e && e.message) || '打开失败'); return false; }
  }
  /* 编辑角色：走「更多 → 编辑角色」，点了以后平台会跳到作者编辑页 */
  async function revealRoleEdit(){
    if (!port) { say('本地预览未连接 MMD：编辑角色要在平台内打开。'); return false; }
    const ok = await openViaMoreMenu('roleEdit', '编辑角色');
    if (ok) { try { await call('ui.native'); } catch (_) {} }
    return ok;
  }
  /* 没有镜像面板的原生入口：执行后收起 HUD，让你直接在原生页上操作 */
  async function revealAct(action, label){
    const ok = action === 'openTutorial'
      ? await openViaMoreMenu('tutorial', label)
      : await nativeAct(action, label, { silent: true });
    if (!ok) return;
    say('已切到原生面板，处理完点「打开 HUD」回来');
    setTimeout(() => { call('ui.native').catch(() => {}); }, 240);
  }

  /* ============================================================
     数据 —— 初始全空：所有字段只由 AI 的 [status] / [cast] 写入
     ============================================================ */
  const WORLD = {
    date:'', year:0, time:'',
    region:'', spot:'', temp:'', weather:'',
    chapter:0, arc:'', title:'',
    summary:'',
    threat:0, opt:[], near:[], node:'', nodeName:'', turn:0,
    stats:{}, present:[]
  };
  const PLAYER_OBJ = {
    id:'me', name:'你', sex:'', lv:'', rel:'你', fav:100,
    tier:0, state:'', where:'', flesh:null, soul:null,
    tags:[], rows:[], outfit:[], wuhun:[], bones:{}, outer:[], mind:''
  };

  const CAST = [];

  /* ============================================================
     系统 · 寄居于主角识海的存在
     ============================================================ */
  /* ---------------- 物品图标（预制 SVG） ---------------- */
  const ITEM_PATHS = {
    pill:  '<rect x="3.8" y="9.2" width="16.4" height="5.6" rx="2.8" transform="rotate(-45 12 12)"/><path d="M9 15 15 9"/><path d="M7.4 7.4c.8-.8 2-.8 2.8 0"/>',
    bone:  '<path d="M8.4 15.6 15.6 8.4"/><circle cx="6.6" cy="14.4" r="2.1"/><circle cx="9.6" cy="17.4" r="2.1"/><circle cx="17.4" cy="6.6" r="2.1"/><circle cx="14.4" cy="9.6" r="2.1"/>',
    ring:  '<ellipse cx="12" cy="12" rx="8.6" ry="3.6"/><ellipse cx="12" cy="12" rx="8.6" ry="3.6" transform="rotate(58 12 12)" opacity=".55"/><circle cx="12" cy="12" r="1"/>',
    robe:  '<path d="M9.2 4.6 5.8 6.6 4.2 10.2l2.2 1.4 1-1.6v9.4h9.2V10l1 1.6 2.2-1.4-1.6-3.6-3.4-2"/><path d="M9.2 4.6c.6 1.2 1.6 1.8 2.8 1.8s2.2-.6 2.8-1.8"/>',
    scroll:'<path d="M6.4 4.6h8.8L18.8 8v11.4H6.4z"/><path d="M15 4.6V8h3.8"/><path d="M9 11.4h6M9 14.4h4.4"/>',
    gem:   '<path d="M12 3.4 18.6 9 12 20.6 5.4 9z"/><path d="M5.4 9h13.2M12 3.4 9.4 9 12 20.6 14.6 9z" opacity=".55"/>',
    herb:  '<path d="M12 20.4V9.6"/><path d="M12 9.6c-3.4 0-5.4-2-5.4-5 3.4 0 5.4 2 5.4 5Z"/><path d="M12 13.4c3.4 0 5.4-2 5.4-5-3.4 0-5.4 2-5.4 5Z"/>',
    blade: '<path d="M14.4 4.2 19.8 9.6 9.6 19.8H4.2v-5.4z"/><path d="M12.6 6 18 11.4"/>',
    jar:   '<path d="M9 9.6h6v7.2a3 3 0 0 1-6 0z"/><path d="M9.6 9.6V6.2h4.8v3.4"/><path d="M10 5h4"/><path d="M9 13.4h6"/>',
    pin:   '<path d="M12 3.6v16.8"/><circle cx="12" cy="6.8" r="2.4"/><path d="M12 15.4c1.8 0 3.2-1.4 3.2-3.2"/>',
    coin:  '<circle cx="12" cy="12" r="7.6"/><path d="M12 7.6v8.8M9.4 10.4h5.2M9.4 13.6h5.2"/>'
  };
  const ITEM_KW = [
    ['bone', /骨/], ['ring', /魂环|环/], ['pill', /丹|丸|散|膏|药/], ['scroll', /卷|图|符|册|书/],
    ['gem', /晶|石|珠|玉|钻/], ['herb', /草|花|叶|根|香|木/], ['blade', /剑|刀|刃|枪|锤|匕|弓/],
    ['jar', /瓶|壶|罐|囊|袋|盒/], ['robe', /衣|袍|裙|靴|履|冠|簪|饰/]
  ];
  const itemKey = it => (it && it.k) || (ITEM_KW.find(([, re]) => re.test(String((it && it.n) || '')))?.[0]) || 'gem';
  const itemSvg = it => `<svg viewBox="0 0 24 24">${ITEM_PATHS[itemKey(it)] || ITEM_PATHS.gem}</svg>`;

  const SYS_BASE = {
    name:'', alias:'', mood:'', form:'orb', hue:'#8C5CFF',
    /* 形象 = 脑海里的相貌 + 它自己的性格；留言 = 每轮它对当前局面的反应 */
    look:'', trait:'', say:'',
    coins: 0,
    note:'',
    bag:[],
    shop:[]
  };
  /* 可选的系统形象：全部是纯代码 SVG，玩家自己切，AI 管不着 */
  const SYS_FORMS = [
    ['orb', '混沌黑球'], ['mask', '白面具'], ['star', '星尘'],
    ['screen', '暗红屏'], ['eye', '竖瞳']
  ];
  const SYS = Object.assign({}, SYS_BASE);

  /* 编年 · 每轮时间-章节快照 */
  const CHRON = { list: [], key: '' };
  let devChronN = 0;   /* 本地预览：给合成记录编号 */
  /* 动荡 · 本轮字段 diff */
  const DIFF = { prev: null, items: [], at: '', first: false };

  const CAST_PAGE = 6;
  const DEFAULT_PINS = [];

  const lvNum = c => {
    const m = String(c && c.lv || '').match(/(\d+)\s*级/);
    return m ? parseInt(m[1], 10) : 0;
  };
  const castAll = () => [PLAYER_OBJ].concat(CAST);
  const castOf = id => (id === 'me' ? PLAYER_OBJ : CAST.find(x => x.id === id));

  const NAVS = [
    {id:'world', label:'世界', icon:'<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8M12 3.6c2.6 2.4 2.6 14.4 0 16.8M12 3.6c-2.6 2.4-2.6 14.4 0 16.8"/>'},
    {id:'cast', label:'人物', icon:'<circle cx="9" cy="8.2" r="3.1"/><path d="M3.4 19.4c.6-3.2 2.9-5 5.6-5s5 1.8 5.6 5"/><path d="M16.2 6.1a2.6 2.6 0 0 1 0 5M17.6 14.9c2 .5 3.2 2.1 3.6 4.5"/>'},
    {id:'system', label:'系统', icon:'<circle cx="12" cy="12" r="3.5"/><ellipse cx="12" cy="12" rx="8.8" ry="3.4" transform="rotate(-26 12 12)"/><ellipse cx="12" cy="12" rx="8.8" ry="3.4" transform="rotate(40 12 12)" opacity=".55"/><circle cx="19.4" cy="6.6" r="1.1"/><circle cx="12" cy="12" r="1" opacity=".9"/>'},
    {id:'bond', label:'关系', icon:'<circle cx="12" cy="5.6" r="2.3"/><circle cx="5.4" cy="17.2" r="2.3"/><circle cx="18.6" cy="17.2" r="2.3"/><path d="M10.4 7.5 7 15.2M13.6 7.5 17 15.2M7.7 17.2h8.6"/>'},
    {id:'map', label:'地图', icon:'<circle cx="12" cy="12" r="8.4"/><path d="m15.2 8.8-2 4.4-4.4 2 2-4.4z"/>'},
    {id:'chron', label:'编年', icon:'<path d="M5 5.2h11.2a2.6 2.6 0 0 1 2.6 2.6v11H7.6A2.6 2.6 0 0 1 5 16.2z"/><path d="M5 16.2a2.6 2.6 0 0 1 2.6-2.6H18.8M9 8.6h6"/>'},
    {id:'term', label:'终端', icon:'<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2"/><path d="m7.4 9.4 2.6 2.6-2.6 2.6M12.6 14.6h4"/>'},
    {id:'look', label:'外观', icon:'<circle cx="12" cy="12" r="8.4"/><path d="M12 3.6a8.4 8.4 0 0 1 0 16.8 8.4 8.4 0 0 1 0-16.8Z" opacity=".55"/><circle cx="12" cy="12" r="3.2"/><path d="M4.4 8.6c2 .8 4 .8 6 0" opacity=".6"/>'}
  ];

  const NAV_META = {world:['世界','WORLD'],cast:['人物','CAST'],system:['系统','SYSTEM'],
    bond:['关系','BONDS'],map:['地图','ATLAS'],chron:['编年','CHRON'],term:['终端','TERMINAL'],
    look:['外观','LOOK'],more:['更多','MORE']};
  /* 手机底栏：世界 / 人物 / 系统 / 地图 / 终端 + 更多 */
  const PRIMARY_NAV = ['world','cast','system','map','term'];

  const MOB = { open:false, lv:'brief', holdClose:false };

  /* 终端条目：按作者给的四个分区排，从上到下 */
  const FEATURES = [
    {id:'comments', g:'互动', label:'评论', desc:'打开评论区', act:'openComments', reveal:true, icon:'<path d="M4.4 6.4h15.2v9.2H10L4.4 19z"/><path d="M8 10h8M8 12.8h5"/>'},
    {id:'shareRole', g:'互动', label:'分享', desc:'生成 · 复制链接', kind:'panel', panel:'sharing', icon:'<circle cx="17.4" cy="6.2" r="2.6"/><circle cx="6.6" cy="12" r="2.6"/><circle cx="17.4" cy="17.8" r="2.6"/><path d="M9 10.8 15 7.4M9 13.2l6 3.4"/>'},
    {id:'favorite', g:'互动', label:'收藏', desc:'收藏这张卡', act:'toggleFavorite', star:true, icon:'<path d="m12 4.4 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>'},
    {id:'refresh', g:'互动', label:'刷新', desc:'重新拉取本页', act:'refreshConversation', icon:'<path d="M19.6 12a7.6 7.6 0 1 1-2.3-5.4"/><path d="M19.8 4.6v4.2h-4.2"/>'},

    {id:'persona', g:'角色', label:'我的人设', desc:'名字 · 性别 · 身份', kind:'panel', icon:'<circle cx="12" cy="8" r="3.4"/><path d="M5.4 20c.6-3.8 3.2-5.8 6.6-5.8s6 2 6.6 5.8"/>'},
    {id:'supplement', g:'角色', label:'设定补充', desc:'追加世界设定', kind:'panel', icon:'<path d="M5 4.4h9.6L19 8.8v10.8H5z"/><path d="M14.2 4.6v4.4h4.4M8.4 13h7.2M8.4 16.2h4.6"/>'},
    {id:'settings', g:'角色', label:'对话设置', desc:'文风 · 人称 · 字数', kind:'panel', icon:'<circle cx="12" cy="12" r="3"/><path d="M12 3.4v2.4M12 18.2v2.4M20.6 12h-2.4M5.8 12H3.4M18 6 16.3 7.7M7.7 16.3 6 18M18 18l-1.7-1.7M7.7 7.7 6 6"/>'},
    {id:'summary', g:'角色', label:'剧情总结', desc:'内容 · 上限 · 模型', kind:'panel', panel:'summary', icon:'<path d="M6 4.6h12v14.8H6z"/><path d="M9 8.4h6M9 12h6M9 15.6h3.6"/>'},

    {id:'conversations', g:'游玩', label:'会话记录', desc:'切换 · 命名 · 删除', kind:'panel', icon:'<path d="M4 6.2h16v9.6H9.4L4 19.6z"/><path d="M7.6 9.6h8.8M7.6 12.4h5.6"/>'},
    {id:'assist', g:'游玩', label:'帮忙回答', desc:'让 AI 递一句 · 10⚡', tap:'aiAssist', icon:'<path d="M9.4 17.6h5.2M10 20.2h4"/><path d="M12 3.4a5.6 5.6 0 0 1 3.4 10.1c-.7.5-1.1 1.1-1.2 1.9h-4.4c-.1-.8-.5-1.4-1.2-1.9A5.6 5.6 0 0 1 12 3.4Z"/>'},
    {id:'customInstructions', g:'游玩', label:'自定义指令', desc:'指令集 · 增删改', kind:'panel', panel:'customInstructions', icon:'<path d="M5 5.6h9.4L19 10v9.4H5z"/><path d="M8 12.6h7M8 15.6h4.4"/>'},
    /* 原生「更多」菜单里的「重置聊天」投影过来：清空重来必须点两次 */
    {id:'resetChat', g:'游玩', label:'重置聊天', desc:'清空重来 · 需确认', reveal:'resetChat', icon:'<path d="M19.6 12a7.6 7.6 0 1 1-2.3-5.4"/><path d="M19.8 4.6v4.2h-4.2"/><path d="M12 8.6v4.2l3 1.8"/>'},

    {id:'background', g:'其他', label:'更换背景', desc:'重置 · 从相册选', kind:'panel', panel:'background', icon:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="m6.6 16 3.6-4.4 2.8 3.2 2-2.4 2.4 3.6"/><circle cx="9" cy="9" r="1.3"/>'},
    {id:'tutorial', g:'其他', label:'游玩教程', desc:'原生帮助', act:'openTutorial', reveal:true, icon:'<circle cx="12" cy="12" r="8.4"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.7.3-.9.8-.9 1.6"/><circle cx="12" cy="16.6" r=".9"/>'},
    {id:'roleEdit', g:'其他', label:'编辑角色', desc:'跳转作者编辑页', reveal:'roleEdit', authorOnly:true, icon:'<path d="M5 19h4l9.4-9.4a2.2 2.2 0 0 0-3.1-3.1L6 16v3z"/><path d="M13.6 7.2 16.8 10.4"/>'},
    {id:'diag', g:'其他', label:'运行自检', desc:'能力 · 面板 · 连接', local:'diag', icon:'<path d="M12 3.6 20.4 7.8v8.4L12 20.4 3.6 16.2V7.8z"/><path d="m8.4 12.2 2.6 2.6 4.6-4.8"/>'}
  ];
  const FEATURE_GROUPS = ['互动','角色','游玩','其他'];
  /* 终端条目 → 依赖哪个原生动作。平台说不可用时提前标灰，别让人点了才看到报错 */
  const FEATURE_CAP = {
    conversations:'openConversationPanel',
    persona:'openPersona', supplement:'openSupplement',
    shareRole:'openSharePanel', favorite:'toggleFavorite', comments:'openComments',
    refresh:'refreshConversation', roleEdit:'openMoreMenu',
    settings:'openChatSettings', summary:'openSummaryPanel',
    background:'openBackgroundPanel', customInstructions:'openCustomInstructions', tutorial:'openTutorial'
  };

  /* 只留四种真正看得出差别的：宋（衬线）、黑（无衬线）、仿宋（清瘦）、等宽。
     宋 / 黑 / 仿宋 的字面、笔画粗细、字距都不一样，缩到小字也分得开。 */
  const FONTS = [
    {id:'serif', label:'宋韵', desc:'宋体 · 书卷气', stack:'"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun","NSimSun",serif'},
    {id:'hei',   label:'黑体', desc:'无衬线 · 现代', stack:'"PingFang SC","HarmonyOS Sans SC","Noto Sans CJK SC","Source Han Sans SC","Microsoft YaHei UI","Microsoft YaHei",sans-serif'},
    {id:'fang',  label:'仿宋', desc:'仿宋 · 清瘦', stack:'"FangSong","FangSong_GB2312","STFangsong","Noto Serif CJK SC","Songti SC",serif'},
    {id:'mono',  label:'等宽', desc:'等宽 · 终端感', stack:'"JetBrains Mono","Cascadia Mono","Consolas","Noto Sans Mono","Sarasa Mono SC",monospace'}
  ];

  const LOOK_SCALE = [['s','小',.92],['m','标准',1],['l','大',1.1]];
  const LOOK_LH = [['t','紧',1.72],['m','标准',1.86],['w','松',2.06]];
  const LOOK_CAP = [['off','关闭'],['up','首字放大'],['drop','首字下沉'],['allup','每段放大'],['alldrop','每段下沉']];
  const LOOK_ALIGN = [['left','左对齐'],['justify','两端对齐']];

  const SKINS = [
    {id:'liuli',  label:'琉璃紫金', desc:'紫夜 · 鎏金 · 默认'},
    {id:'moxing', label:'墨星',     desc:'近黑 · 银蓝冷调'},
    {id:'xueyue', label:'血月',     desc:'暗红 · 压迫感'},
    {id:'cangyan',label:'苍岩',     desc:'青灰 · 克制'}
  ];
  const CREST = '<svg viewBox="0 0 64 64"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4CE"/><stop offset=".55" stop-color="#D9B36A"/><stop offset="1" stop-color="#8C5CFF" stop-opacity=".55"/></linearGradient></defs><circle cx="32" cy="32" r="29.2" fill="none" stroke="rgba(246,227,174,.22)" stroke-width=".7" stroke-dasharray="1.6 3.6"/><circle cx="32" cy="32" r="24" fill="none" stroke="rgba(140,92,255,.22)" stroke-width=".7"/><path d="M32 10.5 36.2 27 32 53.5 27.8 27Z" fill="url(#cg)"/><path d="M28 26.4C19.4 24.6 13 18.8 9.6 10.6c8.4 3.8 14.6 8.8 18.4 15.8Z" fill="rgba(246,227,174,.62)"/><path d="M36 26.4C44.6 24.6 51 18.8 54.4 10.6c-8.4 3.8-14.6 8.8-18.4 15.8Z" fill="rgba(246,227,174,.62)"/><path d="M27.4 33.6C19 33.4 12.2 30 7.2 24.4c8.2 2.6 14.2 4.8 20.2 9.2Z" fill="rgba(140,92,255,.62)"/><path d="M36.6 33.6C45 33.4 51.8 30 56.8 24.4c-8.2 2.6-14.2 4.8-20.2 9.2Z" fill="rgba(140,92,255,.62)"/><circle cx="32" cy="32" r="3.2" fill="#FFF7DD"/></svg>';

  const state = { nav:'cast', cast:'me', castSort:'default', castPage:0, pins:[],
    sysEdit:false, shopPick:[], chronOpen:-1, mapView:'world', termView:'home', termPanel:'', author:null, authorProbed:false,
    cTab:'base', cSoul:'w0',
    look:{ font:'serif', scale:1, lh:1.86, cap:'off', align:'left', skin:'liuli' },
    read:{ mode:'scroll', page:0, pages:[], lastHit:-1, kw:'', keepPage:-1, keepScroll:-1, returnScroll:null, flipTouched:false },
    assistBusy:false, assistList:[] };

  /* 皮肤 / 字体 */
  function loadPrefs(){
    try {
      const p = JSON.parse(localStorage.getItem('sl-prefs') || '{}');
      if (p.look && typeof p.look === 'object') Object.assign(state.look, p.look);
      const alias = { sans: 'hei', kai: 'fang' };
      if (FONTS.some(f=>f.id===p.font)) state.look.font = p.font;
      else if (alias[p.font]) state.look.font = alias[p.font];
      if (SKINS.some(k=>k.id===p.skin)) state.look.skin = p.skin;
      if (!FONTS.some(f=>f.id===state.look.font)) state.look.font = 'serif';
      if (!SKINS.some(k=>k.id===state.look.skin)) state.look.skin = 'liuli';
      if (p.readMode) state.read.mode = (p.readMode === 'scroll') ? 'scroll' : 'flip';
      if (Array.isArray(p.pins)) state.pins = p.pins.filter(x => x !== 'me');
      if (p.sys && typeof p.sys === 'object') Object.assign(SYS, p.sys);
      if (Array.isArray(p.chron)) {
        CHRON.list = p.chron.slice(0, 60);
        if (CHRON.list[0]) CHRON.key = chronKey(CHRON.list[0]);
      }
      /* 人物 / 世界 / 系统：三个都是「AI 真值」，刷新后必须原样回来。
         只认本代存档（v3）；旧档里的演示数据一律丢弃，避免预设字段回流。 */
      if (p.v === 3) {
        if (Array.isArray(p.cast) && p.cast.length) {
          CAST.length = 0;
          /* 存档里的 wuhun / bones / outer 可能是数组写法（手改档、旧版本），
             一律走 mergeCast 归一；否则武魂页只有空壳、魂环一个都画不出来。 */
          p.cast.forEach(c => {
            if (!c || !c.name) return;
            const b = blankCast(c.name);
            if (c.id) b.id = c.id;
            if (Array.isArray(c.rows)) b.rows = c.rows.slice();
            mergeCast(b, c);
            CAST.push(b);
          });
        }
        if (p.me && typeof p.me === 'object') {
          const m = { ...p.me };
          delete m.wuhun; delete m.bones; delete m.outer;
          Object.assign(PLAYER_OBJ, m);
          mergeWuhun(PLAYER_OBJ, p.me.wuhun || []);
          mergeBones(PLAYER_OBJ, p.me.bones || {});
          mergeOuter(PLAYER_OBJ, p.me.outer || []);
        }
        if (p.world && typeof p.world === 'object') Object.assign(WORLD, p.world);
        if (p.sysFull && typeof p.sysFull === 'object') Object.assign(SYS, p.sysFull);
        if (WORLD.near && WORLD.near.length && typeof setLocalMap === 'function') setLocalMap(WORLD.nodeName || WORLD.spot, WORLD.near);
      }
      state.pins = (state.pins || []).filter(id => CAST.some(c => c.id === id));
      if (state.cast !== 'me' && !CAST.some(c => c.id === state.cast)) state.cast = 'me';
    } catch(_) {}
  }
  function savePrefs(){
    try {
      localStorage.setItem('sl-prefs', JSON.stringify({
        v: 3,
        look:state.look, font:state.look.font, skin:state.look.skin, readMode:state.read.mode,
        pins:state.pins, chron:CHRON.list,
        sys:{ name:SYS.name, alias:SYS.alias, mood:SYS.mood, form:SYS.form, hue:SYS.hue,
              look:SYS.look, trait:SYS.trait, say:SYS.say },
        sysFull:{ coins:SYS.coins, bag:SYS.bag, shop:SYS.shop, note:SYS.note },
        cast: CAST,
        me: { name:PLAYER_OBJ.name, lv:PLAYER_OBJ.lv, flesh:PLAYER_OBJ.flesh, soul:PLAYER_OBJ.soul,
              wuhun:PLAYER_OBJ.wuhun, bones:PLAYER_OBJ.bones, outer:PLAYER_OBJ.outer,
              rows:PLAYER_OBJ.rows, tags:PLAYER_OBJ.tags, mind:PLAYER_OBJ.mind },
        world: { date:WORLD.date, year:WORLD.year, time:WORLD.time, region:WORLD.region, spot:WORLD.spot,
                 temp:WORLD.temp, weather:WORLD.weather, chapter:WORLD.chapter, arc:WORLD.arc, title:WORLD.title,
                 summary:WORLD.summary, threat:WORLD.threat, opt:WORLD.opt, turn:WORLD.turn,
                 near:WORLD.near, node:WORLD.node, nodeName:WORLD.nodeName, present:WORLD.present,
                 stale:WORLD.stale || 0 }
      }));
    } catch(_) {}
  }
  function applyLook(){
    const L = state.look;
    const f = FONTS.find(x=>x.id===L.font) || FONTS[0];
    document.documentElement.dataset.themeSkin = L.skin;
    document.documentElement.style.setProperty('--font-read', f.stack);
    document.documentElement.style.setProperty('--read-scale', L.scale);
    document.documentElement.style.setProperty('--read-lh', L.lh);
    document.body.dataset.cap = L.cap;
    document.body.dataset.align = L.align;
    window.MmdSameLayerTypo?.refresh?.();
    savePrefs();
  }
  /* 兼容旧调用点 */
  const applySkin = applyLook;


  /* ============================================================
     [状态] 块解析
     ============================================================ */
  const RAW = { text: '' };
  const stripBlocks = t => normBlocks(t)
    .replace(/<div hidden>[\s\S]*?<\/div>/g, '')
    .replace(/<status>[\s\S]*?<\/status>/g, '')
    .replace(/<cast>[\s\S]*?<\/cast>/g, '')
    /* 生成中的半截块：没有闭合标签，也先藏起来 */
    .replace(/<status>[\s\S]*$/g, '')
    .replace(/<cast>[\s\S]*$/g, '')
    .replace(/\n?[\[<][a-zA-Z-]{0,12}$/, '')
    .replace(/^\s*\{(?=[^\n]*"loc"\s*:)[^\n]*\}\s*$/gm, '')
    .replace(/\[状态\][\s\S]*?(?=\n\s*\n|$)/g, '')
    .replace(/\[档案[:：][^\]\n]*\][\s\S]*?\[\/档案\]/g, '')
    .replace(/\n{3,}/g, '\n\n').trim();

  function kvLines(body) {
    const out = {};
    String(body).split('\n').forEach(line => {
      const g = line.match(/^\s*[·\-\s]*([^：:\n]{1,8})[：:]\s*(.+?)\s*$/);
      if (g) out[g[1].trim()] = g[2].trim();
    });
    return out;
  }
  const splitBy = (s, sep) => String(s || '').split(sep).map(x => x.trim()).filter(Boolean);
  function upsert(rows, k, v) {
    const hit = rows.find(r => r[0] === k);
    if (hit) hit[1] = v; else rows.push([k, v]);
    return rows;
  }

  function applyStateBlock(raw) {
    const hit = raw.match(/\[状态\]([\s\S]*)$/);
    if (!hit) return false;
    const kv = kvLines(hit[1]);
    if (!Object.keys(kv).length) return false;

    if (kv['时间']) {
      const p = splitBy(kv['时间'], '·');
      WORLD.date = p[0] || WORLD.date;
      WORLD.time = p[1] || '';
    }
    if (kv['地点']) {
      const p = splitBy(kv['地点'], '›');
      WORLD.region = p[0] || WORLD.region;
      WORLD.spot = p.slice(1).join(' › ') || WORLD.spot;
    }
    if (kv['环境']) {
      /* 环境 = 光线 · 气味或声音 · 温度；温度认带 ℃/度 的那一段，其余并入天气 */
      const p = splitBy(kv['环境'], '·');
      const ti = p.findIndex((x, i) => i > 0 && /[℃度]/.test(x));
      WORLD.weather = (ti > 0 ? p.slice(0, ti) : p.slice(0, 1)).join(' · ') || WORLD.weather;
      WORLD.temp = ti > 0 ? p[ti] : (p[1] || WORLD.temp);
    }
    if (kv['卷']) WORLD.arc = kv['卷'];
    if (kv['章节']) {
      const g = kv['章节'].match(/第\s*(\d+)\s*幕/);
      if (g) WORLD.chapter = parseInt(g[1], 10);
      const t = splitBy(kv['章节'], '·')[1];
      if (t) WORLD.title = t;
    }
    if (kv['威胁'] !== undefined) {
      const n = parseInt(kv['威胁'], 10);
      if (!isNaN(n)) WORLD.threat = Math.max(0, Math.min(5, n));
    }
    if (kv['四维']) {
      const st = { ...(WORLD.stats || {}) };
      splitBy(kv['四维'], '|').forEach(seg => {
        const g = seg.match(/([体魂感运])\s*(\d+)/);
        if (g) st[g[1]] = Math.max(0, Math.min(20, parseInt(g[2], 10)));
      });
      WORLD.stats = st;
    }
    if (kv['在场']) WORLD.present = splitBy(kv['在场'], '｜');
    if (kv['概要']) WORLD.summary = kv['概要'];
    return true;
  }

  /* ============================================================
     [status]{JSON}[/status] —— 与世界书协议同源（skill 规范写法，无 rex 前缀）
     三级容错照抄 skill：直读 → 修引号/裸键 → 正则捞 t/loc
     ============================================================ */
  /* ---- 协议 v2：中文全名做键，未知即建档；所有容器字段按 key 合并 ---- */
  /* 协议归一：方括号 [status] 与带属性的 <status hidden> 都折成裸尖括号。
     生成侧用方括号（纯文本，不会被平台当未知元素剥壳）。
     rex-status / rex-cast 是上一版的旧名，仍认，历史消息不会因为改名读不出来。 */
  const P_BLOCK = /\[(\/?)(?:rex-)?(status|cast)\]/g;
  const normBlocks = t => String(t || '')
    .replace(P_BLOCK, (m, slash, name) => '<' + slash + name + '>')
    /* 闭合标签也要改名：只改开标签，<status> 会配上 </rex-status>，正则会扑空 */
    .replace(/<\/(?:rex-)?(status|cast)\s*>/g, '</$1>')
    .replace(/<(?:rex-)?(status|cast)[^>]*>/g, '<$1>');
  const CAST_ALIAS = { me: 'me', '我': 'me', '{{user}}': 'me' };
  const BONE_KEYS = ['head', 'torso', 'armL', 'armR', 'legL', 'legR'];
  const OUTFIT_ORDER = ['头饰', '上衣', '内着', '下服', '底衣', '鞋履'];
  const numOf = v => { const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10); return isNaN(n) ? 0 : n; };

  function worldDate(){
    const d = String(WORLD.date || '');
    if (!d) return '';
    if (/年/.test(d)) return d;
    return WORLD.year ? ('斗罗历 ' + WORLD.year + ' 年 ' + d) : d;
  }
  function blankCast(name){
    return { id:'npc-' + name, name:String(name).slice(0, 12), sex:'?', lv:'', rel:'', fav:0,
             tags:[], rows:[], wuhun:[], bones:{}, outer:[], outfit:[], body:[], mind:'',
             tier:2, where:'', state:'' };
  }
  function resolveCast(key, hinted){
    const k = String(key == null ? '' : key).trim();
    if (!k) return null;
    if (CAST_ALIAS[k] || k === PLAYER_OBJ.name) return PLAYER_OBJ;
    let c = CAST.find(x => x.id === k || x.name === k);
    if (!c && hinted) c = CAST.find(x => x.name === hinted);
    if (!c) { c = blankCast(hinted || k); CAST.push(c); }
    return c;
  }
  const asList = x => Array.isArray(x) ? x : (x && typeof x === 'object' ? [x] : []);
  function normRing(x){
    if (Array.isArray(x)) return { c:String(x[0] || ''), y:numOf(x[1]), n:String(x[2] || '未命名'), d:String(x[3] || '') };
    if (x && typeof x === 'object') return { c:String(x.c || ''), y:numOf(x.y), n:String(x.n || '未命名'), d:String(x.d || '') };
    return null;
  }
  /* 武魂带固定 id：1 = 第一武魂，2 = 第二武魂。
     名字会变（未醒 → 觉醒 → 真身），id 不变 —— 前端按 id 合并，改名不会多出一张旧卡。
     旧档没有 id 时仍按名字合并，读进来后补上序号。 */
  function normWuhun(x){
    if (Array.isArray(x)) {
      const hasId = typeof x[0] === 'number' || /^\d{1,2}$/.test(String(x[0] == null ? '' : x[0]).trim());
      const k = hasId ? 1 : 0;
      const t = parseInt(x[k + 2], 10);
      return { id:hasId ? (parseInt(x[0], 10) || 0) : 0,
               n:String(x[k] || '无名武魂'), t:String(x[k + 1] || ''), d:'', total:isNaN(t) ? 0 : t,
               r:(Array.isArray(x[k + 3]) ? x[k + 3] : []).map(normRing).filter(Boolean) };
    }
    if (x && typeof x === 'object') {
      return { id:parseInt(x.id, 10) || parseInt(x.wid, 10) || 0,
               n:String(x.n || x.name || '无名武魂'), t:String(x.t || ''), d:String(x.d || ''),
               total:parseInt(x.total, 10) || parseInt(x.ringsTotal, 10) || 0,
               r:(Array.isArray(x.r) ? x.r : []).map(normRing).filter(Boolean) };
    }
    return null;
  }
  function normBone(x){
    if (Array.isArray(x)) return { n:String(x[0] || '无名魂骨'), y:numOf(x[1]), d:String(x[2] || '') };
    if (x && typeof x === 'object') return { n:String(x.n || '无名魂骨'), y:numOf(x.y), d:String(x.d || '') };
    return null;
  }
  function normOuter(x){
    if (Array.isArray(x)) return { n:String(x[0] || '无名外附'), y:numOf(x[1]), d:String(x[2] || '') };
    if (x && typeof x === 'object') return { n:String(x.n || '无名外附'), y:numOf(x.y), d:String(x.d || '') };
    return null;
  }
  /* 行值写入：空值删行，不再留一个「—」占位 */
  function setRow(c, k, v){
    c.rows = c.rows || [];
    const i = c.rows.findIndex(r => r[0] === k);
    if (v) { if (i >= 0) c.rows[i][1] = v; else c.rows.push([k, v]); }
    else if (i >= 0) c.rows.splice(i, 1);
    return c.rows;
  }
  /* 武魂槽位只有两个（1 第一武魂 / 2 第二武魂）。
     旧档里没写 id 的卡如果占不到空槽，就说明两个位置都已有真名 —— 那张是改名前的残卡，丢掉。
     不做这一步的话，模型每改一次名字就会多出一张卡（实测：六翼堕天使 / 未成形 / 未成形的第二武魂）。 */
  function seatWuhun(c){
    const list = c.wuhun = Array.isArray(c.wuhun) ? c.wuhun : [];
    const used = new Set(list.filter(w => w.id).map(w => w.id));
    list.forEach(w => {
      if (w.id) return;
      const free = [1, 2].find(i => !used.has(i));
      if (free) { w.id = free; used.add(free); }
    });
    const keep = new Map();
    list.forEach(w => { if (w.id) keep.set(w.id, w); });
    c.wuhun = list.filter(w => w.id && keep.get(w.id) === w).sort((a, b) => a.id - b.id);
    return c.wuhun;
  }
  function mergeWuhun(c, list){
    const arr = asList(list); if (!arr.length) return;
    seatWuhun(c);
    c.wuhun = c.wuhun || [];
    arr.forEach(raw => {
      const w = normWuhun(raw); if (!w) return;
      /* 先认 id，再退回名字：同一个武魂改名后仍然落在原位置上 */
      let hit = w.id ? c.wuhun.find(x => x.id === w.id) : null;
      if (!hit) hit = c.wuhun.find(x => x.n === w.n);
      /* 旧档没写 id：按位置认领（1 → 第 0 个，2 → 第 1 个），第一次就补上 id */
      if (!hit && w.id) {
        const slot = c.wuhun[w.id - 1];
        if (slot && !slot.id) hit = slot;
      }
      if (!hit) { hit = { id:w.id || 0, n:w.n, t:'', d:'', r:[], total:0 }; c.wuhun.push(hit); }
      if (w.id) hit.id = w.id;
      if (w.n) hit.n = w.n;
      if (w.t) hit.t = w.t;
      if (w.d) hit.d = w.d;
      if (w.total) hit.total = w.total;
      w.r.forEach(r => {
        const i = hit.r.findIndex(x => x.c === r.c && x.y === r.y && x.n === r.n);
        if (i >= 0) hit.r[i] = r; else hit.r.push(r);
      });
      hit.r.sort((a, b) => a.y - b.y);
    });
    seatWuhun(c);
  }
  function mergeBones(c, obj){
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    c.bones = c.bones || {};
    Object.keys(obj).forEach(k => {
      const key = BONE_KEY[k] || k;
      if (BONE_KEYS.indexOf(key) < 0) return;
      const b = normBone(obj[k]); if (b) c.bones[key] = b;
    });
  }
  function mergeOuter(c, list){
    const arr = asList(list); if (!arr.length) return;
    c.outer = c.outer || [];
    arr.forEach(raw => {
      const o = normOuter(raw); if (!o) return;
      const i = c.outer.findIndex(x => x.n === o.n);
      if (i >= 0) c.outer[i] = o; else c.outer.push(o);
    });
  }
  function mergeOutfit(c, obj){
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    const map = {};
    (c.outfit || []).forEach(r => { map[r[0]] = r[1]; });
    Object.keys(obj).forEach(k => { const v = obj[k]; if (v != null && v !== '') map[k] = String(v); });
    c.outfit = OUTFIT_ORDER.map(k => [k, map[k] || '—']);
  }
  function mergeBody(c, obj){
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    c.body = c.body || [];
    Object.keys(obj).forEach(k => {
      const v = obj[k];
      if (v == null || v === '') return;
      const hit = c.body.find(x => x[0] === k);
      if (hit) hit[1] = String(v).slice(0, 30); else c.body.push([String(k).slice(0, 6), String(v).slice(0, 30)]);
    });
  }
  /* 一个角色一份档案：来了什么就并什么，没来的保持上一轮 */
  function mergeCast(c, src){
    if (!c || !src || typeof src !== 'object' || Array.isArray(src)) return c;
    if (src.name !== undefined && String(src.name).trim()) c.name = String(src.name).slice(0, 12);
    if (src.sex !== undefined) { const s = String(src.sex).slice(0, 1); if (s === '男' || s === '女' || s === '') c.sex = s; }
    if (src.lv !== undefined) { const v = String(src.lv).slice(0, 20); c.lv = v; setRow(c, '魂师等级', v); }
    if (src.rel !== undefined && isNaN(Number(src.rel))) c.rel = String(src.rel).slice(0, 8);
    if (src.tier !== undefined) { const t = parseInt(src.tier, 10); if (!isNaN(t)) c.tier = Math.max(0, Math.min(3, t)); }
    if (src.where !== undefined) {
      const v = String(src.where).slice(0, 20);
      c.where = v;
      const hit = findPlace(v) || (WORLD.spot && v && String(WORLD.spot).indexOf(v) >= 0 ? findPlace(WORLD.spot) : null);
      c.whereId = hit ? hit.id : '';
      c.whereRegion = hit ? (hit.rn || '') : '';
      setRow(c, '所在', v);
    }
    if (src.state !== undefined) c.state = String(src.state).slice(0, 4);
    /* fav 优先；rel 是数字时按旧协议当好感读 */
    const favRaw = (src.fav !== undefined) ? src.fav : (src.rel !== undefined && !isNaN(Number(src.rel)) ? src.rel : undefined);
    if (favRaw !== undefined) { const n = parseInt(favRaw, 10); if (!isNaN(n)) c.fav = Math.max(-100, Math.min(100, n)); }
    if (src.note !== undefined) setRow(c, '近况', String(src.note).slice(0, 60));
    if (src.mind !== undefined) c.mind = String(src.mind);
    if (Array.isArray(src.tags)) {
      /* 整块替换：空数组即清空，不再只增不减 */
      c.tags = src.tags.map(tg => Array.isArray(tg)
        ? [String(tg[0] || '').slice(0, 8), tg[1] || 'violet']
        : [String(tg || '').slice(0, 8), 'violet']).filter(x => x[0]).slice(0, 6);
    }
    /* Intel（大写 I）：新协议；surface 作为旧档兼容 */
    const intel = src.Intel || src.intel || src.surface;
    if (Array.isArray(intel)) intel.forEach(row => {
      if (Array.isArray(row) && row[0]) upsert(c.rows, String(row[0]).slice(0, 10), String(row[1] || '').slice(0, 60));
    });
    if (src.body) mergeBody(c, src.body);
    if (src.outfit) mergeOutfit(c, src.outfit);
    if (src.wuhun) mergeWuhun(c, src.wuhun);
    if (src.bones) mergeBones(c, src.bones);
    if (src.outer) mergeOuter(c, src.outer);
    if (c.id === 'me') {
      if (src.flesh !== undefined) c.flesh = Math.max(0, Math.min(100, parseInt(src.flesh, 10) || 0));
      if (src.soul !== undefined) c.soul = Math.max(0, Math.min(100, parseInt(src.soul, 10) || 0));
    }
    return c;
  }
  /* 地名别名：同一个地方的不同叫法，统一解析到地图节点 */
  const PLACE_ALIAS = {
    '七宝琉璃宗': '七宝琉璃宗城堡',
    '斗罗供奉殿': '斗罗殿',
    '魔鬼岛': '海神岛',
    '皇家学院': '天斗皇家学院'
  };
  const REGION_NAME = k => (REGION_SVG[k] && (REGION_SVG[k].rn || REGION_SVG[k].n)) || '';
  const REGION_BY_NAME = name => Object.keys(REGION_SVG).find(k => REGION_NAME(k) === name) || '';
  function findPlace(name){
    const raw = String(name || '').trim();
    if (!raw) return null;
    const cands = [raw];
    /* 「教皇殿 · 第三层密室」这类复合地名：先整串，再去掉 · 后的房间名 */
    if (raw.indexOf('·') > 0) cands.push(raw.split('·')[0].trim());
    if (raw.indexOf('›') > 0) cands.push(raw.split('›').pop().trim());
    const norm = s => s.replace(/\s/g, '');
    for (let ci = 0; ci < cands.length; ci++) {
      let n = norm(cands[ci]);
      if (!n) continue;
      n = norm(PLACE_ALIAS[n] || n);
      const w = (typeof MK_WORLD !== 'undefined' ? MK_WORLD : []).find(m => m.n === n);
      if (w) return w;
      if (typeof REGION_SVG !== 'undefined') {
        const keys = Object.keys(REGION_SVG);
        for (let i = 0; i < keys.length; i++) {
          const r = REGION_SVG[keys[i]];
          if (REGION_NAME(keys[i]) === n) return { id: 'r_' + keys[i], n: REGION_NAME(keys[i]), k: 'region', r: keys[i], rn: REGION_NAME(keys[i]) };
          const m = (r.marks || []).find(x => x.n === n);
          if (m) return { ...m, r: keys[i], rn: REGION_NAME(keys[i]) };
        }
      }
    }
    return null;
  }
  /* 此地人物：where 解析到当前 loc 节点、且在场的 NPC。替代已删除的 present 字段 */
  function hereCast(){
    const spot = String(WORLD.spot || '').trim(), node = WORLD.node || '';
    return CAST.filter(c => c && c.id !== 'me' && c.state === '在场' && c.where && (
      (c.whereId && node && c.whereId === node) ||
      (spot && (c.where === spot || c.where.indexOf(spot) >= 0 || spot.indexOf(c.where) >= 0))
    ));
  }
  function herePeopleHtml(){
    const list = hereCast();
    if (!list.length) return '';
    const names = list.map((c, i) =>
      `${i ? '<i class="hpsep">·</i>' : ''}<button class="hpname" type="button" data-herecast="${esc(c.id)}">${esc(c.name)}</button>`).join('');
    return `<div class="herepeople">
      <i class="herepeople__lb">此地人物</i>
      <span class="herepeople__row">${names}</span>
    </div>`;
  }
  function parseRex(raw) {
    let s = String(raw || '').trim().replace(/^```[a-z]*\s*/i, '').replace(/```$/g, '');
    const a = s.indexOf('{');
    if (a < 0) return null;
    const b = s.lastIndexOf('}');
    s = b > a ? s.slice(a, b + 1) : s.slice(a);
    try { return JSON.parse(s); } catch (e) {}
    const fixed = s.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'")
      .replace(/，/g, ',').replace(/：/g, ':').replace(/,\s*([}\]])/g, '$1')
      .replace(/([{\[,]\s*)([A-Za-z_]\w*)(\s*:)/g, '$1"$2"$3');
    try { return JSON.parse(fixed); } catch (e) {}
    const out = {}, m1 = /"t"\s*:\s*"([^"]{0,40})"/.exec(s), m2 = /"loc"\s*:\s*"([^"]{0,40})"/.exec(s);
    if (m1) out.t = m1[1]; if (m2) out.loc = m2[1];
    return Object.keys(out).length ? out : null;
  }

  function applyRexStatus(raw, forcedTurn) {
    const text = normBlocks(raw);
    const hit = text.match(/<status>([\s\S]*?)<\/status>/);
    let body = hit ? hit[1] : null;
    if (!body) {
      /* 兜底：平台把标签整个吃掉时，textContent 里只剩裸 JSON。
         从 "loc" 或 "turn" 往前找最近的 {，再按括号配对（跳过字符串内的括号）扫到结尾。
         只认 "loc" 不够：增量输出时地点常常不变、整键省略。 */
      let k = text.search(/"loc"\s*:/);
      if (k < 0) k = text.search(/"turn"\s*:\s*\d/);
      if (k > 0) {
        let a = text.lastIndexOf('{', k);
        if (a >= 0) {
          let d = 0, str = false, esc = false;
          for (let i = a; i < text.length; i++) {
            const ch = text[i];
            if (str) {
              if (esc) esc = false;
              else if (ch === '\\') esc = true;
              else if (ch === '"') str = false;
              continue;
            }
            if (ch === '"') { str = true; continue; }
            if (ch === '{') d++;
            else if (ch === '}') { d--; if (!d) { body = text.slice(a, i + 1); break; } }
          }
        }
      }
    }
    if (!body) return false;
    const o = parseRex(body);
    if (!o || typeof o !== 'object') return false;

    if (forcedTurn != null) WORLD.turn = forcedTurn;
    else if (o.turn !== undefined) { const t = parseInt(o.turn, 10); if (!isNaN(t)) WORLD.turn = t; }
    if (o.y !== undefined) { const y = parseInt(o.y, 10); if (y) WORLD.year = y; }
    if (o.t) {
      const p = splitBy(String(o.t), '·');
      let head = String(p[0] || '').trim();
      const rest = p.slice(1).join(' · ');
      const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(head);
      const md = /^(\d{1,2})-(\d{1,2})$/.exec(head);
      if (iso) { WORLD.year = +iso[1]; head = (+iso[2]) + ' 月 ' + (+iso[3]) + ' 日'; }
      else if (md) head = (+md[1]) + ' 月 ' + (+md[2]) + ' 日';
      if (head) WORLD.date = head;
      if (rest) WORLD.time = rest;
    }
    if (o.loc) {
      WORLD.spot = String(o.loc).slice(0, 20);
      const hit = findPlace(WORLD.spot);
      if (hit) {
        WORLD.node = hit.id; WORLD.nodeName = hit.n;
        if (hit.r) WORLD.region = hit.rn || REGION_NAME(hit.r) || WORLD.region;
      }
    }
    if (o.region) {
      const rn = String(o.region).slice(0, 12);
      if (REGION_BY_NAME(rn)) WORLD.region = rn;
      else WORLD.regionRaw = rn;   /* 不在表内：保留原文，不上图 */
    }
    if (o.act) {
      const s = String(o.act);
      const g = s.match(/(?:第\s*)?(\d+)\s*幕?\s*[·\-—]/) || s.match(/(?:第\s*)?(\d+)\s*幕/);
      if (g) WORLD.chapter = parseInt(g[1], 10);
      const p = splitBy(s, '·');
      if (p[1]) WORLD.title = p[1];
      else { const q = s.match(/[·\-—]\s*(.+)$/); if (q) WORLD.title = q[1].trim(); }
    }
    if (o.threat !== undefined) {
      const n = parseInt(o.threat, 10);
      if (!isNaN(n)) WORLD.threat = Math.max(0, Math.min(5, n));
    }
    if (o.env) {
      const p = splitBy(o.env, '·');
      const ti = p.findIndex((x, i) => i > 0 && /[℃度]/.test(x));
      WORLD.weather = (ti > 0 ? p.slice(0, ti) : p.slice(0, 1)).join(' · ') || WORLD.weather;
      WORLD.temp = ti > 0 ? p[ti] : (p[1] || WORLD.temp);
    }
    if (Array.isArray(o.opt)) WORLD.opt = o.opt.map(x => String(x).slice(0, 20)).slice(0, 3);
    if (Array.isArray(o.present) && o.present.length) WORLD.present = o.present.map(x => String(x).slice(0, 12));
    if (o.sum) WORLD.summary = String(o.sum);
    if (o.me && typeof o.me === 'object') {
      mergeCast(PLAYER_OBJ, o.me);
      if (!o.me.where && WORLD.spot) {
        const h = findPlace(WORLD.spot);
        PLAYER_OBJ.where = WORLD.spot;
        PLAYER_OBJ.whereId = h ? h.id : '';
        PLAYER_OBJ.whereRegion = h ? (h.rn || '') : '';
      }
    }

    /* 系统：AI 是唯一真值，界面只读 */
    if (o.sys && typeof o.sys === 'object') {
      const sy = o.sys;
      if (sy.name) SYS.name = String(sy.name).slice(0, 8);
      if (sy.alias) SYS.alias = String(sy.alias).slice(0, 12);
      if (sy.coins !== undefined) { const n2 = parseInt(sy.coins, 10); if (!isNaN(n2)) SYS.coins = n2; }
      const pack = x => Array.isArray(x)
        ? { n: String(x[0] || ''), q: Math.max(1, parseInt(x[1], 10) || 1), p: 0, k: '', d: String(x[2] || '') }
        : { n: String((x && x.n) || ''), q: Math.max(1, parseInt(x && x.q, 10) || 1), p: 0, k: (x && x.k) || '', d: String((x && x.d) || '') };
      if (Array.isArray(sy.bag)) SYS.bag = sy.bag.map(pack).filter(x => x.n);
      if (Array.isArray(sy.shop)) SYS.shop = sy.shop.map(pack).filter(x => x.n);
      if (sy.mood) SYS.mood = String(sy.mood).slice(0, 8);
      if (sy.look) SYS.look = String(sy.look).slice(0, 120);
      if (sy.trait) SYS.trait = String(sy.trait).slice(0, 60);
      if (sy.say) SYS.say = String(sy.say).slice(0, 120);
      if (sy.note) SYS.note = String(sy.note);
    }
    if (o.map && typeof o.map === 'object' && o.map.node) {
      WORLD.spot = String(o.map.node).slice(0, 20);
      const hit = findPlace(WORLD.spot); if (hit) WORLD.node = hit.id;
    }
    if (Array.isArray(o.near)) {
      WORLD.near = o.near.map(x => {
        const one = y => {
          const nm = String((Array.isArray(y) ? y[0] : (y && y.n)) || '').slice(0, 10);
          const ds = String((Array.isArray(y) ? y[1] : (y && (y.d || y.dir))) || '').slice(0, 12);
          const h = findPlace(nm);
          return { n: nm, d: ds, id: h ? h.id : '', rn: h ? (h.rn || '') : '', off: !h };
        };
        if (Array.isArray(x)) return one(x);
        if (x && typeof x === 'object') return one(x);
        return null;
      }).filter(x => x && x.n).slice(0, 8);
      if (typeof setLocalMap === 'function') setLocalMap(WORLD.nodeName || WORLD.spot, WORLD.near);
    }

    /* 人物：键是任意全名或别名，未知即建档；只并变了的字段 */
    if (o.npcs && typeof o.npcs === 'object' && !Array.isArray(o.npcs)) {
      Object.keys(o.npcs).forEach(k => {
        const src = o.npcs[k];
        if (!src || typeof src !== 'object' || Array.isArray(src)) return;
        const c = resolveCast(k, src.name);
        if (c) mergeCast(c, src);
      });
    }
    /* 玩家一定在 loc：每轮用 loc 校准 me.where，避免旧地址残留 */
    if (WORLD.spot) {
      const h = findPlace(WORLD.spot);
      PLAYER_OBJ.where = WORLD.spot;
      PLAYER_OBJ.whereId = h ? h.id : '';
      PLAYER_OBJ.whereRegion = h ? (h.rn || '') : '';
    }
    return true;
  }

  /* ============================================================
     [cast]{JSON}[/cast] —— 按需档案块
     只在人物首见 / 升级 / 换武魂魂骨 / 关系称谓变化时出现
     ============================================================ */
  function applyRexCast(raw){
    const re = /<cast>([\s\S]*?)<\/cast>/g;
    const text = normBlocks(raw);
    let m, hit = 0;
    while ((m = re.exec(text))) {
      const o = parseRex(m[1]);
      if (!o || typeof o !== 'object' || Array.isArray(o)) continue;
      Object.keys(o).forEach(k => {
        const src = o[k];
        if (!src || typeof src !== 'object' || Array.isArray(src)) return;
        const c = resolveCast(k, src.name);
        if (c) { mergeCast(c, src); hit++; }
      });
    }
    return hit > 0;
  }

  /* 兜底：平台把 [cast] 块吃掉时，只剩裸 JSON。逐个抠括号配对的对象，
     只认「值都是对象、且对象里的键全在档案字段白名单里」的那种。 */
  const CAST_FIELD = /^(sex|lv|rel|tier|where|state|fav|note|mind|tags|Intel|intel|surface|body|outfit|wuhun|bones|outer|flesh|soul)$/;
  function applyBareCast(raw){
    const text = String(raw || '');
    if (!/"sex"\s*:/.test(text) && !/"wuhun"\s*:/.test(text)) return false;
    let hit = false, i = 0;
    while (i < text.length) {
      const a = text.indexOf('{', i);
      if (a < 0) break;
      let d = 0, str = false, esc = false, end = -1;
      for (let k = a; k < text.length; k++) {
        const ch = text[k];
        if (str) {
          if (esc) esc = false;
          else if (ch === '\\') esc = true;
          else if (ch === '"') str = false;
          continue;
        }
        if (ch === '"') { str = true; continue; }
        if (ch === '{') d++;
        else if (ch === '}') { d--; if (!d) { end = k; break; } }
      }
      if (end < 0) break;
      const obj = parseRex(text.slice(a, end + 1));
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const keys = Object.keys(obj);
        const looksCast = keys.length > 0 && keys.every(k => {
          const v = obj[k];
          if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
          const fk = Object.keys(v);
          return fk.length > 0 && fk.every(f => CAST_FIELD.test(f));
        });
        if (looksCast) {
          keys.forEach(k => {
            const c = resolveCast(k, obj[k].name);
            if (c) { mergeCast(c, obj[k]); hit = true; }
          });
        }
      }
      i = end + 1;
    }
    return hit;
  }

  /* [档案] 里的魂 / 环 / 骨 / 外 四类行，按出现顺序装配武魂与魂骨
     魂：名｜类型｜描述     环：黄400 魂技名｜描述
     骨：部位·名·年限｜描述  外：名·年限｜描述 */
  const BONE_KEY = { '头': 'head', '躯干': 'torso', '胸': 'torso', '左臂': 'armL', '右臂': 'armR', '左腿': 'legL', '右腿': 'legR' };
  const num = s => parseInt(String(s || '').replace(/[^\d]/g, ''), 10) || 0;
  function parseSoulLines(body, c) {
    let cur = null;
    const seen = Object.create(null);
    String(body || '').split('\n').forEach(raw => {
      const m = raw.trim().match(/^(魂|环|骨|外)\s*[：:]\s*(.+)$/);
      if (!m) return;
      const kind = m[1];
      const cut = m[2].split('｜').map(x => x.trim());
      const head = cut[0] || '', desc = cut[2] !== undefined ? cut[2] : (cut[1] || '');
      if (kind === '魂') {
        const n = head || '无名武魂';
        let hit = seen[n];
        if (!hit) {
          hit = (c.wuhun || []).find(x => x.n === n);
          if (hit) hit.r = [];                       /* 同一条档案写第二遍：环重算，不叠 */
          else { hit = { n: n, t: '', d: '', r: [] }; (c.wuhun = c.wuhun || []).push(hit); }
          seen[n] = hit;
        }
        hit.t = cut[1] || hit.t;
        hit.d = desc || hit.d;
        cur = hit;
        return;
      }
      if (kind === '环') {
        if (!cur) { cur = { n: '武魂', t: '', d: '', r: [] }; (c.wuhun = c.wuhun || []).push(cur); }
        const g = head.match(/^([白黄紫黑红赤])\s*(\d+)?\s*(.*)$/);
        if (!g) return;
        const row = { c: g[1], y: num(g[2]), n: (g[3] || '').trim() || '未命名魂技', d: desc };
        const dup = cur.r.findIndex(x => x.c === row.c && x.y === row.y && x.n === row.n);
        if (dup >= 0) cur.r[dup] = row; else cur.r.push(row);
        return;
      }
      const h = head.split(/[·・]/).map(x => x.trim());
      const item = kind === '外'
        ? { n: h[0] || '无名外附', y: num(h[1]), d: desc }
        : { n: h[1] || h[0] || '无名魂骨', y: num(h[2]), d: desc };
      if (kind === '外') {
        c.outer = c.outer || [];
        const i = c.outer.findIndex(x => x.n === item.n);
        if (i >= 0) c.outer[i] = item; else c.outer.push(item);
        return;
      }
      c.bones = c.bones || {};
      const key = BONE_KEY[h[0]] || h[0];
      if (key) c.bones[key] = item;
    });
  }

  function applyProfiles(raw) {
    const re = /\[档案[:：]\s*([^\]\n]+)\]([\s\S]*?)\[\/档案\]/g;
    let m;
    while ((m = re.exec(raw))) {
      const name = m[1].trim();
      const body = m[2].trim();
      const kv = kvLines(body);
      const head = (body.split('\n').map(x => x.trim()).filter(Boolean)[0]) || '';
      let c = CAST.find(x => x.name === name);
      if (!c) {
        c = { id: 'npc' + (CAST.length + 1), name, sex: '?', lv: '', rel: '', fav: 0,
              tags: [], rows: [], wuhun: [], mind: '', body: [] };
        CAST.push(c);
      }
      if (head.includes('/')) {
        const p = head.split('/').map(x => x.trim());
        if (p[0] && p[0].length <= 3) c.sex = p[0];
        if (p[1]) upsert(c.rows, '年龄', p[1]);
        if (p[2]) upsert(c.rows, '身份', p[2]);
        if (p[3]) { c.lv = p[3]; upsert(c.rows, '魂师等级', p[3]); }
        if (p[4]) upsert(c.rows, '武魂', p[4]);
      }
      if (kv['外貌']) upsert(c.rows, '外貌', kv['外貌']);
      if (kv['关系']) { c.rel = kv['关系']; c.tags = c.tags.length ? c.tags : [[kv['关系'].slice(0, 6), 'gold']]; }
      if (kv['心理']) c.mind = kv['心理'];
      if (kv['穿搭']) {
        const map = {};
        kv['穿搭'].split(/[；;]/).forEach(seg => {
          const t = seg.trim();
          const i = t.search(/[=＝:：]/);
          if (i > 0) map[t.slice(0, i).trim()] = t.slice(i + 1).trim();
        });
        if (Object.keys(map).length) {
          const order = ['头饰','上衣','内着','下服','底衣','鞋履'];
          c.outfit = order.map(k => [k, map[k] || '—']);
        }
      }
      if (kv['身体']) {
        c.body = splitBy(kv['身体'], '｜').map(seg => {
          const i = seg.indexOf(' ');
          return i < 0 ? [seg.slice(0, 2), seg.slice(2)] : [seg.slice(0, i), seg.slice(i + 1)];
        }).filter(a => a[0]);
      }
      if (kv['好感']) {
        const p = splitBy(kv['好感'], '|');
        const n = parseInt(String(p[0]).replace(/[^\-\d]/g, ''), 10);
        if (!isNaN(n)) c.fav = Math.max(-100, Math.min(100, n));
        if (p[1]) c.stage = p[1];
        if (p[2]) c.favNote = p[2];
      }
      parseSoulLines(body, c);
    }
  }

  /* 取一条消息的轮次；没有 turn 的旧消息用序号兜底，保证仍有确定先后 */
  function turnOf(text, fallback){
    const m = /"turn"\s*:\s*(\d{1,6})/.exec(String(text || ''));
    return m ? parseInt(m[1], 10) : fallback;
  }
  /* 切换会话：整套状态清空，避免 A 会话的档案并进 B 会话 */
  function resetStory(){
    CAST.length = 0;
    Object.assign(WORLD, { date:'', year:0, time:'', region:'', spot:'', temp:'', weather:'',
      chapter:0, arc:'', title:'', summary:'', threat:0, opt:[], near:[], node:'', nodeName:'',
      turn:0, stats:{}, present:[], stale:0 });
    Object.assign(PLAYER_OBJ, { id:'me', name:'你', sex:'', lv:'', rel:'你', fav:100, tier:0,
      state:'', where:'', flesh:null, soul:null, tags:[], rows:[], outfit:[], wuhun:[], bones:{}, outer:[], mind:'' });
    SYS.name = ''; SYS.alias = ''; SYS.mood = ''; SYS.coins = 0; SYS.bag = []; SYS.shop = []; SYS.note = '';
    SYS.look = ''; SYS.trait = ''; SYS.say = ''; state.shopPick = [];
    DIFF.prev = null; DIFF.items = []; DIFF.at = ''; DIFF.first = false;
    CHRON.list = []; CHRON.key = ''; CHRON.hydrated = false;
    RAW.text = ''; RAW.turn = 0;
  }
  function parseStory(native) {
    hydrateChron(native);
    const msgs = (native && native.messages) || [];
    const texts = [];   /* 解析用：raw（textContent）优先，含被隐藏的状态块 */
    const shown = [];   /* 旧协议与显示用：innerText，保留换行 */
    /* 不按 role 过滤：手机端角色识别可能失效，状态块靠内容自证 */
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      if (!m || !(m.raw || m.text)) continue;
      texts.push(m.raw || m.text);
      shown.push(m.text || m.raw);
    }
    if (!texts.length) {
      const nodes = document.querySelectorAll('#messages .message.assistant .sl-message-text');
      if (nodes.length) texts.push(nodes[nodes.length - 1].textContent || '');
    }
    const raw = texts.length ? texts[texts.length - 1] : '';
    const vis = shown.length ? shown[shown.length - 1] : raw;
    if (!raw) return;
    const lastTurn = turnOf(raw, 0);
    /* 只要轮次推进就重放，不只看最后一条文本变没变 */
    if (raw === RAW.text && (!lastTurn || lastTurn <= (RAW.turn || 0))) return;
    RAW.text = raw;
    RAW.turn = lastTurn || RAW.turn;
    const nraw = normBlocks(raw);

    /* 按 turn 升序重放，不依赖 messages 的数组顺序。
       只有「明确写了 turn」的消息参与存档跳过，避免用户消息的序号把 savedTurn 抬高。 */
    const savedTurn = WORLD.turn || 0;
    const info = texts.map((t, i) => ({ t, i, has: /"turn"\s*:\s*\d/.test(t), turn: turnOf(t, i + 1) }));
    const lastTurnIdx = info.reduce((m, x) => x.has ? Math.max(m, x.i) : m, -1);
    const ordered = info.slice().sort((a, b) => (a.turn - b.turn) || (a.i - b.i));
    let cast = 0, stat = 0, rescued = 0;
    ordered.forEach(x => {
      if (x.has && x.turn <= savedTurn) return;              /* 已合并过 */
      if (!x.has && savedTurn > 0 && x.i <= lastTurnIdx) return; /* 旧格式且已在存档之前 */
      if (applyRexStatus(x.t)) stat++;
      if (applyRexCast(x.t) || applyBareCast(x.t)) cast++;
    });
    /* 最新一条重复用了旧 turn（模型漏加一）时，整块会被上面的闸门丢掉。
       它是全场最新内容，按字段合并本幂等，补应用一次，避免「新状态不覆盖旧状态」。 */
    if (!stat && lastTurn > 0 && lastTurn <= savedTurn && texts.length) {
      const last = info[info.length - 1];
      if (last && last.has && last.i === texts.length - 1) {
        if (applyRexStatus(last.t, savedTurn + 1)) { stat++; rescued = 1; }
      }
    }
    const hasBlock = /<status>[\s\S]*?<\/status>|<cast>[\s\S]*?<\/cast>/.test(nraw)
      || (/"turn"\s*:\s*\d/.test(nraw) && /"(opt|me|npcs)"\s*:/.test(nraw));
    WORLD.stale = (hasBlock && !stat && !cast && !rescued) ? (WORLD.stale || 0) + 1 : 0;
    const ok = applyStateBlock(vis);
    applyProfiles(vis);
    const maxExplicit = info.reduce((m, x) => x.has ? Math.max(m, x.turn) : m, 0);
    if (maxExplicit > (WORLD.turn || 0)) WORLD.turn = maxExplicit;
    if (ok || stat || cast) WORLD.live = true;
    trackDiff(); syncChron(native); savePrefs();
  }

  /* ============================================================
     动荡 / 编年 · 纯代码侧写，不依赖新字段
     ============================================================ */
  /* ============================================================
     动荡 · 纯代码 diff：世界 / 你 / 每个人 / 系统
     每轮与上一轮快照对比，只列真正变了的词条（不依赖新字段）
     ============================================================ */
  const wuText = c => {
    const wu = (c && c.wuhun) || [];
    if (!wu.length) return '—';
    return wu.map(w => w.n + (w.r && w.r.length ? '·' + w.r.length + ' 环' : '')).join(' / ');
  };
  const boneText = c => {
    const n = Object.keys((c && c.bones) || {}).length;
    const o = ((c && c.outer) || []).length;
    if (!n && !o) return '—';
    return n + ' 块' + (o ? ' + 外附 ' + o : '');
  };
  /* 动荡：把所有会上屏的字段都摊平比较（世界 / 地图 / 你 / 每个人 / 系统） */
  const kvText = (rows) => (rows || []).filter(Boolean).map(r => (Array.isArray(r) ? r[0] + '：' + r[1] : String(r))).join('；') || '—';
  const tagText = (c) => (c.tags || []).filter(Boolean).map(t => Array.isArray(t) ? t[0] : String(t)).join('、') || '—';
  function snapshotState(){
    const world = {
      '时间': (worldDate() + ' ' + WORLD.time).trim() || '—',
      '章节': WORLD.chapter ? ('第 ' + WORLD.chapter + ' 幕 · ' + WORLD.title) : '—',
      '环境': [WORLD.weather, WORLD.temp].filter(Boolean).join(' · ') || '—',
      '威胁': String(WORLD.threat),
      '在场': (WORLD.present || []).join('、') || '—'
    };
    /* 地图单独成组：区域 / 地点 / 节点 / 邻近（带距离） */
    const map = {
      '区域': WORLD.region || '—',
      '地点': WORLD.spot || '—',
      '节点': WORLD.nodeName || WORLD.node || '—',
      '邻近': (WORLD.near || []).map(x => x.n + (x.dist ? '（' + x.dist + '）' : '')).join('、') || '—'
    };
    const me = {
      '性别': PLAYER_OBJ.sex || '—',
      '等级': PLAYER_OBJ.lv || '—',
      'HP': PLAYER_OBJ.flesh == null ? '—' : PLAYER_OBJ.flesh + '%',
      '魂力': PLAYER_OBJ.soul == null ? '—' : PLAYER_OBJ.soul + '%',
      '武魂': wuText(PLAYER_OBJ),
      '魂骨': boneText(PLAYER_OBJ),
      '标签': tagText(PLAYER_OBJ),
      '所在': PLAYER_OBJ.where || '—',
      '身体': kvText(PLAYER_OBJ.body),
      '穿搭': kvText(PLAYER_OBJ.outfit)
    };
    const cast = {};
    CAST.forEach(c => {
      cast[c.name] = {
        '性别': c.sex || '—',
        '称谓': c.rel || '—',
        '等级': c.lv || '—',
        '好感': String(c.fav),
        '所在': c.where || '—',
        '状态': c.state || '—',
        '近况': ((c.rows || []).find(r => r[0] === '近况') || [])[1] || '—',
        '标签': tagText(c),
        '武魂': wuText(c),
        '魂骨': boneText(c),
        '身体': kvText(c.body),
        '穿搭': kvText(c.outfit)
      };
    });
    const sys = {
      '名称': SYS.name || '—',
      '样子 · 性格': [SYS.look, SYS.trait].filter(Boolean).join('；') || '—',
      '留言': SYS.say || '—',
      '仓库': SYS.bag.map(b => b.n + '×' + (b.q || 1)).join('、') || '—',
      '货架': SYS.shop.map(b => b.n).join('、') || '—'
    };
    return { world, map, me, cast, sys };
  }
  function trackDiff(){
    const cur = snapshotState();
    const at = WORLD.time || '';
    if (!DIFF.prev) { DIFF.prev = cur; DIFF.first = true; DIFF.items = []; DIFF.at = at; return; }
    const items = [];
    const cut = v => { const t = String(v); return t.length > 64 ? t.slice(0, 62) + '…' : t; };
    const push = (g, k, from, to) => items.push({
      g, k,
      from: (from == null || from === '') ? '—' : cut(from),
      to: (to == null || to === '') ? '—' : cut(to)
    });
    const walk = (g, a, b) => Object.keys(b).forEach(k => { if (a[k] !== b[k]) push(g, k, a[k], b[k]); });
    walk('世界', DIFF.prev.world, cur.world);
    walk('地图', DIFF.prev.map, cur.map);
    walk('你', DIFF.prev.me, cur.me);
    const seen = Object.create(null);
    Object.keys(DIFF.prev.cast).concat(Object.keys(cur.cast)).forEach(n => {
      if (seen[n]) return; seen[n] = 1;
      const a = DIFF.prev.cast[n], b = cur.cast[n];
      if (!a && b) { push('人物', n, '—', '新登场'); return; }
      if (a && !b) { push('人物', n, a['等级'] || '—', '离场'); return; }
      Object.keys(b).forEach(k => { if (a[k] !== b[k]) push('人物 · ' + n, k, a[k], b[k]); });
    });
    walk('系统', DIFF.prev.sys, cur.sys);
    DIFF.prev = cur; DIFF.first = false; DIFF.items = items; DIFF.at = at;
    if (items.length) state.chronOpen = -1;
  }

  /* 章节名去掉「第 N 幕 ·」前缀，避免同一个总结因写法不同被当成两条 */
  const chronTitle = t => String(t || '').replace(/^第\s*\d+\s*幕\s*[·\-—:：]?\s*/, '').trim();
  const chronSum = e => String((e && e.sum) || '').trim();
  function chronKey(e){
    return (parseInt(e && e.n, 10) || 0) + '|' + (+e.c || 0) + '|' + chronTitle(e.title) + '|' + chronSum(e).slice(0, 24);
  }
  /* 编年 = 每条 AI 气泡一条：以消息 id 为键重建整张表。
     消息删了记录跟着消失，消息改了就地更新，重复解析也不会多出一条。 */
  function chronFromMessage(m, i){
    const text = String((m && (m.raw || m.text)) || '');
    if (!text) return null;
    let entry = chronFromRex(text);
    if (!entry) {
      if (text.indexOf('[状态]') < 0) return null;
      const kv = kvLines(text.slice(text.indexOf('[状态]')));
      if (!kv['概要'] && !kv['章节']) return null;
      const ch = (kv['章节'] || '').match(/第\s*(\d+)\s*幕/);
      const t = splitBy(kv['章节'] || '', '·');
      const place = splitBy(kv['地点'] || '', '›');
      const dt = splitBy(kv['时间'] || '', '·');
      entry = {
        d: dt[0] || '', t: dt[1] || '', c: ch ? parseInt(ch[1], 10) : 0,
        arc: '', title: t[1] || kv['章节'] || '',
        sum: kv['概要'] || '', place: place.join(' › ')
      };
    }
    if (!entry.sum && !entry.title) return null;
    entry.mid = String((m && m.id) || ('i' + i));
    entry.at = i;
    return entry;
  }
  function syncChron(native){
    const msgs = (native && native.messages) || [];
    if (!msgs.length) return false;
    const prev = new Map();
    CHRON.list.forEach(e => { if (e && e.mid) prev.set(e.mid, e); });
    const out = [];
    msgs.forEach((m, i) => {
      if (!m || m.role === 'user') return;
      const e = chronFromMessage(m, i);
      if (!e) return;
      out.push(prev.get(e.mid) ? { ...prev.get(e.mid), ...e } : e);
    });
    if (!out.length) return false;          /* 还没有任何摘要：别把旧表清空 */
    out.reverse();                          /* 新的在上面 */
    const sig = arr => arr.map(e => e.mid + '|' + e.sum);
    const changed = JSON.stringify(sig(out)) !== JSON.stringify(sig(CHRON.list));
    CHRON.list = out.slice(0, 80);
    CHRON.hydrated = true;
    return changed;
  }
  /* 首次连接 / 手动刷新 / 每轮解析都走它 */
  function hydrateChron(native, force){
    const before = CHRON.list.length;
    const changed = syncChron(native);
    if (changed || force) savePrefs();
    return Math.abs(CHRON.list.length - before) || (changed ? 1 : 0);
  }
  /* 从一条消息里取出状态块正文：<status> → 裸 JSON → 旧 [状态] */
  function rexBody(text){
    const s = normBlocks(text);
    const hit = s.match(/<status>([\s\S]*?)<\/status>/);
    if (hit) return hit[1];
    let k = s.search(/"loc"\s*:/);
    if (k < 0) k = s.search(/"turn"\s*:\s*\d/);
    if (k > 0) {
      const a = s.lastIndexOf('{', k);
      if (a >= 0) {
        let d = 0, str = false, escd = false;
        for (let i = a; i < s.length; i++) {
          const ch = s[i];
          if (str) { if (escd) escd = false; else if (ch === '\\') escd = true; else if (ch === '"') str = false; continue; }
          if (ch === '"') { str = true; continue; }
          if (ch === '{') d++;
          else if (ch === '}') { d--; if (!d) return s.slice(a, i + 1); }
        }
      }
    }
    return null;
  }
  function chronFromRex(text){
    const body = rexBody(text);
    if (!body) return null;
    const o = parseRex(body);
    if (!o || typeof o !== 'object') return null;
    const act = String(o.act || '');
    const ch = act.match(/第\s*(\d+)\s*幕/);
    const parts = splitBy(act, '·');
    const dt = splitBy(o.t || '', '·');
    return {
      d: dt[0] || WORLD.date, t: dt[1] || '',
      c: ch ? parseInt(ch[1], 10) : WORLD.chapter,
      arc: WORLD.arc, title: parts[1] || WORLD.title,
      sum: String(o.sum || '').slice(0, 240),
      n: parseInt(o.turn, 10) || 0,
      place: [String(o.region || ''), String(o.loc || '')].filter(Boolean).join(' › ')
    };
  }
  function summaryText(){
    const out = ['武魂殿 · 琉璃纪元 — 剧情总结',
      '第 ' + WORLD.chapter + ' 幕 · ' + (WORLD.title || ''),
      [WORLD.date, WORLD.time].filter(Boolean).join(' ') + ' · ' + [WORLD.region, WORLD.spot].filter(Boolean).join(' › '),
      '', '【本章】' + (WORLD.summary || '—')];
    const list = chronRows();
    if (list.length) {
      out.push('', '【前情】');
      list.forEach(e => out.push('· ' + [e.d, e.t, e.place].filter(Boolean).join(' ') + '｜' + (e.sum || '')));
    }
    return out.join('\n');
  }
  /* 写进输入框：手机上顺手把导航页收起来，不然写完看不见输入框 */
  /* 输入框：长文本自动长高（到上限改内部滚动），并给一个全屏编辑面板 */
  function growComposer(){
    const t = $('text'); if (!t) return;
    const max = window.innerWidth < 1280 ? 108 : 150;
    t.style.height = 'auto';
    const h = Math.min(t.scrollHeight, max);
    t.style.height = h + 'px';
    t.style.overflowY = t.scrollHeight > max + 1 ? 'auto' : 'hidden';
    const box = t.closest('.cmp-box');
    if (box) box.dataset.long = (t.value.trim().length > 48 || t.scrollHeight > max + 1) ? '1' : '0';
  }
  function cmpCount(){
    const ta = $('cmpFullText'), n = $('cmpFullCount');
    if (ta && n) n.textContent = ta.value.length + ' 字';
  }
  function openCmpFull(){
    const full = $('cmpFull'), ta = $('cmpFullText'), src = $('text');
    if (!full || !ta || !src) return;
    ta.value = src.value;
    full.hidden = false;
    cmpCount();
    setTimeout(() => { try { ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; } catch (_) {} }, 30);
  }
  function closeCmpFull(keep){
    const full = $('cmpFull'), ta = $('cmpFullText'), src = $('text');
    if (!full) return;
    if (keep !== false && ta && src) {
      src.value = ta.value;
      src.dispatchEvent(new Event('input', { bubbles: true }));
    }
    full.hidden = true;
    if (src) try { src.focus(); } catch (_) {}
  }

  function toComposer(line, opts){
    const t = $('text');
    if (!t) return false;
    const text = String(line == null ? '' : line);
    const append = !opts || opts.append !== false;
    const prev = append ? t.value.replace(/\s+$/, '') : '';
    t.value = prev ? prev + '\n' + text : text;
    try { t.focus(); t.selectionStart = t.selectionEnd = t.value.length; } catch (_) {}
    growComposer();
    if (MOB.open) closeSheet();
    return true;
  }

  /* 复制：剪贴板 API → execCommand → 实在不行就写进输入框，绝不假装成功 */
  function copyText(text, okMsg){
    const done = () => say(okMsg || '已复制');
    const fallback = () => {
      if (toComposer(text)) say('剪贴板不可用，已写进输入框');
      else say('复制失败');
    };
    const legacy = () => {
      try {
        const t = document.createElement('textarea');
        t.value = text; t.setAttribute('readonly', '');
        t.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
        document.body.append(t); t.select(); t.setSelectionRange(0, text.length);
        const ok = document.execCommand('copy');
        t.remove();
        ok ? done() : fallback();
      } catch (_) { fallback(); }
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, legacy);
        return;
      }
    } catch (_) {}
    legacy();
  }

  /* ---------------- 物品气泡（仓库 / 货架共用） ---------------- */
  let ITIP = '';
  function itemOf(kind, i){
    return kind === 'shop' ? SYS.shop[i] : SYS.bag[i];
  }
  /* 气泡只说「是什么」：名称 + 出处 + 描述。
     没有按钮、没有说明性文字 —— 选择与复制都走货架下方那条选择框。 */
  function itemTipHtml(it, kind, i){
    return `<div class="itmtip__hd"><span class="itmtip__ic">${itemSvg(it)}</span>
        <div><b>${esc(it.n)}</b><i>${kind === 'shop' ? '货架' : (it.q > 1 ? '仓库 · ×' + it.q : '仓库')}</i></div></div>
      <p>${esc(it.d || '（无描述）')}</p>`;
  }
  /* 货架：点一下加入选择框，再点取消。选择结果只存在本地，等玩家按「确定并复制」。
     paint() 开头会收起物品气泡，所以选择完要把气泡重新摆回新格子上。 */
  function togglePick(name, keepTip, cell){
    if (!name) return;
    const list = state.shopPick || (state.shopPick = []);
    const at = list.indexOf(name);
    if (at >= 0) list.splice(at, 1); else list.push(name);
    if (!keepTip) hideItemTip();
    paint();
    if (keepTip) {
      /* 重绘后同一个 data-item 可能同时存在于手机面板与桌面右栏，
         只认当前真正可见的那一个，否则气泡会被摆到看不见的容器上。 */
      const key = cell && cell.dataset ? cell.dataset.item : '';
      const next = key
        ? [...document.querySelectorAll('[data-item="' + key + '"]')].find(el => el.getClientRects().length)
        : null;
      if (next) showItemTip(next);
    }
  }
  function tipHost(){
    let el = document.getElementById('itemTip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'itemTip'; el.className = 'itmtip';
      document.body.append(el);
    }
    return el;
  }
  function showItemTip(cell){
    const [kind, idx] = String(cell.dataset.item || '').split(':');
    const it = itemOf(kind, +idx);
    if (!it) return;
    /* 不可见的格子（另一端的隐藏面板）没有位置可摆，直接不弹 */
    if (!cell.getClientRects().length) { hideItemTip(); return; }
    const el = tipHost();
    const key = cell.dataset.item;
    if (ITIP !== key) { el.innerHTML = itemTipHtml(it, kind, +idx); ITIP = key; }
    el.classList.add('on');
    el.style.visibility = 'hidden';
    el.style.left = '0px'; el.style.top = '0px';
    const w = el.offsetWidth, h = el.offsetHeight;
    const r = cell.getBoundingClientRect();
    let x = r.x + r.width / 2 - w / 2;
    let y = r.top - h - 10;
    if (y < 8) y = r.bottom + 10;
    x = Math.max(8, Math.min((window.innerWidth || 800) - w - 8, x));
    y = Math.min(y, (window.innerHeight || 600) - h - 8);
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.visibility = '';
  }
  function hideItemTip(){
    const el = document.getElementById('itemTip');
    if (el) el.classList.remove('on');
    ITIP = '';
  }

  /* ============================================================
     HUD 渲染
     ============================================================ */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function worldbarHtml() {
    const crumb = [WORLD.region, WORLD.spot].filter(Boolean);
    if (!WORLD.date && !crumb.length) {
      return `<span class="beam"></span>
      <div class="wb-row">
        <div class="crest-wrap wb-crest">${CREST}</div>
        <div class="wb-date"><b>尚未接入</b><i>等待状态块</i></div>
        <div class="wb-place"><div class="wb-crumb">AI 还没有写出世界状态</div>
          <div class="wb-meta"><span>—</span></div></div>
        <div class="wb-sp"></div>
      </div>`;
    }
    return `<span class="beam"></span>
      <div class="wb-row">
        <div class="crest-wrap wb-crest">${CREST}</div>
        <div class="wb-date"><b>${esc(worldDate() || '—')}</b><i>${esc(WORLD.time)}</i></div>
        <div class="wb-place">
          <div class="wb-crumb">${crumb.map((c,i)=> i===crumb.length-1 ? `<b>${esc(c)}</b>` : `${esc(c)} <em>›</em>`).join(' ')}</div>
          <div class="wb-meta"><span>${esc(WORLD.weather || '—')}</span><span>·</span><span>${esc(WORLD.temp || '—')}</span></div>
        </div>
        <div class="wb-sp"></div>
        <div class="wb-stat">
          ${WORLD.stale ? `<div class="cell wb-stale" title="最近 ${WORLD.stale} 轮没有读到可用的状态块：模型漏写，或 turn 没有加一。世界条与人物页停在旧值。"><small>STATE</small><b>${WORLD.stale}</b></div>` : ''}
        </div>
      </div>`;
  }

  const EXIT_SVG = '<path d="M14.2 4.8H19v14.4h-4.8"/><path d="M5 12h8.2"/><path d="m10.2 8.8 3.2 3.2-3.2 3.2"/>';
  const DETAIL_SVG = '<rect x="4.6" y="4.8" width="14.8" height="14.4" rx="2"/><path d="M4.6 9.4h14.8M9.8 9.4v9.8"/>';
  const COVER_SVG = '<rect x="4.8" y="4.6" width="14.4" height="14.8" rx="1.6"/><path d="M12 4.6v14.8"/><path d="M9.6 12h-.01"/>';
  const EXIT_LABEL = '返回原生页';
  const COVER_LABEL = '返回封面';
  /* 底部两颗常驻出口：上＝回原生聊天页，下＝回角色卡详情页（手机端在「更多」里左右并排） */
  function railHtml() {
    return NAVS.map(n => `<button class="rnav ${n.id===state.nav?'on':''}" data-nav="${n.id}">
      <svg viewBox="0 0 24 24">${n.icon}</svg><span>${n.label}</span></button>`).join('')
      + `<div class="rail__foot">
        <button class="rnav rnav--cover" data-cover="1" title="${COVER_LABEL}" aria-label="${COVER_LABEL}">
        <svg viewBox="0 0 24 24">${COVER_SVG}</svg><span>${COVER_LABEL}</span></button>
        <button class="rnav rnav--exit" data-exitmmd="1" title="${EXIT_LABEL}" aria-label="${EXIT_LABEL}">
        <svg viewBox="0 0 24 24">${EXIT_SVG}</svg><span>${EXIT_LABEL}</span></button>
        <button class="rnav rnav--detail" data-backdetail="1" title="返回详情页" aria-label="返回详情页">
        <svg viewBox="0 0 24 24">${DETAIL_SVG}</svg><span>返回详情页</span></button>
      </div>`;
  }

  function bondRing(val) {
    const C = 2*Math.PI*27, pct = Math.max(0, Math.min(100, Math.abs(val)));
    const col = val < 0 ? 'var(--blood)' : 'var(--gold)';
    return `<div class="bond"><div class="bond__ring">
      <svg width="62" height="62" viewBox="0 0 62 62">
        <circle cx="31" cy="31" r="27" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="3"/>
        <circle cx="31" cy="31" r="27" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"
          stroke-dasharray="${C}" stroke-dashoffset="${C*(1-pct/100)}" style="filter:drop-shadow(0 0 6px ${col})"/>
      </svg><div class="val">${val}<small>BOND</small></div>
    </div></div>`;
  }

  /* ============================================================
     人物 · 简要（主角固定置顶 / 置顶 / 排序 / 分页）
     ============================================================ */
  const PIN_SVG = '<svg viewBox="0 0 24 24"><path d="M12 3.2a3.9 3.9 0 0 1 2.5 6.9l1.2 4.4h-2.1v5.9h-1.6v-5.9H9.7l1.2-4.4A3.9 3.9 0 0 1 12 3.2Z"/></svg>';

  function castCardHtml(c){
    const isMe = c.id === 'me';
    const pinned = isMe || state.pins.indexOf(c.id) >= 0;
    const lv = String(c.lv || '').split(' · ');
    return `<button class="citem ${c.id===state.cast?'on':''} ${isMe?'is-me':''}" data-cast="${c.id}">
      <span class="citem__av ${c.sex==='女'?'f':c.sex==='男'?'m':''}">${esc(c.name.slice(0,1))}</span>
      <span class="citem__main">
        <span class="citem__row"><span class="citem__name">${esc(c.name)}<small>${c.sex==='女'?'♀':c.sex==='男'?'♂':''}</small></span>
        <span class="citem__lv">${esc(lv[0]||'')}</span></span>
        <span class="citem__meta"><span class="citem__rel">${esc(c.rel)}</span><span>${esc(lv[1]||'')}</span></span>
      </span>
      ${isMe
        ? '<span class="cpin is-fixed" title="主角固定置顶">★</span>'
        : `<span class="cpin ${pinned?'on':''}" data-pin="${c.id}" role="button" aria-label="置顶">${PIN_SVG}</span>`}
      <span class="citem__arrow">›</span></button>`;
  }

  function castBriefHtml(){
    const others = CAST.slice();
    const pins = others.filter(c => state.pins.indexOf(c.id) >= 0);
    const rest = others.filter(c => state.pins.indexOf(c.id) < 0);
    let list;
    if (state.castSort === 'fav' || state.castSort === 'lv') {
      /* 排序时全量参与，置顶只保留图钉标记 */
      const cmp = state.castSort === 'fav' ? (a,b) => b.fav - a.fav : (a,b) => lvNum(b) - lvNum(a);
      list = [PLAYER_OBJ].concat(others.slice().sort(cmp));
    } else {
      list = [PLAYER_OBJ].concat(pins, rest);
    }
    const pages = Math.max(1, Math.ceil(list.length / CAST_PAGE));
    if (state.castPage > pages - 1) state.castPage = Math.max(0, pages - 1);
    const from = state.castPage * CAST_PAGE;
    const cards = list.slice(from, from + CAST_PAGE).map(castCardHtml).join('');
    const seg = [['default','默认'],['fav','好感'],['lv','等级']].map(([k,t]) =>
      `<button class="cseg__b ${state.castSort===k?'on':''}" data-csort="${k}">${t}</button>`).join('');
    const pager = pages > 1 ? `<div class="cpager">
      <button data-cpage="-1" ${state.castPage===0?'disabled':''}>‹</button>
      <span>${state.castPage+1} / ${pages}</span>
      <button data-cpage="1" ${state.castPage>=pages-1?'disabled':''}>›</button></div>` : '';
    return `<div class="casttools"><div class="cseg">${seg}</div><span class="cnum">${list.length} 人</span></div>
      <div class="clist">${cards}</div>${pager}`;
  }

  /* ---------------- 系统 · 简要 ---------------- */
  function sysBriefHtml(){
    const n = SYS.bag.reduce((a, b) => a + (b.q || 1), 0);
    return `<div class="syscard">
      <div class="sysorbwrap">${orbSvg()}</div>
      <div class="syscard__tx"><b>${esc(SYS.name || '未命名')}</b>
        <i>${esc([SYS.trait || SYS.mood, SYS.look].filter(Boolean).join(' · ') || '等待 AI 写入形象')}</i></div>
    </div>
    ${sysMsgHtml()}
    <div class="sysgrid" data-sheetmore="1" role="button" tabindex="0">
      <div class="syscell"><i>仓库</i><b>${n}</b><span>件</span></div>
      <div class="syscell"><i>货架</i><b>${SYS.shop.length}</b><span>项</span></div>
    </div>`;
  }

  /* ---------------- 世界 · 简要 ---------------- */
  function diffTone(it){
    const a = parseFloat(it.from), b = parseFloat(it.to);
    if (!isFinite(a) || !isFinite(b) || a === b) return '';
    if (/威胁/.test(it.k)) return b > a ? 'bad' : 'good';
    if (/好感|魂力|HP|肉身|等级/.test(it.k)) return b > a ? 'good' : 'bad';
    return '';
  }
  function diffHtml(limit){
    if (DIFF.first && DIFF.prev) {
      const s0 = DIFF.prev;
      return `<div class="difboot"><p>世界 ${Object.keys(s0.world).length} · 你 ${Object.keys(s0.me).length} · 人物 ${Object.keys(s0.cast).length} · 系统 ${Object.keys(s0.sys).length}</p></div>`;
    }
    if (!DIFF.items.length) {
      return `<div class="difempty"><i>—</i><p>本轮没有变化。<br>下一次状态块里改了什么，这里就列什么。</p></div>`;
    }
    const items = limit ? DIFF.items.slice(0, limit) : DIFF.items;
    let last = '', rows = '';
    items.forEach(it => {
      if (it.g !== last) {
        const total = DIFF.items.filter(x => x.g === it.g).length;
        rows += `<li class="difgrp"><i>${esc(it.g)}</i><span class="ln"></span><em>${total}</em></li>`;
        last = it.g;
      }
      rows += `<li class="difrow ${diffTone(it)}"><i>${esc(it.k)}</i><b>${esc(it.to)}</b><s>${esc(it.from)}</s></li>`;
    });
    return `<ul class="diflist">${rows}</ul>
      ${limit && DIFF.items.length > limit ? `<p class="difmore">另有 ${DIFF.items.length - limit} 项，见右栏。</p>` : ''}`;
  }

  function worldBriefHtml(){
    if (!WORLD.chapter && !WORLD.arc && !WORLD.title && !WORLD.summary) {
      return `<div class="difempty"><i>—</i><p>还没有世界状态。<br>AI 写出 <b>act</b> 与 <b>sum</b> 后在这里生成。</p></div>`;
    }
    return `<div class="dt-sec"><div class="dt-sec__h"><i>01</i><b>章节</b><span class="ln"></span></div>
      <div class="dt-sec__body"><p><b>${esc(WORLD.arc)}</b><br>第 ${WORLD.chapter} 幕 · ${esc(WORLD.title)}</p>
      <p style="color:var(--text-4);font-size:11px">${esc(WORLD.summary)}</p></div></div>
      <div class="dt-sec"><div class="dt-sec__h"><i>02</i><b>动荡</b><span class="ln"></span>
        <em class="dt-sec__n">${DIFF.first ? '初始' : (DIFF.items.length ? DIFF.items.length + ' 项' : '无')}</em></div>
        <div class="dt-sec__body">${diffHtml(4)}</div></div>`;
  }

  /* ---------------- 编年 · 简要 ---------------- */
  function chronRows(){
    return (CHRON.list || []).filter(e => e && (e.sum || e.title));
  }
  function chronBriefHtml(){
    const list = chronRows();
    if (!list.length) return `<div class="difempty"><i>—</i><p>还没有记录。<br>AI 每回复一次，这里收一条章节摘要。</p></div>`;
    return `<div class="chrlist">${list.map((e, i) => `<button class="chrrow ${state.chronOpen===i?'on':''}" data-chron="${i}">
      <span class="chrrow__no">${String(i + 1).padStart(2,'0')}</span>
      <span class="chrrow__tx"><b>${esc(e.title || e.d || '记录')}</b><i>${esc([e.d, e.t, e.place].filter(Boolean).join(' · '))}</i></span>
    </button>`).join('')}</div>`;
  }

  /* ---------------- 关系 · 简要 ---------------- */
  function bondBriefHtml(){
    const list = CAST.slice().sort((a,b) => b.fav - a.fav);
    const max = list[0], min = list[list.length-1];
    /* 只有一个人时，「最亲近」和「最疏远」是同一张脸，别摆两块 */
    const top = list.length >= 2
      ? `<div class="bondtop">
      <div class="bondtop__i"><i>最亲近</i><b>${esc(max.name)}</b><em>${max.fav}</em></div>
      <div class="bondtop__i"><i>最疏远</i><b>${esc(min.name)}</b><em>${min.fav}</em></div>
    </div>`
      : `<div class="bondtop bondtop--one">
      <div class="bondtop__i"><i>已建档</i><b>${list.length ? esc(max.name) : '—'}</b><em>${list.length}</em></div>
    </div>`;
    return top + `
    <div class="bondlist">${list.map(c => `<button class="bondrow" data-cast="${c.id}">
      <span class="bondrow__av">${esc(c.name.slice(0,1))}</span>
      <span class="bondrow__tx"><b>${esc(c.name)}</b><i>${esc(c.rel)}</i></span>
      <span class="bondbar"><i style="width:${Math.max(3, Math.min(100, Math.abs(c.fav)))}%;--c:${c.fav<0?'var(--blood)':'var(--gold)'}"></i></span>
      <em class="${c.fav<0?'neg':''}">${c.fav}</em></button>`).join('')}</div>`;
  }

  /* ---------------- 外观 ---------------- */
  const LK_LABEL = { s:'小', m:'标准', l:'大', t:'紧', w:'松', off:'关闭', up:'首字放大', drop:'首字下沉', left:'左对齐', justify:'两端对齐' };
  function lkRange(key, min, max, step, fmt){
    const v = state.look[key];
    return `<div class="lkrange">
      <input type="range" data-lkr="${key}" min="${min}" max="${max}" step="${step}" value="${v}" aria-label="${key === 'scale' ? '字号' : '行距'}">
      <em>${fmt(v)}</em></div>`;
  }
  const fmtScale = v => Math.round(v * 100) + '%';
  const fmtLh = v => Number(v).toFixed(2);
  function lkChips(key, list){
    const cur = state.look[key];
    return `<div class="lks__row">${list.map(([id, label, val]) =>
      `<button class="lchip ${cur === (val !== undefined ? val : id) ? 'on' : ''}" data-lk="${key}:${val !== undefined ? val : id}">${label}</button>`).join('')}</div>`;
  }
  function lookBriefHtml(){
    return `<div class="lks">
      <div class="lks__h">正文字体</div>
      <div class="lks__row">${FONTS.map(f => `<button class="lchip ${state.look.font===f.id?'on':''}" data-lk="font:${f.id}" style="font-family:${f.stack.replace(/"/g, "'")}">${f.label}</button>`).join('')}</div>
      <div class="lks__h">字号</div>${lkRange('scale', .85, 1.25, .01, fmtScale)}
      <div class="lks__h">行距</div>${lkRange('lh', 1.6, 2.2, .02, fmtLh)}
      <div class="lks__h">段首字</div>${lkChips('cap', LOOK_CAP)}
      <div class="lks__h">对齐</div>${lkChips('align', LOOK_ALIGN)}
      <div class="lks__h">皮肤</div>
      <div class="lks__row lks__row--skin">${SKINS.map(k => `<button class="lskin sw-${k.id} ${state.look.skin===k.id?'on':''}" data-lk="skin:${k.id}" title="${k.label}"></button>`).join('')}</div>
    </div>`;
  }
  function lookDetailHtml(){
    const f = FONTS.find(x=>x.id===state.look.font) || FONTS[0];
    return `<div class="dt-hero"><div class="dt-hero__orb">颜</div>
      <div class="dt-hero__txt"><h1>外观</h1><div class="sub">LOOK · ${f.label} · ${state.look.skin.toUpperCase()}</div></div></div>
      <section class="dt-sec"><div class="dt-sec__h"><i>01</i><b>正文预览</b><span class="ln"></span></div>
        <div class="dt-sec__body lkprev" style="font-family:${f.stack}">
          <p>黑暗。温热的液体包裹着你，声音被隔绝在外，只剩心跳——两个心跳。那声音一下一下，像隔着很厚的水。</p>
          <p>「……还有胞亲？」一道稚嫩却带着成年人分量的意识，直接落进你的脑海。</p>
        </div></section>
      <section class="dt-sec"><div class="dt-sec__h"><i>02</i><b>字体</b><span class="ln"></span></div>
        <div class="dt-sec__body"><div class="lks__row">${FONTS.map(x => `<button class="lchip ${state.look.font===x.id?'on':''}" data-lk="font:${x.id}" style="font-family:${x.stack.replace(/"/g, "'")}">${x.label}</button>`).join('')}</div></div></section>
      <section class="dt-sec"><div class="dt-sec__h"><i>03</i><b>段落</b><span class="ln"></span></div>
        <div class="dt-sec__body">
          <div class="lks__h">字号</div>${lkRange('scale', .85, 1.25, .01, fmtScale)}
          <div class="lks__h">行距</div>${lkRange('lh', 1.6, 2.2, .02, fmtLh)}
          <div class="lks__h">段首字</div>${lkChips('cap', LOOK_CAP)}
          <div class="lks__h">对齐</div>${lkChips('align', LOOK_ALIGN)}
        </div></section>
      <section class="dt-sec"><div class="dt-sec__h"><i>04</i><b>皮肤</b><span class="ln"></span></div>
        <div class="dt-sec__body"><div class="lks__row lks__row--skin">${SKINS.map(k => `<button class="lskin sw-${k.id} ${state.look.skin===k.id?'on':''}" data-lk="skin:${k.id}" title="${k.label}"></button>`).join('')}</div>
        <p style="font-size:11px;color:var(--text-4);margin-top:8px">换肤只改 CSS 变量，不重排版式。</p></div></section>`;
  }

  function briefHtml() {
    if (state.nav === 'cast') return castBriefHtml();
    if (state.nav === 'system') return sysBriefHtml();
    if (state.nav === 'world') return worldBriefHtml();
    if (state.nav === 'chron') return chronBriefHtml();
    if (state.nav === 'bond') return bondBriefHtml();
    if (state.nav === 'map') return localMapHtml();
    if (state.nav === 'term') {
      const rows = FEATURES.filter(f => !f.authorOnly || state.author);
      const caps = snapshot?.native?.capabilities || {};
      return FEATURE_GROUPS.map(g => {
        const list = rows.filter(f => f.g === g);
        if (!list.length) return '';
        return `<div class="fgroup"><i>${g}</i><span class="ln"></span></div>
          <div class="fgrid">${list.map(f => {
            const fav = f.id === 'favorite' && snapshot?.native?.actions?.navigation?.favorite === true;
            const cap = FEATURE_CAP[f.id];
            /* 平台明确说「没有这个入口」就提前标灰；正在生成回答时整页锁住 */
            const capOff = !!(cap && caps[cap] && caps[cap].available === false);
            const locked = !!state.assistBusy;
            const off = capOff || locked;
            const label = f.label;      /* 收藏的名字固定，不随状态改字 */
            const desc = locked ? '正在生成回答，稍候…' : capOff ? '当前页面没有这个入口' : f.desc;
            return `<button class="fitem ${state.termPanel === f.id ? 'on' : ''} ${fav ? 'is-fav' : ''} ${off ? 'is-off' : ''}" data-feat="${f.id}"${f.panel ? ' aria-pressed="' + (state.termPanel === f.id) + '"' : ''}${off ? ' aria-disabled="true" title="当前页面没有这个入口，可到原生页操作"' : ''}>
            <span class="fitem__ic"><svg viewBox="0 0 24 24">${f.icon}</svg></span>
            <span class="fitem__tx"><b>${label}</b><i>${desc}</i></span>
            <span class="fitem__ar${f.star ? ' is-star' : ''}">${off ? '—' : f.star ? (fav ? '★' : '☆') : '›'}</span></button>`; }).join('')}</div>`;
      }).join('');
    }
    if (state.nav === 'look') return lookBriefHtml();
    return `<div class="dt-sec"><div class="dt-sec__body"><p style="color:var(--text-4)">该分区待接入。</p></div></div>`;
  }

  function curChar(){
    return castOf(state.cast);
  }

  /* ============================================================
     系统 · 详情
     ============================================================ */
  /* 系统形象：纯代码 SVG，五种，玩家自己切。AI 只写「相貌 / 性格」，不改这里的形态。 */
  /* 系统头像：五种形态全部带循环动效（PC / 手机一致，不依赖 hover）。
     动效都挂在 <g> 上：SVG 子元素直接做 CSS transform 在部分 WebView 里会失效，
     包一层 <g> 再用 transform-box:view-box 才稳。 */
  function orbSvg(force){
    const f0 = force || SYS.form || 'orb';
    const f = SYS_FORMS.some(x => x[0] === f0) ? f0 : 'orb';
    const hue = SYS.hue || '#8C5CFF';
    /* 同一页里可能同时挂两三个球（简要卡 + 留言头像 + 详情头像），渐变 / 裁剪 id 必须唯一 */
    const gid = 'syso' + (orbSvg.n = (orbSvg.n || 0) + 1);

    /* 白面具：四张脸轮着来 —— 闭眼 → 笑 → 怒 → 哭。
       每次换脸都「翻」一下（纵向压扁 → 倒转 → 压回），所以看着像面具自己换了张脸。 */
    if (f === 'mask') {
      return `<svg class="sysorb sysorb--mask" viewBox="0 0 120 120" style="--h:${hue}">
        <g class="orbmask__g">
          <path class="orbmask" d="M60 14c22 0 34 14 34 34 0 26-14 46-34 58C40 94 26 74 26 48c0-20 12-34 34-34Z"/>
          <g class="orbmask__face">
            <g class="orbmask__fx orbmask__fx--f0">
              <path class="orbmask__eye" d="M40 52c6-6 14-6 20 0M60 52c6-6 14-6 20 0"/>
              <path class="orbmask__mouth" d="M52 76c5 3 11 3 16 0"/>
            </g>
            <g class="orbmask__fx orbmask__fx--f1">
              <path class="orbmask__eye" d="M40 54c6-8 14-8 20 0M60 54c6-8 14-8 20 0"/>
              <path class="orbmask__mouth" d="M46 71c6 10 22 10 28 0"/>
            </g>
            <g class="orbmask__fx orbmask__fx--f2">
              <path class="orbmask__brow" d="M36 41c8-2 15 0 20 4M64 45c5-4 12-6 20-4"/>
              <path class="orbmask__eye" d="M38 50c6 1 13 4 18 6M62 56c5-2 12-5 18-6"/>
              <path class="orbmask__mouth" d="M48 79h24"/>
            </g>
            <g class="orbmask__fx orbmask__fx--f3">
              <path class="orbmask__eye" d="M39 49c6 6 14 6 20 0M61 49c6 6 14 6 20 0"/>
              <path class="orbmask__tear" d="M44 57c0 6-2 9-2 12a2 2 0 0 0 4 0c0-3-2-6-2-12Z"/>
              <path class="orbmask__tear" d="M74 57c0 6-2 9-2 12a2 2 0 0 0 4 0c0-3-2-6-2-12Z"/>
              <path class="orbmask__mouth" d="M48 80c4-6 8 4 12 0 4-4 8 6 12 0"/>
            </g>
          </g>
        </g>
      </svg>`;
    }
    /* 星尘：内核呼吸，星点绕行闪烁，外圈虚线反向转 */
    if (f === 'star') {
      return `<svg class="sysorb sysorb--star" viewBox="0 0 120 120" style="--h:${hue}">
        <circle class="orbstar__halo" cx="60" cy="60" r="34"/>
        <circle class="orbstar__pulse" cx="60" cy="60" r="14"/>
        <g class="orbspin orbspin--star">
          ${Array.from({length: 9}, (_, i) => {
            const a = i / 9 * Math.PI * 2, r = 26 + (i % 3) * 12;
            return `<circle class="orbstar__d" cx="${(60 + Math.cos(a) * r).toFixed(1)}" cy="${(60 + Math.sin(a) * r).toFixed(1)}" r="${1.8 + (i % 3) * .7}" style="animation-delay:${(-i * .43).toFixed(2)}s"/>`;
          }).join('')}
        </g>
        <circle class="orbstar__core" cx="60" cy="60" r="9"/>
      </svg>`;
    }
    /* 暗红全息屏：扫描线自上而下，行随打字亮起，右上指示灯呼吸 */
    if (f === 'screen') {
      return `<svg class="sysorb sysorb--screen" viewBox="0 0 120 120" style="--h:#D4485E">
        <defs><clipPath id="${gid}c"><rect x="16" y="26" width="88" height="68" rx="4"/></clipPath></defs>
        <rect class="orbscreen" x="16" y="26" width="88" height="68" rx="4"/>
        <rect class="orbscreen__glow" x="16" y="26" width="88" height="68" rx="4"/>
        <g clip-path="url(#${gid}c)">
          <rect class="orbscreen__scan" x="16" y="22" width="88" height="14"/>
          <path class="orbscreen__scanline" d="M16 34h88"/>
        </g>
        <g class="orbscreen__lns">
          <path class="orbscreen__ln" d="M25 41h44M25 50h62M25 59h30"/>
          <path class="orbscreen__ln" d="M25 68h52M25 77h38" opacity=".55"/>
        </g>
        <circle class="orbscreen__dot" cx="96" cy="33" r="1.8"/>
      </svg>`;
    }
    /* 竖瞳：眼珠上下左右看，瞳孔缩放，定时眨眼，外弧慢慢绕 */
    if (f === 'eye') {
      return `<svg class="sysorb sysorb--eye" viewBox="0 0 120 120" style="--h:${hue}">
        <defs><clipPath id="${gid}e"><path d="M22 60c10-16 22-24 38-24s28 8 38 24c-10 16-22 24-38 24S32 76 22 60Z"/></clipPath></defs>
        <g class="orbspin orbspin--arc"><path class="orbeye__arc" d="M13 60c12-23 28-34 47-34s35 11 47 34"/></g>
        <ellipse class="orbeye__ball" cx="60" cy="60" rx="34" ry="30"/>
        <g class="orbeye__gaze">
          <ellipse class="orbeye__iris" cx="60" cy="60" rx="15" ry="17"/>
          <path class="orbeye__pupil" d="M60 45c4 8 4 22 0 30-4-8-4-22 0-30Z"/>
          <circle class="orbeye__gl" cx="53" cy="52" r="2.4"/>
        </g>
        <path class="orbeye__lid" d="M22 60c10-16 22-24 38-24s28 8 38 24c-10 16-22 24-38 24S32 76 22 60Z"/>
        <g clip-path="url(#${gid}e)"><rect class="orbeye__blink" x="20" y="34" width="80" height="54"/></g>
      </svg>`;
    }
    /* 混沌黑球：双环异速绕行 + 两颗伴星，核心呼吸，光晕起伏 */
    return `<svg class="sysorb sysorb--orb" viewBox="0 0 120 120" style="--h:${hue}">
      <defs>
        <radialGradient id="${gid}" cx=".42" cy=".36" r=".68">
          <stop offset="0" stop-color="#2a1650"/><stop offset=".45" stop-color="#0d0618"/>
          <stop offset="1" stop-color="#000000"/>
        </radialGradient>
      </defs>
      <circle class="orbglow" cx="60" cy="60" r="50"/>
      <g class="orbcore__g"><circle class="orbcore" cx="60" cy="60" r="38" fill="url(#${gid})"/></g>
      <circle class="orbring orblim" cx="60" cy="60" r="38"/>
      <g class="orbspin orbspin--halo"><circle class="orbring orbhalo" cx="60" cy="60" r="43"/></g>
      <g class="orbspin orbspin--a">
        <ellipse class="orbring orbring2" cx="60" cy="60" rx="52" ry="15"/>
        <circle class="orbmoon" cx="112" cy="60" r="2.2"/>
      </g>
      <g class="orbspin orbspin--b">
        <ellipse class="orbring orbring3" cx="60" cy="60" rx="52" ry="15"/>
        <circle class="orbmoon orbmoon--2" cx="8" cy="60" r="1.6"/>
      </g>
      <path class="orbslit" d="M42 62q18 7 36 0"/>
      <circle class="orbdust" cx="24" cy="40" r="1.6"/>
      <circle class="orbdust" cx="96" cy="78" r="1.2"/>
      <circle class="orbdust" cx="86" cy="30" r="1"/>
    </svg>`;
  }

  function itemCell(it, i, kind){
    const q = it.q || 1;
    const on = kind === 'shop' && (state.shopPick || []).indexOf(it.n) >= 0;
    return `<button class="itmcell ${on ? 'on' : ''}" type="button" data-item="${kind}:${i}"
      aria-pressed="${on}" title="${esc(it.n)}">
      <span class="itmcell__ic">${itemSvg(it)}</span>
      <span class="itmcell__nm">${esc(it.n)}</span>
      ${kind === 'shop'
        ? (on ? '<em class="itmcell__ck">✓</em>' : '')
        : (q > 1 ? `<em class="itmcell__q">${q}</em>` : '')}
    </button>`;
  }

  /* 系统留言：一块与聊天冒泡不同族的气泡 —— 左侧贴着系统徽记，虚线边，没有「你/叙述」标签 */
  function sysMsgHtml(){
    const msg = String(SYS.say || '').trim();
    return `<div class="sysmsg ${msg ? '' : 'is-empty'}">
      <span class="sysmsg__av">${orbSvg()}</span>
      <div class="sysmsg__bd">
        <b class="sysmsg__tag">系统留言</b>
        <p>${msg ? esc(msg) : '它还没有出声。等下一轮状态块写出 <em>sys.say</em>。'}</p>
      </div></div>`;
  }

  function sysPickNames(){
    const pick = state.shopPick || [];
    return SYS.shop.map(x => x.n).filter(n => pick.indexOf(n) >= 0);
  }
  function sysPickText(){
    const names = sysPickNames();
    if (!names.length) return '';
    return (SYS.name || '系统') + '，我想买这些商品' + names.join('、') + '，需要什么代价？';
  }
  function shopDockHtml(){
    if (!SYS.shop.length) return '';
    const names = sysPickNames();
    return `<div class="shopdock">
      <div class="shopdock__sel">${names.length
        ? names.map(n => `<span class="pickchip" data-unpick="${esc(n)}">${esc(n)}<i>×</i></span>`).join('')
        : ''}</div>
      <div class="shopdock__ft"><span>已选 <b>${names.length}</b> 件</span>
        <button type="button" class="shopdock__ok" data-shopok="1" ${names.length ? '' : 'disabled'}
          title="${esc(sysPickText())}">确定并复制</button></div>
    </div>`;
  }
  function sysDetailHtml(){
    const bagCount = SYS.bag.reduce((a, b) => a + (b.q || 1), 0);
    const bag = SYS.bag.length
      ? `<div class="itmgrid">${SYS.bag.map((it, i) => itemCell(it, i, 'bag')).join('')}</div>`
      : '<div class="difempty"><i>—</i><p>仓库是空的。<br>AI 写出 <b>sys.bag</b> 后这里会出现存物。</p></div>';
    const shop = SYS.shop.length
      ? `<div class="itmgrid">${SYS.shop.map((it, i) => itemCell(it, i, 'shop')).join('')}</div>`
      : '<div class="difempty"><i>—</i><p>货架是空的。<br>AI 写出 <b>sys.shop</b> 后这里会出现商品。</p></div>';
    const msg = String(SYS.say || '').trim();
    return `<div class="sysid">
      <div class="sysid__av" data-syscycle="1" title="点击切换形象" role="button" tabindex="0" aria-label="切换系统形象">
        ${orbSvg()}
        <b>${esc(SYS.name || '未命名')}</b>
      </div>
      <div class="sysid__say ${msg ? '' : 'is-empty'}">
        <em class="sysid__tag">系统留言</em>
        <p>${msg ? esc(msg) : '它还没有出声。'}</p>
      </div>
    </div>

      <section class="dt-sec"><div class="dt-sec__h"><i>01</i><b>形象</b><span class="ln"></span></div>
        <div class="dt-sec__body">
          <dl class="kv kv--sys">
            <dt>样子 · 性格</dt><dd>${esc([SYS.look, SYS.trait].filter(Boolean).join('；') || '—')}</dd>
          </dl>
          <div class="sysask">
            <input id="sysSay" maxlength="40" placeholder="例如：墨渊，少言，只在夜里回应" aria-label="系统称呼与设定">
            <button class="syssave" data-syssay="1">写入</button>
          </div>
        </div></section>

      <section class="dt-sec"><div class="dt-sec__h"><i>02</i><b>仓库</b><span class="ln"></span>
        <em class="dt-sec__n">${bagCount} 件</em></div>
        ${bag}</section>

      <section class="dt-sec"><div class="dt-sec__h"><i>03</i><b>货架</b><span class="ln"></span>
        <em class="dt-sec__n">${SYS.shop.length} 项</em></div>
        ${shop}
        ${shopDockHtml()}</section>`;
  }

  /* ============================================================
     世界 · 详情
     ============================================================ */
  function worldDetailHtml(){
    if (!WORLD.chapter && !WORLD.arc && !WORLD.spot && !WORLD.summary) {
      return `<div class="dt-hero"><div class="dt-hero__orb">世</div>
        <div class="dt-hero__txt"><h1>世界</h1><div class="sub">等待状态块</div></div></div>
        <div class="difempty"><i>—</i><p>AI 还没有写出这一轮的时间、地点与章节。<br>写出后这里会自动出现「此刻」与「动荡」。</p></div>`;
    }
    return `<div class="dt-hero"><div class="dt-hero__orb">世</div>
      <div class="dt-hero__txt"><h1>${esc(WORLD.arc)}</h1><div class="sub">第 ${WORLD.chapter} 幕 · ${esc(WORLD.title)}</div></div></div>
      <section class="dt-sec"><div class="dt-sec__h"><i>01</i><b>此刻</b><span class="ln"></span></div>
        <dl class="kv"><dt>时间</dt><dd><b>${esc(worldDate())}</b> · ${esc(WORLD.time)}</dd>
        <dt>大区</dt><dd>${esc(WORLD.region)}</dd><dt>具体</dt><dd>${esc(WORLD.spot)}</dd>
        <dt>环境</dt><dd>${esc(WORLD.weather)} · ${esc(WORLD.temp)}</dd></dl>${herePeopleHtml()}</section>
      <section class="dt-sec"><div class="dt-sec__h"><i>02</i><b>章节摘要</b><span class="ln"></span></div>
        <div class="dt-sec__body"><p>${esc(WORLD.summary)}</p></div></section>
      <section class="dt-sec"><div class="dt-sec__h"><i>03</i><b>动荡</b><span class="ln"></span>
        <em class="dt-sec__n">${DIFF.first ? '初始建档' : DIFF.items.length + ' 项'}</em></div>
        <div class="dt-sec__body">${diffHtml(0)}</div></section>`;
  }

  /* ============================================================
     编年 · 详情
     ============================================================ */
  function chronDetailHtml(){
    const list = chronRows();
    return `<div class="dt-hero"><div class="dt-hero__orb">年</div>
      <div class="dt-hero__txt"><h1>编年</h1><div class="sub">CHRONICLE · ${list.length} 记</div></div></div>
      ${list.length ? `<div class="chrrail">${list.map((e, i) => `<article class="chrart ${state.chronOpen === i ? 'on' : ''}" data-chroncard="${i}">
        <header><span class="chrart__n">${String(i + 1).padStart(2,'0')}</span><b>${esc(e.title || e.d || '记录')}</b>
          <em class="chrart__t">${esc(e.t || '')}</em></header>
        <div class="chrart__m"><i>${esc(e.d || '')}</i><span>${esc(e.place || '')}</span></div>
        <p>${esc(e.sum || '')}</p>
      </article>`).join('')}</div>`
      : `<div class="difempty"><i>—</i><p>还没有记录。<br>AI 每回复一次，这里收一条章节摘要。</p></div>`}`;
  }

  /* ============================================================
     关系 · 详情（蜘蛛网）
     ============================================================ */
  function bondGraphHtml(){
    const W = 320, H = 336, cx = 160, cy = 160;
    const list = CAST.slice(0, 8);
    const ringR = [42, 76, 110];
    const web = ringR.map(r => `<circle cx="${cx}" cy="${cy}" r="${r}" class="bweb__ring"/>`).join('')
      + Array.from({length: 8}, (_, i) => {
          const a = i / 8 * Math.PI * 2;
          return `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * 110).toFixed(1)}" y2="${(cy + Math.sin(a) * 118).toFixed(1)}" class="bweb__spoke"/>`;
        }).join('');
    const nodes = list.map((c, i) => {
      const a = -Math.PI / 2 + i * Math.PI * 2 / list.length;
      const f = Math.max(-100, Math.min(100, c.fav));
      const r = 62 + (1 - Math.min(1, Math.abs(f) / 100)) * 46;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      const neg = c.fav < 0;
      const side = Math.abs(Math.cos(a)) > .55;
      const anchor = side ? (Math.cos(a) > 0 ? 'start' : 'end') : 'middle';
      const lx = side ? Math.cos(a) * 16 : 0;
      const ly = side ? 0 : (Math.sin(a) < 0 ? -22 : 26);
      const fy = side ? 10 : (Math.sin(a) < 0 ? -31 : 35);
      const fx = side ? Math.cos(a) * 16 : 0;
      return `<g class="bnode ${neg?'neg':''}" data-cast="${c.id}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
        <line x1="0" y1="0" x2="${(cx - x).toFixed(1)}" y2="${(cy - y).toFixed(1)}" class="bnode__link"/>
        <circle r="15" class="bnode__halo"/>
        <circle r="10" class="bnode__dot"/>
        <text y="3.6" class="bnode__ch">${esc(c.name.slice(0,1))}</text>
        <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" class="bnode__nm" style="text-anchor:${anchor}">${esc(c.name)}</text>
        <text x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" class="bnode__fv" style="text-anchor:${anchor}">${c.fav}</text>
      </g>`;
    }).join('');
    return `<div class="bweb"><svg viewBox="0 0 ${W} ${H}">
      ${web}
      <circle cx="${cx}" cy="${cy}" r="17" class="bweb__core"/>
      <text x="${cx}" y="${cy + 4}" class="bweb__me">我</text>
      ${nodes}
    </svg></div>`;
  }

  function bondDetailHtml(){
    return `<div class="dt-hero"><div class="dt-hero__orb">网</div>
      <div class="dt-hero__txt"><h1>关系网</h1><div class="sub">BOND WEB · 以 {{user}} 为心</div></div></div>
      ${bondGraphHtml()}
      <section class="dt-sec"><div class="dt-sec__h"><i>01</i><b>连线</b><span class="ln"></span></div>
        <div class="bondlist">${CAST.slice().sort((a,b)=>b.fav-a.fav).map(c => `<button class="bondrow" data-cast="${c.id}">
          <span class="bondrow__av">${esc(c.name.slice(0,1))}</span>
          <span class="bondrow__tx"><b>${esc(c.name)}</b><i>${esc(c.rel)}</i></span>
          <span class="bondbar"><i style="width:${Math.max(3, Math.min(100, Math.abs(c.fav)))}%;--c:${c.fav<0?'var(--blood)':'var(--gold)'}"></i></span>
          <em class="${c.fav<0?'neg':''}">${c.fav}</em></button>`).join('')}</div></section>`;
  }

  /* 剧情总结：由本卡解析到的章节概要 + 编年合成，不伪造原生记忆面板 */
  function summaryPanelHtml(){
    const list = CHRON.list;
    const head = `<div class="dt-hero"><div class="dt-hero__orb">总</div>
      <div class="dt-hero__txt"><h1>剧情总结</h1>
        <div class="sub">SUMMARY · 第 ${WORLD.chapter} 幕 · 前情 ${list.length} 段</div>
        <div style="display:flex;gap:6px;margin-top:7px">
          <button class="dt-back" data-chronrefresh="1" type="button" style="padding:3px 9px;font-size:11px">刷新</button>
          <button class="dt-back" data-chroncopy="1" type="button" style="padding:3px 9px;font-size:11px">复制全文</button>
        </div></div>
      <button class="dt-back" data-termhome="1" type="button">‹ 终端</button></div>`;
    /* 编年里的第一条通常就是本轮，前情从它之后开始 */
    const curKey = chronKey({ c: WORLD.chapter, title: WORLD.title, sum: WORLD.summary });
    const past = list.filter((e, i) => !(i === 0 && chronKey(e) === curKey));
    const rows = past.map(e => `<article class="chrart">
      <header><span class="chrart__n">第 ${e.c} 幕</span><b>${esc(e.title || '')}</b></header>
      <div class="chrart__m"><i>${esc(e.d || '')}</i><em>${esc(e.t || '')}</em><span>${esc(e.place || '')}</span></div>
      <p>${esc(e.sum || '')}</p></article>`).join('');
    return head + `<section class="dt-sec"><div class="dt-sec__h"><i>01</i><b>本章</b><span class="ln"></span>
        <em class="dt-sec__n">${esc(WORLD.title || '')}</em></div>
        <div class="dt-sec__body"><p>${esc(WORLD.summary || '—')}</p>
        <p class="dt-note">${esc(WORLD.date)} ${esc(WORLD.time)} · ${esc([WORLD.region, WORLD.spot].filter(Boolean).join(' › '))}</p></div></section>
      <section class="dt-sec"><div class="dt-sec__h"><i>02</i><b>前情</b><span class="ln"></span>
        <em class="dt-sec__n">${past.length} 段</em></div>
        ${past.length ? rows : `<div class="difempty"><i>—</i><p>这是第一段。<br>之后每次换幕都会在这里留下前情。</p></div>`}</section>`;
  }

  /* 运行自检：把「基座到底看见了什么」摊开，一次截图就能定位断点 */
  function diagPanelHtml(){
    const nat = (typeof snapshot !== 'undefined' && snapshot && snapshot.native) || null;
    const caps = (nat && nat.capabilities) || {};
    const acts = (nat && nat.actions) || {};
    const actKeys = Object.keys(caps);
    const panelKeys = Object.keys(acts).filter(k => acts[k] && typeof acts[k] === 'object' && 'open' in acts[k]);
    /* 壳与徽标挂在宿主页（= Frame 的 parent），不在 Frame 文档里 */
    const upDoc = (() => { try { return (window.parent && window.parent !== window) ? window.parent.document : document; } catch (_) { return document; } })();
    const pick = sel => upDoc.querySelector(sel) || document.querySelector(sel);
    const shell = pick('[id^="MMD_SL_"]');
    const badge = pick('.slb-badge');
    const ok = v => `<i style="color:${v ? 'var(--jade,#6FD6B4)' : 'var(--text-4)'}">${v ? '可用' : '—'}</i>`;
    const row = (a, b, c, d) => `<div style="display:grid;grid-template-columns:minmax(0,1.35fr) 46px minmax(0,1.1fr);gap:6px;
      padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:10.5px;line-height:1.5">
      <span style="color:var(--text-2);overflow:hidden;text-overflow:ellipsis">${esc(a)}</span>
      <span>${b}</span><span style="color:var(--text-4);overflow:hidden;text-overflow:ellipsis">${esc(c || '')}</span></div>`;
    return `<div class="dt-hero"><div class="dt-hero__orb">诊</div>
        <div class="dt-hero__txt"><h1>运行自检</h1><div class="sub">连接 · 动作 · 面板 · 数据来源</div></div>
        <button class="dt-back" data-diagrefresh="1" type="button">刷新</button></div>

      <section class="dt-sec"><div class="dt-sec__h"><i>01</i><b>连接</b><span class="ln"></span></div>
        <div class="dt-sec__body" style="font-size:11px;line-height:1.9;color:var(--text-2)">
          <div>宿主快照：<b style="color:${nat ? 'var(--gold-hi)' : 'var(--blood,#E0687A)'}">${nat ? '已收到' : '未收到'}</b>
            　消息 <b>${nat ? (nat.messages || []).length : 0}</b> 条
            　状态块 <b>${nat ? (nat.messages || []).filter(m => /\[(?:rex-)?status\]|<(?:rex-)?status|"turn"\s*:\s*\d/.test(String(m.raw || m.text || ''))).length : 0}</b> 条
            　轮次 <b>${WORLD.turn || 0}</b>${WORLD.stale ? `　<span style="color:#FF9C9C">未更新 ${WORLD.stale} 轮</span>` : ''}</div>
          <div>挂载壳 <code>MMD_SL_*</code>：<b>${shell ? Math.round(shell.getBoundingClientRect().height) + 'px' : '无'}</b>
            　装载徽标：<b>${badge ? '在' : '已撤'}</b></div>
          <div>当前地点：<b>${esc(WORLD.region + ' › ' + WORLD.spot)}</b>　幕：<b>${WORLD.chapter}</b></div>
        </div></section>

      <section class="dt-sec"><div class="dt-sec__h"><i>02</i><b>面板</b><span class="ln"></span></div>
        <div class="dt-sec__body">${panelKeys.length
          ? panelKeys.map(k => row(k, ok(acts[k].open), acts[k].open ? 'open' : '关', '')).join('')
          : `<p style="color:var(--text-4);font-size:11px">还没有拿到 actions 快照——说明宿主没连上，或页面里没有这些原生面板。</p>`}</div></section>

      <section class="dt-sec"><div class="dt-sec__h"><i>03</i><b>动作（${actKeys.length}）</b><span class="ln"></span></div>
        <div class="dt-sec__body">${actKeys.length
          ? row('动作 / 面板', '状态', '原因 / revision') + actKeys.map(k => row(k, ok(caps[k] && caps[k].available), (caps[k] && caps[k].reason) || '')).join('')
          : `<p style="color:var(--text-4);font-size:11px">没有能力表。</p>`}</div></section>`;
  }

  function detailHtml() {
    if (state.nav === 'cast') return charDetailHtml(curChar());
    if (state.nav === 'system') return sysDetailHtml();
    if (state.nav === 'world') return worldDetailHtml();
    if (state.nav === 'chron') return chronDetailHtml();
    if (state.nav === 'bond') return bondDetailHtml();
    if (state.nav === 'map') return mapPanelHtml();
    if (state.nav === 'term') {
      if (state.termView === 'summary') return summaryPanelHtml();
      if (state.termView === 'diag') return diagPanelHtml();
      const nat = snapshot?.native || {};
      const caps = nat.capabilities || {};
      const capsOn = Object.keys(caps).filter(k => caps[k] && caps[k].available).length;
      const msgs = (nat.messages || []).length;
      return `<div class="dt-hero"><div class="dt-hero__orb">终</div>
        <div class="dt-hero__txt"><h1>终端</h1><div class="sub">原生动作 · 会话 · 人设 · 指令</div></div></div>
        <section class="dt-sec"><div class="dt-sec__h"><i>01</i><b>连接</b><span class="ln"></span></div>
          <dl class="kv"><dt>状态</dt><dd>${nat.connected ? '已连接' : '未连接'}</dd>
          <dt>原生动作</dt><dd>${capsOn} / ${Object.keys(caps).length} 可用</dd>
          <dt>已读消息</dt><dd>${msgs} 条</dd></dl></section>`;
    }
    if (state.nav === 'look') return lookDetailHtml();
    return `<div class="dt-hero"><div class="dt-hero__orb">·</div><div class="dt-hero__txt"><h1>${state.nav}</h1><div class="sub">待接入</div></div></div>`;
  }

  function syncMapFull(){
    const on = !!(state.nav === 'map' && MS.full && window.innerWidth >= 1280);
    document.body.classList.toggle('map-full', on);
    if (!on) MS.full = false;
  }

  function paint() {
    hideItemTip();
    if (!$('railCrest').childElementCount) $('railCrest').innerHTML = CREST;
    $('worldbar').innerHTML = worldbarHtml();
    $('railList').innerHTML = railHtml();
    const meta = NAV_META[state.nav] || ['',''];
    $('briefTitle').textContent = meta[0]; $('briefCnt').textContent = meta[1];
    $('briefBody').innerHTML = briefHtml();
    $('detail').innerHTML = detailHtml();
    syncMapFull();
    if (state.nav === 'map') mapBindStage();
    paintMobile();
  }

  /* ============================================================
     手机端 · 底部导航 + 上滑信息栏
     ============================================================ */
  const MORE_ICON = '<circle cx="5.4" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.6" cy="12" r="1.6"/>';

  function moreGridHtml(){
    return `<div class="mgrid2">${NAVS.filter(n => PRIMARY_NAV.indexOf(n.id) < 0).map(n =>
      `<button class="mgrid2__i" data-mnav="${n.id}">
        <svg viewBox="0 0 24 24">${n.icon}</svg><b>${n.label}</b></button>`).join('')}
      <button class="mgrid2__i mgrid2__i--cover" data-cover="1">
        <svg viewBox="0 0 24 24">${COVER_SVG}</svg><b>${COVER_LABEL}</b></button>
      <button class="mgrid2__i mgrid2__i--exit" data-exitmmd="1">
        <svg viewBox="0 0 24 24">${EXIT_SVG}</svg><b>${EXIT_LABEL}</b></button>
      <button class="mgrid2__i mgrid2__i--detail" data-backdetail="1">
        <svg viewBox="0 0 24 24">${DETAIL_SVG}</svg><b>返回详情页</b></button></div>`;
  }

  function paintMobile(){
    const mph = $('mph'); if (!mph) return;
    const meta = NAV_META[state.nav] || ['更多','MORE'];
    const onMore = PRIMARY_NAV.indexOf(state.nav) < 0;
    $('mphNav').innerHTML = PRIMARY_NAV.map(id => {
      const n = NAVS.find(x => x.id === id);
      return `<button class="mnav ${state.nav === id ? 'on' : ''}" data-mnav="${id}">
        <svg viewBox="0 0 24 24">${n.icon}</svg><span>${n.label}</span></button>`;
    }).join('') + `<button class="mnav ${onMore ? 'on' : ''}" data-mnav="__more">
        <svg viewBox="0 0 24 24">${MORE_ICON}</svg><span>更多</span></button>`;

    $('mphTitle').textContent = meta[0];
    $('mphCx').textContent = MOB.lv === 'detail' ? '全部' : meta[1];
    const noBrief = state.nav === 'world' || state.nav === 'system' || state.nav === 'chron';
    $('mphBack').style.visibility = (MOB.lv === 'detail' && !noBrief) ? 'visible' : 'hidden';

    const body = $('mphBody');
    const key = [state.nav, MOB.lv,
      MOB.lv === 'detail' ? (state.cast + state.cTab + state.cSoul + state.sysEdit + state.termView) : state.termView,
      state.castSort, state.castPage, CHRON.list.length, state.chronOpen,
      SYS.bag.length, SYS.shop.length, SYS.form, SYS.name, SYS.say, SYS.look, SYS.trait,
      /* 收藏态是原生快照里的，不算进 key 的话点完收藏手机端不会重绘 —— 星标一直不变 */
      snapshot?.native?.actions?.navigation?.favorite ? 'fav1' : 'fav0',
      (snapshot?.native?.messages || []).length,
      (state.shopPick || []).join(','),
      MS.view, MS.sel, MS.labels, MS.zoom, MS.lock, state.author].join('|');
    if (body.dataset.key !== key) {
      /* 同一层同一分区只是数据变了（比如点了一件商品）：保持滚动位置，
         不要把人弹回顶部 —— 货架的选择框就在最下面。 */
      const keepTop = body.scrollTop;
      const sameView = body.getAttribute('data-pane') === state.nav && body.dataset.lv === MOB.lv;
      body.dataset.key = key;
      body.dataset.lv = MOB.lv;
      body.innerHTML = MOB.lv === 'detail' ? detailHtml()
        : state.nav === 'more' ? moreGridHtml()
        : state.nav === 'map' ? mapEntryHtml()
        : briefHtml();
      body.setAttribute('data-pane', state.nav);   /* 不能用 data-nav：会被左栏导航的 [data-nav] 代理截走 */
      /* 手机端：简要栏补一个进入详情页的入口，和右栏对齐 */
      if (MOB.lv === 'brief' && ['system','world','chron','bond','look'].includes(state.nav)) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'mph__more';
        more.setAttribute('data-sheetmore', '1');
        more.innerHTML = '查看全部信息 <i>›</i>';
        body.append(more);
      }
      body.scrollTop = sameView ? keepTop : 0;
    }
    mph.dataset.lv = MOB.lv;

    /* 人物：基础 / 武魂 停靠到底栏上方 */
    const dock = $('mphDock');
    if (dock) {
      dock.innerHTML = '';
      const tabs = MOB.lv === 'detail' ? body.querySelector('.ctabs') : null;
      if (tabs) { dock.append(tabs); dock.classList.add('has'); }
      else dock.classList.remove('has');
    }

    if (!MOB.holdClose) mph.dataset.open = MOB.open ? '1' : '0';

    const wb = $('worldbar');
    if (wb) mph.style.setProperty('--wb-h', Math.round(wb.getBoundingClientRect().height) + 'px');
    if (state.nav === 'map' && MOB.open && MOB.lv === 'detail') mapBindStage();
  }

  /* 世界地图 = 地图页的「全部」那一层，不再另开全屏 */
  function openMapPage(view){
    MS.view = view || 'world';
    MS.sel = null; MS.zoom = 1; MS.px = 0; MS.py = 0; MS.full = false;
    state.nav = 'map';
    MOB.open = true; MOB.lv = 'detail';
    paint();
  }
  /* 出发：把「我出发前往 区域·地点」追加进输入框（保留已经写好的内容） */
  function goTravel(name){
    if (!name) return;
    const reg = MS.view !== 'world' ? ((REGION_SVG[MS.view] || {}).n || '') : (WORLD.region || '');
    const line = '我出发前往' + (reg ? reg + '·' : '') + name;
    toComposer(line);
    MS.sel = null;
    paint();
    say('已追加到输入框：' + line);
  }
  function openSheet(lv){
    const mph = $('mph');
    MOB.lv = lv || 'brief';
    MOB.open = true;
    if (mph && mph.dataset.open !== '1') {
      MOB.holdClose = true;       // 先把内容摆好，下一帧再滑出
      paint();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        MOB.holdClose = false;
        mph.dataset.open = '1';
      }));
    } else paint();
  }
  function closeSheet(){
    const mph = $('mph');
    MOB.open = false;
    if (mph) mph.dataset.open = '0';   // 只收起，不重建内容
    clearTimeout(closeSheet._t);
    closeSheet._t = setTimeout(() => { if (!MOB.open) { MOB.lv = 'brief'; } }, 420);
  }
  function sheetBack(){ MOB.lv = 'brief'; paint(); }

  /* 下拉收起 */
  (function sheetDrag(){
    const mph = document.getElementById('mph');
    const panel = document.getElementById('mphPanel');
    const bar = document.querySelector('.mph__bar');
    if (!mph || !panel || !bar) return;
    let y0 = 0, dy = 0, on = false;
    const set = v => panel.style.transform = v ? `translateY(${v}px)` : '';
    bar.addEventListener('pointerdown', e => {
      if (!MOB.open || e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('button')) return;   /* 按钮自己处理 click */
      on = true; y0 = e.clientY; dy = 0;
      panel.style.transition = 'none';
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', e => {
      if (!on) return;
      dy = Math.max(0, e.clientY - y0);
      set(dy);
    });
    const end = e => {
      if (!on) return; on = false;
      panel.style.transition = '';
      const far = dy > 90;
      set(0);
      if (far) closeSheet();
      dy = 0;
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  })();

  /* ============================================================
     事件
     ============================================================ */
  /* ============================================================
     全息人体 · 悬浮 / 轻触 提示
     ============================================================ */
  let pinKey = null;

  function charOfEl(el){
    return curChar();
  }
  function tipHtmlFor(el){
    const st = el.closest('[data-bstage]');
    const c = charOfEl(el);
    if (!c) return '';
    if (el.dataset.ring !== undefined) {
      const wi = parseInt((el.closest('[data-wi]') || {}).dataset?.wi || '0', 10) || 0;
      const w = (c.wuhun || [])[wi];
      if (!w || !w.r) return '';
      const i = parseInt(el.dataset.ring, 10);
      if (!w.r[i]) return '';
      return ringTipHtml(c, w, i);
    }
    const id = el.dataset.bone;
    if (!id) return '';
    if (id.indexOf('outer') === 0) {
      const o = (c.outer || [])[parseInt(id.slice(5), 10)];
      if (!o) return '';
      return `<div class="btip__hd" style="--c:#FFC96A"><i class="bringbox"></i>
          <b>${esc(o.n)}</b><em>${esc(o.y)} 年</em></div>
        <div class="btip__src">外附魂骨</div><p>${esc(o.d || '')}</p>`;
    }
    const meta = BONE_PTS.find(p => p.id === id);
    return boneTipHtml((c.bones || {})[id], meta ? meta.label : '');
  }

  function placeTip(stage, html, cx, cy){
    const tip = stage.querySelector('[data-btip]');
    if (!tip) return;
    tip.innerHTML = html;
    tip.classList.add('on');
    const sr = stage.getBoundingClientRect();
    let x = cx - sr.left, y = cy - sr.top;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    x = Math.max(tw / 2 + 6, Math.min(sr.width - tw / 2 - 6, x));
    let top = y - th - 16;
    if (top < 6) top = y + 18;
    top = Math.max(6, Math.min(sr.height - th - 6, top));
    tip.style.left = x + 'px';
    tip.style.top = top + 'px';
  }
  function showTipFor(el, cx, cy){
    const stage = el.closest('[data-bstage]');
    if (!stage) return;
    const html = tipHtmlFor(el);
    if (!html) return;
    placeTip(stage, html, cx, cy);
    stage.querySelectorAll('.brg,.bgem,.bchip').forEach(n => n.classList.remove('hot','dim'));
    const key = el.dataset.ring !== undefined ? 'ring' : 'bone';
    stage.querySelectorAll('[data-' + key + ']').forEach(n => {
      if (n === el) n.classList.add('hot');
      else if (n.closest('[data-bstage]') === stage) n.classList.add('dim');
    });
  }
  function hideTip(stage){
    if (!stage) return;
    const tip = stage.querySelector('[data-btip]');
    if (tip) tip.classList.remove('on');
    stage.querySelectorAll('.hot,.dim').forEach(n => n.classList.remove('hot','dim'));
  }
  function keyOf(el){
    return (el.dataset.ring !== undefined ? 'r' + el.dataset.ring : 'b' + el.dataset.bone) +
      '|' + (el.closest('[data-wi]') ? el.closest('[data-wi]').dataset.wi : '');
  }
  function togglePin(stage, el, e){
    /* 不钉住：点一下只看当下，移开就收 */
    pinKey = null;
    showTipFor(el, e.clientX, e.clientY);
    clearTimeout(togglePin._t);
    togglePin._t = setTimeout(() => { if (!pinKey) hideTip(stage); }, 3200);
  }
  function focusRingRow(row){
    const stage = document.querySelector('[data-bstage]');
    if (!stage) return;
    const g = stage.querySelector(`.brg[data-ring="${row.dataset.ring}"]`);
    if (!g) return;
    const r = g.getBoundingClientRect();
    pinKey = null;
    showTipFor(g, r.left + r.width / 2, r.top + r.height / 2);
    clearTimeout(focusRingRow._t);
    focusRingRow._t = setTimeout(() => hideTip(stage), 3200);
  }

  let tipOpen = null;
  const hitOf = t => (t && t.closest ? t.closest('[data-bstage] [data-ring],[data-bstage] [data-bone]') : null);

  /* 悬停：用 pointermove 统一判定；离开环/骨（含扫到空白、气泡、别的分区）立刻收 */
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const cell = e.target.closest('.itmcell');
    if (cell) { if (ITIP !== cell.dataset.item) showItemTip(cell); }
    else if (!e.target.closest('.itmtip') && ITIP) hideItemTip();
    const el = hitOf(e.target);
    if (el) {
      if (el !== tipOpen) { tipOpen = el; showTipFor(el, e.clientX, e.clientY); }
      return;
    }
    if (tipOpen) {
      tipOpen = null;
      document.querySelectorAll('[data-bstage]').forEach(hideTip);
    }
  }, { passive: true });
  /* 触屏没有 hover：点到环/骨以外的地方立刻收 */
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    if (hitOf(e.target)) return;
    const any = document.querySelector('[data-bstage] .btip.on');
    if (!any && !tipOpen) return;
    tipOpen = null;
    document.querySelectorAll('[data-bstage]').forEach(hideTip);
  }, { passive: true });
  document.addEventListener('pointerleave', () => {
    if (!tipOpen) return;
    tipOpen = null;
    document.querySelectorAll('[data-bstage]').forEach(hideTip);
  });
  /* 滚动时也收，避免气泡留在原位 */
  document.addEventListener('scroll', () => {
    if (!tipOpen) return;
    tipOpen = null;
    document.querySelectorAll('[data-bstage]').forEach(hideTip);
  }, true);

  /* 手机信息栏：左右滑切换分区（世界 / 人物 / 系统 / 地图 / 终端） */
  function switchNav(dir){
    const ids = PRIMARY_NAV.slice();
    const i = ids.indexOf(state.nav);
    if (i < 0) return false;
    const next = ids[(i + dir + ids.length) % ids.length];
    state.nav = next; state.cTab = 'base'; state.cSoul = 'w0'; state.castPage = 0;
    const direct = next === 'world' || next === 'system';
    MOB.open = true; MOB.lv = direct ? 'detail' : 'brief';
    paint();
    return true;
  }
  (function bindSheetSwipe(){
    const panel = document.getElementById('mphPanel');
    if (!panel) return;
    let sx = 0, sy = 0, st = 0, tracking = false;
    panel.addEventListener('touchstart', e => {
      tracking = false;
      if (!MOB.open || e.touches.length !== 1) return;
      /* 从滑块 / 芯片 / 输入框上起手的不算滑动，免得手一抖把分区翻掉 */
      if (e.target.closest('input,textarea,select,.lkrange,[data-lk],[data-item],[data-cpage],[data-csort],.mgrid2,[data-ring],[data-bone],.lmap,[data-stage]')) return;
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY; st = Date.now(); tracking = true;
    }, { passive: true });
    panel.addEventListener('touchend', e => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Date.now() - st > 720) return;
      if (Math.abs(dx) < 52 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (!switchNav(dx < 0 ? 1 : -1)) return;
      const body = document.getElementById('mphBody');
      if (body) {
        body.classList.remove('sw-l', 'sw-r');
        void body.offsetWidth;
        body.classList.add(dx < 0 ? 'sw-l' : 'sw-r');
      }
    }, { passive: true });
  })();

  document.addEventListener('click', (e) => {
    // 点到别处，取消钉住  document.addEventListener('click', (e) => {
    // 点到别处，取消钉住
    if (pinKey && !e.target.closest('[data-ring],[data-bone]')) {
      pinKey = null;
      document.querySelectorAll('[data-bstage]').forEach(hideTip);
    }    // 阅读器（最高优先级，避免被其它分支截走）
    const rd = e.target.closest('[data-rd]');
    if (rd) {
      const a = rd.dataset.rd;
      if (a === 'prev')  { RD.mode !== 'scroll' ? gotoPage(RD.page - 1, true) : scrollStep(-1); }
      if (a === 'next')  { RD.mode !== 'scroll' ? gotoPage(RD.page + 1, true) : scrollStep(1); }
      if (a === 'top')    { RD.mode !== 'scroll' ? gotoPage(0, true) : $('thread').scrollTo({ top: 0, behavior: 'smooth' }); }
      if (a === 'bottom') { RD.mode !== 'scroll' ? gotoPage(totalPages() - 1, true) : scrollToEnd(); }
      if (a === 'refresh') { nativeAct('refreshConversation', '刷新', { message: '已刷新对话' }); }
      if (a === 'mode')  { toggleMode(); }
      if (a === 'find')  { const el = $('rdFind'); findInText(el ? el.value.trim() : ''); }
      return;
    }
    // 手机端信息栏
    const mn = e.target.closest('[data-mnav]');
    if (mn) {
      const id = mn.dataset.mnav;
      // 再次点已打开的分区 → 收回信息栏（同一按钮即开关）
      // 「更多」的 state.nav 是 'more'，和按钮上的 __more 不是同一个值，得单独判
      if (id === '__more') {
        if (MOB.open && state.nav === 'more') { closeSheet(); return; }
        state.nav = 'more'; MOB.open = true; MOB.lv = 'brief'; paint(); return;
      }
      if (MOB.open && state.nav === id) { closeSheet(); return; }
      /* 世界 / 系统 / 编年没有「简要」这一层，直接展开全部信息 */
      const direct = id === 'world' || id === 'system' || id === 'chron';
      state.nav = id; state.cTab = 'base'; state.cSoul = 'w0';
      MOB.open = true; MOB.lv = direct ? 'detail' : 'brief';
      paint();
      return;
    }
    if (e.target.closest('#mphClose') || e.target.closest('#mphScrim')) { closeSheet(); return; }
    if (e.target.closest('#mphBack')) { sheetBack(); return; }

    // 人物：置顶 / 排序 / 翻页
    const pinBtn = e.target.closest('[data-pin]');
    if (pinBtn) {
      const id = pinBtn.dataset.pin, i = state.pins.indexOf(id);
      if (i >= 0) state.pins.splice(i, 1); else state.pins.push(id);
      savePrefs(); paint(); return;
    }
    const so = e.target.closest('[data-csort]');
    if (so) { state.castSort = so.dataset.csort; state.castPage = 0; paint(); return; }
    const pg = e.target.closest('[data-cpage]');
    if (pg) { state.castPage = Math.max(0, state.castPage + (+pg.dataset.cpage)); paint(); return; }

    // 物品格子：仓库点开详情；货架点一下加入/取消选择，同时给出介绍气泡
    const itemHit = e.target.closest('[data-item]');
    if (itemHit) {
      const [ikind, iidx] = String(itemHit.dataset.item || '').split(':');
      showItemTip(itemHit);
      if (ikind === 'shop') { const it = SYS.shop[+iidx]; if (it) togglePick(it.n, true, itemHit); }
      return;
    }
    const unpick = e.target.closest('[data-unpick]');
    if (unpick) { togglePick(unpick.dataset.unpick); return; }
    if (e.target.closest('[data-shopok]')) {
      const text = sysPickText();
      if (!text) return;
      copyText(text, '订购语已复制：' + text);
      return;
    }
    if (!e.target.closest('.itmtip')) hideItemTip();

    // 系统：换形象 / 写称呼
    if (e.target.closest('[data-syscycle]')) {
      const order = SYS_FORMS.map(x => x[0]);
      SYS.form = order[(order.indexOf(SYS.form) + 1) % order.length];
      savePrefs(); paint(); return;
    }
    const sf = e.target.closest('[data-sysform]');
    if (sf) { SYS.form = sf.dataset.sysform; savePrefs(); paint(); return; }
    if (e.target.closest('[data-syssay]')) {
      const inp = $('sysSay');
      const v = (inp && inp.value.trim()) || SYS.name || '系统';
      const line = `系统的称呼与形象更改为「${v}」`;
      toComposer(line);
      say('已写入输入框，发送后由 AI 更新系统设定。');
      return;
    }
    const chr = e.target.closest('[data-chron]');
    if (chr) {
      const i = +chr.dataset.chron;
      state.chronOpen = i;
      if (MOB.open) MOB.lv = 'detail';
      paint();
      requestAnimationFrame(() => {
        const card = document.querySelector('.chrart[data-chroncard="' + i + '"]');
        if (card) card.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      return;
    }

    // 人物 · 双页签
    const ct = e.target.closest('[data-ctab]');
    if (ct) { state.cTab = ct.dataset.ctab; paint(); return; }
    const cs = e.target.closest('[data-csoul]');
    if (cs) { state.cSoul = cs.dataset.csoul; paint(); return; }
    // 光环 / 魂骨（点击=钉住提示）
    const bhit = e.target.closest('[data-ring],[data-bone]');
    if (bhit) {
      const st = bhit.closest('[data-bstage]');
      if (st) { togglePin(st, bhit, e); return; }
      const row = bhit.closest('.rrow');
      if (row) { focusRingRow(bhit); return; }
      return;
    }
    if (e.target.closest('[data-outer-add]')) {
      say('外附魂骨需在剧情中获得：先吸收同源魂兽的魂环，再融合外附骨。');
      return;
    }

    // 外观
    const lk = e.target.closest('[data-lk]');
    if (lk) {
      const [k, v] = lk.dataset.lk.split(':');
      state.look[k] = (k === 'scale' || k === 'lh') ? parseFloat(v) : v;
      applyLook(); paint(); return;
    }
    // 终端：面板类 / 直接原生动作
    const ft = e.target.closest('[data-feat]');
    if (ft) {
      const f = FEATURES.find(x => x.id === ft.dataset.feat);
      if (!f) return;
      if (state.assistBusy) { say('正在生成回答，稍候…'); return; }
      const need = FEATURE_CAP[f.id];
      const caps = snapshot?.native?.capabilities || {};
      if (need && caps[need] && caps[need].available === false) {
        /* 不拦：仍试一次（可能能从「更多」菜单进），失败会在右栏写出原因 */
        say('当前页面可能没有「' + f.label + '」这个入口，正在尝试…');
      }
      if (f.kind === 'panel') {
        if (!featureUI) { say('本地预览未连接 MMD：原生面板要在平台内打开。'); return; }
        if (state.termPanel === f.id) { featureUI.closePanel(); return; }   /* 再点一次收起 */
        featureUI.showPanel(f.panel || f.id);
        return;
      }
      if (f.tap) {
        /* 帮忙回答要花能量，先确认一次；生成期间整页按钮都锁住 */
        if (f.id === 'assist') {
          if (state.assistBusy) { say('正在生成建议，稍候…'); return; }
          askConfirm('让 AI 帮忙写一句？', '会消耗约 10⚡，生成后先显示在输入框上方，你挑了才会用。', runAssist);
          return;
        }
        tapNative(f.tap, f.label); return;
      }
      if (f.local) {
        state.termView = f.local;
        if (MOB.open) MOB.lv = 'detail';
        paint();
      } else if (f.reveal === 'roleEdit') revealRoleEdit();
      else if (f.reveal === 'resetChat') askConfirm('重置这段聊天？',
        '平台会清空当前会话的聊天记录，从开场白重新开始；已写下的前情与存档不会自动备份。这一步不可撤销。',
        () => openViaMoreMenu('resetChat', '重置聊天', { confirmed: true }));
      else if (f.reveal) revealAct(f.act, f.label);
      else nativeAct(f.act, f.label, f.id === 'refresh' ? { message: '已刷新对话' } : null);
      return;
    }
    if (e.target.closest('[data-chronrefresh]')) {
      CHRON.hydrated = false;
      const n = hydrateChron(snapshot && snapshot.native, true);
      paint(); say(n ? ('已重建前情 · ' + n + ' 段') : '没有读到新的状态块');
      return;
    }
    if (e.target.closest('[data-chroncopy]')) { copyText(summaryText()); return; }
    if (e.target.closest('[data-diagrefresh]')) { call('snapshot').catch(() => {}); paint(); return; }
    if (e.target.closest('[data-sheetmore]')) {
      if (MOB.open && MOB.lv === 'brief') { MOB.lv = 'detail'; paint(); }
      return;
    }
    if (e.target.closest('[data-termhome]')) {
      state.termView = 'home';
      if (MOB.open) MOB.lv = 'brief';
      paint();
      return;
    }
    /* 返回封面：把封面层重新打开（捏人进度保留在 S 里） */
    if (e.target.closest('[data-cover]')) {
      featureUI?.closePanel?.();
      try { window.__cvCtl && window.__cvCtl.reopen(); } catch (_) {}
      say('已返回封面');
      return;
    }
    /* 返回原生页（顶栏已移除，改由左栏导航触发）：只收 HUD，不点原生返回 */
    if (e.target.closest('[data-exitmmd]')) {
      featureUI?.closePanel?.();
      say('已返回原生页');
      call('ui.native').catch(() => say('本地预览里没有原生界面'));
      return;
    }
    /* 返回详情页：先点原生返回（角色卡详情），成功后再收 HUD */
    if (e.target.closest('[data-backdetail]')) {
      featureUI?.closePanel?.();
      nativeAct('exit', '返回详情页', { message: '已返回角色卡详情页' }).then(ok => {
        if (ok) setTimeout(() => { call('ui.native').catch(() => {}); }, 320);
      });
      return;
    }
    // 左栏导航
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      const id = nav.dataset.nav;
      featureUI?.closePanel?.();
      state.termPanel = '';
      state.termView = 'home';          /* 从任何分区点回终端 = 回终端首页 */
      state.nav = id;
      state.castPage = 0;
      paint();
      if (id === 'term') probeAuthor();
      return;
    }
    // 手机端地图入口：直接进全屏舆图
    const om = e.target.closest('[data-openmap]');
    if (om) { openMapPage('world'); return; }
    if (e.target.closest('[data-mapback]')) {
      MS.view = 'world'; MS.sel = null; MS.zoom = 1; MS.px = 0; MS.py = 0;
      paint(); return;
    }
    // 地图
    const fromNames = !!e.target.closest('.mname');
    const mret = mapHandleClick(e);
    if (mret === 'repaint') {
      paint();
      /* 从下方地名清单点选：把地图滚回视野，否则气泡在屏幕外 */
      if (fromNames) {
        const st = document.querySelector('#detail [data-stage], #mphBody [data-stage]');
        if (st) st.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return;
    }
    if (mret === 'zoom') { return; }
    if (mret === 'full') { paint(); return; }
    if (typeof mret === 'string' && mret.indexOf('go:') === 0) { goTravel(mret.slice(3)); return; }
    // 人物
    const hc = e.target.closest('[data-herecast]');
    if (hc) {
      state.cast = hc.dataset.herecast; state.nav = 'cast'; state.cTab = 'base'; state.cSoul = 'w0'; state.castPage = 0;
      if (MOB.open) MOB.lv = 'detail';
      paint(); return;
    }
    const cb = e.target.closest('[data-cast]');
    if (cb) {
      const fromBond = state.nav === 'bond';
      state.cast = cb.dataset.cast;
      if (fromBond) { state.nav = 'cast'; state.cTab = 'base'; state.cSoul = 'w0'; state.castPage = 0; }
      if (MOB.open) MOB.lv = 'detail';
      paint();
      return;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.target && e.target.id === 'rdFind' && e.key === 'Enter') {
      e.preventDefault(); findInText(e.target.value.trim()); return;
    }
    if (/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')) return;
    if (RD.mode !== 'flip') return;
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); gotoPage(RD.page - 1); }
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); gotoPage(RD.page + 1); }
    if (e.key === 'Home') { e.preventDefault(); gotoPage(0); }
    if (e.key === 'End') { e.preventDefault(); gotoPage(totalPages() - 1); }
  });

  /* ============================================================
     阅读器（流式 / 分页）
     ============================================================ */
  const RD = state.read;

  const RD_MODES = ['scroll', 'flip'];
  const RD_LABEL = { scroll: '流式', flip: '翻页' };
  const RD_ICON = {
    prev: '<path d="m6 14.2 6-6 6 6"/>',
    next: '<path d="m6 9.8 6 6 6-6"/>',
    top: '<path d="M5.4 5.4h13.2"/><path d="m6 13.4 6-6 6 6"/>',
    bottom: '<path d="M5.4 18.6h13.2"/><path d="m6 10.6 6 6 6-6"/>',
    refresh: '<path d="M19.6 12a7.6 7.6 0 1 1-2.3-5.4"/><path d="M19.8 4.6v4.2h-4.2"/>'
  };
  const railBtn = (act, label) =>
    `<button type="button" class="rdr__rbtn" data-rd="${act}" title="${label}" aria-label="${label}">
      <svg viewBox="0 0 24 24">${RD_ICON[act]}</svg></button>`;

  function totalPages() {
    return RD.mode === 'flip' ? Math.max(1, RD.total || 1) : RD.pages.length;
  }

  function readerHtml() {
    const total = totalPages();
    const p = total ? RD.page + 1 : 0;
    const pct = total ? p / total * 100 : 0;
    const flip = RD.mode === 'flip';
    return `<div class="rdr">
      <div class="rdr__nav">
        <div class="rdr__no"><b>${String(p).padStart(2,'0')}</b><i>/ ${String(total).padStart(2,'0')}</i></div>
      </div>
      <div class="rdr__tools">
        <div class="rdr__find">
          <input id="rdFind" placeholder="搜索页码" value="${esc(RD.kw)}" aria-label="搜索页码">
          <button data-rd="find" title="跳转 / 搜索">⌕</button>
        </div>
        <button data-rd="mode" class="rdr__mode ${flip ? 'on' : ''}" title="切换阅读模式">${RD_LABEL[RD.mode] || '流式'}</button>
        <button data-rd="refresh" class="rdr__refresh" title="刷新对话" aria-label="刷新对话">
          <svg viewBox="0 0 24 24">${RD_ICON.refresh}</svg></button>
      </div>
    </div>
    <div class="rdr__bar"><i style="width:${pct}%"></i></div>`;
  }

  /* 右侧竖排翻页：上下页 + 置顶 + 置底 */
  function paintRail() {
    const el = $('rdrRail'); if (!el) return;
    if (!el.childElementCount) {
      el.innerHTML = [railBtn('prev', '上一页'), railBtn('next', '下一页'),
        railBtn('top', '置顶'), railBtn('bottom', '置底')].join('');
    }
    const total = totalPages(), p = total ? RD.page + 1 : 0;
    const prev = el.querySelector('[data-rd="prev"]'), next = el.querySelector('[data-rd="next"]');
    if (prev) prev.disabled = RD.mode === 'flip' && p <= 1;
    if (next) next.disabled = RD.mode === 'flip' && p >= total;
    el.dataset.mode = RD.mode;
    /* 竖排栏贴住正文区：横屏/软键盘弹出时正文高度会变，写死 top/bottom 会压到输入区 */
    const th = $('thread'), core = el.parentElement;
    if (th && core) {
      const tr = th.getBoundingClientRect(), cr = core.getBoundingClientRect();
      el.style.top = Math.max(0, tr.top - cr.top) + 'px';
      el.style.height = tr.height + 'px';
    }
  }

  function paintReader() {
    const el = $('reader'); if (!el) return;
    if (!el.childElementCount) { el.innerHTML = readerHtml(); paintRail(); return; }
    const total = totalPages(), p = total ? RD.page + 1 : 0;
    const no = el.querySelector('.rdr__no b'); if (no) no.textContent = String(p).padStart(2, '0');
    const it = el.querySelector('.rdr__no i'); if (it) it.textContent = '/ ' + String(total).padStart(2, '0');
    const bar = el.querySelector('.rdr__bar i'); if (bar) bar.style.width = (total ? p / total * 100 : 0) + '%';
    const md = el.querySelector('[data-rd="mode"]');
    if (md) { md.textContent = RD_LABEL[RD.mode] || '流式'; md.classList.toggle('on', RD.mode === 'flip'); }
    paintRail();
  }

  /* 流式模式的锚点：一条 AI 叙述算一条（玩家的话不占页码） */
  function buildPages() {
    const box = $('messages'); if (!box) { RD.pages = []; return; }
    RD.pages = [...box.querySelectorAll('.message')].filter(m => !m.classList.contains('user')).map(m => [m]);
    if (RD.page > RD.pages.length - 1) RD.page = Math.max(0, RD.pages.length - 1);
  }

  /* ============================================================
     翻页：CSS 分栏排版
     正文按「一屏高、一页宽」自动分栏，超出部分流到下一栏 ——
     这就是小说阅读器那种「一页放不下就接到下一页」；
     上一段末尾还有空，下一段自然补在同一页，不靠 JS 切字。
     ============================================================ */
  const flipW = () => {
    const box = $('messages');
    return box ? Math.max(1, Math.round(box.clientWidth)) : 1;
  };
  function pageOf(el) {
    const box = $('messages');
    if (!box || !el) return 0;
    /* offsetLeft 是布局值，不受 translate 影响；多栏时它就是栏偏移 */
    const node = el.closest ? (el.closest('.message') || el) : el;
    if (node.offsetParent === box) return Math.max(0, Math.round(node.offsetLeft / flipW()));
    const w = flipW();
    const d = node.getBoundingClientRect().left - box.getBoundingClientRect().left;
    return Math.max(0, Math.round(d / w));
  }
  function messageAtPage(p) {
    const box = $('messages'); if (!box) return null;
    let hit = null;
    [...box.querySelectorAll('.message')].some(m => {
      if (pageOf(m) >= p) { hit = m; return true; }
      return false;
    });
    return hit;
  }
  function applyFlipColumns() {
    const box = $('messages'); if (!box) return;
    const w = flipW();
    box.style.columnWidth = w + 'px';
    box.style.columnGap = '0px';
    /* 分栏后的溢出宽度 = 总页数 × 页宽 */
    const sw = box.scrollWidth || w;
    RD.total = Math.max(1, Math.round(sw / w));
    if (RD.page > RD.total - 1) RD.page = RD.total - 1;
    if (RD.page < 0) RD.page = 0;
    moveFlip(false);
  }
  function moveFlip(animate) {
    const box = $('messages'); if (!box) return;
    const w = flipW();
    box.style.transform = 'translateX(' + (-RD.page * w) + 'px)';
    if (!animate) {
      box.classList.add('no-anim');
      void box.offsetWidth;
      box.classList.remove('no-anim');
    } else {
      const th = $('thread');
      if (th) {
        th.classList.add('turning');
        clearTimeout(moveFlip._t);
        moveFlip._t = setTimeout(() => th.classList.remove('turning'), 520);
      }
    }
    paintReader();
  }
  function gotoPage(i, animate) {
    if (RD.mode === 'flip') RD.flipTouched = true;
    const total = totalPages();
    if (!total) return;
    const next = Math.max(0, Math.min(total - 1, i));
    if (next === RD.page && animate !== false) { paintReader(); return; }
    RD.page = next;
    if (RD.mode === 'flip') moveFlip(animate !== false);
    else paintReader();
  }

  function scrollStep(dir) {
    const th = $('thread'); if (!th) return;
    th.scrollBy({ top: dir * th.clientHeight * 0.82, behavior: 'smooth' });
  }
  function scrollToEnd() {
    const th = $('thread'); if (!th) return;
    th.scrollTo({ top: th.scrollHeight, behavior: 'smooth' });
  }

  function applyFlipClasses() {
    const box = $('messages'), th = $('thread');
    const flip = RD.mode === 'flip';
    if (box) box.classList.toggle('is-flip', flip);
    if (th) { th.classList.toggle('is-flip', flip); if (!flip) th.classList.remove('turning'); }
    document.body.classList.toggle('read-page', flip);
    document.body.classList.toggle('read-flip', flip);
  }

  /* 在文本节点上取 1 个字符的 Range：量它在版面里的位置，比按页高换算准得多 */
  function textRange(node, offset, span){
    if (!node || !node.isConnected) return null;
    try {
      const txt = node.textContent || '';
      const len = txt.length;
      if (!len) return null;
      let a = Math.max(0, Math.min(offset, len));
      /* 页首 / 视口顶常常正好落在换行或空白上：往后挪到第一个实字，否则量出来是 0×0 */
      while (a < len && /\s/.test(txt.charAt(a))) a++;
      if (a >= len) { a = Math.max(0, len - 1); while (a > 0 && /\s/.test(txt.charAt(a))) a--; }
      const b = Math.min(len, a + (span || 4));
      const rg = document.createRange();
      rg.setStart(node, a); rg.setEnd(node, Math.max(a + 1, b));
      return rg;
    } catch (_) { return null; }
  }
  /* 视口左上角那一点落在哪个字上 */
  function caretPoint(){
    const th = $('thread'); if (!th) return null;
    const tr = th.getBoundingClientRect();
    try {
      const pos = document.caretRangeFromPoint(tr.left + 16, tr.top + 10);
      if (pos && pos.startContainer) return { node: pos.startContainer, offset: pos.startOffset };
    } catch (_) {}
    return null;
  }
  /* 流式：视口顶端那条消息 + 顶端那个字。
     注意要拿 #thread 的视口顶，不能拿 #messages 的 —— 后者是内容顶，
     滚下去之后它已经跑到屏幕上方，算出来永远是第一条，切过去就“被置顶”了。 */
  function scrollAnchor(){
    const box = $('messages'), th = $('thread');
    if (!box || !th) return null;
    const top = th.getBoundingClientRect().top + 8;
    let anchor = null;
    [...box.querySelectorAll('.message')].forEach(m => {
      if (m.getBoundingClientRect().top <= top) anchor = m;
    });
    const pt = caretPoint();
    return { el: anchor || box.querySelector('.message'), node: pt && pt.node, offset: pt && pt.offset };
  }
  /* 翻页：当前页第一行的那个字（长消息跨页时也能精确还原） */
  function flipAnchor(){
    const box = $('messages'), th = $('thread');
    if (!box || !th) return { el: messageAtPage(RD.page) };
    const pt = caretPoint();
    let msg = null;
    if (pt) {
      const el = pt.node.nodeType === 1 ? pt.node : pt.node.parentElement;
      msg = el && el.closest ? el.closest('.message') : null;
    }
    return { el: msg || messageAtPage(RD.page), node: pt && pt.node, offset: pt && pt.offset };
  }

  function setMode(mode) {
    const r = state.read;
    if (RD_MODES.indexOf(mode) < 0) mode = 'scroll';
    if (r.mode === mode) return;
    const box = $('messages'), th = $('thread');

    if (mode === 'flip') {
      const fromTop = th ? th.scrollTop : 0;
      const a = scrollAnchor();
      r.mode = 'flip'; r.page = 0;
      applyFlipClasses();
      requestAnimationFrame(() => {
        applyFlipColumns();
        let p = a && a.el ? pageOf(a.el) : 0;
        /* 按「顶端那个字」落在第几栏算页：一条长消息跨好几页时也准 */
        if (a && a.node) {
          const rg = textRange(a.node, a.offset, 4);
          const rr = rg && rg.getBoundingClientRect();
          const br = box && box.getBoundingClientRect();
          if (rr && br && rr.width > 0.5) p = Math.round((rr.left - br.left) / flipW());
        }
        /* 刚从翻页切过来的、中间没有滚动过：直接回原来那一页
           （末页很短时，滚到底也还原不到页首，按字算会差一页） */
        if (r.keepPage >= 0 && Math.abs(fromTop - r.keepScroll) <= 40) p = r.keepPage;
        r.page = Math.max(0, Math.min((RD.total || 1) - 1, p));
        /* 记住进来前的滚动位置：没翻页就切回去，原样还给他 */
        r.returnScroll = fromTop;
        r.returnPage = r.page;
        r.flipTouched = false;
        moveFlip(false);
        savePrefs();
      });
    } else {
      const a = flipAnchor();
      const wasPage = r.page;
      const back = (!r.flipTouched && r.returnScroll != null) ? r.returnScroll : null;
      r.mode = 'scroll';
      if (box) { box.style.transform = ''; box.style.columnWidth = ''; }
      applyFlipClasses();
      requestAnimationFrame(() => {
        let done = false;
        if (back != null && th) {
          th.scrollTo({ top: Math.max(0, back), behavior: 'auto' });
          done = true;
        }
        if (!done && a.node) {
          const rg = textRange(a.node, a.offset, 4);
          const rr = rg && rg.getBoundingClientRect();
          if (rr && th && (rr.top || rr.left)) {
            const target = th.scrollTop + (rr.top - th.getBoundingClientRect().top) - 8;
            th.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
            done = true;
          }
        }
        if (!done && th && a.el) {
          const base = a.el.getBoundingClientRect().top - th.getBoundingClientRect().top + th.scrollTop;
          th.scrollTo({ top: Math.max(0, base - 8), behavior: 'auto' });
        }
        if (th) { r.keepPage = wasPage; r.keepScroll = th.scrollTop; }
        savePrefs();
      });
      buildPages();
      paintReader();
    }
    window.__pgLog = 'mode=' + r.mode + ' pages=' + totalPages();
  }
  function cycleMode() {
    const i = RD_MODES.indexOf(RD.mode);
    setMode(RD_MODES[(i + 1) % RD_MODES.length]);
  }
  function toggleMode() { cycleMode(); }

  function findInText(kw) {
    if (!kw) { say('输入页码或要搜的字'); return; }
    if (/^\d+$/.test(kw)) {
      const n = parseInt(kw, 10);
      if (RD.mode !== 'flip') setMode('flip');
      const total = totalPages();
      if (n >= 1 && n <= total) { gotoPage(n - 1, false); say('第 ' + n + ' 页'); }
      else say('只有 ' + total + ' 页');
      return;
    }
    RD.kw = kw;
    const all = [...$('messages').querySelectorAll('.message')];
    if (!all.length) return;
    let idx = -1;
    for (let i = 0; i < all.length; i++) {
      const j = (RD.lastHit + 1 + i) % all.length;
      if ((all[j].textContent || '').includes(kw)) { idx = j; break; }
    }
    if (idx < 0) { say('没有找到「' + kw + '」'); return; }
    RD.lastHit = idx;
    if (RD.mode === 'flip') gotoPage(pageOf(all[idx]), true);
    else all[idx].scrollIntoView({ block: 'center', behavior: 'smooth' });
    all[idx].classList.add('hit');
    setTimeout(() => all[idx].classList.remove('hit'), 1900);
  }

  (function bindPageScroll(){
    const box = $('messages');
    if (!box) return;

    /* 滚轮：翻页态一滚就是一页，正文本身不上下滚 */
    let lockT = 0, lastY = 0;
    box.addEventListener('wheel', (e) => {
      if (RD.mode !== 'flip' || e.ctrlKey) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lockT < 380) return;
      if (lastY && Math.sign(e.deltaY) !== Math.sign(lastY) && now - lockT < 900) return;
      lockT = now; lastY = e.deltaY;
      gotoPage(RD.page + (e.deltaY > 0 ? 1 : -1), true);
    }, { passive: false });

    /* 触摸：横向滑 = 翻页；竖向不拦截（翻页态本来也没有纵向滚动） */
    let sx = 0, sy = 0, tracking = false;
    box.addEventListener('touchstart', (e) => {
      if (RD.mode !== 'flip' || e.touches.length !== 1) { tracking = false; return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
    }, { passive: true });
    box.addEventListener('touchend', (e) => {
      if (!tracking || RD.mode !== 'flip') return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 46 || Math.abs(dx) < Math.abs(dy)) return;
      gotoPage(RD.page + (dx < 0 ? 1 : -1), true);
    }, { passive: true });

    /* 点正文左侧回上一页、右侧下一页；中间不拦 */
    box.addEventListener('click', (e) => {
      if (RD.mode !== 'flip') return;
      if (e.target.closest('button, a, input, textarea, .sl-message-actions, .msg-opts')) return;
      const th = $('thread'), r = th && th.getBoundingClientRect();
      if (!r || !r.width) return;
      const x = e.clientX - r.left;
      if (x < r.width * 0.2) { gotoPage(RD.page - 1, true); return; }
      if (x > r.width * 0.8) gotoPage(RD.page + 1, true);
    });
  })();

  /* 流式态：页码跟着视线走（第几条叙述），别停在翻页时那一页 */
  (function bindScrollPage(){
    const th = $('thread'); if (!th) return;
    let t = 0;
    th.addEventListener('scroll', () => {
      if (RD.mode === 'flip') return;
      clearTimeout(t);
      t = setTimeout(() => {
        const box = $('messages'); if (!box) return;
        const nodes = [...box.querySelectorAll('.message:not(.user)')];
        if (!nodes.length) return;
        const top = th.getBoundingClientRect().top + 24;
        let idx = 0;
        nodes.forEach((m, i) => { if (m.getBoundingClientRect().top <= top) idx = i; });
        if (idx !== RD.page) { RD.page = Math.min(idx, RD.pages.length - 1); paintReader(); }
      }, 120);
    }, { passive: true });
  })();

  function refreshReader() {
    requestAnimationFrame(() => {
      applyFlipClasses();
      if (RD.mode === 'flip') { applyFlipColumns(); return; }
      buildPages(); paintReader();
    });
  }

  /* ============================================================
     背景
     ============================================================ */
  const bg = $('bg'), bx = bg.getContext('2d');
  let W=0,H=0,DPR=1,raf=0,last=0; const t0 = performance.now();
  const AURORA = [
    {x:.18,y:.14,rx:.62,ry:.46,c:[124,92,255],a:.30,ph:0,sp:.00013},
    {x:.82,y:.20,rx:.56,ry:.42,c:[217,179,106],a:.18,ph:1.6,sp:.00010},
    {x:.46,y:.92,rx:.68,ry:.40,c:[86,196,220],a:.15,ph:3.1,sp:.00008},
    {x:.70,y:.62,rx:.42,ry:.34,c:[226,86,110],a:.11,ph:4.4,sp:.00016}
  ];
  const STARS=[];
  function resize(){
    DPR=Math.min(2,window.devicePixelRatio||1); W=innerWidth; H=innerHeight;
    bg.width=Math.round(W*DPR); bg.height=Math.round(H*DPR); bg.style.width=W+'px'; bg.style.height=H+'px';
    bx.setTransform(DPR,0,0,DPR,0,0);
    STARS.length=0; const n=Math.round(Math.min(170,(W*H)/16000));
    for(let i=0;i<n;i++) STARS.push({x:Math.random(),y:Math.random(),r:Math.random()*1.1+.25,a:Math.random()*.5+.16,ph:Math.random()*6.28,sp:.0005+Math.random()*.0012});
  }
  function draw(now){
    const t=now-t0; bx.clearRect(0,0,W,H);
    const g=bx.createLinearGradient(0,0,W*.4,H);
    g.addColorStop(0,'#0B0618'); g.addColorStop(.45,'#080310'); g.addColorStop(1,'#05020B');
    bx.fillStyle=g; bx.fillRect(0,0,W,H);
    bx.globalCompositeOperation='lighter';
    for(const b of AURORA){
      const cx=(b.x+Math.sin(t*b.sp+b.ph)*.06)*W, cy=(b.y+Math.cos(t*b.sp*1.27+b.ph)*.05)*H;
      const rr=Math.max(b.rx*W,b.ry*H), pulse=.82+Math.sin(t*.0004+b.ph)*.18;
      const rg=bx.createRadialGradient(cx,cy,0,cx,cy,rr);
      rg.addColorStop(0,`rgba(${b.c[0]},${b.c[1]},${b.c[2]},${b.a*pulse})`);
      rg.addColorStop(.42,`rgba(${b.c[0]},${b.c[1]},${b.c[2]},${b.a*pulse*.32})`);
      rg.addColorStop(1,'rgba(0,0,0,0)');
      bx.fillStyle=rg; bx.save(); bx.translate(cx,cy); bx.scale(1,b.ry/b.rx); bx.translate(-cx,-cy);
      bx.beginPath(); bx.arc(cx,cy,rr,0,6.2832); bx.fill(); bx.restore();
    }
    for(const s of STARS){
      const tw=.55+.45*Math.sin(t*s.sp+s.ph);
      bx.globalAlpha=s.a*tw; bx.fillStyle='#DCD3F2';
      bx.beginPath(); bx.arc(s.x*W,s.y*H,s.r,0,6.2832); bx.fill();
    }
    bx.globalAlpha=1; bx.globalCompositeOperation='source-over';
  }
  function loop(now){ if(now-last>32){ draw(now); last=now; } raf=requestAnimationFrame(loop); }

  /* ============================================================
     宿主连接
     ============================================================ */
  async function render() {
    if (!snapshot) return;
    modelUI?.render(snapshot.native);
    featureUI?.render(snapshot.native, busy);
    $('send').disabled = busy || snapshot.native?.capabilities?.sendMessage?.available !== true;
    $('connection').textContent = snapshot.native.connected ? '已连接' : '连接中';
    parseStory(snapshot.native);
    paint();
    refreshReader();
  }
  /* 主动拉一次快照：宿主返回当前快照本体，不必等下一次推送。
     所有「动作 → 需要新数据」的路径都走它，避免界面停在等待态。 */
  async function pull() {
    if (!port && !devStub) return null;
    try {
      const fresh = await call('snapshot.now');
      const nat = fresh && fresh.native ? fresh.native : null;
      if (!nat) return null;
      snapshot = { ...(snapshot || {}), native: nat };
      await render();
      return nat;
    } catch (_) { return null; }
  }
  function connect(event) {
    const m = event.data;
    try { window.__CN__ = (window.__CN__ || 0) + 1;
      window.__CNL__ = { srcOk: event.source === window.parent, proto: m && m.protocol, type: m && m.type,
        ports: event.ports ? event.ports.length : -1, origin: String(event.origin), want: String(boot.parentOrigin) }; } catch (_) {}
    if (port || event.source !== window.parent || !m || m.protocol !== 'mmd-sl/1' ||
        m.type !== 'connect' || event.ports.length !== 1) return;
    if (boot.buildId && m.buildId !== boot.buildId) return;
    if (boot.nonce && m.nonce !== boot.nonce) return;
    /* 沙盒 iframe 的 event.origin 是 'null'，此时不比 origin；有值且对不上才拒绝 */
    if (boot.parentOrigin && event.origin && event.origin !== 'null' && event.origin !== boot.parentOrigin) return;
    if (!boot.buildId) { boot.buildId = m.buildId; boot.nonce = m.nonce; }
    port = event.ports[0]; window.removeEventListener('message', connect);
    port.onmessage = e => {
      const value = e.data;
      if (!value || value.protocol !== 'mmd-sl/1') return;
      if (value.type === 'snapshot') {
        if (contextId && contextId !== value.contextId) { resetStory(); rejectPending('会话已切换'); featureUI?.reset(); }
        contextId = value.contextId; snapshot = value.snapshot; render();
        if ($('notice').textContent.indexOf('等待宿主') >= 0) say(snapshot.localPreview ? '本地模拟已连接' : '已连接，原生功能可从终端打开');
      } else if (value.type === 'hud' && value.state === 'show') {
        /* 从原生页点「返回游戏」回来：导航页收起来，别把上一屏原样搬回来 */
        featureUI?.closePanel?.();
        if (MOB.open) closeSheet();
        paint();
      } else if (value.contextId === contextId && value.type === 'notice') say(value.text);
      else if (value.contextId === contextId && value.type === 'result') {
        const entry = pending.get(value.id); if (!entry) return;
        clearTimeout(entry.timer); pending.delete(value.id);
        value.ok ? entry.resolve(value.result) : entry.reject(new Error(value.error));
      }
    };
    port.start(); transmit({ type:'ready' });
  }
  const modelUI = globalThis.MmdSameLayerUIConfig?.modules?.models === false ? null : globalThis.MmdSameLayerModelUI?.mount({ call, pull, say });
  const featureUI = globalThis.MmdSameLayerFeatureUI?.mount({ call, act, pull, say, onChange: syncTermPanel });
  /* 面板开合 → 左栏条目高亮（kind 映射回 FEATURES 的 id） */
  function syncTermPanel(kind){
    const f = kind ? FEATURES.find(x => x.kind === 'panel' && (x.panel || x.id) === kind) : null;
    const id = f ? f.id : '';
    if (state.termPanel !== id) { state.termPanel = id; paint(); }
  }

  /* ============================================================
     输入框工具条：清空 / 复制 / 粘贴 / 剪贴板历史（本次打开有效）
     ============================================================ */
  const CLIP = { list: [], open: false };
  function cmpInsert(txt){
    const t = $('text'); if (!t) return;
    const a = t.selectionStart == null ? t.value.length : t.selectionStart;
    const b = t.selectionEnd == null ? a : t.selectionEnd;
    t.value = t.value.slice(0, a) + txt + t.value.slice(b);
    t.selectionStart = t.selectionEnd = a + txt.length;
    t.focus();
  }
  function pushClip(txt){
    const v = String(txt || '').trim(); if (!v) return;
    CLIP.list = CLIP.list.filter(x => x.text !== v);
    CLIP.list.unshift({ text: v, at: Date.now() });
    if (CLIP.list.length > 20) CLIP.list.length = 20;
    const n = $('clipCount'); if (n) n.textContent = CLIP.list.length ? String(CLIP.list.length) : '';
    renderClipPop();
  }
  function renderClipPop(){
    const pop = $('clipPop'); if (!pop) return;
    if (!CLIP.list.length) { pop.innerHTML = '<p class="clip-pop__none">这次打开还没抓到粘贴内容。</p>'; return; }
    pop.innerHTML = CLIP.list.map((x, i) => `<button class="clip-item" data-clip="${i}">
      <i>${String(i + 1).padStart(2, '0')}</i><span>${esc(x.text.slice(0, 80))}${x.text.length > 80 ? '…' : ''}</span>
      <em>${new Date(x.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</em></button>`).join('')
      + `<button class="clip-clear" data-clipclear="1">清空记录</button>`;
  }
  function toggleClip(force){
    const pop = $('clipPop'); if (!pop) return;
    CLIP.open = force == null ? !CLIP.open : !!force;
    pop.hidden = !CLIP.open;
    if (CLIP.open) renderClipPop();
  }
  /* 工具条反馈统一走底部浮动提示，不在按钮行右侧插字 */
  const cmpTip = txt => say(txt);

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-cmp]');
    if (b) {
      const act = b.dataset.cmp, t = $('text');
      if (act === 'clear') { t.value = ''; t.focus(); cmpTip('已清空'); }
      if (act === 'copy') {
        const v = t.value;
        if (!v) { cmpTip('没有可复制的内容'); return; }
        const done = () => cmpTip('已复制到剪贴板');
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(v).then(done).catch(() => { t.select(); document.execCommand('copy'); done(); });
        else { t.select(); document.execCommand('copy'); done(); }
      }
      if (act === 'paste') {
        const insert = txt => { if (txt) { cmpInsert(txt); pushClip(txt); cmpTip('已粘贴'); } else cmpTip('剪贴板是空的'); };
        if (navigator.clipboard?.readText) navigator.clipboard.readText().then(insert).catch(() => cmpTip('系统不允许直接读剪贴板，请长按输入框粘贴'));
        else cmpTip('请长按输入框粘贴');
      }
      if (act === 'clip') { toggleClip(); }
      return;
    }
    const clipItem = e.target.closest('[data-clip]');
    if (clipItem) {
      const i = +clipItem.dataset.clip;
      if (CLIP.list[i]) { cmpInsert(CLIP.list[i].text); cmpTip('已插入'); toggleClip(false); }
      return;
    }
    if (e.target.closest('[data-clipclear]')) { CLIP.list = []; renderClipPop(); const n = $('clipCount'); if (n) n.textContent = ''; return; }
    if (CLIP.open && !e.target.closest('#clipPop') && !e.target.closest('[data-cmp="clip"]')) toggleClip(false);
  });
  $('text')?.addEventListener('input', growComposer);
  growComposer();
  $('text')?.addEventListener('focus', growComposer);
  $('cmpExpand')?.addEventListener('click', openCmpFull);
  $('cmpFullClose')?.addEventListener('click', () => closeCmpFull(true));
  $('cmpFullText')?.addEventListener('input', cmpCount);
  $('cmpFullSend')?.addEventListener('click', () => {
    const ta = $('cmpFullText'), src = $('text');
    if (ta && src) { src.value = ta.value; src.dispatchEvent(new Event('input', { bubbles: true })); }
    closeCmpFull(false);
    $('send').click();
  });
  $('text')?.addEventListener('paste', e => {
    const txt = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    if (txt) pushClip(txt);
    setTimeout(() => { const n = $('clipCount'); if (n) n.textContent = CLIP.list.length ? String(CLIP.list.length) : ''; }, 0);
  });

  window.addEventListener('message', connect);
  $('send').onclick = () => act(async () => {
    const text = $('text').value.trim(); if (!text) return;
    try { await call('native.invoke', { action:'sendMessage', payload:{ text } }); }
    catch (error) { await call('snapshot').catch(()=>{}); throw error; }
    $('text').value=''; growComposer(); say('已提交发送，正在等待 MMD 更新。');
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('cmpFull') && !$('cmpFull').hidden) { closeCmpFull(true); return; }
    if (e.key === 'Escape' && MS.sel) { MS.sel = null; paint(); }
  });
  $('text').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('send').click(); }
  });
  $('confirm-ok').onclick = () => { const task = confirmTask; confirmTask = null; closeDlg($('confirm')); task && task(); };
  $('confirm-cancel').onclick = () => { confirmTask = null; closeDlg($('confirm')); };
  $('confirm').addEventListener('cancel', () => { confirmTask = null; });

  window.addEventListener('pagehide', () => {
    disposed = true; featureUI?.dispose(); modelUI?.dispose(); rejectPending('页面已关闭'); port?.close();
    cancelAnimationFrame(raf); window.removeEventListener('message', connect);
  }, { once:true });

  // 本地开发：无宿主时塞两条示例消息，便于看排版
  function seedDemo(){
    if (location.hash.indexOf('devboot') < 0) return;
    const box = $('messages'); if (!box || box.childElementCount) return;
    const demo = [
      ['assistant','叙述 / 01','黑暗。温热的液体包裹着你，声音被隔绝在外，只剩心跳——两个心跳。\n\n「……还有胞亲？」一道稚嫩却带着成年人分量的意识，直接落进你的脑海。'],
      ['user','你 / 02','（以意念回应）……我在。你也是双生？'],
      ['assistant','叙述 / 03','那片意识安静了一瞬，随即像被点亮一样涌过来，带着掩不住的欢喜。\n\n「我是千仞雪。……你叫什么？」'],
      ['user','你 / 04','（沉默片刻）……还没想好。等出去再告诉你。'],
      ['assistant','叙述 / 05','她笑了一下。那笑不是婴儿的，是一个成年人在极疲惫时，忽然被什么逗到的那种笑。\n\n「行。那我先叫你弟弟。」\n\n外面传来极轻的脚步声。有人停在石阶下，没有上来。'],
      ['user','你 / 06','（屏住呼吸，试着分辨来人的魂力）'],
      ['assistant','叙述 / 07','魂力很沉，像一块压在胸口的铁。不是千寻疾——这个人的气息更冷，且刻意收敛过。\n\n「圣女殿下。」那声音隔着石门传来，「教皇陛下三日内不会回城。」\n\n比比东没有应声。你听见她的呼吸停了一拍，然后重新变得很慢。'],
      ['user','你 / 08','（转向她所在的方向）'],
      ['assistant','叙述 / 09','她的手落在腹上。隔着肚皮，那点温度很清楚。\n\n「听见了？」她说，声音很轻，像在问自己，「他也在等。」']
    ];
    demo.forEach(([role,label,text])=>{
      const a=document.createElement('article'); a.className='message '+role;
      const r=document.createElement('div'); r.className='role'; r.textContent=label;
      const t=document.createElement('div'); t.className='sl-message-text'; TYPO.render(t, stripBlocks(text));
      const c=document.createElement('div'); c.className='sl-message-actions';
      ['复制','编辑','重新生成','回溯','删除'].forEach(k=>{const b=document.createElement('button');b.textContent=k;b.type='button';c.append(b);});
      a.append(r,t,c); box.append(a);
    });
    const last = demo[demo.length - 1][2];
    RAW.text = last;          /* 只当排版样本；字段一律不预置，等 __slDev.apply 或真实消息 */

    // 本地排版自检：加 &rings=N 给首个人物塞 N 道环（最多 9），用来看满配间距
    const rm = location.hash.match(/rings=(\d+)/);
    if (rm) {
      const w = (CAST[0].wuhun || [])[0];
      const SEQ = [['黄',400],['黄',760],['紫',1800],['紫',4200],['黑',12000],
        ['黑',26000],['黑',47000],['红',110000],['红',160000]];
      if (w) w.r = SEQ.slice(0, Math.min(9, +rm[1])).map((t, i) => ({
        c: t[0], y: t[1], n: '演示魂技 ' + (i + 1), d: '用于检查九环满配时的排布与间距。'
      }));
    }
    /* 本地调试钩子（仅 devboot 存在） */
    window.__slDev = {
      world: WORLD, cast: CAST, me: PLAYER_OBJ, sys: SYS, chron: CHRON, diff: DIFF, state, ui: featureUI,
      apply(text){ applyStateBlock(text); applyRexStatus(text); applyRexCast(text); applyBareCast(text); applyProfiles(text); trackDiff();
        /* 本地预览没有真实消息：按 apply 次数造一条，和生产侧的「一气泡一条」对齐 */
        const e = { d: WORLD.date, t: WORLD.time, c: WORLD.chapter, title: WORLD.title, sum: WORLD.summary,
          n: WORLD.turn || 0, place: [WORLD.region, WORLD.spot].filter(Boolean).join(' › '),
          mid: 'dev-' + (++devChronN) };
        if (e.sum || e.title) { CHRON.list.unshift(e); if (CHRON.list.length > 80) CHRON.list.length = 80; }
        paint(); },
      hydrate(msgs){ CHRON.hydrated = false; hydrateChron({ messages: msgs }); paint(); },
      /* 用一份假快照喂面板，验证右栏落点（不需要原生 DOM） */
      feature(nativeState){ featureUI?.render(nativeState, false); },
      models(nativeState){ modelUI?.render(nativeState); },
      reset(){ resetStory(); paint(); },
      /* 喂整份 nativeState：走真实快照路径，终端列表 / 顶栏都会跟着变 */
      native(nativeState){ snapshot = { ...(snapshot || {}), native: nativeState }; render(); },
      snap(){ return snapshot; },
      geo(){ return { regions: REGION_SVG, world: MK_WORLD, view: MS.view, sel: MS.sel }; },
      /* 本地模拟宿主：让「动作 → 状态变化 → 界面刷新」整条链可在浏览器里跑通 */
      stub(fn){ devStub = fn || null; }
    };
  }
  /* 捏人里选的「系统外形」只决定这里的头像形态，不写进 [creation] 文本（模型不需要知道它长什么样）。
     由 frame-creation 在「写进输入框」时回调，落成本地偏好，刷新后还在。 */
  window.__cvApplySysForm = function (form) {
    const f = String(form || '');
    if (!SYS_FORMS.some(x => x[0] === f) || SYS.form === f) return;
    SYS.form = f; savePrefs(); paint();
  };
  loadPrefs(); applySkin();
  (function initHash(){
    const h = location.hash || '';
    const m = h.match(/map=(\w+)/);
    if (m) { if (m[1] === 'world') MS.view = 'world'; else if (REGION_SVG[m[1]]) MS.view = m[1]; }
    const nm = h.match(/nav=(\w+)/);
    if (nm && (NAVS.some(n => n.id === nm[1]))) state.nav = nm[1];
    const cm = h.match(/cast=(\w+)/);
    if (cm && (cm[1] === 'me' || CAST.some(c => c.id === cm[1]))) state.cast = cm[1];
    const sl = h.match(/sel=(\w+)/);
    if (sl) MS.sel = sl[1];
    if (/maplock/.test(h)) MS.lock = true;
    if (/read=(page|flip)/.test(h)) state.read.mode = 'flip';
    if (/ctab=soul/.test(h)) state.cTab = 'soul';
    if (/cs=bone/.test(h)) { state.cTab = 'soul'; state.cSoul = 'bone'; }
    const cw = h.match(/cs=w(\d+)/);
    if (cw) { state.cTab = 'soul'; state.cSoul = 'w' + cw[1]; }
    if (/sheet/.test(h)) { MOB.open = true; MOB.lv = /detail/.test(h) ? 'detail' : 'brief'; }
  })();
  try { window.__FRAME_BOOTED__ = 1; } catch (_) {}
  seedDemo();
  paint(); resize(); refreshReader(); raf = requestAnimationFrame(loop);
  /* 正文区高度会随阅读条 / 输入框 / 横竖屏变化；竖排翻页栏跟着重排，别写死 */
  try {
    if (window.ResizeObserver) new ResizeObserver(() => paintRail()).observe($('thread'));
  } catch (_) {}
  let rzT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rzT);
    rzT = setTimeout(() => { paintMobile(); paintRail(); if (RD.mode === 'flip') applyFlipColumns(); }, 120);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(loop);
  });
})();
