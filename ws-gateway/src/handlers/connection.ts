import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
import { getChargePointFromCache } from '../index';
import { handleWebSocketMessage } from './messageRouter';

export interface ConnectionInfo {
  id: string;
  chargePointId: string;
  ocppVersion: string;
  connectedAt: Date;
  lastSeen: Date;
  isAuthenticated: boolean;
}

// Store active connections
const activeConnections = new Map<string, ConnectionInfo>();

/**
 * Validate charge point serial ID against cached data
 */
function validateSerialId(serialNumber: string): boolean {
  const cachedChargePoint = getChargePointFromCache(serialNumber);
  
  if (!cachedChargePoint) {
    console.log(`Serial number ${serialNumber} not found in cache`);
    return false;
  }
  
  console.log(`Found charge point for serial ${serialNumber}:`, cachedChargePoint);
  return true;
}

/**
 * Extract serial ID from URL or connection headers
 */
function extractSerialId(request: any, chargePointId: string): string | null {
  // Try to extract from URL path first
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const pathParts = url.pathname.split('/');
  
  // Look for serial in query parameters
  const serialFromQuery = url.searchParams.get('serial');
  if (serialFromQuery) {
    return serialFromQuery;
  }
  
  // Try to extract from headers
  const serialFromHeader = request.headers['x-serial-number'] || request.headers['serial-number'];
  if (serialFromHeader) {
    return serialFromHeader;
  }
  
  // Fallback: use chargePointId as serial (for backward compatibility)
  return chargePointId;
}

/**
 * Validate charge point against backend API
 */
async function validateChargePoint(chargePointId: string, ocppVersion: string): Promise<boolean> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    // Convert ocpp1.6 to OCPP16 format
    let versionFormatted = ocppVersion.toUpperCase();
    if (versionFormatted.includes('.')) {
      versionFormatted = versionFormatted.replace('.', '').replace('OCPP', 'OCPP');
    }
    
    console.log(`Validating charge point ${chargePointId} with version ${versionFormatted}`);
    console.log(`Making request to: ${backendUrl}/api/chargepoints/${chargePointId}/validate-ocpp`);
    
    const response = await fetch(`${backendUrl}/api/chargepoints/${chargePointId}/validate-ocpp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: versionFormatted
      })
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response ok: ${response.ok}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Validation failed for ${chargePointId}: ${response.status} - ${errorText}`);
      return false;
    }

    const result = await response.json() as { success: boolean; data: { isValid: boolean } };
    console.log(`Validation result for ${chargePointId}:`, result);
    return result.success && result.data.isValid;
  } catch (error) {
    console.error(`Error validating charge point ${chargePointId}:`, error);
    console.error(`Full error details:`, JSON.stringify(error, null, 2));
    return false;
  }
}

/**
 * Update connection status in backend
 */
async function updateConnectionStatus(chargePointId: string, isConnected: boolean): Promise<void> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    await fetch(`${backendUrl}/api/chargepoints/${chargePointId}/connection-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isConnected })
    });
  } catch (error) {
    console.error(`Error updating connection status for ${chargePointId}:`, error);
  }
}

/**
 * Register charge point in database if not exists
 */
async function registerChargePoint(chargePointId: string, ocppVersion: string): Promise<boolean> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    // First, check if charge point already exists
    console.log(`Checking if charge point ${chargePointId} exists...`);
    const checkResponse = await fetch(`${backendUrl}/api/chargepoints/${chargePointId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (checkResponse.ok) {
      console.log(`Charge point ${chargePointId} already exists`);
      return true;
    }

    // Convert ocpp version format
    let protocolVersion = 'OCPP16'; // default
    if (ocppVersion.includes('1.6')) {
      protocolVersion = 'OCPP16';
    } else if (ocppVersion.includes('2.0.1')) {
      protocolVersion = 'OCPP21';
    } else if (ocppVersion.includes('2.0')) {
      protocolVersion = 'OCPP20';
    }

    console.log(`Registering charge point ${chargePointId} with protocol ${protocolVersion}`);
    console.log(`Backend URL: ${backendUrl}`);

    const response = await fetch(`${backendUrl}/api/chargepoints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: chargePointId,
        name: `Auto-registered ${chargePointId}`,
        location: 'Auto-registered location',
        protocol: protocolVersion,
        maxPower: 22.0,
        connectorCount: 1,
        isPublic: true
      })
    });

    console.log(`Response status: ${response.status}`);

    if (response.ok) {
      const result = await response.json();
      console.log(`Successfully registered charge point ${chargePointId}:`, result);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`Failed to register charge point ${chargePointId}: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`Error registering charge point ${chargePointId}:`, error);
    return false;
  }
}

/**
 * Handle WebSocket connection
 */
export async function handleConnection(ws: WebSocket, request: any, chargePointId: string, ocppVersion: string): Promise<void> {
  const connectionId = uuidv4();
  
  console.log(`New connection attempt: ${chargePointId} with OCPP ${ocppVersion}`);

  // Extract serial ID from request
  const serialNumber = extractSerialId(request, chargePointId);
  
  if (!serialNumber) {
    console.log(`No serial number found for connection: ${chargePointId}`);
    ws.close(1008, 'Serial number required');
    return;
  }

  // Validate serial ID against cached data
  const isValidSerial = validateSerialId(serialNumber);
  if (!isValidSerial) {
    console.log(`Invalid serial number: ${serialNumber}`);
    ws.close(1008, 'Invalid serial number');
    return;
  }

  // Get charge point data from cache using serial number
  const cachedChargePoint = getChargePointFromCache(serialNumber);
  
  if (cachedChargePoint) {
    console.log(`Found existing charge point in cache: ${serialNumber}`);
    console.log(`Cached data:`, cachedChargePoint);
    
    // Validate that the chargePointId matches the cached chargePointIdentity
    if (cachedChargePoint.chargePointIdentity !== chargePointId) {
      console.log(`ChargePoint ID mismatch for serial ${serialNumber}. Expected: ${cachedChargePoint.chargePointIdentity}, Received: ${chargePointId}`);
      ws.close(1008, 'ChargePoint ID mismatch');
      return;
    }
  } else {
    console.log(`Charge point with serial ${serialNumber} not found in cache`);
    ws.close(1008, 'Charge point not registered');
    return;
  }

  // Validate charge point (keeping existing validation for additional checks)
  const isValid = await validateChargePoint(chargePointId, ocppVersion);
  if (!isValid) {
    console.log(`Invalid charge point: ${chargePointId}`);
    ws.close(1008, 'Invalid charge point or OCPP version');
    return;
  }

  // Store connection info
  const connectionInfo: ConnectionInfo = {
    id: connectionId,
    chargePointId,
    ocppVersion,
    connectedAt: new Date(),
    lastSeen: new Date(),
    isAuthenticated: true
  };

  activeConnections.set(connectionId, connectionInfo);
  console.log(`Charge point ${chargePointId} connected successfully with OCPP ${ocppVersion}`);

  // Update backend about connection
  await updateConnectionStatus(chargePointId, true);

  // Handle incoming messages
  ws.on('message', async (data: Buffer) => {
    try {
      const message = data.toString();
      console.log(`Message from ${chargePointId}:`, message);

      // Update last seen
      connectionInfo.lastSeen = new Date();

      // Process message through router
      await handleWebSocketMessage(
        message,
        chargePointId,
        ocppVersion,
        (response: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(response);
            console.log(`Response to ${chargePointId}:`, response);
          }
        }
      );

    } catch (error) {
      console.error(`Error processing message from ${chargePointId}:`, error);
    }
  });

  // Handle connection close
  ws.on('close', async (code: number, reason: Buffer) => {
    console.log(`Charge point ${chargePointId} disconnected: ${code} - ${reason.toString()}`);
    activeConnections.delete(connectionId);
    await updateConnectionStatus(chargePointId, false);
  });

  // Handle connection error
  ws.on('error', async (error: Error) => {
    console.error(`WebSocket error for ${chargePointId}:`, error);
    activeConnections.delete(connectionId);
    await updateConnectionStatus(chargePointId, false);
  });

  // Send periodic heartbeat
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      // Update last seen
      connectionInfo.lastSeen = new Date();
    } else {
      clearInterval(heartbeatInterval);
      activeConnections.delete(connectionId);
    }
  }, 30000); // 30 seconds

  // Clean up on close
  ws.on('close', () => {
    clearInterval(heartbeatInterval);
  });
}

/**
 * Get all active connections
 */
export function getActiveConnections(): ConnectionInfo[] {
  return Array.from(activeConnections.values());
}

/**
 * Get connection by charge point ID
 */
export function getConnectionByChargePointId(chargePointId: string): ConnectionInfo | undefined {
  return Array.from(activeConnections.values()).find(conn => conn.chargePointId === chargePointId);
}

/**
 * Disconnect charge point
 */
export function disconnectChargePoint(chargePointId: string): boolean {
  const connection = getConnectionByChargePointId(chargePointId);
  if (connection) {
    activeConnections.delete(connection.id);
    return true;
  }
  return false;
}