// นำเข้า Ionicons สำหรับไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
// นำเข้า LinearGradient สำหรับสร้างพื้นหลังไล่สี
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
// นำเข้า components พื้นฐานจาก React Native
import { Text, TouchableOpacity, View } from "react-native";

// Interface กำหนด props ที่ component นี้รับ
interface BottomNavigationProps {
  activeTab: string; // ชื่อ tab ที่กำลังใช้งานอยู่
  onTabPress: (tab: string) => void; // ฟังก์ชันเมื่อกด tab ปกติ
  onQRPress?: () => void; // ฟังก์ชันเมื่อกดปุ่ม QR (optional)
}

// Component หลักของ Bottom Navigation Bar
export default function BottomNavigation({
  activeTab,
  onTabPress,
  onQRPress,
}: BottomNavigationProps) {
  // ข้อมูล tabs ทั้งหมด
  const tabs = [
    { id: "home", icon: "home-outline", activeIcon: "home", label: "หน้าหลัก" },
    {
      id: "charging",
      icon: "flash-outline",
      activeIcon: "flash",
      label: "เครื่องชาร์จ",
    },
    { id: "qr", icon: "qr-code-outline", activeIcon: "qr-code", label: "" }, // ปุ่ม QR (จะเป็นแบบลอย)
    { id: "card", icon: "card-outline", activeIcon: "card", label: "เป๋าตัง" },
    {
      id: "settings",
      icon: "settings-outline",
      activeIcon: "settings",
      label: "ตั้งค่า",
    },
  ];

  // ฟังก์ชันสร้างปุ่มแต่ละ tab
  const renderTabButton = (tab: any, index: number) => {
    const isActive = activeTab === tab.id; // เช็คว่าเป็น tab ที่กำลังใช้งานหรือไม่
    const isQRButton = tab.id === "qr"; // เช็คว่าเป็นปุ่ม QR หรือไม่

    // ถ้าเป็นปุ่ม QR ให้สร้างแบบพิเศษ (Floating Button)
    if (isQRButton) {
      return (
        <View
          key={tab.id}
          className="relative items-center justify-center flex-1"
        >
          {/* ปุ่ม QR แบบลอย */}
          <TouchableOpacity
            onPress={onQRPress}
            // -top-8: ยกปุ่มขึ้นด้านบน 32px
            className="absolute -top-8"
            activeOpacity={0.8} // ความโปร่งใสเมื่อกด
          >
            {/* พื้นหลังไล่สีจากน้ำเงินเข้มไปเขียว */}
            <LinearGradient
              colors={["#1F274B", "#5EC1A0"]} // สีไล่จากซ้ายไปขวา
              start={{ x: 0, y: 0 }} // จุดเริ่มต้น
              end={{ x: 1, y: 0 }} // จุดสิ้นสุด
              className="items-center justify-center w-16 h-16 rounded-full" // วงกลมขนาด 64x64px
              style={{
                // เงาโค้งมน
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8, // เงาสำหรับ Android
              }}
            >
              {/* ไอคอน QR สีขาว */}
              <Ionicons name="qr-code-outline" size={32} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    // ปุ่ม tab ปกติ (ไม่ใช่ QR)
    return (
      <TouchableOpacity
        key={tab.id}
        onPress={() => onTabPress(tab.id)} // เรียกฟังก์ชันพร้อมส่ง id ของ tab
        className="items-center justify-center flex-1 py-2"
      >
        {/* ไอคอน: ถ้าเป็น active ใช้ไอคอนแบบเต็ม ถ้าไม่ใช้แบบ outline */}
        <Ionicons
          name={isActive ? tab.activeIcon : tab.icon}
          size={24}
          color={isActive ? "#51BC8E" : "#9CA3AF"} // สีเขียวถ้า active, เทาถ้าไม่ active
        />
        {/* ข้อความใต้ไอคอน */}
        <Text
          className={`text-xs mt-1 ${
            isActive ? "text-[#51BC8E] font-semibold" : "text-[#9CA3AF]"
          }`}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    // แถบ Bottom Navigation หลัก
    // bg-white: พื้นหลังสีขาว
    // border-t: เส้นขอบด้านบน
    // px-4: padding ซ้าย-ขวา
    // pb-2 pt-2: padding บน-ล่าง
    <View className="px-4 pt-2 pb-2 bg-white border-t border-gray-200">
      {/* แถวของ tabs */}
      <View className="flex-row items-center justify-around">
        {/* วนลูปสร้างปุ่มแต่ละ tab */}
        {tabs.map((tab, index) => renderTabButton(tab, index))}
      </View>
    </View>
  );
}
