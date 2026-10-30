# 旧版原生卡起点

保留原生聊天，不建立 iframe，不使用 sdk 或新版 data-chat。默认是零 JS 的 KV 捕获示例，协议外壳统一 `[status]…[/status]`；新版默认 JSON 与本例 KV 是不同的数据编码，不能共用解析器。

修改 card.config.json 的正文与规则。只做文字或换肤时删除不需要的状态规则，也不需要模型状态协议。theme.css 为可选样式；文档级单例可添加 runtime.js；逐消息 onerror 引擎需独立设计并验证，不把一次性 script 当逐消息定位器。

命令：`node scripts/init.mjs --route native --out work/native`，然后 `node scripts/build.mjs --route native --src work/native --out work/out --name example`。

主题 class/选择器必须按旧版目标站取证。原生动作是按需扩展的 Host 适配能力，与是否全屏 iframe 不是同一个维度。
