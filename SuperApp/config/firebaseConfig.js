// Import the functions you need from the SDKs you need
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeApp, getApps } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import firebaseCompat from "firebase/compat/app";
import "firebase/compat/auth";
import { Platform } from "react-native";

// Get Firebase configuration from environment variables via Expo Constants
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
  measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId,
};

// reCAPTCHA configuration for phone authentication
const recaptchaConfig = {
  siteKey: Constants.expoConfig?.extra?.recaptchaSiteKey,
};

// Validate Firebase configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    "Firebase configuration is missing. Please check your .env file.",
  );
  console.error("Required environment variables:");
  console.error("- EXPO_PUBLIC_FIREBASE_API_KEY");
  console.error("- EXPO_PUBLIC_FIREBASE_PROJECT_ID");
  console.error("- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN");
  console.error("- EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET");
  console.error("- EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  console.error("- EXPO_PUBLIC_FIREBASE_APP_ID");
}

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

if (!firebaseCompat.apps.length) {
  firebaseCompat.initializeApp(firebaseConfig);
}

// Initialize Analytics only on web platform and when supported
let analytics = null;
if (Platform.OS === "web") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// Initialize Auth with platform-specific persistence
let auth;
if (Platform.OS === "web") {
  // For web, use default persistence (no AsyncStorage needed)
  const { getAuth } = require("firebase/auth");
  auth = getAuth(app);
} else {
  // For React Native, use AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

export { analytics, auth, app, firebaseConfig, recaptchaConfig };
