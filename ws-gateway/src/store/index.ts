// State management store
// TODO: Implement storage for mapping cpId → connection, version info

export interface ConnectionInfo {
  cpId: string;
  connection: any;
  version: string;
  connectedAt: Date;
}

class ConnectionStore {
  private connections: Map<string, ConnectionInfo> = new Map();

  addConnection(cpId: string, connection: any, version: string): void {
    // TODO: Add connection to store
    console.log(`Adding connection for CP ${cpId} with version ${version}`);
  }

  removeConnection(cpId: string): void {
    // TODO: Remove connection from store
    console.log(`Removing connection for CP ${cpId}`);
  }

  getConnection(cpId: string): ConnectionInfo | undefined {
    // TODO: Get connection from store
    return undefined;
  }

  getAllConnections(): ConnectionInfo[] {
    // TODO: Get all connections from store
    return [];
  }
}

export const connectionStore = new ConnectionStore();