import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Book, BookChapter, BookSource } from '../../src/types';
import {
  getBookSourceById, getBookInfo, getBookToc,
  addBook, addChapters, isBookInShelf, getBookByUrl
} from '../../src/services';
import { useBookshelfStore } from '../../src/stores';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addToShelf } = useBookshelfStore();
  const [book, setBook] = useState<Partial<Book> | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [source, setSource] = useState<BookSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [inShelf, setInShelf] = useState(false);

  const bookUrl = decodeURIComponent(id || '');

  useEffect(() => {
    loadBookInfo();
  }, [bookUrl]);

  const loadBookInfo = async () => {
    if (!bookUrl) return;

    setLoading(true);
    try {
      // 检查是否在书架
      const existingBook = await getBookByUrl(bookUrl);
      if (existingBook) {
        setBook(existingBook);
        setInShelf(true);
        if (existingBook.sourceId) {
          const s = await getBookSourceById(existingBook.sourceId);
          setSource(s);
        }
        return;
      }

      // 从搜索结果获取书籍信息
      // 这里简化处理，实际应从导航参数传递
      setInShelf(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToShelf = async () => {
    if (!book) return;

    try {
      const newBook = await addToShelf(book);
      setInShelf(true);

      // 加载目录
      if (source) {
        const toc = await getBookToc(source, newBook);
        await addChapters(toc);
        setChapters(toc);
      }

      Alert.alert('成功', '已加入书架');
    } catch (error) {
      Alert.alert('失败', '加入书架失败');
    }
  };

  const handleStartReading = () => {
    if (book?.id) {
      router.push(`/reader/${book.id}`);
    } else if (bookUrl) {
      // 先加入书架再阅读
      handleAddToShelf().then(() => {
        if (book?.id) {
          router.push(`/reader/${book.id}`);
        }
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>书籍信息加载失败</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerTintColor: '#fff',
        }}
      />
      <ScrollView style={styles.container}>
        {/* 封面区域 */}
        <View style={styles.header}>
          <Image source={{ uri: book.coverUrl }} style={styles.cover} />
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{book.name}</Text>
            <Text style={styles.author}>{book.author}</Text>
            <Text style={styles.source}>{book.sourceName || source?.bookSourceName}</Text>
            {book.kind && <Text style={styles.kind}>{book.kind}</Text>}
          </View>
        </View>

        {/* 操作按钮 */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleStartReading}
          >
            <Ionicons name="book" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>开始阅读</Text>
          </TouchableOpacity>

          {!inShelf && (
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleAddToShelf}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>加入书架</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 简介 */}
        {book.intro && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>简介</Text>
            <Text style={styles.intro}>{book.intro}</Text>
          </View>
        )}

        {/* 目录 */}
        {chapters.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>目录 ({chapters.length}章)</Text>
              <TouchableOpacity>
                <Text style={styles.sectionLink}>全部</Text>
              </TouchableOpacity>
            </View>
            {chapters.slice(0, 5).map((chapter, index) => (
              <TouchableOpacity key={chapter.id} style={styles.chapterItem}>
                <Text style={styles.chapterTitle} numberOfLines={1}>
                  {chapter.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#999',
  },
  header: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 100,
    backgroundColor: '#333',
  },
  cover: {
    width: 100,
    height: 140,
    borderRadius: 6,
    backgroundColor: '#555',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  author: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  source: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  kind: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 6,
  },
  secondaryButton: {
    backgroundColor: '#E3F2FD',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 6,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionLink: {
    fontSize: 14,
    color: '#007AFF',
  },
  intro: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  chapterItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  chapterTitle: {
    fontSize: 14,
    color: '#333',
  },
});
