import 'react-native-get-random-values';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  const { getRandomValues } = require('react-native-get-random-values');
  if (typeof global.crypto === 'undefined') {
    global.crypto = {
      getRandomValues,
    };
  }
} 