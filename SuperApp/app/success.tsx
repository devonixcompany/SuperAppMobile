import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function SuccessScreen() {
  const handleContinue = () => {
    // Navigate to main app or home screen
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
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
          <View className="mb-4">
            <Text className="text-4xl font-bold">
              <Text className="text-green-500">P</Text>
              <Text className="text-gray-800">ONIX</Text>
            </Text>
          </View>
          <View className="w-16 h-1 bg-green-500 rounded-full"></View>
        </View>

        {/* Success Content */}
        <View className="flex-1 items-center justify-center">
          {/* Success Icon */}
          <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-8">
            <Ionicons name="checkmark" size={48} color="#10B981" />
          </View>

          {/* Header */}
          <View className="items-center mb-12">
            <Text className="text-2xl font-bold text-gray-800 mb-3">ลงทะเบียน</Text>
            <Text className="text-base text-gray-500 text-center leading-6 px-4">
              ระบบได้ลงทะเบียนเพื่อใช้งาน เพื่อให้บริการ{'\n'}
              ข้อมูลของคุณ
            </Text>
          </View>

          {/* User Info Section */}
          <View className="w-full mb-8">
            <View className="bg-white rounded-xl p-6 shadow-sm" style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}>
              {/* Phone Number */}
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text className="text-base text-gray-700 ml-3">เบอร์โทรศัพท์</Text>
                </View>
                <Text className="text-base text-gray-500">ยืนยันแล้ว</Text>
              </View>

              {/* Name */}
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-5 h-5 border border-gray-300 rounded-full" />
                  <Text className="text-base text-gray-700 ml-3">ชื่อ-นามสกุล</Text>
                </View>
                <Text className="text-base text-gray-400">ยังไม่ได้กรอก</Text>
              </View>

              {/* Email */}
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-5 h-5 border border-gray-300 rounded-full" />
                  <Text className="text-base text-gray-700 ml-3">อีเมล</Text>
                </View>
                <Text className="text-base text-gray-400">ยังไม่ได้กรอก</Text>
              </View>

              {/* ID Card */}
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-5 h-5 border border-gray-300 rounded-full" />
                  <Text className="text-base text-gray-700 ml-3">บัตรประชาชน</Text>
                </View>
                <Text className="text-base text-gray-400">ยังไม่ได้กรอก</Text>
              </View>

              {/* Bank Account */}
              <View className="flex-row items-center justify-between py-3">
                <View className="flex-row items-center">
                  <View className="w-5 h-5 border border-gray-300 rounded-full" />
                  <Text className="text-base text-gray-700 ml-3">บัญชีธนาคาร</Text>
                </View>
                <Text className="text-base text-gray-400">ยังไม่ได้เชื่อมต่อ</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Continue Button */}
        <View className="mt-auto">
          <TouchableOpacity
            className="h-14 rounded-xl items-center justify-center"
            style={{
              backgroundColor: '#3B82F6',
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={handleContinue}
          >
            <Text className="text-base font-semibold text-white">เริ่มใช้งาน</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}