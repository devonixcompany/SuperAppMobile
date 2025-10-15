// Import the functions you need from the SDKs you need
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeApp, getApps } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import firebaseCompat from 'firebase/compat/app';
import 'firebase/compat/auth';
import { Platform } from 'react-native';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAxjo-Kg_jSZzL9dw9k8DqVzUr76EogVDw",
  authDomain: "superappnative-8d369.firebaseapp.com",
  projectId: "superappnative-8d369",
  storageBucket: "superappnative-8d369.firebasestorage.app",
  messagingSenderId: "503773319107",
  appId: "1:503773319107:web:ee9e3495560e9b3f737776",
  measurementId: "G-GXTFQJFXYH"
};

// reCAPTCHA configuration for phone authentication
const recaptchaConfig = {
  siteKey: "6Lf9ZuorAAAAAOQtTKxfldf6-rr76KE69CK4I2vA", // Public site key
  // Note: Secret key (6Lf9ZuorAAAAAPYtRY41lduljQBdniuTfqlBjtPJ) should be kept on server-side only
};

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

if (!firebaseCompat.apps.length) {
  firebaseCompat.initializeApp(firebaseConfig);
}

// Initialize Analytics only on web platform and when supported
let analytics = null;
if (Platform.OS === 'web') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// Initialize Auth with platform-specific persistence
let auth;
if (Platform.OS === 'web') {
  // For web, use default persistence (no AsyncStorage needed)
  const { getAuth } = require('firebase/auth');
  auth = getAuth(app);
} else {
  // For React Native, use AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

export { analytics, auth, app, firebaseConfig, recaptchaConfig };
