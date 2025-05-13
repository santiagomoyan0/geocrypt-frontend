import CryptoJS from 'crypto-js';
import ngeohash from 'ngeohash';
import { v4 as uuidv4 } from 'uuid';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';

/**
 * Convierte el contenido del archivo a formato adecuado para cifrado
 */
const prepareFileContent = async (file) => {
    if (typeof file === 'string') {
        // Si es texto plano, lo devolvemos tal cual
        return file;
    }

    if (file instanceof Blob || file instanceof File) {
        // Si es un archivo web, lo convertimos a base64
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Manejo de archivos de React Native
    if (file.uri) {
        try {
            const base64 = await FileSystem.readAsStringAsync(file.uri, {
                encoding: FileSystem.EncodingType.Base64
            });
            return base64;
        } catch (error) {
            console.error('Error al leer el archivo:', error);
            throw new Error('Error al leer el archivo');
        }
    }

    throw new Error('Formato de archivo no soportado');
};

/**
 * Genera un identificador único combinando geohash, UUID y hash del dispositivo
 */
const generateFileId = async (latitude, longitude, fileType) => {
    const gh = ngeohash.encode(latitude, longitude, 7);
    const uuid = uuidv4();
    const deviceId = Device.deviceName;
    const deviceHash = CryptoJS.SHA256(deviceId).toString().slice(0, 8);
    const timestamp = Date.now();
    const expirationTime = timestamp + (24 * 60 * 60 * 1000); // 24 horas
    
    return `${gh}-${deviceHash}-${uuid}-${expirationTime}-${fileType}`;
};

/**
 * Deriva una clave AES de 32 bytes a partir de la ubicación y el dispositivo
 */
const deriveKeyFromLocation = async (latitude, longitude) => {
    const gh = ngeohash.encode(latitude, longitude, 7);
    const deviceId = Device.deviceName;
    const deviceHash = CryptoJS.SHA256(deviceId).toString().slice(0, 8);
    const combined = gh + deviceHash;
    const key = combined.repeat(Math.ceil(32 / combined.length)).slice(0, 32);
    return key;
};

/**
 * Cifra el contenido usando AES en modo CBC
 */
const encryptFile = async (content, latitude, longitude) => {
    const key = await deriveKeyFromLocation(latitude, longitude);
    
    // Generar IV aleatorio
    const iv = CryptoJS.lib.WordArray.random(16);
    
    // Convertir el contenido base64 a WordArray
    const contentWordArray = CryptoJS.enc.Base64.parse(content);
    
    // Cifrar usando AES en modo CBC
    const encrypted = CryptoJS.AES.encrypt(contentWordArray, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    
    // Combinar IV y contenido cifrado en base64
    const encryptedBase64 = iv.concat(encrypted.ciphertext).toString(CryptoJS.enc.Base64);
    
    return encryptedBase64;
};

/**
 * Descifra el contenido usando AES en modo CBC
 */
const decryptFile = async (encryptedContent, latitude, longitude, fileType) => {
    const key = await deriveKeyFromLocation(latitude, longitude);
    
    // Convertir el contenido cifrado a WordArray
    const encryptedData = CryptoJS.enc.Base64.parse(encryptedContent);
    
    // Extraer IV y contenido cifrado
    const iv = CryptoJS.lib.WordArray.create(encryptedData.words.slice(0, 4));
    const ciphertext = CryptoJS.lib.WordArray.create(encryptedData.words.slice(4));
    
    // Descifrar
    const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: ciphertext },
        key,
        {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }
    );
    
    // Convertir el resultado a base64
    const decryptedBase64 = CryptoJS.enc.Base64.stringify(decrypted);
    
    return decryptedBase64;
};

/**
 * Verifica si el archivo puede ser descargado
 */
const verifyFileAccess = async (fileId, currentLatitude, currentLongitude) => {
    const [fileGeohash, fileDeviceHash, , expirationTime] = fileId.split('-');
    
    // Verificar ubicación
    const currentGeohash = ngeohash.encode(currentLatitude, currentLongitude, 7);
    if (fileGeohash !== currentGeohash) {
        throw new Error('No estás en la ubicación correcta para descargar este archivo');
    }
    
    // Verificar dispositivo
    const deviceId = Device.deviceName;
    const currentDeviceHash = CryptoJS.SHA256(deviceId).toString().slice(0, 8);
    if (fileDeviceHash !== currentDeviceHash) {
        throw new Error('Este archivo solo puede ser descargado desde el dispositivo original');
    }
    
    // Verificar expiración
    const currentTime = Date.now();
    if (currentTime > parseInt(expirationTime)) {
        throw new Error('Este archivo ha expirado');
    }
    
    return true;
};

export { 
    encryptFile, 
    decryptFile, 
    generateFileId,
    verifyFileAccess 
};