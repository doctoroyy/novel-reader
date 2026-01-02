import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book, BookChapter, BookSource, ReadConfig, DEFAULT_READ_CONFIG } from '../types';
import * as services from '../services';

// ==================== 书架 Store ====================
interface BookshelfState {
  books: Book[];
  currentGroup: number;
  loading: boolean;
  loadBooks: () => Promise<void>;
  addToShelf: (book: Partial<Book>) => Promise<Book>;
  removeFromShelf: (id: string) => Promise<void>;
  setCurrentGroup: (group: number) => void;
}

export const useBookshelfStore = create<BookshelfState>((set, get) => ({
  books: [],
  currentGroup: 0,
  loading: false,

  loadBooks: async () => {
    set({ loading: true });
    try {
      const books = await services.getBooksByGroup(get().currentGroup);
      set({ books });
    } finally {
      set({ loading: false });
    }
  },

  addToShelf: async (book) => {
    const newBook = await services.addBook(book);
    await get().loadBooks();
    return newBook;
  },

  removeFromShelf: async (id) => {
    await services.deleteBook(id);
    await get().loadBooks();
  },

  setCurrentGroup: (group) => {
    set({ currentGroup: group });
    get().loadBooks();
  },
}));

// ==================== 阅读器 Store ====================
interface ReaderState {
  book: Book | null;
  chapters: BookChapter[];
  currentChapter: BookChapter | null;
  currentChapterIndex: number;
  content: string;
  loading: boolean;
  config: ReadConfig;

  openBook: (bookId: string) => Promise<void>;
  loadChapter: (index: number) => Promise<void>;
  nextChapter: () => Promise<void>;
  prevChapter: () => Promise<void>;
  updateProgress: (pos: number) => Promise<void>;
  updateConfig: (config: Partial<ReadConfig>) => Promise<void>;
  loadConfig: () => Promise<void>;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  book: null,
  chapters: [],
  currentChapter: null,
  currentChapterIndex: 0,
  content: '',
  loading: false,
  config: DEFAULT_READ_CONFIG,

  openBook: async (bookId) => {
    set({ loading: true });
    try {
      const book = await services.getBookById(bookId);
      if (!book) throw new Error('书籍不存在');

      const chapters = await services.getChaptersByBookId(bookId);
      set({ book, chapters, currentChapterIndex: book.durChapterIndex });

      await get().loadChapter(book.durChapterIndex);
    } finally {
      set({ loading: false });
    }
  },

  loadChapter: async (index) => {
    const { book, chapters } = get();
    if (!book || index < 0 || index >= chapters.length) return;

    set({ loading: true, currentChapterIndex: index });

    try {
      const chapter = chapters[index];
      set({ currentChapter: chapter });

      // 尝试从缓存获取
      let content = await services.getCachedContent(book.id, index);

      if (!content) {
        if (book.isLocal && book.localPath) {
          content = await services.getLocalChapterContent(
            book.localPath,
            chapter.startPos || 0,
            chapter.endPos || 0
          );
        } else if (book.sourceId) {
          const source = await services.getBookSourceById(book.sourceId);
          if (source) {
            content = await services.getChapterContent(source, chapter);
            // 应用替换规则
            if (get().config.useReplaceRule) {
              content = await services.applyReplaceRules(content);
            }
            // 缓存内容
            await services.cacheContent(book.id, index, content);
          }
        }
      }

      set({ content: content || '加载失败' });
      await get().updateProgress(0);
    } finally {
      set({ loading: false });
    }
  },

  nextChapter: async () => {
    const { currentChapterIndex, chapters } = get();
    if (currentChapterIndex < chapters.length - 1) {
      await get().loadChapter(currentChapterIndex + 1);
    }
  },

  prevChapter: async () => {
    const { currentChapterIndex } = get();
    if (currentChapterIndex > 0) {
      await get().loadChapter(currentChapterIndex - 1);
    }
  },

  updateProgress: async (pos) => {
    const { book, currentChapterIndex, currentChapter } = get();
    if (book && currentChapter) {
      await services.updateReadProgress(
        book.id,
        currentChapterIndex,
        pos,
        currentChapter.title
      );
    }
  },

  updateConfig: async (newConfig) => {
    const config = { ...get().config, ...newConfig };
    set({ config });
    await AsyncStorage.setItem('readConfig', JSON.stringify(config));
  },

  loadConfig: async () => {
    try {
      const saved = await AsyncStorage.getItem('readConfig');
      if (saved) {
        set({ config: { ...DEFAULT_READ_CONFIG, ...JSON.parse(saved) } });
      }
    } catch {}
  },
}));

// ==================== 书源 Store ====================
interface SourceState {
  sources: BookSource[];
  loading: boolean;
  loadSources: () => Promise<void>;
  importSources: (json: string) => Promise<number>;
  toggleSource: (id: string, enabled: boolean) => Promise<void>;
  deleteSource: (id: string) => Promise<void>;
}

export const useSourceStore = create<SourceState>((set, get) => ({
  sources: [],
  loading: false,

  loadSources: async () => {
    set({ loading: true });
    try {
      const sources = await services.getAllBookSources();
      set({ sources });
    } finally {
      set({ loading: false });
    }
  },

  importSources: async (json) => {
    const parsed = services.parseBookSourceJson(json);
    const count = await services.importBookSources(parsed);
    await get().loadSources();
    return count;
  },

  toggleSource: async (id, enabled) => {
    await services.toggleBookSource(id, enabled);
    await get().loadSources();
  },

  deleteSource: async (id) => {
    await services.deleteBookSource(id);
    await get().loadSources();
  },
}));

// ==================== 搜索 Store ====================
interface SearchState {
  keyword: string;
  results: Partial<Book>[];
  loading: boolean;
  searchingSources: string[];

  setKeyword: (keyword: string) => void;
  search: () => Promise<void>;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  keyword: '',
  results: [],
  loading: false,
  searchingSources: [],

  setKeyword: (keyword) => set({ keyword }),

  search: async () => {
    const { keyword } = get();
    if (!keyword.trim()) return;

    set({ loading: true, results: [], searchingSources: [] });

    try {
      const sources = await services.getEnabledBookSources();
      const allResults: Partial<Book>[] = [];

      // 并发搜索所有书源
      await Promise.all(
        sources.map(async (source) => {
          set((s) => ({ searchingSources: [...s.searchingSources, source.bookSourceName] }));
          try {
            const books = await services.searchBooks(source, keyword);
            allResults.push(...books);
            set({ results: [...allResults] });
          } finally {
            set((s) => ({
              searchingSources: s.searchingSources.filter((n) => n !== source.bookSourceName),
            }));
          }
        })
      );
    } finally {
      set({ loading: false });
    }
  },

  clear: () => set({ keyword: '', results: [], searchingSources: [] }),
}));
