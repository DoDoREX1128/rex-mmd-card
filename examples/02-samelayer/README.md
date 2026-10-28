# 示例 02 · 旧版同层卡（最小包）

**用途**：演示旧版卡（`chatVersion:0`）的同层卡最小产物：独立点火、3 条规则、Host + Frame 两段载荷。

## 生成方式

产物由脚本生成，**不要手改 JSON**：

```bash
node scripts/pack-samelayer.mjs \
  --host assets/samelayer/host.js \
  --frame assets/samelayer/frame.html \
  --out examples/02-samelayer --name samelayer-demo --theme demo
node scripts/validate.mjs examples/02-samelayer/samelayer-demo-regex.json --platform legacy
node scripts/replay.mjs examples/02-samelayer/samelayer-demo-regex.json --from beginning
```

| 文件 | 作用 |
|---|---|
| `samelayer-demo-regex.json` | 导入包：`pageDepth / statusbar / beginning / regex_scripts`（可带 `chatVersion:0`） |
| `samelayer-demo-manifest.json` | 规则数、分片、SHA-256、字符数——用于回读核对 |

## 结构

| 规则 | 内容 |
|---|---|
| `rexh-001` | Host 载荷分片 |
| `rexh-002` | Frame 载荷分片 |
| `rexh-003` | launcher：校验两段非空后建 iframe |

默认 `--ignite independent`：所有标记一次性写进 `beginning`，每条规则只认自己那一个。这比链式点火安全——链式在「每条规则各自作用于原文」的平台语义下只有第一条会命中。

## 边界（不可越）

- 旧版**没有** `sdk.*`、`[data-chat]`、`[data-slot]`、舞台；写了不报错也不生效；
- 旧版**不能**用新版的 6 键包；两版顶层键不同；
- 同层卡不做跨设备存档；存档只在本地作用域内。

## 预览

```bash
node scripts/preview-samelayer.mjs --host assets/samelayer/host.js \
  --frame assets/samelayer/frame.html --out work/out --name demo
```
