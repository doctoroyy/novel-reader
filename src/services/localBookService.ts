import * as FileSystem from 'expo-file-system/legacy';
import { v4 as uuidv4 } from 'uuid';
import { Book, BookChapter, BookType } from '../types';
import { addBook, addChapters } from './bookService';
import { importEpubToShelf, getEpubChapterContent } from '../lib/localBook/epubParser';

const documentDirectory = FileSystem.documentDirectory || '';

export { importEpubToShelf, getEpubChapterContent };

// 导入TXT文件
export const importTxtBook = async (uri: string, fileName: string): Promise<Book> => {
  const bookName = fileName.replace(/\.txt$/i, '');
  const content = await FileSystem.readAsStringAsync(uri);

  const bookId = uuidv4();
  const localPath = `${documentDirectory}books/${bookId}.txt`;

  // 创建目录
  await FileSystem.makeDirectoryAsync(`${documentDirectory}books/`, { intermediates: true });
  // 复制文件
  await FileSystem.writeAsStringAsync(localPath, content);

  const book = await addBook({
    id: bookId,
    name: bookName,
    author: '本地导入',
    type: BookType.LOCAL_TXT,
    isLocal: true,
    localPath,
    bookUrl: `local://${bookId}`,
  });

  // 解析章节
  const chapters = parseTxtChapters(bookId, content);
  await addChapters(chapters);

  return book;
};

// 解析TXT章节
const parseTxtChapters = (bookId: string, content: string): BookChapter[] => {
  const chapters: BookChapter[] = [];

  // 仿 Legado 综合正则及常见中文章节正则
  const patterns = [
    // 第1章, 第一百二十章, 第123节, 第 123 回...
    /^(.{0,8})(\b|_)(第)([0-9零一二三四五六七八九十百千万]{1,10})([章节回集卷考])(.{0,30})$/gm,
    // 123. 章节名, 一、章节名
    /^([0-9零一二三四五六七八九十百千万]{1,10})[、.．](.{0,30})$/gm,
    // 【第123章】
    /^[【\[](第?[0-9零一二三四五六七八九十百千万]{1,10}[章节回集卷]?)[】\]](.{0,30})$/gm,
    // Chapter 1
    /^Chapter\s*[0-9]{1,10}(.{0,30})$/gim,
    // 正则补充：匹配一些特定的副标题格式
    /^引子|序言|楔子|前言|自序|后记|尾声|最终章/gm,
  ];

  let matches: { index: number; title: string }[] = [];
  const foundIndices = new Set<number>();

  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      if (!foundIndices.has(match.index)) {
        // 简单启发式过滤：如果章节名过长且不包含换行，可能不是标题
        const title = match[0].trim();
        if (title.length > 50) continue;
        
        matches.push({ index: match.index, title });
        foundIndices.add(match.index);
      }
    }
  }

  // 排序
  matches.sort((a, b) => a.index - b.index);

  // 再次过滤：防止过于密集的章节（例如每100字一个“第一章”可能是重复或者误读）
  matches = matches.filter((m, i) => i === 0 || m.index - matches[i - 1].index > 50);

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      chapters.push({
        id: `${bookId}_${i}`,
        bookId,
        index: i,
        title: matches[i].title,
        url: `local://${bookId}/${i}`,
        startPos: matches[i].index,
        endPos: i < matches.length - 1 ? matches[i + 1].index : content.length,
      });
    }
  } else {
    // 按字数分割
    const chapterSize = 5000;
    const count = Math.ceil(content.length / chapterSize);
    for (let i = 0; i < count; i++) {
      chapters.push({
        id: `${bookId}_${i}`,
        bookId,
        index: i,
        title: `第${i + 1}章`,
        url: `local://${bookId}/${i}`,
        startPos: i * chapterSize,
        endPos: Math.min((i + 1) * chapterSize, content.length),
      });
    }
  }

  return chapters;
};

// 获取本地章节内容
export const getLocalChapterContent = async (
  localPath: string,
  startPos: number,
  endPos: number
): Promise<string> => {
  try {
    // 优化：只读取需要的字节段，避免读取整个大文件
    const content = await FileSystem.readAsStringAsync(localPath, {
      encoding: FileSystem.EncodingType.UTF8,
      position: startPos,
      length: endPos - startPos,
    });
    return content.trim();
  } catch (error) {
    console.error('读取本地章节失败:', error);
    return '';
  }
};

// 扫描本地书籍
export const scanLocalBooks = async (): Promise<string[]> => {
  const bookFiles: string[] = [];
  try {
    const dir = documentDirectory + 'books/';
    const info = await FileSystem.getInfoAsync(dir);
    if (info.exists && info.isDirectory) {
      const files = await FileSystem.readDirectoryAsync(dir);
      for (const file of files) {
        if (file.endsWith('.txt') || file.endsWith('.epub')) {
          bookFiles.push(dir + file);
        }
      }
    }
  } catch {}
  return bookFiles;
};

// 删除本地书籍文件
export const deleteLocalBookFile = async (localPath: string): Promise<void> => {
  try {
    await FileSystem.deleteAsync(localPath, { idempotent: true });
  } catch {}
};
