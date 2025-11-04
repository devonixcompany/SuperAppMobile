// นำเข้า Ionicons สำหรับแสดงไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
// นำเข้า LinearGradient สำหรับสร้างพื้นหลังแบบไล่สี
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
// นำเข้า components พื้นฐานจาก React Native
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator, Alert, RefreshControl } from "react-native";
// นำเข้า SafeAreaView เพื่อหลีกเลี่ยงพื้นที่ notch และ status bar
import { SafeAreaView } from "react-native-safe-area-context";
import { paymentService, type PaymentMethod, type PaymentHistory } from "@/services/api/payment.service";

// ฟังก์ชันหลักของหน้า Card (บัตรและกระเป๋าเงิน)
export default function CardScreen() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance] = useState(1250.00); // Mock balance for now

  // Load data
  const loadData = async () => {
    try {
      const [methodsResponse, historyResponse] = await Promise.all([
        paymentService.getPaymentMethods(),
        paymentService.getPaymentHistory()
      ]);

      if (methodsResponse.success && methodsResponse.data) {
        setPaymentMethods(methodsResponse.data);
      }

      if (historyResponse.success && historyResponse.data) {
        // Get only recent 4 transactions
        setRecentPayments(historyResponse.data.slice(0, 4));
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
            onPress={() => router.push('./add-payment-method')}
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
              <TouchableOpacity onPress={() => router.push('./payment-methods')}>
                <Text className="text-[#51BC8E] font-medium">ดูทั้งหมด</Text>
              </TouchableOpacity>
            </View>

            {paymentMethods.length > 0 ? (
               paymentMethods.slice(0, 2).map((method) => (
                 <TouchableOpacity key={method.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                   <View className="flex-row items-center justify-between">
                     <View className="flex-row items-center">
                       {/* ไอคอนบัตร */}
                       <View className="w-12 h-12 bg-blue-100 rounded-lg items-center justify-center mr-3">
                         <Ionicons 
                           name={method.type === 'card' ? 'card' : 'business'} 
                           size={24} 
                           color={method.type === 'card' ? '#3B82F6' : '#10B981'} 
                         />
                       </View>
                       <View>
                         <Text className="font-semibold text-[#1F2937]">
                           {method.type === 'card' ? method.brand?.toUpperCase() : 'บัญชีธนาคาร'}
                         </Text>
                         {/* แสดงเลขบัตรแบบปิดบางส่วน */}
                         <Text className="text-sm text-[#6B7280]">
                           {method.type === 'card' ? `**** **** **** ${method.last_digits}` : method.name}
                         </Text>
                       </View>
                     </View>
                     {/* แสดงว่าเป็นบัตรหลัก */}
                     <View className="flex-row items-center">
                       <View className={`w-2 h-2 rounded-full mr-2 ${method.is_default ? 'bg-green-500' : 'bg-gray-300'}`} />
                       <Text className="text-sm text-[#6B7280]">{method.is_default ? 'หลัก' : ''}</Text>
                     </View>
                   </View>
                 </TouchableOpacity>
               ))
             ) : (
              <View className="bg-white rounded-xl p-6 items-center shadow-sm">
                <Ionicons name="card-outline" size={48} color="#9CA3AF" />
                <Text className="text-[#6B7280] mt-2 mb-4">ยังไม่มีวิธีการชำระเงิน</Text>
                <TouchableOpacity 
                  onPress={() => router.push('./add-payment-method')}
                  className="px-4 py-2 bg-[#51BC8E] rounded-lg"
                >
                  <Text className="text-white font-medium">เพิ่มบัตร</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* === RECENT TRANSACTIONS SECTION === */}
          {/* แสดงธุรกรรมล่าสุด */}
          <View className="mb-6">
            {/* หัวข้อและปุ่มดูทั้งหมด */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-[#1F2937]">
                ธุรกรรมล่าสุด
              </Text>
              <TouchableOpacity onPress={() => router.push('./payment-history')}>
                <Text className="text-sm text-[#51BC8E] font-medium">
                  ดูทั้งหมด
                </Text>
              </TouchableOpacity>
            </View>

            {/* กล่องรายการธุรกรรม */}
            <View className="bg-white rounded-xl shadow-sm">
              {recentPayments.length > 0 ? (
                recentPayments.map((payment, index) => (
                  <TouchableOpacity
                    key={payment.id}
                    className={`p-4 ${index !== recentPayments.length - 1 ? "border-b border-gray-100" : ""}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        {/* ไอคอนธุรกรรม */}
                        <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                          payment.status === 'successful' ? 'bg-green-100' : 
                          payment.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                          <Ionicons
                            name={
                              payment.status === 'successful' ? 'checkmark' : 
                              payment.status === 'failed' ? 'close' : 'time'
                            }
                            size={20}
                            color={
                              payment.status === 'successful' ? '#10B981' : 
                              payment.status === 'failed' ? '#EF4444' : '#F59E0B'
                            }
                          />
                        </View>
                        {/* รายละเอียดธุรกรรม */}
                        <View className="flex-1">
                          <Text className="font-medium text-[#1F2937]">
                            {payment.description || 'การชำระเงิน'}
                          </Text>
                          <Text className="text-sm text-[#6B7280]">
                            {formatDate(payment.created_at)}
                          </Text>
                        </View>
                      </View>
                      {/* จำนวนเงินและสถานะ */}
                      <View className="items-end">
                        <Text
                          className={`font-semibold ${
                            payment.status === 'successful' ? 'text-green-600' : 
                            payment.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                          }`}
                        >
                          {formatAmount(payment.amount, payment.currency)}
                        </Text>
                        <Text className="text-[#6B7280] text-xs">
                          {payment.status === 'successful' ? 'สำเร็จ' : 
                           payment.status === 'failed' ? 'ล้มเหลว' : 'รอดำเนินการ'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View className="items-center py-8">
                  <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
                  <Text className="text-[#6B7280] mt-2">ยังไม่มีธุรกรรม</Text>
                </View>
              )}
            </View>
          </View>

          {/* เพิ่มพื้นที่ด้านล่างเพื่อไม่ให้ถูก tab bar บัง */}
          <View className="h-20" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
