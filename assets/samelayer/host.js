/* Rex 同层卡 · Host 适配层（最小骨架）
 * 职责：在平台页里找到原生 DOM，把 Frame 的请求翻译成原生操作。
 * 纪律：
 *   1) 每个功能至少两个候选选择器；找不到就降级，不抛。
 *   2) 动作幂等；删除/提交类不自动重试。
 *   3) 只做能验证的动作；没把握的返回 not-implemented，不假装。
 */
(function () {
  'use strict';
  var VER = 1;
  var KEY = 'REXHUDHOST';
  var prev = window[KEY];
  if (prev && prev.ver >= VER) { prev.reenter(); return; }
  if (prev && prev.destroy) prev.destroy();

  var CFG = window.REXHUDCONFIG || {};
  var SEL = {
    messageList: ['#msglistview', '[data-chat="list"]'],
    messageItem: ['#msglistview .item.Ai', '#msglistview .item.self', '[data-chat="message"]'],
    aiItem: ['.item.Ai', '[data-from="ai"]'],
    input: ['#chat-input-scope textarea.uni-textarea-textarea', '[data-chat="input"] textarea'],
    sendBtn: ['.chat-send-proxy', '[data-chat="composer"] button'],
    moreEntry: ['ico_more_', '.more-scope .more-btn', '[data-chat="header"] .more'],
    personaEntry: ['ico_persona_', '[data-chat="header"] .persona'],
    dialogInput: ['.dialog-scope input.uni-input-input', '.uni-modal input.uni-input-input'],
    dialogConfirm: ['.dialog-scope .confirm-btn', '.uni-modal .confirm-btn']
  };
  var pick = function (list) {
    for (var i = 0; i < list.length; i++) { var el = document.querySelector(list[i]); if (el) return el; }
    return null;
  };
  var byIcon = function (frag) {
    if (!frag) return null;
    var nodes = document.querySelectorAll('[class*="ico_"], [id*="ico_"]');
    for (var i = 0; i < nodes.length; i++) {
      var s = String(nodes[i].className || '') + String(nodes[i].id || '');
      if (s.indexOf(frag) >= 0) return nodes[i];
    }
    return null;
  };

  var st = { frame: null, port: null, ready: false, seq: 0, pending: Object.create(null), timers: [] };
  var later = function (fn, ms) { var t = setTimeout(fn, ms); st.timers.push(t); return t; };

  function status() {
    return {
      ok: true,
      hasMessages: !!pick(SEL.messageList),
      hasInput: !!pick(SEL.input),
      hasSend: !!pick(SEL.sendBtn),
      messageCount: document.querySelectorAll(SEL.messageItem.join(',')).length,
      title: (document.title || '').slice(0, 60)
    };
  }

  function setInput(text) {
    var el = pick(SEL.input);
    if (!el) return { ok: false, reason: 'input-not-found' };
    el.focus();
    var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, String(text == null ? '' : text));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  }

  function send() {
    var btn = pick(SEL.sendBtn) || byIcon('send');
    if (!btn) return { ok: false, reason: 'send-not-found' };
    btn.click();
    return { ok: true };
  }

  function openEntry(kind) {
    var el = kind === 'persona' ? (byIcon('persona') || pick(SEL.personaEntry))
      : (byIcon('chat_set') || pick(SEL.moreEntry));
    if (!el) return { ok: false, reason: kind + '-entry-not-found' };
    el.click();
    return { ok: true };
  }

  /* 在已打开的对话框里填第一个输入框 */
  function fillDialog(text) {
    var el = pick(SEL.dialogInput);
    if (!el) return { ok: false, reason: 'dialog-not-open' };
    el.focus();
    var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(text == null ? '' : text));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return { ok: true };
  }
  function confirmDialog() {
    var el = pick(SEL.dialogConfirm);
    if (!el) return { ok: false, reason: 'dialog-not-open' };
    el.click();
    return { ok: true };
  }

  function invoke(method, params) {
    switch (method) {
      case 'snapshot': return status();
      case 'setInput': return setInput(params && params.text);
      case 'send': return send();
      case 'openPersona': return openEntry('persona');
      case 'openMore': return openEntry('more');
      case 'fillDialog': return fillDialog(params && params.text);
      case 'confirmDialog': return confirmDialog();
      /* 下面这些需要按平台实际 DOM 补选择器；先如实返回未实现 */
      case 'editMessage':
      case 'deleteMessage':
      case 'rollbackMessage':
        return { ok: false, reason: 'not-implemented: 先在 references/13 里登记选择器与确认流程' };
      default:
        return { ok: false, reason: 'unknown-method:' + method };
    }
  }

  function reply(id, payload) {
    if (!st.port) return;
    st.port.postMessage({ protocol: 'rex-sl/1', type: 'result', id: id, ...payload });
  }

  function onMessage(e) {
    var d = e.data;
    if (!d || d.protocol !== 'rex-sl/1') return;
    if (d.type === 'frame-ready') { st.ready = true; reply(d.id, { ok: true, data: status() }); return; }
    if (d.type === 'invoke') {
      var out;
      try { out = invoke(d.method, d.params); }
      catch (err) { out = { ok: false, reason: String(err && err.message || err) }; }
      reply(d.id, out);
    }
  }

  function ensureFrame() {
    if (st.frame) return st.frame;
    var box = document.createElement('div');
    box.id = 'rex-hud-root';
    box.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#0b0712;';
    var f = document.createElement('iframe');
    f.title = 'Rex HUD';
    f.style.cssText = 'width:100%;height:100%;border:0;display:block;background:#0b0712;';
    f.setAttribute('allow', 'clipboard-write');
    f.srcdoc = CFG.frameScriptSource || '<!doctype html><meta charset="utf-8"><body style="background:#0b0712;color:#efe9f8;font:14px/1.7 system-ui">Frame 未加载</body>';
    box.appendChild(f);
    document.body.appendChild(box);
    st.frame = f;
    f.addEventListener('load', function () {
      st.port = f.contentWindow;
      try { st.port.postMessage({ protocol: 'rex-sl/1', type: 'host-ready', theme: CFG.theme || '' }, '*'); } catch (_) {}
    });
    return f;
  }

  function destroy() {
    window.removeEventListener('message', onMessage);
    st.timers.forEach(clearTimeout);
    var box = document.getElementById('rex-hud-root');
    if (box) box.remove();
    st.frame = null; st.port = null; st.ready = false;
  }

  window.addEventListener('message', onMessage);

  window[KEY] = {
    ver: VER,
    reenter: function () { ensureFrame(); },
    invoke: invoke,
    status: status,
    destroy: destroy
  };

  ensureFrame();
})();
