import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-2xl font-bold text-[#1F2937]">สวัสดี!</Text>
              <Text className="text-base text-[#6B7280] mt-1">ยินดีต้อนรับสู่ SuperApp</Text>
            </View>
            <TouchableOpacity className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm">
              <Ionicons name="notifications-outline" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-[#1F2937] mb-4">การดำเนินการด่วน</Text>
            <View className="flex-row justify-between">
              <TouchableOpacity className="flex-1 mr-2">
                <LinearGradient
                  colors={['#51BC8E', '#3B9F73']}
                  className="rounded-xl p-4 items-center"
                >
                  <Ionicons name="flash" size={32} color="white" />
                  <Text className="text-white font-semibold mt-2">ชาร์จ EV</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-1 ml-2">
                <LinearGradient
                  colors={['#1F274B', '#2D3A5F']}
                  className="rounded-xl p-4 items-center"
                >
                  <Ionicons name="qr-code" size={32} color="white" />
                  <Text className="text-white font-semibold mt-2">สแกน QR</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Balance Card */}
          <View className="mb-6">
            <LinearGradient
              colors={['#1F274B', '#5EC1A0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="rounded-xl p-6"
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white/80 text-sm">ยอดเงินคงเหลือ</Text>
                  <Text className="text-white text-2xl font-bold mt-1">฿ 1,250.00</Text>
                </View>
                <TouchableOpacity className="bg-white/20 rounded-lg px-4 py-2">
                  <Text className="text-white font-semibold">เติมเงิน</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* Recent Activities */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-[#1F2937] mb-4">กิจกรรมล่าสุด</Text>
            <View className="bg-white rounded-xl p-4 shadow-sm">
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="flash" size={20} color="#51BC8E" />
                  </View>
                  <View>
                    <Text className="font-semibold text-[#1F2937]">ชาร์จ EV สำเร็จ</Text>
                    <Text className="text-sm text-[#6B7280]">สถานี Central World</Text>
                  </View>
                </View>
                <Text className="text-sm text-[#6B7280]">-฿ 120.00</Text>
              </View>
              
              <View className="flex-row items-center justify-between py-3">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="add" size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="font-semibold text-[#1F2937]">เติมเงินเข้าบัญชี</Text>
                    <Text className="text-sm text-[#6B7280]">ผ่านบัตรเครดิต</Text>
                  </View>
                </View>
                <Text className="text-sm text-green-600">+฿ 500.00</Text>
              </View>
            </View>
          </View>

          {/* Services Grid */}
          <View>
            <Text className="text-lg font-semibold text-[#1F2937] mb-4">บริการทั้งหมด</Text>
            <View className="flex-row flex-wrap justify-between">
              {[
                { icon: 'car-outline', title: 'จองที่จอด', color: '#3B82F6' },
                { icon: 'map-outline', title: 'แผนที่', color: '#10B981' },
                { icon: 'receipt-outline', title: 'ประวัติ', color: '#F59E0B' },
                { icon: 'help-circle-outline', title: 'ช่วยเหลือ', color: '#EF4444' },
              ].map((service, index) => (
                <TouchableOpacity
                  key={index}
                  className="w-[48%] bg-white rounded-xl p-4 items-center mb-4 shadow-sm"
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mb-2"
                    style={{ backgroundColor: `${service.color}20` }}
                  >
                    <Ionicons name={service.icon as any} size={24} color={service.color} />
                  </View>
                  <Text className="text-sm font-medium text-[#1F2937]">{service.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}