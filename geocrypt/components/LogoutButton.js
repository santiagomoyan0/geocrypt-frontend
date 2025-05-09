import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { authService } from '../app/lib/api';
import { useRouter } from 'expo-router';

const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.replace('/components/Login');
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar la sesión');
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleLogout}>
      <Text style={styles.buttonText}>Cerrar Sesión</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default LogoutButton; 