import * as cheerio from 'cheerio';
import { BookSource, Book, BookChapter } from '../types';
import { updateSourceRespondTime } from './bookSourceService';

// HTTP请求
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 30000): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// 规则解析器
class RuleParser {
  private $: cheerio.CheerioAPI;
  private baseUrl: string;

  constructor(html: string, baseUrl: string) {
    this.$ = cheerio.load(html);
    this.baseUrl = baseUrl;
  }

  parseRule(rule: string | undefined, context?: cheerio.Cheerio<any>): string {
    if (!rule) return '';

    const element = context || this.$.root();

    // 处理 || 分隔的多个规则
    if (rule.includes('||')) {
      for (const r of rule.split('||')) {
        const result = this.parseRule(r.trim(), context);
        if (result) return result;
      }
      return '';
    }

    // 处理 @css: 前缀
    if (rule.startsWith('@css:')) {
      rule = rule.substring(5);
    }

    // 处理属性获取
    const attrMatch = rule.match(/@(\w+)$/);
    let attr = 'text';
    if (attrMatch) {
      attr = attrMatch[1];
      rule = rule.substring(0, rule.length - attrMatch[0].length).trim();
    }

    const el = rule ? element.find(rule) : element;
    if (el.length === 0) return '';

    let value = '';
    switch (attr) {
      case 'text': value = el.text().trim(); break;
      case 'html': value = el.html() || ''; break;
      default: value = el.attr(attr) || '';
    }

    // 处理相对URL
    if ((attr === 'src' || attr === 'href') && value && !value.startsWith('http')) {
      try {
        value = new URL(value, this.baseUrl).href;
      } catch {}
    }

    return value;
  }

  parseRuleList(rule: string | undefined): cheerio.Cheerio<any>[] {
    if (!rule) return [];
    if (rule.startsWith('@css:')) rule = rule.substring(5);

    const elements = this.$(rule);
    const result: cheerio.Cheerio<any>[] = [];
    elements.each((_, el) => { result.push(this.$(el)); });
    return result;
  }

  getAbsoluteUrl(url: string): string {
    if (!url || url.startsWith('http')) return url;
    try {
      return new URL(url, this.baseUrl).href;
    } catch {
      return url;
    }
  }
}

// 搜索书籍
export const searchBooks = async (source: BookSource, keyword: string): Promise<Partial<Book>[]> => {
  if (!source.searchUrl || !source.ruleSearch) return [];

  const startTime = Date.now();

  try {
    let url = source.searchUrl
      .replace(/\{\{key\}\}/g, encodeURIComponent(keyword))
      .replace(/\{\{page\}\}/g, '1');

    let options: RequestInit = {};
    if (url.includes('@')) {
      const [baseUrl, body] = url.split('@');
      url = baseUrl;
      options = {
        method: 'POST',
        body: body.replace(/\{\{key\}\}/g, encodeURIComponent(keyword)),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      };
    }

    if (source.header) {
      try {
        options.headers = { ...options.headers, ...JSON.parse(source.header) };
      } catch {}
    }

    const html = await fetchWithTimeout(url, options);
    const parser = new RuleParser(html, source.bookSourceUrl);
    const rule = source.ruleSearch;

    const books: Partial<Book>[] = [];
    for (const el of parser.parseRuleList(rule.bookList)) {
      const book: Partial<Book> = {
        sourceId: source.id,
        sourceName: source.bookSourceName,
        name: parser.parseRule(rule.name, el),
        author: parser.parseRule(rule.author, el),
        intro: parser.parseRule(rule.intro, el),
        kind: parser.parseRule(rule.kind, el),
        latestChapterTitle: parser.parseRule(rule.lastChapter, el),
        wordCount: parser.parseRule(rule.wordCount, el),
        coverUrl: parser.getAbsoluteUrl(parser.parseRule(rule.coverUrl, el)),
        bookUrl: parser.getAbsoluteUrl(parser.parseRule(rule.bookUrl, el)),
      };
      if (book.name && book.bookUrl) books.push(book);
    }

    await updateSourceRespondTime(source.id, Date.now() - startTime);
    return books;
  } catch (error) {
    console.error('搜索失败:', error);
    return [];
  }
};

// 获取书籍详情
export const getBookInfo = async (source: BookSource, bookUrl: string): Promise<Partial<Book> | null> => {
  if (!source.ruleBookInfo) return null;

  try {
    const html = await fetchWithTimeout(bookUrl);
    const parser = new RuleParser(html, source.bookSourceUrl);
    const rule = source.ruleBookInfo;

    return {
      sourceId: source.id,
      sourceName: source.bookSourceName,
      bookUrl,
      name: parser.parseRule(rule.name),
      author: parser.parseRule(rule.author),
      intro: parser.parseRule(rule.intro),
      kind: parser.parseRule(rule.kind),
      latestChapterTitle: parser.parseRule(rule.lastChapter),
      wordCount: parser.parseRule(rule.wordCount),
      coverUrl: parser.getAbsoluteUrl(parser.parseRule(rule.coverUrl)),
      tocUrl: parser.getAbsoluteUrl(parser.parseRule(rule.tocUrl)) || bookUrl,
    };
  } catch (error) {
    console.error('获取书籍信息失败:', error);
    return null;
  }
};

// 获取目录
export const getBookToc = async (source: BookSource, book: Book): Promise<BookChapter[]> => {
  if (!source.ruleToc) return [];

  try {
    const tocUrl = book.tocUrl || book.bookUrl;
    const html = await fetchWithTimeout(tocUrl);
    const parser = new RuleParser(html, source.bookSourceUrl);
    const rule = source.ruleToc;

    const chapters: BookChapter[] = [];
    parser.parseRuleList(rule.chapterList).forEach((el, index) => {
      const chapter: BookChapter = {
        id: `${book.id}_${index}`,
        bookId: book.id,
        index,
        title: parser.parseRule(rule.chapterName, el),
        url: parser.getAbsoluteUrl(parser.parseRule(rule.chapterUrl, el)),
      };
      if (chapter.title && chapter.url) chapters.push(chapter);
    });

    return chapters;
  } catch (error) {
    console.error('获取目录失败:', error);
    return [];
  }
};

// 获取章节内容
export const getChapterContent = async (source: BookSource, chapter: BookChapter): Promise<string> => {
  if (!source.ruleContent) return '';

  try {
    const html = await fetchWithTimeout(chapter.url);
    const parser = new RuleParser(html, source.bookSourceUrl);
    const rule = source.ruleContent;

    let content = parser.parseRule(rule.content);

    // 净化内容
    content = content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p>/gi, '\n')
      .replace(/<\/p>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // 应用替换规则
    if (rule.replaceRegex) {
      try {
        for (const r of rule.replaceRegex.split('##')) {
          const [pattern, replacement = ''] = r.split('@@');
          if (pattern) content = content.replace(new RegExp(pattern, 'g'), replacement);
        }
      } catch {}
    }

    return content;
  } catch (error) {
    console.error('获取内容失败:', error);
    return '';
  }
};

// 发现页面
export const exploreBooks = async (source: BookSource, url?: string): Promise<Partial<Book>[]> => {
  if (!source.exploreUrl || !source.ruleExplore) return [];

  try {
    const exploreUrl = url || source.exploreUrl.split('::')[1]?.split('\n')[0] || source.exploreUrl;
    const html = await fetchWithTimeout(exploreUrl);
    const parser = new RuleParser(html, source.bookSourceUrl);
    const rule = source.ruleExplore;

    const books: Partial<Book>[] = [];
    for (const el of parser.parseRuleList(rule.bookList)) {
      const book: Partial<Book> = {
        sourceId: source.id,
        sourceName: source.bookSourceName,
        name: parser.parseRule(rule.name, el),
        author: parser.parseRule(rule.author, el),
        intro: parser.parseRule(rule.intro, el),
        kind: parser.parseRule(rule.kind, el),
        latestChapterTitle: parser.parseRule(rule.lastChapter, el),
        coverUrl: parser.getAbsoluteUrl(parser.parseRule(rule.coverUrl, el)),
        bookUrl: parser.getAbsoluteUrl(parser.parseRule(rule.bookUrl, el)),
      };
      if (book.name && book.bookUrl) books.push(book);
    }

    return books;
  } catch (error) {
    console.error('发现失败:', error);
    return [];
  }
};

// 解析发现分类
export const parseExploreKinds = (exploreUrl: string): { name: string; url: string }[] => {
  return exploreUrl.split('\n')
    .map(line => {
      const [name, url] = line.split('::');
      return name && url ? { name: name.trim(), url: url.trim() } : null;
    })
    .filter((k): k is { name: string; url: string } => k !== null);
};
