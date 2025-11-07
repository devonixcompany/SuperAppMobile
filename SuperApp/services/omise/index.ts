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
    console.log('🔐 Creating Omise token with payload:', {
      numberLength: payload.number?.length,
      expirationMonth: payload.expirationMonth,
      expirationYear: payload.expirationYear,
      hasSecurityCode: !!payload.securityCode,
      hasName: !!payload.name
    });

    const token = await OmiseClient.createToken({
      card: {
        number: payload.number,
        expiration_month: payload.expirationMonth,
        expiration_year: payload.expirationYear,
        security_code: payload.securityCode,
        name: payload.name,
      },
    });

    console.log('✅ Omise token created:', token);

    if (!token || typeof token !== 'object') {
      throw new Error('Invalid response from Omise');
    }

    if ((token as any).object === 'error') {
      console.error('❌ Omise returned error:', token);
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
    console.error('❌ Omise SDK error:', error);

    // Omise SDK rejects with response.json() Promise, resolve it for better messaging
    if (error && typeof error.then === 'function') {
      try {
        const resolved = await error;
        console.error('❌ Omise error resolved:', resolved);

        if (resolved && typeof resolved === 'object') {
          // Extract detailed error message
          const errorMsg = resolved.message || resolved.code || 'Omise rejected the card details';

          // If there are failures array, show those
          if (resolved.failures && Array.isArray(resolved.failures)) {
            const failureMessages = resolved.failures
              .map((f: any) => `${f.code}: ${f.message}`)
              .join(', ');
            throw new Error(failureMessages || errorMsg);
          }

          throw new Error(errorMsg);
        }
      } catch (nestedError: any) {
        console.error('❌ Nested error:', nestedError);
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
