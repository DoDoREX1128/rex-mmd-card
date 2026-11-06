# 长篇旧版同层组件

配套 [成品模板方法](../../../references/26-平台-旧版同层成品模板.md)。内容样例采用东方玄幻修仙题材；六段结构可替换，不是默认人设要求。这里只提供内容契约与历史回放组件，不包含参考项目完整 UI、地图、原生动作或压缩打包器。

## 从组件做一张卡

1. 按标准工作区初始化 same 路线，保留自带 Host/Frame 的 MessagePort 隔离；扩展原生动作时执行能力探测与目标站验证。
2. 将本目录的 persona/worldbook 样例作为工程内容起点；替换题材、字段、文字与创建参考。`worldbook.example.json` 是可导入结构，字段与 `state-replay.js` 一致。
3. 将 `state-replay.js` 内容以内联 script 放在 Frame 业务脚本前，构建时合入，避免交付后依赖本机相对文件路径。这里是纯函数工具，不会自行挂载面板或订阅消息。
4. Host 给出可信 role、稳定消息 ID、旧→新顺序和完整原文；Frame 将快照映射为 `[{id,role,raw}]`，调用 `REXLongformState.replay(messages)`。使用返回的 state 渲染、errors 提示诊断；正文用 `strip`。渲染字符串使用 textContent。
5. 发生消息编辑/删除/重置/切会话，再用当前完整历史 replay；它每次从空状态重建，重复同一快照不会累积。虚拟列表只返回部分历史时，先补全历史或另实现带游标快照基线，不能直接接这个接口。
6. Frame 的返回、草稿、发送、存档仍走既有 Host 契约。回放不自动写存储、不自动发送，不支持实体列表按 ID 合并/删除；扩展字段时同步修改字段目录、apply 和用例。

生成 regex 使用现有 `pack-samelayer --host ... --frame ... --persona ... --worldbook ...`，得到旧版四键包；先阅读[基座说明](../../samelayer/README.md)。这不是把一份制作好的 regex 换个标题：UI/协议/世界书/打包策略要逐项适配。大型载荷的压缩与 statusbar 单令牌链式入口见 26 第 6 节。

## 最小字段契约

| 路径 | 类型 | 增量方式 |
|---|---|---|
| turn | 非负安全整数 | 覆盖；不排序消息，不跳过重复轮次 |
| loc / region / sum | 字符串 | 覆盖；空字符串清空，缺键继承 |
| opt | 字符串数组 | 整组替换，[] 清空 |
| me | 人物对象 | 按键合并 |
| npcs | 稳定身份键→人物对象 | 按身份键及人物子键合并 |
| 人物.name / where / state | 字符串 | 覆盖，缺键继承 |
| 人物.tags | 字符串数组 | 整组替换 |
| sys.say | 字符串 | 覆盖 |

未知键丢弃；null 不清空；字段长度与条数按本示例代码截断，目标作品可调整。对象键拒绝原型污染名。完整且合法的状态才应用；未闭合块只在正文隐藏。旧 `[rex-status]`、`<rex-status hidden>` 等只作读取兼容。

`replay.example.json` 包含两条相同 turn 的有效模型输出、一条用户引用和半截生成块。预期 applied=2，地点继承，陆云衡状态更新，opt 清空，用户引用不污染状态。运行 `node --test scripts/test-longform-samelayer.mjs` 验证。
