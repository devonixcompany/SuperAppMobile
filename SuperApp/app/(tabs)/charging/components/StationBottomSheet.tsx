import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Dimensions, PanResponder, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, Animated } from "react-native";
import { ChargingStation } from "../../../../types/charging.types";
import ChargingStationService from "../ChargingStationService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.4;

interface StationBottomSheetProps {
  station: ChargingStation;
  onClose: () => void;
  onNavigate: () => void;
  distanceInfo: {
    distance: number;
    distanceText: string;
    duration: number;
    durationText: string;
  };
  bottomSheetAnimation: any; // Animated.Value
}

export default function StationBottomSheet({
  station,
  onClose,
  onNavigate,
  distanceInfo,
  bottomSheetAnimation,
}: StationBottomSheetProps) {
  const service = ChargingStationService.getInstance();

  const bottomSheetPanResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return (
        Math.abs(gestureState.dy) > 10 &&
        Math.abs(gestureState.dx) < 30 &&
        gestureState.dy > 0
      );
    },
    onPanResponderRelease: (_, gestureState) => {
      if (
        gestureState.dy > 50 ||
        (gestureState.dy > 30 && gestureState.vy > 0.2)
      ) {
        Animated.timing(bottomSheetAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          onClose();
        });
      }
    },
    onPanResponderTerminationRequest: () => true,
  });

  return (
    <Animated.View
      style={[
        styles.bottomSheet,
        {
          transform: [
            {
              translateY: bottomSheetAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [BOTTOM_SHEET_MAX_HEIGHT, 0],
              }),
            },
          ],
        },
      ]}
      {...bottomSheetPanResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.bottomSheetHandle}
        onPress={() => {
          console.log('Bottom sheet handle pressed');
          onClose();
        }}
        onLongPress={() => {
          console.log('Bottom sheet handle long pressed');
          onClose();
        }}
        activeOpacity={0.6}
        hitSlop={{ top: 20, bottom: 20, left: 40, right: 40 }}
      >
        <View style={styles.handle} />
      </TouchableOpacity>

      <ScrollView
        style={styles.bottomSheetContent}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        automaticallyAdjustContentInsets={false}
      >
        <StationHeader station={station} />
        <StationDetails station={station} distanceInfo={distanceInfo} />
        <StationAmenities />
        <StationDescription />
        <NavigateButton onNavigate={onNavigate} />
      </ScrollView>
    </Animated.View>
  );
}

function StationHeader({ station }: { station: ChargingStation }) {
  return (
    <View style={styles.stationHeader}>
      <View style={styles.stationIconContainer}>
        <Ionicons name="flash" size={24} color="#10b981" />
      </View>
      <View style={styles.stationInfo}>
        <Text style={styles.stationName}>{station.name}</Text>
        <Text style={styles.stationAddress}>{station.address}</Text>
      </View>
    </View>
  );
}

function StationDetails({
  station,
  distanceInfo,
}: {
  station: ChargingStation;
  distanceInfo: {
    distance: number;
    distanceText: string;
    duration: number;
    durationText: string;
  };
}) {
  const service = ChargingStationService.getInstance();

  return (
    <View style={styles.stationDetails}>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          เปิด {station.openTime} - {station.closeTime} น.
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>ประเภทหัวจ่าย :</Text>
        <View style={styles.connectorTypes}>
          {station.acCount && (
            <View style={styles.connectorBadge}>
              <Ionicons name="flash-outline" size={14} color="#10b981" />
              <Text style={styles.connectorText}>AC</Text>
            </View>
          )}
          {station.dcCount && (
            <View style={styles.connectorBadge}>
              <Ionicons name="flash" size={14} color="#10b981" />
              <Text style={styles.connectorText}>DC</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>กำลังไฟ: {station.power}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          ราคาต่อหน่วย: {station.pricePerUnit}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="navigate" size={20} color="#10b981" />
          <Text style={styles.statValue}>
            {distanceInfo.distanceText} ({distanceInfo.durationText})
          </Text>
        </View>
      </View>
    </View>
  );
}

function StationAmenities() {
  return (
    <View style={styles.additionalInfo}>
      <Text style={styles.sectionTitle}>บริการเสริม</Text>
      <View style={styles.amenityRow}>
        <Ionicons name="wifi" size={16} color="#10b981" />
        <Text style={styles.amenityText}>WiFi ฟรี</Text>
      </View>
      <View style={styles.amenityRow}>
        <Ionicons name="cafe" size={16} color="#10b981" />
        <Text style={styles.amenityText}>คาเฟ่</Text>
      </View>
      <View style={styles.amenityRow}>
        <Ionicons name="car" size={16} color="#10b981" />
        <Text style={styles.amenityText}>ที่จอดรถ 10 คัน</Text>
      </View>
    </View>
  );
}

function StationDescription() {
  return (
    <View style={styles.additionalInfo}>
      <Text style={styles.sectionTitle}>ข้อมูลสถานี</Text>
      <Text style={styles.descriptionText}>
        สถานีชาร์จรถยนต์ไฟฟ้าแห่งนี้ตั้งอยู่ในทำเลที่สะดวกสบาย
        มีอุปกรณ์ชาร์จครบครันทั้งแบบ AC และ DC
        รองรับรถยนต์ไฟฟ้าทุกรุ่น เปิดให้บริการทุกวัน
        มีพนักงานคอยดูแลและให้คำแนะนำ พร้อมบริการเสริมต่างๆ
        เพื่อความสะดวกสบายของผู้ใช้งาน
      </Text>
    </View>
  );
}

function NavigateButton({ onNavigate }: { onNavigate: () => void }) {
  return (
    <TouchableOpacity style={styles.navigateButton} onPress={onNavigate}>
      <Ionicons name="navigate" size={20} color="white" />
      <Text style={styles.navigateButtonText}>นำทาง</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    height: BOTTOM_SHEET_MAX_HEIGHT,
  },
  bottomSheetHandle: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    minHeight: 60,
  },
  handle: {
    width: 50,
    height: 6,
    backgroundColor: "#d1d5db",
    borderRadius: 3,
  },
  bottomSheetContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  stationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  stationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#d1fae5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  stationAddress: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  stationDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  detailLabel: {
    fontSize: 14,
    color: "#4b5563",
  },
  connectorTypes: {
    flexDirection: "row",
    marginLeft: 8,
    gap: 8,
  },
  connectorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  connectorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
  },
  statsContainer: {
    marginTop: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 14,
    color: "#4b5563",
  },
  additionalInfo: {
    marginBottom: 20,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  amenityText: {
    fontSize: 14,
    color: "#10b981",
  },
  descriptionText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  navigateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  navigateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});