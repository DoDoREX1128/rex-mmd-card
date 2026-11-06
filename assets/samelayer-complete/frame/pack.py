# -*- coding: utf-8 -*-
"""pack9 —— 官方 rules_for() + 三层保险 + 消息诊断

1. boot 之前先把 Frame 源码存到 `window.SLHTML`，再调用宿主。
2. 看门狗（3 秒）：
     · 真挂出了 `[id^="MMD_SL_"]` 且高度 > 50 → 撤掉徽标 = 成功
     · 没挂出来 → 徽标变红并写出「列表 有/无 · 输入 有/无」（真站 DOM 到底缺什么，一眼可见），
       同时把 Frame 直挂成全屏 iframe，至少让界面先出来
3. `[rex-status]` / `[rex-cast]` / `[档案:…]…[/档案]` 都换成隐藏行内块：聊天里不再裸露，
   HUD 侧仍能读到原文（宿主读 `messages[].raw`，即 textContent；hidden 只影响渲染，不影响文本节点）。
   旧尖括号 `<rex-status>` 的隐身规则保留，服务已导入的老消息。
"""
import base64, importlib.util, json, os, hashlib, sys

BASE = os.path.dirname(os.path.abspath(__file__))                 # 工程/src/frame
OUT = os.path.normpath(os.path.join(BASE, '..', '..', 'builds'))  # 工程/builds
DELIVER = os.path.normpath(os.path.join(BASE, '..', '..', '..', '交付'))
SKILL = os.path.join(BASE, 'pack_base.py')

_cfg = json.load(open(os.path.join(BASE, '..', '..', 'template.json'), encoding='utf-8'))
APP_ID = _cfg['appId']
BUILD_ID = _cfg['buildId']
TITLE = _cfg['title']
NAME = 'regex.json'

spec = importlib.util.spec_from_file_location('build_same_layer', SKILL)
B = importlib.util.module_from_spec(spec)
spec.loader.exec_module(B)

read = lambda p: open(p, encoding='utf-8').read()

# ── 载荷编码：LZ77 压缩后再 base64 ──────────────────────────────────────
# 协议与官方 rules_for() 逐字段对齐（同 token 命名、同分片结构、同 sha 校验），
# 唯一差别是 base64 之前多一层 LZ77。解压由 launcher 内联的 615 字符纯 JS 完成，
# 不依赖 DecompressionStream 等任何浏览器特性。
# 展开后的 payload 与未压缩版逐字节相同 —— 这条是验收硬线（见 _verify_lz.py）。
# 回退：把 USE_LZ 改成 False，即回到官方 rules_for()，其余代码不用动。
USE_LZ = True

sys.path.insert(0, BASE)
import lz77

LZ_DECODE_JS = (
    'function lz(s){'
    'var p=0,n=0,sh=0,b;'
    'for(;;){b=s.charCodeAt(p++);n|=(b&127)<<sh;if(!(b&128))break;sh+=7;}'
    'var o=new Uint8Array(n),k=0,c,v,d,L,st,j,i;'
    'while(k<n){'
    'c=s.charCodeAt(p++);'
    'for(i=0;i<8&&k<n;i++){'
    'if(!(c&(1<<i))){o[k++]=s.charCodeAt(p++);}'
    'else{'
    'v=0;sh=0;'
    'for(;;){b=s.charCodeAt(p++);v|=(b&127)<<sh;if(!(b&128))break;sh+=7;}'
    'd=(v>>8)+1;L=(v&255)+3;st=k-d;'
    'for(j=0;j<L;j++)o[k++]=o[st+j];'
    '}}}'
    'return o;}'
)

LZ_LAUNCHER = """(async function(){
const key=KEY, expected=TOTAL, digest=DIGEST;
__LZ__
try {
 const parts=globalThis.__MMD_SL_PARTS__?.[key];
 if(!Array.isArray(parts)||parts.length!==expected)throw Error('载荷分片数量不匹配');
 async function hash(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');}
 for(let i=0;i<expected;i++){
  const part=parts[i];if(!part||part.index!==i||await hash(new TextEncoder().encode(part.text))!==part.hash)throw Error('载荷分片校验失败');
 }
 const bytes=lz(atob(parts.map(p=>p.text).join('')));
 if(await hash(bytes)!==digest)throw Error('完整载荷校验失败');
 const script=document.createElement('script');script.textContent=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 (document.head||document.documentElement).appendChild(script);script.remove();
}catch(error){
 const box=document.createElement('div');box.style.cssText='position:fixed;inset:12px;z-index:2147483647;padding:20px;background:white;color:#702020;white-space:normal';
 const text=document.createElement('p');text.textContent='同层卡启动失败：'+error.message;
 const close=document.createElement('button');close.textContent='关闭并返回 MMD';close.onclick=()=>box.remove();
 box.append(text,close);document.body.appendChild(box);
}
})();"""


def rules_for_lz(source, app_id, build_id):
    """与 build_same_layer.rules_for 结构一一对应，仅载荷先经 LZ77 压缩。

    分片大小沿用官方 16000；token / 分片对象字段 / 逐片 sha / 整体 payload sha
    全部保持原样，因此 manifest 的 payloadSha256 与非压缩版完全一致。
    """
    raw = source.encode('utf-8')
    packed = lz77.compress(raw)
    encoded = base64.b64encode(packed).decode('ascii')
    parts = [encoded[i:i + 16000] for i in range(0, len(encoded), 16000)]
    if len(parts) + 1 > 130:
        raise ValueError('载荷超过 130 条正则，请减少依赖或拆分产品功能')
    digest = hashlib.sha256(raw).hexdigest()
    key = app_id + '_' + hashlib.sha256(build_id.encode()).hexdigest()[:10]
    token = lambda i: '【SL_' + key + '_' + str(i).zfill(3) + '】'
    rows = []
    for i, part in enumerate(parts):
        data = {"index": i, "hash": hashlib.sha256(part.encode()).hexdigest(), "text": part}
        start = "globalThis.__MMD_SL_PARTS__=globalThis.__MMD_SL_PARTS__||Object.create(null);"
        if i == 0:
            start += "globalThis.__MMD_SL_PARTS__[" + json.dumps(key) + "]=[];"
        code = start + "globalThis.__MMD_SL_PARTS__[" + json.dumps(key) + "][" + str(i) + "]=" + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ";"
        rows.append({"id": -1, "scriptName": "SL" + str(i).zfill(3),
                     "findRegex": "/" + token(i) + "/g",
                     "replaceString": "<script>" + code + "</script>" + token(i + 1)})
    launcher = (LZ_LAUNCHER
                .replace('__LZ__', LZ_DECODE_JS)
                .replace('KEY', json.dumps(key))
                .replace('TOTAL', str(len(parts)))
                .replace('DIGEST', json.dumps(digest)))
    rows.append({"id": -1, "scriptName": "SL启动", "findRegex": "/" + token(len(parts)) + "/g",
                 "replaceString": "<script>" + launcher + "</script>"})
    for row in rows:
        if B.utf16_length(row["replaceString"]) > B.LIMIT or B.utf16_length(row["findRegex"]) > 1000:
            raise ValueError('规则超出构建安全线')
    if B.utf16_length(token(0)) > 200:
        raise ValueError('入口超过保守 200 字符预算')
    return token(0), rows, digest

# 基座 JS 从「打过补丁」的源码目录按官方顺序拼（与 build_same_layer.py 同序）
SRC = os.path.normpath(os.path.join(BASE, '..', 'kit'))    # 工程/src/kit
KIT_NAMES = ['core.js', 'actions.js', 'actions-dom.js', 'actions-handlers.js',
             'provided-actions.js', 'models.js', 'provided-models.js', 'native.js', 'host.js']
js = "\n".join(open(os.path.join(SRC, n), encoding='utf-8-sig').read() for n in KIT_NAMES)
js = js.replace('</script', '<\\/script')
assert 'origin + G.location.pathname' in js, '基座补丁没进 payload'
assert 'root() || document.body' in js, 'native 补丁没进 payload'
frame = read(os.path.join(OUT, 'frame.html'))
opener = read(os.path.normpath(os.path.join(BASE, '..', 'content', 'opening.txt'))).strip()

cfg_native = {"appId": APP_ID, "buildId": BUILD_ID, "title": TITLE,
              "engine": False, "models": True, "mode": "native"}

# Frame 源码只出现一次：先落到 window.SLHTML，再喂给宿主
boot = ("\nwindow.SLHTML=" + json.dumps(frame, ensure_ascii=False) + ";\n"
        "try{window.MmdSameLayerHost.boot(" + json.dumps(cfg_native, ensure_ascii=False) + ",window.SLHTML);}"
        "catch(e){window.SLBOOTERR=String((e&&e.message)||e);}\n")
payload = js + boot

if USE_LZ:
    entry, rules, digest = rules_for_lz(payload, APP_ID, BUILD_ID)
else:
    entry, rules, digest = B.rules_for(payload, APP_ID, BUILD_ID)

# ── 0) 令牌缩短：【SL_<appId>_<sha10>_000】→【SL000】
import re as _re
_TOK = _re.compile(r'【SL_[^】]*?_(\d{3})】')
_short = lambda m: '【SL%s】' % m.group(1)
for _r in rules:
    _r['replaceString'] = _TOK.sub(_short, _r['replaceString'])
    _r['findRegex'] = _TOK.sub(_short, _r['findRegex'])
entry = _TOK.sub(_short, entry)

# ── 1) 首片前置静态徽标（纯 HTML，无脚本也能看见）────────────────────────
BADGE = ('<div class="slb-badge" style="position:fixed;left:14px;bottom:14px;z-index:2147483002;'
         'padding:7px 13px;border-radius:999px;font:12px/1.5 system-ui,sans-serif;'
         'color:#F6E3AE;background:rgba(10,6,20,.92);border:1px solid rgba(217,179,106,.45);'
         'pointer-events:none">角色卡　装载中…</div>')
rules[0]['replaceString'] = BADGE + rules[0]['replaceString']

# ── 2) 看门狗：成功撤标；失败写诊断 + 直挂兜底 ───────────────────────────
WATCH = """<script>(function(){
var K=__K__, n=0, done=0;
function badges(){return document.querySelectorAll('.slb-badge');}
function kill(){var a=badges(),i=0;for(i=0;i!==a.length;i++){if(a[i].parentNode)a[i].parentNode.removeChild(a[i]);}}
function mark(txt,red){var a=badges(),i=0;for(i=0;i!==a.length;i++){a[i].textContent=txt;if(red)a[i].style.color='#FFB4B4';}}
function count(){return document.querySelectorAll('.item.Ai,[class*="item"][class*="Ai"]').length;}
function fallback(){
  if(!window.SLHTML)return;
  var f=document.createElement('iframe');
  f.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-modals allow-downloads');
  f.style.position='fixed';f.style.left='0';f.style.top='0';f.style.width='100%';f.style.height='100%';
  f.style.border='0';f.style.zIndex='2147482999';f.style.background='#06030C';
  f.srcdoc=window.SLHTML;document.body.appendChild(f);
}
var t=setInterval(function(){
  if(done)return;
  var s=document.querySelector('[id^="MMD_SL_"]');
  var ok=s&&s.getBoundingClientRect().height>50;
  if(!ok){
    if(n++===12){
      done=1;clearInterval(t);
      var lst=document.querySelector('#msglistview')?'有':'无';
      mark('未挂载 · 列表'+lst,1);fallback();
    }
    return;
  }
  if(count()){done=1;clearInterval(t);kill();return;}
  if(n++===32){
    done=1;clearInterval(t);
    var sdk=typeof window.sdk;
    var dc=document.querySelectorAll('[data-chat]').length;
    var zh=document.querySelectorAll('textarea').length;
    mark('消息0 · sdk'+(sdk==='undefined'?'无':'有')+' · dc'+dc+' · ta'+zh,1);
  }
},250);
})();</script>""".replace('__K__', json.dumps(APP_ID))
rules[-1]['replaceString'] = rules[-1]['replaceString'] + WATCH

# ── 3) 两个块都藏起来（保留原文，HUD 仍读得到）───────────────────────────
# 现行协议是方括号：纯文本，平台不会把它当未知元素剥壳；整块包进 <span hidden>，
# 藏起来的同时文本节点仍在 DOM 里 —— HUD 走 textContent（messages[].raw）读得到。
HIDE_ARCHIVE = {"id": -1, "scriptName": "SL档案隐身",
                "findRegex": "/(\\[档案[:：][^\\]\\n]*\\][\\s\\S]*?\\[\\/档案\\])/g",
                "replaceString": '<span hidden>$1</span>'}
HIDE_STATUS = {"id": -1, "scriptName": "SL状态块隐身",
               "findRegex": "/(\\[(?:rex-)?status\\][\\s\\S]*?\\[\\/(?:rex-)?status\\])/g",
               "replaceString": '<span hidden>$1</span>'}
HIDE_CAST = {"id": -1, "scriptName": "SL档案块隐身",
             "findRegex": "/(\\[(?:rex-)?cast\\][\\s\\S]*?\\[\\/(?:rex-)?cast\\])/g",
             "replaceString": '<span hidden>$1</span>'}
# 旧尖括号协议：只服务已经导入过的老消息，别删（删了老聊天会露出整段 JSON）。
# 整块包 span，开闭标签一起藏 —— 只替换开标签时，遇到别的闭合写法会漏半截。
HIDE_STATUS_OLD = {"id": -1, "scriptName": "SL旧状态块隐身",
                   "findRegex": "/(<(?:rex-)?status>[\\s\\S]*?<\\/(?:rex-)?status>)/g",
                   "replaceString": '<span hidden>$1</span>'}
HIDE_CAST_OLD = {"id": -1, "scriptName": "SL旧档案块隐身",
                 "findRegex": "/(<(?:rex-)?cast>[\\s\\S]*?<\\/(?:rex-)?cast>)/g",
                 "replaceString": '<span hidden>$1</span>'}
# 兜底：万一平台先把方括号/尖括号块吃掉，只剩单行裸 JSON，也藏起来
HIDE_BARE_CAST = {"id": -1, "scriptName": "SL裸档案隐身",
                  "findRegex": "/^(\\{\"[^\"]{1,12}\":\\{\"(?:sex|lv|rel|tier|wuhun)\"[^\\n]*)$/gm",
                  "replaceString": '<span hidden>$1</span>'}
# 隐藏规则放最前：平台若按条数截断或只跑前 N 条，先保证裸露块被藏起来
rules = [HIDE_ARCHIVE, HIDE_STATUS, HIDE_CAST, HIDE_STATUS_OLD, HIDE_CAST_OLD, HIDE_BARE_CAST] + rules

mx = max(B.utf16_length(r['replaceString']) for r in rules)
assert mx <= B.LIMIT, (mx, B.LIMIT)

doc = {"pageDepth": 2, "statusbar": entry,
       # 第一句话不再挂【SL000】：功能栏（statusbar）已经带令牌，开场白只留正文与状态块
       "beginning": opener,
       "regex_scripts": rules}

os.makedirs(DELIVER, exist_ok=True)
p = os.path.join(DELIVER, NAME)
open(p, 'w', encoding='utf-8', newline='\n').write(json.dumps(doc, ensure_ascii=False, separators=(',', ':')))
json.loads(open(p, encoding='utf-8').read())


manifest = dict(appId=APP_ID, buildId=BUILD_ID, title=TITLE, payloadCodec='lz77+base64', payloadBytes=len(payload.encode('utf-8')), payloadSha256=digest, rules=len(rules), chunks=len(rules)-7, maxReplacementUtf16=mx, evidence=dict(static='PASS', localBrowser='NOT RUN', realMmd='NOT RUN', physicalMobile='NOT RUN'))
manifest['files']={n:hashlib.sha256(open(os.path.join(DELIVER,n),'rb').read()).hexdigest() for n in ['persona.txt','worldbook.json','regex.json']}
assert len(rules)<=130 and len(opener)<=4000
open(os.path.join(OUT,'release-manifest.json'),'w',encoding='utf-8').write(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps(dict(rules=len(rules),chunks=len(rules)-7,payloadBytes=len(payload.encode('utf-8')),maxReplacementUtf16=mx)))
