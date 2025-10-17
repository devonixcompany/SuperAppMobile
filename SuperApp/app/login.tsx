import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ENV from '../config/env';
import { storeCredentials, storeTokens } from '../utils/keychain';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกหมายเลขโทรศัพท์');
      return;
    }

    if (!password.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกรหัสผ่าน');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${ENV.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          password,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Login failed');
      }

      console.log('✅ Login successful:', responseData);

      // Store credentials securely using keychain
      const credentialsStored = await storeCredentials({
        phoneNumber: phoneNumber.trim(),
        password
      });
      console.log('🔐 Credentials stored:', credentialsStored);

      // Store authentication tokens
      if (responseData.data?.accessToken && responseData.data?.refreshToken) {
        const tokensStored = await storeTokens({
          accessToken: responseData.data.accessToken,
          refreshToken: responseData.data.refreshToken,
        });
        console.log('🎫 Tokens stored:', tokensStored);
        console.log('📦 Access Token:', responseData.data.accessToken.substring(0, 20) + '...');
        console.log('🔄 Refresh Token:', responseData.data.refreshToken.substring(0, 20) + '...');
      } else {
        console.warn('⚠️ No tokens received from server');
      }

      Alert.alert(
        'สำเร็จ!',
        'เข้าสู่ระบบสำเร็จ',
        [
          {
            text: 'ตกลง',
            onPress: () => router.replace('/explore' as any)
          }
        ]
      );

    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert(
        'เกิดข้อผิดพลาด',
        error.message || 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง'
      );
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => {
    router.push('/register');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">

      {/* Back Button */}
      <View className="pt-4 pb-2">
        <TouchableOpacity
          className="w-10 h-10 rounded-[20px] bg-white items-center justify-center shadow-sm"
          onPress={() => router.replace('/terms')}
        >
          <Ionicons name="chevron-back-outline" size={24} color="#1A2542" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="flex-grow px-6 pb-6">
            {/* Logo and Title Section */}
            <View className="items-center mb-8">
              <View className="items-center my-8">
                <Image source={require('../assets/img/logo.png')} style={{ width: 220, height: 100 }} />
              </View>

              <Text className="text-[28px] font-bold text-[#51BC8E] mb-2">เข้าสู่ระบบ</Text>
              <Text className="text-base mt-4 text-[#6B7280] text-center leading-6">
                ผู้ใช้สามารถเข้าสู่ระบบ{'\n'}ด้วยหมายเลขโทรศัพท์
                และรหัสผ่านที่ลงทะเบียนไว้แล้ว
              </Text>
            </View>



            {/* Form Section */}
            <View className="mb-6 mt-2">
              {/* Phone Number Field */}
              <View className="mb-5">
                <TextInput
                  className="border border-[#D1D5DB] rounded-xl px-4 py-4 text-base bg-white text-[#1F2937]"
                  placeholder="หมายเลขโทรศัพท์"
                  placeholderTextColor="#9CA3AF"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={15}
                  autoFocus
                />
              </View>

              {/* Password Field */}
              <View className="mb-5">
                <View className="flex-row items-center border border-[#D1D5DB] rounded-xl bg-white">
                  <TextInput
                    className="flex-1 px-4 py-4 text-base text-[#1F2937]"
                    placeholder="รหัสผ่าน"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                  />
                  <TouchableOpacity
                    className="px-4 py-4"
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  >
                    <Ionicons
                      name={isPasswordVisible ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <View className="flex-row justify-end items-center mt-4">
                <TouchableOpacity className="ml-2">
                  <Text className="text-sm text-[#565b64]">ลืมรหัสผ่าน</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="mb-6"
            >
              <LinearGradient
                colors={['#1F274B', '#5EC1A0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 15,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: loading ? 0.7 : 1
                }}
                className="rounded-xl py-4 px-6 items-center justify-center"
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-whit py-2 text-white text-xl font-semibold">
                    เข้าสู่ระบบ
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>




            {/* Register Link */}
            <View className="flex-row justify-start items-center">
              <Text className="text-sm text-[#6B7280]">ยังไม่มีบัญชี? </Text>
              <TouchableOpacity onPress={goToRegister}>
                <Text className="text-sm text-[#51BC8E] font-semibold">สมัครสมาชิก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}