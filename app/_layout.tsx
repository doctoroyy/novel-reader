import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from '../src/services';
import { useReaderStore } from '../src/stores';

export default function RootLayout() {
  useEffect(() => {
    // 初始化数据库
    initDatabase().catch(console.error);
    // 加载阅读配置
    useReaderStore.getState().loadConfig();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reader/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="book/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="search" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}
