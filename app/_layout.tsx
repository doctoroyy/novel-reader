import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from '../src/services';
import { useReaderStore } from '../src/stores';

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        await useReaderStore.getState().loadConfig();
        setIsDbReady(true);
      } catch (e) {
        console.error('Database init error:', e);
        setError(e instanceof Error ? e.message : 'Database initialization failed');
      }
    };
    init();
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>初始化失败: {error}</Text>
      </View>
    );
  }

  if (!isDbReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>正在初始化...</Text>
      </View>
    );
  }

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
