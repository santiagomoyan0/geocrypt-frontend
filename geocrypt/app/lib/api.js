import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_TIMEOUT, API_URL } from '../../constants/config';
import * as DocumentPicker from 'expo-document-picker';
import * as crypto from '../crypto';
import * as ngeohash from 'ngeohash';
import * as FileSystem from 'expo-file-system';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor para agregar el token a las peticiones
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Request config:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
    });
    return config;
  } catch (error) {
    console.error('Error en interceptor de request:', error);
    return config;
  }
});

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    console.log('Response:', {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('Error en la petición:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    return Promise.reject(error);
  }
);

// Función para probar la conexión
export const testConnection = async () => {
  try {
    console.log('Probando conexión con:', API_URL);
    // Intentar primero con la ruta raíz
    const response = await api.get('/');
    console.log('Respuesta del servidor:', response.data);
    return {
      success: true,
      message: 'Conexión exitosa con el backend',
      data: response.data
    };
  } catch (error) {
    console.error('Error detallado:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      url: API_URL,
      headers: error.config?.headers,
      method: error.config?.method
    });

    // Si es un error de red, dar un mensaje más específico
    if (error.message === 'Network Error') {
      return {
        success: false,
        message: 'No se pudo conectar con el backend. Verifica que:\n1. El servidor esté corriendo\n2. El puerto 8000 esté abierto\n3. No haya un firewall bloqueando la conexión',
        error: error.message
      };
    }

    return {
      success: false,
      message: 'Error al conectar con el backend',
      error: error.message,
      details: error.response?.data
    };
  }
};

// Servicios de autenticación
export const authService = {
  login: async (username, password) => {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      console.log('Intentando login con:', { username });
      const response = await api.post('/auth/token', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Login exitoso');
      return response.data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('token');
      console.log('Logout exitoso');
      return true;
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    }
  },

  register: async (userData) => {
    try {
      console.log('Intentando registro con:', userData);
      const response = await api.post('/auth/register', userData);
      console.log('Registro exitoso');
      return response.data;
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  },
};

// Servicios de archivos
export const fileService = {
  uploadFile: async (file, latitude, longitude) => {
    try {
      // Generar el geohash
      const gh = ngeohash.encode(latitude, longitude, 7);
      
      // Leer el archivo como base64
      const fileContent = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Cifrar el contenido
      const encryptedContent = await crypto.encryptFile(fileContent, latitude, longitude);
      
      // Crear un archivo temporal encriptado
      const tempEncryptedFileUri = `${FileSystem.cacheDirectory}${file.name}.enc`;
      await FileSystem.writeAsStringAsync(tempEncryptedFileUri, encryptedContent, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Crear el FormData
      const formData = new FormData();
      
      // Agregar el archivo cifrado
      formData.append('file', {
        uri: tempEncryptedFileUri,
        type: 'application/octet-stream',
        name: `${file.name}.enc`,
        size: encryptedContent.length
      });
      
      // Agregar los otros campos
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      formData.append('geohash', gh);
      
      // Log del FormData para debug
      console.log('FormData contents:');
      for (let pair of formData.entries()) {
        if (pair[0] === 'file') {
          console.log('file:', {
            name: pair[1].name,
            type: pair[1].type,
            size: pair[1].size
          });
        } else {
          console.log(pair[0] + ': ' + pair[1]);
        }
      }

      const response = await api.post('/files/upload', formData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data) => {
          return data;
        },
        timeout: 30000
      });
      
      // Eliminar el archivo temporal encriptado
      await FileSystem.deleteAsync(tempEncryptedFileUri);
      
      console.log('Archivo cifrado subido exitosamente');
      return response.data;
    } catch (error) {
      console.error('Error al subir archivo:', error);
      if (error.response) {
        console.error('Detalles del error:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('No se recibió respuesta del servidor:', error.request);
      } else {
        console.error('Error al configurar la petición:', error.message);
      }
      throw error;
    }
  },


  downloadFile: async (fileId, latitude, longitude) => {
    try {
      // Generar el geohash
      const gh = ngeohash.encode(latitude, longitude, 7);
      
      console.log('Descargando archivo:', { fileId, geohash: gh });
      
      // Obtener el token
      const token = await AsyncStorage.getItem('token');
      
      // Usar fetch directamente para la descarga
      const response = await fetch(`${API_URL}/files/download/${fileId}?geohash=${gh}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('Error en la respuesta del servidor:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
      }

      // Verificar el tipo de contenido
      const contentType = response.headers.get('content-type');
      console.log('Tipo de contenido recibido:', contentType);

      if (contentType && contentType.includes('application/json')) {
        // Es un error, leer el texto y mostrarlo
        const errorText = await response.text();
        console.error('Respuesta JSON de error:', errorText);
        let errorMsg = 'El servidor respondió con un error.';
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.detail || errorJson.message || errorText;
        } catch {
          errorMsg = errorText;
        }
        throw new Error(errorMsg);
      }

      // Obtener el blob
      const blob = await response.blob();
      console.log('Tamaño del blob recibido:', blob.size);

      if (blob.size === 0) {
        throw new Error('El archivo recibido está vacío');
      }
      
      // Convertir el blob a base64 de manera más robusta
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          try {
            console.log('FileReader completado, procesando resultado...');
            const result = reader.result;
            if (!result) {
              throw new Error('No se pudo leer el contenido del archivo');
            }
            
            const base64 = result.split(',')[1];
            if (!base64) {
              throw new Error('No se pudo extraer el contenido base64 del archivo');
            }
            
            console.log('Archivo convertido a base64 exitosamente');
            resolve(base64);
          } catch (error) {
            console.error('Error al procesar el contenido:', error);
            reject(new Error('Error al procesar el contenido del archivo: ' + error.message));
          }
        };

        reader.onerror = (error) => {
          console.error('Error en FileReader:', error);
          reject(new Error('Error al leer el archivo: ' + error.message));
        };

        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            console.log(`Progreso de lectura: ${progress.toFixed(2)}%`);
          }
        };

        console.log('Iniciando lectura del blob...');
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      if (error.response) {
        console.error('Detalles del error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  },

  listFiles: async () => {
    try {
      console.log('Listando archivos');
      const response = await api.get('/files');
      console.log('Archivos listados exitosamente');
      return response.data;
    } catch (error) {
      console.error('Error al listar archivos:', error);
      throw error;
    }
  },

  getFile: async (fileId) => {
    try {
      console.log('Obteniendo archivo:', fileId);
      const response = await api.get(`/files/${fileId}`);
      console.log('Archivo obtenido exitosamente');
      return response.data;
    } catch (error) {
      console.error('Error al obtener archivo:', error);
      throw error;
    }
  },

  deleteFile: async (fileId) => {
    try {
      console.log('Eliminando archivo:', fileId);
      const response = await api.delete(`/files/${fileId}`);
      console.log('Archivo eliminado exitosamente');
      return response.data;
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      throw error;
    }
  },
};

// Exportación por defecto
export default {
  authService,
  fileService,
  testConnection
};