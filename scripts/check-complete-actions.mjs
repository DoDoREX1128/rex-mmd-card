import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../assets/samelayer-complete/',import.meta.url));
const ctx=vm.createContext({});
for(const file of ['core.js','actions.js','models.js'])vm.runInContext(fs.readFileSync(path.join(root,'kit',file),'utf8'),ctx);
const groups=JSON.parse(JSON.stringify(ctx.MmdSameLayerActions.groups));
const feature=[...new Set(Object.values(groups).flat())],model=[...ctx.MmdSameLayerModels.actions];
const native=['sendMessage','tapNative','fillNative'];
const inventory={schema:'rex-complete-actions/2',groups,uniqueActions:feature,modelActions:model,nativeActions:native,allActions:[...new Set([...feature,...model,...native])],
 hostMethods:['native.invoke','ui.native','snapshot','snapshot.now','game.load','game.action','game.export','game.import','game.narrate'],
 invariant:'完整HUD、面板、Host与原生处理器一起复用，不能以最小基座替代',
 evidence:{source:'included',localBrowser:'run e2e-complete-samelayer.mjs',realMmd:'project-specific',physicalMobile:'project-specific'}};
const target=path.join(root,'native-actions.json');
if(process.argv.includes('--write'))fs.writeFileSync(target,JSON.stringify(inventory,null,2)+'\n');
else if(JSON.stringify(JSON.parse(fs.readFileSync(target,'utf8')))!==JSON.stringify(inventory))throw Error('动作目录与实际模块不一致；运行 --write 更新后核对');
const integrity=JSON.parse(fs.readFileSync(path.join(root,'source-integrity.json'),'utf8'));
for(const [name,digest] of Object.entries(integrity.files)){
 const data=fs.readFileSync(path.join(root,name));if(crypto.createHash('sha256').update(data).digest('hex')!==digest)throw Error('运行时完整性不一致：'+name);
}
console.log(JSON.stringify({featureActions:feature.length,modelActions:model.length,nativeActions:native.length,total:inventory.allActions.length,runtimeFiles:Object.keys(integrity.files).length}));
