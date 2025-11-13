import { LinearGradient } from 'expo-linear-gradient'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Image, Text, View } from 'react-native'
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
  const progress = useRef(new Animated.Value(0)).current
  const [barWidth, setBarWidth] = useState(0)
  const [phase, setPhase] = useState<'init' | 'hold' | 'done'>('init')
  const [minDelayPassed, setMinDelayPassed] = useState(false)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    // เริ่มแอนิเมชัน: เติมถึง ~90% แล้วค่อย ๆ ไปถึง ~97% และค้างรอ
    startTimeRef.current = Date.now()
    Animated.sequence([
      Animated.timing(progress, {
        toValue: 0.9,
        duration: 1800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(progress, {
        toValue: 0.97,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished) setPhase('hold')
    })
  }, [progress])

  // ผ่านขั้นต่ำ 3 วินาที
  useEffect(() => {
    const timer = setTimeout(() => setMinDelayPassed(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  // เมื่อพร้อมเชื่อมต่อ และผ่านขั้นต่ำ 3 วิ ให้เติมเต็มแล้วเปลี่ยนหน้า
  useEffect(() => {
    if (phase === 'hold' && isConnected && minDelayPassed) {
      Animated.timing(progress, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          setPhase('done')
          router.replace({ pathname: '/charge-session', params: { ...params } })
        }
      })
    }
  }, [phase, isConnected, minDelayPassed, params, progress])

  // คำนวณความกว้างที่แสดงผลตาม progress

  const animatedWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, barWidth || 0],
  })

  return (
     <>
      <Stack.Screen
        options={{
          headerShown: true,

          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#EEF0F6" },
          headerTintColor: "#1F274B",
        }}
      />
    <SafeAreaView className="flex-1 bg-[#F3F6FB]">
      <View className="flex-1">
        {/* ภาพหลัก */}
        <View className="flex-row justify-between items-start">
          {/* รถยนต์ - แสดงเฉพาะด้านท้าย (ครอบภาพให้เห็นแค่ตูดรถ) */}
          <View
            className='w-[60%]'
            style={{ height: 240, overflow: 'hidden', position: 'relative' }}
          >
            <Image
              source={require('../../assets/images/carloading.png')}
              resizeMode="cover"              // ขยายและยึดซ้ายเพื่อให้ครอบเฉพาะด้านท้าย
              style={{ position: 'absolute', right: 0, width: '140%', height: '100%' }}
            />
          </View>

          {/* หัวชาร์จ - โชว์เฉพาะเมื่อเชื่อมต่อจริง (websocket มีค่า) */}
          <View className='w-[40%]' style={{ height: 240, justifyContent: 'flex-start', alignItems: 'flex-end' }}>
            {isConnected && (
              <Image
                source={require('../../assets/images/connectorloadfing.png')}
                resizeMode="contain"
                style={{ width: '70%', height: 160 }}
              />
            )}
          </View>
        </View>

        {/* ข้อความสถานะ */}
        <View className="px-6 pt-8">
          <Text className="text-[#1F274B] text-[18px] font-[700] text-center">รอสักครู่</Text>
          <Text className="text-[#1F274B] text-[13px] font-[300] text-center mt-2">
            กำลังทำการเชื่อมต่อเครื่องชาร์จรถ
          </Text>
        </View>

        {/* แถบสถานะโหลด (แอนิเมชัน) */}
        <View className="px-6 mt-8">
          <View
            className="h-3 rounded-full bg-[#D8DCE9] overflow-hidden"
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          >
            <Animated.View style={{ width: animatedWidth, height: '100%' }}>
              <LinearGradient
                colors={["#1F274B", "#51BC8E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, borderRadius: 999 }}
              />
            </Animated.View>
          </View>
        </View>
      </View>
    </SafeAreaView>
        </>
  )
}

export default LoadingScreen