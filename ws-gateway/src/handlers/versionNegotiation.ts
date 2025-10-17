// Version negotiation handler
// TODO: Implement subprotocol and version negotiation logic for OCPP

export interface VersionInfo {
  version: string;
  subprotocol: string;
}

export function negotiateVersion(requestedVersions: string[]): VersionInfo | null {
  // TODO: Implement version negotiation logic
  console.log('Negotiating OCPP version from:', requestedVersions);
  return null;
}