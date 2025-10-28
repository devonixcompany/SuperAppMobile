import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
// นำเข้าฟังก์ชันจัดการ keychain
import { getTokens } from '@/utils/keychain';

export default function TermsScreen() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // 2 seconds
    return () => clearTimeout(timer);
  }, []);

  const onNext = () => {
    if (currentPage === 0) {
      setCurrentPage(1);
    } else {
      router.replace('/login');
    }
  };

  const SolarSystemIllustration = () => (
    <Svg width="160" height="120" viewBox="0 0 160 120">
      <Defs>
        <LinearGradient id="batteryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4ADE80" />
          <Stop offset="100%" stopColor="#22C55E" />
        </LinearGradient>
        <LinearGradient id="cylinderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E2E8F0" />
          <Stop offset="100%" stopColor="#CBD5E1" />
        </LinearGradient>
        <LinearGradient id="solarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#1E293B" />
          <Stop offset="100%" stopColor="#334155" />
        </LinearGradient>
      </Defs>

      {/* Battery Storage */}
      <Rect x="10" y="35" width="35" height="50" rx="4" fill="url(#batteryGradient)" />
      <Rect x="15" y="40" width="25" height="8" rx="2" fill="white" opacity="0.3" />
      <Path d="M22 25 L28 25 L28 35 L22 35 Z" fill="url(#batteryGradient)" />

      {/* Lightning bolt on battery */}
      <Path d="M25 50 L30 60 L27 60 L29 70 L24 60 L27 60 Z" fill="white" />

      {/* Cylindrical Storage Tank */}
      <Ellipse cx="80" cy="25" rx="15" ry="8" fill="url(#cylinderGradient)" />
      <Rect x="65" y="25" width="30" height="35" fill="url(#cylinderGradient)" />
      <Ellipse cx="80" cy="60" rx="15" ry="8" fill="#94A3B8" />
      <Rect x="75" y="15" width="10" height="8" rx="2" fill="white" opacity="0.8" />

      {/* Solar Panels */}
      <Rect x="110" y="20" width="40" height="25" rx="2" fill="url(#solarGradient)" />
      <Rect x="110" y="50" width="40" height="25" rx="2" fill="url(#solarGradient)" />

      {/* Solar panel grid lines */}
      <Path d="M115 25 L115 40 M120 25 L120 40 M125 25 L125 40 M130 25 L130 40 M135 25 L135 40 M140 25 L140 40 M145 25 L145 40"
            stroke="#475569" strokeWidth="0.5" />
      <Path d="M112 30 L148 30 M112 35 L148 35" stroke="#475569" strokeWidth="0.5" />

      <Path d="M115 55 L115 70 M120 55 L120 70 M125 55 L125 70 M130 55 L130 70 M135 55 L135 70 M140 55 L140 70 M145 55 L145 70"
            stroke="#475569" strokeWidth="0.5" />
      <Path d="M112 60 L148 60 M112 65 L148 65" stroke="#475569" strokeWidth="0.5" />

      {/* Connecting Cables */}
      <Path d="M45 60 Q60 55 65 50" stroke="#1E40AF" strokeWidth="3" fill="none" />
      <Path d="M95 45 Q105 40 110 35" stroke="#1E40AF" strokeWidth="3" fill="none" />

      {/* Cable connector circles */}
      <Circle cx="45" cy="60" r="3" fill="#1E40AF" />
      <Circle cx="65" cy="50" r="3" fill="#1E40AF" />
      <Circle cx="95" cy="45" r="3" fill="#1E40AF" />
      <Circle cx="110" cy="35" r="3" fill="#1E40AF" />

      {/* Energy flow indicators */}
      <Path d="M50 58 L55 58 L53 55 M53 61 L55 58" stroke="#22C55E" strokeWidth="2" fill="none" />
      <Path d="M100 43 L105 43 L103 40 M103 46 L105 43" stroke="#22C55E" strokeWidth="2" fill="none" />
    </Svg>
  );

  const IntroContent = () => (
    <View className="flex-col items-center py-24  gap-8 pt-6 flex justify-center">
    <Image source={require('@/assets/img/Frame.png')} style={{ width: 220, height: 180 }} />

      <View>
 <Text className="text-xl font-bold text-[#1A2542] text-center mb-2">ระบบโซลาร์อัจฉริยะ</Text>
      <Text className="text-sm leading-[22px] text-[#3A4364] text-center px-4">
        ตรวจสอบการผลิตพลังงานพร้อมวิเคราะห์เพื่อการประหยัดควบคุมระบบโซลาร์ของคุณได้แบบเรียลไทม์
        พร้อมรับข้อมูลประสิทธิภาพและแจ้งเตือนสถานะต่าง ๆ
      </Text>
      </View>

    </View>
  );
const fristpage = () => (
    <View className="flex items-center justify-center">
  <Image source={require('@/assets/img/logo.png')} className="w-[280px] h-[140px]" />

    </View>
  );
  const HomePreviewContent = () => (
    <View className="flex-col items-center py-24  gap-8 pt-6 flex justify-center">
  <Image source={require('@/assets/img/Frame2.png')} style={{ width: 220, height: 180 }} />
<View>
      <Text className="text-xl font-bold text-[#1A2542] text-center mb-2">แดชบอร์ดระบบโซลาร์</Text>
      <Text className="text-sm leading-[22px] text-[#3A4364] text-center px-4">
        ติดตามการผลิตไฟฟ้า สถิติการใช้งาน และประสิทธิภาพของระบบโซลาร์ได้แบบเรียลไทม์
        พร้อมการแจ้งเตือนและการวิเคราะห์ข้อมูลอัตโนมัติ
      </Text>
      </View>
    </View>
  );

  const ProgressDot = ({ isActive }: { isActive: boolean }) => (
    <View className={`w-8 h-1.5 rounded-xl ${isActive ? 'bg-[#2EC27E]' : 'bg-[#D7DCE8]'}`} />
  );

  // ถ้ากำลังเช็ค session อยู่ ให้แสดง loading screen
  if (checkingSession) {
    return (
      <SafeAreaView className="flex-1 bg-[#EEF0F6] items-center justify-center">
        <ActivityIndicator size="large" color="#51BC8E" />
        <Text className="text-[#6B7280] mt-4">กำลังตรวจสอบ...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#EEF0F6]">
      {showSplash ? (
        <View className="flex-1 justify-center items-center bg-[#EEF0F6]">
          {fristpage()}
        </View>
      ) : (
        <View className="flex-1 px-8 py-6">
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {currentPage === 0 ? <IntroContent /> : <HomePreviewContent />}
          </ScrollView>

          <View className="flex-row items-center justify-between pt-6">
            <View className="flex-row items-center flex-1 justify-center">
              <ProgressDot isActive={currentPage === 0} />
              <View className="w-3" />
              <ProgressDot isActive={currentPage === 1} />
            </View>

            <TouchableOpacity className="bg-[#1FB27B] px-7 py-3 rounded-3xl" onPress={onNext}>
              <Text className="text-white text-base font-semibold">
                {currentPage === 0 ? 'ถัดไป' : 'เริ่มใช้งาน'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
