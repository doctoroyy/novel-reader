import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookshelfView } from '../../src/components';

export default function BookshelfScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  return (
    <>
      <Stack.Screen
        options={{
          title: '书架',
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                <Ionicons
                  name={viewMode === 'grid' ? 'list' : 'grid'}
                  size={22}
                  color="#007AFF"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push('/search')}
              >
                <Ionicons name="search" size={22} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => {
                  // 导入本地书籍
                }}
              >
                <Ionicons name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <BookshelfView viewMode={viewMode} />
    </>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
  },
});
