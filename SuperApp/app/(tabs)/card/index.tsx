// นำเข้า Ionicons สำหรับแสดงไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
// นำเข้า components พื้นฐานจาก React Native
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
// นำเข้า SafeAreaView เพื่อหลีกเลี่ยงพื้นที่ notch และ status bar
import PointsCard from "@/components/ui/PointsCard";
import { paymentService, type PaymentCard, type PaymentHistoryEntry } from "@/services/api/payment.service";
import { SafeAreaView } from "react-native-safe-area-context";
import { TABS_HORIZONTAL_GUTTER, useAppBarActions } from "../_layout";

// ฟังก์ชันหลักของหน้า Card (บัตรและกระเป๋าเงิน)
export default function CardScreen() {
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance] = useState(1250.00); // Mock balance for now
  const [selectedCard, setSelectedCard] = useState<PaymentCard | null>(null);
  const [isDeducting, setIsDeducting] = useState(false);
  const handleAddPaymentMethod = useCallback(() => {
    router.push("/(tabs)/card/add-payment-method");
  }, []);

  useAppBarActions(
    "card",
    useMemo(
      () => ({
        rightActions: [
          {
            icon: "add-outline",
            onPress: handleAddPaymentMethod,
            backgroundColor: "#F3F4F6",
          },
        ],
      }),
      [handleAddPaymentMethod],
    ),
  );

  // Load data
  const loadData = async () => {
    try {
      const [methodsResponse, historyResponse] = await Promise.all([
        paymentService.getPaymentCards(),
        paymentService.getPaymentHistory()
      ]);

      if (methodsResponse.success && methodsResponse.data) {
        setPaymentCards(methodsResponse.data);
        // Set default selected card (first card or default card)
        const defaultCard = methodsResponse.data.find(card => card.isDefault) || methodsResponse.data[0];
        if (defaultCard) {
          setSelectedCard(defaultCard);
        }
      }

      if (historyResponse.success && historyResponse.data?.payments) {
        // Get only recent 4 transactions
        setRecentPayments(historyResponse.data.payments.slice(0, 4));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Deduct 200 baht from selected card
  const deduct200Baht = async () => {
    if (!selectedCard) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาเลือกบัตรที่ต้องการหักเงิน');
      return;
    }

    setIsDeducting(true);
    try {
      // Create a mock transaction for 200 baht
      const mockTransactionId = `mock_${Date.now()}`;
      
      // Process payment with the selected card
      const result = await paymentService.processPayment({
        transactionId: mockTransactionId,
        cardId: selectedCard.id
      });

      if (result.success) {
        Alert.alert('สำเร็จ', 'หักเงิน 200 บาท สำเร็จ');
        // Refresh data to show updated balance/history
        await loadData();
      } else {
        Alert.alert('ข้อผิดพลาด', result.message || 'ไม่สามารถหักเงินได้');
      }
    } catch (error: any) {
      console.error('Error deducting 200 baht:', error);
      Alert.alert('ข้อผิดพลาด', error.message || 'เกิดข้อผิดพลาดในการหักเงิน');
    } finally {
      setIsDeducting(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  // ข้อมูลธุรกรรมทั้งหมด (ในโปรเจคจริงจะดึงจาก API)
  const transactions = [
    {
      id: 1, // รหัสธุรกรรม
      type: "charge", // ประเภท: การชาร์จ
      title: "ชาร์จ EV - Central World", // รายละเอียด
      date: "15 ม.ค. 2024", // วันที่
      amount: -120.0, // จำนวนเงิน (ติดลบคือจ่ายออก)
      status: "completed", // สถานะ: สำเร็จ
    },
    {
      id: 2,
      type: "topup", // ประเภท: เติมเงิน
      title: "เติมเงินผ่านบัตรเครดิต",
      date: "14 ม.ค. 2024",
      amount: +500.0, // บวกคือรับเข้า
      status: "completed",
    },
    {
      id: 3,
      type: "charge",
      title: "ชาร์จ EV - Siam Paragon",
      date: "12 ม.ค. 2024",
      amount: -85.5,
      status: "completed",
    },
    {
      id: 4,
      type: "refund", // ประเภท: คืนเงิน
      title: "คืนเงิน - ยกเลิกการชาร์จ",
      date: "10 ม.ค. 2024",
      amount: +45.0,
      status: "completed",
    },
  ];

  // ฟังก์ชันคืนค่าไอคอนตามประเภทธุรกรรม
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "charge":
        return "flash"; // ไอคอนฟ้าผ่า: การชาร์จ
      case "topup":
        return "add-circle"; // ไอคอนบวก: เติมเงิน
      case "refund":
        return "return-up-back"; // ไอคอนคืน: คืนเงิน
      default:
        return "card"; // ไอคอนบัตร: อื่นๆ
    }
  };

  // ฟังก์ชันคืนค่าสีตามจำนวนเงิน (บวก=เขียว, ลบ=แดง)
  const getTransactionColor = (amount: number) => {
    return amount > 0 ? "#10B981" : "#EF4444";
  };

  const getBrandImage = (brand?: string) => {
    if (!brand) return require("../../../assets/icons/visa.png");
    const brandLower = brand.toLowerCase();
    if (brandLower.includes("visa")) {
      return require("../../../assets/icons/visa.png");
    } else if (brandLower.includes("master")) {
      return require("../../../assets/icons/mastercard.png");
    }
    return require("../../../assets/icons/visa.png");
  };

  // Format date for payments
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format amount
  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency === 'THB' ? '฿' : currency;
    return `${symbol} ${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center">
        <ActivityIndicator size="large" color="#51BC8E" />
        <Text className="text-[#6B7280] mt-4">กำลังโหลด...</Text>
      </SafeAreaView>
    );
  }

  return (
    // SafeAreaView: ป้องกันเนื้อหาทับกับ notch/status bar
    <SafeAreaView
      className="flex-1 bg-[#F8FAFC] mt-4"
      edges={["left", "right", "bottom"]}
      style={{ paddingHorizontal: TABS_HORIZONTAL_GUTTER }}
    >
      {/* === POINTS CARD SECTION === */}
      <PointsCard
        points={262}
        memberId="000000"
        footerText="หมดอายุ : 30 ก.ย. 2568"
        disabled
      />

      {/* ScrollView: ทำให้เนื้อหาเลื่อนได้ */}
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#51BC8E']}
            tintColor="#51BC8E"
          />
        }
      >
      
          {/* === PAYMENT METHODS SECTION === */}
          {/* แสดงวิธีการชำระเงินที่เชื่อมโยง */}
          <View className="mb-6 ">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-[#1F2937]">
                วิธีการชำระเงิน
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/card/payment-methods')}>
                <Text className="text-[#51BC8E] font-medium">ดูทั้งหมด</Text>
              </TouchableOpacity>
            </View>

            {paymentCards.length > 0 ? (
               paymentCards.slice(0, 2).map((card) => (
                 <TouchableOpacity 
                   key={card.id} 
                   onPress={() => setSelectedCard(card)}
                   className={`bg-white rounded-xl p-4 mb-4 border-2 ${selectedCard?.id === card.id ? 'border-[#51BC8E]' : 'border-transparent'}`}
                 >
                   <View className="flex-row items-center justify-between">
                     <View className="flex-row items-center">
                       {/* Radio button for selection */}
                       <View className="mr-3">
                         <View className={`w-6 h-6 rounded-full border-2 ${selectedCard?.id === card.id ? 'border-[#51BC8E] bg-[#51BC8E]' : 'border-gray-300'} items-center justify-center`}>
                           {selectedCard?.id === card.id && (
                             <Ionicons name="checkmark" size={16} color="white" />
                           )}
                         </View>
                       </View>
                       {/* ไอคอนบัตร */}
                       <View className="items-center justify-center w-12 h-12 mr-3 bg-blue-100 rounded-lg">
                         <Ionicons 
                           name="card" 
                           size={24} 
                           color="#3B82F6"
                         />
                       </View>
                       <View>
                         <Text className="font-semibold text-[#1F2937]">
                           {card.brand?.toUpperCase() ?? 'บัตรเครดิต'}
                         </Text>
                         <Text className="text-gray-500">
                           {card.brand?.toUpperCase() || 'บัตร'}
                         </Text>
                       </View>
                     </View>
                     <View className={`w-auto px-4 h-8 rounded-full justify-center items-center ${selectedCard?.id === card.id ? 'bg-[#E8F8F1]' : 'bg-gray-200'}`}>
                       <Text className={`font-semibold ${selectedCard?.id === card.id ? 'text-[#51BC8E]' : 'text-gray-500'}`}>
                         {card.isDefault ? 'บัตรหลัก' : 'บัตรสำรอง'}
                       </Text>
                     </View>
                   </View>
                 </TouchableOpacity>
               ))
             ) : (
              <View className="items-center p-6 bg-white shadow-sm rounded-xl">
                <Ionicons name="card-outline" size={48} color="#9CA3AF" />
                <Text className="text-[#6B7280] mt-2 mb-4">ยังไม่มีบัตรที่ผูกไว้</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/card/add-payment-method')}
                  className="px-4 py-2 bg-[#51BC8E] rounded-lg"
                >
                  <Text className="font-medium text-white">เพิ่มบัตร</Text>
                </TouchableOpacity>
              </View>
            )}

          {/* ปุ่มหักเงิน 200 บาท */}
          <TouchableOpacity 
            onPress={deduct200Baht}
            disabled={!selectedCard || isDeducting}
            className={`rounded-xl p-4 items-center mb-6 ${
              selectedCard && !isDeducting ? 'bg-red-500' : 'bg-gray-300'
            }`}
          >
            {isDeducting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="cash" size={24} color="white" />
                <Text className="mt-1 font-semibold text-white">หักเงิน 200 บาท</Text>
                {selectedCard && (
                  <Text className="mt-1 text-sm text-white">
                    จากบัตร {selectedCard.brand?.toUpperCase()} ****{selectedCard.lastDigits}
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>

          {/* === RECENT TRANSACTIONS SECTION === */}
          {/* แสดงธุรกรรมล่าสุด */}
          <View className="mb-6">
            {/* หัวข้อและปุ่มดูทั้งหมด */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-[#1F2937]">
                ธุรกรรมล่าสุด
              </Text>
       
            </View>

            {/* กล่องรายการธุรกรรม */}
            <View className="bg-white shadow-sm rounded-xl">
              {recentPayments.length > 0 ? (
                recentPayments.map((payment, index) => {
                  const status = payment.status?.toLowerCase() ?? 'pending';
                  const isSuccess = status === 'success' || status === 'paid';
                  const isFailed = status === 'failed' || status === 'canceled';
                  const statusColorClass = isSuccess
                    ? 'bg-green-100'
                    : isFailed
                      ? 'bg-red-100'
                      : 'bg-yellow-100';
                  const iconName = isSuccess ? 'checkmark' : isFailed ? 'close' : 'time';
                  const iconColor = isSuccess ? '#10B981' : isFailed ? '#EF4444' : '#F59E0B';
                  const amountColor = isSuccess
                    ? 'text-green-600'
                    : isFailed
                      ? 'text-red-600'
                      : 'text-yellow-600';

                  return (
                    <TouchableOpacity
                      key={payment.id}
                      className={`p-4 ${index !== recentPayments.length - 1 ? "border-b border-gray-100" : ""}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                          {/* ไอคอนธุรกรรม */}
                          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${statusColorClass}`}>
                            <Ionicons name={iconName} size={20} color={iconColor} />
                          </View>
                          {/* รายละเอียดธุรกรรม */}
                          <View className="flex-1">
                            <Text className="font-medium text-[#1F2937]">
                              {payment.transaction?.transactionId
                                ? `ธุรกรรม #${payment.transaction.transactionId}`
                                : 'การชำระเงิน'}
                            </Text>
                            <Text className="text-sm text-[#6B7280]">
                              {formatDate(payment.createdAt)}
                            </Text>
                          </View>
                        </View>
                        {/* จำนวนเงินและสถานะ */}
                        <View className="items-end">
                          <Text className={`font-semibold ${amountColor}`}>
                            {formatAmount(payment.amount, payment.currency)}
                          </Text>
                          <Text className="text-[#6B7280] text-xs">
                            {isSuccess ? 'สำเร็จ' : isFailed ? 'ล้มเหลว' : 'รอดำเนินการ'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View className="items-center py-8">
                  <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
                  <Text className="text-[#6B7280] mt-2">ยังไม่มีธุรกรรม</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
