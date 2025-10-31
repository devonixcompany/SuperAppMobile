// นำเข้า Ionicons สำหรับไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
// นำเข้า LinearGradient สำหรับพื้นหลังไล่สี
import { LinearGradient } from "expo-linear-gradient";
// นำเข้า router และ useFocusEffect สำหรับการนำทางและตรวจสอบหน้า
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// นำเข้า authService สำหรับเรียก API login
import { authService } from "@/services/api";
// นำเข้าฟังก์ชันจัดการ keychain
import { getTokens, storeCredentials, storeTokens } from "@/utils/keychain";

export default function LoginScreen() {
  // State สำหรับเก็บหมายเลขโทรศัพท์
  const [phoneNumber, setPhoneNumber] = useState("");
  // State สำหรับเก็บรหัสผ่าน
  const [password, setPassword] = useState("");
  // State สำหรับเปิด/ปิดการแสดงรหัสผ่าน
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  // State สำหรับสถานะกำลังโหลด
  const [loading, setLoading] = useState(false);
  // State สำหรับการเช็คว่ามี session อยู่หรือไม่
  const [checkingSession, setCheckingSession] = useState(true);

  // ฟังก์ชันเช็คว่าเคย login แล้วหรือยัง
  const checkExistingSession = useCallback(async () => {
    try {
      setCheckingSession(true); // เริ่มเช็ค session

      // ดึง tokens ที่เก็บไว้
      const tokens = await getTokens();

      // ถ้ามี access token แสดงว่าเคย login แล้ว
      if (tokens?.accessToken) {
        console.log("✅ Found existing session, redirecting to home...");
        // นำทางไปหน้า home ทันที (แทนที่หน้าปัจจุบัน)
        router.replace("/(tabs)/home" as any);
        return;
      }

      console.log("ℹ️ No existing session found");
    } catch (error) {
      console.error("Error checking session:", error);
    } finally {
      setCheckingSession(false); // เช็ค session เสร็จแล้ว
    }
  }, []);

  // ใช้ useFocusEffect เพื่อเช็ค session ทุกครั้งที่เข้าหน้านี้
  useFocusEffect(
    useCallback(() => {
      checkExistingSession();
    }, [checkExistingSession]),
  );

  // ฟังก์ชันสำหรับ login
  const handleLogin = async () => {
    // ตรวจสอบว่ากรอกหมายเลขโทรศัพท์หรือยัง
    if (!phoneNumber.trim()) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกหมายเลขโทรศัพท์");
      return;
    }

    // ตรวจสอบว่ากรอกรหัสผ่านหรือยัง
    if (!password.trim()) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกรหัสผ่าน");
      return;
    }

    setLoading(true); // เริ่มโหลด

    try {
      // เรียก API login ผ่าน authService
      const responseData = await authService.login({
        phoneNumber: phoneNumber.trim(),
        password,
      });

      console.log("✅ Login successful:", responseData);

      // เก็บ credentials ลง keychain อย่างปลอดภัย (รวม id, firebaseUid และ fullName)
      const credentialsStored = await storeCredentials({
        id: responseData.data?.user?.id,
        phoneNumber: phoneNumber.trim(),
        password,
        firebaseUid: responseData.data?.user?.firebaseUid,
        fullName: responseData.data?.user?.fullName,
      });
      console.log("🔐 Credentials stored:", credentialsStored);

      // เก็บ authentication tokens
      if (responseData.data?.accessToken && responseData.data?.refreshToken) {
        const tokensStored = await storeTokens({
          accessToken: responseData.data.accessToken,
          refreshToken: responseData.data.refreshToken,
        });
        console.log("🎫 Tokens stored:", tokensStored);
        console.log(
          "📦 Access Token:",
          responseData.data.accessToken.substring(0, 20) + "...",
        );
        console.log(
          "🔄 Refresh Token:",
          responseData.data.refreshToken.substring(0, 20) + "...",
        );
      } else {
        console.warn("⚠️ No tokens received from server");
      }

      // แสดง Alert สำเร็จ
      Alert.alert("สำเร็จ!", "เข้าสู่ระบบสำเร็จ", [
        {
          text: "ตกลง",
          onPress: () => router.replace("/(tabs)/home" as any), // ไปหน้า home
        },
      ]);
    } catch (error: any) {
      console.error("Login error:", error);
      // แสดง Alert เกิดข้อผิดพลาด
      Alert.alert(
        "เกิดข้อผิดพลาด",
        error.message || "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
      );
    } finally {
      setLoading(false); // หยุดโหลด
    }
  };

  // ฟังก์ชันไปหน้าสมัครสมาชิก
  const goToRegister = () => {
    router.push("/register");
  };

  // ถ้ากำลังเช็ค session อยู่ ให้แสดง loading screen
  if (checkingSession) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center">
        <ActivityIndicator size="large" color="#51BC8E" />
        <Text className="text-[#6B7280] mt-4">กำลังตรวจสอบ...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* ปุ่มกลับ */}
      <View className="pt-4 pb-2 px-6">
        <TouchableOpacity
          className="w-10 h-10 rounded-[20px] bg-white items-center justify-center shadow-sm"
          onPress={() => router.replace("/terms")}
        >
          <Ionicons name="chevron-back-outline" size={24} color="#1A2542" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="flex-grow px-6 pb-6">
            {/* === LOGO AND TITLE SECTION === */}
            <View className="items-center mb-8">
              <View className="items-center my-8">
                {/* โลโก้แอป */}
                <Image
                  source={require("@/assets/img/logo.png")}
                  style={{ width: 220, height: 100 }}
                />
              </View>

              {/* หัวข้อ "เข้าสู่ระบบ" */}
              <Text className="text-[28px] font-bold text-[#51BC8E] mb-2">
                เข้าสู่ระบบ
              </Text>
              {/* คำอธิบาย */}
              <Text className="text-base mt-4 text-[#6B7280] text-center leading-6">
                ผู้ใช้สามารถเข้าสู่ระบบ{"\n"}ด้วยหมายเลขโทรศัพท์
                และรหัสผ่านที่ลงทะเบียนไว้แล้ว
              </Text>
            </View>

            {/* === FORM SECTION === */}
            <View className="mb-6 mt-2">
              {/* ช่องกรอกหมายเลขโทรศัพท์ */}
              <View className="mb-5">
                <TextInput
                  className="border border-[#D1D5DB] rounded-xl px-4 py-4 text-base bg-white text-[#1F2937]"
                  placeholder="หมายเลขโทรศัพท์"
                  placeholderTextColor="#9CA3AF"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad" // แป้นพิมพ์แบบตัวเลข
                  maxLength={15}
                  autoFocus // โฟกัสอัตโนมัติ
                />
              </View>

              {/* ช่องกรอกรหัสผ่าน */}
              <View className="mb-5">
                <View className="flex-row items-center border border-[#D1D5DB] rounded-xl bg-white">
                  <TextInput
                    className="flex-1 px-4 py-4 text-base text-[#1F2937]"
                    placeholder="รหัสผ่าน"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible} // ซ่อนรหัสผ่าน
                  />
                  {/* ปุ่มแสดง/ซ่อนรหัสผ่าน */}
                  <TouchableOpacity
                    className="px-4 py-4"
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  >
                    <Ionicons
                      name={
                        isPasswordVisible ? "eye-outline" : "eye-off-outline"
                      }
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ลิงก์ "ลืมรหัสผ่าน" */}
              <View className="flex-row justify-end items-center mt-4">
                <TouchableOpacity className="ml-2">
                  <Text className="text-sm text-[#565b64]">ลืมรหัสผ่าน</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* === LOGIN BUTTON === */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading} // ปิดปุ่มเมื่อกำลังโหลด
              className="mb-6"
            >
              <LinearGradient
                colors={["#1F274B", "#5EC1A0"]} // ไล่สีน้ำเงินเข้ม -> เขียว
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 15,
                  borderRadius: 8,
                  alignItems: "center",
                  opacity: loading ? 0.7 : 1, // ลดความทึบเมื่อกำลังโหลด
                }}
                className="rounded-xl py-4 px-6 items-center justify-center"
              >
                {loading ? (
                  // แสดง loading indicator
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  // แสดงข้อความ "เข้าสู่ระบบ"
                  <Text className="text-white py-2 text-xl font-semibold">
                    เข้าสู่ระบบ
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* === REGISTER LINK === */}
            <View className="flex-row justify-start items-center">
              <Text className="text-sm text-[#6B7280]">ยังไม่มีบัญชี? </Text>
              <TouchableOpacity onPress={goToRegister}>
                <Text className="text-sm text-[#51BC8E] font-semibold">
                  สมัครสมาชิก
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
