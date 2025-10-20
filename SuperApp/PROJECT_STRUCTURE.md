# SuperApp - โครงสร้างโปรเจค

## 📁 โครงสร้างโฟลเดอร์

```
SuperApp/
├── app/                          # Expo Router - Route definitions
│   ├── (tabs)/                   # Tab navigation routes
│   │   ├── _layout.tsx          # Tab layout with bottom navigation
│   │   ├── home.tsx             # Home tab route
│   │   ├── charging.tsx         # Charging tab route
│   │   ├── card.tsx             # Card tab route
│   │   └── settings.tsx         # Settings tab route
│   ├── _layout.tsx              # Root layout
│   ├── index.tsx                # App entry point
│   ├── login.tsx                # Login route
│   ├── register.tsx             # Register route
│   ├── otp-verification.tsx     # OTP verification route
│   ├── qr-scanner.tsx           # QR scanner route
│   └── ...                      # Other routes
│
├── features/                     # Feature-based modules (business logic)
│   ├── auth/                    # Authentication feature
│   │   ├── screens/             # Auth screens (reusable)
│   │   │   ├── login-screen.tsx
│   │   │   ├── register-screen.tsx
│   │   │   ├── otp-verification-screen.tsx
│   │   │   ├── initial-screen.tsx
│   │   │   ├── success-screen.tsx
│   │   │   ├── terms-screen.tsx
│   │   │   └── index.ts         # Export all auth screens
│   │   └── components/          # Auth-specific components
│   │
│   ├── home/                    # Home feature
│   │   ├── screens/
│   │   │   ├── home-screen.tsx
│   │   │   └── index.ts
│   │   └── components/
│   │
│   ├── charging/                # Charging feature
│   │   ├── screens/
│   │   │   ├── charging-screen.tsx
│   │   │   └── index.ts
│   │   └── components/
│   │
│   ├── card/                    # Card feature
│   │   ├── screens/
│   │   │   ├── card-screen.tsx
│   │   │   └── index.ts
│   │   └── components/
│   │
│   ├── settings/                # Settings feature
│   │   ├── screens/
│   │   │   ├── settings-screen.tsx
│   │   │   └── index.ts
│   │   └── components/
│   │
│   └── qr/                      # QR Scanner feature
│       ├── screens/
│       │   ├── qr-scanner-screen.tsx
│       │   └── index.ts
│       └── components/
│
├── components/                   # Shared components
│   ├── ui/                      # UI components (reusable)
│   │   ├── bottom-navigation.tsx
│   │   ├── collapsible.tsx
│   │   ├── icon-symbol.tsx
│   │   └── index.ts
│   │
│   └── common/                  # Common/generic components
│       ├── themed-text.tsx
│       ├── themed-view.tsx
│       ├── external-link.tsx
│       ├── hello-wave.tsx
│       ├── parallax-scroll-view.tsx
│       ├── haptic-tab.tsx
│       └── index.ts
│
├── services/                     # External services & API calls
│   └── api/                     # API client & endpoints
│
├── hooks/                        # Custom React hooks
│   ├── use-color-scheme.ts
│   ├── use-theme-color.ts
│   └── ...
│
├── utils/                        # Utility functions
│   ├── keychain.ts              # Keychain utilities
│   └── ...
│
├── lib/                          # Third-party library configurations
│   └── utils/                   # Shared utility functions
│
├── constants/                    # Constants & configurations
│   └── theme.ts                 # Theme constants
│
├── config/                       # App configuration
│   └── env.ts                   # Environment variables
│
├── types/                        # TypeScript type definitions
│   └── models/                  # Data models
│
├── assets/                       # Static assets
│   ├── images/                  # Images
│   └── img/                     # Additional images
│
└── app.config.js                # Expo configuration
```

## 🎯 หน้าที่ของแต่ละโฟลเดอร์

### 📱 `app/` - Routing Layer
- ใช้ **Expo Router** สำหรับการนำทาง
- **ไม่ควร** มี business logic มากเกินไป
- ควรเป็นตัวเชื่อมระหว่าง routes กับ screens ใน features/

**ตัวอย่าง:**
```tsx
// app/login.tsx - Route definition
import { LoginScreen } from '@/features/auth/screens';

export default LoginScreen;
```

### 🎨 `features/` - Business Logic Layer
- จัดกลุ่มตาม **feature** หรือ **business domain**
- แต่ละ feature มี screens, components, และ logic ของตัวเอง
- ทำให้โค้ดง่ายต่อการดูแล และนักพัฒนาหาโค้ดได้ง่าย

**โครงสร้าง feature:**
```
features/[feature-name]/
├── screens/          # Screens ของ feature นี้
├── components/       # Components เฉพาะ feature นี้
├── hooks/           # Custom hooks เฉพาะ feature (ถ้ามี)
├── utils/           # Utility functions เฉพาะ feature (ถ้ามี)
└── index.ts         # Export ทั้งหมด
```

### 🧩 `components/` - Shared Components
- **`ui/`** - UI components ที่ใช้ซ้ำได้ (buttons, cards, modals)
- **`common/`** - Generic components ทั่วไป

### 🔌 `services/` - External Services
- API calls, Firebase, Authentication services
- Third-party integrations

### 🪝 `hooks/` - Custom Hooks
- Reusable React hooks ที่ใช้ทั่วแอป

### 🛠 `utils/` - Utilities
- Helper functions, formatters, validators

### ⚙️ `config/` & `constants/`
- App configuration
- Environment variables
- Theme constants

## 📝 การใช้งาน

### Import จาก features:
```tsx
// ✅ Good - Import จาก index
import { LoginScreen, RegisterScreen } from '@/features/auth/screens';
import { HomeScreen } from '@/features/home/screens';
import { QRScannerScreen } from '@/features/qr/screens';

// ❌ Bad - Import โดยตรง
import LoginScreen from '@/features/auth/screens/login-screen';
```

### Import components:
```tsx
// ✅ Good - Import จาก index
import { BottomNavigation } from '@/components/ui';
import { ThemedText, ThemedView } from '@/components/common';

// ❌ Bad - Import โดยตรง
import BottomNavigation from '@/components/ui/bottom-navigation';
```

## 🎨 Best Practices

### 1. **Feature-First Organization**
- จัดกลุ่มโค้ดตาม feature แทนการจัดตาม technical layer
- ทำให้ง่ายต่อการหา และแก้ไขโค้ด

### 2. **Colocation**
- เก็บโค้ดที่เกี่ยวข้องกันไว้ใกล้กัน
- Components ที่ใช้เฉพาะ feature ควรอยู่ใน feature นั้น

### 3. **Clear Separation**
- `app/` = Routes only
- `features/` = Business logic + UI
- `components/` = Shared UI only
- `services/` = External integrations

### 4. **Index Exports**
- ทุกโฟลเดอร์ควรมี `index.ts` เพื่อ export
- ทำให้ import ง่ายและสะอาด

### 5. **TypeScript Types**
- เก็บ type definitions ไว้ใน `types/`
- ใช้ interfaces สำหรับ data models

## 🚀 เริ่มพัฒนา Feature ใหม่

1. สร้างโฟลเดอร์ใน `features/[feature-name]/`
2. สร้าง `screens/` และ `components/` ภายใน feature
3. สร้าง `index.ts` สำหรับ exports
4. สร้าง route ใน `app/` ที่ import จาก feature

ตัวอย่าง:
```bash
mkdir -p features/payment/screens
mkdir -p features/payment/components
touch features/payment/screens/payment-screen.tsx
touch features/payment/screens/index.ts
touch app/payment.tsx
```

## 📚 Resources

- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [React Native Best Practices](https://reactnative.dev/docs/getting-started)

---

**หมายเหตุ:** โครงสร้างนี้ออกแบบมาเพื่อให้ง่ายต่อการขยายและดูแลรักษา หากทีมมีนักพัฒนาหลายคน สามารถทำงานแยกกันได้โดยไม่กระทบกัน
