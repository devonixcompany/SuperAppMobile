// Environment configuration
import Constants from "expo-constants";

interface EnvConfig {
  apiUrl: string;
  appEnv: string;
}

const getEnvVars = (): EnvConfig => {
  // Get from Expo Constants (which reads from app.config.js)
  const apiUrl = Constants.expoConfig?.extra?.apiUrl;
  const appEnv = Constants.expoConfig?.extra?.appEnv || "development";

  // Fallback to default if not set
  if (!apiUrl) {
    console.warn("API_URL not set in environment variables, using default");
    return {
      apiUrl: "http://localhost:3000/api",
      appEnv: "development",
    };
  }

  return {
    apiUrl,
    appEnv,
  };
};

export default getEnvVars();
