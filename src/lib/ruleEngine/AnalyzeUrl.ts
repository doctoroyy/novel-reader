/**
 * AnalyzeUrl - URL 模板解析器
 * 
 * 支持 legado 的 URL 模板语法:
 * - {{key}} - 搜索关键词
 * - {{page}} - 页码
 * - <page,page> - 分页规则
 * - @body - POST 请求体
 * - {headers} - 自定义请求头
 */

export interface UrlOptions {
  method: 'GET' | 'POST';
  url: string;
  body?: string;
  headers?: Record<string, string>;
}

export class AnalyzeUrl {
  private urlTemplate: string;
  private baseUrl: string;
  private key: string;
  private page: number;
  private headers?: string;

  constructor(
    urlTemplate: string,
    baseUrl: string = '',
    key: string = '',
    page: number = 1,
    headers?: string
  ) {
    this.urlTemplate = urlTemplate;
    this.baseUrl = baseUrl;
    this.key = key;
    this.page = page;
    this.headers = headers;
  }

  /**
   * 解析 URL 模板
   */
  analyze(): UrlOptions {
    let url = this.urlTemplate;
    let method: 'GET' | 'POST' = 'GET';
    let body: string | undefined;
    let headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    // 解析自定义 headers
    if (this.headers) {
      try {
        const customHeaders = JSON.parse(this.headers);
        headers = { ...headers, ...customHeaders };
      } catch {}
    }

    // 检测 POST 请求 (@ 分隔)
    if (url.includes(',{')) {
      // legado 格式: url,{"method":"POST","body":"..."}
      const commaIndex = url.indexOf(',{');
      const optionStr = url.substring(commaIndex + 1);
      url = url.substring(0, commaIndex);
      
      try {
        const options = JSON.parse(optionStr);
        if (options.method?.toUpperCase() === 'POST') {
          method = 'POST';
        }
        if (options.body) {
          body = this.replaceVariables(options.body);
        }
        if (options.headers) {
          headers = { ...headers, ...options.headers };
        }
      } catch {}
    } else if (url.includes('@')) {
      // 简单格式: url@body
      const atIndex = url.indexOf('@');
      body = url.substring(atIndex + 1);
      url = url.substring(0, atIndex);
      method = 'POST';
      body = this.replaceVariables(body);
    }

    // 替换变量
    url = this.replaceVariables(url);

    // 处理相对 URL
    if (!url.startsWith('http') && this.baseUrl) {
      try {
        url = new URL(url, this.baseUrl).href;
      } catch {}
    }

    return { method, url, body, headers };
  }

  /**
   * 替换模板变量
   */
  private replaceVariables(str: string): string {
    return str
      // legado 标准格式
      .replace(/\{\{key\}\}/gi, encodeURIComponent(this.key))
      .replace(/\{\{searchKey\}\}/gi, encodeURIComponent(this.key))
      .replace(/\{\{page\}\}/gi, String(this.page))
      .replace(/\{\{searchPage\}\}/gi, String(this.page))
      // 其他常见格式
      .replace(/\$\{key\}/gi, encodeURIComponent(this.key))
      .replace(/\$\{page\}/gi, String(this.page))
      .replace(/searchKey/g, encodeURIComponent(this.key))
      .replace(/searchPage/g, String(this.page))
      // 分页规则 <start,end>
      .replace(/<(\d+),(\d+)>/g, (_, start, _end) => {
        return String(parseInt(start) + (this.page - 1));
      });
  }
}

/**
 * 创建 URL 分析器
 */
export function analyzeUrl(
  urlTemplate: string,
  baseUrl: string = '',
  key: string = '',
  page: number = 1,
  headers?: string
): UrlOptions {
  return new AnalyzeUrl(urlTemplate, baseUrl, key, page, headers).analyze();
}
