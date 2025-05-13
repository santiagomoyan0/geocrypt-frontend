import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { fileService } from './lib/api';
import BottomTabBar from '../components/BottomTabBar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const FilesScreen = () => {
  const [folders, setFolders] = useState([]); // [{ geohash, files: [] }]
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await fileService.listFiles();
      // Agrupar archivos por geohash
      const grouped = {};
      response.forEach(file => {
        const gh = file.geohash || 'Sin ubicación';
        if (!grouped[gh]) grouped[gh] = [];
        grouped[gh].push(file);
      });
      const foldersArr = Object.entries(grouped).map(([geohash, files]) => ({ geohash, files }));
      setFolders(foldersArr);
    } catch (error) {
      console.error('Error al cargar archivos:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFolderItem = ({ item }) => (
    <TouchableOpacity style={styles.folderItem} onPress={() => router.push({ pathname: '/folder-files', params: { geohash: item.geohash, files: JSON.stringify(item.files) } })}>
      <View style={styles.folderIconContainer}>
        <Ionicons name="folder" size={28} color="#007AFF" />
      </View>
      <View style={styles.folderInfo}>
        <Text style={styles.folderName}>{item.geohash}</Text>
        <Text style={styles.folderCount}>{item.files.length} archivo(s)</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mis Archivos</Text>
        </View>
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centerContent}>
              <Text style={styles.loadingText}>Cargando archivos...</Text>
            </View>
          ) : folders.length === 0 ? (
            <View style={styles.centerContent}>
              <Ionicons name="folder-open" size={48} color="#666" />
              <Text style={styles.emptyText}>No hay archivos disponibles</Text>
            </View>
          ) : (
            <FlatList
              data={folders}
              keyExtractor={(item) => item.geohash}
              renderItem={renderFolderItem}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
        <BottomTabBar />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 10,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  folderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  folderCount: {
    fontSize: 12,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default FilesScreen; 