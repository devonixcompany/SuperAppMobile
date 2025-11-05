import { paymentService, type PaymentCard } from "@/services/api/payment.service";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentMethodsScreen() {
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load payment cards
  const loadPaymentCards = async () => {
    try {
      const response = await paymentService.getPaymentCards();
      if (response.success && response.data) {
        setPaymentCards(response.data);
      }
    } catch (error) {
      console.error('Error loading payment cards:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดบัตรชำระเงินได้');
    } finally {
      setLoading(false);
    }
  };

  // Refresh payment cards
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPaymentCards();
    setRefreshing(false);
  };

  // Remove payment card
  const removePaymentCard = async (cardId: string) => {
    Alert.alert(
      'ยืนยันการลบ',
      'คุณต้องการลบบัตรนี้หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await paymentService.removePaymentCard(cardId);
              if (response.success) {
                Alert.alert('สำเร็จ', 'ลบบัตรเรียบร้อยแล้ว');
                loadPaymentCards();
              }
            } catch (error) {
              console.error('Error removing payment card:', error);
              Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบบัตรได้');
            }
          },
        },
      ]
    );
  };

  const setDefaultCard = async (cardId: string) => {
    try {
      const response = await paymentService.setDefaultCard(cardId);
      if (response.success) {
        Alert.alert('สำเร็จ', 'ตั้งบัตรหลักเรียบร้อยแล้ว');
        loadPaymentCards();
      }
    } catch (error) {
      console.error('Error setting default card:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถตั้งบัตรหลักได้');
    }
  };

  // Get payment card icon
  const getPaymentCardIcon = (brand?: string | null) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return 'card';
      case 'mastercard':
        return 'card';
      case 'amex':
        return 'card';
      default:
        return 'card';
    }
  };

  // Get payment card accent color
  const getPaymentCardColor = (brand?: string | null) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '#1A1F71';
      case 'mastercard':
        return '#EB001B';
      case 'amex':
        return '#006FCF';
      default:
        return '#3B82F6';
    }
  };

  useEffect(() => {
    loadPaymentCards();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center">
        <ActivityIndicator size="large" color="#51BC8E" />
        <Text className="text-[#6B7280] mt-4">กำลังโหลด...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-[#1F2937]">
              วิธีการชำระเงิน
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/card/add-payment-method')}
            className="w-10 h-10 rounded-full bg-[#51BC8E] items-center justify-center shadow-sm"
          >
            <Ionicons name="add-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-6">
          {paymentCards.length === 0 ? (
            // Empty state
            <View className="items-center justify-center py-20">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="card-outline" size={40} color="#9CA3AF" />
              </View>
              <Text className="text-lg font-semibold text-[#1F2937] mb-2">
                ยังไม่มีบัตรชำระเงิน
              </Text>
              <Text className="text-[#6B7280] text-center mb-6">
                เพิ่มบัตรเครดิตเพื่อชำระค่าชาร์จได้สะดวก
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/card/add-payment-method')}
                className="bg-[#51BC8E] rounded-lg px-6 py-3"
              >
                <Text className="text-white font-semibold">
                  เพิ่มบัตรเครดิต
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Payment methods list
            <View className="space-y-3">
              {paymentCards.map((card) => (
                <View
                  key={card.id}
                  className="bg-white rounded-xl p-4 shadow-sm mb-6"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      {/* Payment method icon */}
                      <View
                        className="w-12 h-12 rounded-lg items-center justify-center mr-3"
                        style={{
                          backgroundColor: `${getPaymentCardColor(card.brand)}20`,
                        }}
                      >
                        <Ionicons
                          name={getPaymentCardIcon(card.brand) as any}
                          size={24}
                          color={getPaymentCardColor(card.brand)}
                        />
                      </View>

                      {/* Payment method details */}
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className="font-semibold text-[#1F2937]">
                            บัตรเครดิต
                          </Text>
                          {card.isDefault && (
                            <View className="ml-2 bg-[#51BC8E] rounded-full px-2 py-1">
                              <Text className="text-white text-xs font-medium">
                                หลัก
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-sm text-[#6B7280]">
                          {card.lastDigits
                            ? `**** **** **** ${card.lastDigits}`
                            : 'ไม่มีหมายเลขปลายทาง'}
                        </Text>
                        {card.brand && (
                          <Text className="text-xs text-[#9CA3AF] capitalize">
                            {card.brand}
                          </Text>
                        )}
                        {(card.expirationMonth || card.expirationYear) && (
                          <Text className="text-xs text-[#9CA3AF] mt-1">
                            หมดอายุ:{" "}
                            {card.expirationMonth?.toString().padStart(2, "0") ?? "--"}/
                            {card.expirationYear ?? "----"}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Actions */}
                    <View className="flex-row items-center">
                      {!card.isDefault && (
                        <TouchableOpacity
                          onPress={() => setDefaultCard(card.id)}
                          className="w-8 h-8 items-center justify-center mr-2"
                        >
                          <Ionicons name="star-outline" size={20} color="#F59E0B" />
                        </TouchableOpacity>
                      )}
                      {!card.isDefault && (
                        <TouchableOpacity
                          onPress={() => removePaymentCard(card.id)}
                          className="w-8 h-8 items-center justify-center"
                        >
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Add space at bottom */}
          <View className="h-20" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
