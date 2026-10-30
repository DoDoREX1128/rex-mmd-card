# 46 · 外链与 CSP

> 用到 CDN 库、图床、音频、视频、字体、Canvas 纹理时读这一页。没用到就跳过。
> 核心结论：**外链是增强，不是地基**。任何外链加载失败，文字玩法、舞台输入、确认发送、存档、关闭都必须仍可用。

## 1. 外链脚本

```html
<script src="https://cdn.example.com/tiny-engine@1.2.3/dist/tiny.min.js"></script>
<script>
  sdk.on('message:mount', function () {
    if (!window.TinyEngine) return;       // 加载失败就静默降级，不 throw
    var box = document.querySelector('.engine-box');
    if (box) window.TinyEngine.mount(box);
  });
</script>
```

五条规则：

1. **必须 `https://`**。`http://` 会被直接跳过，不报错。
2. **域名要在平台白名单里**。自建域名先问平台；不在白名单的表现是"请求没发出去"，调试面板只留一行。
3. **按书写顺序加载，前一个落地才跑下一个**。同一个 URL 只加载一次。
4. **固定精确版本**（`@1.2.3`，不要 `@latest`）。CDN 发新版会静默改变行为。
5. **每引入一个库都要说明收益、体积、失败降级**。原生能做的不要上框架。

## 2. 外链媒体

| 类型 | 写法 | 必须验 |
|---|---|---|
| 图片 | `<img src="https://…">` | 目标站能显示；防盗链返回 403 时给占位 |
| 音频 | `new Audio(url)` 或 `<audio>` | 首次播放要在玩家手势内；autoplay 会被拦 |
| 视频 | `<video src>` | `playsinline`；移动端不要依赖自动播放 |
| 字体 | `@font-face` | 字体域名在 `font-src` 白名单；失败回退系统字体 |

音频用 WebAudio（Howler 等）时多一条：**`connect-src` 必须放行音频域名**。用原生 `<audio>` 能播不代表 WebAudio 能播，两者走不同 CSP 指令。

## 3. CSP：响应头与 meta 取交集

平台页面同时可能有 HTTP 响应头 CSP 与 `<meta http-equiv="Content-Security-Policy">`。**实际生效的是两者的交集**——任何一边没放行，资源就加载不了。

要验的指令：

| 指令 | 管什么 | 常见症状 |
|---|---|---|
| `script-src` | 外链 JS | 请求 200 但不执行，控制台报 CSP |
| `img-src` | 图片、Canvas 纹理 | 图裂；`getImageData` 抛安全错误 |
| `media-src` | 音频、视频 | `play()` 直接 reject |
| `connect-src` | fetch / XHR / WebAudio | 音频解码失败；接口请求被拦 |
| `font-src` | 字体 | 回退到系统字体，排版错位 |
| `style-src` | 外链 CSS、内联样式 | 样式整块不生效 |

**不要在本地预览通过就报"外链可用"。** 本地没有平台 CSP；必须在目标聊天页打开，看控制台与网络面板。

## 4. Canvas / WebGL 纹理

跨域图片画进 canvas 后，`getImageData` / `toDataURL` 会抛安全错误，除非：

```js
const img = new Image();
img.crossOrigin = 'anonymous';   // 必须在 src 之前设置
img.src = 'https://cdn.example.com/tex.png';
```

同时对方要返回 `Access-Control-Allow-Origin`。纹理用于 Three.js / PixiJS 时同样要开 `crossOrigin`。

WebGL 主代码与画布**只能挂舞台**：

```js
sdk.stage.open('full');
const el = sdk.stage.el();
const canvas = document.createElement('canvas');
el.appendChild(canvas);
// 渲染循环、resize、dispose 都自己管
```

关闭时释放：`cancelAnimationFrame`、`renderer.dispose()`、解绑 `resize` / `visibilitychange`、清纹理与几何体。切会话与 `dispose` 事件也要清。

## 5. 性能红线

| 症状 | 常见原因 | 处理 |
|---|---|---|
| 滚动卡顿 | 大面积 `backdrop-filter`、持续动画 | 降到局部；低动效模式关掉 |
| 流式输出卡 | `message:stream` 里全量重绘 / 读写布局 | 只更新变化节点；节流到 100ms |
| 内存涨 | 每条消息都 `new` 引擎、监听不解绑 | 单例 + `message:unmount` / `dispose` 清理 |
| 首屏慢 | 同步加载大库 | 延后到舞台打开时再加载 |

## 6. 降级矩阵

每个外链依赖都要写一行：

| 依赖 | 用途 | 失败时 |
|---|---|---|
| `tiny-engine@1.2.3` | 舞台地图渲染 | 显示文字版地点列表，选项仍可点 |
| `bgm.mp3` | 背景音 | 静音，不弹错 |
| `font.woff2` | 标题字体 | 回退系统字体 |

**核心剧情、舞台输入、确认发送、存档、关闭**这五项不允许依赖任何外链。

## 7. 验收

- [ ] 每个外链都有精确版本、许可证、完整 HTTPS URL、预期全局对象、降级方案
- [ ] 在目标聊天页断网/改错 URL，核心文字玩法仍可用
- [ ] 控制台无 CSP 报错；网络面板无 403/404
- [ ] 音频在玩家手势后能播；WebAudio 的 `connect-src` 单独验过
- [ ] 图片显示；Canvas 纹理能 `getImageData`
- [ ] 舞台关闭后渲染循环、监听、GPU 资源已释放
- [ ] 窄屏与短视口下外链组件不撑破布局

## 8. 证据边界

本机没有做目标站的响应头与 meta 实测。交付时按实际验证到的层级写：

- "本地预览通过" —— 只证明代码没写错
- "目标站加载成功" —— 要有网络面板与控制台截图
- "断网降级可用" —— 要有断网后的操作记录

三者不能互相替代。
