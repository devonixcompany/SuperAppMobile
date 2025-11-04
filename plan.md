# โฟลว์การเพิ่มบัตรเครดิตและตัดเงินเมื่อการชาร์จเสร็จ
## SuperApp EV Charging & Payment System

### สถาปัตยกรรมปัจจุบัน:
- **Backend**: Elysia + Prisma + TypeScript (backenBun/)
- **Frontend**: React Native + Expo Router (SuperApp/)
- **Database**: PostgreSQL with Prisma ORM
- **WebSocket Gateway**: ws-gateway/ สำหรับ OCPP communication

---

## 1. โครงสร้างฐานข้อมูลที่มีอยู่แล้ว

### Models ที่เกี่ยวข้อง:
```prisma
// User model มี omiseCustomerId แล้ว
model User {
  omiseCustomerId String? @unique
  paymentCards    PaymentCard[]
  payments        Payment[]
}

// PaymentCard model มีอยู่แล้ว
model PaymentCard {
  omiseCardId     String @unique
  omiseCustomerId String?
  brand           String?
  lastDigits      String?
  isDefault       Boolean @default(false)
}

// Payment model มีอยู่แล้ว
model Payment {
  provider        String @default("OMISE")
  amount          Float
  currency        String @default("THB")
  status          PaymentStatus @default(PENDING)
  chargeId        String? @unique
  cardId          String?
  paymentLogs     PaymentLog[]
}

// Transaction model มีอยู่แล้ว
model Transaction {
  totalCost       Float?
  appliedRate     Float?
  payments        Payment[]
}
```

---

## 2. API Endpoints ที่ต้องสร้าง

### Backend (backenBun/src/user/):

#### Payment Service & Controller
```typescript
// src/user/payment/payment.service.ts
// src/user/payment/payment.controller.ts
```

**Endpoints ที่ต้องสร้าง:**
- `POST /api/payment/cards` - เพิ่มบัตรเครดิต
- `GET /api/payment/cards` - ดูบัตรทั้งหมด
- `DELETE /api/payment/cards/:cardId` - ลบบัตร
- `PUT /api/payment/cards/:cardId/default` - ตั้งบัตรหลัก
- `POST /api/payment/charge` - เรียกเก็บเงิน (internal use)

### Frontend (SuperApp/):

#### Payment Features
```typescript
// SuperApp/features/payment/
// SuperApp/services/api/payment.service.ts (มีอยู่บางส่วนแล้ว)
```

---

## 3. การทำงานของระบบ

### 3.1 เพิ่มบัตรเครดิต

**React Native (SuperApp/):**
```typescript
// ใช้ Omise React Native SDK
import { Omise } from 'omise-react-native';

// รับข้อมูลบัตร → Omise.createToken() → ได้ token
const token = await Omise.createToken({
  card: {
    number: cardNumber,
    expiration_month: expiryMonth,
    expiration_year: expiryYear,
    security_code: cvv,
    name: cardholderName
  }
});
```

**Backend (backenBun/src/user/payment/):**
```typescript
// POST /api/payment/cards
async addPaymentCard(userId: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user.omiseCustomerId) {
    // สร้าง Omise Customer ใหม่
    const customer = await omise.customers.create({
      card: token,
      description: `Customer for user ${userId}`
    });
    
    // อัปเดต User.omiseCustomerId
    await prisma.user.update({
      where: { id: userId },
      data: { omiseCustomerId: customer.id }
    });
    
    // บันทึก PaymentCard
    await prisma.paymentCard.create({
      data: {
        userId,
        omiseCardId: customer.cards.data[0].id,
        omiseCustomerId: customer.id,
        brand: customer.cards.data[0].brand,
        lastDigits: customer.cards.data[0].last_digits,
        isDefault: true
      }
    });
  } else {
    // เพิ่มบัตรใหม่ให้ Customer ที่มีอยู่
    const card = await omise.customers.update(user.omiseCustomerId, {
      card: token
    });
    
    await prisma.paymentCard.create({
      data: {
        userId,
        omiseCardId: card.id,
        omiseCustomerId: user.omiseCustomerId,
        brand: card.brand,
        lastDigits: card.last_digits,
        isDefault: false
      }
    });
  }
}
```

### 3.2 การชาร์จและการชำระเงิน

**เมื่อเริ่มชาร์จ:**
- ใช้ Transaction Service ที่มีอยู่แล้ว (`src/user/transaction/transaction.service.ts`)
- สร้าง Transaction ผ่าน `POST /api/transactions`

**เมื่อชาร์จเสร็จ:**
- OCPP ส่ง StopTransaction → `POST /api/transactions/ocpp/:ocppTransactionId/stop`
- TransactionService.recordStopTransaction() คำนวณ:
  - `totalEnergy` = endMeterValue - startMeterValue
  - `totalCost` = totalEnergy × appliedRate (on-peak/off-peak จาก ChargePoint)
  - `appliedRate` จาก ChargePoint.onPeakRate/offPeakRate

**การเรียกเก็บเงิน:**
```typescript
// เพิ่มใน TransactionService.recordStopTransaction()
async processPayment(transactionId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { user: { include: { paymentCards: true } } }
  });
  
  // สร้าง Payment record
  const payment = await prisma.payment.create({
    data: {
      transactionId,
      userId: transaction.userId,
      amount: transaction.totalCost,
      currency: "THB",
      status: "PENDING",
      provider: "OMISE"
    }
  });
  
  // หาบัตรหลัก
  const defaultCard = transaction.user.paymentCards.find(card => card.isDefault);
  
  // เรียกเก็บเงินผ่าน Omise
  const charge = await omise.charges.create({
    amount: Math.round(transaction.totalCost * 100), // แปลงเป็นสตางค์
    currency: "THB",
    customer: transaction.user.omiseCustomerId,
    card: defaultCard?.omiseCardId,
    description: `Charging session ${transactionId}`
  });
  
  // บันทึก PaymentLog
  await prisma.paymentLog.create({
    data: {
      paymentId: payment.id,
      rawRequest: { /* Omise request */ },
      rawResponse: charge,
      eventType: "CHARGE_CREATE"
    }
  });
  
  if (charge.status === 'successful') {
    // อัปเดต Payment และ Transaction
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        chargeId: charge.id,
        paidAt: new Date()
      }
    });
    
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "COMPLETED" }
    });
    
    // ส่ง Notification
    await prisma.notification.create({
      data: {
        userId: transaction.userId,
        title: "การชาร์จเสร็จสิ้น",
        message: `ชำระเงิน ${transaction.totalCost} บาท สำเร็จ`,
        type: "CHARGING_COMPLETED"
      }
    });
  } else {
    // การชำระเงินล้มเหลว
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failureMessage: charge.failure_message
      }
    });
    
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "FAILED" }
    });
    
    // ส่ง Notification แจ้งเตือน
    await prisma.notification.create({
      data: {
        userId: transaction.userId,
        title: "การชำระเงินล้มเหลว",
        message: "กรุณาตรวจสอบบัตรเครดิตและลองใหม่",
        type: "PAYMENT_REQUIRED"
      }
    });
  }
}
```

---

## 4. การจัดการบัตร

### ลบบัตร:
```typescript
// DELETE /api/payment/cards/:cardId
async removePaymentCard(cardId: string, userId: string) {
  const card = await prisma.paymentCard.findFirst({
    where: { omiseCardId: cardId, userId }
  });
  
  // ลบจาก Omise
  await omise.customers.destroyCard(card.omiseCustomerId, cardId);
  
  // Soft delete ในฐานข้อมูล
  await prisma.paymentCard.update({
    where: { id: card.id },
    data: { deletedAt: new Date() }
  });
}
```

### เปลี่ยนบัตรหลัก:
```typescript
// PUT /api/payment/cards/:cardId/default
async setDefaultCard(cardId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { paymentCards: true }
  });
  
  // อัปเดตใน Omise
  await omise.customers.update(user.omiseCustomerId, {
    default_card: cardId
  });
  
  // อัปเดตในฐานข้อมูล
  await prisma.paymentCard.updateMany({
    where: { userId },
    data: { isDefault: false }
  });
  
  await prisma.paymentCard.update({
    where: { omiseCardId: cardId },
    data: { isDefault: true }
  });
}
```

---

## 5. การรองรับ 3D Secure

สำหรับ 3DS ให้เพิ่ม `return_uri` ในการสร้าง charge และ implement webhook handler:

```typescript
// Webhook endpoint
app.post('/api/webhooks/omise', async ({ body }) => {
  const event = body;
  
  if (event.key === 'charge.complete') {
    const charge = event.data;
    const payment = await prisma.payment.findUnique({
      where: { chargeId: charge.id }
    });
    
    // อัปเดตสถานะตาม charge.status
    await updatePaymentStatus(payment.id, charge.status);
  }
});
```

---

## 6. ไฟล์ที่ต้องสร้าง/แก้ไข

### Backend:
- `backenBun/src/user/payment/payment.service.ts` (ใหม่)
- `backenBun/src/user/payment/payment.controller.ts` (ใหม่)
- `backenBun/src/user/transaction/transaction.service.ts` (แก้ไข - เพิ่ม payment processing)
- `backenBun/src/user/index.ts` (แก้ไข - เพิ่ม payment controller)

### Frontend:
- `SuperApp/services/api/payment.service.ts` (แก้ไข - เพิ่ม methods)
- `SuperApp/features/payment/` (ใหม่ - payment management screens)
- `SuperApp/app/(tabs)/card/` (แก้ไข - integrate payment features)

### Dependencies ที่ต้องเพิ่ม:
- Backend: `omise` package
- Frontend: `omise-react-native` package

---

## 7. การตั้งค่า Omise

### API Keys:
```env
# backenBun/.env
OMISE_PUBLIC_KEY=pkey_test_65l8lly1eangth78wtj
OMISE_SECRET_KEY=skey_test_65l8llz03yr40dpyjwn
```

### Webhook Configuration:
**Webhook Endpoint**: `https://bw6z7nqh-8080.asse.devtunnels.ms/api/payment/omise/webhook`

> **หมายเหตุ**: URL ที่กรอกในช่อง Webhook Endpoint ต้องเป็นของฝั่ง Backend ของคุณเอง
> 
> **เหตุผล**: เมื่อมีเหตุการณ์สำคัญใน Omise เช่น:
> - ผู้ใช้ยืนยันการชำระเงินผ่าน 3-D Secure (OTP ผ่านธนาคาร)
> - การชำระเงินสำเร็จ / ล้มเหลว
> - การคืนเงิน (refund)
> 
> Omise จะส่ง HTTP POST (JSON) มาที่ URL ที่คุณตั้งไว้ เพื่อให้ Backend ของคุณอัปเดตสถานะในฐานข้อมูล

### Webhook Handler Implementation:
```typescript
// backenBun/src/user/payment/webhook.controller.ts
import { Elysia, t } from 'elysia';
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';

export const webhookController = new Elysia({ prefix: '/api/payment/omise' })
  .post('/webhook', async ({ body, set, headers }) => {
    try {
      // ✅ ตรวจสอบลายเซ็น event จาก Omise (เพื่อความปลอดภัย)
      const signature = headers['x-omise-signature'];
      const rawBody = JSON.stringify(body);
      const expectedSignature = crypto
        .createHmac('sha256', process.env.OMISE_SECRET_KEY!)
        .update(rawBody)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        set.status = 401;
        return { error: 'Invalid signature' };
      }

      const event = body as any;
      
      // ✅ ตรวจสอบ event.type และจัดการตามประเภท
      switch (event.key) {
        case 'charge.create':
          await handleChargeCreate(event.data);
          break;
          
        case 'charge.complete':
          await handleChargeComplete(event.data);
          break;
          
        case 'charge.update':
          await handleChargeUpdate(event.data);
          break;
          
        case 'refund.create':
          await handleRefundCreate(event.data);
          break;
          
        default:
          console.log(`Unhandled webhook event: ${event.key}`);
      }
      
      set.status = 200;
      return { received: true };
      
    } catch (err: any) {
      console.error('Webhook error:', err);
      set.status = 500;
      return { error: err.message };
    }
  }, {
    body: t.Any()
  });

// จัดการเมื่อ charge ถูกสร้าง
async function handleChargeCreate(charge: any) {
  console.log('Charge created:', charge.id);
  
  // บันทึก PaymentLog
  const payment = await prisma.payment.findUnique({
    where: { chargeId: charge.id }
  });
  
  if (payment) {
    await prisma.paymentLog.create({
      data: {
        paymentId: payment.id,
        rawRequest: {},
        rawResponse: charge,
        eventType: "CHARGE_CREATE"
      }
    });
  }
}

// จัดการเมื่อ charge เสร็จสิ้น (สำเร็จหรือล้มเหลว)
async function handleChargeComplete(charge: any) {
  console.log('Charge completed:', charge.id, 'Status:', charge.status);
  
  const payment = await prisma.payment.findUnique({
    where: { chargeId: charge.id },
    include: { 
      transaction: { 
        include: { user: true } 
      } 
    }
  });
  
  if (!payment) {
    console.error('Payment not found for charge:', charge.id);
    return;
  }
  
  // อัปเดตสถานะ Payment
  if (charge.status === 'successful') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        paidAt: new Date()
      }
    });
    
    // อัปเดต Transaction
    if (payment.transaction) {
      await prisma.transaction.update({
        where: { id: payment.transaction.id },
        data: { status: "COMPLETED" }
      });
      
      // ส่ง Notification สำเร็จ
      await prisma.notification.create({
        data: {
          userId: payment.transaction.userId,
          title: "การชาร์จเสร็จสิ้น",
          message: `ชำระเงิน ${payment.amount} บาท สำเร็จ`,
          type: "CHARGING_COMPLETED"
        }
      });
    }
    
  } else if (charge.status === 'failed') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failureMessage: charge.failure_message
      }
    });
    
    // อัปเดต Transaction
    if (payment.transaction) {
      await prisma.transaction.update({
        where: { id: payment.transaction.id },
        data: { status: "FAILED" }
      });
      
      // ส่ง Notification ล้มเหลว
      await prisma.notification.create({
        data: {
          userId: payment.transaction.userId,
          title: "การชำระเงินล้มเหลว",
          message: "กรุณาตรวจสอบบัตรเครดิตและลองใหม่",
          type: "PAYMENT_REQUIRED"
        }
      });
    }
  }
  
  // บันทึก PaymentLog
  await prisma.paymentLog.create({
    data: {
      paymentId: payment.id,
      rawRequest: {},
      rawResponse: charge,
      eventType: "CHARGE_COMPLETE"
    }
  });
}

// จัดการเมื่อ charge มีการอัปเดต
async function handleChargeUpdate(charge: any) {
  console.log('Charge updated:', charge.id);
  
  const payment = await prisma.payment.findUnique({
    where: { chargeId: charge.id }
  });
  
  if (payment) {
    await prisma.paymentLog.create({
      data: {
        paymentId: payment.id,
        rawRequest: {},
        rawResponse: charge,
        eventType: "CHARGE_UPDATE"
      }
    });
  }
}

// จัดการเมื่อมีการคืนเงิน
async function handleRefundCreate(refund: any) {
  console.log('Refund created:', refund.id);
  
  const payment = await prisma.payment.findUnique({
    where: { chargeId: refund.charge }
  });
  
  if (payment) {
    // อัปเดตสถานะเป็น REFUNDED
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "REFUNDED",
        refundedAt: new Date()
      }
    });
    
    // บันทึก PaymentLog
    await prisma.paymentLog.create({
      data: {
        paymentId: payment.id,
        rawRequest: {},
        rawResponse: refund,
        eventType: "REFUND_CREATE"
      }
    });
  }
}
```

### การรองรับ 3D Secure (3DS):
```typescript
// เพิ่มใน payment.service.ts
async processPaymentWith3DS(transactionId: string) {
  // ... existing code ...
  
  // เรียกเก็บเงินผ่าน Omise พร้อม return_uri สำหรับ 3DS
  const charge = await omise.charges.create({
    amount: Math.round(transaction.totalCost * 100),
    currency: "THB",
    customer: transaction.user.omiseCustomerId,
    card: defaultCard?.omiseCardId,
    description: `Charging session ${transactionId}`,
    return_uri: `${process.env.FRONTEND_URL}/payment/3ds-return` // URL สำหรับ redirect กลับ
  });
  
  // หาก charge ต้องการ 3DS authentication
  if (charge.authorize_uri) {
    // อัปเดต Payment ให้รอการยืนยัน 3DS
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "PENDING_3DS",
        authorizeUri: charge.authorize_uri
      }
    });
    
    // ส่ง Notification ให้ผู้ใช้ยืนยัน 3DS
    await prisma.notification.create({
      data: {
        userId: transaction.userId,
        title: "ต้องการยืนยันการชำระเงิน",
        message: "กรุณายืนยันการชำระเงินผ่านธนาคารของคุณ",
        type: "PAYMENT_3DS_REQUIRED",
        metadata: { authorizeUri: charge.authorize_uri }
      }
    });
  }
  
  // ... rest of the code ...
}
```