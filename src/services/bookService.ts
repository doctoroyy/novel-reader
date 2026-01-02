import { v4 as uuidv4 } from 'uuid';
import { Book, BookChapter, BookType } from '../types';
import { queryAll, queryFirst, execute } from './database';

// ==================== 书籍操作 ====================
export const addBook = async (book: Partial<Book>): Promise<Book> => {
  const now = Date.now();
  const newBook: Book = {
    id: book.id || uuidv4(),
    name: book.name || '',
    author: book.author || '',
    coverUrl: book.coverUrl,
    intro: book.intro,
    kind: book.kind,
    wordCount: book.wordCount,
    latestChapterTitle: book.latestChapterTitle,
    latestChapterTime: book.latestChapterTime,
    tocUrl: book.tocUrl,
    sourceId: book.sourceId,
    sourceName: book.sourceName,
    bookUrl: book.bookUrl || '',
    customCover: book.customCover,
    type: book.type || BookType.ONLINE,
    group: book.group || 0,
    durChapterIndex: book.durChapterIndex || 0,
    durChapterPos: book.durChapterPos || 0,
    durChapterTime: book.durChapterTime || 0,
    durChapterTitle: book.durChapterTitle,
    totalChapterNum: book.totalChapterNum || 0,
    createTime: book.createTime || now,
    updateTime: now,
    isLocal: book.isLocal || false,
    localPath: book.localPath,
  };

  await execute(
    `INSERT OR REPLACE INTO books
     (id, name, author, coverUrl, intro, kind, wordCount, latestChapterTitle,
      latestChapterTime, tocUrl, sourceId, sourceName, bookUrl, customCover,
      type, book_group, durChapterIndex, durChapterPos, durChapterTime,
      durChapterTitle, totalChapterNum, createTime, updateTime, isLocal, localPath)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newBook.id, newBook.name, newBook.author, newBook.coverUrl, newBook.intro,
      newBook.kind, newBook.wordCount, newBook.latestChapterTitle, newBook.latestChapterTime,
      newBook.tocUrl, newBook.sourceId, newBook.sourceName, newBook.bookUrl, newBook.customCover,
      newBook.type, newBook.group, newBook.durChapterIndex, newBook.durChapterPos,
      newBook.durChapterTime, newBook.durChapterTitle, newBook.totalChapterNum,
      newBook.createTime, newBook.updateTime, newBook.isLocal ? 1 : 0, newBook.localPath,
    ]
  );

  return newBook;
};

export const getAllBooks = async (): Promise<Book[]> => {
  const rows = await queryAll<any>('SELECT * FROM books ORDER BY updateTime DESC');
  return rows.map(mapRowToBook);
};

export const getBooksByGroup = async (group: number): Promise<Book[]> => {
  let sql = 'SELECT * FROM books';
  const params: any[] = [];

  if (group === 0) {
    sql += ' ORDER BY updateTime DESC';
  } else if (group === -1) {
    sql += ' WHERE isLocal = 1 ORDER BY updateTime DESC';
  } else {
    sql += ' WHERE book_group = ? ORDER BY updateTime DESC';
    params.push(group);
  }

  const rows = await queryAll<any>(sql, params);
  return rows.map(mapRowToBook);
};

export const getBookById = async (id: string): Promise<Book | null> => {
  const row = await queryFirst<any>('SELECT * FROM books WHERE id = ?', [id]);
  return row ? mapRowToBook(row) : null;
};

export const getBookByUrl = async (bookUrl: string): Promise<Book | null> => {
  const row = await queryFirst<any>('SELECT * FROM books WHERE bookUrl = ?', [bookUrl]);
  return row ? mapRowToBook(row) : null;
};

export const updateReadProgress = async (
  bookId: string,
  chapterIndex: number,
  chapterPos: number,
  chapterTitle?: string
): Promise<void> => {
  const now = Date.now();
  await execute(
    `UPDATE books SET durChapterIndex = ?, durChapterPos = ?, durChapterTime = ?,
     durChapterTitle = ?, updateTime = ? WHERE id = ?`,
    [chapterIndex, chapterPos, now, chapterTitle || '', now, bookId]
  );
};

export const deleteBook = async (id: string): Promise<void> => {
  await execute('DELETE FROM chapters WHERE bookId = ?', [id]);
  await execute('DELETE FROM bookmarks WHERE bookId = ?', [id]);
  await execute('DELETE FROM content_cache WHERE bookId = ?', [id]);
  await execute('DELETE FROM books WHERE id = ?', [id]);
};

export const isBookInShelf = async (bookUrl: string): Promise<boolean> => {
  const book = await getBookByUrl(bookUrl);
  return book !== null;
};

// ==================== 章节操作 ====================
export const addChapters = async (chapters: BookChapter[]): Promise<void> => {
  if (chapters.length === 0) return;

  const bookId = chapters[0].bookId;
  await execute('DELETE FROM chapters WHERE bookId = ?', [bookId]);

  for (const chapter of chapters) {
    await execute(
      `INSERT INTO chapters (id, bookId, idx, title, url, isVip, startPos, endPos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chapter.id || `${bookId}_${chapter.index}`,
        chapter.bookId,
        chapter.index,
        chapter.title,
        chapter.url,
        chapter.isVip ? 1 : 0,
        chapter.startPos,
        chapter.endPos,
      ]
    );
  }

  // 更新书籍章节数
  await execute(
    'UPDATE books SET totalChapterNum = ?, updateTime = ? WHERE id = ?',
    [chapters.length, Date.now(), bookId]
  );
};

export const getChaptersByBookId = async (bookId: string): Promise<BookChapter[]> => {
  const rows = await queryAll<any>(
    'SELECT * FROM chapters WHERE bookId = ? ORDER BY idx ASC',
    [bookId]
  );
  return rows.map(mapRowToChapter);
};

export const getChapterByIndex = async (bookId: string, index: number): Promise<BookChapter | null> => {
  const row = await queryFirst<any>(
    'SELECT * FROM chapters WHERE bookId = ? AND idx = ?',
    [bookId, index]
  );
  return row ? mapRowToChapter(row) : null;
};

// ==================== 内容缓存 ====================
export const cacheContent = async (bookId: string, chapterIndex: number, content: string): Promise<void> => {
  const id = `${bookId}_${chapterIndex}`;
  await execute(
    `INSERT OR REPLACE INTO content_cache (id, bookId, chapterIndex, content, createTime)
     VALUES (?, ?, ?, ?, ?)`,
    [id, bookId, chapterIndex, content, Date.now()]
  );
};

export const getCachedContent = async (bookId: string, chapterIndex: number): Promise<string | null> => {
  const row = await queryFirst<{ content: string }>(
    'SELECT content FROM content_cache WHERE bookId = ? AND chapterIndex = ?',
    [bookId, chapterIndex]
  );
  return row?.content || null;
};

export const clearBookCache = async (bookId: string): Promise<void> => {
  await execute('DELETE FROM content_cache WHERE bookId = ?', [bookId]);
};

// ==================== 辅助函数 ====================
const mapRowToBook = (row: any): Book => ({
  id: row.id,
  name: row.name,
  author: row.author,
  coverUrl: row.coverUrl,
  intro: row.intro,
  kind: row.kind,
  wordCount: row.wordCount,
  latestChapterTitle: row.latestChapterTitle,
  latestChapterTime: row.latestChapterTime,
  tocUrl: row.tocUrl,
  sourceId: row.sourceId,
  sourceName: row.sourceName,
  bookUrl: row.bookUrl,
  customCover: row.customCover,
  type: row.type,
  group: row.book_group,
  durChapterIndex: row.durChapterIndex,
  durChapterPos: row.durChapterPos,
  durChapterTime: row.durChapterTime,
  durChapterTitle: row.durChapterTitle,
  totalChapterNum: row.totalChapterNum,
  createTime: row.createTime,
  updateTime: row.updateTime,
  isLocal: row.isLocal === 1,
  localPath: row.localPath,
});

const mapRowToChapter = (row: any): BookChapter => ({
  id: row.id,
  bookId: row.bookId,
  index: row.idx,
  title: row.title,
  url: row.url,
  isVip: row.isVip === 1,
  startPos: row.startPos,
  endPos: row.endPos,
});
