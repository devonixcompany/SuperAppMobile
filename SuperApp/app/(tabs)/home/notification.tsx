import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  GestureResponderEvent,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  isUnread?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
};

type NotificationModalProps = {
  visible: boolean;
  onClose: (event?: GestureResponderEvent) => void;
};

const notifications: NotificationItem[] = [
  {
    id: "1",
    title: "โปรโมชั่นพิเศษ",
    description: "รับส่วนลด 10% เมื่อชาร์จที่สถานีในเครือ PONIX ภายในเดือนนี้",
    timestamp: "5 นาทีที่ผ่านมา",
    isUnread: true,
    icon: "sparkles-outline",
    accent: "#38BDF8",
  },
  {
    id: "2",
    title: "การชาร์จสำเร็จ",
    description: "การชาร์จรถของคุณที่ PONIX Central สามารถใช้งานได้แล้ว",
    timestamp: "2 ชั่วโมงที่ผ่านมา",
    icon: "flash-outline",
    accent: "#34D399",
  },
  {
    id: "3",
    title: "คะแนนสะสม",
    description: "คุณได้รับ 50 PONIX Point จากการชาร์จครั้งล่าสุด",
    timestamp: "เมื่อวานนี้",
    icon: "trophy-outline",
    accent: "#FBBF24",
  },
];

export default function NotificationModal({
  visible,
  onClose,
}: NotificationModalProps) {
  const [internalVisible, setInternalVisible] = useState(visible);
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      scale.setValue(0.9);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          damping: 16,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (internalVisible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 160,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setInternalVisible(false);
      });
    }
  }, [internalVisible, opacity, scale, visible]);

  return (
    <Modal
      animationType="none"
      transparent
      visible={internalVisible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center">
        <TouchableOpacity
          className="absolute inset-0"
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          className="mx-5"
          style={{
            alignSelf: "stretch",
            opacity,
            transform: [{ scale }],
          }}
        >
          <View className="w-full rounded-[32px] bg-[#F3F6FB] border border-[#E2E8F0] p-6 shadow-2xl shadow-black/20">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="items-center justify-center mr-3 border rounded-full w-11 h-11 border-[#CBD5E1]">
                    <Ionicons name="notifications-outline" size={20} color="#1D2144" />
                  </View>
                  <View>
                    <Text className="text-lg font-semibold text-[#1F2937]">
                      การแจ้งเตือน
                    </Text>
                    <Text className="mt-1 text-xs text-[#64748B]">
                      อัปเดตล่าสุดสำหรับคุณ
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={12}
                  className="items-center justify-center border rounded-full w-9 h-9 border-[#CBD5E1]"
                >
                  <Ionicons name="close" size={18} color="#1D2144" />
                </TouchableOpacity>
              </View>

              <View className="mt-6 overflow-hidden border border-[#E2E8F0] rounded-3xl bg-white max-h-[420px]">
                <FlatList
                  data={notifications}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                  ItemSeparatorComponent={() => <View className="h-3" />}
                  renderItem={({ item }) => (
                    <View className="flex-row items-start px-4 py-3 border rounded-2xl border-[#E2E8F0] bg-white">
                      <View
                        className="items-center justify-center w-10 h-10 mr-3 rounded-full"
                        style={{ backgroundColor: `${item.accent}1A` }}
                      >
                        <Ionicons name={item.icon} size={20} color={item.accent} />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className="flex-1 text-sm font-semibold text-[#1F2937]">
                            {item.title}
                          </Text>
                          {item.isUnread ? (
                            <View className="px-2 py-[1px] rounded-full border border-[#CBD5E1] bg-[#F1F5F9]">
                              <Text className="text-[9px] font-semibold text-[#1F2937] tracking-[0.24em] uppercase">
                                New
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className="mt-1 text-xs leading-5 text-[#475569]">
                          {item.description}
                        </Text>
                        <View className="flex-row items-center mt-2">
                          <View className="w-1 h-1 mr-2 rounded-full bg-[#CBD5F5]" />
                          <Text className="text-[11px] text-[#94A3B8]">
                            {item.timestamp}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text className="text-sm text-center text-[#64748B]">
                      ยังไม่มีการแจ้งเตือน
                    </Text>
                  }
                />
              </View>

              <TouchableOpacity className="self-center px-5 py-2 mt-6 border rounded-full border-[#CBD5E1] bg-white">
                <Text className="text-sm font-medium text-[#1F2937]">
                  ดูการแจ้งเตือนทั้งหมด
                </Text>
              </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
