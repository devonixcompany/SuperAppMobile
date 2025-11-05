// Environment configuration
import Constants from "expo-constants";

interface EnvConfig {
  apiUrl: string;
  appEnv: string;
  omisePublicKey?: string;
}

const getEnvVars = (): EnvConfig => {
  // Get from Expo Constants (which reads from app.config.js)
  const extras = Constants.expoConfig?.extra ?? {};
  const apiUrl = extras?.apiUrl;
  const appEnv = extras?.appEnv || "development";
  const omisePublicKey = extras?.omisePublicKey;

  // Fallback to default if not set
  if (!apiUrl) {
    console.warn("API_URL not set in environment variables, using default");
    return {
      apiUrl: "http://localhost:8080/api",
      appEnv: "development",
      omisePublicKey,
    };
  }

  return {
    apiUrl,
    appEnv,
    omisePublicKey,
  };
};

export default getEnvVars();
