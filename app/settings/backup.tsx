import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  exportBackup, restoreBackupFromFile, createBackup, getBackupStats, BackupData
} from '../../src/services/backupService';

export default function BackupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setLoadingText('正在导出备份...');

    try {
      await exportBackup();
      Alert.alert('成功', '备份已导出');
    } catch (error: any) {
      Alert.alert('失败', error.message || '导出备份失败');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      const data = JSON.parse(content) as BackupData;
      const stats = getBackupStats(data);

      const dateStr = new Date(stats.timestamp).toLocaleString('zh-CN');

      Alert.alert(
        '确认恢复',
        `备份时间: ${dateStr}\n\n包含数据:\n- ${stats.books} 本书籍\n- ${stats.bookSources} 个书源\n- ${stats.rssSources} 个订阅源\n- ${stats.replaceRules} 条替换规则\n- ${stats.bookmarks} 个书签\n\n恢复将覆盖现有数据，确定继续吗？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '恢复',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              setLoadingText('正在恢复备份...');

              try {
                await restoreBackupFromFile(file.uri);
                Alert.alert('成功', '备份已恢复，请重启应用');
              } catch (error: any) {
                Alert.alert('失败', error.message || '恢复备份失败');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('失败', error.message || '读取文件失败');
    }
  };

  const renderItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void
  ) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemIcon}>
        <Ionicons name={icon as any} size={24} color="#007AFF" />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ title: '备份与恢复' }} />
      <ScrollView style={styles.container}>
        <Text style={styles.sectionTitle}>本地备份</Text>
        <View style={styles.section}>
          {renderItem(
            'cloud-upload',
            '导出备份',
            '将所有数据导出为文件',
            handleExport
          )}
          {renderItem(
            'cloud-download',
            '恢复备份',
            '从备份文件恢复数据',
            handleImport
          )}
        </View>

        <Text style={styles.sectionTitle}>WebDAV 同步</Text>
        <View style={styles.section}>
          {renderItem(
            'settings',
            'WebDAV 设置',
            '配置 WebDAV 服务器',
            () => {
              Alert.alert('提示', 'WebDAV 功能开发中');
            }
          )}
          {renderItem(
            'sync',
            '手动同步',
            '立即同步数据',
            () => {
              Alert.alert('提示', 'WebDAV 功能开发中');
            }
          )}
        </View>

        <View style={styles.notice}>
          <Ionicons name="information-circle" size={20} color="#999" />
          <Text style={styles.noticeText}>
            备份包含书籍、书源、替换规则、订阅源、书签等数据。不包含缓存的章节内容。
          </Text>
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loading}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 13,
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  section: {
    backgroundColor: '#fff',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    color: '#333',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginTop: 20,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#999',
    marginLeft: 8,
    lineHeight: 18,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});
