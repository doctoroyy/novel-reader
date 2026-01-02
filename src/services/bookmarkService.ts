import { v4 as uuidv4 } from 'uuid';
import { Bookmark } from '../types';
import { queryAll, queryFirst, execute } from './database';

// ==================== 书签操作 ====================

export const addBookmark = async (bookmark: Omit<Bookmark, 'id' | 'createTime'>): Promise<Bookmark> => {
  const now = Date.now();
  const newBookmark: Bookmark = {
    id: uuidv4(),
    ...bookmark,
    createTime: now,
  };

  await execute(
    `INSERT INTO bookmarks (id, bookId, chapterIndex, chapterName, content, createTime)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      newBookmark.id,
      newBookmark.bookId,
      newBookmark.chapterIndex,
      newBookmark.chapterName,
      newBookmark.content,
      newBookmark.createTime,
    ]
  );

  return newBookmark;
};

export const getBookmarksByBookId = async (bookId: string): Promise<Bookmark[]> => {
  const rows = await queryAll<any>(
    'SELECT * FROM bookmarks WHERE bookId = ? ORDER BY createTime DESC',
    [bookId]
  );
  return rows.map(mapRowToBookmark);
};

export const getAllBookmarks = async (): Promise<Bookmark[]> => {
  const rows = await queryAll<any>('SELECT * FROM bookmarks ORDER BY createTime DESC');
  return rows.map(mapRowToBookmark);
};

export const deleteBookmark = async (id: string): Promise<void> => {
  await execute('DELETE FROM bookmarks WHERE id = ?', [id]);
};

export const deleteBookmarksByBookId = async (bookId: string): Promise<void> => {
  await execute('DELETE FROM bookmarks WHERE bookId = ?', [bookId]);
};

// 检查章节是否已有书签
export const hasBookmarkForChapter = async (
  bookId: string,
  chapterIndex: number
): Promise<boolean> => {
  const row = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM bookmarks WHERE bookId = ? AND chapterIndex = ?',
    [bookId, chapterIndex]
  );
  return (row?.count || 0) > 0;
};

const mapRowToBookmark = (row: any): Bookmark => ({
  id: row.id,
  bookId: row.bookId,
  chapterIndex: row.chapterIndex,
  chapterName: row.chapterName,
  content: row.content,
  createTime: row.createTime,
});
