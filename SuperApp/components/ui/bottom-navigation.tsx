// นำเข้า Ionicons สำหรับไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
// นำเข้า components พื้นฐานจาก React Native
import { LayoutChangeEvent, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// Interface กำหนด props ที่ component นี้รับ
interface BottomNavigationProps {
  activeTab: string; // ชื่อ tab ที่กำลังใช้งานอยู่
  onTabPress: (tab: string) => void; // ฟังก์ชันเมื่อกด tab ปกติ
  onQRPress?: () => void; // ฟังก์ชันเมื่อกดปุ่ม QR (optional)
}

// Component หลักของ Bottom Navigation Bar
// Custom Bottom Navigation Bar Design เพื่อสร้างร่องเว้าสำหรับ Floating Button (กว่าจะทำได้ 555 #Thad)
export default function BottomNavigation({
  activeTab,
  onTabPress,
  onQRPress,
}: BottomNavigationProps) { // เทคนิค: Custom Clipping / Custom Painter / Custom Shape
  const insets = useSafeAreaInsets();

  // สีที่ใช้ใน navigation bar
  const CARD_BACKGROUND = "#FFFFFF";
  const ACTIVE_COLOR = "#51BC8E";
  const INACTIVE_COLOR = "#1F274B";
  const BAR_HEIGHT = 100;
  const NOTCH_WIDTH = 180; //ปรับความกว้าง
  const NOTCH_DEPTH = 50; //ปรับความลึก
  const CORNER_RADIUS = 32;
  const FLOATING_BUTTON_SIZE = 88;
  const horizontalPadding = 16;
  const bottomOffset = Math.max(insets.bottom - 20, 20); // ลด padding ด้านล่างลงเล็กน้อยให้ bar อยู่ต่ำลง ลดตำแหน่ง Bar

  type TabItem = {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
    label: string;
  };

  // ข้อมูล tabs ทั้งหมด
  const tabs: TabItem[] = [
    {
      id: "home",
      icon: "home-outline",
      activeIcon: "home",
      label: "หน้าหลัก",
    },
    {
      id: "charging",
      icon: "flash-outline",
      activeIcon: "flash",
      label: "สถานี",
    },
    {
      id: "qr",
      icon: "qr-code-outline",
      activeIcon: "qr-code",
      label: "",
    },
    {
      id: "card",
      icon: "card-outline",
      activeIcon: "card",
      label: "เป๋าตัง",
    },
    {
      id: "settings",
      icon: "settings-outline",
      activeIcon: "settings",
      label: "ตั้งค่า",
    },
  ];

  const [barWidth, setBarWidth] = useState(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setBarWidth((prev) => (Math.abs(prev - width) < 0.5 ? prev : width));
  }, []);

  const barPath = useMemo(() => {
    if (!barWidth) {
      return "";
    }

    const width = barWidth;
    const height = BAR_HEIGHT;
    const radius = CORNER_RADIUS;
    const depth = NOTCH_DEPTH;

    const maxNotchWidth = Math.max(0, width - 2 * (radius + 16));
    const notchWidth = Math.min(NOTCH_WIDTH, maxNotchWidth);

    if (notchWidth <= 0 || depth <= 0) {
      return [
        `M${radius},0`,
        `H${width - radius}`,
        `Q${width},0 ${width},${radius}`,
        `V${height - radius}`,
        `Q${width},${height} ${width - radius},${height}`,
        `H${radius}`,
        `Q0,${height} 0,${height - radius}`,
        `V${radius}`,
        `Q0,0 ${radius},0`,
        "Z",
      ].join(" ");
    }

    const halfNotch = notchWidth / 2;
    const centerX = width / 2;
    const notchStartX = centerX - halfNotch;
    const notchEndX = centerX + halfNotch;
    const control = Math.min(notchWidth / 2, notchWidth * 0.42);
    const curveTopY = Math.max(0, depth);

    return [
      `M${radius},0`,
      `H${notchStartX}`,
      `C${notchStartX + control},0 ${centerX - control},${curveTopY} ${centerX},${curveTopY}`,
      `C${centerX + control},${curveTopY} ${notchEndX - control},0 ${notchEndX},0`,
      `H${width - radius}`,
      `Q${width},0 ${width},${radius}`,
      `V${height - radius}`,
      `Q${width},${height} ${width - radius},${height}`,
      `H${radius}`,
      `Q0,${height} 0,${height - radius}`,
      `V${radius}`,
      `Q0,0 ${radius},0`,
      "Z",
    ].join(" ");
  }, [BAR_HEIGHT, CORNER_RADIUS, NOTCH_DEPTH, NOTCH_WIDTH, barWidth]);

  // ฟังก์ชันสร้างปุ่มแต่ละ tab
  const renderTabButton = (tab: TabItem) => {
    const isActive = activeTab === tab.id; // เช็คว่าเป็น tab ที่กำลังใช้งานหรือไม่
    const isQRButton = tab.id === "qr"; // เช็คว่าเป็นปุ่ม QR หรือไม่

    // ปล่อยพื้นที่ว่างตรงกลางสำหรับปุ่ม QR ที่เป็น floating button
    if (isQRButton) {
      return <View key={tab.id} style={{ flex: 1 }} pointerEvents="none" />;
    }

    // ปุ่ม tab ปกติ (ไม่ใช่ QR)
    return (
      <TouchableOpacity
        key={tab.id}
        onPress={() => onTabPress(tab.id)} // เรียกฟังก์ชันพร้อมส่ง id ของ tab
        className="items-center justify-center flex-1 py-2"
      >
        {/* ไอคอน: ถ้าเป็น active ใช้ไอคอนแบบเต็ม ถ้าไม่ใช้แบบ outline */}
        <Ionicons
          name={isActive ? tab.activeIcon : tab.icon}
          size={24}
          color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR} // สีเขียวถ้า active, น้ำเงินเข้มถ้าไม่ active
        />
        {/* ข้อความใต้ไอคอน */}
        <Text
          className={`text-xs mt-1 ${
            isActive ? "text-[#51BC8E] font-semibold" : "text-[#1F274B]"
          }`}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: horizontalPadding,
        paddingBottom: bottomOffset,
        paddingTop: FLOATING_BUTTON_SIZE - NOTCH_DEPTH,
      }}
    >
      <View
        className="relative"
        style={{
          shadowColor: "#111827",
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        <View
          style={{ height: BAR_HEIGHT, width: "100%" }}
          onLayout={handleLayout}
        >
          {barWidth > 0 && barPath && (
            <Svg
              pointerEvents="none"
              width={barWidth}
              height={BAR_HEIGHT}
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              <Path d={barPath} fill={CARD_BACKGROUND} />
            </Svg>
          )}

          <View
            className="flex-row items-end justify-between px-6 pb-6"
            style={{ height: BAR_HEIGHT, paddingTop: 20 }}
          >
            {tabs.map(renderTabButton)}
          </View>
        </View>

        <TouchableOpacity
          onPress={onQRPress}
          activeOpacity={0.9}
          disabled={!onQRPress}
          style={{
            position: "absolute",
            top: -(FLOATING_BUTTON_SIZE - NOTCH_DEPTH),
            left: "50%",
            marginLeft: -FLOATING_BUTTON_SIZE / 2,
            width: FLOATING_BUTTON_SIZE,
            height: FLOATING_BUTTON_SIZE,
            borderRadius: FLOATING_BUTTON_SIZE / 2,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.22,
            shadowRadius: 16,
            elevation: 12,
            opacity: onQRPress ? 1 : 0.6,
            backgroundColor: "#FFFFFF",
          }}
        >
          <Ionicons name="qr-code-outline" size={36} color="#1F274B" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
