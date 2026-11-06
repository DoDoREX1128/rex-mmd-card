# -*- coding: utf-8 -*-
"""对基座的源码补丁（本项目专用）。

`host.js` 的 pulse() 有两道硬闸，任一不成立就永远不挂载：
    if (!belongsHere(nextScope)) { if (shell) unmount(); return; }   ← 比的是完整 location.href
    if (!identity)              { if (shell) unmount(); return; }   ← identity = #msglistview 元素
现象正是「boot 返回了、注册了，但界面不出现」。

补丁：
  host.js   1) 锚点从完整 href 改成 origin+pathname（忽略 hash/query，单页路由常改这两个）
            2) 保留 owner 判断，无 owner 时只比 origin+pathname
  native.js 3) identity 退回 document.body，保证「有页面就能挂」
            4) root() 多认几个消息列表选择器，原生 id 变了也能取到消息
所有替换都带 assert，上游一改就报错，不会静默失效。
"""
import os

PATCHES = [
    ('host.js',
     "const originHref = G.location.href;",
     "const originHref = G.location.origin + G.location.pathname;"),

    ('host.js',
     "return owner ? !!value && value.accountKey === owner.accountKey && value.roleId === owner.roleId : G.location.href === originHref;",
     "if (owner) return !!value && value.accountKey === owner.accountKey && value.roleId === owner.roleId;\n      try { return G.location.origin + G.location.pathname === originHref; } catch (_) { return true; }"),

    ('native.js',
     "const root = () => document.querySelector('#msglistview');",
     "const root = () => document.querySelector('#msglistview') ||\n      document.querySelector('#msglist, .msglist, .msg-list, .message-list, .chat-msg-list, .chat-content .list');"),

    ('native.js',
     "scope: scopeReader(config), identity: root, start() {},",
     "scope: scopeReader(config), identity: () => root() || document.body, start() {},"),

    # root() 再退一步到 body：真站没有 #msglistview 时也能扫到消息
    ('native.js',
     "const root = () => document.querySelector('#msglistview') ||\n      document.querySelector('#msglist, .msglist, .msg-list, .message-list, .chat-msg-list, .chat-content .list');",
     "const root = () => document.querySelector('#msglistview') ||\n      document.querySelector('#msglist, .msglist, .msg-list, .message-list, .chat-msg-list, .chat-content .list') ||\n      document.body;"),

    # 消息条目：class 名变了也要认
    ('native.js',
     "const items = [...(list?.querySelectorAll('.item.Ai, .item.self') || [])];",
     "const items = messageItems(document, list);"),

    ('native.js',
     "const ai = el.classList.contains('Ai') && !el.classList.contains('self');",
     "const _cn = String(el.className || '').toLowerCase().split(' ').filter(Boolean); const ai = _cn.indexOf('self') < 0 && (_cn.indexOf('ai') >= 0 || !!el.querySelector('.content.left, [class*=\"content\"][class*=\"left\"]'));"),

    ('native.js',
     "text: (el.querySelector(ai ? '.content.left' : '.content.right')?.textContent || '').slice(0, 6000) };",
     "text: ((el.querySelector(ai ? '.content.left, [class*=\"content\"][class*=\"left\"]' : '.content.right, [class*=\"content\"][class*=\"right\"]') || el).textContent || '').slice(0, 6000) };"),

    # 沙盒缺 allow-same-origin：不透明源下 window.parent 比对 / localStorage 都可能失配
    ('host.js',
     "frame.title = config.title || '同层卡页面'; frame.setAttribute('sandbox', 'allow-scripts allow-downloads');",
     "frame.title = config.title || '同层卡页面'; frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-downloads');"),

    ('host.js',
     "    function receive(event) {\n      const m = event.data;",
     "    function receive(event) {\n      const m = event.data;\n      try { G.__MMD_SL_RECV__ = { n: ((G.__MMD_SL_RECV__ && G.__MMD_SL_RECV__.n) || 0) + 1, type: m && m.type, bid: m && m.buildId, wantBid: config.buildId, nonce: m && String(m.nonce), wantNonce: String(bootNonce), ok: !!(m && m.protocol === 'mmd-sl/1' && m.buildId === config.buildId && m.nonce === bootNonce) }; } catch (_) {}"),

    ('host.js',
     "    function publish() {\n      if (!ready) return;",
     "    function publish() {\n      try { G.__PUB__ = (G.__PUB__ || 0) + 1; } catch (_) {}\n      if (!ready) return;"),

    # about:blank 会先触发一次 load，connect 常发进空文档 → 改成反复重试直到帧回应
    ('host.js',
     """      frame.addEventListener('load', () => {
        if (generation !== controller || !frame) return;
        if (port) { unmount(); pulse(); return; }
        const channel = new MessageChannel(); port = channel.port1; port.onmessage = receive; port.start();
        frame.contentWindow.postMessage({ protocol: 'mmd-sl/1', type: 'connect', buildId: config.buildId, nonce: bootNonce }, '*', [channel.port2]);
      });""",
     """      let connectTries = 0;
      function tryConnect() {
        if (generation !== controller || !frame || ready || stopped || port) return;
        const channel = new MessageChannel();
        const p = channel.port1;
        let taken = false;
        p.onmessage = e => {
          if (taken || port) return;
          taken = true; port = p; port.onmessage = receive; receive(e);
        };
        p.start();
        try { frame.contentWindow.postMessage({ protocol: 'mmd-sl/1', type: 'connect', buildId: config.buildId, nonce: bootNonce }, '*', [channel.port2]); } catch (_) {}
        if (++connectTries < 25) setTimeout(tryConnect, 400);
      }
      frame.addEventListener('load', () => {
        if (generation !== controller || !frame) return;
        if (port) { unmount(); pulse(); return; }
        tryConnect();
      });"""),

    # 顶栏整体移除：返回 MMD 移进 Frame 左栏导航，关闭按钮删除
    ('host.js',
     """      const bar = document.createElement('div');
      bar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#173e41;color:#fff;font:14px sans-serif;';
      const title = document.createElement('span'); title.textContent = config.title || '同层卡';
      const back = document.createElement('button'); back.textContent = '返回 MMD';
      back.onclick = e => { e.stopPropagation(); hide(); };
      const close = document.createElement('button'); close.textContent = '关闭';
      close.onclick = e => { e.stopPropagation(); destroy(); };
      bar.append(title, back, close);""",
     "      /* 顶栏已移除：返回 MMD 在 Frame 左栏导航里，Frame 通过 ui.native 触发 hide() */"),

    ('host.js', "shell.append(bar, frame);", "shell.append(frame);"),

    # 外壳底色跟随卡片，避免首帧闪白
    ('host.js',
     "shell.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#faf6ed;white-space:normal;display:flex;flex-direction:column;';",
     "shell.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#06030C;white-space:normal;display:flex;flex-direction:column;';"),

    # 「返回游戏」浮标配色跟随卡片（顶栏已删，它成了原生面板唯一的回来入口）
    ('host.js',
     "returnButton.style.cssText = 'position:fixed;right:0;top:40%;z-index:2147483001;padding:12px 8px;border:0;border-radius:8px 0 0 8px;background:#173e41;color:white;';",
     "returnButton.style.cssText = 'position:fixed;right:0;top:40%;z-index:2147483001;padding:12px 9px;border:1px solid rgba(217,179,106,.45);border-right:0;border-radius:9px 0 0 9px;background:rgba(10,6,20,.94);color:#F6E3AE;font:12px/1.5 system-ui,sans-serif;letter-spacing:.08em;backdrop-filter:blur(10px);';"),

    # ── 真站实测补丁（2026-10-28，meimoai15 / roleId=114739）───────────────
    # A) 顶栏四个图标：uni-app 把图标画在 uni-image > div 的 background-image 上，
    #    里面的 <img> 是 opacity:0 的载荷节点，会被 visible() 过滤 → header() 恒 null
    #    → openComments / openSharePanel / toggleFavorite / refreshConversation 全部不可用。
    ('actions-dom.js',
     "const tokens = [text(button), button.getAttribute('aria-label') || '', button.getAttribute('title') || '', ...all(button, 'img').map(src)];",
     "const tokens = [text(button), button.getAttribute('aria-label') || '', button.getAttribute('title') || '',\n          ...[...button.querySelectorAll('img, uni-image > div, [style*=\"background-image\"]')]\n            .map(e => [src(e), e.getAttribute('style') || ''].join(' '))];"),

    # C) 「折叠预览」里的可写 textarea 尺寸为 0，enabled() 的可见性判断会把它判死 →
    #    setInputText / 「同步到 MMD 输入框」不可用。只对 #chat-input-scope 里的 textarea 放行。
    ('actions-dom.js',
     "const input = composer(); data.composer = { text: input?.value || '', readable: !!input, available: enabled(input) };",
     "const input = composer(); data.composer = { text: input?.value || '', readable: !!input, available: !!input && !input.readOnly && !input.disabled };"),

    ('actions-dom.js',
     "const write = (el, value) => { check(); if (!enabled(el)) C.fail('NOT_AVAILABLE');",
     "const write = (el, value) => { check(); if (!enabled(el) && !(el.tagName === 'TEXTAREA' && el.closest('#chat-input-scope'))) C.fail('NOT_AVAILABLE');"),

    # D) 背景 / 自定义指令：给出可读数据，供 HUD 自己画页面
    ('actions-dom.js',
     "      data.backgroundPanel.title = text(panel('backgroundPanel')?.querySelector('.modify-title'));",
     "      p = panel('backgroundPanel');\n      data.backgroundPanel = { open: !!p, title: text(p?.querySelector('.modify-title')),\n        items: all(p, ':scope > .modify-item').map((el, i) => ({ id: bind(el, 'bg', { index: i }), index: i, label: text(el) })) };"),

    ('actions-dom.js',
     "      data.customInstructionsPanel.title = text(panel('customInstructionsPanel')?.querySelector('.header-scope .title'));",
     "      p = panel('customInstructionsPanel');\n      const ciArea = one(p, 'textarea.uni-textarea-textarea');\n      data.customInstructionsPanel = { open: !!p, title: text(p?.querySelector('.header-scope .title')),\n        text: ciArea?.value || '', maxLength: ciArea?.maxLength || 0,\n        canSave: !!one(p, '.header-scope .complete-btn') };"),

    # E) 更多菜单里补上「剧情总结」，让 activateMoreMenuItem 能点它
    ('actions-dom.js',
     "chatSettings: ['对话设置', 'ico_chat_set_dark.svg', 'chatSettings'], tutorial: ['游玩教程', 'ico_chat_help_dark.png', 'tutorial'] });",
     "chatSettings: ['对话设置', 'ico_chat_set_dark.svg', 'chatSettings'], tutorial: ['游玩教程', 'ico_chat_help_dark.png', 'tutorial'],\n    summary: ['剧情总结', 'ico_chat_summary_dark.png', 'summaryPanel'] });"),

    ('provided-actions.js',
     "!['newChat','background','customInstructions','persona','supplement','chatSettings','tutorial'].includes(match[0].kind)",
     "!['newChat','background','customInstructions','persona','supplement','chatSettings','tutorial','summary'].includes(match[0].kind)"),

    # F) 通用原生点击 / 填值：背景项、自定义指令这类面板没有现成动作，
    #    但 HUD 想自己画页面就必须能落点到原生控件上。选择器走白名单，不接受任意 CSS。
    ('native.js',
     "        if (action !== 'sendMessage') C.fail('NOT_AVAILABLE', '请返回原生界面使用这项功能');",
     """        if (action === 'tapNative' || action === 'fillNative') {
          const TARGETS = {
            bgItem: '.modify-scope > .modify-item',
            ciInput: '.custom-instruction-scope textarea.uni-textarea-textarea',
            ciSave: '.custom-instruction-scope .header-scope .complete-btn',
            ciBack: '.custom-instruction-scope .header-scope .icon-back',
            instructionChip: '.instruction-scroll .instruction-chip'
          };
          const sel = TARGETS[payload && payload.key];
          if (!sel) C.fail('INVALID_ARGUMENT', '未知的原生目标');
          const list = [...document.querySelectorAll(sel)].filter(el => el.isConnected);
          const el = action === 'tapNative' ? list[payload.index | 0] : list[0];
          if (!el) C.fail('NOT_FOUND', '原生目标不存在');
          const win = document.defaultView;
          if (action === 'fillNative') {
            if (typeof payload.text !== 'string') C.fail('INVALID_ARGUMENT', '缺少文本');
            if (el.maxLength > 0 && payload.text.length > el.maxLength) C.fail('INVALID_ARGUMENT', '超过原生字段长度');
            Object.getOwnPropertyDescriptor(win.HTMLTextAreaElement.prototype, 'value').set.call(el, payload.text);
            el.dispatchEvent(new win.Event('input', { bubbles: true, composed: true }));
            el.dispatchEvent(new win.Event('change', { bubbles: true, composed: true }));
            return { ok: true, action, accepted: true, completed: 'unknown', persisted: 'unknown' };
          }
          for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
            const E = type.startsWith('pointer') && win.PointerEvent ? win.PointerEvent : win.MouseEvent;
            el.dispatchEvent(new E(type, { bubbles: true, cancelable: true, composed: true, button: 0 }));
          }
          return { ok: true, action, accepted: true, completed: 'unknown', persisted: 'unknown' };
        }
        if (action !== 'sendMessage') C.fail('NOT_AVAILABLE', '请返回原生界面使用这项功能');"""),

    # G) 原生快照补齐 navigation / composer：收藏状态与输入框草稿此前根本没有数据源
    ('native.js',
     "...features?.capabilities() }, actions: actionState || null,",
     """...features?.capabilities() },
        navigation: { favorite: (() => {
          const nodes = [...document.querySelectorAll('.topTabbar img, .topTabbar [style*=\"ico_collect\"]')];
          const hit = nodes.find(e => /ico_collect/.test(e.getAttribute('src') || e.getAttribute('style') || ''));
          return !!hit && /ico_collect_sel/.test(hit.getAttribute('src') || hit.getAttribute('style') || '');
        })() }, composer: { text: (input && typeof input.value === 'string') ? input.value : '' }, actions: actionState || null,"""),

    # H) 投影层原来把这两项硬清空，导致 favorite 恒 null、草稿恒 null
    ('provided-actions.js',
     "composer: { text: '', available: bridge.getCapabilities()?.setInputText?.available === true }, navigation: {} };",
     "composer: { text: raw.composer?.text ?? '', available: bridge.getCapabilities()?.setInputText?.available === true }, navigation: raw.navigation || {} };"),

    ('provided-actions.js',
     "        if (key === 'composer') { value.text = null; value.readable = false; }\n        if (key === 'navigation') { value.favorite = null; value.evidence = 'unknown'; }\n",
     ""),

    # I) schema 补字段：背景项、自定义指令正文
    ('actions.js',
     "backgroundPanel: { open: bool, title: str }, customInstructionsPanel: { open: bool, title: str }",
     "backgroundPanel: { open: bool, title: str, items: [{ id: str, index: num, label: str }] },\n    customInstructionsPanel: { open: bool, title: str, text: str, maxLength: num, canSave: bool }"),

    # J) 快照直读：一次请求就拿到完整快照，Frame 不用再等下一次推送
    ('host.js',
     "    let contextId = '', scope = null, identity = null, store = null, pending = 0, lastSnapshot = '';",
     "    let contextId = '', scope = null, identity = null, store = null, pending = 0, lastSnapshot = '', lastPosted = null;"),

    ('host.js',
     "      if (serialized !== lastSnapshot) { lastSnapshot = serialized; post({ type: 'snapshot', snapshot }); }",
     "      lastPosted = snapshot;\n      if (serialized !== lastSnapshot) { lastSnapshot = serialized; post({ type: 'snapshot', snapshot }); }"),

    ('host.js',
     "      if (method === 'snapshot') { publish(); return { accepted: true }; }",
     "      if (method === 'snapshot') { publish(); return { accepted: true }; }\n      if (method === 'snapshot.now') { publish(); return lastPosted || { snapshot: null }; }"),

    # K) 消息操作条：真站是折叠态（rect 0×0），visible() 会把整条和里面的图标都过滤掉
    ('actions-dom.js',
     "      const groups = all(item, '.modify-btn-scope').map(scope => {\n        const buttons = all(scope, ':scope > .modify-btn'); if (![2, 3].includes(buttons.length)) return null;",
     "      /* 折叠态的操作条尺寸为 0，visible() 会把它过滤掉 → 这里只解析结构 */\n      const groups = [...(item?.querySelectorAll('.modify-btn-scope') || [])].map(scope => {\n        const buttons = [...(scope.querySelectorAll(':scope > .modify-btn') || [])]; if (![2, 3, 4].includes(buttons.length)) return null;"),

    ('actions-dom.js',
     "function size(button) { const img = unique(all(button, 'img')); return img ? (img.naturalWidth || img.width) + 'x' + (img.naturalHeight || img.height) : ''; }",
     "function size(button) { const img = unique([...button.querySelectorAll('img')]); return img ? (img.naturalWidth || img.width) + 'x' + (img.naturalHeight || img.height) : ''; }"),

    ('actions-dom.js',
     "...all(button, 'img').map(e => /^data:/.test(src(e)) ? '' : src(e))].join(' ').toLowerCase();",
     "...[...button.querySelectorAll('img')].map(e => /^data:/.test(src(e)) ? '' : src(e))].join(' ').toLowerCase();"),

    # L) 「更多」菜单的 kind 判定：原来要求 label 与 icon 同时命中，图标一改名整项就变 unknown
    ('actions-dom.js',
     "const kind = Object.keys(features).find(k => label === features[k][0] && icon.split(/[?#]/)[0].endsWith('/' + features[k][1])) || 'unknown';",
     "/* 文案优先、图标次选：同一项的图标在不同版本里换过名，绑死图标会让整项失效 */\n        const cleanIcon = icon.split(/[?#]/)[0];\n        const kind = Object.keys(features).find(k => label === features[k][0])\n          || Object.keys(features).find(k => cleanIcon.endsWith('/' + features[k][1])) || 'unknown';"),

    # 只读调试探针：把 publish 时的连接状态挂到 window，便于定位
    ('host.js',
     "      const serialized = C.canonical(snapshot);",
     "      try { G.__MMD_SL_DEBUG__ = { ready, msgs: snapshot.native.messages.length, connected: snapshot.native.connected, list: !!root, scope: !!scope, identity: !!identity }; } catch (_) {}\n      const serialized = C.canonical(snapshot);"),

    # 空数组是真值 → actionState 的空 items 会永远压住兜底扫描
    ('native.js',
     "messages: actionState?.messages.items || items.slice(-100).map(el => {",
     "messages: (actionState?.messages?.items?.length ? actionState.messages.items : items.slice(-100).map(el => {"),

    ('native.js',
     "        }), capabilities:",
     "        })), capabilities:"),

    # 插入 messageItems 辅助函数
    ('native.js',
     "  function dom(document, config) {",
     """  function messageItems(document, list) {
    const pick = sel => [...((list || document).querySelectorAll(sel))];
    /* 先按「class 里带 ai / self 单词」抓，大小写与别名都能覆盖 */
    let items = [...((list || document).querySelectorAll('[class*=\"item\"]'))]
      .filter(el => /(^|\s)(ai|self)(\s|$)/i.test(String(el.className || '')));
    if (!items.length) items = pick('.item.Ai, .item.self');
    if (!items.length) items = pick('[class*=\"item\"][class*=\"Ai\"],[class*=\"item\"][class*=\"self\"]');
    /* 手机端：class 名可能换成小写/别名，content 的左右侧也放宽 */
    if (!items.length) items = [...document.querySelectorAll('.content.left,.content.right,[class*="content"][class*="left"],[class*="content"][class*="right"]')].map(el => el.parentElement).filter(Boolean);
    if (!items.length) items = [...document.querySelectorAll('[class*="item"]')].filter(el => /(^|\s)(ai|self)(\s|$)/i.test(String(el.className || '')));
    if (!items.length) items = [...document.querySelectorAll('#msglistview > *, #msglist > *, .msglist > *, .msg-list > *, .chat-msg-list > *, .chat-content .list > *')]
      .filter(el => el.querySelector('[class*="content"]'));
    if (!items.length) items = [...document.querySelectorAll('[class*="msg"]')].filter(el => el.querySelector('[class*="content"]'));
    return items;
  }
  function dom(document, config) {"""),

    # 输入框 / 发送键：原生选择器失效时退到通用扫描
    ('native.js',
     """    const scopes = [...document.querySelectorAll('#chat-input-scope,.chat-bottom .chat-input-scope')].filter(visible);
    if (scopes.length !== 1) return { input: null, send: null };
    const scope = scopes[0];
    const inputs = [...scope.querySelectorAll('textarea.uni-textarea-textarea')].filter(el => visible(el) && usable(el));
    const proxies = [...scope.querySelectorAll('.chat-send-proxy')].filter(el => el.isConnected && usable(el));
    return { input: inputs.length === 1 ? inputs[0] : null, send: proxies.length === 1 ? proxies[0] : null };""",
     """    const scopes = [...document.querySelectorAll('#chat-input-scope,.chat-bottom .chat-input-scope')].filter(visible);
    const scope = scopes.length === 1 ? scopes[0] : null;
    let inputs = [];
    if (scope) {
      inputs = [...scope.querySelectorAll('.chatMsgTextarea:not(.chat-input-collapsed-preview) textarea.uni-textarea-textarea')].filter(usable);
      if (!inputs.length) inputs = [...scope.querySelectorAll('textarea.uni-textarea-textarea')].filter(el => usable(el) && !el.readOnly);
    }
    if (!inputs.length) inputs = [...document.querySelectorAll('textarea')].filter(el => visible(el) && usable(el));
    let proxies = scope ? [...scope.querySelectorAll('.chat-send-proxy')].filter(el => el.isConnected && usable(el)) : [];
    if (!proxies.length) {
      proxies = [...document.querySelectorAll('[class*=\"send\"],button')].filter(el => visible(el) && usable(el) &&
        /send|发送/i.test(String(el.className) + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')));
    }
    return { input: inputs.length ? inputs[inputs.length - 1] : null, send: proxies.length ? proxies[proxies.length - 1] : null };"""),

    # ══════════════════════════════════════════════════════════════════════
    # 2026-10-28 第二轮真站实测（meimoai15 / #chatIframe）
    #
    # 1) 删除会话是两段式（request → token → delete），中间只要快照 revision 变一次
    #    就 CONFIRMATION_EXPIRED，原生确认框留在页面上 —— 这就是「点了删除，
    #    原生还问一次、然后又删不掉」的根因。改成一次调用：点删除图标 → 点确定 → 等列表。
    #    删除消息 / 回溯同病同治。
    # 2) 会话记录 / 更换背景这两种 u-popup 面板**没有关闭按钮**，只能点遮罩；
    #    基座也没有 closeBackgroundPanel / closeCustomInstructions 动作 →
    #    每次操作完原生面板都留在页面上。补 closePopup() 并新增两个关闭动作。
    # 3) 自定义指令不是「一条系统提示词」，而是**指令集列表**（每条有 编辑/删除/上移/下移，
    #    标题栏有 重置/添加，sub-title 是 (34/30) 条数）。补读取与增删改移。
    # ══════════════════════════════════════════════════════════════════════

    # A. 动作表：自定义指令独立成组
    ('actions.js',
     "    chatSettings: ['openChatSettings', 'closeChatSettings', 'submitChatSettings']\n  });",
     """    chatSettings: ['openChatSettings', 'closeChatSettings', 'submitChatSettings'],
    customInstructionsPanel: ['closeCustomInstructions', 'addCustomInstruction', 'editCustomInstruction',
      'deleteCustomInstruction', 'moveCustomInstruction', 'resetCustomInstructions']
  });"""),

    # A2. 背景面板以前只有「打开」没有「关闭」，动作表里得有一组才进得了 invoke
    ('actions.js',
     """    customInstructionsPanel: ['closeCustomInstructions', 'addCustomInstruction', 'editCustomInstruction',
      'deleteCustomInstruction', 'moveCustomInstruction', 'resetCustomInstructions']
  });""",
     """    customInstructionsPanel: ['closeCustomInstructions', 'addCustomInstruction', 'editCustomInstruction',
      'deleteCustomInstruction', 'moveCustomInstruction', 'resetCustomInstructions'],
    backgroundPanel: ['closeBackgroundPanel']
  });"""),

    ('actions.js',
     "    applyInstruction: ['instructionId', 'fingerprint', 'label', 'index']\n  };",
     """    applyInstruction: ['instructionId', 'fingerprint', 'label', 'index'],
    addCustomInstruction: ['text'], editCustomInstruction: ['instructionId', 'text'],
    deleteCustomInstruction: ['instructionId'], moveCustomInstruction: ['instructionId', 'dir']
  };"""),

    ('actions.js',
     "customInstructionsPanel: { open: bool, title: str, text: str, maxLength: num, canSave: bool }",
     """customInstructionsPanel: { open: bool, title: str, count: num, limit: num,
      instructions: [{ id: str, index: num, label: str }] }"""),

    # B. 读取指令集：条数 / 上限 / 每一条
    ('actions-dom.js',
     """      p = panel('customInstructionsPanel');
      const ciArea = one(p, 'textarea.uni-textarea-textarea');
      data.customInstructionsPanel = { open: !!p, title: text(p?.querySelector('.header-scope .title')),
        text: ciArea?.value || '', maxLength: ciArea?.maxLength || 0,
        canSave: !!one(p, '.header-scope .complete-btn') };""",
     """      p = panel('customInstructionsPanel');
      /* 结构读取用裸查询：条目本身没有尺寸过滤的意义，visible() 会把折叠项判死 */
      const ciRows = p ? [...p.querySelectorAll('.content-scope .item')] : [];
      const ciSub = (text(p?.querySelector('.sub-title')).match(/[(（](\\d+)\\s*[/／]\\s*(\\d+)[)）]/) || []);
      data.customInstructionsPanel = { open: !!p, title: text(p?.querySelector('.header-scope .title')),
        count: ciSub[1] ? Number(ciSub[1]) : ciRows.length, limit: ciSub[2] ? Number(ciSub[2]) : 0,
        instructions: ciRows.map((el, index) => ({ id: bind(el, 'customInstruction', { index }), index, label: text(el.querySelector('.left')) })) };
      bindings.customInstructionsPanel = [bindings.customInstructionsPanel, ...ciRows.map(el => mark(el))];"""),

    # C. 可用性
    ('actions-handlers.js',
     "        case 'setPersonaMode': return s.personaPanel.modes.some(x => !x.disabled);",
     """        case 'closeBackgroundPanel': return !!panel('backgroundPanel');
        case 'closeCustomInstructions': return !!panel('customInstructionsPanel');
        case 'addCustomInstruction': return !!s.customInstructionsPanel.open &&
          (!s.customInstructionsPanel.limit || s.customInstructionsPanel.count < s.customInstructionsPanel.limit);
        case 'editCustomInstruction': return !!s.customInstructionsPanel.open && s.customInstructionsPanel.instructions.length > 0 &&
          (!s.customInstructionsPanel.limit || s.customInstructionsPanel.count < s.customInstructionsPanel.limit);
        case 'deleteCustomInstruction': case 'moveCustomInstruction': case 'resetCustomInstructions':
          return s.customInstructionsPanel.open && s.customInstructionsPanel.instructions.length > 0;
        case 'setPersonaMode': return s.personaPanel.modes.some(x => !x.disabled);"""),

    # D. 关闭 u-popup 的通用入口 + 指令集辅助函数
    ('actions-handlers.js',
     "      async function closeMore() { if (panel('moreMenu')) { click(moreEntry()); await wait(() => !panel('moreMenu')); } }",
     """      async function closeMore() { if (panel('moreMenu')) { click(moreEntry()); await wait(() => !panel('moreMenu')); } }
      /* u-popup 类面板（会话记录 / 更换背景）没有关闭按钮，遮罩是唯一出口 */
      const overlay = owner => { const pop = owner?.closest('.u-popup');
        return pop ? [...pop.children].find(c => /(?:^|\\s)u-fade(?:\\s|$)/.test(String(c.className))) : null; };
      async function closePopup(key, inner) {
        const owner = panel(key); if (!owner) return;
        const btn = inner ? one(owner, inner) : closeButton(owner);
        if (btn) click(btn);
        else { const mask = overlay(owner); if (!mask) C.fail('NOT_AVAILABLE', '这个原生面板没有可用的关闭入口'); click(mask); }
        await wait(() => !panel(key));
      }
      const pick = (root, selector) => { const rows = all(root, selector); return rows.length ? rows[0] : null; };
      const plain = (root, selector) => [...(root?.querySelectorAll(selector) || [])].find(el => el.isConnected) || null;
      const ciOwner = () => panel('customInstructionsPanel');
      function ciItem(id) {
        const el = target(id, 'customInstruction').el;
        const row = capture().customInstructionsPanel.instructions.find(x => x.id === id);
        if (!row || !el.isConnected) C.fail('STALE_TARGET', '指令列表已经变化，请重新读取');
        return { el, row };
      }
      /* .right 里固定四个图标：编辑 / 删除 / 上移 / 下移 */
      const ciIcon = (el, index) => [...el.querySelectorAll('.right uni-image')][index] || null;
      function ciEditor() {
        return wait(() => {
          const owned = plain(ciOwner(), 'textarea');
          if (owned) return owned;
          const pop = unique(all(document, '.u-popup__content, .confirm-edit-scope')
            .filter(p => !p.querySelector('.custom-instruction-scope') && !p.querySelector('.conversation-list-scope') && plain(p, 'textarea')));
          return pop ? plain(pop, 'textarea') : null;
        });
      }
      function ciCommit(el) {
        for (const scope of [el.closest('.u-popup__content'), el.closest('.confirm-edit-scope'), ciOwner(), document]) {
          if (!scope) continue;
          const btn = pick(scope, '.ok-btn, .complete-btn');
          if (btn) return btn;
        }
        C.fail('PLATFORM_CHANGED', '找不到指令的保存按钮');
      }"""),

    # E. 关闭动作：会话 / 背景 / 自定义指令
    ('actions-handlers.js',
     "        case 'closeConversationPanel': click(closeButton(panel('conversationPanel'))); await wait(() => !panel('conversationPanel')); await closeMore(); return result('closed');",
     """        case 'closeConversationPanel': await closePopup('conversationPanel'); await closeMore(); return result('closed');
        case 'closeBackgroundPanel': await closePopup('backgroundPanel'); await closeMore(); return result('closed');
        case 'closeCustomInstructions': await closePopup('customInstructionsPanel', '.header-scope .close-btn'); await closeMore(); return result('closed');"""),

    # F. 删除会话：一次调用完成（点删除 → 点确定 → 等列表少一行）
    ('actions-handlers.js',
     """        case 'requestDeleteConversation': {
          pending.conversation = null; const item = boundConversation(p, 'delete'); if (confirmPanels().length) C.fail('NATIVE_PANEL_BUSY');
          click(one(item.el, '.delete-icon')); const dialog = await wait(() => confirmDialog('conversation')); checkBound(item);
          if (confirmPanels().length !== 1) C.fail('PLATFORM_CHANGED'); const token = C.uuid();
          pending.conversation = { item, dialog, token, expires: Date.now() + 30000, revision: p.revision };
          return result('confirmation-required', { accepted: false, conversationId: item.id,
            confirmation: { conversationId: item.id, fingerprint: p.fingerprint, index: p.index, confirmationToken: token, prompt: '确认删除这条会话？删除后无法恢复。' } });
        }""",
     """        case 'requestDeleteConversation': {
          /* 一次做完：HUD 已经向玩家确认过，原生那道「确定删除历史聊天记录吗？」由这里代点。
             两段式（token → 第二次调用）跨快照必然 STALE_VIEW，原生弹窗会一直挂着。 */
          pending.conversation = null; const item = boundConversation(p, 'delete');
          if (confirmPanels().length) C.fail('NATIVE_PANEL_BUSY');
          const before = capture().conversationPanel.conversations;
          click(one(item.el, '.delete-icon'));
          const dialog = await wait(() => confirmDialog('conversation')); checkBound(item);
          if (confirmPanels().length !== 1) C.fail('PLATFORM_CHANGED');
          click(one(dialog, '.confirm-bottom > .ok-btn'));
          const expected = before.filter(x => x.id !== item.id).map(x => x.fingerprint);
          await wait(() => !visible(dialog) &&
            C.canonical(capture().conversationPanel.conversations.map(x => x.fingerprint)) === C.canonical(expected));
          return result('deleted', { conversationId: item.id });
        }"""),

    # G. 删除消息 / 回溯：同样一次做完
    ('actions-handlers.js',
     """        case 'deleteMessage': case 'rollbackMessage': {
          const key = action === 'deleteMessage' ? 'deletion' : 'rollback';
          if (!p.confirmationToken) return issue(key, boundMessage(p), p);
          const item = consume(key, p); if (confirmPanels().length) C.fail('NATIVE_PANEL_BUSY');""",
     """        case 'deleteMessage': case 'rollbackMessage': {
          const key = action === 'deleteMessage' ? 'deletion' : 'rollback';
          const item = boundMessage(p);
          if (confirmPanels().length) C.fail('NATIVE_PANEL_BUSY');"""),

    # H. provided 层不再拦截 rollback 的首次调用
    ('provided-actions.js',
     """        if (action === 'rollbackMessage' && !p.confirmationToken) {
          const token = C.uuid(); pending.set(action, { signature, token, expires: Date.now() + 30000 });
          return { ok: true, action, accepted: false, completed: 'unknown', persisted: 'unknown', data: { phase: 'confirmation-required',
            confirmation: { messageId: p.messageId, confirmationToken: token, prompt: '回溯会删除目标消息下方的消息，确认继续？' } } };
        }
""",
     ""),

    # 重名会话互锁：新建会话会继承同名标题，基座把「指纹重复」的条目全部禁用 →
    # 一旦有过两次「新的聊天」，这些会话在 HUD 里全都不能改名/删除（真站实测复现）。
    # 元素 id 已经能区分它们，指纹只用于校验内容，不该拿来当唯一键。
    ('actions-dom.js',
     """      for (const item of data.conversationPanel.conversations) if (data.conversationPanel.conversations.filter(x => x.fingerprint === item.fingerprint).length !== 1) {
        item.available = false; item.capabilities = { rename: false, delete: false };
      }
""",
     ""),

    ('provided-actions.js',
     "if (rows.length !== 1 || s.conversationPanel.conversations.filter(x => x.fingerprint === p.fingerprint).length !== 1) C.fail('STALE_TARGET');",
     "if (rows.length !== 1) C.fail('STALE_TARGET');"),

    # 真站确认框只有 .confirm-content，没有 .confirm-title → 基座 /删除/.test(title) 恒 false，
    # confirmDialog() 永远返回 null。会话删除第一步就卡到超时（这是「删不掉聊天页」的真正起点）。
    ('actions-handlers.js',
     """    function confirmDialog(kind) {
      return unique(confirmPanels().filter(p => { const title = text(p.querySelector('.confirm-title')), body = text(p.querySelector('.confirm-content'));
        return kind === 'conversation' ? /删除/.test(title) && /聊天|会话|记录/.test(title + body) :
          kind === 'rollback' ? body.includes('回溯将会删除此消息下方的所有消息') : body.includes('删除后将无法恢复');
      }));
    }""",
     """    function confirmDialog(kind) {
      /* 只用整段文案判定，再靠关键词区分目标：真站有的版本没有 .confirm-title */
      return unique(confirmPanels().filter(p => {
        const whole = [text(p.querySelector('.confirm-title')), text(p.querySelector('.confirm-content'))].filter(Boolean).join(' ');
        if (!/删除|回溯/.test(whole)) return false;
        if (kind === 'conversation') return /聊天|会话|记录/.test(whole);
        if (kind === 'rollback') return /回溯/.test(whole);
        if (kind === 'instruction') return /指令/.test(whole);
        return /消息/.test(whole);
      }));
    }"""),

    # 弹层内查询不看可见性：人设/对话设置/指令栏 都是 opacity 淡入层，
    # 用 visible() 过滤会让「保存」「模式」这些控件被判成不可操作 → 整屏变灰
    ('actions-dom.js',
     "    const all = (root, selector) => [...(root?.querySelectorAll(selector) || [])].filter(visible);",
     """    const LAYERS = '.role-profile-modal, .conv-style-modal, .custom-instruction-scope, .instruction-bar, ' +
      '.modify-scope, .conversation-list-scope, .more-scope, .role-extra-setting, .u-popup__content';
    const inPanel = root => !!(root && root.closest && root.closest(LAYERS));
    const all = (root, selector) => {
      const rows = [...(root?.querySelectorAll(selector) || [])];
      return inPanel(root) ? rows : rows.filter(visible);
    };"""),

    # 对话设置的卡片/选项也在淡入层里（opacity 动画），visible() 会把整组判死
    ('actions-dom.js',
     "data.chatSettings.controls = all(p, '.outer-scroll-view .cs-group-card').map(el => {",
     "data.chatSettings.controls = [...(p?.querySelectorAll('.cs-group-card') || [])].map(el => {"),
    ('actions-dom.js',
     "        const options = all(el, '.cs-style-grid > .cs-style-item:not(.fixed-item)').map(e => option(e, 'chat-option'));",
     "        const options = [...(el.querySelectorAll('.cs-style-grid > .cs-style-item:not(.fixed-item), .cs-style-item:not(.fixed-item)') || [])].map(e => option(e, 'chat-option'));"),

    # 人设面板：真站只有一个 input（名字），没有 textarea（身份经历）。
    # 基座 `.card input[type=text]` 走 visible() 时会被判死 → nameDisabled=true → 整屏灰。
    ('actions-dom.js',
     """      p = panel('personaPanel'); const name = one(p, '.card input[type="text"]'), identity = one(p, '.card.textarea-wrapper textarea');""",
     """      p = panel('personaPanel');
      /* 能读到就允许改：不看可见性（弹出层有淡入，visible() 会误判） */
      const name = p ? (p.querySelector('.card input[type="text"]') || p.querySelector('input[type="text"]')) : null;
      const identity = p ? (p.querySelector('.card.textarea-wrapper textarea') || p.querySelector('textarea')) : null;"""),

    ('actions-dom.js',
     """        name: name?.value || '', maxLength: name?.maxLength || 0, nameDisabled: !enabled(name),
        identity: identity?.value || '', identityMaxLength: identity?.maxLength || 0, identityDisabled: !enabled(identity), restriction: text(p?.querySelector('.forbidden-tag .tag-text')) });""",
     """        name: name?.value || '', maxLength: name?.maxLength || 0,
        nameDisabled: !name || name.disabled === true || name.readOnly === true || name.hasAttribute('disabled'),
        identity: identity?.value || '', identityMaxLength: identity?.maxLength || 0, hasIdentity: !!identity,
        identityDisabled: !identity || identity.disabled === true || identity.readOnly === true || identity.hasAttribute('disabled'),
        restriction: text(p?.querySelector('.forbidden-tag .tag-text')) });"""),

    # schema 补 hasIdentity
    ('actions.js',
     "    personaPanel: { open: bool, title: str, modes: [option], currentModeId: str, name: str, maxLength: num, nameDisabled: bool,\n      genderChoices: [option], selectedGenderId: str, identity: str, identityMaxLength: num, identityDisabled: bool, restriction: str },",
     "    personaPanel: { open: bool, title: str, modes: [option], currentModeId: str, name: str, maxLength: num, nameDisabled: bool,\n      genderChoices: [option], selectedGenderId: str, identity: str, identityMaxLength: num, hasIdentity: bool, identityDisabled: bool, restriction: str },"),

    # 剧情总结：panels 表里没有 summaryPanel，opened() 恒 false → 点完要等 8 秒超时
    ('actions-handlers.js',
     "        const opened = () => kind === 'tutorial' ? view.location.href.includes('/pages/help/help') : panel(definition[2]);",
     """        /* roleEdit 是跳页、summary 用宿主的总结弹层（不在 panels 表里）：点完就算送达 */
        const opened = () => kind === 'tutorial' ? view.location.href.includes('/pages/help/help')
          : (kind === 'roleEdit' || kind === 'summary') ? true : panel(definition[2]);"""),

    # submitPersona 的 identity 也要容错
    ('actions-handlers.js',
     "          const owner = panel('personaPanel'), name = one(owner, '.card input[type=\"text\"]'), identity = one(owner, '.card.textarea-wrapper textarea');",
     "          const owner = panel('personaPanel'), name = owner?.querySelector('.card input[type=\"text\"]'), identity = owner?.querySelector('.card.textarea-wrapper textarea') || owner?.querySelector('textarea');"),

    # 指令栏 / 指令芯片在真站是 opacity:0 的展开层（靠动画淡入），visible() 会把它判死：
    # panel('instructionSelector') 恒 null → 指令集读不到、applyInstruction 永远 NOT_AVAILABLE。
    ('actions-dom.js',
     """    const panel = key => {
      if (!panels[key]) return null;
      const body = one(document, panels[key]);""",
     """    const panel = key => {
      if (!panels[key]) return null;
      /* 指令栏靠 opacity 动画显示，不能走 visible()：直接按结构取 */
      if (key === 'instructionSelector') return document.querySelector('.shortcut-bar-wrapper > .instruction-bar');
      /* 每个弹层都「结构取 + 必须有布局盒」：
         淡入时 opacity 为 0，visible() 会误判；而真站的 .msg-modify-scope 常驻 DOM
         且 display:none，只按 querySelector 取又会永远以为「编辑器已打开」——
         openEditMessage 因此恒 NATIVE_PANEL_BUSY，消息编辑按钮点了没反应。 */
      const pick = sel => [...document.querySelectorAll(sel)].find(el => el.getClientRects().length) || null;
      const body = pick(panels[key]);"""),

    ('actions-dom.js',
     """    const enabled = e => visible(e) && !e.disabled && !e.readOnly && !e.hasAttribute('disabled') && !e.classList.contains('disabled') &&
      e.getAttribute('aria-disabled') !== 'true' && view.getComputedStyle(e).pointerEvents !== 'none';""",
     """    const enabled = e => {
      if (!e) return false;
      /* 快捷指令栏整层是 opacity:0 的淡入层，里面的芯片仍然可点 */
      const inLayer = !!(e.closest && e.closest('.instruction-bar, .shortcut-bar-wrapper, .role-profile-modal, ' +
        '.conv-style-modal, .custom-instruction-scope, .role-extra-setting, .modify-scope, .modify-btn-scope, ' +
        '.conversation-list-scope, .more-scope, .u-popup__content'));
      if (!(inLayer || visible(e))) return false;
      return !e.disabled && !e.readOnly && !e.hasAttribute('disabled') && !e.classList.contains('disabled') &&
        e.getAttribute('aria-disabled') !== 'true' && view.getComputedStyle(e).pointerEvents !== 'none';
    };"""),

    ('actions-handlers.js',
     "        case 'closePromptSelector': click(one(panel('instructionSelector'), ':scope > .back-btn')); await wait(() => !panel('instructionSelector')); return result('closed');",
     """        case 'closePromptSelector': {
          const bar = panel('instructionSelector');
          const back = bar && bar.querySelector(':scope > .back-btn');
          if (back) click(back); else C.fail('NOT_AVAILABLE');
          await wait(() => !panel('instructionSelector') || panel('instructionSelector').classList.contains('hidden'));
          return result('closed');
        }"""),

    # ── 编辑消息：编辑器不只 Vditor 一种 ──────────────────────────────────
    # 真站的消息编辑可能是普通 contenteditable 或 textarea；只认 Vditor 会在
    # 点「编辑」之后报 PLATFORM_CHANGED，看起来就是按钮点不动。
    ('actions-dom.js',
     "    const editor = p => one(p, '#vditor .vditor-ir > pre.vditor-reset[contenteditable=\"true\"]');",
     """    const editor = p => {
      if (!p) return null;
      const pick = sel => [...p.querySelectorAll(sel)][0] || null;
      return pick('#vditor .vditor-ir > pre.vditor-reset[contenteditable="true"]')
        || pick('[contenteditable="true"]') || pick('textarea') || null;
    };"""),

    # ── 从此开启故事：平台会新建会话、重排消息 ────────────────────────────
    # 旧判定要求「消息逐字不变 + 出现新 id」，重渲染时永远不成立 →
    # 明明已经成功，却报「原生动作已发出，但未能确认结果；不会自动重试」。
    ('actions-handlers.js',
     """        case 'startNewStoryFromMessage': {
          const item = boundMessage(p); if (item.row.role !== 'assistant') C.fail('NOT_AVAILABLE');
          const expected = capture().messages.items.filter(x => x.index <= item.index).map(x => [x.role, x.text]);
          const oldIds = capture().messages.items.map(x => x.id), menu = await messageMenu(item); click(menu.options['开启新的故事']);
          await wait(() => { const rows = capture().messages.items; return C.canonical(rows.map(x => [x.role, x.text])) === C.canonical(expected) && rows.some(x => !oldIds.includes(x.id)); });
          return result('story-change-observed', { messageId: item.id });
        }""",
     """        case 'startNewStoryFromMessage': {
          const item = boundMessage(p); if (item.row.role !== 'assistant') C.fail('NOT_AVAILABLE');
          const before = capture().messages.items;
          const sig = rows => C.canonical(rows.map(x => [x.role, String(x.text || '').slice(0, 120)]));
          const beforeSig = sig(before), beforeIds = before.map(x => x.id);
          const beforeConv = capture().conversationPanel.currentConversationId || '';
          const menu = await messageMenu(item);
          click(menu.options['开启新的故事']);
          /* 有的版本会再弹一次确认；有就代点确定，没有直接继续 */
          await new Promise(r => setTimeout(r, 400));
          const ask = [...document.querySelectorAll('.u-popup__content .confirm-scope')]
            .filter(x => /开启|新的故事|新故事/.test(text(x)))[0];
          if (ask) { const ok = one(ask, '.confirm-bottom > .ok-btn'); if (ok) click(ok); }
          /* 消息变了 / 条数变了 / 换了会话，任一成立都算生效。
             只认「逐字相同」会在平台重渲染消息后误判成超时。 */
          await wait(() => {
            const s = capture(), rows = s.messages.items;
            return sig(rows) !== beforeSig || rows.length !== before.length
              || rows.some(x => !beforeIds.includes(x.id))
              || (s.conversationPanel.currentConversationId || '') !== beforeConv;
          });
          return result('story-change-observed', { messageId: item.id });
        }"""),

    ('actions-dom.js',
     "      data.instructionSelector.instructions = all(p, '.instruction-scroll .instruction-chip').filter(el => text(el)).map((el, index) => {",
     "      /* 芯片也在 opacity:0 的层里，结构读取不走 visible() */\n      data.instructionSelector.instructions = [...(p?.querySelectorAll('.instruction-scroll .instruction-chip') || [])].filter(el => text(el)).map((el, index) => {"),

    # 对话设置读不到：基座用 `.outer-scroll-view .cs-group-card`，真站没有这层容器 → controls 恒空
    ('actions-dom.js',
     "options, selectedOptionId: options.find(x => x.selected)?.id || '', collapsed: el.classList.contains('collapsed') };",
     "options, selectedOptionId: options.find(x => x.selected)?.id || '', collapsed: !el.querySelector('.cs-collapsible.is-open') };"),

    # 对话设置可改：点一个选项（原生即时生效），再点标题栏的「确定」提交
    ('actions.js',
     "    chatSettings: ['openChatSettings', 'closeChatSettings', 'submitChatSettings'],",
     "    chatSettings: ['openChatSettings', 'closeChatSettings', 'submitChatSettings', 'setChatSetting'],"),
    ('actions.js',
     "    deleteCustomInstruction: ['instructionId'], moveCustomInstruction: ['instructionId', 'dir']\n  };",
     "    deleteCustomInstruction: ['instructionId'], moveCustomInstruction: ['instructionId', 'dir'],\n    setChatSetting: ['optionId']\n  };"),
    ('actions-handlers.js',
     "        case 'setPersonaMode': case 'setPersonaGender': {",
     """        case 'setChatSetting': {
          const entry = target(p.optionId, 'chat-option');
          if (!entry || !entry.el.isConnected) C.fail('STALE_TARGET', '设置项已经刷新，请重新读取');
          const on = el => /(?:^|\s)(?:active|is-on|is-active|selected|is-checked)(?:\s|$)/.test(String(el.className));
          if (!on(entry.el)) { click(entry.el); await wait(() => on(target(p.optionId, 'chat-option').el)); }
          return result('setting-observed');
        }
        case 'setPersonaMode': case 'setPersonaGender': {"""),

    # 「编辑角色」不是一个面板，点了会跳转作者编辑页 —— 归到 features 表里才走得通
    ('actions-dom.js',
     "summary: ['剧情总结', 'ico_chat_summary_dark.png', 'summaryPanel'] });",
     "summary: ['剧情总结', 'ico_chat_summary_dark.png', 'summaryPanel'],\n    roleEdit: ['编辑角色', 'ico_edit5_dark.png', 'roleEdit'] });"),

    ('provided-actions.js',
     "!['newChat','background','customInstructions','persona','supplement','chatSettings','tutorial','summary'].includes(match[0].kind)",
     "!['newChat','background','customInstructions','persona','supplement','chatSettings','tutorial','summary','roleEdit'].includes(match[0].kind)"),

    # I. 自定义指令的增删改移
    ('actions-handlers.js',
     "        case 'setPersonaMode': case 'setPersonaGender': {",
     """        case 'addCustomInstruction': {
          const owner = ciOwner(); if (!owner) C.fail('NOT_AVAILABLE', '自定义指令面板没有打开');
          const before = capture().customInstructionsPanel.instructions.map(x => x.label);
          const addBtn = one(owner, '.add-btn');
          if (!addBtn) C.fail('NOT_AVAILABLE', '原生面板没有添加按钮');
          click(addBtn); const area = await ciEditor(); write(area, p.text);
          click(ciCommit(area));
          await wait(() => { const now = capture().customInstructionsPanel.instructions;
            return now.length > before.length || now.some(x => x.label === p.text && !before.includes(p.text)); });
          return result('added', { text: p.text });
        }
        case 'editCustomInstruction': {
          const { el, row } = ciItem(p.instructionId);
          const icon = ciIcon(el, 0); if (!icon) C.fail('NOT_AVAILABLE', '这一条没有编辑入口');
          click(icon); const area = await ciEditor(); write(area, p.text);
          click(ciCommit(area));
          await wait(() => { const now = capture().customInstructionsPanel.instructions;
            return now.some(x => x.label === p.text) || !now.some(x => x.label === row.label); });
          return result('edited', { instructionId: p.instructionId, text: p.text });
        }
        case 'deleteCustomInstruction': {
          const { el } = ciItem(p.instructionId);
          const before = capture().customInstructionsPanel.instructions.length;
          const icon = ciIcon(el, 1); if (!icon) C.fail('NOT_AVAILABLE', '这一条没有删除入口');
          click(icon);
          const dialog = await wait(() => confirmDialog('instruction'));
          const ok = pick(dialog, '.ok-btn'); if (!ok) C.fail('PLATFORM_CHANGED', '确认框没有确定按钮');
          click(ok); await wait(() => capture().customInstructionsPanel.instructions.length < before);
          return result('deleted', { instructionId: p.instructionId });
        }
        case 'moveCustomInstruction': {
          const { el } = ciItem(p.instructionId);
          const icon = ciIcon(el, p.dir === 'up' ? 2 : 3); if (!icon) C.fail('NOT_AVAILABLE', '这一条没有排序入口');
          const before = capture().customInstructionsPanel.instructions.map(x => [x.index, x.label]);
          click(icon);
          await wait(() => C.canonical(capture().customInstructionsPanel.instructions.map(x => [x.index, x.label])) !== C.canonical(before));
          return result('moved', { instructionId: p.instructionId, dir: p.dir });
        }
        case 'resetCustomInstructions': {
          const owner = ciOwner(); if (!owner) C.fail('NOT_AVAILABLE', '自定义指令面板没有打开');
          const before = capture().customInstructionsPanel.instructions.length;
          const reset = all(owner, '.btn-scope > uni-view').find(el => /重置/.test(text(el)));
          if (!reset) C.fail('NOT_AVAILABLE', '原生面板没有重置按钮');
          click(reset);
          const dialog = await wait(() => unique(all(document, '.confirm-scope')));
          const ok = pick(dialog, '.ok-btn'); if (!ok) C.fail('PLATFORM_CHANGED', '确认框没有确定按钮');
          click(ok); await wait(() => capture().customInstructionsPanel.instructions.length < before);
          return result('reset');
        }
        case 'setPersonaMode': case 'setPersonaGender': {"""),
    # ══ 性能：对齐示例（yinyu-jianghu）的取数方式 ══════════════════════════
    # 示例的每个动作只重读「被操作的那一块」，回读结果随动作一起返回；我们原来
    # 一次动作要扫三遍全量 DOM（校验 revision / 动作后回读 / HUD 再拉一次快照），
    # 而每次扫描都会把最多 100 条消息的 innerHTML 取一遍算签名 —— 这才是「慢吞吞」的来源。
    ('actions-dom.js',
     "    function capture() {\n      refs = new Map(); bindings = {}; const data = {};",
     """    function capture(options) {
      /* panelsOnly：只重读面板，不扫消息列表。消息签名要取每条 innerHTML，是这里最贵的一步。 */
      const panelsOnly = !!(options && options.panelsOnly);
      if (!panelsOnly) { refs = new Map(); bindings = {}; }
      const data = {};"""),

    ('actions-dom.js',
     "      const items = all(one(document, '#msglistview'), '.item.Ai, .item.self');",
     "      const items = panelsOnly ? [] : all(one(document, '#msglistview'), '.item.Ai, .item.self');"),

    ('actions-dom.js',
     "    function needView(action, payload) { const current = capture()[A.groupFor[action]]; if (!A.rootActions.has(action) && payload.revision !== current.revision) C.fail('STALE_VIEW', '界面数据已变化，请重新读取'); return current; }",
     """    function needView(action, payload) {
      const group = A.groupFor[action];
      /* 消息类动作要用消息引用，必须全量；其它动作只重读自己那块面板 */
      const full = group === 'messages' || group === 'editPanel';
      const current = capture(full ? undefined : { panelsOnly: true })[group];
      if (!A.rootActions.has(action) && payload.revision !== current.revision) C.fail('STALE_VIEW', '界面数据已变化，请重新读取');
      return current;
    }"""),

    ('actions-dom.js',
     "    function capabilities() {\n      const s = capture(); return",
     "    function capabilities(known) {\n      /* 快照那边已经扫过一遍，能力表直接复用，不再扫第二遍 */\n      const s = known || capture(); return"),

    ('native.js',
     "...models?.capabilities(), ...features?.capabilities() },",
     "...models?.capabilities(), ...(actionState ? features?.capabilities(actionState) : features?.capabilities()) },"),

    ('actions-handlers.js',
     "        click(target(row.id, 'more').el); await wait(opened); return result('opened', { kind, itemId: row.id });",
     """        click(target(row.id, 'more').el); await wait(opened);
        /* 打开类动作把面板数据一起带回：HUD 拿到就能画，不必再要一次全量快照 */
        const panelState = opened() ? capture({ panelsOnly: true })[definition[2]] : null;
        return result('opened', { kind, itemId: row.id, panelKey: definition[2], panel: panelState });"""),

    # 等待：固定 30ms 轮询 → 一帧一查（示例用的是 requestAnimationFrame），超时 8s → 4.5s
    ('actions-dom.js',
     """        const wait = async (predicate, timeout = config.actionTimeoutMs || 8000) => {
          const end = Date.now() + timeout;
          do { check(); const value = predicate(); if (value) return value;
            await new Promise(resolve => { const done = () => { clearTimeout(timer); run.signal.removeEventListener('abort', done); resolve(); };
              const timer = setTimeout(done, 30); run.signal.addEventListener('abort', done, { once: true }); });
          } while (Date.now() < end);""",
     """        const wait = async (predicate, timeout = config.actionTimeoutMs || 4500) => {
          const end = Date.now() + timeout;
          const frame = view.requestAnimationFrame ? cb => view.requestAnimationFrame(cb) : cb => setTimeout(cb, 16);
          do { check(); const value = predicate(); if (value) return value;
            /* 一帧一查：原生靠 CSS 动画展开，下一帧就能看出结果，不必死等 30ms */
            await new Promise(resolve => {
              let timer = 0, done = false;
              const finish = () => { if (done) return; done = true; if (timer) clearTimeout(timer);
                run.signal.removeEventListener('abort', finish); resolve(); };
              frame(finish);
              timer = setTimeout(finish, 40);          /* 后台标签页里 rAF 会暂停，兜底 */
              run.signal.addEventListener('abort', finish, { once: true });
            });
          } while (Date.now() < end);"""),
    # ── 自定义指令的正文：DOM 只渲染名称，正文只在 Vue 组件的 data 里 ──────────
    # 示例（yinyu）对这类「DOM 里没有的数据」就是读 __vueParentComponent 的 data，
    # 只读不写 —— 写回仍然走原生，平台改版不会崩。实测一次扫描 0.12ms。
    ('actions-dom.js',
     "    function capture(options) {\n      /* panelsOnly：只重读面板，不扫消息列表。消息签名要取每条 innerHTML，是这里最贵的一步。 */",
     """    const readKey = (o, k) => {
      if (o === null || typeof o !== 'object') return undefined;
      try { const d = Object.getOwnPropertyDescriptor(o, k); return d && 'value' in d ? d.value : undefined; } catch (_) { return undefined; }
    };
    /* 从 Vue 组件树上取指令清单（带正文）。取不到就返回 null，调用方回退到只用 DOM 的名称。 */
    function vueInstructionList() {
      try {
        const roots = [...document.querySelectorAll('.shortcut-bar-wrapper, .instruction-bar, .custom-instruction-scope')];
        const seen = new Set();
        for (const root of roots) {
          let node = root;
          for (let a = 0; node && a < 20; a++, node = node.parentElement) {
            let vm = readKey(node, '__vueParentComponent');
            for (let f = 0; vm && typeof vm === 'object' && f < 30 && !seen.has(vm); f++) {
              const list = readKey(readKey(readKey(vm, 'data'), 'customInstruction'), 'list');
              if (Array.isArray(list) && list.length) return list;
              seen.add(vm); vm = readKey(vm, 'parent');
            }
          }
        }
      } catch (_) {}
      return null;
    }
    function vueInstruction(index, label) {
      const list = vueInstructionList(); if (!list) return null;
      const at = list[index], name = x => String((x && x.name) || '').trim();
      if (at && name(at) === label) return at;
      return list.find(x => name(x) === label) || at || null;
    }

    function capture(options) {
      /* panelsOnly：只重读面板，不扫消息列表。消息签名要取每条 innerHTML，是这里最贵的一步。 */"""),

    ('actions-dom.js',
     "        instructions: ciRows.map((el, index) => ({ id: bind(el, 'customInstruction', { index }), index, label: text(el.querySelector('.left')) })) };",
     """        instructions: ciRows.map((el, index) => {
          const label = text(el.querySelector('.left')), row = vueInstruction(index, label);
          return { id: bind(el, 'customInstruction', { index }), index, label,
            content: row && typeof row.content === 'string' ? row.content : '' };
        }) };"""),

    # schema 会裁掉未声明的字段，正文要加进去才传得到 HUD
    ('actions.js',
     "      instructions: [{ id: str, index: num, label: str }] }",
     "      instructions: [{ id: str, index: num, label: str, content: str }] }"),
    # ══ 作者反馈：对话设置空、剧情总结打不开、指令改名、模型初始名、帮忙回答 ══
    # 1) 对话设置：面板 30ms 就挂载，但 7 张卡片要 1.5 秒后才由接口填进来。
    #    原来 wait(opened) 只等「面板出现」，HUD 拿到的是空壳。
    ('actions-handlers.js',
     """        /* roleEdit 是跳页、summary 用宿主的总结弹层（不在 panels 表里）：点完就算送达 */
        const opened = () => kind === 'tutorial' ? view.location.href.includes('/pages/help/help')
          : (kind === 'roleEdit' || kind === 'summary') ? true : panel(definition[2]);""",
     """        /* 对话设置的卡片是异步拉的：面板先挂、内容后到，只等「面板出现」会拿到空壳 */
        const ready = () => {
          const body = panel(definition[2]);
          if (!body) return null;
          if (kind === 'chatSettings' && !body.querySelectorAll('.cs-group-card').length) return null;
          return body;
        };
        /* roleEdit 是跳页、summary 用宿主的总结弹层（不在 panels 表里）：点完就算送达 */
        const opened = () => kind === 'tutorial' ? view.location.href.includes('/pages/help/help')
          : (kind === 'roleEdit' || kind === 'summary') ? true : !!ready();
        /* 剧情总结在快捷栏里就有入口，比绕「更多」菜单稳 */
        if (kind === 'summary') {
          const direct = shortcut('总结剧情', 'ico_chat_summary_');
          if (direct) {
            click(direct);
            await wait(() => one(document, '.summary-sheet') || panel('summaryPanel'));
            return result('opened', { kind });
          }
        }"""),

    # 2) 剧情总结独立成动作：HUD 不再自己开菜单点条目
    ('actions.js',
     "    moreMenu: ['openMoreMenu', 'closeMoreMenu', 'activateMoreMenuItem', 'openTutorial', 'openBackgroundPanel', 'openCustomInstructions'],",
     "    moreMenu: ['openMoreMenu', 'closeMoreMenu', 'activateMoreMenuItem', 'openTutorial', 'openBackgroundPanel', 'openCustomInstructions', 'openSummaryPanel'],"),

    ('actions.js',
     "  const rootActions = new Set(['exit', 'openComments', 'refreshConversation', 'openSharePanel', 'openMoreMenu',",
     "  const rootActions = new Set(['exit', 'openComments', 'refreshConversation', 'openSharePanel', 'openMoreMenu', 'openSummaryPanel',"),

    ('actions-handlers.js',
     "      openCustomInstructions: 'customInstructions', openPersona: 'persona', openSupplement: 'supplement' };",
     "      openCustomInstructions: 'customInstructions', openPersona: 'persona', openSupplement: 'supplement',\n      openSummaryPanel: 'summary' };"),

    # 3) 指令改名：原生编辑层有「指令名称」输入框，动作要能带 name
    ('actions.js',
     "    const fields = new Set([...(required[action] || []), 'revision']);",
     """    /* 可选参数：带了就写，不带就保持原样（例如改名时只给 name 也行） */
    const optional = { editCustomInstruction: ['name'] };
    const fields = new Set([...(required[action] || []), ...(optional[action] || []), 'revision']);"""),

    ('actions-handlers.js',
     """          click(icon); const area = await ciEditor(); write(area, p.text);
          click(ciCommit(area));""",
     """          click(icon); const area = await ciEditor(); write(area, p.text);
          /* 同一次编辑里还能改名字：原标题最多 30 字，超了原生也存不下 */
          if (typeof p.name === 'string' && p.name.trim()) {
            const scope = area.closest('.edit-scope') || area.closest('.u-popup__content') || document;
            const nameInput = scope.querySelector('input.uni-input-input') || scope.querySelector('input[type="text"]');
            if (nameInput) write(nameInput, p.name.trim());
          }
          click(ciCommit(area));"""),

    # 4) 帮忙回答：输入框里的灯泡按钮，带 10⚡ 徽标
    ('native.js',
     "            instructionChip: '.instruction-scroll .instruction-chip'",
     "            instructionChip: '.instruction-scroll .instruction-chip',\n            aiAssist: '.ai-assistant'"),

    # 5) 当前模型：DOM 里只有「模型设置」四个字，真名在 Vue 的 selectedModel 上；
    #    顺手把余额（deductNum）和单价（selectedModel.deductNum）带出来
    ('models.js',
     "    function capture() {\n      targets = new Map();",
     """    const readKey = (o, k) => {
      if (o === null || typeof o !== 'object') return undefined;
      try { const d = Object.getOwnPropertyDescriptor(o, k); return d && 'value' in d ? d.value : undefined; } catch (_) { return undefined; }
    };
    /* 平台把「当前模型」放在聊天组件的 data 上（selectedModel / deductNum），DOM 里没有 */
    function vueModel() {
      try {
        for (const sel of ['.chat-bottom-wapper', '.shortcut-bar-wrapper']) {
          let node = document.querySelector(sel);
          for (let a = 0; node && a < 24; a++, node = node.parentElement) {
            let vm = readKey(node, '__vueParentComponent');
            for (let f = 0; vm && typeof vm === 'object' && f < 30; f++) {
              const data = readKey(vm, 'data');
              if (data && readKey(data, 'selectedModelId') !== undefined) {
                const sm = readKey(data, 'selectedModel');
                return { id: String(readKey(data, 'selectedModelId')), name: String(readKey(sm, 'name') || ''),
                  cost: readKey(sm, 'deductNum') ?? null, balance: readKey(data, 'deductNum') ?? null };
              }
              vm = readKey(vm, 'parent');
            }
          }
        }
      } catch (_) {}
      return null;
    }

    function capture() {
      targets = new Map();"""),

    ('models.js',
     "      const displayedName = entryName();\n      if (displayedName) current = { name: displayedName, evidence: 'native-entry' };",
     """      const displayedName = entryName(), vmModel = vueModel();
      /* 快捷栏那颗按钮的文案是「模型设置」，不是模型名 —— 有 Vue 数据就以它为准 */
      if (vmModel && vmModel.name) current = { name: vmModel.name, cost: vmModel.cost, balance: vmModel.balance, evidence: 'vue' };
      else if (displayedName && displayedName !== '模型设置') current = { name: displayedName, evidence: 'native-entry' };"""),
    # 对话设置：卡片是异步拉的（~1.5s），打开动作要等到真的有卡片再交回去
    ('actions-handlers.js',
     "        case 'openChatSettings': if (!panel('chatSettings')) { click(shortcut('对话设置', 'ico_chat_set_')); await wait(() => panel('chatSettings')); } return result('opened');",
     """        case 'openChatSettings': {
          if (!panel('chatSettings')) { click(shortcut('对话设置', 'ico_chat_set_')); await wait(() => panel('chatSettings')); }
          /* 面板 30ms 就挂、卡片是接口陆续填的：等数量稳定下来再交，别给 HUD 半张表 */
          let seen = -1, since = Date.now();
          await wait(() => {
            const b = panel('chatSettings');
            const n = b ? b.querySelectorAll('.cs-group-card').length : 0;
            if (!n) return false;
            if (n !== seen) { seen = n; since = Date.now(); return false; }
            return Date.now() - since >= 260;
          });
          return result('opened', { panel: capture({ panelsOnly: true }).chatSettings });
        }"""),

    # 当前模型：selectedModel 是字符串，真名与单价在 pvSelectedModel 上
    ('models.js',
     """              if (data && readKey(data, 'selectedModelId') !== undefined) {
                const sm = readKey(data, 'selectedModel');
                return { id: String(readKey(data, 'selectedModelId')), name: String(readKey(sm, 'name') || ''),
                  cost: readKey(sm, 'deductNum') ?? null, balance: readKey(data, 'deductNum') ?? null };
              }""",
     """              if (data && readKey(data, 'selectedModelId') !== undefined) {
                /* selectedModel 只是 "[A]claude-4.6-opus" 这样的字符串；带名字和单价的是 pvSelectedModel */
                const pv = readKey(data, 'pvSelectedModel'), sm = readKey(data, 'selectedModel');
                const name = String(readKey(pv, 'name') || (typeof sm === 'string' ? sm : readKey(sm, 'name')) || '');
                return { id: String(readKey(data, 'selectedModelId')), name,
                  cost: readKey(pv, 'deductNum') ?? null, balance: readKey(data, 'deductNum') ?? null };
              }"""),
    # ── 对话设置：选项的可用性没登记，能力表恒 false → HUD 把每个选项都置灰 ──
    ('actions-handlers.js',
     "        case 'openChatSettings': return !!panel('chatSettings') || enabled(shortcut('对话设置', 'ico_chat_set_'));",
     "        case 'openChatSettings': return !!panel('chatSettings') || enabled(shortcut('对话设置', 'ico_chat_set_'));\n        case 'setChatSetting': return !!panel('chatSettings');\n        case 'submitChatSettings': return !!panel('chatSettings');"),

    # ── 返回详情页：真站有些页面没有 .header-box .icon-back，不该因此被标灰 ──
    ('actions-handlers.js',
     "        case 'exit': return enabled(one(document, '.header-box .icon-back'));",
     "        /* 有返回按钮就点它，没有也允许（走 history.back 退回角色详情） */\n        case 'exit': return true;"),
    ('actions-handlers.js',
     "        case 'exit': click(one(document, '.header-box .icon-back')); return result('dispatched');",
     """        case 'exit': {
          const back = one(document, '.header-box .icon-back');
          if (back) { try { click(back); return result('dispatched'); } catch (_) {} }
          try { view.history.back(); return result('dispatched'); } catch (_) {}
          C.fail('NOT_AVAILABLE', '这个页面没有返回入口');
        }"""),

    # ── 剧情总结：原生是底部滑出的「记忆管理面板」，投影成 HUD 自己的页面 ──
    ('actions-dom.js',
     "    backgroundPanel: '.modify-scope', customInstructionsPanel: '.custom-instruction-scope' };",
     "    backgroundPanel: '.modify-scope', customInstructionsPanel: '.custom-instruction-scope',\n    summaryPanel: '.summary-sheet' };"),

    ('actions.js',
     "    backgroundPanel: ['closeBackgroundPanel']\n  });",
     """    backgroundPanel: ['closeBackgroundPanel'],
    summaryPanel: ['openSummaryPanel', 'closeSummaryPanel', 'selectSummaryOption', 'toggleSummaryAuto', 'saveSummaryPanel']
  });"""),

    ('actions.js',
     "    setChatSetting: ['optionId']\n  };",
     "    setChatSetting: ['optionId'],\n    selectSummaryOption: ['optionId']\n  };"),

    ('actions.js',
     "    customInstructionsPanel: { open: bool, title: str, count: num, limit: num,",
     """    summaryPanel: { open: bool, title: str, autoOn: bool, autoText: str, rounds: num, content: str, count: str,
      canSave: bool, limits: [option], models: [option], prompts: [option] },
    customInstructionsPanel: { open: bool, title: str, count: num, limit: num,"""),

    # 读取：总结内容 / 字数上限 / 模型 / 提示词
    ('actions-dom.js',
     "      state = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, revisions.stamp(key, value, bindings[key])]));",
     """      /* 剧情总结：原生面板里的四段数据，读出来 HUD 才有自己的页面 */
      p = panel('summaryPanel');
      const sumSection = k => [...(p ? p.querySelectorAll('.summary-section') : [])]
        .find(sec => text(sec.querySelector('.summary-label')).indexOf(k) === 0);
      const sumItems = (sec, kind) => sec ? [...sec.querySelectorAll('.summary-preset-item')].map((el, index) => ({
        id: bind(el, 'summary-option', { index, group: kind }), index,
        label: text(el.querySelector('.summary-pi-name')) || text(el),
        cost: text(el.querySelector('.summary-pi-cost')),
        selected: /(?:^|\s)selected(?:\s|$)/.test(String(el.className)) })) : [];
      Object.assign(data.summaryPanel, { title: text(p?.querySelector('.summary-top-title')),
        autoOn: /(?:^|\s)on(?:\s|$)/.test(String(p?.querySelector('.summary-tgl')?.className || '')),
        autoText: text(p?.querySelector('.summary-auto-desc')) || text(p?.querySelector('.summary-auto-bar')),
        rounds: Number((p?.querySelector('.summary-round-input input') || {}).value) || 0,
        content: text(p?.querySelector('.summary-content-box')),
        count: text(p?.querySelector('.summary-label-count')),
        limits: [...(p ? p.querySelectorAll('.summary-tier') : [])].map((el, index) => ({
          id: bind(el, 'summary-option', { index, group: 'limit' }), index, label: text(el), cost: '',
          selected: /(?:^|\s)selected(?:\s|$)/.test(String(el.className)),
          /* 只有原生自己标了锁/禁用才算不可点：会员能点的档位不该被 HUD 提前拦下 */
          disabled: /(?:^|\s)(?:disabled|lock|locked|forbid)(?:\s|$)/i.test(String(el.className) + ' ' + String(el.getAttribute('aria-disabled') || '')) })),
        models: sumItems(sumSection('总结模型'), 'model'),
        prompts: sumItems(sumSection('总结提示词'), 'prompt'),
        canSave: enabled(p?.querySelector('.summary-save-btn')) });
      state = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, revisions.stamp(key, value, bindings[key])]));"""),

    # 可用性
    ('actions-handlers.js',
     "        case 'setChatSetting': return !!panel('chatSettings');",
     """        case 'setChatSetting': return !!panel('chatSettings');
        case 'openSummaryPanel': return !!panel('summaryPanel') || enabled(shortcut('总结剧情', 'ico_chat_summary')) || enabled(moreEntry());
        case 'closeSummaryPanel': return !!panel('summaryPanel');
        case 'selectSummaryOption': return !!panel('summaryPanel') &&
          (s.summaryPanel.limits.length + s.summaryPanel.models.length + s.summaryPanel.prompts.length) > 0;
        case 'toggleSummaryAuto': return !!panel('summaryPanel');
        case 'saveSummaryPanel': return !!panel('summaryPanel') && enabled(one(panel('summaryPanel'), '.summary-save-btn'));"""),

    # 处理器
    ('actions-handlers.js',
     "        case 'setChatSetting': {",
     """        case 'openSummaryPanel': {
          if (!panel('summaryPanel')) {
            const btn = shortcut('总结剧情', 'ico_chat_summary');
            if (btn && enabled(btn)) { click(btn); await wait(() => panel('summaryPanel')); }
            else await feature('summary');
          }
          return result('opened');
        }
        case 'closeSummaryPanel': {
          const sheet = panel('summaryPanel'), x = sheet && sheet.querySelector('.summary-close');
          if (!x) C.fail('NOT_AVAILABLE', '总结面板没有关闭按钮');
          click(x); await wait(() => !panel('summaryPanel'));
          return result('closed');
        }
        case 'selectSummaryOption': {
          const entry = target(p.optionId, 'summary-option');
          if (!entry || !entry.el.isConnected) C.fail('STALE_TARGET', '这个选项已经刷新，请重新读取');
          if (!/(?:^|\s)selected(?:\s|$)/.test(String(entry.el.className))) {
            click(entry.el);
            await wait(() => /(?:^|\s)selected(?:\s|$)/.test(String(target(p.optionId, 'summary-option').el.className)));
          }
          return result('selected');
        }
        case 'toggleSummaryAuto': {
          const sheet = panel('summaryPanel'), tgl = sheet && sheet.querySelector('.summary-tgl');
          if (!tgl) C.fail('NOT_AVAILABLE', '总结面板没有自动开关');
          const was = /(?:^|\s)on(?:\s|$)/.test(String(tgl.className));
          click(tgl);
          await wait(() => (/(?:^|\s)on(?:\s|$)/.test(String(tgl.className))) !== was);
          return result('toggled');
        }
        case 'saveSummaryPanel': {
          const sheet = panel('summaryPanel'), btn = sheet && sheet.querySelector('.summary-save-btn');
          if (!btn) C.fail('NOT_AVAILABLE', '总结面板没有保存按钮');
          click(btn); await wait(() => !panel('summaryPanel'));
          return result('saved');
        }
        case 'setChatSetting': {"""),

    # 「总结」现在有真面板了，不再当成「点完即送达」
    ('actions-handlers.js',
     "          : (kind === 'roleEdit' || kind === 'summary') ? true : !!ready();",
     "          : kind === 'roleEdit' ? true : !!ready();"),

    # ══════════════════════════════════════════════════════════════════════
    # 2026-10-28 第三轮：「模型设置」双端灰死 + 「重置聊天」进不来
    #
    # 1) canConfigure 只看 img[src*="ico_setting2_dark.png"]，而且 one()/all() 都过
    #    visible()。真站是 uni-app：图标画在 uni-image > div 的 background-image 上，
    #    里面的 <img> 是 opacity:0 的载荷节点 → 被 visible() 整个过滤掉 →
    #    canConfigure 恒 false → openModelConfiguration 能力恒 false →
    #    HUD 上两颗「模型设置」永久置灰，双端都点不了。
    #    改：单独一路 configIcon()（不看可见性，img / 行内 style / class 三种写法都认）；
    #    能力判定不再强依赖图标，真找不到就在点击时报清楚，别在 UI 上无声锁死。
    # 2) 「重置聊天」在更多菜单里被三重拦死：kind 判成 unknown → available 恒 false；
    #    activateMoreMenuItem 的能力表要求「至少一个非破坏项」；handler 又硬拒 destructive。
    #    改：登记成 resetChat，HUD 自己确认过之后带 confirmed 才放行，点完不等面板。
    # ══════════════════════════════════════════════════════════════════════
    ('models.js',
     """    settingsIcon: 'img[src*="ico_setting2_dark.png"]', config: '.model-setting-scope',""",
     """    settingsIcon: 'img[src*="ico_setting"], img[src*="ico_setting2_dark"], [style*="ico_setting"], [class*="ico_setting"]',
    config: '.model-setting-scope',"""),

    ('models.js',
     "    function mark(el, kind) {",
     """    /* 设置图标在真站是 uni-image 的 background-image，内部 <img> 是 opacity:0 的载荷节点：
       走 visible() 的 all()/one() 会被整个过滤掉 → canConfigure 恒 false（按钮全灰）。
       这里单独一路：不看可见性，img / 行内 style / class 三种写法都认。 */
    function configIcon(row) {
      if (!row) return null;
      const pick = sel => [...row.querySelectorAll(sel)].filter(el => el.isConnected);
      let hit = pick('img[src*="ico_setting"], [style*="ico_setting"], [class*="ico_setting"]');
      if (!hit.length) hit = pick('[class*="setting-icon"], [class*="set-icon"], [class*="icon-set"]');
      if (!hit.length) hit = pick('.model-set, .model-item-set, [class*="model-set"]');
      const el = hit[0];
      return el ? (el.closest('uni-image') || el.closest('[class*="setting"]') || el) : null;
    }
    function mark(el, kind) {"""),

    ('models.js',
     "          canConfigure: enabled(one(el, S.settingsIcon)) }));",
     "          canConfigure: !!configIcon(el) }));"),

    ('models.js',
     "        openModelConfiguration: list.open && !setting.open && list.models.some(row => row.canConfigure),",
     """        /* 只要面板开着、有可用模型就允许点：图标探测再碎也不该把按钮无声锁死 */
        openModelConfiguration: list.open && !setting.open && list.models.some(row => row.available),"""),

    ('models.js',
     "          if (!row?.available || (action === 'openModelConfiguration' && !row.canConfigure)) C.fail('NOT_AVAILABLE', '模型条目不可操作');",
     "          if (!row?.available) C.fail('NOT_AVAILABLE', '模型条目不可操作');"),

    ('models.js',
     "            const icon = one(target, S.settingsIcon); click(icon?.closest('uni-image') || icon);",
     """            const icon = configIcon(target);
            if (!icon) C.fail('NOT_AVAILABLE', '这个模型条目里没有设置入口，请到原生页设置');
            /* 图标可能是 opacity:0 的 uni-image 层：click() 里的 enabled() 会把它判死，直接派发 */
            if (enabled(icon)) click(icon);
            else for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'])
              icon.dispatchEvent(new view.MouseEvent(type, { bubbles: true, cancelable: true, composed: true, button: 0 }));"""),

    ('models.js',
     "            await wait(() => { const s = capture().modelConfiguration; return s.open && s.modelName === row.name; }, '匹配的模型设置未打开');",
     "            /* 设置页标题不一定带模型名，只认「打开了」，否则会一直等到超时 */\n            await wait(() => capture().modelConfiguration.open, '模型设置页没有打开');"),

    # 更多菜单：登记「重置聊天」
    ('actions-dom.js',
     "    roleEdit: ['编辑角色', 'ico_edit5_dark.png', 'roleEdit'] });",
     """    roleEdit: ['编辑角色', 'ico_edit5_dark.png', 'roleEdit'],
    resetChat: ['重置聊天', 'ico_reset2_dark.png', 'resetChat'] });"""),

    ('actions-handlers.js',
     "        case 'activateMoreMenuItem': return s.moreMenu.items.some(i => i.available && !i.destructive);",
     "        /* 破坏项也算可用：放不放行由 handler 按 confirmed 决定，能力表别先斩 */\n        case 'activateMoreMenuItem': return s.moreMenu.items.some(i => i.available);"),

    ('actions-handlers.js',
     "          const row = s.items.find(i => i.id === p.itemId); if (!row?.available || row.destructive) C.fail('NOT_AVAILABLE'); return feature(row.kind, row.id);",
     """          const row = s.items.find(i => i.id === p.itemId);
          if (!row?.available) C.fail('NOT_AVAILABLE');
          /* 破坏性条目（重置聊天）：HUD 已经自己确认过一次，带 confirmed 才放行。
             真站点完菜单项还会再弹一道原生「确定要重置角色吗？」。 */
          if (row.destructive) {
            if (p.confirmed !== true) C.fail('CONFIRMATION_REQUIRED', '这项操作会清空记录，需要先确认');
            const fire = el => {
              if (!el) return;
              const win = document.defaultView;
              for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
                const E = t.startsWith('pointer') && win.PointerEvent ? win.PointerEvent : win.MouseEvent;
                el.dispatchEvent(new E(t, { bubbles: true, cancelable: true, composed: true, button: 0 }));
              }
            };
            /* .confirm-scope 在真站是「删除聊天 / 回溯 / 重置」三个模板共用一个类名，
               平时都挂在 DOM 里、只是 display:none。直接 querySelector 常拿到隐藏的那个，
               点它的「确定」等于什么都没按 —— 重置自然永远不生效。
               只认「真的有布局盒 + 文案对得上」的那一个。 */
            const boxes = () => [...document.querySelectorAll('.confirm-scope, .confirm-box, .dialog-scope')]
              .filter(el => el.getClientRects().length && getComputedStyle(el).display !== 'none');
            /* 只认文案里带「重置」的框：真站删除聊天 / 回溯 / 重置共用一个 .confirm-scope，
               退到 boxes()[0] 可能点到别的确认框（会删消息）。 */
            const pickBox = () => boxes().find(el => /重置|重新开始|重开/.test(text(el))) || null;
            /* 真站的 showConfirmModal() 是 toggle：点一次开、再点一次关。
               旧逻辑每 1.5 秒又点一次菜单项，等于把刚弹出的框关掉 ——
               所以第一次操作总是差一口气，要点第二次。这里改成幂等：
               已经弹着框就直接点「确定」，没弹才点菜单项，最多补一次。 */
            let box = pickBox();
            if (!box) {
              const sc = document.querySelector('.more-scope') || document.querySelector('.more-popup');
              const live = sc && [...sc.querySelectorAll('.item')]
                .find(e => /重置聊天|重新开始|重开/.test(text(e)));
              let fallback = null;
              if (row.id) { try { fallback = target(row.id, 'more').el; } catch (_) {} }
              const itemEl = live || fallback;
              if (itemEl) {
                fire(itemEl);
                try { await wait(() => (box = pickBox()), 2400); } catch (_) {}
                /* 菜单刚淡入、第一下点空了：只在仍然没有确认框时补一次 */
                if (!box && itemEl.isConnected) {
                  fire(itemEl);
                  try { await wait(() => (box = pickBox()), 1800); } catch (_) {}
                }
              }
            }
            if (box) {
              /* 「确定」在 .confirm-bottom 里；不同版本可能是 uni-view / button，未必带 ok-btn 类 */
              const pickText = /^(确定|确认|是的|好|OK)$/i;
              for (let k = 0; k < 3 && box && box.isConnected; k++) {
                const ok = [...box.querySelectorAll('.ok-btn, .confirm-btn, .confirm-bottom > *')]
                  .find(el => pickText.test(text(el).trim()))
                  || box.querySelector('.ok-btn, .confirm-btn, [class*="ok-btn"]');
                if (!ok) break;
                fire(ok);
                try { await wait(() => !box.isConnected || !box.getClientRects().length, 1800); } catch (_) {}
              }
            }
            return result('dispatched', { kind: row.kind || 'resetChat', confirmed: !!box });
          }
          return feature(row.kind, row.id);"""),

    ('actions.js',
     "    const optional = { editCustomInstruction: ['name'] };",
     "    const optional = { editCustomInstruction: ['name'], activateMoreMenuItem: ['confirmed'] };"),

    ('provided-actions.js',
     "!['newChat','background','customInstructions','persona','supplement','chatSettings','tutorial','summary','roleEdit'].includes(match[0].kind)",
     "!['newChat','background','customInstructions','persona','supplement','chatSettings','tutorial','summary','roleEdit','resetChat'].includes(match[0].kind)"),

    # 文案统一：HUD 里已经改叫「返回原生页」，模型面板的报错别再提 MMD
    ('models.js',
     "'原生面板存在多个候选，请返回 MMD 处理。'",
     "'原生面板存在多个候选，请返回原生页处理。'"),

    # ══════════════════════════════════════════════════════════════════════
    # 2026-10-29 真站实测（meimoai15 / roleId=114739）：模型设置点了没反应
    #
    # capture() 的 revision 是「整张模型表」的 hash，而真站的列表在打开后
    # 还在异步补成功率 / 电量 / 描述 —— 一秒能变好几次。hud 拿到快照里的旧
    # revision，点下去必然对不上：
    #     listTarget()  →  payload.revision !== capture().revision  →  STALE_TARGET
    # 于是每次点「模型设置」都被判「列表已更新」，原生设置页根本没开。
    # （错误又被 frame-models 的「这个模型没有打开设置页」盖住，看起来就像按钮还在灰）
    #
    # 改：revision 不再参与放行判断，只保留「目标元素还在页面上、类型对得上」。
    # 设置面板内的动作同理 —— 那些 revision 一样会被异步刷新踩中。
    # ══════════════════════════════════════════════════════════════════════
    ('models.js',
     "        if (payload.revision !== state.modelPanel.revision) C.fail('STALE_TARGET', '模型列表已更新，请重新选择');\n        const target = targets.get(id);\n        if (!target || target.kind !== kind) C.fail('STALE_TARGET', '模型目标已失效');",
     """        /* 整表 hash 会被异步刷新踩中 → 只校验条目本身还在 */
        const target = targets.get(id);
        if (!target || target.kind !== kind || !target.el.isConnected) C.fail('STALE_TARGET', '列表已经刷新，请重新打开再点');"""),

    ('models.js',
     "          if (payload.revision !== capture().modelPanel.revision) C.fail('STALE_TARGET', '模型列表已更新，请重新操作');\n          click(closeList(one(document, S.list)));",
     """          const openPanel = one(document, S.list);
          if (!openPanel) C.fail('NOT_AVAILABLE', '模型列表没开');
          click(closeList(openPanel));"""),

    ('models.js',
     "          if (payload.revision !== cfg.revision) C.fail('STALE_TARGET', '模型设置已更新，请重新操作');\n          const panel = one(document, S.config);",
     """          if (!cfg.open) C.fail('NOT_AVAILABLE', '模型设置面板没开');
          const panel = one(document, S.config);"""),

    # ══════════════════════════════════════════════════════════════════════
    # actions-dom.js：消息正文要同时给两份
    #   text = innerText  → 显示用，保留换行与排版；hidden 的状态块被浏览器跳过
    #   raw  = textContent → 解析用，hidden 只是不渲染，文本节点仍在
    # 只给 innerText 时，`<rex-status hidden>` 与 `[rex-status]` 包裹块都读不到，
    # 症状就是「HUD 停在开场白 / 新状态不覆盖旧状态」。
    # ══════════════════════════════════════════════════════════════════════
    ('actions-dom.js',
     "        return { id, index, role, text: (content?.innerText || content?.textContent || '').slice(0, 6000), fingerprint: fingerprint(C.canonical(sig)),",
     """        return { id, index, role, text: (content?.innerText || content?.textContent || '').slice(0, 6000),
          /* raw：textContent 含被 hidden 藏掉的状态块，只给解析用，不能拿去渲染 */
          raw: String(content?.textContent || '').slice(0, 16000), fingerprint: fingerprint(C.canonical(sig)),"""),

    # ══════════════════════════════════════════════════════════════════════
    # host.js：回到游戏时通知 Frame
    #   「返回原生页」把 shell 藏起来，原生页上的「返回游戏」再 show()。
    #   Frame 收不到任何信号，手机端会带着上次的导航页重新出现。
    # ══════════════════════════════════════════════════════════════════════
    ('host.js',
     "function show() { if (shell) { shell.hidden = false; shell.style.display = 'flex'; returnButton.hidden = true; lastSnapshot = ''; publish(); } }",
     "function show() { if (shell) { shell.hidden = false; shell.style.display = 'flex'; returnButton.hidden = true; lastSnapshot = ''; publish(); }\n      try { post({ type: 'hud', state: 'show' }); } catch (_) {} }"),

    # ══════════════════════════════════════════════════════════════════════
    # actions-dom.js：「更多」菜单
    #   1) 只认 :scope > .item，新版多包一层 .item-scope 就一行都读不到，
    #      HUD 里所有「只能从更多菜单进」的入口（重置聊天 / 编辑角色 / 教程）全哑。
    #   2) available 判 enabled()：菜单淡入时 pointer-events / opacity 会让它判死，
    #      于是「拿得到条目、点不动」。
    # ══════════════════════════════════════════════════════════════════════
    ('actions-dom.js',
     "      p = panel('moreMenu'); data.moreMenu.items = all(p, ':scope > .item').map(el => {",
     """      p = panel('moreMenu');
      const moreRows = p ? [...new Set([...p.querySelectorAll(':scope > .item, .item')])]
        .filter(el => el.querySelector('.item-title')) : [];
      data.moreMenu.items = moreRows.map(el => {"""),

    ('actions-dom.js',
     "        return { id: bind(el, 'more'), label, icon: icon.split('/').pop().split(/[?#]/)[0], kind,\n          available: kind !== 'unknown' && enabled(el), destructive: label === '重置聊天' || icon.includes('ico_reset2_dark.png') };",
     "        return { id: bind(el, 'more'), label, icon: icon.split('/').pop().split(/[?#]/)[0], kind,\n          available: kind !== 'unknown', destructive: /重置|重开|重新开始/.test(label) || icon.includes('ico_reset2_dark.png') };"),


    # ══════════════════════════════════════════════════════════════════════
    # actions-handlers.js：菜单项 id 会随每次 capture 重绑
    #   HUD 手里那份 itemId 一旦过期，`s.items.find` 找不到就直接
    #   NOT_AVAILABLE —— 表现就是「点了重置聊天，没反应」。
    #   破坏性操作本来就要按文案在现网菜单里找节点，这里让守卫也走同一条路。
    # ══════════════════════════════════════════════════════════════════════
    # openMoreMenu 只等面板出现、不等条目填充：HUD 第一次拉快照常常items为空，
    # 于是「第一次点重置没反应、第二次才成功」。这里等条目真的挂上再返回。
    ('actions-handlers.js',
     "      async function openMore() { if (!panel('moreMenu')) { click(moreEntry()); await wait(() => panel('moreMenu')); } }",
     """      async function openMore() {
        if (!panel('moreMenu')) { click(moreEntry()); await wait(() => panel('moreMenu')); }
        try {
          await wait(() => { const p = panel('moreMenu'); return p && p.querySelectorAll('.item').length > 0; }, 1600);
        } catch (_) {}
      }"""),

    ('actions-handlers.js',
     "        case 'activateMoreMenuItem': {\n          const row = s.items.find(i => i.id === p.itemId);\n          if (!row?.available) C.fail('NOT_AVAILABLE');",
     """        case 'activateMoreMenuItem': {
          let row = s.items.find(i => i.id === p.itemId);
          /* id 过期（每次 capture 都会重绑）：按文案在现网菜单里兜底认一次 */
          if (!row) {
            const sc = document.querySelector('.more-scope') || document.querySelector('.more-popup');
            const liveEl = sc && [...sc.querySelectorAll('.item')]
              .find(e => /重置|重开|重新开始/.test((e.querySelector('.item-title') || {}).textContent || ''));
            if (liveEl) row = { id: '', kind: 'resetChat', destructive: true, available: true };
          }
          if (!row?.available) C.fail('NOT_AVAILABLE');"""),

    # 更多菜单容器：新版若换成 .more-popup，只认 .more-scope 会「点了没反应」
    ('actions-dom.js',
     "sharePanel: '.u-popup .share-popup', moreMenu: '.more-scope',",
     "sharePanel: '.u-popup .share-popup', moreMenu: '.more-scope, .more-popup',"),

    # ══════════════════════════════════════════════════════════════════════
    # 2026-11-05 真站实测（meimoai15 / roleId=114739）：AI 气泡新增「生图」
    #
    # 最后一条 AI 的 .modify-btn-scope 从 3 个按钮变成 4 个：
    #   80×81 重新生成 / 56×57 编辑 / 200×200 复制 / 200×200 生图
    # 点第 4 个 → 原生 `.cimg-seg`「选择生图段落」弹层（单段生图 / 合并生图，
    # 段落来自该条 AI 正文，生成按段计费）。生图与复制同尺寸、图标都是
    # data:URL（src 里读不到文案），只能按位置认：复制在前、生图在后。
    # 尺寸签名对不上时退回原来的「文案 + 尺寸」识别，不硬猜。
    # ══════════════════════════════════════════════════════════════════════
    ('actions-dom.js',
     """        const result = {}; let structural = false;
        const expected = buttons.length === 3 ? ['regenerate', 'edit'] : ['edit'];
        const dimensions = { regenerate: '80x81', edit: '56x57', copy: '200x200' };
        function size(button) { const img = unique([...button.querySelectorAll('img')]); return img ? (img.naturalWidth || img.width) + 'x' + (img.naturalHeight || img.height) : ''; }
        for (const button of buttons) {""",
     """        const result = {};
        const size = button => { const img = unique([...button.querySelectorAll('img')]); return img ? (img.naturalWidth || img.width) + 'x' + (img.naturalHeight || img.height) : ''; };
        /* 尺寸签名 → 按钮语义；复制与生图同为 200×200，靠顺序区分（复制在前、生图在后） */
        const shapes = [
          { sizes: ['80x81', '56x57', '200x200', '200x200'], keys: ['regenerate', 'edit', 'copy', 'imageGen'] },
          { sizes: ['80x81', '56x57', '200x200'], keys: ['regenerate', 'edit', 'copy'] },
          { sizes: ['56x57', '200x200', '200x200'], keys: ['edit', 'copy', 'imageGen'] },
          { sizes: ['56x57', '200x200'], keys: ['edit', 'copy'] }
        ];
        const shape = shapes.find(row => C.canonical(row.sizes) === C.canonical(buttons.map(size)));
        if (shape) { buttons.forEach((button, i) => { result[shape.keys[i]] = button; }); return result; }
        /* 旧结构兜底：按钮带可见文案或真实图标地址时按语义认 */
        let structural = false;
        const expected = buttons.length === 3 ? ['regenerate', 'edit'] : ['edit'];
        const dimensions = { regenerate: '80x81', edit: '56x57', copy: '200x200' };
        for (const button of buttons) {"""),

    ('actions-dom.js',
     "          capabilities: { copy: !!content, edit: enabled(buttons.edit), delete: !!content && role !== 'unknown',",
     "          capabilities: { copy: !!content, edit: enabled(buttons.edit), imageGen: enabled(buttons.imageGen), delete: !!content && role !== 'unknown',"),

    ('actions.js',
     "    messages: ['copyMessage', 'regenerateMessage', 'openEditMessage', 'deleteMessage', 'rollbackMessage', 'startNewStoryFromMessage'],",
     "    messages: ['copyMessage', 'regenerateMessage', 'openEditMessage', 'openImageGen', 'deleteMessage', 'rollbackMessage', 'startNewStoryFromMessage'],"),

    ('actions.js',
     "    setInputText: ['text'], copyMessage: ['messageId'], regenerateMessage: ['messageId'], openEditMessage: ['messageId'],",
     "    setInputText: ['text'], copyMessage: ['messageId'], regenerateMessage: ['messageId'], openEditMessage: ['messageId'], openImageGen: ['messageId'],"),

    ('actions.js',
     "  const messageCaps = { copy: bool, edit: bool, delete: bool, regenerate: bool, rollback: bool, startNewStory: bool };",
     "  const messageCaps = { copy: bool, edit: bool, delete: bool, regenerate: bool, rollback: bool, startNewStory: bool, imageGen: bool };"),

    ('actions-handlers.js',
     """      if (['copyMessage', 'deleteMessage', 'rollbackMessage', 'startNewStoryFromMessage', 'regenerateMessage', 'openEditMessage'].includes(action)) {
        const key = { copyMessage: 'copy', deleteMessage: 'delete', rollbackMessage: 'rollback', startNewStoryFromMessage: 'startNewStory', regenerateMessage: 'regenerate', openEditMessage: 'edit' }[action];""",
     """      if (['copyMessage', 'deleteMessage', 'rollbackMessage', 'startNewStoryFromMessage', 'regenerateMessage', 'openEditMessage', 'openImageGen'].includes(action)) {
        const key = { copyMessage: 'copy', deleteMessage: 'delete', rollbackMessage: 'rollback', startNewStoryFromMessage: 'startNewStory', regenerateMessage: 'regenerate', openEditMessage: 'edit', openImageGen: 'imageGen' }[action];"""),

    # 生图：点该条消息的第 4 个按钮 → 原生「选择生图段落」弹层。
    # 弹层未镜像进 HUD —— 由 Frame 收 HUD 让位，玩家在原生弹层里选段生成。
    ('actions-handlers.js',
     "        case 'openEditMessage': {",
     """        case 'openImageGen': {
          const item = boundMessage(p);
          if (!item.row.capabilities.imageGen || !item.buttons.imageGen) C.fail('NOT_AVAILABLE');
          const popup = () => [...document.querySelectorAll('.cimg-seg')].find(x => x.getClientRects().length) || null;
          /* 弹层已经开着就不要再点一次按钮 */
          if (popup()) return result('already-open', { messageId: item.id });
          click(item.buttons.imageGen);
          await wait(() => popup());
          checkBound(item);
          const body = popup();
          return result('opened', { messageId: item.id,
            segments: body ? body.querySelectorAll('.cimg-seg-item').length : 0 });
        }
        case 'openEditMessage': {"""),

    # ══════════════════════════════════════════════════════════════════════
    # 2026-11-05 · 生图段落弹层做进 HUD（.cimg-seg 投影 + 代驾）
    #
    # 原生「选择生图段落」的结构（真站实测）：
    #   .cimg-seg.cimg-pop.dark
    #     .cimg-seg-hdr > .cimg-seg-h3 + .cimg-pop-close
    #     .cimg-seg-toggle > .cimg-seg-toggle-item(.active)  单段生图 / 合并生图
    #     .cimg-seg-banner（仅合并模式）
    #     .cimg-seg-body > .cimg-seg-list > … > .cimg-seg-item(.active/.disabled)
    #        > .cimg-seg-check + .cimg-seg-text
    #     .cimg-seg-foot > .cimg-seg-info + .cimg-seg-go(.off)
    #        > 文字（生成 / 生成中）+ .cimg-seg-cost（⚡N）
    # HUD 只做投影与代点：模式、段落、生成都写回原生弹层，不自己算钱。
    # ══════════════════════════════════════════════════════════════════════
    ('actions-dom.js',
     "  const panels = { editPanel: '.msg-modify-scope', sharePanel: '.u-popup .share-popup', moreMenu: '.more-scope, .more-popup',",
     "  const panels = { editPanel: '.msg-modify-scope', imageGen: '.cimg-seg', sharePanel: '.u-popup .share-popup', moreMenu: '.more-scope, .more-popup',"),

    ('actions-dom.js',
     "      state = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, revisions.stamp(key, value, bindings[key])]));",
     """      /* 生图段落：段来自该条 AI 正文，单段/合并两种模式，生成按平台电量计费 */
      p = panel('imageGen');
      const segRows = p ? [...p.querySelectorAll('.cimg-seg-item')] : [];
      const segOn = segRows.filter(el => /(?:^|\\s)active(?:\\s|$)/.test(String(el.className)));
      const segToggle = p ? [...p.querySelectorAll('.cimg-seg-toggle-item')] : [];
      const segMerge = segToggle.findIndex(el => /(?:^|\\s)active(?:\\s|$)/.test(String(el.className))) === 1;
      const segGo = p ? one(p, '.cimg-seg-go') : null;
      const segGoOff = !!segGo && /(?:^|\\s)off(?:\\s|$)/.test(String(segGo.className));
      data.imageGen = { open: !!p, title: text(p?.querySelector('.cimg-seg-h3')) || '选择生图段落',
        merge: segMerge, banner: text(p?.querySelector('.cimg-seg-banner')),
        modes: segToggle.map((el, index) => ({ id: bind(el, 'imgmode', { index }), index, label: text(el),
          selected: /(?:^|\\s)active(?:\\s|$)/.test(String(el.className)), disabled: false })),
        segments: segRows.map((el, index) => ({
          id: bind(el, 'segment', { index }), index,
          label: text(el.querySelector('.cimg-seg-text')) || text(el),
          selected: /(?:^|\\s)active(?:\\s|$)/.test(String(el.className)),
          disabled: /(?:^|\\s)disabled(?:\\s|$)/.test(String(el.className)) })),
        selectedCount: segOn.length, imageCount: segMerge && segOn.length ? 1 : segOn.length,
        price: Number((text(p?.querySelector('.cimg-seg-cost')).match(/(\\d+)/) || [])[1] || 0),
        cost: text(p?.querySelector('.cimg-seg-cost')),
        canGenerate: !!segGo && !segGoOff && segOn.length > 0,
        submitting: /生成中/.test(text(segGo)) };
      bindings.imageGen = [bindings.imageGen, ...data.imageGen.modes.map(x => x.id), ...data.imageGen.segments.map(x => x.id)];
      state = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, revisions.stamp(key, value, bindings[key])]));"""),

    ('actions.js',
     "    messages: ['copyMessage', 'regenerateMessage', 'openEditMessage', 'openImageGen', 'deleteMessage', 'rollbackMessage', 'startNewStoryFromMessage'],",
     "    messages: ['copyMessage', 'regenerateMessage', 'openEditMessage', 'openImageGen', 'deleteMessage', 'rollbackMessage', 'startNewStoryFromMessage'],\n    imageGen: ['setImageGenMode', 'selectImageSegment', 'submitImageGen', 'closeImageGen'],"),

    ('actions.js',
     "    setEditText: ['text'], applyEditTransform: ['transformId'], submitEditMessage: ['messageId', 'text'],",
     "    setEditText: ['text'], applyEditTransform: ['transformId'], submitEditMessage: ['messageId', 'text'],\n    setImageGenMode: ['modeId'], selectImageSegment: ['segmentId'],"),

    ('actions.js',
     "    summaryPanel: { open: bool, title: str, autoOn: bool, autoText: str, rounds: num, content: str, count: str,",
     "    imageGen: { open: bool, title: str, merge: bool, banner: str, modes: [option],\n      segments: [{ id: str, index: num, label: str, selected: bool, disabled: bool }],\n      selectedCount: num, imageCount: num, price: num, cost: str, canGenerate: bool, submitting: bool },\n    summaryPanel: { open: bool, title: str, autoOn: bool, autoText: str, rounds: num, content: str, count: str,"),

    ('actions-handlers.js',
     "        return s.messages.items.some(m => m.capabilities[key]);\n      }\n      switch (action) {",
     """        return s.messages.items.some(m => m.capabilities[key]);
      }
      if (action === 'setImageGenMode') return !!panel('imageGen') && s.imageGen.modes.length > 1;
      if (action === 'selectImageSegment') return !!panel('imageGen') && s.imageGen.segments.some(x => !x.disabled);
      if (action === 'submitImageGen') return !!panel('imageGen') && s.imageGen.canGenerate && !s.imageGen.submitting;
      if (action === 'closeImageGen') return !!panel('imageGen');
      switch (action) {"""),

    ('actions-handlers.js',
     "        case 'openEditMessage': {",
     """        case 'setImageGenMode': {
          const owner = panel('imageGen'); if (!owner) C.fail('NOT_AVAILABLE', '生图弹层没开');
          const row = target(p.modeId, 'imgmode').el;
          if (!owner.contains(row)) C.fail('STALE_TARGET');
          click(row);
          await wait(() => /(?:^|\\s)active(?:\\s|$)/.test(String(row.className)));
          return result('mode-observed');
        }
        case 'selectImageSegment': {
          const owner = panel('imageGen'); if (!owner) C.fail('NOT_AVAILABLE', '生图弹层没开');
          const row = target(p.segmentId, 'segment').el;
          if (!owner.contains(row)) C.fail('STALE_TARGET');
          if (/(?:^|\\s)disabled(?:\\s|$)/.test(String(row.className))) C.fail('NOT_AVAILABLE', '这一段原生不给选');
          const before = /(?:^|\\s)active(?:\\s|$)/.test(String(row.className));
          click(row);
          await wait(() => /(?:^|\\s)active(?:\\s|$)/.test(String(row.className)) !== before);
          return result(before ? 'deselected' : 'selected');
        }
        case 'submitImageGen': {
          const owner = panel('imageGen'); if (!owner) C.fail('NOT_AVAILABLE', '生图弹层没开');
          const go = one(owner, '.cimg-seg-go');
          if (!go || /(?:^|\\s)off(?:\\s|$)/.test(String(go.className))) C.fail('NOT_AVAILABLE', '还没有选段落');
          click(go);
          /* 平台进入「生成中」，任务建好后弹层自己关；这里只确认提交已发生 */
          await wait(() => { const now = panel('imageGen'); return !now || /生成中/.test(text(one(now, '.cimg-seg-go'))); }, 4000);
          return result('submitted');
        }
        case 'closeImageGen': {
          const owner = panel('imageGen'); if (!owner) return result('closed');
          const btn = one(owner, '.cimg-pop-close');
          if (!btn) C.fail('NOT_AVAILABLE', '这个弹层没有关闭入口');
          click(btn);
          await wait(() => !panel('imageGen'));
          return result('closed');
        }
        case 'openEditMessage': {"""),
    # 097 回溯：确认框只在「真的有布局盒」的里找；文案 / 确定按钮 / 结果形态各版本不同，都不死等
    ('actions-handlers.js',
     r'''    const confirmPanels = () => all(document, '.u-popup__content .confirm-scope');
    function confirmDialog(kind) {
      /* 只用整段文案判定，再靠关键词区分目标：真站有的版本没有 .confirm-title */
      return unique(confirmPanels().filter(p => {
        const whole = [text(p.querySelector('.confirm-title')), text(p.querySelector('.confirm-content'))].filter(Boolean).join(' ');
        if (!/删除|回溯/.test(whole)) return false;
        if (kind === 'conversation') return /聊天|会话|记录/.test(whole);
        if (kind === 'rollback') return /回溯/.test(whole);
        if (kind === 'instruction') return /指令/.test(whole);
        return /消息/.test(whole);
      }));
    }''',
     r'''    /* 确认框的容器各版本不同：有的挂在 .u-popup__content 里，有的直接铺在 body。
       这里一律按「有布局盒」筛，隐藏模板（删除聊天 / 回溯 / 重置共用 .confirm-scope）不参与判定。 */
    const confirmPanels = () => all(document, '.u-popup__content .confirm-scope, .confirm-scope, .confirm-box');
    /* 确认框的「确定」：类名在各版本里换过（.ok-btn / .confirm-btn / 纯文案），按文案兜底一次 */
    function confirmOk(dialog) {
      if (!dialog) return null;
      return one(dialog, '.confirm-bottom > .ok-btn') || one(dialog, '.ok-btn')
        || unique(all(dialog, 'button, uni-button, .btn, .confirm-btn')
          .filter(el => enabled(el) && /^(确定|确认|继续|删除|回溯)$/.test(text(el))));
    }
    function confirmDialog(kind) {
      /* 只用整段文案判定，再靠关键词区分目标：真站有的版本没有 .confirm-title */
      const panels = confirmPanels().filter(p => visible(p));
      const match = panels.filter(p => {
        const whole = [text(p.querySelector('.confirm-title')), text(p.querySelector('.confirm-content'))].filter(Boolean).join(' ');
        if (!/删除|回溯/.test(whole)) return false;
        if (kind === 'conversation') return /聊天|会话|记录/.test(whole);
        if (kind === 'rollback') return /回溯/.test(whole);
        if (kind === 'instruction') return /指令/.test(whole);
        return /消息/.test(whole);
      });
      if (match.length === 1) return match[0];
      /* 文案换过说法（只说「删除此消息下方的所有消息」）时不能死等：
         屏上只有一个确认框、且有确定按钮，那就是刚弹出来的这一个 —— 这时不可能有别的待确认操作。 */
      if (kind === 'rollback' && !match.length && panels.length === 1 && confirmOk(panels[0])) return panels[0];
      return null;
    }'''),

    # 097 回溯：确认框只在「真的有布局盒」的里找；文案 / 确定按钮 / 结果形态各版本不同，都不死等
    ('actions-handlers.js',
     r'''        case 'deleteMessage': case 'rollbackMessage': {
          const key = action === 'deleteMessage' ? 'deletion' : 'rollback';
          const item = boundMessage(p);
          if (confirmPanels().length) C.fail('NATIVE_PANEL_BUSY');
          const before = capture().messages.items, menu = await messageMenu(item); checkBound(item);
          click(menu.options[key === 'deletion' ? '删除' : '回溯']);
          if (key === 'deletion') {
            await wait(() => !item.el.isConnected || confirmDialog('message'));
            const dialog = confirmDialog('message');
            if (dialog) { if (confirmPanels().length !== 1) C.fail('PLATFORM_CHANGED'); checkBound(item); click(one(dialog, '.confirm-bottom > .ok-btn')); }
          } else {
            const dialog = await wait(() => confirmDialog('rollback')); if (confirmPanels().length !== 1) C.fail('PLATFORM_CHANGED');
            checkBound(item); click(one(dialog, '.confirm-bottom > .ok-btn'));
          }
          const expected = (key === 'deletion' ? before.filter(x => x.id !== item.id) : before.filter(x => x.index <= item.index)).map(x => [x.id, x.fingerprint]);
          await wait(() => C.canonical(capture().messages.items.map(x => [x.id, x.fingerprint])) === C.canonical(expected));
          return result(key === 'deletion' ? 'deleted' : 'rollback-observed', { messageId: item.id });
        }''',
     r'''        case 'deleteMessage': case 'rollbackMessage': {
          const key = action === 'deleteMessage' ? 'deletion' : 'rollback';
          const item = boundMessage(p);
          /* 常驻 DOM、display:none 的确认框模板（删除聊天 / 重置）不算「已有弹窗」，
             否则一点回溯就被自己的模板判成 NATIVE_PANEL_BUSY。 */
          if (confirmPanels().some(visible)) C.fail('NATIVE_PANEL_BUSY');
          const before = capture().messages.items;
          /* 最后一条后面没有内容：不进原生流程，也不假装成功 —— 平台自己也会把它当空操作 */
          if (key === 'rollback' && item.index >= before.length - 1) {
            return result('rollback-observed', { messageId: item.id, noop: true });
          }
          const menu = await messageMenu(item); checkBound(item);
          click(menu.options[key === 'deletion' ? '删除' : '回溯']);
          /* 回滚后平台常整段重渲染：绑定的元素 id 会换，只有「角色 + 正文」还认得出来。
             目标消息保不保留也不一定（有的版本连它一起回溯），两种结果都算成功。 */
          const sig = rows => C.canonical(rows.map(x => [x.role, String(x.text || '').slice(0, 200)]));
          const keep = key === 'deletion' ? before.filter(x => x.id !== item.id) : before.filter(x => x.index <= item.index);
          const drop = key === 'deletion' ? keep : before.filter(x => x.index < item.index);
          const wantKeep = sig(keep), wantDrop = sig(drop);
          const done = () => { const now = sig(capture().messages.items); return now === wantKeep || now === wantDrop; };
          if (key === 'deletion') {
            await wait(() => !item.el.isConnected || confirmDialog('message') || done());
            const dialog = confirmDialog('message');
            if (dialog) { checkBound(item); const go = confirmOk(dialog); if (!go) C.fail('PLATFORM_CHANGED', '确认框里没有确定按钮'); click(go); }
          } else {
            /* 等不到确认框不等于失败：有的版本点完就地回溯，没有第二道确认。
               文案换过说法的版本由 confirmDialog 的兜底接住，不再死等 4.5 秒把框挂在屏幕上。 */
            const dialog = await wait(() => confirmDialog('rollback') || (done() ? 'done' : null));
            if (dialog !== 'done') { checkBound(item); const go = confirmOk(dialog); if (!go) C.fail('PLATFORM_CHANGED', '回溯确认框里没有确定按钮'); click(go); }
          }
          await wait(done);
          return result(key === 'deletion' ? 'deleted' : 'rollback-observed', { messageId: item.id });
        }'''),

    # 097 回溯：确认框只在「真的有布局盒」的里找；文案 / 确定按钮 / 结果形态各版本不同，都不死等
    ('actions-dom.js',
     r'''    const LAYERS = '.role-profile-modal, .conv-style-modal, .custom-instruction-scope, .instruction-bar, ' +
      '.modify-scope, .conversation-list-scope, .more-scope, .role-extra-setting, .u-popup__content';''',
     r'''    const LAYERS = '.role-profile-modal, .conv-style-modal, .custom-instruction-scope, .instruction-bar, ' +
      '.modify-scope, .conversation-list-scope, .more-scope, .msg-option-scope, .role-extra-setting, .u-popup__content';'''),

    # 097 回溯：确认框只在「真的有布局盒」的里找；文案 / 确定按钮 / 结果形态各版本不同，都不死等
    ('actions-dom.js',
     r'''          capabilities: { copy: !!content, edit: enabled(buttons.edit), imageGen: enabled(buttons.imageGen), delete: !!content && role !== 'unknown',
            regenerate: index === items.length - 1 && enabled(buttons.regenerate), rollback: !!content && role !== 'unknown', startNewStory: !!content && role === 'assistant' } };''',
     r'''          capabilities: { copy: !!content, edit: enabled(buttons.edit), imageGen: enabled(buttons.imageGen), delete: !!content && role !== 'unknown',
            regenerate: index === items.length - 1 && enabled(buttons.regenerate),
            /* 回溯 = 砍掉这条之后的内容：最后一条后面什么都没有，给了按钮也是空点 */
            rollback: !!content && role !== 'unknown' && index < items.length - 1,
            startNewStory: !!content && role === 'assistant' } };'''),


    # 100 回溯：真站确认框是 .mmd-confirm（uni-popup 里，按钮 .mmd-ok 文案「回溯」），不是 .confirm-scope
    ('actions-handlers.js',
     r'''    /* 确认框的容器各版本不同：有的挂在 .u-popup__content 里，有的直接铺在 body。
       这里一律按「有布局盒」筛，隐藏模板（删除聊天 / 回溯 / 重置共用 .confirm-scope）不参与判定。 */
    const confirmPanels = () => all(document, '.u-popup__content .confirm-scope, .confirm-scope, .confirm-box');
    /* 确认框的「确定」：类名在各版本里换过（.ok-btn / .confirm-btn / 纯文案），按文案兜底一次 */
    function confirmOk(dialog) {
      if (!dialog) return null;
      return one(dialog, '.confirm-bottom > .ok-btn') || one(dialog, '.ok-btn')
        || unique(all(dialog, 'button, uni-button, .btn, .confirm-btn')
          .filter(el => enabled(el) && /^(确定|确认|继续|删除|回溯)$/.test(text(el))));
    }''',
     r'''    /* 确认框的容器各版本不同：.confirm-scope（聊天记录 / 重置那套）、.mmd-confirm（消息删除 / 回溯，
       装在 uni-popup 里）、以及直接铺在 body 的 .confirm-box。一律按「有布局盒」筛，
       常驻 DOM 的隐藏模板不参与判定。 */
    const confirmPanels = () => all(document, '.u-popup__content .confirm-scope, .confirm-scope, .confirm-box, .mmd-confirm');
    /* 确认框的「确定」：色名各版本换过（.ok-btn / .confirm-btn / .mmd-ok / 纯文案），按文案兜底一次 */
    function confirmOk(dialog) {
      if (!dialog) return null;
      return one(dialog, '.confirm-bottom > .ok-btn') || one(dialog, '.ok-btn') || one(dialog, '.mmd-ok')
        || unique(all(dialog, 'button, uni-button, .btn, .confirm-btn, .mmd-ok')
          .filter(el => enabled(el) && /^(确定|确认|继续|删除|回溯)$/.test(text(el))));
    }'''),

    # 100 回溯：菜单是 toggle（开着时再长按会关掉），且用户消息的菜单同样是四项
    ('actions-handlers.js',
     r'''      async function messageMenu(item) {
        if (one(document, '.msg-option-scope')) C.fail('NATIVE_PANEL_BUSY', '请先关闭既有消息菜单');
        checkBound(item); check();''',
     r'''      async function messageMenu(item) {
        /* 平台的菜单是 toggle：已经开着的时候再长按会把它关掉 —— 先点掉再重开 */
        const opened = one(document, '.msg-option-scope');
        if (opened) { opened.click(); await new Promise(r => setTimeout(r, 220)); }
        checkBound(item); check();'''),

    ('actions-handlers.js',
     r'''        const options = all(menu, '.msg-options-box > .option-item'), expected = item.row.role === 'assistant' ? ['复制', '删除', '回溯', '开启新的故事'] : ['复制', '删除', '回溯'];
        if (C.canonical(options.map(text)) !== C.canonical(expected)) C.fail('PLATFORM_CHANGED', '消息菜单结构不匹配');''',
     r'''        const options = all(menu, '.msg-options-box > .option-item'), labels = options.map(text);
        /* 只要求用得到的项在：真站用户消息的菜单同样是四项（也带「开启新的故事」），按条数硬比会误判 */
        if (!['复制', '删除', '回溯'].every(l => labels.includes(l))) C.fail('PLATFORM_CHANGED', '消息菜单结构不匹配');'''),


    # 100 回溯：菜单要按住 1 秒才弹（真站逻辑），这里只是把这条写进注释
    ('actions-handlers.js',
     r'''        el.dispatchEvent(new view.MouseEvent('mousedown', init));
        let menu;
        try { menu = await wait(() => one(document, '.msg-option-scope')); }''',
     r'''        el.dispatchEvent(new view.MouseEvent('mousedown', init));
        let menu;
        /* 真站是「按住 1 秒」才弹菜单，wait 会一直按着不放，直到菜单出现或超时 */
        try { menu = await wait(() => one(document, '.msg-option-scope')); }'''),

    # 100 回溯：确认后要等接口往返，4.5 秒偶尔不够
    ('actions-handlers.js',
     r'''          await wait(done);
          return result(key === 'deletion' ? 'deleted' : 'rollback-observed', { messageId: item.id });''',
     r'''          /* 真站确认后要等一次接口往返，4.5 秒有时不够 */
          await wait(done, 8000);
          return result(key === 'deletion' ? 'deleted' : 'rollback-observed', { messageId: item.id });'''),

]


def apply_all(src_dir):
    done = []
    for name, old, new in PATCHES:
        p = os.path.join(src_dir, name)
        s = open(p, encoding='utf-8-sig').read()
        assert old in s, '上游已变，补丁失效：%s 里找不到 %r' % (name, old[:60])
        s = s.replace(old, new, 1)
        open(p, 'w', encoding='utf-8', newline='\n').write(s)
        done.append(name)
    return done


if __name__ == '__main__':
    import sys
    base = os.path.dirname(os.path.abspath(__file__))
    target = sys.argv[1] if len(sys.argv) > 1 else os.path.join(base, '..', 'kit')
    print('patched:', apply_all(target))
