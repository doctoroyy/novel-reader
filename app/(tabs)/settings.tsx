import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useSourceStore } from '../../src/stores';
import {
  getAllReplaceRules, importReplaceRules, deleteAllBookSources
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
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
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
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
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

  const handleClearAllSources = () => {
    Alert.alert(
      '清空书源',
      `确定要删除全部 ${sources.length} 个书源吗？此操作不可恢复！`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清空',
          style: 'destructive',
          onPress: async () => {
            await deleteAllBookSources();
            await loadSources();
            Alert.alert('成功', '已清空所有书源，请重新导入');
          },
        },
      ]
    );
  };

  const MenuItem = ({ 
    icon, 
    iconColor = '#667eea',
    title, 
    subtitle, 
    onPress,
    showArrow = true 
  }: { 
    icon: string; 
    iconColor?: string;
    title: string; 
    subtitle?: string; 
    onPress: () => void;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && <Ionicons name="chevron-forward" size={18} color="#c0c0c0" />}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 用户头部 */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color="#667eea" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>书友</Text>
            <Text style={styles.userSlogan}>享受阅读的时光 ✨</Text>
          </View>
        </LinearGradient>

        {/* 统计卡片 */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>阅读天数</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sources.length}</Text>
            <Text style={styles.statLabel}>书源</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{replaceRuleCount}</Text>
            <Text style={styles.statLabel}>替换规则</Text>
          </View>
        </View>

        {/* 书源管理 */}
        <SectionHeader title="书源管理" />
        <View style={styles.section}>
          <MenuItem
            icon="library"
            title="书源列表"
            subtitle={`${sources.length} 个书源`}
            onPress={() => router.push('/source/list' as any)}
          />
          <MenuItem
            icon="cloud-download"
            iconColor="#4facfe"
            title="网络导入"
            onPress={handleImportFromUrl}
          />
          <MenuItem
            icon="document"
            iconColor="#43e97b"
            title="本地导入"
            onPress={handleImportBookSources}
          />
          <MenuItem
            icon="trash"
            iconColor="#ff3b30"
            title="清空书源"
            subtitle="删除全部书源后重新导入"
            onPress={handleClearAllSources}
          />
        </View>

        {/* 替换净化 */}
        <SectionHeader title="替换净化" />
        <View style={styles.section}>
          <MenuItem
            icon="swap-horizontal"
            iconColor="#fa709a"
            title="替换规则"
            subtitle={`${replaceRuleCount} 条规则`}
            onPress={() => router.push('/replace/list' as any)}
          />
          <MenuItem
            icon="document-attach"
            iconColor="#f5576c"
            title="导入规则"
            onPress={handleImportReplaceRules}
          />
        </View>

        {/* 书架管理 */}
        <SectionHeader title="书架管理" />
        <View style={styles.section}>
          <MenuItem
            icon="folder-open"
            iconColor="#ffecd2"
            title="分组管理"
            onPress={() => router.push('/bookshelf/groups' as any)}
          />
        </View>

        {/* 通用设置 */}
        <SectionHeader title="通用" />
        <View style={styles.section}>
          <MenuItem
            icon="cloud-upload"
            iconColor="#a8edea"
            title="备份与恢复"
            onPress={() => router.push('/settings/backup' as any)}
          />
          <MenuItem
            icon="trash"
            iconColor="#ff6b6b"
            title="清除缓存"
            onPress={() => {
              Alert.alert('清除缓存', '确定要清除所有缓存吗？', [
                { text: '取消', style: 'cancel' },
                { text: '确定', style: 'destructive', onPress: () => {} },
              ]);
            }}
          />
          <MenuItem
            icon="information-circle"
            iconColor="#74b9ff"
            title="关于应用"
            onPress={() => {
              Alert.alert('小说阅读器', '版本 1.0.0\n\n基于 Legado 设计理念开发\nReact Native + Expo');
            }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>小说阅读器 · 简约而不简单</Text>
          <Text style={styles.footerVersion}>v1.0.0</Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  userSlogan: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    paddingVertical: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#f0f0f0',
    alignSelf: 'center',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    marginTop: 24,
    marginBottom: 10,
    marginLeft: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a2e',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    fontSize: 13,
    color: '#bbb',
  },
  footerVersion: {
    fontSize: 11,
    color: '#ddd',
    marginTop: 4,
  },
});
