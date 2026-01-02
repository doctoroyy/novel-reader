// ==================== 书籍类型 ====================
export interface Book {
  id: string;
  name: string;
  author: string;
  coverUrl?: string;
  intro?: string;
  kind?: string;
  wordCount?: string;
  latestChapterTitle?: string;
  latestChapterTime?: number;
  tocUrl?: string;
  sourceId?: string;
  sourceName?: string;
  bookUrl: string;
  customCover?: string;
  type: BookType;
  group: number;
  durChapterIndex: number;
  durChapterPos: number;
  durChapterTime: number;
  durChapterTitle?: string;
  totalChapterNum: number;
  createTime: number;
  updateTime: number;
  isLocal: boolean;
  localPath?: string;
}

export enum BookType {
  ONLINE = 0,
  LOCAL_TXT = 1,
  LOCAL_EPUB = 2,
}

export interface BookChapter {
  id: string;
  bookId: string;
  index: number;
  title: string;
  url: string;
  isVip?: boolean;
  startPos?: number;
  endPos?: number;
}

// ==================== 书源类型 ====================
export interface BookSource {
  id: string;
  bookSourceName: string;
  bookSourceGroup?: string;
  bookSourceUrl: string;
  bookSourceComment?: string;
  enabled: boolean;
  enabledExplore: boolean;
  weight: number;
  customOrder: number;
  lastUpdateTime: number;
  respondTime: number;
  header?: string;
  searchUrl?: string;
  exploreUrl?: string;
  ruleSearch?: SearchRule;
  ruleExplore?: ExploreRule;
  ruleBookInfo?: BookInfoRule;
  ruleToc?: TocRule;
  ruleContent?: ContentRule;
}

export interface SearchRule {
  bookList?: string;
  name?: string;
  author?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  bookUrl?: string;
  coverUrl?: string;
  wordCount?: string;
}

export interface ExploreRule extends SearchRule {}

export interface BookInfoRule {
  name?: string;
  author?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  coverUrl?: string;
  tocUrl?: string;
  wordCount?: string;
}

export interface TocRule {
  chapterList?: string;
  chapterName?: string;
  chapterUrl?: string;
  nextTocUrl?: string;
}

export interface ContentRule {
  content?: string;
  nextContentUrl?: string;
  replaceRegex?: string;
}

// ==================== 替换规则 ====================
export interface ReplaceRule {
  id: string;
  name: string;
  group?: string;
  pattern: string;
  replacement: string;
  scope?: string;
  isEnabled: boolean;
  isRegex: boolean;
  order: number;
}

// ==================== RSS ====================
export interface RssSource {
  id: string;
  sourceName: string;
  sourceUrl: string;
  sourceIcon?: string;
  sourceGroup?: string;
  enabled: boolean;
  customOrder: number;
  lastUpdateTime: number;
  ruleArticles?: string;
  ruleTitle?: string;
  rulePubDate?: string;
  ruleDescription?: string;
  ruleImage?: string;
  ruleLink?: string;
  ruleContent?: string;
}

export interface RssArticle {
  id: string;
  sourceId: string;
  title: string;
  description?: string;
  link: string;
  pubDate?: string;
  image?: string;
  content?: string;
  isRead: boolean;
  isStarred: boolean;
  createTime: number;
}

// ==================== 书签 ====================
export interface Bookmark {
  id: string;
  bookId: string;
  chapterIndex: number;
  chapterName: string;
  content: string;
  createTime: number;
}

// ==================== 分组 ====================
export interface BookGroup {
  id: number;
  name: string;
  order: number;
}

// ==================== 阅读设置 ====================
export interface ReadConfig {
  fontSize: number;
  fontFamily?: string;
  lineHeight: number;
  paragraphSpacing: number;
  paddingHorizontal: number;
  paddingVertical: number;
  pageMode: PageMode;
  bgColor: string;
  textColor: string;
  brightness: number;
  keepScreenOn: boolean;
  volumeKeyPage: boolean;
  clickPageTurn: boolean;
  textConvert: TextConvert;
  useReplaceRule: boolean;
  indent: number;
}

export enum PageMode {
  SLIDE = 'slide',
  COVER = 'cover',
  SCROLL = 'scroll',
  NONE = 'none',
}

export enum TextConvert {
  NONE = 0,
  TO_SC = 1,
  TO_TC = 2,
}

// ==================== 阅读主题 ====================
export interface ReadTheme {
  id: string;
  name: string;
  bgColor: string;
  textColor: string;
}

export const DEFAULT_THEMES: ReadTheme[] = [
  { id: 'default', name: '默认', bgColor: '#FFFFFF', textColor: '#333333' },
  { id: 'eye-care', name: '护眼', bgColor: '#CCE8CF', textColor: '#2C4A2E' },
  { id: 'sepia', name: '羊皮纸', bgColor: '#F5EFDC', textColor: '#5B4636' },
  { id: 'night', name: '夜间', bgColor: '#1A1A1A', textColor: '#AAAAAA' },
  { id: 'gray', name: '灰色', bgColor: '#E5E5E5', textColor: '#333333' },
];

export const DEFAULT_READ_CONFIG: ReadConfig = {
  fontSize: 18,
  lineHeight: 1.8,
  paragraphSpacing: 10,
  paddingHorizontal: 16,
  paddingVertical: 40,
  pageMode: PageMode.SLIDE,
  bgColor: '#FFFFFF',
  textColor: '#333333',
  brightness: 1.0,
  keepScreenOn: true,
  volumeKeyPage: true,
  clickPageTurn: true,
  textConvert: TextConvert.NONE,
  useReplaceRule: true,
  indent: 2,
};

// ==================== 搜索历史 ====================
export interface SearchHistory {
  id: string;
  keyword: string;
  time: number;
}
