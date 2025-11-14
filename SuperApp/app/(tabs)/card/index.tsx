// นำเข้า Ionicons สำหรับแสดงไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
// นำเข้า LinearGradient สำหรับสร้างพื้นหลังแบบไล่สี
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
// นำเข้า components พื้นฐานจาก React Native
import { ActivityIndicator, Alert, Animated, GestureResponderEvent, Image, Pressable, PressableProps, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
// นำเข้า SafeAreaView เพื่อหลีกเลี่ยงพื้นที่ notch และ status bar
import { paymentService, type PaymentCard, type PaymentHistoryEntry } from "@/services/api/payment.service";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg";
import { usePointCardResponsive } from "@/hooks/usePointCardResponsive";

type TouchableScaleProps = PressableProps & {
  className?: string;
  androidRippleColor?: string;
  children: React.ReactNode;
  activeOpacity?: number;
};

const TouchableScale = ({
  className,
  children,
  androidRippleColor,
  onPressIn,
  onPressOut,
  android_ripple,
  activeOpacity,
  style,
  ...restProps
}: TouchableScaleProps) => {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = (event: GestureResponderEvent) => {
    Animated.spring(pressAnim, {
      toValue: 1,
      speed: 20,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    Animated.spring(pressAnim, {
      toValue: 0,
      speed: 18,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
    onPressOut?.(event);
  };

  const scale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.9],
  });

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });

  const targetOpacity = activeOpacity ?? 0.85;
  const contentOpacity = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, targetOpacity],
  });

  return (
    <Pressable
      {...restProps}
      className={className}
      style={style}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={
        androidRippleColor
          ? { color: androidRippleColor, borderless: false }
          : android_ripple
      }
    >
      <Animated.View
        style={{
          transform: [{ scale }, { translateY }],
          opacity: contentOpacity,
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

const CoinIcon = ({ size = 40 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 33 33" fill="none">
    <G clipPath="url(#clip0_750_7653)">
      <Path
        d="M16.3255 32.6533C24.8414 32.6533 31.7448 25.7498 31.7448 17.234C31.7448 8.71815 24.8414 1.8147 16.3255 1.8147C7.80971 1.8147 0.90625 8.71815 0.90625 17.234C0.90625 25.7498 7.80971 32.6533 16.3255 32.6533Z"
        fill="#F4900C"
      />
      <Path
        d="M16.3255 30.8386C24.8414 30.8386 31.7448 23.9351 31.7448 15.4193C31.7448 6.90346 24.8414 0 16.3255 0C7.80971 0 0.90625 6.90346 0.90625 15.4193C0.90625 23.9351 7.80971 30.8386 16.3255 30.8386Z"
        fill="#FFCC4D"
      />
      <Path
        d="M16.3252 29.0244C23.3382 29.0244 29.0234 23.3392 29.0234 16.3262C29.0234 9.31313 23.3382 3.62793 16.3252 3.62793C9.31215 3.62793 3.62695 16.3262 3.62695 29.0244C3.62695 23.3392 9.31215 29.0244 16.3252 29.0244Z"
        fill="#FFE8B6"
      />
    </G>
    <Defs>
      <ClipPath id="clip0_750_7653">
        <Rect width="32.65" height="32.65" fill="white" transform="translate(0.00390625)" />
      </ClipPath>
    </Defs>
  </Svg>
);

// ฟังก์ชันหลักของหน้า Card (บัตรและกระเป๋าเงิน)
export default function CardScreen() {
  const pointResponsive = usePointCardResponsive();
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
            className="items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm"
          >
            <Ionicons name="add-outline" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>

      {/* === POINTS CARD SECTION === */}
      <View className="mb-5">
        <TouchableScale
          activeOpacity={0.9}
          onPress={() => router.push("/card")}
          style={{ alignSelf: "stretch", marginHorizontal: pointResponsive.cardHorizontalMargin }}
        >
          <LinearGradient
            colors={["#1F274B", "#395F85", "#589FAF", "#67C1A5", "#5EC1A0"]}
            locations={[0, 0.15, 0.45, 0.75, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              minHeight: pointResponsive.cardHeight,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
              paddingHorizontal: pointResponsive.heroPaddingX,
              paddingTop: pointResponsive.heroPaddingTop,
              paddingBottom: pointResponsive.heroPaddingBottom,
              shadowColor: "#0B1E2B",
              shadowOpacity: 0.25,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 12 },
              elevation: 12,
              position: "relative",
            }}
          >
            <View className="flex-row items-start justify-between" style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={require("../../../assets/img/ponix-logo-06.png")}
                  resizeMode="contain"
                  style={{
                    width: pointResponsive.heroLogoWidth,
                    height: pointResponsive.heroLogoHeight,
                    marginRight: 8,
                  }}
                />
                <Text
                  style={{
                    fontSize: pointResponsive.heroTitleFont,
                    fontWeight: "600",
                    color: "#F3F6FF",
                  }}
                >
                  Point
                </Text>
              </View>
            </View>
            <LinearGradient
              colors={["#F3F5FA", "#C9D1E0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                top: pointResponsive.heroBadgeOffsetTop,
                right: pointResponsive.heroBadgeOffsetRight,
                borderRadius: 999,
                paddingHorizontal: pointResponsive.heroBadgePaddingX,
                paddingVertical: pointResponsive.heroBadgePaddingY,
                shadowColor: "#0F172A",
                shadowOpacity: 0.25,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}
            >
              <Text
                style={{
                  fontSize: pointResponsive.heroBadgeFontSize,
                  fontWeight: "600",
                  color: "#1B2344",
                }}
              >
                รหัสสมาชิก 000000
              </Text>
            </LinearGradient>
            <Text
              style={{
                marginTop: pointResponsive.heroSubtitleMarginTop,
                fontSize: pointResponsive.heroSubtitleFont,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              คะแนนของฉัน
            </Text>
            <View
              className="flex-row items-center"
              style={{ marginTop: pointResponsive.heroValueSpacing }}
            >
              <View
                className="items-center justify-center rounded-full bg-white/15"
                style={{
                  width: pointResponsive.heroCoinSize + 15,
                  height: pointResponsive.heroCoinSize + 15,
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              >
                <CoinIcon size={pointResponsive.heroCoinSize - 4} />
              </View>
              <Text
                style={{
                  marginLeft: pointResponsive.heroCoinGap,
                  fontSize: pointResponsive.heroPointFontSize,
                  fontWeight: "800",
                  color: "#FFFFFF",
                }}
              >
                262 P
              </Text>
            </View>
            <View
              style={{
                height: 1,
                backgroundColor: "rgba(255,255,255,0.35)",
                marginTop: pointResponsive.heroDividerSpacingTop,
                marginBottom: pointResponsive.heroDividerSpacingBottom,
              }}
            />
            <Text
              style={{
                fontSize: pointResponsive.heroExpiryFont,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              หมดอายุ : 30 ก.ย. 2568
            </Text>
          </LinearGradient>
        </TouchableScale>
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
        <View style={{ paddingHorizontal: pointResponsive.cardHorizontalMargin }}>
          {/* === BALANCE CARD SECTION === */}
          {/* การ์ดแสดงยอดเงินคงเหลือ */}
       
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
                  className="items-center p-4 bg-white shadow-sm rounded-xl"
                  style={{ width: "22%" }}
                >
                  {/* วงกลมไอคอน */}
                  <View
                    className="items-center justify-center w-12 h-12 mb-2 rounded-full"
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
              <TouchableOpacity onPress={() => router.push('/(tabs)/card/payment-history')}>
                <Text className="text-sm text-[#51BC8E] font-medium">
                  ดูทั้งหมด
                </Text>
              </TouchableOpacity>
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
