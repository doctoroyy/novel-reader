import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, SafeAreaView
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore, useBookshelfStore } from '../src/stores';
import { Book } from '../src/types';
import { isBookInShelf, addBook } from '../src/services';

export default function SearchScreen() {
  const router = useRouter();
  const { keyword, setKeyword, results, loading, searchingSources, search, clear } = useSearchStore();
  const { addToShelf } = useBookshelfStore();
  const [inShelfMap, setInShelfMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // 检查哪些书已在书架
    const checkShelf = async () => {
      const map: Record<string, boolean> = {};
      for (const book of results) {
        if (book.bookUrl) {
          map[book.bookUrl] = await isBookInShelf(book.bookUrl);
        }
      }
      setInShelfMap(map);
    };
    checkShelf();
  }, [results]);

  const handleSearch = () => {
    if (keyword.trim()) {
      search();
    }
  };

  const handleAddToShelf = async (book: Partial<Book>) => {
    if (!book.bookUrl) return;
    await addToShelf(book);
    setInShelfMap((prev) => ({ ...prev, [book.bookUrl!]: true }));
  };

  const renderItem = ({ item }: { item: Partial<Book> }) => {
    const inShelf = item.bookUrl ? inShelfMap[item.bookUrl] : false;

    return (
      <TouchableOpacity
        style={styles.bookItem}
        onPress={() => {
          if (inShelf) {
            // 直接打开阅读
            router.push(`/reader/${encodeURIComponent(item.bookUrl || '')}`);
          } else {
            // 打开书籍详情
            router.push(`/book/${encodeURIComponent(item.bookUrl || '')}`);
          }
        }}
      >
        <Image source={{ uri: item.coverUrl }} style={styles.cover} />
        <View style={styles.bookInfo}>
          <Text style={styles.bookName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.bookAuthor}>{item.author}</Text>
          <Text style={styles.bookSource}>{item.sourceName}</Text>
          {item.latestChapterTitle && (
            <Text style={styles.bookLatest} numberOfLines={1}>
              最新: {item.latestChapterTitle}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addButton, inShelf && styles.addButtonDisabled]}
          onPress={() => !inShelf && handleAddToShelf(item)}
          disabled={inShelf}
        >
          <Ionicons
            name={inShelf ? 'checkmark' : 'add'}
            size={20}
            color={inShelf ? '#999' : '#007AFF'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 搜索栏 */}
      <View style={styles.searchBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.input}
            placeholder="搜索书名或作者"
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={clear}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {/* 搜索状态 */}
      {searchingSources.length > 0 && (
        <View style={styles.statusBar}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.statusText}>
            正在搜索: {searchingSources.slice(0, 3).join(', ')}
            {searchingSources.length > 3 ? ` 等${searchingSources.length}个源` : ''}
          </Text>
        </View>
      )}

      {/* 搜索结果 */}
      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.bookUrl || String(index)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="search" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {keyword ? '暂无搜索结果' : '输入书名或作者开始搜索'}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
  },
  input: {
    flex: 1,
    fontSize: 15,
    marginLeft: 6,
    color: '#333',
  },
  searchButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  statusText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
  },
  listContent: {
    padding: 12,
    flexGrow: 1,
  },
  bookItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cover: {
    width: 60,
    height: 80,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bookName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  bookAuthor: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  bookSource: {
    fontSize: 11,
    color: '#007AFF',
    marginTop: 4,
  },
  bookLatest: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#e8e8e8',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
});
