// Message router for OCPP protocol messages
import { handleMessage as handleV16Message } from '../versionModules/v1_6/handler';
import { handleMessage as handleV201Message } from '../versionModules/v2_0_1/handler';

export interface OCPPMessage {
  messageTypeId: number;
  messageId: string;
  action?: string;
  payload: any;
}

export interface RouteInfo {
  source: string;
  destination: string;
  version: string;
  message: OCPPMessage;
  chargePointId: string;
}

export interface MessageResponse {
  success: boolean;
  response?: any;
  error?: {
    code: string;
    description: string;
    details?: any;
  };
}

/**
 * Parse OCPP message from WebSocket data
 */
export function parseOCPPMessage(data: string): OCPPMessage | null {
  try {
    const parsed = JSON.parse(data);
    
    if (!Array.isArray(parsed) || parsed.length < 3) {
      throw new Error('Invalid OCPP message format');
    }

    const [messageTypeId, messageId, action, payload] = parsed;

    return {
      messageTypeId,
      messageId,
      action: messageTypeId === 2 ? action : undefined, // CALL message
      payload: messageTypeId === 2 ? payload : action // For CALL, payload is 4th element; for CALLRESULT/CALLERROR, it's 3rd
    };
  } catch (error) {
    console.error('Failed to parse OCPP message:', error);
    return null;
  }
}

/**
 * Format OCPP response message
 */
export function formatOCPPResponse(messageId: string, payload: any): string {
  // CALLRESULT message format: [3, messageId, payload]
  return JSON.stringify([3, messageId, payload]);
}

/**
 * Format OCPP error message
 */
export function formatOCPPError(messageId: string, errorCode: string, errorDescription: string, errorDetails?: any): string {
  // CALLERROR message format: [4, messageId, errorCode, errorDescription, errorDetails]
  return JSON.stringify([4, messageId, errorCode, errorDescription, errorDetails || {}]);
}

/**
 * Route OCPP message to appropriate version handler
 */
export async function routeMessage(routeInfo: RouteInfo): Promise<MessageResponse> {
  const { version, message, chargePointId } = routeInfo;
  
  try {
    console.log(`Routing ${message.action || 'response'} message for charge point ${chargePointId} using OCPP ${version}`);

    // Only handle CALL messages (messageTypeId = 2)
    if (message.messageTypeId !== 2) {
      console.log('Ignoring non-CALL message');
      return { success: true };
    }

    let response: any = null;

    // Route to version-specific handler
    switch (version) {
      case '1.6':
      case 'OCPP16':
      case 'ocpp1.6':
        response = await handleV16Message(message.action!, message.payload);
        break;
      
      case '2.0':
      case '2.0.1':
      case 'OCPP20':
      case 'OCPP201':
      case 'ocpp2.0':
      case 'ocpp2.0.1':
        response = await handleV201Message(message.action!, message.payload);
        break;
      
      default:
        throw new Error(`Unsupported OCPP version: ${version}`);
    }

    return {
      success: true,
      response
    };

  } catch (error: any) {
    console.error('Message routing error:', error);
    return {
      success: false,
      error: {
        code: 'InternalError',
        description: error.message || 'Internal server error',
        details: error
      }
    };
  }
}

/**
 * Handle incoming WebSocket message
 */
export async function handleWebSocketMessage(
  data: string, 
  chargePointId: string, 
  ocppVersion: string,
  sendResponse: (message: string) => void
): Promise<void> {
  const message = parseOCPPMessage(data);
  
  if (!message) {
    console.error('Failed to parse message from charge point:', chargePointId);
    return;
  }

  const routeInfo: RouteInfo = {
    source: chargePointId,
    destination: 'central_system',
    version: ocppVersion,
    message,
    chargePointId
  };

  const result = await routeMessage(routeInfo);

  // Send response back to charge point for CALL messages
  if (message.messageTypeId === 2) {
    let responseMessage: string;

    if (result.success && result.response !== null) {
      responseMessage = formatOCPPResponse(message.messageId, result.response);
    } else if (!result.success && result.error) {
      responseMessage = formatOCPPError(
        message.messageId,
        result.error.code,
        result.error.description,
        result.error.details
      );
    } else {
      // Default success response for messages that don't return data
      responseMessage = formatOCPPResponse(message.messageId, {});
    }

    sendResponse(responseMessage);
  }
}