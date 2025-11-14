import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Auth, PhoneAuthProvider } from "firebase/auth";
import React, { useRef, useState } from "react";
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
import { firebaseConfig } from "@/config/firebaseConfig";

// Import auth with proper typing
const { auth } = require("@/config/firebaseConfig") as { auth: Auth };

export default function RegisterScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, "");

    // If it starts with 0, replace with +66
    if (cleaned.startsWith("0")) {
      return "+66" + cleaned.substring(1);
    }

    // If it doesn't start with +66, add it
    if (!cleaned.startsWith("66")) {
      return "+66" + cleaned;
    }

    return "+" + cleaned;
  };

  const validateForm = () => {
    if (!phoneNumber.trim()) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกหมายเลขโทรศัพท์");
      return false;
    }

    if (phoneNumber.replace(/\D/g, "").length < 9) {
      Alert.alert("ข้อผิดพลาด", "หมายเลขโทรศัพท์ไม่ถูกต้อง");
      return false;
    }

    return true;
  };

  const sendOTP = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log("Sending OTP to:", formattedPhone);

      // Use PhoneAuthProvider with reCAPTCHA verifier
      const phoneProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(
        formattedPhone,
        recaptchaVerifier.current!,
      );

      console.log("Verification ID:", verificationId);

      // Navigate to OTP verification screen with registration flag and user data
      router.push({
        pathname: "/otp-verification",
        params: {
          verificationId,
          phoneNumber: formattedPhone,
          isRegistration: "true",
        },
      });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      Alert.alert(
        "เกิดข้อผิดพลาด",
        error.message || "ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่อีกครั้ง",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, padding: 20 }}>
            {/* Header */}
            <View
              style={{ alignItems: "center", marginTop: 40, marginBottom: 40 }}
            >
              <Image
                source={require("@/assets/img/logo.png")}
                style={{ width: 120, height: 40, marginBottom: 20 }}
                contentFit="contain"
              />
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#333",
                  marginBottom: 8,
                }}
              >
                ลงทะเบียน
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: "#666",
                  textAlign: "center",
                }}
              >
                กรอกข้อมูลเพื่อสร้างบัญชีใหม่
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#9CA3AF",
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                โหมดพัฒนา: สมัครด้วย 0814266508 และกรอก OTP 123456 เพื่อทดสอบ
              </Text>
            </View>

            {/* Form */}
            <View style={{ marginBottom: 30 }}>
              {/* Phone Number Input */}
              <View style={{ marginBottom: 30 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "500",
                    color: "#333",
                    marginBottom: 8,
                  }}
                >
                  หมายเลขโทรศัพท์
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: "#ddd",
                    borderRadius: 8,
                    padding: 15,
                    fontSize: 16,
                    backgroundColor: "#fff",
                  }}
                  placeholder="0XX-XXX-XXXX"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={15}
                  autoCorrect={false}
                  autoCapitalize="none"
                  blurOnSubmit={false}
                  returnKeyType="done"
                />
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                onPress={sendOTP}
                disabled={loading}
                style={{ marginBottom: 20 }}
              >
                <LinearGradient
                  colors={["#1F274B", "#5EC1A0"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 15,
                    borderRadius: 8,
                    alignItems: "center",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: "600",
                      }}
                    >
                      ดำเนินการต่อ
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View
              style={{
                alignItems: "center",
                marginTop: "auto",
                marginBottom: 20,
              }}
            >
              <Text style={{ color: "#666", fontSize: 14 }}>
                มีบัญชีอยู่แล้ว?{" "}
                <Text
                  style={{ color: "#4CAF50", fontWeight: "500" }}
                  onPress={() => router.push("/login")}
                >
                  เข้าสู่ระบบ
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* reCAPTCHA */}
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={firebaseConfig}
          attemptInvisibleVerification={true}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
