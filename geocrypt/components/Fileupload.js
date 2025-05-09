import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fileService } from '../app/lib/api';
import LogoutButton from '../components/LogoutButton';

const FileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  const handleUpload = async () => {
    console.log('Click en subir archivo');
    if (isPicking || uploading) {
      console.log('Botón deshabilitado');
      return;
    }

    try {
      setIsPicking(true);
      // Solicitar permisos de ubicación
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Se requieren permisos de ubicación');
        return;
      }
      console.log('Permisos de ubicación OK');

      // Obtener ubicación actual
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      console.log('Ubicación obtenida');

      // Seleccionar archivo
      const result = await DocumentPicker.getDocumentAsync({});
      console.log('Resultado del picker:', result);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true);
        
        const asset = result.assets[0];
        const file = {
          uri: asset.uri,
          type: asset.mimeType,
          name: asset.name,
        };

        console.log('Archivo a subir:', file);
        await fileService.uploadFile(file, latitude, longitude);
        Alert.alert('Éxito', 'Archivo subido correctamente');
      } else {
        console.log('El usuario canceló o no se seleccionó archivo');
      }
    } catch (error) {
      console.log('Error en handleUpload:', error);
      Alert.alert('Error', 'Error al subir el archivo');
      console.error(error);
    } finally {
      setUploading(false);
      setIsPicking(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, (uploading || isPicking) && styles.buttonDisabled]} 
        onPress={handleUpload}
        disabled={uploading || isPicking}
      >
        <Text style={styles.buttonText}>
          {uploading ? 'Subiendo...' : isPicking ? 'Seleccionando...' : 'Subir Archivo'}
        </Text>
      </TouchableOpacity>
      <LogoutButton />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default FileUpload;