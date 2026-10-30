# Rex-MMD角色卡

**说清楚要什么，一起把卡做出来。**

给 MMD 做角色卡的方法论与工具链：从人设、世界书，到状态栏、捏人和独立界面，再到构建、检查与导入说明。你可以只给一个想法让 AI 补齐，也可以带着完整设定，逐项指定自己的结构、文风和视觉。

支持 **新版沙盒卡、旧版同层卡、旧版原生卡**，不处理酒馆或其他平台。

<p align="center">
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="https://nodejs.org"><img alt="Node.js 18 or newer" src="https://img.shields.io/badge/node-%E2%89%A518-brightgreen.svg"></a>
  <a href="references/58-内容恢复与验收.md"><img alt="Version 2.0.1" src="https://img.shields.io/badge/version-2.0.1-informational.svg"></a>
</p>

[这是什么](#这是什么) · [能做什么](#能做什么) · [安装](#安装) · [怎么用](#怎么用) · [三条路线](#三条路线) · [工具链](#工具链) · [目录](#目录)

## 这是什么

这是装进 AI 助手的 **skill**。它提供做卡时需要的流程、平台知识、参考实现和本地工具；仓库内有面向 WorkBuddy、Codex、Claude Code 的安装脚本。

它既能帮助从零做卡，也能接着已有项目改人设、补模块、换主题、修状态栏，或者只做检查和方案比较。**不要求每次都做整卡，也不要求所有作品套同一种模板。**

MMD 做卡容易遇到的麻烦是：有些错误看起来没有报错，却让整条链路失效。例如，新旧聊天页选错、可见 HTML 没接上触发标记、模型输出与解析器协议不一致、保存请求失败却仍显示成功。这个 skill 把这些经验整理成按版本区分的资料、校验器、合同测试和错题本，便于定位问题。

## 能做什么

| 方向 | 内容 |
|---|---|
| **人设与文风** | 单角色、多角色、世界推演、关系与长期设定；自由正文、笔记体、Markdown、YAML、标签式或自定义格式 |
| **世界书** | 地点、组织、人物、规则、图鉴与线索；常驻/关键词触发规划、独立 JSON、整卡内嵌与格式转换 |
| **状态栏 / HUD** | 体力、资源、好感、时间、地点、任务、状态标签等；有字段候选库，也能自行命名和设计 |
| **封面与捏人** | 按作品需要设计开场、身份选择、创建角色和提交草稿；固定角色可以直接入局 |
| **界面与换肤** | 原生聊天美化、面板、地图、导航、明暗主题、舞台界面或旧版同层独立 UI |
| **状态与存档** | 白名单解析、缺字段继承、数值裁剪、快照、命名存档、失败重试与续档；按路线和作品需求启用 |
| **修复与复刻** | 拆解现有卡、排查点火与协议、保留可复用资产、参考交互并重新设计题材与视觉 |
| **交付与验证** | 正则 JSON、人设文本、独立世界书、v2 整卡 JSON、PNG 封装、本地预览与检查结果 |

这些是可组合的能力，不是一张必须填满的清单。只要人设就写人设，只要换肤就改换肤；地图、身体档案、捏人和复杂游戏模块都按需选择。

世界书的关键词触发可以减少每轮常驻设定，但触发后的正文仍会占用上下文，需要做预算。

## 安装

需要 **Node.js 18+**。基础脚本不需要安装第三方 npm 依赖；运行浏览器回归时需要本机 Chrome 或 Edge。命令行克隆仓库另需 Git。

### 让助手安装

把这句话发给支持本地技能安装的助手：

> 帮我安装这个 skill：https://github.com/DoDoREX1128/rex-mmd-card ，保留 rex-mmd-card 安装名。

已有安装时，可以让助手检查当前版本并更新，保留你的项目和自定义内容。中文显示名是否可设置取决于宿主；默认安装名保持 `rex-mmd-card`，便于复用调用示例。

### 命令行安装

```bash
git clone https://github.com/DoDoREX1128/rex-mmd-card.git
cd rex-mmd-card

# 先查看安装目标，不写入文件
node scripts/install.mjs --target codex --dry-run

# 按使用的助手选择一种
node scripts/install.mjs --target codex
node scripts/install.mjs --target workbuddy
node scripts/install.mjs --target claude
```

| 参数 | 说明 |
|---|---|
| `--target` | `workbuddy` / `codex` / `claude`，必填 |
| `--scope` | `user`（默认）或 `project` |
| `--dir` | 项目级安装的项目根目录 |
| `--name` | 自定义安装目录名；使用前确认目标宿主支持该命名方式 |
| `--force` | 更新同名安装；旧目录改名保留，不直接删除 |
| `--dry-run` | 只显示安装位置，不写盘 |

项目级安装示例：

```bash
node scripts/install.mjs --target codex --scope project --dir /path/to/project
```

以 `--dry-run` 打印的位置为准。安装后按宿主的技能刷新方式重新加载；如果列表未更新，可新开会话检查。

### 手动放目录

也可以复制技能文件夹，或下载 ZIP 后解压。**包含 `SKILL.md` 的那一层才是技能根目录**，不要再多套一层空目录。

安装脚本默认采用的目录约定如下，宿主或环境变量有自定义配置时请检查实际输出：

| 宿主 | 用户级 | 项目级 |
|---|---|---|
| WorkBuddy | `~/.workbuddy/skills/rex-mmd-card/` | `<项目>/.workbuddy/skills/rex-mmd-card/` |
| Codex | `~/.agents/skills/rex-mmd-card/` | `<项目>/.agents/skills/rex-mmd-card/` |
| Claude Code | `~/.claude/skills/rex-mmd-card/` | `<项目>/.claude/skills/rex-mmd-card/` |

Windows 下 `~` 通常指用户主目录。不安装也可以在克隆的目录里阅读资料、运行脚本和自测。

## 怎么用

正常描述需求即可，也可以显式调用 `$rex-mmd-card`。

> 帮我做一张修仙题材的新版沙盒卡，要状态栏和轻捏人，水墨风。人设按我的章节写。

> 只写角色人设，保留我这种人物小传的文风，不需要界面和状态协议。

> 给旧版原生聊天做一套换肤和轻量状态栏，保留原来的聊天手感。

> 我想做旧版同层 UI。先比较方案，说明哪些原生操作需要额外适配。

> 这个卡导入后界面不出现，帮我定位原因，先保留现有结构。

> 检查这份世界书的关键词、常驻预算和导入格式，先不要改正文。

### 先沿用你已经确定的东西

平台、题材、参考、结构和风格已经说明，就直接使用；只有缺失信息会实质改变产物时才提问。你可以说“你来定”，也可以指定到每个字段、按钮和章节。

**人设默认自由定制。** 不强制六块结构、固定开头、平均行长、标点密度或句式禁令。笔记体是可选写法，因果解释、修辞、性格标签和完整段落也可以保留；风格检查需要显式开启。

需要模型状态时统一使用 `[status]…[/status]`。新版默认 JSON，旧版轻量 KV 使用自己的编码与配套解析器；无状态需求时不会为了“完整”强加状态协议。

### 大卡分阶段，小任务直接做

复杂新界面可以按以下顺序推进：

| 阶段 | 作用 |
|---|---|
| 定位 | 区分运行环境、呈现方式和当前任务 |
| 方案 | 确定玩法、信息层级、模块、状态来源与验收目标 |
| 原型 | 用假数据确认主要界面和关键交互 |
| 本地模拟 | 接上实际发布包、协议和存档，运行适用检查 |
| 目标站 | 核对当前 MMD 部署的导入与真实行为 |
| 实体设备 | 在实际设备上验证输入、布局和游玩体验 |

这是一套可选工作顺序，不是每次都要走的审批链。纯内容、局部修复、检查或比较只执行相关部分；用户已授权代选时不重复确认。

## 三条路线

| | **新版沙盒卡** | **旧版同层卡** | **旧版原生卡** |
|---|---|---|---|
| 运行环境 | 新聊天页，`chatVersion: 1` | 旧聊天页，`0` 或缺省 | 旧聊天页，`0` 或缺省 |
| 呈现方式 | 官方 SDK、稳定钩子与舞台 | Host 适配原生页面，隔离 Frame 提供独立 UI | 保留原生聊天，按需加换肤、气泡与组件 |
| 独立正则包 | 5 个必填键，`personality` 可选 | 恰好 4 键，不带 `chatVersion` / `personality` | 同左 |
| 主要能力 | SDK 状态交互、舞台、作者存档 | 自定义信息架构、已实现的桥接动作、作用域本地存储 | 纯文字、轻量 KV、主题及按需逐消息引擎 |
| 自带起点 | `assets/skeleton/` | `assets/samelayer/` | `assets/native/` |
| 主要代价 | 受公开 SDK 和宿主能力边界限制 | 需要维护 DOM 适配、通信和生命周期 | 样式与组件需要跟随旧版目标页面 |

**新版/旧版决定执行环境，同层/原生决定呈现方式。** 旧版原生增强可以与轻量 Host 面板组合，但新版 SDK、旧版桥接、导入格式和选择器不能跨环境照搬。

同层自带的是少量基础动作的开发起点，**没有实现参考上游全部 61 项动作**。编辑、删除和回溯等未实现项会明确返回 `not-implemented`，需要按作品接入并验收。

新版宿主换肤也按通道区分：角色 CSS 不能直接穿透跨源父页面；公开颜色桥和受控 `data-host` CSS 是否可用，需要按目标域名、日期和面板检查。详见 [平台分流](references/20-平台-分流.md) 与 [宿主弹窗边界](references/47-界面-宿主与弹窗边界.md)。

## 工具链

日常使用可以让助手运行这些工具，不需要记住所有命令。需要手动构建时，先按路线选择起点。

### 新版沙盒卡

```bash
node scripts/init.mjs --route sandbox --out work/src
# 按作品修改源码、content.json 与 modules.json，按需添加 persona.txt
node scripts/build.mjs --route sandbox --src work/src --out work/out --name example
node scripts/validate.mjs work/out/example-regex.json --platform sandbox
node scripts/preview.mjs --card work/out/example-regex.json --src work/src --out work/out
node scripts/e2e.mjs --card work/out/example-regex.json --src work/src --out work/out
```

### 旧版原生卡

```bash
node scripts/init.mjs --route native --out work/native
node scripts/build.mjs --route native --src work/native --out work/out --name example
```

### 旧版同层卡

```bash
node scripts/init.mjs --route same --out work/same
node scripts/pack-samelayer.mjs --host work/same/host.js --frame work/same/frame.html --out work/out --name example
node scripts/validate.mjs work/out/example-regex.json --platform legacy
node scripts/preview-samelayer.mjs --host work/same/host.js --frame work/same/frame.html --out work/preview --name example
```

初始化默认保留已有文件；要复制示例人设时显式加 `--with-persona`。不同项目请使用各自的源码与输出目录。

其他常用工具：

| 工具 | 用途 |
|---|---|
| `analyze.mjs` / `replay.mjs` | 拆解已有卡、检查正则链与残留标记 |
| `validate-worldbook.mjs` | 单独检查世界书结构与字段类型 |
| `worldbook-project.mjs` | 中大型世界书的稳定源条目、重排、归档、构建与核对 |
| `card-png.mjs` | 将 v2 整卡 JSON 封装进 PNG |
| `check-skin.mjs` | 提示视觉相似度，供人工判断参考意图 |
| `gen-facts.mjs` | 由事实数据生成参考表，并用 `--check` 检查一致性 |
| `pack-skill.mjs` | 生成不含工作现场、测试临时文件与版本库的分发副本 |

## 交付与验证

按任务交付独立正则、人设、世界书，或将相关内容封进 v2 整卡。MMD 整卡默认推荐 PNG；JSON 可以作为备份与再加工源，直接导入是否可用需确认目标入口。

**新版导入提醒**：新建卡，并在首次保存前选择“使用新版”聊天页。给已有旧卡导入正则不能将它升级到新页；独立正则包中的 `personality` 也不会写入人设栏，人设需另贴。

验证结果分开报告：

| 层级 | 能证明什么 |
|---|---|
| E1 已生成 | 文件已落盘 |
| E2 静态检查 | 对应结构、限额和静态规则通过 |
| E3 本地行为 | 本地模拟或浏览器中的相关路径通过 |
| E4 目标站 | 当前目标 MMD 页面的相关行为已验证 |
| E5 实体设备 | 在实际设备上完成了相关测试 |

2.0.0 在 2026-10-30 的本地验收记录：**60 项脚本自测、21 项合同测试、14 项 Chrome 浏览器检查通过**。真实 MMD 与实体手机未在该次修订中执行，不能由本地通过推定。详见 [修订验收记录](references/57-修订验收.md)。

```bash
node scripts/test.mjs
node --test scripts/test-contracts.mjs
node scripts/gen-facts.mjs --check
```

## 2.0.1：恢复详细制作方法

本版补回入口阶段说明、完整资料路由，以及被过度删减的操作方法、扩展示例和验收模板。三路线分开、人设可自定义、统一 `[status]` 与此前代码修复继续保留；旧规则有误的地方按实际契约纠正。逐篇恢复、迁移与不原样恢复的原因见[内容恢复映射](references/58-内容恢复与验收.md)。

新增 `node --test scripts/test-authoring.mjs` 覆盖创建开关、字段校验、草稿失败、原始导出和文档扩展示例；`node scripts/e2e-authoring.mjs` 在本地 Chrome/Edge 中点击四种开局组合、校验表单与输入失败回退。代码测试只证明被测场景，不能证明所有创作任务和真实目标部署。

## 目录

```text
rex-mmd-card/
├── SKILL.md                 技能入口：任务、路线、自由创作与技术边界
├── facts.json               已记录的平台值、证据与实现能力
├── README.md / LICENSE
├── references/
│   ├── 00 / 01 / 10 / 11    阅读路径、流程与需求补全
│   ├── 20–25                平台分流、事实表与 SDK 速查
│   ├── 30–33                状态、世界书、人设、存档与续档
│   ├── 40–47                界面、视觉、可选捏人、外链与宿主边界
│   ├── 50–58                拆解、验收、交付、裁决与修订记录
│   ├── fields/              可选字段候选库
│   └── errors/              带版本与证据的历史错题本
├── assets/
│   ├── skeleton/            新版沙盒模块起点，可按需调整
│   ├── native/              旧版原生轻量起点
│   ├── samelayer/           旧版 Host / Frame 起点
│   ├── kits/body-dossier/   可选身体档案组件
│   └── skin/               视觉 token 与参考配色
├── examples/                最小 HUD、同层包与换肤对照
└── scripts/                 构建、校验、预览、测试、安装与分发工具
```

第一次使用可从 [总览与阅读路径](references/00-总览与阅读路径.md) 开始；完整执行说明见 [SKILL.md](SKILL.md)。字段库是候选池，错题本是可复验的历史记录，都不会替你决定作品必须有哪些内容。

## 范围与许可

专注 MMD，不处理 SillyTavern 等其他平台；不绕过鉴权或伪造平台数据，不把未实现的原生动作、未完成的保存或未执行的测试说成成功。

MIT，见 [LICENSE](LICENSE)。可使用、修改和商用，需保留相应版权与许可声明；另行引入的素材和依赖按各自许可处理。
