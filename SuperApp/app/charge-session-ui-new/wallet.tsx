import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

const WalletScreen = () => {
  const router = useRouter();

  const handleConfirm = () => {
    Alert.alert('แจ้งเตือน', 'ระบบจ่ายเงินนี้ยังไม่พร้อมใช้งาน');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'PONIX Wallet',
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#EEF0F6' },
          headerTintColor: '#1F274B',
        }}
      />
      <View className="flex-1 bg-[#EEF0F6] pt-8">
        <View className="px-6">
          <Text className="text-[#1F274B] text-lg font-semibold mb-4">เลือกกระเป๋าเงิน</Text>
          <View className="bg-white rounded-xl p-4 mb-4 border-2 border-[#51BC8E]">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center space-x-4">
                <Ionicons name="wallet-outline" size={40} color="#1F274B" />
                <View className=' ml-4'>
                  <Text className="text-lg font-semibold">P202501</Text>
                  <Text className="text-gray-500">ยอดคงเหลือ (บาท)</Text>
                </View>
              </View>
              <Text className="text-lg font-bold">500.00</Text>
            </View>
          </View>
        </View>
        <View className="flex-1 w-full justify-end pb-8 px-6 self-center mt-10 rounded-lg overflow-hidden">
          <TouchableOpacity
            className="w-full max-w-sm self-center mb-10 rounded-lg overflow-hidden"
            onPress={handleConfirm}
          >
            <LinearGradient
              colors={['#5EC1A0', '#67C1A5', '#589FAF', '#395F85', '#1F274B']}
              start={{ x: 1, y: 0.5 }}
              end={{ x: 0, y: 0.5 }}
            >
              <View className="bg-transparent p-4 items-center justify-center">
                <Text className="text-white text-xl font-bold">ยืนยัน</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default WalletScreen;