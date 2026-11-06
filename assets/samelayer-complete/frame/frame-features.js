/* Frame-only composition: no parent DOM, native HTML, or unbounded action dispatch. */
(function (G) {
  'use strict';
  /* 正文里隐藏状态 / 档案块，只留叙述。
     先把方括号协议与带属性的尖括号折成裸尖括号，再整段删掉——
     只认 <status> 时，规则改写出来的带属性写法会漏网，整段 JSON 露在正文里。 */
  /* 每条消息自己的回复选项：从它自带的状态块里读 opt，不共用全局那一份 */
  const optsOf = m => {
    const src = String((m && (m.raw || m.text)) || '');
    if (!src) return [];
    const norm = src
      .replace(/\[(\/?)(?:rex-)?(status|cast)\]/g, (x, sl, n) => '<' + sl + n + '>')
      .replace(/<\/(?:rex-)?(status|cast)\s*>/g, '</$1>')
      .replace(/<(?:rex-)?(status|cast)[^>]*>/g, '<$1>');
    const hit = norm.match(/<status>([\s\S]*?)<\/status>/);
    if (!hit) return [];
    const body = hit[1].trim();
    let obj = null;
    try { obj = JSON.parse(body); } catch (_) {}
    if (!obj) {
      const raw = body.match(/"opt"\s*:\s*\[([\s\S]*?)\]/);
      if (!raw) return [];
      return raw[1].split(',').map(x => x.replace(/^\s*"|"\s*$/g, '').replace(/\\"/g, '"').trim())
        .filter(Boolean).slice(0, 4);
    }
    return Array.isArray(obj.opt) ? obj.opt.map(String).filter(Boolean).slice(0, 4) : [];
  };

  const stripBlocks = t => String(t || '')
    .replace(/\[(\/?)(?:rex-)?(status|cast)\]/g, (m, s, n) => '<' + s + n + '>')
    .replace(/<\/(?:rex-)?(status|cast)\s*>/g, '</$1>')
    .replace(/<(?:rex-)?(status|cast)[^>]*>/g, '<$1>')
    .replace(/<status>[\s\S]*?<\/status>/g, '')
    .replace(/<cast>[\s\S]*?<\/cast>/g, '')
    /* 生成中：块还没闭合。开标签到结尾整段先藏起来，
       否则流式输出时半截 JSON 会挤在正文末尾 —— 看着就是「一坨」。 */
    .replace(/<status>[\s\S]*$/g, '')
    .replace(/<cast>[\s\S]*$/g, '')
    /* 连标签都只写了一半："[sta" / "<stat" / "[rex-st" */
    .replace(/\n?[\[<][a-zA-Z-]{0,12}$/, '')
    .replace(/[ \t]+$/, '')
    .replace(/^\s*\{(?=[^\n]*"loc"\s*:)[^\n]*\}\s*$/gm, '')
    .replace(/\[状态\][\s\S]*?(?=\n\s*\n|$)/g, '')
    .replace(/\[档案[:：][^\]\n]*\][\s\S]*?\[\/档案\]/g, '')
    .replace(/\n{3,}/g, '\n\n').trim();
  function mount({ call, act, pull, say, onChange }) {
    const $ = id => document.getElementById(id), P = G.MmdSameLayerPanels;
    const enabled = key => G.MmdSameLayerUIConfig?.modules?.[key] !== false;
    /* 快捷栏（真站只有 6 项）里没有、只能从「更多」菜单进的入口 */
    const MORE_KIND = { supplementPanel: 'supplement', backgroundPanel: 'background',
      customInstructionsPanel: 'customInstructions', personaPanel: 'persona',
      chatSettings: 'chatSettings', conversationPanel: 'newChat' };
    const el = (tag, cls = '', text = '') => { const n = document.createElement(tag); n.className = cls; n.textContent = text; return n; };
    let state = null, busy = false, view = null, own = false, dead = false, confirmation = null, genderPick = '';
    const dialog = el('dialog', 'sl-feature-dialog'); dialog.id = 'features-dialog';
    const heading = el('h2'), info = el('p', 'muted'), body = el('div', 'sl-feature-body'), footer = el('div', 'actions');
    heading.id = 'features-title'; dialog.setAttribute('aria-labelledby', heading.id); info.id = 'features-notice'; info.setAttribute('role', 'status');
    const btn = (label, handler, id) => { const b = el('button', 'secondary', label); b.type = 'button'; if (id) b.id = id; b.onclick = handler; return b; };
    const native = () => { if (!busy) call('ui.native').catch(e => say(e.message)); };
    const close = btn('关闭', closePanel, 'features-close'), reload = btn('重新读取', () => {
      const read = () => execute(async () => { if (pull) await pull(); else await call('snapshot'); refreshView(false); });
      if (view?.dirty) confirm('重新读取并丢弃草稿？', '当前未提交的本地输入将替换为 MMD 中的内容。', read); else read();
    }, 'features-reload');
    const back = btn('在原生页操作', native, 'features-native');
    /* 头部：返回终端 + 标题 + 状态行，落点是右栏（手机端整页） */
    const head = el('div', 'sl-fw__head');
    const headBack = btn('‹ 终端', () => closePanel(), 'features-back');
    const headTxt = el('div', 'sl-fw__ttl'); headTxt.append(heading, info);
    head.append(headBack, headTxt);
    footer.append(reload, close, back); dialog.append(head, body, footer);
    const host = document.getElementById('featureHost') || document.getElementById('detail') || document.body; host.append(dialog);
    const question = el('dialog', 'sl-question'); question.id = 'features-confirm';
    const qTitle = el('h2'), qText = el('p', 'sl-confirm-text'), qInput = el('input'), qActions = el('div', 'actions');
    qTitle.id = 'features-confirm-title'; question.setAttribute('aria-labelledby', qTitle.id); qInput.id = 'features-answer'; qInput.maxLength = 200; qInput.setAttribute('aria-label', '会话备注');
    const yes = btn('确认', () => { const task = confirmation; confirmation = null; question.close(); task?.(qInput.value); }, 'features-confirm-yes');
    const no = btn('取消', () => { confirmation = null; question.close(); }, 'features-confirm-no');
    qActions.append(no, yes); question.append(qTitle, qText, qInput, qActions); document.body.append(question);
    question.addEventListener('cancel', () => { confirmation = null; });
    /* 多行编辑弹窗：指令内容这类长文本用它，confirm 的单行 input 装不下 */
    const editor = el('dialog', 'sl-question sl-editor'); editor.id = 'features-editor';
    const edTitle = el('h2'), edNote = el('p', 'sl-confirm-text'), edArea = el('textarea'), edActions = el('div', 'actions');
    const edNameWrap = el('label', 'sl-field sl-editor__name'), edName = el('input');
    edName.type = 'text'; edName.id = 'features-editor-name'; edName.maxLength = 30;
    edNameWrap.append(el('span', '', '指令名称'), edName);
    edTitle.id = 'features-editor-title'; editor.setAttribute('aria-labelledby', edTitle.id);
    edArea.id = 'features-editor-text'; edArea.rows = 7; edArea.maxLength = 8000;
    const edOk = btn('保存', () => {
      const task = confirmation; confirmation = null;
      const withName = !edNameWrap.hidden;
      editor.close(); task?.(edArea.value, withName ? edName.value : undefined);
    }, 'features-editor-ok');
    const edNo = btn('取消', () => { confirmation = null; editor.close(); }, 'features-editor-no');
    edActions.append(edNo, edOk);
    editor.append(edTitle, edNote, edNameWrap, edArea, edActions); document.body.append(editor);
    editor.addEventListener('cancel', () => { confirmation = null; });
    /* opts.name：给了就多显示一个「名称」输入框（保存时一起交回） */
    function edit(title, note, initial, fn, opts = {}) {
      if (question.open || editor.open) return;
      edTitle.textContent = title; edNote.textContent = note || '';
      const withName = typeof opts.name === 'string';
      edNameWrap.hidden = !withName;
      edName.value = withName ? opts.name : '';
      edArea.value = initial || ''; confirmation = fn; editor.showModal();
      (withName ? edName : edArea).focus();
    }
    function confirm(title, text, fn, initial) {
      /* 确认框是玩家交互，不能被「正在提交」吞掉：关闭路径要靠它收尾 */
      if (question.open) return;
      qTitle.textContent = title; qText.textContent = text; qInput.hidden = initial === undefined; qInput.value = initial || '';
      confirmation = fn; question.showModal(); (initial === undefined ? no : qInput).focus();
    }
    function prompt(title, initial, fn) { confirm(title, '只修改会话列表中的备注。', fn, initial); }
    function closeLocal() { dialog.removeAttribute('open'); document.body.classList.remove('feature-open'); view = null; genderPick = ''; reload.hidden = false; back.hidden = false; syncBrief(); onChange?.(''); }
    /* 原生面板的出口：没关闭按钮的那几个（会话记录 / 更换背景）走遮罩 */
    const CLOSERS = [
      ['moreMenu', 'closeMoreMenu'], ['conversationPanel', 'closeConversationPanel'],
      ['backgroundPanel', 'closeBackgroundPanel'], ['customInstructionsPanel', 'closeCustomInstructions'],
      ['personaPanel', 'closePersona'], ['supplementPanel', 'closeSupplement'],
      ['chatSettings', 'closeChatSettings'], ['sharePanel', 'closeSharePanel'],
      ['imageGen', 'closeImageGen']
    ];
    /* 动作收尾：把原生留在页面上的窗口逐个关掉。
       没有残留时零开销，不额外拉快照。 */
    async function settle(keepKind) {
      if (!state) return;
      const keep = keepKind ? P.definitions[keepKind]?.[1] : '';
      const list = CLOSERS.filter(([key]) => key !== keep && state?.actions?.[key]?.open === true);
      if (!list.length) return;
      for (const [key, action] of list) {
        const row = state?.actions?.[key];
        if (!row?.open || !row.revision) continue;
        try { await call('native.invoke', { action, payload: { revision: row.revision } }); }
        catch (_) {
          /* revision 过期就重取一次，仍然关不掉就放弃，绝不无限重试 */
          const fresh = await pull?.();
          const again = fresh?.actions?.[key];
          if (again?.open) {
            try { await call('native.invoke', { action, payload: { revision: again.revision } }); } catch (_) {}
          }
        }
      }
      await pull?.();
    }
    /* 关闭：本地立即收起（点就得有反应），原生面板在后台逐个关掉。
       关闭动作本身不能等任何一次往返 —— 一旦某个 await 卡住，窗口就永远留着了。 */
    function closePanel() {
      if (!view) { closeLocal(); settle('').catch(() => {}); return; }
      const kind = view.kind, dirty = view.dirty;
      const live = state?.actions?.[P.definitions[kind][1]];
      const closeAction = P.definitions[kind][3];
      const shut = () => {
        closeLocal();
        const jobs = [];
        if (state && live && live.revision) {
          if (kind === 'supplement' && live.picker?.open) {
            jobs.push(call('native.invoke', { action: 'cancelSupplementPosition', payload: { revision: live.revision } }));
          }
          if (live.open && closeAction) {
            jobs.push(call('native.invoke', { action: closeAction, payload: { revision: live.revision } }));
          }
        }
        Promise.allSettled(jobs).then(() => settle('')).catch(() => {});
      };
      if (dirty) confirm('关闭并放弃本地草稿？', '已经同步到 MMD 的内容由原生页面处理。', shut); else shut();
    }
    dialog.addEventListener('cancel', e => { e.preventDefault(); closePanel(); });
    /* 原生动作只负责执行与回报；不转述、不编造结果说明 */
    function invoke(action, payload = {}) {
      return call('native.invoke', { action, payload });
    }
    function execute(fn) {
      if (busy || dead) return;
      own = true; busy = true; updateControls();
      return act(async () => {
        try { await fn(); }
        catch (e) { if (pull) await pull(); info.textContent = e.message; throw e; }
        finally {
          own = false; busy = false;
          /* 关键：动作结束后一定要重新放行。以前只在面板开着时才刷，
             消息上的「编辑 / 删除」会一直停在禁用态，直到下一次宿主推送——看起来就是点不动。 */
          updateControls();
        }
      });
    }
    function run(action, payload = {}, after) {
      const kind = view?.kind;
      return execute(async () => {
        /* 用宿主当前 revision：界面显示的可能刚被一次外部刷新推旧了 */
        const live = state?.actions?.[P.definitions[kind]?.[1]];
        const full = live?.revision ? { ...payload, revision: live.revision } : payload;
        const result = await invoke(action, full);
        after?.(result);
        if (pull) await pull();
        await settle(view ? kind : '');
        if (view) refreshView(true);
      });
    }
    /* 通用原生落点：背景项、自定义指令这类没有现成动作的面板用 */
    function tap(payload, after) {
      const kind = view?.kind;
      return execute(async () => {
        await call('native.invoke', { action: 'tapNative', payload });
        after?.();
        if (pull) await pull();
        await settle(view ? kind : '');
        if (view) refreshView(false);
      });
    }
    function fill(payload) {
      return execute(async () => {
        await call('native.invoke', { action: 'fillNative', payload });
        if (pull) await pull();
      });
    }
    /* 一次提交里连做几步：每步都用最新 revision，避免上一步把视图推到旧版本 */
    function chain(steps, after) {
      if (!view) return;
      const kind = view?.kind;
      return execute(async () => {
        for (const step of steps) {
          const live = state?.actions?.[P.definitions[view.kind][1]];
          if (!live) throw Error('原生面板已关闭，请重新打开。');
          const extra = typeof step.payload === 'function' ? step.payload(live) : (step.payload || {});
          const result = await call('native.invoke', { action: step.action, payload: { revision: live.revision, ...extra } });
          if (result?.data?.phase === 'confirmation-required') throw Error('这项操作需要确认，请到原生页完成。');
          /* 每步之后都刷新一次快照，下一步才能拿到最新 revision */
          if (pull) await pull();
        }
        after?.();
        await settle(view ? kind : '');
        if (view) refreshView(false);
      });
    }
    function refreshView(keepDraft) {
      if (!view || view.error) return;
      if (!state) {              // 本地预览：没有宿主快照
        heading.textContent = P.definitions[view.kind][0];
        info.textContent = '本地预览未连接 MMD：原生面板只在平台内可用，这里演示的是它的落点与尺寸。';
        body.replaceChildren();
        return;
      }
      const data = state?.actions?.[P.definitions[view.kind][1]];
      if (!data || data.open !== true) {
        if (view.pending) return;          // 原生面板还在开，保持加载态
        if (!view.data) return;
        closeLocal(); return;
      }
      view.pending = false;
      view.data = structuredClone(data); view.stale = false;
      if (!keepDraft) { view.drafts = {}; view.dirty = false; }
      draw();
    }
    /* pending=true 时先画窗口与加载态，不等原生往返 */
    function show(kind, pending) {
      if (!P.definitions[kind] || (kind !== 'edit' && !enabled(kind))) return;
      genderPick = ''; reload.hidden = false; back.hidden = false;
      const live = state?.actions?.[P.definitions[kind][1]];
      const ready = live?.open === true;
      view = { kind, drafts: {}, dirty: false, stale: false, data: ready ? structuredClone(live) : null,
        pending: pending === true && !ready };
      if (ready) draw();
      else {
        heading.textContent = P.definitions[kind][0];
        info.textContent = state ? '正在读取…' : '本地预览未连接 MMD';
        body.replaceChildren(el('p', 'sl-loading', state ? '正在打开原生面板…' : '原生面板只在平台内可用。'));
      }
      dialog.setAttribute('open', '');
      document.body.classList.add('feature-open');
      syncBrief();
      onChange?.(kind);
      updateControls();
    }
    /* 打不开就画出来，不要只留一句提示语 */
    function showError(kind, reason) {
      const d = P.definitions[kind];
      genderPick = '';
      view = { kind, drafts: {}, dirty: false, stale: false, data: null, error: String((reason && reason.message) || reason || '未知原因') };
      heading.textContent = d ? d[0] : '原生功能';
      info.textContent = '没有打开';
      body.replaceChildren();
      const box = el('section', 'sl-card');
      box.append(el('h3', '', '这个入口没能打开'), el('p', 'muted', view.error));
      body.append(box, el('p', 'sl-hint', '可能原因：当前页面没有这个原生面板，或它的 DOM 结构变了'));
      reload.hidden = true; back.hidden = true;   /* 底部工具条已在正文里重复，错误态收起 */
      const bar = el('div', 'actions');
      const goNative = btn('在原生页操作', native, 'features-error-native');
      const retry = btn('重新读取', () => { closeLocal(); open(kind); }, 'features-error-retry');
      bar.append(goNative, retry); body.append(bar);
      dialog.setAttribute('open', '');
      document.body.classList.add('feature-open');
      syncBrief();
      onChange?.(kind);
    }
    /* 打开：本地窗口立刻出现，原生面板在 HUD 底下开；数据回来后补画 */
    function open(kind, payload = {}) {
      if (!P.definitions[kind] || (kind !== 'edit' && !enabled(kind))) return;
      const panelKey = P.definitions[kind][1], openAction = P.definitions[kind][2];
      if (view && view.kind === kind && dialog.hasAttribute('open')) { closePanel(); return; }
      const live = state?.actions?.[panelKey];
      if (live?.open === true) {
        show(kind);
        if (pull) pull().then(() => { if (view?.kind === kind) refreshView(true); });
        return;
      }
      show(kind, true);
      if (!state) return;                      /* 本地预览：只展示版式 */
      const cap = state?.capabilities?.[openAction];
      /* 真站快捷栏只有 6 项（模型设置 / 对话设置 / 选择指令 / 总结剧情 / 新的聊天 / 用户人设），
         设定补充、更换背景、自定义指令、游玩教程只在「更多」菜单里 —— 快捷栏打不开就换路 */
      const moreKind = MORE_KIND[panelKey];
      /* 打开类动作会把刚打开的面板数据一起带回来 —— 拿到就画，不再为了「看一眼」多要一次全量快照 */
      const adopt = result => {
        const panel = result?.data?.panel;
        if (panel && state?.actions) state.actions[panelKey] = panel;
        return !!panel;
      };
      const task = (cap && cap.available === false && moreKind)
        ? openViaMore(panelKey, moreKind).then(adopt)
        : call('native.invoke', { action: openAction, payload }).then(adopt);
      return task
        .then(() => {
          if (!view || view.kind !== kind) return;
          if (state?.actions?.[panelKey]?.open === true) {
            refreshView(false);
            /* 能力表在后台对齐，不挡界面 */
            if (pull) pull().then(() => { if (view?.kind === kind) refreshView(false); }).catch(() => {});
          } else showError(kind, '原生动作返回了，但页面里没有出现对应的面板');
        })
        .catch(e => { if (view && view.kind === kind) showError(kind, e); });
    }
    /* 走「更多」菜单开面板：开菜单 → 点条目 → 拉快照 */
    async function openViaMore(panelKey, moreKind) {
      if (state?.actions?.moreMenu?.open !== true) {
        await call('native.invoke', { action: 'openMoreMenu', payload: {} });
        if (pull) await pull();
      }
      const mm = state?.actions?.moreMenu;
      const row = (mm?.items || []).find(i => i.kind === moreKind);
      if (!row) throw Error('「更多」菜单里没有这一项，请先在原生页确认');
      return call('native.invoke', { action: 'activateMoreMenuItem', payload: { revision: mm.revision, itemId: row.id } });
    }
    function openResult(kind) {
      const match = { newChat: 'conversations', persona: 'persona', supplement: 'supplement' }[kind];
      if (match && enabled(match)) open(match);
      else { closeLocal(); call('ui.native').catch(e => say(e.message)); }
    }
    function button(label, action, handler, disabled = false) {
      const b = btn(label, handler); if (action) b.dataset.slAction = action;
      b.dataset.fixedDisabled = String(disabled); return b;
    }
    function draw() {
      if (!view) return;
      /* 重绘要保住滚动位置：生图段落可能几十条，点一条就跳回顶部没法用 */
      const keepTop = body.scrollTop;
      const current = view, s = current.data; heading.textContent = P.definitions[current.kind][0]; body.replaceChildren();
      const field = (key, label, initial, limit, disabled, multiline) => {
        const wrapper = el('label', 'sl-field'), input = el(multiline ? 'textarea' : 'input');
        if (!multiline) input.type = 'text';
        /* 长消息默认给够高度：编辑一条三千字的回复时，四行框没法用 */
        else input.rows = Math.min(18, Math.max(6, Math.ceil(String(initial || '').length / 36)));
        input.id = 'feature-field-' + key; input.value = current.drafts[key] ?? initial ?? ''; input.maxLength = limit > 0 ? limit : 100000;
        input.dataset.fixedDisabled = String(disabled); input.oninput = () => { current.drafts[key] = input.value; current.dirty = true; };
        wrapper.append(el('span', '', label), input); return wrapper;
      };
      P.render(current.kind, { data: s, el, button, field, add: (...nodes) => body.append(...nodes), run, chain, tap, fill, execute, pull, invoke,
        draft: (key, fallback) => current.drafts[key] ?? fallback, dirty: () => current.dirty,
        resetDraft: () => { current.drafts = {}; current.dirty = false; genderPick = ''; },
        gender: () => genderPick, setGender: id => { genderPick = id; draw(); },
        confirm, prompt, edit, openResult, applyInstruction, peekInstruction,
        native: () => call('ui.native').catch(e => say(e.message)), closeLocal, say, nativeDraft: () => state?.actions?.composer?.text,
        removeConversation: payload => execute(async () => {
          /* 一次调用做完：HUD 已确认过，桥接层点原生删除图标并代点原生确认框 */
          await invoke('requestDeleteConversation', payload);
          if (pull) await pull();
          if (view) refreshView(false);
          say('会话已删除');
          await settle('conversations');
        })
      });
      updateControls();
      body.scrollTop = keepTop;
    }
    function updateControls() {
      for (const b of document.querySelectorAll('[data-sl-action]')) {
        const cap = state?.capabilities?.[b.dataset.slAction];
        b.disabled = busy || !cap?.available || b.dataset.fixedDisabled === 'true';
        b.title = cap?.available ? '' : cap?.reason || '当前桥接未提供这项功能';
      }
      for (const input of body.querySelectorAll('input,textarea')) input.disabled = busy || input.dataset.fixedDisabled === 'true';
      close.disabled = busy; reload.disabled = busy; back.disabled = busy;
      if (view?.pending) { if (!info.textContent.startsWith('正在')) info.textContent = '正在读取…'; }
      else if (view?.stale) info.textContent = 'MMD 刚有更新；提交时会自动使用最新版本。';
      else if (view) info.textContent = busy ? '正在提交…' : '';
    }
    const nav = $('feature-nav');
    for (const [key, d] of Object.entries(P.definitions)) {
      /* 生图面板要靠某条消息的 messageId 才能开，不放进常驻导航 */
      if (key === 'edit' || key === 'imageGen' || !enabled(key)) continue;
      const b = button(d[0], d[2], () => open(key)); b.id = 'feature-open-' + key; nav.append(b);
    }
    const navActions = [['刷新对话', 'refreshConversation'], ['收藏角色', 'toggleFavorite'], ['查看评论', 'openComments'], ['离开聊天', 'exit']];
    if (enabled('navigation')) for (const [label, action] of navActions) {
      const b = button(label, action, () => {
        const payload = action === 'toggleFavorite' ? { revision: state?.actions?.navigation?.revision } : {};
        execute(async () => { await invoke(action, payload); if (action === 'openComments' || action === 'exit') await call('ui.native'); });
      }); b.id = 'feature-' + action; nav.append(b);
    }
    nav.append(btn('返回封面', () => { try { window.__cvCtl && window.__cvCtl.reopen(); } catch (_) {} }, 'feature-cover'));
    nav.append(btn('返回原生页', native, 'feature-native'));
    $('menu-open').onclick = () => { const hidden = !nav.hidden; nav.hidden = hidden; $('menu-open').setAttribute('aria-expanded', String(!hidden)); };
    $('theme-toggle').onclick = () => { const light = document.documentElement.dataset.theme !== 'light'; document.documentElement.dataset.theme = light ? 'light' : 'dark'; $('theme-toggle').textContent = light ? '深色' : '浅色'; };
    document.documentElement.dataset.theme = G.MmdSameLayerUIConfig?.theme === 'light' ? 'light' : 'dark';
    $('theme-toggle').textContent = document.documentElement.dataset.theme === 'light' ? '深色' : '浅色';
    /* 输入同步：把这里的文字写进 MMD 原生输入框（不发送）。
       不在打字路径上阻塞——停顿 900ms 才推一次，且只在原生草稿为空或本就是我们写的时候才自动推。 */
    const box = $('text');
    /* 「同步」按钮已按作者要求删掉：草稿仍然静默镜像到原生输入框，只是不再占一个按钮 */
    let syncTimer = 0, syncedText = '', syncing = false;
    const markSync = () => {};
    const nativeDraft = () => state?.actions?.composer?.text;
    function pushDraft(force) {
      if (!state || syncing) return;
      const text = box.value;
      if (!force && text === syncedText) return;
      const draft = nativeDraft();
      if (!force && draft != null && draft.trim() !== '' && draft !== syncedText) { markSync('wait'); return; }
      const revision = state?.actions?.composer?.revision;
      if (!revision) { markSync('wait'); return; }
      syncing = true; markSync('busy');
      call('native.invoke', { action: 'setInputText', payload: { revision, text } })
        .then(() => { syncedText = text; markSync('on'); if (pull) pull(); })
        .catch(() => { markSync('wait'); })
        .finally(() => { syncing = false; });
    }
    box.addEventListener('input', () => {
      clearTimeout(syncTimer);
      if (!box.value.trim()) { markSync(syncedText ? 'wait' : 'on'); return; }
      syncTimer = setTimeout(() => pushDraft(false), 900);
    });
    /* ── 指令集：输入框上方的浮层，点一条「追加」而不是替换 ───────────── */
    const libBtn = $('library-open'), libPop = $('libPop');
    let libOpen = false;
    /* 指令集：原生「选择指令」的芯片就是自定义指令集。
       先读快照，读不到再按结构扫一遍（芯片层是 opacity 动画层，快照偶尔为空）。 */
    const nativeDoc = () => {
      try { return (window.parent && window.parent !== window) ? window.parent.document : null; } catch (_) { return null; }
    };
    function scanChips() {
      const d = nativeDoc();
      if (!d) return [];
      try {
        return [...d.querySelectorAll('.instruction-scroll .instruction-chip')]
          .map((el, i) => ({ label: (el.textContent || '').trim(), index: i }))
          .filter(x => x.label);
      } catch (_) { return []; }
    }
    /* 直接点原生的芯片（它就是一条指令），再把原生输入框里的内容读回来 */
    function tapChip(index) {
      const d = nativeDoc();
      if (!d) throw Error('读不到原生输入框');
      const el = [...d.querySelectorAll('.instruction-scroll .instruction-chip')][index];
      if (!el) throw Error('原生指令芯片不在了，收起后重新打开一次');
      const w = d.defaultView;
      for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        const E = t.startsWith('pointer') && w.PointerEvent ? w.PointerEvent : w.MouseEvent;
        el.dispatchEvent(new E(t, { bubbles: true, cancelable: true, composed: true, button: 0 }));
      }
    }
    function nativeComposerValue() {
      const d = nativeDoc();
      if (!d) return '';
      /* 可写的那个 textarea 尺寸是 0（折叠预览），不能按可见性挑 */
      const list = [...d.querySelectorAll('textarea')].filter(t => !t.readOnly && !t.disabled);
      const ta = list.find(t => t.closest('#chat-input-scope')) || list[list.length - 1];
      return ta ? ta.value : '';
    }
    const libRows = () => {
      /* 自定义指令那份带正文（桥接层从 Vue 读的），优先用它 —— 追加时不用点原生芯片 */
      const ci = state?.actions?.customInstructionsPanel?.instructions;
      if (Array.isArray(ci) && ci.length) return ci.map((x, i) => ({ id: x.id, label: x.label, index: i, content: x.content }));
      const ins = state?.actions?.instructionSelector?.instructions;
      if (Array.isArray(ins) && ins.length) return ins.map((x, i) => ({ id: x.id, label: x.label, index: i }));
      return scanChips();
    };
    function closeLib(keepNative) {
      if (!libOpen) return;
      libOpen = false; libBtn?.setAttribute('aria-expanded', 'false'); if (libPop) libPop.hidden = true;
      if (keepNative) return;
      const ins = state?.actions?.instructionSelector;
      if (ins?.open && ins.revision) {
        call('native.invoke', { action: 'closePromptSelector', payload: { revision: ins.revision } }).catch(() => {});
      }
    }
    function paintLib() {
      if (!libPop) return;
      const rows = libRows();
      libPop.replaceChildren();
      const hd = el('div', 'lib-pop__hd');
      hd.append(el('b', '', '指令集'), el('i', '', rows.length ? rows.length + ' 条 · 点一条追加' : ''));
      libPop.append(hd);
      if (!rows.length) {
        libPop.append(el('p', 'lib-pop__empty', state ? '当前没有可用指令。' : '尚未连接 MMD。'));
        return;
      }
      const grid = el('div', 'lib-pop__grid');
      for (const row of rows) {
        const b = el('button', 'lib-chip', row.label);
        b.type = 'button'; b.title = row.label;
        b.onclick = () => applyChip(row);
        grid.append(b);
      }
      libPop.append(grid);
    }
    async function applyChip(row) {
      const box = $('text');
      if (!box || !state) return;
      libBtn.disabled = true;
      try {
        const head = box.value.trim();
        /* 正文已经在快照里：直接拼，不点原生芯片（原生是「替换」语义，混起来就会把别的指令带进来） */
        let add = String(row.content || '').trim();
        if (!add && nativeDoc()) {
          const before = nativeComposerValue();
          tapChip(row.index);
          await new Promise(r => setTimeout(r, 260));
          const got = String(nativeComposerValue() || '').trim();
          add = got.startsWith(before.trim()) ? got.slice(before.trim().length).trim() : got;
        }
        if (!add) throw Error('这条指令没有正文，或原生没有把它写进输入框');
        box.value = head ? head + '\n\n' + add : add;
        box.dispatchEvent(new Event('input', { bubbles: true }));
        const rev = state?.actions?.composer?.revision;
        if (rev) await call('native.invoke', { action: 'setInputText', payload: { revision: rev, text: box.value } }).catch(() => {});
        say('已追加：' + (row.label || '指令'));
        if (pull) await pull();
      } catch (e) { say((e && e.message) || '追加失败'); }
      finally { libBtn.disabled = false; }
    }
    /* 给终端面板用：点某条指令 → 追加到输入框；读某条指令 → 只取内容不改输入框 */
    async function applyInstruction(rowOrIndex, label) {
      /* 终端面板直接传整行（带 id / content），浮层传下标 */
      if (rowOrIndex && typeof rowOrIndex === 'object') return applyChip(rowOrIndex);
      const rows = libRows();
      const row = rows[rowOrIndex] || { index: rowOrIndex, label };
      await applyChip({ ...row, index: row.index != null ? row.index : rowOrIndex, label: row.label || label });
    }
    async function peekInstruction(index) {
      if (!nativeDoc()) throw Error('本地预览读不到原生输入框');
      const before = nativeComposerValue();
      tapChip(index);
      await new Promise(r => setTimeout(r, 220));
      const got = nativeComposerValue();
      /* 还原用户原来的草稿 */
      try {
        const d = nativeDoc();
        const ta = [...d.querySelectorAll('textarea')].filter(t => !t.readOnly && !t.disabled)[0];
        if (ta && ta.value !== before) {
          const set = Object.getOwnPropertyDescriptor(d.defaultView.HTMLTextAreaElement.prototype, 'value').set;
          set.call(ta, before);
          ta.dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
        }
      } catch (_) {}
      return got && got !== before ? got : '';
    }
    if (libBtn) libBtn.onclick = async () => {
      if (libOpen) { closeLib(); return; }
      libOpen = true; libBtn.setAttribute('aria-expanded', 'true'); libPop.hidden = false;
      paintLib();
      if (!libRows().length) { if (pull) await pull(); paintLib(); }
      if (!state?.actions?.instructionSelector?.open) {
        try { await call('native.invoke', { action: 'openPromptSelector', payload: {} }); } catch (_) {}
        if (pull) await pull();
        paintLib();
      }
    };
    document.addEventListener('pointerdown', e => {
      if (!libOpen) return;
      if (libPop?.contains(e.target) || libBtn?.contains(e.target)) return;
      closeLib();
    }, true);

    /* 往输入框追加一段正文：已有草稿就换行接在后面，不覆盖玩家正在写的东西。
       回复选项走这里；返回 false 表示这一段已经在草稿里，不重复堆。 */
    function appendToComposer(add) {
      const text = String(add == null ? '' : add).trim();
      if (!text) return false;
      const cur = box.value.replace(/\s+$/, '');
      /* 按空行切段比对：同一条已经写过就不再写第二遍 */
      if (cur && cur.split(/\n{2,}/).some(p => p.trim() === text)) { box.focus(); return false; }
      box.value = cur ? cur + '\n\n' + text : text;
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.focus();
      /* 光标落到末尾：接着写就是接在这一条后面 */
      try { box.setSelectionRange(box.value.length, box.value.length); } catch (_) {}
      /* 不等 900ms 防抖，立刻镜像到原生输入框；失败就让防抖再推一次 */
      const rev = state?.actions?.composer?.revision;
      if (rev) call('native.invoke', { action: 'setInputText', payload: { revision: rev, text: box.value } }).catch(() => {});
      return true;
    }

    markSync('on');
    const messageNodes = new Map();
    function messages() {
      const area = $('messages'), bottom = area.scrollHeight - area.scrollTop - area.clientHeight < 60, scroll = area.scrollTop;
      const rows = Array.isArray(state?.messages) ? state.messages : [], ids = new Set(rows.map(m => m.id));
      /* 叙述与玩家各编各的号：AI 一律 01、02…，不因为玩家插了一句就跳号 */
      const seq = { assistant: 0, user: 0 };
      rows.forEach(r => { if (r && (r.role === 'user' || r.role === 'assistant')) seq[r.role] += 1; });
      let ai = 0, you = 0;
      for (const [id, node] of messageNodes) if (!ids.has(id)) { node.remove(); messageNodes.delete(id); }
      rows.forEach((m, index) => {
        let box = messageNodes.get(m.id);
        if (!box) { box = el('article', 'message ' + (m.role === 'user' ? 'user' : 'assistant')); box.dataset.messageId = m.id;
          box.append(el('div', 'role'), el('div', 'sl-message-text'), el('div', 'sl-message-actions')); messageNodes.set(m.id, box); }
        const isUser = m.role === 'user';
        const label = (isUser ? '你' : '叙述') + ' / ' + String(isUser ? ++you : ++ai).padStart(2, '0');
        if (box.children[0].textContent !== label) box.children[0].textContent = label;
        const shown = stripBlocks(m.text);
        if (box.dataset.text !== shown) {
          box.dataset.text = shown;
          const T = globalThis.MmdSameLayerTypo;
          if (T) T.render(box.children[1], shown); else box.children[1].textContent = shown;
        }
        const signature = JSON.stringify([m.capabilities, state?.actions?.messages?.revision]);
        if (box.dataset.signature !== signature) {
          box.dataset.signature = signature; const controls = box.children[2]; controls.replaceChildren();
          /* 开头两条是卡片自带的开场：标题（第 1 条 AI）不摆按钮，第 2 条原生页也只给复制 */
          const head = isUser ? 99 : ai;
          /* 这块平台原生没有消息「编辑」（真站 .modify-btn 只有 重新生成 / 复制删除弹层 / 分享），
             不摆一个点了没反应的按钮。 */
          /* 原生操作条是三个图标：重新生成 / 编辑（铅笔）/ 分享（真站实测），
             编辑走 openEditMessage → 原生 .msg-modify-scope。用户消息同样有编辑。 */
          if (enabled('messageActions') && head !== 1) for (const [cap, action, label] of [
            ['copy', 'copyMessage', '复制'], ['edit', 'openEditMessage', '编辑'], ['regenerate', 'regenerateMessage', '重新生成'],
            ['imageGen', 'openImageGen', '生图'],
            ['rollback', 'rollbackMessage', '回溯'], ['startNewStory', 'startNewStoryFromMessage', '从此开启故事'], ['delete', 'deleteMessage', '删除']
          ]) {
            if (head === 2 && cap !== 'copy') continue;
            if (!m.capabilities?.[cap]) continue;
            const payload = { revision: state?.actions?.messages?.revision, messageId: m.id };
            controls.append(button(label, action, () => {
              if (action === 'openEditMessage') return open('edit', payload);
              /* 生图：原生弹层在 HUD 底下开，HUD 画自己的「选择生图段落」，
                 模式 / 段落 / 生成都写回原生弹层（平台计费与出图）。 */
              if (action === 'openImageGen') return open('imageGen', payload);
              const go = () => execute(async () => {
                await invoke(action, payload);
                if (pull) await pull();
                await settle('');
                if (action === 'startNewStoryFromMessage') say('已从此处开启新的故事');
              });
              if (['deleteMessage', 'rollbackMessage', 'startNewStoryFromMessage', 'regenerateMessage'].includes(action)) {
                const consequence = action === 'deleteMessage' ? '删除后无法恢复。' : action === 'rollbackMessage' ? '将删除这条消息之后的内容。' : action === 'regenerateMessage' ? '将请求 MMD 重新生成这条回复。' : '将以这条消息及之前的内容开启故事。';
                /* 对话框只放正文摘要：状态块不给人看，也不该挤满窗口 */
                const plain = stripBlocks(m.text).replace(/\s+/g, ' ').trim();
                const excerpt = plain.length > 80 ? plain.slice(0, 80) + '……' : plain;
                confirm(label + '？', '「' + (excerpt || '这条消息') + '」\n\n' + consequence, go);
              } else go();
            }));
          }
        }
        /* 回复选项：跟着这条气泡，一行一条，不再堆在输入框上方 */
        let optsBox = box.querySelector('.msg-opts');
        if (!optsBox) { optsBox = el('div', 'msg-opts'); box.append(optsBox); }
        const opts = isUser ? [] : optsOf(m);
        const optSig = JSON.stringify(opts);
        if (optsBox.dataset.sig !== optSig) {
          optsBox.dataset.sig = optSig;
          optsBox.replaceChildren(...opts.map(txt => {
            const b = el('button', 'msg-opt');
            b.type = 'button'; b.textContent = txt;
            b.onclick = () => {
              /* 追加进输入框，不替换：可以把两三条拼成一句再发，也不会冲掉已经写了一半的草稿 */
              say(appendToComposer(txt) ? '已添加到输入框，可改完再发送' : '这一条已经在输入框里了');
            };
            return b;
          }));
          optsBox.hidden = !opts.length;
        }
        if (area.children[index] !== box) area.insertBefore(box, area.children[index] || null);
      });
      area.scrollTop = bottom ? area.scrollHeight : scroll;
      /* 只计 AI 的冒泡：玩家自己发的不算「读到几条」（但照常显示，不隐藏） */
      $('message-count').textContent = String(seq.assistant).padStart(2, '0') + ' 条已读取';
    }
    /* revision 会因一次重读而换新，但内容没变；只有内容真的变了才算「外部改动」 */
    const sameData = (a, b) => {
      if (!a || !b) return false;
      const strip = o => { const c = { ...o }; delete c.revision; try { return JSON.stringify(c); } catch (_) { return ''; } };
      return strip(a) === strip(b);
    };
    function render(nativeState, isBusy) {
      state = nativeState; busy = isBusy;
      if (view) {
        const live = state?.actions?.[P.definitions[view.kind][1]];
        if (view.pending) { if (live?.open === true) refreshView(false); }
        /* 只有「面板仍开着且内容不同」才算外部改动。乱序到达的旧快照（open=false）
           会把刚打开的面板直接标成过期，整屏按钮跟着变灰。 */
        else if (live && !own && live.open === true && live.revision !== view.data?.revision && !sameData(live, view.data)) view.stale = true;
      }
      messages(); updateControls(); if (libOpen) paintLib();
      const favorite = $('feature-toggleFavorite');
      if (favorite) {
        const fav = state?.actions?.navigation?.favorite === true;
        favorite.textContent = fav ? '已收藏 · 取消收藏' : '收藏角色';
        favorite.setAttribute('aria-pressed', String(fav));
      }
      $('connection').textContent = state?.connected ? '已连接' : '正在连接';
      if (!syncing) {
        const draft = nativeDraft();
        if (!box.value || draft === box.value) markSync('on');
        else if (draft != null && draft.trim() !== '' && draft !== syncedText) markSync('wait');
      }
    }
    function reset() { confirmation = null; question.close(); editor.close(); closeLib(true); closeLocal(); clearTimeout(syncTimer); $('text').value = ''; messageNodes.clear(); $('messages').replaceChildren(); }
    function syncBrief() {
      const cur = view ? view.kind : '';
      document.querySelectorAll('[data-feat]').forEach(b => b.classList.toggle('on', b.dataset.feat === cur));
    }
    const closeWithNative = closePanel;
    return { render, reset, open, edit,
      showPanel(kind) { return open(kind); },
      /* 外部关闭：任何状态下都必须能关 —— 曾经 busy 时直接 return，玩家遇到动作卡住就再也关不掉 */
      closePanel() { if (dead) return; view ? closeWithNative() : closeLocal(); },
      syncBrief,
      currentPanel() { return view ? view.kind : ''; },
      dispose() { dead = true; reset(); dialog.remove(); question.remove(); editor.remove(); } };
  }
  G.MmdSameLayerFeatureUI = Object.freeze({ mount });
})(globalThis);
