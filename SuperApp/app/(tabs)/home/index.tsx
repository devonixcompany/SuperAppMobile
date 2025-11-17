// นำเข้า Ionicons สำหรับใช้ไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
// นำเข้า LinearGradient สำหรับสร้างพื้นหลังแบบไล่สี
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useRef, useState } from "react";
// นำเข้า components พื้นฐานจาก React Native
import {
  Animated,
  GestureResponderEvent,
  Image,
  ImageSourcePropType,
  Pressable,
  PressableProps,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
// นำเข้า SafeAreaView เพื่อหลีกเลี่ยงพื้นที่ notch และ status bar
import CoinSvg from "@/assets/img/twemoji_coin.svg";
import { usePointCardResponsive } from "@/hooks/usePointCardResponsive";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import MiniProfileModal, { DEFAULT_PROFILE_AVATAR } from "./miniprofile";
import NotificationModal from "./notification";
import {
  ChargingStatusInlineCard,
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

const CHARGING_STATUS_POLL_INTERVAL_MS = 5000; //ตั้งเวลาเรียก API ของ Pop-Up หน่วยเป็น ms.

const CoinIcon = ({ size = 40 }: { size?: number }) => (
  <CoinSvg width={size} height={size} />
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
  } = useChargingStatusPopup({
    pollInterval: CHARGING_STATUS_POLL_INTERVAL_MS,
  });

  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const responsive = useMemo(() => {
    const isSmallPhone = screenWidth < 360;
    const isLargePhone = screenWidth >= 414 && screenWidth < 768;
    const isTablet = screenWidth >= 768;

    const horizontalGutter = isTablet
      ? 48
      : isLargePhone
        ? 28
        : isSmallPhone
          ? 16
          : 22;

    const availableWidth = Math.max(screenWidth - horizontalGutter * 2, 200);
    const desiredPhoneWidth = Math.min(screenWidth * 0.85, 360);
    const horizontalCardWidth = isTablet
      ? Math.min(screenWidth * 0.4, 420)
      : Math.min(availableWidth, Math.max(desiredPhoneWidth, 220));

    const newsCardWidth = Math.max(
      isTablet ? horizontalCardWidth * 0.5 : horizontalCardWidth * 0.8, //กำหนดวามกว้างของกรอบข่าว
      50,// ขนาดของกรอบรูปของข่าว
    );

    const newsImageHeight = isTablet
      ? Math.min(150, newsCardWidth * 0.5)
      : Math.max(120, newsCardWidth * 0.5); //กำหนดความสูงของรูปและข้อความ

    const recommendationCardWidth = Math.max(
      isTablet ? horizontalCardWidth * 0.5 : horizontalCardWidth * 0.8, //กำหนดวามกว้างของกรอบหัวข้อแนะนำ
      150, //กำหนดความสูงของรูปและข้อความ
    );

    const recommendationAvatar = isTablet ? 76 : isSmallPhone ? 56 : 64;

    return {
      isSmallPhone,
      isTablet,
      horizontalGutter,
      newsCardWidth,
      newsImageHeight,
      recommendationCardWidth,
      recommendationAvatar,
      cardSpacing: isTablet ? 24 : 16,
    };
  }, [screenWidth]);

  const pointResponsive = usePointCardResponsive();

  const contentBottomPadding = 90 + insets.bottom + (responsive.isTablet ? 48 : 32);

  const handleNavigateToCharging = useCallback(() => {
    console.log('🚀 [HOME] handleNavigateToCharging called');
    console.log('🚀 [HOME] chargingPopupData:', chargingPopupData);

    hideChargingPopup();

    // Navigate to charge session with all required parameters
    if (chargingPopupData?.websocketUrl && chargingPopupData?.chargePointIdentity && chargingPopupData?.connectorId) {
      const navParams = {
        websocketUrl: chargingPopupData.websocketUrl,
        chargePointIdentity: chargingPopupData.chargePointIdentity,
        chargePointName: chargingPopupData.chargePointName ?? '',
        connectorId: String(chargingPopupData.connectorId),
        stationName: chargingPopupData.stationName ?? chargingPopupData.chargePointName ?? '',
        stationLocation: chargingPopupData.stationLocation ?? '',
        powerRating: chargingPopupData.powerRating ? String(chargingPopupData.powerRating) : '',
        baseRate: chargingPopupData.baseRate ? String(chargingPopupData.baseRate) : '',
        currency: chargingPopupData.currency ?? 'บาท',
        pricingTierName: chargingPopupData.pricingTierName ?? '',
        chargePointBrand: chargingPopupData.chargePointBrand ?? '',
        protocol: chargingPopupData.protocol ?? '',
        startTime: chargingPopupData.startTime ?? undefined,
      };

      console.log('✅ [HOME] Navigating to /charge-session with params:', navParams);

      router.push({
        pathname: '/charge-session',
        params: navParams,
      });
    } else {
      console.warn('❌ [HOME] Missing required data, navigating to charging list instead');
      console.warn('❌ [HOME] Missing:', {
        websocketUrl: chargingPopupData?.websocketUrl,
        chargePointIdentity: chargingPopupData?.chargePointIdentity,
        connectorId: chargingPopupData?.connectorId,
      });
      router.push("/(tabs)/charging");
    }
  }, [hideChargingPopup, router, chargingPopupData]);

  return (
    // SafeAreaView: ป้องกันเนื้อหาทับกับ notch/status bar, ตั้งพื้นหลังเป็นสีเทาอ่อน
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#EEF0F6]">
      {/* ScrollView: ทำให้เนื้อหาสามารถเลื่อนได้, ซ่อน scrollbar */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: contentBottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* ส่วนหลัก: padding ด้านข้างปรับตามหน้าจอ */}
        <View
          className="pt-4 pb-0"
          style={{ paddingHorizontal: responsive.horizontalGutter }}
        >
          {/* === HEADER SECTION === */}
          <View className="flex-row items-center justify-between mb-5">
            <TouchableScale
              className="w-11 h-11 rounded-full border border-[#EEF0F6] overflow-hidden bg-[#4EBB8E] shadow-sm"
              onPress={() => setProfileVisible(true)}
              androidRippleColor="rgba(255,255,255,0.25)"
            >
              <Image source={profileAvatar} className="w-full h-full" />
            </TouchableScale>
            <Text
              className="font-semibold text-[#1F2937]"
              style={{
                fontSize: responsive.isTablet
                  ? 22
                  : responsive.isSmallPhone
                    ? 16
                    : 18,
              }}
            >
              หน้าหลัก
            </Text>
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
            <TouchableScale
              activeOpacity={0.9}
              onPress={() => router.push("/card")}
              style={{ alignSelf: "stretch", marginHorizontal: pointResponsive.cardHorizontalMargin }}
            >
              <LinearGradient
                colors={["#1F274B", "#395F85", "#589FAF", "#67C1A5", "#5EC1A0"]} //เรียงแบบนี้สีเหมือนสุด #1F274B", "#395F85", "#589FAF", "#67C1A5", "#5EC1A0 
                locations={[0.1, 0.4, 0.7, 0.99, 1]} //กำหนดขนาดสี  [0.1, 0.4, 0.7, 0.99, 1] ค่านี้เหมาะสมสุด
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
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: pointResponsive.heroHeaderGap,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: pointResponsive.heroHeaderGap,
                      }}
                    >
                      <Image
                        source={require("../../../assets/img/ponix-logo-06.png")}
                        resizeMode="contain"
                        style={{
                          width: pointResponsive.heroLogoWidth,
                          height: pointResponsive.heroLogoHeight,
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
                          width: pointResponsive.heroCoinSize + 2,
                          height: pointResponsive.heroCoinSize + 2,
                          backgroundColor: "rgba(255,255,255,0.2)",
                        }}
                      >
                        <CoinIcon size={pointResponsive.heroCoinSize } />
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
                      สิทธิพิเศษของคุณ
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
                    borderWidth: 0.5,
                    borderColor: "#FFFFFF",
                    backgroundColor: "rgba(243, 245, 250, 0.5)",
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
                      fontWeight: "400",
                      color: "#1B2344",
                    }}
                  >
                    รหัสสมาชิก 000000
                  </Text>
                </View>
              </LinearGradient>
            </TouchableScale>
          </View>

          {chargingPopupData && isChargingPopupVisible ? (
            <ChargingStatusInlineCard
              data={chargingPopupData}
              onClose={hideChargingPopup}
              onNavigateToCharging={handleNavigateToCharging}
            />
          ) : null}

       
          {/* === NEWS UPDATES SECTION === */}
          <View className="mb-2">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-baseline">
                <Text className="text-lg font-semibold text-[#1F2937]">
                  ข่าวสารอัพเดต
                </Text>
                <Text className="ml-2 text-sm text-[#3B82F6]">ใหม่</Text>
              </View>
              <Text className="text-sm text-[#6B7280]">เลื่อนดูเพิ่มเติม  </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: responsive.horizontalGutter }}
            >
              {newsUpdates.map((item, index) => (
                <TouchableScale
                  key={item.id}
                  className="mt-2 mb-2 bg-white shadow-sm rounded-2xl" //ตั้งค่าระยะขอบกรอบ ให้รูปโดนไม่ทับ
                  style={{
                    width: responsive.newsCardWidth,
                    marginRight:
                      index === newsUpdates.length - 1 ? 0 : responsive.cardSpacing,
                  }}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: item.image }}
                    className="w-full rounded-t-2xl"
                    style={{
                      height: responsive.newsImageHeight,
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                    }}
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
                <Text className="text-sm font-medium text-[#6B7280] ">
                  เลื่อนดูเพิ่มเติม
                </Text>
              </TouchableScale>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: responsive.horizontalGutter }}
            >
              {recommendationTopics.map((topic, index) => (
                <TouchableScale
                  key={topic.id}
                  className="p-4 mb-2 bg-white shadow-sm rounded-2xl" //ตั้งค่าระยะขอบกรอบ ให้รูปโดนไม่ทับ
                  style={{
                    width: responsive.recommendationCardWidth,
                    marginRight:
                      index === recommendationTopics.length - 1
                        ? 0
                        : responsive.cardSpacing,
                  }}
                  activeOpacity={0.9}
                >
                  <View className="flex-row items-center">
                    <Image
                      source={{ uri: topic.image }}
                      className="rounded-xl"
                      style={{
                        width: responsive.recommendationAvatar,
                        height: responsive.recommendationAvatar,
                        borderRadius: 16,
                      }}
                    />
                    <View
                      className="flex-1"
                      style={{ marginLeft: responsive.isSmallPhone ? 12 : 16 }}
                    >
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
