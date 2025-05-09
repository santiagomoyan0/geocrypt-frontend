import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_TIMEOUT, API_URL } from '../../constants/config';
import * as DocumentPicker from 'expo-document-picker';

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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      console.log('FormData:', formData);
      console.log('Subiendo archivo:', { latitude, longitude });
      const response = await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Archivo subido exitosamente');
      return response.data;
    } catch (error) {
      console.error('Error al subir archivo:', error);
      throw error;
    }
  },

  downloadFile: async (fileId, geohash) => {
    try {
      console.log('Descargando archivo:', { fileId, geohash });
      const response = await api.get(`/download/${fileId}`, {
        params: { geohash },
        responseType: 'blob',
      });
      console.log('Archivo descargado exitosamente');
      return response.data;
    } catch (error) {
      console.error('Error al descargar archivo:', error);
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