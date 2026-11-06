#!/usr/bin/env python3
"""Build the self-contained old-MMD same-layer starter; standard library only."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path

ASSETS = Path(__file__).resolve().parents[1] / "assets" / "same-layer-kit"
LIMIT = 18000  # Engineering margin; the platform replacement limit remains 20000.


def dump(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def utf16_length(text):
    return len(text.encode("utf-16-le")) // 2


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def rules_for(source, app_id, build_id):
    encoded = base64.b64encode(source.encode("utf-8")).decode("ascii")
    parts = [encoded[i:i + 16000] for i in range(0, len(encoded), 16000)]
    if len(parts) + 1 > 130:
        raise ValueError("载荷超过 130 条正则，请减少依赖或拆分产品功能")
    digest = sha(source.encode("utf-8"))
    key = app_id + "_" + sha(build_id.encode())[:10]
    token = lambda i: "【SL_" + key + "_" + str(i).zfill(3) + "】"
    rows = []
    for i, part in enumerate(parts):
        data = {"index": i, "hash": sha(part.encode()), "text": part}
        start = "globalThis.__MMD_SL_PARTS__=globalThis.__MMD_SL_PARTS__||Object.create(null);"
        if i == 0:
            start += "globalThis.__MMD_SL_PARTS__[" + dump(key) + "]=[];"
        code = start + "globalThis.__MMD_SL_PARTS__[" + dump(key) + "][" + str(i) + "]=" + dump(data) + ";"
        rows.append({"id": -1, "scriptName": "SL" + str(i).zfill(3),
                     "findRegex": "/" + token(i) + "/g", "replaceString": "<script>" + code + "</script>" + token(i + 1)})
    # No author source occurs in these wrappers: replacement-template tokens cannot corrupt it.
    launcher = """(async function(){
const key=KEY, expected=TOTAL, digest=DIGEST;
try {
 const parts=globalThis.__MMD_SL_PARTS__?.[key];
 if(!Array.isArray(parts)||parts.length!==expected)throw Error('载荷分片数量不匹配');
 async function hash(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');}
 for(let i=0;i<expected;i++){
  const part=parts[i];if(!part||part.index!==i||await hash(new TextEncoder().encode(part.text))!==part.hash)throw Error('载荷分片校验失败');
 }
 const bytes=Uint8Array.from(atob(parts.map(p=>p.text).join('')),c=>c.charCodeAt(0));
 if(await hash(bytes)!==digest)throw Error('完整载荷校验失败');
 const script=document.createElement('script');script.textContent=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 (document.head||document.documentElement).appendChild(script);script.remove();
}catch(error){
 const box=document.createElement('div');box.style.cssText='position:fixed;inset:12px;z-index:2147483647;padding:20px;background:white;color:#702020;white-space:normal';
 const text=document.createElement('p');text.textContent='同层卡启动失败：'+error.message;
 const close=document.createElement('button');close.textContent='关闭并返回 MMD';close.onclick=()=>box.remove();
 box.append(text,close);document.body.appendChild(box);
}
})();""".replace("KEY", dump(key)).replace("TOTAL", str(len(parts))).replace("DIGEST", dump(digest))
    rows.append({"id": -1, "scriptName": "SL启动", "findRegex": "/" + token(len(parts)) + "/g",
                 "replaceString": "<script>" + launcher + "</script>"})
    for row in rows:
        if utf16_length(row["replaceString"]) > LIMIT or utf16_length(row["findRegex"]) > 1000:
            raise ValueError("规则超出构建安全线")
    if utf16_length(token(0)) > 200:
        raise ValueError("入口超过保守 200 字符预算")
    return token(0), rows, digest


