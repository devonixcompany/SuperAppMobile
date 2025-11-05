// นำเข้า Ionicons สำหรับแสดงไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
// นำเข้า LinearGradient สำหรับสร้างพื้นหลังแบบไล่สี
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
// นำเข้า components พื้นฐานจาก React Native
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
// นำเข้า SafeAreaView เพื่อหลีกเลี่ยงพื้นที่ notch และ status bar
import { paymentService, type PaymentCard, type PaymentHistoryEntry } from "@/services/api/payment.service";
import { SafeAreaView } from "react-native-safe-area-context";

// ฟังก์ชันหลักของหน้า Card (บัตรและกระเป๋าเงิน)
export default function CardScreen() {
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance] = useState(1250.00); // Mock balance for now
  const [selectedCard, setSelectedCard] = useState<PaymentCard | null>(null);
  const [isDeducting, setIsDeducting] = useState(false);

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
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* === HEADER SECTION === */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-[#1F2937]">
            บัตรและกระเป๋าเงิน
          </Text>
          {/* ปุ่มเพิ่ม (เพิ่มบัตรใหม่) */}
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/card/add-payment-method')}
            className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm"
          >
            <Ionicons name="add-outline" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>

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
        <View className="px-6">
          {/* === BALANCE CARD SECTION === */}
          {/* การ์ดแสดงยอดเงินคงเหลือ */}
          <View className="mb-6">
            {/* พื้นหลังไล่สีจากน้ำเงินเข้มไปเขียว */}
            <LinearGradient
              colors={["#1F274B", "#5EC1A0"]}
              start={{ x: 0, y: 0 }} // เริ่มต้นซ้าย
              end={{ x: 1, y: 0 }} // สิ้นสุดขวา
              className="rounded-xl p-6"
            >
              {/* แสดงยอดเงิน */}
              <View className="mb-4">
                <Text className="text-white/80 text-sm">ยอดเงินคงเหลือ</Text>
                <Text className="text-white text-3xl font-bold mt-1">
                  ฿{balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              {/* ปุ่มเติมเงินและโอนเงิน */}
              <View className="flex-row justify-between">
                {/* ปุ่มเติมเงิน: ขยายเต็มพื้นที่ 1 ส่วน */}
                <TouchableOpacity className="bg-white/20 rounded-lg px-6 py-3 flex-1 mr-2">
                  <Text className="text-white font-semibold text-center">
                    เติมเงิน
                  </Text>
                </TouchableOpacity>
                {/* ปุ่มโอนเงิน: ขยายเต็มพื้นที่ 1 ส่วน */}
                <TouchableOpacity className="bg-white/20 rounded-lg px-6 py-3 flex-1 ml-2">
                  <Text className="text-white font-semibold text-center">
                    โอนเงิน
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* === QUICK ACTIONS SECTION === */}
          {/* ปุ่มด่วนสำหรับการดำเนินการต่างๆ */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-[#1F2937] mb-4">
              การดำเนินการ
            </Text>
            <View className="flex-row justify-between">
              {/* Array ของ actions ทั้งหมด */}
              {[
                { icon: "card-outline", title: "จัดการบัตร", color: "#3B82F6" },
                { icon: "receipt-outline", title: "ประวัติ", color: "#10B981" },
                { icon: "gift-outline", title: "โปรโมชั่น", color: "#F59E0B" },
                {
                  icon: "settings-outline",
                  title: "ตั้งค่า",
                  color: "#6B7280",
                },
              ].map((action, index) => (
                // วนลูปสร้างปุ่มแต่ละอัน
                // กว้าง 22% (4 อันต่อแถว)
                <TouchableOpacity
                  key={index}
                  className="bg-white rounded-xl p-4 items-center shadow-sm"
                  style={{ width: "22%" }}
                >
                  {/* วงกลมไอคอน */}
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mb-2"
                    style={{ backgroundColor: `${action.color}20` }}
                  >
                    <Ionicons
                      name={action.icon as any}
                      size={24}
                      color={action.color}
                    />
                  </View>
                  {/* ชื่อ action */}
                  <Text className="text-xs font-medium text-[#1F2937] text-center">
                    {action.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* === PAYMENT METHODS SECTION === */}
          {/* แสดงวิธีการชำระเงินที่เชื่อมโยง */}
          <View className="mb-6">
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
                   className={`bg-white rounded-xl p-4 mb-3 shadow-sm ${selectedCard?.id === card.id ? 'border-2 border-[#51BC8E]' : ''}`}
                   onPress={() => setSelectedCard(card)}
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
                       <View className="w-12 h-12 bg-blue-100 rounded-lg items-center justify-center mr-3">
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
                         {/* แสดงเลขบัตรแบบปิดบางส่วน */}
                         <Text className="text-sm text-[#6B7280]">
                           {card.lastDigits ? `**** **** **** ${card.lastDigits}` : 'ไม่มีข้อมูลหมายเลข'}
                         </Text>
                       </View>
                     </View>
                     {/* แสดงว่าเป็นบัตรหลัก */}
                     <View className="flex-row items-center">
                       <View className={`w-2 h-2 rounded-full mr-2 ${card.isDefault ? 'bg-green-500' : 'bg-gray-300'}`} />
                       <Text className="text-sm text-[#6B7280]">{card.isDefault ? 'หลัก' : ''}</Text>
                     </View>
                   </View>
                 </TouchableOpacity>
               ))
             ) : (
              <View className="bg-white rounded-xl p-6 items-center shadow-sm">
                <Ionicons name="card-outline" size={48} color="#9CA3AF" />
                <Text className="text-[#6B7280] mt-2 mb-4">ยังไม่มีบัตรที่ผูกไว้</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/card/add-payment-method')}
                  className="px-4 py-2 bg-[#51BC8E] rounded-lg"
                >
                  <Text className="text-white font-medium">เพิ่มบัตร</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

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
                <Text className="text-white font-semibold mt-1">หักเงิน 200 บาท</Text>
                {selectedCard && (
                  <Text className="text-white text-sm mt-1">
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
              <TouchableOpacity onPress={() => router.push('/(tabs)/card/payment-history')}>
                <Text className="text-sm text-[#51BC8E] font-medium">
                  ดูทั้งหมด
                </Text>
              </TouchableOpacity>
            </View>

            {/* กล่องรายการธุรกรรม */}
            <View className="bg-white rounded-xl shadow-sm">
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
