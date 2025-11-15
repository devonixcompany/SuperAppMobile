import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, Dimensions, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChargingStation } from "../../../../types/charging.types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.7;

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
  const insets = useSafeAreaInsets();

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
    >
      <TouchableOpacity
        style={styles.bottomSheetHandle}
        {...bottomSheetPanResponder.panHandlers}
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        automaticallyAdjustContentInsets={false}
      >
        <StationHeader station={station} />
        <StationDetails station={station} distanceInfo={distanceInfo} />
        <NavigateButton onNavigate={onNavigate} />
      </ScrollView>
    </Animated.View>
  );
}

function StationHeader({ station }: { station: ChargingStation }) {
  const total = station.totalCount ?? 0;
  const available = station.availableCount ?? 0;
  let statusColor = '#6b7280';
  let statusText = 'ไม่ทราบสถานะ';
  if (total > 0) {
    if (available === 0) {
      statusColor = '#ef4444';
      statusText = 'ไม่ว่าง';
    } else if (available === total) {
      statusColor = '#10b981';
      statusText = 'หัวว่างทั้งหมด';
    } else {
      statusColor = '#f59e0b';
      statusText = 'บางหัวว่าง';
    }
  } else {
    statusColor = available > 0 ? '#10b981' : '#f59e0b';
    statusText = available > 0 ? 'หัวว่าง' : 'ไม่ว่าง';
  }
  return (
    <View style={styles.stationHeader}>
      <View style={styles.stationIconContainer}>
        <Ionicons name="flash" size={24} color="#10b981" />
      </View>
      <View style={styles.stationInfo}>
        <Text style={styles.stationName}>{station.name}</Text>
        <Text style={styles.stationAddress}>{station.address}</Text>
      </View>
      <View style={[styles.statusBadge, { borderColor: statusColor, backgroundColor: `${statusColor}20` }] }>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
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
  return (
    <View style={styles.stationDetails}>
      <View style={styles.detailRow}>
        <Ionicons name="navigate" size={16} color="#10b981" style={{ marginRight: 8 }} />
        <Text style={styles.detailLabel}>
          {distanceInfo.distanceText} ({distanceInfo.durationText})
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="time-outline" size={16} color="#10b981" style={{ marginRight: 8 }} />
        <Text style={styles.detailLabel}>
          เปิด {station.openTime} - {station.closeTime} น.
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="flash-outline" size={16} color="#10b981" style={{ marginRight: 8 }} />
        <Text style={styles.detailLabel}>ประเภทหัวจ่าย:</Text>
        <View style={styles.connectorTypes}>
          {station.acCount ? (
            <View style={styles.connectorBadge}>
              <Ionicons name="flash-outline" size={14} color="#10b981" />
              <Text style={styles.connectorText}>AC x{station.acCount}</Text>
            </View>
          ) : null}
          {station.dcCount ? (
            <View style={styles.connectorBadge}>
              <Ionicons name="flash" size={14} color="#f59e0b" />
              <Text style={[styles.connectorText, { color: '#f59e0b' }]}>DC x{station.dcCount}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {station.connectors && station.connectors.length > 0 && (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { marginRight: 8 }]}>สถานะหัว:</Text>
          <View style={styles.connectorDetailTypes}>
            {station.connectors.map((c, idx) => {
              const isAvailable = c.connectorstatus === 'AVAILABLE';
              const isFault = c.connectorstatus === 'FAULTED' || c.connectorstatus === 'UNAVAILABLE';
              const color = isAvailable ? '#10b981' : isFault ? '#ef4444' : '#f59e0b';
              return (
                <View key={`${c.connectorId}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${color}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8, marginBottom: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginRight: 6 }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color }}>{`#${c.connectorId} ${c.type}`}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.detailRow}>
        {(() => {
          const total = station.totalCount ?? 0;
          const available = station.availableCount ?? 0;
          let iconColor = '#6b7280';
          let text = 'ไม่ทราบสถานะ';
          if (total > 0) {
            if (available === 0) {
              iconColor = '#ef4444';
              text = 'ไม่ว่าง';
            } else if (available === total) {
              iconColor = '#10b981';
              text = 'หัวว่างทั้งหมด';
            } else {
              iconColor = '#f59e0b';
              text = 'บางหัวว่าง';
            }
          } else {
            iconColor = available > 0 ? '#10b981' : '#f59e0b';
            text = available > 0 ? 'หัวว่าง' : 'ไม่ว่าง';
          }
          return (
            <>
              <Ionicons name={available > 0 ? 'checkmark-circle' : 'close-circle'} size={16} color={iconColor} style={{ marginRight: 8 }} />
              <Text style={styles.detailLabel}>{text}</Text>
            </>
          );
        })()}
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="speedometer-outline" size={16} color="#10b981" style={{ marginRight: 8 }} />
        <Text style={styles.detailLabel}>กำลังไฟ: {station.power}</Text>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="cash-outline" size={16} color="#10b981" style={{ marginRight: 8 }} />
        <Text style={styles.detailLabel}>ราคา: {station.pricePerUnit?.toFixed(2)} บาท/kWh</Text>
      </View>
    </View>
  );
}

// Removed non-essential sections

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
    fontSize: 16, // reduced from 18
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  stationAddress: {
    fontSize: 13, // reduced from 14
    color: "#6b7280",
    lineHeight: 18, // reduced from 20
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
    fontSize: 13, // reduced from 14
    color: "#4b5563",
  },
  detailSubLabel: {
    fontSize: 12, // reduced from 13
    color: "#6b7280",
    marginLeft: 24,
  },
  connectorTypes: {
    flexDirection: "row",
    marginLeft: 8,
    gap: 8,
  },
  connectorDetailTypes: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
  },
  connectorTypeText: {
    fontSize: 12, // reduced from 13
    color: "#059669",
    fontWeight: "500",
  },
  pricingContainer: {
    flexDirection: "column",
    gap: 2,
  },
  priceText: {
    fontSize: 12, // reduced from 13
    color: "#059669",
    fontWeight: "600",
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
    fontSize: 11, // reduced from 12
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
    fontSize: 13, // reduced from 14
    color: "#4b5563",
  },
  additionalInfo: {
    marginBottom: 20,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14, // reduced from 16
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11, // reduced from 12
    fontWeight: '600',
  },
  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  amenityText: {
    fontSize: 13, // reduced from 14
    color: "#10b981",
  },
  descriptionText: {
    fontSize: 13, // reduced from 14
    color: "#4b5563",
    lineHeight: 18, // reduced from 20
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
    fontSize: 14, // reduced from 16
    fontWeight: "600",
  },
});
