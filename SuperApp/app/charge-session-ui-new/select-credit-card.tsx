import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Stack, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native'

const mockCreditCards = [
  {
    id: '1',
    last4: '4242',
    expiry: '12/05/2025',
    brand: 'visa',
    isDefault: true,
  },
  {
    id: '2',
    last4: '4242',
    expiry: '12/05/2025',
    brand: 'mastercard',
    isDefault: false,
  },
]

const SelectCreditCardScreen = () => {
  const router = useRouter()
  const [selectedCard, setSelectedCard] = useState(mockCreditCards.find(card => card.isDefault)?.id || null)
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      // TODO: Handle the confirmation logic
      console.log('Selected card:', selectedCard)
      router.replace('/(tabs)/home')
    }, 3000)
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "บัตรเครดิต/เดบิต",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#EEF0F6" },
          headerTintColor: "#1F274B",
        }}
      />
      <View className="flex-1 bg-[#EEF0F6] pt-8">
        <View className="px-6">
          <Text className="text-[#1F274B] text-lg font-semibold mb-4">เลือกบัตรเครดิต/เดบิต</Text>
          {mockCreditCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              onPress={() => setSelectedCard(card.id)}
              className={`bg-white rounded-xl p-4 mb-4 border-2 ${
                selectedCard === card.id ? 'border-[#51BC8E]' : 'border-transparent'
              }`}
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center space-x-4">
                  <Image
                    source={card.brand === 'visa' 
                      ? require('../../assets/icons/visa.png') 
                      : require('../../assets/icons/mastercard.png')}
                    className="w-12 h-10"
                    resizeMode="contain"
                  />
                  <View className=' ml-2'>
                    <Text className="text-lg font-semibold">**** **** **** {card.last4}</Text>
                    <Text className="text-gray-500">หมดอายุ {card.expiry}</Text>
                  </View>
                </View>
                <View className={`w-auto px-4 h-8 rounded-full justify-center items-center ${selectedCard === card.id ? 'bg-[#E8F8F1]' : 'bg-gray-200'}`}>
                  <Text className={`font-semibold ${selectedCard === card.id ? 'text-[#51BC8E]' : 'text-gray-500'}`}>
                    {card.isDefault ? 'บัตร' : 'บัตรสำรอง'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity className="flex-row bg-gray-300 py-1 justify-center items-center space-x-2 mt-4">
            <Ionicons name="add-circle-outline" size={24} color="#1F274B" />
            <Text className="text-[#1F274B] text-lg">เพิ่มบัตรเครดิต/เดบิต</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 w-full justify-end pb-8 px-6 self-center mt-10 rounded-lg overflow-hidden">
          <TouchableOpacity
            className="w-full max-w-sm self-center mb-10 rounded-lg overflow-hidden"
            onPress={handleConfirm}
            disabled={isLoading}
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
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-xl font-bold">
                    ยืนยัน
                  </Text>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </>
  )
}

export default SelectCreditCardScreen