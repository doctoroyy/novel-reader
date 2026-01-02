/**
 * TXT 文件解析器
 * 支持自动识别章节和自定义章节规则
 */

import * as FileSystem from 'expo-file-system/legacy';
import { v4 as uuidv4 } from 'uuid';
import { Book, BookChapter, BookType } from '../../types';
import { addBook, addChapters } from '../../services';

// 默认章节正则
const DEFAULT_CHAPTER_PATTERNS = [
  /^第[一二三四五六七八九十百千万\d]+[章节回卷集部篇]/m,
  /^Chapter\s+\d+/im,
  /^CHAPTER\s+\d+/im,
  /^卷[一二三四五六七八九十百千万\d]+/m,
  /^[第]?\d{1,4}[章节回\.、]/m,
  /^【.*?】$/m,
  /^正文\s+第/m,
];

export interface TxtParseOptions {
  /** 自定义章节正则 */
  chapterPattern?: string;
  /** 编码，默认 UTF-8 */
  encoding?: string;
  /** 最小章节长度 */
  minChapterLength?: number;
}

export interface ParsedTxt {
  book: Partial<Book>;
  chapters: Omit<BookChapter, 'id' | 'bookId'>[];
  content: string;
}

/**
 * 解析 TXT 文件
 */
export const parseTxtFile = async (
  filePath: string,
  options: TxtParseOptions = {}
): Promise<ParsedTxt> => {
  // 读取文件
  const content = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // 获取文件名作为书名
  const fileName = filePath.split('/').pop() || 'Unknown';
  const bookName = fileName.replace(/\.txt$/i, '');

  // 解析章节
  const chapters = parseTxtChapters(content, options);

  return {
    book: {
      name: bookName,
      author: '未知',
      type: BookType.LOCAL_TXT,
      isLocal: true,
      localPath: filePath,
      totalChapterNum: chapters.length,
    },
    chapters,
    content,
  };
};

/**
 * 解析章节
 */
export const parseTxtChapters = (
  content: string,
  options: TxtParseOptions = {}
): Omit<BookChapter, 'id' | 'bookId'>[] => {
  const { chapterPattern, minChapterLength = 100 } = options;

  // 选择章节正则
  let patterns: RegExp[];
  if (chapterPattern) {
    try {
      patterns = [new RegExp(chapterPattern, 'gm')];
    } catch {
      patterns = DEFAULT_CHAPTER_PATTERNS;
    }
  } else {
    patterns = DEFAULT_CHAPTER_PATTERNS;
  }

  // 尝试匹配章节
  let matches: { title: string; startPos: number }[] = [];

  for (const pattern of patterns) {
    const globalPattern = new RegExp(pattern.source, 'gm');
    let match;
    const tempMatches: { title: string; startPos: number }[] = [];

    while ((match = globalPattern.exec(content)) !== null) {
      tempMatches.push({
        title: match[0].trim(),
        startPos: match.index,
      });
    }

    if (tempMatches.length > matches.length) {
      matches = tempMatches;
    }
  }

  // 如果没有找到章节，整本作为一章
  if (matches.length === 0) {
    return [{
      index: 0,
      title: '全文',
      url: '',
      startPos: 0,
      endPos: content.length,
    }];
  }

  // 构建章节列表
  const chapters: Omit<BookChapter, 'id' | 'bookId'>[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const endPos = next ? next.startPos : content.length;

    // 过滤太短的章节
    if (endPos - current.startPos < minChapterLength && i > 0) {
      continue;
    }

    chapters.push({
      index: chapters.length,
      title: current.title,
      url: '',
      startPos: current.startPos,
      endPos,
    });
  }

  return chapters;
};

/**
 * 导入 TXT 文件到书架
 */
export const importTxtToShelf = async (
  filePath: string,
  options: TxtParseOptions = {}
): Promise<Book> => {
  const { book: bookInfo, chapters: chapterList } = await parseTxtFile(filePath, options);

  // 保存书籍
  const book = await addBook({
    ...bookInfo,
    createTime: Date.now(),
    updateTime: Date.now(),
  });

  // 保存章节
  const chapters: BookChapter[] = chapterList.map((ch, idx) => ({
    id: `${book.id}_${idx}`,
    bookId: book.id,
    ...ch,
  }));

  await addChapters(chapters);

  return book;
};

/**
 * 获取本地 TXT 章节内容
 */
export const getTxtChapterContent = async (
  filePath: string,
  startPos: number,
  endPos: number
): Promise<string> => {
  const content = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return content.substring(startPos, endPos).trim();
};
