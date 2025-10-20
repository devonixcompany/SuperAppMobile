// Version negotiation handler
// Implements subprotocol and version negotiation logic for OCPP

export interface VersionInfo {
  version: string;
  subprotocol: string;
  features: string[];
}

// Supported OCPP versions and their features
const SUPPORTED_VERSIONS: Record<string, VersionInfo> = {
  'ocpp1.6': {
    version: '1.6',
    subprotocol: 'ocpp1.6',
    features: [
      'RemoteStartTransaction',
      'RemoteStopTransaction',
      'GetConfiguration',
      'ChangeConfiguration',
      'Reset',
      'UnlockConnector',
      'GetDiagnostics',
      'UpdateFirmware',
      'ReserveNow',
      'CancelReservation',
      'StartTransaction',
      'StopTransaction',
      'Authorize',
      'BootNotification',
      'DataTransfer',
      'DiagnosticsStatusNotification',
      'FirmwareStatusNotification',
      'Heartbeat',
      'MeterValues',
      'StatusNotification'
    ]
  },
  'ocpp2.0': {
    version: '2.0',
    subprotocol: 'ocpp2.0',
    features: [
      'RequestStartTransaction',
      'RequestStopTransaction',
      'GetVariables',
      'SetVariables',
      'Reset',
      'UnlockConnector',
      'GetLog',
      'UpdateFirmware',
      'ReserveNow',
      'CancelReservation',
      'TransactionEvent',
      'Authorize',
      'BootNotification',
      'DataTransfer',
      'LogStatusNotification',
      'FirmwareStatusNotification',
      'Heartbeat',
      'NotifyReport',
      'StatusNotification',
      'SecurityEventNotification'
    ]
  },
  'ocpp2.0.1': {
    version: '2.0.1',
    subprotocol: 'ocpp2.0.1',
    features: [
      'RequestStartTransaction',
      'RequestStopTransaction',
      'GetVariables',
      'SetVariables',
      'Reset',
      'UnlockConnector',
      'GetLog',
      'UpdateFirmware',
      'ReserveNow',
      'CancelReservation',
      'TransactionEvent',
      'Authorize',
      'BootNotification',
      'DataTransfer',
      'LogStatusNotification',
      'FirmwareStatusNotification',
      'Heartbeat',
      'NotifyReport',
      'StatusNotification',
      'SecurityEventNotification',
      'Get15118EVCertificate',
      'GetCertificateStatus'
    ]
  }
};

export function negotiateVersion(requestedVersions: string[]): VersionInfo | null {
  console.log('Negotiating OCPP version from:', requestedVersions);
  
  // Priority order for version selection (prefer newer versions)
  const versionPriority = ['ocpp2.0.1', 'ocpp2.0', 'ocpp1.6'];
  
  // Find the highest priority version that's supported by both client and server
  for (const preferredVersion of versionPriority) {
    if (requestedVersions.includes(preferredVersion) && SUPPORTED_VERSIONS[preferredVersion]) {
      console.log(`Selected OCPP version: ${preferredVersion}`);
      return SUPPORTED_VERSIONS[preferredVersion];
    }
  }
  
  console.log('No compatible OCPP version found');
  return null;
}

export function getSupportedVersions(): string[] {
  return Object.keys(SUPPORTED_VERSIONS);
}

export function getVersionInfo(version: string): VersionInfo | null {
  return SUPPORTED_VERSIONS[version] || null;
}

export function isVersionSupported(version: string): boolean {
  return version in SUPPORTED_VERSIONS;
}

// Convert OCPP version string to subprotocol format
export function versionToSubprotocol(version: string): string {
  switch (version) {
    case '1.6':
      return 'ocpp1.6';
    case '2.0':
      return 'ocpp2.0';
    case '2.0.1':
      return 'ocpp2.0.1';
    default:
      return version; // Return as-is if already in subprotocol format
  }
}

// Convert subprotocol to version string
export function subprotocolToVersion(subprotocol: string): string {
  switch (subprotocol) {
    case 'ocpp1.6':
      return '1.6';
    case 'ocpp2.0':
      return '2.0';
    case 'ocpp2.0.1':
      return '2.0.1';
    default:
      return subprotocol; // Return as-is if already in version format
  }
}