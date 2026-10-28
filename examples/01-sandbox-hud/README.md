# 示例 01 · 沙盒 HUD 卡（最小可跑）

**用途**：演示新版沙盒卡（`chatVersion:1`）最小可用形态——状态条 + 一个按钮，三条规则分工清楚，可直接导入对照。

## 文件

| 文件 | 作用 |
|---|---|
| `card-regex.json` | 6 键导入包：`hud` 出 HTML、`hud-style` 出样式、`hud-kit` 只放脚本 |

## 三条规则的分工

| 规则 | 匹配式 | 产出 | 为什么这样切 |
|---|---|---|---|
| `hud` | `/【rex-hud】/` | 可见 HTML | 标记在 `statusbar` 与 `beginning` 里各出现一次，两处都会渲染 |
| `hud-style` | `/【rex-ex-style】/` | `<style>` | 装卡即被抽出，**不需要**被正文命中，所以匹配式故意不被引用 |
| `hud-kit` | `/【rex-ex-kit】/` | `<script>` | 同上；`sdk.on` 写在脚本体，不写进 `message:mount` 回调 |

## 校验与预览

```bash
node scripts/validate.mjs examples/01-sandbox-hud/card-regex.json --platform sandbox
node scripts/preview.mjs --card examples/01-sandbox-hud/card-regex.json --out work/out
# 打开 work/out/demo-preview.html；加 ?dev=1 出开发条，?profile=thin 看瘦预览降级
```

预期：`ERROR 0 · WARN 0`。

## 导入（三步，缺一步就白干）

1. **新建卡**，把 `card-regex.json` 从「导入正则」导入；
2. **首次保存前**在创卡页把「新版聊天页」选成「使用新版」——首次保存后不可改；
3. 人设另贴：把 `card-regex.json` 里的 `personality` 复制到「角色人设」栏（导入正则不读这个字段）。

## 可改点

- 字段：改 `hud` 的 HTML 与 `personality` 里对应的输出约定，两处必须逐字一致；
- 按钮行为：改 `hud-kit` 里的 `sdk.input.set` 文案；不要改成 `sdk.message.send`（那会替玩家发言）；
- 配色：优先改 `--chat-*` 映射，不要把颜色写死在组件里。
