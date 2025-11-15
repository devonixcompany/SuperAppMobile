import env from '@/config/env';
import { Buffer } from 'buffer';
import OmiseModule from 'omise-react-native';

let configuredKey: string | null = null;

const OmiseClient: any = (OmiseModule as any)?.config
  ? OmiseModule
  : (OmiseModule as any)?.default;

const hasNativeOmiseConfig = Boolean(
  OmiseClient && typeof OmiseClient.config === 'function'
);

const hasNativeOmiseTokenization = Boolean(
  OmiseClient && typeof OmiseClient.createToken === 'function'
);

const OMISE_VAULT_URL = 'https://vault.omise.co/tokens';

const toBase64 = (value: string) => {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64');
  }

  throw new Error('Base64 encoding is not supported in this environment');
};

const toFormUrlEncoded = (data: Record<string, string>) =>
  Object.entries(data)
    .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
    .join('&');

const createTokenViaRest = async (payload: CardTokenPayload): Promise<CardTokenResponse> => {
  if (!env.omisePublicKey) {
    throw new Error('Omise public key is not configured (EXPO_PUBLIC_OMISE_PUBLIC_KEY)');
  }

  console.log('📡 Creating Omise token via REST fallback');

  const paddedMonth = String(payload.expirationMonth).padStart(2, '0');
  const formBody = toFormUrlEncoded({
    'card[name]': payload.name,
    'card[number]': payload.number,
    'card[expiration_month]': paddedMonth,
    'card[expiration_year]': String(payload.expirationYear),
    'card[security_code]': payload.securityCode,
  });

  const response = await fetch(OMISE_VAULT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${toBase64(`${env.omisePublicKey}:`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });

  let json: any = null;
  try {
    json = await response.json();
  } catch (error) {
    console.error('❌ Failed to parse Omise REST response:', error);
  }

  if (!response.ok || !json) {
    throw new Error('Failed to create card token with Omise');
  }

  if (json.object === 'error') {
    console.error('❌ Omise REST returned error:', json);
    const message = json.message || json.code || 'Omise rejected the card details';
    throw new Error(message);
  }

  if (!json.id) {
    throw new Error('Omise token response missing id');
  }

  console.log('✅ Omise REST token created:', json.id);
  return json as CardTokenResponse;
};

const ensureOmiseInitialized = () => {
  if (!env.omisePublicKey) {
    throw new Error('Omise public key is not configured (EXPO_PUBLIC_OMISE_PUBLIC_KEY)');
  }

  if (!hasNativeOmiseConfig) {
    return;
  }

  if (configuredKey === env.omisePublicKey) {
    return;
  }

  try {
    OmiseClient.config(env.omisePublicKey);
    configuredKey = env.omisePublicKey;
  } catch (error) {
    console.warn('⚠️ Failed to configure Omise native SDK, REST fallback will be used', error);
  }
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

  if (!hasNativeOmiseTokenization) {
    console.warn('⚠️ Omise native SDK unavailable, using REST fallback');
    return createTokenViaRest(payload);
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

    // Attempt REST fallback before bubbling the error
    try {
      console.log('🔁 Falling back to Omise REST tokenization');
      return await createTokenViaRest(payload);
    } catch (restError: any) {
      console.error('❌ Omise REST fallback error:', restError);
      throw new Error(
        restError?.message ||
        error?.message ||
        'Failed to create card token with Omise'
      );
    }
  }
};
