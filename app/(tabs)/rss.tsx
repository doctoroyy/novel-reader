import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RssSource, RssArticle } from '../../src/types';
import {
  getAllRssSources, addRssSource, deleteRssSource,
  getArticlesBySource, fetchRssFeed, markArticleRead
} from '../../src/services';

export default function RssScreen() {
  const [sources, setSources] = useState<RssSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<RssSource | null>(null);
  const [articles, setArticles] = useState<RssArticle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    const list = await getAllRssSources();
    setSources(list);
    if (list.length > 0 && !selectedSource) {
      selectSource(list[0]);
    }
  };

  const selectSource = async (source: RssSource) => {
    setSelectedSource(source);
    setLoading(true);
    try {
      const list = await getArticlesBySource(source.id);
      setArticles(list);
    } finally {
      setLoading(false);
    }
  };

  const refreshFeed = async () => {
    if (!selectedSource) return;
    setLoading(true);
    try {
      await fetchRssFeed(selectedSource);
      const list = await getArticlesBySource(selectedSource.id);
      setArticles(list);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = () => {
    Alert.prompt(
      '添加RSS源',
      '请输入RSS源地址',
      async (url) => {
        if (url) {
          try {
            await addRssSource({
              sourceName: url.split('/')[2] || 'RSS',
              sourceUrl: url,
            });
            await loadSources();
          } catch (error) {
            Alert.alert('错误', '添加失败');
          }
        }
      },
      'plain-text',
      '',
      'url'
    );
  };

  const handleDeleteSource = (source: RssSource) => {
    Alert.alert(
      '删除确认',
      `确定要删除 "${source.sourceName}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await deleteRssSource(source.id);
            if (selectedSource?.id === source.id) {
              setSelectedSource(null);
              setArticles([]);
            }
            await loadSources();
          },
        },
      ]
    );
  };

  const handleArticlePress = async (article: RssArticle) => {
    await markArticleRead(article.id);
    // 打开文章详情或外部链接
  };

  const renderArticle = ({ item }: { item: RssArticle }) => (
    <TouchableOpacity
      style={[styles.articleItem, item.isRead && styles.articleRead]}
      onPress={() => handleArticlePress(item)}
    >
      <Text style={[styles.articleTitle, item.isRead && styles.articleTitleRead]} numberOfLines={2}>
        {item.title}
      </Text>
      {item.description && (
        <Text style={styles.articleDesc} numberOfLines={2}>{item.description}</Text>
      )}
      <Text style={styles.articleDate}>{item.pubDate}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: '订阅',
          headerRight: () => (
            <TouchableOpacity onPress={handleAddSource}>
              <Ionicons name="add" size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* RSS源列表 */}
        {sources.length > 0 && (
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
                  onLongPress={() => handleDeleteSource(item)}
                >
                  <Text
                    style={[
                      styles.sourceChipText,
                      selectedSource?.id === item.id && styles.sourceChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.sourceName}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* 文章列表 */}
        <FlatList
          data={articles}
          renderItem={renderArticle}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refreshFeed} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="newspaper-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {sources.length === 0 ? '点击右上角添加订阅源' : '暂无文章'}
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
    paddingVertical: 10,
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
    maxWidth: 120,
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
  listContent: {
    padding: 12,
    flexGrow: 1,
  },
  articleItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  articleRead: {
    opacity: 0.7,
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    lineHeight: 22,
  },
  articleTitleRead: {
    color: '#999',
  },
  articleDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    lineHeight: 18,
  },
  articleDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
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
