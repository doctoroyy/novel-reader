import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, 
  StyleSheet, Switch, Alert, SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookSource } from '../../src/types';
import { getBookSourceById, addBookSource, deleteBookSource } from '../../src/services';

const THEME_COLOR = '#667eea';

type TabName = '基本' | '搜索' | '发现' | '详情' | '目录' | '正文';

const TABS: TabName[] = ['基本', '搜索', '发现', '详情', '目录', '正文'];

export default function SourceEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const isNew = !id || id === 'new';
  
  const [activeTab, setActiveTab] = useState<TabName>('基本');
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<Partial<BookSource>>({
    enabled: true,
    enabledExplore: true,
    weight: 0,
    customOrder: 0,
  });

  useEffect(() => {
    if (!isNew && id) {
      loadSource();
    }
  }, [id]);

  const loadSource = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const s = await getBookSourceById(id);
      if (s) setSource(s);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setSource(prev => ({ ...prev, [field]: value }));
  };

  const updateRuleField = (ruleType: string, field: string, value: string) => {
    setSource(prev => ({
      ...prev,
      [ruleType]: {
        ...(prev as any)[ruleType],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!source.bookSourceName || !source.bookSourceUrl) {
      Alert.alert('错误', '书源名称和URL不能为空');
      return;
    }

    setLoading(true);
    try {
      await addBookSource(source as any);
      Alert.alert('成功', '书源保存成功', [
        { text: '确定', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('错误', '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (isNew) return;
    Alert.alert('删除书源', '确定要删除这个书源吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteBookSource(id!);
          router.back();
        },
      },
    ]);
  };

  const renderInput = (
    label: string, 
    value: string | undefined, 
    onChange: (v: string) => void,
    multiline = false,
    placeholder?: string
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value || ''}
        onChangeText={onChange}
        placeholder={placeholder || `请输入${label}`}
        placeholderTextColor="#999"
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );

  const renderBasicTab = () => (
    <View style={styles.tabContent}>
      {renderInput('书源名称', source.bookSourceName, v => updateField('bookSourceName', v))}
      {renderInput('书源URL', source.bookSourceUrl, v => updateField('bookSourceUrl', v))}
      {renderInput('书源分组', source.bookSourceGroup, v => updateField('bookSourceGroup', v))}
      {renderInput('登录URL', source.header, v => updateField('header', v), false, 'JSON格式请求头')}
      {renderInput('书源注释', source.bookSourceComment, v => updateField('bookSourceComment', v), true)}
      
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>启用书源</Text>
        <Switch
          value={source.enabled}
          onValueChange={v => updateField('enabled', v)}
          trackColor={{ false: '#e0e0e0', true: THEME_COLOR }}
        />
      </View>
      
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>启用发现</Text>
        <Switch
          value={source.enabledExplore}
          onValueChange={v => updateField('enabledExplore', v)}
          trackColor={{ false: '#e0e0e0', true: THEME_COLOR }}
        />
      </View>

      {renderInput('权重', String(source.weight || 0), v => updateField('weight', parseInt(v) || 0))}
    </View>
  );

  const renderSearchTab = () => (
    <View style={styles.tabContent}>
      {renderInput('搜索地址', source.searchUrl, v => updateField('searchUrl', v), true, 
        'searchKey, searchPage, {{key}}, {{page}}')}
      
      <Text style={styles.sectionTitle}>搜索规则</Text>
      {renderInput('书籍列表', source.ruleSearch?.bookList, 
        v => updateRuleField('ruleSearch', 'bookList', v))}
      {renderInput('书名', source.ruleSearch?.name, 
        v => updateRuleField('ruleSearch', 'name', v))}
      {renderInput('作者', source.ruleSearch?.author, 
        v => updateRuleField('ruleSearch', 'author', v))}
      {renderInput('简介', source.ruleSearch?.intro, 
        v => updateRuleField('ruleSearch', 'intro', v), true)}
      {renderInput('分类', source.ruleSearch?.kind, 
        v => updateRuleField('ruleSearch', 'kind', v))}
      {renderInput('最新章节', source.ruleSearch?.lastChapter, 
        v => updateRuleField('ruleSearch', 'lastChapter', v))}
      {renderInput('封面', source.ruleSearch?.coverUrl, 
        v => updateRuleField('ruleSearch', 'coverUrl', v))}
      {renderInput('详情页', source.ruleSearch?.bookUrl, 
        v => updateRuleField('ruleSearch', 'bookUrl', v))}
    </View>
  );

  const renderExploreTab = () => (
    <View style={styles.tabContent}>
      {renderInput('发现地址', source.exploreUrl, v => updateField('exploreUrl', v), true,
        '分类名称::URL\n分类名称2::URL2')}
      
      <Text style={styles.sectionTitle}>发现规则</Text>
      {renderInput('书籍列表', source.ruleExplore?.bookList, 
        v => updateRuleField('ruleExplore', 'bookList', v))}
      {renderInput('书名', source.ruleExplore?.name, 
        v => updateRuleField('ruleExplore', 'name', v))}
      {renderInput('作者', source.ruleExplore?.author, 
        v => updateRuleField('ruleExplore', 'author', v))}
      {renderInput('封面', source.ruleExplore?.coverUrl, 
        v => updateRuleField('ruleExplore', 'coverUrl', v))}
      {renderInput('详情页', source.ruleExplore?.bookUrl, 
        v => updateRuleField('ruleExplore', 'bookUrl', v))}
    </View>
  );

  const renderBookInfoTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>详情规则</Text>
      {renderInput('书名', source.ruleBookInfo?.name, 
        v => updateRuleField('ruleBookInfo', 'name', v))}
      {renderInput('作者', source.ruleBookInfo?.author, 
        v => updateRuleField('ruleBookInfo', 'author', v))}
      {renderInput('简介', source.ruleBookInfo?.intro, 
        v => updateRuleField('ruleBookInfo', 'intro', v), true)}
      {renderInput('分类', source.ruleBookInfo?.kind, 
        v => updateRuleField('ruleBookInfo', 'kind', v))}
      {renderInput('最新章节', source.ruleBookInfo?.lastChapter, 
        v => updateRuleField('ruleBookInfo', 'lastChapter', v))}
      {renderInput('封面', source.ruleBookInfo?.coverUrl, 
        v => updateRuleField('ruleBookInfo', 'coverUrl', v))}
      {renderInput('目录URL', source.ruleBookInfo?.tocUrl, 
        v => updateRuleField('ruleBookInfo', 'tocUrl', v))}
    </View>
  );

  const renderTocTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>目录规则</Text>
      {renderInput('章节列表', source.ruleToc?.chapterList, 
        v => updateRuleField('ruleToc', 'chapterList', v))}
      {renderInput('章节名称', source.ruleToc?.chapterName, 
        v => updateRuleField('ruleToc', 'chapterName', v))}
      {renderInput('章节URL', source.ruleToc?.chapterUrl, 
        v => updateRuleField('ruleToc', 'chapterUrl', v))}
      {renderInput('下一页目录', source.ruleToc?.nextTocUrl, 
        v => updateRuleField('ruleToc', 'nextTocUrl', v))}
    </View>
  );

  const renderContentTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>正文规则</Text>
      {renderInput('正文', source.ruleContent?.content, 
        v => updateRuleField('ruleContent', 'content', v), true)}
      {renderInput('下一页正文', source.ruleContent?.nextContentUrl, 
        v => updateRuleField('ruleContent', 'nextContentUrl', v))}
      {renderInput('替换规则', source.ruleContent?.replaceRegex, 
        v => updateRuleField('ruleContent', 'replaceRegex', v), true,
        '正则##替换内容\n正则2##替换内容2')}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case '基本': return renderBasicTab();
      case '搜索': return renderSearchTab();
      case '发现': return renderExploreTab();
      case '详情': return renderBookInfoTab();
      case '目录': return renderTocTab();
      case '正文': return renderContentTab();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* 标题栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isNew ? '新建书源' : '编辑书源'}
        </Text>
        <View style={styles.headerRight}>
          {!isNew && (
            <TouchableOpacity style={styles.headerBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color="#ff3b30" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>保存</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab 栏 */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 内容区 */}
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderTabContent()}
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderBottomColor: '#e0e0e0',
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
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
  headerBtn: {
    padding: 8,
    marginRight: 8,
  },
  saveBtn: {
    backgroundColor: THEME_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    backgroundColor: '#f8f9fa',
    maxHeight: 44,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: THEME_COLOR,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME_COLOR,
    marginTop: 16,
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
  },
});
