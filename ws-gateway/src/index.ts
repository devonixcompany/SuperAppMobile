import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';
import { handleConnection } from './handlers/connection';

const PORT = process.env.PORT || 8081;

// OCPP supported subprotocols
const SUPPORTED_SUBPROTOCOLS = [
  'ocpp1.6',
  'ocpp2.0',
  'ocpp2.0.1'
];

// In-memory storage for charge point data
interface ChargePointData {
  id: string;
  serialNumber: string;
  urlwebSocket: string;
  chargePointIdentity: string;
}

let chargePointsCache: Map<string, ChargePointData> = new Map();

/**
 * Load all charge points from database and cache them in memory
 */
async function loadChargePointsFromDatabase(): Promise<void> {
  try {
    console.log('Loading charge points from database...');
    const response = await fetch('http://localhost:8080/api/chargepoints/ws-gateway/chargepoints');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json() as { success?: boolean; data?: any[] };
    
    if (result.success && result.data) {
      const chargePoints = result.data;
      chargePoints.forEach((cp: any) => {
        chargePointsCache.set(cp.serialNumber, {
          id: cp.id,
          serialNumber: cp.serialNumber,
          urlwebSocket: cp.urlwebSocket,
          chargePointIdentity: cp.chargePointIdentity
        });
      });
      
      console.log(`Loaded ${chargePoints.length} charge points into cache`);
      console.log('Cached charge points (by serial):', Array.from(chargePointsCache.keys()));
    } else {
      console.log('No charge points found or invalid response structure');
    }
  } catch (error) {
    console.error('Error loading charge points from database:', error);
  }
}

/**
 * Get charge point data from cache by serial number
 */
export function getChargePointFromCache(serialNumber: string): ChargePointData | undefined {
  return chargePointsCache.get(serialNumber);
}

/**
 * Get all cached charge points
 */
export function getAllCachedChargePoints(): Map<string, ChargePointData> {
  return chargePointsCache;
}

/**
 * Update charge point cache by serial number
 */
export function updateChargePointCache(serialNumber: string, data: ChargePointData): void {
  chargePointsCache.set(serialNumber, data);
}

// Create WebSocket server with OCPP subprotocol support
const wss = new WebSocketServer({
  port: Number(PORT),
  handleProtocols: (protocols: Set<string>) => {
    // Find the first supported protocol from client's request
    for (const protocol of protocols) {
      if (SUPPORTED_SUBPROTOCOLS.includes(protocol)) {
        return protocol;
      }
    }
    // Return false if no supported protocol found
    return false;
  }
});

// Load charge points when server starts
loadChargePointsFromDatabase().then(() => {
  console.log(`WebSocket Gateway starting on port ${PORT}...`);
  console.log(`Supported OCPP protocols: ${SUPPORTED_SUBPROTOCOLS.join(', ')}`);
});

wss.on('connection', (ws, request) => {
  // Generate unique connection ID
  const connectionId = uuidv4();
  
  // Get the negotiated subprotocol
  const subprotocol = ws.protocol;
  
  console.log(`New connection established: ${connectionId}`);
  console.log(`Subprotocol: ${subprotocol}`);
  console.log(`URL: ${request.url}`);
  
  // Extract chargePointId from URL path
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const pathParts = url.pathname.split('/');
  const chargePointId = pathParts[pathParts.length - 1] || '';
  
  // Handle the connection
  handleConnection(ws, request, chargePointId, subprotocol);
});

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

process.on('SIGTERM', () => {
  console.log('Shutting down WebSocket Gateway...');
  wss.close(() => {
    console.log('WebSocket Gateway stopped');
    process.exit(0);
  });
});