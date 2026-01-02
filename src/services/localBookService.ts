import * as FileSystem from 'expo-file-system/legacy';
import { v4 as uuidv4 } from 'uuid';
import { Book, BookChapter, BookType } from '../types';
import { addBook, addChapters } from './bookService';

const documentDirectory = FileSystem.documentDirectory || '';

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

  // 章节标题正则
  const patterns = [
    /^第[零一二三四五六七八九十百千万0-9]+[章节回集卷][\s\S]{0,30}$/gm,
    /^[零一二三四五六七八九十百千万0-9]+[、.．][\s\S]{0,30}$/gm,
    /^Chapter\s*\d+[\s\S]{0,30}$/gim,
    /^[【\[](.*?)[】\]]$/gm,
  ];

  let matches: { index: number; title: string }[] = [];

  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      matches.push({ index: match.index, title: match[0].trim() });
    }
    if (matches.length > 3) break;
  }

  matches.sort((a, b) => a.index - b.index);
  matches = matches.filter((m, i) => i === 0 || m.index - matches[i - 1].index > 100);

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
    const content = await FileSystem.readAsStringAsync(localPath);
    return content.substring(startPos, endPos).trim();
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
