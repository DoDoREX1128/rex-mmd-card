import { LIMIT } from './facts.mjs';

export function keywords(value, label, errors) {
  if (typeof value !== 'string') { errors.push(`${label} 必须是 JSON 编码的字符串数组`); return []; }
  try {
    const list = JSON.parse(value);
    if (!Array.isArray(list) || list.some(x => typeof x !== 'string')) throw Error();
    return list;
  } catch { errors.push(`${label} 解码后必须是字符串数组`); return []; }
}

export function validateWorldbook(book) {
  const errors = [], warnings = [], ids = new Set(); let constantChars = 0;
  if (!book || typeof book !== 'object' || Array.isArray(book) || !book.entries || typeof book.entries !== 'object' || Array.isArray(book.entries)) {
    return { errors: ['世界书必须包含 entries 对象映射'], warnings, constantChars };
  }
  if (Object.keys(book).some(k => k !== 'entries')) errors.push('导入世界书根对象只允许 entries；元数据保留在源文件或旁车文件');
  for (const [k, entry] of Object.entries(book.entries)) {
    const label = `entries[${k}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { errors.push(`${label} 必须是对象`); continue; }
    keywords(entry.key, `${label}.key`, errors);
    keywords(entry.keysecondary ?? '[]', `${label}.keysecondary`, errors);
    if (!Number.isInteger(entry.uid) || entry.uid < 0) errors.push(`${label}.uid 必须是非负整数`);
    else if (ids.has(entry.uid)) errors.push(`${label}.uid 重复: ${entry.uid}`);
    ids.add(entry.uid);
    for (const name of ['constant', 'disable']) if (name in entry && typeof entry[name] !== 'boolean') errors.push(`${label}.${name} 必须是布尔值`);
    if (typeof entry.content !== 'string') errors.push(`${label}.content 必须是文本`);
    if (typeof entry.comment !== 'string') errors.push(`${label}.comment 必须是文本`);
    if ((entry.content || '').length > LIMIT.worldbookEntryContent) errors.push(`${label} content 超过 ${LIMIT.worldbookEntryContent} 字`);
    if ((entry.comment || '').length > LIMIT.worldbookComment) warnings.push(`${label} 标题超过 ${LIMIT.worldbookComment} 字，需核对目标创卡页`);
    const p = Number(entry.probability ?? 100);
    if (entry.probability != null && !['number','string'].includes(typeof entry.probability)) errors.push(`${label}.probability 必须是数值或数字字符串`);
    if (!Number.isFinite(p) || p < 0 || p > 100) errors.push(`${label}.probability 必须在 0–100`);
    else if (typeof entry.probability !== 'string' || !/^\d+\.\d{2}$/.test(entry.probability)) warnings.push(`${label}.probability 建议用两位小数字符串`);
    if (entry.constant && !entry.disable && p === 100) constantChars += String(entry.content || '').length;
  }
  return { errors, warnings, constantChars };
}

// Independent MMD lorebook and embedded v2 character book have different schemas.
export function toCharacterBook(book, name = '') {
  const check = validateWorldbook(book);
  if (check.errors.length) throw Error(check.errors.join('\n'));
  return { name, entries: Object.values(book.entries).map(e => ({
    id: e.uid, keys: JSON.parse(e.key), secondary_keys: JSON.parse(e.keysecondary || '[]'),
    comment: e.comment, content: e.content, constant: !!e.constant, enabled: !e.disable,
    selective: !!e.selective, insertion_order: Number(e.order ?? 100),
    position: Number(e.position) === 0 ? 'before_char' : 'after_char',
    extensions: { ...e, probability: Number(e.probability ?? 100), position: Number(e.position ?? 1), depth: Number(e.depth ?? 4), role: Number(e.role ?? 0) }
  })) };
}

export function fromCharacterBook(book) {
  if (!book || !Array.isArray(book.entries)) throw Error('卡内 character_book.entries 必须是数组');
  return { entries: Object.fromEntries(book.entries.map((e, i) => [String(i), {
    ...(e.extensions || {}), uid: Number.isInteger(e.id) ? e.id : i,
    key: JSON.stringify(e.keys || []), keysecondary: JSON.stringify(e.secondary_keys || []),
    comment: e.comment || '', content: e.content || '', constant: !!e.constant, disable: e.enabled === false,
    order: e.insertion_order ?? 100, probability: Number(e.extensions?.probability ?? 100).toFixed(2),
    position: e.extensions?.position ?? (e.position === 'before_char' ? 0 : 1)
  }])) };
}
