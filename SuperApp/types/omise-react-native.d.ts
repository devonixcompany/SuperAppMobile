declare module 'omise-react-native' {
  interface OmiseCardPayload {
    card: {
      number: string;
      expiration_month: number;
      expiration_year: number;
      security_code: string;
      name?: string;
    };
  }

  export function config(publicKey: string, apiVersion?: string): void;
  export function createToken(payload: OmiseCardPayload): Promise<any>;
  export function createSource(payload: any): Promise<any>;
  export function getCapabilities(): Promise<any>;
}
