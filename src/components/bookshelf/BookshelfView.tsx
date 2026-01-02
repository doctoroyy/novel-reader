import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Dimensions, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBookshelfStore } from '../../stores';
import { Book } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_SPACING = 12;
const BOOK_WIDTH = (SCREEN_WIDTH - GRID_SPACING * (GRID_COLUMNS + 1)) / GRID_COLUMNS;
const BOOK_HEIGHT = BOOK_WIDTH * 1.4;

interface Props {
  viewMode?: 'list' | 'grid';
}

// 默认封面渐变色
const COVER_GRADIENTS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a8edea', '#fed6e3'],
  ['#ff9a9e', '#fecfef'],
  ['#ffecd2', '#fcb69f'],
];

export const BookshelfView: React.FC<Props> = ({ viewMode = 'grid' }) => {
  const router = useRouter();
  const { books, loading, loadBooks, removeFromShelf } = useBookshelfStore();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadBooks();
  }, []);

  const handleBookPress = (book: Book) => {
    if (selectMode) {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(book.id)) {
        newSelected.delete(book.id);
      } else {
        newSelected.add(book.id);
      }
      setSelectedIds(newSelected);
    } else {
      router.push(`/reader/${book.id}`);
    }
  };

  const handleBookLongPress = (book: Book) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelectedIds(new Set([book.id]));
    }
  };

  const handleDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      '删除确认',
      `确定要删除选中的 ${selectedIds.size} 本书吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            for (const id of selectedIds) {
              await removeFromShelf(id);
            }
            setSelectMode(false);
            setSelectedIds(new Set());
          },
        },
      ]
    );
  };

  const cancelSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  // 计算阅读进度
  const getProgress = (book: Book) => {
    if (!book.totalChapterNum || book.totalChapterNum === 0) return 0;
    return Math.round(((book.durChapterIndex || 0) + 1) / book.totalChapterNum * 100);
  };

  // 获取随机渐变色
  const getGradient = (index: number) => {
    return COVER_GRADIENTS[index % COVER_GRADIENTS.length];
  };

  // 渲染网格项
  const renderGridItem = ({ item, index }: { item: Book; index: number }) => {
    const isSelected = selectedIds.has(item.id);
    const progress = getProgress(item);
    const gradient = getGradient(index);

    return (
      <TouchableOpacity
        style={[styles.gridItem, isSelected && styles.selectedItem]}
        onPress={() => handleBookPress(item)}
        onLongPress={() => handleBookLongPress(item)}
        activeOpacity={0.8}
      >
        {/* 选择框 */}
        {selectMode && (
          <View style={styles.checkbox}>
            <View style={[styles.checkboxInner, isSelected && styles.checkboxChecked]}>
              {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
          </View>
        )}

        {/* 书籍封面 */}
        <View style={styles.coverContainer}>
          {item.coverUrl || item.customCover ? (
            <Image
              source={{ uri: item.coverUrl || item.customCover }}
              style={styles.gridCover}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={gradient as [string, string]}
              style={styles.gridCover}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.coverText} numberOfLines={3}>
                {item.name}
              </Text>
            </LinearGradient>
          )}
          
          {/* 书脊效果 */}
          <View style={styles.bookSpine} />
          
          {/* 更新标记 */}
          {item.latestChapterTitle && (
            <View style={styles.updateBadge}>
              <Text style={styles.updateBadgeText}>新</Text>
            </View>
          )}
        </View>

        {/* 书名 */}
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.name}
        </Text>

        {/* 进度条 */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {progress}%
        </Text>
      </TouchableOpacity>
    );
  };

  // 渲染列表项
  const renderListItem = ({ item, index }: { item: Book; index: number }) => {
    const isSelected = selectedIds.has(item.id);
    const progress = getProgress(item);
    const gradient = getGradient(index);

    return (
      <TouchableOpacity
        style={[styles.listItem, isSelected && styles.listItemSelected]}
        onPress={() => handleBookPress(item)}
        onLongPress={() => handleBookLongPress(item)}
        activeOpacity={0.8}
      >
        {/* 选择框 */}
        {selectMode && (
          <View style={styles.listCheckbox}>
            <View style={[styles.checkboxInner, isSelected && styles.checkboxChecked]}>
              {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
          </View>
        )}

        {/* 封面 */}
        <View style={styles.listCoverContainer}>
          {item.coverUrl || item.customCover ? (
            <Image
              source={{ uri: item.coverUrl || item.customCover }}
              style={styles.listCover}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={gradient as [string, string]}
              style={styles.listCover}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.listCoverText} numberOfLines={2}>
                {item.name}
              </Text>
            </LinearGradient>
          )}
        </View>

        {/* 信息 */}
        <View style={styles.listInfo}>
          <Text style={styles.listTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.listAuthor}>{item.author || '未知作者'}</Text>
          
          <View style={styles.listMeta}>
            <View style={styles.metaTag}>
              <Text style={styles.metaTagText}>{item.sourceName || '本地'}</Text>
            </View>
            <Text style={styles.metaChapter}>{item.totalChapterNum || 0} 章</Text>
          </View>

          {item.durChapterTitle && (
            <Text style={styles.listProgress} numberOfLines={1}>
              <Ionicons name="bookmark" size={12} color="#667eea" /> {item.durChapterTitle}
            </Text>
          )}
        </View>

        {/* 进度圆环 */}
        <View style={styles.progressCircle}>
          <Text style={styles.progressCircleText}>{progress}%</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 工具栏 */}
      {selectMode && (
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={cancelSelect} style={styles.toolbarBtn}>
            <Ionicons name="close" size={22} color="#333" />
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>已选 {selectedIds.size} 项</Text>
          <TouchableOpacity 
            onPress={handleDelete} 
            style={[styles.toolbarBtn, styles.deleteBtn]}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.deleteBtnText}>删除</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 书籍列表 */}
      <FlatList
        data={books}
        renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? GRID_COLUMNS : 1}
        key={viewMode}
        contentContainerStyle={[
          styles.listContent,
          viewMode === 'grid' && styles.gridContent,
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={loadBooks}
            tintColor="#667eea"
            colors={['#667eea']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="library-outline" size={48} color="#667eea" />
            </View>
            <Text style={styles.emptyText}>书架空空如也</Text>
            <Text style={styles.emptySubtext}>快去发现或搜索喜欢的小说吧</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.emptyButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="compass-outline" size={18} color="#fff" />
                <Text style={styles.emptyButtonText}>去发现</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  toolbarBtn: {
    padding: 8,
  },
  toolbarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4757',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 13,
    marginLeft: 4,
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  gridContent: {
    paddingHorizontal: GRID_SPACING,
  },
  // Grid styles
  gridItem: {
    width: BOOK_WIDTH,
    marginHorizontal: GRID_SPACING / 2,
    marginBottom: 20,
    alignItems: 'center',
  },
  selectedItem: {
    opacity: 0.7,
  },
  checkbox: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 10,
  },
  checkboxInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  coverContainer: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  gridCover: {
    width: BOOK_WIDTH,
    height: BOOK_HEIGHT,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  bookSpine: {
    position: 'absolute',
    left: 0,
    top: 3,
    bottom: 3,
    width: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  coverText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  updateBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff4757',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gridTitle: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    color: '#333',
    lineHeight: 18,
  },
  progressBar: {
    width: BOOK_WIDTH * 0.8,
    height: 3,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 1.5,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 1.5,
  },
  progressText: {
    fontSize: 10,
    color: '#999',
    marginTop: 3,
  },
  // List styles
  listItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  listItemSelected: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  listCheckbox: {
    justifyContent: 'center',
    marginRight: 12,
  },
  listCoverContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  listCover: {
    width: 70,
    height: 95,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  listCoverText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  listInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  listAuthor: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaTag: {
    backgroundColor: 'rgba(102, 126, 234, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  metaTagText: {
    fontSize: 11,
    color: '#667eea',
    fontWeight: '500',
  },
  metaChapter: {
    fontSize: 12,
    color: '#999',
  },
  listProgress: {
    fontSize: 12,
    color: '#667eea',
  },
  progressCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  progressCircleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#667eea',
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default BookshelfView;
