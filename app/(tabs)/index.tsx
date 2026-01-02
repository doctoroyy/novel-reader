import React, { useState } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, 
  StatusBar, Platform, ActivityIndicator, Alert 
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { BookshelfView } from '../../src/components';
import { importTxtBook, importEpubToShelf } from '../../src/services';
import { useBookshelfStore } from '../../src/stores';

const THEME_COLOR = '#667eea';

export default function BookshelfScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [importing, setImporting] = useState(false);
  const loadBooks = useBookshelfStore(state => state.loadBooks);

  const handleImportLocal = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/epub+zip'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setImporting(true);
      const asset = result.assets[0];
      
      if (asset.name.toLowerCase().endsWith('.txt')) {
        await importTxtBook(asset.uri, asset.name);
        await loadBooks();
        Alert.alert('导入成功', `《${asset.name.replace(/\.txt$/i, '')}》已添加到书架`);
      } else if (asset.name.toLowerCase().endsWith('.epub')) {
        await importEpubToShelf(asset.uri);
        await loadBooks();
        Alert.alert('导入成功', `《${asset.name.replace(/\.epub$/i, '')}》已添加到书架`);
      }
    } catch (error) {
      console.error('导入失败:', error);
      Alert.alert('导入失败', '请重试或检查文件是否损坏');
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* 自定义标题栏 - 仿 legado */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的书架</Text>
        <View style={styles.headerActions}>
          {importing && (
            <ActivityIndicator size="small" color={THEME_COLOR} style={{ marginRight: 8 }} />
          )}
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            <Ionicons
              name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'}
              size={22}
              color={THEME_COLOR}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="search-outline" size={22} color={THEME_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleImportLocal}
            disabled={importing}
          >
            <Ionicons name="add-outline" size={24} color={THEME_COLOR} />
          </TouchableOpacity>
        </View>
      </View>

      <BookshelfView viewMode={viewMode} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
