import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { queryAll, execute } from './database';

export interface BackupData {
  version: number;
  timestamp: number;
  books: any[];
  chapters: any[];
  bookSources: any[];
  rssSources: any[];
  rssArticles: any[];
  replaceRules: any[];
  bookGroups: any[];
  bookmarks: any[];
  readConfig: string | null;
}

// 创建备份
export const createBackup = async (): Promise<BackupData> => {
  const books = await queryAll<any>('SELECT * FROM books');
  const chapters = await queryAll<any>('SELECT * FROM chapters');
  const bookSources = await queryAll<any>('SELECT * FROM book_sources');
  const rssSources = await queryAll<any>('SELECT * FROM rss_sources');
  const rssArticles = await queryAll<any>('SELECT * FROM rss_articles');
  const replaceRules = await queryAll<any>('SELECT * FROM replace_rules');
  const bookGroups = await queryAll<any>('SELECT * FROM book_groups');
  const bookmarks = await queryAll<any>('SELECT * FROM bookmarks');

  // 获取 AsyncStorage 配置
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const readConfig = await AsyncStorage.getItem('readConfig');

  return {
    version: 1,
    timestamp: Date.now(),
    books,
    chapters,
    bookSources,
    rssSources,
    rssArticles,
    replaceRules,
    bookGroups,
    bookmarks,
    readConfig,
  };
};

// 导出备份到文件
export const exportBackup = async (): Promise<string> => {
  const backup = await createBackup();
  const json = JSON.stringify(backup, null, 2);
  
  const filename = `novel_reader_backup_${new Date().toISOString().slice(0, 10)}.json`;
  const filepath = `${FileSystem.documentDirectory}${filename}`;
  
  await FileSystem.writeAsStringAsync(filepath, json);
  
  // 分享文件
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filepath, {
      mimeType: 'application/json',
      dialogTitle: '导出备份',
    });
  }
  
  return filepath;
};

// 恢复备份
export const restoreBackup = async (data: BackupData): Promise<void> => {
  // 验证备份版本
  if (!data.version || !data.timestamp) {
    throw new Error('无效的备份文件');
  }

  // 恢复书籍分组
  if (data.bookGroups?.length > 0) {
    await execute('DELETE FROM book_groups WHERE id > 0');
    for (const group of data.bookGroups) {
      if (group.id > 0) {
        await execute(
          'INSERT OR REPLACE INTO book_groups (id, name, sort_order) VALUES (?, ?, ?)',
          [group.id, group.name, group.sort_order]
        );
      }
    }
  }

  // 恢复书源
  if (data.bookSources?.length > 0) {
    await execute('DELETE FROM book_sources');
    for (const source of data.bookSources) {
      await execute(
        `INSERT INTO book_sources 
         (id, bookSourceName, bookSourceGroup, bookSourceUrl, bookSourceComment, 
          enabled, enabledExplore, weight, customOrder, lastUpdateTime, respondTime,
          header, searchUrl, exploreUrl, ruleSearch, ruleExplore, ruleBookInfo, ruleToc, ruleContent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [source.id, source.bookSourceName, source.bookSourceGroup, source.bookSourceUrl,
         source.bookSourceComment, source.enabled, source.enabledExplore, source.weight,
         source.customOrder, source.lastUpdateTime, source.respondTime, source.header,
         source.searchUrl, source.exploreUrl, source.ruleSearch, source.ruleExplore,
         source.ruleBookInfo, source.ruleToc, source.ruleContent]
      );
    }
  }

  // 恢复替换规则
  if (data.replaceRules?.length > 0) {
    await execute('DELETE FROM replace_rules');
    for (const rule of data.replaceRules) {
      await execute(
        `INSERT INTO replace_rules 
         (id, name, rule_group, pattern, replacement, scope, isEnabled, isRegex, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [rule.id, rule.name, rule.rule_group, rule.pattern, rule.replacement,
         rule.scope, rule.isEnabled, rule.isRegex, rule.sort_order]
      );
    }
  }

  // 恢复 RSS 源
  if (data.rssSources?.length > 0) {
    await execute('DELETE FROM rss_sources');
    for (const source of data.rssSources) {
      await execute(
        `INSERT INTO rss_sources 
         (id, sourceName, sourceUrl, sourceIcon, sourceGroup, enabled, customOrder,
          lastUpdateTime, ruleArticles, ruleTitle, rulePubDate, ruleDescription, ruleImage, ruleLink, ruleContent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [source.id, source.sourceName, source.sourceUrl, source.sourceIcon, source.sourceGroup,
         source.enabled, source.customOrder, source.lastUpdateTime, source.ruleArticles,
         source.ruleTitle, source.rulePubDate, source.ruleDescription, source.ruleImage,
         source.ruleLink, source.ruleContent]
      );
    }
  }

  // 恢复书籍
  if (data.books?.length > 0) {
    await execute('DELETE FROM books');
    for (const book of data.books) {
      await execute(
        `INSERT INTO books 
         (id, name, author, coverUrl, intro, kind, wordCount, latestChapterTitle,
          latestChapterTime, tocUrl, sourceId, sourceName, bookUrl, customCover,
          type, book_group, durChapterIndex, durChapterPos, durChapterTime,
          durChapterTitle, totalChapterNum, createTime, updateTime, isLocal, localPath)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [book.id, book.name, book.author, book.coverUrl, book.intro, book.kind,
         book.wordCount, book.latestChapterTitle, book.latestChapterTime, book.tocUrl,
         book.sourceId, book.sourceName, book.bookUrl, book.customCover, book.type,
         book.book_group, book.durChapterIndex, book.durChapterPos, book.durChapterTime,
         book.durChapterTitle, book.totalChapterNum, book.createTime, book.updateTime,
         book.isLocal, book.localPath]
      );
    }
  }

  // 恢复章节
  if (data.chapters?.length > 0) {
    await execute('DELETE FROM chapters');
    for (const chapter of data.chapters) {
      await execute(
        `INSERT INTO chapters (id, bookId, idx, title, url, isVip, startPos, endPos)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [chapter.id, chapter.bookId, chapter.idx, chapter.title, chapter.url,
         chapter.isVip, chapter.startPos, chapter.endPos]
      );
    }
  }

  // 恢复书签
  if (data.bookmarks?.length > 0) {
    await execute('DELETE FROM bookmarks');
    for (const bookmark of data.bookmarks) {
      await execute(
        `INSERT INTO bookmarks (id, bookId, chapterIndex, chapterName, content, createTime)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [bookmark.id, bookmark.bookId, bookmark.chapterIndex, bookmark.chapterName,
         bookmark.content, bookmark.createTime]
      );
    }
  }

  // 恢复阅读配置
  if (data.readConfig) {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('readConfig', data.readConfig);
  }
};

// 从文件恢复备份
export const restoreBackupFromFile = async (fileUri: string): Promise<void> => {
  const content = await FileSystem.readAsStringAsync(fileUri);
  const data = JSON.parse(content) as BackupData;
  await restoreBackup(data);
};

// 获取备份统计信息
export const getBackupStats = (data: BackupData) => ({
  books: data.books?.length || 0,
  bookSources: data.bookSources?.length || 0,
  rssSources: data.rssSources?.length || 0,
  replaceRules: data.replaceRules?.length || 0,
  bookmarks: data.bookmarks?.length || 0,
  timestamp: data.timestamp,
});
