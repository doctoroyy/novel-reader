import { v4 as uuidv4 } from 'uuid';
import { BookSource, RssSource } from '../types';
import { queryAll, queryFirst, execute } from './database';
import { importRssSources } from './rssService';

// ==================== 书源操作 ====================
export const addBookSource = async (source: Partial<BookSource> & Record<string, any>): Promise<BookSource> => {
  const now = Date.now();
  
  // 兼容 legado 书源格式：bookSourceUrl 作为主键
  const id = source.id || source.bookSourceUrl || uuidv4();
  
  const newSource: BookSource = {
    id,
    bookSourceName: source.bookSourceName || source.sourceName || '未命名书源',
    bookSourceGroup: source.bookSourceGroup || source.sourceGroup,
    bookSourceUrl: source.bookSourceUrl || source.sourceUrl || '',
    bookSourceComment: source.bookSourceComment || source.sourceComment,
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
  console.log(`[Import] 开始导入 ${sources.length} 个书源`);
  
  for (const source of sources) {
    try {
      // 调试：打印前3个书源的关键字段
      if (count < 3) {
        console.log(`[Import] 书源 #${count + 1} 原始数据:`, JSON.stringify({
          bookSourceName: source.bookSourceName,
          bookSourceUrl: source.bookSourceUrl,
          searchUrl: source.searchUrl,
          hasRuleSearch: !!source.ruleSearch,
          allKeys: Object.keys(source as any).slice(0, 20).join(', ')
        }));
      }
      
      await addBookSource(source);
      count++;
    } catch (error) {
      console.error('导入书源失败:', source.bookSourceName, error);
    }
  }
  
  console.log(`[Import] 成功导入 ${count}/${sources.length} 个书源`);
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

// 获取可搜索的书源（有 searchUrl 且已启用）
export const getSearchableBookSources = async (): Promise<BookSource[]> => {
  const rows = await queryAll<any>(
    `SELECT * FROM book_sources 
     WHERE enabled = 1 
       AND searchUrl IS NOT NULL 
       AND searchUrl != '' 
     ORDER BY customOrder ASC, weight DESC`
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

export const deleteAllBookSources = async (): Promise<void> => {
  await execute('DELETE FROM book_sources');
};

export const updateSourceRespondTime = async (id: string, respondTime: number): Promise<void> => {
  await execute('UPDATE book_sources SET respondTime = ? WHERE id = ?', [respondTime, id]);
};

export const exportBookSources = (sources: BookSource[]): string => {
  return JSON.stringify(sources, null, 2);
};

export interface CategorizedSources {
  bookSources: Partial<BookSource>[];
  rssSources: Partial<RssSource>[];
}

export const parseBookSourceJson = (json: string): CategorizedSources => {
  const result: CategorizedSources = {
    bookSources: [],
    rssSources: [],
  };

  try {
    const data = JSON.parse(json);
    const sources = Array.isArray(data) ? data : [data];
    
    for (const source of sources) {
      // 检测是否是书源
      const isBookSource = 
        source.bookSourceUrl ||  // legado 书源格式
        source.searchUrl ||      // 有搜索 URL
        source.ruleSearch;       // 有搜索规则
      
      // 检测是否是 RSS 源
      const isRssSource = 
        source.ruleArticles ||   // RSS 有文章规则
        source.sortUrl ||        // RSS 有分类 URL
        (source.sourceUrl && !source.bookSourceUrl && !source.searchUrl);
      
      if (isBookSource) {
        result.bookSources.push(source);
      } else if (isRssSource) {
        result.rssSources.push(source);
      } else {
        console.log(`[Import] 跳过无效源: ${source.bookSourceName || source.sourceName || '未命名'}`);
      }
    }
  } catch (e) {
    console.error('[Import] JSON 解析失败:', e);
  }
  
  return result;
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
