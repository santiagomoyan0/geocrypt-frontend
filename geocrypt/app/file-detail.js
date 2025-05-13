import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

const FileDetailScreen = () => {
  const params = useLocalSearchParams();
  const file = params.file ? JSON.parse(params.file) : {};

  const handleDownload = () => {
    // Aquí va la lógica para descargar el archivo
    Alert.alert('Descargar', `Descargando ${file.filename || file.name}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{file.filename || file.name || 'Archivo sin nombre'}</Text>
      <Text>Fecha: {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Desconocida'}</Text>
      <Text>Tamaño: {file.size ? `${file.size} bytes` : 'Desconocido'}</Text>
      <Button title="Descargar" onPress={handleDownload} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
});

export default FileDetailScreen; 