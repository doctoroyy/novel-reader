/**
 * EPUB 文件解析器
 * 使用 JSZip 和 Cheerio 解析 EPUB 格式
 */

import * as FileSystem from 'expo-file-system/legacy';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import { Book, BookChapter, BookType } from '../../types';
import { addBook, addChapters } from '../../services';

// EPUB 元数据
export interface EpubMetadata {
  title?: string;
  author?: string;
  description?: string;
  publisher?: string;
  language?: string;
  cover?: string;
}

// EPUB 目录项
export interface EpubTocItem {
  title: string;
  href: string;
  children?: EpubTocItem[];
}

// 解析结果
export interface ParsedEpub {
  metadata: EpubMetadata;
  toc: EpubTocItem[];
  contents: Map<string, string>;
}

import { Buffer } from 'buffer';
import JSZip from 'jszip';

/**
 * Base64 解码 (React Native 兼容)
 */
const base64ToBuffer = (str: string): Buffer => {
  return Buffer.from(str, 'base64');
};

/**
 * 解析 EPUB 文件
 */
export const parseEpubFile = async (filePath: string): Promise<ParsedEpub | null> => {
  try {
    const base64Content = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const buffer = base64ToBuffer(base64Content);
    const zip = await JSZip.loadAsync(buffer);

    // 1. 找到 OPF 文件路径
    const containerXml = await zip.file('META-INF/container.xml')?.async('string');
    if (!containerXml) throw new Error('Invalid EPUB: Missing container.xml');

    const container$ = cheerio.load(containerXml, { xmlMode: true });
    const opfPath = container$('rootfile').attr('full-path');
    if (!opfPath) throw new Error('Invalid EPUB: Missing OPF path');

    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
    const opfContent = await zip.file(opfPath)?.async('string');
    if (!opfContent) throw new Error('Invalid EPUB: Missing OPF content');

    // 2. 解析元数据
    const metadata = parseOpfMetadata(opfContent);

    // 3. 解析目录
    const opf$ = cheerio.load(opfContent, { xmlMode: true });
    
    // 尝试从 manifest 找到 TOC 文件 (ncx 或 nav)
    let toc: EpubTocItem[] = [];
    const ncxId = opf$('spine').attr('toc');
    const ncxItem = ncxId ? opf$(`item#${ncxId}`).attr('href') : opf$('item[media-type="application/x-dtbncx+xml"]').attr('href');
    const navItem = opf$('item[properties~="nav"]').attr('href');

    if (navItem) {
      const navContent = await zip.file(opfDir + navItem)?.async('string');
      if (navContent) toc = parseNavToc(navContent);
    } 
    
    if (toc.length === 0 && ncxItem) {
      const ncxContent = await zip.file(opfDir + ncxItem)?.async('string');
      if (ncxContent) toc = parseNcxToc(ncxContent);
    }

    // 补全 href 路径 (相对 OPF)
    toc = toc.map(item => ({
      ...item,
      href: opfDir + item.href.split('#')[0], // 移除锚点
    }));

    // 4. 提取内容流 (Map)
    const contents = new Map<string, string>();
    // 我们暂时不预加载所有内容，而是在阅读时按需加载
    // 但为了兼容结构，保留此字段

    return { metadata, toc, contents };
  } catch (error) {
    console.error('EPUB 解析失败:', error);
    return null;
  }
};

/**
 * 解析 OPF 元数据
 */
export const parseOpfMetadata = (opfContent: string): EpubMetadata => {
  const $ = cheerio.load(opfContent, { xmlMode: true });
  
  return {
    title: $('dc\\:title').text() || $('title').text() || '未知书名',
    author: $('dc\\:creator').text() || $('creator').text() || '未知作者',
    description: $('dc\\:description').text() || $('description').text(),
    publisher: $('dc\\:publisher').text() || $('publisher').text(),
    language: $('dc\\:language').text() || $('language').text(),
  };
};

/**
 * 解析 NCX 目录
 */
export const parseNcxToc = (ncxContent: string): EpubTocItem[] => {
  const $ = cheerio.load(ncxContent, { xmlMode: true });
  const toc: EpubTocItem[] = [];

  $('navPoint').each((_, el) => {
    const $el = $(el);
    const title = $el.find('> navLabel > text').first().text();
    const href = $el.find('> content').first().attr('src') || '';

    if (title && href) {
      toc.push({ title, href });
    }
  });

  return toc;
};

/**
 * 解析 NAV 目录 (EPUB3)
 */
export const parseNavToc = (navContent: string): EpubTocItem[] => {
  const $ = cheerio.load(navContent, { xmlMode: true });
  const toc: EpubTocItem[] = [];

  $('nav[*|type="toc"] li > a, nav#toc li > a').each((_, el) => {
    const $el = $(el);
    const title = $el.text().trim();
    const href = $el.attr('href') || '';

    if (title && href) {
      toc.push({ title, href });
    }
  });

  return toc;
};

/**
 * 清理 HTML 内容为纯文本
 */
export const cleanHtmlContent = (html: string): string => {
  const $ = cheerio.load(html);
  
  // 移除 script 和 style
  $('script, style, head').remove();
  
  // 获取 body 内容
  let content = $('body').html() || html;
  
  // 转换常见标签
  content = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return content;
};

/**
 * 获取 EPUB 章节内容
 */
export const getEpubChapterContent = async (
  filePath: string,
  href: string
): Promise<string> => {
  try {
    const base64Content = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const buffer = Buffer.from(base64Content, 'base64');
    const zip = await JSZip.loadAsync(buffer);
    
    const fileContent = await zip.file(href)?.async('string');
    if (!fileContent) return '章节内容丢失';

    return cleanHtmlContent(fileContent);
  } catch (error) {
    console.error('获取 EPUB 内容失败:', error);
    return '解析内容失败';
  }
};

/**
 * 导入 EPUB 文件到书架
 */
export const importEpubToShelf = async (uri: string): Promise<Book | null> => {
  try {
    const fileName = uri.split('/').pop() || `book_${Date.now()}.epub`;
    const bookId = uuidv4();
    const documentDirectory = FileSystem.documentDirectory || '';
    const localDir = `${documentDirectory}books/`;
    const localPath = `${localDir}${bookId}.epub`;

    // 1. 确保目录存在
    await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });

    // 2. 复制文件到本地存储 (防止 temporary URI 失效)
    await FileSystem.copyAsync({ from: uri, to: localPath });

    // 3. 解析文件
    const parsed = await parseEpubFile(localPath);
    if (!parsed) return null;

    const { metadata, toc } = parsed;

    // 4. 保存书籍
    const book = await addBook({
      id: bookId,
      name: metadata.title || fileName.replace(/\.epub$/i, ''),
      author: metadata.author || '未知',
      intro: metadata.description,
      type: BookType.LOCAL_EPUB,
      isLocal: true,
      localPath: localPath,
      totalChapterNum: toc.length,
      createTime: Date.now(),
      updateTime: Date.now(),
      bookUrl: `local://${bookId}`,
    });

    // 5. 保存章节
    const chapters: BookChapter[] = toc.map((item, idx) => ({
      id: `${book.id}_${idx}`,
      bookId: book.id,
      index: idx,
      title: item.title,
      url: item.href,
    }));

    if (chapters.length > 0) {
      await addChapters(chapters);
    }

    return book;
  } catch (error) {
    console.error('导入 EPUB 失败:', error);
    return null;
  }
};

export default {
  parseEpubFile,
  parseOpfMetadata,
  parseNcxToc,
  parseNavToc,
  cleanHtmlContent,
  importEpubToShelf,
  getEpubChapterContent,
};
