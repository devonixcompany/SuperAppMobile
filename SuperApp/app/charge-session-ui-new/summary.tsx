import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

const summary = () => {
  const router = useRouter()
  const local = useLocalSearchParams()

  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleStartCharging = () => {
    if (paymentMethod === 'credit_card') {
      router.push('/charge-session-ui-new/select-credit-card');
    } else if (paymentMethod === 'paotang') {
      router.push('/charge-session-ui-new/wallet');
    } else {
      router.push({
        pathname: '/charge-session-ui-new/summary',
        params: {
        transactionId: '12345',
        energy: '30',
        cost: '100',
        durationSeconds: '4800',
        startTime: '2024-07-29T10:50:00Z',
        endTime: '2024-07-29T12:10:00Z',
        meterStart: '1000',
        meterStop: '1030',
        stopReason: 'Remote',
        connectorId: '1',
        chargePointIdentity: 'CP001',
        chargePointName: 'สเตชั่น สาขาบางเขน',
        currency: 'THB',
        rate: '3.20',
      },
    });
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "ข้อมูลการชาร์จ",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#EEF0F6" },
          headerTintColor: "#1F274B",
        }}
      />
      {/* Use SafeAreaView to avoid OS UI */}
      <View className="flex-1 bg-[#EEF0F6] pt-12">
        <View className="flex-col gap-6 px-10">
          <View className="flex-row">
            <Text className="text-[#1F274B] text-lg font-[300]">รายละเอียด</Text>
          </View>
          <View className="flex-row">
            <Text className="text-[#1F274B] text-lg font-[600]">สเตชั่น สาขาบางเขน</Text>
          </View>
          <View className="flex-row">
            <Text className="text-[#1F274B] text-lg font-[300]">19 เมษายน 2568 10.50 น</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[#1F274B] text-lg font-[300]">เวลาการชาร์จ</Text>
            <Text className="text-[#1F274B] text-lg font-[300]">01:20:00 น.</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[#1F274B] text-lg font-[300]">พลังงาน</Text>
            <Text className="text-[#1F274B] text-lg font-[300]">30 kw</Text>
          </View>

          <View className="flex-row">
            <Text className="text-[#1F274B] text-lg font-[600]">ค่าบริการ</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[#1F274B] text-lg font-[300]">ค่าบริการชาร์จ</Text>
            <Text className="text-[#1F274B] text-lg font-[300]">96.00 บาท</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[#1F274B] text-lg font-[300]">VAT</Text>
            <Text className="text-[#1F274B] text-lg font-[300]">4 บาท</Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-[#1F274B] text-lg font-[300]">ค่าบริการรวม</Text>
            <Text className="text-[#1F274B] text-lg font-[300]">100 บาท</Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-[#1F274B] text-lg font-[300]">ยอดที่ต้องชำระ</Text>
            <Text className="text-[#51BC8E] font-[300] text-lg ">100 บาท</Text>
          </View>
        </View>

        <View className="px-14 mt-8">
          <Text className="text-[#1F274B] text-lg font-[300] mb-2">ช่องทางการชำระเงิน</Text>
          {/* Payment Method Dropdown */}
          <View className="bg-white p-4 rounded-lg w-full">
            <TouchableOpacity
              onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex-row justify-between items-center"
            >
              <View className="flex-row items-center space-x-4">
                <Text>{paymentMethod === 'paotang' ? 'เป๋าตัง' : 'บัตรเครดิต'}</Text>
              </View>
              <Ionicons name={isDropdownOpen ? 'chevron-up' : 'chevron-down'} size={24} color="black" />
            </TouchableOpacity>
            {isDropdownOpen && (
              <View className="mt-4 pt-4 border-t border-gray-200">
                <TouchableOpacity
                  onPress={() => {
                    setPaymentMethod('paotang');
                    setIsDropdownOpen(false);
                  }}
                  className="flex-row items-center space-x-4 p-4 border-b border-gray-100"
                >
                  <Text>เป๋าตัง</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setPaymentMethod('credit_card');
                    setIsDropdownOpen(false);
                  }}
                  className="flex-row items-center space-x-4 p-4"
                >
                  <Text>บัตรเครดิต</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

    {/* Action Button: Start Charging */}
          <TouchableOpacity
            className="w-full max-w-sm self-center bg-white text-[#51BC8E] mt-10 rounded-lg overflow-hidden"
            onPress={handleStartCharging}
          >
            
              <View className="bg-transparent p-4 items-center justify-center">
                <Text className="text-xl text-[#51BC8E] font-bold">
                  กลับหน้าหลัก
                </Text>
              </View>
  
          </TouchableOpacity>
           {/* Action Button: Start Charging */}
          <TouchableOpacity
            className="w-full max-w-sm self-center mt-4 rounded-lg overflow-hidden"
            onPress={handleStartCharging}
          >
            <LinearGradient
              colors={[
                "#5EC1A0",
                "#67C1A5",
                "#589FAF",
                "#395F85",
                "#1F274B",
              ]}
              start={{ x: 1, y: 0.5 }}
              end={{ x: 0, y: 0.5 }}
            >
              <View className="bg-transparent p-4 items-center justify-center">
                <Text className="text-white text-xl font-bold">
                  ชำระเงิน
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
      </View>
    </>
  )
}

export default summary