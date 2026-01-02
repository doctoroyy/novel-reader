import React, { useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
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
  const availableHeight = containerHeight - paddingVertical * 2;
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

// 滑动翻页组件
const SlidePageView: React.FC<PageViewProps & { pages: Page[] }> = ({
  pages,
  config,
  onPrevPage,
  onNextPage,
  onTapCenter,
}) => {
  const currentPage = useSharedValue(0);
  const translateX = useSharedValue(0);

  const goToPage = useCallback((index: number) => {
    'worklet';
    currentPage.value = index;
    translateX.value = withTiming(-index * SCREEN_WIDTH, { duration: 300 });
  }, []);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newX = -currentPage.value * SCREEN_WIDTH + event.translationX;
      translateX.value = newX;
    })
    .onEnd((event) => {
      const velocity = event.velocityX;
      const threshold = SCREEN_WIDTH / 4;

      let targetPage = currentPage.value;

      if (Math.abs(event.translationX) > threshold || Math.abs(velocity) > 500) {
        if (event.translationX > 0 && currentPage.value > 0) {
          targetPage = currentPage.value - 1;
        } else if (event.translationX < 0 && currentPage.value < pages.length - 1) {
          targetPage = currentPage.value + 1;
        }
      }

      goToPage(targetPage);
    });

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const x = event.x;
      const leftArea = SCREEN_WIDTH * 0.3;
      const rightArea = SCREEN_WIDTH * 0.7;

      if (x < leftArea) {
        if (currentPage.value > 0) {
          goToPage(currentPage.value - 1);
        } else {
          runOnJS(onPrevPage!)();
        }
      } else if (x > rightArea) {
        if (currentPage.value < pages.length - 1) {
          goToPage(currentPage.value + 1);
        } else {
          runOnJS(onNextPage!)();
        }
      } else {
        runOnJS(onTapCenter!)();
      }
    });

  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <Animated.View style={[styles.pagesContainer, animatedStyle]}>
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
        {/* 页码指示器 */}
        <View style={styles.pageIndicator}>
          <Text style={[styles.pageIndicatorText, { color: config.textColor }]}>
            {currentPage.value + 1} / {pages.length}
          </Text>
        </View>
      </View>
    </GestureDetector>
  );
};

// 覆盖翻页组件
const CoverPageView: React.FC<PageViewProps & { pages: Page[] }> = ({
  pages,
  config,
  onPrevPage,
  onNextPage,
  onTapCenter,
}) => {
  const currentPage = useSharedValue(0);
  const dragX = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const goToPage = useCallback((index: number) => {
    'worklet';
    currentPage.value = index;
    dragX.value = 0;
    isDragging.value = false;
  }, []);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      dragX.value = event.translationX;
    })
    .onEnd((event) => {
      const threshold = SCREEN_WIDTH / 3;

      if (event.translationX > threshold && currentPage.value > 0) {
        goToPage(currentPage.value - 1);
      } else if (event.translationX < -threshold && currentPage.value < pages.length - 1) {
        goToPage(currentPage.value + 1);
      } else {
        dragX.value = withTiming(0, { duration: 200 });
        isDragging.value = false;
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const x = event.x;
      const leftArea = SCREEN_WIDTH * 0.3;
      const rightArea = SCREEN_WIDTH * 0.7;

      if (x < leftArea) {
        if (currentPage.value > 0) {
          goToPage(currentPage.value - 1);
        } else {
          runOnJS(onPrevPage!)();
        }
      } else if (x > rightArea) {
        if (currentPage.value < pages.length - 1) {
          goToPage(currentPage.value + 1);
        } else {
          runOnJS(onNextPage!)();
        }
      } else {
        runOnJS(onTapCenter!)();
      }
    });

  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const topPageStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      dragX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [0, 0, SCREEN_WIDTH],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateX }],
      zIndex: 10,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        {/* 底页（下一页） */}
        {currentPage.value < pages.length - 1 && (
          <View
            style={[
              styles.coverPage,
              {
                backgroundColor: config.bgColor,
                paddingHorizontal: config.paddingHorizontal,
                paddingVertical: config.paddingVertical,
              },
            ]}
          >
            <Text
              style={{
                color: config.textColor,
                fontSize: config.fontSize,
                lineHeight: config.fontSize * config.lineHeight,
              }}
            >
              {pages[currentPage.value + 1]?.content}
            </Text>
          </View>
        )}

        {/* 顶页（当前页） */}
        <Animated.View
          style={[
            styles.coverPage,
            topPageStyle,
            {
              backgroundColor: config.bgColor,
              paddingHorizontal: config.paddingHorizontal,
              paddingVertical: config.paddingVertical,
            },
          ]}
        >
          <Text
            style={{
              color: config.textColor,
              fontSize: config.fontSize,
              lineHeight: config.fontSize * config.lineHeight,
            }}
          >
            {pages[currentPage.value]?.content}
          </Text>
        </Animated.View>

        {/* 页码 */}
        <View style={styles.pageIndicator}>
          <Text style={[styles.pageIndicatorText, { color: config.textColor }]}>
            {currentPage.value + 1} / {pages.length}
          </Text>
        </View>
      </View>
    </GestureDetector>
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
  );
};

// 主组件
export const PageView: React.FC<PageViewProps> = (props) => {
  const { content, config, mode } = props;

  const pages = useMemo(() => {
    if (mode === PageMode.SCROLL) {
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
        return <SlidePageView {...props} pages={pages} />;
      case PageMode.COVER:
        return <CoverPageView {...props} pages={pages} />;
      case PageMode.SCROLL:
      case PageMode.NONE:
      default:
        return <ScrollPageView {...props} />;
    }
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      {renderContent()}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
  coverPage: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    top: 0,
    left: 0,
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
