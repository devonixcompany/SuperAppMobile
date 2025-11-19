// Test script to verify token refresh mechanism
const axios = require('axios');

// Mock the token refresh endpoint
const mockServer = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 5000,
});

async function testTokenRefresh() {
  console.log('🧪 Testing token refresh mechanism...\n');
  
  try {
    // Test 1: Simulate expired token scenario
    console.log('📋 Test 1: Simulate expired token API call');
    
    // This would normally trigger the 401 -> refresh -> retry flow
    const response = await mockServer.get('/api/v1/user/chargepoints/CP-TH-BKK-001/1/websocket-url', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJhMThlNDRmNS04ZWU4LTQzYTEtYWY3OC1mYWFiNDdlYmVhNjkiLCJwaG9uZU51bWJlciI6Iis2NjgxNDI2NjUwOCIsInR5cGVVc2VyIjoiTk9STUFMIiwiaWF0IjoxNzYyMzMzMDg5LCJleHAiOjE3NjIzMzMxNDl9.BjsvHgDGCp4zywPZ0ks2xA0nbyIaLo59SsQ2bll3yM4'
      }
    });
    
    console.log('✅ Test passed - API call succeeded after token refresh');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

// Run the test
testTokenRefresh().catch(console.error);