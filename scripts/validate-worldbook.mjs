import fs from 'node:fs';
import { validateWorldbook,validateWorldbookEnvelopes } from './lib/worldbook.mjs';
try {
  const book = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
  const r = validateWorldbook(book);
  if(process.argv.includes('--author-format'))r.errors.push(...validateWorldbookEnvelopes(book));
  console.log(JSON.stringify(r, null, 2)); process.exitCode = r.errors.length ? 1 : 0;
} catch (e) { console.error(e.message); process.exitCode = 1; }
