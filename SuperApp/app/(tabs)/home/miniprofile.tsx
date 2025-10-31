import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Image,
  ImageSourcePropType,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type MiniProfileModalProps = {
  visible: boolean;
  onClose: (event?: GestureResponderEvent) => void;
  name?: string;
  avatarSource?: ImageSourcePropType;
  onSettings?: () => void;
  onChangeName?: (name: string) => void;
  onChangeAvatar?: (source: ImageSourcePropType) => void;
};

export const DEFAULT_PROFILE_AVATAR = require("../../../assets/img/eeponix.png");

const AVATAR_PRESETS: ImageSourcePropType[] = [
  require("../../../assets/img/eeponix.png"),
  require("../../../assets/img/eeponix2.png"),
];

export default function MiniProfileModal({
  visible,
  onClose,
  name = "PONIX Member",
  avatarSource = DEFAULT_PROFILE_AVATAR,
  onSettings,
  onChangeName,
  onChangeAvatar,
}: MiniProfileModalProps) {
  const [internalVisible, setInternalVisible] = useState(visible);
  const [displayName, setDisplayName] = useState(name);
  const [selectedAvatar, setSelectedAvatar] =
    useState<ImageSourcePropType>(avatarSource);
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      scale.setValue(0.95);
      opacity.setValue(0);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          damping: 18,
          stiffness: 140,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (internalVisible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setInternalVisible(false);
      });
    }
  }, [backdropOpacity, internalVisible, opacity, scale, visible]);

  useEffect(() => {
    setDisplayName(name);
    setSelectedAvatar(avatarSource || DEFAULT_PROFILE_AVATAR);
  }, [avatarSource, name]);

  const handleConfirm = () => {
    const trimmedName = displayName.trim();
    const finalName = trimmedName.length ? trimmedName : name;
    const finalAvatar = selectedAvatar || DEFAULT_PROFILE_AVATAR;

    onChangeName?.(finalName);
    onChangeAvatar?.(finalAvatar);
    onClose();
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelectedAvatar({ uri: asset.uri });
    }
  };

  const isActivePreset = (source: ImageSourcePropType) => {
    const selected = Image.resolveAssetSource(selectedAvatar);
    const option = Image.resolveAssetSource(source);
    return selected?.uri === option?.uri;
  };

  return (
    <Modal
      animationType="none"
      transparent
      visible={internalVisible}
      onRequestClose={onClose}
    >
      <Animated.View
        className="justify-center flex-1 bg-black/45"
        style={{ opacity: backdropOpacity }}
      >
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
          <View className="w-full rounded-[28px] bg-[#F3F6FB] border border-[#E2E8F0] p-6 shadow-2xl shadow-black/20">
            <LinearGradient
              colors={["#F9FBFF", "#EEF2F8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-[22px] p-5"
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-base font-semibold text-[#1F2937]">
                    โปรไฟล์ของคุณ
                  </Text>
                  <Text className="mt-1 text-xs text-[#64748B]">
                    ปรับข้อมูลได้ทุกเมื่อ
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={12}
                  className="items-center justify-center border border-[#CBD5E1] rounded-full w-9 h-9"
                >
                  <Ionicons name="close" size={18} color="#1D2144" />
                </TouchableOpacity>
              </View>

              <View className="items-center mt-6">
                <Image
                  source={selectedAvatar}
                  className="w-20 h-20 border border-white rounded-full shadow"
                />
                <Text className="mt-4 text-sm font-medium text-[#94A3B8]">
                  แก้ไขชื่อที่ต้องการให้แสดง
                </Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="กรอกชื่อของคุณ"
                  placeholderTextColor="#94A3B8"
                  className="mt-3 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-base text-[#1F2937]"
                />
                <Text className="mt-4 text-sm font-medium text-[#94A3B8]">
                  เลือกรูปโปรไฟล์
                </Text>
                <View className="flex-row justify-center w-full mt-5 space-x-8">
                  {AVATAR_PRESETS.map((source, index) => {
                    const active = isActivePreset(source);
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setSelectedAvatar(source)}
                        activeOpacity={0.85}
                        className={`w-14 h-14 rounded-full overflow-hidden border ${
                          active ? "border-[#4EBB8E] border-2" : "border-[#E2E8F0]"
                        }`}
                      >
                        <Image source={source} className="w-full h-full" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  onPress={handlePickImage}
                  className="flex-row items-center px-4 py-2 mt-4 rounded-full border border-[#CBD5E1] bg-white"
                >
                  <Ionicons name="image-outline" size={18} color="#1D2144" />
                  <Text className="ml-2 text-sm font-medium text-[#1F2937]">
                    เลือกรูปจากเครื่อง
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleConfirm}
                className="flex-row items-center justify-center px-5 py-3 mt-6 rounded-full bg-[#4EBB8E]"
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text className="ml-2 text-sm font-medium text-white">
                  บันทึกการเปลี่ยนแปลง
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSettings}
                className="flex-row items-center justify-center px-5 py-3 mt-3 rounded-full border border-[#CBD5E1] bg-white"
              >
                <Ionicons name="settings-outline" size={18} color="#1D2144" />
                <Text className="ml-2 text-sm font-medium text-[#1F2937]">
                  ตั้งค่าเพิ่มเติม
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
