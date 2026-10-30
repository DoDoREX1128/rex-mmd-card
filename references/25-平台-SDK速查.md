# 25 · SDK 速查（30 能力 / 12 事件）

> 写任何 `sdk.*` 调用前先查这一页。能力名拼错不报错、永不生效；参数写错会在真机抛异常，创卡页看不出来。
> 事实来源：洛璃 mmd-sandbox §4（实机 2026-08-26/30）+ 官方 contract.json。`facts.json` 是机器真源。

## 0. 三条总则

1. **一次脚本只跑一次**。订阅写在脚本体，气泡内按钮绑在 `message:mount` 回调里。
2. **写类能力在瘦预览全部 `NOT_SUPPORTED`**，读类大多可用。创卡页只能验样式、舞台、角色数据；输入、发送、存档必须回聊天页验。
3. **返回 Promise 的必须 `.catch`**；同步抛错的必须 `try/catch`。两者失败形态不同，见 §3。

## 1. 能力全表

`同步性`：`sync` 直接返回；`async` 返回 Promise。

| 能力 | 参数 | 返回 | 同步性 | 瘦预览 | 备注 |
|---|---|---|---|---|---|
| `input.get` | — | `string` | sync | 回 `""` | |
| `input.set` | `text` | `void` | sync | NOT_SUPPORTED | 覆盖输入框 |
| `input.add` | `text` | `void` | sync | NOT_SUPPORTED | 追加 |
| `input.insert` | `text` | `void` | sync | NOT_SUPPORTED | 光标处插入 |
| `input.clear` | — | `void` | sync | NOT_SUPPORTED | |
| `input.focus` | — | `void` | sync | NOT_SUPPORTED | |
| `input.blur` | — | `void` | sync | NOT_SUPPORTED | |
| `input.getCursor` | — | `number` | sync | 回 `0` | |
| `input.setCursor` | `n` | `void` | sync | NOT_SUPPORTED | |
| `composer.show` | — | `void` | sync | NOT_SUPPORTED | |
| `composer.hide` | — | `void` | sync | NOT_SUPPORTED | |
| `composer.visible` | — | `boolean` | sync | 真值 `true` | 不是降级值 |
| `message.send` | `text?` | `Promise<void>` | async | NOT_SUPPORTED | 未结束再调返回 `BUSY` |
| `message.edit` | `id`, `text` | `Promise<void>` | async | NOT_SUPPORTED | `id` 用 `serverId` |
| `cache.get` | `key` | `unknown` | sync | 回 `undefined` | 不抛 |
| `cache.set` | `key`, `value` | `void` | sync | 可用 | 会话内，刷新即失 |
| `cache.remove` | `key` | `void` | sync | 可用 | |
| `save.get` | `key` | `unknown` | sync | **同步抛 SdkError** | 必须 `try/catch` |
| `save.set` | `key`, `value` | `Promise<void>` | async | NOT_SUPPORTED | 20 次/60s |
| `save.remove` | `key` | `Promise<void>` | async | NOT_SUPPORTED | **真机坏死**，见 §3.1 |
| `save.keys` | — | `string[]` | sync | **同步抛 SdkError** | 必须 `try/catch` |
| `stage.open` | `'content' \| 'full'` | `void` | sync | 可用 | |
| `stage.close` | — | `void` | sync | 可用 | 不自发 `stage:close` |
| `stage.el` | — | `HTMLElement` | sync | 可用 | **关闭时也返回 DIV** |
| `stage.visible` | — | `boolean` | sync | 可用 | 判断开关只能用它 |
| `role.get` | — | `{name, avatarUrl}` | sync | 可用 | 读不到人设/世界书 |
| `user.get` | — | `{nickname, avatarUrl}` | sync | 可用 | 读不到宿主人设 |
| `on` | `event`, `cb` | `void` | sync | 可用 | 12 个事件名 |
| `debug.log` | `...args` | `void` | sync | 可用 | |
| `version` | — | `string` | 值 | 可用 | **是值不是函数**，恒 `'1'` |

## 2. 事件（12 个）

```
ready  message:new  message:done  message:stream  message:mount  message:unmount
input:change  conversation:switch  theme:change  back  stage:close  dispose
```

| 事件 | 载荷 | 用途 |
|---|---|---|
| `message:new` | `{content,id,role,serverId}` | 新消息出现 |
| `message:mount` | 同上 | 气泡挂载：只在这里绑按钮 |
| `message:done` | 同上 | 收尾：读最终正文、解析状态、写存档 |
| `message:stream` | 同上 | 跟字、打字机 |
| `message:unmount` | 无 | 解绑 |
| `input:change` | 无 | 输入变化 |
| `conversation:switch` | 无 | 切会话：清 cache、重读 save |
| `theme:change` | 无 | 深浅色切换 |
| `back` | 无 | 返回键 |
| `stage:close` | 无 | 平台关舞台（用户按返回） |
| `dispose` | 无 | 卸载：清计时器、监听、观察器 |
| `ready` | `undefined` | **最后到、不补发**，只当诊断信号 |

**冷启动顺序**：`message:new → message:mount → message:done → ready`。首屏挂 `message:mount` / `message:done`，不要挂 `ready`。

## 3. 六个必记的坑

### 3.1 `save.remove` 真机坏死

就绪态也稳定抛 `NETWORK`，重试无效。删档改用 `save.set(key, null)`，读的时候把 `null` 当"无存档"。

```js
async function dropSave(key) {
  try { await sdk.save.set(key, null); }
  catch (e) { sdk.debug.log('drop fail', e && e.code); }
}
```

### 3.2 `save.get` / `save.keys` 是抛异常，不是返回错误码

```js
function loadState(key) {
  try { return sdk.save.get(key) || null; }
  catch (e) { sdk.debug.log('save unavailable', e && e.code); return null; }
}
```

不包 `try/catch` 的后果：整段脚本失效，页面无提示。瘦预览打开就炸。

### 3.3 `version` 是值

```js
if (sdk.version !== '1') sdk.debug.log('unexpected sdk version', sdk.version);
```

写 `sdk.version()` 会抛 `TypeError`。

### 3.4 `stage.el()` 关闭时也返回 DIV

```js
sdk.stage.open('content');
const el = sdk.stage.el();       // 关着也返回节点
if (!sdk.stage.visible()) return; // 判断开关只能用它
```

### 3.5 `message.send` 未结束再调返回 `BUSY`

不排队、不是限频。发送锁自己加：

```js
var sending = false;
async function send(text) {
  if (sending) return;
  sending = true;
  try { await sdk.message.send(text); }
  catch (e) { sdk.debug.log('send fail', e && e.code); }
  finally { sending = false; }
}
```

限频（60 秒窗口）：`save.set` 20 次；`message.send` 手势 3 次 / 自动 3 次；`message.edit` 10 次。

### 3.6 `message.edit` 需要 `serverId`

`serverId === null` 表示服务端还不认得这条（开场白、刚发出未落库）。调用前判空，否则抛 `INVALID_ARGS`。

## 4. 安全模板

### 4.1 读档 + 迁移

```js
var SAVE_KEY = 'rex_save';
var SAVE_VER = 1;
function loadSave() {
  var raw;
  try { raw = sdk.save.get(SAVE_KEY); } catch (e) { return null; }
  if (!raw || typeof raw !== 'object') return null;
  if (raw.v !== SAVE_VER) return migrate(raw);
  return raw;
}
function migrate(old) {
  if (!old || old.v == null) return null;
  return { v: SAVE_VER, turn: old.turn || 0, cur: old.cur || {}, log: old.log || {} };
}
```

### 4.2 防抖写档

```js
var t = null;
function persist(data, immediate) {
  clearTimeout(t);
  var write = function () {
    sdk.save.set(SAVE_KEY, data).catch(function (e) {
      sdk.debug.log('save fail', e && e.code);
    });
  };
  if (immediate) return write();
  t = setTimeout(write, 300);
}
```

回合结算、玩家确认、离开面板时用 `immediate=true`。

### 4.3 舞台开关

```js
function openStage() {
  sdk.stage.open('content');
  if (!sdk.stage.visible()) return;
  var el = sdk.stage.el();
  if (!el || el.querySelector('.my-panel')) return;
  el.appendChild(renderPanel());
}
sdk.on('stage:close', function () { /* 平台关了，停循环、存进度 */ });
```

## 5. 错误码

源码 9 个：`UNAUTHORIZED` / `RATE_LIMITED` / `INVALID_ARGS` / `HOST_DENIED` / `NETWORK` / `NOT_SUPPORTED` / `BUSY` / `MODEL_UNAVAILABLE` / `UNKNOWN_CAPABILITY`。contract 收录 7 个，漏 `MODEL_UNAVAILABLE` / `UNKNOWN_CAPABILITY`。

处理原则：`NOT_SUPPORTED` 是预期降级（瘦预览），不报错；`BUSY` 不重试；`NETWORK` 给可见提示 + 重试入口，但不阻断文字游玩；`RATE_LIMITED` 退避后合并写。

## 6. 平台状态变量（契约未公布）

`sdk.vars.get/set` 与 `vars:change` **已确认存在**（仅新页、最多 6 层 80 键、按楼层回溯），但官方 `contract.json` 没给参数、返回值与导入字段。

- 可以讲行为边界，不能编造签名。
- 写代码前先要用户提供的新版 SDK 文档或导出样本。
- 现阶段状态栏仍走「AI 正文吐 `[status]` 块 → 前端解析 → `sdk.save`」，这是已确证可跑的路。
- 校验器把它们判 WARN（契约未补齐），不判"不存在"。
