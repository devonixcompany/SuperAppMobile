// นำเข้า Tabs และ useRouter จาก expo-router สำหรับจัดการการนำทางแบบ tab
import { Tabs, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
// นำเข้า component BottomNavigation ที่เราสร้างเองสำหรับแสดงแถบเมนูด้านล่าง
import BottomNavigation from "../../components/ui/bottom-navigation";

// ฟังก์ชันหลักสำหรับจัดการ layout ของ tabs ทั้งหมด
export default function TabLayout() {
  // ใช้ router สำหรับการนำทางไปหน้าต่างๆ
  const router = useRouter();

  return (
    // Tabs component จาก expo-router ใช้สำหรับจัดการหน้าต่างๆ แบบ tab
    <Tabs
      // ตั้งค่าพื้นฐานสำหรับทุก screen ใน tabs
      screenOptions={{
        headerShown: false, // ซ่อน header ด้านบนของแต่ละหน้า
        tabBarStyle: { display: "none" }, // ซ่อน tab bar เริ่มต้นของ expo-router เพราะเราจะใช้ของเราเอง
      }}
      // กำหนด custom tab bar แทน tab bar เริ่มต้น
      tabBar={(props) => (
        // ใช้ BottomNavigation component ที่เราสร้างเอง
        <BottomNavigation
          // ส่งชื่อ tab ที่กำลังใช้งานอยู่ โดยดึงจาก state.index (ลำดับปัจจุบัน)
          activeTab={props.state.routeNames[props.state.index]}
          // ฟังก์ชันที่ทำงานเมื่อกดที่ tab ใดๆ
          onTabPress={(tab) => {
            // หาลำดับของ tab ที่ถูกกดจากชื่อ tab
            const routeIndex = props.state.routeNames.findIndex(
              (name) => name === tab,
            );
            // ถ้าพบ tab ที่ต้องการ (index ไม่เท่ากับ -1)
            if (routeIndex !== -1) {
              // นำทางไปยัง tab นั้น
              props.navigation.navigate(props.state.routeNames[routeIndex]);
            }
          }}
          // ฟังก์ชันที่ทำงานเมื่อกดปุ่ม QR Scanner
          onQRPress={() => {
            // นำทางไปหน้า qr-scanner
            router.push("/qr-scanner");
          }}
        />
      )}
    >
      {/* กำหนด screens ที่จะแสดงใน tabs */}
      <Tabs.Screen name="home" /> {/* หน้า Home */}
      <Tabs.Screen name="charging" /> {/* หน้า Charging */}
      <Tabs.Screen name="card" /> {/* หน้า Card */}
      <Tabs.Screen name="settings" /> {/* หน้า Settings */}
    </Tabs>
  );
}
