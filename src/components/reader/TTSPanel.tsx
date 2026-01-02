import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTTS } from '../../services/ttsService';

interface Props {
  content: string;
  visible: boolean;
  onClose: () => void;
}

export const TTSPanel: React.FC<Props> = ({ content, visible, onClose }) => {
  const {
    speaking,
    paused,
    rate,
    pitch,
    speak,
    speakChapter,
    pause,
    resume,
    stop,
    setRate,
    setPitch,
  } = useTTS();

  const [currentParagraph, setCurrentParagraph] = useState(0);
  const slideAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handlePlay = async () => {
    if (speaking && paused) {
      resume();
    } else if (!speaking) {
      await speakChapter(content, setCurrentParagraph);
    }
  };

  const handlePause = () => {
    if (speaking && !paused) {
      pause();
    }
  };

  const handleStop = async () => {
    await stop();
    setCurrentParagraph(0);
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }] },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>语音朗读</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* 当前朗读进度 */}
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {speaking ? `正在朗读第 ${currentParagraph + 1} 段` : '未开始'}
        </Text>
        {paused && <Text style={styles.pausedText}>（已暂停）</Text>}
      </View>

      {/* 播放控制 */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleStop}
          disabled={!speaking}
        >
          <Ionicons
            name="stop"
            size={28}
            color={speaking ? '#FF3B30' : '#ccc'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playButton}
          onPress={speaking && !paused ? handlePause : handlePlay}
        >
          <Ionicons
            name={speaking && !paused ? 'pause' : 'play'}
            size={36}
            color="#fff"
          />
        </TouchableOpacity>

        <View style={styles.controlButton} />
      </View>

      {/* 语速控制 */}
      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>语速</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.5}
          maximumValue={2.0}
          value={rate}
          onValueChange={setRate}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#e0e0e0"
          thumbTintColor="#007AFF"
        />
        <Text style={styles.sliderValue}>{rate.toFixed(1)}x</Text>
      </View>

      {/* 音调控制 */}
      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>音调</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.5}
          maximumValue={2.0}
          value={pitch}
          onValueChange={setPitch}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#e0e0e0"
          thumbTintColor="#007AFF"
        />
        <Text style={styles.sliderValue}>{pitch.toFixed(1)}</Text>
      </View>

      {/* 定时停止 */}
      <View style={styles.timerRow}>
        <Text style={styles.timerLabel}>定时停止</Text>
        <View style={styles.timerButtons}>
          {[15, 30, 60].map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={styles.timerButton}
              onPress={() => {
                // TODO: 实现定时停止
              }}
            >
              <Text style={styles.timerButtonText}>{minutes}分钟</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  pausedText: {
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  controlButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 24,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sliderLabel: {
    width: 40,
    fontSize: 14,
    color: '#666',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    width: 50,
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
  },
  timerButtons: {
    flexDirection: 'row',
  },
  timerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    marginLeft: 8,
  },
  timerButtonText: {
    fontSize: 12,
    color: '#666',
  },
});

export default TTSPanel;
