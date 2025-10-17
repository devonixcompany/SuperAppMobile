// Validation utility
// TODO: Implement validation functions for OCPP messages and data

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateCPId(cpId: string): ValidationResult {
  // TODO: Validate Charge Point ID format
  const errors: string[] = [];
  
  if (!cpId || cpId.trim() === '') {
    errors.push('Charge Point ID cannot be empty');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateOCPPMessage(message: string): ValidationResult {
  // TODO: Validate OCPP message format
  const errors: string[] = [];
  
  try {
    JSON.parse(message);
  } catch (e) {
    errors.push('Invalid JSON format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateVersion(version: string): ValidationResult {
  // TODO: Validate OCPP version
  const validVersions = ['1.6', '2.0.1'];
  const errors: string[] = [];
  
  if (!validVersions.includes(version)) {
    errors.push(`Unsupported OCPP version: ${version}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}