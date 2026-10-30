export const HOST_ROOTS = new Set(['conversations','conv-delete','conv-rename','conv-limit','models','model-setting','persona','persona-confirm','extra','style','instructions','reset','background','assistant-intro','message-edit','message-delete','message-backtrack','share-role','share-records','summary']);
export function inspectHostCss(css) {
  const errors = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // Scope each selector, including members in a selector list. Nested host rules are rejected.
  const blocks = [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for (const [, selector, body] of blocks) {
    const touchesHost = /data-host\s*=|\.(?:sandbox-host|model-setting-scope|model-switch-scope|role-profile-modal|conv-style-modal|summary-sheet|conversation-list-scope|msg-edit-scope)\b/.test(selector);
    if (!touchesHost) continue;
    if (/:has\s*\(/i.test(selector)) errors.push('受控宿主 CSS 不能使用 :has()');
    if (/url\s*\(/i.test(selector + body)) errors.push('受控宿主 CSS 不能使用 url()');
    for (const part of selector.split(',')) {
      const match = /^\s*\[data-host\s*=\s*(["'])([^"']+)\1\]/.exec(part);
      if (!match) errors.push('宿主内部选择器必须从精确 [data-host="…"] 根开始，不能裸写父页面选择器');
      else if (!HOST_ROOTS.has(match[2])) errors.push(`未开放的 data-host 根: ${match[2]}`);
    }
  }
  if (/\[data-host[^{}]+\{[^}]*\{/s.test(clean)) errors.push('受控宿主 CSS 不支持原生嵌套，须写平铺规则');
  return [...new Set(errors)];
}
