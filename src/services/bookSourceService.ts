import { v4 as uuidv4 } from 'uuid';
import { BookSource } from '../types';
import { queryAll, queryFirst, execute } from './database';

// ==================== 书源操作 ====================
export const addBookSource = async (source: Partial<BookSource>): Promise<BookSource> => {
  const now = Date.now();
  const newSource: BookSource = {
    id: source.id || uuidv4(),
    bookSourceName: source.bookSourceName || '',
    bookSourceGroup: source.bookSourceGroup,
    bookSourceUrl: source.bookSourceUrl || '',
    bookSourceComment: source.bookSourceComment,
    enabled: source.enabled !== false,
    enabledExplore: source.enabledExplore !== false,
    weight: source.weight || 0,
    customOrder: source.customOrder || 0,
    lastUpdateTime: source.lastUpdateTime || now,
    respondTime: source.respondTime || 0,
    header: source.header,
    searchUrl: source.searchUrl,
    exploreUrl: source.exploreUrl,
    ruleSearch: source.ruleSearch,
    ruleExplore: source.ruleExplore,
    ruleBookInfo: source.ruleBookInfo,
    ruleToc: source.ruleToc,
    ruleContent: source.ruleContent,
  };

  await execute(
    `INSERT OR REPLACE INTO book_sources
     (id, bookSourceName, bookSourceGroup, bookSourceUrl, bookSourceComment,
      enabled, enabledExplore, weight, customOrder, lastUpdateTime, respondTime,
      header, searchUrl, exploreUrl, ruleSearch, ruleExplore, ruleBookInfo, ruleToc, ruleContent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newSource.id, newSource.bookSourceName, newSource.bookSourceGroup,
      newSource.bookSourceUrl, newSource.bookSourceComment, newSource.enabled ? 1 : 0,
      newSource.enabledExplore ? 1 : 0, newSource.weight, newSource.customOrder,
      newSource.lastUpdateTime, newSource.respondTime, newSource.header,
      newSource.searchUrl, newSource.exploreUrl,
      JSON.stringify(newSource.ruleSearch || {}),
      JSON.stringify(newSource.ruleExplore || {}),
      JSON.stringify(newSource.ruleBookInfo || {}),
      JSON.stringify(newSource.ruleToc || {}),
      JSON.stringify(newSource.ruleContent || {}),
    ]
  );

  return newSource;
};

export const importBookSources = async (sources: Partial<BookSource>[]): Promise<number> => {
  let count = 0;
  for (const source of sources) {
    try {
      await addBookSource(source);
      count++;
    } catch (error) {
      console.error('导入书源失败:', source.bookSourceName, error);
    }
  }
  return count;
};

export const getAllBookSources = async (): Promise<BookSource[]> => {
  const rows = await queryAll<any>(
    'SELECT * FROM book_sources ORDER BY customOrder ASC, weight DESC'
  );
  return rows.map(mapRowToSource);
};

export const getEnabledBookSources = async (): Promise<BookSource[]> => {
  const rows = await queryAll<any>(
    'SELECT * FROM book_sources WHERE enabled = 1 ORDER BY customOrder ASC, weight DESC'
  );
  return rows.map(mapRowToSource);
};

export const getBookSourcesByGroup = async (group: string): Promise<BookSource[]> => {
  const rows = await queryAll<any>(
    'SELECT * FROM book_sources WHERE bookSourceGroup = ? ORDER BY customOrder ASC',
    [group]
  );
  return rows.map(mapRowToSource);
};

export const getBookSourceGroups = async (): Promise<string[]> => {
  const rows = await queryAll<{ bookSourceGroup: string }>(
    `SELECT DISTINCT bookSourceGroup FROM book_sources
     WHERE bookSourceGroup IS NOT NULL AND bookSourceGroup != ''`
  );
  return rows.map(r => r.bookSourceGroup);
};

export const getBookSourceById = async (id: string): Promise<BookSource | null> => {
  const row = await queryFirst<any>('SELECT * FROM book_sources WHERE id = ?', [id]);
  return row ? mapRowToSource(row) : null;
};

export const toggleBookSource = async (id: string, enabled: boolean): Promise<void> => {
  await execute(
    'UPDATE book_sources SET enabled = ?, lastUpdateTime = ? WHERE id = ?',
    [enabled ? 1 : 0, Date.now(), id]
  );
};

export const deleteBookSource = async (id: string): Promise<void> => {
  await execute('DELETE FROM book_sources WHERE id = ?', [id]);
};

export const deleteBookSources = async (ids: string[]): Promise<void> => {
  for (const id of ids) {
    await deleteBookSource(id);
  }
};

export const updateSourceRespondTime = async (id: string, respondTime: number): Promise<void> => {
  await execute('UPDATE book_sources SET respondTime = ? WHERE id = ?', [respondTime, id]);
};

export const exportBookSources = (sources: BookSource[]): string => {
  return JSON.stringify(sources, null, 2);
};

export const parseBookSourceJson = (json: string): Partial<BookSource>[] => {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [data];
  } catch {
    return [];
  }
};

// ==================== 辅助函数 ====================
const mapRowToSource = (row: any): BookSource => ({
  id: row.id,
  bookSourceName: row.bookSourceName,
  bookSourceGroup: row.bookSourceGroup,
  bookSourceUrl: row.bookSourceUrl,
  bookSourceComment: row.bookSourceComment,
  enabled: row.enabled === 1,
  enabledExplore: row.enabledExplore === 1,
  weight: row.weight,
  customOrder: row.customOrder,
  lastUpdateTime: row.lastUpdateTime,
  respondTime: row.respondTime,
  header: row.header,
  searchUrl: row.searchUrl,
  exploreUrl: row.exploreUrl,
  ruleSearch: parseJsonSafe(row.ruleSearch),
  ruleExplore: parseJsonSafe(row.ruleExplore),
  ruleBookInfo: parseJsonSafe(row.ruleBookInfo),
  ruleToc: parseJsonSafe(row.ruleToc),
  ruleContent: parseJsonSafe(row.ruleContent),
});

const parseJsonSafe = (str: string | null): any => {
  if (!str) return undefined;
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
};
