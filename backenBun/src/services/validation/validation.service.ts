import {
  LoginData,
  RegistrationData,
  ValidationError,
  validateLoginData,
  validateRegistrationData
} from '../../lib/validation';

export class ValidationService {
  validateRegistrationData(data: RegistrationData): void {
    validateRegistrationData(data);
  }

  validateLoginData(data: LoginData): void {
    validateLoginData(data);
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('รหัสผ่านต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว');
    }
    
    if (!/\d/.test(password)) {
      errors.push('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    // Thai phone number validation (10 digits starting with 0)
    const phoneRegex = /^0[0-9]{9}$/;
    return phoneRegex.test(phoneNumber);
  }

  validateUserType(userType: string): boolean {
    return ['individual', 'corporate'].includes(userType);
  }

  validateFullName(fullName: string): boolean {
    return fullName.trim().length >= 2 && fullName.trim().length <= 100;
  }

  sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  validatePasswordConfirmation(password: string, confirmPassword: string): boolean {
    return password === confirmPassword;
  }

  validateBusinessRules(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Business rule: Corporate users must have company domain email
    if (data.userType === 'corporate' && data.email) {
      const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      const emailDomain = data.email.split('@')[1]?.toLowerCase();
      
      if (personalDomains.includes(emailDomain)) {
        errors.push('บัญชีองค์กรต้องใช้อีเมลของบริษัท ไม่สามารถใช้อีเมลส่วนตัวได้');
      }
    }

    // Business rule: Individual users cannot use certain reserved names
    if (data.userType === 'individual' && data.fullName) {
      const reservedNames = ['admin', 'administrator', 'root', 'system'];
      const nameWords = data.fullName.toLowerCase().split(' ');
      
      for (const word of nameWords) {
        if (reservedNames.includes(word)) {
          errors.push('ไม่สามารถใช้ชื่อที่สงวนไว้สำหรับระบบได้');
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}