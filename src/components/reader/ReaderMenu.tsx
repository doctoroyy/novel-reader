import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Brightness from 'expo-brightness';
import { useReaderStore } from '../../stores';
import { DEFAULT_THEMES, PageMode } from '../../types';

interface Props {
  onClose: () => void;
  onOpenToc: () => void;
  onOpenTTS: () => void;
  onBack: () => void;
}

const PAGE_MODES: { mode: PageMode; name: string; icon: string }[] = [
  { mode: PageMode.SLIDE, name: '滑动', icon: 'swap-horizontal' },
  { mode: PageMode.COVER, name: '覆盖', icon: 'document' },
  { mode: PageMode.SCROLL, name: '滚动', icon: 'reorder-four' },
  { mode: PageMode.NONE, name: '无', icon: 'remove' },
];

export const ReaderMenu: React.FC<Props> = ({ onClose, onOpenToc, onOpenTTS, onBack }) => {
  const { config, updateConfig, book, currentChapterIndex, chapters, loadChapter } = useReaderStore();
  const [showSettings, setShowSettings] = useState(false);
  const [brightness, setBrightness] = useState(config.brightness);
  const [followSystem, setFollowSystem] = useState(true);

  const progress = chapters.length > 0
    ? ((currentChapterIndex + 1) / chapters.length * 100).toFixed(1)
    : 0;

  const handleBrightnessChange = async (value: number) => {
    setBrightness(value);
    if (!followSystem) {
      await Brightness.setBrightnessAsync(value);
      await updateConfig({ brightness: value });
    }
  };

  const toggleFollowSystem = async () => {
    const newFollow = !followSystem;
    setFollowSystem(newFollow);
    if (newFollow) {
      await Brightness.useSystemBrightnessAsync();
    } else {
      await Brightness.setBrightnessAsync(brightness);
    }
  };

  const toggleNightMode = () => {
    const nightTheme = DEFAULT_THEMES.find(t => t.id === 'night');
    const defaultTheme = DEFAULT_THEMES.find(t => t.id === 'default');
    
    if (config.bgColor === nightTheme?.bgColor) {
      updateConfig({
        bgColor: defaultTheme!.bgColor,
        textColor: defaultTheme!.textColor,
      });
    } else {
      updateConfig({
        bgColor: nightTheme!.bgColor,
        textColor: nightTheme!.textColor,
      });
    }
  };

  const handleChapterSlide = (value: number) => {
    const index = Math.round(value);
    if (index !== currentChapterIndex) {
      loadChapter(index);
    }
  };

  const isNightMode = config.bgColor === DEFAULT_THEMES.find(t => t.id === 'night')?.bgColor;

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
            maximumValue={Math.max(0, chapters.length - 1)}
            value={currentChapterIndex}
            onSlidingComplete={handleChapterSlide}
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
          <TouchableOpacity style={styles.actionButton} onPress={toggleNightMode}>
            <Ionicons name={isNightMode ? 'sunny' : 'moon'} size={24} color="#fff" />
            <Text style={styles.actionText}>{isNightMode ? '日间' : '夜间'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettings(true)}>
            <Ionicons name="text" size={24} color="#fff" />
            <Text style={styles.actionText}>设置</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onOpenTTS}>
            <Ionicons name="volume-high" size={24} color="#fff" />
            <Text style={styles.actionText}>朗读</Text>
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

      {/* 设置面板 */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.settingsOverlay}>
          <TouchableOpacity
            style={styles.settingsBackdrop}
            onPress={() => setShowSettings(false)}
          />
          <View style={styles.settingsPanel}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>阅读设置</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* 亮度调节 */}
            <View style={styles.settingRow}>
              <Ionicons name="sunny-outline" size={20} color="#666" />
              <Slider
                style={styles.brightnessSlider}
                minimumValue={0}
                maximumValue={1}
                value={brightness}
                onValueChange={handleBrightnessChange}
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#e0e0e0"
                thumbTintColor="#007AFF"
                disabled={followSystem}
              />
              <Ionicons name="sunny" size={20} color="#666" />
            </View>
            <TouchableOpacity
              style={styles.followSystemRow}
              onPress={toggleFollowSystem}
            >
              <Text style={styles.followSystemText}>跟随系统</Text>
              <View style={[
                styles.checkbox,
                followSystem && styles.checkboxActive
              ]}>
                {followSystem && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>

            {/* 翻页模式 */}
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>翻页模式</Text>
              <View style={styles.pageModeRow}>
                {PAGE_MODES.map((item) => (
                  <TouchableOpacity
                    key={item.mode}
                    style={[
                      styles.pageModeButton,
                      config.pageMode === item.mode && styles.pageModeActive,
                    ]}
                    onPress={() => updateConfig({ pageMode: item.mode })}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color={config.pageMode === item.mode ? '#007AFF' : '#666'}
                    />
                    <Text style={[
                      styles.pageModeText,
                      config.pageMode === item.mode && styles.pageModeTextActive,
                    ]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 行间距 */}
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>行间距</Text>
              <View style={styles.lineHeightRow}>
                {[1.5, 1.8, 2.0, 2.5].map((lh) => (
                  <TouchableOpacity
                    key={lh}
                    style={[
                      styles.lineHeightButton,
                      config.lineHeight === lh && styles.lineHeightActive,
                    ]}
                    onPress={() => updateConfig({ lineHeight: lh })}
                  >
                    <Text style={[
                      styles.lineHeightText,
                      config.lineHeight === lh && styles.lineHeightTextActive,
                    ]}>
                      {lh}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 段间距 */}
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>段间距</Text>
              <Slider
                style={styles.fullSlider}
                minimumValue={0}
                maximumValue={30}
                value={config.paragraphSpacing}
                onValueChange={(v) => updateConfig({ paragraphSpacing: Math.round(v) })}
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#e0e0e0"
                thumbTintColor="#007AFF"
              />
              <Text style={styles.sliderValue}>{config.paragraphSpacing}px</Text>
            </View>

            {/* 首行缩进 */}
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>首行缩进</Text>
              <View style={styles.lineHeightRow}>
                {[0, 1, 2, 4].map((indent) => (
                  <TouchableOpacity
                    key={indent}
                    style={[
                      styles.lineHeightButton,
                      config.indent === indent && styles.lineHeightActive,
                    ]}
                    onPress={() => updateConfig({ indent })}
                  >
                    <Text style={[
                      styles.lineHeightText,
                      config.indent === indent && styles.lineHeightTextActive,
                    ]}>
                      {indent === 0 ? '无' : `${indent}字`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  // Settings modal
  settingsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  settingsPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  brightnessSlider: {
    flex: 1,
    marginHorizontal: 12,
    height: 40,
  },
  followSystemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  followSystemText: {
    fontSize: 14,
    color: '#666',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  settingSection: {
    marginTop: 16,
  },
  settingSectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  pageModeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageModeButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    width: '23%',
  },
  pageModeActive: {
    backgroundColor: '#E3F2FD',
  },
  pageModeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  pageModeTextActive: {
    color: '#007AFF',
  },
  lineHeightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineHeightButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  lineHeightActive: {
    backgroundColor: '#007AFF',
  },
  lineHeightText: {
    fontSize: 14,
    color: '#666',
  },
  lineHeightTextActive: {
    color: '#fff',
  },
  fullSlider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
  },
});

export default ReaderMenu;
