import React from 'react';
import { View, Text, StyleSheet, Button, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect } from 'react';
import { fileService } from './lib/api';
import * as FileSystem from 'expo-file-system';
import * as crypto from './crypto';
import * as MediaLibrary from 'expo-media-library';

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

  const requestStoragePermission = async () => {
    try {
      // Solicitar permisos de almacenamiento
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Se requieren permisos de almacenamiento para guardar archivos en la carpeta de descargas.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Configuración',
              onPress: () => {
                // Abrir la configuración de la aplicación
                Linking.openSettings();
              }
            }
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      Alert.alert('Error', 'No se pudieron solicitar los permisos de almacenamiento');
      return false;
    }
  };

  const handleDownload = () => {
    console.log(file);
    if (!file.id) {
      Alert.alert('Error', 'No se puede descargar el archivo: ID no válido');
      return;
    }

    Alert.alert('Descargar', `Descargando ${file.filename || file.name}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descargar',
          onPress: async () => {
            try {
              // Verificar permisos de ubicación
              const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
              if (locationStatus !== 'granted') {
                Alert.alert('Error', 'Se requieren permisos de ubicación para descargar el archivo');
                return;
              }

              // Verificar permisos de almacenamiento
              const hasStoragePermission = await requestStoragePermission();
              if (!hasStoragePermission) {
                return;
              }

              // Obtener la ubicación actual del dispositivo
              const location = await Location.getCurrentPositionAsync({});
              const { latitude, longitude } = location.coords;
              console.log('Ubicación actual:', { latitude, longitude });
              
              // Descargar el archivo
              const encryptedContent = await fileService.downloadFile(file.id, latitude, longitude);
              
              // Descifrar el contenido
              const decryptedContent = await crypto.decryptFile(encryptedContent, latitude, longitude);
              
              // Crear el nombre del archivo
              const fileName = file.filename || file.name || 'archivo_descargado';
              
              // Crear un archivo temporal con el contenido descifrado
              const tempFileUri = `${FileSystem.cacheDirectory}${fileName}`;
              await FileSystem.writeAsStringAsync(tempFileUri, decryptedContent, {
                encoding: FileSystem.EncodingType.Base64
              });

              try {
                // Mover el archivo al directorio de documentos
                const finalUri = `${FileSystem.documentDirectory}${fileName}`;
                await FileSystem.moveAsync({
                  from: tempFileUri,
                  to: finalUri
                });

                console.log('Archivo guardado en:', finalUri);
                Alert.alert('Éxito', `Archivo guardado en: ${finalUri}`);
              } catch (e) {
                console.error('Error al mover el archivo:', e);
                Alert.alert('Error', 'No se pudo guardar el archivo');
              } finally {
                // Limpiar el archivo temporal si aún existe
                try {
                  const tempInfo = await FileSystem.getInfoAsync(tempFileUri);
                  if (tempInfo.exists) {
                    await FileSystem.deleteAsync(tempFileUri);
                  }
                } catch (cleanupError) {
                  console.error('Error al limpiar archivo temporal:', cleanupError);
                }
              }
            } catch (error) {
              console.error('Error al descargar el archivo:', error);
              Alert.alert('Error', 'No se pudo descargar el archivo. Verifica tu ubicación.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!file.id) {
      Alert.alert('Error', 'No se puede eliminar el archivo: ID no válido');
      return;
    }

    Alert.alert(
      'Eliminar archivo',
      `¿Estás seguro de que deseas eliminar "${file.filename || file.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await fileService.deleteFile(file.id);
              Alert.alert('Eliminado', 'El archivo ha sido eliminado.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el archivo.');
            }
          },
        },
      ]
    );
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
      <View style={{ height: 10 }} />
      <Button title="Eliminar" color="#d32f2f" onPress={handleDelete} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
});

export default FileDetailScreen; 