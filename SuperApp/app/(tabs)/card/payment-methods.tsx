import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { paymentService, type PaymentMethod } from "@/services/api/payment.service";

export default function PaymentMethodsScreen() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load payment methods
  const loadPaymentMethods = async () => {
    try {
      const response = await paymentService.getPaymentMethods();
      if (response.success && response.data) {
        setPaymentMethods(response.data);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดวิธีการชำระเงินได้');
    } finally {
      setLoading(false);
    }
  };

  // Refresh payment methods
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPaymentMethods();
    setRefreshing(false);
  };

  // Remove payment method
  const removePaymentMethod = async (methodId: string) => {
    Alert.alert(
      'ยืนยันการลบ',
      'คุณต้องการลบวิธีการชำระเงินนี้หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await paymentService.removePaymentMethod(methodId);
              if (response.success) {
                Alert.alert('สำเร็จ', 'ลบวิธีการชำระเงินเรียบร้อยแล้ว');
                loadPaymentMethods();
              }
            } catch (error) {
              console.error('Error removing payment method:', error);
              Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบวิธีการชำระเงินได้');
            }
          },
        },
      ]
    );
  };

  // Get payment method icon
  const getPaymentMethodIcon = (type: string, brand?: string) => {
    if (type === 'card') {
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
    }
    return 'business';
  };

  // Get payment method color
  const getPaymentMethodColor = (type: string, brand?: string) => {
    if (type === 'card') {
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
    }
    return '#10B981';
  };

  useEffect(() => {
    loadPaymentMethods();
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
            onPress={() => router.push('/card/add-payment-method')}
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
          {paymentMethods.length === 0 ? (
            // Empty state
            <View className="items-center justify-center py-20">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="card-outline" size={40} color="#9CA3AF" />
              </View>
              <Text className="text-lg font-semibold text-[#1F2937] mb-2">
                ยังไม่มีวิธีการชำระเงิน
              </Text>
              <Text className="text-[#6B7280] text-center mb-6">
                เพิ่มบัตรเครดิตหรือบัญชีธนาคาร{'\n'}เพื่อชำระเงินได้อย่างสะดวก
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/card/add-payment-method')}
                className="bg-[#51BC8E] rounded-lg px-6 py-3"
              >
                <Text className="text-white font-semibold">
                  เพิ่มวิธีการชำระเงิน
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Payment methods list
            <View className="space-y-3">
              {paymentMethods.map((method, index) => (
                <View
                  key={method.id}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      {/* Payment method icon */}
                      <View
                        className="w-12 h-12 rounded-lg items-center justify-center mr-3"
                        style={{
                          backgroundColor: `${getPaymentMethodColor(method.type, method.brand)}20`,
                        }}
                      >
                        <Ionicons
                          name={getPaymentMethodIcon(method.type, method.brand) as any}
                          size={24}
                          color={getPaymentMethodColor(method.type, method.brand)}
                        />
                      </View>

                      {/* Payment method details */}
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className="font-semibold text-[#1F2937]">
                            {method.type === 'card' ? 'บัตรเครดิต' : 'บัญชีธนาคาร'}
                          </Text>
                          {method.is_default && (
                            <View className="ml-2 bg-[#51BC8E] rounded-full px-2 py-1">
                              <Text className="text-white text-xs font-medium">
                                หลัก
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-sm text-[#6B7280]">
                          {method.type === 'card' && method.last_digits
                            ? `**** **** **** ${method.last_digits}`
                            : method.name || 'ไม่ระบุชื่อ'}
                        </Text>
                        {method.type === 'card' && method.brand && (
                          <Text className="text-xs text-[#9CA3AF] capitalize">
                            {method.brand}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Actions */}
                    <View className="flex-row items-center">
                      {!method.is_default && (
                        <TouchableOpacity
                          onPress={() => removePaymentMethod(method.id)}
                          className="w-8 h-8 items-center justify-center"
                        >
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity className="w-8 h-8 items-center justify-center ml-2">
                        <Ionicons
                          name="chevron-forward-outline"
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
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