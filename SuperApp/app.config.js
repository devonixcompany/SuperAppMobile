const envMode = process.env.EXPO_PUBLIC_APP_ENV || "development";
const fs = require("fs");
const prodPath = "./.env.production";
const devPath = "./.env.development";
let loadPath = undefined;
if (envMode === "production" && fs.existsSync(prodPath)) {
  loadPath = prodPath;
} else if (fs.existsSync(devPath)) {
  loadPath = devPath;
} else if (fs.existsSync(prodPath)) {
  loadPath = prodPath;
}
if (loadPath) {
  require("dotenv").config({ path: loadPath });
}

export default {
  expo: {
    name: "SuperApp",
    slug: "SuperApp",
    version: "1.0.6",
    orientation: "portrait",
    icon: "./assets/img/logo.png",
    scheme: "superapp",
    userInterfaceStyle: "light",
    splash: {
      statusBar: {
        hidden: false,
        style: "dark",
      },
    },
    newArchEnabled: true,
    ios: {
      bundleIdentifier: "com.anonymous.SuperApp",
      buildNumber: "101.0.3",
      supportsTablet: true,
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
      statusBar: {
        hidden: false,
        style: "dark",
      },
    },
    android: {
      package: "com.anonymous.SuperApp",
      versionCode: 2,
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/icon.png",
      },
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
      statusBar: {
        hidden: false,
        barStyle: "dark-content",
        translucent: false,
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-maps",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location.",
        },
      ],
      [
        "expo-splash-screen", 
        {
          image: "./assets/img/logo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    assetBundlePatterns: ["**/*"],
    extra: {
      // Firebase configuration from environment variables
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId:
        process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,

      // reCAPTCHA configuration
      recaptchaSiteKey: process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY,

      // API configuration
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      omisePublicKey: process.env.EXPO_PUBLIC_OMISE_PUBLIC_KEY,
      
      // Google Maps configuration
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,

      // App environment
      appEnv: process.env.EXPO_PUBLIC_APP_ENV || "development",
      eas: {
        projectId: "2b251967-59c3-4c60-9a16-3e8ff64df039",
      },
    },
  },
};
