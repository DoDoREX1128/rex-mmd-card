import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {load as loadErrors, validateEntry, routesOf} from './lib/errors.mjs';
import {loadBlueprints, validateBlueprints} from './lib/fields.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(name,args=[])=>spawnSync(process.execPath,[path.join(root,'scripts',name),...args],{encoding:'utf8'});
test('旧版同层与原生检索分开，版本条件仍生效',()=>{
  const same=run('error-log.mjs',['--find','长按','--route','same']);
  assert.equal(same.status,0,same.stderr);assert.match(same.stdout,/E-040/);
  const native=run('error-log.mjs',['--find','长按','--route','native']);
  assert.equal(native.status,0,native.stderr);assert.doesNotMatch(native.stdout,/E-040/);
  const sandbox=run('error-log.mjs',['--route','sandbox','--ver','v0']);
  assert.equal(sandbox.status,0);assert.doesNotMatch(sandbox.stdout,/E-040|E-071/);
  assert.equal(run('error-log.mjs',['--route','typo']).status,2);
});
test('错题路线必须与版本相容，旧记录保留兼容筛选',()=>{
  const doc=loadErrors(),e=structuredClone(doc.entries.find(e=>e.id==='E-040'));
  assert.deepEqual(routesOf(e),['same']);
  e.routes=['sandbox'];assert.ok(validateEntry(e,[]).some(s=>s.includes('不相容')));
  delete e.routes;assert.deepEqual(routesOf(e),['same','native']);
  e.verdict='confirmed';e.evidence='guess';assert.ok(validateEntry(e,[]).some(s=>s.includes('推断')));
});
test('创作和嵌套字段均可检索，查询不改真源',()=>{
  const names=['references/errors/errors.json','references/fields/fields.json','references/fields/blueprints.json'];
  const before=names.map(n=>fs.readFileSync(path.join(root,n)));
  for(const q of ['认知','Intel','sys.bag']){
    const r=run('field-add.mjs',['--find',q]);assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/蓝图/);
  }
  const r=run('field-add.mjs',['--profile','complete-status-v3']);
  assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).route,'same');
  assert.equal(run('field-add.mjs',['--profile','typo']).status,2);
  names.forEach((n,i)=>assert.deepEqual(fs.readFileSync(path.join(root,n)),before[i]));
});
test('蓝图拒绝缺失合并语义与重复路径，实例JSON可用',()=>{
  const bp=loadBlueprints();assert.deepEqual(validateBlueprints(bp),[]);
  const bad=structuredClone(bp);delete bad.runtime.fields[0].merge;
  bad.runtime.fields.push({...bad.runtime.fields[1]});
  assert.ok(validateBlueprints(bad).some(s=>s.includes('merge')));
  assert.ok(validateBlueprints(bad).some(s=>s.includes('重复')));
  const ex=JSON.parse(JSON.stringify(bp.runtime.example));
  assert.equal(ex.npcs.陆云衡.fav,0);assert.ok(ex.opt.every(s=>s.length<=20));
  assert.ok(bp.runtime.fields.find(f=>f.path==='me.Intel / npcs.*.Intel'));
});
test('每条错题均可在生成的完整记录中定位，SDK示例没有丢失',()=>{
  const details=fs.readFileSync(path.join(root,'references/errors/cases.md'),'utf8');
  const ids=new Set();
  for(const e of loadErrors().entries){
    assert.ok(!ids.has(e.id));ids.add(e.id);
    assert.ok(details.includes(`id="${e.id.toLowerCase()}"`),e.id);
    assert.ok(details.includes(e.fix),e.id);
  }
  assert.match(details,/async function dropSave/);
  assert.match(details,/async function send/);
  assert.match(details,/sdk\.stage\.visible/);
});
test('所有生成文档与JSON一致，完整骨架运行时未损坏',()=>{
  for(const script of ['gen-errors.mjs','gen-fields.mjs','gen-facts.mjs']){
    const r=run(script,['--check']);assert.equal(r.status,0,r.stderr||r.stdout);
  }
  const r=run('check-complete-actions.mjs');assert.equal(r.status,0,r.stderr||r.stdout);
});
