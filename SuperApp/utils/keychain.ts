import * as SecureStore from "expo-secure-store";

// Service name for secure storage
const SERVICE_NAME = "SuperApp";

export interface LoginCredentials {
  phoneNumber: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Store login credentials securely in secure store
 */
export const storeCredentials = async (
  credentials: LoginCredentials,
): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(
      `${SERVICE_NAME}_credentials`,
      JSON.stringify(credentials),
    );
    return true;
  } catch (error) {
    console.error("Error storing credentials:", error);
    return false;
  }
};

/**
 * Retrieve login credentials from secure store
 */
export const getCredentials = async (): Promise<LoginCredentials | null> => {
  try {
    const credentialsStr = await SecureStore.getItemAsync(
      `${SERVICE_NAME}_credentials`,
    );
    if (credentialsStr) {
      return JSON.parse(credentialsStr);
    }
    return null;
  } catch (error) {
    console.error("Error retrieving credentials:", error);
    return null;
  }
};

/**
 * Store authentication tokens securely
 */
export const storeTokens = async (tokens: AuthTokens): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(
      `${SERVICE_NAME}_tokens`,
      JSON.stringify(tokens),
    );
    return true;
  } catch (error) {
    console.error("Error storing tokens:", error);
    return false;
  }
};

/**
 * Retrieve authentication tokens
 */
export const getTokens = async (): Promise<AuthTokens | null> => {
  try {
    const tokensStr = await SecureStore.getItemAsync(`${SERVICE_NAME}_tokens`);
    if (tokensStr) {
      return JSON.parse(tokensStr);
    }
    return null;
  } catch (error) {
    console.error("Error retrieving tokens:", error);
    return null;
  }
};

/**
 * Clear all stored credentials and tokens
 */
export const clearCredentials = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(`${SERVICE_NAME}_credentials`);
    await SecureStore.deleteItemAsync(`${SERVICE_NAME}_tokens`);
    return true;
  } catch (error) {
    console.error("Error clearing credentials:", error);
    return false;
  }
};

/**
 * Check if credentials are stored
 */
export const hasCredentials = async (): Promise<boolean> => {
  try {
    const credentialsStr = await SecureStore.getItemAsync(
      `${SERVICE_NAME}_credentials`,
    );
    return credentialsStr !== null;
  } catch (error) {
    console.error("Error checking credentials:", error);
    return false;
  }
};
