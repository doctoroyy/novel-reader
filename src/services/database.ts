import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('novelreader.db');

  // 创建表
  await db.execAsync(`
    -- 书籍表
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      author TEXT DEFAULT '',
      coverUrl TEXT,
      intro TEXT,
      kind TEXT,
      wordCount TEXT,
      latestChapterTitle TEXT,
      latestChapterTime INTEGER,
      tocUrl TEXT,
      sourceId TEXT,
      sourceName TEXT,
      bookUrl TEXT NOT NULL,
      customCover TEXT,
      type INTEGER DEFAULT 0,
      book_group INTEGER DEFAULT 0,
      durChapterIndex INTEGER DEFAULT 0,
      durChapterPos INTEGER DEFAULT 0,
      durChapterTime INTEGER DEFAULT 0,
      durChapterTitle TEXT,
      totalChapterNum INTEGER DEFAULT 0,
      createTime INTEGER NOT NULL,
      updateTime INTEGER NOT NULL,
      isLocal INTEGER DEFAULT 0,
      localPath TEXT
    );

    -- 章节表
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      bookId TEXT NOT NULL,
      idx INTEGER NOT NULL,
      title TEXT NOT NULL,
      url TEXT,
      isVip INTEGER DEFAULT 0,
      startPos INTEGER,
      endPos INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_chapters_bookId ON chapters(bookId);

    -- 书源表
    CREATE TABLE IF NOT EXISTS book_sources (
      id TEXT PRIMARY KEY,
      bookSourceName TEXT NOT NULL,
      bookSourceGroup TEXT,
      bookSourceUrl TEXT NOT NULL,
      bookSourceComment TEXT,
      enabled INTEGER DEFAULT 1,
      enabledExplore INTEGER DEFAULT 1,
      weight INTEGER DEFAULT 0,
      customOrder INTEGER DEFAULT 0,
      lastUpdateTime INTEGER DEFAULT 0,
      respondTime INTEGER DEFAULT 0,
      header TEXT,
      searchUrl TEXT,
      exploreUrl TEXT,
      ruleSearch TEXT,
      ruleExplore TEXT,
      ruleBookInfo TEXT,
      ruleToc TEXT,
      ruleContent TEXT
    );

    -- 替换规则表
    CREATE TABLE IF NOT EXISTS replace_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rule_group TEXT,
      pattern TEXT NOT NULL,
      replacement TEXT DEFAULT '',
      scope TEXT,
      isEnabled INTEGER DEFAULT 1,
      isRegex INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    -- 书签表
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      bookId TEXT NOT NULL,
      chapterIndex INTEGER NOT NULL,
      chapterName TEXT,
      content TEXT,
      createTime INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bookmarks_bookId ON bookmarks(bookId);

    -- RSS源表
    CREATE TABLE IF NOT EXISTS rss_sources (
      id TEXT PRIMARY KEY,
      sourceName TEXT NOT NULL,
      sourceUrl TEXT NOT NULL,
      sourceIcon TEXT,
      sourceGroup TEXT,
      enabled INTEGER DEFAULT 1,
      customOrder INTEGER DEFAULT 0,
      lastUpdateTime INTEGER DEFAULT 0,
      ruleArticles TEXT,
      ruleTitle TEXT,
      rulePubDate TEXT,
      ruleDescription TEXT,
      ruleImage TEXT,
      ruleLink TEXT,
      ruleContent TEXT
    );

    -- RSS文章表
    CREATE TABLE IF NOT EXISTS rss_articles (
      id TEXT PRIMARY KEY,
      sourceId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      link TEXT NOT NULL,
      pubDate TEXT,
      image TEXT,
      content TEXT,
      isRead INTEGER DEFAULT 0,
      isStarred INTEGER DEFAULT 0,
      createTime INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rss_articles_sourceId ON rss_articles(sourceId);

    -- 分组表
    CREATE TABLE IF NOT EXISTS book_groups (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    -- 缓存表
    CREATE TABLE IF NOT EXISTS content_cache (
      id TEXT PRIMARY KEY,
      bookId TEXT NOT NULL,
      chapterIndex INTEGER NOT NULL,
      content TEXT,
      createTime INTEGER NOT NULL,
      UNIQUE(bookId, chapterIndex)
    );

    -- 搜索历史
    CREATE TABLE IF NOT EXISTS search_history (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL,
      time INTEGER NOT NULL
    );

    -- 默认分组
    INSERT OR IGNORE INTO book_groups (id, name, sort_order) VALUES
      (0, '全部', 0),
      (-1, '本地', 1),
      (-2, '未分组', 100);
  `);

  return db;
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) throw new Error('Database not initialized');
  return db;
};

// 通用查询
export const queryAll = async <T>(sql: string, params: any[] = []): Promise<T[]> => {
  const database = getDatabase();
  return await database.getAllAsync<T>(sql, params);
};

export const queryFirst = async <T>(sql: string, params: any[] = []): Promise<T | null> => {
  const database = getDatabase();
  return await database.getFirstAsync<T>(sql, params);
};

export const execute = async (sql: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> => {
  const database = getDatabase();
  return await database.runAsync(sql, params);
};

export const executeMany = async (sql: string, paramsList: any[][]): Promise<void> => {
  const database = getDatabase();
  for (const params of paramsList) {
    await database.runAsync(sql, params);
  }
};
