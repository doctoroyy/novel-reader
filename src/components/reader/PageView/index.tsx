import React, { useRef, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
  PanResponder,
  TouchableWithoutFeedback,
} from 'react-native';
import { PageMode, ReadConfig } from '../../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface PageViewProps {
  content: string;
  config: ReadConfig;
  mode: PageMode;
  chapterTitle?: string;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onTapCenter?: () => void;
}

interface Page {
  index: number;
  content: string;
}

// 分页算法：将内容按行分割成页
function paginateContent(
  content: string,
  config: ReadConfig,
  containerHeight: number,
  containerWidth: number
): Page[] {
  const { fontSize, lineHeight, paragraphSpacing, paddingVertical, indent } = config;
  const lineHeightPx = fontSize * lineHeight;
  const availableHeight = containerHeight - paddingVertical * 2 - 60; // 留出顶部章节标题空间
  const availableWidth = containerWidth - config.paddingHorizontal * 2;
  
  // 估算每行字符数
  const charsPerLine = Math.floor(availableWidth / fontSize);
  // 估算每页行数
  const linesPerPage = Math.floor(availableHeight / lineHeightPx);

  const paragraphs = content.split('\n').filter(p => p.trim());
  const pages: Page[] = [];
  let currentPageLines: string[] = [];
  let currentLineCount = 0;

  const indentStr = indent > 0 ? '　'.repeat(indent) : '';

  for (const paragraph of paragraphs) {
    const fullParagraph = indentStr + paragraph;
    // 将段落分割成行
    const lines: string[] = [];
    let remaining = fullParagraph;
    
    while (remaining.length > 0) {
      const line = remaining.substring(0, charsPerLine);
      lines.push(line);
      remaining = remaining.substring(charsPerLine);
    }

    for (const line of lines) {
      if (currentLineCount >= linesPerPage) {
        // 当前页满了，创建新页
        pages.push({
          index: pages.length,
          content: currentPageLines.join('\n'),
        });
        currentPageLines = [];
        currentLineCount = 0;
      }
      currentPageLines.push(line);
      currentLineCount++;
    }

    // 段落间距占用的行数
    const spacingLines = Math.ceil(paragraphSpacing / lineHeightPx);
    currentLineCount += spacingLines;
  }

  // 最后一页
  if (currentPageLines.length > 0) {
    pages.push({
      index: pages.length,
      content: currentPageLines.join('\n'),
    });
  }

  return pages.length > 0 ? pages : [{ index: 0, content: '' }];
}

// 滑动翻页组件 - 使用原生 Animated
const SlidePageView: React.FC<PageViewProps & { pages: Page[] }> = ({
  pages,
  config,
  chapterTitle,
  onPrevPage,
  onNextPage,
  onTapCenter,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(lastOffset.current + gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = SCREEN_WIDTH / 4;
        let targetPage = currentPage;

        if (gestureState.dx > threshold && currentPage > 0) {
          targetPage = currentPage - 1;
        } else if (gestureState.dx < -threshold && currentPage < pages.length - 1) {
          targetPage = currentPage + 1;
        }

        const toValue = -targetPage * SCREEN_WIDTH;
        lastOffset.current = toValue;
        setCurrentPage(targetPage);

        Animated.spring(translateX, {
          toValue,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();

        // 触发章节切换
        if (gestureState.dx > threshold && currentPage === 0) {
          onPrevPage?.();
        } else if (gestureState.dx < -threshold && currentPage === pages.length - 1) {
          onNextPage?.();
        }
      },
    })
  ).current;

  const handleTap = (x: number) => {
    const leftArea = SCREEN_WIDTH * 0.3;
    const rightArea = SCREEN_WIDTH * 0.7;

    if (x < leftArea) {
      if (currentPage > 0) {
        const targetPage = currentPage - 1;
        const toValue = -targetPage * SCREEN_WIDTH;
        lastOffset.current = toValue;
        setCurrentPage(targetPage);
        Animated.spring(translateX, {
          toValue,
          useNativeDriver: true,
        }).start();
      } else {
        onPrevPage?.();
      }
    } else if (x > rightArea) {
      if (currentPage < pages.length - 1) {
        const targetPage = currentPage + 1;
        const toValue = -targetPage * SCREEN_WIDTH;
        lastOffset.current = toValue;
        setCurrentPage(targetPage);
        Animated.spring(translateX, {
          toValue,
          useNativeDriver: true,
        }).start();
      } else {
        onNextPage?.();
      }
    } else {
      onTapCenter?.();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={(e) => handleTap(e.nativeEvent.locationX)}>
        <View style={styles.container} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.pagesContainer,
              { transform: [{ translateX }] },
            ]}
          >
            {pages.map((page, index) => (
              <View
                key={index}
                style={[
                  styles.page,
                  {
                    backgroundColor: config.bgColor,
                    paddingHorizontal: config.paddingHorizontal,
                    paddingVertical: config.paddingVertical,
                  },
                ]}
              >
                {index === 0 && chapterTitle && (
                  <Text style={[styles.chapterTitle, { color: config.textColor }]}>
                    {chapterTitle}
                  </Text>
                )}
                <Text
                  style={{
                    color: config.textColor,
                    fontSize: config.fontSize,
                    lineHeight: config.fontSize * config.lineHeight,
                  }}
                >
                  {page.content}
                </Text>
              </View>
            ))}
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
      {/* 页码指示器 */}
      <View style={styles.pageIndicator}>
        <Text style={[styles.pageIndicatorText, { color: config.textColor }]}>
          {currentPage + 1} / {pages.length}
        </Text>
      </View>
    </View>
  );
};

// 滚动模式组件
const ScrollPageView: React.FC<PageViewProps> = ({
  content,
  config,
  chapterTitle,
  onPrevPage,
  onNextPage,
  onTapCenter,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const indentStr = config.indent > 0 ? '　'.repeat(config.indent) : '';
  const paragraphs = content.split('\n').filter(p => p.trim());

  const handleTap = useCallback((x: number) => {
    const leftArea = SCREEN_WIDTH * 0.3;
    const rightArea = SCREEN_WIDTH * 0.7;

    if (x < leftArea) {
      onPrevPage?.();
    } else if (x > rightArea) {
      onNextPage?.();
    } else {
      onTapCenter?.();
    }
  }, [onPrevPage, onNextPage, onTapCenter]);

  return (
    <TouchableWithoutFeedback onPress={(e) => handleTap(e.nativeEvent.locationX)}>
      <ScrollView
        ref={scrollRef}
        style={[styles.scrollContainer, { backgroundColor: config.bgColor }]}
        contentContainerStyle={{
          paddingHorizontal: config.paddingHorizontal,
          paddingVertical: config.paddingVertical,
        }}
        showsVerticalScrollIndicator={false}
      >
        {chapterTitle && (
          <Text
            style={[
              styles.chapterTitle,
              { color: config.textColor },
            ]}
          >
            {chapterTitle}
          </Text>
        )}
        {paragraphs.map((paragraph, index) => (
          <Text
            key={index}
            style={{
              color: config.textColor,
              fontSize: config.fontSize,
              lineHeight: config.fontSize * config.lineHeight,
              marginBottom: config.paragraphSpacing,
              textAlign: 'justify',
            }}
          >
            {indentStr}{paragraph}
          </Text>
        ))}
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

// 主组件
export const PageView: React.FC<PageViewProps> = (props) => {
  const { content, config, mode } = props;

  const pages = useMemo(() => {
    if (mode === PageMode.SCROLL || mode === PageMode.NONE) {
      return [];
    }
    return paginateContent(
      content,
      config,
      SCREEN_HEIGHT,
      SCREEN_WIDTH
    );
  }, [content, config, mode]);

  const renderContent = () => {
    switch (mode) {
      case PageMode.SLIDE:
      case PageMode.COVER:
        return <SlidePageView {...props} pages={pages} />;
      case PageMode.SCROLL:
      case PageMode.NONE:
      default:
        return <ScrollPageView {...props} />;
    }
  };

  return renderContent();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pagesContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  scrollContainer: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pageIndicatorText: {
    fontSize: 12,
    opacity: 0.6,
  },
});

export default PageView;
