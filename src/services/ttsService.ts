import * as Speech from 'expo-speech';

export interface TTSState {
  speaking: boolean;
  paused: boolean;
  rate: number;
  pitch: number;
  voice: string | null;
}

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  voice?: string;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
  onBoundary?: (event: { charIndex: number; charLength: number }) => void;
}

class TTSService {
  private state: TTSState = {
    speaking: false,
    paused: false,
    rate: 1.0,
    pitch: 1.0,
    voice: null,
  };

  private currentText: string = '';
  private currentPosition: number = 0;
  private listeners: Set<(state: TTSState) => void> = new Set();

  // 获取可用语音
  async getVoices(): Promise<Speech.Voice[]> {
    return await Speech.getAvailableVoicesAsync();
  }

  // 获取中文语音
  async getChineseVoices(): Promise<Speech.Voice[]> {
    const voices = await this.getVoices();
    return voices.filter(v => 
      v.language.startsWith('zh') || 
      v.language.startsWith('cmn')
    );
  }

  // 朗读文本
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    // 停止当前朗读
    await this.stop();

    this.currentText = text;
    this.currentPosition = 0;
    this.updateState({ speaking: true, paused: false });

    const rate = options.rate ?? this.state.rate;
    const pitch = options.pitch ?? this.state.pitch;

    Speech.speak(text, {
      language: 'zh-CN',
      rate,
      pitch,
      voice: options.voice ?? this.state.voice ?? undefined,
      onStart: () => {
        this.updateState({ speaking: true, paused: false });
        options.onStart?.();
      },
      onDone: () => {
        this.updateState({ speaking: false, paused: false });
        options.onDone?.();
      },
      onStopped: () => {
        this.updateState({ speaking: false, paused: false });
        options.onStopped?.();
      },
      onError: (error) => {
        this.updateState({ speaking: false, paused: false });
        options.onError?.(error as Error);
      },
    });
  }

  // 朗读章节内容（分段朗读）
  async speakChapter(
    content: string,
    onParagraphChange?: (index: number) => void
  ): Promise<void> {
    const paragraphs = content
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    for (let i = 0; i < paragraphs.length; i++) {
      if (!this.state.speaking && !this.state.paused) {
        break; // 已停止
      }

      if (this.state.paused) {
        // 等待恢复
        await new Promise<void>((resolve) => {
          const unsubscribe = this.subscribe((state) => {
            if (!state.paused || !state.speaking) {
              unsubscribe();
              resolve();
            }
          });
        });
      }

      onParagraphChange?.(i);

      await new Promise<void>((resolve) => {
        this.speak(paragraphs[i], {
          onDone: resolve,
          onStopped: resolve,
        });
      });
    }
  }

  // 暂停
  pause(): void {
    if (this.state.speaking && !this.state.paused) {
      Speech.pause();
      this.updateState({ paused: true });
    }
  }

  // 恢复
  resume(): void {
    if (this.state.speaking && this.state.paused) {
      Speech.resume();
      this.updateState({ paused: false });
    }
  }

  // 停止
  async stop(): Promise<void> {
    await Speech.stop();
    this.updateState({ speaking: false, paused: false });
    this.currentText = '';
    this.currentPosition = 0;
  }

  // 设置语速
  setRate(rate: number): void {
    this.state.rate = Math.max(0.1, Math.min(2.0, rate));
    this.notifyListeners();
  }

  // 设置音调
  setPitch(pitch: number): void {
    this.state.pitch = Math.max(0.5, Math.min(2.0, pitch));
    this.notifyListeners();
  }

  // 设置语音
  setVoice(voice: string | null): void {
    this.state.voice = voice;
    this.notifyListeners();
  }

  // 获取状态
  getState(): TTSState {
    return { ...this.state };
  }

  // 是否正在朗读
  isSpeaking(): boolean {
    return this.state.speaking;
  }

  // 订阅状态变化
  subscribe(listener: (state: TTSState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private updateState(partial: Partial<TTSState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
}

// 单例
export const ttsService = new TTSService();

// React Hook
import { useState, useEffect } from 'react';

export function useTTS() {
  const [state, setState] = useState<TTSState>(ttsService.getState());

  useEffect(() => {
    return ttsService.subscribe(setState);
  }, []);

  return {
    ...state,
    speak: ttsService.speak.bind(ttsService),
    speakChapter: ttsService.speakChapter.bind(ttsService),
    pause: ttsService.pause.bind(ttsService),
    resume: ttsService.resume.bind(ttsService),
    stop: ttsService.stop.bind(ttsService),
    setRate: ttsService.setRate.bind(ttsService),
    setPitch: ttsService.setPitch.bind(ttsService),
    setVoice: ttsService.setVoice.bind(ttsService),
    getVoices: ttsService.getVoices.bind(ttsService),
    getChineseVoices: ttsService.getChineseVoices.bind(ttsService),
  };
}
