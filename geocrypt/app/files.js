import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { fileService } from './lib/api';
import BottomTabBar from '../components/BottomTabBar';
import { Ionicons } from '@expo/vector-icons';

const FilesScreen = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await fileService.listFiles();
      console.log('Archivos recibidos:', response); // Debug log
      setFiles(response);
    } catch (error) {
      console.error('Error al cargar archivos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderFileItem = ({ item }) => {
    console.log('Renderizando archivo:', item); // Debug log
    return (
      <TouchableOpacity style={styles.fileItem}>
        <View style={styles.fileIconContainer}>
          <Ionicons name="document" size={24} color="#007AFF" />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.filename || item.name || 'Archivo sin nombre'}
          </Text>
          <View style={styles.fileDetails}>
            <Text style={styles.fileDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
            {item.size && (
              <Text style={styles.fileSize}>
                {formatFileSize(item.size)}
              </Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

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
          ) : files.length === 0 ? (
            <View style={styles.centerContent}>
              <Ionicons name="folder-open" size={48} color="#666" />
              <Text style={styles.emptyText}>No hay archivos disponibles</Text>
            </View>
          ) : (
            <FlatList
              data={files}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderFileItem}
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
  fileItem: {
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
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  fileDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileDate: {
    fontSize: 12,
    color: '#666',
    marginRight: 10,
  },
  fileSize: {
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