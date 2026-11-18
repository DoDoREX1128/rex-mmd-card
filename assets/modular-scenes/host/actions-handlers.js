/* Original behavior for old-MMD feature groups; no card UI is created here. */
(function (G) {
  'use strict';
  function create(u) {
    const { C, A, document, view, config, pending, capture, target, text, visible, enabled, all, one, unique,
      panel, features, header, shortcut, composer, moreEntry, editor, closeButton, picker, pickerButton } = u;
    const featureAction = { openConversationPanel: 'newChat', openTutorial: 'tutorial', openBackgroundPanel: 'background',
      openCustomInstructions: 'customInstructions', openPersona: 'persona', openSupplement: 'supplement',
      openSummaryPanel: 'summary' };
    const closeSelectors = { closeChatSettings: ['chatSettings', '.cs-header-left'], submitChatSettings: ['chatSettings', '.cs-header-right > .confirm-btn'],
      closePersona: ['personaPanel', '.header-box .icon-back'], closeSupplement: ['supplementPanel', '.header-scope .icon-back'] };
    function available(action, s) {
      if (featureAction[action]) return !!panel(features[featureAction[action]][2]) || enabled(moreEntry()) || !!panel('moreMenu');
      if (closeSelectors[action]) { const [key, selector] = closeSelectors[action]; return enabled(one(panel(key), selector)) && (key !== 'supplementPanel' || !picker()); }
      if (['copyMessage', 'deleteMessage', 'rollbackMessage', 'startNewStoryFromMessage', 'regenerateMessage', 'openEditMessage', 'openImageGen'].includes(action)) {
        const key = { copyMessage: 'copy', deleteMessage: 'delete', rollbackMessage: 'rollback', startNewStoryFromMessage: 'startNewStory', regenerateMessage: 'regenerate', openEditMessage: 'edit', openImageGen: 'imageGen' }[action];
        return s.messages.items.some(m => m.capabilities[key]);
      }
      if (action === 'setImageGenMode') return !!panel('imageGen') && s.imageGen.modes.length > 1;
      if (action === 'selectImageSegment') return !!panel('imageGen') && s.imageGen.segments.some(x => !x.disabled);
      if (action === 'submitImageGen') return !!panel('imageGen') && s.imageGen.canGenerate && !s.imageGen.submitting;
      if (action === 'closeImageGen') return !!panel('imageGen');
      switch (action) {
        case 'setInputText': return s.composer.available;
        /* 有返回按钮就点它，没有也允许（走 history.back 退回角色详情） */
        case 'exit': return true;
        case 'openComments': return enabled(header('comments'));
        case 'toggleFavorite': return enabled(header('favorite'));
        case 'refreshConversation': return enabled(header('refresh'));
        case 'openSharePanel': return !!panel('sharePanel') || enabled(header('share'));
        case 'copyShareLink': return enabled(one(panel('sharePanel'), '.gen-link-btn'));
        case 'closeSharePanel': return enabled(closeButton(panel('sharePanel')));
        case 'openMoreMenu': return !!panel('moreMenu') || enabled(moreEntry());
        case 'closeMoreMenu': return !!panel('moreMenu') && enabled(moreEntry());
        /* 破坏项也算可用：放不放行由 handler 按 confirmed 决定，能力表别先斩 */
        case 'activateMoreMenuItem': return s.moreMenu.items.some(i => i.available);
        case 'openChatSettings': return !!panel('chatSettings') || enabled(shortcut('对话设置', 'ico_chat_set_'));
        case 'setChatSetting': return !!panel('chatSettings');
        case 'openSummaryPanel': return !!panel('summaryPanel') || enabled(shortcut('总结剧情', 'ico_chat_summary')) || enabled(moreEntry());
        case 'closeSummaryPanel': return !!panel('summaryPanel');
        case 'selectSummaryOption': return !!panel('summaryPanel') &&
          (s.summaryPanel.limits.length + s.summaryPanel.models.length + s.summaryPanel.prompts.length) > 0;
        case 'toggleSummaryAuto': return !!panel('summaryPanel');
        case 'saveSummaryPanel': return !!panel('summaryPanel') && enabled(one(panel('summaryPanel'), '.summary-save-btn'));
        case 'submitChatSettings': return !!panel('chatSettings');
        case 'openPromptSelector': return !!panel('instructionSelector') || enabled(shortcut('选择指令', 'ico_instruction_'));
        case 'closePromptSelector': return enabled(one(panel('instructionSelector'), ':scope > .back-btn'));
        case 'applyInstruction': return s.instructionSelector.open && s.composer.available && s.instructionSelector.instructions.length > 0;
        case 'createConversation': return enabled(one(panel('conversationPanel'), ':scope > .bottom > .btn'));
        case 'closeConversationPanel': return enabled(closeButton(panel('conversationPanel')));
        case 'selectConversation': return s.conversationPanel.conversations.some(x => x.available);
        case 'renameConversation': return s.conversationPanel.conversations.some(x => x.capabilities.rename);
        case 'requestDeleteConversation': return s.conversationPanel.conversations.some(x => x.capabilities.delete);
        case 'deleteConversation': return !!pending.conversation && s.conversationPanel.conversations.some(x => x.capabilities.delete);
        case 'setPersonaName': return s.personaPanel.open && !s.personaPanel.nameDisabled;
        case 'setPersonaIdentity': return s.personaPanel.open && !s.personaPanel.identityDisabled;
        case 'closeBackgroundPanel': return !!panel('backgroundPanel');
        case 'closeCustomInstructions': return !!panel('customInstructionsPanel');
        case 'addCustomInstruction': return !!s.customInstructionsPanel.open &&
          (!s.customInstructionsPanel.limit || s.customInstructionsPanel.count < s.customInstructionsPanel.limit);
        case 'editCustomInstruction': return !!s.customInstructionsPanel.open && s.customInstructionsPanel.instructions.length > 0 &&
          (!s.customInstructionsPanel.limit || s.customInstructionsPanel.count < s.customInstructionsPanel.limit);
        case 'deleteCustomInstruction': case 'moveCustomInstruction': case 'resetCustomInstructions':
          return s.customInstructionsPanel.open && s.customInstructionsPanel.instructions.length > 0;
        case 'setPersonaMode': return s.personaPanel.modes.some(x => !x.disabled);
        case 'setPersonaGender': return s.personaPanel.genderChoices.some(x => !x.disabled);
        case 'submitPersona': return enabled(one(panel('personaPanel'), '.header-box .complete-btn'));
        case 'setSupplementText': return enabled(one(panel('supplementPanel'), '.textarea-wrapper textarea.uni-textarea-textarea')) && !picker();
        case 'submitSupplement': return enabled(one(panel('supplementPanel'), '.header-scope .complete-btn')) && !picker();
        case 'openSupplementPositionPicker': return enabled(one(panel('supplementPanel'), '.setting-item .picker-field')) && !picker();
        case 'setSupplementPosition': return !!picker() && s.supplementPanel.picker.choices.filter(x => x.selected).length === 1;
        case 'confirmSupplementPosition': return enabled(pickerButton('确定')) && s.supplementPanel.picker.choices.filter(x => x.selected).length === 1;
        case 'cancelSupplementPosition': return enabled(pickerButton('取消'));
        case 'setEditText': case 'applyEditTransform': case 'submitEditMessage': case 'cancelEditMessage':
          return !!pending.edit && pending.edit.expires > Date.now() && panel('editPanel') === pending.edit.panel;
        default: return false;
      }
    }
    function bound(id, kind) { capture(); const value = target(id, kind); return { ...value, id }; }
    function checkBound(value) { capture(); const current = target(value.id, value.kind);
      if (current.el !== value.el || current.signature !== value.signature || current.index !== value.index) C.fail('STALE_TARGET', '目标内容或位置已经改变'); return current; }
    function boundMessage(p) { const item = bound(p.messageId, 'message'); const row = capture().messages.items.find(x => x.id === p.messageId);
      if (!row || !item.content || row.role === 'unknown') C.fail('STALE_TARGET'); return { ...item, row }; }
    function boundConversation(p, capability) {
      const value = bound(p.conversationId, 'conversation'), row = capture().conversationPanel.conversations.find(x => x.id === p.conversationId);
      if (!row?.available || row.fingerprint !== p.fingerprint || row.index !== p.index || (capability && !row.capabilities[capability])) C.fail('STALE_TARGET');
      return { ...value, row };
    }
    /* 确认框的容器各版本不同：.confirm-scope（聊天记录 / 重置那套）、.mmd-confirm（消息删除 / 回溯，
       装在 uni-popup 里）、以及直接铺在 body 的 .confirm-box。一律按「有布局盒」筛，
       常驻 DOM 的隐藏模板不参与判定。 */
    const confirmPanels = () => all(document, '.u-popup__content .confirm-scope, .confirm-scope, .confirm-box, .mmd-confirm');
    /* 确认框的「确定」：色名各版本换过（.ok-btn / .confirm-btn / .mmd-ok / 纯文案），按文案兜底一次 */
    function confirmOk(dialog) {
      if (!dialog) return null;
      return one(dialog, '.confirm-bottom > .ok-btn') || one(dialog, '.ok-btn') || one(dialog, '.mmd-ok')
        || unique(all(dialog, 'button, uni-button, .btn, .confirm-btn, .mmd-ok')
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
    }
    function issue(key, item, p) {
      const token = C.uuid(); pending[key] = { item, token, expires: Date.now() + 30000, revision: p.revision };
      const prompt = key === 'rollback' ? '回溯会删除目标消息下方的消息，确认继续？' : '确认删除这条消息？删除后无法恢复。';
      return { phase: 'confirmation-required', accepted: false, messageId: p.messageId,
        confirmation: { messageId: p.messageId, confirmationToken: token, prompt } };
    }
    function consume(key, p) {
      const value = pending[key]; pending[key] = null;
      if (!value || value.expires < Date.now() || value.token !== p.confirmationToken || value.item.id !== p.messageId || value.revision !== p.revision) C.fail('CONFIRMATION_EXPIRED');
      checkBound(value.item); return value.item;
    }
    async function run(action, p, op) {
      const { s, check, click, wait, write } = op;
      const result = (phase, data = {}) => ({ phase, ...data });
      async function closeMore() { if (panel('moreMenu')) { click(moreEntry()); await wait(() => !panel('moreMenu')); } }
      /* u-popup 类面板（会话记录 / 更换背景）没有关闭按钮，遮罩是唯一出口 */
      const overlay = owner => { const pop = owner?.closest('.u-popup');
        return pop ? [...pop.children].find(c => /(?:^|\s)u-fade(?:\s|$)/.test(String(c.className))) : null; };
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
      }
      async function openMore() {
        if (!panel('moreMenu')) { click(moreEntry()); await wait(() => panel('moreMenu')); }
        try {
          await wait(() => { const p = panel('moreMenu'); return p && p.querySelectorAll('.item').length > 0; }, 1600);
        } catch (_) {}
      }
      async function feature(kind, itemId) {
        const definition = features[kind]; if (!definition) C.fail('NOT_AVAILABLE');
        /* 对话设置的卡片是异步拉的：面板先挂、内容后到，只等「面板出现」会拿到空壳 */
        const ready = () => {
          const body = panel(definition[2]);
          if (!body) return null;
          if (kind === 'chatSettings' && !body.querySelectorAll('.cs-group-card').length) return null;
          return body;
        };
        /* roleEdit 是跳页、summary 用宿主的总结弹层（不在 panels 表里）：点完就算送达 */
        const opened = () => kind === 'tutorial' ? view.location.href.includes('/pages/help/help')
          : kind === 'roleEdit' ? true : !!ready();
        /* 剧情总结在快捷栏里就有入口，比绕「更多」菜单稳 */
        if (kind === 'summary') {
          const direct = shortcut('总结剧情', 'ico_chat_summary_');
          if (direct) {
            click(direct);
            await wait(() => one(document, '.summary-sheet') || panel('summaryPanel'));
            return result('opened', { kind });
          }
        }
        if (opened()) return result('opened', { kind });
        await openMore();
        const row = await wait(() => capture().moreMenu.items.find(i => i.kind === kind && (!itemId || i.id === itemId) && i.available && !i.destructive));
        const choices = capture().moreMenu.items.filter(i => i.kind === kind && i.available);
        if (choices.length !== 1) C.fail('STALE_TARGET');
        click(target(row.id, 'more').el); await wait(opened);
        /* 打开类动作把面板数据一起带回：HUD 拿到就能画，不必再要一次全量快照 */
        const panelState = opened() ? capture({ panelsOnly: true })[definition[2]] : null;
        return result('opened', { kind, itemId: row.id, panelKey: definition[2], panel: panelState });
      }
      async function messageMenu(item) {
        /* 平台的菜单是 toggle：已经开着的时候再长按会把它关掉 —— 先点掉再重开 */
        const opened = one(document, '.msg-option-scope');
        if (opened) { opened.click(); await new Promise(r => setTimeout(r, 220)); }
        checkBound(item); check();
        const el = item.content, rect = el.getBoundingClientRect(), init = { bubbles: true, cancelable: true, composed: true,
          button: 0, buttons: 1, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
        if (view.PointerEvent) el.dispatchEvent(new view.PointerEvent('pointerdown', { ...init, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
        el.dispatchEvent(new view.MouseEvent('mousedown', init));
        let menu;
        /* 真站是「按住 1 秒」才弹菜单，wait 会一直按着不放，直到菜单出现或超时 */
        try { menu = await wait(() => one(document, '.msg-option-scope')); }
        finally {
          // Always release a synthetic press; never issue a click during cancellation.
          if (view.PointerEvent) el.dispatchEvent(new view.PointerEvent('pointerup', { ...init, buttons: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
          el.dispatchEvent(new view.MouseEvent('mouseup', { ...init, buttons: 0 }));
        }
        check(); checkBound(item);
        const options = all(menu, '.msg-options-box > .option-item'), labels = options.map(text);
        /* 只要求用得到的项在：真站用户消息的菜单同样是四项（也带「开启新的故事」），按条数硬比会误判 */
        if (!['复制', '删除', '回溯'].every(l => labels.includes(l))) C.fail('PLATFORM_CHANGED', '消息菜单结构不匹配');
        return { menu, options: Object.fromEntries(options.map(el => [text(el), el])) };
      }
      function editSession() {
        const edit = pending.edit;
        if (!edit || edit.expires < Date.now() || panel('editPanel') !== edit.panel) C.fail('STALE_TARGET', '请重新打开目标消息的编辑界面');
        checkBound(edit.item); edit.expires = Date.now() + 30000; return edit;
      }
      if (featureAction[action]) return feature(featureAction[action]);
      if (closeSelectors[action]) {
        const [key, selector] = closeSelectors[action]; click(one(panel(key), selector)); await wait(() => !panel(key));
        if (['personaPanel', 'supplementPanel'].includes(key)) await closeMore();
        return result(action.startsWith('submit') ? 'submitted' : 'closed');
      }
      switch (action) {
        case 'setInputText': { const el = composer(); write(el, p.text); await wait(() => composer() === el && el.value === p.text); return result('input-observed', { text: p.text }); }
        case 'exit': {
          const back = one(document, '.header-box .icon-back');
          if (back) { try { click(back); return result('dispatched'); } catch (_) {} }
          try { view.history.back(); return result('dispatched'); } catch (_) {}
          C.fail('NOT_AVAILABLE', '这个页面没有返回入口');
        }
        case 'openComments': click(header('comments')); return result('dispatched');
        case 'refreshConversation': click(header('refresh')); return result('dispatched');
        case 'toggleFavorite': { const before = s.favorite; click(header('favorite')); await wait(() => capture().navigation.favorite !== before); return result('favorite-observed', { favorite: capture().navigation.favorite }); }
        case 'openSharePanel': if (!panel('sharePanel')) { click(header('share')); await wait(() => panel('sharePanel')); } return result('opened');
        case 'copyShareLink': click(one(panel('sharePanel'), '.gen-link-btn')); return result('dispatched', { link: s.link, clipboard: 'unknown' });
        case 'closeSharePanel': click(closeButton(panel('sharePanel'))); await wait(() => !panel('sharePanel')); return result('closed');
        case 'openMoreMenu': await openMore(); return result('opened');
        case 'closeMoreMenu': await closeMore(); return result('closed');
        case 'activateMoreMenuItem': {
          let row = s.items.find(i => i.id === p.itemId);
          /* id 过期（每次 capture 都会重绑）：按文案在现网菜单里兜底认一次 */
          if (!row) {
            const sc = document.querySelector('.more-scope') || document.querySelector('.more-popup');
            const liveEl = sc && [...sc.querySelectorAll('.item')]
              .find(e => /重置|重开|重新开始/.test((e.querySelector('.item-title') || {}).textContent || ''));
            if (liveEl) row = { id: '', kind: 'resetChat', destructive: true, available: true };
          }
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
          return feature(row.kind, row.id);
        }
        case 'openChatSettings': {
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
        }
        case 'openPromptSelector': if (!panel('instructionSelector')) { click(shortcut('选择指令', 'ico_instruction_')); await wait(() => panel('instructionSelector')); } return result('opened');
        case 'closePromptSelector': {
          const bar = panel('instructionSelector');
          const back = bar && bar.querySelector(':scope > .back-btn');
          if (back) click(back); else C.fail('NOT_AVAILABLE');
          await wait(() => !panel('instructionSelector') || panel('instructionSelector').classList.contains('hidden'));
          return result('closed');
        }
        case 'applyInstruction': {
          const row = s.instructions.find(x => x.id === p.instructionId);
          if (!row || row.fingerprint !== p.fingerprint || row.label !== p.label || row.index !== p.index) C.fail('STALE_TARGET');
          const input = composer(), before = input.value; click(target(row.id, 'instruction').el);
          await wait(() => composer()?.value.trim() && composer().value !== before);
          return result('input-observed', { instructionId: row.id, text: composer().value });
        }
        case 'selectConversation': {
          const item = boundConversation(p); if (item.row.current) return result('selection-observed', { conversationId: item.id });
          const before = C.canonical(capture().messages.items); click(item.el);
          await wait(() => { const current = capture(); return current.conversationPanel.currentConversationId === item.id || C.canonical(current.messages.items) !== before; });
          return result('conversation-change-observed', { conversationId: item.id });
        }
        case 'createConversation': {
          const before = C.canonical(capture().messages.items); click(one(panel('conversationPanel'), ':scope > .bottom > .btn'));
          await wait(() => !panel('conversationPanel') || C.canonical(capture().messages.items) !== before);
          return result('creation-dispatched');
        }
        case 'closeConversationPanel': await closePopup('conversationPanel'); await closeMore(); return result('closed');
        case 'closeBackgroundPanel': await closePopup('backgroundPanel'); await closeMore(); return result('closed');
        case 'closeCustomInstructions': await closePopup('customInstructionsPanel', '.header-scope .close-btn'); await closeMore(); return result('closed');
        case 'renameConversation': {
          const item = boundConversation(p, 'rename');
          if (all(document, '.confirm-edit-scope').length) C.fail('NATIVE_PANEL_BUSY');
          if (item.row.title === p.title) return result('renamed', { title: p.title });
          click(one(item.el, '.edit-icon'));
          const dialog = await wait(() => one(document, '.confirm-edit-scope'));
          if (text(dialog.querySelector('.confirm-edit-title')) !== '聊天记录备注') C.fail('PLATFORM_CHANGED');
          checkBound(item); const input = one(dialog, 'input.uni-input-input'); write(input, p.title);
          checkBound(item); if (one(document, '.confirm-edit-scope') !== dialog) C.fail('STALE_TARGET'); click(one(dialog, '.ok-btn'));
          await wait(() => { const now = capture().conversationPanel.conversations; return !visible(dialog) && now.some(row => row.id === item.id && row.title === p.title); });
          return result('renamed', { conversationId: item.id, title: p.title });
        }
        case 'requestDeleteConversation': {
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
        }
        case 'deleteConversation': {
          const value = pending.conversation; pending.conversation = null;
          const item = boundConversation(p, 'delete');
          if (!value || value.item.el !== item.el || value.token !== p.confirmationToken || value.expires < Date.now() ||
            value.revision !== p.revision || confirmPanels().length !== 1 || confirmDialog('conversation') !== value.dialog) C.fail('CONFIRMATION_EXPIRED');
          checkBound(value.item); const before = capture().conversationPanel.conversations; click(one(value.dialog, '.confirm-bottom > .ok-btn'));
          const expected = before.filter(x => x.id !== item.id).map(x => x.fingerprint);
          await wait(() => !visible(value.dialog) && C.canonical(capture().conversationPanel.conversations.map(x => x.fingerprint)) === C.canonical(expected));
          return result('deleted', { conversationId: item.id });
        }
        case 'openSummaryPanel': {
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
        case 'setChatSetting': {
          const entry = target(p.optionId, 'chat-option');
          if (!entry || !entry.el.isConnected) C.fail('STALE_TARGET', '设置项已经刷新，请重新读取');
          const on = el => /(?:^|\s)(?:active|is-on|is-active|selected|is-checked)(?:\s|$)/.test(String(el.className));
          if (!on(entry.el)) { click(entry.el); await wait(() => on(target(p.optionId, 'chat-option').el)); }
          return result('setting-observed');
        }
        case 'addCustomInstruction': {
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
          /* 同一次编辑里还能改名字：原标题最多 30 字，超了原生也存不下 */
          if (typeof p.name === 'string' && p.name.trim()) {
            const scope = area.closest('.edit-scope') || area.closest('.u-popup__content') || document;
            const nameInput = scope.querySelector('input.uni-input-input') || scope.querySelector('input[type="text"]');
            if (nameInput) write(nameInput, p.name.trim());
          }
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
        case 'setPersonaMode': case 'setPersonaGender': {
          const mode = action === 'setPersonaMode', rows = mode ? s.modes : s.genderChoices, id = mode ? p.modeId : p.genderId;
          const row = rows.find(x => x.id === id); if (!row || row.disabled || rows.filter(x => x.label === row.label).length !== 1) C.fail('NOT_AVAILABLE');
          if (!row.selected) { click(target(id, mode ? 'mode' : 'gender').el); await wait(() => capture().personaPanel[mode ? 'currentModeId' : 'selectedGenderId'] === id); }
          return result('setting-observed');
        }
        case 'setPersonaName': case 'setPersonaIdentity': {
          const name = action === 'setPersonaName', value = name ? p.name : p.identity;
          const el = one(panel('personaPanel'), name ? '.card input[type="text"]' : '.card.textarea-wrapper textarea');
          write(el, value); await wait(() => el.isConnected && el.value === value); return result('setting-observed');
        }
        case 'submitPersona': {
          const owner = panel('personaPanel'), name = owner?.querySelector('.card input[type="text"]'), identity = owner?.querySelector('.card.textarea-wrapper textarea') || owner?.querySelector('textarea');
          if (enabled(name)) write(name, p.name); if (enabled(identity)) write(identity, p.identity);
          if (panel('personaPanel') !== owner) C.fail('STALE_TARGET'); click(one(owner, '.header-box .complete-btn'));
          await wait(() => !panel('personaPanel')); await closeMore(); return result('submitted');
        }
        case 'setSupplementText': {
          const el = one(panel('supplementPanel'), '.textarea-wrapper textarea.uni-textarea-textarea'); write(el, p.text);
          await wait(() => el.isConnected && el.value === p.text); return result('setting-observed');
        }
        case 'openSupplementPositionPicker': click(one(panel('supplementPanel'), '.setting-item .picker-field')); await wait(picker); return result('opened');
        case 'setSupplementPosition': {
          const initial = s.picker.choices, desired = initial.findIndex(x => x.id === p.choiceId); if (desired < 0) C.fail('STALE_TARGET');
          for (let step = 0; step <= initial.length; step++) {
            const rows = capture().supplementPanel.picker.choices;
            if (C.canonical(rows.map(x => [x.id, x.label])) !== C.canonical(initial.map(x => [x.id, x.label])) || rows.filter(x => x.selected).length !== 1) C.fail('STALE_TARGET');
            const index = rows.findIndex(x => x.selected); if (index === desired) return result('setting-observed');
            const next = rows[index + Math.sign(desired - index)], selected = target(rows[index].id, 'position').el, el = target(next.id, 'position').el;
            const rect = selected.getBoundingClientRect(), centerY = rect.top + rect.height / 2, dst = el.getBoundingClientRect();
            check(); if (!enabled(el)) C.fail('NOT_AVAILABLE');
            el.dispatchEvent(new view.MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: dst.left + dst.width / 2, clientY: dst.top + dst.height / 2 }));
            await wait(() => { const now = capture().supplementPanel.picker; const r = el.getBoundingClientRect();
              return now.pendingChoiceId === next.id && Math.abs(r.top + r.height / 2 - centerY) < 2; });
          }
          C.fail('TIMEOUT'); break;
        }
        case 'confirmSupplementPosition': { const chosen = s.picker.choices.find(x => x.selected); click(pickerButton('确定'));
          await wait(() => !picker() && capture().supplementPanel.positionLabel === chosen.label); return result('setting-observed'); }
        case 'cancelSupplementPosition': click(pickerButton('取消')); await wait(() => !picker()); return result('closed');
        case 'submitSupplement': {
          const owner = panel('supplementPanel'); write(one(owner, '.textarea-wrapper textarea.uni-textarea-textarea'), p.text);
          if (panel('supplementPanel') !== owner) C.fail('STALE_TARGET'); click(one(owner, '.header-scope .complete-btn'));
          await wait(() => !panel('supplementPanel')); await closeMore(); return result('submitted');
        }
        case 'copyMessage': {
          const item = boundMessage(p); check();
          const value = item.content.innerText || item.content.textContent || '';
          if (!view.navigator.clipboard?.writeText) C.fail('CLIPBOARD_UNAVAILABLE', '浏览器未提供剪贴板权限，请返回原生页面复制');
          await view.navigator.clipboard.writeText(value); check(); return result('copied', { messageId: item.id });
        }
        case 'regenerateMessage': {
          const item = boundMessage(p); if (!item.row.capabilities.regenerate) C.fail('NOT_AVAILABLE');
          const before = item.signature; click(item.buttons.regenerate);
          await wait(() => { const current = capture().messages.items.find(x => x.id === item.id); return !current || target(item.id, 'message').signature !== before; });
          return result('generation-change-observed', { messageId: item.id });
        }
        case 'openImageGen': {
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
        case 'setImageGenMode': {
          const owner = panel('imageGen'); if (!owner) C.fail('NOT_AVAILABLE', '生图弹层没开');
          const row = target(p.modeId, 'imgmode').el;
          if (!owner.contains(row)) C.fail('STALE_TARGET');
          click(row);
          await wait(() => /(?:^|\s)active(?:\s|$)/.test(String(row.className)));
          return result('mode-observed');
        }
        case 'selectImageSegment': {
          const owner = panel('imageGen'); if (!owner) C.fail('NOT_AVAILABLE', '生图弹层没开');
          const row = target(p.segmentId, 'segment').el;
          if (!owner.contains(row)) C.fail('STALE_TARGET');
          if (/(?:^|\s)disabled(?:\s|$)/.test(String(row.className))) C.fail('NOT_AVAILABLE', '这一段原生不给选');
          const before = /(?:^|\s)active(?:\s|$)/.test(String(row.className));
          click(row);
          await wait(() => /(?:^|\s)active(?:\s|$)/.test(String(row.className)) !== before);
          return result(before ? 'deselected' : 'selected');
        }
        case 'submitImageGen': {
          const owner = panel('imageGen'); if (!owner) C.fail('NOT_AVAILABLE', '生图弹层没开');
          const go = one(owner, '.cimg-seg-go');
          if (!go || /(?:^|\s)off(?:\s|$)/.test(String(go.className))) C.fail('NOT_AVAILABLE', '还没有选段落');
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
        case 'openEditMessage': {
          const item = boundMessage(p); if (!item.row.capabilities.edit || panel('editPanel')) C.fail('NATIVE_PANEL_BUSY');
          click(item.buttons.edit); const owner = await wait(() => panel('editPanel')); checkBound(item);
          if (!editor(owner)) C.fail('PLATFORM_CHANGED'); pending.edit = { item, messageId: item.id, panel: owner, expires: Date.now() + 30000 };
          return result('opened', { messageId: item.id });
        }
        case 'setEditText': { const edit = editSession(); write(editor(edit.panel), p.text); return result('text-observed'); }
        case 'applyEditTransform': { const edit = editSession(), el = target(p.transformId, 'transform').el;
          if (!edit.panel.contains(el)) C.fail('STALE_TARGET'); click(el); await Promise.resolve(); check(); editSession(); return result('transform-dispatched'); }
        case 'cancelEditMessage': { const edit = editSession(); pending.edit = null; click(edit.panel); await wait(() => !visible(edit.panel)); return result('closed'); }
        case 'submitEditMessage': {
          const edit = editSession(); if (edit.messageId !== p.messageId) C.fail('STALE_TARGET');
          write(editor(edit.panel), p.text); checkBound(edit.item);
          if (panel('editPanel') !== edit.panel) C.fail('STALE_TARGET'); pending.edit = null; click(one(edit.panel, '.modify-btn-box > .modify-btn'));
          await wait(() => !visible(edit.panel) && edit.item.el.isConnected && (edit.item.content.innerText || '').trim() === p.text.trim());
          return result('edit-observed', { messageId: p.messageId });
        }
        case 'deleteMessage': case 'rollbackMessage': {
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
          /* 真站确认后要等一次接口往返，4.5 秒有时不够 */
          await wait(done, 8000);
          return result(key === 'deletion' ? 'deleted' : 'rollback-observed', { messageId: item.id });
        }
        case 'startNewStoryFromMessage': {
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
        }
        default: C.fail('NOT_AVAILABLE');
      }
    }
    return { available, run };
  }
  G.MmdSameLayerActionHandlers = Object.freeze({ create });
})(globalThis);
