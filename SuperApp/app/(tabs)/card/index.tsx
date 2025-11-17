// นำเข้า Ionicons สำหรับแสดงไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
// นำเข้า LinearGradient สำหรับสร้างพื้นหลังแบบไล่สี
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
// นำเข้า components พื้นฐานจาก React Native
import { ActivityIndicator, Alert, Animated, GestureResponderEvent, Image, Pressable, PressableProps, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
// นำเข้า SafeAreaView เพื่อหลีกเลี่ยงพื้นที่ notch และ status bar
import { usePointCardResponsive } from "@/hooks/usePointCardResponsive";
import { paymentService, type PaymentCard, type PaymentHistoryEntry } from "@/services/api/payment.service";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg";
import { TABS_HORIZONTAL_GUTTER } from "../_layout";

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
        d="M16.3252 29.0244C23.3382 29.0244 29.0234 23.3392 29.0234 16.3262C29.0234 9.31313 23.3382 3.62793 16.3252 3.62793C9.31215 3.62793 3.62695 9.31313 3.62695 16.3262C3.62695 23.3392 9.31215 29.0244 16.3252 29.0244Z"
        fill="#FFE8B6"
      />
      <Path
        d="M16.3252 28.1171C23.3382 28.1171 29.0234 22.4319 29.0234 15.4188C29.0234 8.40578 23.3382 2.72058 16.3252 2.72058C9.31215 2.72058 3.62695 8.40578 3.62695 15.4188C3.62695 22.4319 9.31215 28.1171 16.3252 28.1171Z"
        fill="#FFAC33"
      />
      <Path
        d="M8.65625 9.84721C8.65625 9.35289 9.1415 9.15516 9.1415 9.15516L16.287 5.79919L23.5005 9.15516C23.5005 9.15516 23.9975 9.26582 23.9975 9.85084V10.4322H8.65625V9.84721Z"
        fill="#FFE8B6"
      />
      <Path
        d="M23.5184 11.6424C23.5184 11.1127 23.0603 10.6837 22.4962 10.6837H10.0945C9.52944 10.6837 9.13579 11.1127 9.13579 11.6424C9.13579 12.0025 9.32083 12.3127 9.61561 12.4769V13.081H11.533V12.6012H13.4505V13.081H15.3679V12.6012H17.2853V13.081H19.2028V12.6012H21.1202V13.081H23.0386V12.4524C23.3261 12.2819 23.5184 11.9835 23.5184 11.6424ZM24.956 21.7684C24.956 21.9591 24.8802 22.1421 24.7453 22.277C24.6104 22.4119 24.4275 22.4876 24.2367 22.4876H8.41653C8.22577 22.4876 8.04282 22.4119 7.90793 22.277C7.77305 22.1421 7.69727 21.9591 7.69727 21.7684C7.69727 21.5776 7.77305 21.3947 7.90793 21.2598C8.04282 21.1249 8.22577 21.0491 8.41653 21.0491H24.2376C24.634 21.0491 24.956 21.3711 24.956 21.7684Z"
        fill="#F4900C"
      />
      <Path
        d="M23.9972 11.065C23.9969 11.1922 23.9463 11.3141 23.8564 11.404C23.7665 11.494 23.6446 11.5446 23.5174 11.5448H9.1348C9.01264 11.5373 8.89795 11.4835 8.81411 11.3943C8.73027 11.3052 8.68359 11.1874 8.68359 11.065C8.68359 10.9426 8.73027 10.8249 8.81411 10.7357C8.89795 10.6465 9.01264 10.5927 9.1348 10.5852L23.5174 10.5879C23.5802 10.5877 23.6425 10.5998 23.7006 10.6237C23.7588 10.6476 23.8117 10.6827 23.8562 10.727C23.9008 10.7713 23.9362 10.8239 23.9604 10.882C23.9846 10.94 23.9971 11.0022 23.9972 11.065ZM11.0531 11.6219H21.6008V12.6976H11.0531V11.6219Z"
        fill="#F4900C"
      />
      <Path
        d="M11.5316 18.8925C11.5316 19.4222 11.245 19.8512 10.8922 19.8512H10.2527C9.8999 19.8512 9.61328 19.4222 9.61328 18.8925V11.6236C9.61328 11.0939 9.8999 10.6649 10.2527 10.6649H10.8922C11.245 10.6649 11.5316 11.0939 11.5316 11.6236V18.8925ZM23.038 18.8925C23.038 19.4222 22.7523 19.8512 22.3986 19.8512H21.7592C21.4063 19.8512 21.1197 19.4222 21.1197 18.8925V11.6236C21.1197 11.0939 21.4054 10.6649 21.7592 10.6649H22.3986C22.7514 10.6649 23.038 11.0939 23.038 11.6236V18.8925ZM15.3674 18.8925C15.3674 19.4222 15.0808 19.8512 14.728 19.8512H14.0885C13.7357 19.8512 13.4491 19.4222 13.4491 18.8925V11.6236C13.4491 11.0939 13.7357 10.6649 14.0885 10.6649H14.728C15.0808 10.6649 15.3674 11.0939 15.3674 11.6236V18.8925ZM19.2023 18.8925C19.2023 19.4222 18.9157 19.8512 18.5628 19.8512H17.9243C17.5715 19.8512 17.2848 19.4222 17.2848 18.8925V11.6236C17.2848 11.0939 17.5715 10.6649 17.9243 10.6649H18.5628C18.9157 10.6649 19.2023 11.0939 19.2023 11.6236V18.8925Z"
        fill="#FFD983"
      />
      <Path
        d="M23.5173 19.3707C23.5173 19.9004 23.0883 20.3294 22.5586 20.3294H10.0935C9.83922 20.3294 9.59536 20.2284 9.41557 20.0486C9.23577 19.8688 9.13477 19.625 9.13477 19.3707C9.13477 19.1164 9.23577 18.8726 9.41557 18.6928C9.59536 18.513 9.83922 18.412 10.0935 18.412H22.5586C23.0874 18.412 23.5173 18.841 23.5173 19.3707Z"
        fill="#FFCC4D"
      />
      <Path
        d="M24.4767 20.3303C24.4767 20.86 24.0477 21.289 23.518 21.289H9.1345C8.88023 21.289 8.63638 21.188 8.45658 21.0082C8.27679 20.8284 8.17578 20.5846 8.17578 20.3303C8.17578 20.076 8.27679 19.8322 8.45658 19.6524C8.63638 19.4726 8.88023 19.3716 9.1345 19.3716H23.5171C24.0468 19.3716 24.4767 19.8006 24.4767 20.3303Z"
        fill="#FFD983"
      />
      <Path
        d="M24.956 21.0489C24.956 21.2396 24.8802 21.4226 24.7453 21.5575C24.6104 21.6923 24.4275 21.7681 24.2367 21.7681H8.41653C8.32208 21.7681 8.22854 21.7495 8.14128 21.7134C8.05401 21.6772 7.97472 21.6242 7.90793 21.5575C7.84114 21.4907 7.78816 21.4114 7.75202 21.3241C7.71587 21.2368 7.69727 21.1433 7.69727 21.0489C7.69727 20.9544 7.71587 20.8609 7.75202 20.7736C7.78816 20.6863 7.84114 20.607 7.90793 20.5403C7.97472 20.4735 8.05401 20.4205 8.14128 20.3843C8.22854 20.3482 8.32208 20.3296 8.41653 20.3296H24.2376C24.634 20.3296 24.956 20.6516 24.956 21.0489Z"
        fill="#FFD983"
      />
      <Path
        d="M23.5173 11.1438C23.5173 10.6141 23.0593 10.1851 22.4951 10.1851H10.0935C9.52841 10.1851 9.13477 10.6141 9.13477 11.1438C9.13477 11.5039 9.3198 11.8141 9.61458 11.9782V12.5823H11.532V12.1025H13.4494V12.5823H15.3669V12.1025H17.2843V12.5823H19.2018V12.1025H21.1192V12.5823H23.0375V11.9537C23.3251 11.7832 23.5173 11.4848 23.5173 11.1438Z"
        fill="#FFCC4D"
      />
      <Path
        d="M8.65625 10.3965C8.65625 9.90221 9.1415 9.70448 9.1415 9.70448L16.287 6.34851L23.5005 9.70448C23.5005 9.70448 23.9975 9.81513 23.9975 10.4002V10.6641H8.65625V10.3965Z"
        fill="#FFD983"
      />
      <Path
        d="M16.3253 7.5675C16.3253 7.5675 11.3775 9.89945 10.8841 10.1099C10.3897 10.3194 10.5548 10.6641 10.885 10.6641H21.742C22.2517 10.6641 22.1311 10.275 21.7266 10.0645C21.322 9.855 16.3253 7.5675 16.3253 7.5675Z"
        fill="#FFAC33"
      />
      <Path
        d="M23.9972 10.6635C23.9969 10.7907 23.9463 10.9126 23.8564 11.0025C23.7665 11.0925 23.6446 11.1431 23.5174 11.1433H9.1348C9.01264 11.1358 8.89795 11.082 8.81411 10.9928C8.73027 10.9037 8.68359 10.7859 8.68359 10.6635C8.68359 10.5411 8.73027 10.4234 8.81411 10.3342C8.89795 10.2451 9.01264 10.1912 9.1348 10.1837L23.5174 10.1864C23.5802 10.1862 23.6425 10.1984 23.7006 10.2222C23.7588 10.2461 23.8117 10.2812 23.8562 10.3255C23.9008 10.3698 23.9362 10.4225 23.9604 10.4805C23.9846 10.5385 23.9971 10.6007 23.9972 10.6635Z"
        fill="#FFD983"
      />
    </G>
    <Defs>
      <ClipPath id="clip0_750_7653">
        <Rect width="32.6526" height="32.6526" fill="white" />
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
      className="flex-1 bg-[#F8FAFC]"
      style={{ paddingHorizontal: TABS_HORIZONTAL_GUTTER }}
    >
      {/* === HEADER SECTION === */}
      <View className="pt-4 pb-2">
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
            locations={[0, 0.25, 0.44, 0.77, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
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
            <View
              style={{
                position: "absolute",
                top: pointResponsive.heroBadgeOffsetTop,
                right: pointResponsive.heroBadgeOffsetRight,
                borderRadius: 999,
                paddingHorizontal: pointResponsive.heroBadgePaddingX,
                paddingVertical: pointResponsive.heroBadgePaddingY,
                borderWidth: 1.5,
                borderColor: "#FFFFFF",
                backgroundColor: "rgba(243, 245, 250, 0.8)",
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
            </View>
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
