import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
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
// @ts-expect-error - Firebase config is JS file
import { auth } from "@/config/firebaseConfig";

export default function OTPVerificationScreen() {
  const { phoneNumber, verificationId, isRegistration, fullName } =
    useLocalSearchParams();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authData, setAuthData] = useState<any>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOTP = async () => {
    const otpCode = otp.join("");

    if (otpCode.length !== 6) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกรหัส OTP ให้ครบ 6 หลัก");
      return;
    }

    setLoading(true);

    try {
      const credential = PhoneAuthProvider.credential(
        verificationId as string,
        otpCode,
      );

      // @ts-expect-error - auth type from JS config
      const userCredential = await signInWithCredential(auth, credential);
      console.log("verify otp success data respon firebase ", userCredential);
      // Show success feedback immediately
      setLoading(false);

      if (isRegistration === "true") {
        // For registration flow, navigate to success page with Firebase UID
        router.push({
          pathname: "/success" as any,
          params: {
            fullName,
            phoneNumber,
            firebaseUid: userCredential.user.uid,
          },
        });
      } else {
        // For login flow, navigate directly to success
        router.push("/success" as any);
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      Alert.alert(
        "ข้อผิดพลาด",
        "รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง",
      );
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setResendLoading(true);
    setCountdown(30);

    try {
      // In a real app, you would call the resend OTP function here
      // For now, we'll just show a success message
      Alert.alert("สำเร็จ", "ส่งรหัส OTP ใหม่แล้ว");
    } catch (error: any) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถส่งรหัส OTP ใหม่ได้");
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <View className="flex-row items-center pt-2 pb-4">
            <TouchableOpacity
              className="p-2 -ml-2"
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Logo Section */}
          <View className="items-center my-12">
            <Image
              source={require("@/assets/img/logo.png")}
              style={{ width: 180, height: 100 }}
            />
          </View>

          {/* Header */}
          <View className="items-center mb-12">
            <Text className="text-2xl font-bold text-[#51BC8E] mb-3">
              {isRegistration === "true" ? "ยืนยันการลงทะเบียน" : "ส่ง OTP"}
            </Text>
            <Text className="text-base text-gray-500 text-center leading-6 px-4">
              {isRegistration === "true"
                ? `ระบบได้ส่งรหัส OTP 6 หลักไปยัง ${phoneNumber} เพื่อยืนยันการลงทะเบียน`
                : "ระบบได้ส่งรหัส OTP 6 หลักทาง SMS เพื่อยืนยันตัวตน"}
            </Text>
            <Text className="text-sm text-gray-400 text-center mt-2">
              รหัสจะหมดอายุใน {formatTime(countdown)}
            </Text>
          </View>

          {/* OTP Input Section */}
          <View className="mb-8">
            <View className="flex-row justify-center gap-4 space-x-3 mb-6">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  className={`w-12 h-14 border-2 rounded-xl text-center text-xl font-bold bg-white ${
                    digit ? "border-[#51BC8E] 12" : "border-gray-300"
                  }`}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, index)
                  }
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                />
              ))}
            </View>
          </View>

          {/* Verify Button */}
          <View className="mb-8">
            <TouchableOpacity
              onPress={verifyOTP}
              disabled={loading}
              className={`rounded-xl ${loading ? "opacity-60" : ""}`}
            >
              <LinearGradient
                colors={["#5EC1A0", "#395F85"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="h-14 rounded-xl items-center justify-center"
                style={{
                  shadowColor: "#3B82F6",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                {loading ? (
                  <View className="flex-row items-center text-center  justify-center ">
                    <ActivityIndicator size="small" color="#fff" />
                    <Text className="text-xl py-4 flex justify-center text-center font-semibold text-white ml-2">
                      กำลังยืนยัน...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-xl font-semibold py-4 text-center text-white">
                    ส่งรหัส
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Resend Section */}
          <View className="items-start  mb-8">
            {countdown > 0 ? (
              <Text className="text-base text-gray-500">
                ไม่ได้รับ OTP?{" "}
                <Text className="text-[#51BC8E] font-medium underline">
                  ส่งใหม่
                </Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={resendOTP} disabled={resendLoading}>
                <Text
                  className={`text-base ${resendLoading ? "text-gray-400" : "text-neutral-600 text-center underline"} font-medium underline`}
                >
                  {resendLoading ? "กำลังส่ง..." : "ส่งรหัส OTP ใหม่"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
