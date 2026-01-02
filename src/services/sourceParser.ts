/**
 * Source Parser - 书源解析服务
 * 使用 AnalyzeRule 和 AnalyzeUrl 引擎实现 legado 风格规则解析
 */

import { BookSource, Book, BookChapter } from '../types';
import { updateSourceRespondTime } from './bookSourceService';
import { AnalyzeRule, analyzeUrl } from '../lib/ruleEngine';

// HTTP 请求封装
export const fetchWithTimeout = async (
  url: string, 
  options: RequestInit = {}, 
  timeout = 30000
): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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

/**
 * 搜索书籍
 */
export const searchBooks = async (
  source: BookSource, 
  keyword: string
): Promise<Partial<Book>[]> => {
  if (!source.searchUrl || !source.ruleSearch) {
    console.log(`[Search] 书源 ${source.bookSourceName} 缺少 searchUrl 或 ruleSearch`);
    return [];
  }

  const startTime = Date.now();

  try {
    // 使用 AnalyzeUrl 解析搜索 URL
    const urlOptions = analyzeUrl(
      source.searchUrl,
      source.bookSourceUrl,
      keyword,
      1,
      source.header
    );

    console.log(`[Search] 搜索 ${source.bookSourceName}: ${urlOptions.url}`);
    console.log(`[Search] 方法: ${urlOptions.method}, body: ${urlOptions.body?.substring(0, 100)}`);

    const html = await fetchWithTimeout(urlOptions.url, {
      method: urlOptions.method,
      body: urlOptions.body,
      headers: urlOptions.headers,
    });
    
    console.log(`[Search] 获取到数据: ${html.substring(0, 200)}...`);
    
    // 使用 AnalyzeRule 解析结果
    const analyzer = new AnalyzeRule(html, source.bookSourceUrl);
    const rule = source.ruleSearch;

    console.log(`[Search] 使用规则: bookList=${rule.bookList}`);
    
    // 获取书籍列表元素
    const bookElements = analyzer.getElements(rule.bookList);
    console.log(`[Search] 找到 ${bookElements.length} 个结果`);
    
    const books: Partial<Book>[] = [];
    
    for (const elHtml of bookElements) {
      const elAnalyzer = new AnalyzeRule(elHtml, source.bookSourceUrl);
      
      const book: Partial<Book> = {
        sourceId: source.id,
        sourceName: source.bookSourceName,
        name: elAnalyzer.getString(rule.name),
        author: elAnalyzer.getString(rule.author),
        intro: elAnalyzer.getString(rule.intro),
        kind: elAnalyzer.getString(rule.kind),
        latestChapterTitle: elAnalyzer.getString(rule.lastChapter),
        wordCount: elAnalyzer.getString(rule.wordCount),
        coverUrl: elAnalyzer.getAbsoluteUrl(elAnalyzer.getString(rule.coverUrl)),
        bookUrl: elAnalyzer.getAbsoluteUrl(elAnalyzer.getString(rule.bookUrl)),
      };
      
      if (book.name && book.bookUrl) {
        books.push(book);
        console.log(`[Search] 解析到书籍: ${book.name} - ${book.author}`);
      }
    }

    await updateSourceRespondTime(source.id, Date.now() - startTime);
    return books;
  } catch (error) {
    console.error(`[Search] 搜索失败 ${source.bookSourceName}:`, error);
    return [];
  }
};

/**
 * 获取书籍详情
 */
export const getBookInfo = async (
  source: BookSource, 
  bookUrl: string
): Promise<Partial<Book> | null> => {
  if (!source.ruleBookInfo) return null;

  try {
    console.log(`[BookInfo] 获取详情: ${bookUrl}`);
    const html = await fetchWithTimeout(bookUrl);
    const analyzer = new AnalyzeRule(html, source.bookSourceUrl);
    const rule = source.ruleBookInfo;

    return {
      sourceId: source.id,
      sourceName: source.bookSourceName,
      bookUrl,
      name: analyzer.getString(rule.name),
      author: analyzer.getString(rule.author),
      intro: analyzer.getString(rule.intro),
      kind: analyzer.getString(rule.kind),
      latestChapterTitle: analyzer.getString(rule.lastChapter),
      wordCount: analyzer.getString(rule.wordCount),
      coverUrl: analyzer.getAbsoluteUrl(analyzer.getString(rule.coverUrl)),
      tocUrl: analyzer.getAbsoluteUrl(analyzer.getString(rule.tocUrl)) || bookUrl,
    };
  } catch (error) {
    console.error('[BookInfo] 获取失败:', error);
    return null;
  }
};

/**
 * 获取目录
 */
export const getBookToc = async (
  source: BookSource, 
  book: Book
): Promise<BookChapter[]> => {
  if (!source.ruleToc) return [];

  try {
    const tocUrl = book.tocUrl || book.bookUrl;
    console.log(`[Toc] 获取目录: ${tocUrl}`);
    
    const html = await fetchWithTimeout(tocUrl);
    const analyzer = new AnalyzeRule(html, source.bookSourceUrl);
    const rule = source.ruleToc;

    const chapters: BookChapter[] = [];
    const chapterElements = analyzer.getElements(rule.chapterList);
    
    console.log(`[Toc] 找到 ${chapterElements.length} 章`);

    chapterElements.forEach((elHtml, index) => {
      const elAnalyzer = new AnalyzeRule(elHtml, source.bookSourceUrl);
      
      const chapter: BookChapter = {
        id: `${book.id}_${index}`,
        bookId: book.id,
        index,
        title: elAnalyzer.getString(rule.chapterName),
        url: elAnalyzer.getAbsoluteUrl(elAnalyzer.getString(rule.chapterUrl)),
      };
      
      if (chapter.title && chapter.url) {
        chapters.push(chapter);
      }
    });

    return chapters;
  } catch (error) {
    console.error('[Toc] 获取失败:', error);
    return [];
  }
};

/**
 * 获取章节内容
 */
export const getChapterContent = async (
  source: BookSource, 
  chapter: BookChapter
): Promise<string> => {
  if (!source.ruleContent) return '';

  try {
    console.log(`[Content] 获取正文: ${chapter.url}`);
    const html = await fetchWithTimeout(chapter.url);
    const analyzer = new AnalyzeRule(html, source.bookSourceUrl);
    const rule = source.ruleContent;

    let content = analyzer.getString(rule.content);

    // 净化 HTML 标签
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
          if (pattern) {
            content = content.replace(new RegExp(pattern, 'g'), replacement);
          }
        }
      } catch {}
    }

    return content;
  } catch (error) {
    console.error('[Content] 获取失败:', error);
    return '';
  }
};

/**
 * 发现页面
 */
export const exploreBooks = async (
  source: BookSource, 
  url?: string
): Promise<Partial<Book>[]> => {
  if (!source.exploreUrl || !source.ruleExplore) return [];

  try {
    // 解析发现 URL
    const exploreUrl = url || source.exploreUrl.split('::')[1]?.split('\n')[0] || source.exploreUrl;
    console.log(`[Explore] 发现: ${exploreUrl}`);
    
    const html = await fetchWithTimeout(exploreUrl);
    const analyzer = new AnalyzeRule(html, source.bookSourceUrl);
    const rule = source.ruleExplore;

    const books: Partial<Book>[] = [];
    const bookElements = analyzer.getElements(rule.bookList);

    for (const elHtml of bookElements) {
      const elAnalyzer = new AnalyzeRule(elHtml, source.bookSourceUrl);
      
      const book: Partial<Book> = {
        sourceId: source.id,
        sourceName: source.bookSourceName,
        name: elAnalyzer.getString(rule.name),
        author: elAnalyzer.getString(rule.author),
        intro: elAnalyzer.getString(rule.intro),
        kind: elAnalyzer.getString(rule.kind),
        latestChapterTitle: elAnalyzer.getString(rule.lastChapter),
        coverUrl: elAnalyzer.getAbsoluteUrl(elAnalyzer.getString(rule.coverUrl)),
        bookUrl: elAnalyzer.getAbsoluteUrl(elAnalyzer.getString(rule.bookUrl)),
      };
      
      if (book.name && book.bookUrl) {
        books.push(book);
      }
    }

    return books;
  } catch (error) {
    console.error('[Explore] 发现失败:', error);
    return [];
  }
};

/**
 * 解析发现分类
 */
export const parseExploreKinds = (exploreUrl: string): { name: string; url: string }[] => {
  return exploreUrl.split('\n')
    .map(line => {
      const [name, url] = line.split('::');
      return name && url ? { name: name.trim(), url: url.trim() } : null;
    })
    .filter((k): k is { name: string; url: string } => k !== null);
};
