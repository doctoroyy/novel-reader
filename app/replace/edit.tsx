import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Alert
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ReplaceRule } from '../../src/types';
import {
  getReplaceRuleById, addReplaceRule, updateReplaceRule
} from '../../src/services';

export default function ReplaceRuleEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [pattern, setPattern] = useState('');
  const [replacement, setReplacement] = useState('');
  const [scope, setScope] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    if (id) {
      loadRule();
    }
  }, [id]);

  const loadRule = async () => {
    if (!id) return;
    const rule = await getReplaceRuleById(id);
    if (rule) {
      setName(rule.name);
      setGroup(rule.group || '');
      setPattern(rule.pattern);
      setReplacement(rule.replacement);
      setScope(rule.scope || '');
      setIsRegex(rule.isRegex);
      setIsEnabled(rule.isEnabled);
    }
  };

  const handleTest = () => {
    if (!testText || !pattern) {
      Alert.alert('提示', '请输入测试文本和匹配规则');
      return;
    }

    try {
      let result: string;
      if (isRegex) {
        result = testText.replace(new RegExp(pattern, 'g'), replacement);
      } else {
        result = testText.split(pattern).join(replacement);
      }
      setTestResult(result);
    } catch (error: any) {
      Alert.alert('正则错误', error.message);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请输入规则名称');
      return;
    }
    if (!pattern.trim()) {
      Alert.alert('提示', '请输入匹配规则');
      return;
    }

    try {
      const rule: ReplaceRule = {
        id: id || '',
        name: name.trim(),
        group: group.trim() || undefined,
        pattern: pattern,
        replacement: replacement,
        scope: scope.trim() || undefined,
        isRegex,
        isEnabled,
        order: 0,
      };

      if (isEditing) {
        await updateReplaceRule(rule);
      } else {
        await addReplaceRule(rule);
      }

      router.back();
    } catch (error: any) {
      Alert.alert('保存失败', error.message);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? '编辑规则' : '新建规则',
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>保存</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.label}>规则名称 *</Text>
          <TextInput
            style={styles.input}
            placeholder="输入规则名称"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>分组</Text>
          <TextInput
            style={styles.input}
            placeholder="输入分组名称（可选）"
            value={group}
            onChangeText={setGroup}
          />

          <Text style={styles.label}>匹配规则 *</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="输入要匹配的文本或正则表达式"
            value={pattern}
            onChangeText={setPattern}
            multiline
          />

          <Text style={styles.label}>替换为</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="替换后的文本（留空表示删除）"
            value={replacement}
            onChangeText={setReplacement}
            multiline
          />

          <Text style={styles.label}>作用范围</Text>
          <TextInput
            style={styles.input}
            placeholder="留空表示对所有书籍生效"
            value={scope}
            onChangeText={setScope}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>使用正则表达式</Text>
            <Switch
              value={isRegex}
              onValueChange={setIsRegex}
              trackColor={{ false: '#e0e0e0', true: '#4CD964' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>启用规则</Text>
            <Switch
              value={isEnabled}
              onValueChange={setIsEnabled}
              trackColor={{ false: '#e0e0e0', true: '#4CD964' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* 测试区域 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>规则测试</Text>
          <TextInput
            style={[styles.input, styles.testInput]}
            placeholder="输入测试文本"
            value={testText}
            onChangeText={setTestText}
            multiline
          />
          <TouchableOpacity style={styles.testButton} onPress={handleTest}>
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.testButtonText}>测试</Text>
          </TouchableOpacity>
          {testResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>替换结果：</Text>
              <Text style={styles.resultText}>{testResult}</Text>
            </View>
          )}
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
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  codeInput: {
    fontFamily: 'monospace',
    minHeight: 60,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  switchLabel: {
    fontSize: 15,
    color: '#333',
  },
  testInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 6,
  },
  resultBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  resultLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
});
