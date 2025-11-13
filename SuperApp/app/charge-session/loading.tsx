import React, { useEffect } from 'react'
import { Text, View, Image } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const LoadingScreen = () => {
  const params = useLocalSearchParams<{
    websocketUrl?: string
    chargePointIdentity?: string
    connectorId?: string
    chargePointName?: string
    stationName?: string
    stationLocation?: string
    powerRating?: string
    chargePointBrand?: string
    protocol?: string
    baseRate?: string
    currency?: string
    pricingTierName?: string
  }>()

  const isConnected = Boolean(params?.websocketUrl)

  useEffect(() => {
    // หากมีข้อมูลครบแล้ว ให้ไปหน้าชาร์จทันที
    if (params?.websocketUrl) {
      // หน่วงเวลาเล็กน้อยเพื่อให้เห็นหน้า loading ตามที่ต้องการ
      const t = setTimeout(() => {
        router.replace({ pathname: '/charge-session', params: { ...params } })
      }, 600)
      return () => clearTimeout(t)
    }
  }, [params])

  return (
    <SafeAreaView className="flex-1 bg-[#F3F6FB]">
      <View className="flex-1">
        {/* ภาพหลัก */}
        <View className="flex-row justify-between items-start px-4 pt-6">
          {/* รถยนต์ - แสดงทั้งคัน ชิดซ้าย */}
          <Image
            source={require('../../assets/images/carloading.png')}
            resizeMode="contain"
            style={{ width: '65%', height: 260 }}
          />

          {/* หัวเครื่องชาร์จ - แสดงเฉพาะเมื่อเชื่อมต่อจริง */}
          {isConnected && (
            <Image
              source={require('../../assets/images/connectorloadfing.png')}
              resizeMode="contain"
              style={{ width: '28%', height: 140 }}
            />
          )}
        </View>

        {/* ข้อความสถานะ */}
        <View className="px-6 pt-8">
          <Text className="text-[#1F274B] text-[18px] font-[700] text-center">รอสักครู่</Text>
          <Text className="text-[#1F274B] text-[13px] font-[300] text-center mt-2">
            กำลังทำการเชื่อมต่อเครื่องชาร์จรถและยานพาหนะ
          </Text>
        </View>

        {/* แถบสถานะโหลด */}
        <View className="px-6 mt-8">
          <View className="h-3 rounded-full bg-[#D8DCE9] overflow-hidden">
            <View className="h-3 rounded-full bg-[#51BC8E]" style={{ width: '40%' }} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default LoadingScreen