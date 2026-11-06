import {launch,sleep} from './browser.mjs';
const b=await launch({url:new URL('transport.html',process.env.REX_FIXTURE_ROOT||new URL('./fixtures/',import.meta.url)).href});
try{
 await b.goto('');let r;
 for(let i=0;i<70;i++){r=await b.ev('window.__TRANSPORT_RESULTS__');if(r?.denied)break;await sleep(100);}
 const checks=[['snapshot.now通过真实MessagePort',r?.fresh?.ok&&r.fresh.result.native.connected],
 ['native.invoke经过Host分发',r?.send?.ok&&r.send.result.ok],
 ['写后快照读回本地消息',r?.after?.ok&&r.after.result.native.messages.some(m=>m.text==='本地桥接测试')],
 ['未允许的方法仍被拒绝',r?.denied?.ok===false]];
 for(const [name,ok] of checks){console.log((ok?'PASS ':'FAIL ')+name);if(!ok)process.exitCode=1;}
}finally{b.close();}
