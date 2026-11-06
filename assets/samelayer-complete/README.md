# 完整旧版同层骨架

克隆与改造前必须按[错题本的同层预检](../../references/errors/README.md)读本次模块对应条目；字段设计用[创作与运行时蓝图](../../references/fields/blueprints.md)。只读动作计数不足以复现全部HUD行为。

这是可直接克隆、构建和验证的完整旧版同层骨架。做新的完整旧版同层卡，先克隆本目录的实现，再换内容与视觉。不要退回最小基座重新适配原生动作，也不要用 longform-samelayer 的小样例替代这里的 HUD。

## 初始化与构建

```text
python scripts/complete-samelayer.py init "<新项目>" --content-dir "<内容目录>" --name new-card --title "卡名"
python scripts/complete-samelayer.py status "<新项目>"
python scripts/complete-samelayer.py sync "<新项目>"
python scripts/complete-samelayer.py build "<新项目>"
python scripts/complete-samelayer.py verify "<新项目>"
```

构建后工程/builds/frame.html 是完整 Frame；preview.html 含 Host 模拟桥，预览.html 是预览台。模拟页用于本地交互，不能替代真实原生动作的目标站验收。

从零制作时由 Agent 先在准备目录按[人设写法](../../references/32-内容-人设与文风.md)写内容，不要求用户先提供稿件；复用已有内容时直接读取指定内容目录。

内容目录提供 persona.txt、worldbook.json，以及 opening.txt；若没有 opening.txt，则从该目录 regex.json 的 beginning 读取。内容以原文件字节复制，保留原稿内容与格式，不把示例文风强套进去。新的 regex 从完整技术骨架生成，既有 regex 保留在原目录供对照。不要对成品原目录执行初始化。

初始化得到“交付 / 工程”，并准备使用说明与三份审阅稿；regex 仅在构建成功后生成。`工程/src/content` 是内容源，`工程/src/frame` 是完整 HUD，`工程/src/kit` 是已经打过补丁的原生适配。构建从源更新交付三件套。此构建链独立于 `project.mjs`，不能拿最小同层的 project build 覆盖它；Agent用 status 检查，再 sync 同步审阅稿与源；双改冲突、未处理世界书意见和交付文件外改会停止同步，build 也先做此检查。世界书审阅编号映射保存在工程/review-map.json；按[02](../../references/02-项目工作区与审阅交付.md)保留未知导入字段，不要求用户读代码。

`工程/template.json` 设置 appId/buildId/title。这些标识不自动改写世界观、地图和封面文案；首个构建保留完整原界面，随后按下表替换。存档也不能仅改 appId 就声称隔离完成：frame-main 的 sl-prefs、创建页 AUTO_KEY/SAVE_KEY/动效键需统一作用域并验证会话切换，不读取别的作品旧档。

## 固定复用与改卡位置

| 保留实现 | 文件与职责 | 新卡通常改哪里 |
|---|---|---|
| 原生动作契约、参数校验、目标身份与确认状态 | kit/core、actions、provided-actions | 默认整套保留；目标站变化才修改 |
| 已适配的原生 DOM 与处理器 | kit/actions-dom、actions-handlers、native | 默认复用选择器与闭环，不逐按钮重新实现 |
| Host 挂载、桥接、状态快照、模型投影 | kit/host、models、provided-models | 改作品配置；保持请求/结果契约 |
| 模型、设置、人设、会话、补充设定等 HUD 面板 | frame-models、frame-panels、frame-features、frame-ui-config | 改文字/皮肤，保留事件与返回/回写链 |
| 阅读器、输入框、增量状态、编年、人物详情 | frame-main | 依据新卡字段契约定向改解析与渲染，不重写全文 |
| 封面、五步创建、回看、存档入口、动效 | frame-creation | 替换题材选项/文案/视觉，保留草稿、返回和点击保护 |
| 完整地图与人物档案组件 | map-data、frame-map、frame-mapsvg、frame-body* | 保留交互和布局算法，替换领域数据、地名与实体字段 |
| 响应式、字体、明暗层次 | frame.css、frame.html | 调整 token 与局部皮肤，验证两端布局和可访问性 |
| 模块合并、LZ77、完整性校验、短令牌、诊断 | merge.py、lz77.py、pack.py、pack_base.py | 默认不重做；替换标题标识，守住还原与限长校验 |

## 原生动作基线

[native-actions.json](native-actions.json)按实际源码生成，包含70个功能动作、8个模型动作和3个原生基础动作，共81个唯一动作。菜单、消息、会话、人设、补充设定、指令、设置、背景、总结和生图处理器连同HUD一起复用，按下方复现流程逐层验收。目标部署的实际可用性由能力快照与结果回读确认。

改新卡先跑现有动作的非破坏性抽查，只在失败时定位平台变动并修补共享层。不要先删掉处理器再重做。新增动作必须同时补契约、DOM/处理器、能力投影、HUD 入口和闭环测试；删除/重置/提交等沿用实际任务授权。

固定排坑：隐藏常驻面板需检查布局盒；确认框可能是 toggle；二次确认核对具体对象；图标定位支持 background-image；可写输入可能不是可见预览框；返回值按实际 data 读取；busy 在动作 finally 解锁；关闭不受 busy 阻塞；生图提交与完成分开。

## 运行时完整性与补丁纪律

source-integrity.json 记录完整运行时33份文件的哈希与兼容补丁。默认保留整个技术实现，修改在新项目里完成。kitpatch.py 用于理解已有补丁；本目录 kit 已含补丁，不自动重复套补丁，也不运行原项目 make_source 去另一份 skill 重铺基座。

源代码带有完整的领域字段和演示内容，因此“换卡”必须检查：人设输出、世界书字段目录、真实开场状态、解析器、地图注册表、创建选项、显示文案及存储键。不要盲目全局替换人名导致代码 ID 或关系规则损坏。

完整骨架与最小基座均使用MessagePort；完整骨架使用mmd-sl/1，最小基座使用rex-sl/2，握手、消息结构和权限模型不同。不要混接协议或默默替换sandbox参数。适配目标部署时复核父页面访问、消息来源、动作权限和返回原生入口。

构建校验包括四键/id=-1、片长、片数、每片和完整载荷 SHA、解压后 Frame 与源一致、令牌收敛。真站导入、原生写操作与实体设备仍按[54](../../references/54-验收-真实平台测试.md)独立留证。克隆与本地回归不替代目标站和实体设备结果。

维护时运行 `python scripts/test-complete-samelayer.py`：核对运行时源码、81项动作目录、新目录可构建、原稿字节保留、构建可复现及失败保护。这里不能代替完整 HUD 的浏览器交互与原生动作目标站验收。

## HUD动作复现验收

复用范围是HUD全部现有动作：消息/会话/人设/补充设定/指令/设置/总结/生图、模型选择与配置、输入/追加/同步/发送、背景和帮助等原生落点，以及各面板的返回/关闭。不能仅复制动作名称或只运行最小基座测试。

1. `node scripts/check-complete-actions.mjs`：回读真实模块，核对70+8+3动作目录与完整运行时哈希。
2. `python scripts/test-complete-samelayer.py`：新目录构建、审阅回写、失败保护及可复现压缩。
3. `node scripts/e2e-complete-samelayer.mjs --project "<项目目录>" --out "<报告目录>"`：用实际生成Frame跑本地交互、模型、设置、输入、会话、重置、生图、回溯DOM变体与真实Host传输。浏览器测试需要Node.js 22+和Chrome/Edge，可用CHROME指定浏览器程序。

回归含真实MessagePort请求：snapshot.now必须同时有处理器和传输白名单，不能只在dev stub里返回成功。每个用例记录日志，非零退出、FAIL断言或页面异常均令整套失败。菜单、确认和结果三个阶段分别验收；不把“请求送出”当完成。

新卡保留这套动作与HUD交互，仅替换内容、字段绑定与视觉。若删除或关闭某功能，应在动作清单和验收矩阵明确标注本次范围，不能悄悄减功能后声称完整复现。目标站变动只修共享适配层并跑回归。
