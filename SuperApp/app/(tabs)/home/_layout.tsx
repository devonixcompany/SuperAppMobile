// นำเข้า Stack จาก expo-router สำหรับจัดการการนำทางแบบ stack (ซ้อนทับกัน)
import { Stack } from "expo-router";

// ฟังก์ชัน Layout สำหรับโฟลเดอร์ home
// ใช้จัดการหน้าต่างๆ ภายใน home folder (index.tsx และหน้าย่อยอื่นๆ ในอนาคต)
export default function HomeLayout() {
  return (
    // Stack component: จัดการหน้าต่างๆ แบบ stack (เหมือนซ้อนกระดาษ)
    <Stack
      // ตั้งค่าพื้นฐานสำหรับทุกหน้าใน stack นี้
      screenOptions={{
        headerShown: false, // ซ่อน header ด้านบน (เพราะเรามี header ใน UI เองแล้ว)
      }}
    >
      {/* กำหนดหน้า index (หน้าหลักของ home) */}
      {/* name="index" หมายถึงไฟล์ index.tsx */}
      <Stack.Screen name="index" />

      {/* ในอนาคตสามารถเพิ่มหน้าย่อยได้ เช่น:
        <Stack.Screen name="profile" />
        <Stack.Screen name="notifications" />
      */}
    </Stack>
  );
}
