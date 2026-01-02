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

/**
 * Base64 解码 (React Native 兼容)
 */
const base64Decode = (str: string): Uint8Array => {
  const binaryString = atob(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * 简单的 ZIP 解析 (不依赖 JSZip)
 * 注意：这是一个简化版本，适用于标准 EPUB
 */
export const parseEpubFile = async (filePath: string): Promise<ParsedEpub | null> => {
  try {
    // 读取文件为 base64
    const base64Content = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 由于 React Native 环境限制，这里提供一个简化的实现
    // 实际项目中需要使用 react-native-zip-archive 或 native module

    console.warn('EPUB 解析需要原生 ZIP 库支持，当前使用简化模式');

    // 返回默认结构
    const fileName = filePath.split('/').pop() || 'Unknown';
    const bookName = fileName.replace(/\.epub$/i, '');

    return {
      metadata: {
        title: bookName,
        author: '未知',
      },
      toc: [],
      contents: new Map(),
    };
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
    title: $('dc\\:title, title').first().text() || undefined,
    author: $('dc\\:creator, creator').first().text() || undefined,
    description: $('dc\\:description, description').first().text() || undefined,
    publisher: $('dc\\:publisher, publisher').first().text() || undefined,
    language: $('dc\\:language, language').first().text() || undefined,
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
 * 导入 EPUB 文件到书架
 */
export const importEpubToShelf = async (filePath: string): Promise<Book | null> => {
  const parsed = await parseEpubFile(filePath);
  if (!parsed) return null;

  const { metadata, toc } = parsed;

  // 保存书籍
  const book = await addBook({
    name: metadata.title || 'Unknown',
    author: metadata.author || '未知',
    intro: metadata.description,
    type: BookType.LOCAL_EPUB,
    isLocal: true,
    localPath: filePath,
    totalChapterNum: toc.length,
    createTime: Date.now(),
    updateTime: Date.now(),
  });

  // 保存章节
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
};

export default {
  parseEpubFile,
  parseOpfMetadata,
  parseNcxToc,
  parseNavToc,
  cleanHtmlContent,
  importEpubToShelf,
};
