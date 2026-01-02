import { v4 as uuidv4 } from 'uuid';
import { RssSource, RssArticle } from '../types';
import { queryAll, queryFirst, execute } from './database';

// ==================== RSS源操作 ====================
export const addRssSource = async (source: Partial<RssSource>): Promise<RssSource> => {
  const now = Date.now();
  const newSource: RssSource = {
    id: source.id || uuidv4(),
    sourceName: source.sourceName || '',
    sourceUrl: source.sourceUrl || '',
    sourceIcon: source.sourceIcon,
    sourceGroup: source.sourceGroup,
    enabled: source.enabled !== false,
    customOrder: source.customOrder || 0,
    lastUpdateTime: source.lastUpdateTime || now,
    ruleArticles: source.ruleArticles,
    ruleTitle: source.ruleTitle,
    rulePubDate: source.rulePubDate,
    ruleDescription: source.ruleDescription,
    ruleImage: source.ruleImage,
    ruleLink: source.ruleLink,
    ruleContent: source.ruleContent,
  };

  await execute(
    `INSERT OR REPLACE INTO rss_sources
     (id, sourceName, sourceUrl, sourceIcon, sourceGroup, enabled, customOrder,
      lastUpdateTime, ruleArticles, ruleTitle, rulePubDate, ruleDescription,
      ruleImage, ruleLink, ruleContent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newSource.id, newSource.sourceName, newSource.sourceUrl, newSource.sourceIcon,
     newSource.sourceGroup, newSource.enabled ? 1 : 0, newSource.customOrder,
     newSource.lastUpdateTime, newSource.ruleArticles, newSource.ruleTitle,
     newSource.rulePubDate, newSource.ruleDescription, newSource.ruleImage,
     newSource.ruleLink, newSource.ruleContent]
  );

  return newSource;
};

export const getAllRssSources = async (): Promise<RssSource[]> => {
  const rows = await queryAll<any>('SELECT * FROM rss_sources ORDER BY customOrder ASC');
  return rows.map(mapRowToSource);
};

export const getEnabledRssSources = async (): Promise<RssSource[]> => {
  const rows = await queryAll<any>(
    'SELECT * FROM rss_sources WHERE enabled = 1 ORDER BY customOrder ASC'
  );
  return rows.map(mapRowToSource);
};

export const getRssSourceById = async (id: string): Promise<RssSource | null> => {
  const row = await queryFirst<any>('SELECT * FROM rss_sources WHERE id = ?', [id]);
  return row ? mapRowToSource(row) : null;
};

export const deleteRssSource = async (id: string): Promise<void> => {
  await execute('DELETE FROM rss_articles WHERE sourceId = ?', [id]);
  await execute('DELETE FROM rss_sources WHERE id = ?', [id]);
};

// ==================== 文章操作 ====================
export const addRssArticle = async (article: Partial<RssArticle>): Promise<RssArticle> => {
  const newArticle: RssArticle = {
    id: article.id || uuidv4(),
    sourceId: article.sourceId || '',
    title: article.title || '',
    description: article.description,
    link: article.link || '',
    pubDate: article.pubDate,
    image: article.image,
    content: article.content,
    isRead: article.isRead || false,
    isStarred: article.isStarred || false,
    createTime: article.createTime || Date.now(),
  };

  await execute(
    `INSERT OR REPLACE INTO rss_articles
     (id, sourceId, title, description, link, pubDate, image, content, isRead, isStarred, createTime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newArticle.id, newArticle.sourceId, newArticle.title, newArticle.description,
     newArticle.link, newArticle.pubDate, newArticle.image, newArticle.content,
     newArticle.isRead ? 1 : 0, newArticle.isStarred ? 1 : 0, newArticle.createTime]
  );

  return newArticle;
};

export const getArticlesBySource = async (sourceId: string, limit = 50): Promise<RssArticle[]> => {
  const rows = await queryAll<any>(
    'SELECT * FROM rss_articles WHERE sourceId = ? ORDER BY createTime DESC LIMIT ?',
    [sourceId, limit]
  );
  return rows.map(mapRowToArticle);
};

export const getStarredArticles = async (): Promise<RssArticle[]> => {
  const rows = await queryAll<any>(
    'SELECT * FROM rss_articles WHERE isStarred = 1 ORDER BY createTime DESC'
  );
  return rows.map(mapRowToArticle);
};

export const markArticleRead = async (id: string): Promise<void> => {
  await execute('UPDATE rss_articles SET isRead = 1 WHERE id = ?', [id]);
};

export const toggleArticleStar = async (id: string, starred: boolean): Promise<void> => {
  await execute('UPDATE rss_articles SET isStarred = ? WHERE id = ?', [starred ? 1 : 0, id]);
};

// ==================== 抓取RSS ====================
export const fetchRssFeed = async (source: RssSource): Promise<RssArticle[]> => {
  try {
    const response = await fetch(source.sourceUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const text = await response.text();
    const articles = parseRssFeed(source.id, text);

    await execute(
      'UPDATE rss_sources SET lastUpdateTime = ? WHERE id = ?',
      [Date.now(), source.id]
    );

    for (const article of articles) {
      const existing = await queryFirst<any>(
        'SELECT id FROM rss_articles WHERE link = ?',
        [article.link]
      );
      if (!existing) await addRssArticle(article);
    }

    return articles as RssArticle[];
  } catch (error) {
    console.error('抓取RSS失败:', error);
    return [];
  }
};

const parseRssFeed = (sourceId: string, xml: string): Partial<RssArticle>[] => {
  const articles: Partial<RssArticle>[] = [];
  const isAtom = xml.includes('xmlns="http://www.w3.org/2005/Atom"');

  const extractTag = (text: string, tag: string): string => {
    const match = text.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
      || text.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return match ? match[1].trim() : '';
  };

  if (isAtom) {
    const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
    for (const entry of entries) {
      const title = extractTag(entry, 'title');
      const linkMatch = entry.match(/<link[^>]*href="([^"]+)"[^>]*>/i);
      const link = linkMatch ? linkMatch[1] : '';
      const summary = extractTag(entry, 'summary') || extractTag(entry, 'content');
      const published = extractTag(entry, 'published') || extractTag(entry, 'updated');

      if (title && link) {
        articles.push({
          sourceId, title, link, description: summary, pubDate: published,
          createTime: published ? new Date(published).getTime() : Date.now(),
        });
      }
    }
  } else {
    const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
    for (const item of items) {
      const title = extractTag(item, 'title');
      const link = extractTag(item, 'link');
      const description = extractTag(item, 'description');
      const pubDate = extractTag(item, 'pubDate');

      if (title && link) {
        articles.push({
          sourceId, title, link, description, pubDate,
          createTime: pubDate ? new Date(pubDate).getTime() : Date.now(),
        });
      }
    }
  }

  return articles;
};

// ==================== 辅助函数 ====================
const mapRowToSource = (row: any): RssSource => ({
  id: row.id,
  sourceName: row.sourceName,
  sourceUrl: row.sourceUrl,
  sourceIcon: row.sourceIcon,
  sourceGroup: row.sourceGroup,
  enabled: row.enabled === 1,
  customOrder: row.customOrder,
  lastUpdateTime: row.lastUpdateTime,
  ruleArticles: row.ruleArticles,
  ruleTitle: row.ruleTitle,
  rulePubDate: row.rulePubDate,
  ruleDescription: row.ruleDescription,
  ruleImage: row.ruleImage,
  ruleLink: row.ruleLink,
  ruleContent: row.ruleContent,
});

const mapRowToArticle = (row: any): RssArticle => ({
  id: row.id,
  sourceId: row.sourceId,
  title: row.title,
  description: row.description,
  link: row.link,
  pubDate: row.pubDate,
  image: row.image,
  content: row.content,
  isRead: row.isRead === 1,
  isStarred: row.isStarred === 1,
  createTime: row.createTime,
});
