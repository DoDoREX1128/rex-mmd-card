# 模块化场景完整克隆模板

旧版同层 Host/Frame 应用。独立实现页面与注册式运行时，复用既有中性原生适配；无网络字体、地图图片、音频或原始卡文件依赖。内置两套自制内容用于换题材验证，不要求新作品采用这些题材。

## 克隆与构建

在 skill 根目录执行；新项目目录必须为空，不覆盖已有工程：

```text
node scripts/modular-scenes.mjs init "<新项目>" --name my-card --title "卡名"
node scripts/modular-scenes.mjs status "<新项目>"
node scripts/modular-scenes.mjs sync "<新项目>"
node scripts/modular-scenes.mjs build "<新项目>"
node scripts/modular-scenes.mjs verify "<新项目>"
```

`init --variant orbit` 可用另一套内容和配色；默认 `harbor`。两者的 frame/host 源码一致。初始化还会把构建、审阅同步、校验和浏览器测试所需工具复制到 `工程/tools`，以后可用 `node "<项目>/工程/tools/scripts/modular-scenes.mjs" build "<项目>"` 独立重建，无须保留 skill 原安装位置。

Node.js 18+ 支持构建；浏览器回归需 Node.js 22+ 及 Chrome/Edge。系统有多个浏览器时可用 `CHROME` 指定程序。受沙箱限制不能正常启动浏览器时，明确报告未运行或通过审批运行，不修改测试来跳过断言。

## 文件改造表

| 文件 | 职责 | 换卡修改方式 |
|---|---|---|
| `content.json` | 标题、封面、主题、创建字段、人物、百科、地图、音景、状态字段、帮助 | 换皮肉的主要位置；稳定 ID 及引用对应 |
| `content/persona.txt` | 叙述与模型状态协议 | 按作品写作；字段变化须与 initialState/statusFields 一致 |
| `content/opening.txt` | 第一段创作内容 | 不放模块头和载荷；构建器保持当前链式状态栏入口 |
| `content/worldbook.json` | 常驻/触发内容 | 用户经世界书审阅稿修改；保留 UID/关键词/元数据 |
| `frame/layout.css` | 版式、断点、尺寸与阅读密度 | 常规主题只改 content.theme；改变版式须回归移动端 |
| `frame/runtime.js` | 十个注册场景、导航、创建、消息、偏好、地图、音乐、存档、诊断 | 固定骨架；不为每个题材改此文件 |
| `frame/state.js` | 状态重建、合并/清空、角色过滤、存档格式校验 | 固定契约；不按人物名硬编码 |
| `host/*.js` | mmd-sl/1 握手、消息/原生适配、作用域及本地存储 | 独立于最小基座协议；仅目标部署差异时适配 |
| `testing/browser.mjs` | 有超时的本机浏览器驱动 | 只用于本地回归，不进入正式卡载荷 |

用户直接改 `交付/01–03` 审阅稿，Agent 执行 sync/build。双改冲突、未落实世界书意见或交付包被外改时停止，不静默覆盖。不要用 `project.mjs` 或完整 HUD 的 Python 构建器覆盖本工程。

## 页面与完整功能范围

1. 封面：创建、阅读、续档、资料入口，导航可返回。
2. 创建：身份→目标/地区→角色库→摘要；人物详情、前后步骤和草稿保留；只生成可编辑创建草稿，不自动发送。
3. 阅读：真实 Host 消息、用户/模型区分、滚动位置、状态侧栏、模型选项写草稿、原生输入回写与确认发送；失败保留草稿，不自动重试。
4. 百科：分类、文本搜索、正文详情及关闭返回。
5. 地图：SVG 数据节点、路线、地点详情、指针拖动、滚轮/按钮缩放和复位。
6. 音乐：用户触发的内置合成音景、音量与暂停；可配置自有 HTTPS 音频，错误可见。
7. 偏好：字号、行距、作品主题/浅色阅读；刷新恢复。
8. 存档：自动槽、命名槽、恢复、删除确认、JSON 导出/导入；验证版本、作品与数据类型。
9. 诊断：连接与解析错误、当前状态、消息版本列表、忽略/恢复选定消息状态、重新读取。
10. 帮助：操作说明和原生人设/会话/模型/设置等入口；让位原生后可返回，重入不叠 iframe。

原生完整处理器保留，但本模板不重做全部原生设置面板。编辑、删除、回溯等原生操作在原生页完成，消息更新后同层重建；不能把处理器数量当作本模板具有同数量的专用 HUD 面板。

## 数据与生命周期

模型状态为 `[status]JSON[/status]`，顶层白名单由 `initialState` 定义，`statusFields` 指向相应展示字段。对象合并、缺键继承、列表整组替换，空数组可清空；只有 assistant 消息参与，按宿主消息顺序重建，不靠 turn 去重。坏 JSON 留住之前状态并进诊断，生成中半块不应用。模型状态不被旧存档覆盖。

协议隐藏规则在载荷展开前运行，避免篡改代码内的协议示例。状态块不超过 8000 字符；字符串中的 `<`、`>`、`&` 使用 JSON Unicode 转义。隐藏规则不会把含这些原始字符的块插入 HTML。超长、实体编码和目标净化器行为仍需目标站验收。

创建稿、玩家资料、阅读偏好与版本选择通过 `scene.load/save` 保存。Host 沿用真实账号/角色/会话确认与请求上下文检查，存储键额外包含 appId；无作用域、超限和写入失败明确报错。存档只在成功写入后更新，串行写入。Frame 不保存凭据，不另读父页面存储。切会话重建 Frame，离开页面释放监听、MessagePort 和音频。

修改字段或创建选项：同时检查 persona、worldbook、initialState、statusFields 和示例模型输出。`creation` 的 `name` 为姓名键，步骤 0/1 为可配置字段，步骤 2/3 为同伴与确认；`characters/entries/places/tracks` 的 id 稳定唯一，地图 x/y 为数值。改桥接/生命周期/导航结构属于改骨，须重新验收。

## 验证与发布

```text
node --test scripts/test-modular-scenes.mjs
node scripts/e2e-modular-scenes.mjs --project "<项目>" --out "<报告目录>"
```

前者覆盖纯状态、存档负例、两题材独立工具链、可复现构建、交付回读、点火后 Host/Frame 字节还原、审阅回写与冲突保护。后者使用真实生成的 Frame 和真实 MessagePort，以本地模拟宿主验证 1440/390 两种视口的交互、错误、恢复、会话隔离和音频，生成截图及报告。不是仅检查模块注册表，也不算 E4/E5。

成功构建产生 `交付/persona.txt`、`worldbook.json`、`regex.json`、根目录 `预览.html` 和 `工程/builds/release-manifest.json`。正则为旧版四键/id=-1，包含协议隐藏与载荷链；verify 检查发布文件和源码快照哈希。复刻整卡 PNG 可继续使用 skill 的 card-png 工具，不把封装成功当导入验证。

当前目标站和实体设备均未验证；需用户给出实际聊天页后按 54 验收。离线预览/手机视口不代表真实 MMD 或手机设备兼容。
