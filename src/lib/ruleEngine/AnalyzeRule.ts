/**
 * RuleEngine - Legado 风格规则解析引擎
 * 
 * 支持的规则语法:
 * - CSS Selector: class.title@text, .item@href, #id@attr
 * - XPath: //div[@class='title']/text()
 * - JSONPath: $.store.book[*].title
 * - 正则: ##regex##
 * - JavaScript: {{js代码}}
 * - 规则组合: rule1||rule2 (或), rule1&&rule2 (与)
 */

import * as cheerio from 'cheerio';

export type RuleMode = 'Default' | 'Css' | 'XPath' | 'Json' | 'Regex' | 'Js';

// 规则解析结果
export interface ParsedRule {
  mode: RuleMode;
  rule: string;
  param?: string;      // 如 @text, @href, @attr 等
  replaceRegex?: string;
  replacement?: string;
}

/**
 * 分析规则类 - 核心解析器
 */
export class AnalyzeRule {
  private content: any;
  private baseUrl: string;
  private $: cheerio.CheerioAPI | null = null;

  constructor(content?: any, baseUrl: string = '') {
    this.content = content;
    this.baseUrl = baseUrl;
    if (typeof content === 'string') {
      try {
        this.$ = cheerio.load(content);
      } catch {
        this.$ = null;
      }
    }
  }

  /**
   * 设置内容
   */
  setContent(content: any, baseUrl?: string) {
    this.content = content;
    if (baseUrl) this.baseUrl = baseUrl;
    if (typeof content === 'string') {
      try {
        this.$ = cheerio.load(content);
      } catch {
        this.$ = null;
      }
    }
  }

  /**
   * 获取字符串结果
   */
  getString(ruleStr?: string, useCache: boolean = true): string {
    if (!ruleStr) return '';
    const results = this.getStringList(ruleStr, useCache);
    return results.join('\n').trim();
  }

  /**
   * 获取字符串列表
   */
  getStringList(ruleStr?: string, useCache: boolean = true): string[] {
    if (!ruleStr) return [];
    
    // 处理 || 或规则
    if (ruleStr.includes('||')) {
      const rules = ruleStr.split('||');
      for (const rule of rules) {
        const result = this.getStringList(rule.trim());
        if (result.length > 0) return result;
      }
      return [];
    }
    
    // 处理 && 与规则
    if (ruleStr.includes('&&')) {
      const rules = ruleStr.split('&&');
      let results: string[] = [];
      for (const rule of rules) {
        const result = this.getStringList(rule.trim());
        results = results.concat(result);
      }
      return results;
    }

    // 解析单个规则
    const parsed = this.parseRule(ruleStr);
    return this.executeRule(parsed);
  }

  /**
   * 获取元素列表
   */
  getElements(ruleStr?: string): any[] {
    if (!ruleStr || !this.$) return [];
    
    const parsed = this.parseRule(ruleStr);
    
    if (parsed.mode === 'Css' || parsed.mode === 'Default') {
      const elements: any[] = [];
      const $ = this.$!;
      $(parsed.rule).each((_, el) => {
        elements.push($.html(el));
      });
      return elements;
    }
    
    return [];
  }

  /**
   * 解析规则字符串
   */
  private parseRule(ruleStr: string): ParsedRule {
    let rule = ruleStr.trim();
    let mode: RuleMode = 'Default';
    let param: string | undefined;
    let replaceRegex: string | undefined;
    let replacement: string | undefined;

    // 检测规则前缀
    if (rule.startsWith('@css:')) {
      mode = 'Css';
      rule = rule.substring(5);
    } else if (rule.startsWith('@XPath:') || rule.startsWith('@xpath:')) {
      mode = 'XPath';
      rule = rule.substring(7);
    } else if (rule.startsWith('@json:') || rule.startsWith('$.')) {
      mode = 'Json';
      if (rule.startsWith('@json:')) rule = rule.substring(6);
    } else if (rule.startsWith('{{') && rule.endsWith('}}')) {
      mode = 'Js';
      rule = rule.slice(2, -2);
    } else if (rule.includes('##')) {
      // 正则替换规则: rule##regex##replacement
      const parts = rule.split('##');
      if (parts.length >= 3) {
        rule = parts[0];
        replaceRegex = parts[1];
        replacement = parts[2] || '';
      } else if (parts.length === 2) {
        mode = 'Regex';
        rule = parts[1];
      }
    }

    // 提取 @ 参数
    const atIndex = rule.lastIndexOf('@');
    if (atIndex > 0) {
      param = rule.substring(atIndex + 1);
      rule = rule.substring(0, atIndex);
    }

    return { mode, rule, param, replaceRegex, replacement };
  }

  /**
   * 执行规则
   */
  private executeRule(parsed: ParsedRule): string[] {
    const { mode, rule, param, replaceRegex, replacement } = parsed;
    let results: string[] = [];

    switch (mode) {
      case 'Css':
      case 'Default':
        results = this.executeCssRule(rule, param);
        break;
      case 'Json':
        results = this.executeJsonRule(rule);
        break;
      case 'Regex':
        results = this.executeRegexRule(rule);
        break;
      case 'Js':
        results = this.executeJsRule(rule);
        break;
      case 'XPath':
        // XPath 在 React Native 中实现复杂，暂用 CSS 近似处理
        results = this.executeCssRule(rule, param);
        break;
    }

    // 应用正则替换
    if (replaceRegex) {
      try {
        const regex = new RegExp(replaceRegex, 'g');
        results = results.map(r => r.replace(regex, replacement || ''));
      } catch {}
    }

    return results.filter(r => r && r.trim());
  }

  /**
   * 执行 CSS Selector 规则
   */
  private executeCssRule(rule: string, param?: string): string[] {
    if (!this.$) return [];

    const results: string[] = [];
    
    try {
      const $ = this.$!;
      $(rule).each((_, el) => {
        const $el = $(el);
        let value = '';

        switch (param) {
          case 'text':
          case 'textNodes':
            value = $el.text().trim();
            break;
          case 'html':
          case 'innerHtml':
            value = $el.html() || '';
            break;
          case 'ownText':
            value = $el.contents().filter((_, node) => node.type === 'text')
              .map((_, node) => (node as any).data || '').get().join('').trim();
            break;
          case 'href':
          case 'src':
            value = $el.attr(param) || '';
            // 处理相对 URL
            if (value && !value.startsWith('http') && this.baseUrl) {
              try {
                value = new URL(value, this.baseUrl).href;
              } catch {}
            }
            break;
          default:
            if (param) {
              value = $el.attr(param) || '';
            } else {
              value = $el.text().trim();
            }
        }

        if (value) results.push(value);
      });
    } catch (e) {
      console.error('[AnalyzeRule] CSS 规则执行失败:', rule, e);
    }

    return results;
  }

  /**
   * 执行 JSONPath 规则
   */
  private executeJsonRule(rule: string): string[] {
    let data = this.content;
    
    // 尝试解析 JSON
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return [];
      }
    }

    // 简单的 JSONPath 实现
    try {
      const path = rule.replace(/^\$\.?/, '').split(/[\.\[\]]+/).filter(Boolean);
      let result: any = data;

      for (const key of path) {
        if (key === '*') {
          // 通配符，返回数组所有元素
          if (Array.isArray(result)) {
            return result.map(item => String(item));
          }
          return [];
        }
        result = result?.[key];
        if (result === undefined) return [];
      }

      if (Array.isArray(result)) {
        return result.map(item => String(item));
      }
      return result ? [String(result)] : [];
    } catch {
      return [];
    }
  }

  /**
   * 执行正则规则
   */
  private executeRegexRule(rule: string): string[] {
    if (typeof this.content !== 'string') return [];
    
    try {
      const regex = new RegExp(rule, 'g');
      const matches = this.content.match(regex);
      return matches || [];
    } catch {
      return [];
    }
  }

  /**
   * 执行 JavaScript 规则
   * 注意: 在 React Native 中执行动态 JS 有限制
   */
  private executeJsRule(rule: string): string[] {
    // 基本的变量替换
    // 支持: result (内容), baseUrl, java.getString() 等
    try {
      // 简单情况：直接返回变量
      if (rule === 'result') {
        return [String(this.content)];
      }
      
      // 简单的字符串操作
      if (rule.includes('result.')) {
        const content = String(this.content);
        // 模拟常见操作
        if (rule.includes('.replace(')) {
          const match = rule.match(/\.replace\(['"](.+?)['"],\s*['"](.*)['"](?:\))/);
          if (match) {
            return [content.replace(new RegExp(match[1], 'g'), match[2])];
          }
        }
      }
      
      console.warn('[AnalyzeRule] JavaScript 规则暂不完全支持:', rule);
      return [];
    } catch (e) {
      console.error('[AnalyzeRule] JS 规则执行失败:', rule, e);
      return [];
    }
  }

  /**
   * 获取绝对 URL
   */
  getAbsoluteUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    
    try {
      return new URL(url, this.baseUrl).href;
    } catch {
      return url;
    }
  }
}

/**
 * 规则解析器工厂
 */
export function createAnalyzer(content: any, baseUrl: string = ''): AnalyzeRule {
  return new AnalyzeRule(content, baseUrl);
}
