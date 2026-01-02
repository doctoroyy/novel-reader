import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Switch, TextInput, Alert, RefreshControl, SafeAreaView
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookSource } from '../../src/types';
import { useSourceStore } from '../../src/stores';

const THEME_COLOR = '#667eea';

export default function SourceListScreen() {
  const router = useRouter();
  const { sources, loading, loadSources, toggleSource, deleteSource } = useSourceStore();
  const [searchText, setSearchText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  
  // 选择模式
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSources();
  }, []);

  const groups = useMemo(() => {
    const groupSet = new Set<string>();
    sources.forEach((s) => {
      if (s.bookSourceGroup) {
        s.bookSourceGroup.split(',').forEach((g) => groupSet.add(g.trim()));
      }
    });
    return Array.from(groupSet).sort();
  }, [sources]);

  const filteredSources = useMemo(() => {
    let result = sources;
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      result = result.filter(
        (s) =>
          s.bookSourceName.toLowerCase().includes(query) ||
          s.bookSourceUrl.toLowerCase().includes(query) ||
          s.bookSourceGroup?.toLowerCase().includes(query)
      );
    }
    if (selectedGroup) {
      result = result.filter((s) => s.bookSourceGroup?.includes(selectedGroup));
    }
    return result;
  }, [sources, searchText, selectedGroup]);

  const handleToggle = async (source: BookSource) => {
    await toggleSource(source.id, !source.enabled);
  };

  const handleLongPress = (source: BookSource) => {
    setSelectionMode(true);
    setSelectedIds(new Set([source.id]));
  };

  const handlePress = (source: BookSource) => {
    if (selectionMode) {
      const newSet = new Set(selectedIds);
      if (newSet.has(source.id)) {
        newSet.delete(source.id);
      } else {
        newSet.add(source.id);
      }
      setSelectedIds(newSet);
      if (newSet.size === 0) {
        setSelectionMode(false);
      }
    } else {
      router.push(`/source/edit?id=${source.id}` as any);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredSources.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSources.map((s) => s.id)));
    }
  };

  const handleRevertSelection = () => {
    const newSet = new Set<string>();
    filteredSources.forEach((s) => {
      if (!selectedIds.has(s.id)) {
        newSet.add(s.id);
      }
    });
    setSelectedIds(newSet);
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      '删除书源',
      `确定删除选中的 ${selectedIds.size} 个书源吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            for (const id of selectedIds) {
              await deleteSource(id);
            }
            setSelectionMode(false);
            setSelectedIds(new Set());
          },
        },
      ]
    );
  };

  const handleBatchEnable = async (enable: boolean) => {
    for (const id of selectedIds) {
      await toggleSource(id, enable);
    }
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const renderItem = ({ item }: { item: BookSource }) => {
    const isSelected = selectedIds.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.itemSelected]}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        {selectionMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
        )}
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.bookSourceName || '未命名书源'}
            </Text>
            <View style={styles.itemBadges}>
              {item.enabledExplore && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>发现</Text>
                </View>
              )}
              {item.searchUrl && (
                <View style={[styles.badge, styles.searchBadge]}>
                  <Text style={[styles.badgeText, styles.searchBadgeText]}>搜索</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.itemUrl} numberOfLines={1}>
            {item.bookSourceUrl}
          </Text>
          {item.bookSourceGroup && (
            <Text style={styles.itemGroup}>{item.bookSourceGroup}</Text>
          )}
        </View>
        {!selectionMode && (
          <Switch
            value={item.enabled}
            onValueChange={() => handleToggle(item)}
            trackColor={{ false: '#e0e0e0', true: '#4CD964' }}
            thumbColor="#fff"
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* 标题栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          if (selectionMode) {
            cancelSelection();
          } else {
            router.back();
          }
        }}>
          <Ionicons name={selectionMode ? "close" : "arrow-back"} size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectionMode ? `已选 ${selectedIds.size} 项` : '书源管理'}
        </Text>
        <View style={styles.headerRight}>
          {!selectionMode && (
            <>
              <Text style={styles.countBadge}>{filteredSources.length}</Text>
              <TouchableOpacity style={styles.headerBtn}>
                <Ionicons name="add" size={24} color={THEME_COLOR} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.container}>
        {/* 搜索栏 */}
        {!selectionMode && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="搜索书源名称、网址或分组"
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 分组筛选 */}
        {!selectionMode && groups.length > 0 && (
          <View style={styles.groupRow}>
            <FlatList
              horizontal
              data={['全部', ...groups]}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.groupList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.groupChip,
                    (item === '全部' ? !selectedGroup : selectedGroup === item) &&
                      styles.groupChipActive,
                  ]}
                  onPress={() => setSelectedGroup(item === '全部' ? null : item)}
                >
                  <Text
                    style={[
                      styles.groupChipText,
                      (item === '全部' ? !selectedGroup : selectedGroup === item) &&
                        styles.groupChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* 列表 */}
        <FlatList
          data={filteredSources}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={loading} 
              onRefresh={loadSources}
              tintColor={THEME_COLOR}
              colors={[THEME_COLOR]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="library-outline" size={40} color={THEME_COLOR} />
              </View>
              <Text style={styles.emptyText}>暂无书源</Text>
              <Text style={styles.emptyHint}>长按书源可进入选择模式</Text>
            </View>
          }
        />
      </View>

      {/* 底部操作栏 - legado 风格 */}
      {selectionMode && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionBarItem} onPress={handleSelectAll}>
            <Ionicons 
              name={selectedIds.size === filteredSources.length ? "checkbox" : "square-outline"} 
              size={22} 
              color={THEME_COLOR} 
            />
            <Text style={styles.actionBarText}>全选</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBarItem} onPress={handleRevertSelection}>
            <Ionicons name="swap-horizontal" size={22} color={THEME_COLOR} />
            <Text style={styles.actionBarText}>反选</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBarItem} onPress={() => handleBatchEnable(true)}>
            <Ionicons name="checkmark-circle" size={22} color="#4CD964" />
            <Text style={styles.actionBarText}>启用</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBarItem} onPress={() => handleBatchEnable(false)}>
            <Ionicons name="close-circle" size={22} color="#ff9500" />
            <Text style={styles.actionBarText}>禁用</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBarItem} onPress={handleBatchDelete}>
            <Ionicons name="trash" size={22} color="#ff3b30" />
            <Text style={[styles.actionBarText, { color: '#ff3b30' }]}>删除</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    color: THEME_COLOR,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 12,
  },
  headerBtn: {
    padding: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
  },
  groupRow: {
    marginBottom: 8,
  },
  groupList: {
    paddingHorizontal: 16,
  },
  groupChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  groupChipActive: {
    backgroundColor: THEME_COLOR,
  },
  groupChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  groupChipTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemSelected: {
    backgroundColor: 'rgba(102, 126, 234, 0.08)',
    borderColor: THEME_COLOR,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: THEME_COLOR,
    borderColor: THEME_COLOR,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
  },
  itemBadges: {
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: 'rgba(102, 126, 234, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: THEME_COLOR,
  },
  searchBadge: {
    backgroundColor: 'rgba(76, 217, 100, 0.12)',
  },
  searchBadgeText: {
    color: '#4CD964',
  },
  itemUrl: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  itemGroup: {
    fontSize: 11,
    color: THEME_COLOR,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyHint: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
  },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  actionBarItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionBarText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
});
