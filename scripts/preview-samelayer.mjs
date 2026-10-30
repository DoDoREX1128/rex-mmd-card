#!/usr/bin/env node
/* preview-samelayer.mjs · 生成旧版同层卡的仿平台壳，用于 L1/L2/L3 自测
 * 用法:
 *   node preview-samelayer.mjs --host assets/samelayer/host.js \
 *        --frame assets/samelayer/frame.html --out work/out [--name demo]
 * 产出: <out>/<name>.html   —— 浏览器直接打开
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const hostPath = opt('host'); const framePath = opt('frame');
if (!hostPath || !framePath) { console.error('用法: node preview-samelayer.mjs --host host.js --frame frame.html --out dir'); process.exit(2); }
const outDir = path.resolve(opt('out', 'work/out'));
const name = opt('name', 'demo');
const theme = opt('theme', 'rex');

const host = fs.readFileSync(hostPath, 'utf8').replace(/^\uFEFF/, '');
const frame = fs.readFileSync(framePath, 'utf8').replace(/^\uFEFF/, '');
const safe = (s) => JSON.stringify(s).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>同层卡测试壳 · ${name}</title>
<style>
  :root{--bg:#07050c;--panel:#100a1a;--line:#241a34;--text:#d9d2e6;--muted:#8a7fa0;--gold:#d9b36a}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.7 "PingFang SC","Microsoft YaHei",system-ui,sans-serif}
  .bar{position:sticky;top:0;z-index:5;display:flex;gap:10px;align-items:center;padding:8px 12px;background:#0a0712;border-bottom:1px solid var(--line);font-size:12px;color:var(--muted)}
  .bar b{color:var(--gold);font-weight:600}
  .bar button{font:inherit;color:var(--text);background:#151024;border:1px solid var(--line);border-radius:6px;padding:3px 8px;cursor:pointer}
  .wrap{max-width:760px;margin:0 auto;padding:16px 14px 120px}
  #msglistview{display:flex;flex-direction:column;gap:12px}
  .item{display:flex}
  .item.self{justify-content:flex-end}
  .content{max-width:80%;padding:10px 12px;border-radius:10px;background:#141022;border:1px solid var(--line)}
  .item.self .content{background:#1b1430;border-color:#322152}
  .composer{position:fixed;left:0;right:0;bottom:0;background:#0a0712;border-top:1px solid var(--line);padding:10px}
  .composer .inner{max-width:760px;margin:0 auto;display:flex;gap:8px}
  textarea{flex:1;min-height:44px;max-height:120px;resize:vertical;background:#120d1d;color:var(--text);border:1px solid var(--line);border-radius:8px;padding:10px;font:inherit}
  .chat-send-proxy{width:64px;border:1px solid #3a2b58;border-radius:8px;background:#1d1433;color:#f0e6ff;cursor:pointer}
  .tools{position:fixed;right:12px;top:44px;display:flex;flex-direction:column;gap:6px;z-index:4}
  .tools button{font:inherit;font-size:12px;color:var(--muted);background:#120d1d;border:1px solid var(--line);border-radius:6px;padding:4px 8px;cursor:pointer}
  .dialog-scope{position:fixed;inset:0;display:none;place-items:center;background:rgba(0,0,0,.55);z-index:6}
  .dialog-scope.on{display:grid}
  .uni-modal{background:#151024;border:1px solid #322152;border-radius:12px;padding:16px;min-width:280px}
  .uni-modal input{width:100%;margin:10px 0;padding:8px;background:#0d0916;border:1px solid var(--line);border-radius:6px;color:var(--text);font:inherit}
  .confirm-btn{padding:6px 14px;border-radius:6px;background:#2a1c47;border:1px solid #4a3277;color:#f2e8ff;cursor:pointer}
</style></head>
<body>
<div class="bar"><b>同层卡测试壳</b><span>这是仿平台页，不是真平台。用于验证注入链与适配层。</span>
  <button id="reenter">重新点火</button><button id="destroy">销毁</button></div>
<div class="tools">
  <button id="ico_persona_1">人设入口</button>
  <div class="more-scope"><button class="more-btn" id="ico_chat_set_1">更多菜单</button></div>
</div>
<div class="wrap"><div id="msglistview">
  <div class="item Ai"><div class="content left">夜色压下来。远处有人在敲门，三下，停了两拍。</div></div>
  <div class="item self"><div class="content right">我先不开门，听外面的动静。</div></div>
</div></div>
<div class="composer" id="chat-input-scope" data-chat="input"><div class="inner">
  <textarea class="uni-textarea-textarea" placeholder="输入……"></textarea>
  <button class="chat-send-proxy">发送</button>
</div></div>
<div class="dialog-scope" id="dlg"><div class="uni-modal">
  <div>人设</div><input class="uni-input-input" placeholder="名字">
  <button class="confirm-btn">确认</button>
</div></div>
<script>
  window.REXHUDCONFIG = { theme: ${JSON.stringify(theme)}, frameScriptSource: ${safe(frame)} };
  /* 仿平台行为 */
  var ta = document.querySelector('textarea.uni-textarea-textarea');
  var list = document.getElementById('msglistview');
  document.querySelector('.chat-send-proxy').onclick = function () {
    var t = ta.value.trim(); if (!t) return;
    var d = document.createElement('div'); d.className = 'item self';
    d.innerHTML = '<div class="content right"></div>'; d.firstChild.textContent = t;
    list.appendChild(d); ta.value = '';
  };
  document.getElementById('ico_chat_set_1').onclick = function () { alert('原生更多菜单（仿）'); };
  document.getElementById('ico_persona_1').onclick = function () { document.getElementById('dlg').classList.add('on'); };
  document.querySelector('.confirm-btn').onclick = function () { document.getElementById('dlg').classList.remove('on'); };
  document.getElementById('reenter').onclick = function () { if (window.REXHUDHOST) window.REXHUDHOST.reenter(); };
  document.getElementById('destroy').onclick = function () { if (window.REXHUDHOST) window.REXHUDHOST.destroy(); };
</script>
<script>
${host}
</script>
</body></html>`;

fs.mkdirSync(outDir, { recursive: true });
const p = path.join(outDir, `${name}.html`);
fs.writeFileSync(p, html, 'utf8');
console.log('预览壳', p, `(${html.length} 字)`);
console.log('打开后：Frame 会盖住页面；点「销毁」可回到仿平台页看原生 DOM。');
