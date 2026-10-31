---
name: rex-mmd-card
description: 为 MMD 创建、修改、检查角色人设、世界书、状态栏和界面，区分新版沙盒卡、旧版同层卡、旧版原生卡。支持自定义人设结构与文风、分路线构建、行为验收与目标站/实体设备实测；不处理酒馆或其他平台。
license: MIT
metadata:
  author: DoDoREX1128
  version: "2.2.0"
  repository: https://github.com/DoDoREX1128/rex-mmd-card
  compatibility: Node.js 18+；基础脚本无第三方依赖，浏览器回归需要 Chrome 或 Edge。
---

# Rex MMD 角色卡制作

沿用用户已确定的平台、素材、结构、文风与授权。只完成当前任务需要的产物；纯文字、人设、世界书或检查任务不强制走整卡工程。

## 从零做整卡：先准备用户交付区与Agent工程区

路线确定后，在用户指定的主项目目录先运行 `project.mjs init`，再开始创作。主目录只分为“交付”和“工程”；不要把用户项目直接堆在 skill 安装目录，也不要迁移或覆盖已有工程来凑规范。

“交付”固定准备：`00-使用与验收.md`、`01-人设审阅.txt`、`02-开场白审阅.txt`、`03-世界书审阅.md`，以及生成的 `persona.txt`、`regex.json`、`worldbook.json`。初始化时它们是明确标记的空白草稿，不能伪装为已完成角色卡。

用户只需修改审阅稿、查看成果与体验；不要求读源码。世界书MD提供全书概览、条目目录、逐条触发与正文、独立修改意见，保留导入元数据但不把技术JSON当成审阅内容。

Agent在“工程”维护源文件、任务记录、构建快照、报告和备份。继续前先 `project status`，按需 `sync`，成功构建后才更新导入文件；审阅稿与源内容双改、未处理修改意见或外部产物改动时，先核对，不静默选源码覆盖用户。完整结构、回写规则和边界见 [02工作区与审阅交付](references/02-项目工作区与审阅交付.md)。纯内容、小修和已有工程按实际范围使用，不强制重新初始化。

## 任务与流程

| 用户请求 | 执行 |
|---|---|
| 介绍能力、规划 | 给范围、方案与取舍；仅规划不自动制作 |
| 创建、修改、修复 | 核对现状，完成必要改动与适用验证 |
| 比较、检查、验收 | 默认只读，给证据、结论和未验证边界，不顺带改稿 |
| 继续 | 读项目记录，核对实际文件，接续已授权事项 |

简单任务直接执行。复杂新界面可用定位→方案→原型→本地模拟→目标站→实机；按本次范围选择阶段。用户委托代选时自行完成设计并说明选择，不重复确认。只有缺失信息会实质改变产物时才提问。详细流程见 [01](references/01-流程-心流与状态机.md)。

### 复杂制作保留的操作骨架

| 阶段 | 要解决什么 | 可复查产物与下一步 |
|---|---|---|
| S0定位 | 本次范围、环境、路线、已有资产；从零整卡先初始化工作区 | 关键信息确定或已有授权可代选，交付/工程目录已就位 |
| S1方案 | 核心循环、信息架构、字段、权威源、存档和未知项 | 方案与必要线框，按[10](references/10-流程-三问与方案.md)检查衔接 |
| S2原型 | 首屏、一个主功能和完整返回链 | 可点击假数据页，方向符合本次要求 |
| S3本地 | 对应路线构建、协议、错误与重入 | 静态/行为结果和截图，失败项已处理或说明 |
| S4目标站 | 先拿到用户给的聊天页 URL，再验证实际平台净化、SDK/Host、输入、保存与布局 | 跑 `live.mjs`，按[54](references/54-验收-真实平台测试.md)留可见步骤与证据 |
| S5实体设备 | 实体 Android 设备上的触摸、软键盘、横屏、后台再进和多轮体验 | 跑 `live-mobile.mjs`；桌面视口模拟不计入 E5 |

纯内容、小修、只读比较只执行适用部分；复杂项目也可合并阶段。缺真实站或设备时完成可做部分并列NOT RUN，不制造审批等待。

已有工程先读main.md/plan.md/manifest（若存在）、保留当前产物，核对入口、协议与字段，再重现问题；按文案→皮肤→模块→骨架评估必要改动。复刻先analyze并写对照表，不能通过改名换色就声称已复现。一句话需求先提取时代、场景、关系、压力和欲求，再按[11](references/11-流程-一句话补全.md)补假设，不硬塞固定玩法。

## 三类卡分别选工具

| 路线 | 运行方式 | 生成与验证 |
|---|---|---|
| 新版沙盒卡 | chatVersion=1；公开 SDK、data-chat/data-slot、sdk.stage | project init --route sandbox → project build；底层build/validate sandbox |
| 旧版同层卡 | 旧页；Host 适配原生 DOM，隔离 Frame 提供 UI | project init --route same → project build；底层pack-samelayer/validate legacy |
| 旧版原生卡 | 保留旧版聊天；纯文字、KV/气泡、换肤、可选逐消息引擎 | project init --route native → project build；底层build native/validate legacy |

新版/旧版是执行环境；同层/原生是呈现方式。旧版原生增强与轻量 Host 可以按需组合，不能混用跨版本 SDK、导入包和选择器。旧版原生动作并非 iframe 专属，但需要目标 DOM 适配。详见 [20](references/20-平台-分流.md)。

新版正则包五个必填键：chatVersion/pageDepth/statusbar/beginning/regex_scripts；personality 可选且导入正则不写入人设栏。旧版正则包恰好 pageDepth/statusbar/beginning/regex_scripts 四键，不带 chatVersion/personality；每条规则四字段，旧版 id 固定 -1，新版为负整数。状态栏可为空，不为纯换肤或纯人设虚构 HUD。

## 人设与内容自由

- 人设结构、章节、字段、长度分配、语言和文风由本次需求决定。自由正文、Markdown、YAML、成对标签、笔记体及用户自定义格式均可；不强制六块、固定角色标签、行长、标点密度或十条句式禁令。
- 先保留用户稿件与作者风格；有因果、有修辞、有性格标签均不自动判错。只在用户要紧凑笔记体或明确要求时采用相应建议。
- 写作建议与平台限制分开。机器校验默认检查长度、危险可执行内容、旧占位符和实际协议；可选 --style-lint 仅提示笔记体偏好，不证明内容质量。
- 不自动把示例人设塞入成品。只写界面可以没有 persona.txt；有模型状态协议时，另给可复制的模型侧说明。

详细写作与示例见 [32](references/32-内容-人设与文风.md)。世界书见 [31](references/31-内容-世界书.md)，独立 JSON 与整卡内嵌结构须显式转换。

## 协议、存档与发送

需要模型提供状态时，使用 **[status]…[/status]**。新版默认块内 JSON；旧版轻量 KV 可用同一外壳但必须配套自己的解析器。无状态需求时不添加状态协议。

字段声明、模型说明、解析器、消耗规则和模拟输出须一致。规则负责隐藏或渲染数据块，脚本读未经替换的 msg.content。数值/路径/类型经白名单裁剪；坏输出保留上一份有效状态，空列表可合法清空。详见 [30](references/30-内容-状态与字段.md)。

跨刷新保留进度就需要持久化，不能只按是否跨设备选择 sdk.save。新版用 SDK 存档，临时 UI 用 cache；旧版使用经验证的账号/角色/会话作用域本地存储。禁止静默切换存储来源或用固定示例 scope。长线作品按需启用命名槽、串行写入、可见失败与重试、迁移和一次性续档上下文；[33](references/33-内容-存档与续档.md) 区分默认实现与扩展。

选项默认写草稿，玩家确认再发送。发送锁、防重复、失败保留草稿、续档只消费一次。程序规则与模型叙述分工明确，同一数值只选一个权威源。平台状态变量行为已记录，但公开执行契约未齐，不编造 sdk.vars 签名或导入字段。

## 平台技术边界

新版代码先读 [21](references/21-平台-新页事实.md) 与 [25 SDK 签名](references/25-平台-SDK速查.md)。气泡绑定与运行时订阅按生命周期处理；长期画布/面板放舞台，清理计时器、监听与资源。新版作者 HTML 不依赖自写 data-*；纯 style/script 的装卡抽取是新版行为，不套给旧版。

旧版原生先读 [24](references/24-平台-旧版事实.md)；逐消息 onerror 与文档级 script 初始化分开。HTML 属性引号和内部 JS 引号必须正确转义，不能要求内外都用单引号。样式用作品作用域，不把新版 data-chat 当旧版稳定接口。

旧版同层先读 [22](references/22-平台-同层卡架构.md) 与 [骨架说明](assets/samelayer/README.md)。自带基座是少量基础动作的开发起点，**并未实现参考上游全部 61 项**；能力表区分已实现、当前可用、参考能力与真站验证。未实现动作返回 not-implemented，不显示假入口。

宿主换肤分直接 CSS、公开颜色桥、受控 data-host CSS；跨源不允许直接访问 parent DOM，也不意味着所有主题桥都不存在。按目标域名/日期/入口/通道验收，见 [47](references/47-界面-宿主与弹窗边界.md)。外链与媒体按 CSP、CORS 和失败降级分别验证，见 [46](references/46-界面-外链与CSP.md)。

## 工具与交付

所有脚本从本 skill 的 scripts 目录解析；项目目录由用户指定，已有文件默认保留。

从零整卡优先使用以下入口，先把 `<项目目录>` 替换为用户位置；用户不需要执行命令：

    node scripts/project.mjs init "<项目目录>" --route sandbox --name example --title 卡名
    node scripts/project.mjs status "<项目目录>"
    node scripts/project.mjs sync "<项目目录>"
    node scripts/project.mjs build "<项目目录>"

底层init/build/pack/preview继续保留给已有工程与调试，具体参数见20/40/51。工作区工具完成三路线构建和静态检查，不自动宣布行为或目标站通过。维护skill工具时按改动执行：

    node scripts/test.mjs
    node --test scripts/test-contracts.mjs
    node --test scripts/test-authoring.mjs
    node --test scripts/test-project.mjs

维护骨架的封面/创建流程时，另跑 `node scripts/e2e-authoring.mjs`，验证发布包的四种开局配置和真实按钮/输入行为；它不是每张纯文字卡的强制步骤。

真实站与实体设备测试用 `live.mjs` / `live-mobile.mjs`。入口 URL 必须由用户提供，不接受创卡页、首页或相似卡：

    node scripts/live.mjs --url "https://<MMD域名>/#/pages/chat/chat?roleId=<角色卡ID>&prePath=1" --strict
    node scripts/live-mobile.mjs --url "<同一入口>" --rotate

拿不到 URL、未装 bsk、没有 Android 设备，脚本落 NOT RUN 并退出 3，不降级成桌面模拟。

旧版原生命令把 route 改为 native；旧版同层使用 pack-samelayer --host/--frame。世界书可独立 validate-worldbook；大型世界书使用 worldbook-project 的稳定源条目。整卡可由 build 生成 v2 JSON，再以 card-png 封装 PNG；PNG 封装成功不代替内部格式与导入验收。

交付用户已选形态；未选时按本次使用场景推荐，不强制每次弹窗。MMD 整卡优先 PNG；JSON 的目标入口支持需确认。新版必须说明新建卡、首次保存前选新版聊天页，不能靠给旧卡导入正则升级。

验证分开报告：E1 已生成 / E2 静态通过 / E3 本地行为通过 / E4 目标站通过 / E5 实体设备通过。E4 与 E5 只测用户给的聊天页 URL，手机视口模拟不计入 E5。未执行写 NOT RUN，不把静态、模拟或 PNG 回读当真站验证。发布检查见 [55](references/55-交付-发布前检查.md)。

### 按任务读取详细方法

| 当前任务 | 参考 |
|---|---|
| 新整卡准备目录、给用户审阅/修改、同步和重建 | [02标准工作区](references/02-项目工作区与审阅交付.md) |
| 定位、方案、一句话补全、继续 | [01流程](references/01-流程-心流与状态机.md)、[10方案模板](references/10-流程-三问与方案.md)、[11推导方法](references/11-流程-一句话补全.md) |
| 三路线与平台机制 | [20分流](references/20-平台-分流.md)、[21新版](references/21-平台-新页事实.md)、[22同层](references/22-平台-同层卡架构.md)、[24原生](references/24-平台-旧版事实.md)、[25 SDK](references/25-平台-SDK速查.md) |
| 模型数据、内容、存档 | [30状态](references/30-内容-状态与字段.md)、[31世界书](references/31-内容-世界书.md)、[32人设](references/32-内容-人设与文风.md)、[33续档](references/33-内容-存档与续档.md) |
| 模块、布局、视觉 | [40真实接口与扩展例子](references/40-界面-卡架构.md)、[41三种布局](references/41-界面-基线.md)、[42主题与视觉](references/42-界面-视觉.md) |
| 封面、捏人、改造与素材 | [43构图与交互](references/43-界面-封面与捏人.md)、[44创建协议](references/44-界面-捏人协议.md)、[45骨架与内容](references/45-界面-骨架与皮肉.md)、[可选身体档案](assets/kits/body-dossier/authoring.md) |
| 外链、媒体、宿主 | [46 CSP与回退](references/46-界面-外链与CSP.md)、[47三个换肤通道](references/47-界面-宿主与弹窗边界.md) |
| 拆卡与复刻 | [50历史样本](references/50-验收-示例拆解.md)、[51导出/重放/对照](references/51-验收-复刻验收.md) |
| 校验、排障、真站、交付 | [52冒烟](references/52-验收-静态与冒烟.md)、[53排障](references/53-验收-真平台踩坑.md)、[54可执行用例](references/54-验收-真实平台测试.md)、[55交付清单](references/55-交付-发布前检查.md) |

### 交付说明要包含

先链接“交付/00-使用与验收.md”和实际审阅稿，说明卡名与路线、导入步骤、已验证层级、未验证项和能力限制；工程日志不是用户必读材料。新版分离交付人设另贴，世界书独立导入；整卡PNG仍须新建并首次保存前选新版。创建、状态、存档三种协议不能混为一谈，默认草稿可改，失败保留。

## 资料与维护

[总览](references/00-总览与阅读路径.md) · [事实表](references/23-平台-事实表.md) · [字段候选库](references/fields/README.md) · [错题本](references/errors/README.md) · [能力边界与证据](references/56-能力边界与证据.md)。facts.json 维护已记录平台值；作者偏好与实现能力分列。生成表一致不等于运行时一致，修改后运行三路线与协议合同回归。

不处理酒馆，不绕过平台鉴权，不伪造原生能力、保存成功或验证结论。只在明确需要时加载可选视觉/身体档案组件，不把参考卡题材变成所有作品的要求。
