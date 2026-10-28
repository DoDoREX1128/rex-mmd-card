<div align="center">

# Rex-MMD角色卡

**先定版本与路线，再写第一行代码。**

MMD 角色卡的制作方法论与工具链 —— 三条互不通用的路线、六个交付阶段、一套可校验的事实库。

`Agent Skill` · `WorkBuddy` · `Codex` · `Claude Code`

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen.svg)](https://nodejs.org)
[![Self-test](https://img.shields.io/badge/self--test-47%20passed-success.svg)](#验证状态)
[![Docs](https://img.shields.io/badge/docs-23%20files-informational.svg)](references/00-总览与阅读路径.md)

[快速开始](#五分钟上手) · [安装](#安装) · [三条路线](#三条路线选错不报错) · [工具链](#工具链) · [常见问题](#常见问题)

</div>

---

## 做卡最耗时的不是写代码，是那些**不报错**的失败

装了规则，界面不出现；点了按钮，什么都不发生；打开控制台，一片干净。MMD 卡开发的坑几乎都长这样——**没有异常，只有沉默**。

这份 skill 把这些沉默的失败固化成一份清单，并且在写代码之前就拦住你：

| 你写的 | 实际发生 | 你看到的 |
|---|---|---|
| `chatVersion` 写成 `0` 却调用 `sdk.*` | 规则照装，SDK 与 `[data-chat]` 全不存在 | 页面正常，按钮没反应 |
| 界面标记没接进 `beginning` / `statusbar` | 注入的 HTML 从未进入 DOM | 什么都没有，无报错 |
| `findRegex` 写成 `/…/` 但语法错 | 整条规则被静默丢弃 | 规则列表里有，就是不生效 |
| 可见 HTML 缩进四空格 | 被 Markdown 当代码块渲染 | 屏幕上是一堆源码 |
| 自写 `data-*` 属性 | 被平台净化掉 | 后续 `querySelector` 全查不到 |
| z-index 落在 1000–3499 | 被舞台层压住 | 元素存在，就是看不见 |
| `replaceString` 超过编辑器上限 | **整条改动不保存**（不是截断） | 你以为改好了 |
| 气泡里挂长期面板 | 消息滚出视口即销毁 | 面板莫名消失 |

这些条目不是凭印象写的：每一条都在 `references/errors/errors.json` 里带症状、根因、处置和证据等级，**并且允许被后来的复测推翻**。

---

## 三条路线，选错不报错

MMD 有三种卡，机制完全不通用。选错的表现不是报错，是功能全哑。

| | **A · 旧版原生增强** | **B · 旧版同层卡** | **C · 新版沙盒卡** |
|---|---|---|---|
| `chatVersion` | `0` 或缺省 | `0` 或缺省 | **`1`** |
| 导入顶层键 | 4 键必填 | 4 键必填 | **恰好 6 键** |
| 做法 | 换肤 + 自建场景层，`img onerror` 点火 | iframe 全屏接管 + 原生桥接 | 官方 SDK：CSS 变量 + 稳定钩子 + 舞台 |
| 能力上限 | 换肤、气泡增强、封面/捏人/百科 | A 全部 + 61 项原生动作 | 30 项 SDK、跨设备存档、全屏舞台 |
| 主要代价 | 需跟随平台 class 改名 | 需维护上百个选择器，改版风险最高 | 受 SDK 边界限制 |
| 适合 | 保留原生手感、体积敏感 | 必须重做信息架构且要原生动作 | 长期维护、要跨设备存档 |
| **不适合** | 需要删消息 / 回溯 | 第一次做卡、快速交付 | 需要原生动作或 iframe |

**三条路线不可混用。** 新版卡里写 `iframe`、旧版卡里调 `sdk.save`、同层卡用 6 键导入包——这三种写法都不会报错，只会什么都不发生。

所以第一步永远是**版本与路线判定**，不是写代码。

---

## 安装

**前置**：Node.js 18+ 与 git。脚本零第三方依赖，不需要 `npm install`。

### 方式一：安装脚本（推荐）

克隆下来，跑一条命令，它会把技能放到当前宿主的正确目录（自动排除草稿、构建产物和 git 记录）：

```bash
git clone https://github.com/DoDoREX1128/rex-mmd-card.git
cd rex-mmd-card
node scripts/install.mjs --target workbuddy     # 或 codex / claude
```

先看它要做什么，不落盘：

```bash
node scripts/install.mjs --target codex --dry-run
```

| 参数 | 取值 | 说明 |
|---|---|---|
| `--target` | `workbuddy` / `codex` / `claude` | 目标宿主 |
| `--scope` | `user`（默认）/ `project` | 装给当前用户，或装进某个项目 |
| `--dir` | 路径 | `--scope project` 时的项目根目录，默认当前目录 |
| `--force` | — | 覆盖已安装的旧版本（旧目录改名为 `.old-<时间戳>` 保留） |
| `--dry-run` | — | 只打印目标路径，不写盘 |

### 方式二：手动放目录

技能就是一个文件夹，**目录名必须是 `rex-mmd-card`**（Agent Skills 规范要求 `name` 与父目录同名），`SKILL.md` 必须在目录根部。

| 宿主 | 用户级 | 项目级 |
|---|---|---|
| **WorkBuddy** | `~/.workbuddy/skills/rex-mmd-card/` | `<项目>/.workbuddy/skills/rex-mmd-card/` |
| **Codex** | `~/.agents/skills/rex-mmd-card/`<br>或 `~/.codex/skills/rex-mmd-card/` | `<仓库>/.agents/skills/rex-mmd-card/` |
| **Claude Code** | `~/.claude/skills/rex-mmd-card/` | `<项目>/.claude/skills/rex-mmd-card/` |
| **其他** | 宿主文档里的 skills 目录 | 同左 |

Windows 下 `~` 是 `C:\Users\<你的用户名>`。PowerShell 里手装用户级：

```powershell
git clone https://github.com/DoDoREX1128/rex-mmd-card.git "$env:USERPROFILE\.workbuddy\skills\rex-mmd-card"
```

> 不要用「下载 ZIP 解压到 skills 目录」——解压会多出一层 `rex-mmd-card-main/`，`SKILL.md` 就不在根目录了，宿主扫不到。

### 怎么确认装上了

| 宿主 | 检查 | 触发 |
|---|---|---|
| WorkBuddy | 侧栏「技能」里能看到 `rex-mmd-card` | 直接说「帮我做一张 MMD 角色卡」 |
| Codex | 输入 `/skills` 能看到条目 | `$rex-mmd-card`，或直接描述任务 |
| Claude Code | 会话里 `/skills` 或询问可用技能 | 描述任务即可，按 description 自动匹配 |

装完在**新会话**里试，旧会话的技能列表不会刷新。

**不想安装也能跑**：所有脚本都在仓库里，`git clone` 之后 `node scripts/test.mjs` 直接验证。

---

## 五分钟上手

### 0 · 先判四件事（S0）

版本（`1` / `0`）→ 路线（A / B / C）→ 交付形态（分离式 / 整卡 PNG / 整卡 JSON）→ 托管档位（全托管 / 半托管 / 全精修）。产出是一段书面结论，不是代码。

### 1 · 出一页方案（S1）

定位、信息架构、字段、视觉、交互、风险、验收，加一张首屏线框，过「评审 7 问」。**没有方案不开工**——这句话不是仪式感，是因为改方案的代价远小于改代码。

### 2A · 新版沙盒卡

```bash
node scripts/init.mjs                                   # 骨架就位到 work/src
# 改 work/src/content.json 与 work/src/persona.txt
node scripts/build.mjs   --src work/src --out work/out --name mycard
node scripts/validate.mjs work/out/mycard-regex.json --platform sandbox \
     --persona work/out/mycard-persona.txt \
     --worldbook work/out/mycard-worldbook.json
node scripts/preview.mjs --card work/out/mycard-regex.json --src work/src
node scripts/e2e.mjs
node scripts/card-png.mjs --card work/out/mycard-card.json --out work/out/mycard.png
```

> 导入时必须在创卡页把「新版聊天页」选成「**使用新版**」**再保存**。这一步首次保存后不可改；漏了它，规则会装上，但 `sdk.*`、`[data-chat]`、舞台全都不存在，页面没有任何报错。

### 2B · 旧版同层卡

```bash
node scripts/pack-samelayer.mjs --host work/src/host.js --frame work/src/frame.html \
     --out work/out --name mycard --theme mytheme
node scripts/validate.mjs work/out/mycard-regex.json --platform legacy
node scripts/replay.mjs   work/out/mycard-regex.json
node scripts/preview-samelayer.mjs --host work/src/host.js --frame work/src/frame.html \
     --out work/out --name demo
```

### 3 · 真站与实机（S4 / S5）

S4 只经界面操作取证，`evaluate` 仅取只读指标；S5 真机导入玩三轮。**没跑过的写 `NOT RUN`**，不把模拟结果说成实机结论。

---

## 六个阶段，每一阶段都有门禁

| 阶段 | 做什么 | 产物 | 出口判据 |
|---|---|---|---|
| **S0 定位** | 版本 / 路线 / 形态 / 档位 | 一段书面结论 | 用户确认 |
| **S1 方案** | 一页方案 + 首屏线框 | `brief.json` + 线框 + 风险清单 | 过评审 7 问 |
| **S2 原型** | 只做首屏与一次完整交互，假数据 | 可点的原型页 | 用户确认视觉方向 |
| **S3 模拟** | 接骨架 + 协议 + mock SDK | 构建包 + 校验报告 | `validate` 0 error |
| **S4 真站** | 浏览器内逐项取证 | 截图 + 控制台 + 用例表 | 首屏/导航/面板/输入/窄屏均通过 |
| **S5 实机** | 真机导入玩三轮 | 设备 + 失败点 | 无阻断问题 |

**不跳阶段。** S2 之前不写最终工程骨架，S4 之前不声称「实机可用」。阶段**可回退**——S3 发现方案缺陷就退回 S1 改方案，不允许在代码里打补丁掩盖设计问题。

唯一例外是**单点改动通道**：只改文案、换图、调间距，且不触及信息架构、字段、协议、平台选择时，可跳过 S1/S2 直接改并跑校验。

---

## 目录

```
SKILL.md                    入口：版本分流、六态心流、门禁、硬约束
facts.json                  平台事实唯一真源（限额/能力/事件/选择器/变量/层级/错误码）
README.md                   本页
LICENSE                     MIT
references/                 23 篇方法论，按阶段取用
  01-流程-心流与状态机.md     开场定位、三档托管、六态详解、三条旅程
  10-流程-三问与方案.md       方案模板与评审 7 问
  11-流程-一句话补全.md       只有一句话时的默认值表
  20-平台-分流.md             三路线对照与判错症状
  21-平台-新页事实.md         新版机制、陷阱、两类标记、瘦预览矩阵
  22-平台-同层卡架构.md       同层卡两个范式、分片数学、61 动作
  23-平台-事实表.md           ★ 生成文件：由 facts.json 产出，勿手改
  24-平台-旧版事实.md         旧版点火、渲染、层级、同层边界
  30/31/32-内容-*             状态与字段、世界书、人设与文风
  40~45-界面-*                卡架构、基线、视觉、封面捏人、骨架与皮肉
  50~54-验收-*                示例拆解、复刻验收、静态冒烟、排障、真站测试
  fields/                     字段库：118 条，fields.json 为真源，index.md 生成
  errors/                     错题本：30 条，errors.json 为真源，index.md 生成
examples/                   三个可跑的最小示例
  01-sandbox-hud/             最小可跑的沙盒卡（3 条规则）
  02-samelayer/               旧版同层卡最小包（脚本生成）
  03-remix/                   复刻对照：骨架不变、皮肉全换
assets/
  skeleton/                   沙盒卡骨架（改内容，不改机制）
  samelayer/                  同层卡最小骨架（host.js + frame.html）
  skin/                       tokens 模板与示例配色（原创性检查用）
scripts/                    22 个工具 + 自测
```

---

## 工具链

| 脚本 | 作用 |
|---|---|
| `install.mjs` | 装到 WorkBuddy / Codex / Claude Code 的 skills 目录 |
| `init.mjs` | 沙盒骨架就位 |
| `build.mjs` | 模块 → 6 键导入包 + 人设 + 世界书 + v2 整卡 JSON |
| `card-png.mjs` | v2 整卡封进 PNG 的 `chara` 块（MMD 只认 PNG 整卡） |
| `validate.mjs` | 交付门禁：结构 / 限额 / 正则 / 标记 / SDK / CSS / 人设 / 世界书 |
| `replay.mjs` | 按平台替换算法重放，查残留与断链 |
| `preview.mjs` | 仿平台外壳 + 能力精度（`?profile=thin`）+ 模型沙盒（`?preset=`） |
| `e2e.mjs` | 无头交互回归 |
| `analyze.mjs` | 拆卡：架构 / 载荷 / 动作 / 协议 |
| `check-skin.mjs` | 皮肉原创性（色距 / 字体 / 质感） |
| `pack-samelayer.mjs` | Host / Frame → 旧版同层卡分片链 |
| `preview-samelayer.mjs` | 同层卡仿平台壳 |
| `worldbook-normalize.mjs` | 任意世界书 → `{ entries }` |
| `worldbook-pack.mjs` | 世界书并入人设（仅入口不支持世界书时） |
| `export-raw.mjs` | 平台原始数据 → 可导入 JSON |
| `gen-facts.mjs` | 由 `facts.json` 重生成事实表（`--check` 校验一致性） |
| `gen-fields.mjs` | 由 `fields.json` 重生成字段索引 |
| `gen-errors.mjs` | 由 `errors.json` 重生成错题索引 |
| `field-add.mjs` | 字段库登记：先 `--find` 查重，再新增 |
| `error-log.mjs` | 错题本：`--find` / `--show` / `--add` / `--hit` / `--set` / `--retire` |
| `test.mjs` | 脚本自测（47 项） |
| `pack-skill.mjs` | 生成不含 `work/` 的分发副本 |

---

## 三份知识库，三种维护策略

这个仓库里最耐用的不是脚本，是三个「有真源、可校验、可生长」的数据文件。

**`facts.json` · 平台事实** — 限额、30 项 SDK 能力、12 个事件、选择器、29 个 `--chat-*` 变量、z-index 分层、9 个错误码。每条带 `source` 与 `evidence`。所有文档表由脚本生成，`--check` 会发现文档与真源不一致。

**`references/fields/` · 字段库（118 条）** — 状态栏字段的选型库，13 个分类，带冲突组（生命组、耐力组、名望组…同组只留一个主字段）。**只增不删**：合并、降级、废弃都留记录，因为「为什么不用这个字段」本身是知识。

**`references/errors/` · 错题本（30 条）** — 与字段库相反的规则：**必须可证伪**。判决分 6 种（confirmed / suspected / unreproducible / false-positive / invalid / retired），证据分 5 级，并且有工具级守卫：

- `confirmed` 不许配 `guess` 级证据；
- 判 `false-positive` 必须写清真错因是什么；
- 判 `unreproducible` 至少要有 2 次失败尝试记录；
- `suspected` 被引用超过 3 次必须重新判决。

一条经验被写下来，就容易被后人当成事实反复引用——哪怕当初只是猜的。这套守卫就是为了防止这件事。

---

## 四条设计原则

1. **事实只有一个真源。** 数值写在 `facts.json`，文档由脚本生成。改了真源忘了文档，`--check` 会报错。
2. **证据分级，冲突时高级覆盖低级。** 源码确证 > 实机实测 > 官方手册 > 外部整理。标注「待验证」的条目不得写进交付结论，只能进风险清单。
3. **禁止跨版本引用事实。** 用旧版 `onerror` 解释新版行为、用新版 `[data-chat]` 解释旧版 DOM，都是错的——它们看起来能自圆其说，这才是最危险的地方。
4. **不把「静态校验通过」写成「可以交付」。** 生成文件、静态校验、本地预览、真实宿主、线上保存、用户认可，是六个不同结论，报告时逐项标注。

---

## 验证状态

| 级别 | 状态 |
|---|---|
| 脚本自测 | **47 项通过**（校验器拦截、世界书归一、整卡 PNG、事实表一致性、字段库与错题本守卫） |
| S3 静态校验 | 骨架产物 0 error；三套示例 0 error |
| S3 本地模拟 | 同层骨架 Chromium 1440×900 通过；沙盒 e2e 32 项通过 |
| S4 真站 | **未做** —— 需要真实测试链接 |
| S5 实机 | **未做** |

把这张表原样放在首页，是因为这个 skill 的第一条硬约束就是「不把没验证的事说成结论」。用得上的部分是 47 项自测和三套示例，不是你读到的每一句话。

---

## 常见问题

**我不会写代码，能用吗？**
能，但要接受一件事：卡最终是代码。这个 skill 能做的是把「不知道从哪下手」变成「按 S0→S5 填空」，并且在你写错时拦住你。全托管档位下，方案与骨架由它出，你只管内容。

**它和 SillyTavern 什么关系？**
没有关系。明确不处理酒馆与其他平台的卡，也不做跨平台移植。

**文档全是中文，外国人能用吗？**
能装、能跑，脚本和 `facts.json` 的字段名是英文。方法论正文是中文。

**为什么 `SKILL.md` 里的 `name` 是 `rex-mmd-card` 而不是中文？**
Agent Skills 规范要求 `name` 只能用小写字母、数字和连字符，且必须与父目录同名。中文名会导致部分宿主加载失败。

**为什么仓库里没有 `work/` 和 `dist/`？**
那是做卡现场：几百张预览 PNG、构建产物、临时页。已写进 `.gitignore`，`pack-skill.mjs` 分发时也会剔除。

**能直接拿去卖卡吗？**
可以，卡是你的。但这个 skill 不提供美术资源，也不替你处理平台侧的分成与审核规则。

---

## 许可与合规

- **MIT**，见 [LICENSE](LICENSE)。随便用、改、商用，保留版权声明即可。
- 角色一律按**成年人**设定，不做年龄模糊化；不写真实人物。
- 不绕过平台鉴权，不伪造平台数据，不导出用户 cookie / token。
- 本仓库不含任何平台私有代码，`facts.json` 的每条事实都标注了来源与证据等级。

<div align="center">
<sub>做卡的门槛不在「会不会写」，在「知不知道该先定什么」。</sub>
</div>
