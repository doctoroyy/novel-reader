import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Switch, TextInput, Alert, RefreshControl
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookSource } from '../../src/types';
import { useSourceStore } from '../../src/stores';

export default function SourceListScreen() {
  const router = useRouter();
  const { sources, loading, loadSources, toggleSource, deleteSource } = useSourceStore();
  const [searchText, setSearchText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    loadSources();
  }, []);

  const groups = React.useMemo(() => {
    const groupSet = new Set<string>();
    sources.forEach((s) => {
      if (s.bookSourceGroup) {
        s.bookSourceGroup.split(',').forEach((g) => groupSet.add(g.trim()));
      }
    });
    return Array.from(groupSet).sort();
  }, [sources]);

  const filteredSources = React.useMemo(() => {
    let result = sources;

    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      result = result.filter(
        (s) =>
          s.bookSourceName.toLowerCase().includes(query) ||
          s.bookSourceUrl.toLowerCase().includes(query)
      );
    }

    if (selectedGroup) {
      result = result.filter(
        (s) => s.bookSourceGroup?.includes(selectedGroup)
      );
    }

    return result;
  }, [sources, searchText, selectedGroup]);

  const handleToggle = async (source: BookSource) => {
    await toggleSource(source.id, !source.enabled);
  };

  const handleDelete = (source: BookSource) => {
    Alert.alert(
      '删除书源',
      `确定删除 "${source.bookSourceName}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => deleteSource(source.id),
        },
      ]
    );
  };

  const handleTest = (source: BookSource) => {
    router.push(`/source/debug?id=${source.id}` as any);
  };

  const renderItem = ({ item }: { item: BookSource }) => (
    <View style={styles.item}>
      <TouchableOpacity
        style={styles.itemContent}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.bookSourceName}
          </Text>
          <View style={styles.itemBadges}>
            {item.enabledExplore && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>发现</Text>
              </View>
            )}
            {item.searchUrl && (
              <View style={[styles.badge, styles.searchBadge]}>
                <Text style={styles.badgeText}>搜索</Text>
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
      </TouchableOpacity>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleTest(item)}
        >
          <Ionicons name="bug-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
        <Switch
          value={item.enabled}
          onValueChange={() => handleToggle(item)}
          trackColor={{ false: '#e0e0e0', true: '#4CD964' }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: `书源列表 (${filteredSources.length})`,
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="add" size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* 搜索栏 */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索书源"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* 分组筛选 */}
        {groups.length > 0 && (
          <View style={styles.groupRow}>
            <FlatList
              horizontal
              data={['全部', ...groups]}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
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
            <RefreshControl refreshing={loading} onRefresh={loadSources} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="library-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>暂无书源</Text>
              <Text style={styles.emptyHint}>请在设置中导入书源</Text>
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
  headerButton: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
  },
  groupRow: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  groupChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  groupChipActive: {
    backgroundColor: '#007AFF',
  },
  groupChipText: {
    fontSize: 13,
    color: '#666',
  },
  groupChipTextActive: {
    color: '#fff',
  },
  list: {
    padding: 12,
    paddingTop: 0,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
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
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  itemBadges: {
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  searchBadge: {
    backgroundColor: '#FFF3E0',
  },
  badgeText: {
    fontSize: 10,
    color: '#007AFF',
  },
  itemUrl: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  itemGroup: {
    fontSize: 11,
    color: '#007AFF',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginRight: 8,
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
