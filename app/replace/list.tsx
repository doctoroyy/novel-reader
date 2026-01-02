import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Switch, TextInput, Alert
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ReplaceRule } from '../../src/types';
import {
  getAllReplaceRules, toggleReplaceRule, deleteReplaceRule, reorderReplaceRules
} from '../../src/services';

export default function ReplaceRuleListScreen() {
  const router = useRouter();
  const [rules, setRules] = useState<ReplaceRule[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const allRules = await getAllReplaceRules();
    setRules(allRules);
  };

  const groups = React.useMemo(() => {
    const groupSet = new Set<string>();
    rules.forEach((r) => {
      if (r.group) {
        groupSet.add(r.group);
      }
    });
    return Array.from(groupSet).sort();
  }, [rules]);

  const filteredRules = React.useMemo(() => {
    let result = rules;

    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.pattern.toLowerCase().includes(query)
      );
    }

    if (selectedGroup) {
      result = result.filter((r) => r.group === selectedGroup);
    }

    return result;
  }, [rules, searchText, selectedGroup]);

  const handleToggle = async (rule: ReplaceRule) => {
    await toggleReplaceRule(rule.id, !rule.isEnabled);
    loadRules();
  };

  const handleDelete = (rule: ReplaceRule) => {
    Alert.alert(
      '删除规则',
      `确定删除 "${rule.name}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await deleteReplaceRule(rule.id);
            loadRules();
          },
        },
      ]
    );
  };

  const handleEdit = (rule: ReplaceRule) => {
    router.push(`/replace/edit?id=${rule.id}` as any);
  };

  const renderItem = ({ item }: { item: ReplaceRule }) => (
    <View style={styles.item}>
      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => handleEdit(item)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.isRegex && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>正则</Text>
            </View>
          )}
        </View>
        <Text style={styles.itemPattern} numberOfLines={1}>
          {item.pattern}
        </Text>
        <Text style={styles.itemReplacement} numberOfLines={1}>
          → {item.replacement || '(删除)'}
        </Text>
        {item.group && (
          <Text style={styles.itemGroup}>{item.group}</Text>
        )}
      </TouchableOpacity>
      <Switch
        value={item.isEnabled}
        onValueChange={() => handleToggle(item)}
        trackColor={{ false: '#e0e0e0', true: '#4CD964' }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: `替换规则 (${filteredRules.length})`,
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/replace/edit' as any)}
            >
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
            placeholder="搜索规则"
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
          data={filteredRules}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="swap-horizontal" size={48} color="#ccc" />
              <Text style={styles.emptyText}>暂无替换规则</Text>
              <Text style={styles.emptyHint}>点击右上角添加规则</Text>
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
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginRight: 12,
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
  badge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 10,
    color: '#007AFF',
  },
  itemPattern: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  itemReplacement: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  itemGroup: {
    fontSize: 11,
    color: '#007AFF',
    marginTop: 4,
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
