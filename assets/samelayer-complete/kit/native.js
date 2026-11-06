/* Original adapters. Selectors are observations, not a stable MMD API contract. */
(function (G) {
  'use strict';
  const C = G.MmdSameLayerCore;
  function scopeReader(config) {
    return () => {
      try {
        const value = config.readScope?.();
        if (!value) return null;
        const scope = { ...value, appId: config.appId };
        C.scopeKey(scope);
        return Object.fromEntries(['appId', 'accountKey', 'roleId', 'conversationKey'].map(key => [key, scope[key]]));
      } catch (_) { return null; }
    };
  }
  // Old MMD has two mirrored textareas and a deliberately hidden send proxy.
  // Accept only one observed visible composer; do not broaden to arbitrary textareas.
  function inputControls(document) {
    const view = document.defaultView;
    const visible = el => el?.isConnected && el.getClientRects().length && !el.closest('[hidden]') &&
      view.getComputedStyle(el).visibility !== 'hidden' && view.getComputedStyle(el).display !== 'none';
    const usable = el => !el.disabled && !el.readOnly && !el.hasAttribute('disabled') &&
      !el.classList.contains('disabled') && el.getAttribute('aria-disabled') !== 'true';
    const scopes = [...document.querySelectorAll('#chat-input-scope,.chat-bottom .chat-input-scope')].filter(visible);
    const scope = scopes.length === 1 ? scopes[0] : null;
    let inputs = [];
    if (scope) {
      inputs = [...scope.querySelectorAll('.chatMsgTextarea:not(.chat-input-collapsed-preview) textarea.uni-textarea-textarea')].filter(usable);
      if (!inputs.length) inputs = [...scope.querySelectorAll('textarea.uni-textarea-textarea')].filter(el => usable(el) && !el.readOnly);
    }
    if (!inputs.length) inputs = [...document.querySelectorAll('textarea')].filter(el => visible(el) && usable(el));
    let proxies = scope ? [...scope.querySelectorAll('.chat-send-proxy')].filter(el => el.isConnected && usable(el)) : [];
    if (!proxies.length) {
      proxies = [...document.querySelectorAll('[class*="send"],button')].filter(el => visible(el) && usable(el) &&
        /send|发送/i.test(String(el.className) + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.textContent || '')));
    }
    return { input: inputs.length ? inputs[inputs.length - 1] : null, send: proxies.length ? proxies[proxies.length - 1] : null };
  }
  G.MmdSameLayerInput = Object.freeze({ resolve: inputControls });
  function messageItems(document, list) {
    const pick = sel => [...((list || document).querySelectorAll(sel))];
    /* 先按「class 里带 ai / self 单词」抓，大小写与别名都能覆盖 */
    let items = [...((list || document).querySelectorAll('[class*="item"]'))]
      .filter(el => /(^|\s)(ai|self)(\s|$)/i.test(String(el.className || '')));
    if (!items.length) items = pick('.item.Ai, .item.self');
    if (!items.length) items = pick('[class*="item"][class*="Ai"],[class*="item"][class*="self"]');
    /* 手机端：class 名可能换成小写/别名，content 的左右侧也放宽 */
    if (!items.length) items = [...document.querySelectorAll('.content.left,.content.right,[class*="content"][class*="left"],[class*="content"][class*="right"]')].map(el => el.parentElement).filter(Boolean);
    if (!items.length) items = [...document.querySelectorAll('[class*="item"]')].filter(el => /(^|\s)(ai|self)(\s|$)/i.test(String(el.className || '')));
    if (!items.length) items = [...document.querySelectorAll('#msglistview > *, #msglist > *, .msglist > *, .msg-list > *, .chat-msg-list > *, .chat-content .list > *')]
      .filter(el => el.querySelector('[class*="content"]'));
    if (!items.length) items = [...document.querySelectorAll('[class*="msg"]')].filter(el => el.querySelector('[class*="content"]'));
    return items;
  }
  function dom(document, config) {
    const ids = new WeakMap(); let counter = 0;
    const models = G.MmdSameLayerModels?.dom(document, config);
    const features = G.MmdSameLayerActionDOM?.dom(document, config);
    const root = () => document.querySelector('#msglistview') ||
      document.querySelector('#msglist, .msglist, .msg-list, .message-list, .chat-msg-list, .chat-content .list') ||
      document.body;
    const controls = () => inputControls(document);

    return {
      scope: scopeReader(config), identity: () => root() || document.body, start() {}, cancel() { models?.cancel(); features?.cancel(); }, destroy() { models?.destroy(); features?.destroy(); },
      snapshot() {
        const list = root(); const { input, send } = controls(); const actionState = features?.snapshot();
        const items = messageItems(document, list);
        return { connected: !!list, mode: 'native-dom', messages: (actionState?.messages?.items?.length ? actionState.messages.items : items.slice(-100).map(el => {
          if (!ids.has(el)) ids.set(el, 'dom-' + (++counter));
          const _cn = String(el.className || '').toLowerCase().split(' ').filter(Boolean); const ai = _cn.indexOf('self') < 0 && (_cn.indexOf('ai') >= 0 || !!el.querySelector('.content.left, [class*="content"][class*="left"]'));
          return { id: ids.get(el), role: ai ? 'assistant' : 'user',
            text: ((el.querySelector(ai ? '.content.left, [class*="content"][class*="left"]' : '.content.right, [class*="content"][class*="right"]') || el).textContent || '').slice(0, 6000) };
        })), capabilities: { sendMessage: { available: !!(list && input && send),
          reason: '需要唯一、可输入的原生输入框与发送按钮' }, ...models?.capabilities(), ...(actionState ? features?.capabilities(actionState) : features?.capabilities()) },
        navigation: { favorite: (() => {
          const nodes = [...document.querySelectorAll('.topTabbar img, .topTabbar [style*="ico_collect"]')];
          const hit = nodes.find(e => /ico_collect/.test(e.getAttribute('src') || e.getAttribute('style') || ''));
          return !!hit && /ico_collect_sel/.test(hit.getAttribute('src') || hit.getAttribute('style') || '');
        })() }, composer: { text: (input && typeof input.value === 'string') ? input.value : '' }, actions: actionState || null, models: models?.snapshot() || null, historyComplete: false };
      },
      async invoke(action, payload, options = {}) {
        options.check?.();
        if (G.MmdSameLayerModels?.actions.includes(action)) return models.invoke(action, payload, options);
        if (G.MmdSameLayerActions?.actions.includes(action) && features) return features.invoke(action, payload, options);
        if (action === 'tapNative' || action === 'fillNative') {
          const TARGETS = {
            bgItem: '.modify-scope > .modify-item',
            ciInput: '.custom-instruction-scope textarea.uni-textarea-textarea',
            ciSave: '.custom-instruction-scope .header-scope .complete-btn',
            ciBack: '.custom-instruction-scope .header-scope .icon-back',
            instructionChip: '.instruction-scroll .instruction-chip',
            aiAssist: '.ai-assistant'
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
        if (action !== 'sendMessage') C.fail('NOT_AVAILABLE', '请返回原生界面使用这项功能');
        if (typeof payload?.text !== 'string' || !payload.text.trim() || payload.text.length > 15000) C.fail('INVALID_TEXT');
        const { input, send } = controls();
        if (!root() || !input || !send) C.fail('NOT_AVAILABLE', '原生输入区暂时不可用');
        if (input.value.trim() && input.value !== payload.text) C.fail('DRAFT_EXISTS', '原生输入框已有不同的草稿，请先返回原生界面处理');
        const originalRoot = root();
        const view = document.defaultView;
        Object.getOwnPropertyDescriptor(view.HTMLTextAreaElement.prototype, 'value').set.call(input, payload.text);
        input.dispatchEvent(new view.Event('input', { bubbles: true, composed: true }));
        input.dispatchEvent(new view.Event('change', { bubbles: true, composed: true }));
        await Promise.resolve(); options.check?.();
        const current = controls();
        if (!input.isConnected || !send.isConnected || current.input !== input || current.send !== send || root() !== originalRoot) C.fail('PLATFORM_CHANGED');
        if (input.value !== payload.text) C.fail('DRAFT_CHANGED', '输入内容在发送前发生变化，已停止发送');
        send.dispatchEvent(new view.MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
        return { ok: true, action, accepted: true, completed: 'unknown', persisted: 'unknown' };
      }
    };
  }
  function provided(bridge, config) {
    if (!bridge || !['getSnapshot', 'getCapabilities', 'invoke'].every(k => typeof bridge[k] === 'function')) C.fail('INVALID_BRIDGE');
    const models = G.MmdSameLayerProvidedModels?.create(bridge, config);
    const features = G.MmdSameLayerProvidedActions?.create(bridge, config);
    const allowed = new Set(config.allowedActions || ['sendMessage', ...(G.MmdSameLayerModels?.actions || []), ...(G.MmdSameLayerActions?.actions || [])]);
    function available(action) {
      return allowed.has(action) && bridge.getCapabilities()[action]?.available === true &&
        (!bridge.getRegisteredActions || bridge.getRegisteredActions().includes(action)) &&
        (action === 'sendMessage' || typeof config.projectResult === 'function');
    }
    return {
      scope: scopeReader(config), identity: () => bridge,
      // A provided bridge is caller-owned: its start/destroy stay with its owner.
      start() {}, cancel() { models?.cancel(); features?.cancel(); }, destroy() { models?.destroy(); features?.destroy(); },
      snapshot() {
        const raw = bridge.getSnapshot(); const caps = bridge.getCapabilities(); const actionState = features?.snapshot();
        return { connected: raw.connection?.status === 'connected', mode: 'provided-bridge',
          messages: actionState?.messages.items || (raw.messages || []).slice(-100).map(m => ({ id: String(m.id),
            role: m.role === 'user' ? 'user' : 'assistant', text: String(m.text || '').slice(0, 6000) })),
          capabilities: Object.fromEntries([...allowed].map(a => [a, { available: available(a),
            reason: String(caps[a]?.reason || '当前能力不可用') }]).concat(Object.entries(models?.capabilities() || {}), Object.entries(features?.capabilities() || {}))), actions: actionState || null, models: models?.snapshot() || null, historyComplete: false };
      },
      async invoke(action, payload, options = {}) {
        options.check?.();
        if (models && G.MmdSameLayerModels.actions.includes(action)) return models.invoke(action, payload, options);
        if (features && G.MmdSameLayerActions.actions.includes(action)) return features.invoke(action, payload, options);
        if (!available(action)) C.fail('NOT_AVAILABLE');
        const result = await bridge.invoke(action, C.clone(payload || {}));
        options.check?.();
        if (!result?.ok) C.fail(result?.error?.code || 'NATIVE_FAILED', result?.error?.message || '原生操作未成功');
        // Extra actions need an explicit projection, e.g. a confirmation-required phase.
        const data = config.projectResult ? C.clone(config.projectResult(action, result)) : null;
        if (C.canonical(data).length > 200000) C.fail('RESULT_TOO_LARGE');
        return { ok: true, action, data, accepted: true, completed: 'unknown', persisted: 'unknown' };
      }
    };
  }
  function mock(config) {
    let conversation = 'main'; let scopeEpoch = 0;
    const models = G.MmdSameLayerModels?.mock(config);
    const histories = new Map([['main', [{ id: 'hello', role: 'assistant', text: '欢迎来到雾港。聊天与寻物小游戏可以分别使用。' }]]]);
    let busy = false;
    const timers = new Set();
    return {
      scope: () => ({ appId: config.appId, accountKey: 'local-demo', roleId: 'fog-harbor', conversationKey: conversation }),
      identity: () => 'mock-' + scopeEpoch,
      start() {}, cancel() { models?.cancel(); }, destroy() { timers.forEach(clearTimeout); timers.clear(); models?.destroy(); },
      changeConversation(value) {
        conversation = value; scopeEpoch += 1; busy = false; models?.cancel();
        if (!histories.has(value)) histories.set(value, []);
      },
      snapshot: () => ({ connected: true, mode: 'mock', messages: C.clone(histories.get(conversation)),
        capabilities: { sendMessage: { available: !busy, reason: '正在生成模拟回复' }, ...models?.capabilities() }, models: models?.snapshot() || null, historyComplete: false }),
      async invoke(action, payload, options = {}) {
        options.check?.();
        if (G.MmdSameLayerModels?.actions.includes(action)) return models.invoke(action, payload, options);
        if (action !== 'sendMessage' || busy) C.fail('NOT_AVAILABLE');
        if (typeof payload?.text !== 'string' || !payload.text.trim()) C.fail('INVALID_TEXT');
        const rows = histories.get(conversation); const generation = scopeEpoch;
        rows.push({ id: C.uuid(), role: 'user', text: payload.text }); busy = true;
        const timer = setTimeout(() => {
          timers.delete(timer);
          rows.push({ id: C.uuid(), role: 'assistant', text: '【本地模拟】雾灯亮起，港口传来潮声。你的选择已经记录。' });
          if (generation === scopeEpoch) busy = false;
        }, 120);
        timers.add(timer);
        return { ok: true, action, accepted: true, completed: 'unknown', persisted: 'unknown' };
      }
    };
  }
  const serial = G.MmdSameLayerActions?.serial || (value => value);
  G.MmdSameLayerAdapters = Object.freeze({ dom: (...args) => serial(dom(...args), args[1]?.allowedActions), provided: (...args) => serial(provided(...args), args[1]?.allowedActions), mock: (...args) => serial(mock(...args), args[0]?.allowedActions) });
})(globalThis);
