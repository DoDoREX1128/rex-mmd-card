import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const CHROME=process.env.CHROME || [process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean).flatMap(p=>[path.join(p,'Google/Chrome/Application/chrome.exe'),path.join(p,'Microsoft/Edge/Application/msedge.exe')]).find(p=>fs.existsSync(p));
const DEFAULT_BASE=process.env.FRAME_URL;
const freePort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
export async function launch({ port, width = 1440, height = 900, mobile = null, url = null, dpr = 1 } = {}) {
  const BASE = url || DEFAULT_BASE;
  if(!CHROME||!BASE)throw Error('需要CHROME浏览器程序和FRAME_URL本地构建页');
  port=await freePort();console.log('CDP端口',port,'浏览器',CHROME);
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'rex-hud-test-'));
  const w = width, h = height;
  const isMob = mobile == null ? w < 500 : mobile;
  const proc = spawn(CHROME, [
    `--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--no-first-run', '--force-prefers-reduced-motion',
    `--user-data-dir=${profile}`,
    `--window-size=${w},${h}`, 'about:blank'
  ], { stdio: 'ignore' });

  process.once('exit',()=>{proc.kill();});
  let spawnError;proc.on('error',e=>{spawnError=e;});
  let list = null;
  for (let i = 0; i < 80; i++) {
    try {
      list = await (await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(1000)})).json();
      if (list.length) {console.log('CDP就绪');break;}
    } catch (_) { await new Promise(r => setTimeout(r, 200)); }
  }
  if(!list?.length){proc.kill();throw Error(spawnError?.message||'浏览器调试端口未就绪');}
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((res, rej) => { const timer=setTimeout(()=>rej(Error('CDP WebSocket连接超时')),8000);ws.onopen=()=>{clearTimeout(timer);res();};ws.onerror=e=>{clearTimeout(timer);rej(e);}; });

  let id = 0;
  const wait = new Map();
  const errs = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);if(process.env.CDP_DEBUG)console.log('CDP RECV',e.data.slice(0,400));
    if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') {
      errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || 'err');
    }
  };
  const send = (method, params = {}) => new Promise((res,reject) => {
    const i = ++id,timer=setTimeout(()=>{wait.delete(i);reject(Error('CDP超时：'+method));},10000);wait.set(i,m=>{clearTimeout(timer);if(m.error)reject(Error(m.error.message));else res(m);});
    if(process.env.CDP_DEBUG)console.log('CDP SEND',i,method);ws.send(JSON.stringify({ id: i, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: isMob });
  if (isMob) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  const ev = async expr => {
    const r = await send('Runtime.evaluate', {
      expression: `(()=>{try{return ${expr}}catch(e){return '__ERR__'+e.message}})()`,
      returnByValue: true, awaitPromise: true
    });
    const v = r.result?.result?.value;
    if (typeof v === 'string' && v.startsWith('__ERR__')) throw new Error(v);
    return v;
  };
  const goto = async hash => {
    await send('Page.navigate', { url: BASE + (BASE.includes('?') ? '&' : '?') + 't=' + Date.now() + (hash || '') });
    await new Promise(r => setTimeout(r, 1400));
  };
  const shot = async (name, sel) => {
    let clip = null;
    if (sel) {
      const r = await ev(`(()=>{const e=document.querySelector('${sel}');const b=e.getBoundingClientRect();return {x:Math.max(0,b.x),y:Math.max(0,b.y),width:b.width,height:b.height}})()`);
      clip = { ...r, scale: 2 };
    }
    const s = await send('Page.captureScreenshot', clip ? { format: 'png', clip } : { format: 'png' });
    const fs = await import('node:fs');
    const shots=path.join(process.env.REX_TEST_OUT||process.cwd(),'shots');
    fs.mkdirSync(shots,{recursive:true});
    fs.writeFileSync(path.join(shots,name), Buffer.from(s.result.data, 'base64'));
  };
  const move = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
    await new Promise(r => setTimeout(r, 120));
  };
  const tap = async (x, y) => {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await new Promise(r => setTimeout(r, 55));
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await new Promise(r => setTimeout(r, 260));
  };
  const close = () => { if(errs.length){console.log('FAIL 浏览器运行异常 '+JSON.stringify(errs));process.exitCode=1;}try { ws.close(); } catch (_) {} proc.kill(); };

  return { send, ev, goto, shot, move, tap, close, errs, width: w, height: h };
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
