import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileDetailScreen = () => {
  const params = useLocalSearchParams();
  const file = params.file ? JSON.parse(params.file) : {};
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerTitle: 'Detalles del archivo' });
  }, [navigation]);

  const handleDownload = () => {
    // Aquí va la lógica para descargar el archivo
    Alert.alert('Descargar', `Descargando ${file.filename || file.name}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{file.filename || file.name || 'Archivo sin nombre'}</Text>
      <Text>Fecha: {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Desconocida'}</Text>
      <Text>Tamaño: {file.size ? formatFileSize(file.size) : 'Desconocido'}</Text>
      {Object.entries(file).map(([key, value]) => {
        if (
          ['filename', 'name', 'created_at', 'size'].includes(key)
        ) return null; // ya los mostramos arriba
        return (
          <Text key={key}>
            {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </Text>
        );
      })}
      <Button title="Descargar" onPress={handleDownload} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
});

export default FileDetailScreen; 