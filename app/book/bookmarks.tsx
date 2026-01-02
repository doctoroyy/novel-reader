import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Bookmark, Book } from '../../src/types';
import { getBookmarksByBookId, deleteBookmark, getBookById } from '../../src/services';

export default function BookmarksScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    const bookData = await getBookById(id);
    setBook(bookData);
    const marks = await getBookmarksByBookId(id);
    setBookmarks(marks);
  };

  const handleDelete = (bookmark: Bookmark) => {
    Alert.alert('删除书签', '确定要删除这个书签吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteBookmark(bookmark.id);
          loadData();
        },
      },
    ]);
  };

  const handleGoToChapter = (bookmark: Bookmark) => {
    if (book) {
      router.push(`/reader/${book.id}?chapter=${bookmark.chapterIndex}`);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: Bookmark }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => handleGoToChapter(item)}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.chapterName} numberOfLines={1}>
          {item.chapterName}
        </Text>
        <Text style={styles.time}>{formatTime(item.createTime)}</Text>
      </View>
      <Text style={styles.content} numberOfLines={2}>
        {item.content}
      </Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
      >
        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: book ? `${book.name} 的书签` : '书签',
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={bookmarks}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bookmark-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>暂无书签</Text>
              <Text style={styles.emptyHint}>
                在阅读时长按文字可添加书签
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
  list: {
    padding: 12,
    flexGrow: 1,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    position: 'relative',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chapterName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  content: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    paddingRight: 30,
  },
  deleteButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    padding: 4,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 8,
  },
});
