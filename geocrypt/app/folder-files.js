import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FolderFilesScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const files = params.files ? JSON.parse(params.files) : [];
  const geohash = params.geohash || 'Sin ubicación';

  const renderFileItem = ({ item }) => (
    <TouchableOpacity style={styles.fileItem} onPress={() => router.push({ pathname: '/file-detail', params: { file: JSON.stringify(item) } })}>
      <View style={styles.fileIconContainer}>
        <Ionicons name="document" size={24} color="#007AFF" />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{item.filename || item.name || 'Archivo sin nombre'}</Text>
        <View style={styles.fileDetails}>
          <Text style={styles.fileDate}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</Text>
          {item.size && <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Archivos en {geohash}</Text>
      <FlatList
        data={files}
        keyExtractor={(item) => item.id?.toString() || item.filename || item.name}
        renderItem={renderFileItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  listContent: { paddingBottom: 20 },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
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
  fileInfo: { flex: 1 },
  fileName: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 4 },
  fileDetails: { flexDirection: 'row', alignItems: 'center' },
  fileDate: { fontSize: 12, color: '#666', marginRight: 10 },
  fileSize: { fontSize: 12, color: '#666' },
});

export default FolderFilesScreen; 