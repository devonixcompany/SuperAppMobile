// นำเข้า Ionicons สำหรับใช้ไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
// นำเข้า components พื้นฐานจาก React Native
import {
  Image,
  ImageSourcePropType,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
// นำเข้า SafeAreaView เพื่อหลีกเลี่ยงพื้นที่ notch และ status bar
import PointsCard, { DEFAULT_POINTS_CARD_PROPS } from "@/components/ui/PointsCard";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { TABS_HORIZONTAL_GUTTER, useAppBarActions } from "../_layout";
import NewsSections, {
  type NewsItem,
  fetchNewsFromApi,
} from "./News";
import Products, {
  type ProductItem,
  fetchProductsFromApi,
} from "./Products";
import MiniProfileModal, { DEFAULT_PROFILE_AVATAR } from "./miniprofile";
import NotificationModal from "./notification";
import {
  ChargingStatusInlineCard,
  useChargingStatusPopup,
} from "./popup";

const CHARGING_STATUS_POLL_INTERVAL_MS = 5000; //ตั้งเวลาเรียก API ของ Pop-Up หน่วยเป็น ms.

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
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [productError, setProductError] = useState<string | null>(null);
  const [isProductLoading, setIsProductLoading] = useState(false);

  const responsive = useMemo(() => {
    const isSmallPhone = screenWidth < 360;
    const isLargePhone = screenWidth >= 414 && screenWidth < 768;
    const isTablet = screenWidth >= 768;

    // ใช้ค่าคงที่สำหรับ padding ซ้าย-ขวา จาก layout (ปรับเลขได้ใน /app/(tabs)/_layout.tsx)
    const horizontalGutter = TABS_HORIZONTAL_GUTTER;

    const availableWidth = Math.max(screenWidth - horizontalGutter * 2, 200);
    const desiredPhoneWidth = Math.min(screenWidth * 0.85, 360);
    const horizontalCardWidth = isTablet
      ? Math.min(screenWidth * 0.4, 420)
      : Math.min(availableWidth, Math.max(desiredPhoneWidth, 220));

    const newsCardWidth = Math.max(
      isTablet ? horizontalCardWidth * 0.44 : horizontalCardWidth * 0.72, // ลดความกว้างการ์ดข่าว
      50,
    );

    const newsImageHeight = isTablet
      ? Math.min(140, newsCardWidth * 0.45)
      : Math.max(110, newsCardWidth * 0.45); // ลดความสูงรูปข่าว

    const recommendationCardWidth = Math.max(
      isTablet ? horizontalCardWidth * 0.42 : horizontalCardWidth * 0.68, // ลดความกว้างการ์ดสินค้า
      130,
    );

    const recommendationAvatar = isTablet ? 64 : isSmallPhone ? 52 : 56; // ลดขนาดรูปสินค้า

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

  const handleShowProfile = useCallback(() => setProfileVisible(true), []);
  const handleShowNotification = useCallback(
    () => setNotificationVisible(true),
    [],
  );

  useEffect(() => {
    let active = true;
    const loadNews = async () => {
      const remoteNews = await fetchNewsFromApi();
      if (active) {
        setNewsItems(remoteNews);
      }
    };
    loadNews();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      setProductError(null);
      setIsProductLoading(true);
      try {
        const remoteProducts = await fetchProductsFromApi();
        if (active) {
          setProductItems(remoteProducts);
          if (!remoteProducts.length) {
            setProductError("ไม่พบสินค้า");
          }
        }
      } catch (error) {
        console.error("[Products] failed to load", error);
        if (active) {
          setProductError("โหลดสินค้าไม่สำเร็จ");
        }
      } finally {
        if (active) {
          setIsProductLoading(false);
        }
      }
    };
    loadProducts();
    return () => {
      active = false;
    };
  }, []);

  useAppBarActions(
    "home",
    useMemo(
      () => ({
        leftAvatar: profileAvatar,
        onLeftPress: handleShowProfile,
        rightActions: [
          {
            icon: "notifications-outline",
            onPress: handleShowNotification,
            size: 29,//ขนาดรูปปุ่ม
            buttonSize: 44, //ขนาดปุ่มหน้า Home
            color: "#4EBB8E" //สีปุ่มหน้า Home
            
          },
        ],
      }),
      [handleShowNotification, handleShowProfile, profileAvatar],
    ),
  );

  return (
    // SafeAreaView: ป้องกันเนื้อหาทับกับ notch/status bar, ตั้งพื้นหลังเป็นสีเทาอ่อน
    <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1 bg-[#D9DEED80]">
      {/* ScrollView: ทำให้เนื้อหาสามารถเลื่อนได้, ซ่อน scrollbar */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: contentBottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* ส่วนหลัก: padding ด้านข้างปรับตามหน้าจอ */}
        <View
          className="pt-4 pb-0" // ระยะห่างบนจอ
          style={{ paddingHorizontal: responsive.horizontalGutter }}
        >
          {/* === POINTS CARD SECTION === */}
          <PointsCard
            {...DEFAULT_POINTS_CARD_PROPS}
            onPress={() => router.push("/card")}
          />

          {chargingPopupData && isChargingPopupVisible ? (
            <ChargingStatusInlineCard
              data={chargingPopupData}
              onClose={hideChargingPopup}
              onNavigateToCharging={handleNavigateToCharging}
            />
          ) : null}


          <NewsSections
            responsive={responsive}
            newsItems={newsItems}
          />

          <Products
            responsive={responsive}
            items={productItems}
            isLoading={isProductLoading}
            errorMessage={productError}
          />

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
