import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookGroup } from '../../src/types';
import {
  getAllBookGroups, addBookGroup, updateBookGroup, deleteBookGroup,
  getBookCountByGroup
} from '../../src/services';

interface GroupWithCount extends BookGroup {
  bookCount: number;
}

export default function GroupsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<BookGroup | null>(null);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const allGroups = await getAllBookGroups();
    const groupsWithCount: GroupWithCount[] = await Promise.all(
      allGroups.map(async (group) => ({
        ...group,
        bookCount: await getBookCountByGroup(group.id),
      }))
    );
    setGroups(groupsWithCount);
  };

  const handleAddGroup = () => {
    setEditingGroup(null);
    setGroupName('');
    setModalVisible(true);
  };

  const handleEditGroup = (group: BookGroup) => {
    if (group.id <= 0) {
      Alert.alert('提示', '系统分组不可编辑');
      return;
    }
    setEditingGroup(group);
    setGroupName(group.name);
    setModalVisible(true);
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('提示', '请输入分组名称');
      return;
    }

    try {
      if (editingGroup) {
        await updateBookGroup(editingGroup.id, groupName.trim());
      } else {
        await addBookGroup(groupName.trim());
      }
      setModalVisible(false);
      loadGroups();
    } catch (error: any) {
      Alert.alert('错误', error.message || '操作失败');
    }
  };

  const handleDeleteGroup = (group: BookGroup) => {
    if (group.id <= 0) {
      Alert.alert('提示', '系统分组不可删除');
      return;
    }

    Alert.alert(
      '删除分组',
      `确定删除分组"${group.name}"吗？该分组下的书籍将移动到"未分组"`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBookGroup(group.id);
              loadGroups();
            } catch (error: any) {
              Alert.alert('错误', error.message || '删除失败');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: GroupWithCount }) => {
    const isSystem = item.id <= 0;

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => handleEditGroup(item)}
        onLongPress={() => handleDeleteGroup(item)}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemIcon}>
            <Ionicons
              name={isSystem ? 'folder' : 'folder-outline'}
              size={24}
              color={isSystem ? '#007AFF' : '#666'}
            />
          </View>
          <View style={styles.itemText}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemCount}>{item.bookCount} 本书</Text>
          </View>
        </View>
        {!isSystem && (
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '分组管理',
          headerRight: () => (
            <TouchableOpacity onPress={handleAddGroup} style={styles.headerButton}>
              <Ionicons name="add" size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={groups}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无自定义分组</Text>
            </View>
          }
        />

        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingGroup ? '编辑分组' : '新建分组'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="请输入分组名称"
                value={groupName}
                onChangeText={setGroupName}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleSaveGroup}
                >
                  <Text style={styles.confirmButtonText}>确定</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  list: {
    padding: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemText: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  itemCount: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
