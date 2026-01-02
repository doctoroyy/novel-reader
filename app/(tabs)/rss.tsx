import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RssSource, RssArticle } from '../../src/types';
import { useRssStore } from '../../src/stores';
import { fetchRssFeed, getArticlesBySource, markArticleRead, addRssSource } from '../../src/services';

const THEME_COLOR = '#667eea';

export default function RssScreen() {
  const { sources, loading, loadSources, deleteSource } = useRssStore();
  const [selectedSource, setSelectedSource] = useState<RssSource | null>(null);
  const [articles, setArticles] = useState<RssArticle[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    if (sources.length > 0 && !selectedSource) {
      handleSourceSelect(sources[0]);
    }
  }, [sources]);

  const handleSourceSelect = async (source: RssSource) => {
    setSelectedSource(source);
    setRefreshing(true);
    try {
      const list = await getArticlesBySource(source.id);
      setArticles(list);
      
      // 如果没有文章，自动刷一次
      if (list.length === 0) {
        await handleRefresh(source);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async (sourceOverride?: RssSource) => {
    const source = sourceOverride || selectedSource;
    if (!source) return;
    
    setRefreshing(true);
    try {
      await fetchRssFeed(source);
      const list = await getArticlesBySource(source.id);
      setArticles(list);
    } catch (error) {
      console.error('刷新失败:', error);
      Alert.alert('刷新失败', '请检查网络或订阅源地址');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddSource = () => {
    Alert.prompt(
      '添加订阅源',
      '请输入 RSS 订阅源地址',
      async (url) => {
        if (url) {
          try {
            await addRssSource({
              sourceName: url.split('/')[2] || '新订阅',
              sourceUrl: url,
            });
            await loadSources();
          } catch (error) {
            Alert.alert('错误', '添加失败');
          }
        }
      },
      'plain-text'
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
            await deleteSource(source.id);
            if (selectedSource?.id === source.id) {
              setSelectedSource(null);
              setArticles([]);
            }
          },
        },
      ]
    );
  };

  const handleArticlePress = async (article: RssArticle) => {
    if (!article.isRead) {
      await markArticleRead(article.id);
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, isRead: true } : a));
    }
    // TODO: 实现内容查看器或打开外部浏览器
    Alert.alert('提示', '正文查看器开发中，稍后复刻 Legado 的正文解析功能');
  };

  const renderArticle = ({ item }: { item: RssArticle }) => (
    <TouchableOpacity
      style={[styles.articleItem, item.isRead && styles.articleRead]}
      onPress={() => handleArticlePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.articleHeader}>
        <Text style={[styles.articleTitle, item.isRead && styles.articleTitleRead]} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
      {item.description && (
        <Text style={styles.articleDesc} numberOfLines={3}>
          {item.description.replace(/<[^>]+>/g, '').trim()}
        </Text>
      )}
      <View style={styles.articleFooter}>
        <Text style={styles.articleDate}>{item.pubDate || '未知日期'}</Text>
        {item.isStarred && <Ionicons name="star" size={14} color="#ffd700" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: '综合订阅',
          headerRight: () => (
            <TouchableOpacity onPress={handleAddSource} style={{ padding: 8 }}>
              <Ionicons name="add" size={24} color={THEME_COLOR} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* 源列表 */}
      <View style={styles.sourceBar}>
        <FlatList
          horizontal
          data={sources}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sourceListContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.sourceChip,
                selectedSource?.id === item.id && styles.sourceChipActive,
              ]}
              onPress={() => handleSourceSelect(item)}
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
          ListEmptyComponent={
            <Text style={styles.emptySources}>暂无订阅源</Text>
          }
        />
      </View>

      {/* 文章列表 */}
      <FlatList
        data={articles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.articleList}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={[THEME_COLOR]}
            tintColor={THEME_COLOR}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            {loading && !refreshing ? (
              <ActivityIndicator color={THEME_COLOR} />
            ) : (
              <>
                <Ionicons name="newspaper-outline" size={64} color="#e0e0e0" />
                <Text style={styles.emptyText}>
                  {sources.length === 0 ? '导入或添加订阅源开始阅读' : '暂无内容，下拉刷新'}
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  sourceBar: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 10,
  },
  sourceListContent: {
    paddingHorizontal: 12,
  },
  sourceChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sourceChipActive: {
    backgroundColor: `${THEME_COLOR}15`,
    borderColor: THEME_COLOR,
  },
  sourceChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  sourceChipTextActive: {
    color: THEME_COLOR,
    fontWeight: '700',
  },
  emptySources: {
    fontSize: 13,
    color: '#999',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  articleList: {
    padding: 12,
    flexGrow: 1,
  },
  articleItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  articleRead: {
    opacity: 0.6,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    lineHeight: 24,
  },
  articleTitleRead: {
    fontWeight: '400',
    color: '#666',
  },
  articleDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
