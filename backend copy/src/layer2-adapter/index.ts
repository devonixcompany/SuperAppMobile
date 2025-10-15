/**
 * Layer 2: Protocol Adapter (Version Interpreters)
 * 
 * แปลงรูปแบบข้อความ (เช่น JSON Payload) จากแต่ละเวอร์ชันที่ไม่เข้ากัน 
 * ให้เป็นรูปแบบข้อมูลมาตรฐานภายใน (Internal Standard Message) ที่ Core Logic เข้าใจได้
 */

export { OCPP16Adapter } from './ocpp16';
export { OCPP20Adapter } from './ocpp20';
export { OCPP21Adapter } from './ocpp21';
export { ProtocolAdapterManager } from './protocol-adapter-manager';
export { InternalStandardMessage } from './types';