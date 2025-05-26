import React from 'react';
import { View, Text, StyleSheet, Button, Alert, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect } from 'react';
import { fileService } from './lib/api';
import * as FileSystem from 'expo-file-system';
import * as crypto from './crypto';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const saveFile = async (uri, filename, mimetype) => {
  try {
    console.log('Iniciando saveFile con:', { uri, filename, mimetype });
    
    if (Platform.OS === "android") {
      console.log('Plataforma Android detectada, solicitando permisos...');
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      console.log('Resultado de permisos:', permissions);

      if (permissions.granted) {
        console.log('Permisos concedidos, leyendo contenido del archivo...');
        // Leer el contenido como base64
        const fileContent = await FileSystem.readAsStringAsync(uri, { 
          encoding: FileSystem.EncodingType.Base64 
        });
        console.log('Contenido leído, longitud:', fileContent.length);

        // Validar que el contenido sea base64 válido
        if (!/^[A-Za-z0-9+/=]+$/.test(fileContent)) {
          throw new Error('El contenido del archivo no es un base64 válido');
        }

        // Calcular el tamaño esperado del contenido binario
        const expectedBinarySize = Math.floor((fileContent.length * 3) / 4);
        console.log('Tamaño esperado del contenido binario:', expectedBinarySize, 'bytes');

        console.log('Creando archivo usando SAF...');
        // Crear el archivo usando SAF
        const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filename,
          mimetype
        );
        console.log('Archivo creado en:', savedUri);
        
        console.log('Escribiendo contenido al archivo...');
        // Escribir el contenido como binario
        await FileSystem.writeAsStringAsync(savedUri, fileContent, { 
          encoding: FileSystem.EncodingType.Base64 
        });

        // Verificar que el archivo se escribió correctamente
        const fileInfo = await FileSystem.getInfoAsync(savedUri);
        console.log('Información del archivo guardado:', fileInfo);
        
        if (!fileInfo.exists || fileInfo.size === 0) {
          throw new Error('No se pudo escribir el archivo correctamente');
        }

        console.log('Archivo guardado exitosamente');
        Alert.alert('Éxito', 'Archivo guardado exitosamente');
        return true;
      } else {
        console.log('Permisos denegados, intentando compartir...');
        Alert.alert('Permiso denegado', 'No se pudo guardar el archivo. Intentando compartir...');
        if (await Sharing.isAvailableAsync()) {
          console.log('Compartiendo archivo...');
          await Sharing.shareAsync(uri, {
            mimeType: mimetype,
            dialogTitle: `Compartir ${filename}`,
            UTI: mimetype // Para iOS
          });
        }
        return false;
      }
    } else {
      console.log('Plataforma iOS detectada, usando sistema de compartir...');
      // Para iOS, usamos el sistema de compartir
      if (await Sharing.isAvailableAsync()) {
        console.log('Compartiendo archivo en iOS...');
        await Sharing.shareAsync(uri, {
          mimeType: mimetype,
          dialogTitle: `Compartir ${filename}`,
          UTI: mimetype // Para iOS
        });
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error('Error detallado en saveFile:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    Alert.alert('Error', 'No se pudo guardar el archivo: ' + error.message);
    return false;
  }
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
    console.log('Iniciando descarga de archivo:', file);
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
              console.log('Verificando permisos de ubicación...');
              const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
              console.log('Estado de permisos de ubicación:', locationStatus);
              
              if (locationStatus !== 'granted') {
                Alert.alert('Error', 'Se requieren permisos de ubicación para descargar el archivo');
                return;
              }

              const location = await Location.getCurrentPositionAsync({});
              const { latitude, longitude } = location.coords;
              console.log('Ubicación actual:', { latitude, longitude });
              
              console.log('Iniciando descarga del archivo...');
              const base64Content = await fileService.downloadFile(file.id, latitude, longitude);
              console.log('Contenido descargado, longitud:', base64Content.length);
              
              if (!/^[A-Za-z0-9+/=]+$/.test(base64Content)) {
                console.error('Contenido base64 inválido');
                throw new Error('El contenido descargado no es un base64 válido');
              }
              
              console.log('Iniciando desencriptación...');
              const decryptedContent = await crypto.decryptFile(base64Content, latitude, longitude);
              console.log('Contenido desencriptado, longitud:', decryptedContent.length);

              if (!/^[A-Za-z0-9+/=]+$/.test(decryptedContent)) {
                console.error('Contenido desencriptado no es base64 válido');
                throw new Error('El contenido desencriptado no es un base64 válido');
              }

              // Calcular el tamaño esperado del contenido binario
              const expectedBinarySize = Math.floor((decryptedContent.length * 3) / 4);
              console.log('Tamaño esperado del contenido binario:', expectedBinarySize, 'bytes');

              // Crear el nombre del archivo (sin la extensión .enc)
              const fileName = (file.filename || file.name || 'archivo_descargado').replace('.enc', '');
              console.log('Nombre del archivo procesado:', fileName);
              
              // Crear un archivo temporal con el contenido base64
              const tempFileUri = `${FileSystem.cacheDirectory}${fileName}`;
              console.log('URI del archivo temporal:', tempFileUri);
              
              console.log('Escribiendo archivo temporal...');
              // Escribir el archivo directamente usando el contenido base64
              await FileSystem.writeAsStringAsync(tempFileUri, decryptedContent, {
                encoding: FileSystem.EncodingType.Base64
              });

              // Verificar que el archivo se escribió correctamente
              const fileInfo = await FileSystem.getInfoAsync(tempFileUri);
              console.log('Información del archivo temporal:', fileInfo);
              
              if (!fileInfo.exists) {
                throw new Error('No se pudo crear el archivo temporal');
              }

              // Verificar que el tamaño del archivo temporal sea el esperado
              console.log('Tamaño esperado del archivo:', expectedBinarySize, 'bytes');
              console.log('Tamaño real del archivo:', fileInfo.size, 'bytes');

              if (fileInfo.size === 0) {
                throw new Error('El archivo temporal está vacío');
              }

              // Permitir una pequeña diferencia debido al padding
              const sizeDifference = Math.abs(fileInfo.size - expectedBinarySize);
              if (sizeDifference > 2) {
                console.warn('El tamaño del archivo temporal no coincide con el esperado. Diferencia:', sizeDifference, 'bytes');
              }

              // Determinar el mimetype correcto
              let mimetype = file.mimetype;
              if (!mimetype) {
                console.log('Mimetype no proporcionado, detectando por extensión...');
                const extension = fileName.split('.').pop().toLowerCase();
                const mimeTypes = {
                  'pdf': 'application/pdf',
                  'jpg': 'image/jpeg',
                  'jpeg': 'image/jpeg',
                  'png': 'image/png',
                  'gif': 'image/gif',
                  'txt': 'text/plain',
                  'doc': 'application/msword',
                  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'xls': 'application/vnd.ms-excel',
                  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                };
                mimetype = mimeTypes[extension] || 'application/octet-stream';
                console.log('Mimetype detectado:', mimetype);
              }

              console.log('Guardando archivo con mimetype:', mimetype);
              
              // Intentar guardar el archivo con el mimetype determinado
              const saved = await saveFile(tempFileUri, fileName, mimetype);

              // Limpiar el archivo temporal
              try {
                console.log('Limpiando archivo temporal...');
                const tempInfo = await FileSystem.getInfoAsync(tempFileUri);
                if (tempInfo.exists) {
                  await FileSystem.deleteAsync(tempFileUri);
                  console.log('Archivo temporal eliminado');
                }
              } catch (cleanupError) {
                console.error('Error al limpiar archivo temporal:', cleanupError);
              }

              if (!saved) {
                Alert.alert('Información', 'El archivo se ha compartido en lugar de guardarse');
              }
            } catch (error) {
              console.error('Error detallado en handleDownload:', {
                message: error.message,
                stack: error.stack,
                code: error.code
              });
              Alert.alert('Error', 'No se pudo descargar el archivo: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      if (!file.id) {
        Alert.alert('Error', 'No se puede compartir el archivo: ID no válido');
        return;
      }

      Alert.alert('Compartir', `Compartiendo ${file.filename || file.name}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Compartir',
            onPress: async () => {
              try {
                // Verificar permisos de ubicación
                const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
                if (locationStatus !== 'granted') {
                  Alert.alert('Error', 'Se requieren permisos de ubicación para compartir el archivo');
                  return;
                }

                // Obtener la ubicación actual
                const location = await Location.getCurrentPositionAsync({});
                const { latitude, longitude } = location.coords;
                
                // Descargar y descifrar el archivo
                const base64Content = await fileService.downloadFile(file.id, latitude, longitude);
                const decryptedContent = await crypto.decryptFile(base64Content, latitude, longitude);
                
                // Crear archivo temporal (sin la extensión .enc)
                const fileName = (file.filename || file.name || 'archivo_compartido').replace('.enc', '');
                const tempFileUri = `${FileSystem.cacheDirectory}${fileName}`;
                
                // Convertir base64 a binario
                const binaryContent = atob(decryptedContent);
                
                // Escribir el archivo como binario
                await FileSystem.writeAsStringAsync(tempFileUri, binaryContent, {
                  encoding: FileSystem.EncodingType.UTF8
                });

                // Verificar que el archivo se escribió correctamente
                const fileInfo = await FileSystem.getInfoAsync(tempFileUri);
                if (!fileInfo.exists) {
                  throw new Error('No se pudo crear el archivo temporal');
                }

                // Verificar si sharing está disponible
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(tempFileUri, {
                    mimeType: file.mimetype || 'application/octet-stream',
                    dialogTitle: `Compartir ${fileName}`,
                    UTI: file.mimetype // Para iOS
                  });
                } else {
                  Alert.alert('No disponible', 'No se puede compartir el archivo en este dispositivo');
                }

                // Limpiar archivo temporal
                try {
                  const tempInfo = await FileSystem.getInfoAsync(tempFileUri);
                  if (tempInfo.exists) {
                    await FileSystem.deleteAsync(tempFileUri);
                  }
                } catch (cleanupError) {
                  console.error('Error al limpiar archivo temporal:', cleanupError);
                }
              } catch (error) {
                console.error('Error al compartir el archivo:', error);
                Alert.alert('Error', 'No se pudo compartir el archivo');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error al iniciar compartir:', error);
      Alert.alert('Error', 'No se pudo iniciar el proceso de compartir');
    }
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
        ) return null;
        return (
          <Text key={key}>
            {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </Text>
        );
      })}
      <View style={styles.buttonContainer}>
        <Button title="Descargar" onPress={handleDownload} />
        <View style={{ height: 10 }} />
        <Button title="Compartir" onPress={handleShare} />
        <View style={{ height: 10 }} />
        <Button title="Eliminar" color="#d32f2f" onPress={handleDelete} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  buttonContainer: {
    marginTop: 20,
  }
});

export default FileDetailScreen; 