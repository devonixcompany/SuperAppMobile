import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface BottomNavigationProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
  onQRPress?: () => void;
}

export default function BottomNavigation({
  activeTab,
  onTabPress,
  onQRPress,
}: BottomNavigationProps) {
  const tabs = [
    { id: "home", icon: "home-outline", activeIcon: "home", label: "บ้าน" },
    {
      id: "charging",
      icon: "flash-outline",
      activeIcon: "flash",
      label: "เครื่องชาร์จ",
    },
    { id: "qr", icon: "qr-code-outline", activeIcon: "qr-code", label: "" }, // QR button (will be floating)
    { id: "card", icon: "card-outline", activeIcon: "card", label: "บัตร" },
    {
      id: "settings",
      icon: "settings-outline",
      activeIcon: "settings",
      label: "ตั้งค่า",
    },
  ];

  const renderTabButton = (tab: any, index: number) => {
    const isActive = activeTab === tab.id;
    const isQRButton = tab.id === "qr";

    if (isQRButton) {
      return (
        <View
          key={tab.id}
          className="flex-1 items-center justify-center relative"
        >
          {/* Floating QR Button */}
          <TouchableOpacity
            onPress={onQRPress}
            className="absolute -top-6 w-14 h-14 bg-gradient-to-r from-[#1F274B] to-[#5EC1A0] rounded-full items-center justify-center shadow-lg"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Ionicons name="qr-code-outline" size={28} color="white" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={tab.id}
        onPress={() => onTabPress(tab.id)}
        className="flex-1 items-center justify-center py-2"
      >
        <Ionicons
          name={isActive ? tab.activeIcon : tab.icon}
          size={24}
          color={isActive ? "#51BC8E" : "#9CA3AF"}
        />
        <Text
          className={`text-xs mt-1 ${
            isActive ? "text-[#51BC8E] font-semibold" : "text-[#9CA3AF]"
          }`}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="bg-white border-t border-gray-200 px-4 pb-2 pt-2">
      <View className="flex-row items-center justify-around">
        {tabs.map((tab, index) => renderTabButton(tab, index))}
      </View>
    </View>
  );
}
