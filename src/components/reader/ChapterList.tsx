import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookChapter } from '../../types';

interface Props {
  chapters: BookChapter[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export const ChapterList: React.FC<Props> = ({
  chapters, currentIndex, onSelect, onClose
}) => {
  const renderItem = ({ item, index }: { item: BookChapter; index: number }) => (
    <TouchableOpacity
      style={[styles.item, index === currentIndex && styles.itemCurrent]}
      onPress={() => onSelect(index)}
    >
      <Text
        style={[styles.itemText, index === currentIndex && styles.itemTextCurrent]}
        numberOfLines={1}
      >
        {item.title}
      </Text>
      {item.isVip && (
        <Ionicons name="lock-closed" size={14} color="#FFB800" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>目录 ({chapters.length}章)</Text>
          <View style={styles.placeholder} />
        </View>

        <FlatList
          data={chapters}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          initialScrollIndex={Math.max(0, currentIndex - 3)}
          getItemLayout={(_, index) => ({
            length: 48,
            offset: 48 * index,
            index,
          })}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  itemCurrent: {
    backgroundColor: '#E3F2FD',
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  itemTextCurrent: {
    color: '#007AFF',
    fontWeight: '500',
  },
});
