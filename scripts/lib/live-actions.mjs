#!/usr/bin/env node
/* lib/live-actions.mjs · 动作序列的解析与校验
 * PC 链用浏览器驱动执行，手机链用 CDP 执行，语义一致。
 * 只做解析：把 --act 的 JSON 变成可执行步骤，并挡掉格式错误。
 */

const ALLOWED = new Set(['click', 'fill', 'press', 'wait', 'shot', 'eval', 'scrollTo']);

function fail(message) {
  const e = new Error(message);
  e.code = 'ACT_INVALID';
  throw e;
}

function needString(value, what) {
  if (typeof value !== 'string' || !value.trim()) fail(`${what} 必须是非空字符串`);
  return value;
}

/** 截图名只允许安全字符，避免写出奇怪路径 */
function safeName(value, index) {
  const s = typeof value === 'string' && value.trim() ? value.trim() : `step-${index + 1}`;
  if (!/^[A-Za-z0-9._-]{1,60}$/.test(s)) fail(`截图名 ${s} 只能含字母、数字、点、下划线与短横线`);
  return s;
}

/**
 * 接受 JSON 字符串或已解析数组，返回规范化步骤。
 * 步骤形如 {kind:'click', selector}、{kind:'fill', selector, text}、{kind:'wait', ms}
 */
export function normalizeActions(input) {
  if (input == null || input === '') return [];
  let raw = input;
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input);
    } catch {
      fail('动作序列不是合法 JSON');
    }
  }
  if (!Array.isArray(raw)) fail('动作序列必须是数组');

  return raw.map((step, index) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) fail(`第 ${index + 1} 步必须是对象`);
    const keys = Object.keys(step).filter((k) => ALLOWED.has(k));
    if (keys.length !== 1) {
      fail(`第 ${index + 1} 步必须恰好有一个动作键：${[...ALLOWED].join(' / ')}`);
    }
    const kind = keys[0];
    const value = step[kind];

    if (kind === 'click' || kind === 'scrollTo') {
      return { kind, selector: needString(value, `第 ${index + 1} 步 ${kind}`) };
    }
    if (kind === 'fill') {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return {
          kind: 'fill',
          selector: needString(value.selector, `第 ${index + 1} 步 fill.selector`),
          text: needString(value.text, `第 ${index + 1} 步 fill.text`)
        };
      }
      return { kind: 'fill', selector: needString(value, `第 ${index + 1} 步 fill`), text: needString(step.text, `第 ${index + 1} 步 fill.text`) };
    }
    if (kind === 'press') {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return { kind: 'press', key: needString(value.key, `第 ${index + 1} 步 press.key`), selector: value.selector };
      }
      return { kind: 'press', key: needString(value, `第 ${index + 1} 步 press`) };
    }
    if (kind === 'wait') {
      const ms = Number(value);
      if (!Number.isFinite(ms) || ms < 0 || ms > 60000) fail(`第 ${index + 1} 步 wait 需在 0–60000 毫秒之间`);
      return { kind: 'wait', ms };
    }
    if (kind === 'shot') {
      return { kind: 'shot', name: safeName(value, index) };
    }
    return { kind: 'eval', expression: needString(value, `第 ${index + 1} 步 eval`) };
  });
}

/** 动作序列里是否有会改页面或数据的一步，用于报告里标明写操作 */
export function mutating(steps) {
  return steps.filter((s) => s.kind === 'click' || s.kind === 'fill' || s.kind === 'press');
}

/** 报告里的人类可读描述 */
export function describeStep(s) {
  if (s.kind === 'wait') return `等待 ${s.ms}ms`;
  if (s.kind === 'shot') return `截图 ${s.name}`;
  if (s.kind === 'fill') return `填入 ${s.selector}`;
  if (s.kind === 'click') return `点击 ${s.selector}`;
  if (s.kind === 'press') return `按键 ${s.key}`;
  if (s.kind === 'eval') return `读取 ${s.expression.slice(0, 40)}`;
  return `滚动到 ${s.selector}`;
}
