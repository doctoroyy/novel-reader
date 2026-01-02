import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useReaderStore } from '../../stores';
import { DEFAULT_THEMES, PageMode } from '../../types';

interface Props {
  onClose: () => void;
  onOpenToc: () => void;
  onBack: () => void;
}

export const ReaderMenu: React.FC<Props> = ({ onClose, onOpenToc, onBack }) => {
  const { config, updateConfig, book, currentChapterIndex, chapters } = useReaderStore();

  const progress = chapters.length > 0
    ? ((currentChapterIndex + 1) / chapters.length * 100).toFixed(1)
    : 0;

  return (
    <View style={styles.container}>
      {/* 顶部菜单 */}
      <SafeAreaView style={styles.topMenu}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{book?.name}</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* 中间点击区域 */}
      <TouchableOpacity style={styles.centerArea} onPress={onClose} />

      {/* 底部菜单 */}
      <SafeAreaView style={styles.bottomMenu}>
        {/* 进度条 */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>第{currentChapterIndex + 1}章</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={chapters.length - 1}
            value={currentChapterIndex}
            onSlidingComplete={(value) => {
              // 跳转到对应章节
            }}
            minimumTrackTintColor="#fff"
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor="#fff"
          />
          <Text style={styles.progressText}>{progress}%</Text>
        </View>

        {/* 快捷操作 */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={onOpenToc}>
            <Ionicons name="list" size={24} color="#fff" />
            <Text style={styles.actionText}>目录</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="moon" size={24} color="#fff" />
            <Text style={styles.actionText}>夜间</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="text" size={24} color="#fff" />
            <Text style={styles.actionText}>设置</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="download" size={24} color="#fff" />
            <Text style={styles.actionText}>缓存</Text>
          </TouchableOpacity>
        </View>

        {/* 字体大小 */}
        <View style={styles.fontRow}>
          <Text style={styles.fontLabel}>字号</Text>
          <TouchableOpacity
            style={styles.fontButton}
            onPress={() => updateConfig({ fontSize: Math.max(12, config.fontSize - 1) })}
          >
            <Text style={styles.fontButtonText}>A-</Text>
          </TouchableOpacity>
          <Text style={styles.fontValue}>{config.fontSize}</Text>
          <TouchableOpacity
            style={styles.fontButton}
            onPress={() => updateConfig({ fontSize: Math.min(32, config.fontSize + 1) })}
          >
            <Text style={styles.fontButtonText}>A+</Text>
          </TouchableOpacity>
        </View>

        {/* 主题选择 */}
        <View style={styles.themeRow}>
          {DEFAULT_THEMES.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.themeButton,
                { backgroundColor: theme.bgColor },
                config.bgColor === theme.bgColor && styles.themeSelected,
              ]}
              onPress={() => updateConfig({
                bgColor: theme.bgColor,
                textColor: theme.textColor,
              })}
            >
              <Text style={[styles.themeText, { color: theme.textColor }]}>
                {theme.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topMenu: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  iconButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 8,
  },
  centerArea: {
    flex: 1,
  },
  bottomMenu: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    width: 60,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fontLabel: {
    color: '#fff',
    fontSize: 14,
    marginRight: 16,
  },
  fontButton: {
    width: 40,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  fontValue: {
    color: '#fff',
    fontSize: 16,
    marginHorizontal: 16,
    width: 30,
    textAlign: 'center',
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  themeButton: {
    width: 50,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeSelected: {
    borderColor: '#007AFF',
  },
  themeText: {
    fontSize: 12,
  },
});
