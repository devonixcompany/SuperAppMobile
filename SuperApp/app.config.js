export default {
  expo: {
    name: "SuperApp",
    slug: "SuperApp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "superapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
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
      "expo-barcode-scanner",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
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
    extra: {
      firebaseApiKey: "Kg_jSZzL9dw9k8DqVzUr76EogVDw",
      firebaseAuthDomain: "superapp-39920.firebaseapp.com",
      firebaseProjectId: "superapp-39920",
      firebaseStorageBucket: "superapp-39920.appspot.com",
      firebaseMessagingSenderId: "1052582002552",
      firebaseAppId: "1:1052582002552:web:022231200801292650222",
    },
  },
};
