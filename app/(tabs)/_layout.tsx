import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';

// 主题色
const THEME = {
  primary: '#667eea',
  primaryDark: '#5a67d8',
  inactive: '#8E8E93',
  background: '#f8f9fa',
  tabBar: Platform.OS === 'ios' ? 'rgba(255,255,255,0.92)' : '#ffffff',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: THEME.inactive,
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
          color: '#1a1a2e',
        },
        tabBarStyle: {
          backgroundColor: THEME.tabBar,
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '书架',
          headerTitle: '我的书架',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused && styles.activeIconContainer}>
              <Ionicons 
                name={focused ? 'library' : 'library-outline'} 
                size={24} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '发现',
          headerTitle: '发现好书',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused && styles.activeIconContainer}>
              <Ionicons 
                name={focused ? 'compass' : 'compass-outline'} 
                size={24} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rss"
        options={{
          title: '订阅',
          headerTitle: '我的订阅',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused && styles.activeIconContainer}>
              <Ionicons 
                name={focused ? 'newspaper' : 'newspaper-outline'} 
                size={24} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '我的',
          headerTitle: '设置',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused && styles.activeIconContainer}>
              <Ionicons 
                name={focused ? 'person' : 'person-outline'} 
                size={24} 
                color={color} 
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: 'rgba(102, 126, 234, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
});
