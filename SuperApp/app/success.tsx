import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
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
import { authService } from "@/services/api";
import { storeTokens } from "@/utils/keychain";

export default function SuccessScreen() {
  const params = useLocalSearchParams();
  const firebaseUidFromParams = params.firebaseUid as string;
  const phoneNumberFromParams = params.phoneNumber as string;

  const [userType, setUserType] = useState("individual"); // 'individual' or 'corporate'
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Memoize handlers to prevent re-renders
  const handleFullNameChange = useCallback(
    (text: string) => setFullName(text),
    [],
  );
  const handleEmailChange = useCallback((text: string) => setEmail(text), []);
  const handlePasswordChange = useCallback(
    (text: string) => setPassword(text),
    [],
  );
  const handleConfirmPasswordChange = useCallback(
    (text: string) => setConfirmPassword(text),
    [],
  );
  const toggleShowPassword = useCallback(
    () => setShowPassword((prev) => !prev),
    [],
  );
  const toggleShowConfirmPassword = useCallback(
    () => setShowConfirmPassword((prev) => !prev),
    [],
  );

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกชื่อ-นามสกุล");
      return false;
    }

    if (!email.trim()) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกอีเมล");
      return false;
    }

    if (!validateEmail(email)) {
      Alert.alert("ข้อผิดพลาด", "รูปแบบอีเมลไม่ถูกต้อง");
      return false;
    }

    if (!password.trim()) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกรหัสผ่าน");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("ข้อผิดพลาด", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("ข้อผิดพลาด", "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Validate Firebase UID and phone number
      if (!firebaseUidFromParams) {
        Alert.alert(
          "ข้อผิดพลาด",
          "ไม่พบข้อมูลการยืนยันตัวตน กรุณาลองใหม่อีกครั้ง",
        );
        return;
      }

      if (!phoneNumberFromParams) {
        Alert.alert("ข้อผิดพลาด", "ไม่พบหมายเลขโทรศัพท์ กรุณาลองใหม่อีกครั้ง");
        return;
      }

      const registrationData = {
        firebaseUid: firebaseUidFromParams,
        phoneNumber: phoneNumberFromParams,
        userType,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      };

      console.log("Registration data:", registrationData);

      // Send data to backend API using auth service
      const responseData = await authService.register(registrationData);

      console.log("✅ Registration successful:", responseData);

      // Store authentication tokens if provided
      if (responseData.data?.token && responseData.data?.refreshToken) {
        const tokensStored = await storeTokens({
          accessToken: responseData.data.token,
          refreshToken: responseData.data.refreshToken,
        });
        console.log("🎫 Tokens stored after registration:", tokensStored);
        console.log(
          "📦 Access Token:",
          responseData.data.token.substring(0, 20) + "...",
        );
        console.log(
          "🔄 Refresh Token:",
          responseData.data.refreshToken.substring(0, 20) + "...",
        );
      } else {
        console.warn("⚠️ No tokens received from registration");
      }

      Alert.alert("สำเร็จ!", "การลงทะเบียนเสร็จสมบูรณ์", [
        {
          text: "ตกลง",
          onPress: () => router.replace("/login"),
        },
      ]);
    } catch (error: any) {
      console.error("Registration error:", error);
      Alert.alert(
        "เกิดข้อผิดพลาด",
        error.message || "ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="flex-1 justify-center items-center ">
            {/* Header */}
            <View className="items-center  mb-10">
              <Image
                source={require("@/assets/img/logo.png")}
                style={{ width: 220, height: 110 }}
              />
              <Text className="text-2xl font-bold text-[#5EC1A0] mb-2">
                ลงทะเบียน
              </Text>
              <Text className="text-base text-gray-600 text-center leading-6">
                กรอกข้อมูลส่วนตัวเพื่อสร้างบัญชีใหม่
              </Text>
            </View>

            {/* Form */}
            <View className="mb-8 w-full  px-8">
              {/* User Type Selection */}
              <View className="mb-5">
                <Text className="text-base font-medium text-[#1D2144] mb-3">
                  ประเภทผู้ใช้
                </Text>
                <View className="flex-row bg-gray-100 rounded-lg p-1">
                  <TouchableOpacity
                    onPress={() => setUserType("individual")}
                    className={`flex-1 py-3 px-4 rounded-md items-center ${userType === "individual" ? "bg-[#00C58E]" : "bg-transparent"}`}
                  >
                    <Text
                      className={`text-sm ${userType === "individual" ? "text-white font-semibold" : "text-gray-600 font-normal"}`}
                    >
                      บุคคลธรรมดา
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setUserType("corporate")}
                    className={`flex-1 py-3 px-4 rounded-md items-center ${userType === "corporate" ? "bg-[#00C58E]" : "bg-transparent"}`}
                  >
                    <Text
                      className={`text-sm ${userType === "corporate" ? "text-white font-semibold" : "text-gray-600 font-normal"}`}
                    >
                      นิติบุคคล
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ชื่อ-นามสกุล */}
              <View className="mb-5">
                <Text className="text-base font-medium text-[#1D2144] mb-2">
                  ชื่อ-นามสกุล
                </Text>
                <View className="border border-gray-300 rounded-lg bg-white">
                  <TextInput
                    className="px-4 py-4 text-base text-[#1F2937]"
                    placeholder="กรอกชื่อ-นามสกุล"
                    placeholderTextColor="#9CA3AF"
                    value={fullName}
                    onChangeText={handleFullNameChange}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* อีเมล */}
              <View className="mb-5">
                <Text className="text-base font-medium text-[#1D2144] mb-2">
                  อีเมล
                </Text>
                <View className="border border-gray-300 rounded-lg bg-white">
                  <TextInput
                    className="px-4 py-4 text-base text-[#1F2937]"
                    placeholder="example@email.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* รหัสผ่าน */}
              <View className="mb-5">
                <Text className="text-base font-medium text-[#1D2144] mb-2">
                  รหัสผ่าน
                </Text>
                <View className="relative border border-gray-300 rounded-lg bg-white">
                  <TextInput
                    className="px-4 py-4 text-base text-[#1F2937]"
                    placeholder="กรอกรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={toggleShowPassword}
                    className="absolute right-4 top-4 p-1"
                  >
                    <Ionicons
                      name={showPassword ? "eye" : "eye-off"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ยืนยันรหัสผ่าน */}
              <View className="mb-5">
                <Text className="text-base font-medium text-[#1D2144] mb-2">
                  ยืนยันรหัสผ่าน
                </Text>
                <View className="relative border border-gray-300 rounded-lg bg-white">
                  <TextInput
                    className="px-4 py-4 text-base text-[#1F2937]"
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={toggleShowConfirmPassword}
                    className="absolute right-4 top-4 p-1"
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye" : "eye-off"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                className="mt-2"
              >
                <LinearGradient
                  colors={["#1D2144", "#00C58E"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className={`py-4 rounded-lg items-center shadow-sm ${
                    loading ? "opacity-70" : "opacity-100"
                  }`}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white py-4 text-center text-xl font-semibold">
                      ยืนยัน
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View className="items-center mt-auto mb-5">
              <Text className="text-gray-600 text-sm">
                มีบัญชีอยู่แล้ว?{" "}
                <Text
                  className="text-[#00C58E] font-medium"
                  onPress={() => router.push("/login")}
                >
                  เข้าสู่ระบบ
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
