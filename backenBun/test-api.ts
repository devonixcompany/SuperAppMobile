// Test script for SsTaxInvoiceProfile API
// Run with: bun run test-api.ts

const BASE_URL = 'http://localhost:8080';

// Mock user data for testing
const TEST_USER_ID = 'test-user-123';
const TEST_TOKEN = 'mock-token-for-dev'; // ใช้ใน development mode

// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`
    },
    ...options
  };

  try {
    console.log(`🔄 ${options.method || 'GET'} ${endpoint}`);
    const response = await fetch(url, defaultOptions);
    const data = await response.json();

    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));
    console.log('─'.repeat(80));

    return { response, data };
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('─'.repeat(80));
    throw error;
  }
}

// Test data
const personalProfile = {
  userId: TEST_USER_ID,
  taxpayerType: 'PERSONAL' as const,
  fullName: 'สมชาย ใจดี',
  taxId: '1234567890123',
  addressLine1: '123 ถนนสุขุมวิท',
  addressLine2: 'แขวงคลองตันเหนือ เขตวัฒนา',
  provinceId: '10',
  districtId: '1001',
  subdistrictId: '100101',
  postalCode: '10110',
  isDefault: true
};

const juristicProfile = {
  userId: TEST_USER_ID,
  taxpayerType: 'JURISTIC' as const,
  companyName: 'บริษัท ตัวอย่าง จำกัด',
  taxId: '1234567890',
  branchType: 'HEAD_OFFICE' as const,
  branchCode: '00000',
  addressLine1: '456 ถนนรัชดาภิเษก',
  addressLine2: 'แขวงห้วยขวาง เขตห้วยขวาง',
  provinceId: '10',
  districtId: '1002',
  subdistrictId: '100201',
  postalCode: '10400',
  isDefault: false
};

// Main test function
async function runTests() {
  console.log('🚀 Starting SsTaxInvoiceProfile API Tests');
  console.log('='.repeat(80));

  let createdPersonalId: string | null = null;
  let createdJuristicId: string | null = null;

  try {
    // Test 1: สร้างโปรไฟล์บุคคลธรรมดา
    console.log('📝 Test 1: สร้างโปรไฟล์บุคคลธรรมดา');
    const personalResult = await apiCall('/api/sstaxinvoiceprofile', {
      method: 'POST',
      body: JSON.stringify(personalProfile)
    });

    if (personalResult.response.status === 201 && personalResult.data.success) {
      createdPersonalId = personalResult.data.data.id;
      console.log('✅ สร้างโปรไฟล์บุคคลธรรมดาสำเร็จ ID:', createdPersonalId);
    }

    // Test 2: สร้างโปรไฟล์นิติบุคคล
    console.log('📝 Test 2: สร้างโปรไฟล์นิติบุคคล');
    const juristicResult = await apiCall('/api/sstaxinvoiceprofile', {
      method: 'POST',
      body: JSON.stringify(juristicProfile)
    });

    if (juristicResult.response.status === 201 && juristicResult.data.success) {
      createdJuristicId = juristicResult.data.data.id;
      console.log('✅ สร้างโปรไฟล์นิติบุคคลสำเร็จ ID:', createdJuristicId);
    }

    // Test 3: ดึงข้อมูลโปรไฟล์ทั้งหมดของผู้ใช้
    console.log('📝 Test 3: ดึงข้อมูลโปรไฟล์ทั้งหมดของผู้ใช้');
    await apiCall(`/api/sstaxinvoiceprofile/user/${TEST_USER_ID}`);

    // Test 4: ดึงข้อมูลโปรไฟล์ตาม ID (ถ้ามี)
    if (createdPersonalId) {
      console.log('📝 Test 4: ดึงข้อมูลโปรไฟล์บุคคลธรรมดาตาม ID');
      await apiCall(`/api/sstaxinvoiceprofile/${createdPersonalId}?userId=${TEST_USER_ID}`);
    }

    // Test 5: อัพเดตโปรไฟล์ (ถ้ามี)
    if (createdPersonalId) {
      console.log('📝 Test 5: อัพเดตโปรไฟล์บุคคลธรรมดา');
      await apiCall(`/api/sstaxinvoiceprofile/${createdPersonalId}?userId=${TEST_USER_ID}`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: 'สมชาย อัพเดต',
          addressLine2: 'อัพเดตที่อยู่ใหม่'
        })
      });
    }

    // Test 6: ตั้งโปรไฟล์เริ่มต้น (ถ้ามี)
    if (createdJuristicId) {
      console.log('📝 Test 6: ตั้งโปรไฟล์นิติบุคคลเป็นค่าเริ่มต้น');
      await apiCall(`/api/sstaxinvoiceprofile/${createdJuristicId}/set-default?userId=${TEST_USER_ID}`, {
        method: 'PUT'
      });
    }

    // Test 7: ทดสอบ Validation Error - บุคคลธรรมดาไม่มี fullName
    console.log('📝 Test 7: ทดสอบ Validation - บุคคลธรรมดาไม่มี fullName');
    await apiCall('/api/sstaxinvoiceprofile', {
      method: 'POST',
      body: JSON.stringify({
        userId: TEST_USER_ID,
        taxpayerType: 'PERSONAL',
        taxId: '9876543210987', // คนละคน
        addressLine1: 'ทดสอบ',
        provinceId: '10',
        districtId: '1001',
        subdistrictId: '100101',
        postalCode: '10110'
      })
    });

    // Test 8: ทดสอบ Validation Error - นิติบุคคลไม่มี companyName
    console.log('📝 Test 8: ทดสอบ Validation - นิติบุคคลไม่มี companyName');
    await apiCall('/api/sstaxinvoiceprofile', {
      method: 'POST',
      body: JSON.stringify({
        userId: TEST_USER_ID,
        taxpayerType: 'JURISTIC',
        taxId: '9876543210', // คนละคน
        branchType: 'HEAD_OFFICE',
        branchCode: '00000',
        addressLine1: 'ทดสอบ',
        provinceId: '10',
        districtId: '1001',
        subdistrictId: '100101',
        postalCode: '10110'
      })
    });

    // Test 9: ลบโปรไฟล์ (cleanup)
    if (createdPersonalId) {
      console.log('📝 Test 9: ลบโปรไฟล์บุคคลธรรมดา');
      await apiCall(`/api/sstaxinvoiceprofile/${createdPersonalId}?userId=${TEST_USER_ID}`, {
        method: 'DELETE'
      });
    }

    if (createdJuristicId) {
      console.log('📝 Test 10: ลบโปรไฟล์นิติบุคคล');
      await apiCall(`/api/sstaxinvoiceprofile/${createdJuristicId}?userId=${TEST_USER_ID}`, {
        method: 'DELETE'
      });
    }

    console.log('🎉 All tests completed!');

  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
}

// ทดสอบ health check ก่อน
async function checkServer() {
  try {
    console.log('🏥 Checking server health...');
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      console.log('✅ Server is healthy');
      return true;
    } else {
      console.log('❌ Server is not responding correctly');
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot connect to server. Make sure it\'s running on', BASE_URL);
    return false;
  }
}

// Run tests
async function main() {
  const serverOk = await checkServer();
  if (!serverOk) {
    console.log('\n📋 How to start the server:');
    console.log('1. cd C:/Users/ACER/Desktop/OCPP/SuperAppMobile/backenBun');
    console.log('2. bun run dev');
    console.log('3. หรือ bun run src/app.ts');
    console.log('\nThen run: bun run test-api.ts');
    process.exit(1);
  }

  await runTests();
}

// Run if this file is executed directly
if (import.meta.main) {
  main();
}

export { runTests, checkServer, personalProfile, juristicProfile };
