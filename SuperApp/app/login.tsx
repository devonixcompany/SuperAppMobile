import { Ionicons } from '@expo/vector-icons';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { PhoneAuthProvider } from 'firebase/auth';
import React, { useRef, useState } from 'react';
import {
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
import { auth, firebaseConfig } from '../firebaseConfig';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const recaptchaVerifier = useRef(null);

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Add +66 prefix if it doesn't start with country code
    if (cleaned.startsWith('0')) {
      return '+66' + cleaned.substring(1);
    } else if (!cleaned.startsWith('66')) {
      return '+66' + cleaned;
    } else if (!cleaned.startsWith('+66')) {
      return '+' + cleaned;
    }
    
    return phone;
  };

  const sendOTP = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกหมายเลขโทรศัพท์');
      return;
    }

    setLoading(true);
    
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      // Use PhoneAuthProvider with reCAPTCHA verifier
      const phoneProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(
        formattedPhone,
        recaptchaVerifier.current!
      );
      
      // Navigate to OTP screen with confirmation result
      router.push({
        pathname: '/otp-verification' as any,
        params: { 
          phoneNumber: formattedPhone,
          verificationId: verificationId 
        }
      });
      
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      Alert.alert(
        'ข้อผิดพลาด', 
        error.message || 'ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่อีกครั้ง'
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
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification={false}
        title="กรุณายืนยันตัวตน"
        cancelLabel="ยกเลิก"
      />
      
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
            <View className="mb-6 mt-6">
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

              {/* Remember Me and Forgot Password */}
              <View className="flex-row justify-between items-center mt-4">
                <TouchableOpacity
                  className="flex-row items-center ml-2"
                  onPress={() => setRememberMe(!rememberMe)}
                >
             
                  <Text className="text-sm text-[#565b64]">ลืมรหัสผ่าน</Text>
                </TouchableOpacity>
                

              </View>
            </View>

            {/* Login Button */}
            <View className="mb-6 mt-24 rounded-2xl">
              <TouchableOpacity
              style={{borderRadius:'20px'}}
              className='rounded-2xl'
                onPress={sendOTP}
                disabled={loading}
              >
                <LinearGradient
                           style={{borderRadius:'20px'}}
                  colors={['#1F274B', '#5EC1A0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="rounded-2xl py-4 items-center  text-center"
                >
                  <Text            style={{borderRadius:'20px'}} className="text-white py-4 text-center rounded-2xl text-lg   font-bold">
                    {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>


        

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