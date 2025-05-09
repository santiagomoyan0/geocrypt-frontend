import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { authService, testConnection } from '../app/lib/api';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Verificando conexión...');

  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    const result = await testConnection();
    if (result.success) {
      setConnectionStatus('Conectado al backend');
    } else {
      setConnectionStatus('Error de conexión con el backend');
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar con el backend. Por favor, asegúrate de que el servidor esté corriendo en http://localhost:8000'
      );
    }
  };

  const handleLogin = async () => {
    try {
      const response = await authService.login(username, password);
      await AsyncStorage.setItem('token', response.access_token);
      onLogin();
    } catch (err) {
      setError('Error de autenticación. Verifica tus credenciales.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GeoCrypt</Text>
      <Text style={styles.connectionStatus}>{connectionStatus}</Text>
      <TextInput
        style={styles.input}
        placeholder="Usuario"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Iniciar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  connectionStatus: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default Login;