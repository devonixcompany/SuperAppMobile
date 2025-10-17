export interface RegistrationData {
  firebaseUid: string;
  phoneNumber: string;
  userType: 'individual' | 'corporate';
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  phoneNumber: string;
  password: string;
}

// Keep email login for backward compatibility
export interface EmailLoginData {
  email: string;
  password: string;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 6) {
    return { isValid: false, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' };
  }
  
  // You can add more password validation rules here
  // For example: require uppercase, lowercase, numbers, special characters
  
  return { isValid: true };
}

export function validateRegistrationData(data: RegistrationData): void {
  if (!data.firebaseUid || !data.firebaseUid.trim()) {
    throw new ValidationError('กรุณาระบุ Firebase UID');
  }
  
  if (!data.phoneNumber || !data.phoneNumber.trim()) {
    throw new ValidationError('กรุณาระบุหมายเลขโทรศัพท์');
  }
  
  if (!validatePhoneNumber(data.phoneNumber)) {
    throw new ValidationError('รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง');
  }
  
  if (!data.fullName.trim()) {
    throw new ValidationError('กรุณากรอกชื่อ-นามสกุล');
  }
  
  if (!data.email.trim()) {
    throw new ValidationError('กรุณากรอกอีเมล');
  }
  
  if (!validateEmail(data.email)) {
    throw new ValidationError('รูปแบบอีเมลไม่ถูกต้อง');
  }
  
  if (!data.password.trim()) {
    throw new ValidationError('กรุณากรอกรหัสผ่าน');
  }
  
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    throw new ValidationError(passwordValidation.message!);
  }
  
  if (data.password !== data.confirmPassword) {
    throw new ValidationError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
  }
}

export function validatePhoneNumber(phoneNumber: string): boolean {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check for Thai phone numbers with different formats:
  // 1. Local format: 0814266508 (10 digits starting with 0)
  // 2. National format: 814266508 (9 digits without leading 0)
  // 3. International format: 66814266508 (11 digits with country code 66)
  
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // Local format: 0XXXXXXXXX
    return true;
  }
  
  if (cleaned.length === 9) {
    // National format: XXXXXXXXX
    return true;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('66')) {
    // International format: 66XXXXXXXXX
    return true;
  }
  
  return false;
}

export function validateLoginData(data: LoginData): void {
  if (!data.phoneNumber.trim()) {
    throw new ValidationError('กรุณากรอกหมายเลขโทรศัพท์');
  }
  
  if (!validatePhoneNumber(data.phoneNumber)) {
    throw new ValidationError('รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง');
  }
  
  if (!data.password.trim()) {
    throw new ValidationError('กรุณากรอกรหัสผ่าน');
  }
}

export function validateEmailLoginData(data: EmailLoginData): void {
  if (!data.email.trim()) {
    throw new ValidationError('กรุณากรอกอีเมล');
  }
  
  if (!validateEmail(data.email)) {
    throw new ValidationError('รูปแบบอีเมลไม่ถูกต้อง');
  }
  
  if (!data.password.trim()) {
    throw new ValidationError('กรุณากรอกรหัสผ่าน');
  }
}