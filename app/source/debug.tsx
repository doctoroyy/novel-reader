import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookSource } from '../../src/types';
import { getBookSourceById, searchBooks, getBookInfo, getBookToc, getChapterContent } from '../../src/services';

type DebugStep = 'search' | 'bookInfo' | 'toc' | 'content';

interface DebugLog {
  time: string;
  type: 'info' | 'success' | 'error' | 'data';
  message: string;
  data?: any;
}

export default function SourceDebugScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [source, setSource] = useState<BookSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<DebugStep>('search');
  const [logs, setLogs] = useState<DebugLog[]>([]);
  
  // 输入
  const [keyword, setKeyword] = useState('斗破苍穹');
  const [bookUrl, setBookUrl] = useState('');
  const [chapterUrl, setChapterUrl] = useState('');
  
  // 结果
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [bookInfo, setBookInfo] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (id) {
      loadSource();
    }
  }, [id]);

  const loadSource = async () => {
    if (!id) return;
    const s = await getBookSourceById(id);
    setSource(s);
  };

  const addLog = (type: DebugLog['type'], message: string, data?: any) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setLogs(prev => [...prev, { time, type, message, data }]);
  };

  const clearLogs = () => setLogs([]);

  // 搜索测试
  const handleSearch = async () => {
    if (!source || !keyword) return;
    
    setLoading(true);
    clearLogs();
    setSearchResults([]);
    
    try {
      addLog('info', `开始搜索: ${keyword}`);
      addLog('info', `搜索URL: ${source.searchUrl}`);
      
      const startTime = Date.now();
      const results = await searchBooks(source, keyword);
      const elapsed = Date.now() - startTime;
      
      if (results.length > 0) {
        addLog('success', `搜索成功, 找到 ${results.length} 本书, 耗时 ${elapsed}ms`);
        setSearchResults(results);
        
        // 自动填充第一个结果的 URL
        if (results[0]?.bookUrl) {
          setBookUrl(results[0].bookUrl);
        }
        
        addLog('data', '搜索结果:', results.slice(0, 3));
      } else {
        addLog('error', '搜索无结果');
      }
    } catch (error: any) {
      addLog('error', `搜索失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 书籍详情测试
  const handleBookInfo = async () => {
    if (!source || !bookUrl) {
      Alert.alert('提示', '请先输入书籍URL');
      return;
    }
    
    setLoading(true);
    clearLogs();
    setBookInfo(null);
    
    try {
      addLog('info', `获取书籍详情: ${bookUrl}`);
      
      const startTime = Date.now();
      const info = await getBookInfo(source, bookUrl);
      const elapsed = Date.now() - startTime;
      
      if (info) {
        addLog('success', `获取成功, 耗时 ${elapsed}ms`);
        setBookInfo(info);
        addLog('data', '书籍信息:', info);
      } else {
        addLog('error', '获取书籍信息失败');
      }
    } catch (error: any) {
      addLog('error', `获取失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 目录测试
  const handleToc = async () => {
    if (!source || !bookUrl) {
      Alert.alert('提示', '请先输入书籍URL');
      return;
    }
    
    setLoading(true);
    clearLogs();
    setChapters([]);
    
    try {
      addLog('info', `获取目录: ${bookUrl}`);
      
      const mockBook = {
        id: 'debug',
        bookUrl,
        tocUrl: bookUrl,
      };
      
      const startTime = Date.now();
      const toc = await getBookToc(source, mockBook as any);
      const elapsed = Date.now() - startTime;
      
      if (toc.length > 0) {
        addLog('success', `获取成功, ${toc.length} 章, 耗时 ${elapsed}ms`);
        setChapters(toc);
        
        // 自动填充第一章 URL
        if (toc[0]?.url) {
          setChapterUrl(toc[0].url);
        }
        
        addLog('data', '目录预览:', toc.slice(0, 5));
      } else {
        addLog('error', '获取目录失败');
      }
    } catch (error: any) {
      addLog('error', `获取失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 正文测试
  const handleContent = async () => {
    if (!source || !chapterUrl) {
      Alert.alert('提示', '请先输入章节URL');
      return;
    }
    
    setLoading(true);
    clearLogs();
    setContent('');
    
    try {
      addLog('info', `获取正文: ${chapterUrl}`);
      
      const mockChapter = {
        id: 'debug',
        bookId: 'debug',
        index: 0,
        title: '测试章节',
        url: chapterUrl,
      };
      
      const startTime = Date.now();
      const text = await getChapterContent(source, mockChapter);
      const elapsed = Date.now() - startTime;
      
      if (text) {
        addLog('success', `获取成功, ${text.length} 字符, 耗时 ${elapsed}ms`);
        setContent(text);
        addLog('data', '正文预览:', text.substring(0, 500) + '...');
      } else {
        addLog('error', '获取正文失败');
      }
    } catch (error: any) {
      addLog('error', `获取失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderLogItem = (log: DebugLog, index: number) => {
    const colors = {
      info: '#666',
      success: '#4CD964',
      error: '#FF3B30',
      data: '#007AFF',
    };

    return (
      <View key={index} style={styles.logItem}>
        <Text style={[styles.logTime, { color: colors[log.type] }]}>
          [{log.time}]
        </Text>
        <Text style={[styles.logMessage, { color: colors[log.type] }]}>
          {log.message}
        </Text>
        {log.data && (
          <Text style={styles.logData}>
            {JSON.stringify(log.data, null, 2)}
          </Text>
        )}
      </View>
    );
  };

  if (!source) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `调试: ${source.bookSourceName}`,
        }}
      />
      <View style={styles.container}>
        {/* 步骤选择 */}
        <View style={styles.steps}>
          {(['search', 'bookInfo', 'toc', 'content'] as DebugStep[]).map((step) => (
            <TouchableOpacity
              key={step}
              style={[styles.stepButton, currentStep === step && styles.stepButtonActive]}
              onPress={() => setCurrentStep(step)}
            >
              <Text style={[styles.stepText, currentStep === step && styles.stepTextActive]}>
                {step === 'search' ? '搜索' :
                 step === 'bookInfo' ? '详情' :
                 step === 'toc' ? '目录' : '正文'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 输入区域 */}
        <View style={styles.inputSection}>
          {currentStep === 'search' && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="输入搜索关键词"
                value={keyword}
                onChangeText={setKeyword}
              />
              <TouchableOpacity
                style={styles.runButton}
                onPress={handleSearch}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="play" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 'bookInfo' && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="输入书籍URL"
                value={bookUrl}
                onChangeText={setBookUrl}
              />
              <TouchableOpacity
                style={styles.runButton}
                onPress={handleBookInfo}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="play" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 'toc' && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="输入书籍URL"
                value={bookUrl}
                onChangeText={setBookUrl}
              />
              <TouchableOpacity
                style={styles.runButton}
                onPress={handleToc}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="play" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 'content' && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="输入章节URL"
                value={chapterUrl}
                onChangeText={setChapterUrl}
              />
              <TouchableOpacity
                style={styles.runButton}
                onPress={handleContent}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="play" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 日志区域 */}
        <View style={styles.logSection}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>日志输出</Text>
            <TouchableOpacity onPress={clearLogs}>
              <Text style={styles.clearButton}>清除</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.logContainer}>
            {logs.map(renderLogItem)}
            {logs.length === 0 && (
              <Text style={styles.emptyLog}>点击运行按钮开始调试</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  steps: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stepButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 4,
  },
  stepButtonActive: {
    backgroundColor: '#007AFF',
  },
  stepText: {
    fontSize: 14,
    color: '#666',
  },
  stepTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  inputSection: {
    backgroundColor: '#fff',
    padding: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  runButton: {
    width: 44,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  logSection: {
    flex: 1,
    margin: 12,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  logTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    color: '#999',
    fontSize: 13,
  },
  logContainer: {
    flex: 1,
    padding: 12,
  },
  logItem: {
    marginBottom: 8,
  },
  logTime: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  logMessage: {
    fontSize: 13,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  logData: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#888',
    marginTop: 4,
    backgroundColor: '#2d2d2d',
    padding: 8,
    borderRadius: 4,
  },
  emptyLog: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
  },
});
