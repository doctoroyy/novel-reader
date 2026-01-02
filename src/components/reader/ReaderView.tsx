import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View, StyleSheet, StatusBar, Animated, Text, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useReaderStore } from '../../stores';
import { PageMode } from '../../types';
import { ReaderMenu } from './ReaderMenu';
import { ChapterList } from './ChapterList';
import { TTSPanel } from './TTSPanel';
import { PageView } from './PageView';

export const ReaderView: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    book, chapters, currentChapter, currentChapterIndex,
    content, loading, config, openBook, loadChapter, nextChapter, prevChapter, loadConfig
  } = useReaderStore();

  const [menuVisible, setMenuVisible] = useState(false);
  const [tocVisible, setTocVisible] = useState(false);
  const [ttsVisible, setTtsVisible] = useState(false);
  const menuOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 加载阅读配置
    loadConfig();
  }, []);

  useEffect(() => {
    if (id) {
      openBook(id);
      if (config.keepScreenOn) activateKeepAwakeAsync();
    }
    return () => {
      deactivateKeepAwake();
    };
  }, [id]);

  const toggleMenu = useCallback(() => {
    if (menuVisible) {
      Animated.timing(menuOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(menuOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [menuVisible]);

  const handleChapterSelect = useCallback((index: number) => {
    loadChapter(index);
    setTocVisible(false);
  }, [loadChapter]);

  const handlePrevPage = useCallback(() => {
    // 在分页模式下，如果是第一页则切换到上一章
    prevChapter();
  }, [prevChapter]);

  const handleNextPage = useCallback(() => {
    // 在分页模式下，如果是最后一页则切换到下一章
    nextChapter();
  }, [nextChapter]);

  const handleOpenTTS = useCallback(() => {
    toggleMenu();
    setTtsVisible(true);
  }, [toggleMenu]);

  if (!book) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>正在加载...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      <StatusBar hidden={!menuVisible} />

      {/* 内容区域 */}
      {loading ? (
        <View style={styles.chapterLoading}>
          <ActivityIndicator size="small" color={config.textColor} />
          <Text style={[styles.loadingText, { color: config.textColor }]}>加载中...</Text>
        </View>
      ) : (
        <PageView
          content={content}
          config={config}
          mode={config.pageMode}
          chapterTitle={currentChapter?.title}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          onTapCenter={toggleMenu}
        />
      )}

      {/* 菜单 */}
      {menuVisible && (
        <Animated.View style={[styles.menuOverlay, { opacity: menuOpacity }]}>
          <ReaderMenu
            onClose={toggleMenu}
            onOpenToc={() => {
              toggleMenu();
              setTocVisible(true);
            }}
            onOpenTTS={handleOpenTTS}
            onBack={() => router.back()}
          />
        </Animated.View>
      )}

      {/* 目录 */}
      {tocVisible && (
        <ChapterList
          chapters={chapters}
          currentIndex={currentChapterIndex}
          onSelect={handleChapterSelect}
          onClose={() => setTocVisible(false)}
        />
      )}

      {/* TTS 面板 */}
      <TTSPanel
        content={content}
        visible={ttsVisible}
        onClose={() => setTtsVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  chapterLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default ReaderView;
