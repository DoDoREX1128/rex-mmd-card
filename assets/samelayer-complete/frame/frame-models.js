/* Frame-only model panel.
   做法对齐 yinyu-jianghu：本地先画、原生面板开在 HUD 下面；动作一返回就解锁，
   不等下一次快照（旧版把 busy 绑在快照上，动作做完就永久禁用）。 */
(function (G) {
  'use strict';
  function mount({ call, pull, say }) {
    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };

    /* ── 触发按钮：与「同步」同一行，统一高度 ─────────────────── */
    const slot = document.getElementById('models-slot') || document.getElementById('composer-tools') || document.body;
    const trigger = el('button', 'cmp-tool', '模型');
    trigger.id = 'models-open'; trigger.type = 'button'; trigger.disabled = true;
    slot.append(trigger);

    /* ── 面板 ───────────────────────────────────────────────── */
    const dlg = el('dialog', 'mdl'); dlg.id = 'models-dialog';
    const head = el('div', 'mdl__head');
    const title = el('h2', '', '选择模型');
    const closeX = el('button', 'mdl__x', '×');
    closeX.type = 'button'; closeX.setAttribute('aria-label', '关闭');
    head.append(title, closeX);
    const note = el('p', 'mdl__note', '');
    note.id = 'models-notice'; note.setAttribute('role', 'status');
    const body = el('div', 'mdl__body');
    const foot = el('div', 'mdl__foot');
    const refresh = el('button', 'ghost', '重新读取');
    refresh.id = 'models-refresh'; refresh.type = 'button';
    const nativeBtn = el('button', 'ghost', '在原生页操作');
    nativeBtn.id = 'models-native'; nativeBtn.type = 'button';
    foot.append(refresh, nativeBtn);
    dlg.append(head, note, body, foot);
    /* 必须挂在输入框里：dialog 的 bottom:100% 是按包含块算的，
       挂到 body 上就变成「视口高度」，面板会跑到屏幕外（之前「点模型没反应」就是它） */
    (document.getElementById('composer') || document.body).append(dlg);

    let native = null;          /* 完整 nativeState（取 models / capabilities） */
    let stalled = false;        /* 点了开却迟迟没有原生面板：别让它一直停在「正在打开」 */
    let picked = '';            /* 刚选中的模型名，快照回来前先用它 */
    let pending = '';           /* 正在跑的动作名，空串表示空闲 */
    let view = 'models';        /* models | config */
    let sig = '';

    const caps = () => native?.capabilities || {};
    const st = () => native?.models || null;
    const can = action => !pending && caps()[action]?.available === true;
    const notice = text => {
      note.textContent = text || '';
      if (text) say(text);
    };

    /* 触发键文案：模型 · 名称 · 余额⚡（名称过长省略，挤不到别的按钮） */
    function paintTrigger() {
      const s = st(), cur = s?.current || null;
      const sel = (s?.modelPanel?.models || []).find(m => m.selected);
      const name = sel?.name || picked || cur?.name || '';
      /* 电量优先取数值，取不到就从「75 / 每条消息」里抠前导数字 */
      const raw = [cur?.cost, cur?.balance, sel?.cost, sel?.balance].find(v => typeof v === 'number');
      const m = String(sel?.batteryLabel || cur?.batteryLabel || '').match(/\d+/);
      const pill = raw != null ? raw : (m ? Number(m[0]) : null);
      trigger.replaceChildren(el('span', 'cmp-label', '模型'));
      if (name) trigger.append(el('i', 'cmp-tag', ' · ' + name));
      if (pill != null) trigger.append(el('i', 'cmp-qt', ' ' + pill + '⚡'));
      /* 没有电量时窄屏仍显示「模型」两个字，别变成一个空按钮 */
      trigger.classList.toggle('no-qt', pill == null);
      trigger.title = name ? '当前模型：' + name + (pill != null ? ' · 约 ' + pill + '⚡/条' : '') : '选择模型';
    }

    function controls() {
      const idle = !pending;
      refresh.disabled = !(idle && can('openModelSettings'));
      nativeBtn.disabled = !idle;
      for (const b of body.querySelectorAll('[data-mdl-action]')) {
        const a = b.dataset.mdlAction;
        const fixed = b.dataset.mdlFixed === 'true';
        b.disabled = !can(a) || fixed;
      }
      for (const i of body.querySelectorAll('input')) i.disabled = !idle || i.dataset.mdlFixed === 'true';
    }

    /* 只更新禁用态，不重建 DOM：点一下不会整块闪 */
    function paint() {
      const s = st();
      if (!s) {
        title.textContent = '选择模型';
        body.replaceChildren(el('p', 'mdl__empty', pending ? '正在读取模型列表…' : '尚未连接 MMD。'));
        controls();
        return;
      }
      const key = JSON.stringify([view, s.modelPanel, s.modelConfiguration,
        native?.capabilities?.selectModel, native?.capabilities?.openModelConfiguration]);
      if (key === sig) { controls(); return; }
      sig = key;

      if (view === 'config' && s.modelConfiguration.open) renderConfig(s.modelConfiguration);
      else { view = 'models'; renderList(s.modelPanel); }
      controls();
    }

    /* ── 模型列表 ───────────────────────────────────────────── */
    function renderList(panel) {
      title.textContent = '选择模型';
      if (!panel.open) note.textContent = stalled ? '原生模型列表没有打开，可到原生页操作' : '正在打开原生模型列表…';
      else if (!pending) note.textContent = '';
      const frag = document.createDocumentFragment();

      if (panel.filters.length) {
        const chips = el('div', 'mdl__filters');
        for (const f of panel.filters) {
          const b = el('button', 'mdl__chip' + (f.active ? ' is-on' : ''), f.label);
          b.type = 'button';
          b.setAttribute('aria-pressed', String(f.active));
          b.dataset.mdlAction = 'selectModelFilter';
          b.dataset.mdlFixed = String(f.active === true);
          b.onclick = () => run('selectModelFilter', { revision: panel.revision, filterId: f.id }, () => {});
          chips.append(b);
        }
        frag.append(chips);
      }

      if (!panel.models.length) {
        frag.append(el('p', 'mdl__empty', pending ? '正在读取模型列表…' : '没有读到模型。点「重新读取」，或到原生页核对。'));
      }

      for (const m of panel.models) {
        const card = el('div', 'mdl__card' + (m.selected ? ' is-on' : ''));
        card.dataset.modelId = m.id;

        const main = el('button', 'mdl__pick');
        main.type = 'button';
        main.dataset.mdlAction = 'selectModel';
        main.dataset.mdlFixed = String(m.available === false);
        main.onclick = () => choose(m);
        const nm = el('div', 'mdl__name');
        nm.append(el('strong', '', m.name));
        if (m.selected) nm.append(el('b', 'mdl__badge', '当前'));
        main.append(nm);
        if (m.description) main.append(el('p', 'mdl__desc', m.description));
        const meta = [m.batteryLabel, m.permission, m.successRate].filter(Boolean).join(' · ');
        if (meta) main.append(el('p', 'mdl__meta', meta));
        card.append(main);

        const bar = el('div', 'mdl__row');
        const use = el('button', 'mdl__use', m.selected ? '重新选择' : '使用此模型');
        use.type = 'button';
        use.dataset.mdlAction = 'selectModel';
        use.dataset.mdlFixed = String(m.available === false);
        use.onclick = () => choose(m);
        const cfg = el('button', 'mdl__cfg', '模型设置');
        cfg.type = 'button';
        cfg.dataset.mdlAction = 'openModelConfiguration';
        cfg.dataset.mdlFixed = String(!m.canConfigure);
        cfg.onclick = e => { e.stopPropagation(); configure(m); };
        bar.append(use, cfg);
        card.append(bar);
        frag.append(card);
      }
      body.replaceChildren(frag);
      body.scrollTop = 0;
    }

    /* ── 模型细设 ───────────────────────────────────────────── */
    function renderConfig(cfg) {
      title.textContent = cfg.modelName || '模型设置';
      note.textContent = cfg.energyLabel || '';
      const frag = document.createDocumentFragment();
      if (!cfg.controls.length) frag.append(el('p', 'mdl__empty', '这个模型没有可调项。'));

      for (const c of cfg.controls) {
        const box = el('section', 'mdl__group');
        box.append(el('h3', '', c.label || '设置项'));
        if (c.description) box.append(el('p', 'mdl__desc', c.description));
        if (c.type === 'toggle') {
          const lab = el('label', 'mdl__switch');
          const input = el('input');
          input.type = 'checkbox';
          input.checked = c.value === true;
          input.dataset.mdlFixed = String(c.available === false);
          input.onchange = () => run('setModelSetting', { revision: cfg.revision, controlId: c.id, value: input.checked }, () => {});
          lab.append(input, el('span', '', c.value ? '已开启' : '已关闭'));
          box.append(lab);
        } else {
          const choices = el('div', 'mdl__chips');
          for (const ch of c.choices || []) {
            const b = el('button', 'mdl__chip' + (ch.selected ? ' is-on' : ''), ch.label);
            b.type = 'button';
            b.dataset.mdlAction = 'setModelSetting';
            b.dataset.mdlFixed = String(ch.available === false || ch.disabled === true);
            b.setAttribute('aria-pressed', String(ch.selected));
            b.onclick = () => run('setModelSetting', { revision: cfg.revision, controlId: c.id, choiceId: ch.id }, () => {});
            choices.append(b);
          }
          box.append(choices);
        }
        frag.append(box);
      }

      const bar = el('div', 'mdl__row');
      const back = el('button', 'ghost', '‹ 返回模型列表');
      back.type = 'button';
      back.onclick = leaveConfig;
      const save = el('button', 'mdl__use', '确认配置');
      save.type = 'button';
      save.dataset.mdlAction = 'submitModelConfiguration';
      save.dataset.mdlFixed = 'false';
      save.onclick = () => run('submitModelConfiguration', { revision: cfg.revision }, () => { view = 'models'; });
      bar.append(back, save);
      frag.append(bar);
      body.replaceChildren(frag);
    }

    /* ── 动作 ───────────────────────────────────────────────── */
    /* 唯一等待点：动作返回即解锁；快照用 pull 主动拉，不阻塞界面 */
    async function run(action, payload, after) {
      if (pending) return null;
      pending = action; controls();
      try {
        const result = await call('native.invoke', { action, payload });
        after?.(result);
        return result;
      } catch (e) {
        notice(e.message || '操作未完成，请重试');
        return null;
      } finally {
        pending = '';
        if (dlg.open) controls();
        if (pull) pull().then(() => { if (dlg.open) paint(); });
      }
    }

    async function choose(model) {
      if (pending) return;
      const s = st();
      const revision = s?.modelPanel?.revision;
      const result = await run('selectModel', { revision, modelId: model.id }, () => {
        /* 乐观更新：立即改本地标记与按钮文案，不等快照 */
        const panel = s?.modelPanel;
        if (panel) {
          panel.models.forEach(m => { m.selected = m.id === model.id; });
        }
        if (s?.current) s.current.name = model.name;
        picked = model.name; paintTrigger();
        notice('已切换到 ' + model.name);
        dlg.close();
      });
      if (!result) return;
      /* 原生面板在 HUD 底下，收起它；失败也无所谓 */
      call('native.invoke', { action: 'closeModelSettings', payload: { revision } })
        .then(() => { if (pull) pull().then(paint); })
        .catch(() => {});
    }

    async function configure(model) {
      if (pending) return;
      const result = await run('openModelConfiguration', { modelId: model.id }, () => {});
      /* 失败时 run 已经把真实原因写进 note，这里直接返回：
         以前不管成败都往下走，最后用「这个模型没有打开设置页」把 STALE_TARGET 盖掉了 */
      if (!result) return;
      if (pull) await pull();                     /* 等新数据到手再决定画哪一屏 */
      const cfg = st()?.modelConfiguration;
      if (cfg?.open) { view = 'config'; sig = ''; paint(); }
      else if (!pending) notice('原生设置页开了，但快照里没读到设置项；点「重新读取」再试');
    }

    function leaveConfig() {
      const cfg = st()?.modelConfiguration;
      view = 'models'; sig = '';
      paint();
      if (cfg?.open) call('native.invoke', { action: 'closeModelConfiguration', payload: { revision: cfg.revision } }).catch(() => {});
      if (pull) pull().then(() => { if (dlg.open) paint(); });
    }

    /* 面板高度不能超过「输入框上方」的可用空间：手机上面板比屏幕还高就会顶出去，顶部标题看不见 */
    function fitPanel() {
      const host = document.getElementById('composer') || document.body;
      const room = host.getBoundingClientRect().top - 14;
      const cap = Math.max(220, Math.round(room));
      dlg.style.maxHeight = Math.min(cap, Math.round(window.innerHeight * 0.86)) + 'px';
    }
    window.addEventListener('resize', () => { if (dlg.open) fitPanel(); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { if (dlg.open) fitPanel(); });

    function openPanel() {
      if (dlg.open) { closePanel(); return; }
      view = 'models'; sig = ''; stalled = false;
      fitPanel();
      dlg.show();                    /* 非模态：浮在输入框上方，不遮全屏 */
      paint();                       /* 先画：有旧数据就直接显示，没有就显示「正在读取」 */
      if (pending) return;
      const s = st();
      if (s?.modelPanel?.open) { if (pull) pull().then(paint); return; }
      run('openModelSettings', {}, () => {}).then(() => { if (dlg.open) paint(); });
      clearTimeout(openPanel._t);
      openPanel._t = setTimeout(() => {
        if (!dlg.open) return;
        if (st()?.modelPanel?.open) return;
        stalled = true; note.textContent = '原生模型列表没有打开，可到原生页操作';
      }, 2800);
    }

    function closePanel() {
      if (!dlg.open) return;
      clearTimeout(openPanel._t);
      const s = st();
      const cfg = s?.modelConfiguration, panel = s?.modelPanel;
      dlg.close();                   /* 本地先关，原生后台收：不再等往返 */
      if (cfg?.open) call('native.invoke', { action: 'closeModelConfiguration', payload: { revision: cfg.revision } }).catch(() => {});
      if (panel?.open) call('native.invoke', { action: 'closeModelSettings', payload: { revision: panel.revision } }).catch(() => {});
      if (pull) pull().then(paint);
    }

    trigger.onclick = openPanel;
    refresh.onclick = () => { sig = ''; stalled = false; run('openModelSettings', {}, () => {}).then(() => { if (dlg.open) paint(); }); };
    nativeBtn.onclick = () => call('ui.native').catch(e => notice(e.message));
    closeX.onclick = closePanel;
    dlg.addEventListener('cancel', e => { e.preventDefault(); closePanel(); });
    dlg.addEventListener('click', e => { if (e.target === dlg) closePanel(); });
    /* 点浮层外面收起（非模态 dialog 不再自带遮罩） */
    document.addEventListener('pointerdown', e => {
      if (!dlg.open) return;
      if (dlg.contains(e.target) || trigger.contains(e.target)) return;
      closePanel();
    }, true);

    /* ── 由 frame-main 在每次快照后调用 ─────────────────────── */
    function render(nativeState) {
      native = nativeState || null;
      const s = st();
      trigger.hidden = !s?.enabled;
      /* 触发键只看「原生有没有模型面板」；pending 由 openPanel 自己拦，避免选完模型后按钮永久禁用 */
      trigger.disabled = !s?.enabled;
      if (s?.enabled) paintTrigger();
      if (dlg.open) paint();
    }

    return {
      render,
      dispose() { dlg.remove(); trigger.remove(); }
    };
  }
  G.MmdSameLayerModelUI = Object.freeze({ mount });
})(globalThis);
