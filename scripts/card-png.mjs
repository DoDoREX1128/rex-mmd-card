#!/usr/bin/env node
/* card-png.mjs · 把 v2 整卡 JSON 封进 PNG 的 chara 数据块（MMD 只认 PNG 整卡，不认 JSON 整卡）
 * 用法:
 *   node scripts/card-png.mjs --card work/out/demo-card.json --out work/out/demo-card.png
 *        [--base art.png] [--color "#1a1512"] [--size 1024] [--quiet]
 * 说明:
 *   --base 给底图时只插入 chara 块，其余字节原样保留（不重编码，不损画质）。
 *   不给 --base 时生成一张纯色底图，仅用于本地验证导入链路。
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { parseArgs, fail } from './lib/facts.mjs';

const { opts } = parseArgs(process.argv);
if (!opts.card || !opts.out) fail('用法: node scripts/card-png.mjs --card <v2.json> --out <png> [--base art.png]', 2);
if (!fs.existsSync(opts.card)) fail('找不到整卡 JSON: ' + opts.card, 2);

let card;
try { card = JSON.parse(fs.readFileSync(opts.card, 'utf8')); }
catch (e) { fail('整卡 JSON 解析失败: ' + e.message, 1); }

const data = card.data || card;
if (!data || !data.name) fail('整卡缺少 data.name', 1);
if (card.spec && card.spec !== 'chara_card_v2') fail(`只处理 chara_card_v2，当前 ${card.spec}`, 1);

/* ---------- CRC32 ---------- */
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type, dataBuf) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dataBuf.length, 0);
  const typeBuf = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, dataBuf])), 0);
  return Buffer.concat([len, typeBuf, dataBuf, crc]);
}

function textChunk(keyword, text) {
  const body = Buffer.concat([Buffer.from(keyword, 'latin1'), Buffer.from([0]), Buffer.from(text, 'latin1')]);
  return chunk('tEXt', body);
}

/* ---------- 纯色底图 ---------- */
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '#1a1512'));
  if (!m) return [26, 21, 18];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function solidPng(size, rgb) {
  const w = size, h = size;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const o = row + 1 + x * 4;
      raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- 读块 ---------- */
function readChunks(buf) {
  if (!buf.slice(0, 8).equals(SIG)) fail('不是合法 PNG（签名不符）', 1);
  const chunks = [];
  let p = 8;
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.slice(p + 4, p + 8).toString('latin1');
    const body = buf.slice(p + 8, p + 8 + len);
    chunks.push({ type, body, raw: buf.slice(p, p + 12 + len) });
    p += 12 + len;
    if (type === 'IEND') break;
  }
  return chunks;
}

/* ---------- 组装 ---------- */
const json = JSON.stringify(card);
const b64 = Buffer.from(json, 'utf8').toString('base64');

let outBuf;
let mode;
if (opts.base) {
  if (!fs.existsSync(opts.base)) fail('找不到底图: ' + opts.base, 1);
  const base = fs.readFileSync(opts.base);
  const chunks = readChunks(base);
  const keep = chunks.filter((c) => !(c.type === 'tEXt' && (c.body.slice(0, 5).toString('latin1') === 'chara' || c.body.slice(0, 4).toString('latin1') === 'ccv3')));
  const iendAt = keep.findIndex((c) => c.type === 'IEND');
  const head = Buffer.concat([SIG, ...keep.slice(0, iendAt).map((c) => c.raw)]);
  const tail = textChunk('chara', b64);
  const end = Buffer.concat(keep.slice(iendAt).map((c) => c.raw));
  outBuf = Buffer.concat([head, tail, end]);
  mode = 'base';
} else {
  const size = Number(opts.size || 1024);
  const png = solidPng(size, hexToRgb(opts.color));
  const chunks = readChunks(png);
  const iendAt = chunks.findIndex((c) => c.type === 'IEND');
  outBuf = Buffer.concat([
    SIG,
    ...chunks.slice(0, iendAt).map((c) => c.raw),
    textChunk('chara', b64),
    ...chunks.slice(iendAt).map((c) => c.raw)
  ]);
  mode = 'solid';
}

const outPath = path.resolve(opts.out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, outBuf);

/* ---------- 回读校验 ---------- */
const check = readChunks(fs.readFileSync(outPath));
const t = check.find((c) => c.type === 'tEXt' && c.body.slice(0, 5).toString('latin1') === 'chara');
if (!t) fail('写入后回读失败：找不到 chara 块', 1);
const got = JSON.parse(Buffer.from(t.body.slice(6).toString('latin1'), 'base64').toString('utf8'));
if (got.data.name !== data.name) fail('回读校验失败：name 不一致', 1);

if (!opts.quiet) {
  const ihdr = check.find((c) => c.type === 'IHDR');
  console.log('整卡 PNG 已生成');
  console.log('  模式      ' + (mode === 'base' ? '底图注入（原字节保留）' : '纯色底图'));
  console.log('  尺寸      ' + ihdr.body.readUInt32BE(0) + '×' + ihdr.body.readUInt32BE(4));
  console.log('  卡名      ' + got.data.name);
  console.log('  卡规格    ' + (got.spec || '(未声明)') + ' / ' + (got.spec_version || '-'));
  console.log('  规则      ' + (((got.data.extensions || {}).regex_scripts) || []).length + ' 条');
  console.log('  世界书    ' + (got.data.character_book ? '已内嵌' : '无'));
  console.log('  体积      ' + (outBuf.length / 1024).toFixed(1) + ' KB');
  console.log('  ' + outPath);
}
