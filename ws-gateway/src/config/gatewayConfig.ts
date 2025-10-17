// Gateway configuration
// TODO: Define configuration for supported versions, port, paths, and other gateway settings

export interface GatewayConfig {
  port: number;
  path: string;
  supportedVersions: string[];
  // Add other configuration options as needed
}

export const defaultConfig: GatewayConfig = {
  port: 8080,
  path: '/ocpp',
  supportedVersions: ['1.6', '2.0.1'],
};