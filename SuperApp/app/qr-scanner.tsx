import { Ionicons } from "@expo/vector-icons";
import { BarCodeScanner, BarCodeScannerResult } from "expo-barcode-scanner";
import { Camera, CameraView } from "expo-camera";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: BarCodeScannerResult) => {
    if (!scanned) {
      setScanned(true);
      Alert.alert("QR Code สแกนสำเร็จ", `ข้อมูล: ${data}`, [
        {
          text: "สแกนอีกครั้ง",
          onPress: () => setScanned(false),
        },
        {
          text: "ปิด",
          onPress: () => router.back(),
          style: "cancel",
        },
      ]);
    }
  };

  const toggleTorch = () => {
    setTorchEnabled(!torchEnabled);
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <Text className="text-white text-lg">กำลังขออนุญาตใช้กล้อง...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-6">
        <Ionicons name="camera-off" size={64} color="white" />
        <Text className="text-white text-xl font-semibold mt-4 text-center">
          ไม่สามารถเข้าถึงกล้องได้
        </Text>
        <Text className="text-white/70 text-center mt-2 mb-6">
          กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่า
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-[#51BC8E] rounded-xl py-4 px-8"
        >
          <Text className="text-white text-lg font-semibold">กลับ</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row items-center justify-between p-6 z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
        >
          <Ionicons name="close-outline" size={24} color="white" />
        </TouchableOpacity>

        <Text className="text-white text-lg font-semibold">สแกน QR Code</Text>

        <TouchableOpacity
          onPress={toggleTorch}
          className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
        >
          <Ionicons
            name={torchEnabled ? "flash" : "flash-outline"}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <View className="flex-1">
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          enableTorch={torchEnabled}
        >
          {/* Scanner Overlay */}
          <View className="flex-1 items-center justify-center">
            {/* Scanner Frame */}
            <View className="relative">
              <View className="w-64 h-64 border-2 border-white/50 rounded-2xl">
                {/* Corner indicators */}
                <View className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-[#51BC8E] rounded-tl-lg" />
                <View className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-[#51BC8E] rounded-tr-lg" />
                <View className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-[#51BC8E] rounded-bl-lg" />
                <View className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-[#51BC8E] rounded-br-lg" />
              </View>
            </View>

            {/* Instructions */}
            <View className="mt-8 items-center bg-black/50 px-6 py-4 rounded-2xl">
              <Text className="text-white text-lg font-semibold mb-2">
                วาง QR Code ในกรอบ
              </Text>
              <Text className="text-white/90 text-center leading-6">
                สแกน QR Code เพื่อเริ่มชาร์จ EV{"\n"}
                หรือทำธุรกรรมอื่นๆ
              </Text>
            </View>
          </View>
        </CameraView>
      </View>

      {/* Quick Actions */}
      <View className="px-6 pb-6 z-10">
        <Text className="text-white/70 text-sm mb-4">การดำเนินการด่วน</Text>
        <View className="flex-row justify-between">
          {[
            { icon: "flash", title: "ชาร์จ EV", color: "#51BC8E" },
            { icon: "card", title: "จ่ายเงิน", color: "#3B82F6" },
            { icon: "gift", title: "รับโปรโมชั่น", color: "#F59E0B" },
          ].map((action, index) => (
            <TouchableOpacity
              key={index}
              className="bg-white/10 rounded-xl p-4 items-center flex-1 mx-1"
            >
              <Ionicons
                name={action.icon as any}
                size={24}
                color={action.color}
              />
              <Text className="text-white text-xs mt-2 text-center">
                {action.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
