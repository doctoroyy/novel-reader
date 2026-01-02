import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image, Dimensions
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BookSource, Book } from '../../src/types';
import { getEnabledBookSources, exploreBooks, parseExploreKinds } from '../../src/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// 渐变色
const COVER_GRADIENTS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
];

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

  const getGradient = (index: number) => {
    return COVER_GRADIENTS[index % COVER_GRADIENTS.length];
  };

  const renderBookItem = ({ item, index }: { item: Partial<Book>; index: number }) => {
    const gradient = getGradient(index);
    
    return (
      <TouchableOpacity
        style={styles.bookCard}
        onPress={() => router.push(`/book/${encodeURIComponent(item.bookUrl || '')}`)}
        activeOpacity={0.8}
      >
        <View style={styles.coverContainer}>
          {item.coverUrl ? (
            <Image source={{ uri: item.coverUrl }} style={styles.cover} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={gradient as [string, string]}
              style={styles.cover}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.coverText} numberOfLines={2}>{item.name}</Text>
            </LinearGradient>
          )}
          <View style={styles.coverOverlay}>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.coverGradient}
            >
              <Text style={styles.coverTitle} numberOfLines={1}>{item.name}</Text>
            </LinearGradient>
          </View>
        </View>
        <View style={styles.bookInfo}>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            <Ionicons name="person-outline" size={11} color="#999" /> {item.author || '未知'}
          </Text>
          {item.kind && (
            <View style={styles.tagRow}>
              {item.kind.split(/[,|，]/).slice(0, 2).map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag.trim()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '发现',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/search')}
              style={styles.searchBtn}
            >
              <Ionicons name="search" size={22} color="#667eea" />
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
              contentContainerStyle={styles.sourceList}
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
              contentContainerStyle={styles.kindList}
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
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => selectedSource && loadBooks(selectedSource, selectedKind)}
              tintColor="#667eea"
              colors={['#667eea']}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="compass-outline" size={40} color="#667eea" />
              </View>
              <Text style={styles.emptyText}>
                {sources.length === 0 ? '请先导入书源' : '暂无内容'}
              </Text>
              {sources.length === 0 && (
                <TouchableOpacity 
                  style={styles.emptyBtn}
                  onPress={() => router.push('/(tabs)/settings')}
                >
                  <Text style={styles.emptyBtnText}>去导入</Text>
                </TouchableOpacity>
              )}
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
    backgroundColor: '#f8f9fa',
  },
  searchBtn: {
    padding: 4,
  },
  sourceRow: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sourceList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sourceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    marginRight: 10,
  },
  sourceChipActive: {
    backgroundColor: '#667eea',
  },
  sourceChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#667eea',
  },
  sourceChipTextActive: {
    color: '#fff',
  },
  kindRow: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  kindList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  kindChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 14,
  },
  kindChipActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.12)',
  },
  kindChipText: {
    fontSize: 14,
    color: '#666',
  },
  kindChipTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  bookCard: {
    width: CARD_WIDTH,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  coverContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 0.75,
  },
  cover: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  coverText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  coverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  coverGradient: {
    paddingTop: 30,
    paddingBottom: 8,
    paddingHorizontal: 10,
  },
  coverTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bookInfo: {
    padding: 10,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#999',
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#667eea',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
  },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#667eea',
    borderRadius: 20,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
