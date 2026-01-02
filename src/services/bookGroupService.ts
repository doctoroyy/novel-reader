import { BookGroup } from '../types';
import { queryAll, queryFirst, execute } from './database';

// ==================== 分组操作 ====================

export const getAllBookGroups = async (): Promise<BookGroup[]> => {
  const rows = await queryAll<any>('SELECT * FROM book_groups ORDER BY sort_order ASC');
  return rows.map(mapRowToBookGroup);
};

export const getBookGroupById = async (id: number): Promise<BookGroup | null> => {
  const row = await queryFirst<any>('SELECT * FROM book_groups WHERE id = ?', [id]);
  return row ? mapRowToBookGroup(row) : null;
};

export const addBookGroup = async (name: string): Promise<BookGroup> => {
  // 获取最大ID
  const maxIdRow = await queryFirst<{ maxId: number }>('SELECT MAX(id) as maxId FROM book_groups');
  const newId = Math.max(1, (maxIdRow?.maxId || 0) + 1);

  // 获取最大排序
  const maxOrderRow = await queryFirst<{ maxOrder: number }>(
    'SELECT MAX(sort_order) as maxOrder FROM book_groups'
  );
  const newOrder = (maxOrderRow?.maxOrder || 0) + 1;

  await execute(
    'INSERT INTO book_groups (id, name, sort_order) VALUES (?, ?, ?)',
    [newId, name, newOrder]
  );

  return { id: newId, name, order: newOrder };
};

export const updateBookGroup = async (id: number, name: string): Promise<void> => {
  await execute('UPDATE book_groups SET name = ? WHERE id = ?', [name, id]);
};

export const deleteBookGroup = async (id: number): Promise<void> => {
  // 不允许删除系统分组
  if (id <= 0) {
    throw new Error('不能删除系统分组');
  }

  // 将该分组的书籍移动到未分组
  await execute('UPDATE books SET book_group = -2 WHERE book_group = ?', [id]);

  // 删除分组
  await execute('DELETE FROM book_groups WHERE id = ?', [id]);
};

export const reorderBookGroups = async (ids: number[]): Promise<void> => {
  for (let i = 0; i < ids.length; i++) {
    await execute('UPDATE book_groups SET sort_order = ? WHERE id = ?', [i, ids[i]]);
  }
};

export const moveBookToGroup = async (bookId: string, groupId: number): Promise<void> => {
  await execute('UPDATE books SET book_group = ?, updateTime = ? WHERE id = ?', [
    groupId,
    Date.now(),
    bookId,
  ]);
};

export const moveBooksToGroup = async (bookIds: string[], groupId: number): Promise<void> => {
  const now = Date.now();
  for (const bookId of bookIds) {
    await execute('UPDATE books SET book_group = ?, updateTime = ? WHERE id = ?', [
      groupId,
      now,
      bookId,
    ]);
  }
};

export const getBookCountByGroup = async (groupId: number): Promise<number> => {
  let sql: string;
  const params: any[] = [];

  if (groupId === 0) {
    // 全部
    sql = 'SELECT COUNT(*) as count FROM books';
  } else if (groupId === -1) {
    // 本地
    sql = 'SELECT COUNT(*) as count FROM books WHERE isLocal = 1';
  } else {
    sql = 'SELECT COUNT(*) as count FROM books WHERE book_group = ?';
    params.push(groupId);
  }

  const row = await queryFirst<{ count: number }>(sql, params);
  return row?.count || 0;
};

const mapRowToBookGroup = (row: any): BookGroup => ({
  id: row.id,
  name: row.name,
  order: row.sort_order,
});
