import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BottomTabBar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { name: 'Subir', icon: 'cloud-upload', route: '/upload' },
    { name: 'Listar', icon: 'list', route: '/files' },
    { name: 'Cuenta', icon: 'person', route: '/account' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.route}
          style={styles.tab}
          onPress={() => router.push(tab.route)}
        >
          <Ionicons
            name={pathname === tab.route ? tab.icon : `${tab.icon}-outline`}
            size={24}
            color={pathname === tab.route ? '#007AFF' : '#666'}
          />
          <Text
            style={[
              styles.tabText,
              pathname === tab.route && styles.tabTextActive,
            ]}
          >
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
  },
});

export default BottomTabBar; 