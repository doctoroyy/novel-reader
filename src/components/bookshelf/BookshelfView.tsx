import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, TextInput, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookshelfStore } from '../../stores';
import { Book } from '../../types';

interface Props {
  viewMode?: 'list' | 'grid';
}

export const BookshelfView: React.FC<Props> = ({ viewMode = 'grid' }) => {
  const router = useRouter();
  const { books, loading, loadBooks, removeFromShelf, currentGroup, setCurrentGroup } = useBookshelfStore();
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

  const renderBookItem = ({ item }: { item: Book }) => {
    const isSelected = selectedIds.has(item.id);

    if (viewMode === 'grid') {
      return (
        <TouchableOpacity
          style={[styles.gridItem, isSelected && styles.selectedItem]}
          onPress={() => handleBookPress(item)}
          onLongPress={() => handleBookLongPress(item)}
        >
          {selectMode && (
            <View style={styles.checkbox}>
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={20}
                color="#007AFF"
              />
            </View>
          )}
          <Image
            source={{ uri: item.coverUrl || item.customCover || 'https://via.placeholder.com/90x120/e0e0e0/999999?text=No+Cover' }}
            style={styles.gridCover}
          />
          <Text style={styles.gridTitle} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.gridAuthor} numberOfLines={1}>{item.author}</Text>
          {item.durChapterTitle && (
            <Text style={styles.gridProgress} numberOfLines={1}>
              {item.durChapterTitle}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.listItem, isSelected && styles.selectedItem]}
        onPress={() => handleBookPress(item)}
        onLongPress={() => handleBookLongPress(item)}
      >
        {selectMode && (
          <View style={styles.listCheckbox}>
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={24}
              color="#007AFF"
            />
          </View>
        )}
        <Image
          source={{ uri: item.coverUrl || item.customCover || 'https://via.placeholder.com/60x80/e0e0e0/999999?text=No+Cover' }}
          style={styles.listCover}
        />
        <View style={styles.listInfo}>
          <Text style={styles.listTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.listAuthor}>{item.author}</Text>
          <Text style={styles.listMeta}>
            {item.sourceName || '本地'} · {item.totalChapterNum}章
          </Text>
          {item.durChapterTitle && (
            <Text style={styles.listProgress} numberOfLines={1}>
              读至: {item.durChapterTitle}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 顶部工具栏 */}
      {selectMode && (
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={cancelSelect}>
            <Text style={styles.toolbarText}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>已选择 {selectedIds.size} 项</Text>
          <TouchableOpacity onPress={handleDelete}>
            <Text style={[styles.toolbarText, { color: '#FF3B30' }]}>删除</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 书籍列表 */}
      <FlatList
        data={books}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 3 : 1}
        key={viewMode}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadBooks} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>书架空空如也</Text>
            <Text style={styles.emptySubtext}>去搜索或导入书籍吧</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  toolbarText: {
    fontSize: 16,
    color: '#007AFF',
  },
  toolbarTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    padding: 8,
    flexGrow: 1,
  },
  gridItem: {
    flex: 1/3,
    padding: 8,
    alignItems: 'center',
  },
  selectedItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
  },
  checkbox: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 1,
  },
  gridCover: {
    width: 90,
    height: 120,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  gridTitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    color: '#333',
  },
  gridAuthor: {
    fontSize: 11,
    color: '#666',
  },
  gridProgress: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  listItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
  },
  listCheckbox: {
    justifyContent: 'center',
    marginRight: 12,
  },
  listCover: {
    width: 60,
    height: 80,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  listAuthor: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  listMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  listProgress: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
});
