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

export default function RegisterScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
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
      
      // Navigate to OTP screen with confirmation result for registration
      router.push({
        pathname: '/otp-verification' as any,
        params: { 
          phoneNumber: formattedPhone,
          verificationId: verificationId,
          isRegistration: 'true'
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification={false}
        title="กรุณายืนยันตัวตน"
        cancelLabel="ยกเลิก"
      />
      
      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <View className="flex-row items-center pt-2 pb-4">
            <TouchableOpacity className="p-2 -ml-2" onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Logo Section */}
          <View className="items-center my-12">
             <Image source={require('../assets/img/logo.png')} style={{ width: 180, height: 100 }} />
    
          </View>

          {/* Header */}
          <View className="items-center mb-12">
            <Text className="text-2xl font-bold text-gray-800 mb-3">สมัครสมาชิก</Text>
            <Text className="text-base text-gray-500 text-center leading-6 px-4">
              กรอกหมายเลขโทรศัพท์เพื่อรับรหัส OTP และเริ่มต้นใช้งาน
            </Text>
          </View>

          {/* Form Section */}
          <View className="mb-8">
            {/* Phone Number Field */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-700 mb-3">หมายเลขโทรศัพท์</Text>
              <TextInput
                className="h-14 border border-gray-300 rounded-xl px-4 text-base bg-white shadow-sm"
                placeholder="กรอกหมายเลขโทรศัพท์ของคุณ"
                placeholderTextColor="#9CA3AF"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={15}
                autoFocus
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              />
            </View>
          </View>

          {/* Register Button */}
         <View className="mb-8">
            <LinearGradient
                           style={{borderRadius:'20px'}}
                  colors={['#1F274B', '#5EC1A0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="rounded-2xl py-4 items-center  text-center"
                >
            <TouchableOpacity
              className={`h-14 rounded-xl items-center justify-center ${loading ? 'opacity-60' : ''}`}
              style={{
      
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={sendOTP}
              disabled={loading}
            >
           
                   <Text className="text-base font-semibold text-white">
                {loading ? 'กำลังส่ง OTP...' : 'ขอรหัส OTP'}
              </Text>
           
            </TouchableOpacity>
                    </LinearGradient>
          </View>

          {/* Login Link */}
          <View className="flex-row items-center justify-start mb-8">
            <Text className="text-base text-gray-500">มีบัญชีอยู่แล้ว? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text className="text-base text-[#51BC8E] font-medium underline">เข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </View>

      
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}