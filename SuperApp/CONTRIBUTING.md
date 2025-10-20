# 🤝 คู่มือสำหรับนักพัฒนา

## 🎯 ก่อนเริ่มพัฒนา

### 1. อ่านเอกสารที่สำคัญ
- 📖 [README.md](./README.md) - ภาพรวมโปรเจค
- 📁 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - โครงสร้างโฟลเดอร์
- 📂 Feature README - อ่าน README ของ feature ที่จะพัฒนา

### 2. ติดตั้ง Development Environment

```bash
# Clone repository
git clone <repository-url>
cd SuperApp

# ติดตั้ง dependencies
npm install

# รันแอป
npm start
```

### 3. เข้าใจโครงสร้างโปรเจค

โปรเจคนี้ใช้ **Feature-Based Architecture**:

```
app/          → Routes (Expo Router)
features/     → Business Logic & Screens
components/   → Shared Components
services/     → API & External Services
```

## 📝 Coding Guidelines

### การตั้งชื่อไฟล์

```
✅ Good
- login-screen.tsx
- user-profile-card.tsx
- use-auth-hook.ts

❌ Bad
- LoginScreen.tsx
- UserProfileCard.tsx
- useAuthHook.ts
```

### การตั้งชื่อ Components

```tsx
✅ Good
export default function LoginScreen() { }
export function UserProfileCard() { }

❌ Bad
export default function login_screen() { }
export function userprofilecard() { }
```

### Import/Export Pattern

```tsx
// ✅ Good - ใช้ index.ts
import { LoginScreen } from '@/features/auth/screens';
import { BottomNavigation } from '@/components/ui';

// ❌ Bad - Import โดยตรง
import LoginScreen from '@/features/auth/screens/login-screen';
import BottomNavigation from '@/components/ui/bottom-navigation';
```

### TypeScript Types

```tsx
// ✅ Good
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

function UserCard({ user }: { user: UserProfile }) {
  // ...
}

// ❌ Bad
function UserCard({ user }: any) {
  // ...
}
```

### Component Structure

```tsx
// ✅ Good - มี props types, clean code
interface Props {
  title: string;
  onPress: () => void;
}

export default function CustomButton({ title, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}

// ❌ Bad - ไม่มี types, messy
export default function CustomButton(props) {
  return (
    <TouchableOpacity onPress={props.onPress}>
      <Text>{props.title}</Text>
    </TouchableOpacity>
  );
}
```

## 🚀 เพิ่ม Feature ใหม่

### ขั้นตอนที่ 1: สร้างโครงสร้าง Feature

```bash
# สร้าง feature folder
mkdir -p features/[feature-name]/screens
mkdir -p features/[feature-name]/components

# สร้างไฟล์
touch features/[feature-name]/screens/[feature-name]-screen.tsx
touch features/[feature-name]/screens/index.ts
touch features/[feature-name]/README.md
```

### ขั้นตอนที่ 2: เขียน Screen

```tsx
// features/payment/screens/payment-screen.tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function PaymentScreen() {
  return (
    <View>
      <Text>Payment Screen</Text>
    </View>
  );
}
```

### ขั้นตอนที่ 3: Export ใน index.ts

```tsx
// features/payment/screens/index.ts
export { default as PaymentScreen } from './payment-screen';
```

### ขั้นตอนที่ 4: สร้าง Route

```tsx
// app/payment.tsx
export { default } from '@/features/payment/screens/payment-screen';
```

### ขั้นตอนที่ 5: เขียน README

```markdown
# Payment Feature

## 📝 รายละเอียด
Feature สำหรับ...

## 🎯 Screens
- PaymentScreen - หน้า...
```

## 🎨 Component Guidelines

### ควรสร้าง Component ใหม่เมื่อ:
- โค้ดซ้ำมากกว่า 2 ครั้ง
- Logic ซับซ้อนและแยกได้
- ต้องการ reuse ในหลายที่

### Component ควรอยู่ที่ไหน?

```
ใช้เฉพาะใน 1 feature
  → features/[feature]/components/

ใช้ใน 2-3 features
  → components/ui/

ใช้ทั่วทั้งแอป
  → components/common/
```

## 📦 State Management

### Local State (useState)
```tsx
// ใช้สำหรับ UI state เท่านั้น
const [isOpen, setIsOpen] = useState(false);
```

### Global State (Context)
```tsx
// สำหรับ shared state ระหว่าง components
const { user } = useAuth();
```

## 🔌 API Integration

### สร้าง Service

```tsx
// services/api/payment.service.ts
export const paymentService = {
  async createPayment(data: PaymentData) {
    const response = await fetch('/api/payment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
```

### ใช้ใน Component

```tsx
import { paymentService } from '@/services/api/payment.service';

function PaymentScreen() {
  const handlePayment = async () => {
    try {
      const result = await paymentService.createPayment(data);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };
}
```

## 🎯 Git Workflow

### Branch Naming

```
feature/payment-integration
fix/login-bug
refactor/auth-service
docs/update-readme
```

### Commit Messages

```
✅ Good
feat: add payment screen
fix: resolve login timeout issue
refactor: improve auth service
docs: update project structure

❌ Bad
update
fix bug
wip
test
```

### Pull Request Process

1. สร้าง branch จาก `main`
2. พัฒนา feature
3. Test ให้แน่ใจว่าทำงานได้
4. Commit changes
5. Push และสร้าง PR
6. รอ review จากทีม
7. Merge เมื่อได้ approve

## ✅ Checklist ก่อน Push

- [ ] โค้ดทำงานได้ไม่มี error
- [ ] ไม่มี TypeScript errors
- [ ] ไม่มี console.log ที่ไม่จำเป็น
- [ ] Components มี proper types
- [ ] เพิ่ม exports ใน index.ts
- [ ] อัปเดต README (ถ้าจำเป็น)
- [ ] Test บนทั้ง iOS และ Android (ถ้าเป็นไปได้)

## 🐛 Debugging Tips

### React Native Debugger
```bash
# เปิด debugger
npm run start
# กด 'j' เพื่อเปิด debugger
```

### Check Logs
```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

### Common Issues

**Metro bundler ไม่ทำงาน:**
```bash
npm start -- --reset-cache
```

**Build ไม่ผ่าน:**
```bash
# ลบ node_modules และติดตั้งใหม่
rm -rf node_modules
npm install
```

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [NativeWind Documentation](https://www.nativewind.dev/)

## 💡 Tips

1. **อ่าน Error Messages** - Error messages มักบอกปัญหาได้ชัดเจน
2. **ใช้ TypeScript** - ช่วยจับ bugs ก่อน runtime
3. **เขียน Components เล็กๆ** - ง่ายต่อการดูแลและ test
4. **DRY Principle** - Don't Repeat Yourself
5. **Comment เมื่อจำเป็น** - อธิบาย "ทำไม" ไม่ใช่ "ทำอะไร"

## 🤔 มีคำถาม?

- ดูใน [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- ดู README ของแต่ละ feature
- ถาม senior developers ในทีม

---

Happy Coding! 🚀
