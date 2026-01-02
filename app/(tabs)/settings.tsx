import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useSourceStore } from '../../src/stores';
import {
  getAllBookSources, importBookSources, parseBookSourceJson,
  getAllReplaceRules, importReplaceRules
} from '../../src/services';

export default function SettingsScreen() {
  const router = useRouter();
  const { sources, loadSources, importSources } = useSourceStore();
  const [replaceRuleCount, setReplaceRuleCount] = useState(0);

  useEffect(() => {
    loadSources();
    loadReplaceRuleCount();
  }, []);

  const loadReplaceRuleCount = async () => {
    const rules = await getAllReplaceRules();
    setReplaceRuleCount(rules.length);
  };

  const handleImportBookSources = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      const count = await importSources(content);
      Alert.alert('导入成功', `成功导入 ${count} 个书源`);
    } catch (error) {
      Alert.alert('导入失败', '请确保文件格式正确');
    }
  };

  const handleImportFromUrl = () => {
    Alert.prompt(
      '网络导入书源',
      '请输入书源JSON地址',
      async (url) => {
        if (!url) return;
        try {
          const response = await fetch(url);
          const json = await response.text();
          const count = await importSources(json);
          Alert.alert('导入成功', `成功导入 ${count} 个书源`);
        } catch (error) {
          Alert.alert('导入失败', '请检查网址是否正确');
        }
      },
      'plain-text',
      '',
      'url'
    );
  };

  const handleImportReplaceRules = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      const rules = JSON.parse(content);
      const count = await importReplaceRules(Array.isArray(rules) ? rules : [rules]);
      Alert.alert('导入成功', `成功导入 ${count} 条替换规则`);
      loadReplaceRuleCount();
    } catch (error) {
      Alert.alert('导入失败', '请确保文件格式正确');
    }
  };

  const renderSection = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const renderItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity style={styles.item} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon as any} size={22} color="#666" style={styles.itemIcon} />
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (onPress && <Ionicons name="chevron-forward" size={20} color="#ccc" />)}
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ title: '设置' }} />
      <ScrollView style={styles.container}>
        {renderSection('书源管理')}
        <View style={styles.section}>
          {renderItem('library', '书源列表', `${sources.length} 个书源`, () => {
            // 打开书源管理页面
          })}
          {renderItem('cloud-download', '网络导入', undefined, handleImportFromUrl)}
          {renderItem('document', '本地导入', undefined, handleImportBookSources)}
        </View>

        {renderSection('替换净化')}
        <View style={styles.section}>
          {renderItem('swap-horizontal', '替换规则', `${replaceRuleCount} 条规则`, () => {
            // 打开替换规则页面
          })}
          {renderItem('document', '导入规则', undefined, handleImportReplaceRules)}
        </View>

        {renderSection('阅读设置')}
        <View style={styles.section}>
          {renderItem('text', '字体设置', undefined, () => {})}
          {renderItem('color-palette', '主题设置', undefined, () => {})}
          {renderItem('options', '翻页设置', undefined, () => {})}
        </View>

        {renderSection('通用')}
        <View style={styles.section}>
          {renderItem('folder', '缓存管理', undefined, () => {
            Alert.alert('清除缓存', '确定要清除所有缓存吗？', [
              { text: '取消', style: 'cancel' },
              { text: '确定', style: 'destructive', onPress: () => {} },
            ]);
          })}
          {renderItem('cloud-upload', '备份与恢复', undefined, () => {})}
          {renderItem('information-circle', '关于', undefined, () => {
            Alert.alert('小说阅读器', '版本 1.0.0\n\n参考 Legado 开发的跨平台阅读器');
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>小说阅读器 v1.0.0</Text>
          <Text style={styles.footerSubtext}>基于 React Native + Expo 开发</Text>
        </View>
      </ScrollView>
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
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#999',
  },
  footerSubtext: {
    fontSize: 11,
    color: '#bbb',
    marginTop: 4,
  },
});
