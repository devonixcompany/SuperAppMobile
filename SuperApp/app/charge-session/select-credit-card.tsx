import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View, Alert } from 'react-native';
import { paymentService, type PaymentCard } from '@/services/api/payment.service';

const SelectCreditCardScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract all params
  const resolveParam = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  const transactionId = resolveParam(params.transactionId);
  const returnPath = resolveParam(params.returnPath);

  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  const loadPaymentCards = useCallback(async () => {
    setIsLoadingCards(true);
    try {
      const response = await paymentService.getPaymentCards();
      if (response.success && response.data) {
        setPaymentCards(response.data);
        const defaultCard = response.data.find((card) => card.isDefault);
        setSelectedCard((defaultCard ?? response.data[0])?.id ?? null);
      }
    } catch (error) {
      console.error('Error loading payment cards:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดบัตรชำระเงินได้');
    } finally {
      setIsLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    loadPaymentCards();
  }, [loadPaymentCards]);

  const handleConfirm = () => {
    if (!selectedCard) {
      Alert.alert('กรุณาเลือกบัตร', 'กรุณาเลือกบัตรเครดิต/เดบิตเพื่อดำเนินการต่อ');
      return;
    }

    setIsLoading(true);

    // Navigate back with selected card
    setTimeout(() => {
      setIsLoading(false);

      // Preserve all original params and add selectedCardId
      const { returnPath: _, ...summaryParams } = params;

      // Return to summary page with all original params plus selected card ID
      if (returnPath) {
        router.push({
          pathname: returnPath as any,
          params: {
            ...summaryParams,
            selectedCardId: selectedCard,
          },
        });
      } else {
        router.back();
      }
    }, 500);
  };

  const handleAddNewCard = () => {
    router.push('/(tabs)/card/add-payment-method');
  };

  const getBrandImage = (brand?: string) => {
    if (!brand) return require('../../assets/icons/visa.png');

    const brandLower = brand.toLowerCase();
    if (brandLower.includes('visa')) {
      return require('../../assets/icons/visa.png');
    } else if (brandLower.includes('master')) {
      return require('../../assets/icons/mastercard.png');
    }
    return require('../../assets/icons/visa.png');
  };

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

          {isLoadingCards ? (
            <View className="bg-white rounded-xl p-8 mb-4 items-center justify-center">
              <ActivityIndicator color="#51BC8E" size="large" />
              <Text className="text-gray-500 mt-4">กำลังโหลดบัตร...</Text>
            </View>
          ) : paymentCards.length === 0 ? (
            <View className="bg-white rounded-xl p-8 mb-4 items-center justify-center">
              <Ionicons name="card-outline" size={48} color="#6B7280" />
              <Text className="text-[#1F274B] text-lg font-semibold mt-4">ยังไม่มีบัตร</Text>
              <Text className="text-gray-500 text-center mt-2">กรุณาเพิ่มบัตรเครดิต/เดบิตเพื่อชำระเงิน</Text>
            </View>
          ) : (
            paymentCards.map((card) => (
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
                      source={getBrandImage(card.brand)}
                      className="w-12 h-10"
                      resizeMode="contain"
                    />
                    <View className="ml-2">
                      <Text className="text-lg font-semibold">
                        **** **** **** {card.lastDigits || '****'}
                      </Text>
                      <Text className="text-gray-500">
                        {card.brand?.toUpperCase() || 'บัตร'}
                      </Text>
                    </View>
                  </View>
                  <View className={`w-auto px-4 h-8 rounded-full justify-center items-center ${selectedCard === card.id ? 'bg-[#E8F8F1]' : 'bg-gray-200'}`}>
                    <Text className={`font-semibold ${selectedCard === card.id ? 'text-[#51BC8E]' : 'text-gray-500'}`}>
                      {card.isDefault ? 'บัตรหลัก' : 'บัตรสำรอง'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity
            className="flex-row bg-white rounded-xl py-4 justify-center items-center space-x-2 mt-4"
            onPress={handleAddNewCard}
          >
            <Ionicons name="add-circle-outline" size={24} color="#1F274B" />
            <Text className="text-[#1F274B] text-lg ml-2">เพิ่มบัตรเครดิต/เดบิต</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1 w-full justify-end pb-8 px-6 self-center mt-10 rounded-lg overflow-hidden">
          <TouchableOpacity
            className="w-full max-w-sm self-center mb-10 rounded-lg overflow-hidden"
            onPress={handleConfirm}
            disabled={isLoading || !selectedCard}
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
  );
};

export default SelectCreditCardScreen;
