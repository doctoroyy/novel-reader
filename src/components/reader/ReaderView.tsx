import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, ActivityIndicator, StatusBar, Animated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useReaderStore } from '../../stores';
import { PageMode } from '../../types';
import { ReaderMenu } from './ReaderMenu';
import { ChapterList } from './ChapterList';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ReaderView: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    book, chapters, currentChapter, currentChapterIndex,
    content, loading, config, openBook, loadChapter, nextChapter, prevChapter
  } = useReaderStore();

  const [menuVisible, setMenuVisible] = useState(false);
  const [tocVisible, setTocVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const menuOpacity = useRef(new Animated.Value(0)).current;

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

  const handleTap = useCallback((x: number) => {
    if (!config.clickPageTurn) {
      toggleMenu();
      return;
    }

    const leftArea = SCREEN_WIDTH * 0.3;
    const rightArea = SCREEN_WIDTH * 0.7;

    if (x < leftArea) {
      prevChapter();
    } else if (x > rightArea) {
      nextChapter();
    } else {
      toggleMenu();
    }
  }, [config.clickPageTurn, prevChapter, nextChapter, toggleMenu]);

  const handleChapterSelect = useCallback((index: number) => {
    loadChapter(index);
    setTocVisible(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [loadChapter]);

  if (!book) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>正在加载...</Text>
      </View>
    );
  }

  const textIndent = config.indent > 0 ? '　'.repeat(config.indent) : '';
  const paragraphs = content.split('\n').filter(p => p.trim());

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      <StatusBar hidden={!menuVisible} />

      {/* 内容区域 */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={(e) => handleTap(e.nativeEvent.locationX)}
        style={styles.contentContainer}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentPadding,
            {
              paddingHorizontal: config.paddingHorizontal,
              paddingVertical: config.paddingVertical,
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 章节标题 */}
          <Text style={[styles.chapterTitle, { color: config.textColor }]}>
            {currentChapter?.title}
          </Text>

          {/* 正文内容 */}
          {loading ? (
            <View style={styles.chapterLoading}>
              <ActivityIndicator size="small" color={config.textColor} />
              <Text style={[styles.loadingText, { color: config.textColor }]}>加载中...</Text>
            </View>
          ) : (
            paragraphs.map((paragraph, index) => (
              <Text
                key={index}
                style={[
                  styles.paragraph,
                  {
                    color: config.textColor,
                    fontSize: config.fontSize,
                    lineHeight: config.fontSize * config.lineHeight,
                    marginBottom: config.paragraphSpacing,
                  }
                ]}
              >
                {textIndent}{paragraph}
              </Text>
            ))
          )}

          {/* 章节导航 */}
          <View style={styles.chapterNav}>
            <TouchableOpacity
              style={[styles.navButton, currentChapterIndex === 0 && styles.navButtonDisabled]}
              onPress={prevChapter}
              disabled={currentChapterIndex === 0}
            >
              <Text style={styles.navButtonText}>上一章</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, currentChapterIndex >= chapters.length - 1 && styles.navButtonDisabled]}
              onPress={nextChapter}
              disabled={currentChapterIndex >= chapters.length - 1}
            >
              <Text style={styles.navButtonText}>下一章</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableOpacity>

      {/* 菜单 */}
      {menuVisible && (
        <Animated.View style={[styles.menuOverlay, { opacity: menuOpacity }]}>
          <ReaderMenu
            onClose={toggleMenu}
            onOpenToc={() => {
              toggleMenu();
              setTocVisible(true);
            }}
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
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentPadding: {
    flexGrow: 1,
  },
  chapterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  chapterLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  paragraph: {
    textAlign: 'justify',
  },
  chapterNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  navButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#ccc',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
