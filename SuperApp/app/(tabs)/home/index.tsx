// นำเข้า Ionicons สำหรับใช้ไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
// นำเข้า LinearGradient สำหรับสร้างพื้นหลังแบบไล่สี
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
// นำเข้า components พื้นฐานจาก React Native
import {
  Animated,
  GestureResponderEvent, //*** การกดปุ่มแบบนี้เรียกว่า  Press Interaction หรือ Press Gesture Interaction
  Image,
  ImageSourcePropType,
  Pressable,
  PressableProps,
  ScrollView,
  Text,
  View,
} from "react-native";
// นำเข้า SafeAreaView เพื่อหลีกเลี่ยงพื้นที่ notch และ status bar
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg";
import MiniProfileModal, { DEFAULT_PROFILE_AVATAR } from "./miniprofile";
import NotificationModal from "./notification";
import ChargingStatusPopup, {
  useChargingStatusPopup,
} from "./popup";

type NewsItem = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  tag: string;
};

type Recommendation = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  source: string;
  date: string;
};

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

const newsUpdates: NewsItem[] = [
  {
    id: "1",
    title: 'PONIX ปรับตัวรับกระแสรักษ์โลก ขยายบริการสถานีชาร์จ EV',
    subtitle: "การเปิดสถานีใหม่ EV Charger Station กลางใจกรุงเทพฯ",
    image:
      "https://itp1.itopfile.com/ImageServer/z_itp_23052022wg8w/0/0/ponix-(%E0%B8%A0%E0%B8%B2%E0%B8%9E%E0%B8%9B%E0%B8%81)z-z766166060534.webp",
    tag: "การเปิดตัวใหม่",
  },
  {
    id: "2",
    title: "ขอบพระคุณ คุณกบ พันธมิตรที่เลือกใช้บริการกับโพนิ๊กซ์",
    subtitle: "ร่วมยกระดับบริการชาร์จไฟสำหรับธุรกิจอสังหาฯ",
    image:
      "https://www.thaipr.net/wp-content/uploads/2024/07/%E0%B9%82%E0%B8%9E%E0%B8%99%E0%B8%B4%E0%B8%81%E0%B8%8B%E0%B9%8C-%E0%B8%A3%E0%B9%88%E0%B8%A7%E0%B8%A1%E0%B8%81%E0%B8%B1%E0%B8%9A-%E0%B8%84%E0%B8%B2%E0%B8%A5%E0%B9%80%E0%B8%97%E0%B9%87%E0%B8%81%E0%B8%8B%E0%B9%8C-2-afcfecde-scaled-e1720765337873.jpeg",
    tag: "ชุมชนโพนิ๊กซ์",
  },
  {
    id: "3",
    title: "อัปเดตระบบสำรองไฟ เพิ่มความมั่นใจให้ลูกค้ารถ EV ทุกคัน",
    subtitle: "ระบบพร้อมใช้งานทุกสถานีทั่วประเทศแล้ววันนี้",
    image:
      "https://itp1.itopfile.com/ImageServer/z_itp_23052022wg8w/0/0/ponixsolar-10z-z1414204421649.webp",
    tag: "ประกาศสำคัญ",
  },
];

const recommendationTopics: Recommendation[] = [
  {
    id: "1",
    title: "ยกระดับการชาร์จรถยนต์ไฟฟ้าของคุณ",
    subtitle: "ขอแนะนำ Autel Maxicharger AC Wallbox",
    image:
      "https://cdn.shopify.com/s/files/1/0603/1710/6336/files/Hero_Image_V2X_FLAT.png?v=1757449758&width=2048",
    source: "PONIX",
    date: "5 กันยายน 2568",
  },
  {
    id: "2",
    title: "วางแผนการเดินทางจังหวัดใหญ่ทั่วไทย",
    subtitle: "เลือกหัวข้อที่เหมาะกับไลฟ์สไตล์ของคุณ",
    image:
      "https://cdn.prod.website-files.com/64b825ce3428b050ac90c545/684332c60f14de0d7d69526c_F10-Nonfleet.webp",
    source: "PONIX Travel",
    date: "30 สิงหาคม 2568",
  },
  {
    id: "3",
    title: "เทคนิคเพิ่มคะแนน PONIX Point ให้ไวขึ้น",
    subtitle: "เก็บครบทุกภารกิจ รับคะแนนต่อเนื่อง",
    image:
      "https://itp1.itopfile.com/ImageServer/z_itp_23052022wg8w/0/0/PONIXMAC5z-z815739368938.webp",
    source: "PONIX Club",
    date: "25 สิงหาคม 2568",
  },
];

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

// ฟังก์ชันหลักของหน้า Home
export default function HomeScreen() {
  const router = useRouter();
  const [isNotificationVisible, setNotificationVisible] = useState(false);
  const [isProfileVisible, setProfileVisible] = useState(false);
  const [profileName, setProfileName] = useState("PONIX Member");
  const [profileAvatar, setProfileAvatar] =
    useState<ImageSourcePropType>(DEFAULT_PROFILE_AVATAR);
  const {
    data: chargingPopupData,
    visible: isChargingPopupVisible,
    hide: hideChargingPopup,
  } = useChargingStatusPopup();

  const handleNavigateToCharging = useCallback(() => {
    hideChargingPopup();
    router.push("/(tabs)/charging");
  }, [hideChargingPopup, router]);

  return (
    // SafeAreaView: ป้องกันเนื้อหาทับกับ notch/status bar, ตั้งพื้นหลังเป็นสีเทาอ่อน
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#EEF0F6]">
      {/* ScrollView: ทำให้เนื้อหาสามารถเลื่อนได้, ซ่อน scrollbar */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ส่วนหลัก: padding ด้านข้าง 6, บนล่าง 4 และ 6 */}
        <View className="px-6 pt-4 pb-0">
          {/* === HEADER SECTION === */}
          <View className="flex-row items-center justify-between mb-5">
            <TouchableScale
              className="w-11 h-11 rounded-full border border-[#EEF0F6] overflow-hidden bg-[#4EBB8E] shadow-sm"
              onPress={() => setProfileVisible(true)}
              androidRippleColor="rgba(255,255,255,0.25)"
            >
              <Image source={profileAvatar} className="w-full h-full" />
            </TouchableScale>
            <Text className="text-lg font-semibold text-[#1F2937]">หน้าหลัก</Text>
            <TouchableScale
              className="items-center justify-center w-10 h-10"
              onPress={() => setNotificationVisible(true)}
              hitSlop={8}
              androidRippleColor="rgba(78,187,142,0.2)"
            >
              <Ionicons name="notifications-outline" size={32} color="#4EBB8E" />
            </TouchableScale>
          </View>

          {/* === POINTS CARD SECTION === */}
          <View className="mb-5">
            <TouchableScale activeOpacity={0.9} onPress={() =>router.push("/card") }>
            <LinearGradient
              colors={["#1F274B", "#395F85", "#589FAF", "#67C1A5", "#5EC1A0"]}
              locations={[0, 0.25, 0.55, 0.75, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              className="px-10 pt-10 pb-0"
              style={{ borderRadius: 20 }}
            >
              <View className="flex-row items-center justify-between mb-5">
                <View>
                  <View className="flex-row items-center mt-5 mb-1">
                    <Image 
                      source={require("../../../assets/img/ponix-logo-06.png")}
                      className="w-24 h-10 ml-1 "
                      resizeMode="contain"
                    />
                    <Text className="ml-0.5 text-2xl font-semibold text-white">
                      Point
                    </Text>
                  </View>
                  <Text className="mt-1 ml-5 text-2xl text-white/80"> 
                    คะแนนของฉัน
                  </Text>
                </View>
                <View
                  className="p-4 py-2 rounded-full px-7 mr-9 bg-white/80"
                  style={{
                    shadowColor: "#1B2344",
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                >
                  <Text className="text-xs font-semibold text-[#1B2344]">
                    รหัสสมาชิก P202501
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center mb-2 ml-5">
                <View className="items-center justify-center w-12 h-12 rounded-full bg-white/15">
                  <CoinIcon size={36} />
                </View>
                <View className="ml-5">
                  <Text className="text-3xl font-extrabold text-white">
                    262 P
                  </Text>
                </View>
              </View>
              <View className="h-[2px] bg-white/90 mb-5 " />
              <Text className="mb-5 ml-5 text-sm text-white/90">หมดอายุ : 30 ก.ย. 2568</Text>
            </LinearGradient>
           </TouchableScale>
          </View>

          {/* === NEWS UPDATES SECTION === */}
          <View className="mb-2">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-baseline">
                <Text className="text-lg font-semibold text-[#1F2937]">
                  ข่าวสารอัพเดต
                </Text>
                <Text className="ml-2 text-sm text-[#3B82F6]">ใหม่</Text>
              </View>
              <Text className="text-sm text-[#6B7280]">เลื่อนเพื่อดูเพิ่มเติม  </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 24 }}
            >
              {newsUpdates.map((item, index) => (
                <TouchableScale
                  key={item.id}
                  className="mt-2 mb-2 bg-white shadow-sm w-72 rounded-2xl" //ตั้งค่าระยะขอบกรอบ ให้รูปโดนไม่ทับ
                  style={{ marginRight: index === newsUpdates.length - 1 ? 0 : 16 }}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: item.image }}
                    className="w-full h-32 rounded-t-2xl"
                    style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                  />
                  <View className="p-4">
                    <View className="self-start px-2 py-1 mb-3 bg-[#E0F2FE] rounded-full">
                      <Text className="text-xs font-medium text-[#0284C7]">
                        {item.tag}
                      </Text>
                    </View>
                    <Text
                      className="text-base font-semibold text-[#1F2937]"
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text
                      className="mt-2 text-sm text-[#6B7280]"
                      numberOfLines={2}
                    >
                      {item.subtitle}
                    </Text>
                  </View>
                </TouchableScale>
              ))}
            </ScrollView>
          </View>

          {/* === RECOMMENDED TOPICS SECTION === */}
          <View className="mb-0">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-[#1F2937]">
                หัวข้อแนะนำ
              </Text>
              <TouchableScale activeOpacity={0.7}>
                <Text className="text-sm font-medium text-[#3B82F6] ">
                  ดูทั้งหมด
                </Text>
              </TouchableScale>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 24 }}
            >
              {recommendationTopics.map((topic, index) => (
                <TouchableScale
                  key={topic.id}
                  className="p-4 mb-2 bg-white shadow-sm w-72 rounded-2xl" //ตั้งค่าระยะขอบกรอบ ให้รูปโดนไม่ทับ
                  style={{
                    marginRight:
                      index === recommendationTopics.length - 1 ? 0 : 16,
                  }}
                  activeOpacity={0.9}
                >
                  <View className="flex-row items-center">
                    <Image
                      source={{ uri: topic.image }}
                      className="w-16 h-16 rounded-xl"
                      style={{ borderRadius: 16 }}
                    />
                    <View className="flex-1 ml-4">
                      <Text className="text-sm font-semibold text-[#1F2937]">
                        {topic.title}
                      </Text>
                      <Text
                        className="mt-1 text-xs text-[#6B7280]"
                        numberOfLines={2}
                      >
                        {topic.subtitle}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between mt-4">
                    <Text className="text-xs font-medium text-[#3B82F6]">
                      {topic.source}
                    </Text>
                    <Text className="text-xs text-[#9CA3AF]">{topic.date}</Text>
                  </View>
                </TouchableScale>
              ))}
            </ScrollView>
          </View>

          {/* ส่วนล่างถูกตัดออกตามคำขอ */}
        </View>
      </ScrollView>
      {chargingPopupData ? (
        <ChargingStatusPopup
          visible={isChargingPopupVisible}
          data={chargingPopupData}
          onClose={hideChargingPopup}
          onNavigateToCharging={handleNavigateToCharging}
        />
      ) : null}
      <NotificationModal
        visible={isNotificationVisible}
        onClose={() => setNotificationVisible(false)}
      />
      <MiniProfileModal
        visible={isProfileVisible}
        onClose={() => setProfileVisible(false)}
        name={profileName}
        avatarSource={profileAvatar}
        onChangeName={(newName) => {
          const trimmed = newName.trim();
          setProfileName(trimmed.length ? trimmed : "PONIX Member");
        }}
        onChangeAvatar={(source) => {
          setProfileAvatar(source ?? DEFAULT_PROFILE_AVATAR);
        }}
        onSettings={() => {
          setProfileVisible(false);
          router.push("/(tabs)/settings");
        }}
      />
    </SafeAreaView>
  );
}
