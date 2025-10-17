// @ts-nocheck
import { validatePhoneNumber } from '../src/lib/validation';

// Simple test functions without external test framework
function testPhoneValidation() {
  console.log('Testing phone number validation...');
  
  // Test cases
  const testCases = [
    { input: '+66814266508', expected: true, description: 'Thai phone with +66 country code' },
    { input: '66814266508', expected: true, description: 'Thai phone with 66 country code (no plus)' },
    { input: '0814266508', expected: true, description: 'Thai phone in local format with leading 0' },
    { input: '814266508', expected: true, description: 'Thai phone in national format without leading 0' },
    { input: '+66 81-426-6508', expected: true, description: 'Thai phone with spaces and dashes' },
    { input: '081 426 6508', expected: true, description: 'Local format with spaces' },
    { input: '66-81-426-6508', expected: true, description: 'International format with dashes' },
    { input: '123', expected: false, description: 'Too short number' },
    { input: '12345678901234', expected: false, description: 'Too long number' },
    { input: '1234567890', expected: false, description: 'Wrong country code' },
    { input: '', expected: false, description: 'Empty string' },
    { input: '1814266508', expected: false, description: 'US country code' },
    { input: '44814266508', expected: false, description: 'UK country code' }
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach(testCase => {
    const result = validatePhoneNumber(testCase.input);
    if (result === testCase.expected) {
      console.log(`✓ ${testCase.description}`);
      passed++;
    } else {
      console.log(`✗ ${testCase.description} - Expected: ${testCase.expected}, Got: ${result}`);
      failed++;
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Run tests if this file is executed directly
if (import.meta.main) {
  testPhoneValidation();
}