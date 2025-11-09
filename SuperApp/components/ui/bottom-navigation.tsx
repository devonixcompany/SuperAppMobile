// นำเข้า Ionicons สำหรับไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// นำเข้า components พื้นฐานจาก React Native
import {
  Animated,
  LayoutChangeEvent,
  Text,
  TouchableOpacity,
  View,
  ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// Interface กำหนด props ที่ component นี้รับ
interface BottomNavigationProps {
  activeTab: string; // ชื่อ tab ที่กำลังใช้งานอยู่
  onTabPress: (tab: string) => void; // ฟังก์ชันเมื่อกด tab ปกติ
  onQRPress?: () => void; // ฟังก์ชันเมื่อกดปุ่ม QR (optional)
  hidden?: boolean; // ซ่อน bar เมื่ออยู่ในหน้า scanner
}

// Component หลักของ Bottom Navigation Bar
// Custom Bottom Navigation Bar Design เพื่อสร้างร่องเว้าสำหรับ Floating Button (กว่าจะทำได้ 555 #Thad)
export default function BottomNavigation({
  activeTab,
  onTabPress,
  onQRPress,
  hidden = false,
}: BottomNavigationProps) { // เทคนิค: Custom Clipping / Custom Painter / Custom Shape
  const insets = useSafeAreaInsets();

  // “custom bottom navigation with floating action button (FAB) notch” หรือบางทีเรียก “concave bottom bar” 
  // เพราะเป็นการออกแบบแถบนำทางที่สร้างร่องเว้า/โค้งเฉพาะเพื่อดันปุ่มลอย (floating QR button) ให้นูนออกมาจากพื้นหลัง.
  const CARD_BACKGROUND = "#EFF0F2";//สีของพื้นหลัง
  const CARD_BORDER_COLOR = "#FFFFFF";//สีของเส้นขอบ
  const CARD_BORDER_WIDTH = 3;//ความหนาของเส้นขอบ
  const ACTIVE_COLOR = "#51BC8E";//สีตอนใช้งานหน้านั้นๆ
  const INACTIVE_COLOR = "#111C3F";//สีไอคอล
  const BAR_HEIGHT = 90; //เพิ่มกรอบให้สูงขึ้น
  const FLOATING_BUTTON_SIZE = 90; //ขนาดวงกลม
  const QR_BUTTON_GAP = 1.2; // ปรับ ขึ้น-ลง ของปุ่ม qr และระยะช่องว่างระหว่างปุ่มกับโค้งบน
  const WEDGE_WIDTH = 140; // ความกว้างของส่วนเว้าตรงกลาง
  const WEDGE_DEPTH = 50; // ความลึกของส่วนเว้าตรงกลาง
  const WEDGE_CURVE_TENSION = 0.7; // 0-0.5 ยิ่งสูงเส้นยิ่งโค้ง
  const WEDGE_BOTTOM_EASE = 0.0; // คุมความมนของจุดต่ำสุด ยิ่งต่ำยิ่งโค้งคล้ายรูปวงกลม
  const CORNER_RADIUS = 20;//โค้งมมของกรอบ
  const horizontalPadding = 0;//ซ้ายและขวาของกรอบ ชิดหน้าจอ
  const bottomOffset = insets.bottom;
  const barBodyHeight = BAR_HEIGHT + bottomOffset;
  const buttonRadius = FLOATING_BUTTON_SIZE / 2;
  const floatingButtonLift = buttonRadius + QR_BUTTON_GAP;
  const barPaddingTop = Math.max(buttonRadius - (WEDGE_DEPTH - QR_BUTTON_GAP), 0);

  const translateY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [barWidth, setBarWidth] = useState(0);

  const barTotalHeight = barBodyHeight;
  const hiddenOffset = barTotalHeight + floatingButtonLift;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: hidden ? hiddenOffset : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: hidden ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, hidden, hiddenOffset, translateY]);

  const containerPointerEvents: ViewProps["pointerEvents"] = hidden
    ? "none"
    : "box-none";

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

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setBarWidth((prev) => (Math.abs(prev - width) < 0.5 ? prev : width));
  }, []);

  const barPath = useMemo(() => {
    if (!barWidth) {
      return "";
    }

    const width = barWidth;
    const radius = CORNER_RADIUS;
    const topY = 0;
    const bottomY = barBodyHeight;

    const availableWidth = Math.max(0, width - 2 * (radius + 24));
    const wedgeWidth = Math.min(WEDGE_WIDTH, availableWidth);
    const wedgeHalf = wedgeWidth / 2;
    const wedgeDepth = Math.min(WEDGE_DEPTH, BAR_HEIGHT);

    const centerX = width / 2;
    const wedgeStart = centerX - wedgeHalf;
    const wedgeEnd = centerX + wedgeHalf;
    const curveBottomY = Math.min(
      bottomY - buttonRadius - QR_BUTTON_GAP,
      topY + wedgeDepth
    );
    const curveStrength = Math.min(Math.max(WEDGE_CURVE_TENSION, 0.05), 0.9);//กำหนดให้ด้านค้าง ซ้ายขาวโค้งได้สวยมากขึ้น
    const cpOffsetX = wedgeHalf * curveStrength;
    const controlDrop = Math.min(
      wedgeDepth * Math.min(Math.max(WEDGE_BOTTOM_EASE, 0), 1),
      32
    );
    const lowerCpY = Math.min(curveBottomY + controlDrop, bottomY - 8);
    const cpStart = Math.max(radius, wedgeStart);
    const cpEnd = Math.min(wedgeEnd, width - radius);
    const leftFirstCtrlX = cpStart + cpOffsetX * 0.4;
    const rightSecondCtrlX = cpEnd - cpOffsetX * 0.4;

    return [
      `M${radius},${topY}`,
      `H${cpStart}`,
      `C${leftFirstCtrlX},${topY} ${centerX - cpOffsetX},${lowerCpY} ${centerX},${curveBottomY}`,
      `C${centerX + cpOffsetX},${lowerCpY} ${rightSecondCtrlX},${topY} ${cpEnd},${topY}`,
      `H${width - radius}`,
      `Q${width},${topY} ${width},${topY + radius}`,
      `V${bottomY - radius}`,
      `Q${width},${bottomY} ${width - radius},${bottomY}`,
      `H${radius}`,
      `Q0,${bottomY} 0,${bottomY - radius}`,
      `V${topY + radius}`,
      `Q0,${topY} ${radius},${topY}`,
      "Z",
    ].join(" ");
  }, [
    BAR_HEIGHT,
    CORNER_RADIUS,
    QR_BUTTON_GAP,
    WEDGE_CURVE_TENSION,
    WEDGE_BOTTOM_EASE,
    WEDGE_DEPTH,
    WEDGE_WIDTH,
    barBodyHeight,
    barWidth,
    buttonRadius,
  ]);

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
        onPress={() => onTabPress(tab.id)}
        className="items-center justify-center flex-1 py-2"
      >
        <Ionicons
          name={isActive ? tab.activeIcon : tab.icon}
          size={24}
          color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
        <Text
          className={`text-xs mt-1 ${
            isActive ? "text-[#4EBB82] font-semibold" : "text-[#111C3F]"
          }`}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View
      pointerEvents={containerPointerEvents}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -bottomOffset,
        paddingHorizontal: horizontalPadding,
        paddingTop: barPaddingTop,
        opacity: fadeAnim,
        transform: [{ translateY }],
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
          overflow: "visible",
        }}
      >
        <View
          style={{ height: barTotalHeight, width: "100%" }}
          onLayout={handleLayout}
        >
          {barWidth > 0 && barPath && (
            <Svg
              pointerEvents="none"
              width={barWidth}
              height={barTotalHeight}
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              <Path d={barPath} fill={CARD_BACKGROUND} />
              <Path
                d={barPath}
                fill="none"
                stroke={CARD_BORDER_COLOR}
                strokeWidth={CARD_BORDER_WIDTH}
              />
            </Svg>
          )}

        <View
          className="flex-row items-end justify-between px-6"
          style={{
            height: barTotalHeight,
            paddingTop: 20,
            paddingBottom: bottomOffset + 8,
          }}
        >
            {tabs.map(renderTabButton)}
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={onQRPress}//การตั้งค่าปุ่ม qr
          activeOpacity={0.9}
          disabled={!onQRPress}
          style={{
            position: "absolute",
            top: -floatingButtonLift,
            left: "50%",
            marginLeft: -FLOATING_BUTTON_SIZE / 2,
            width: FLOATING_BUTTON_SIZE,
            height: FLOATING_BUTTON_SIZE,
            borderRadius: FLOATING_BUTTON_SIZE / 2,
            borderWidth: 2,//ขนาดของเส้นขอบ
            borderColor: "#FFFFFF",//สีของเส้นขอบ
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#1D2144",
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.3,
            shadowRadius: 1,
            elevation: 16,
            zIndex: 50,
            opacity: onQRPress ? 1 : 0.85,
            backgroundColor: "#EFF0F2",//สีพื้นหลัง
          }}//สีของไอคอล Ionions
        > 
          <Ionicons name="qr-code-outline" size={36} color="#1D2144"  /> 
        </TouchableOpacity> 
      </View>
    </Animated.View>
  );
}
