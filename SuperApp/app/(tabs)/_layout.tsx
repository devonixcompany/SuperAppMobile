// นำเข้า Tabs และ useRouter จาก expo-router สำหรับจัดการการนำทางแบบ tab
import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// นำเข้า component BottomNavigation ที่เราสร้างเองสำหรับแสดงแถบเมนูด้านล่าง
import BottomNavigation from "../../components/ui/bottom-navigation";

// กำหนดค่าคงที่สำหรับ padding ซ้าย-ขวา ของหน้าต่างๆ ในแท็บ
export const TABS_HORIZONTAL_GUTTER = 20;

type RouteAppBarState = {
  leftAvatar?: ImageSourcePropType;
  onLeftPress?: () => void;
  rightActions?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress?: () => void;
    loading?: boolean;
    disabled?: boolean;
    color?: string;
    backgroundColor?: string;
  }[];
};

type AppBarContextValue = {
  routeActions: Record<string, RouteAppBarState | undefined>;
  setRouteActions: (routeName: string, actions?: RouteAppBarState) => void;
};

const AppBarActionsContext = React.createContext<AppBarContextValue>({
  routeActions: {},
  setRouteActions: () => { },
});

type AppBarConfig = {
  title: string;
  rightActions?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress?: () => void;
    loading?: boolean;
    disabled?: boolean;
    color?: string;
    backgroundColor?: string;
  }[];
};

const APP_BAR_CONFIG: Record<string, AppBarConfig> = {
  home: { title: "หน้าหลัก" },
  charging: { title: "ค้นหาสถานีชาร์จ" },
  card: { title: "บัตร" },
  settings: { title: "ตั้งค่า" },
};

const AppBar = ({
  config,
  actions,
}: {
  config: AppBarConfig;
  actions?: RouteAppBarState;
}) => {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 12);
  const rightActions = actions?.rightActions ?? config.rightActions;
  const hasAvatar = Boolean(actions?.leftAvatar);

  return (
    <View style={styles.appBarContainer}>
      <View style={{ height: topPadding }} />
      <View style={styles.appBarContent}>
        <View style={styles.appBarSide}>
          {hasAvatar ? (
            <Pressable
              onPress={actions?.onLeftPress}
              style={styles.avatarButton}
              hitSlop={8}
            >
              <Image source={actions?.leftAvatar} style={styles.avatarImage} />
            </Pressable>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
        </View>
        <Text style={styles.appBarTitle} numberOfLines={1}>
          {config.title}
        </Text>
        <View style={styles.appBarSide}>
          {rightActions?.map((action, index) => {
            if (action.loading) {
              return (
                <View
                  key={`${action.icon}-${index}`}
                  style={[
                    styles.iconButton,
                    action.backgroundColor && { backgroundColor: action.backgroundColor },
                  ]}
                >
                  <ActivityIndicator size="small" color="#6B7280" />
                </View>
              );
            }

            return (
              <Pressable
                key={`${action.icon}-${index}`}
                onPress={action.onPress}
                style={[
                  styles.iconButton,
                  action.backgroundColor && { backgroundColor: action.backgroundColor },
                  action.disabled && styles.iconButtonDisabled,
                ]}
                disabled={action.disabled}
                hitSlop={8}
              >
                <Ionicons
                  name={action.icon}
                  size={20}
                  color={action.color ?? "#111827"}
                />
              </Pressable>
            );
          }) || <View style={styles.iconPlaceholder} />}
        </View>
      </View>
    </View>
  );
};

// ฟังก์ชันหลักสำหรับจัดการ layout ของ tabs ทั้งหมด
export default function TabLayout() {
  // ใช้ router สำหรับการนำทางไปหน้าต่างๆ
  const router = useRouter();
  const pathname = usePathname();
  const isQRScannerRoute = pathname?.includes("qr-scanner");
  const isSettingsSubRoute = pathname?.startsWith("/settings/");
  const [routeActions, setRouteActionsState] = React.useState<
    Record<string, RouteAppBarState | undefined>
  >({});

  const setRouteActions = React.useCallback(
    (routeName: string, actions?: RouteAppBarState) => {
      setRouteActionsState((prev) => ({ ...prev, [routeName]: actions }));
    },
    [],
  );

  // ปรับค่า flex ของแต่ละ tab ได้จาก object นี้
  const tabSegmentFlex = {
    home: 1.6,
    charging: 0.9,
    qr: 2.0,
    card: 0.9,
    settings: 1.6,
  };

  return (
    <AppBarActionsContext.Provider value={{ routeActions, setRouteActions }}>
      {/* Tabs component จาก expo-router ใช้สำหรับจัดการหน้าต่างๆ แบบ tab */}
      <Tabs
        // ตั้งค่าพื้นฐานสำหรับทุก screen ใน tabs
        screenOptions={({ route }) => ({
          headerShown: !isQRScannerRoute && !isSettingsSubRoute, // แสดง AppBar เฉพาะหน้าที่ไม่ใช่ QR และไม่ใช่หน้าย่อยของ Settings
          header: () => (
            <AppBar
              config={APP_BAR_CONFIG[route.name] ?? APP_BAR_CONFIG.home}
              actions={routeActions[route.name]}
            />
          ),
          headerStyle: styles.appBarWrapper,
          tabBarStyle: { display: "none" }, // ซ่อน tab bar เริ่มต้นของ expo-router เพราะเราจะใช้ของเราเอง
        })}
        // กำหนด custom tab bar แทน tab bar เริ่มต้น
        tabBar={(props) => (
          // ใช้ BottomNavigation component ที่เราสร้างเอง
          <BottomNavigation
            // ส่งชื่อ tab ที่กำลังใช้งานอยู่ โดยดึงจาก state.index (ลำดับปัจจุบัน)
            activeTab={props.state.routeNames[props.state.index]}
            hidden={Boolean(isQRScannerRoute)}
            segmentFlexOverrides={tabSegmentFlex}
            // ฟังก์ชันที่ทำงานเมื่อกดที่ tab ใดๆ
            onTabPress={(tab) => {
              // หาลำดับของ tab ที่ถูกกดจากชื่อ tab
              const routeIndex = props.state.routeNames.findIndex(
                (name) => name === tab,
              );
              // ถ้าพบ tab ที่ต้องการ (index ไม่เท่ากับ -1)
              if (routeIndex !== -1) {
                // นำทางไปยัง tab นั้น
                props.navigation.navigate(props.state.routeNames[routeIndex]);
              }
            }}
            // ฟังก์ชันที่ทำงานเมื่อกดปุ่ม QR Scanner
            onQRPress={() => {
              // นำทางไปหน้า qr-scanner
              router.push("/qr-scanner");
            }}
          />
        )}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="charging" />
        <Tabs.Screen name="card" />
        <Tabs.Screen name="settings" />
      </Tabs>
    </AppBarActionsContext.Provider>
  );
}

export const useAppBarActions = (
  routeName: string,
  actions: RouteAppBarState | undefined,
) => {
  const { setRouteActions } = React.useContext(AppBarActionsContext);

  React.useEffect(() => {
    setRouteActions(routeName, actions);
    return () => setRouteActions(routeName, undefined);
  }, [actions, routeName, setRouteActions]);
};

const styles = StyleSheet.create({
  appBarWrapper: {
    backgroundColor: "#EFF0F2",
  },
  appBarContainer: {
    backgroundColor: "#D9DEED80", //สีพื้นหลังของ App Bar เปลี่ยนตรงนี้
    borderBottomColor: "#D9DEED",//สีเส้นของ App Bar
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: TABS_HORIZONTAL_GUTTER,
    paddingVertical: 12,
  },
  appBarSide: {
    minWidth: 32,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  appBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  iconPlaceholder: {
    width: 32,
    height: 32,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#4EBB8E",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
});
