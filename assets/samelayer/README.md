# assets/samelayer · 旧版同层卡最小骨架

两个文件，能跑，能打包，能验收。它**不是**成品 HUD，是"骨架 + 范式"：

```
host.js      平台页内的适配层（能摸原生 DOM）
frame.html   iframe 里的界面（完整 HTML，可自由换成任何框架）
```

## 它们怎么接起来

```
statusbar 【REXHUD 001】
  → pack-samelayer.mjs 生成分片链
  → 链尾 launcher 注入 host.js
  → host.js 建 iframe，srcdoc = frame.html
  → frame 发 frame-ready → host 回 result
  → 之后所有操作：frame postMessage('invoke') → host 找 DOM → 回 result
```

## 已经接好的动作（4 个）

| Frame 调用 | Host 做什么 |
|---|---|
| `snapshot` | 返回消息数、输入框/发送键是否存在、页面标题 |
| `setInput({text})` | 用原生 setter 写 textarea + 派发 input/change |
| `send` | 点原生发送键 |
| `openPersona` / `openMore` | 按 `ico_*` 片段或候选选择器点入口 |
| `fillDialog` / `confirmDialog` | 在已打开的对话框里填第一个输入框 / 点确认 |

`editMessage` / `deleteMessage` / `rollbackMessage` **故意返回 not-implemented**——这三件事每个平台版本的 DOM 与确认流程都不一样，必须先登记选择器再实现。**不假装能做**，是这个骨架的设计原则。

## 扩展一个动作的步骤

1. 在 `SEL` 里加**至少两个**候选选择器（class + `data-*`）。
2. 在 `invoke` 里加一个 `case`，返回 `{ok:true}` 或 `{ok:false, reason}`。
3. 在 `references/22-平台-同层卡架构.md` 的动作表里登记。
4. 用 `preview-samelayer.mjs` 的仿平台页点一次，确认按钮真的动了。

## 选择器的现实

成品 HUD 卡里，Host 适配层有 **146 个选择器**，覆盖消息、输入、发送、快捷键栏、指令栏、聊天设置、总结面板、更多菜单。这不是过度设计——平台每个弹窗都是独立 DOM，少一个就有一个功能不可用。

所以：

- 不要用"一个功能一个选择器"的写法，用候选链。
- 找不到就降级，`return {ok:false, reason:'not-found'}`，Frame 显示"当前版本不可用"。
- 平台改版时只改 `SEL`，Frame 不动。

## 安全与边界

- Frame 通过 `srcdoc` 加载，与宿主同源；生产环境应改为独立文件 + 收紧 `postMessage` 的 `targetOrigin`（当前用 `'*'` 仅为骨架方便）。
- Host 不读凭据、不写 cookie、不发网络请求。
- 所有 `innerHTML` 只用于固定模板；用户/AI 文本一律 `textContent`。

## 自测

```bash
# 1. 打包（生成 5 键 chatVersion:0 JSON）
node scripts/pack-samelayer.mjs --host assets/samelayer/host.js \
     --frame assets/samelayer/frame.html --out work/samelayer-test --name demo

# 2. 点火重放（必须 0 残留）
node scripts/replay.mjs work/samelayer-test/demo-regex.json

# 3. 仿平台壳（浏览器打开，点底部按钮看宿主是否响应）
node scripts/preview-samelayer.mjs --host assets/samelayer/host.js \
     --frame assets/samelayer/frame.html --out work/samelayer-test --name demo
```
