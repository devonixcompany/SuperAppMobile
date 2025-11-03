# SsTaxInvoiceProfile API

โมดูลสำหรับจัดการโปรไฟล์ใบกำกับภาษีของผู้ใช้ในระบบ SuperApp

## คุณสมบัติ

- รองรับทั้งบุคคลธรรมดาและนิติบุคคล
- จัดการข้อมูลที่อยู่แบบมีลำดับชั้น (จังหวัด/อำเภอ/ตำบล)
- รองรับสาขาของนิติบุคคล
- สามารถตั้งโปรไฟล์เริ่มต้นได้
- ป้องกันข้อมูลซ้ำต่อผู้ใช้แต่ละคน

## API Endpoints

### 1. สร้างโปรไฟล์ใบกำกับภาษี
```
POST /api/sstaxinvoiceprofile
```

#### ตัวอย่าง Request (บุคคลธรรมดา)
```json
{
  "userId": "user_123",
  "taxpayerType": "PERSONAL",
  "fullName": "สมชาย ใจดี",
  "taxId": "1234567890123",
  "addressLine1": "123 ถนนสุขุมวิท",
  "addressLine2": "แขวงคลองตันเหนือ เขตวัฒนา",
  "provinceId": "10",
  "districtId": "1001",
  "subdistrictId": "100101",
  "postalCode": "10110",
  "isDefault": true
}
```

#### ตัวอย่าง Request (นิติบุคคล)
```json
{
  "userId": "user_456",
  "taxpayerType": "JURISTIC",
  "companyName": "บริษัท ตัวอย่าง จำกัด",
  "taxId": "1234567890",
  "branchType": "HEAD_OFFICE",
  "branchCode": "00000",
  "addressLine1": "456 ถนนรัชดาภิเษก",
  "provinceId": "10",
  "districtId": "1002",
  "subdistrictId": "100201",
  "postalCode": "10400",
  "isDefault": false
}
```

### 2. ดึงข้อมูลโปรไฟล์ทั้งหมดของผู้ใช้
```
GET /api/sstaxinvoiceprofile/user/{userId}
```

### 3. ดึงข้อมูลโปรไฟล์ตาม ID
```
GET /api/sstaxinvoiceprofile/{id}?userId={userId}
```

### 4. อัพเดตโปรไฟล์
```
PUT /api/sstaxinvoiceprofile/{id}?userId={userId}
```

### 5. ลบโปรไฟล์
```
DELETE /api/sstaxinvoiceprofile/{id}?userId={userId}
```

### 6. ตั้งโปรไฟล์เริ่มต้น
```
PUT /api/sstaxinvoiceprofile/{id}/set-default?userId={userId}
```

## การตรวจสอบข้อมูล

### สำหรับบุคคลธรรมดา (PERSONAL)
- `fullName` (จำเป็น)
- `taxId` ต้องมี 13 หลัก

### สำหรับนิติบุคคล (JURISTIC)
- `companyName` (จำเป็น)
- `taxId` ต้องมี 10 หลัก
- `branchType` (จำเป็น) - HEAD_OFFICE หรือ BRANCH
- `branchCode` (จำเป็น) - เช่น "00000" สำหรับสำนักงานใหญ่

### ที่อยู่
- `addressLine1` (จำเป็น)
- `provinceId` (จำเป็น) - รหัสจังหวัด
- `districtId` (จำเป็น) - รหัสอำเภอ
- `subdistrictId` (จำเป็น) - รหัสตำบล
- `postalCode` (จำเป็น) - รหัสไปรษณีย์

## การตอบสนอง (Response)

### สำเร็จ (201/200)
```json
{
  "success": true,
  "message": "สร้างโปรไฟล์ใบกำกับภาษีสำเร็จ",
  "data": {
    "id": "profile_abc123",
    "userId": "user_123",
    "taxpayerType": "PERSONAL",
    "fullName": "สมชาย ใจดี",
    "taxId": "1234567890123",
    "addressLine1": "123 ถนนสุขุมวิท",
    "addressLine2": "แขวงคลองตันเหนือ เขตวัฒนา",
    "provinceId": "10",
    "districtId": "1001",
    "subdistrictId": "100101",
    "postalCode": "10110",
    "isDefault": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
}
```

### ผิดพลาด (400/404/500)
```json
{
  "success": false,
  "message": "Full name is required for personal taxpayer"
}
```

## ข้อควรระวัง

1. **การตั้งค่าเริ่มต้น**: เมื่อตั้งโปรไฟล์ใหม่เป็น `isDefault: true` โปรไฟล์เริ่มต้นเดิมจะถูกยกเลิกโดยอัตโนมัติ
2. **การไม่ซ้ำกัน**: ระบบจะป้องกันการสร้างโปรไฟล์ที่ซ้ำกันสำหรับผู้ใช้แต่ละคน (userId + taxId + branchCode)
3. **การตรวจสอบสิทธิ์**: ทุกการดำเนินการต้องระบุ `userId` เพื่อตรวจสอบว่าโปรไฟล์เป็นของผู้ใช้รายนั้นจริง

## การใช้งานกับ Frontend

```typescript
// สร้างโปรไฟล์ใหม่
const createProfile = async (profileData) => {
  try {
    const response = await fetch('/api/sstaxinvoiceprofile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('สร้างโปรไฟล์สำเร็จ:', result.data);
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error);
  }
};

// ดึงข้อมูลโปรไฟล์ทั้งหมด
const getProfiles = async (userId) => {
  const response = await fetch(`/api/sstaxinvoiceprofile/user/${userId}`);
  const result = await response.json();
  return result.data;
};
```
