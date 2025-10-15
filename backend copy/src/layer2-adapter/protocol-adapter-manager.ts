/**
 * Protocol Adapter Manager
 * 
 * จัดการการทำงานของ Protocol Adapters ทั้งหมด
 */

import { OCPPMessage, InternalStandardMessage } from './types';
import { OCPP16Adapter } from './ocpp16';
import { OCPP20Adapter } from './ocpp20';
import { OCPP21Adapter } from './ocpp21';
import { EventEmitter } from 'events';

export interface AdapterConfig {
  enableLogging: boolean;
  enableValidation: boolean;
}

export class ProtocolAdapterManager extends EventEmitter {
  private ocpp16Adapter: OCPP16Adapter;
  private ocpp20Adapter: OCPP20Adapter;
  private ocpp21Adapter: OCPP21Adapter;
  private config: AdapterConfig;

  constructor(config: Partial<AdapterConfig> = {}) {
    super();
    
    this.config = {
      enableLogging: true,
      enableValidation: true,
      ...config
    };

    this.ocpp16Adapter = new OCPP16Adapter();
    this.ocpp20Adapter = new OCPP20Adapter();
    this.ocpp21Adapter = new OCPP21Adapter();
  }

  /**
   * แปลงข้อความจาก OCPP เป็น Internal Standard Message
   */
  convertToInternal(ocppMessage: OCPPMessage, chargePointId: string, protocol: 'OCPP16' | 'OCPP20' | 'OCPP21'): InternalStandardMessage {
    try {
      let internalMessage: InternalStandardMessage;
      
      switch (protocol) {
        case 'OCPP16':
          internalMessage = this.ocpp16Adapter.convertToInternal(ocppMessage, chargePointId);
          break;
        case 'OCPP20':
          internalMessage = this.ocpp20Adapter.convertToInternal(ocppMessage, chargePointId);
          break;
        case 'OCPP21':
          internalMessage = this.ocpp21Adapter.convertToInternal(ocppMessage, chargePointId);
          break;
        default:
          throw new Error(`Unsupported protocol: ${protocol}`);
      }

      if (this.config.enableLogging) {
        console.log(`Converted OCPP ${protocol} message to internal format:`, internalMessage);
      }

      // ส่งข้อความที่แปลงแล้วไปยัง Layer 3 (Core Business Logic)
      this.emit('internalMessage', internalMessage);
      
      return internalMessage;
    } catch (error) {
      console.error(`Error converting OCPP ${protocol} message to internal format:`, error);
      this.emit('conversionError', { error, ocppMessage, protocol, chargePointId });
      throw error;
    }
  }

  /**
   * แปลงข้อความจาก Internal Standard Message เป็น OCPP
   */
  convertFromInternal(internalMessage: InternalStandardMessage): OCPPMessage {
    try {
      let ocppMessage: OCPPMessage;
      
      switch (internalMessage.protocol) {
        case 'OCPP16':
          ocppMessage = this.ocpp16Adapter.convertFromInternal(internalMessage);
          break;
        case 'OCPP20':
          ocppMessage = this.ocpp20Adapter.convertFromInternal(internalMessage);
          break;
        case 'OCPP21':
          ocppMessage = this.ocpp21Adapter.convertFromInternal(internalMessage);
          break;
        default:
          throw new Error(`Unsupported protocol: ${internalMessage.protocol}`);
      }

      if (this.config.enableLogging) {
        console.log(`Converted internal message to OCPP ${internalMessage.protocol}:`, ocppMessage);
      }

      return ocppMessage;
    } catch (error) {
      console.error(`Error converting internal message to OCPP ${internalMessage.protocol}:`, error);
      this.emit('conversionError', { error, internalMessage });
      throw error;
    }
  }

  /**
   * ตรวจสอบว่า protocol ที่ระบุได้รับการสนับสนุนหรือไม่
   */
  isProtocolSupported(protocol: string): boolean {
    return protocol === 'OCPP16' || protocol === 'OCPP20' || protocol === 'OCPP21';
  }

  /**
   * ดึงรายการ protocols ที่รองรับ
   */
  getSupportedProtocols(): string[] {
    return ['OCPP16', 'OCPP20', 'OCPP21'];
  }

  /**
   * ตรวจสอบความถูกต้องของข้อความ OCPP
   */
  validateOCPPMessage(ocppMessage: OCPPMessage, protocol: 'OCPP16' | 'OCPP20' | 'OCPP21'): boolean {
    if (!this.config.enableValidation) {
      return true;
    }

    // Basic validation
    if (!ocppMessage.messageId || typeof ocppMessage.messageId !== 'string') {
      return false;
    }

    if (typeof ocppMessage.messageType !== 'number' || ocppMessage.messageType < 2 || ocppMessage.messageType > 4) {
      return false;
    }

    // For CALL messages (messageType = 2), action is required
    if (ocppMessage.messageType === 2 && (!ocppMessage.action || typeof ocppMessage.action !== 'string')) {
      return false;
    }

    return true;
  }

  /**
   * ตรวจสอบความถูกต้องของ Internal Standard Message
   */
  validateInternalMessage(internalMessage: InternalStandardMessage): boolean {
    if (!this.config.enableValidation) {
      return true;
    }

    // Basic validation
    if (!internalMessage.messageId || typeof internalMessage.messageId !== 'string') {
      return false;
    }

    if (!internalMessage.chargePointId || typeof internalMessage.chargePointId !== 'string') {
      return false;
    }

    if (!internalMessage.action || typeof internalMessage.action !== 'string') {
      return false;
    }

    if (!this.isProtocolSupported(internalMessage.protocol)) {
      return false;
    }

    return true;
  }

  /**
   * อัปเดตค่า config
   */
  updateConfig(newConfig: Partial<AdapterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * ดึงค่า config ปัจจุบัน
   */
  getConfig(): AdapterConfig {
    return { ...this.config };
  }
}