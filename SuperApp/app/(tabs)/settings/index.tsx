// นำเข้า Ionicons สำหรับแสดงไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
// นำเข้า router สำหรับการนำทาง
import { router } from "expo-router";
import React from "react";
// นำเข้า components พื้นฐานจาก React Native
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// นำเข้า SafeAreaView เพื่อหลีกเลี่ยงพื้นที่ notch และ status bar
import { SafeAreaView } from "react-native-safe-area-context";
// นำเข้าฟังก์ชันล้างข้อมูล
import {
  clearCredentials,
  getCredentials,
  getTokens,
  type AuthTokens,
  type LoginCredentials,
} from "@/utils/keychain";
import { TABS_HORIZONTAL_GUTTER } from "../_layout";

// ฟังก์ชันหลักของหน้า Settings (ตั้งค่า)
export default function SettingsScreen() {
  // State สำหรับการแจ้งเตือน (เปิด/ปิด)
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  // State สำหรับการใช้ลายนิ้วมือ (เปิด/ปิด)
  const [biometricEnabled, setBiometricEnabled] = React.useState(false);
  // State สำหรับโหมดมืด (เปิด/ปิด)
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);
  // เก็บข้อมูลที่ดึงจาก keychain
  const [storedCredentials, setStoredCredentials] =
    React.useState<LoginCredentials | null>(null);
  const [storedTokens, setStoredTokens] = React.useState<AuthTokens | null>(
    null,
  );
  const profilePhoneNumber =
    storedCredentials?.phoneNumber ?? "+66 81 234 5678";
  const profileInitials = React.useMemo(() => {
    const phone = storedCredentials?.phoneNumber;
    if (!phone) {
      return "JD";
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 2) {
      return digits.slice(-2);
    }
    return digits || "JD";
  }, [storedCredentials?.phoneNumber]);

  // โหลดข้อมูลจาก keychain เมื่อเข้า หน้านี้
  React.useEffect(() => {
    let isMounted = true;

    const loadKeychainData = async () => {
      try {
        const [credentials, tokens] = await Promise.all([
          getCredentials(),
          getTokens(),
        ]);

        if (!isMounted) return;

        setStoredCredentials(credentials);
        setStoredTokens(tokens);
      } catch (error) {
        console.error("Error loading keychain data:", error);
      }
    };

    loadKeychainData();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatTokenPreview = (token?: string | null) => {
    if (!token) return "—";
    if (token.length <= 22) return token;
    return `${token.slice(0, 12)}…${token.slice(-6)}`;
  };

  // ฟังก์ชันสำหรับออกจากระบบ
  const handleLogout = () => {
    // แสดง Alert ยืนยัน
    Alert.alert(
      "ออกจากระบบ", // หัวข้อ
      "คุณต้องการออกจากระบบและล้างข้อมูลหรือไม่?", // ข้อความ
      [
        {
          text: "ยกเลิก", // ปุ่มยกเลิก
          style: "cancel",
        },
        {
          text: "ออกจากระบบ", // ปุ่มยืนยัน
          style: "destructive", // สีแดง (แสดงว่าเป็นการทำลาย)
          onPress: async () => {
            try {
              // ลบข้อมูล credentials และ tokens ทั้งหมด
              const cleared = await clearCredentials();

              if (!cleared) {
                throw new Error("Failed to clear credentials");
              }

              setStoredCredentials(null);
              setStoredTokens(null);

              console.log("🧹 Cleared all credentials and tokens");

              // แจ้งเตือนว่าทำสำเร็จก่อนนำทางกลับหน้า login
              Alert.alert("สำเร็จ", "ออกจากระบบและล้างข้อมูลเรียบร้อยแล้ว", [
                {
                  text: "ตกลง",
                  onPress: () => router.replace("/login"),
                },
              ]);
            } catch (error) {
              console.error("Error during logout:", error);
              Alert.alert("ข้อผิดพลาด", "ไม่สามารถออกจากระบบได้");
            }
          },
        },
      ],
    );
  };

  // ฟังก์ชันสำหรับล้างข้อมูลทั้งหมด (สำหรับนักพัฒนา/ทดสอบ)
  const handleClearAllData = () => {
    Alert.alert(
      "⚠️ ล้างข้อมูลทั้งหมด", // หัวข้อ
      "คุณต้องการล้างข้อมูลทั้งหมดและออกจากระบบหรือไม่?\n\nการกระทำนี้จะลบ:\n• บัญชีผู้ใช้ที่บันทึกไว้\n• Token การเข้าสู่ระบบ\n• ข้อมูลทั้งหมดที่เก็บไว้", // ข้อความ
      [
        {
          text: "ยกเลิก",
          style: "cancel",
        },
        {
          text: "ล้างข้อมูล",
          style: "destructive", // สีแดง
          onPress: async () => {
            try {
              console.log("🧹 Starting to clear all data...");

              // ลบข้อมูลทั้งหมดจาก SecureStore
              const cleared = await clearCredentials();

              if (cleared) {
                console.log("✅ All data cleared successfully!");

                setStoredCredentials(null);
                setStoredTokens(null);

                // แสดงข้อความสำเร็จ
                Alert.alert("สำเร็จ", "ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว", [
                  {
                    text: "ตกลง",
                    onPress: () => router.replace("/login"), // กลับไปหน้า login
                  },
                ]);
              } else {
                throw new Error("Failed to clear data");
              }
            } catch (error) {
              console.error("❌ Error clearing data:", error);
              Alert.alert("ข้อผิดพลาด", "ไม่สามารถล้างข้อมูลได้");
            }
          },
        },
      ],
    );
  };

  // ข้อมูลการตั้งค่าทั้งหมด แบ่งเป็นหมวดหมู่
  const settingSections = [
    {
      title: "บัญชีผู้ใช้", // หมวดหมู่ที่ 1
      items: [
        {
          icon: "person-outline", // ไอคอนคน
          title: "ข้อมูลส่วนตัว",
          subtitle: "แก้ไขข้อมูลโปรไฟล์",
          onPress: () => console.log("Profile pressed"), // ฟังก์ชันเมื่อกด
          showArrow: true, // แสดงลูกศรชี้ขวา
        },
        {
          icon: "shield-checkmark-outline", // ไอคอนโล่
          title: "ความปลอดภัย",
          subtitle: "เปลี่ยนรหัสผ่าน, PIN",
          onPress: () => console.log("Security pressed"),
          showArrow: true,
        },
        {
          icon: "card-outline", // ไอคอนบัตร
          title: "วิธีการชำระเงิน",
          subtitle: "จัดการบัตรและบัญชี",
          onPress: () => console.log("Payment methods pressed"),
          showArrow: true,
        },
      ],
    },
    {
      title: "การตั้งค่าแอป", // หมวดหมู่ที่ 2
      items: [
        {
          icon: "notifications-outline", // ไอคอนระฆัง
          title: "การแจ้งเตือน",
          subtitle: "รับการแจ้งเตือนจากแอป",
          onPress: () => setNotificationsEnabled(!notificationsEnabled), // สลับค่า
          showSwitch: true, // แสดง toggle switch
          switchValue: notificationsEnabled, // ค่าของ switch
        },
        {
          icon: "finger-print-outline", // ไอคอนลายนิ้วมือ
          title: "ล็อกด้วยลายนิ้วมือ",
          subtitle: "ใช้ลายนิ้วมือเพื่อเข้าแอป",
          onPress: () => setBiometricEnabled(!biometricEnabled),
          showSwitch: true,
          switchValue: biometricEnabled,
        },
        {
          icon: "moon-outline", // ไอคอนพระจันทร์
          title: "โหมดมืด",
          subtitle: "เปลี่ยนธีมแอป",
          onPress: () => setDarkModeEnabled(!darkModeEnabled),
          showSwitch: true,
          switchValue: darkModeEnabled,
        },
        {
          icon: "language-outline", // ไอคอนภาษา
          title: "ภาษา",
          subtitle: "ไทย",
          onPress: () => console.log("Language pressed"),
          showArrow: true,
        },
      ],
    },
    {
      title: "ช่วยเหลือและสนับสนุน", // หมวดหมู่ที่ 3
      items: [
        {
          icon: "help-circle-outline", // ไอคอนเครื่องหมายคำถาม
          title: "ศูนย์ช่วยเหลือ",
          subtitle: "คำถามที่พบบ่อย",
          onPress: () => console.log("Help center pressed"),
          showArrow: true,
        },
        {
          icon: "chatbubble-outline", // ไอคอนแชท
          title: "ติดต่อเรา",
          subtitle: "แชทกับทีมสนับสนุน",
          onPress: () => console.log("Contact us pressed"),
          showArrow: true,
        },
        {
          icon: "star-outline", // ไอคอนดาว
          title: "ให้คะแนนแอป",
          subtitle: "ช่วยเราปรับปรุงแอป",
          onPress: () => console.log("Rate app pressed"),
          showArrow: true,
        },
      ],
    },
    {
      title: "เกี่ยวกับ", // หมวดหมู่ที่ 4
      items: [
        {
          icon: "document-text-outline", // ไอคอนเอกสาร
          title: "เงื่อนไขการใช้งาน",
          subtitle: "อ่านเงื่อนไขและข้อตกลง",
          onPress: () => console.log("Terms pressed"),
          showArrow: true,
        },
        {
          icon: "lock-closed-outline", // ไอคอนกุญแจ
          title: "นโยบายความเป็นส่วนตัว",
          subtitle: "การใช้ข้อมูลส่วนบุคคล",
          onPress: () => console.log("Privacy pressed"),
          showArrow: true,
        },
        {
          icon: "information-circle-outline", // ไอคอนข้อมูล
          title: "เวอร์ชันแอป",
          subtitle: "v1.0.0",
          onPress: () => console.log("Version pressed"),
          showArrow: false, // ไม่แสดงลูกศร
        },
      ],
    },
  ];

  return (
    // SafeAreaView: ป้องกันเนื้อหาทับกับ notch/status bar
    <SafeAreaView
      className="  flex-1 bg-[#F8FAFC]"
      edges={["left", "right", "bottom"]}
      style={{ paddingHorizontal: TABS_HORIZONTAL_GUTTER }}
    >
      {/* ScrollView: ทำให้เนื้อหาเลื่อนได้ */}
      <ScrollView className="flex-1 " showsVerticalScrollIndicator={false}>
        {/* === PROFILE SECTION === */}
        {/* การ์ดแสดงข้อมูลโปรไฟล์ผู้ใช้ */}
        <View className="mt-4 mb-6">
          <TouchableOpacity className="p-4 bg-white shadow-sm rounded-xl">
            <View className="flex-row items-center">
              {/* วงกลมแสดงตัวอักษรจากเบอร์โทรที่บันทึกไว้ */}
              <View className="w-16 h-16 bg-[#51BC8E] rounded-full items-center justify-center mr-4">
                <Text className="text-xl font-bold text-white">
                  {profileInitials}
                </Text>
              </View>
              {/* ข้อมูลผู้ใช้ */}
              <View className="flex-1">
                <Text className="text-lg font-semibold text-[#1F2937]">
                  SuperApp User
                </Text>
                <Text className="text-sm text-[#6B7280]">
                  เบอร์ที่ผูก: {profilePhoneNumber}
                </Text>
              </View>
              {/* ลูกศรชี้ขวา (บ่งบอกว่ากดได้) */}
              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color="#9CA3AF"
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* === SETTINGS SECTIONS === */}
        {/* แสดงการตั้งค่าแบ่งตามหมวดหมู่ */}
        <View>
          {/* วนลูปแสดงแต่ละหมวดหมู่ */}
          {settingSections.map((section, sectionIndex) => (
            <View key={sectionIndex} className="mb-6">
              {/* หัวข้อหมวดหมู่ (ตัวพิมพ์ใหญ่, ตัวอักษรห่าง) */}
              <Text className="text-sm font-semibold text-[#6B7280] mb-3 uppercase tracking-wide">
                {section.title}
              </Text>
              {/* กล่องรายการในหมวดหมู่ */}
              <View className="bg-white shadow-sm rounded-xl">
                {/* วนลูปแสดงรายการในหมวดหมู่ */}
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    onPress={item.onPress} // เรียกฟังก์ชันเมื่อกด
                    // ถ้าไม่ใช่รายการสุดท้ายจะมีเส้นขอบด้านล่าง
                    className={`p-4 ${
                      itemIndex !== section.items.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <View className="flex-row items-center">
                      {/* ไอคอนของรายการ */}
                      <View className="items-center justify-center w-10 h-10 mr-3 bg-gray-100 rounded-full">
                        <Ionicons
                          name={item.icon as any}
                          size={20}
                          color="#6B7280"
                        />
                      </View>
                      {/* ข้อความรายการ */}
                      <View className="flex-1">
                        <Text className="font-medium text-[#1F2937]">
                          {item.title}
                        </Text>
                        <Text className="text-sm text-[#6B7280] mt-1">
                          {item.subtitle}
                        </Text>
                      </View>
                      {/* แสดง Switch ถ้า showSwitch เป็น true */}
                      {item.showSwitch && (
                        <Switch
                          value={item.switchValue} // ค่าปัจจุบัน
                          onValueChange={item.onPress} // ฟังก์ชันเมื่อเปลี่ยนค่า
                          trackColor={{ false: "#D1D5DB", true: "#51BC8E" }} // สีของแถบ (ปิด=เทา, เปิด=เขียว)
                          thumbColor={item.switchValue ? "#FFFFFF" : "#FFFFFF"} // สีของปุ่มกลม
                        />
                      )}
                      {/* แสดงลูกศรถ้า showArrow เป็น true */}
                      {item.showArrow && (
                        <Ionicons
                          name="chevron-forward-outline"
                          size={20}
                          color="#9CA3AF"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* === CLEAR DATA BUTTON (DEV/DEBUG) === */}
          {/* แสดงข้อมูลที่ดึงจาก keychain สำหรับ debug */}
          {__DEV__ && (
            <View className="p-4 mb-4 border-2 border-blue-200 shadow-sm bg-blue-50 rounded-xl">
              <Text className="font-semibold text-blue-800">
                🔐 Keychain Debug
              </Text>
              <View className="mt-3 space-y-2">
                <Text className="text-sm text-blue-700">
                  • Phone: {storedCredentials?.phoneNumber ?? "—"}
                </Text>
                <Text className="text-sm text-blue-700">
                  • ID: {storedCredentials?.id ?? "—"}
                </Text>
                <Text className="text-sm text-blue-700">
                  • Name: {storedCredentials?.fullName ?? "—"}
                </Text>
                <Text className="text-sm text-blue-700">
                  • Firebase UID: {storedCredentials?.firebaseUid ?? "—"}
                </Text>
                <Text className="text-sm text-blue-700">
                  • Access Token:{" "}
                  {formatTokenPreview(storedTokens?.accessToken)}
                </Text>
                <Text className="text-sm text-blue-700">
                  • Refresh Token:{" "}
                  {formatTokenPreview(storedTokens?.refreshToken)}
                </Text>
              </View>
            </View>
          )}
          {/* ปุ่มล้างข้อมูลทั้งหมด - สำหรับนักพัฒนา */}
          {__DEV__ && ( // แสดงเฉพาะตอน development เท่านั้น
            <TouchableOpacity
              onPress={handleClearAllData}
              className="p-4 mb-4 border-2 border-orange-300 shadow-sm bg-orange-50 rounded-xl"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="trash-outline" size={20} color="#F97316" />
                <Text className="ml-2 font-semibold text-orange-600">
                  🧹 ล้างข้อมูลทั้งหมด (Dev)
                </Text>
              </View>
              <Text className="mt-2 text-xs text-center text-orange-500">
                ลบ tokens และ credentials ทั้งหมดออกจาก SecureStore
              </Text>
            </TouchableOpacity>
          )}

          {/* === LOGOUT BUTTON === */}
          {/* ปุ่มออกจากระบบ */}
          <TouchableOpacity
            onPress={handleLogout} // เรียกฟังก์ชัน handleLogout
            className="p-4 mb-6 bg-white shadow-sm rounded-xl"
          >
            <View className="flex-row items-center justify-center">
              {/* ไอคอนออกจากระบบ (สีแดง) */}
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text className="text-[#EF4444] font-semibold ml-2">
                ออกจากระบบและล้างข้อมูล
              </Text>
            </View>
          </TouchableOpacity>

          {/* เพิ่มพื้นที่ด้านล่างเพื่อไม่ให้ถูก tab bar บัง */}
          <View className="h-20" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
