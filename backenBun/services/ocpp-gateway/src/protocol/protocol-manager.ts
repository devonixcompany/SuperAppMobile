import { Logger } from '../../../../shared/utils/logger.js';
import type {
  OCPPMessage,
  OCPPCall,
  OCPPCallResult,
  OCPPCallError,
  OCPPVersion,
  OCPPErrorCode
} from '../../../../shared/types/ocpp.js';

const logger = new Logger('OCPPProtocolManager');

export interface OCPPMessageHandler {
  handleCall(message: OCPPCall): Promise<OCPPCallResult | OCPPCallError>;
}

export class OCPPProtocolManager {
  private handlers: Map<string, OCPPMessageHandler> = new Map();
  private version: OCPPVersion;

  constructor(version: OCPPVersion) {
    this.version = version;
    this.setupHandlers();
  }

  private setupHandlers() {
    // Register handlers based on OCPP version
    switch (this.version) {
      case OCPPVersion.OCPP_16:
        this.setupOCPP16Handlers();
        break;
      case OCPPVersion.OCPP_201:
        this.setupOCPP201Handlers();
        break;
      case OCPPVersion.OCPP_21:
        this.setupOCPP21Handlers();
        break;
    }
  }

  private setupOCPP16Handlers() {
    logger.info('Setting up OCPP 1.6 handlers');
    // OCPP 1.6 specific handlers will be registered here
  }

  private setupOCPP201Handlers() {
    logger.info('Setting up OCPP 2.0.1 handlers');
    // OCPP 2.0.1 specific handlers will be registered here
  }

  private setupOCPP21Handlers() {
    logger.info('Setting up OCPP 2.1 handlers');
    // OCPP 2.1 specific handlers will be registered here
  }

  registerHandler(action: string, handler: OCPPMessageHandler) {
    this.handlers.set(action, handler);
    logger.debug(`Registered handler for action: ${action}`);
  }

  async handleMessage(message: OCPPMessage): Promise<OCPPCallResult | OCPPCallError | null> {
    try {
      if (message.type === 2) { // CALL
        const call = message as OCPPCall;
        const handler = this.handlers.get(call.action);

        if (!handler) {
          return this.createCallError(
            call.id,
            OCPPErrorCode.NOT_IMPLEMENTED,
            `Action ${call.action} not implemented`
          );
        }

        logger.debug(`Handling OCPP call: ${call.action}`, { messageId: call.id });
        return await handler.handleCall(call);
      }

      return null; // Only CALL messages need processing in this context
    } catch (error) {
      logger.error('Error handling OCPP message:', error);
      const messageId = (message as any).id || 'unknown';
      return this.createCallError(
        messageId,
        OCPPErrorCode.INTERNAL_ERROR,
        'Internal server error'
      );
    }
  }

  private createCallError(
    messageId: string,
    errorCode: OCPPErrorCode,
    errorDescription?: string,
    errorDetails?: any
  ): OCPPCallError {
    return {
      type: 4, // CALL_ERROR
      id: messageId,
      errorCode,
      errorDescription,
      errorDetails
    };
  }

  parseMessage(data: string): OCPPMessage | null {
    try {
      const parsed = JSON.parse(data);

      if (!Array.isArray(parsed) || parsed.length < 3) {
        throw new Error('Invalid OCPP message format');
      }

      const [type, id] = parsed;

      switch (type) {
        case 2: // CALL
          if (parsed.length !== 4) throw new Error('Invalid CALL message');
          return {
            type,
            id: String(id),
            action: parsed[2],
            payload: parsed[3]
          } as OCPPCall;

        case 3: // CALL_RESULT
          if (parsed.length !== 3) throw new Error('Invalid CALL_RESULT message');
          return {
            type,
            id: String(id),
            payload: parsed[2]
          } as OCPPCallResult;

        case 4: // CALL_ERROR
          if (parsed.length < 5) throw new Error('Invalid CALL_ERROR message');
          return {
            type,
            id: String(id),
            errorCode: parsed[2],
            errorDescription: parsed[3],
            errorDetails: parsed[4]
          } as OCPPCallError;

        default:
          throw new Error(`Unknown OCPP message type: ${type}`);
      }
    } catch (error) {
      logger.error('Failed to parse OCPP message:', error);
      return null;
    }
  }

  serializeMessage(message: OCPPMessage): string {
    switch (message.type) {
      case 2: // CALL
        const call = message as OCPPCall;
        return JSON.stringify([call.type, call.id, call.action, call.payload]);

      case 3: // CALL_RESULT
        const result = message as OCPPCallResult;
        return JSON.stringify([result.type, result.id, result.payload]);

      case 4: // CALL_ERROR
        const error = message as OCPPCallError;
        return JSON.stringify([
          error.type,
          error.id,
          error.errorCode,
          error.errorDescription || '',
          error.errorDetails || {}
        ]);

      default:
        throw new Error(`Cannot serialize unknown message type: ${message.type}`);
    }
  }

  getVersion(): OCPPVersion {
    return this.version;
  }
}