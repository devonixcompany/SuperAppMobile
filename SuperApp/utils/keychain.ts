import * as Keychain from 'react-native-keychain';

// Service name for keychain storage
const SERVICE_NAME = 'SuperApp';

export interface LoginCredentials {
  phoneNumber: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Store login credentials securely in keychain
 */
export const storeCredentials = async (credentials: LoginCredentials): Promise<boolean> => {
  try {
    await Keychain.setInternetCredentials(
      SERVICE_NAME,
      credentials.phoneNumber,
      credentials.password
    );
    return true;
  } catch (error) {
    console.error('Error storing credentials:', error);
    return false;
  }
};

/**
 * Retrieve login credentials from keychain
 */
export const getCredentials = async (): Promise<LoginCredentials | null> => {
  try {
    const credentials = await Keychain.getInternetCredentials(SERVICE_NAME);
    if (credentials && credentials.username && credentials.password) {
      return {
        phoneNumber: credentials.username,
        password: credentials.password,
      };
    }
    return null;
  } catch (error) {
    console.error('Error retrieving credentials:', error);
    return null;
  }
};

/**
 * Store authentication tokens securely
 */
export const storeTokens = async (tokens: AuthTokens): Promise<boolean> => {
  try {
    await Keychain.setInternetCredentials(
      `${SERVICE_NAME}_tokens`,
      'tokens',
      JSON.stringify(tokens)
    );
    return true;
  } catch (error) {
    console.error('Error storing tokens:', error);
    return false;
  }
};

/**
 * Retrieve authentication tokens
 */
export const getTokens = async (): Promise<AuthTokens | null> => {
  try {
    const credentials = await Keychain.getInternetCredentials(`${SERVICE_NAME}_tokens`);
    if (credentials && credentials.password) {
      return JSON.parse(credentials.password);
    }
    return null;
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    return null;
  }
};

/**
 * Clear all stored credentials and tokens
 */
export const clearCredentials = async (): Promise<boolean> => {
  try {
    // Use resetGenericPassword instead of resetInternetCredentials for better compatibility
    const result1 = await Keychain.resetGenericPassword({ service: SERVICE_NAME });
    const result2 = await Keychain.resetGenericPassword({ service: `${SERVICE_NAME}_tokens` });
    return true;
  } catch (error) {
    console.error('Error clearing credentials:', error);
    return false;
  }
};

/**
 * Check if credentials are stored
 */
export const hasCredentials = async (): Promise<boolean> => {
  try {
    const credentials = await Keychain.getInternetCredentials(SERVICE_NAME);
    return credentials && credentials.username && credentials.password ? true : false;
  } catch (error) {
    console.error('Error checking credentials:', error);
    return false;
  }
};