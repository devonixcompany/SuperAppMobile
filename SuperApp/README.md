# 🚗 SuperApp - EV Charging & Payment App

แอปพลิเคชันสำหรับการชาร์จรถ EV, ชำระเงิน และจัดการบัตร

## 🚀 เริ่มต้นใช้งาน

### ติดตั้ง Dependencies

```bash
npm install
```

### รันแอป

```bash
# เริ่มต้น development server
npm start

# รันบน iOS Simulator
npm run ios

# รันบน Android Emulator
npm run android

# รันบนเว็บ
npm run web
```

## 📁 โครงสร้างโปรเจค

```
SuperApp/
├── app/                    # Expo Router (Routes)
├── features/               # Features แบบ modular
│   ├── auth/              # Authentication
│   ├── home/              # Home screen
│   ├── charging/          # EV Charging
│   ├── card/              # Payment cards
│   ├── settings/          # Settings
│   └── qr/                # QR Scanner
├── components/            # Shared components
│   ├── ui/               # UI components
│   └── common/           # Common components
├── services/             # API & external services
├── hooks/                # Custom hooks
├── utils/                # Utilities
├── constants/            # Constants
└── config/               # Configuration
```

📖 **อ่านเพิ่มเติม:** [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

## ✨ Features

- 🔐 **Authentication** - เข้าสู่ระบบด้วยเบอร์โทรศัพท์ + OTP
- 🏠 **Home Dashboard** - แสดงข้อมูลสรุป
- ⚡ **EV Charging** - ค้นหาและจัดการสถานีชาร์จ
- 💳 **Payment Cards** - จัดการบัตรชำระเงิน
- 📱 **QR Scanner** - สแกน QR Code ด้วยกล้อง
- ⚙️ **Settings** - ตั้งค่าแอป

## 🛠 เทคโนโลยีที่ใช้

- **[React Native](https://reactnative.dev/)** - Mobile framework
- **[Expo](https://expo.dev/)** - Development platform
- **[Expo Router](https://docs.expo.dev/router/introduction/)** - File-based routing
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[NativeWind](https://www.nativewind.dev/)** - Tailwind CSS for React Native
- **[Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)** - Camera & QR Scanner

## 📱 Screens

### Authentication
- `/login` - เข้าสู่ระบบ
- `/register` - ลงทะเบียน
- `/otp-verification` - ยืนยัน OTP
- `/terms` - เงื่อนไขการใช้งาน

### Main Tabs
- `/(tabs)/home` - หน้าแรก
- `/(tabs)/charging` - สถานีชาร์จ
- `/(tabs)/card` - บัตรของฉัน
- `/(tabs)/settings` - ตั้งค่า

### Features
- `/qr-scanner` - สแกน QR Code

## 🎨 การพัฒนา Feature ใหม่

1. สร้างโฟลเดอร์ใน `features/[feature-name]/`
2. สร้าง `screens/` และ `components/`
3. สร้าง `index.ts` สำหรับ exports
4. เพิ่ม route ใน `app/`

ตัวอย่าง:

```bash
# สร้าง feature ใหม่
mkdir -p features/payment/screens
mkdir -p features/payment/components

# สร้าง screen
touch features/payment/screens/payment-screen.tsx
touch features/payment/screens/index.ts

# สร้าง route
touch app/payment.tsx
```

```tsx
// features/payment/screens/index.ts
export { default as PaymentScreen } from './payment-screen';

// app/payment.tsx
export { default } from '@/features/payment/screens/payment-screen';
```

## 📚 Best Practices

### ✅ Do
- ใช้ feature-based organization
- Import จาก `index.ts`
- เก็บ business logic ใน `features/`
- ใช้ TypeScript types
- เขียน components แบบ reusable

### ❌ Don't
- อย่าเก็บ business logic ใน `app/`
- อย่า import โดยตรงจากไฟล์ screen
- อย่าทำซ้ำ components

## 🔧 Configuration

### Environment Variables
สร้างไฟล์ `.env` ตาม `.env.example`:

```bash
cp .env.example .env
```

### Firebase Configuration
ตั้งค่า Firebase ใน `app.config.js`:

```js
extra: {
  firebaseApiKey: 'YOUR_API_KEY',
  firebaseAuthDomain: 'YOUR_AUTH_DOMAIN',
  // ...
}
```

## 🧪 Testing

```bash
# รัน tests
npm test

# รัน tests แบบ watch mode
npm test -- --watch
```

## �� Build

### Development Build

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### Production Build

```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```

## 👥 ทีมพัฒนา

- ดูโครงสร้างโปรเจคใน [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- อ่าน README ของแต่ละ feature ใน `features/[feature-name]/README.md`

## 📄 License

Private - All rights reserved

## 🤝 Contributing

1. สร้าง feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add some amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. เปิด Pull Request

---

Made with ❤️ by SuperApp Team
