import env from '@/config/env';
import OmiseModule from 'omise-react-native';

let configuredKey: string | null = null;

const OmiseClient: any = (OmiseModule as any)?.config
  ? OmiseModule
  : (OmiseModule as any)?.default;

const ensureOmiseInitialized = () => {
  if (!env.omisePublicKey) {
    throw new Error('Omise public key is not configured (EXPO_PUBLIC_OMISE_PUBLIC_KEY)');
  }

  if (configuredKey === env.omisePublicKey) {
    return;
  }

  if (!OmiseClient || typeof OmiseClient.config !== 'function') {
    throw new Error('Omise client is not available');
  }

  OmiseClient.config(env.omisePublicKey);
  configuredKey = env.omisePublicKey;
};

export interface CardTokenPayload {
  number: string;
  expirationMonth: number;
  expirationYear: number;
  securityCode: string;
  name: string;
}

export interface CardTokenResponse {
  id: string;
  [key: string]: unknown;
}

export const createCardToken = async (payload: CardTokenPayload): Promise<CardTokenResponse> => {
  ensureOmiseInitialized();

  if (!OmiseClient || typeof OmiseClient.createToken !== 'function') {
    throw new Error('Omise client is not available');
  }

  try {
    const token = await OmiseClient.createToken({
      card: {
        number: payload.number,
        expiration_month: payload.expirationMonth,
        expiration_year: payload.expirationYear,
        security_code: payload.securityCode,
        name: payload.name,
      },
    });

    if (!token || typeof token !== 'object') {
      throw new Error('Invalid response from Omise');
    }

    if ((token as any).object === 'error') {
      throw new Error(
        (token as any).message ||
        (token as any).code ||
        'Omise rejected the card details'
      );
    }

    if (!(token as any).id) {
      throw new Error('Omise token response missing id');
    }

    return token as CardTokenResponse;
  } catch (error: any) {
    // Omise SDK rejects with response.json() Promise, resolve it for better messaging
    if (error && typeof error.then === 'function') {
      try {
        const resolved = await error;
        if (resolved && typeof resolved === 'object') {
          throw new Error(
            resolved.message ||
            resolved.code ||
            'Omise rejected the card details'
          );
        }
      } catch (nestedError: any) {
        throw new Error(
          nestedError?.message ||
          'Failed to create card token with Omise'
        );
      }
    }

    throw new Error(
      error?.message ||
      'Failed to create card token with Omise'
    );
  }
};
