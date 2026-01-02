import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookSource, Book } from '../../src/types';
import { getEnabledBookSources, exploreBooks, parseExploreKinds } from '../../src/services';

export default function ExploreScreen() {
  const router = useRouter();
  const [sources, setSources] = useState<BookSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<BookSource | null>(null);
  const [kinds, setKinds] = useState<{ name: string; url: string }[]>([]);
  const [selectedKind, setSelectedKind] = useState<string>('');
  const [books, setBooks] = useState<Partial<Book>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    const enabledSources = await getEnabledBookSources();
    const exploreSources = enabledSources.filter(s => s.enabledExplore && s.exploreUrl);
    setSources(exploreSources);
    if (exploreSources.length > 0) {
      selectSource(exploreSources[0]);
    }
  };

  const selectSource = (source: BookSource) => {
    setSelectedSource(source);
    if (source.exploreUrl) {
      const k = parseExploreKinds(source.exploreUrl);
      setKinds(k);
      if (k.length > 0) {
        loadBooks(source, k[0].url);
        setSelectedKind(k[0].url);
      }
    }
  };

  const loadBooks = async (source: BookSource, url?: string) => {
    setLoading(true);
    try {
      const result = await exploreBooks(source, url);
      setBooks(result);
    } finally {
      setLoading(false);
    }
  };

  const renderBookItem = ({ item }: { item: Partial<Book> }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => router.push(`/book/${encodeURIComponent(item.bookUrl || '')}`)}
    >
      <Image source={{ uri: item.coverUrl }} style={styles.cover} />
      <View style={styles.bookInfo}>
        <Text style={styles.bookName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.bookAuthor}>{item.author}</Text>
        <Text style={styles.bookKind} numberOfLines={1}>{item.kind}</Text>
        <Text style={styles.bookIntro} numberOfLines={2}>{item.intro}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: '发现',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/search')}>
              <Ionicons name="search" size={22} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* 书源选择 */}
        {sources.length > 1 && (
          <View style={styles.sourceRow}>
            <FlatList
              horizontal
              data={sources}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.sourceChip,
                    selectedSource?.id === item.id && styles.sourceChipActive,
                  ]}
                  onPress={() => selectSource(item)}
                >
                  <Text
                    style={[
                      styles.sourceChipText,
                      selectedSource?.id === item.id && styles.sourceChipTextActive,
                    ]}
                  >
                    {item.bookSourceName}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* 分类选择 */}
        {kinds.length > 0 && (
          <View style={styles.kindRow}>
            <FlatList
              horizontal
              data={kinds}
              keyExtractor={(item) => item.url}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.kindChip,
                    selectedKind === item.url && styles.kindChipActive,
                  ]}
                  onPress={() => {
                    setSelectedKind(item.url);
                    if (selectedSource) loadBooks(selectedSource, item.url);
                  }}
                >
                  <Text
                    style={[
                      styles.kindChipText,
                      selectedKind === item.url && styles.kindChipTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* 书籍列表 */}
        <FlatList
          data={books}
          renderItem={renderBookItem}
          keyExtractor={(item, index) => item.bookUrl || String(index)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => selectedSource && loadBooks(selectedSource, selectedKind)}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {sources.length === 0 ? '请先导入书源' : '暂无内容'}
              </Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  sourceRow: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sourceChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  sourceChipActive: {
    backgroundColor: '#007AFF',
  },
  sourceChipText: {
    fontSize: 13,
    color: '#666',
  },
  sourceChipTextActive: {
    color: '#fff',
  },
  kindRow: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  kindChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
  },
  kindChipActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  kindChipText: {
    fontSize: 14,
    color: '#666',
  },
  kindChipTextActive: {
    color: '#007AFF',
    fontWeight: '500',
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
  },
  cover: {
    width: 70,
    height: 95,
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
  bookKind: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  bookIntro: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    lineHeight: 18,
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
  },
});
