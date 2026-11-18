import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'references/templates/catalog.json'),'utf8'));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));

test('三路线目录独立，条目ID稳定唯一，子页与实现依赖存在',()=>{
  assert.equal(catalog.schema,'rex-template-catalog/1');
  assert.deepEqual(Object.keys(catalog.routes).sort(),['native','same','sandbox']);
  const ids=new Set(),guides=new Set();
  for(const parent of Object.values(catalog.routes))assert.ok(exists(parent),parent);
  for(const e of catalog.entries){
    assert.match(e.id,/^[a-z][a-z0-9-]+$/);
    assert.ok(!ids.has(e.id),e.id);ids.add(e.id);
    assert.ok(catalog.routes[e.route],e.route);
    assert.ok(catalog.routes[e.runtimeRoute],e.runtimeRoute);
    assert.ok(e.architecture);
    assert.ok(!guides.has(e.guide),e.guide);guides.add(e.guide);
    assert.ok(exists(e.guide),e.guide);
    assert.ok(read(catalog.routes[e.route]).includes(path.basename(e.guide)),e.id);
    for(const key of ['direction','layout','style'])assert.ok(Array.isArray(e.tags[key]));
    assert.ok(['method-only','buildable','reskin-verified'].includes(e.maturity));
    if(e.maturity==='method-only'){
      assert.equal(e.kind,'adaptation-technique');
      assert.equal(e.implementation,null);
      assert.equal(e.evidence.source,'method-only');
    }else{
      assert.equal(e.kind,'implementation-template');
      assert.equal(e.runtimeRoute,e.route);
      assert.ok(e.implementation && exists(e.implementation),e.id);
      assert.equal(e.evidence.source,'included');
    }
    if(e.maturity==='reskin-verified'){
      assert.ok(e.evidence.reskinReport && exists(e.evidence.reskinReport),e.id);
    }
    for(const key of ['reskin','targetSite','physicalDevice'])assert.ok(e.evidence[key]);
  }
});

test('分类入口、子页、迁移契约的本地Markdown引用无断链',()=>{
  const files=['SKILL.md','README.md','references/00-总览与阅读路径.md',
    'references/20-平台-分流.md','references/29-平台-模板分类与融合规范.md',
    ...Object.values(catalog.routes),...catalog.entries.map(e=>e.guide),
    'references/templates/legacy-samelayer/full-hud-contracts.md'];
  for(const f of files){
    for(const m of read(f).matchAll(/\]\(([^)]+)\)/g)){
      const href=m[1];
      if(/^(?:https?:|#|mailto:)/.test(href))continue;
      const target=path.resolve(path.dirname(path.join(root,f)),decodeURIComponent(href.split('#')[0]));
      assert.ok(fs.existsSync(target),`${f} -> ${href}`);
    }
  }
});

test('原生/沙盒尚无正式成品，模块化模板的换皮肉证据与运行时相符',()=>{
  for(const route of ['native','sandbox']){
    assert.equal(catalog.entries.filter(e=>e.route===route && e.maturity!=='method-only').length,0);
  }
  const study=catalog.entries.find(e=>e.id==='sl-modular-scenes');
  assert.equal(study.maturity,'reskin-verified');
  assert.ok(study.implementation && exists(study.implementation));
  const report=JSON.parse(read(study.evidence.reskinReport));
  assert.equal(report.template,study.id);
  assert.equal(report.variants.length,2);
  assert.deepEqual(report.viewports,[1440,390]);
  for(const v of report.variants)assert.ok(v.tests.length>0 && v.tests.every(x=>x.pass));
  assert.deepEqual(report.variants[0].runtimeFiles,report.variants[1].runtimeFiles);
  for(const [rel,digest]of Object.entries(report.variants[0].runtimeFiles)){
    const actual=fs.readFileSync(path.join(root,'assets/modular-scenes',rel));
    assert.equal(createHash('sha256').update(actual).digest('hex'),digest,rel);
  }
  assert.equal(study.evidence.targetSite,'NOT RUN');
  assert.equal(study.evidence.physicalDevice,'NOT RUN');
});
