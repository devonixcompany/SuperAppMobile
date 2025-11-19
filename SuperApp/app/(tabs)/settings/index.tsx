// นำเข้า Ionicons สำหรับแสดงไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
// นำเข้า router สำหรับการนำทาง
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
// นำเข้า components พื้นฐานจาก React Native
import { Alert, Modal, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
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
  // State สำหรับแสดง/ซ่อน logout modal
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  // เก็บข้อมูลที่ดึงจาก keychain
  const [storedCredentials, setStoredCredentials] =
    React.useState<LoginCredentials | null>(null);
  const [storedTokens, setStoredTokens] = React.useState<AuthTokens | null>(
    null,
  );

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
    setShowLogoutModal(true);
  };

  // ฟังก์ชันยืนยันการออกจากระบบ
  const confirmLogout = async () => {
    try {
      // ลบข้อมูล credentials และ tokens ทั้งหมด
      const cleared = await clearCredentials();

      if (!cleared) {
        throw new Error("Failed to clear credentials");
      }

      setStoredCredentials(null);
      setStoredTokens(null);

      console.log("🧹 Cleared all credentials and tokens");

      // ปิด modal
      setShowLogoutModal(false);

      // นำทางกลับหน้า login
      router.replace("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      setShowLogoutModal(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถออกจากระบบได้");
    }
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

  return (
    <SafeAreaView
      className="flex-1 "
      edges={["left", "right", "bottom"]}
      style={{ paddingHorizontal: TABS_HORIZONTAL_GUTTER }}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

        {/* Profile Card with Gradient */}
        <View className="mb-8">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push("/(tabs)/settings/profile")}
          >
            <LinearGradient
              colors={[
                "#1F274B",
                "#395F85",
                "#589FAF",
                "#67C1A5",
                "#5EC1A0",
              ]}
              locations={[0.1, 0.4, 0.7, 0.99, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                borderRadius: 28,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
                shadowColor: "#0B1E2B",
                shadowOpacity: 0.25,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 12 },
                elevation: 12,
              }}
              className="p-6"
            >
              <View className="flex-row items-center justify-between px-6 py-8">
                <View className="flex-row items-center flex-1">
                  {/* Avatar with Initial */}
                  <View className="mr-4">
                    <View className="w-16 h-16 bg-[#34D399] rounded-full items-center justify-center border-2 border-white/20">
                      <Text className="text-white text-2xl font-medium">P</Text>
                    </View>
                  </View>

                  {/* User Info */}
                  <View className="flex-1">
                    <Text className="text-white text-xl font-bold mb-1">
                      User2025001
                    </Text>
                    <Text className="text-white/80 text-xl">
                      รหัสสมาชิก : P202501
                    </Text>
                  </View>
                </View>

                {/* Edit Icon */}
                <View className="w-10 h-10 bg-white/10 rounded-full items-center justify-center">
                  <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Settings List */}
        <View className="space-y-1 px-2">
          {/* การแจ้งเตือน */}
          <View className="flex-row items-center justify-between py-4">
            <Text className="text-[#374151] text-base">การแจ้งเตือน</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#E5E7EB", true: "#34D399" }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E5E7EB"
            />
          </View>

          {/* คำถามที่พบบ่อย */}
          <TouchableOpacity
            className="flex-row items-center justify-between py-4"
            onPress={() => router.push("/(tabs)/settings/faq")}
          >
            <Text className="text-[#374151] text-base">
              คำถามที่พบบ่อย
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {/* นโยบาย ความเป็นส่วนตัว */}
          <TouchableOpacity
            className="flex-row items-center justify-between py-4"
            onPress={() => router.push("/(tabs)/settings/privacy")}
          >
            <Text className="text-[#374151] text-base">
              นโยบาย ความเป็นส่วนตัว
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {/* ติดต่อเรา */}
          <TouchableOpacity
            className="flex-row items-center justify-between py-4"
            onPress={() => router.push("/(tabs)/settings/contact")}
          >
            <Text className="text-[#374151] text-base">ติดต่อเรา</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {/* ออกจากระบบ */}
          <TouchableOpacity className="flex-row items-center justify-between py-4" onPress={handleLogout}>
            <Text className="text-[#374151] text-base">ออกจากระบบ</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>

        {/* Dev Tools */}
        <View className="mt-8">

          {/* === CLEAR DATA BUTTON (DEV/DEBUG) === */}
          {/* แสดงข้อมูลที่ดึงจาก keychain สำหรับ debug */}
          {/* {__DEV__ && (
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
          {/* {__DEV__ && ( // แสดงเฉพาะตอน development เท่านั้น
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
          )} */}

          {/* เพิ่มพื้นที่ด้านล่างเพื่อไม่ให้ถูก tab bar บัง */}
          <View className="h-20" />
        </View>
      </ScrollView>

      {/* Logout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          {/* Modal Content */}
          <View className="bg-white rounded-3xl w-[85%] max-w-sm overflow-hidden">
            {/* Icon Circle */}
            <View className="items-center pt-8 pb-4">
              <View
                className="w-48 h-48 rounded-full bg-gray-100 items-center justify-center"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.2,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                <Ionicons name="log-out-outline" size={64} color="#1F2937" />
              </View>
            </View>

            {/* Title */}
            <Text className="text-xl font-bold text-center text-gray-900 px-6 mb-2">
              คุณต้องการออกจากระบบหรือไม่?
            </Text>

            {/* Description */}
            <Text className="text-sm text-center text-gray-500 px-6 mb-8">
              หากออกจากระบบ คุณจะต้องเข้าสู่ระบบใหม่ในการใช้งานครั้งถัดไป
            </Text>

            {/* Buttons */}
            <View className="flex-row px-6 pb-6 gap-2 space-x-3">
              {/* Cancel Button */}
              <TouchableOpacity
                onPress={() => setShowLogoutModal(false)}
                className="w-32 py-3 rounded-md bg-black items-center  justify-center"
                activeOpacity={0.7}
              >
                <Text className="text-xl font-bold text-white">
                  ยกเลิก
                </Text>
              </TouchableOpacity>

              {/* Confirm Button */}
              <TouchableOpacity
                onPress={confirmLogout}
                className="flex-1 rounded-md overflow-hidden"
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[
                    "#1F274B",
                    "#395F85",
                    "#589FAF",
                    "#67C1A5",
                    "#5EC1A0",
                  ]}
                  locations={[0.1, 0.4, 0.7, 0.99, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  className="py-3 items-center justify-center h-full"
                >
                  <Text className="text-xl py-4 text-center font-semibold text-white">
                    ออกจากระบ
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
