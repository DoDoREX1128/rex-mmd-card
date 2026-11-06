import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateWorldbookEnvelopes} from './lib/worldbook.mjs';
const check=content=>validateWorldbookEnvelopes({entries:{0:{content}}});
test('一组标签包住完整正文，内部普通分节与状态示例合法',()=>{
 assert.equal(check('<修行规则>\n[条件]积累修为\n[status]{"turn":1}[/status]\n</修行规则>').length,0);
 assert.equal(check(' \n<青岚宗>正文</青岚宗>\n').length,0);
});
test('拒绝缺失、错配、嵌套、多组、属性与标签外正文',()=>{
 for(const text of ['无标签','<规则>正文','<规则>x</人物>','<规则><子项>x</子项></规则>','<甲>x</甲><乙>y</乙>','说明<规则>x</规则>','<规则>x</规则>尾巴','<规则 class="x">x</规则>'])assert.ok(check(text).length,text);
});
test('修仙写作与组件世界书均符合单外层约定',()=>{
 for(const name of ['../assets/writing/worldbook-xianxia.example.json','../assets/kits/longform-samelayer/worldbook.example.json']){
  const book=JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8'));assert.deepEqual(validateWorldbookEnvelopes(book),[]);
 }
});
