/**
 * JavaScript 规则引擎
 * 用于执行书源中的 JavaScript 规则代码
 * 
 * 支持的规则格式:
 * - @js:code - 执行 JS 代码
 * - <js>code</js> - 内联 JS 块
 * - {{code}} - 内联表达式
 */

import * as cheerio from 'cheerio';

// 规则执行上下文
export interface RuleContext {
  result?: any;           // 上一步结果
  baseUrl?: string;       // 基础 URL
  book?: any;             // 书籍信息
  chapter?: any;          // 章节信息
  source?: any;           // 书源信息
  page?: number;          // 页码
  key?: string;           // 搜索关键词
}

// JS 执行环境中的工具函数
const createSandboxUtils = (html: string, baseUrl: string) => {
  const $ = cheerio.load(html);
  
  return {
    // 类 jQuery 选择器
    $,
    
    // 获取文本
    text: (selector: string) => $(selector).text().trim(),
    
    // 获取 HTML
    html: (selector: string) => $(selector).html() || '',
    
    // 获取属性
    attr: (selector: string, name: string) => $(selector).attr(name) || '',
    
    // 获取所有匹配元素
    all: (selector: string) => {
      const elements: any[] = [];
      $(selector).each((_, el) => {
        elements.push({
          text: () => $(el).text().trim(),
          html: () => $(el).html() || '',
          attr: (name: string) => $(el).attr(name) || '',
          find: (sel: string) => $(el).find(sel),
        });
      });
      return elements;
    },
    
    // 相对 URL 转绝对 URL
    absUrl: (url: string) => {
      if (!url || url.startsWith('http')) return url;
      try {
        return new URL(url, baseUrl).href;
      } catch {
        return url;
      }
    },
    
    // 编码
    encodeUri: (str: string) => encodeURIComponent(str),
    decodeUri: (str: string) => decodeURIComponent(str),
    
    // Base64
    base64Encode: (str: string) => {
      if (typeof btoa !== 'undefined') return btoa(str);
      return Buffer.from(str).toString('base64');
    },
    base64Decode: (str: string) => {
      if (typeof atob !== 'undefined') return atob(str);
      return Buffer.from(str, 'base64').toString();
    },
    
    // 时间
    timeFormat: (timestamp: number, format: string = 'yyyy-MM-dd') => {
      const date = new Date(timestamp);
      return format
        .replace('yyyy', String(date.getFullYear()))
        .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
        .replace('dd', String(date.getDate()).padStart(2, '0'))
        .replace('HH', String(date.getHours()).padStart(2, '0'))
        .replace('mm', String(date.getMinutes()).padStart(2, '0'))
        .replace('ss', String(date.getSeconds()).padStart(2, '0'));
    },
    
    // 正则匹配
    match: (str: string, pattern: string, group: number = 0) => {
      const match = str.match(new RegExp(pattern));
      return match ? (match[group] || '') : '';
    },
    
    // 字符串处理
    replace: (str: string, pattern: string, replacement: string) => {
      return str.replace(new RegExp(pattern, 'g'), replacement);
    },
    
    // 打印调试信息
    log: (...args: any[]) => {
      console.log('[JS Rule]', ...args);
    },
  };
};

/**
 * 在沙箱环境中执行 JavaScript 代码
 */
export const executeJsRule = (
  code: string,
  context: RuleContext,
  html: string = ''
): any => {
  try {
    const utils = createSandboxUtils(html, context.baseUrl || '');
    
    // 构建执行环境变量
    const sandbox = {
      result: context.result,
      baseUrl: context.baseUrl,
      book: context.book,
      chapter: context.chapter,
      source: context.source,
      page: context.page || 1,
      key: context.key || '',
      ...utils,
    };
    
    // 构建函数参数名和值
    const argNames = Object.keys(sandbox);
    const argValues = Object.values(sandbox);
    
    // 使用 Function 构造器创建隔离的执行环境
    // 这比 eval 更安全，因为它不会访问外部作用域
    const fn = new Function(...argNames, `
      "use strict";
      ${code}
    `);
    
    return fn(...argValues);
  } catch (error) {
    console.error('[JS Rule] 执行失败:', error);
    return null;
  }
};

/**
 * 解析并执行混合规则
 * 支持: CSS选择器、@js:、<js></js>、{{}}
 */
export const parseAndExecuteRule = (
  rule: string,
  context: RuleContext,
  html: string
): string => {
  if (!rule) return '';
  
  // @js: 前缀 - 整个规则是 JS
  if (rule.trim().startsWith('@js:')) {
    const jsCode = rule.substring(4);
    const result = executeJsRule(`return ${jsCode}`, context, html);
    return String(result ?? '');
  }
  
  // <js></js> 块
  if (rule.includes('<js>')) {
    rule = rule.replace(/<js>([\s\S]*?)<\/js>/g, (_, jsCode) => {
      const result = executeJsRule(`return ${jsCode}`, context, html);
      return String(result ?? '');
    });
  }
  
  // {{}} 表达式
  if (rule.includes('{{')) {
    rule = rule.replace(/\{\{([\s\S]*?)\}\}/g, (_, expr) => {
      const result = executeJsRule(`return ${expr}`, context, html);
      return String(result ?? '');
    });
  }
  
  return rule;
};

/**
 * 检测规则是否包含 JavaScript
 */
export const hasJsRule = (rule: string | undefined): boolean => {
  if (!rule) return false;
  return rule.includes('@js:') || rule.includes('<js>') || rule.includes('{{');
};

/**
 * 安全地解析 JSON
 */
export const safeParseJson = (str: string): any => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

/**
 * JSONPath 简单实现
 * 支持: $.key, $.array[0], $.nested.path
 */
export const jsonPath = (obj: any, path: string): any => {
  if (!path || !obj) return null;
  
  // 移除开头的 $.
  if (path.startsWith('$.')) path = path.substring(2);
  if (path.startsWith('$')) path = path.substring(1);
  
  const parts = path.split(/\.|\[|\]/).filter(Boolean);
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return null;
    
    if (/^\d+$/.test(part)) {
      current = current[parseInt(part, 10)];
    } else {
      current = current[part];
    }
  }
  
  return current;
};

/**
 * 执行 JSONPath 规则
 */
export const executeJsonPathRule = (json: any, rule: string): any => {
  if (!rule) return null;
  
  // @json: 前缀
  if (rule.startsWith('@json:')) {
    rule = rule.substring(6);
  }
  
  // 处理多规则 (||)
  if (rule.includes('||')) {
    for (const r of rule.split('||')) {
      const result = jsonPath(json, r.trim());
      if (result !== null && result !== undefined) {
        return result;
      }
    }
    return null;
  }
  
  return jsonPath(json, rule);
};

export default {
  executeJsRule,
  parseAndExecuteRule,
  hasJsRule,
  jsonPath,
  executeJsonPathRule,
};
