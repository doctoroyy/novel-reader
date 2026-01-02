import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ReaderView } from '../../src/components';

export default function ReaderScreen() {
  return (
    <View style={styles.container}>
      <ReaderView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
