/* Original, text-only feature views. Host actions and payloads stay explicit. */
(function (G) {
  'use strict';
  const definitions = {
    conversations: ['会话记录', 'conversationPanel', 'openConversationPanel', 'closeConversationPanel'],
    persona: ['我的人设', 'personaPanel', 'openPersona', 'closePersona'],
    supplement: ['设定补充', 'supplementPanel', 'openSupplement', 'closeSupplement'],
    instructions: ['选择指令', 'instructionSelector', 'openPromptSelector', 'closePromptSelector'],
    settings: ['对话设置', 'chatSettings', 'openChatSettings', 'closeChatSettings'],
    sharing: ['分享对话', 'sharePanel', 'openSharePanel', 'closeSharePanel'],
    more: ['更多原生功能', 'moreMenu', 'openMoreMenu', 'closeMoreMenu'],
    background: ['更换背景', 'backgroundPanel', 'openBackgroundPanel', 'closeBackgroundPanel'],
    summary: ['剧情总结', 'summaryPanel', 'openSummaryPanel', 'closeSummaryPanel'],
    customInstructions: ['自定义指令', 'customInstructionsPanel', 'openCustomInstructions', 'closeCustomInstructions'],
    imageGen: ['生图', 'imageGen', 'openImageGen', 'closeImageGen'],
    edit: ['编辑消息', 'editPanel', 'openEditMessage', 'cancelEditMessage']
  };
  const ref = row => ({ conversationId: row.id, fingerprint: row.fingerprint, index: row.index });

  function render(kind, u) {
    const { data: s, add, el, button, field, run, chain, tap, fill, draft, confirm, prompt, openResult, native } = u;
    const runTap = (payload, after) => Promise.resolve(tap(payload, after)).catch(() => {});
    const rev = extra => ({ revision: s.revision, ...extra });
    const control = (label, action, payload = {}, after, disabled = false) =>
      button(label, action, () => run(action, rev(typeof payload === 'function' ? payload() : payload), after), disabled);
    const note = text => el('p', 'muted', text);
    const card = (title, sub) => {
      const box = el('section', 'sl-card');
      if (title) box.append(el('h3', '', title));
      if (sub) box.append(el('p', 'muted', sub));
      return box;
    };

    /* ── 会话记录 ───────────────────────────────────────── */
    if (kind === 'conversations') {
      const clip = t => {
        const v = String(t || '').replace(/\s+/g, ' ').trim();
        return v.length > 34 ? v.slice(0, 34) + '…' : v;
      };
      const head = el('div', 'cv-head');
      head.append(button('＋ 新建会话', 'createConversation', () =>
        confirm('另起一份会话？', '当前对话会保留，随时可以在会话记录里重新打开。未发送的草稿不会丢。',
          () => chain([{ action: 'createConversation' }], () => u.closeLocal())), false));
      add(head);

      if (!s.conversations.length) add(note('还没有别的会话。'));

      for (const row of s.conversations) {
        const box = el('div', 'cv-row' + (row.current ? ' is-cur' : ''));
        const main = el('button', 'cv-main');
        main.type = 'button';
        main.disabled = !row.available || row.current;
        main.onclick = () => run('selectConversation', rev(ref(row)), () => u.closeLocal());
        const top = el('div', 'cv-top');
        top.append(el('b', '', row.title || '未命名会话'));
        top.append(el('i', '', row.current ? '当前' : '进入 ›'));
        main.append(top);
        main.append(el('p', 'cv-sum', clip(row.preview) || '（空会话）'));
        box.append(main);
        if (row.capabilities.rename || row.capabilities.delete) {
          const tools = el('div', 'cv-tools');
          if (row.capabilities.rename) tools.append(button('改名', 'renameConversation',
            () => prompt('修改会话备注', row.title, title => run('renameConversation', rev({ ...ref(row), title }))), false));
          if (row.capabilities.delete && !row.current) tools.append(button('删除', 'requestDeleteConversation',
            () => confirm('删除这份会话？', (row.title || '未命名会话') + '\n删除后无法恢复。',
              () => u.removeConversation(rev(ref(row)))), false));
          box.append(tools);
        }
        add(box);
      }
    }

    /* ── 我的人设 ───────────────────────────────────────── */
    else if (kind === 'persona') {
      add(note(s.restriction || '名字与身份会写回 MMD 的原生人设，改完点保存。'));
      if (s.modes.length > 1) {
        add(el('p', 'sl-hint', '人设模式'));
        const modes = el('div', 'actions');
        for (const row of s.modes) {
          const b = control(row.label, 'setPersonaMode', { modeId: row.id }, () => u.resetDraft(), row.disabled);
          b.setAttribute('aria-pressed', String(row.selected));
          modes.append(b);
        }
        add(modes);
      }
      add(field('name', '名字', s.name, s.maxLength, s.nameDisabled));
      if (s.genderChoices.length) {
        add(el('p', 'sl-hint', '性别'));
        const genders = el('div', 'actions');
        for (const row of s.genderChoices) {
          const b = button(row.label, 'setPersonaGender', () => u.setGender(row.id), row.disabled);
          b.setAttribute('aria-pressed', String(row.selected));
          genders.append(b);
        }
        add(genders);
      }
      if (s.hasIdentity === false) add(note('这一版人设面板只有「名字」，身份与经历请到原生页填写。'));
      else add(field('identity', '身份与经历', s.identity, s.identityMaxLength, s.identityDisabled, true));
      add(button('保存到 MMD', 'submitPersona', () => {
        const steps = [];
        const g = u.gender();
        if (g && g !== s.selectedGenderId) steps.push({ action: 'setPersonaGender', payload: { genderId: g } });
        steps.push({ action: 'submitPersona', payload: () => ({ name: draft('name', s.name), identity: draft('identity', s.identity) }) });
        chain(steps, () => u.closeLocal());
      }, s.nameDisabled && s.identityDisabled));
    }

    /* ── 设定补充 ───────────────────────────────────────── */
    else if (kind === 'supplement') {
      add(note('追加进世界书的设定，插入位置可调。'));
      add(field('text', '补充内容', s.text, s.maxLength, s.picker.open, true));
      const bar = el('div', 'actions');
      if (s.picker.open) {
        bar.append(control('确认插入位置', 'confirmSupplementPosition', {}, null, !s.picker.choices.some(x => x.selected)));
        bar.append(control('取消选位', 'cancelSupplementPosition'));
      } else {
        bar.append(control('调整插入位置', 'openSupplementPositionPicker'));
      }
      add(bar);
      add(el('p', 'sl-hint', '插入位置：' + (s.positionLabel || '尚未读取')));
      if (s.picker.open) {
        const choices = el('div', 'actions');
        for (const row of s.picker.choices) {
          const b = control(row.label, 'setSupplementPosition', { choiceId: row.id }, null, row.disabled);
          b.setAttribute('aria-pressed', String(row.selected));
          choices.append(b);
        }
        add(choices);
      }
      add(button('提交补充设定', 'submitSupplement', () => chain([
        { action: 'setSupplementText', payload: () => ({ text: draft('text', s.text) }) },
        { action: 'submitSupplement', payload: {} }
      ], () => u.closeLocal()), s.picker.open));
    }

    /* ── 选择指令 ───────────────────────────────────────── */
    else if (kind === 'instructions') {
      add(note('点一条填入输入框，不会直接发送。'));
      if (!s.instructions.length) add(note('当前没有可用指令。'));
      else {
        const grid = el('div', 'sl-chips');
        for (const row of s.instructions) {
          grid.append(button(row.label, 'applyInstruction', () => {
            const apply = () => run('applyInstruction',
              rev({ instructionId: row.id, fingerprint: row.fingerprint, label: row.label, index: row.index }),
              result => {
                const text = result?.data?.text, box = document.getElementById('text');
                if (typeof text !== 'string' || !text || !box) throw Error('原生输入框没有接收这条指令，请回原生页核对。');
                box.value = text;
                u.closeLocal();
              });
            const box = document.getElementById('text');
            if ((box && box.value.trim()) || (u.nativeDraft() && u.nativeDraft().trim()))
              confirm('替换输入框草稿？', '所选指令会覆盖当前输入框内容，尚不会发送。', apply);
            else apply();
          }));
        }
        add(grid);
      }
    }

    /* ── 对话设置 ───────────────────────────────────────── */
    else if (kind === 'settings') {
      if (!s || !Array.isArray(s.controls)) { add(note('没有读到设置数据，点「重新读取」再试。')); return; }
      if (!s.controls.length) {
        add(note('当前没有读到设置项。原生的对话设置可能还在加载，点「重新读取」再试。'));
      }
      for (const row of s.controls) {
        const box = card(row.label, row.description);
        if (!row.options.length) { box.append(el('p', 'sl-value', '这一组没有可选项')); add(box); continue; }
        const bar = el('div', 'actions');
        for (const opt of row.options) {
          const b = control(opt.label, 'setChatSetting', { optionId: opt.id }, null, opt.disabled);
          b.setAttribute('aria-pressed', String(opt.selected));
          bar.append(b);
        }
        box.append(bar);
        add(box);
      }
      add(button('保存设置', 'submitChatSettings', () => run('submitChatSettings', rev({}), () => u.closeLocal()), !s.controls.length));
    }

    /* ── 分享对话 ───────────────────────────────────────── */
    else if (kind === 'sharing') {
      add(note(s.subtitle || '使用 MMD 的分享功能生成对话链接。'));
      add(el('p', 'sl-share-link', s.link || '链接尚未生成。'));
      add(control('生成并复制链接', 'copyShareLink'));
    }

    /* ── 更多原生功能 ───────────────────────────────────── */
    else if (kind === 'more') {
      for (const row of s.items) {
        add(control(row.label, 'activateMoreMenuItem', { itemId: row.id },
          result => openResult(result.data?.kind || row.kind), !row.available || row.destructive));
      }
    }

    /* ── 更换背景 ───────────────────────────────────────── */
    else if (kind === 'background') {
      add(note('点一项立即生效。选图会交给 MMD 自己的相册选择器。'));
      if (!s.items.length) add(note('没有读到原生背景选项——可以点「在原生页操作」。'));
      else {
        const bar = el('div', 'actions');
        for (const row of s.items) bar.append(button(row.label, null,
          () => runTap({ key: 'bgItem', index: row.index }, () => u.say('已选择：' + row.label))));
        add(bar);
      }
    }

    /* ── 剧情总结（平台「记忆管理面板」投影） ─────────────── */
    else if (kind === 'summary') {
      const s0 = s || {};
      const autoBox = card('自动总结', s0.autoOn
        ? '开启中：每 ' + (s0.rounds || '?') + ' 轮自动总结一次'
        : '关闭中：只有手动触发才会总结');
      autoBox.append(control(s0.autoOn ? '关闭自动总结' : '开启自动总结', 'toggleSummaryAuto', {}, null, !s0.open));
      add(autoBox);

      const cBox = card('总结内容', s0.count || (s0.content ? '' : '还没有总结内容'));
      cBox.append(el('div', 'sl-sum', s0.content || '平台里还没有生成过总结。开启自动总结，或到原生「总结剧情」入口生成一次。'));
      cBox.append(button('复制内容', null, () => {
        const t = s0.content || '';
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(() => u.say('已复制总结'), () => u.say('系统不允许直接写剪贴板'));
        else u.say('当前环境不支持复制');
      }, !s0.content));
      add(cBox);

      const group = (title, rows, hint, readonly) => {
        if (!rows || !rows.length) return;
        const box = card(title, hint);
        const bar = el('div', 'sl-chips');
        for (const opt of rows) {
          if (readonly) {
            bar.append(el('span', 'sl-chip' + (opt.selected ? ' is-on' : ''), opt.label));
            continue;
          }
          const b = control(opt.label + (opt.cost ? ' ' + opt.cost : ''), 'selectSummaryOption', { optionId: opt.id }, null,
            !s0.open || opt.disabled === true);
          b.setAttribute('aria-pressed', String(!!opt.selected));
          if (opt.selected) b.classList.add('is-on');
          bar.append(b);
        }
        box.append(bar);
        add(box);
      };
      /* 字数档位以前被硬锁成只读（怕点了没反应），结果会员的档位也点不了。
         现在照常写回原生面板：平台按账号权限放行，锁住的档位由原生自己拒。 */
      group('总结字数上限', s0.limits, '点一个即写回原生面板；档位是否可选由平台按账号权限决定');
      group('总结模型', s0.models, '点一个即写回原生面板');
      group('总结提示词', s0.prompts, '点一个即写回原生面板');
      add(button('保存设置', 'saveSummaryPanel', () => run('saveSummaryPanel', rev({}), () => u.closeLocal()), !s0.canSave));
    }

    /* ── 自定义指令：原生是一份「指令集」，不是一条系统提示词 ── */
    else if (kind === 'customInstructions') {
      const count = Number.isFinite(s.count) ? s.count : s.instructions.length;
      const limit = s.limit || 0;
      const full = !!limit && count >= limit;
      add(note(limit ? '原生指令集：' + count + ' / ' + limit + ' 条。点名称改名，右侧调序或删除。'
        : '原生指令集：' + count + ' 条。点名称改名，右侧调序或删除。'));
      if (full) add(el('p', 'sl-hint', '已达原生上限，平台会拒绝新增与编辑；先删掉几条再改。'));
      const head = el('div', 'actions');
      head.append(button('新增指令', 'addCustomInstruction', () => {
        const text = String(draft('new', '') || '').trim();
        if (!text) { u.say('先在下面写清指令内容。'); return; }
        run('addCustomInstruction', rev({ text }), () => u.resetDraft());
      }, full));
      head.append(button('重置全部', 'resetCustomInstructions', () =>
        confirm('清空所有自定义指令？', '原生面板里的 ' + count + ' 条会被全部删除，无法恢复。',
          () => run('resetCustomInstructions', rev({}), () => u.resetDraft())), !count));
      add(head);
      if (!full) add(field('new', '新指令内容', '', 4000, false, true));
      if (!s.instructions.length) add(note('这条会话还没有自定义指令。'));
      else {
        const list = el('div', 'sl-ci');
        for (const row of s.instructions) {
          const line = el('div', 'sl-ci__row');
          /* 点名称 = 把这条指令的内容追加到输入框（原生芯片同源） */
          /* 不挂 data-sl-action：那是给「原生动作」做能力灰显的，追加是纯本地操作 */
          const name = button(String(row.index + 1).padStart(2, '0') + ' · ' + row.label, null,
            () => u.applyInstruction(row), false);
          name.classList.add('sl-ci__name');
          name.title = row.label + ' · 点击追加到输入框';
          const tools = el('div', 'sl-ci__tools');
          tools.append(button('↑', 'moveCustomInstruction', () => run('moveCustomInstruction', rev({ instructionId: row.id, dir: 'up' })), row.index === 0));
          tools.append(button('↓', 'moveCustomInstruction', () => run('moveCustomInstruction', rev({ instructionId: row.id, dir: 'down' })), row.index === s.instructions.length - 1));
          /* 修：改内容（原生只给名称，内容在这里重写） */
          tools.append(button('修', 'editCustomInstruction', async () => {
            /* 正文优先用快照里带回来的（桥接层从 Vue 组件读，和平台自己的编辑器同源）；
               读不到才退回去点原生芯片取内容 */
            let initial = typeof row.content === 'string' ? row.content : '';
            if (!initial) { try { initial = await u.peekInstruction(row.index); } catch (_) {} }
            u.edit('修改这条指令', '名称最多 30 字，正文最多 8000 字；保存后写回原生指令集。',
              initial, (text, name) => {
                const value = String(text || '').trim();
                const next = String(name || '').trim();
                if (!value) { u.say('内容为空，没有修改。'); return; }
                if (!next) { u.say('名称不能为空。'); return; }
                run('editCustomInstruction', rev({ instructionId: row.id, text: value, name: next }));
              }, { name: row.label });
          }, full));
          tools.append(button('删', 'deleteCustomInstruction', () =>
            confirm('删除这条指令？', row.label + '\n删除后无法恢复。',
              () => run('deleteCustomInstruction', rev({ instructionId: row.id })))));
          line.append(name, tools);
          list.append(line);
        }
        add(list);
      }
    }

    /* ── 生图段落（平台 .cimg-seg 的 HUD 投影） ─────────────
       段来自这条 AI 回复的正文，单段 / 合并两种模式；生成由平台执行并计费。
       HUD 只代选与代点，钱和结果都以原生为准。 */
    else if (kind === 'imageGen') {
      const s0 = s || {};
      const count = Number.isFinite(s0.selectedCount) ? s0.selectedCount : 0;
      const cost = s0.cost || (s0.price ? '⚡' + s0.price * (s0.imageCount || 1) : '');
      add(note(s0.submitting ? '平台正在生成，弹层会在任务建好后自己关。'
        : '段落取自这条回复的正文。生成由平台执行、按张扣电量，本卡只代选。'));

      if (Array.isArray(s0.modes) && s0.modes.length > 1) {
        const modes = el('div', 'actions sl-imgseg__modes');
        for (const row of s0.modes) {
          const b = control(row.label || (row.index ? '合并生图' : '单段生图'), 'setImageGenMode', { modeId: row.id }, null, row.disabled);
          b.setAttribute('aria-pressed', String(!!row.selected));
          b.classList.add('sl-imgseg__mode');
          modes.append(b);
        }
        add(modes);
      }
      if (s0.merge) add(el('p', 'sl-hint sl-imgseg__banner', s0.banner || '合并模式：选中段落合并成一张图的提示词'));

      if (!s0.segments || !s0.segments.length) add(note('这条回复里没有可切的段落。'));
      else {
        const list = el('div', 'sl-imgseg');
        for (const row of s0.segments) {
          const b = el('button', 'sl-imgseg__row' + (row.selected ? ' is-on' : '') + (row.disabled ? ' is-off' : ''));
          b.type = 'button';
          b.dataset.slAction = 'selectImageSegment';
          b.dataset.fixedDisabled = String(!!row.disabled);
          b.disabled = !!row.disabled;
          b.setAttribute('aria-pressed', String(!!row.selected));
          b.append(el('span', 'sl-imgseg__n', String(row.index + 1).padStart(2, '0')));
          b.append(el('span', 'sl-imgseg__tx', row.label || '（空段）'));
          b.append(el('span', 'sl-imgseg__ck', row.selected ? '✓' : ''));
          b.onclick = () => run('selectImageSegment', rev({ segmentId: row.id }));
          list.append(b);
        }
        add(list);
      }

      const foot = el('div', 'sl-imgseg__foot');
      foot.append(el('span', 'sl-imgseg__info', s0.submitting
        ? '生成中…'
        : '已选 ' + count + ' 段 → 生成 ' + (s0.imageCount || 0) + ' 张' + (cost ? ' · ' + cost : '')));
      const go = button(s0.submitting ? '生成中…' : '生成', 'submitImageGen', () => {
        if (!s0.canGenerate || s0.submitting) return;
        confirm('开始生成？', '将按平台计费生成 ' + (s0.imageCount || 1) + ' 张图'
          + (cost ? '（' + cost + '）' : '') + '。\n生成结果由平台异步给出，本卡不代扣电量。',
          () => run('submitImageGen', rev({}), () => { u.say('已提交生图，结果以平台为准'); u.closeLocal(); }));
      }, !s0.canGenerate || s0.submitting);
      go.classList.add('sl-imgseg__go');
      foot.append(go);
      add(foot);
    }

    /* ── 编辑消息 ───────────────────────────────────────── */
    else if (kind === 'edit') {
      add(field('text', '消息内容', s.text, 100000, false, true));
      if (s.transforms.length) {
        add(el('p', 'sl-hint', '快捷处理'));
        for (const row of s.transforms) add(button(row.label, 'applyEditTransform', () => {
          const apply = () => run('applyEditTransform', rev({ transformId: row.id }), () => u.resetDraft());
          if (u.dirty()) confirm('使用「' + row.label + '」？', 'MMD 中的内容会被替换，未同步的本地草稿会丢失。', apply);
          else apply();
        }, row.disabled));
      }
      add(button('保存消息', 'submitEditMessage', () => chain([
        { action: 'setEditText', payload: () => ({ text: draft('text', s.text) }) },
        { action: 'submitEditMessage', payload: () => ({ messageId: s.messageId, text: draft('text', s.text) }) }
      ], () => u.closeLocal())));
    }
  }
  G.MmdSameLayerPanels = Object.freeze({ definitions, render });
})(globalThis);
